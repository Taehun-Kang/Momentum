/**
 * 🔥 Trend Routes - TrendVideoService 기반 API
 * 
 * 4단계 워크플로우를 통한 실시간 트렌드 영상 큐레이션
 */

import express from 'express';
import { 
  generateTrendVideos, 
  getTrendVideoStats,
  getQuickTrendKeywords,
  validateConfig 
} from '../services/video/trendVideoService.js';

const router = express.Router();

/**
 * 🎯 GET /api/trends/videos - 트렌드 영상 큐레이션 (메인 기능)
 * 
 * 4단계 워크플로우로 고품질 트렌드 영상 제공
 * - Google Trends 키워드 수집
 * - 뉴스 기반 키워드 정제  
 * - YouTube 최신 영상 검색
 * - 채널 품질 필터링
 */
router.get('/videos', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🔥 트렌드 영상 API 호출:', req.query);

    // 🔧 쿼리 파라미터 파싱
    const {
      // 트렌드 수집 옵션
      maxKeywords = 20,
      region = 'KR',
      noCache = false,
      
      // 키워드 정제 옵션
      finalKeywords = 8,
      timeout = 30000,
      
      // 영상 검색 옵션
      maxResults = 30,
      timeRange = '24h',
      
      // 채널 필터 옵션
      minSubscribers = 50000,
      
      // 응답 옵션
      includeStats = true,
      includeSample = true,
      sampleSize = 5
    } = req.query;

    // 🎯 설정 구성
    const config = {
      trends: {
        maxKeywords: parseInt(maxKeywords),
        region,
        noCache: noCache === 'true'
      },
      refiner: {
        maxFinalKeywords: parseInt(finalKeywords),
        timeout: parseInt(timeout)
      },
      search: {
        maxResults: parseInt(maxResults),
        timeRange
      },
      channelFilter: {
        minSubscribers: parseInt(minSubscribers)
      }
    };

    // ✅ 설정 검증
    const validation = validateConfig(config);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'invalid_config',
        message: 'API 파라미터 오류',
        details: validation.errors
      });
    }

    // 🚀 트렌드 영상 생성
    const result = await generateTrendVideos(config);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'trend_generation_failed',
        message: result.error,
        fallback: result.fallback
      });
    }

    // 📊 응답 데이터 구성
    const responseData = {
      success: true,
      data: {
        videos: result.data.trendVideos,
        keywords: result.data.keywords,
        totalVideos: result.data.trendVideos.length,
        totalKeywords: result.data.keywords.length
      },
      meta: {
        processingTime: Date.now() - startTime,
        serviceProcessingTime: result.processingTime,
        apiCost: result.summary.performance.apiCosts.total,
        efficiency: ((result.summary.pipeline.qualityVideosFiltered / result.summary.pipeline.videosSearched) * 100).toFixed(1) + '%',
        searchRange: result.config.searchTimeRange,
        timestamp: new Date().toISOString()
      }
    };

    // 📈 통계 포함
    if (includeStats === 'true') {
      responseData.stats = {
        pipeline: result.summary.pipeline,
        performance: result.summary.performance,
        quality: result.summary.quality
      };
    }

    // 🎬 샘플 영상 포함
    if (includeSample === 'true') {
      responseData.sample = result.data.trendVideos
        .slice(0, parseInt(sampleSize))
        .map(video => ({
          title: video.snippet?.title,
          channelTitle: video.snippet?.channelTitle,
          videoId: video.id?.videoId,
          keyword: video.searchKeyword,
          publishedAt: video.snippet?.publishedAt,
          subscriberCount: video.channelInfo?.subscriberCountFormatted,
          qualityGrade: video.channelInfo?.qualityGrade
        }));
    }

    res.json(responseData);

  } catch (error) {
    console.error('🔥 트렌드 영상 API 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 🎨 GET /api/trends/keywords - 트렌드 키워드만 빠르게
 * 
 * 1-2단계만 실행 (Google Trends → 뉴스 정제)
 * 영상 검색 없이 키워드만 제공
 */
router.get('/keywords', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🎨 트렌드 키워드 API 호출:', req.query);

    const {
      maxKeywords = 20,
      finalKeywords = 10,
      region = 'KR',
      noCache = false,
      includeContext = false
    } = req.query;

    // 🚀 빠른 키워드 조회
    const result = await getQuickTrendKeywords({
      maxKeywords: parseInt(maxKeywords),
      finalKeywords: parseInt(finalKeywords),
      region,
      noCache: noCache === 'true',
      includeContext: includeContext === 'true'
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'keyword_generation_failed',
        message: result.error
      });
    }

    res.json({
      success: true,
      data: {
        keywords: result.data.keywords,
        totalKeywords: result.data.keywords.length,
        context: includeContext === 'true' ? result.data.context : undefined
      },
      meta: {
        processingTime: Date.now() - startTime,
        serviceProcessingTime: result.processingTime,
        region: result.config.region,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🎨 트렌드 키워드 API 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 📊 GET /api/trends/stats - 서비스 통계 및 상태
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 트렌드 통계 API 호출');

    const stats = await getTrendVideoStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('📊 트렌드 통계 API 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'stats_fetch_failed',
      message: error.message
    });
  }
});

/**
 * ⚡ GET /api/trends/videos/quick - 빠른 캐시된 결과
 * 
 * 최근 생성된 결과를 빠르게 반환 (캐시 우선)
 */
router.get('/videos/quick', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('⚡ 빠른 트렌드 영상 API 호출');

    const {
      limit = 20,
      minSubscribers = 50000,
      maxAge = 3600 // 1시간
    } = req.query;

    // 🔧 캐시 우선 설정
    const config = {
      trends: { noCache: false },
      refiner: { maxFinalKeywords: 5 },
      search: { maxResults: 20 },
      channelFilter: { minSubscribers: parseInt(minSubscribers) },
      quick: true,
      maxCacheAge: parseInt(maxAge)
    };

    const result = await generateTrendVideos(config);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'quick_trend_failed',
        message: result.error
      });
    }

    // 📝 간소화된 응답
    const videos = result.data.trendVideos
      .slice(0, parseInt(limit))
      .map(video => ({
        id: video.id?.videoId,
        title: video.snippet?.title,
        channel: video.snippet?.channelTitle,
        thumbnail: video.snippet?.thumbnails?.medium?.url,
        publishedAt: video.snippet?.publishedAt,
        keyword: video.searchKeyword,
        subscribers: video.channelInfo?.subscriberCountFormatted,
        grade: video.channelInfo?.qualityGrade
      }));

    res.json({
      success: true,
      data: {
        videos,
        totalVideos: videos.length,
        cached: result.cached || false
      },
      meta: {
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        quick: true
      }
    });

  } catch (error) {
    console.error('⚡ 빠른 트렌드 영상 API 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 🎛️ POST /api/trends/videos/custom - 커스텀 옵션 큐레이션
 * 
 * 상세한 커스텀 설정으로 트렌드 영상 생성
 */
router.post('/videos/custom', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🎛️ 커스텀 트렌드 영상 API 호출:', req.body);

    const {
      trends = {},
      refiner = {},
      search = {},
      channelFilter = {},
      response = {}
    } = req.body;

    // 🔧 기본값과 병합
    const config = {
      trends: {
        maxKeywords: 20,
        region: 'KR',
        noCache: false,
        ...trends
      },
      refiner: {
        maxFinalKeywords: 8,
        timeout: 30000,
        ...refiner
      },
      search: {
        maxResults: 30,
        timeRange: '24h',
        ...search
      },
      channelFilter: {
        minSubscribers: 50000,
        ...channelFilter
      }
    };

    // ✅ 설정 검증
    const validation = validateConfig(config);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'invalid_custom_config',
        message: 'API 설정 오류',
        details: validation.errors
      });
    }

    const result = await generateTrendVideos(config);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'custom_trend_failed',
        message: result.error,
        fallback: result.fallback
      });
    }

    // 📊 커스텀 응답 구성
    const responseData = {
      success: true,
      data: {
        videos: result.data.trendVideos,
        keywords: result.data.keywords,
        config: result.config
      },
      meta: {
        processingTime: Date.now() - startTime,
        serviceProcessingTime: result.processingTime,
        custom: true,
        timestamp: new Date().toISOString()
      }
    };

    // 📈 상세 정보 포함 옵션
    if (response.includeStats) {
      responseData.stats = result.summary;
    }

    if (response.includeDebug) {
      responseData.debug = {
        pipeline: result.summary.pipeline,
        performance: result.summary.performance
      };
    }

    res.json(responseData);

  } catch (error) {
    console.error('🎛️ 커스텀 트렌드 영상 API 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 🏥 GET /api/trends/health - 서비스 상태 확인
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'TrendVideoService',
      version: '1.0.0',
      apiKeys: {
        youtube: !!process.env.YOUTUBE_API_KEY,
        serpapi: !!process.env.SERP_API_KEY,
        claude: !!process.env.ANTHROPIC_API_KEY
      },
      endpoints: [
        'GET /api/trends/videos',
        'GET /api/trends/keywords', 
        'GET /api/trends/stats',
        'GET /api/trends/videos/quick',
        'POST /api/trends/videos/custom',
        'GET /api/trends/health'
      ]
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router; 