const Anthropic = require('@anthropic-ai/sdk');

/**
 * MCP 통합 서비스
 * AI 기반 키워드 추출 및 대화형 검색을 백엔드에서 제공
 */
class MCPService {
  constructor() {
    // Claude API 초기화 (API 키가 있을 때만)
    this.claude = process.env.CLAUDE_API_KEY 
      ? new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
      : null;
    
    // 빠른 패턴 매칭을 위한 키워드 맵
    this.keywordPatterns = {
      mood: {
        '피곤': ['힐링영상', 'ASMR', '휴식', '자연', '명상'],
        '스트레스': ['웃긴영상', '코미디', '귀여운동물', '힐링'],
        '지루': ['재미있는영상', '신기한영상', '놀라운', '대박'],
        '신나': ['댄스', '파티', '축제', '음악', 'EDM'],
        '외로': ['따뜻한영상', '감동영상', '위로', '공감']
      },
      activity: {
        '퇴근': ['퇴근길영상', '하루마무리', '휴식', '힐링'],
        '출근': ['모닝루틴', '동기부여', '활력', '에너지'],
        '점심': ['점심시간', '식사영상', '짧은영상', '브이로그'],
        '운동': ['홈트레이닝', '운동영상', '다이어트', '헬스'],
        '공부': ['스터디윗미', '집중력', '공부자극', '동기부여']
      },
      content: {
        '요리': ['레시피', '요리영상', '먹방', '쿠킹'],
        '게임': ['게임플레이', '게임리뷰', '하이라이트'],
        '뷰티': ['메이크업', '스킨케어', '뷰티팁', 'GRWM'],
        '여행': ['여행브이로그', '여행지추천', '관광', '풍경']
      }
    };
  }

  /**
   * 자연어에서 키워드 추출
   */
  async extractKeywords(message, options = {}) {
    try {
      // 1. 빠른 패턴 매칭 시도
      const quickKeywords = this.quickExtraction(message);
      
      if (quickKeywords.length > 0 && !options.forceAI) {
        return {
          keywords: quickKeywords,
          method: 'pattern_matching',
          confidence: 0.8,
          context: this.getTimeContext()
        };
      }

      // 2. Claude API 사용 (가능한 경우)
      if (this.claude && options.useAI !== false) {
        return await this.aiExtraction(message);
      }

      // 3. 폴백: 기본 키워드
      return {
        keywords: ['인기영상', '추천영상', '최신영상'],
        method: 'fallback',
        confidence: 0.3,
        context: this.getTimeContext()
      };

    } catch (error) {
      console.error('Keyword extraction error:', error);
      return {
        keywords: ['인기영상'],
        method: 'error_fallback',
        confidence: 0.1,
        error: error.message
      };
    }
  }

  /**
   * 빠른 패턴 매칭
   */
  quickExtraction(message) {
    const keywords = new Set();
    const lowerMessage = message.toLowerCase();

    // 모든 패턴 검사
    Object.values(this.keywordPatterns).forEach(category => {
      Object.entries(category).forEach(([pattern, relatedKeywords]) => {
        if (lowerMessage.includes(pattern)) {
          relatedKeywords.forEach(keyword => keywords.add(keyword));
        }
      });
    });

    // 직접적인 키워드도 추출
    const directKeywords = ['shorts', '쇼츠', '짧은', '1분', '영상'];
    directKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        keywords.add('shorts영상');
      }
    });

    return Array.from(keywords).slice(0, 5);
  }

  /**
   * AI 기반 키워드 추출
   */
  async aiExtraction(message) {
    const prompt = `
사용자 메시지: "${message}"

위 메시지를 분석하여 YouTube Shorts 검색에 적합한 한국어 키워드를 추출해주세요.

규칙:
1. 3-5개의 구체적인 키워드
2. YouTube에서 실제 검색 가능한 용어
3. 사용자의 감정과 의도 반영
4. 한국어 우선

JSON 형식으로만 응답:
{
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "emotion": "감정상태",
  "intent": "사용자의도"
}`;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      });

      const result = JSON.parse(response.content[0].text);
      
      return {
        keywords: result.keywords,
        method: 'ai_analysis',
        confidence: 0.95,
        emotion: result.emotion,
        intent: result.intent,
        context: this.getTimeContext()
      };
    } catch (error) {
      console.error('AI extraction error:', error);
      throw error;
    }
  }

  /**
   * 대화형 응답 생성
   */
  async generateResponse(keywords, videoCount, userMessage) {
    const responses = {
      found: [
        `${keywords.join(', ')}로 ${videoCount}개의 멋진 Shorts를 찾았어요! 🎬`,
        `요청하신 ${keywords[0]} 관련 영상 ${videoCount}개를 준비했어요 ✨`,
        `${videoCount}개의 ${keywords.join(', ')} 영상을 찾았습니다! 즐거운 시청되세요 🎉`
      ],
      notFound: [
        `${keywords.join(', ')}로 검색했지만 결과가 없어요. 다른 키워드로 시도해볼까요? 🤔`,
        `아직 ${keywords[0]} 관련 Shorts가 없네요. 인기 영상을 보여드릴까요? 💫`
      ]
    };

    const responseArray = videoCount > 0 ? responses.found : responses.notFound;
    const randomResponse = responseArray[Math.floor(Math.random() * responseArray.length)];

    return {
      message: randomResponse,
      suggestions: this.generateSuggestions(keywords),
      hasResults: videoCount > 0
    };
  }

  /**
   * 추천 키워드 생성
   */
  generateSuggestions(currentKeywords) {
    const suggestions = new Set();
    
    // 현재 키워드와 관련된 추천
    currentKeywords.forEach(keyword => {
      Object.values(this.keywordPatterns).forEach(category => {
        Object.values(category).forEach(keywords => {
          if (keywords.includes(keyword)) {
            keywords.forEach(k => suggestions.add(k));
          }
        });
      });
    });

    // 시간대별 추천 추가
    const timeContext = this.getTimeContext();
    if (timeContext.timeOfDay === 'morning') {
      suggestions.add('모닝루틴');
      suggestions.add('아침영상');
    } else if (timeContext.timeOfDay === 'night') {
      suggestions.add('ASMR');
      suggestions.add('수면영상');
    }

    // 현재 키워드 제외하고 최대 4개 반환
    return Array.from(suggestions)
      .filter(s => !currentKeywords.includes(s))
      .slice(0, 4);
  }

  /**
   * 시간 컨텍스트 분석
   */
  getTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    let timeOfDay;
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      timeOfDay,
      hour,
      isWeekend: day === 0 || day === 6,
      dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][day]
    };
  }

  /**
   * 트렌드 분석
   */
  async analyzeTrends(category = 'all') {
    // 실제로는 데이터베이스나 외부 API에서 가져와야 함
    // 여기서는 시뮬레이션
    const trendingKeywords = {
      all: ['챌린지', '먹방', 'ASMR', '브이로그', '댄스'],
      comedy: ['개그', '몰카', '리액션', '패러디'],
      music: ['커버', '라이브', 'MV', '플레이리스트'],
      gaming: ['게임플레이', '공략', '하이라이트'],
      food: ['레시피', '맛집', '요리', '디저트']
    };

    return {
      category,
      trending: trendingKeywords[category] || trendingKeywords.all,
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = new MCPService(); 