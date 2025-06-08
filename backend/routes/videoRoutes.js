const express = require('express');
const router = express.Router();
const keywordExpansionService = require('../services/keywordExpansionService');
const queryBuilderService = require('../services/queryBuilderService');
const userAnalyticsService = require('../services/userAnalyticsService');
const mcpIntegrationService = require('../services/mcpIntegrationService');
const authMiddleware = require('../middleware/authMiddleware');

// 🔥 MCP 서버 호출 헬퍼 함수
async function callMcpServer(endpoint, data = {}) {
  try {
    const response = await fetch(`http://mcp-service.railway.internal:8080${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`MCP Server error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`MCP Server call failed (${endpoint}):`, error.message);
    throw error;
  }
}

/**
 * GET /api/v1/videos/search
 * 기본 Shorts 검색 (MCP 서버 활용)
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

    console.log(`🔍 MCP 기본 검색: "${q}"`);

    // ✅ MCP 서버 형식에 맞춰 요청
    const mcpResult = await callMcpServer('/api/search', {
      query: q, // ✅ keyword → query로 변경
      options: {
        maxResults: parseInt(maxResults),
        order
      }
    });

    const videos = mcpResult.results?.videos || [];
    const searchTime = Date.now() - startTime;

    // 🔥 검색 로그 기록
    setImmediate(async () => {
      try {
        await userAnalyticsService.logSearch(
          req.user?.id || null,
          q,
          {
            searchType: 'mcp_basic',
            resultsCount: videos.length,
            responseTime: searchTime,
            userTier: req.user?.tier || 'free',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          }
        );
      } catch (logError) {
        console.error('검색 로그 기록 실패:', logError);
      }
    });

    res.json({
      success: true,
      data: {
        query: q,
        videos,
        totalResults: videos.length,
        searchTime: `${searchTime}ms`,
        source: 'mcp_server'
      }
    });

  } catch (error) {
    const searchTime = Date.now() - startTime;
    console.error('MCP Search error:', error);
    
    // 실패한 검색도 로그 기록
    setImmediate(async () => {
      try {
        await userAnalyticsService.logSearch(
          req.user?.id || null,
          req.query.q || 'unknown',
          {
            searchType: 'mcp_basic_failed',
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
 * 인기 Shorts 영상 (MCP 서버 활용)
 */
router.get('/trending', async (req, res) => {
  try {
    const { maxResults = 20, regionCode = 'KR' } = req.query;

    console.log(`🔥 MCP 인기 영상 검색 (지역: ${regionCode})`);

    // ✅ MCP 서버 형식에 맞춰 요청
    const mcpResult = await callMcpServer('/api/search', {
      query: '인기 쇼츠', // 한국 맞춤 트렌딩 키워드
      options: {
        maxResults: parseInt(maxResults),
        order: 'relevance',
        regionCode
      }
    });

    const videos = mcpResult.results?.videos || [];

    res.json({
      success: true,
      data: {
        videos,
        totalResults: videos.length,
        regionCode,
        source: 'mcp_server'
      }
    });

  } catch (error) {
    console.error('MCP Trending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/videos/categories/:category
 * 카테고리별 Shorts (MCP 서버 활용)
 */
router.get('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { maxResults = 15 } = req.query;

    console.log(`📂 MCP 카테고리 검색: ${category}`);

    // 카테고리를 한국어 키워드로 변환
    const categoryQueries = {
      comedy: '웃긴 영상',
      music: '음악 댄스',
      gaming: '게임 하이라이트',
      education: '교육 학습',
      lifestyle: '라이프스타일 브이로그',
      food: '요리 먹방',
      sports: '스포츠 하이라이트',
      tech: '기술 리뷰'
    };

    const query = categoryQueries[category.toLowerCase()] || `${category} 쇼츠`;

    // ✅ MCP 서버 형식에 맞춰 요청
    const mcpResult = await callMcpServer('/api/search', {
      query: query,
      options: {
        maxResults: parseInt(maxResults)
      }
    });

    const videos = mcpResult.results?.videos || [];

    res.json({
      success: true,
      data: {
        category,
        videos,
        totalResults: videos.length,
        source: 'mcp_server'
      }
    });

  } catch (error) {
    console.error('MCP Category search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/videos/status
 * MCP 서버 상태 확인
 */
router.get('/status', async (req, res) => {
  try {
    // MCP 서버 헬스 체크
    const healthCheck = await fetch('http://mcp-service.railway.internal:8080/health');
    const mcpStatus = healthCheck.ok;
    
    res.json({
      success: true,
      data: {
        mcpServerConnected: mcpStatus,
        mcpServerUrl: 'mcp-service.railway.internal:8080',
        message: mcpStatus ? 'MCP Server is healthy' : 'MCP Server connection failed'
      }
    });

  } catch (error) {
    console.error('MCP Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      mcpServerConnected: false
    });
  }
});

/**
 * POST /api/v1/videos/cache/clear
 * 캐시 정리 (MCP 서버로 요청)
 */
router.post('/cache/clear', async (req, res) => {
  try {
    // MCP 서버에 캐시 클리어 요청
    const clearResult = await callMcpServer('/api/admin/clear-cache', {});
    
    res.json({
      success: true,
      message: 'MCP Server cache cleared successfully',
      details: clearResult
    });

  } catch (error) {
    console.error('MCP Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/videos/ai-search
 * AI 기반 자연어 검색 (MCP 서버의 Claude AI 활용)
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

    console.log(`🤖 MCP AI 검색 요청: "${message}"`);

    // ✅ MCP 서버의 Claude AI 대화형 검색 직접 활용
    const mcpResult = await callMcpServer('/api/chat', {
      message,
      useAI,
      maxResults: 20
    });

    res.json({
      success: true,
      data: {
        query: message,
        response: mcpResult.response || '검색 결과를 찾았습니다.',
        keywords: mcpResult.keywords || [],
        videos: mcpResult.videos || [],
        totalResults: mcpResult.videos?.length || 0,
        source: 'mcp_claude_ai'
      }
    });

  } catch (error) {
    console.error('MCP AI search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/videos/trending-keywords
 * 현재 트렌딩 키워드 제공 (MCP 서버 활용)
 */
router.get('/trending-keywords', async (req, res) => {
  try {
    const { category = 'all' } = req.query;
    
    console.log(`📈 MCP 트렌딩 키워드 요청: ${category}`);

    // ✅ MCP 서버의 트렌드 분석 활용
    const mcpResult = await callMcpServer('/api/trends', {
      category,
      region: 'KR'
    });

    // 시간대별 추천 추가
    const timeContext = mcpIntegrationService.getTimeContext();
    const timeBasedKeywords = {
      morning: ['모닝루틴', '아침운동', '출근준비'],
      afternoon: ['점심메뉴', '카페브이로그', '오후간식'],
      evening: ['퇴근길', '저녁요리', '하루정리'],
      night: ['ASMR', '수면음악', '밤산책']
    };

    const trends = {
      trending: mcpResult.trending || [],
      categories: mcpResult.categories || {},
      timeRecommended: timeBasedKeywords[timeContext.timeOfDay] || [],
      currentTime: timeContext,
      source: 'mcp_server'
    };

    res.json({
      success: true,
      data: trends,
      cached: false
    });

  } catch (error) {
    console.error('MCP Trending keywords error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/videos/personalized
 * 개인화 추천 (MCP 서버 활용)
 */
router.post('/personalized', async (req, res) => {
  try {
    const { userId, preferences = {}, recentViews = [] } = req.body;

    console.log(`👤 MCP 개인화 추천: 사용자 ${userId}`);

    // 개인화 키워드 생성
    const personalizedKeywords = [];

    // 선호 카테고리 기반
    if (preferences.categories) {
      for (const category of preferences.categories) {
        const mcpResult = await callMcpServer('/api/trends', { category });
        personalizedKeywords.push(...(mcpResult.trending || []).slice(0, 2));
      }
    }

    // 시간대 기반
    const timeContext = mcpIntegrationService.getTimeContext();
    if (timeContext.timeOfDay === 'night') {
      personalizedKeywords.push('ASMR', '수면영상');
    }

    // 중복 제거
    const uniqueKeywords = [...new Set(personalizedKeywords)];

    // ✅ MCP 서버로 개인화된 검색 실행
    const searchPromises = uniqueKeywords.slice(0, 5).map(keyword =>
      callMcpServer('/api/search', {
        keyword,
        useAI: false,
        maxResults: 10
      })
    );

    const results = await Promise.all(searchPromises);
    
    // 결과 병합 및 중복 제거
    const allVideos = results.flatMap(r => r.videos || []);
    const uniqueVideos = [];
    const seenIds = new Set();
    
    allVideos.forEach(video => {
      if (video && video.id && !seenIds.has(video.id)) {
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
        personalizationLevel: preferences.categories ? 'high' : 'basic',
        source: 'mcp_server'
      }
    });

  } catch (error) {
    console.error('MCP Personalization error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔥 업그레이드된 고급 검색 API (MCP 서버 + 키워드 확장)
router.post('/search-smart', authMiddleware.trackUsage, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      keyword,
      userTier = 'free',
      maxResults = 30,
      strategy = 'auto',
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

    console.log(`🧠 MCP 스마트 검색 시작: "${keyword}" (${userTier})`);

    let finalResults = [];
    let expansionData = null;

    if (enableExpansion && userTier === 'premium') {
      // 프리미엄 유저: 키워드 확장 + MCP AI 검색
      console.log('🔥 프리미엄 MCP 스마트 검색 실행');
      
      // 1. 키워드 확장
      expansionData = await keywordExpansionService.expandKeyword(keyword);
      
      // 2. ✅ MCP 서버의 Claude AI로 스마트 검색
      const mcpResult = await callMcpServer('/api/chat', {
        message: `"${keyword}"와 관련된 인기 쇼츠 영상을 찾아줘. 확장 키워드: ${expansionData.expanded.join(', ')}`,
        useAI: true,
        maxResults
      });

      finalResults = mcpResult.videos || [];

    } else {
      // 무료 유저: 기본 MCP 검색
      console.log('🆓 무료 유저 MCP 검색 실행');
      
      const mcpResult = await callMcpServer('/api/search', {
        keyword,
        useAI: false,
        maxResults
      });
      
      finalResults = mcpResult.videos || [];
    }

    const searchTime = Date.now() - startTime;

    // 🔥 스마트 검색 로그 기록
    setImmediate(async () => {
      try {
        await userAnalyticsService.logSearch(
          req.user?.id || null,
          keyword,
          {
            searchType: userTier === 'premium' ? 'mcp_smart_premium' : 'mcp_smart_free',
            resultsCount: finalResults.length,
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
        strategy: [userTier === 'premium' ? 'mcp_ai_search' : 'mcp_basic_search'],
        results: finalResults,
        total: finalResults.length,
        expansion: expansionData ? {
          originalKeyword: keyword,
          expandedKeywords: expansionData.expanded?.slice(0, 10),
          suggestedChannels: expansionData.suggestions?.channels,
          categories: Object.keys(expansionData.categories || {})
        } : null,
        performance: {
          searchTime: `${searchTime}ms`,
          fromCache: false,
          source: 'mcp_server'
        }
      }
    });

  } catch (error) {
    const searchTime = Date.now() - startTime;
    console.error('MCP Smart search error:', error);
    
    setImmediate(async () => {
      try {
        await userAnalyticsService.logSearch(
          req.user?.id || null,
          req.body.keyword || 'unknown',
          {
            searchType: 'mcp_smart_failed',
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
      error: 'MCP_SMART_SEARCH_FAILED',
      message: error.message
    });
  }
});

// 다중 키워드 검색 (MCP 서버 활용)
router.post('/multi-search', authMiddleware.trackUsage, async (req, res) => {
  try {
    const { keywords = [], limit = 10 } = req.body;

    if (!keywords.length || keywords.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_KEYWORDS',
        message: '1-5개의 키워드가 필요합니다.'
      });
    }

    console.log(`🔍 MCP 다중 검색: ${keywords.join(', ')}`);

    // ✅ MCP 서버로 병렬 검색
    const searchPromises = keywords.map(keyword =>
      callMcpServer('/api/search', {
        keyword,
        useAI: false,
        maxResults: Math.ceil(limit / keywords.length)
      })
    );

    const results = await Promise.all(searchPromises);
    
    // 결과 병합
    const allVideos = [];
    const seenIds = new Set();
    
    results.forEach((result, index) => {
      const videos = result.videos || [];
      videos.forEach(video => {
        if (video && video.id && !seenIds.has(video.id)) {
          seenIds.add(video.id);
          video.sourceKeyword = keywords[index];
          allVideos.push(video);
        }
      });
    });

    res.json({
      success: true,
      data: {
        keywords,
        videos: allVideos.slice(0, limit),
        totalResults: allVideos.length,
        source: 'mcp_server'
      }
    });

  } catch (error) {
    console.error('MCP Multi-search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 유사 영상 추천
router.get('/similar/:videoId', authMiddleware.trackUsage, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { limit = 10 } = req.query;

    // 기존 영상 정보 조회
    const originalVideo = await callMcpServer('/api/video', { id: videoId });
    if (!originalVideo) {
      return res.status(404).json({
        success: false,
        error: 'VIDEO_NOT_FOUND',
        message: '영상을 찾을 수 없습니다.'
      });
    }

    // 채널 기반 추천
    const channelVideos = await callMcpServer('/api/channel', {
      id: originalVideo.channelId,
      maxResults: Math.floor(limit / 2)
    });

    // 키워드 기반 추천  
    const keywords = originalVideo.title.split(' ').slice(0, 3).join(' ');
    const keywordVideos = await callMcpServer('/api/search', {
      keyword: keywords,
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
        strategies: ['channel_based', 'keyword_based'],
        source: 'mcp_server'
      }
    });

  } catch (error) {
    console.error('MCP Similar videos error:', error);
    res.status(500).json({
      success: false,
      error: 'MCP_SIMILAR_SEARCH_FAILED',
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
        callMcpServer('/api/search', {
          keyword,
          useAI: false,
          maxResults: Math.floor(maxResults / keywords.length)
        })
      );
      
      const searchResults = await Promise.all(searchPromises);
      const allVideos = searchResults.flatMap(r => r.videos || []);
      
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