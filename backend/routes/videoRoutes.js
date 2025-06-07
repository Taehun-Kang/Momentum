const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtubeService');
const mcpService = require('../services/mcpService');
const keywordExpansionService = require('../services/keywordExpansionService');
const queryBuilderService = require('../services/queryBuilderService');
const userAnalyticsService = require('../services/userAnalyticsService');
const mcpIntegrationService = require('../services/mcpIntegrationService');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * GET /api/v1/videos/search
 * 기본 Shorts 검색
 */
router.get('/search', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { q, maxResults = 10, order = 'relevance' } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    console.log(`🔍 기본 검색: "${q}"`);

    const videos = await youtubeService.searchShorts(q, {
      maxResults: parseInt(maxResults),
      order
    });

    const searchTime = Date.now() - startTime;

    // 🔥 검색 로그 기록
    setImmediate(async () => {
      try {
        await userAnalyticsService.logSearch(
          req.user?.id || null, // 로그인한 사용자 ID (옵션)
          q,
          {
            searchType: 'basic',
            resultsCount: videos.length,
            responseTime: searchTime,
            userTier: req.user?.tier || 'free',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          }
        );
      } catch (logError) {
        console.error('검색 로그 기록 실패:', logError);
        // 로그 실패가 API 응답에 영향주지 않도록
      }
    });

    res.json({
      success: true,
      data: {
        query: q,
        videos,
        totalResults: videos.length,
        searchTime: `${searchTime}ms`
      }
    });

  } catch (error) {
    const searchTime = Date.now() - startTime;
    console.error('Search error:', error);
    
    // 실패한 검색도 로그 기록
    setImmediate(async () => {
      try {
        await userAnalyticsService.logSearch(
          req.user?.id || null,
          req.query.q || 'unknown',
          {
            searchType: 'basic_failed',
            resultsCount: 0,
            responseTime: searchTime,
            userTier: req.user?.tier || 'free',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        );
      } catch (logError) {
        console.error('실패 검색 로그 기록 실패:', logError);
      }
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/videos/trending
 * 인기 Shorts 영상
 */
router.get('/trending', async (req, res) => {
  try {
    const { maxResults = 20, regionCode = 'US' } = req.query;

    console.log(`🔥 인기 영상 검색 (지역: ${regionCode})`);

    const videos = await youtubeService.getTrendingShorts({
      maxResults: parseInt(maxResults),
      regionCode
    });

    res.json({
      success: true,
      data: {
        videos,
        totalResults: videos.length,
        regionCode
      }
    });

  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/videos/categories/:category
 * 카테고리별 Shorts
 */
router.get('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { maxResults = 15 } = req.query;

    console.log(`📂 카테고리 검색: ${category}`);

    const videos = await youtubeService.getShortsByCategory(category, {
      maxResults: parseInt(maxResults)
    });

    res.json({
      success: true,
      data: {
        category,
        videos,
        totalResults: videos.length
      }
    });

  } catch (error) {
    console.error('Category search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/videos/status
 * YouTube API 상태 확인
 */
router.get('/status', async (req, res) => {
  try {
    const status = await youtubeService.getServiceStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/videos/cache/clear
 * 캐시 정리
 */
router.post('/cache/clear', async (req, res) => {
  try {
    await youtubeService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/videos/ai-search
 * AI 기반 자연어 검색 (Claude MCP)
 */
router.post('/ai-search', async (req, res) => {
  try {
    const { message, useAI = true } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log(`🤖 AI 검색 요청: "${message}"`);

    // 1. 키워드 추출
    const extraction = await mcpService.extractKeywords(message, { useAI });
    console.log('추출된 키워드:', extraction);

    // 2. 검색 실행
    const searchPromises = extraction.keywords.map(keyword => 
      youtubeService.searchShorts(keyword, { maxResults: 10 })
    );

    const searchResults = await Promise.all(searchPromises);
    
    // 3. 결과 병합 및 중복 제거
    const allVideos = searchResults.flat();
    const uniqueVideos = [];
    const seenIds = new Set();
    
    allVideos.forEach(video => {
      if (!seenIds.has(video.id)) {
        seenIds.add(video.id);
        uniqueVideos.push(video);
      }
    });

    // 4. 대화형 응답 생성
    const response = await mcpService.generateResponse(
      extraction.keywords,
      uniqueVideos.length,
      message
    );

    res.json({
      success: true,
      data: {
        extraction,
        response,
        videos: uniqueVideos.slice(0, 20), // 최대 20개
        totalResults: uniqueVideos.length
      }
    });

  } catch (error) {
    console.error('AI search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/videos/trending-keywords
 * 현재 트렌딩 키워드 제공
 */
router.get('/trending-keywords', async (req, res) => {
  try {
    const { category = 'all' } = req.query;
    
    // 캐시 확인
    const cacheKey = `trending-keywords-${category}`;
    const cached = youtubeService.cache.get(cacheKey);
    
    if (cached) {
      console.log('📦 트렌드 캐시 적중');
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // 트렌드 분석
    const trends = await mcpService.analyzeTrends(category);
    
    // 시간대별 추천 추가
    const timeContext = mcpService.getTimeContext();
    const timeBasedKeywords = {
      morning: ['모닝루틴', '아침운동', '출근준비'],
      afternoon: ['점심메뉴', '카페브이로그', '오후간식'],
      evening: ['퇴근길', '저녁요리', '하루정리'],
      night: ['ASMR', '수면음악', '밤산책']
    };

    trends.timeRecommended = timeBasedKeywords[timeContext.timeOfDay] || [];
    trends.currentTime = timeContext;

    // 캐시 저장 (1시간)
    youtubeService.cache.set(cacheKey, trends, 3600);

    res.json({
      success: true,
      data: trends,
      cached: false
    });

  } catch (error) {
    console.error('Trending keywords error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/videos/personalized
 * 개인화 추천 (프리미엄 기능)
 */
router.post('/personalized', async (req, res) => {
  try {
    const { userId, preferences = {}, recentViews = [] } = req.body;

    // 여기서는 간단한 개인화 로직
    // 실제로는 더 복잡한 추천 알고리즘 필요
    const personalizedKeywords = [];

    // 선호 카테고리 기반
    if (preferences.categories) {
      for (const category of preferences.categories) {
        const trends = await mcpService.analyzeTrends(category);
        personalizedKeywords.push(...trends.trending.slice(0, 2));
      }
    }

    // 최근 시청 기반
    if (recentViews.length > 0) {
      // 최근 시청한 영상의 키워드 분석
      // 여기서는 시뮬레이션
      personalizedKeywords.push('관련영상', '추천영상');
    }

    // 시간대 기반
    const timeContext = mcpService.getTimeContext();
    if (timeContext.timeOfDay === 'night') {
      personalizedKeywords.push('ASMR', '수면영상');
    }

    // 중복 제거
    const uniqueKeywords = [...new Set(personalizedKeywords)];

    // 영상 검색
    const searchPromises = uniqueKeywords.slice(0, 5).map(keyword =>
      youtubeService.searchShorts(keyword, { maxResults: 10 })
    );

    const results = await Promise.all(searchPromises);
    
    // 수동 중복 제거
    const allVideos = results.flat();
    const uniqueVideos = [];
    const seenIds = new Set();
    
    allVideos.forEach(video => {
      if (!seenIds.has(video.id)) {
        seenIds.add(video.id);
        uniqueVideos.push(video);
      }
    });

    res.json({
      success: true,
      data: {
        recommendedKeywords: uniqueKeywords,
        videos: uniqueVideos.slice(0, 30),
        context: timeContext,
        personalizationLevel: preferences.categories ? 'high' : 'basic'
      }
    });

  } catch (error) {
    console.error('Personalization error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔥 업그레이드된 고급 검색 API (키워드 확장 + 쿼리 빌더 활용)
router.post('/search-smart', authMiddleware.trackUsage, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      keyword,
      userTier = 'free', // free, premium
      maxResults = 30,
      strategy = 'auto', // auto, keyword_only, channel_focused, time_sensitive
      enableExpansion = true,
      filters = {}
    } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_KEYWORD',
        message: '검색 키워드가 필요합니다.'
      });
    }

    console.log(`🧠 스마트 검색 시작: "${keyword}" (${userTier})`);

    let finalResults = [];
    let expansionData = null;
    let queryPlan = null;

    if (enableExpansion && userTier === 'premium') {
      // 프리미엄 유저: 키워드 확장 + 고급 쿼리 빌더
      console.log('🔥 프리미엄 스마트 검색 실행');
      
      // 1. 키워드 확장
      expansionData = await keywordExpansionService.expandKeyword(keyword);
      
      // 2. 고급 쿼리 생성
      queryPlan = await queryBuilderService.buildOptimizedQueries(keyword, {
        maxResults: Math.floor(maxResults / 3), // 여러 쿼리 분산
        strategy,
        filters
      });

      // 3. 다중 쿼리 실행
      const queryResults = await executeMultipleQueries(queryPlan.queries);
      
      // 4. 결과 병합 및 중복 제거
      finalResults = mergeAndDeduplicateResults(queryResults);
      
      // 5. 결과 부족 시 추가 검색 (요구사항 11번)
      if (finalResults.length < maxResults) {
        console.log(`📊 결과 부족 (${finalResults.length}/${maxResults}), 추가 검색 실행`);
        const additionalResults = await executeAdditionalSearch(
          keyword, 
          expansionData, 
          maxResults - finalResults.length
        );
        finalResults.push(...additionalResults);
      }

    } else {
      // 무료 유저: 기본 검색 + 간단한 키워드 확장
      console.log('🆓 무료 유저 검색 실행');
      
      if (enableExpansion) {
        // 간단한 키워드 확장 (캐시된 결과 우선)
        expansionData = await keywordExpansionService.expandKeyword(keyword);
        
        // 상위 3개 확장 키워드만 사용
        const topKeywords = [keyword, ...expansionData.expanded.slice(0, 2)];
        const searchPromises = topKeywords.map(kw => 
          youtubeService.searchShorts(kw, { maxResults: 10 })
        );
        
        const results = await Promise.all(searchPromises);
        finalResults = mergeAndDeduplicateResults(results);
      } else {
        // 기본 검색만
        const result = await youtubeService.searchShorts(keyword, { maxResults });
        finalResults = result.videos || result;
      }
    }

    // 6. 결과 정렬 및 최적화
    const optimizedResults = optimizeSearchResults(finalResults, keyword, maxResults);

    // 7. 응답 생성
    const searchTime = Date.now() - startTime;

    // 🔥 스마트 검색 로그 기록
    setImmediate(async () => {
      try {
        await userAnalyticsService.logSearch(
          req.user?.id || null,
          keyword,
          {
            searchType: userTier === 'premium' ? 'smart_premium' : 'smart_free',
            resultsCount: optimizedResults.length,
            responseTime: searchTime,
            userTier: userTier,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        );
      } catch (logError) {
        console.error('스마트 검색 로그 기록 실패:', logError);
      }
    });
    
    res.json({
      success: true,
      data: {
        keyword,
        userTier,
        strategy: queryPlan?.strategy || ['basic_search'],
        results: optimizedResults,
        total: optimizedResults.length,
        expansion: expansionData ? {
          originalKeyword: keyword,
          expandedKeywords: expansionData.expanded?.slice(0, 10),
          suggestedChannels: expansionData.suggestions?.channels,
          categories: Object.keys(expansionData.categories || {}).filter(k => 
            expansionData.categories[k]?.length > 0
          )
        } : null,
        queryPlan: queryPlan ? {
          totalQueries: queryPlan.queries.length,
          estimatedResults: queryPlan.estimatedResults,
          strategies: queryPlan.strategy
        } : null,
        performance: {
          searchTime: `${searchTime}ms`,
          fromCache: false,
          apiCallsUsed: queryPlan?.queries.length || 1
        }
      }
    });

  } catch (error) {
    const searchTime = Date.now() - startTime;
    console.error('Smart search error:', error);
    
    // 실패한 스마트 검색 로그 기록
    setImmediate(async () => {
      try {
        await userAnalyticsService.logSearch(
          req.user?.id || null,
          req.body.keyword || 'unknown',
          {
            searchType: 'smart_failed',
            resultsCount: 0,
            responseTime: searchTime,
            userTier: req.body.userTier || 'free',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        );
      } catch (logError) {
        console.error('실패한 스마트 검색 로그 기록 실패:', logError);
      }
    });

    res.status(500).json({
      success: false,
      error: 'SMART_SEARCH_FAILED',
      message: error.message
    });
  }
});

// 다중 쿼리 실행 함수
async function executeMultipleQueries(queries) {
  const results = [];
  
  for (const query of queries) {
    try {
      console.log(`🔍 쿼리 실행: ${query.description}`);
      
      let searchResult;
      
      if (query.type === 'channel_search' && query.channelId) {
        // 채널 특정 검색
        searchResult = await youtubeService.searchShorts(query.query, {
          ...query.params,
          channelId: query.channelId
        });
      } else {
        // 일반 키워드 검색
        searchResult = await youtubeService.searchShorts(query.query, query.params);
      }
      
      const videos = searchResult.videos || searchResult;
      if (videos && videos.length > 0) {
        results.push({
          query: query.query,
          type: query.type,
          videos: videos,
          weight: query.weight
        });
      }
      
    } catch (error) {
      console.error(`쿼리 실행 실패: ${query.description}`, error.message);
      // 개별 쿼리 실패는 전체 검색을 중단하지 않음
    }
  }
  
  return results;
}

// 결과 병합 및 중복 제거
function mergeAndDeduplicateResults(queryResults) {
  const allVideos = [];
  const seenIds = new Set();
  
  // 가중치별로 정렬
  const sortedResults = queryResults.sort((a, b) => (b.weight || 0) - (a.weight || 0));
  
  sortedResults.forEach(result => {
    const videos = result.videos || result;
    if (Array.isArray(videos)) {
      videos.forEach(video => {
        if (video && video.id && !seenIds.has(video.id)) {
          seenIds.add(video.id);
          // 가중치 정보 추가
          video.searchMeta = {
            source: result.type || 'basic_search',
            query: result.query,
            weight: result.weight || 0.5
          };
          allVideos.push(video);
        }
      });
    }
  });
  
  return allVideos;
}

// 추가 검색 실행 (결과 부족 시)
async function executeAdditionalSearch(keyword, expansionData, neededCount) {
  try {
    // 확장 키워드로 추가 검색
    const additionalKeywords = expansionData.expanded.slice(3, 8); // 4-8번째 키워드
    const searchPromises = additionalKeywords.slice(0, 3).map(kw =>
      youtubeService.searchShorts(kw, { maxResults: Math.ceil(neededCount / 3) })
    );
    
    const results = await Promise.all(searchPromises);
    return mergeAndDeduplicateResults(results.map((videos, index) => ({
      videos: videos.videos || videos,
      type: 'additional_search',
      query: additionalKeywords[index],
      weight: 0.3
    })));
    
  } catch (error) {
    console.error('추가 검색 실패:', error);
    return [];
  }
}

// 검색 결과 최적화
function optimizeSearchResults(results, originalKeyword, maxResults) {
  return results
    .filter(video => video && video.id) // 유효한 비디오만
    .sort((a, b) => {
      // 가중치 기반 정렬
      const weightA = a.searchMeta?.weight || 0.5;
      const weightB = b.searchMeta?.weight || 0.5;
      
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      
      // 조회수 기반 정렬 (가중치가 같으면)
      const viewsA = parseInt(a.statistics?.viewCount || 0);
      const viewsB = parseInt(b.statistics?.viewCount || 0);
      
      return viewsB - viewsA;
    })
    .slice(0, maxResults) // 최대 결과 수 제한
    .map(video => {
      // 메타데이터 정리
      const { searchMeta, ...cleanVideo } = video;
      return {
        ...cleanVideo,
        relevanceScore: searchMeta?.weight || 0.5,
        searchSource: searchMeta?.source || 'basic_search'
      };
    });
}

// 멀티 키워드 검색 (여러 키워드 병렬 처리)
router.post('/multi-search', authMiddleware.trackUsage, async (req, res) => {
  try {
    const { keywords = [], limit = 10 } = req.body;

    if (!keywords.length || keywords.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_KEYWORDS',
        message: '1-5개의 키워드를 입력해주세요.'
      });
    }

    // 병렬 검색 실행
    const searchPromises = keywords.map(async (keyword) => {
      try {
        const result = await youtubeService.searchShorts(keyword, { maxResults: limit });
        return {
          keyword,
          success: true,
          videos: result.videos,
          count: result.videos.length
        };
      } catch (error) {
        return {
          keyword,
          success: false,
          error: error.message,
          videos: []
        };
      }
    });

    const results = await Promise.allSettled(searchPromises);
    const processedResults = results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        keyword: 'unknown',
        success: false,
        error: 'Search failed',
        videos: []
      }
    );

    res.json({
      success: true,
      data: {
        searches: processedResults,
        total: processedResults.reduce((sum, r) => sum + r.videos.length, 0),
        successCount: processedResults.filter(r => r.success).length
      }
    });

  } catch (error) {
    console.error('Multi search error:', error);
    res.status(500).json({
      success: false,
      error: 'MULTI_SEARCH_FAILED',
      message: error.message
    });
  }
});

// 유사 영상 추천
router.get('/similar/:videoId', authMiddleware.trackUsage, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { limit = 10 } = req.query;

    // 기존 영상 정보 조회
    const originalVideo = await youtubeService.getVideoDetails(videoId);
    if (!originalVideo) {
      return res.status(404).json({
        success: false,
        error: 'VIDEO_NOT_FOUND',
        message: '영상을 찾을 수 없습니다.'
      });
    }

    // 채널 기반 추천
    const channelVideos = await youtubeService.getChannelShorts(
      originalVideo.channelId, 
      { maxResults: Math.floor(limit / 2) }
    );

    // 키워드 기반 추천  
    const keywords = originalVideo.title.split(' ').slice(0, 3).join(' ');
    const keywordVideos = await youtubeService.searchShorts(keywords, {
      maxResults: Math.floor(limit / 2)
    });

    // 결과 합성 및 중복 제거
    const allVideos = [...channelVideos.videos, ...keywordVideos.videos];
    const uniqueVideos = allVideos
      .filter(video => video.id !== videoId)
      .filter((video, index, self) => 
        index === self.findIndex(v => v.id === video.id)
      )
      .slice(0, limit);

    res.json({
      success: true,
      data: {
        originalVideo: {
          id: originalVideo.id,
          title: originalVideo.title,
          channelTitle: originalVideo.channelTitle
        },
        similarVideos: uniqueVideos,
        total: uniqueVideos.length,
        strategies: ['channel_based', 'keyword_based']
      }
    });

  } catch (error) {
    console.error('Similar videos error:', error);
    res.status(500).json({
      success: false,
      error: 'SIMILAR_SEARCH_FAILED',
      message: error.message
    });
  }
});

// 헬퍼 함수들
function getPublishedAfterDate(uploadDate) {
  const now = new Date();
  switch (uploadDate) {
    case 'today':
      return new Date(now.setHours(0, 0, 0, 0)).toISOString();
    case 'week':
      return new Date(now.setDate(now.getDate() - 7)).toISOString();
    case 'month':
      return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    case 'year':
      return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
    default:
      return undefined;
  }
}

function getCategoryId(category) {
  const categoryMap = {
    'music': '10',
    'gaming': '20',
    'sports': '17',
    'entertainment': '24',
    'education': '27',
    'comedy': '23'
  };
  return categoryMap[category] || undefined;
}

/**
 * POST /api/v1/videos/intelligent-search
 * 🧠 Claude AI 기반 지능형 자연어 검색 (최신 MCP 시스템)
 * "피곤해서 힐링되는 영상 보고 싶어" 같은 자연어 입력 처리
 */
router.post('/intelligent-search', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      query, 
      userTier = 'free',
      maxResults = 20,
      allowWorkflowSteps = true 
    } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_QUERY',
        message: '자연어 검색 질문이 필요합니다.'
      });
    }

    console.log(`🧠 지능형 검색 요청: "${query}" (${userTier})`);

    // MCP 연결 상태 확인
    const mcpStatus = mcpIntegrationService.getStatus();
    if (!mcpStatus.connected) {
      return res.status(503).json({
        success: false,
        error: 'MCP_NOT_CONNECTED',
        message: 'AI 시스템이 연결되지 않았습니다. 잠시 후 다시 시도해주세요.',
        status: mcpStatus
      });
    }

    let result;

    if (userTier === 'premium' && allowWorkflowSteps) {
      // 🎯 프리미엄: 완전한 4단계 지능형 워크플로우
      console.log('🎯 4단계 지능형 워크플로우 실행...');
      
      result = await mcpIntegrationService.executeAICurationWorkflow(query, req.user?.id);
      
      if (result.success) {
        const searchTime = Date.now() - startTime;
        
        return res.json({
          success: true,
          searchType: 'intelligent_premium',
          query,
          userTier,
          data: {
            videos: result.data.finalResults,
            workflowSteps: {
              step1_analysis: result.data.steps?.analysis || '자연어 분석 완료',
              step2_expansion: result.data.steps?.expansion || '키워드 확장 완료',
              step3_optimization: result.data.steps?.queries || '쿼리 최적화 완료',
              step4_search: result.data.steps?.search || '영상 검색 완료'
            },
            aiInsights: {
              extractedKeywords: result.data.extractedKeywords,
              searchStrategies: result.data.strategies,
              filteringStats: result.data.filteringStats
            },
            performance: {
              ...result.performance,
              responseTime: searchTime
            }
          }
        });
      } else {
        throw new Error(result.error || '지능형 워크플로우 실행 실패');
      }

    } else {
      // 🆓 무료/기본: 자연어 분석 + 기본 검색
      console.log('🆓 기본 자연어 분석 실행...');
      
      // 1. 자연어 분석으로 키워드 추출
      const analysis = await mcpIntegrationService.extractKeywords(query, { useAI: true });
      
      // 2. 추출된 키워드로 검색
      const keywords = analysis.keywords?.slice(0, 3) || [query]; // 상위 3개만
      const searchPromises = keywords.map(keyword => 
        youtubeService.searchShorts(keyword, { maxResults: Math.floor(maxResults / keywords.length) })
      );
      
      const searchResults = await Promise.all(searchPromises);
      const allVideos = searchResults.flat();
      
      // 중복 제거
      const uniqueVideos = [];
      const seenIds = new Set();
      allVideos.forEach(video => {
        if (!seenIds.has(video.id)) {
          seenIds.add(video.id);
          uniqueVideos.push(video);
        }
      });

      const searchTime = Date.now() - startTime;

      return res.json({
        success: true,
        searchType: 'intelligent_basic',
        query,
        userTier,
        data: {
          videos: uniqueVideos.slice(0, maxResults),
          analysis: {
            extractedKeywords: keywords,
            originalIntent: analysis.intent || '일반 검색',
            confidence: analysis.confidence || 0.8
          },
          performance: {
            totalResults: uniqueVideos.length,
            responseTime: searchTime
          }
        }
      });
    }

  } catch (error) {
    const searchTime = Date.now() - startTime;
    console.error('지능형 검색 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      query: req.body.query,
      responseTime: searchTime,
      fallback: '기본 검색을 사용해보세요: POST /api/v1/videos/search'
    });
  }
});

/**
 * GET /api/v1/videos/mcp-status
 * 🔧 MCP 시스템 상태 확인
 */
router.get('/mcp-status', async (req, res) => {
  try {
    const status = mcpIntegrationService.getStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        availableFeatures: status.connected ? [
          'process_natural_language',
          'intelligent_search_workflow', 
          'expand_keyword',
          'search_playable_shorts',
          'analyze_video_metadata'
        ] : [],
        upgradeMessage: status.connected ? null : 'MCP 시스템 연결 중입니다...'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/videos/workflow-search
 * 🎯 완전한 4단계 워크플로우 (프리미엄 전용)
 * 키워드 확장 → 쿼리 최적화 → 영상 검색 → 메타데이터 분석
 */
router.post('/workflow-search', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      keyword,
      userTier = 'free',
      maxResults = 30,
      includeAnalytics = true
    } = req.body;

    // 프리미엄 사용자만 허용
    if (userTier !== 'premium') {
      return res.status(403).json({
        success: false,
        error: 'PREMIUM_REQUIRED',
        message: '완전한 워크플로우는 프리미엄 기능입니다.',
        upgrade: {
          benefit: '4단계 AI 워크플로우로 더 정확한 영상 추천',
          features: [
            '키워드 지능형 확장',
            '검색 쿼리 최적화',
            '2단계 영상 필터링',
            '메타데이터 분석'
          ]
        }
      });
    }

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_KEYWORD',
        message: '검색 키워드가 필요합니다.'
      });
    }

    console.log(`🎯 4단계 워크플로우 실행: "${keyword}"`);

    // MCP 연결 확인
    const mcpStatus = mcpIntegrationService.getStatus();
    if (!mcpStatus.connected) {
      return res.status(503).json({
        success: false,
        error: 'MCP_NOT_CONNECTED',
        message: 'AI 워크플로우 시스템이 연결되지 않았습니다.'
      });
    }

    // 🚀 완전한 AI 큐레이션 워크플로우 실행
    const workflowResult = await mcpIntegrationService.executeAICurationWorkflow(
      keyword, 
      req.user?.id
    );

    if (!workflowResult.success) {
      throw new Error(workflowResult.error || '워크플로우 실행 실패');
    }

    const searchTime = Date.now() - startTime;

    // 🔥 프리미엄 검색 로그 기록
    setImmediate(async () => {
      try {
        await userAnalyticsService.logSearch(
          req.user?.id || null,
          keyword,
          {
            searchType: 'workflow_premium',
            resultsCount: workflowResult.data.finalResults.length,
            responseTime: searchTime,
            userTier: 'premium',
            workflowSteps: Object.keys(workflowResult.data.steps || {}).length,
            apiUsage: workflowResult.performance?.apiUsage || 0
          }
        );
      } catch (logError) {
        console.error('워크플로우 검색 로그 실패:', logError);
      }
    });

    res.json({
      success: true,
      searchType: 'workflow_premium',
      keyword,
      data: {
        videos: workflowResult.data.finalResults,
        workflow: {
          step1: {
            name: '키워드 확장',
            result: workflowResult.data.steps?.expansion || '완료',
            expandedKeywords: workflowResult.data.expandedKeywords?.slice(0, 10)
          },
          step2: {
            name: '쿼리 최적화', 
            result: workflowResult.data.steps?.queries || '완료',
            optimizedQueries: workflowResult.data.optimizedQueries?.slice(0, 5)
          },
          step3: {
            name: '영상 검색',
            result: workflowResult.data.steps?.search || '완료',
            searchStats: workflowResult.data.searchStats
          },
          step4: {
            name: '메타데이터 분석',
            result: workflowResult.data.steps?.analysis || '완료',
            analysisStats: workflowResult.data.analysisStats
          }
        },
        performance: {
          ...workflowResult.performance,
          totalResponseTime: searchTime,
          stepBreakdown: workflowResult.data.stepTiming
        },
        ...(includeAnalytics && {
          analytics: {
            filteringSuccessRate: workflowResult.data.filteringStats?.successRate,
            apiEfficiency: workflowResult.data.performance?.efficiency,
            recommendationScore: workflowResult.data.recommendationScore
          }
        })
      }
    });

  } catch (error) {
    const searchTime = Date.now() - startTime;
    console.error('워크플로우 검색 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      keyword: req.body.keyword,
      responseTime: searchTime
    });
  }
});

module.exports = router; 