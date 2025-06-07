const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const trendService = require('../services/trendService');

// Get trending keywords
router.get('/keywords', async (req, res) => {
  try {
    const { category, limit = 10 } = req.query;
    
    const keywords = await supabaseService.client
      .from('trending_keywords')
      .select('*')
      .eq(category ? 'category' : 'id', category || 'id')
      .gt('expires_at', new Date().toISOString())
      .order('trend_score', { ascending: false })
      .limit(parseInt(limit));

    if (keywords.error) {
      throw keywords.error;
    }

    res.json({
      success: true,
      data: keywords.data,
      total: keywords.data.length,
      category: category || 'all'
    });

  } catch (error) {
    console.error('Trends keywords error:', error);
    res.status(500).json({
      success: false,
      error: 'trends_fetch_failed',
      message: error.message
    });
  }
});

// Get trending keywords by specific category
router.get('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 5 } = req.query;

    const keywords = await supabaseService.client
      .from('trending_keywords')
      .select('*')
      .eq('category', category)
      .gt('expires_at', new Date().toISOString())
      .order('trend_score', { ascending: false })
      .limit(parseInt(limit));

    if (keywords.error) {
      throw keywords.error;
    }

    res.json({
      success: true,
      data: keywords.data,
      category,
      total: keywords.data.length
    });

  } catch (error) {
    console.error('Category trends error:', error);
    res.status(500).json({
      success: false,
      error: 'category_trends_failed',
      message: error.message
    });
  }
});

// 🔥 NEW: GET /api/v1/trends/realtime - SerpAPI + n8n 실시간 트렌드
router.get('/realtime', async (req, res) => {
  try {
    const { region = 'KR', refresh = false } = req.query;
    
    console.log(`실시간 트렌드 요청: region=${region}, refresh=${refresh}`);
    
    const trends = await trendService.getTrendingKeywords(region, refresh === 'true');
    
    res.json({
      success: true,
      data: {
        trends: trends.data,
        sources: trends.sources,
        timestamp: trends.timestamp,
        region: trends.region,
        total: trends.total,
        cached: trends.success && !refresh,
        analysis: trends.analysis,
        sourceBreakdown: trends.sourceBreakdown
      },
      meta: {
        description: 'SerpAPI + n8n 실시간 트렌드 수집',
        updateInterval: '30분',
        dataSources: ['serpapi', 'n8n_workflow', 'youtube_trending', 'google_trends']
      }
    });

  } catch (error) {
    console.error('Realtime trends error:', error);
    res.status(500).json({
      success: false,
      error: 'realtime_trends_failed',
      message: error.message
    });
  }
});

// 🔥 NEW: GET /api/v1/trends/stats - 트렌드 서비스 통계
router.get('/stats', async (req, res) => {
  try {
    const stats = await trendService.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Trend stats error:', error);
    res.status(500).json({
      success: false,
      error: 'trend_stats_failed',
      message: error.message
    });
  }
});

// GET /api/v1/trends/time-based - 시간대별 추천
router.get('/time-based', async (req, res) => {
  try {
    const currentHour = new Date().getHours();
    let timeCategory;

    if (currentHour >= 6 && currentHour < 12) {
      timeCategory = 'morning';
    } else if (currentHour >= 12 && currentHour < 18) {
      timeCategory = 'afternoon';
    } else if (currentHour >= 18 && currentHour < 22) {
      timeCategory = 'evening';
    } else {
      timeCategory = 'night';
    }

    const timeBasedKeywords = {
      morning: ['운동', '모닝루틴', '아침요리', '출근길'],
      afternoon: ['점심', '업무', '카페', '일상'],
      evening: ['퇴근', '저녁요리', '힐링', '취미'],
      night: ['야식', '수면', '독서', '영화']
    };

    const keywords = timeBasedKeywords[timeCategory] || timeBasedKeywords.afternoon;

    res.json({
      success: true,
      data: {
        timeCategory,
        currentHour,
        keywords,
        description: `${timeCategory} 시간대 추천 키워드`
      }
    });

  } catch (error) {
    console.error('Time-based trends error:', error);
    res.status(500).json({
      success: false,
      error: 'time_based_trends_failed',
      message: error.message
    });
  }
});

module.exports = router; 