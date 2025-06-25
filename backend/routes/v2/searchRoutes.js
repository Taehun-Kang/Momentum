/**
 * 🔍 v2 Search Routes
 * 
 * VQS 기반 영상 검색 API 엔드포인트
 * - 키워드 기반 영상 검색
 * - VQS(Video Quality Score) 점수 계산
 * - 상위 영상 큐레이션
 */

import express from 'express';
import VideoSearchEngine from '../../services/v2_search/index.js';

const router = express.Router();

// VideoSearchEngine 인스턴스 생성
const searchEngine = new VideoSearchEngine();

/**
 * POST /api/v2/search/videos
 * VQS 기반 영상 검색 (메인 기능)
 */
router.post('/videos', async (req, res) => {
  try {
    const { keyword, limit = 100 } = req.body;

    // 입력 유효성 검사
    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'keyword 파라미터가 필요합니다',
        required: ['keyword'],
        example: {
          keyword: "먹방",
          limit: 100
        }
      });
    }

    // limit 유효성 검사
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      return res.status(400).json({
        success: false,
        error: 'limit은 1-500 사이의 숫자여야 합니다',
        provided: limit
      });
    }

    console.log(`🔍 VQS 기반 영상 검색 API 호출: "${keyword}" (상위 ${limitNum}개)`);

    const startTime = Date.now();
    const result = await searchEngine.searchWithVQS(keyword, limitNum);
    const duration = Date.now() - startTime;

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        keyword: result.keyword,
        duration: Math.round(duration / 1000),
        videos: result.videos,
        stats: result.stats,
        videoCount: result.videos.length,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
        keyword: result.keyword,
        duration: Math.round(duration / 1000),
        videos: [],
        stats: null,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ VQS 기반 영상 검색 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v2/search/batch
 * 다중 키워드 배치 검색
 */
router.post('/batch', async (req, res) => {
  try {
    const { keywords, limit = 50 } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'keywords 배열이 필요합니다',
        example: {
          keywords: ["먹방", "브이로그", "ASMR"],
          limit: 50
        }
      });
    }

    if (keywords.length > 10) {
      return res.status(400).json({
        success: false,
        error: '한 번에 최대 10개 키워드까지 처리 가능합니다',
        provided: keywords.length
      });
    }

    const limitNum = parseInt(limit);
    console.log(`🎯 배치 영상 검색 API 호출: ${keywords.length}개 키워드 (각각 상위 ${limitNum}개)`);

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      
      try {
        const keywordStartTime = Date.now();
        const result = await searchEngine.searchWithVQS(keyword, limitNum);
        const keywordDuration = Date.now() - keywordStartTime;

        results.push({
          success: result.success,
          keyword,
          message: result.message,
          videoCount: result.videos.length,
          duration: Math.round(keywordDuration / 1000),
          videos: result.videos,
          stats: result.stats
        });

      } catch (error) {
        results.push({
          success: false,
          keyword,
          error: error.message,
          videoCount: 0,
          videos: [],
          stats: null
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    res.json({
      success: true,
      message: `배치 검색 완료: ${keywords.length}개 키워드`,
      results,
      summary: {
        totalKeywords: keywords.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        totalVideos: results.reduce((sum, r) => sum + r.videoCount, 0),
        totalDuration: Math.round(totalDuration / 1000),
        averageDuration: Math.round(totalDuration / keywords.length / 1000)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 배치 영상 검색 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v2/search/health
 * 검색 엔진 상태 체크
 */
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 v2 검색 엔진 헬스체크 API 호출');

    // 간단한 테스트 검색 수행
    const testResult = await searchEngine.searchWithVQS('테스트', 1);
    
    res.json({
      success: true,
      status: 'healthy',
      message: 'v2 검색 엔진 정상',
      services: {
        searchEngine: 'running',
        vqsCalculator: 'running',
        database: testResult.success ? 'connected' : 'disconnected'
      },
      testSearch: {
        success: testResult.success,
        message: testResult.message
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ v2 검색 엔진 헬스체크 실패:', error);
    
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      services: {
        searchEngine: 'error',
        vqsCalculator: 'error',
        database: 'error'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v2/search/quick-test
 * 빠른 검색 테스트 (개발/디버깅용)
 */
router.post('/quick-test', async (req, res) => {
  try {
    const { keyword = '테스트', limit = 10 } = req.body;

    console.log(`⚡ v2 검색 빠른 테스트 API 호출: "${keyword}" (상위 ${limit}개)`);

    const startTime = Date.now();
    const result = await searchEngine.searchWithVQS(keyword, parseInt(limit));
    const duration = Date.now() - startTime;

    res.json({
      success: result.success,
      message: result.success ? '빠른 테스트 성공' : '빠른 테스트 실패',
      keyword,
      duration: Math.round(duration / 1000),
      videoCount: result.videos.length,
      sampleVideos: result.videos.slice(0, 3), // 상위 3개만 샘플로
      stats: result.stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ v2 검색 빠른 테스트 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v2/search/top-videos
 * 키워드별 최고 품질 영상만 조회 (VQS 상위 N개)
 */
router.post('/top-videos', async (req, res) => {
  try {
    const { keyword, topCount = 10 } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'keyword 파라미터가 필요합니다',
        example: {
          keyword: "요리",
          topCount: 10
        }
      });
    }

    const topNum = parseInt(topCount);
    if (isNaN(topNum) || topNum < 1 || topNum > 50) {
      return res.status(400).json({
        success: false,
        error: 'topCount는 1-50 사이의 숫자여야 합니다',
        provided: topCount
      });
    }

    console.log(`🏆 최고 품질 영상 조회 API 호출: "${keyword}" (상위 ${topNum}개)`);

    const startTime = Date.now();
    // 더 많은 영상을 검색한 후 상위만 선별
    const result = await searchEngine.searchWithVQS(keyword, Math.max(100, topNum * 5));
    const duration = Date.now() - startTime;

    if (result.success) {
      // 상위 N개만 선별
      const topVideos = result.videos.slice(0, topNum);
      
      res.json({
        success: true,
        message: `"${keyword}" 최고 품질 영상 ${topVideos.length}개 선별`,
        keyword,
        duration: Math.round(duration / 1000),
        topVideos,
        topCount: topVideos.length,
        totalSearched: result.videos.length,
        qualityStats: {
          averageVQS: topVideos.length > 0 ? 
            (topVideos.reduce((sum, v) => sum + (v.vqs_score || 0), 0) / topVideos.length).toFixed(2) : 0,
          highestVQS: topVideos[0]?.vqs_score || 0,
          lowestVQS: topVideos[topVideos.length - 1]?.vqs_score || 0
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
        keyword,
        duration: Math.round(duration / 1000),
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ 최고 품질 영상 조회 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
