/**
 * 🎯 Stage1 감정 기반 키워드 추천 서비스
 * 
 * 핵심 기능:
 * - 감정 기반 키워드 추천 (10-15개)
 * - 감성적 큐레이션 문장 생성 (4개)
 * - 213개 캐시된 키워드에서 선택
 * 
 * 사용법:
 * const { getEmotionBasedRecommendation, analyzeEmotion } = require('./services/v2_emotion/stage1Service');
 * const result = await getEmotionBasedRecommendation('너무 피곤해');
 */

import CachedKeywordSelector from './stage1_cached_selector.js';

// 전역 인스턴스 (싱글톤 패턴)
let selectorInstance = null;

/**
 * 🎪 메인 기능: 감정 기반 키워드 추천
 * @param {string} userInput - 사용자 입력 ("너무 피곤해", "기분 좋아" 등)
 * @param {string} inputType - 입력 타입 (기본값: 'emotion')
 * @returns {Promise<Object>} 추천 결과
 */
async function getEmotionBasedRecommendation(userInput, inputType = 'emotion') {
  try {
    // 인스턴스 생성 (최초 1회만)
    if (!selectorInstance) {
      selectorInstance = new CachedKeywordSelector();
    }

    // 메인 추천 실행
    const result = await selectorInstance.getCachedRecommendation(userInput, inputType);
    
    return result;

  } catch (error) {
    console.error('🚨 Stage1 서비스 오류:', error.message);
    
    return {
      success: false,
      stage: 1,
      error: error.message,
      userInput,
      inputType,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 🧠 감정 분석만 단독 실행
 * @param {string} userInput - 사용자 입력
 * @returns {Promise<Object>} 감정 분석 결과
 */
async function analyzeEmotion(userInput) {
  try {
    if (!selectorInstance) {
      selectorInstance = new CachedKeywordSelector();
    }

    const emotionAnalysis = await selectorInstance.analyzeUserEmotion(userInput);
    
    return {
      success: true,
      emotion: emotionAnalysis.emotion?.[0] || '감정분석실패',
      intensity: emotionAnalysis.intensity?.[emotionAnalysis.emotion?.[0]] || '보통',
      allEmotions: emotionAnalysis.emotion || [],
      context: emotionAnalysis.context,
      emotionalNeed: emotionAnalysis.emotional_need,
      confidence: emotionAnalysis.confidence,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('🚨 감정 분석 오류:', error.message);
    
    return {
      success: false,
      error: error.message,
      emotion: '분석실패',
      userInput,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 🔍 키워드 개수 확인
 * @returns {Promise<Object>} 키워드 통계
 */
async function getKeywordStats() {
  try {
    if (!selectorInstance) {
      selectorInstance = new CachedKeywordSelector();
    }

    const keywords = await selectorInstance.loadUsedKeywords();
    
    // 카테고리별 분류
    const categoryStats = {};
    keywords.forEach(keyword => {
      if (!categoryStats[keyword.category]) {
        categoryStats[keyword.category] = 0;
      }
      categoryStats[keyword.category]++;
    });

    return {
      success: true,
      totalKeywords: keywords.length,
      categoryStats,
      sampleKeywords: keywords.slice(0, 10).map(k => k.keyword),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('🚨 키워드 통계 오류:', error.message);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 🎨 감정별 추천 결과 요약 (UI용)
 * @param {Object} recommendation - getEmotionBasedRecommendation 결과
 * @returns {Object} UI용 요약 데이터
 */
function summarizeForUI(recommendation) {
  if (!recommendation.success) {
    return {
      success: false,
      error: recommendation.error
    };
  }

  return {
    success: true,
    emotion: {
      primary: recommendation.emotion,
      intensity: recommendation.emotionIntensity,
      need: recommendation.emotionalNeed
    },
    keywords: {
      selected: recommendation.finalKeywords || [],
      count: recommendation.keywordCount || 0
    },
    sentences: recommendation.emotionalSentences?.map(s => ({
      text: s.sentence,
      keywords: s.keywords,
      length: s.sentence?.length || 0
    })) || [],
    performance: {
      processingTime: recommendation.processingTime,
      timestamp: recommendation.timestamp
    }
  };
}

/**
 * 🧪 빠른 테스트 함수
 * @param {string} testInput - 테스트 입력
 * @returns {Promise<Object>} 테스트 결과
 */
async function quickTest(testInput = '너무 피곤해') {
  console.log(`⚡ Stage1 빠른 테스트: "${testInput}"`);
  
  const startTime = Date.now();
  
  try {
    const result = await getEmotionBasedRecommendation(testInput);
    const endTime = Date.now();
    
    if (result.success) {
      console.log('✅ 테스트 성공!');
      console.log(`  감정: ${result.emotion} (${result.emotionIntensity})`);
      console.log(`  키워드: ${result.keywordCount}개`);
      console.log(`  문장: ${result.emotionalSentences?.length || 0}개`);
      console.log(`  처리시간: ${endTime - startTime}ms`);
      
      return { success: true, result, testTime: endTime - startTime };
    } else {
      console.log('❌ 테스트 실패:', result.error);
      return { success: false, error: result.error };
    }

  } catch (error) {
    console.error('💥 테스트 에러:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🏥 서비스 상태 체크
 * @returns {Promise<Object>} 상태 정보
 */
async function healthCheck() {
  try {
    // 환경 변수 체크
    const envCheck = {
      anthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    // 키워드 로드 테스트
    const keywordStats = await getKeywordStats();

    return {
      success: true,
      service: 'Stage1Service',
      environment: envCheck,
      keywords: keywordStats.success ? {
        total: keywordStats.totalKeywords,
        categories: Object.keys(keywordStats.categoryStats).length
      } : { error: keywordStats.error },
      instance: !!selectorInstance,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      service: 'Stage1Service',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 내보내기
export {
  // 메인 기능
  getEmotionBasedRecommendation,
  analyzeEmotion,
  
  // 유틸리티
  getKeywordStats,
  summarizeForUI,
  
  // 테스트 및 모니터링
  quickTest,
  healthCheck
};

// 기본 내보내기 (호환성)
export default {
  getEmotionBasedRecommendation,
  analyzeEmotion,
  getKeywordStats,
  summarizeForUI,
  quickTest,
  healthCheck
};
