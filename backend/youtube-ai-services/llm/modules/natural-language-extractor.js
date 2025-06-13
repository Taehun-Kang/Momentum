/**
 * 🗣️ 개인화 큐레이션 자연어 키워드 추출기 v3.2
 * 
 * 간소화된 3단계 개인화 큐레이션 워크플로우 + DB 연동:
 * 1. 🔍 사용자 입력 분석 (감정/상태 분석)
 * 2. 🏷️ 개인화 단일 키워드 추출 (입력 중심 70% + 개인 선호 20% + 유사 사용자 10%)
 * 3. 🎯 추천 검색어 + 감성 문장 생성 (4개 문장, 관련 키워드 포함)
 * 
 * ✨ v3.2 핵심 개선:
 * - 복잡한 2,3단계 제거로 간소화
 * - 사용자 입력 분석 결과 최우선 (70% 비중)
 * - 검색어별 관련 키워드 제공 (DB 저장용)
 * - 감성 문장 4개로 확장하여 선택지 다양화
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
      averageProcessingTime: 0,
      dbAccessCount: 0
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

  /**
   * 📊 사용자 개인 선호 키워드 조회 (DB 연동)
   */
  async getUserPreferences(userId) {
    console.log(`👤 사용자 선호 키워드 조회: ${userId}`);
    this.stats.dbAccessCount++;
    
    try {
      // 🚧 실제 DB 구현 예정 - 현재는 Mock 데이터 (간소화됨)
      const mockUserPreferences = {
        userId: userId,
        preferredKeywords: [
          { keyword: "ASMR", score: 0.95 },
          { keyword: "힐링", score: 0.89 },
          { keyword: "피아노", score: 0.76 },
          { keyword: "자연", score: 0.68 },
          { keyword: "음악", score: 0.62 }
        ],
        lastUpdated: new Date().toISOString()
      };

      console.log(`   ✅ 개인 선호 키워드 로드: ${mockUserPreferences.preferredKeywords.length}개`);
      return mockUserPreferences;
    } catch (error) {
      console.error(`   ❌ 사용자 선호 조회 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * 👥 유사 감정 사용자들의 선호 키워드 조회 (감정별 통계 DB)
   */
  async getSimilarEmotionPreferences(emotion) {
    console.log(`👥 유사 감정 선호 조회: ${emotion}`);
    this.stats.dbAccessCount++;

    try {
      // 🚧 실제 DB 구현 예정 - 현재는 Mock 데이터 (간소화됨)
      const mockEmotionPreferences = {
        "피곤함": [
          { keyword: "ASMR", score: 0.91 },
          { keyword: "힐링", score: 0.87 },
          { keyword: "수면", score: 0.82 },
          { keyword: "피아노", score: 0.79 },
          { keyword: "자연", score: 0.74 }
        ],
        "스트레스": [
          { keyword: "명상", score: 0.94 },
          { keyword: "자연", score: 0.88 },
          { keyword: "백색소음", score: 0.85 },
          { keyword: "운동", score: 0.79 },
          { keyword: "요가", score: 0.72 }
        ],
        "기쁨": [
          { keyword: "댄스", score: 0.95 },
          { keyword: "케이팝", score: 0.92 },
          { keyword: "예능", score: 0.88 },
          { keyword: "뮤직비디오", score: 0.85 },
          { keyword: "챌린지", score: 0.82 }
        ]
      };

      const emotionKeywords = mockEmotionPreferences[emotion] || [];

      console.log(`   ✅ 감정별 선호 키워드 로드: ${emotionKeywords.length}개`);
      return emotionKeywords;
    } catch (error) {
      console.error(`   ❌ 감정별 선호 조회 실패: ${error.message}`);
      return [];
    }
  }

  async extractKeywords(userInput, inputType, maxKeywords = 5, userId = null) {
    console.log(`🗣️ 키워드 추출: "${userInput}" (타입: ${inputType}, 사용자: ${userId})`);
    const startTime = Date.now();

    try {
      this.stats.totalExtractions++;

      // 타입 검증
      if (!['emotion', 'topic'].includes(inputType)) {
        throw new Error(`지원하지 않는 입력 타입: ${inputType}`);
      }

      console.log(`   🎯 선택된 타입: ${inputType}`);

      // 🎯 **1단계: 사용자 입력 분석 (Claude로 정확한 감정/상태 파악)**
      console.log(`   📊 1단계: 사용자 입력 분석 시작...`);
      const initialAnalysis = await this.analyzeUserInput(userInput, inputType);
      
      if (!initialAnalysis) {
        throw new Error('사용자 입력 분석 실패');
      }
      
      console.log(`   ✅ 1단계 완료: 감정="${initialAnalysis.current_state}", 니즈="${initialAnalysis.emotional_need}"`);

      // 🗃️ **2단계: 분석된 감정을 바탕으로 개인화 데이터 수집**
      console.log(`   📚 2단계: 개인화 데이터 수집 시작...`);
      let userPreferences = null;
      let emotionPreferences = [];

      if (userId) {
        userPreferences = await this.getUserPreferences(userId);
      }

      // 정확한 감정 분석 결과를 바탕으로 유사 사용자 데이터 수집
      if (inputType === 'emotion' && initialAnalysis.current_state) {
        emotionPreferences = await this.getSimilarEmotionPreferences(initialAnalysis.current_state);
      }
      
      console.log(`   ✅ 2단계 완료: 개인 선호 ${userPreferences ? userPreferences.preferredKeywords.length : 0}개, 감정별 선호 ${emotionPreferences.length}개`);

      // 🎨 **3단계: 종합적 키워드 생성 및 감성 문장 큐레이션**
      console.log(`   🎨 3단계: 키워드 생성 및 감성 문장 큐레이션 시작...`);
      let finalResult = null;
      
      if (this.anthropic) {
        finalResult = await this.generateKeywordsAndCurations(
          userInput, 
          inputType, 
          maxKeywords, 
          initialAnalysis, 
          userPreferences, 
          emotionPreferences
        );
      }

      // 폴백 처리 (Claude 실패 시)
      if (!finalResult) {
        finalResult = this.simpleFallback(userInput, maxKeywords, userPreferences, emotionPreferences);
      }

      console.log(`   ✅ 3단계 완료: 키워드 ${Object.keys(finalResult.step4SingleKeywords || {}).length}개, 감성 문장 ${finalResult.step6EmotionalCuration?.length || 0}개`);

      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);

      return {
        success: true,
        inputType: inputType,
        originalInput: userInput,
        userId: userId,
        
        // 🎯 v3.2 3단계 워크플로우 구조
        step1UserAnalysis: finalResult.step1UserAnalysis || initialAnalysis,           
        step2PersonalPreferences: finalResult.step2PersonalPreferences,
        step3SimilarUsers: finalResult.step3SimilarUsers,
        step4SingleKeywords: finalResult.step4SingleKeywords,       
        step5CompoundSearch: finalResult.step5CompoundSearch,      
        step6EmotionalCuration: finalResult.step6EmotionalCuration, 
        
        // 🔄 v2.0 호환성 유지
        directSearch: finalResult.directSearch,        
        basicKeywords: finalResult.basicKeywords,      
        userAnalysis: finalResult.userAnalysis,        
        
        // 📊 캐싱 및 개인화 메타데이터
        cacheCategories: finalResult.cacheCategories,              
        emotionalCurations: finalResult.emotionalCurations,        
        
        // 🎯 피드백 및 학습 데이터 (향후 DB 업데이트용)
        feedbackData: {
          userEmotion: initialAnalysis.current_state,
          recommendedCurations: finalResult.step6EmotionalCuration?.map(c => c.sentence) || [],
          suggestedKeywords: Object.keys(finalResult.step4SingleKeywords || {}),
          personalizedScore: finalResult.personalizationScore || 0.5,
          dbDataUsed: {
            userPreferences: !!userPreferences,
            emotionPreferences: emotionPreferences.length > 0
          },
          timestamp: new Date().toISOString(),
          selectedCuration: null,        
          selectedKeywords: [],          
          interactionTime: null,         
          satisfactionScore: null        
        },
        
        // 🔄 기존 호환성 유지
        expansionTerms: finalResult.expansionTerms,
        keywords: finalResult.keywords,
        
        analysis: finalResult.analysis,
        confidence: finalResult.confidence || 0.8,
        processingTime,
        version: '3.2'
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
   * 📊 1단계: 사용자 입력 분석 (Claude로 정확한 감정/상태 파악)
   */
  async analyzeUserInput(userInput, inputType) {
    console.log(`   📊 사용자 입력 분석: "${userInput}" (${inputType})`);

    if (!this.anthropic) {
      console.warn(`   ⚠️ Claude API 없음, 기본 분석 사용`);
      return {
        current_state: this.predictEmotion(userInput),
        emotional_need: 'general',
        context: 'fallback_analysis'
      };
    }

    let prompt = '';
    
    if (inputType === 'emotion') {
      prompt = `🔍 사용자 감정/상태 분석

사용자 입력: "${userInput}"

**분석 요청:**
1. 현재 감정 상태 정확히 파악
2. 감정적 니즈 분석
3. 상황 맥락 파악

**응답 JSON 형식:**
{
  "current_state": "감정명 (피곤함, 스트레스, 기쁨, 우울함, 불안 등)",
  "emotional_need": "요구사항 (휴식, 즐거움, 위로, 자극 등)",
  "context": "상황분석 (퇴근 후, 주말, 스트레스 상황 등)",
  "intensity": "강도 (낮음/보통/높음)",
  "confidence": 0.9
}`;

    } else if (inputType === 'topic') {
      prompt = `🔍 사용자 주제/관심사 분석

사용자 입력: "${userInput}"

**분석 요청:**
1. 원하는 콘텐츠 주제 파악
2. 관심 영역 분석
3. 구체적 요구사항 파악

**응답 JSON 형식:**
{
  "current_state": "주제명 (먹방, 음악, 게임, 요리 등)",
  "emotional_need": "콘텐츠 니즈 (오락, 학습, 감상 등)",
  "context": "상황분석 (저녁시간, 주말, 특별한 날 등)",
  "topic_category": "카테고리 (음식, 엔터테인먼트, 교육 등)",
  "confidence": 0.9
}`;
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    } catch (error) {
      console.error('   ❌ Claude 분석 실패:', error.message);
    }
    
    // 폴백: 기본 분석
    return {
      current_state: this.predictEmotion(userInput),
      emotional_need: 'general',
      context: 'basic_analysis'
    };
  }

  /**
   * 🎨 3단계: 종합적 키워드 생성 및 감성 문장 큐레이션
   */
  async generateKeywordsAndCurations(userInput, inputType, maxKeywords, userAnalysis, userPreferences, emotionPreferences) {
    console.log(`   🎨 종합 키워드 생성: 감정="${userAnalysis.current_state}"`);

    // 개인화 데이터 구성
    const personalData = userPreferences ? `
**🔹 사용자 개인 선호 키워드:**
- ${userPreferences.preferredKeywords.map(k => `${k.keyword}(${k.score})`).join(', ')}` : '개인 데이터 없음';

    const emotionData = emotionPreferences.length > 0 ? `
**🔹 "${userAnalysis.current_state}" 감정 사용자들의 선호:**
- ${emotionPreferences.map(k => `${k.keyword}(${k.score})`).join(', ')}` : '감정별 데이터 없음';

    const prompt = `🎨 v3.2 종합 키워드 생성 및 감성 문장 큐레이션

**1단계 분석 결과:**
- 감정/상태: ${userAnalysis.current_state}
- 니즈: ${userAnalysis.emotional_need}
- 상황: ${userAnalysis.context}

${personalData}

${emotionData}

**📋 핵심 원칙:**
1. **사용자 입력 분석 결과 최우선** (70% 비중)
2. 개인 선호 키워드 반영 (20% 비중)  
3. 유사 감정 사용자 선호 반영 (10% 비중)
4. 감정/주제 키워드 구분 없이 **최대한 다양하게**

**응답 JSON 형식:**
{
  "step1_user_analysis": {
    "current_state": "${userAnalysis.current_state}",
    "emotional_need": "${userAnalysis.emotional_need}",
    "context": "${userAnalysis.context}"
  },
  "step4_single_keywords": {
    "키워드1": 0.95, "키워드2": 0.92, "키워드3": 0.88, "키워드4": 0.82,
    "키워드5": 0.78, "키워드6": 0.74, "키워드7": 0.71, "키워드8": 0.65,
    "키워드9": 0.58, "키워드10": 0.52
  },
  "step5_compound_search": [
    {
      "search_term": "2단어 활동/영상",
      "related_keywords": ["관련키워드1", "관련키워드2", "관련키워드3", "관련키워드4"]
    },
    {
      "search_term": "2단어 활동/영상",
      "related_keywords": ["관련키워드1", "관련키워드2", "관련키워드3"]
    }
  ],
  "step6_emotional_curation": [
    {
      "sentence": "감성적인 큐레이션 문장 1",
      "keywords": ["키워드1", "키워드2"],
      "emotion_match": 0.95
    },
    {
      "sentence": "감성적인 큐레이션 문장 2",
      "keywords": ["검색어1", "키워드3"],
      "emotion_match": 0.91
    },
    {
      "sentence": "감성적인 큐레이션 문장 3",
      "keywords": ["키워드4", "키워드5"],
      "emotion_match": 0.88
    },
    {
      "sentence": "감성적인 큐레이션 문장 4",
      "keywords": ["검색어2", "키워드6"],
      "emotion_match": 0.85
    }
  ],
  "overall_confidence": 0.91
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 응답 파싱
        const step1Analysis = parsed.step1_user_analysis || userAnalysis;
        const step4Keywords = parsed.step4_single_keywords || {};
        const step5Compounds = parsed.step5_compound_search || [];
        const step6Curation = parsed.step6_emotional_curation || [];
        
        // 복합 검색어 추출
        const compoundSearch = [];
        const cacheCategories = {};
        
        step5Compounds.forEach(item => {
          if (item.search_term) {
            compoundSearch.push(item.search_term);
            cacheCategories[item.search_term] = item.related_keywords || [];
          }
        });
        
        // 개인화 데이터 구성
        const mockStep2 = {
          matched_keywords: userPreferences ? userPreferences.preferredKeywords.map(k => k.keyword).slice(0, 3) : [],
          personalization_score: userPreferences ? 0.8 : 0.3
        };
        
        const mockStep3 = {
          popular_choices: emotionPreferences.map(k => k.keyword).slice(0, 3),
          community_confidence: emotionPreferences.length > 0 ? 0.7 : 0.3
        };
        
        const expansionTerms = Object.keys(step4Keywords).slice(0, 5);
        const allKeywords = [...compoundSearch, ...expansionTerms];
        
        return {
          step1UserAnalysis: step1Analysis,
          step2PersonalPreferences: mockStep2,
          step3SimilarUsers: mockStep3,
          step4SingleKeywords: step4Keywords,
          step5CompoundSearch: compoundSearch,
          step6EmotionalCuration: step6Curation,
          
          directSearch: compoundSearch,
          basicKeywords: step4Keywords,
          userAnalysis: step1Analysis,
          
          cacheCategories: cacheCategories,
          emotionalCurations: step6Curation,
          
          personalizationScore: parsed.overall_confidence || 0.7,
          
          expansionTerms: expansionTerms,
          keywords: allKeywords,
          
          analysis: {
            emotion: step1Analysis.current_state || null,
            emotionalNeed: step1Analysis.emotional_need || null,
            context: step1Analysis.context || null,
            confidence: parsed.overall_confidence || 0.8,
            userState: step1Analysis,
            personalization: {
              score: parsed.overall_confidence || 0.7,
              personalMatch: mockStep2,
              similarUsers: mockStep3
            }
          },
          confidence: parsed.overall_confidence || 0.8
        };
      }
    } catch (error) {
      console.error('   ❌ 키워드 생성 실패:', error.message);
    }
    
    return null;
  }

  /**
   * 🧠 기본 감정 예측 (간단한 키워드 매칭)
   */
  predictEmotion(input) {
    const emotionKeywords = {
      "피곤함": ["피곤", "지침", "힘들", "지쳐", "졸려", "피로"],
      "스트레스": ["스트레스", "압박", "답답", "짜증", "막막", "부담"],
      "우울함": ["우울", "슬프", "외로", "공허", "무기력", "허탈"],
      "기쁨": ["기쁘", "즐겁", "행복", "신나", "좋아", "만족"],
      "불안": ["불안", "걱정", "근심", "초조", "두려", "떨려"]
    };

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        return emotion;
      }
    }

    return "일반"; // 기본값
  }

  /**
   * 🔄 개선된 폴백 처리 (DB 데이터 활용)
   */
  simpleFallback(input, maxKeywords, userPreferences, emotionPreferences) {
    console.log(`   🔄 v3.1 개인화 폴백 처리 (DB 활용)`);
    
    // 입력에서 기본 키워드 추출
    const words = input
      .replace(/[^\w\s가-힣]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1);

    // 📊 개인 선호 키워드 우선 활용
    const directSearch = [];
    const basicKeywords = {};

    if (userPreferences && userPreferences.preferredKeywords.length > 0) {
      // 개인 선호 키워드 기반 검색어 생성
      const topPrefs = userPreferences.preferredKeywords.slice(0, 2);
      topPrefs.forEach(pref => {
        if (words.length > 0) {
          directSearch.push(`${words[0]} ${pref.keyword}`);
        } else {
          directSearch.push(`${pref.keyword} 영상`);
        }
        basicKeywords[pref.keyword] = pref.score;
      });
    }

    // 감정별 선호 키워드 추가
    if (emotionPreferences && emotionPreferences.length > 0) {
      emotionPreferences.forEach(ek => {
        if (!basicKeywords[ek.keyword]) {
          basicKeywords[ek.keyword] = ek.score * 0.8; // 개인 선호보다 약간 낮은 점수
        }
      });
    }

    // 기본 단어들도 추가
    words.slice(0, 4).forEach((word, index) => {
      if (!basicKeywords[word]) {
        basicKeywords[word] = Math.max(0.3, 0.7 - (index * 0.1));
      }
    });

    // 기본 2단어 조합 추가
    if (directSearch.length === 0 && words.length >= 2) {
      directSearch.push(`${words[0]} ${words[1]}`);
    } else if (directSearch.length === 0 && words.length === 1) {
      directSearch.push(`${words[0]} 영상`);
    }

    // 기존 호환성
    const expansionTerms = Object.keys(basicKeywords).slice(0, 3);

    return {
      // 🎯 v3.2 간소화 구조
      step1UserAnalysis: {
        current_state: 'unknown',
        emotional_need: 'general',
        context: 'fallback'
      },
      step2PersonalPreferences: {
        matched_keywords: userPreferences ? userPreferences.preferredKeywords.map(k => k.keyword).slice(0, 3) : [],
        personalization_score: userPreferences ? 0.6 : 0.2
      },
      step3SimilarUsers: {
        popular_choices: emotionPreferences.map(k => k.keyword).slice(0, 3),
        community_confidence: emotionPreferences.length > 0 ? 0.7 : 0.3
      },
      step4SingleKeywords: basicKeywords,
      step5CompoundSearch: directSearch,
      step6EmotionalCuration: [
        {
          sentence: "지금 이 순간에 딱 맞는 영상을 찾아보세요",
          keywords: directSearch.slice(0, 2),
          emotion_match: 0.6
        }
      ],

      // 🔄 v2.0 호환성
      directSearch: directSearch,           
      basicKeywords: basicKeywords,         
      userAnalysis: {
        current_state: 'unknown',
        emotional_need: 'general',
        predicted_preference: 'general'
      },
      
      // 📊 개인화 점수
      personalizationScore: userPreferences ? 0.6 : 0.2,
      
      // 🔄 기존 호환성
      expansionTerms: expansionTerms,
      keywords: [...directSearch, ...expansionTerms],
      analysis: {
        emotion: null,
        topic: null,
        confidence: 0.5,
        personalization: {
          score: userPreferences ? 0.6 : 0.2,
          dataAvailable: !!userPreferences || !!emotionPreferences
        }
      }
    };
  }

  /**
   * 🚨 비상 폴백
   */
  emergencyFallback(input) {
    const words = input.split(/\s+/).filter(w => w.length > 1).slice(0, 3);
    return words.length > 0 ? words : ['추천', '영상'];
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
      claudeAvailable: !!this.anthropic,
      dbAccessRate: this.stats.dbAccessCount + ' accesses'
    };
  }
}

// 전역 인스턴스
const extractor = new NaturalLanguageExtractor();

// 편의 함수들
export async function extractKeywordsFromText(userInput, inputType, maxKeywords = 5, userId = null) {
  return await extractor.extractKeywords(userInput, inputType, maxKeywords, userId);
}

export async function quickExtract(userInput, inputType, userId = null) {
  const result = await extractor.extractKeywords(userInput, inputType, 3, userId);
  return result.success ? {
    // 🎯 v3.1 개인화 구조
    directSearch: result.directSearch,      
    basicKeywords: result.basicKeywords,    
    userAnalysis: result.userAnalysis,     
    personalization: {
      score: result.feedbackData?.personalizedScore || 0.5,
      personalPreferences: result.step2PersonalPreferences,
      similarUsers: result.step3SimilarUsers
    },
    
    // 🔄 기존 호환성
    expansionTerms: result.expansionTerms
  } : { 
    directSearch: [], 
    expansionTerms: [],
    basicKeywords: {},
    userAnalysis: {},
    personalization: { score: 0 }
  };
}

export function getStats() {
  return extractor.getStats();
}

export default extractor;

/**
 * 🎯 v3.2 사용 예시 및 간소화된 3단계 개인화 큐레이션
 * 
 * 입력: "퇴근하고 와서 피곤해"
 * 
 * 3단계 워크플로우 출력 구조:
 * {
 *   // Step 1: 사용자 입력 분석
 *   step1UserAnalysis: {
 *     current_state: "피곤함",
 *     emotional_need: "휴식",
 *     context: "퇴근 후 저녁시간"
 *   },
 * 
 *   // Step 4: 개인화 단일 키워드 (입력 중심 70% + 개인 선호 20% + 유사 사용자 10%)
 *   step4SingleKeywords: {
 *     "힐링": 0.95, "피아노": 0.92, "재즈": 0.88, "쉼": 0.82, "자연": 0.78,
 *     "음악": 0.74, "ASMR": 0.71, "여행": 0.65, "카페": 0.58, "로파이": 0.52
 *   },
 * 
 *   // Step 5: 추천 검색어 + 관련 키워드 (DB 저장용)
 *   step5CompoundSearch: ["우중 캠핑", "잔잔한 로파이", "여수 여행"],
 *   cacheCategories: {
 *     "우중 캠핑": ["캠핑", "여행", "잔잔함", "쉼"],
 *     "잔잔한 로파이": ["로파이", "음악", "힐링", "집중"],
 *     "여수 여행": ["여행", "바다", "힐링", "자연"]
 *   },
 * 
 *   // Step 6: 감성 문장 큐레이션 ⭐ 4개 문장!
 *   step6EmotionalCuration: [
 *     {
 *       sentence: "하루의 피로를 자연스럽게 풀어내고 싶을 때",
 *       keywords: ["힐링", "ASMR"],
 *       emotion_match: 0.95
 *     },
 *     {
 *       sentence: "많은 분들이 이런 날 선택하는 마음의 쉼표",
 *       keywords: ["우중 캠핑", "자연"],
 *       emotion_match: 0.91
 *     },
 *     {
 *       sentence: "오늘 하루를 잔잔하게 마무리하고 싶다면",
 *       keywords: ["잔잔한 로파이", "피아노"],
 *       emotion_match: 0.88
 *     },
 *     {
 *       sentence: "지친 마음을 달래주는 시간이 필요할 때",
 *       keywords: ["여수 여행", "음악"],
 *       emotion_match: 0.85
 *     }
 *   ]
 * }
 * 
 * 🚀 v3.2 간소화 개선점:
 * 
 * 1. 🎯 **핵심 3단계로 집중**
 *    - 복잡한 2,3단계 제거
 *    - 사용자 입력 분석 결과가 가장 중요 (70% 비중)
 * 
 * 2. 🏷️ **다양한 키워드 추출**
 *    - 감정/주제 구분 없이 최대한 다양하게
 *    - 힐링, 피아노, 재즈, 쉼, 자연 등
 * 
 * 3. 🔗 **검색어별 관련 키워드 제공**
 *    - "우중 캠핑" → ["캠핑", "여행", "잔잔함", "쉼"]
 *    - DB 저장 및 영상 검색 시 활용
 * 
 * 4. 💬 **4개 감성 문장으로 확장**
 *    - 더 다양한 선택지 제공
 *    - 키워드를 자연스럽게 연결
 * 
 * 🎉 활용 시나리오:
 * 1. 사용자가 감성 문장 클릭
 * 2. 해당 문장의 키워드로 영상 검색
 * 3. 관련 키워드들을 DB에 태깅하여 저장
 * 4. 사용자 선호도 학습 및 업데이트
 */ 