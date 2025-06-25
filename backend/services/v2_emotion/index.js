/**
 * 🔑 v2_emotion 모듈 통합 인덱스
 * 
 * 감정 기반 키워드 추천 시스템의 통합 인터페이스
 * 3단계 점진적 추천 시스템을 제공합니다.
 * 
 * Stage 1: 감정 분석 + 캐시 키워드 선택 (0.6초)
 * Stage 2: 감정 확장 + 하이브리드 생성 (0.8초)  
 * Stage 3: 완전 개인화 감정 맞춤 (1.0초)
 */

import CachedKeywordSelector from './stage1_cached_selector.js';
import HybridKeywordGenerator from './stage2_hybrid_generator.js';
import PersonalizedCurationMaster from './stage3_personalized_curator.js';

class V2KeywordSystem {
  constructor() {
    // 3단계 시스템 인스턴스
    this.stage1 = new CachedKeywordSelector();
    this.stage2 = new HybridKeywordGenerator();
    this.stage3 = new PersonalizedCurationMaster();
    
    // 시스템 상태
    this.systemStats = {
      totalRequests: 0,
      stage1Requests: 0,
      stage2Requests: 0,
      stage3Requests: 0,
      averageResponseTime: 0,
      successRate: 0
    };
  }

  /**
   * 🚀 스마트 단계 선택 (자동 단계 결정)
   */
  async getSmartRecommendation(userInput, context = {}) {
    console.log(`🚀 [스마트 선택] 최적 단계 결정: "${userInput}"`);
    
    const { 
      inputType = 'emotion',
      userId = null,
      urgency = 'normal',
      personalizeRequest = false
    } = context;
    
    // 단계 결정 로직
    let selectedStage = 1;
    
    if (personalizeRequest && userId) {
      selectedStage = 3; // 개인화 요청 + 사용자 ID 있음
    } else if (userId || urgency === 'high') {
      selectedStage = 2; // 사용자 식별 가능 또는 높은 우선순위
    } else {
      selectedStage = 1; // 기본 캐시 기반
    }
    
    console.log(`   🎯 선택된 단계: ${selectedStage}단계`);
    
    // 선택된 단계 실행
    switch (selectedStage) {
      case 1:
        return await this.getCachedRecommendation(userInput, inputType);
      case 2:
        return await this.getHybridRecommendation(userInput, inputType);
      case 3:
        return await this.getPersonalizedRecommendation(userInput, inputType, userId);
      default:
        throw new Error(`잘못된 단계: ${selectedStage}`);
    }
  }

  /**
   * ⚡ 1단계: 캐시 기반 추천 (10-15개 키워드)
   */
  async getCachedRecommendation(userInput, inputType = 'emotion') {
    console.log(`⚡ [1단계] 캐시 기반 추천 실행`);
    const startTime = Date.now();
    
    try {
      this.systemStats.totalRequests++;
      this.systemStats.stage1Requests++;
      
      const result = await this.stage1.getCachedRecommendation(userInput, inputType);
      
      if (result.success) {
        this.updateSystemStats(true, Date.now() - startTime);
        console.log(`✅ [1단계] 성공: ${result.finalKeywords?.length || 0}개 키워드, ${result.processingTime}ms`);
      }
      
      return {
        ...result,
        systemStage: 1,
        stageDescription: '캐시 기반 빠른 추천 (10-15개 키워드)'
      };
      
    } catch (error) {
      this.updateSystemStats(false, Date.now() - startTime);
      console.error(`❌ [1단계] 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🌟 2단계: 하이브리드 추천 (기존 + 새생성)
   */
  async getHybridRecommendation(userInput, inputType = 'emotion') {
    console.log(`🌟 [2단계] 하이브리드 추천 실행`);
    const startTime = Date.now();
    
    try {
      this.systemStats.totalRequests++;
      this.systemStats.stage2Requests++;
      
      const result = await this.stage2.getHybridRecommendation(userInput, inputType);
      
      if (result.success) {
        this.updateSystemStats(true, Date.now() - startTime);
        console.log(`✅ [2단계] 성공: 기존 ${result.keywordBreakdown?.existing || 0}개 + 신규 ${result.keywordBreakdown?.new || 0}개, ${result.processingTime}ms`);
      }
      
      return {
        ...result,
        systemStage: 2,
        stageDescription: '하이브리드 추천 (기존 + 새로운 키워드 생성)'
      };
      
    } catch (error) {
      this.updateSystemStats(false, Date.now() - startTime);
      console.error(`❌ [2단계] 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🎯 3단계: 개인화 추천 (15-20개 개인 맞춤)
   */
  async getPersonalizedRecommendation(userInput, inputType = 'emotion', userId = null) {
    console.log(`🎯 [3단계] 개인화 추천 실행`);
    const startTime = Date.now();
    
    try {
      this.systemStats.totalRequests++;
      this.systemStats.stage3Requests++;
      
      const result = await this.stage3.getPersonalizedRecommendation(userInput, inputType, userId);
      
      if (result.success) {
        this.updateSystemStats(true, Date.now() - startTime);
        console.log(`✅ [3단계] 성공: 총 ${result.keywordBreakdown?.total || 0}개 키워드 (개인화 ${result.keywordBreakdown?.personalized || 0}개), ${result.processingTime}ms`);
      }
      
      return {
        ...result,
        systemStage: 3,
        stageDescription: '완전 개인화 추천 (사용자 맞춤 + 고도화 문장)'
      };
      
    } catch (error) {
      this.updateSystemStats(false, Date.now() - startTime);
      console.error(`❌ [3단계] 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📊 시스템 상태 및 통계
   */
  getSystemStats() {
    return {
      system: 'v2_emotion',
      version: '1.0.0',
      stages: {
        1: { 
          name: 'CachedKeywordSelector',
          description: '캐시 기반 빠른 추천 (10-15개)',
          targetTime: '0.6초',
          requests: this.systemStats.stage1Requests
        },
        2: { 
          name: 'HybridKeywordGenerator',
          description: '하이브리드 추천 (기존 + 새생성)',
          targetTime: '0.8초',
          requests: this.systemStats.stage2Requests
        },
        3: { 
          name: 'PersonalizedCurationMaster',
          description: '완전 개인화 추천 (15-20개)',
          targetTime: '1.0초',
          requests: this.systemStats.stage3Requests
        }
      },
      performance: {
        totalRequests: this.systemStats.totalRequests,
        averageResponseTime: `${this.systemStats.averageResponseTime}ms`,
        successRate: `${this.systemStats.successRate}%`
      },
      features: {
        keywordSources: '240개 캐시된 키워드 + AI 생성',
        aiModel: 'Claude 3.7 Sonnet',
        emotionalSentences: '4개 (키워드 3개 이상 조합)',
        personalization: '사용자 프로필 기반 학습',
        caching: '차별화된 TTL 전략'
      }
    };
  }

  /**
   * 🔧 시스템 헬스 체크
   */
  async healthCheck() {
    console.log(`🔧 [시스템 체크] v2_emotion 상태 확인`);
    
    const health = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      stages: {},
      database: 'unknown',
      ai: 'unknown'
    };
    
    try {
      // 1단계 체크
      const stage1Test = await this.stage1.loadUsedKeywords();
      health.stages.stage1 = {
        status: stage1Test.length > 0 ? 'healthy' : 'warning',
        keywordCount: stage1Test.length,
        message: `${stage1Test.length}개 키워드 로드 가능`
      };
      
      // 데이터베이스 연결 체크
      if (this.stage1.supabase) {
        const { data, error } = await this.stage1.supabase
          .from('daily_keywords_v2')
          .select('count(*)', { count: 'exact' })
          .limit(1);
        
        health.database = error ? 'error' : 'healthy';
      }
      
      // 2-3단계는 1단계를 상속하므로 기본적으로 동일한 상태
      health.stages.stage2 = { 
        status: health.stages.stage1.status,
        message: '하이브리드 생성 준비 완료'
      };
      health.stages.stage3 = { 
        status: health.stages.stage1.status,
        message: '개인화 시스템 준비 완료'
      };
      
      // AI 연결 체크 (간접적)
      health.ai = this.stage1.anthropic ? 'ready' : 'not_configured';
      
      // 전체 상태 결정
      const hasError = Object.values(health.stages).some(stage => stage.status === 'error');
      const hasWarning = Object.values(health.stages).some(stage => stage.status === 'warning');
      
      if (hasError || health.database === 'error') {
        health.overall = 'error';
      } else if (hasWarning || health.database === 'unknown') {
        health.overall = 'warning';
      }
      
      console.log(`   📊 시스템 상태: ${health.overall.toUpperCase()}`);
      return health;
      
    } catch (error) {
      console.error(`   ❌ 헬스 체크 실패: ${error.message}`);
      health.overall = 'error';
      health.error = error.message;
      return health;
    }
  }

  /**
   * 🎛️ 단계별 직접 접근 (고급 사용자용)
   */
  getStage(stageNumber) {
    switch (stageNumber) {
      case 1:
        return this.stage1;
      case 2:
        return this.stage2;
      case 3:
        return this.stage3;
      default:
        throw new Error(`존재하지 않는 단계: ${stageNumber} (1-3만 가능)`);
    }
  }

  /**
   * 📈 통계 업데이트 (내부 함수)
   */
  updateSystemStats(success, responseTime) {
    // 평균 응답 시간 계산
    this.systemStats.averageResponseTime = Math.round(
      (this.systemStats.averageResponseTime * (this.systemStats.totalRequests - 1) + responseTime) / 
      this.systemStats.totalRequests
    );
    
    // 성공률 계산 (임시로 success 기반)
    const successCount = success ? 1 : 0;
    this.systemStats.successRate = Math.round(
      ((this.systemStats.successRate * (this.systemStats.totalRequests - 1)) / 100 + successCount) / 
      this.systemStats.totalRequests * 100
    );
  }
}

// 싱글톤 인스턴스 생성
const v2KeywordSystem = new V2KeywordSystem();

/**
 * 🎯 메인 API 함수들 (Express 라우터에서 사용)
 */

// 스마트 추천 (자동 단계 선택)
export const getSmartKeywordRecommendation = async (userInput, context = {}) => {
  return await v2KeywordSystem.getSmartRecommendation(userInput, context);
};

// 1단계: 캐시 기반 (가장 빠름)
export const getCachedKeywordRecommendation = async (userInput, inputType = 'emotion') => {
  return await v2KeywordSystem.getCachedRecommendation(userInput, inputType);
};

// 2단계: 하이브리드 (균형)
export const getHybridKeywordRecommendation = async (userInput, inputType = 'emotion') => {
  return await v2KeywordSystem.getHybridRecommendation(userInput, inputType);
};

// 3단계: 개인화 (가장 정밀)
export const getPersonalizedKeywordRecommendation = async (userInput, inputType = 'emotion', userId = null) => {
  return await v2KeywordSystem.getPersonalizedRecommendation(userInput, inputType, userId);
};

// 시스템 정보
export const getV2KeywordSystemStats = () => {
  return v2KeywordSystem.getSystemStats();
};

// 헬스 체크
export const checkV2KeywordHealth = async () => {
  return await v2KeywordSystem.healthCheck();
};

// 고급: 단계별 직접 접근
export const getKeywordStage = (stageNumber) => {
  return v2KeywordSystem.getStage(stageNumber);
};

// 기본 export
export default v2KeywordSystem;

/**
 * 📚 사용 예시:
 * 
 * // 1. 스마트 자동 선택 (권장)
 * const result = await getSmartKeywordRecommendation("피곤해서 쉬고 싶어", {
 *   userId: "user123",
 *   personalizeRequest: true
 * });
 * 
 * // 2. 단계별 직접 호출
 * const quickResult = await getCachedKeywordRecommendation("스트레스 받아");
 * const balancedResult = await getHybridKeywordRecommendation("기분 전환하고 싶어");
 * const personalResult = await getPersonalizedKeywordRecommendation("혼자 시간 보내고 싶어", "emotion", "user123");
 * 
 * // 3. 시스템 모니터링
 * const stats = getV2KeywordSystemStats();
 * const health = await checkV2KeywordHealth();
 */ 