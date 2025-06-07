const express = require('express');
const router = express.Router();
const userAnalyticsService = require('../services/userAnalyticsService');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * GET /api/v1/analytics/popular-keywords
 * 인기 검색어 조회 (요구사항 8번)
 */
router.get('/popular-keywords', async (req, res) => {
  try {
    const { 
      timeRange = '24h',
      limit = 20,
      userTier = 'all',
      excludeCommon = true
    } = req.query;

    console.log(`🔥 인기 검색어 API 호출: ${timeRange}, limit=${limit}`);

    const popularKeywords = await userAnalyticsService.getPopularSearchKeywords({
      timeRange,
      limit: parseInt(limit),
      userTier,
      excludeCommon: excludeCommon === 'true'
    });

    res.json({
      success: true,
      data: {
        timeRange,
        keywords: popularKeywords,
        total: popularKeywords.length,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Popular keywords API error:', error);
    res.status(500).json({
      success: false,
      error: 'POPULAR_KEYWORDS_FAILED',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/realtime-trends
 * 실시간 검색 트렌드 (최근 1시간)
 */
router.get('/realtime-trends', async (req, res) => {
  try {
    console.log('⚡ 실시간 트렌드 API 호출');

    const realtimeTrends = await userAnalyticsService.getRealtimeSearchTrends();

    res.json({
      success: true,
      data: realtimeTrends
    });

  } catch (error) {
    console.error('Realtime trends API error:', error);
    res.status(500).json({
      success: false,
      error: 'REALTIME_TRENDS_FAILED',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/user-patterns/:userId
 * 사용자별 검색 패턴 분석 (프리미엄 기능)
 */
router.get('/user-patterns/:userId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 본인 데이터만 조회 가능
    if (req.user?.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: '본인의 데이터만 조회할 수 있습니다.'
      });
    }

    console.log(`👤 사용자 패턴 분석: ${userId}`);

    const userPatterns = await userAnalyticsService.getUserSearchPatterns(userId);

    res.json({
      success: true,
      data: {
        userId,
        patterns: userPatterns,
        analyzedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('User patterns API error:', error);
    res.status(500).json({
      success: false,
      error: 'USER_PATTERNS_FAILED',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/analytics/log-search
 * 검색 로그 기록 (내부 API)
 */
router.post('/log-search', async (req, res) => {
  try {
    const {
      userId,
      keyword,
      searchType = 'basic',
      resultsCount = 0,
      responseTime = 0,
      userTier = 'free',
      ipAddress,
      userAgent
    } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_KEYWORD',
        message: '검색 키워드가 필요합니다.'
      });
    }

    await userAnalyticsService.logSearch(userId, keyword, {
      searchType,
      resultsCount,
      responseTime,
      userTier,
      ipAddress,
      userAgent
    });

    res.json({
      success: true,
      message: '검색 로그가 기록되었습니다.'
    });

  } catch (error) {
    console.error('Log search API error:', error);
    res.status(500).json({
      success: false,
      error: 'LOG_SEARCH_FAILED',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/trending-by-category
 * 카테고리별 인기 키워드
 */
router.get('/trending-by-category', async (req, res) => {
  try {
    const { category = 'all', timeRange = '24h', limit = 10 } = req.query;

    console.log(`📊 카테고리별 트렌드: ${category}`);

    // 전체 인기 키워드 조회
    const allPopularKeywords = await userAnalyticsService.getPopularSearchKeywords({
      timeRange,
      limit: 100,
      excludeCommon: true
    });

    // 카테고리별 필터링
    const filteredKeywords = category === 'all' 
      ? allPopularKeywords
      : allPopularKeywords.filter(item => item.category === category);

    // 카테고리별 통계
    const categoryStats = allPopularKeywords.reduce((stats, item) => {
      const cat = item.category;
      if (!stats[cat]) {
        stats[cat] = { count: 0, totalScore: 0 };
      }
      stats[cat].count++;
      stats[cat].totalScore += item.totalScore;
      return stats;
    }, {});

    res.json({
      success: true,
      data: {
        category,
        keywords: filteredKeywords.slice(0, parseInt(limit)),
        categoryStats: Object.entries(categoryStats).map(([cat, stats]) => ({
          category: cat,
          keywordCount: stats.count,
          avgScore: Math.round((stats.totalScore / stats.count) * 100) / 100
        })).sort((a, b) => b.avgScore - a.avgScore)
      }
    });

  } catch (error) {
    console.error('Trending by category API error:', error);
    res.status(500).json({
      success: false,
      error: 'TRENDING_BY_CATEGORY_FAILED',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/search-volume
 * 검색량 통계 (시간대별)
 */
router.get('/search-volume', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    console.log(`📈 검색량 통계 조회: ${timeRange}`);

    // 실시간 트렌드 데이터 활용
    const realtimeTrends = await userAnalyticsService.getRealtimeSearchTrends();
    
    // 인기 검색어 데이터 활용
    const popularKeywords = await userAnalyticsService.getPopularSearchKeywords({
      timeRange,
      limit: 50
    });

    const volumeStats = {
      totalSearches: realtimeTrends.totalSearches,
      timeRange,
      hourlyVolume: realtimeTrends.timeSlots?.length || 0,
      topKeywords: popularKeywords.slice(0, 10).map(item => ({
        keyword: item.keyword,
        searchCount: item.searchCount,
        category: item.category
      })),
      categoryDistribution: this.calculateCategoryDistribution(popularKeywords),
      lastUpdate: new Date().toISOString()
    };

    res.json({
      success: true,
      data: volumeStats
    });

  } catch (error) {
    console.error('Search volume API error:', error);
    res.status(500).json({
      success: false,
      error: 'SEARCH_VOLUME_FAILED',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/keyword-suggestions/:keyword
 * 키워드 기반 추천 검색어 (연관 키워드)
 */
router.get('/keyword-suggestions/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const { limit = 10 } = req.query;

    console.log(`💡 키워드 추천: "${keyword}"`);

    // 인기 검색어에서 유사한 키워드 찾기
    const popularKeywords = await userAnalyticsService.getPopularSearchKeywords({
      timeRange: '7d',
      limit: 100
    });

    // 키워드 유사도 계산
    const suggestions = popularKeywords
      .filter(item => 
        item.keyword !== keyword.toLowerCase() &&
        (item.keyword.includes(keyword.toLowerCase()) || 
         keyword.toLowerCase().includes(item.keyword))
      )
      .slice(0, parseInt(limit))
      .map(item => ({
        keyword: item.keyword,
        category: item.category,
        popularity: item.estimatedPopularity,
        searchCount: item.searchCount
      }));

    res.json({
      success: true,
      data: {
        originalKeyword: keyword,
        suggestions,
        total: suggestions.length
      }
    });

  } catch (error) {
    console.error('Keyword suggestions API error:', error);
    res.status(500).json({
      success: false,
      error: 'KEYWORD_SUGGESTIONS_FAILED',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/status
 * Analytics 서비스 상태 확인
 */
router.get('/status', async (req, res) => {
  try {
    const status = userAnalyticsService.getStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Analytics status error:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYTICS_STATUS_FAILED',
      message: error.message
    });
  }
});

// 카테고리 분포 계산 헬퍼 함수
function calculateCategoryDistribution(keywords) {
  const distribution = {};
  
  keywords.forEach(item => {
    const category = item.category;
    if (!distribution[category]) {
      distribution[category] = 0;
    }
    distribution[category] += item.searchCount || 0;
  });

  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  
  return Object.entries(distribution).map(([category, count]) => ({
    category,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  })).sort((a, b) => b.count - a.count);
}

module.exports = router; 