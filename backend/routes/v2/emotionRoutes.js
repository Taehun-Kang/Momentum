/**
 * 🎭 v2 Emotion Routes
 * 
 * 감정 기반 키워드 추천 API 엔드포인트
 * - 감정 분석 및 키워드 추천 
 * - 감성적 큐레이션 문장 생성
 * - 시스템 상태 모니터링
 */

import express from 'express';
import { 
  getEmotionBasedRecommendation,
  analyzeEmotion,
  getKeywordStats,
  quickTest,
  healthCheck,
  summarizeForUI
} from '../../services/v2_emotion/stage1Service.js';

const router = express.Router();

/**
 * POST /api/v2/emotion/recommend
 * 감정 기반 키워드 추천 (메인 기능)
 */
router.post('/recommend', async (req, res) => {
  try {
    const { userInput, inputType = 'emotion' } = req.body;

    // 입력 유효성 검사
    if (!userInput) {
      return res.status(400).json({
        success: false,
        error: 'userInput 파라미터가 필요합니다',
        required: ['userInput'],
        example: {
          userInput: "너무 피곤해",
          inputType: "emotion"
        }
      });
    }

    console.log(`🎭 감정 기반 추천 API 호출: "${userInput}"`);

    const startTime = Date.now();
    const result = await getEmotionBasedRecommendation(userInput, inputType);
    const duration = Date.now() - startTime;

    if (result.success) {
      // UI용 데이터로 정리
      const uiData = summarizeForUI(result);
      
      res.json({
        success: true,
        message: `감정 기반 추천 완료: ${result.emotion}`,
        userInput,
        duration: Math.round(duration / 1000),
        ...uiData,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        userInput,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ 감정 기반 추천 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v2/emotion/analyze
 * 감정 분석만 실행 (키워드 생성 없음)
 */
router.post('/analyze', async (req, res) => {
  try {
    const { userInput } = req.body;

    if (!userInput) {
      return res.status(400).json({
        success: false,
        error: 'userInput 파라미터가 필요합니다',
        example: {
          userInput: "스트레스 받아서 힘들어"
        }
      });
    }

    console.log(`🧠 감정 분석 API 호출: "${userInput}"`);

    const startTime = Date.now();
    const result = await analyzeEmotion(userInput);
    const duration = Date.now() - startTime;

    res.json({
      success: result.success,
      message: result.success ? `감정 분석 완료: ${result.emotion}` : '감정 분석 실패',
      userInput,
      duration: Math.round(duration / 1000),
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 감정 분석 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v2/emotion/quick-test  
 * 빠른 테스트 (개발/디버깅용)
 */
router.post('/quick-test', async (req, res) => {
  try {
    const { testInput = '너무 피곤해' } = req.body;

    console.log(`⚡ 빠른 테스트 API 호출: "${testInput}"`);

    const startTime = Date.now();
    const result = await quickTest(testInput);
    const duration = Date.now() - startTime;

    res.json({
      success: result.success,
      message: result.success ? '빠른 테스트 성공' : '빠른 테스트 실패',
      testInput,
      duration: Math.round(duration / 1000),
      testResult: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 빠른 테스트 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v2/emotion/stats
 * 키워드 통계 조회
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 키워드 통계 API 호출');

    const result = await getKeywordStats();

    res.json({
      success: result.success,
      message: result.success ? '키워드 통계 조회 완료' : '통계 조회 실패',
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 키워드 통계 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v2/emotion/health
 * 감정 서비스 헬스체크
 */
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 감정 서비스 헬스체크 API 호출');

    const result = await healthCheck();

    res.json({
      success: result.success,
      status: result.success ? 'healthy' : 'unhealthy',
      message: result.success ? '감정 서비스 정상' : '감정 서비스 이상',
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 감정 서비스 헬스체크 실패:', error);
    
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v2/emotion/batch-analyze
 * 다중 감정 분석 (배치 처리)
 */
router.post('/batch-analyze', async (req, res) => {
  try {
    const { inputs } = req.body;

    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'inputs 배열이 필요합니다',
        example: {
          inputs: ["너무 피곤해", "기분 좋아", "스트레스 받아"]
        }
      });
    }

    console.log(`🎯 배치 감정 분석 API 호출: ${inputs.length}개 입력`);

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < inputs.length; i++) {
      try {
        const inputStartTime = Date.now();
        const result = await analyzeEmotion(inputs[i]);
        const inputDuration = Date.now() - inputStartTime;

        results.push({
          success: result.success,
          input: inputs[i],
          emotion: result.emotion,
          intensity: result.intensity,
          emotionalNeed: result.emotionalNeed,
          duration: Math.round(inputDuration / 1000)
        });

      } catch (error) {
        results.push({
          success: false,
          input: inputs[i],
          error: error.message
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    res.json({
      success: true,
      message: `배치 감정 분석 완료: ${inputs.length}개 입력`,
      results,
      summary: {
        total: inputs.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        totalDuration: Math.round(totalDuration / 1000),
        averageDuration: Math.round(totalDuration / inputs.length / 1000)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 배치 감정 분석 API 실패:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
