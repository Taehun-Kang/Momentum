/**
 * 🌟 2단계: 하이브리드 키워드 생성기
 * 
 * 1단계 기능 + 확장:
 * 1. 키워드 기반 선택 (1단계 상속)
 * 2. 새로운 키워드 생성 (Claude 3.7 Sonnet)
 * 3. 기존 + 새생성 통합
 * 4. 새 키워드 DB 저장
 * 
 * 목표 처리 시간: 0.8초
 */

import CachedKeywordSelector from './stage1_cached_selector.js';

class HybridKeywordGenerator extends CachedKeywordSelector {
  constructor() {
    super();
  }

  /**
   * 🎯 감정 맞춤 키워드 선택 (확장 버전 - 10-15개)
   */
  async selectEmotionBasedKeywords(userInput, emotionAnalysis, keywordList) {
    console.log(`🎯 [2단계] 키워드 선택: ${emotionAnalysis.emotion?.[0] || '감정분석실패'}`);
    
    const keywordNames = keywordList.map(k => k.keyword);
    
    const systemPrompt = `사용자의 감정에 맞는 키워드를 선택해주세요.

**선택 기준:**
1. 사용자의 감정 상태에 가장 적합한 키워드
2. 감정적 니즈를 충족할 수 있는 키워드
3. 10-15개 키워드 선택 (더 풍부한 조합을 위해)

응답 형식 (JSON):
{
  "selectedKeywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5", "키워드6", "키워드7", "키워드8", "키워드9", "키워드10"],
  "reasoning": "선택 이유"
}`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // 다중 감정 처리
        const primaryEmotion = emotionAnalysis.emotion?.[0] || '감정분석실패';
        const emotionList = emotionAnalysis.emotion?.join(', ') || primaryEmotion;
        const primaryIntensity = emotionAnalysis.intensity?.[primaryEmotion] || '보통';
        
        const response = await this.anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 500,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `사용자 입력: "${userInput}"
감정 분석: ${emotionList} (주요감정: ${primaryEmotion} - ${primaryIntensity})
감정적 니즈: ${emotionAnalysis.emotional_need || '휴식과 안정'}

사용 가능한 키워드:
${keywordNames.join(', ')}`
            }
          ]
        });

        const content = response.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const selection = JSON.parse(jsonMatch[0]);
          
          // 선택된 키워드의 상세 정보 추가
          const selectedKeywordsWithInfo = selection.selectedKeywords
            .map(keyword => keywordList.find(k => k.keyword === keyword))
            .filter(Boolean);
          
          console.log(`   ✅ 키워드 선택 완료: ${selection.selectedKeywords.length}개`);
          
          return {
            keywords: selectedKeywordsWithInfo,
            keywordNames: selection.selectedKeywords,
            reasoning: selection.reasoning
          };
        }
        
        throw new Error('JSON 형식 응답을 받지 못했습니다');

      } catch (error) {
        console.error(`   ❌ 키워드 선택 실패 (${attempt}/${this.maxRetries}): ${error.message}`);
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * 🆕 새로운 키워드 생성 (Claude 3.7 Sonnet)
   */
  async generateNewKeywords(userInput, emotionAnalysis, existingKeywords) {
    console.log(`🆕 [2단계] 새로운 키워드 생성: ${emotionAnalysis.emotion?.[0] || '감정분석실패'}`);
    
    const existingKeywordNames = existingKeywords.keywordNames;
    
    const systemPrompt = `사용자의 감정과 니즈에 맞는 새로운 키워드를 생성해주세요.

**새 키워드 생성 조건:**
1. 기존 키워드와 중복되지 않음
2. 사용자의 감정과 상황에 더 구체적으로 맞춤
3. YouTube Shorts에서 실제 검색 가능한 키워드
4. 3-5개의 새로운 키워드 생성

**예시:**
- 기존: "여행" → 새로운: "우중 캠핑", "감성 카페 투어"
- 기존: "음식" → 새로운: "야식 먹방", "새벽 디저트"

응답 형식 (JSON):
{
  "newKeywords": [
    {
      "keyword": "우중 캠핑",
      "category": "여행",
      "relevance_score": 0.95,
      "reasoning": "비 오는 날 캠핑의 감성적 매력"
    },
    {
      "keyword": "감성 카페 투어", 
      "category": "라이프스타일",
      "relevance_score": 0.92,
      "reasoning": "혼자만의 시간과 공간이 주는 위로"
    }
  ],
  "generation_confidence": 0.88
}`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // 다중 감정 처리
        const primaryEmotion = emotionAnalysis.emotion?.[0] || '감정분석실패';
        const emotionList = emotionAnalysis.emotion?.join(', ') || primaryEmotion;
        const primaryIntensity = emotionAnalysis.intensity?.[primaryEmotion] || '보통';
        
        const response = await this.anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 500,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `사용자 입력: "${userInput}"
감정: ${emotionList} (주요감정: ${primaryEmotion} - ${primaryIntensity})
감정적 니즈: ${emotionAnalysis.emotional_need || '휴식과 안정'}

**기존 선택된 키워드:**
${existingKeywordNames.join(', ')}`
            }
          ]
        });

        const content = response.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          console.log(`   ✅ 새 키워드 생성 완료: ${result.newKeywords?.length || 0}개`);
          
          return {
            newKeywords: result.newKeywords || [],
            confidence: result.generation_confidence || 0.8
          };
        }
        
        throw new Error('JSON 형식 응답을 받지 못했습니다');

      } catch (error) {
        console.error(`   ❌ 새 키워드 생성 실패 (${attempt}/${this.maxRetries}): ${error.message}`);
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * 🔗 기존 + 새생성 키워드 통합
   */
  async combineExistingAndNew(existingKeywords, newKeywordsResult) {
    console.log(`🔗 [2단계] 키워드 통합...`);
    
    const combinedKeywords = [...existingKeywords.keywordNames];
    const newKeywordNames = newKeywordsResult.newKeywords.map(k => k.keyword);
    
    // 새 키워드 추가 (중복 제거)
    newKeywordNames.forEach(newKeyword => {
      if (!combinedKeywords.includes(newKeyword)) {
        combinedKeywords.push(newKeyword);
      }
    });
    
    console.log(`   ✅ 키워드 통합 완료: 기존 ${existingKeywords.keywordNames.length}개 + 새로운 ${newKeywordNames.length}개 = 총 ${combinedKeywords.length}개`);
    
    return {
      totalKeywords: combinedKeywords,
      existingCount: existingKeywords.keywordNames.length,
      newCount: newKeywordNames.length,
      finalCount: combinedKeywords.length,
      newKeywordDetails: newKeywordsResult.newKeywords
    };
  }

  /**
   * 💾 새 키워드 DB 저장
   */
  async saveNewKeywords(newKeywordsResult, userInput, inputType, emotionAnalysis) {
    console.log(`💾 [2단계] 새 키워드 DB 저장...`);
    
    if (!newKeywordsResult.newKeywords || newKeywordsResult.newKeywords.length === 0) {
      console.log(`   ℹ️ 저장할 새 키워드가 없습니다`);
      return { saved: 0, failed: 0 };
    }

    let savedCount = 0;
    let failedCount = 0;

    for (const newKeyword of newKeywordsResult.newKeywords) {
      try {
        const { data, error } = await this.supabase
          .from('llm_recommended_keywords')
          .upsert({
            keyword: newKeyword.keyword,
            user_input: userInput,
            input_type: inputType,
            emotion_detected: emotionAnalysis.emotion?.[0] || '감정분석실패',
            category: newKeyword.category,
            relevance_score: newKeyword.relevance_score,
            reasoning: newKeyword.reasoning,
            recommendation_count: 1
          }, {
            onConflict: 'keyword,user_input',
            ignoreDuplicates: false
          })
          .select('id');

        if (error) {
          console.error(`   ❌ 키워드 저장 실패: ${newKeyword.keyword} - ${error.message}`);
          failedCount++;
        } else {
          savedCount++;
        }

      } catch (error) {
        console.error(`   ❌ 키워드 저장 예외: ${newKeyword.keyword} - ${error.message}`);
        failedCount++;
      }
    }

    console.log(`   📊 DB 저장 결과: 성공 ${savedCount}개, 실패 ${failedCount}개`);
    
    return { saved: savedCount, failed: failedCount };
  }

  /**
   * 💬 4개 감정 큐레이션 문장 생성 (키워드 3개 이상 묶기)
   */
  async createEmotionalSentences(selectedKeywords, emotionAnalysis, userInput) {
    console.log(`💬 [2단계] 감정 문장 생성...`);
    
    const keywordNames = selectedKeywords.keywordNames;
    
    const systemPrompt = `선택된 키워드들을 활용해 감성적인 큐레이션 문장 4개를 만들어주세요.

**문장 생성 규칙:**
1. 각 문장마다 키워드 3-4개씩 자연스럽게 조합 (최소 3개 이상)
2. 사용자의 감정에 공감하는 톤
3. 구체적이고 매력적인 표현
4. "~할 때", "~하고 싶다면" 등 상황 중심

응답 형식 (JSON):
{
  "sentences": [
    {
      "sentence": "하루의 피로를 자연스럽게 풀어내고 싶을 때",
      "keywords": ["힐링", "ASMR", "수면"]
    },
    {
      "sentence": "마음을 차분하게 정리하며 휴식을 취하고 싶다면",
      "keywords": ["피아노", "자연", "명상", "힐링"]
    },
    {
      "sentence": "깊은 잠에 빠져들고 싶은 밤에",
      "keywords": ["수면", "백색소음", "ASMR"]
    },
    {
      "sentence": "온전히 나만의 시간을 갖고 싶을 때",
      "keywords": ["명상", "힐링", "평온함"]
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
          max_tokens: 600,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `사용자 입력: "${userInput}"
감정: ${emotionList} (주요감정: ${primaryEmotion} - ${primaryIntensity})
선택된 키워드: ${keywordNames.join(', ')}`
            }
          ]
        });

        const content = response.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          console.log(`   ✅ 감정 문장 생성 완료: ${result.sentences?.length || 0}개`);
          return result.sentences || [];
        }
        
        throw new Error('JSON 형식 응답을 받지 못했습니다');

      } catch (error) {
        console.error(`   ❌ 감정 문장 생성 실패 (${attempt}/${this.maxRetries}): ${error.message}`);
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * 🎪 2단계 메인 통합 함수
   */
  async getHybridRecommendation(userInput, inputType = 'emotion') {
    console.log(`🎪 [2단계] 하이브리드 추천 시작: "${userInput}" (타입: ${inputType})`);
    const startTime = Date.now();
    
    try {
      // 1-2. 키워드 로드 및 감정 분석
      const keywordList = await this.loadUsedKeywords();
      const emotionAnalysis = await this.analyzeUserEmotion(userInput);
      
      // 3. 기존 키워드 선택 (10-15개)
      const existingKeywords = await this.selectEmotionBasedKeywords(
        userInput, 
        emotionAnalysis, 
        keywordList
      );
      
      // 4. 새로운 키워드 생성
      const newKeywordsResult = await this.generateNewKeywords(
        userInput,
        emotionAnalysis,
        existingKeywords
      );
      
      // 5. 키워드 통합
      const integratedKeywords = await this.combineExistingAndNew(
        existingKeywords,
        newKeywordsResult
      );
      
      // 6. 새 키워드 DB 저장
      const saveResult = await this.saveNewKeywords(
        newKeywordsResult,
        userInput,
        inputType,
        emotionAnalysis
      );
      
      // 7. 통합된 키워드로 4개 감정 문장 생성
      const enhancedKeywordsForSentences = {
        keywordNames: integratedKeywords.totalKeywords
      };
      
      const emotionalSentences = await this.createEmotionalSentences(
        enhancedKeywordsForSentences,
        emotionAnalysis,
        userInput
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`🎉 [2단계] 완료! 처리시간: ${processingTime}ms`);
      
      // 호환성을 위해 기존 형식도 유지
      const primaryEmotion = emotionAnalysis.emotion?.[0] || '감정분석실패';
      const primaryIntensity = emotionAnalysis.intensity?.[primaryEmotion] || '보통';
      
      return {
        success: true,
        stage: 2,
        processingTime,
        
        // 1단계 정보 유지 (호환성)
        emotion: primaryEmotion,
        emotionIntensity: primaryIntensity,
        emotionContext: emotionAnalysis.context,
        emotionalNeed: emotionAnalysis.emotional_need,
        
        // 새로운 다중 감정 정보 추가
        emotionAnalysis: emotionAnalysis,
        
        // 2단계 확장 정보
        existingKeywords: existingKeywords.keywordNames,
        newKeywords: newKeywordsResult.newKeywords.map(k => k.keyword),
        newKeywordDetails: newKeywordsResult.newKeywords,
        
        // 통합 결과
        finalKeywords: integratedKeywords.totalKeywords,
        keywordBreakdown: {
          existing: integratedKeywords.existingCount,
          new: integratedKeywords.newCount,
          total: integratedKeywords.finalCount
        },
        
        // 감정 큐레이션 문장 (4개) - 통합된 키워드 기반
        emotionalSentences: emotionalSentences,
        
        // DB 저장 정보
        dbSaveResult: saveResult,
        
        // 메타데이터
        totalAvailableKeywords: keywordList.length,
        confidence: (existingKeywords.confidence || 0.8 + newKeywordsResult.confidence) / 2,
        userInput: userInput,
        inputType: inputType,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ [2단계] 실패: ${error.message}`);
      
      return {
        success: false,
        stage: 2,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }
}

export default HybridKeywordGenerator; 