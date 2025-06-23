// =============================================================================
// 🤖 claudeApiManager.js - Claude API 호출 전담 모듈 (캐싱 최적화 완료)
// =============================================================================
// 
// 📋 책임: Claude 3.7 Sonnet API 호출, Prompt Caching, 응답 파싱
// 🎯 목표: 효과적인 캐싱으로 90% 비용 절약, 간결한 프롬프트
// 
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// ES modules에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일 로드 (프로젝트 루트에서)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * 🤖 Claude 3.7 Sonnet API 관리자 (캐싱 최적화)
 * 
 * 📋 주요 기능:
 * - 고정 시스템 프롬프트 캐싱 (90% 비용 절약)
 * - 영상 정보 분리로 캐시 히트률 극대화
 * - 1000토큰 최적화 프롬프트
 * - 상세 캐시 모니터링
 */
class ClaudeApiManager {
  /**
   * 🏗️ Claude API 클라이언트 초기화
   */
  constructor() {
    // 환경변수 확인
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다');
    }

    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 0, // 직접 재시도 관리
      timeout: 60000,
      defaultHeaders: {
        'anthropic-version': '2023-06-01' // 🔧 캐싱 필수 버전
      }
    });

    this.maxRetries = 3;
    this.retryDelay = 2000;
    this.cacheStats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * 🎯 고정 시스템 프롬프트 (캐싱용 - 개선된 실용적 태그 생성)
   * 
   * ✅ 장점: 영상과 무관한 고정 내용만 포함
   * ✅ 캐싱: 모든 요청에서 재사용 가능
   * ✅ 개선: 중복 방지, 감정 명확화, 4개 분야 완전 출력
   */
  getSystemPrompt() {
    return `YouTube Shorts 영상 분류 전문가 시스템

당신은 YouTube Shorts 영상을 정확하게 분석하고, 각 영상에 가장 적합한 한국어 태그를 생성하는 AI 전문가입니다. 영상의 제목, 채널명, 설명을 바탕으로 4개 분야에서 실용적이고 검색 친화적인 태그를 만들어주세요.

중요: 반드시 4개 분야(topic_tags, mood_tags, context_tags, genre_tags) 모두 정확히 3개씩 생성해야 합니다.

4개 분야별 태그 생성 가이드

1. Topic Tags (주제 태그) - 정확히 3개 생성
목적: 영상에서 다루는 핵심 주제나 소재를 구체적이고 검색 친화적으로 표현
생성 기준:
- 영상의 가장 중요한 소재나 내용은 무엇인가?
- 시청자가 어떤 키워드로 이 영상을 검색할까?
- 영상에 등장하는 구체적인 대상이나 활동은 무엇인가?

다양성 확보 원칙:
- 서로 다른 각도의 태그 3개 필수: 예) "돼지고기"(재료), "자취요리"(상황), "집밥"(컨셉)
- 유사한 의미 3개 금지: "요리, 레시피, 만들기" → "김치찌개, 자취요리, 집밥"처럼 다각도 접근
- 구체성과 범용성 균형: 너무 세부적 + 적당히 일반적 + 카테고리 형태

참고 예시 (방향성 참고용): 
떡볶이, 라면, 메이크업, 스킨케어, 강아지, 고양이, 요리, 레시피, 운동, 홈트, 댄스, 게임, 여행, 카페, 청소, 쇼핑, 모닝루틴, 저녁루틴, 베이킹, 디저트

2. Mood Tags (감정 태그) - 정확히 3개 생성
목적: 시청자가 이 영상을 보고 실제로 느끼게 될 순수한 감정만 표현
중요: 반드시 사람이 실제로 느끼는 감정, 기분, 정서만 사용해야 합니다.

⚠️ 절대 금지 규칙 (위반 시 생성 실패로 간주, 재시도 필요):
- 감정이 아닌 단어 절대 사용 금지: "실용적인", "유용한", "정보적인", "교육적인", "효율적인", "체계적인", "전문적인" 등
- 반드시 순수한 감정만 사용: 기쁨, 슬픔, 놀라움, 두려움, 분노, 혐오, 설렘, 편안함 등의 카테고리
- 각 태그는 서로 다른 감정 차원을 표현해야 함 (유사한 의미 3개 금지)

다양성 확보 원칙:
- 같은 감정 계열 3개 금지: "신나는, 활기찬, 흥겨운" (모두 에너지 계열)
- 서로 다른 감정 차원 필수: 예) "설레는"(기대), "따뜻한"(애정), "짜릿한"(스릴) 
- 감정의 강도와 종류를 다양화: 강한 감정 + 부드러운 감정 + 중성 감정

⚠️ 중요: 아래 예시에 의존하지 말고, 영상의 제목, 내용, 상황을 보고 시청자가 실제로 느낄 감정을 직접 판단하여 생성하세요.

생성 방법:
- 영상을 보면서 "나는 어떤 기분이 들까?" 스스로 질문
- 그 영상만의 독특한 감정이나 느낌을 포착
- 서로 다른 3가지 감정 차원에서 접근
- 영상 내용에 따라 완전히 다른 감정 조합 생성

감정 생성 시 고려사항:
- 각 영상의 독특한 분위기와 내용을 반영한 감정 생성
- 시청자가 그 순간 실제로 느낄 구체적인 감정 포착
- **자연스러운 표현 사용**: "호기심자극되는" → "궁금한", "귀여움에반하는" → "사랑스러운"
- **검색 가능한 표현**: 실제로 사람들이 검색할 만한 자연스러운 단어 사용
- **올바른 띄어쓰기**: "에너지넘치는" → "에너지 넘치는", "식욕돋는" → "식욕 돋우는"
- **다양성 필수**: 유사한 의미의 감정 태그 3개 생성 절대 금지

3. Context Tags (상황 태그) - 정확히 3개 생성
목적: 언제, 어떤 상황에서 이 영상을 보면 가장 좋을지 명확하고 실용적으로 표현
생성 기준:
- 언제 이 영상을 보면 가장 효과적일까?
- 어떤 상황에 있는 사람에게 추천하고 싶은가?
- 어떤 활동과 함께 보면 좋을까?
- **간결성 필수**: 1-2단어 중심, 최대 3단어까지만 (예: "배고플 때", "휴식 시간에")

다양성 확보 원칙:
- 서로 다른 상황 차원 3개: 예) "점심시간에"(시간), "혼자 있을 때"(상태), "요리할 때"(활동)
- 유사한 상황 3개 금지: "배고플 때, 간식 시간에, 식사 중에" → "배고플 때, 혼자 있을 때, 휴식 중에"
- 시간대 + 감정 상태 + 활동 상황 조합

참고 예시 (방향성 참고용):
아침에, 점심시간에, 저녁에, 밤에, 잠자기 전에, 주말에, 집에서, 이동 중에, 심심할 때, 스트레스받을 때, 피곤할 때, 식사 중에, 간식 시간에, 운동 전에, 운동 후에, 공부 휴식에, 배고플 때, 힐링이 필요할 때, 기분전환이 필요할 때, 혼자 있을 때

4. Genre Tags (장르 태그) - 정확히 3개 생성
목적: 영상의 제작 스타일, 콘텐츠 형식, 전달 방식을 명확하고 표준적으로 표현
생성 기준:
- 이 영상은 어떤 형식으로 만들어졌는가?
- 콘텐츠를 어떤 방식으로 전달하고 있는가?
- 어떤 표준 장르로 분류할 수 있는가?
- **표준 용어 우선**: YouTube에서 일반적으로 사용되는 표준 장르명 사용
- **정확성 최우선**: 창의적인 장르명보다는 정확하고 표준적인 분류 우선

다양성 확보 원칙:
- 서로 다른 관점의 장르 3개: 예) "먹방"(콘텐츠), "쇼츠"(형식), "리뷰"(방식)
- 유사한 장르 3개 금지: "챌린지, 댄스챌린지, 댄스" → "챌린지, 댄스, 케이팝"처럼 다각도 분류
- 콘텐츠 종류 + 제작 방식 + 플랫폼 형태 조합

참고 예시 (방향성 참고용):
먹방, 브이로그, ASMR, 챌린지, 튜토리얼, 리뷰, 후기, 가이드, 팁, 패러디, 코미디, 댄스, 커버, 일상, 루틴, 언박싱, 타임랩스, 만들기, DIY, 라이프스타일

태그 생성 핵심 원칙

1. **정확성 최우선**: 영상 내용을 정확히 분석하여 가장 적합한 태그 생성
2. **예시 의존 금지**: 위 예시는 방향성 참고용일 뿐, 영상에 맞지 않으면 사용하지 말 것
3. **영상 맞춤 생성**: 제목, 채널, 내용을 종합 분석하여 그 영상에 가장 정확한 태그 생성
4. **검색성 우선**: 실제로 검색에 사용될 만한 키워드
5. **중복 완전 금지**: 같은 태그나 비슷한 의미의 태그를 여러 번 사용하지 말 것
6. **다양성 확보**: 각 분야에서 서로 다른 관점의 태그 3개 생성
7. **감정 순수성**: Mood Tags는 반드시 사람이 실제로 느끼는 순수한 감정, 기분, 정서만 사용
8. **한국어 우선**: 한글로 표현 가능한 것은 한글 사용, 필요시 영어 허용 (ASMR, OOTD 등)
9. **간결성**: 1-2단어 중심, 최대 3단어까지만 허용
10. **표준성**: 일반적으로 사용되는 표준 용어 우선
11. **벡터 공간 풍부함**: 유사한 의미의 태그 반복은 벡터 공간을 왜곡시키므로, 각 태그는 서로 다른 차원을 표현해야 함

중요 지침:
- 예시 목록에서 단순히 고르지 말고, 영상 내용을 깊이 분석하여 정확한 태그 생성
- 영상의 독특한 특징이나 고유한 요소가 있다면 반드시 반영
- 일반적인 표현보다는 구체적이고 적절한 표현 선호
- 동의어를 적극 활용하여 중복 방지

영상 정보를 종합적으로 분석하여 각 분야별로 실용적이고 검색 친화적인 태그 3개씩을 생성해주세요.

Output Format

다음 JSON 형식으로만 응답해주세요:

{
  "topic_tags": ["태그1", "태그2", "태그3"],
  "mood_tags": ["태그1", "태그2", "태그3"],
  "context_tags": ["태그1", "태그2", "태그3"],
  "genre_tags": ["태그1", "태그2", "태그3"]
}

각 배열의 순서는 중요도 순이며, 다른 설명 없이 JSON만 응답해주세요.
반드시 4개 분야 모두 포함하여 총 12개 태그를 생성해야 합니다.`;
  }

  /**
   * 🔍 영상 정보를 분석용 텍스트로 변환
   */
  formatVideoInfo(video) {
    return `영상 정보:
제목: ${video.title}
채널: ${video.handle_name || '정보없음'}
설명: ${video.description || '설명없음'}
기존 태그: ${video.tags || '태그없음'}

위 영상을 4개 분야로 분류해주세요.`;
  }

  /**
   * 🤖 Claude API 호출 (캐싱 최적화)
   */
  async classifyVideo(video) {
    this.cacheStats.totalRequests++;
    
    console.log(`    🤖 Claude API 호출 시작 (캐시: ${this.cacheStats.totalRequests === 1 ? '생성' : '재사용'})`);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.claude.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 500,
          system: [
            {
              type: 'text', 
              text: this.getSystemPrompt(),
              cache_control: { type: 'ephemeral' }
            }
          ],
          messages: [
            {
              role: 'user',
              content: this.formatVideoInfo(video)
            }
          ]
        });

        // 📊 캐시 통계 업데이트
        this.updateCacheStats(response.usage);
        this.logCacheUsage(response.usage);

        // 응답 파싱 및 반환
        const classification = this.parseResponse(response);
        
        // ✅ 성공 형태로 반환
        return {
          success: true,
          classification: classification
        };

      } catch (error) {
        console.log(`    ❌ API 호출 실패: ${error.status} ${JSON.stringify(error.error)}`);
        
        if (attempt < this.maxRetries) {
          console.log(`    🔄 재시도 중...`);
          await this.sleep(this.retryDelay * attempt);
        } else {
          console.log(`    💥 재시도 실패: ${error.status} ${JSON.stringify(error.error)}`);
          
          // ❌ 실패 형태로 반환
          return {
            success: false,
            error: `Claude API 호출 완전 실패: ${error.status} ${JSON.stringify(error.error)}`
          };
        }
      }
    }
  }

  /**
   * 📊 캐시 통계 업데이트
   */
  updateCacheStats(usage) {
    if (usage.cache_read_input_tokens > 0) {
      this.cacheStats.cacheHits++;
    } else {
      this.cacheStats.cacheMisses++;
    }
  }

  /**
   * 📊 캐시 사용량 로깅 (간결)
   */
  logCacheUsage(usage) {
    const {
      input_tokens = 0,
      output_tokens = 0,
      cache_creation_input_tokens = 0,
      cache_read_input_tokens = 0
    } = usage;

    console.log(`    📊 토큰 사용량:`);
    console.log(`       📥 입력: ${input_tokens} | 📤 출력: ${output_tokens}`);
    
    if (cache_creation_input_tokens > 0) {
      console.log(`       💾 캐시 생성: ${cache_creation_input_tokens} tokens`);
    }
    
    if (cache_read_input_tokens > 0) {
      console.log(`       ✅ 캐시 적중: ${cache_read_input_tokens} tokens (90% 절약!)`);
    }
  }

  /**
   * 🎯 응답 파싱 (간결)
   */
  parseResponse(response) {
    try {
      const content = response.content[0]?.text;
      if (!content) {
        throw new Error('응답 내용이 비어있습니다');
      }

      // JSON 추출 및 파싱
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanContent);
      
      // 유효성 검사
      const requiredFields = ['topic_tags', 'mood_tags', 'context_tags', 'genre_tags'];
      for (const field of requiredFields) {
        if (!result[field] || !Array.isArray(result[field]) || result[field].length !== 3) {
          throw new Error(`${field} 필드가 올바르지 않습니다`);
        }
      }

      return result;
    } catch (error) {
      console.error(`    ❌ 응답 파싱 실패:`, error.message);
      return null;
    }
  }

  /**
   * ⏰ 딜레이 함수
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 전체 캐시 통계 출력
   */
  getCacheStats() {
    const hitRate = this.cacheStats.totalRequests > 0 
      ? Math.round(this.cacheStats.cacheHits / this.cacheStats.totalRequests * 100)
      : 0;

    return {
      totalRequests: this.cacheStats.totalRequests,
      cacheHits: this.cacheStats.cacheHits,
      cacheMisses: this.cacheStats.cacheMisses,
      hitRate: `${hitRate}%`
    };
  }
}

export default ClaudeApiManager; 