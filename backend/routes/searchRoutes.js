/**
 * 🔍 Search Routes
 * 
 * 검색 관련 API 엔드포인트
 * - 매일 키워드 갱신 서비스 관리
 * - YouTube 검색 테스트
 * - 진행 상황 모니터링
 */

import express from 'express';
import { 
  runDailyKeywordUpdate, 
  getDailyUpdateProgress, 
  processSingleKeyword,
  getDailyUpdateServiceStats,
  retryFailedClassifications,
  getFailedClassificationVideos,
  reprocessSpecificVideos,
  cleanupFailedClassifications
} from '../services/search/dailyKeywordUpdateService.js';

// 🔍 실시간 키워드 검색 서비스 (주석 처리 - processSingleKeyword로 통합)
// ❌ 중복 기능으로 인해 주석 처리됨 (2025-01-27)
// import { 
//   searchKeywordRealtime,
//   getCurrentSearchSession,
//   getRealtimeFailedClassifications
// } from '../youtube-ai-services/search/modules/realtime-keyword-search.js';

const router = express.Router();

/**
 * POST /api/search/daily-update
 * 매일 키워드 갱신 실행
 */
router.post('/daily-update', async (req, res) => {
  try {
    console.log('🎯 매일 키워드 갱신 API 호출');
    
    const startTime = Date.now();
    const result = await runDailyKeywordUpdate();
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      message: '매일 키워드 갱신 완료',
      duration: Math.round(duration / 1000),
      ...result
    });

  } catch (error) {
    console.error('❌ 매일 갱신 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/search/daily-update/progress
 * 매일 갱신 진행 상황 조회
 */
router.get('/daily-update/progress', (req, res) => {
  try {
    const progress = getDailyUpdateProgress();
    
    res.json({
      success: true,
      progress,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 진행 상황 조회 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/search/test-keyword
 * 단일 키워드 테스트
 */
router.post('/test-keyword', async (req, res) => {
  try {
    const { keyword, category, min_view_count, min_engagement_rate, update_cycle } = req.body;

    // 입력 유효성 검사
    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'keyword 파라미터가 필요합니다',
        required: ['keyword']
      });
    }

    console.log(`🧪 키워드 테스트 API 호출: "${keyword}"`);

    const keywordData = {
      id: 999, // 테스트용 ID
      keyword,
      category: category || '테스트',
      min_view_count: min_view_count || 10000,
      min_engagement_rate: min_engagement_rate || 1.0,
      update_cycle: update_cycle || 1,
      priority: 999
    };

    const startTime = Date.now();
    await processSingleKeyword(keywordData);
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      message: `키워드 "${keyword}" 테스트 완료`,
      keywordData,
      duration: Math.round(duration / 1000),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 키워드 테스트 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/search/daily-update/stats
 * 매일 갱신 서비스 통계
 */
router.get('/daily-update/stats', (req, res) => {
  try {
    const stats = getDailyUpdateServiceStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 서비스 통계 조회 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/search/batch-keywords
 * 여러 키워드 배치 처리 (고급 기능)
 */
router.post('/batch-keywords', async (req, res) => {
  try {
    const { keywords } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'keywords 배열이 필요합니다',
        example: {
          keywords: [
            { keyword: '먹방', category: '먹방 & 요리', min_view_count: 100000 },
            { keyword: 'K-pop', category: '음악', min_view_count: 200000 }
          ]
        }
      });
    }

    console.log(`🎯 배치 키워드 처리 API 호출: ${keywords.length}개 키워드`);

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < keywords.length; i++) {
      const keywordData = {
        id: 1000 + i, // 배치용 ID
        keyword: keywords[i].keyword,
        category: keywords[i].category || '배치 테스트',
        min_view_count: keywords[i].min_view_count || 10000,
        min_engagement_rate: keywords[i].min_engagement_rate || 1.0,
        update_cycle: keywords[i].update_cycle || 1,
        priority: 1000 + i
      };

      try {
        const keywordStartTime = Date.now();
        await processSingleKeyword(keywordData);
        const keywordDuration = Date.now() - keywordStartTime;

        results.push({
          success: true,
          keyword: keywordData.keyword,
          duration: Math.round(keywordDuration / 1000)
        });

      } catch (error) {
        results.push({
          success: false,
          keyword: keywordData.keyword,
          error: error.message
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    res.json({
      success: true,
      message: `배치 처리 완료: ${keywords.length}개 키워드`,
      results,
      summary: {
        total: keywords.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        totalDuration: Math.round(totalDuration / 1000),
        averageDuration: Math.round(totalDuration / keywords.length / 1000)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 배치 키워드 처리 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/search/retry-classifications
 * 분류 실패 영상 재분류 실행
 */
router.post('/retry-classifications', async (req, res) => {
  try {
    const { maxRetries = 3 } = req.body;

    console.log(`🔄 분류 실패 영상 재분류 API 호출 (최대 재시도: ${maxRetries}회)`);
    
    const startTime = Date.now();
    const result = await retryFailedClassifications(maxRetries);
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      message: result.message,
      duration: Math.round(duration / 1000),
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 재분류 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/search/failed-videos
 * 분류 실패 영상 목록 조회
 */
router.get('/failed-videos', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const limitNum = parseInt(limit);

    console.log(`📋 분류 실패 영상 목록 조회 (제한: ${limitNum}개)`);

    const result = getFailedClassificationVideos(limitNum);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 실패 영상 목록 조회 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/search/reprocess-videos
 * 특정 영상들만 재분류
 */
router.post('/reprocess-videos', async (req, res) => {
  try {
    const { videoIds } = req.body;

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'videoIds 배열이 필요합니다',
        example: {
          videoIds: ['video_id_1', 'video_id_2', 'video_id_3']
        }
      });
    }

    console.log(`🎯 특정 영상 재분류 API 호출: ${videoIds.length}개 영상`);

    const startTime = Date.now();
    const result = await reprocessSpecificVideos(videoIds);
    const duration = Date.now() - startTime;

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        duration: Math.round(duration / 1000),
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ 특정 영상 재분류 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/search/cleanup-failed
 * 분류 실패 목록 정리 (오래된 항목 제거)
 */
router.post('/cleanup-failed', (req, res) => {
  try {
    const { maxAge = 7 } = req.body;

    console.log(`🧹 분류 실패 목록 정리 API 호출 (${maxAge}일 이상 된 항목 제거)`);

    const result = cleanupFailedClassifications(maxAge);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 분류 실패 목록 정리 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/search/health
 * 검색 서비스 헬스체크
 */
router.get('/health', (req, res) => {
  try {
    const progress = getDailyUpdateProgress();
    const stats = getDailyUpdateServiceStats();

    // YouTube API 키 확인
    const hasYouTubeApiKey = !!process.env.YOUTUBE_API_KEY;
    const hasAnthropicApiKey = !!process.env.ANTHROPIC_API_KEY;

    res.json({
      success: true,
      status: 'healthy',
      services: {
        youtubeApi: hasYouTubeApiKey ? 'available' : 'missing_api_key',
        anthropicApi: hasAnthropicApiKey ? 'available' : 'missing_api_key',
        dailyUpdateService: 'running'
      },
      currentProgress: progress,
      serviceStats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/search/realtime
 * 실시간 키워드 검색 (사용자 요청 즉시 처리)
 * ✅ 수정됨 (2025-01-27): processSingleKeyword 사용으로 변경
 */
router.post('/realtime', async (req, res) => {
  try {
    const { keyword, category, min_view_count, min_engagement_rate, target_count, max_pages } = req.body;

    // 입력 유효성 검사
    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'keyword 파라미터가 필요합니다',
        required: ['keyword'],
        example: {
          keyword: "먹방",
          category: "먹방 & 요리",
          min_view_count: 10000,
          min_engagement_rate: 1.5
        }
      });
    }

    console.log(`🔍 실시간 키워드 검색 API 호출: "${keyword}"`);

    // processSingleKeyword 사용을 위한 keywordData 구성
    const keywordData = {
      id: Date.now(), // 실시간 요청용 고유 ID
      keyword: keyword.trim(),
      category: category || '실시간 검색',
      min_view_count: min_view_count || 10000,
      min_engagement_rate: min_engagement_rate || 1.5,
      update_cycle: 1,
      priority: 999, // 실시간 검색 우선순위
      // 실시간 검색 추가 옵션들
      target_count: target_count || 20,
      max_pages: max_pages || 3
    };

    // 빠른 처리 옵션 설정 (배치 크기만 조정)
    const processingOptions = {
      batchSize: 25                // 큰 배치로 빠른 처리
    };

    const startTime = Date.now();
    const result = await processSingleKeyword(keywordData, processingOptions);
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      message: `실시간 검색 완료: "${keyword}"`,
      keyword: keyword,
      mode: 'realtime',
      keywordData,
      duration: Math.round(duration / 1000),
      timestamp: new Date().toISOString(),
      note: "✅ 빠른 배치 처리 (batchSize=25) - 품질 기준 유지"
    });

  } catch (error) {
    console.error('❌ 실시간 검색 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      mode: 'realtime',
      timestamp: new Date().toISOString()
    });
  }
});

// ❌ 주석 처리됨 (2025-01-27): realtime-keyword-search.js 모듈 의존성 제거
// /**
//  * GET /api/search/realtime/session
//  * 현재 실시간 검색 세션 상태 조회
//  * ❌ 중복 기능으로 인해 비활성화됨 - processSingleKeyword로 통합됨
//  */
// router.get('/realtime/session', (req, res) => {
//   try {
//     console.log('📊 실시간 검색 세션 상태 조회');

//     const session = getCurrentSearchSession();

//     res.json({
//       success: true,
//       session,
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('❌ 세션 상태 조회 실패:', error);
    
//     res.status(500).json({
//       success: false,
//       error: error.message,
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// /**
//  * GET /api/search/realtime/failed-videos
//  * 실시간 검색의 분류 실패 영상 목록 조회
//  * ❌ 중복 기능으로 인해 비활성화됨 - processSingleKeyword로 통합됨
//  */
// router.get('/realtime/failed-videos', (req, res) => {
//   try {
//     const { sessionId } = req.query;

//     console.log(`📋 실시간 검색 분류 실패 영상 조회 ${sessionId ? `(세션: ${sessionId})` : '(전체)'}`);

//     const failedVideos = getRealtimeFailedClassifications(sessionId || null);

//     res.json({
//       success: true,
//       total: failedVideos.length,
//       videos: failedVideos,
//       sessionId: sessionId || 'all',
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('❌ 실시간 검색 실패 영상 조회 실패:', error);
    
//     res.status(500).json({
//       success: false,
//       error: error.message,
//       timestamp: new Date().toISOString()
//     });
//   }
// });

/**
 * POST /api/search/quick
 * 빠른 키워드 검색 (기본 설정 사용)
 * ✅ 수정됨 (2025-01-27): processSingleKeyword 사용으로 변경
 */
router.post('/quick', async (req, res) => {
  try {
    const { keyword, category } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'keyword 파라미터가 필요합니다',
        example: {
          keyword: '먹방',
          category: '음식' // 선택사항
        }
      });
    }

    console.log(`⚡ 빠른 키워드 검색 API 호출: "${keyword}"`);

    // processSingleKeyword 사용을 위한 빠른 검색 설정
    const quickKeywordData = {
      id: Date.now() + 1000, // 빠른 검색용 고유 ID
      keyword: keyword.trim(),
      category: category || '빠른 검색',
      min_view_count: 10000,    // 기본 품질 기준 유지
      min_engagement_rate: 1.5, // 기본 품질 기준 유지
      update_cycle: 1,
      priority: 998, // 빠른 검색 우선순위
      // 빠른 검색 최적화 설정
      target_count: 20,         // 기본 목표 유지
      max_pages: 3              // 기본 페이지 수 유지
    };

    // 빠른 처리 옵션 설정 (배치 크기만 조정)
    const quickProcessingOptions = {
      batchSize: 20             // 큰 배치 크기로 빠른 처리
    };

    const startTime = Date.now();
    const result = await processSingleKeyword(quickKeywordData, quickProcessingOptions);
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      message: `빠른 검색 완료: "${keyword}"`,
      keyword: keyword,
      mode: 'quick',
      keywordData: quickKeywordData,
      duration: Math.round(duration / 1000),
      timestamp: new Date().toISOString(),
      note: "✅ 빠른 배치 처리 (batchSize=20) - 품질 기준 유지"
    });

  } catch (error) {
    console.error('❌ 빠른 검색 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      mode: 'quick',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/search/multi-keywords
 * 🚀 다중 키워드 빠른 처리 (사용자 대기 시간 최소화)
 * 첫 번째 키워드 결과를 즉시 반환하고, 나머지는 백그라운드에서 처리
 */
router.post('/multi-keywords', async (req, res) => {
  try {
    const { keywords, options = {} } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'keywords 배열이 필요합니다',
        example: {
          keywords: ['먹방', 'ASMR', '브이로그'],
          options: {
            fastMode: true,
            maxConcurrent: 3,
            priority: 'user_experience'
          }
        }
      });
    }

    console.log(`🚀 다중 키워드 빠른 처리 API: ${keywords.length}개 키워드`);

    // 빠른 배치 처리 설정
    const fastProcessingOptions = {
      batchSize: 25                // 큰 배치로 빠른 처리
    };

    const sessionId = Date.now().toString();
    const maxConcurrent = options.maxConcurrent || 3;
    const results = [];
    const startTime = Date.now();

    // 첫 번째 키워드를 즉시 처리 (우선 응답)
    const firstKeyword = keywords[0];
    const firstKeywordData = {
      id: sessionId + '_1',
      keyword: firstKeyword.trim(),
      category: '다중 검색',
      min_view_count: 10000,        // 기본 품질 기준 유지
      min_engagement_rate: 1.5,     // 기본 품질 기준 유지
      update_cycle: 1,
      priority: 1000
    };

    try {
      console.log(`   ⚡ 첫 번째 키워드 우선 처리: "${firstKeyword}"`);
      const firstStartTime = Date.now();
      await processSingleKeyword(firstKeywordData, fastProcessingOptions);
      const firstDuration = Date.now() - firstStartTime;
      
      results.push({
        success: true,
        keyword: firstKeyword,
        order: 1,
        duration: Math.round(firstDuration / 1000),
        status: 'completed'
      });

      console.log(`   ✅ 첫 번째 키워드 완료: ${Math.round(firstDuration / 1000)}초`);

    } catch (error) {
      results.push({
        success: false,
        keyword: firstKeyword,
        order: 1,
        error: error.message,
        status: 'failed'
      });
    }

    // 남은 키워드들을 백그라운드에서 처리 (응답 후)
    if (keywords.length > 1) {
      const remainingKeywords = keywords.slice(1);
      
      // 비동기 백그라운드 처리 (응답 후 실행)
      setImmediate(async () => {
        console.log(`   🔄 백그라운드에서 ${remainingKeywords.length}개 키워드 처리 시작`);
        
        // 동시 처리 제한 (서버 부하 방지)
        for (let i = 0; i < remainingKeywords.length; i += maxConcurrent) {
          const batch = remainingKeywords.slice(i, i + maxConcurrent);
          
          const batchPromises = batch.map(async (keyword, index) => {
            const keywordData = {
              id: sessionId + '_' + (i + index + 2),
              keyword: keyword.trim(),
              category: '다중 검색',
              min_view_count: 10000,        // 기본 품질 기준 유지
              min_engagement_rate: 1.5,     // 기본 품질 기준 유지
              update_cycle: 1,
              priority: 1000 + i + index
            };

            try {
              await processSingleKeyword(keywordData, fastProcessingOptions);
              console.log(`   ✅ 백그라운드 처리 완료: "${keyword}"`);
              return { success: true, keyword, order: i + index + 2 };
            } catch (error) {
              console.error(`   ❌ 백그라운드 처리 실패: "${keyword}" - ${error.message}`);
              return { success: false, keyword, order: i + index + 2, error: error.message };
            }
          });

          await Promise.all(batchPromises);
          
          // 배치 간 간격 (서버 과부하 방지)
          if (i + maxConcurrent < remainingKeywords.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        console.log(`🎉 다중 키워드 백그라운드 처리 완료: ${remainingKeywords.length}개`);
      });
    }

    const totalDuration = Date.now() - startTime;

    // 첫 번째 결과와 처리 계획을 즉시 응답
    res.json({
      success: true,
      message: `다중 키워드 처리 시작: "${firstKeyword}" 완료, ${keywords.length - 1}개 백그라운드 처리 중`,
      sessionId,
      immediateResult: {
        keyword: firstKeyword,
        completed: true,
        duration: results[0]?.duration || 0
      },
      backgroundProcessing: {
        remaining: keywords.length - 1,
        keywords: keywords.slice(1),
        estimatedCompletion: '30-60초 내 완료 예상'
      },
      strategy: {
        mode: 'user_experience_optimized',
        firstKeywordImmediate: true,      // 첫 번째 키워드 즉시 처리
        backgroundConcurrency: maxConcurrent, // 백그라운드 동시 처리 개수
        batchOptimization: true           // 배치 크기 최적화 적용
      },
      duration: Math.round(totalDuration / 1000),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 다중 키워드 처리 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/search/ultra-fast
 * 🏆 최고속 단일 키워드 검색 (최적화된 설정)
 * LLM 배치 크기 최대화, 모든 최적화 적용
 */
router.post('/ultra-fast', async (req, res) => {
  try {
    const { keyword, category } = req.body;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'keyword 파라미터가 필요합니다',
        example: {
          keyword: '먹방',
          category: '음식'
        }
      });
    }

    console.log(`🏆 최고속 검색 API 호출: "${keyword}"`);

    const ultraFastKeywordData = {
      id: Date.now() + 2000,
      keyword: keyword.trim(),
      category: category || '최고속 검색',
      min_view_count: 10000,        // 기본 품질 기준 유지
      min_engagement_rate: 1.5,     // 기본 품질 기준 유지
      update_cycle: 1,
      priority: 9999,               // 최고 우선순위
      target_count: 20,             // 기본 목표 유지
      max_pages: 3                  // 기본 페이지 수 유지
    };

    // 최고속 처리 옵션 (배치 크기만 최대화)
    const ultraFastOptions = {
      batchSize: 30                 // 최대 배치 크기로 빠른 처리
    };

    const startTime = Date.now();
    const result = await processSingleKeyword(ultraFastKeywordData, ultraFastOptions);
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      message: `최고속 검색 완료: "${keyword}"`,
      keyword: keyword,
      mode: 'ultra_fast',
      optimizations: {
        llmBatchSize: 30,           // 최대 배치 크기로 빠른 처리
        qualityStandard: 'maintained', // 품질 기준 유지
        channelUpdate: 'included'   // 채널 정보 업데이트 포함
      },
      keywordData: ultraFastKeywordData,
      duration: Math.round(duration / 1000),
      speedRank: '🏆 ULTRA FAST',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 최고속 검색 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      mode: 'ultra_fast',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 