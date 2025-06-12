/**
 * 🗣️ 개인화 큐레이션 자연어 키워드 추출기 v3.0
 * 
 * 7단계 개인화 큐레이션 워크플로우:
 * 1. 🔍 사용자 입력 분석 (감정/상태 분석)
 * 2. 👤 사용자 개인 선호 분석 (DB 기반 히스토리)
 * 3. 👥 유사 사용자 선호 분석 (감정별 통계 DB)
 * 4. 🏷️ 단일 키워드 추출 (최대한 다양하게)
 * 5. 🎯 복합 검색어 추출 (2단어 조합)
 * 6. 💬 감성 문장 큐레이션 생성 ("오늘 하루를 잔잔하게 마무리하고 싶다면...")
 * 7. 📊 사용자 선택 데이터 피드백 (선호도 업데이트)
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../../.env') });

class NaturalLanguageExtractor {
  constructor() {
    this.anthropic = null;
    this.initializeAPI();
    
    // 통계
    this.stats = {
      totalExtractions: 0,
      successfulExtractions: 0,
      averageProcessingTime: 0
    };
  }

  initializeAPI() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      console.log('🤖 Claude API 초기화 완료');
    } else {
      console.warn('⚠️ ANTHROPIC_API_KEY 없음');
    }
  }

  async extractKeywords(userInput, inputType, maxKeywords = 5) {
    console.log(`🗣️ 키워드 추출: "${userInput}" (타입: ${inputType})`);
    const startTime = Date.now();

    try {
      this.stats.totalExtractions++;

      // 타입 검증
      if (!['emotion', 'topic'].includes(inputType)) {
        throw new Error(`지원하지 않는 입력 타입: ${inputType}`);
      }

      console.log(`   🎯 선택된 타입: ${inputType}`);

      // 타입별 키워드 추출 전략
      let result = null;
      if (this.anthropic) {
        result = await this.claudeExtractWithType(userInput, inputType, maxKeywords);
      }

      // 폴백 처리 (Claude 실패 시)
      if (!result) {
        result = this.simpleFallback(userInput, maxKeywords);
      }

      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);

      return {
        success: true,
        inputType: inputType,
        originalInput: userInput, // 🎯 사용자 원본 입력
        
        // 🎯 v3.0 7단계 워크플로우 구조
        step1UserAnalysis: result.step1UserAnalysis,           // 사용자 입력 분석
        step4SingleKeywords: result.step4SingleKeywords,       // 단일 키워드 (개인화용)
        step5CompoundSearch: result.step5CompoundSearch,       // 복합 검색어 (실시간 검색용)
        step6EmotionalCuration: result.step6EmotionalCuration, // 감성 문장 큐레이션 ⭐ 핵심!
        
        // 🔄 v2.0 호환성 유지 (기존 모듈 연동용)
        directSearch: result.directSearch,        // step5와 동일
        basicKeywords: result.basicKeywords,      // step4와 동일
        userAnalysis: result.userAnalysis,        // step1과 동일
        
        // 📊 캐싱 및 개인화 메타데이터
        cacheCategories: result.cacheCategories,              // 카테고리별 캐싱 전략
        emotionalCurations: result.emotionalCurations,        // 감성 큐레이션 데이터
        
        // 🎯 피드백 및 학습 데이터 (향후 DB 업데이트용)
        feedbackData: {
          userEmotion: result.step1UserAnalysis?.current_state,
          recommendedCurations: result.step6EmotionalCuration?.map(c => c.sentence) || [],
          suggestedKeywords: Object.keys(result.step4SingleKeywords || {}),
          timestamp: new Date().toISOString(),
          // 사용자 선택 시 업데이트될 필드들
          selectedCuration: null,        // 사용자가 선택한 감성 문장
          selectedKeywords: [],          // 사용자가 선택한 키워드들
          interactionTime: null,         // 선택까지 걸린 시간
          satisfactionScore: null        // 만족도 평가 (1-5)
        },
        
        // 🔄 기존 호환성 유지
        expansionTerms: result.expansionTerms,
        keywords: result.keywords,
        
        analysis: result.analysis,
        confidence: result.confidence || 0.8,
        processingTime,
        version: '3.0'
      };

    } catch (error) {
      console.error('❌ 키워드 추출 실패:', error.message);
      this.updateStats(false, Date.now() - startTime);
      
      return {
        success: false,
        error: error.message,
        fallbackKeywords: this.emergencyFallback(userInput)
      };
    }
  }

  /**
   * 🤖 타입별 Claude API 호출
   */
  async claudeExtractWithType(input, inputType, maxKeywords) {
    let prompt = '';

    if (inputType === 'emotion') {
      prompt = `🎯 v3.0 개인화 큐레이션 감정 분석 (7단계 워크플로우)

사용자 입력: "${input}"

**7단계 분석 워크플로우:**

1. 🔍 **사용자 입력 분석**
   - 사용자 현재 감정/상태 정확히 파악
   - 맥락 정보 (시간, 상황, 톤) 분석

2. 👤 **사용자 개인 선호 분석** (주석: DB 연동 예정)
   - 개인 히스토리 기반 선호 키워드 추출 예정
   - 과거 선택 패턴 분석 예정

3. 👥 **유사 사용자 선호 분석** (주석: 감정별 통계 DB 연동 예정)
   - 동일 감정 상태 사용자들의 선호도 통계 활용 예정
   - 클릭률 기반 키워드 순위 반영 예정

4. 🏷️ **단일 키워드 추출**
   - 최대한 다양한 단일 키워드 생성 (10개 이상)
   - 점수 기반 우선순위 설정

5. 🎯 **복합 검색어 추출**
   - 정확히 2단어로 구성된 특화 검색어
   - 프리미엄/실시간 검색용

6. 💬 **감성 문장 큐레이션 생성** (핵심 신기능!)
   - 사용자 감정에 맞는 감성적인 문장 2-3개 생성
   - 각 문장에 어울리는 키워드 카테고리 매칭

**예시 - "퇴근하고 와서 피곤해":**
감성 문장들:
- "오늘 하루를 잔잔하게 마무리하고 싶다면" → [힐링 피아노, 우중 캠핑]
- "하루를 돌아보고 싶은 지금 나에게" → [다이어리 꾸미기, 감성 영상]

응답 JSON 형식:
{
  "step1_user_analysis": {
    "current_state": "피곤함",
    "emotional_need": "휴식",
    "context": "퇴근 후 저녁시간"
  },
  "step4_single_keywords": {
    "힐링": 1.0, "편안": 0.9, "쉼": 0.8, "재즈": 0.7, "피아노": 0.6,
    "ASMR": 0.5, "자연": 0.4, "명상": 0.3, "백색소음": 0.2, "캠핑": 0.1
  },
  "step5_compound_search": [
    {"keyword": "우중 캠핑", "category": "힐링"},
    {"keyword": "잔잔한 피아노", "category": "음악"},
    {"keyword": "ASMR 영상", "category": "수면"}
  ],
  "step6_emotional_curation": [
    {
      "sentence": "오늘 하루를 잔잔하게 마무리하고 싶다면",
      "keywords": ["힐링 피아노", "우중 캠핑"],
      "emotion_match": 0.95
    },
    {
      "sentence": "지친 마음을 달래주는 시간이 필요할 때",
      "keywords": ["ASMR 영상", "자연 소리"],
      "emotion_match": 0.90
    }
  ],
  "overall_confidence": 0.89
}`;
    } else if (inputType === 'topic') {
      prompt = `🎯 캐싱 최적화 주제 분석 및 개인화 키워드 추출

사용자 입력: "${input}"

**분석 단계:**
1. 🔍 주제 영역 및 사용자 관심사 분석
2. 💡 개인화 추천 전략 (주석: 향후 사용자 DB 연동)
   - 사용자 주제별 선호 히스토리 분석 예정
   - 유사한 관심사를 가진 다른 사용자들 선호도 패턴 분석 예정
   - 주제별 최신 트렌드 가중치 적용 예정

**키워드 생성 요구사항:**
- direct_search: **정확히 2단어**로만 구성 (캐싱 효율성)
- basic_keywords: 점수 기반 **단일 키워드** 다양하게 (0.1~1.0)
- similar_groups: 각 검색 키워드별 유사 캐싱 키워드들

**예시 - "롤드컵 경기 하이라이트 보고 싶어":**
- 분석: 게임(롤) 관심사, 경쟁적 콘텐츠 선호, 하이라이트 형태 선호
- direct_search: ["롤드컵 하이라이트", "LCK 명경기", "게임 베스트"] (각각 롤드컵, LCK, 게임 카테고리 캐싱)
- basic_keywords: {"게임": 1.0, "롤": 0.9, "하이라이트": 0.8, "경기": 0.7, "프로": 0.5}

응답 JSON 형식:
{
  "user_analysis": {
    "topic_category": "게임/음식/운동/공부/여행/음악 등",
    "interest_level": "캐주얼/진지함/전문적 등",
    "content_preference": "하이라이트/풀영상/튜토리얼/리뷰 등",
    "trend_alignment": "최신트렌드/클래식/니치 등"
  },
  "direct_search": [
    {
      "keyword": "롤드컵 하이라이트",
      "cache_category": "게임",
      "similar_keywords": ["게임", "롤", "하이라이트", "경기"]
    },
    {
      "keyword": "LCK 명경기",
      "cache_category": "게임", 
      "similar_keywords": ["LCK", "프로게임", "명경기", "리그"]
    },
    {
      "keyword": "게임 베스트",
      "cache_category": "게임",
      "similar_keywords": ["게임", "베스트", "하이라이트", "모음"]
    }
  ],
  "basic_keywords": {
    "게임": 1.0,
    "롤": 0.9,
    "하이라이트": 0.8,
    "경기": 0.7,
    "LCK": 0.6,
    "프로": 0.5,
    "모음": 0.4
  },
  "overall_confidence": 0.91
}`;
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 🎯 v3.0 7단계 워크플로우 구조 파싱
        const step1Analysis = parsed.step1_user_analysis || {};
        const step4Keywords = parsed.step4_single_keywords || {};
        const step5Compounds = parsed.step5_compound_search || [];
        const step6Curation = parsed.step6_emotional_curation || [];
        
        // 복합 검색어 추출
        const compoundSearch = [];
        const cacheCategories = {};
        
        step5Compounds.forEach(item => {
          if (typeof item === 'object' && item.keyword) {
            compoundSearch.push(item.keyword);
            cacheCategories[item.keyword] = item.category || 'general';
          } else if (typeof item === 'string') {
            compoundSearch.push(item);
            cacheCategories[item] = 'general';
          }
        });
        
        // 기존 호환성을 위한 변환
        const expansionTerms = Object.keys(step4Keywords).slice(0, 5);
        const allKeywords = [...compoundSearch, ...expansionTerms];
        
        return {
          // 🎯 v3.0 7단계 워크플로우 구조
          step1UserAnalysis: step1Analysis,         // 사용자 입력 분석
          step4SingleKeywords: step4Keywords,       // 단일 키워드 (점수 기반)
          step5CompoundSearch: compoundSearch,      // 복합 검색어 (2단어)
          step6EmotionalCuration: step6Curation,    // 감성 문장 큐레이션
          
          // 🔄 v2.0 호환성 유지 (기존 모듈과의 연동)
          directSearch: compoundSearch,             // step5와 동일
          basicKeywords: step4Keywords,             // step4와 동일
          userAnalysis: step1Analysis,              // step1과 동일
          
          // 캐싱 및 개인화 메타데이터
          cacheCategories: cacheCategories,         // 카테고리별 캐싱 전략
          emotionalCurations: step6Curation,        // 감성 큐레이션 (핵심 신기능)
          
          // 기존 호환성
          expansionTerms: expansionTerms,
          keywords: allKeywords,
          
          analysis: {
            emotion: step1Analysis.current_state || null,
            emotionalNeed: step1Analysis.emotional_need || null,
            context: step1Analysis.context || null,
            confidence: parsed.overall_confidence || 0.8,
            userState: step1Analysis
          },
          confidence: parsed.overall_confidence || 0.8
        };
      }
    } catch (error) {
      console.error('Claude 추출 실패:', error.message);
    }
    
    return null;
  }

  /**
   * 🔄 v2.0 캐싱 최적화 폴백 처리
   */
  simpleFallback(input, maxKeywords) {
    console.log(`   🔄 v2.0 캐싱 최적화 폴백 처리`);
    
    // 입력에서 기본 키워드 추출
    const words = input
      .replace(/[^\w\s가-힣]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1);

    // 🎯 2단어 조합 생성 (캐싱 최적화)
    const directSearch = [];
    if (words.length >= 2) {
      // 2단어 조합들 생성
      for (let i = 0; i < words.length - 1 && directSearch.length < 3; i++) {
        directSearch.push(`${words[i]} ${words[i + 1]}`);
      }
    } else if (words.length === 1) {
      // 단일 단어인 경우 기본 조합
      directSearch.push(`${words[0]} 영상`);
    }

    // 📊 기본 키워드 점수 생성
    const basicKeywords = {};
    words.slice(0, 6).forEach((word, index) => {
      basicKeywords[word] = Math.max(0.3, 1.0 - (index * 0.15));
    });

    // 🔗 유사 그룹 기본 생성
    const similarGroups = {};
    directSearch.forEach(keyword => {
      similarGroups[keyword] = {
        category: 'general',
        similar: words.slice(0, 3)
      };
    });

    // 기존 호환성
    const expansionTerms = Object.keys(basicKeywords).slice(0, 3);

    return {
      // 🎯 v2.0 구조
      directSearch: directSearch,           // ["음식 영상", "맛있는 요리"]
      basicKeywords: basicKeywords,         // {"음식": 1.0, "맛있는": 0.85}
      similarGroups: similarGroups,        // 유사 키워드 그룹
      
      // 📊 기본 분석
      userAnalysis: {
        current_state: 'unknown',
        emotional_need: 'general',
        predicted_preference: 'general'
      },
      
      // 🔄 기존 호환성
      expansionTerms: expansionTerms,
      keywords: [...directSearch, ...expansionTerms],
      analysis: {
        emotion: null,
        topic: null,
        confidence: 0.6
      }
    };
  }

  /**
   * 🚨 비상 폴백
   */
  emergencyFallback(input) {
    // 매우 간단한 비상 폴백
    const words = input.split(/\s+/).filter(w => w.length > 1).slice(0, 3);
    return words.length > 0 ? words : ['추천', '영상']; // 기본 키워드
  }

  updateStats(success, time) {
    if (success) this.stats.successfulExtractions++;
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalExtractions - 1) + time) / 
      this.stats.totalExtractions;
  }

  getStats() {
    return {
      ...this.stats,
      successRate: ((this.stats.successfulExtractions / this.stats.totalExtractions) * 100).toFixed(1) + '%',
      claudeAvailable: !!this.anthropic
    };
  }
}

// 전역 인스턴스
const extractor = new NaturalLanguageExtractor();

// 편의 함수들
export async function extractKeywordsFromText(userInput, inputType, maxKeywords = 5) {
  return await extractor.extractKeywords(userInput, inputType, maxKeywords);
}

export async function quickExtract(userInput, inputType) {
  const result = await extractor.extractKeywords(userInput, inputType, 3);
  return result.success ? {
    // 🎯 v2.0 캐싱 최적화 구조
    directSearch: result.directSearch,      // 2단어 검색용
    basicKeywords: result.basicKeywords,    // 점수별 단일 키워드
    similarGroups: result.similarGroups,   // 유사 키워드 그룹
    userAnalysis: result.userAnalysis,     // 사용자 분석
    
    // 🔄 기존 호환성
    expansionTerms: result.expansionTerms
  } : { 
    directSearch: [], 
    expansionTerms: [],
    basicKeywords: {},
    similarGroups: {},
    userAnalysis: {}
  };
}

export function getStats() {
  return extractor.getStats();
}

export default extractor;

/**
 * 🎯 v3.0 사용 예시 및 7단계 개인화 큐레이션 전략
 * 
 * 입력: "퇴근하고 와서 피곤해"
 * 
 * 7단계 워크플로우 출력 구조:
 * {
 *   // Step 1: 사용자 입력 분석
 *   step1UserAnalysis: {
 *     current_state: "피곤함",
 *     emotional_need: "휴식",
 *     context: "퇴근 후 저녁시간"
 *   },
 * 
 *   // Step 4: 단일 키워드 (개인화 추천용)
 *   step4SingleKeywords: {
 *     "힐링": 1.0, "편안": 0.9, "쉼": 0.8, "재즈": 0.7, "피아노": 0.6,
 *     "ASMR": 0.5, "자연": 0.4, "명상": 0.3, "백색소음": 0.2, "캠핑": 0.1
 *   },
 * 
 *   // Step 5: 복합 검색어 (프리미엄/실시간 검색용)
 *   step5CompoundSearch: ["우중 캠핑", "잔잔한 피아노", "ASMR 영상"],
 * 
 *   // Step 6: 감성 문장 큐레이션 ⭐ 핵심 신기능!
 *   step6EmotionalCuration: [
 *     {
 *       sentence: "오늘 하루를 잔잔하게 마무리하고 싶다면",
 *       keywords: ["힐링 피아노", "우중 캠핑"],
 *       emotion_match: 0.95
 *     },
 *     {
 *       sentence: "지친 마음을 달래주는 시간이 필요할 때",
 *       keywords: ["ASMR 영상", "자연 소리"],
 *       emotion_match: 0.90
 *     }
 *   ],
 * 
 *   // Step 7: 피드백 데이터 (DB 업데이트용)
 *   feedbackData: {
 *     userEmotion: "피곤함",
 *     recommendedCurations: ["오늘 하루를 잔잔하게...", "지친 마음을 달래주는..."],
 *     selectedCuration: null,      // 사용자 선택 시 업데이트
 *     selectedKeywords: [],        // 사용자 선택 키워드
 *     interactionTime: null,       // 선택까지 걸린 시간
 *     satisfactionScore: null      // 만족도 (1-5)
 *   }
 * }
 * 
 * 🚀 개인화 큐레이션 활용 전략:
 * 
 * 1. 🎭 감성 문장 제시: "오늘 하루를 잔잔하게 마무리하고 싶다면"
 *    → 사용자가 개인적인 큐레이션을 받는다고 느끼게 함
 * 
 * 2. 🎯 카테고리별 추천: 각 문장 아래에 키워드 카테고리 표시
 *    → 힐링 피아노, 우중 캠핑 등
 * 
 * 3. 📊 선택 데이터 학습: 사용자가 선택한 문장/키워드를 DB에 저장
 *    → 감정 상태별 선호도 통계 구축
 * 
 * 4. 👥 유사 사용자 분석: "피곤함" 감정의 다른 사용자들 선호도 반영
 *    → 클릭률 기반 키워드 순위 업데이트
 * 
 * 5. 🔄 실시간 개선: step5CompoundSearch로 새로운 콘텐츠 검색 및 캐싱
 *    → 프리미엄 유저 또는 캐시 미스 시 실행
 * 
 * 🎉 차별화 포인트:
 * - 기존: "힐링 영상" 키워드 나열 → 기계적
 * - v3.0: "오늘 하루를 잔잔하게 마무리하고 싶다면" → 감성적 개인화!
 */ 