/**
 * 🎯 개인화 감성 문장 분석 서비스 v1.1
 * 
 * 💡 핵심 기능:
 * 1. 🗣️ 자연어 입력 분석 (3단계 워크플로우)
 * 2. 👤 개인화 키워드 추출 (DB 기반)
 * 3. 💬 감성 문장 큐레이션 제공 (4개 문장)
 * 4. 📊 분석 결과 반환 (클릭 대기)
 * 
 * 🔗 연동 모듈:
 * - natural-language-extractor (v3.2) ⭐ 3단계 논리적 워크플로우
 * 
 * 📋 v3.2 3단계 워크플로우:
 * 1. 🔍 사용자 입력 분석 (Claude로 정확한 감정/상태 파악)
 * 2. 🗃️ 분석된 감정 기반 개인화 데이터 수집 (DB)
 * 3. 🎨 종합적 키워드 생성 및 감성 문장 큐레이션
 * 
 * 📋 다음 단계에서 추가될 기능:
 * - 사용자 감성 문장 클릭 시 DB 업데이트
 * - 클릭된 문장 기반 영상 검색
 */

import { extractKeywordsFromText, quickExtract, getStats } from '../../youtube-ai-services/llm/modules/natural-language-extractor.js';
import dotenv from 'dotenv';

dotenv.config();

class PersonalizedCurationService {
  constructor() {
    this.serviceName = 'PersonalizedCurationService';
    this.version = '1.1'; // v3.2 호환 버전
    
    // 서비스 통계
    this.stats = {
      totalRequests: 0,
      emotionRequests: 0,
      topicRequests: 0,
      successfulAnalyses: 0,
      averageProcessingTime: 0,
      curationClicks: 0, // 감성 문장 클릭 수
      // v3.2 추가 통계
      stage1AnalysisTime: 0, // 1단계: 사용자 입력 분석
      stage2DataTime: 0,     // 2단계: DB 데이터 수집  
      stage3GenerationTime: 0 // 3단계: 키워드 생성
    };
    
    console.log(`🎯 ${this.serviceName} v${this.version} 초기화 완료 - v3.2 3단계 감성 분석`);
  }

  /**
   * 🌟 메인 감성 문장 분석 기능 (v3.2 3단계 워크플로우)
   * 자연어 입력 → 3단계 개인화 분석 → 감성 문장 큐레이션
   */
  async analyzeEmotionalCuration(userInput, options = {}) {
    console.log(`🌟 v3.2 감성 문장 분석 시작: "${userInput}"`);
    const overallStartTime = Date.now();

    try {
      this.stats.totalRequests++;

      // 🔧 옵션 설정
      const {
        userId = null,
        inputType = 'emotion', // 'emotion' or 'topic'
        maxKeywords = 8,
        responseFormat = 'full' // 'full', 'quick', 'keywords-only'
      } = options;

      console.log(`   🎯 분석 타입: ${inputType}`);
      console.log(`   👤 사용자 ID: ${userId || '익명'}`);
      console.log(`   📋 v3.2 3단계 워크플로우 시작...`);

      // 📊 통계 업데이트
      if (inputType === 'emotion') {
        this.stats.emotionRequests++;
      } else if (inputType === 'topic') {
        this.stats.topicRequests++;
      }

      // 🔍 v3.2 3단계 키워드 추출 (논리적 순서 보장)
      const stage1Start = Date.now();
      const extractionResult = await extractKeywordsFromText(
        userInput, 
        inputType, 
        maxKeywords, 
        userId
      );
      const stage1Time = Date.now() - stage1Start;
      this.stats.stage1AnalysisTime = (this.stats.stage1AnalysisTime + stage1Time) / 2;

      if (!extractionResult.success) {
        throw new Error(`v3.2 키워드 추출 실패: ${extractionResult.error}`);
      }

      console.log(`   ✅ v3.2 3단계 처리 완료: ${Object.keys(extractionResult.step4SingleKeywords || {}).length}개 키워드, ${extractionResult.step6EmotionalCuration?.length || 0}개 감성 문장`);
      console.log(`   ⏱️ 단계별 처리 시간: 전체 ${stage1Time}ms`);

      // 📊 2단계: 개인화 점수 계산
      const stage2Start = Date.now();
      const personalizationScore = this.calculatePersonalizationScore(extractionResult);
      const stage2Time = Date.now() - stage2Start;
      this.stats.stage2DataTime = (this.stats.stage2DataTime + stage2Time) / 2;

      // 💬 3단계: 감성 큐레이션 최적화 (4개 문장 목표)
      const stage3Start = Date.now();
      const optimizedCuration = this.optimizeEmotionalCuration(
        extractionResult.step6EmotionalCuration || [],
        extractionResult.step1UserAnalysis,
        extractionResult.step2PersonalPreferences
      );
      const stage3Time = Date.now() - stage3Start;
      this.stats.stage3GenerationTime = (this.stats.stage3GenerationTime + stage3Time) / 2;

      console.log(`   💬 v3.2 감성 문장 최적화 완료: ${optimizedCuration.length}개 문장`);
      console.log(`   📊 개인화 점수: ${personalizationScore.toFixed(2)}`);

      // 🎯 4단계: 응답 구성 (영상 검색 없음)
      const response = this.buildAnalysisResponse(
        extractionResult,
        optimizedCuration,
        personalizationScore,
        responseFormat
      );

      const totalProcessingTime = Date.now() - overallStartTime;
      this.updateStats(true, totalProcessingTime);

      return {
        success: true,
        serviceName: this.serviceName,
        version: this.version,
        ...response,
        meta: {
          processingTime: totalProcessingTime,
          personalizationScore,
          userId: userId,
          inputType,
          timestamp: new Date().toISOString(),
          responseFormat,
          nextStep: 'awaiting_user_curation_selection', // 사용자 클릭 대기
          // v3.2 성능 메트릭
          stageMetrics: {
            stage1_analysis: `${stage1Time}ms`,
            stage2_scoring: `${stage2Time}ms`, 
            stage3_curation: `${stage3Time}ms`,
            total: `${totalProcessingTime}ms`
          },
          workflow: 'v3.2_three_stage'
        }
      };

    } catch (error) {
      console.error(`❌ v3.2 감성 문장 분석 실패: ${error.message}`);
      this.updateStats(false, Date.now() - overallStartTime);

      return {
        success: false,
        error: error.message,
        fallback: await this.createFallbackResponse(userInput),
        meta: {
          processingTime: Date.now() - overallStartTime,
          timestamp: new Date().toISOString(),
          workflow: 'v3.2_three_stage_failed'
        }
      };
    }
  }

  /**
   * 📊 개인화 점수 계산
   */
  calculatePersonalizationScore(extractionResult) {
    let score = 0.5; // 기본 점수

    // DB 데이터 활용도
    if (extractionResult.feedbackData?.dbDataUsed?.userPreferences) {
      score += 0.2;
    }
    if (extractionResult.feedbackData?.dbDataUsed?.emotionPreferences) {
      score += 0.15;
    }

    // 키워드 다양성
    const keywordCount = Object.keys(extractionResult.step4SingleKeywords || {}).length;
    score += Math.min(0.15, keywordCount * 0.02);

    // 감성 큐레이션 품질
    const curationCount = extractionResult.step6EmotionalCuration?.length || 0;
    score += Math.min(0.1, curationCount * 0.05);

    return Math.min(1.0, score);
  }

  /**
   * 💬 감성 큐레이션 최적화
   */
  optimizeEmotionalCuration(curations, userAnalysis, personalPreferences) {
    if (!curations || curations.length === 0) {
      return [];
    }

    return curations.map((curation, index) => ({
      ...curation,
      // 🎯 클릭 추적을 위한 ID 추가
      curationId: `curation_${Date.now()}_${index}`,
      // 개인화 터치 추가
      enhanced_sentence: this.enhanceCurationSentence(
        curation.sentence,
        userAnalysis,
        personalPreferences
      ),
      personalized: true,
      confidence: curation.emotion_match || 0.8,
      // 클릭 시 전달될 데이터
      clickData: {
        originalSentence: curation.sentence,
        keywords: curation.keywords || [],
        basedOn: curation.based_on || 'general',
        emotionMatch: curation.emotion_match || 0.8
      }
    }));
  }

  /**
   * ✨ 큐레이션 문장 개선
   */
  enhanceCurationSentence(sentence, userAnalysis, personalPreferences) {
    // 개인화 요소 추가
    const timeContext = this.getTimeContext();
    const emotionContext = userAnalysis?.current_state || '';

    // 시간대별 맞춤 표현
    if (timeContext === '아침') {
      return sentence.replace('하루', '새로운 하루');
    } else if (timeContext === '저녁') {
      return sentence.replace('지금', '하루를 마무리하는 지금');
    }

    return sentence;
  }

  /**
   * 🕐 시간 컨텍스트 분석
   */
  getTimeContext() {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) return '아침';
    if (hour >= 12 && hour < 17) return '오후';
    if (hour >= 17 && hour < 22) return '저녁';
    return '밤';
  }

  /**
   * 📋 분석 응답 구성 (영상 검색 제외)
   */
  buildAnalysisResponse(extractionResult, optimizedCuration, personalizationScore, responseFormat) {
    const baseResponse = {
      // 🎯 핵심 감성 분석 데이터
      emotionalAnalysis: {
        curations: optimizedCuration, // 클릭 가능한 감성 문장들
        personalizedKeywords: extractionResult.step4SingleKeywords,
        searchTerms: extractionResult.step5CompoundSearch,
        personalizationScore: personalizationScore
      },

      // 👤 사용자 분석 결과
      userAnalysis: {
        currentState: extractionResult.step1UserAnalysis,
        personalPreferences: extractionResult.step2PersonalPreferences,
        similarUsers: extractionResult.step3SimilarUsers
      },

      // 🎯 다음 단계 안내
      nextSteps: {
        instruction: "감성 문장을 클릭하면 맞춤 영상을 검색합니다",
        availableActions: [
          "curation_click", // 감성 문장 클릭
          "keyword_search", // 직접 키워드 검색
          "regenerate" // 다시 분석
        ]
      }
    };

    // 응답 형식에 따른 최적화
    switch (responseFormat) {
      case 'quick':
        return {
          curations: optimizedCuration.slice(0, 2).map(c => ({
            id: c.curationId,
            sentence: c.enhanced_sentence,
            keywords: c.keywords,
            confidence: c.confidence
          })),
          topKeywords: Object.entries(extractionResult.step4SingleKeywords || {})
            .slice(0, 5)
            .map(([keyword, score]) => ({ keyword, score })),
          personalizationScore
        };

      case 'keywords-only':
        return {
          keywords: extractionResult.step4SingleKeywords,
          searchTerms: extractionResult.step5CompoundSearch,
          personalizationScore
        };

      default: // 'full'
        return baseResponse;
    }
  }

  /**
   * 🚨 폴백 응답 생성
   */
  async createFallbackResponse(userInput) {
    console.log(`🚨 폴백 응답 생성: ${userInput}`);

    // 간단한 키워드 추출
    const simpleKeywords = userInput
      .replace(/[^\w\s가-힣]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1)
      .slice(0, 3);

    return {
      curations: [
        {
          curationId: `fallback_${Date.now()}`,
          sentence: "지금 이 순간에 딱 맞는 영상을 찾아보세요",
          enhanced_sentence: "지금 이 순간에 딱 맞는 영상을 찾아보세요",
          keywords: simpleKeywords,
          fallback: true,
          confidence: 0.5,
          clickData: {
            originalSentence: "지금 이 순간에 딱 맞는 영상을 찾아보세요",
            keywords: simpleKeywords,
            basedOn: 'fallback'
          }
        }
      ],
      keywords: simpleKeywords.reduce((acc, keyword, index) => {
        acc[keyword] = Math.max(0.3, 0.8 - (index * 0.1));
        return acc;
      }, {}),
      personalizationScore: 0.3
    };
  }

  /**
   * 🔄 빠른 키워드 추출 (라이트 버전)
   */
  async quickKeywordExtraction(userInput, userId = null) {
    console.log(`⚡ 빠른 키워드 추출: "${userInput}"`);

    try {
      const result = await quickExtract(userInput, 'emotion', userId);
      
      return {
        success: true,
        keywords: result.basicKeywords || {},
        searchTerms: result.directSearch || [],
        personalization: result.personalization || { score: 0 },
        processingTime: Date.now() - Date.now()
      };
    } catch (error) {
      console.error(`빠른 추출 실패: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🎯 감성 문장 클릭 추적 (다음 단계 준비)
   */
  async trackCurationClick(curationId, userId = null) {
    console.log(`🎯 감성 문장 클릭 추적: ${curationId} (사용자: ${userId || '익명'})`);

    try {
      this.stats.curationClicks++;

      // 🚧 실제 구현에서는 여기서 다음 단계 모듈 호출
      // 1. DB에 사용자 선호도 업데이트
      // 2. 해당 감성 문장의 키워드로 영상 검색 시작

      return {
        success: true,
        message: '클릭이 추적되었습니다.',
        nextModule: 'video_search_service', // 다음에 만들 모듈
        curationId: curationId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`클릭 추적 실패: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📊 서비스 통계 업데이트
   */
  updateStats(success, processingTime) {
    if (success) {
      this.stats.successfulAnalyses++;
    }
    
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalRequests - 1) + processingTime) / 
      this.stats.totalRequests;
  }

  /**
   * 📈 서비스 통계 조회 (v3.2 단계별 메트릭 포함)
   */
  getServiceStats() {
    const nlpStats = getStats(); // natural-language-extractor v3.2 통계

    return {
      service: {
        name: this.serviceName,
        version: this.version,
        mode: 'v3.2_three_stage_analysis',
        workflow: '1단계:입력분석 → 2단계:DB수집 → 3단계:키워드생성',
        ...this.stats,
        successRate: ((this.stats.successfulAnalyses / this.stats.totalRequests) * 100).toFixed(1) + '%',
        clickThroughRate: this.stats.totalRequests > 0 ? 
          ((this.stats.curationClicks / this.stats.totalRequests) * 100).toFixed(1) + '%' : '0%',
        // v3.2 단계별 성능 메트릭
        performanceMetrics: {
          avgStage1Time: `${this.stats.stage1AnalysisTime.toFixed(0)}ms (입력분석)`,
          avgStage2Time: `${this.stats.stage2DataTime.toFixed(0)}ms (개인화점수)`,
          avgStage3Time: `${this.stats.stage3GenerationTime.toFixed(0)}ms (감성문장)`,
          totalAvgTime: `${this.stats.averageProcessingTime.toFixed(0)}ms`
        }
      },
      nlpEngine: {
        ...nlpStats,
        version: 'v3.2',
        workflow: '3단계 논리적 순서'
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

// 전역 인스턴스
const personalizedCurationService = new PersonalizedCurationService();

// 편의 함수들
export async function analyzeEmotionalCuration(userInput, options = {}) {
  return await personalizedCurationService.analyzeEmotionalCuration(userInput, options);
}

export async function quickKeywords(userInput, userId = null) {
  return await personalizedCurationService.quickKeywordExtraction(userInput, userId);
}

export async function trackCurationClick(curationId, userId = null) {
  return await personalizedCurationService.trackCurationClick(curationId, userId);
}

export function getPersonalizedStats() {
  return personalizedCurationService.getServiceStats();
}

export default personalizedCurationService; 