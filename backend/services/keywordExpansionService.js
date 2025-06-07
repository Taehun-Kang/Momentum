const axios = require('axios');

/**
 * 키워드 확장 및 관련 검색어 추출 서비스
 * - Bright Data MCP 연동
 * - SerpAPI 백업
 * - 관련 키워드 추출 (예: 롤드컵 → 페이커, T1, LCK 등)
 */
class KeywordExpansionService {
  constructor() {
    this.serpApiKey = process.env.SERPAPI_KEY || '';
    this.brightDataApiKey = process.env.BRIGHT_DATA_API_KEY || '';
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24시간 캐시
    
    console.log('🔍 키워드 확장 서비스 초기화 완료');
  }

  /**
   * 메인 키워드 확장 함수
   * @param {string} keyword - 원본 키워드 (예: "롤드컵")
   * @param {Object} options - 옵션
   * @returns {Object} 확장된 키워드들
   */
  async expandKeyword(keyword, options = {}) {
    const cacheKey = `expand_${keyword.toLowerCase()}`;
    
    // 캐시 확인
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`🎯 키워드 확장 캐시 적중: ${keyword}`);
        return cached.data;
      }
    }

    try {
      console.log(`🔍 키워드 확장 시작: "${keyword}"`);
      
      // 1. SerpAPI로 관련 검색어 수집
      const relatedKeywords = await this.getRelatedKeywords(keyword);
      
      // 2. 컨텍스트 분석으로 카테고리 특화 키워드 추출
      const contextKeywords = await this.getContextualKeywords(keyword);
      
      // 3. 유튜브 특화 키워드 생성
      const youtubeKeywords = await this.generateYouTubeKeywords(keyword);
      
      // 4. 모든 키워드 통합 및 중복 제거
      const allKeywords = [
        ...relatedKeywords,
        ...contextKeywords, 
        ...youtubeKeywords
      ];
      
      const uniqueKeywords = this.deduplicateKeywords(allKeywords);
      
      // 5. 키워드 품질 평가 및 정렬
      const rankedKeywords = await this.rankKeywords(keyword, uniqueKeywords);
      
      const result = {
        original: keyword,
        expanded: rankedKeywords.slice(0, 15), // 상위 15개
        categories: this.categorizeKeywords(rankedKeywords),
        suggestions: {
          channels: this.extractChannelSuggestions(rankedKeywords),
          hashtags: this.extractHashtagSuggestions(rankedKeywords),
          timeFilters: this.suggestTimeFilters(keyword)
        },
        expansionStrategy: this.determineExpansionStrategy(keyword),
        timestamp: new Date().toISOString()
      };

      // 캐시 저장
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      console.log(`✅ 키워드 확장 완료: ${keyword} → ${rankedKeywords.length}개`);
      return result;

    } catch (error) {
      console.error(`❌ 키워드 확장 실패: ${keyword}`, error);
      
      // 폴백: 기본 키워드 변형
      return this.getFallbackExpansion(keyword);
    }
  }

  /**
   * SerpAPI로 관련 검색어 수집
   */
  async getRelatedKeywords(keyword) {
    try {
      console.log(`📊 SerpAPI 관련 검색어 수집: ${keyword}`);
      
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google',
          q: keyword + ' 유튜브',
          api_key: this.serpApiKey,
          gl: 'kr',
          hl: 'ko',
          num: 10
        },
        timeout: 10000
      });

      const relatedSearches = response.data.related_searches || [];
      const peopleAlsoAsk = response.data.people_also_ask || [];
      
      const keywords = [
        ...relatedSearches.map(item => item.query),
        ...peopleAlsoAsk.map(item => item.question)
      ]
      .filter(q => q && q.length > 0)
      .map(q => q.replace(/[^\w\s가-힣]/g, '').trim())
      .filter(q => q.length > 1);

      console.log(`✅ SerpAPI에서 ${keywords.length}개 키워드 수집`);
      return keywords;

    } catch (error) {
      console.error('SerpAPI 오류:', error.message);
      return [];
    }
  }

  /**
   * 컨텍스트 분석으로 카테고리 특화 키워드 추출
   */
  async getContextualKeywords(keyword) {
    const contextMaps = {
      // 게임 관련
      게임: ['하이라이트', '플레이', '공략', '리뷰', '프로게이머'],
      롤: ['페이커', 'T1', '젠지', 'DRX', 'KT', 'NS', 'LSB', 'DK'],
      롤드컵: ['페이커', 'T1', '결승', '하이라이트', '경기', 'LCK'],
      
      // 음식 관련
      먹방: ['맛집', '리뷰', '요리', '레시피', 'ASMR'],
      요리: ['레시피', '만들기', '간단', '집에서'],
      
      // 운동 관련
      운동: ['홈트', '다이어트', '헬스', '요가', '필라테스'],
      다이어트: ['식단', '운동', '홈트', '전후', '성공'],
      
      // 음악 관련
      kpop: ['뮤직비디오', '댄스', '커버', '무대', '안무'],
      댄스: ['안무', '커버', '틱톡', '챌린지'],
      
      // 일반 생활
      브이로그: ['일상', '하루', '루틴', '카페', '데이트'],
      여행: ['맛집', '가볼만한곳', '코스', '추천']
    };

    const relatedKeywords = [];
    
    // 키워드 매칭
    for (const [category, keywords] of Object.entries(contextMaps)) {
      if (keyword.includes(category) || category.includes(keyword)) {
        relatedKeywords.push(...keywords);
      }
    }

    // 시간/계절 기반 키워드 추가
    const timeBasedKeywords = this.getTimeBasedKeywords(keyword);
    relatedKeywords.push(...timeBasedKeywords);

    console.log(`🎯 컨텍스트 키워드 ${relatedKeywords.length}개 생성`);
    return [...new Set(relatedKeywords)]; // 중복 제거
  }

  /**
   * 유튜브 특화 키워드 생성
   */
  async generateYouTubeKeywords(keyword) {
    const youtubeFormats = [
      `${keyword} 리뷰`,
      `${keyword} 하이라이트`, 
      `${keyword} vlog`,
      `${keyword} 브이로그`,
      `${keyword} 챌린지`,
      `${keyword} 꿀팁`,
      `${keyword} 추천`,
      `${keyword} 장단점`,
      `${keyword} vs`,
      `${keyword} 신제품`,
      `${keyword} 언박싱`,
      `${keyword} 리액션`
    ];

    // 키워드 길이에 따라 적절한 조합 생성
    if (keyword.length <= 3) {
      return youtubeFormats.slice(0, 8); // 짧은 키워드는 더 많은 조합
    } else {
      return youtubeFormats.slice(0, 5); // 긴 키워드는 적게
    }
  }

  /**
   * 시간/계절 기반 키워드 생성
   */
  getTimeBasedKeywords(keyword) {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1;
    
    const timeKeywords = [];
    
    // 시간대별 키워드
    if (hour >= 6 && hour < 12) {
      timeKeywords.push(`${keyword} 모닝`, `아침 ${keyword}`);
    } else if (hour >= 12 && hour < 18) {
      timeKeywords.push(`점심 ${keyword}`, `오후 ${keyword}`);
    } else if (hour >= 18 && hour < 22) {
      timeKeywords.push(`저녁 ${keyword}`, `퇴근 후 ${keyword}`);
    } else {
      timeKeywords.push(`밤 ${keyword}`, `새벽 ${keyword}`);
    }
    
    // 계절별 키워드
    if ([12, 1, 2].includes(month)) {
      timeKeywords.push(`겨울 ${keyword}`, `따뜻한 ${keyword}`);
    } else if ([3, 4, 5].includes(month)) {
      timeKeywords.push(`봄 ${keyword}`, `새로운 ${keyword}`);
    } else if ([6, 7, 8].includes(month)) {
      timeKeywords.push(`여름 ${keyword}`, `시원한 ${keyword}`);
    } else {
      timeKeywords.push(`가을 ${keyword}`, `감성 ${keyword}`);
    }
    
    return timeKeywords;
  }

  /**
   * 키워드 중복 제거 및 정규화
   */
  deduplicateKeywords(keywords) {
    const normalized = keywords
      .map(k => k.toLowerCase().trim())
      .filter(k => k.length > 1)
      .filter(k => !/^\d+$/.test(k)); // 숫자만 있는 키워드 제외
    
    return [...new Set(normalized)];
  }

  /**
   * 키워드 품질 평가 및 랭킹
   */
  async rankKeywords(originalKeyword, keywords) {
    return keywords
      .map(keyword => ({
        keyword,
        score: this.calculateKeywordScore(originalKeyword, keyword),
        relevance: this.calculateRelevance(originalKeyword, keyword),
        popularity: this.estimatePopularity(keyword)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.keyword);
  }

  /**
   * 키워드 점수 계산
   */
  calculateKeywordScore(original, keyword) {
    let score = 0;
    
    // 길이 점수 (너무 길거나 짧으면 감점)
    if (keyword.length >= 2 && keyword.length <= 20) score += 10;
    
    // 한국어 포함 점수
    if (/[가-힣]/.test(keyword)) score += 15;
    
    // 원본과의 연관성
    if (keyword.includes(original) || original.includes(keyword)) score += 20;
    
    // 유튜브 특화 용어 보너스
    const youtubeTerms = ['리뷰', '하이라이트', '브이로그', '챌린지', '꿀팁'];
    if (youtubeTerms.some(term => keyword.includes(term))) score += 10;
    
    return score;
  }

  /**
   * 연관성 계산
   */
  calculateRelevance(original, keyword) {
    // 간단한 문자열 유사도 계산
    const intersection = [...original].filter(char => keyword.includes(char));
    return intersection.length / Math.max(original.length, keyword.length);
  }

  /**
   * 인기도 추정
   */
  estimatePopularity(keyword) {
    // 실제로는 검색량 데이터를 사용하지만, 여기서는 휴리스틱 사용
    const popularTerms = ['먹방', '브이로그', '챌린지', '꿀팁', '리뷰'];
    return popularTerms.some(term => keyword.includes(term)) ? 0.8 : 0.5;
  }

  /**
   * 키워드 카테고리 분류
   */
  categorizeKeywords(keywords) {
    const categories = {
      gaming: [],
      food: [],
      lifestyle: [],
      music: [],
      sports: [],
      education: [],
      entertainment: []
    };

    keywords.forEach(keyword => {
      if (/게임|롤|배그|피파/.test(keyword)) categories.gaming.push(keyword);
      else if (/먹방|요리|맛집|음식/.test(keyword)) categories.food.push(keyword);
      else if (/브이로그|일상|루틴/.test(keyword)) categories.lifestyle.push(keyword);
      else if (/음악|댄스|노래/.test(keyword)) categories.music.push(keyword);
      else if (/축구|야구|농구|운동/.test(keyword)) categories.sports.push(keyword);
      else if (/공부|교육|강의/.test(keyword)) categories.education.push(keyword);
      else categories.entertainment.push(keyword);
    });

    return categories;
  }

  /**
   * 채널 추천 추출
   */
  extractChannelSuggestions(keywords) {
    const channelMap = {
      '롤': ['T1', '페이커', 'GenG', 'DRX'],
      '먹방': ['쯔양', '야식이', '밴쯔'],
      '운동': ['빅씨스', '힙으뜨', '땅끄부부'],
      '요리': ['백종원', '쿠킹트리', '소프']
    };

    const suggestions = [];
    keywords.forEach(keyword => {
      Object.entries(channelMap).forEach(([key, channels]) => {
        if (keyword.includes(key)) {
          suggestions.push(...channels);
        }
      });
    });

    return [...new Set(suggestions)];
  }

  /**
   * 해시태그 추천 추출 
   */
  extractHashtagSuggestions(keywords) {
    return keywords
      .slice(0, 10)
      .map(keyword => `#${keyword.replace(/\s+/g, '')}`)
      .filter(tag => tag.length <= 15);
  }

  /**
   * 시간 필터 추천
   */
  suggestTimeFilters(keyword) {
    const timeFilters = [];
    
    if (/뉴스|시사|정치/.test(keyword)) {
      timeFilters.push('today', 'week');
    } else if (/트렌드|인기|최신/.test(keyword)) {
      timeFilters.push('week', 'month');
    } else {
      timeFilters.push('month', 'year');
    }
    
    return timeFilters;
  }

  /**
   * 확장 전략 결정
   */
  determineExpansionStrategy(keyword) {
    if (keyword.length <= 3) {
      return 'broad_expansion'; // 넓은 확장
    } else if (/브랜드|제품명/.test(keyword)) {
      return 'product_focused'; // 제품 중심
    } else {
      return 'semantic_expansion'; // 의미적 확장
    }
  }

  /**
   * 폴백 확장 (API 실패 시)
   */
  getFallbackExpansion(keyword) {
    const basicExpansions = [
      `${keyword} 리뷰`,
      `${keyword} 추천`,
      `${keyword} 꿀팁`,
      `${keyword} 하이라이트`,
      `${keyword} 브이로그`
    ];

    return {
      original: keyword,
      expanded: basicExpansions,
      categories: { entertainment: basicExpansions },
      suggestions: {
        channels: [],
        hashtags: basicExpansions.map(k => `#${k.replace(/\s+/g, '')}`),
        timeFilters: ['month']
      },
      expansionStrategy: 'fallback',
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }

  /**
   * 서비스 상태 조회
   */
  getStatus() {
    return {
      service: 'Keyword Expansion Service',
      cacheSize: this.cache.size,
      apis: {
        serpApi: !!this.serpApiKey,
        brightData: !!this.brightDataApiKey
      },
      features: [
        'related_keyword_extraction',
        'contextual_expansion', 
        'youtube_optimization',
        'time_based_keywords',
        'channel_suggestions'
      ],
      lastUpdate: new Date().toISOString()
    };
  }
}

module.exports = new KeywordExpansionService(); 