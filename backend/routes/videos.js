/**
 * Videos API 라우터
 * Momentum by Wave Team
 * 
 * YouTube Shorts 검색, 트렌딩, 카테고리별 API 엔드포인트
 */

const express = require('express');
const youtubeService = require('../services/youtubeService');

const router = express.Router();

/**
 * GET /api/v1/videos/search
 * Shorts 영상 검색
 */
router.get('/search', async (req, res) => {
  try {
    const {
      q: query,
      maxResults = 10,
      order = 'relevance',
      regionCode = 'US'
    } = req.query;

    // 검색어 유효성 검사
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Search query is required',
        message: '검색어를 입력해주세요.',
        code: 'MISSING_QUERY'
      });
    }

    // maxResults 범위 제한
    const limitedMaxResults = Math.min(Math.max(parseInt(maxResults), 1), 50);

    // 검색 실행
    const shorts = await youtubeService.searchShorts(query.trim(), {
      maxResults: limitedMaxResults,
      order,
      regionCode
    });

    res.json({
      success: true,
      data: {
        query: query.trim(),
        results: shorts,
        count: shorts.length,
        maxResults: limitedMaxResults
      },
      meta: {
        timestamp: new Date().toISOString(),
        apiVersion: '1.0.0',
        service: 'Momentum Shorts Search'
      }
    });

  } catch (error) {
    console.error('❌ Shorts 검색 API 오류:', error);

    // YouTube API 할당량 초과
    if (error.message.includes('할당량 초과')) {
      return res.status(429).json({
        error: 'Quota exceeded',
        message: 'YouTube API 일일 할당량을 초과했습니다. 내일 다시 시도해주세요.',
        code: 'QUOTA_EXCEEDED',
        retryAfter: 24 * 60 * 60 // 24시간 후
      });
    }

    // YouTube API 에러
    if (error.code === 403) {
      return res.status(403).json({
        error: 'API access denied',
        message: 'YouTube API 접근이 거부되었습니다. API 키를 확인해주세요.',
        code: 'API_ACCESS_DENIED'
      });
    }

    // 일반 에러
    res.status(500).json({
      error: 'Internal server error',
      message: '검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      code: 'SEARCH_ERROR'
    });
  }
});

/**
 * GET /api/v1/videos/trending
 * 인기 Shorts 영상 목록
 */
router.get('/trending', async (req, res) => {
  try {
    const {
      maxResults = 20,
      regionCode = 'US'
    } = req.query;

    // maxResults 범위 제한
    const limitedMaxResults = Math.min(Math.max(parseInt(maxResults), 1), 50);

    // 인기 Shorts 가져오기
    const trendingShorts = await youtubeService.getTrendingShorts({
      maxResults: limitedMaxResults,
      regionCode
    });

    res.json({
      success: true,
      data: {
        trending: trendingShorts,
        count: trendingShorts.length,
        maxResults: limitedMaxResults,
        region: regionCode
      },
      meta: {
        timestamp: new Date().toISOString(),
        apiVersion: '1.0.0',
        service: 'Momentum Trending Shorts'
      }
    });

  } catch (error) {
    console.error('❌ 트렌딩 Shorts API 오류:', error);

    if (error.message.includes('할당량 초과')) {
      return res.status(429).json({
        error: 'Quota exceeded',
        message: 'YouTube API 일일 할당량을 초과했습니다.',
        code: 'QUOTA_EXCEEDED'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: '트렌딩 영상을 가져오는 중 오류가 발생했습니다.',
      code: 'TRENDING_ERROR'
    });
  }
});

/**
 * GET /api/v1/videos/categories/:category
 * 카테고리별 Shorts 영상
 */
router.get('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const {
      maxResults = 15,
      regionCode = 'US'
    } = req.query;

    // 지원 카테고리 목록
    const supportedCategories = [
      'comedy', 'music', 'gaming', 'education', 
      'lifestyle', 'food', 'sports', 'tech'
    ];

    if (!supportedCategories.includes(category.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid category',
        message: `지원되지 않는 카테고리입니다. 지원 카테고리: ${supportedCategories.join(', ')}`,
        code: 'INVALID_CATEGORY',
        supportedCategories
      });
    }

    // maxResults 범위 제한
    const limitedMaxResults = Math.min(Math.max(parseInt(maxResults), 1), 50);

    // 카테고리별 Shorts 검색
    const categoryShorts = await youtubeService.getShortsByCategory(category, {
      maxResults: limitedMaxResults,
      regionCode
    });

    res.json({
      success: true,
      data: {
        category,
        results: categoryShorts,
        count: categoryShorts.length,
        maxResults: limitedMaxResults
      },
      meta: {
        timestamp: new Date().toISOString(),
        apiVersion: '1.0.0',
        service: 'Momentum Category Shorts'
      }
    });

  } catch (error) {
    console.error('❌ 카테고리 Shorts API 오류:', error);

    if (error.message.includes('할당량 초과')) {
      return res.status(429).json({
        error: 'Quota exceeded',
        message: 'YouTube API 일일 할당량을 초과했습니다.',
        code: 'QUOTA_EXCEEDED'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: '카테고리별 영상을 가져오는 중 오류가 발생했습니다.',
      code: 'CATEGORY_ERROR'
    });
  }
});

/**
 * GET /api/v1/videos/status
 * YouTube 서비스 상태 확인
 */
router.get('/status', (req, res) => {
  try {
    const status = youtubeService.getStatus();

    res.json({
      success: true,
      data: {
        service: 'YouTube Shorts Service',
        status: 'operational',
        quota: {
          used: status.quotaUsed,
          remaining: status.quotaRemaining,
          total: 10000,
          percentage: Math.round((status.quotaUsed / 10000) * 100)
        },
        cache: {
          hits: status.cacheStats.hits,
          misses: status.cacheStats.misses,
          keys: status.cacheStats.keys,
          hitRate: status.cacheStats.hits > 0 ? 
            Math.round((status.cacheStats.hits / (status.cacheStats.hits + status.cacheStats.misses)) * 100) : 0
        },
        configuration: {
          apiKeyConfigured: status.isApiKeyConfigured
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        apiVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('❌ 상태 확인 API 오류:', error);
    
    res.status(500).json({
      error: 'Status check failed',
      message: '서비스 상태를 확인할 수 없습니다.',
      code: 'STATUS_ERROR'
    });
  }
});

/**
 * POST /api/v1/videos/cache/clear
 * 캐시 정리 (관리자용)
 */
router.post('/cache/clear', (req, res) => {
  try {
    youtubeService.clearCache();

    res.json({
      success: true,
      data: {
        message: '캐시가 성공적으로 정리되었습니다.'
      },
      meta: {
        timestamp: new Date().toISOString(),
        action: 'cache_clear'
      }
    });

  } catch (error) {
    console.error('❌ 캐시 정리 API 오류:', error);
    
    res.status(500).json({
      error: 'Cache clear failed',
      message: '캐시 정리 중 오류가 발생했습니다.',
      code: 'CACHE_CLEAR_ERROR'
    });
  }
});

module.exports = router; 