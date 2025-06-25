/**
 * 🎯 3단계: 개인화 큐레이션 마스터
 * 
 * 2단계 기능 + 확장:
 * 1. 키워드 기반 선택 (2단계 상속)
 * 2. 새로운 키워드 생성 (2단계 상속)
 * 3. 개인화 AI 추천 (Claude 3.7 Sonnet)
 * 4. 사용자 피드백 학습
 * 5. 개인 취향 프로필 구축
 * 
 * 목표 처리 시간: 1.2초
 */

import HybridKeywordGenerator from './stage2_hybrid_generator.js';

class PersonalizedCurationMaster extends HybridKeywordGenerator {
  constructor() {
    super();
  }

  /**
   * 👤 사용자 개인화 프로필 조회
   */
  async getUserPersonalizationProfile(userId) {
    console.log(`👤 [3단계] 사용자 프로필 조회: ${userId || 'anonymous'}`);
    
    if (!userId) {
      console.log(`   ℹ️ 익명 사용자 - 기본 프로필 사용`);
      return this.getDefaultProfile();
    }

    try {
      const { data, error } = await this.supabase
        .from('user_personalization_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        console.log(`   ℹ️ 신규 사용자 - 기본 프로필 생성`);
        return await this.createInitialProfile(userId);
      }

      console.log(`   ✅ 기존 프로필 로드 완료`);
      return data;

    } catch (error) {
      console.error(`   ❌ 프로필 조회 실패: ${error.message}`);
      return this.getDefaultProfile();
    }
  }

  /**
   * 🤖 개인화 AI 키워드 추천 (Claude 3.7 Sonnet)
   */
  async generatePersonalizedRecommendations(userInput, emotionAnalysis, existingKeywords, userProfile) {
    console.log(`🤖 [3단계] 개인화 추천 생성...`);
    
    const systemPrompt = `사용자의 개인 취향과 감정 상태를 고려한 맞춤형 키워드를 추천해주세요.

**개인화 고려사항:**
1. 사용자 선호 카테고리와 키워드
2. 현재 감정 상태와 니즈
3. 과거 시청 패턴 및 행동
4. 15-20개의 개인 맞춤 키워드 추천 (더 정밀한 개인화)

응답 형식 (JSON):
{
  "personalizedKeywords": [
    {
      "keyword": "개인 맞춤 키워드",
      "category": "카테고리",
      "personalization_score": 0.95,
      "reasoning": "개인화 이유"
    }
  ],
  "personalization_confidence": 0.92,
  "recommendation_type": "preference_based"
}`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // 다중 감정 처리
        const primaryEmotion = emotionAnalysis.emotion?.[0] || '감정분석실패';
        const emotionList = emotionAnalysis.emotion?.join(', ') || primaryEmotion;
        const primaryIntensity = emotionAnalysis.intensity?.[primaryEmotion] || '보통';
        
        const response = await this.anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 800,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `사용자 입력: "${userInput}"
감정: ${emotionList} (주요감정: ${primaryEmotion} - ${primaryIntensity})

**사용자 개인 프로필:**
선호 카테고리: ${userProfile.preferred_categories?.join(', ') || '없음'}
선호 키워드: ${userProfile.preferred_keywords?.join(', ') || '없음'}
기피 카테고리: ${userProfile.disliked_categories?.join(', ') || '없음'}
시청 패턴: ${userProfile.viewing_patterns || '분석중'}

**기존 선택된 키워드:**
${existingKeywords.keywordNames.join(', ')}`
            }
          ]
        });

        const content = response.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          console.log(`   ✅ 개인화 추천 완료: ${result.personalizedKeywords?.length || 0}개`);
          
          return {
            personalizedKeywords: result.personalizedKeywords || [],
            confidence: result.personalization_confidence || 0.8,
            recommendationType: result.recommendation_type || 'preference_based'
          };
        }
        
        throw new Error('JSON 형식 응답을 받지 못했습니다');

      } catch (error) {
        console.error(`   ❌ 개인화 추천 실패 (${attempt}/${this.maxRetries}): ${error.message}`);
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * 🎨 최종 키워드 큐레이션 (모든 단계 통합)
   */
  async curateAllKeywords(existingKeywords, newKeywords, personalizedKeywords) {
    console.log(`🎨 [3단계] 최종 키워드 큐레이션...`);
    
    // 모든 키워드 통합
    const allKeywords = [
      ...existingKeywords.keywordNames,
      ...newKeywords.map(k => k.keyword),
      ...personalizedKeywords.map(k => k.keyword)
    ];
    
    // 중복 제거
    const uniqueKeywords = [...new Set(allKeywords)];
    
    console.log(`   ✅ 키워드 큐레이션 완료: 총 ${uniqueKeywords.length}개 (중복 ${allKeywords.length - uniqueKeywords.length}개 제거)`);
    
    return {
      finalKeywords: uniqueKeywords,
      breakdown: {
        existing: existingKeywords.keywordNames.length,
        new: newKeywords.length,
        personalized: personalizedKeywords.length,
        duplicatesRemoved: allKeywords.length - uniqueKeywords.length,
        total: uniqueKeywords.length
      },
      allKeywordDetails: {
        existing: existingKeywords.keywordNames,
        new: newKeywords,
        personalized: personalizedKeywords
      }
    };
  }

  /**
   * 💬 고도화된 감정 큐레이션 문장 생성 (키워드 3개 이상 묶기)
   */
  async createAdvancedEmotionalSentences(curatedKeywords, emotionAnalysis, userInput, userProfile) {
    console.log(`💬 [3단계] 고도화 감정 문장 생성...`);
    
    const systemPrompt = `사용자의 개인 취향을 반영한 감성적인 큐레이션 문장 4개를 만들어주세요.

**고도화 문장 생성 규칙:**
1. 각 문장마다 키워드 3-5개씩 자연스럽게 조합 (최소 3개 이상)
2. 사용자의 개인 취향과 감정 상태 모두 반영
3. 더욱 구체적이고 개인적인 표현
4. "당신이 좋아하는", "평소 즐기던" 등 개인화 어투

응답 형식 (JSON):
{
  "sentences": [
    {
      "sentence": "당신이 평소 좋아하던 힐링과 ASMR로 마음을 달래고 싶을 때",
      "keywords": ["힐링", "ASMR", "수면", "평온"]
    },
    {
      "sentence": "깊은 밤 혼자만의 시간에 피아노와 자연 소리로 명상하고 싶다면",
      "keywords": ["피아노", "자연", "명상", "힐링", "밤"]
    },
    {
      "sentence": "일상의 스트레스를 백색소음과 함께 깊은 잠으로 풀어내고 싶은 밤에",
      "keywords": ["백색소음", "수면", "ASMR", "스트레스해소"]
    },
    {
      "sentence": "온전히 나만의 공간에서 평온함과 명상으로 마음을 정리하고 싶을 때",
      "keywords": ["명상", "힐링", "평온함", "개인공간"]
    }
  ]
}`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // 다중 감정 처리
        const primaryEmotion = emotionAnalysis.emotion?.[0] || '감정분석실패';
        const emotionList = emotionAnalysis.emotion?.join(', ') || primaryEmotion;
        const primaryIntensity = emotionAnalysis.intensity?.[primaryEmotion] || '보통';
        
        const response = await this.anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 700,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `사용자 입력: "${userInput}"
감정: ${emotionList} (주요감정: ${primaryEmotion} - ${primaryIntensity})

**사용자 개인 프로필:**
선호 카테고리: ${userProfile.preferred_categories?.join(', ') || '없음'}
선호 키워드: ${userProfile.preferred_keywords?.join(', ') || '없음'}

**큐레이션된 키워드:**
${curatedKeywords.finalKeywords.join(', ')}`
            }
          ]
        });

        const content = response.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          console.log(`   ✅ 고도화 감정 문장 생성 완료: ${result.sentences?.length || 0}개`);
          return result.sentences || [];
        }
        
        throw new Error('JSON 형식 응답을 받지 못했습니다');

      } catch (error) {
        console.error(`   ❌ 고도화 감정 문장 생성 실패 (${attempt}/${this.maxRetries}): ${error.message}`);
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * 📊 사용자 프로필 업데이트 (피드백 학습)
   */
  async updateUserProfile(userId, selectedKeywords, userFeedback, emotionAnalysis) {
    console.log(`📊 [3단계] 사용자 프로필 업데이트...`);
    
    if (!userId) {
      console.log(`   ℹ️ 익명 사용자 - 프로필 업데이트 건너뜀`);
      return { updated: false };
    }

    try {
      // 현재 프로필 조회
      const currentProfile = await this.getUserPersonalizationProfile(userId);
      
      // 새로운 선호도 반영
      const updatedPreferences = this.calculateUpdatedPreferences(
        currentProfile,
        selectedKeywords,
        userFeedback,
        emotionAnalysis
      );

      // DB 업데이트
      const { data, error } = await this.supabase
        .from('user_personalization_profiles')
        .upsert({
          user_id: userId,
          preferred_categories: updatedPreferences.categories,
          preferred_keywords: updatedPreferences.keywords,
          viewing_patterns: updatedPreferences.patterns,
          emotion_preferences: updatedPreferences.emotions,
          updated_at: new Date().toISOString()
        })
        .select('id');

      if (error) {
        throw error;
      }

      console.log(`   ✅ 프로필 업데이트 완료`);
      return { updated: true, preferences: updatedPreferences };

    } catch (error) {
      console.error(`   ❌ 프로필 업데이트 실패: ${error.message}`);
      return { updated: false, error: error.message };
    }
  }

  /**
   * 🎪 3단계 메인 통합 함수
   */
  async getPersonalizedRecommendation(userInput, inputType = 'emotion', userId = null) {
    console.log(`🎪 [3단계] 개인화 큐레이션 시작: "${userInput}" (사용자: ${userId || 'anonymous'})`);
    const startTime = Date.now();
    
    try {
      // 1-3. 2단계까지의 모든 과정
      const keywordList = await this.loadUsedKeywords();
      const emotionAnalysis = await this.analyzeUserEmotion(userInput);
      
      // 사용자 개인화 프로필 조회
      const userProfile = await this.getUserPersonalizationProfile(userId);
      
      // 기존 키워드 선택 (10-15개)
      const existingKeywords = await this.selectEmotionBasedKeywords(
        userInput, 
        emotionAnalysis, 
        keywordList
      );
      
      // 새로운 키워드 생성
      const newKeywordsResult = await this.generateNewKeywords(
        userInput,
        emotionAnalysis,
        existingKeywords
      );
      
      // 개인화 AI 추천 (15-20개)
      const personalizedResult = await this.generatePersonalizedRecommendations(
        userInput,
        emotionAnalysis,
        existingKeywords,
        userProfile
      );
      
      // 모든 키워드 큐레이션
      const curatedKeywords = await this.curateAllKeywords(
        existingKeywords,
        newKeywordsResult.newKeywords,
        personalizedResult.personalizedKeywords
      );
      
      // 새 키워드 DB 저장
      const saveResult = await this.saveNewKeywords(
        newKeywordsResult,
        userInput,
        inputType,
        emotionAnalysis
      );
      
      // 고도화된 감정 문장 생성
      const advancedSentences = await this.createAdvancedEmotionalSentences(
        curatedKeywords,
        emotionAnalysis,
        userInput,
        userProfile
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`🎉 [3단계] 완료! 처리시간: ${processingTime}ms`);
      
      // 호환성을 위해 기존 형식도 유지
      const primaryEmotion = emotionAnalysis.emotion?.[0] || '감정분석실패';
      const primaryIntensity = emotionAnalysis.intensity?.[primaryEmotion] || '보통';
      
      return {
        success: true,
        stage: 3,
        processingTime,
        
        // 감정 분석 정보 (호환성)
        emotion: primaryEmotion,
        emotionIntensity: primaryIntensity,
        emotionContext: emotionAnalysis.context,
        emotionalNeed: emotionAnalysis.emotional_need,
        
        // 새로운 다중 감정 정보 추가
        emotionAnalysis: emotionAnalysis,
        
        // 키워드 정보
        existingKeywords: existingKeywords.keywordNames,
        newKeywords: newKeywordsResult.newKeywords.map(k => k.keyword),
        personalizedKeywords: personalizedResult.personalizedKeywords.map(k => k.keyword),
        
        // 최종 큐레이션 결과
        finalKeywords: curatedKeywords.finalKeywords,
        keywordBreakdown: curatedKeywords.breakdown,
        
        // 고도화된 감정 큐레이션 문장 (4개)
        emotionalSentences: advancedSentences,
        
        // 개인화 정보
        userProfile: {
          isNewUser: !userProfile.user_id,
          preferredCategories: userProfile.preferred_categories || [],
          preferredKeywords: userProfile.preferred_keywords || []
        },
        personalizationConfidence: personalizedResult.confidence,
        recommendationType: personalizedResult.recommendationType,
        
        // 메타데이터
        totalAvailableKeywords: keywordList.length,
        overallConfidence: (
          (existingKeywords.confidence || 0.8) + 
          newKeywordsResult.confidence + 
          personalizedResult.confidence
        ) / 3,
        
        dbSaveResult: saveResult,
        userInput: userInput,
        inputType: inputType,
        userId: userId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ [3단계] 실패: ${error.message}`);
      
      return {
        success: false,
        stage: 3,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 보조 함수들
   */
  
  // 기본 프로필 생성
  getDefaultProfile() {
    return {
      user_id: null,
      preferred_categories: ['힐링', '음악', '라이프스타일'],
      preferred_keywords: ['ASMR', '피아노', '자연'],
      disliked_categories: [],
      viewing_patterns: '분석중',
      emotion_preferences: {}
    };
  }

  // 신규 사용자 프로필 생성
  async createInitialProfile(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_personalization_profiles')
        .insert({
          user_id: userId,
          preferred_categories: ['힐링', '음악', '라이프스타일'],
          preferred_keywords: ['ASMR', '피아노', '자연'],
          disliked_categories: [],
          viewing_patterns: '신규사용자',
          emotion_preferences: {}
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log(`   ✅ 신규 프로필 생성 완료`);
      return data;
      
    } catch (error) {
      console.error(`   ❌ 신규 프로필 생성 실패: ${error.message}`);
      return this.getDefaultProfile();
    }
  }

  // 선호도 계산 업데이트
  calculateUpdatedPreferences(currentProfile, selectedKeywords, userFeedback, emotionAnalysis) {
    // 간단한 선호도 업데이트 로직
    const currentKeywords = currentProfile.preferred_keywords || [];
    const newKeywords = selectedKeywords.keywordNames || [];
    
    // 새로 선택된 키워드를 선호 키워드에 추가 (중복 제거)
    const updatedKeywords = [...new Set([...currentKeywords, ...newKeywords])];
    
    // 다중 감정 처리
    const primaryEmotion = emotionAnalysis.emotion?.[0] || '감정분석실패';
    
    return {
      categories: currentProfile.preferred_categories || [],
      keywords: updatedKeywords.slice(0, 20), // 최대 20개로 제한
      patterns: `${primaryEmotion} 중심`,
      emotions: {
        ...currentProfile.emotion_preferences,
        [primaryEmotion]: (currentProfile.emotion_preferences?.[primaryEmotion] || 0) + 1
      }
    };
  }
}

export default PersonalizedCurationMaster; 