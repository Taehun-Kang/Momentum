const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtubeService');
const mcpService = require('../services/mcpService');

/**
 * GET /api/v1/videos/search
 * 기본 Shorts 검색
 */
router.get('/search', async (req, res) => {
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

    res.json({
      success: true,
      data: {
        query: q,
        videos,
        totalResults: videos.length
      }
    });

  } catch (error) {
    console.error('Search error:', error);
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

module.exports = router; 