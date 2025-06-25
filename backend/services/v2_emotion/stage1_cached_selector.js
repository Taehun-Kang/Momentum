/**
 * 🎯 1단계: 키워드 기반 선택기
 * 
 * 핵심 기능:
 * 1. DB에서 usage_count >= 1인 키워드 로드
 * 2. Claude 3.7 Sonnet으로 사용자 감정 분석
 * 3. 감정 맞춤 키워드 선택 (10-15개)
 * 4. 4개 감정 큐레이션 문장 생성 (키워드 3개 이상 조합)
 * 
 * 목표 처리 시간: 0.6초
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class CachedKeywordSelector {
  constructor() {
    // Claude API 초기화
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다');
    }

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 0,
      timeout: 60000,
      defaultHeaders: {
        'anthropic-version': '2023-06-01'
      }
    });
    
    // Supabase 초기화
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  /**
   * 🔍 DB에서 키워드 로드 (캐싱 제거)
   */
  async loadUsedKeywords() {
    console.log('🔍 [1단계] DB에서 키워드 로드...');
    
    try {
      const { data, error } = await this.supabase
        .from('daily_keywords_v2')
        .select('keyword, category, usage_count, total_videos_collected')
        .gte('usage_count', 1)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;

      const keywords = data.map(row => ({
        keyword: row.keyword,
        category: row.category,
        usageCount: row.usage_count,
        videoCount: row.total_videos_collected
      }));
      
      console.log(`   ✅ 키워드 로드 완료: ${keywords.length}개`);
      return keywords;

    } catch (error) {
      console.error(`   ❌ 키워드 로드 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🧠 사용자 감정 상태 분석 (Claude 3.7 Sonnet)
   */
  async analyzeUserEmotion(userInput) {
    console.log(`🧠 [1단계] 감정 분석: "${userInput}"`);
    
    const systemPrompt = `Analyze and classify the user's emotional state, delivering a comprehensive and detailed result.

Classify the emotion using the categories listed below and provide intensity analysis for each detected emotion. Handle mixed or ambiguous emotions appropriately.

### Emotion Categories
- 피곤함 (예: 지침, 힘듦, 졸림)
- 스트레스 (예: 압박감, 답답함, 짜증)
- 우울함 (예: 슬픔, 외로움, 무기력)
- 기쁨 (예: 즐거움, 행복, 신남)
- 불안 (예: 걱정, 초조, 두려움)
- 지루함 (예: 심심함, 재미없음)
- 평온함 (예: 차분함, 안정감)

Conduct a thorough analysis, including relevant context and the user's emotional needs.

## Steps
1. Evaluate the user input to determine context and emotional cues.
2. Accurately classify the user's emotion(s), including any ambiguity or mixed emotions, by using the provided keywords for each category.
3. If multiple emotions are detected, list each one and assess the intensity ('낮음', '보통', '높음') for each, ensuring mapping order matches the emotion array.
4. Detail the context and identify any emotional needs.
5. Assign a confidence value to your analysis, as a float between 0 and 1 (e.g., 0.9).

## Output Format
Deliver the result in JSON format as defined below:

{
  "emotion": ["감정명"],
  "intensity": {
    "감정명1": "낮음|보통|높음",
    "감정명2": "낮음|보통|높음"
  },
  "context": "Situational description (concise and relevant information only).",
  "emotional_need": "Brief description of what the user needs emotionally.",
  "confidence": 0.0-1.0
}

- If no emotion is reliably detected, set "emotion": [] and leave "intensity" as an empty object ({}).
- When intensity is uncertain, select the most fitting value and indicate uncertainty within the "context" field, if needed.
- Ensure that the order of the "emotion" array exactly matches the corresponding intensity keys.
- For incomplete or malformed user inputs, provide a best-effort analysis and explain any limitations or assumptions in the "context".

## Output Format
The response must be a single JSON object matching the following schema:

{
  "emotion": ["감정명", ...],
  "intensity": {
    "감정명": "낮음|보통|높음",
    ...
  },
  "context": "String: Explanation of the situation and reasoning.",
  "emotional_need": "String: Main emotional need detected.",
  "confidence": Float between 0.0 and 1.0
}

Example:
{
  "emotion": ["불안", "스트레스"],
  "intensity": {
    "불안": "보통",
    "스트레스": "높음"
  },
  "context": "The user described worrying about exams and feeling overwhelmed by assignments. Some ambiguity remains due to limited detail.",
  "emotional_need": "Reassurance about performance and support with workload.",
  "confidence": 0.83
}

- Only use the provided categories and intensity labels (in Korean).
- Maintain clear explanations in context for all outputs, especially if there is uncertainty or incomplete information.`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 400,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `사용자 입력: "${userInput}"`
            }
          ]
        });

        const content = response.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          
          // 새 스키마에 맞게 로그 출력 수정
          const primaryEmotion = analysis.emotion[0] || '감정없음';
          const primaryIntensity = analysis.intensity[primaryEmotion] || '';
          
          console.log(`   ✅ 감정 분석 완료: ${primaryEmotion} (${primaryIntensity}) + ${analysis.emotion.length - 1}개 추가`);
          return analysis;
        }
        
        throw new Error('JSON 형식 응답을 받지 못했습니다');

      } catch (error) {
        console.error(`   ❌ 감정 분석 실패 (${attempt}/${this.maxRetries}): ${error.message}`);
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * 🎯 감정 맞춤 키워드 선택 (10-15개)
   */
  async selectEmotionBasedKeywords(userInput, emotionAnalysis, keywordList) {
    console.log(`🎯 [1단계] 키워드 선택: ${emotionAnalysis.emotion?.[0] || '감정분석실패'}`);
    
    const keywordNames = keywordList.map(k => k.keyword);
    
    const systemPrompt = `사용자의 감정에 맞는 키워드를 선택해주세요.

**⚠️ 중요: 반드시 제공된 키워드 목록에서만 선택하세요!**

**선택 기준:**
1. 사용자의 감정 상태에 가장 적합한 키워드
2. 감정적 니즈를 충족할 수 있는 키워드
3. 정확히 10-15개 키워드 선택

**제한 사항:**
- 제공된 키워드 목록에 없는 키워드는 절대 선택하지 마세요
- 키워드를 변형하거나 새로 만들지 마세요
- 오직 주어진 목록에서만 선택하세요

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

⚠️ 반드시 이 키워드 목록에서만 선택하세요:
${keywordNames.join(', ')}

총 ${keywordNames.length}개의 키워드 중에서 10-15개를 선택하세요.`
            }
          ]
        });

        const content = response.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const selection = JSON.parse(jsonMatch[0]);
          
          // ✅ 키워드 유효성 검증 강화
          const validKeywords = selection.selectedKeywords.filter(keyword => 
            keywordNames.includes(keyword)
          );
          
          if (validKeywords.length < 8) {
            throw new Error(`유효한 키워드가 부족합니다: ${validKeywords.length}개 (최소 8개 필요)`);
          }
          
          // 선택된 키워드의 상세 정보 추가
          const selectedKeywordsWithInfo = validKeywords
            .map(keyword => keywordList.find(k => k.keyword === keyword))
            .filter(Boolean);
          
          console.log(`   ✅ 키워드 선택 완료: ${validKeywords.length}개 (유효성 검증됨)`);
          
          return {
            keywords: selectedKeywordsWithInfo,
            keywordNames: validKeywords,
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
   * 💬 4개 감정 큐레이션 문장 생성 (키워드 3개 이상 묶기)
   */
  async createEmotionalSentences(selectedKeywords, emotionAnalysis, userInput) {
    console.log(`💬 [1단계] 감정 문장 생성...`);
    
    const keywordNames = selectedKeywords.keywordNames;
    
    const systemPrompt = `선택된 키워드를 사용하여 감정에 공감하는 감성적이고 간결한 큐레이션 문장 4개를 만들어주세요.

**⚠️ 절대 중요: 오직 제공된 키워드만 사용하세요!**

Create empathetic, emotionally resonant, and concise curation sentences using ONLY the provided keywords.

Each sentence must follow these rules:
- **반드시 제공된 키워드만 사용** (새로운 키워드 생성 금지)
- Naturally incorporate 3-4 keywords per sentence from the provided list
- Match the sentence's tone precisely to the provided emotion type
- Keep sentences SHORT and CONCISE (15-20자 내외)
- Express genuine emotional empathy for the user's state
- Create refined, complete sentences rather than keyword lists
- Use warm, understanding expressions that resonate emotionally
- Write answers in Korean

## Input Guidelines
- The system will provide: emotion analysis, keywords (10-15 items), and user input context
- Keywords should be distributed as evenly as possible across 4 sentences
- **주어진 키워드 목록에서만 선택하세요**
- Focus on emotional connection while delivering keywords naturally
- Create sentences that feel personally meaningful to users

## Steps
1. 사용자의 감정 상태와 제공된 키워드 목록을 확인하세요
2. **반드시 제공된 키워드 목록에서만** 각 문장에 사용할 3-4개의 키워드를 균등하게 배분하여 선택하세요
3. 감정에 깊이 공감하는 감성적 문장을 만드세요 (15-20자)
4. 키워드를 자연스럽게 녹여내며 완성된 문장을 만드세요
5. 총 4개의 감성적이고 정제된 문장을 완성하세요

## Output Format
Responses must follow this exact JSON schema:

\`\`\`json
{
  "sentences": [
    {
      "sentence": "[감성적이고 공감적인 한국어 문장 - 15-20자]",
      "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
    },
    {
      "sentence": "[감성적이고 공감적인 한국어 문장 - 15-20자]",
      "keywords": ["키워드1", "키워드2", "키워드3"]
    },
    {
      "sentence": "[감성적이고 공감적인 한국어 문장 - 15-20자]",
      "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
    },
    {
      "sentence": "[감성적이고 공감적인 한국어 문장 - 15-20자]",
      "keywords": ["키워드1", "키워드2", "키워드3"]
    }
  ]
}
\`\`\`

## Examples

**피곤함 감정 예시:**
{
  "sentences": [
    {
      "sentence": "지친 밤, 힐링 사운드와 함께",
      "keywords": ["힐링음악", "백색소음", "수면음악"]
    },
    {
      "sentence": "피곤한 마음을 달래는 자연의 소리",
      "keywords": ["파도소리", "빗소리", "새소리", "ASMR"]
    },
    {
      "sentence": "편안한 명상으로 마음 정리하기",
      "keywords": ["명상음악", "마음챙김", "요가"]
    },
    {
      "sentence": "온전한 휴식을 위한 카페 분위기",
      "keywords": ["카페음악", "로파이", "집중음악"]
    }
  ]
}

**기쁨 감정 예시:**
{
  "sentences": [
    {
      "sentence": "기쁜 마음으로 춤추는 하루",
      "keywords": ["댄스챌린지", "방송댄스", "K-pop", "플레이리스트"]
    },
    {
      "sentence": "행복한 순간을 담은 일상 기록",
      "keywords": ["브이로그", "카페투어", "여행"]
    },
    {
      "sentence": "신나는 음악과 함께하는 시간",
      "keywords": ["콘서트", "라이브", "음악"]
    },
    {
      "sentence": "즐거움이 가득한 특별한 순간",
      "keywords": ["축하", "기쁨", "웃음"]
    }
  ]
}

**스트레스 감정 예시:**
{
  "sentences": [
    {
      "sentence": "마음의 짐을 내려놓는 시간",
      "keywords": ["마음챙김", "명상음악", "힐링"]
    },
    {
      "sentence": "스트레스 해소를 위한 자연 치유",
      "keywords": ["파도소리", "백색소음", "ASMR"]
    },
    {
      "sentence": "몸과 마음을 이완하는 운동",
      "keywords": ["요가", "스트레칭", "명상"]
    },
    {
      "sentence": "평온함을 되찾는 조용한 공간",
      "keywords": ["카페음악", "집중음악", "로파이"]
    }
  ]
}

## Guidelines
- 각 문장은 15-20자 내외로 작성하세요
- 사용자의 감정 상태에 진심으로 공감하는 표현을 사용하세요
- **반드시 제공된 키워드만 사용하세요**
- 키워드를 자연스럽게 녹여낸 완성된 문장을 만드세요
- 감정적 따뜻함과 이해를 담아 표현하세요
- 정제되고 세련된 문장으로 완성하세요`;

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

⚠️ 반드시 이 키워드들만 사용하세요:
${keywordNames.join(', ')}

총 ${keywordNames.length}개 키워드에서 각 문장마다 3-4개씩 선택하여 4개 문장을 만드세요.`
            }
          ]
        });

        const content = response.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          
          // ✅ 문장의 키워드 유효성 검증 강화
          const validatedSentences = result.sentences?.map(sentence => {
            const validKeywords = sentence.keywords?.filter(keyword => 
              keywordNames.includes(keyword)
            ) || [];
            
            return {
              ...sentence,
              keywords: validKeywords
            };
          }).filter(sentence => sentence.keywords.length >= 2) || []; // 최소 2개 키워드 필요
          
          console.log(`   ✅ 감정 문장 생성 완료: ${validatedSentences.length}개 (키워드 유효성 검증됨)`);
          return validatedSentences;
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
   * 🎪 1단계 메인 통합 함수
   */
  async getCachedRecommendation(userInput, inputType = 'emotion') {
    console.log(`🎪 [1단계] 캐시 기반 추천 시작: "${userInput}" (타입: ${inputType})`);
    const startTime = Date.now();
    
    try {
      // 1. 키워드 로드
      const keywordList = await this.loadUsedKeywords();
      
      // 2. 감정 분석
      const emotionAnalysis = await this.analyzeUserEmotion(userInput);
      
      // 3. 키워드 선택 (10-15개)
      const selectedKeywords = await this.selectEmotionBasedKeywords(
        userInput, 
        emotionAnalysis, 
        keywordList
      );
      
      // 4. 감정 문장 생성 (키워드 3개 이상 조합)
      const emotionalSentences = await this.createEmotionalSentences(
        selectedKeywords,
        emotionAnalysis,
        userInput
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`🎉 [1단계] 완료! 처리시간: ${processingTime}ms`);
      
      // 호환성을 위해 기존 형식도 유지
      const primaryEmotion = emotionAnalysis.emotion?.[0] || '감정분석실패';
      const primaryIntensity = emotionAnalysis.intensity?.[primaryEmotion] || '보통';
      
      return {
        success: true,
        stage: 1,
        processingTime,
        
        // 감정 분석 결과 (호환성)
        emotion: primaryEmotion,
        emotionIntensity: primaryIntensity,
        emotionContext: emotionAnalysis.context,
        emotionalNeed: emotionAnalysis.emotional_need,
        
        // 새로운 다중 감정 정보 추가
        emotionAnalysis: emotionAnalysis,
        
        // 선택된 키워드 (10-15개)
        finalKeywords: selectedKeywords.keywordNames,
        keywordCount: selectedKeywords.keywordNames.length,
        selectionReasoning: selectedKeywords.reasoning,
        
        // 감정 큐레이션 문장 (4개, 키워드 3개 이상 조합)
        emotionalSentences: emotionalSentences,
        
        // 메타데이터
        totalAvailableKeywords: keywordList.length,
        userInput: userInput,
        inputType: inputType,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ [1단계] 실패: ${error.message}`);
      
      return {
        success: false,
        stage: 1,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * ⏰ 딜레이 함수
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default CachedKeywordSelector; 