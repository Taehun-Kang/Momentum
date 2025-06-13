/**
 * 🎯 개인화 감성 분석 API Routes
 * 
 * 📋 엔드포인트:
 * - POST /api/v1/llm/analyze - 감성 문장 분석 (메인 기능)
 * - POST /api/v1/llm/quick-keywords - 빠른 키워드 추출
 * - POST /api/v1/llm/track-click - 감성 문장 클릭 추적
 * - GET /api/v1/llm/stats - 서비스 통계
 * - GET /api/v1/llm/health - 헬스 체크
 */

import express from 'express';
import { 
  analyzeEmotionalCuration,
  quickKeywords,
  trackCurationClick,
  getPersonalizedStats 
} from '../services/llm/personalizedCurationService.js';

const router = express.Router();

/**
 * 🌟 POST /api/llm/analyze - 감성 문장 분석 (메인 기능)
 * 
 * 자연어 입력을 받아서 개인화된 감성 문장과 키워드를 생성
 */
router.post('/analyze', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🌟 감성 분석 API 호출:', req.body);

    // 🔧 요청 데이터 파싱
    const {
      userInput,
      userId = null,
      inputType = 'emotion', // 'emotion' or 'topic'
      maxKeywords = 8,
      responseFormat = 'full' // 'full', 'quick', 'keywords-only'
    } = req.body;

    // ✅ 입력 검증
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'invalid_input',
        message: 'userInput이 필요합니다.',
        example: {
          userInput: "퇴근하고 와서 피곤해",
          userId: "user123", // 선택사항
          inputType: "emotion",
          responseFormat: "full"
        }
      });
    }

    if (userInput.length < 2 || userInput.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'input_length_invalid',
        message: '입력은 2자 이상 500자 이하여야 합니다.',
        current: userInput.length
      });
    }

    // 🎯 감성 분석 실행
    const result = await analyzeEmotionalCuration(userInput, {
      userId,
      inputType,
      maxKeywords: parseInt(maxKeywords),
      responseFormat
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'analysis_failed',
        message: result.error,
        fallback: result.fallback
      });
    }

    // 📊 응답 데이터 구성
    const responseData = {
      success: true,
      data: result.emotionalAnalysis || result, // 응답 형식에 따라 다름
      userAnalysis: result.userAnalysis,
      nextSteps: result.nextSteps,
      meta: {
        ...result.meta,
        apiProcessingTime: Date.now() - startTime
      }
    };

    res.json(responseData);

  } catch (error) {
    console.error('🌟 감성 분석 API 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * ⚡ POST /api/llm/quick-keywords - 빠른 키워드 추출
 * 
 * 빠른 키워드 추출만 수행 (감성 문장 없음)
 */
router.post('/quick-keywords', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('⚡ 빠른 키워드 API 호출:', req.body);

    const {
      userInput,
      userId = null
    } = req.body;

    // ✅ 입력 검증
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'invalid_input',
        message: 'userInput이 필요합니다.'
      });
    }

    // ⚡ 빠른 키워드 추출
    const result = await quickKeywords(userInput, userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'extraction_failed',
        message: result.error
      });
    }

    res.json({
      success: true,
      data: {
        keywords: result.keywords,
        searchTerms: result.searchTerms,
        personalization: result.personalization
      },
      meta: {
        processingTime: Date.now() - startTime,
        userId: userId,
        timestamp: new Date().toISOString(),
        mode: 'quick_keywords_only'
      }
    });

  } catch (error) {
    console.error('⚡ 빠른 키워드 API 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 🎯 POST /api/llm/track-click - 감성 문장 클릭 추적
 * 
 * 사용자가 감성 문장을 클릭했을 때 추적 (다음 단계 준비)
 */
router.post('/track-click', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🎯 클릭 추적 API 호출:', req.body);

    const {
      curationId,
      userId = null,
      clickData = {} // 클릭된 문장의 추가 데이터
    } = req.body;

    // ✅ 입력 검증
    if (!curationId) {
      return res.status(400).json({
        success: false,
        error: 'missing_curation_id',
        message: 'curationId가 필요합니다.',
        example: {
          curationId: "curation_1673456789_0",
          userId: "user123",
          clickData: {
            sentence: "오늘 하루를 잔잔하게 마무리하고 싶다면",
            keywords: ["힐링", "ASMR"]
          }
        }
      });
    }

    // 🎯 클릭 추적 실행
    const result = await trackCurationClick(curationId, userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'tracking_failed',
        message: result.error
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        curationId: result.curationId,
        nextModule: result.nextModule,
        clickData: clickData
      },
      meta: {
        processingTime: Date.now() - startTime,
        userId: userId,
        timestamp: result.timestamp,
        readyForVideoSearch: true
      }
    });

  } catch (error) {
    console.error('🎯 클릭 추적 API 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 📊 GET /api/llm/stats - 서비스 통계
 * 
 * 감성 분석 서비스의 통계 정보 조회
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 감성 분석 통계 API 호출');

    const stats = getPersonalizedStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('📊 감성 분석 통계 API 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'stats_fetch_failed',
      message: error.message
    });
  }
});

/**
 * 🏥 GET /api/llm/health - 서비스 상태 확인
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'PersonalizedCurationService',
      version: '1.1',
      mode: 'v3.2_three_stage_analysis',
      workflow: '1단계:입력분석 → 2단계:DB수집 → 3단계:키워드생성',
      features: [
        '🔍 1단계: Claude 정확한 감정/상태 분석',
        '🗃️ 2단계: 분석된 감정 기반 개인화 데이터 수집',
        '🎨 3단계: 종합적 키워드 생성 및 감성 문장 큐레이션',
        '🎯 클릭 추적 시스템 (4개 감성 문장)'
      ],
      apiKeys: {
        claude: !!process.env.ANTHROPIC_API_KEY
      },
      endpoints: [
        'POST /api/llm/analyze',
        'POST /api/llm/quick-keywords', 
        'POST /api/llm/track-click',
        'GET /api/llm/stats',
        'GET /api/llm/health'
      ],
      v32Improvements: {
        logicalOrder: '논리적 3단계 순서로 개선',
        accurateAnalysis: 'Claude 우선 감정 분석',
        dbIntegration: '분석 결과 기반 DB 데이터 수집',
        fourSentences: '4개 감성 문장으로 선택지 확대'
      },
      nextPhase: {
        description: '클릭 기반 영상 검색 및 DB 업데이트',
        modules: ['video_search_service', 'user_preference_updater']
      }
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

/**
 * 🧪 POST /api/llm/test - 테스트 엔드포인트 (개발용)
 */
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 감성 분석 테스트 API 호출');

    const testInputs = [
      "퇴근하고 와서 피곤해",
      "오늘 기분이 좋아서 신나는 영상 보고 싶어",
      "스트레스 받아서 힐링되는 거 찾고 있어",
      "요리 영상 보면서 저녁 만들고 싶어"
    ];

    const testResults = [];

    for (const input of testInputs) {
      try {
        const result = await analyzeEmotionalCuration(input, {
          inputType: 'emotion',
          responseFormat: 'quick'
        });

        testResults.push({
          input,
          success: result.success,
          curations: result.curations?.slice(0, 1) || [],
          keywordCount: Object.keys(result.topKeywords || {}).length,
          personalizationScore: result.personalizationScore
        });
      } catch (testError) {
        testResults.push({
          input,
          success: false,
          error: testError.message
        });
      }
    }

    res.json({
      success: true,
      message: '감성 분석 테스트 완료',
      data: {
        testResults,
        summary: {
          totalTests: testInputs.length,
          successfulTests: testResults.filter(r => r.success).length,
          averagePersonalization: testResults
            .filter(r => r.success)
            .reduce((sum, r) => sum + (r.personalizationScore || 0), 0) / 
            testResults.filter(r => r.success).length || 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🧪 감성 분석 테스트 오류:', error);
    
    res.status(500).json({
      success: false,
      error: 'test_failed',
      message: error.message
    });
  }
});

export default router; 