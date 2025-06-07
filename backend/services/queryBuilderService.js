const keywordExpansionService = require('./keywordExpansionService');

/**
 * 고급 쿼리 빌더 서비스
 * - 키워드에 따른 쿼리 세분화
 * - 채널, 날짜, 카테고리 기반 검색
 * - OR 연산자 활용한 복합 검색
 * - 페이지네이션 지원
 */
class QueryBuilderService {
  constructor() {
    this.channelDatabase = this.initializeChannelDatabase();
    this.categoryMapping = this.initializeCategoryMapping();
    
    console.log('🔧 고급 쿼리 빌더 서비스 초기화 완료');
  }

  /**
   * 메인 쿼리 빌드 함수
   * @param {string} keyword - 원본 키워드
   * @param {Object} options - 검색 옵션
   * @returns {Object} 최적화된 검색 쿼리들
   */
  async buildOptimizedQueries(keyword, options = {}) {
    try {
      console.log(`🔧 고급 쿼리 빌드 시작: "${keyword}"`);
      
      // 1. 키워드 확장
      const expansion = await keywordExpansionService.expandKeyword(keyword);
      
      // 2. 검색 전략 결정
      const strategy = this.determineSearchStrategy(keyword, expansion);
      
      // 3. 쿼리 생성
      const queries = await this.generateQueries(keyword, expansion, strategy, options);
      
      // 4. 쿼리 최적화
      const optimizedQueries = this.optimizeQueries(queries);
      
      const result = {
        original: keyword,
        strategy,
        queries: optimizedQueries,
        expansion: {
          keywords: expansion.expanded,
          channels: expansion.suggestions.channels,
          categories: Object.keys(expansion.categories).filter(k => 
            expansion.categories[k].length > 0
          )
        },
        estimatedResults: this.estimateResultCount(optimizedQueries),
        timestamp: new Date().toISOString()
      };

      console.log(`✅ 쿼리 빌드 완료: ${optimizedQueries.length}개 쿼리 생성`);
      return result;

    } catch (error) {
      console.error(`❌ 쿼리 빌드 실패: ${keyword}`, error);
      
      // 폴백: 기본 쿼리
      return this.getFallbackQuery(keyword, options);
    }
  }

  /**
   * 검색 전략 결정
   */
  determineSearchStrategy(keyword, expansion) {
    const strategies = [];
    
    // 채널 기반 전략
    if (expansion.suggestions.channels.length > 0) {
      strategies.push('channel_focused');
    }
    
    // 카테고리 기반 전략  
    const activeCategories = Object.keys(expansion.categories).filter(k => 
      expansion.categories[k].length > 0
    );
    if (activeCategories.length > 0) {
      strategies.push('category_focused');
    }
    
    // 키워드 확장 전략
    if (expansion.expanded.length > 5) {
      strategies.push('keyword_expansion');
    }
    
    // 시간 기반 전략
    if (this.isTimeRelevant(keyword)) {
      strategies.push('time_sensitive');
    }
    
    return strategies.length > 0 ? strategies : ['basic_search'];
  }

  /**
   * 쿼리 생성
   */
  async generateQueries(keyword, expansion, strategies, options) {
    const queries = [];
    
    for (const strategy of strategies) {
      switch (strategy) {
        case 'channel_focused':
          queries.push(...this.buildChannelQueries(keyword, expansion, options));
          break;
          
        case 'category_focused':
          queries.push(...this.buildCategoryQueries(keyword, expansion, options));
          break;
          
        case 'keyword_expansion':
          queries.push(...this.buildExpandedKeywordQueries(keyword, expansion, options));
          break;
          
        case 'time_sensitive':
          queries.push(...this.buildTimeBasedQueries(keyword, expansion, options));
          break;
          
        default:
          queries.push(this.buildBasicQuery(keyword, options));
      }
    }
    
    return queries;
  }

  /**
   * 채널 기반 쿼리 생성
   */
  buildChannelQueries(keyword, expansion, options) {
    const queries = [];
    const suggestedChannels = expansion.suggestions.channels;
    
    // 직접 채널 검색
    suggestedChannels.slice(0, 3).forEach(channel => {
      const channelId = this.getChannelId(channel);
      if (channelId) {
        queries.push({
          type: 'channel_search',
          query: keyword,
          channelId: channelId,
          params: {
            type: 'video',
            videoDuration: 'short',
            maxResults: options.maxResults || 15,
            order: 'relevance',
            regionCode: 'KR'
          },
          weight: 0.9, // 높은 우선순위
          description: `${channel} 채널에서 "${keyword}" 검색`
        });
      }
    });

    // 채널명 포함 키워드 검색
    suggestedChannels.slice(0, 2).forEach(channel => {
      queries.push({
        type: 'keyword_search',
        query: `${keyword} ${channel}`,
        params: {
          type: 'video',
          videoDuration: 'short',
          maxResults: options.maxResults || 10,
          order: 'relevance',
          regionCode: 'KR'
        },
        weight: 0.7,
        description: `"${keyword} ${channel}" 키워드 검색`
      });
    });

    return queries;
  }

  /**
   * 카테고리 기반 쿼리 생성
   */
  buildCategoryQueries(keyword, expansion, options) {
    const queries = [];
    const categories = expansion.categories;
    
    // 각 카테고리별 검색
    Object.entries(categories).forEach(([category, keywords]) => {
      if (keywords.length > 0) {
        const categoryId = this.categoryMapping[category];
        if (categoryId) {
          queries.push({
            type: 'category_search',
            query: keyword,
            params: {
              type: 'video',
              videoDuration: 'short',
              videoCategoryId: categoryId,
              maxResults: options.maxResults || 10,
              order: 'relevance',
              regionCode: 'KR'
            },
            weight: 0.8,
            description: `${category} 카테고리에서 "${keyword}" 검색`
          });
        }
      }
    });

    return queries;
  }

  /**
   * 확장 키워드 기반 쿼리 생성 (OR 연산자 활용)
   */
  buildExpandedKeywordQueries(keyword, expansion, options) {
    const queries = [];
    const expandedKeywords = expansion.expanded;
    
    // 키워드를 그룹화 (최대 5개씩)
    const keywordGroups = this.chunkArray(expandedKeywords, 5);
    
    keywordGroups.forEach((group, index) => {
      // OR 연산자로 연결
      const orQuery = group.join(' | ');
      
      queries.push({
        type: 'expanded_search',
        query: orQuery,
        originalKeyword: keyword,
        expandedKeywords: group,
        params: {
          type: 'video',
          videoDuration: 'short',
          maxResults: options.maxResults || 15,
          order: 'relevance',
          regionCode: 'KR'
        },
        weight: 0.8 - (index * 0.1), // 첫 번째 그룹이 높은 우선순위
        description: `확장 키워드 그룹 ${index + 1}: ${group.join(', ')}`
      });
    });

    return queries;
  }

  /**
   * 시간 기반 쿼리 생성
   */
  buildTimeBasedQueries(keyword, expansion, options) {
    const queries = [];
    const timeFilters = expansion.suggestions.timeFilters;
    
    timeFilters.forEach(timeFilter => {
      const publishedAfter = this.getPublishedAfterDate(timeFilter);
      
      queries.push({
        type: 'time_based_search',
        query: keyword,
        timeFilter,
        params: {
          type: 'video',
          videoDuration: 'short',
          publishedAfter: publishedAfter,
          maxResults: options.maxResults || 10,
          order: 'date', // 최신순
          regionCode: 'KR'
        },
        weight: 0.7,
        description: `${timeFilter} 기간의 "${keyword}" 검색`
      });
    });

    return queries;
  }

  /**
   * 기본 쿼리 생성
   */
  buildBasicQuery(keyword, options) {
    return {
      type: 'basic_search',
      query: keyword,
      params: {
        type: 'video',
        videoDuration: 'short',
        maxResults: options.maxResults || 20,
        order: 'relevance',
        regionCode: 'KR'
      },
      weight: 0.6,
      description: `기본 "${keyword}" 검색`
    };
  }

  /**
   * 쿼리 최적화 (중복 제거, 우선순위 정렬)
   */
  optimizeQueries(queries) {
    // 1. 중복 쿼리 제거
    const uniqueQueries = this.removeDuplicateQueries(queries);
    
    // 2. 우선순위별 정렬
    const sortedQueries = uniqueQueries.sort((a, b) => b.weight - a.weight);
    
    // 3. 상위 8개만 선택 (API 할당량 고려)
    const optimizedQueries = sortedQueries.slice(0, 8);
    
    // 4. 예상 API 사용량 계산
    optimizedQueries.forEach(query => {
      query.estimatedUnits = this.calculateApiUnits(query);
    });

    return optimizedQueries;
  }

  /**
   * 중복 쿼리 제거
   */
  removeDuplicateQueries(queries) {
    const seen = new Set();
    return queries.filter(query => {
      const key = `${query.type}_${query.query}_${JSON.stringify(query.params)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * API 사용량 계산
   */
  calculateApiUnits(query) {
    const baseUnits = 100; // search.list 기본 비용
    const videoListUnits = Math.ceil((query.params.maxResults || 10) / 50) * 7; // videos.list 비용
    return baseUnits + videoListUnits;
  }

  /**
   * 결과 수 추정
   */
  estimateResultCount(queries) {
    const totalMaxResults = queries.reduce((sum, query) => 
      sum + (query.params.maxResults || 10), 0
    );
    
    // 중복 제거 후 예상 결과 수
    return Math.floor(totalMaxResults * 0.7);
  }

  /**
   * 채널 ID 조회
   */
  getChannelId(channelName) {
    return this.channelDatabase[channelName.toLowerCase()] || null;
  }

  /**
   * 시간 관련성 확인
   */
  isTimeRelevant(keyword) {
    const timeRelevantKeywords = [
      '뉴스', '실시간', '최신', '오늘', '어제', '이번주',
      '트렌드', '핫이슈', '속보', '업데이트'
    ];
    
    return timeRelevantKeywords.some(timeKeyword => 
      keyword.includes(timeKeyword)
    );
  }

  /**
   * 배열 청크화
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 날짜 필터 생성
   */
  getPublishedAfterDate(timeFilter) {
    const now = new Date();
    
    switch (timeFilter) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default:
        return undefined;
    }
  }

  /**
   * 폴백 쿼리
   */
  getFallbackQuery(keyword, options) {
    return {
      original: keyword,
      strategy: ['fallback'],
      queries: [this.buildBasicQuery(keyword, options)],
      expansion: {
        keywords: [keyword],
        channels: [],
        categories: []
      },
      estimatedResults: options.maxResults || 20,
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }

  /**
   * 채널 데이터베이스 초기화
   */
  initializeChannelDatabase() {
    return {
      // 게임
      '페이커': 'UCcQX5RIFbBOaWaFUMW4cjBQ',
      't1': 'UC5RMFRhxClBl5x0QWH-7osQ',
      '젠지': 'UC8wXWmeBn9zqf8a5W7UhYlw',
      
      // 먹방
      '쯔양': 'UCReGm4KqR3J6gHDWPl9S0tw',
      '야식이': 'UCWIZYGJqCwq0W4Tx8xhQXxA',
      '밴쯔': 'UCWd0zQGTCDOgaJhWRHnGUhA',
      
      // 요리
      '백종원': 'UC8gFadIdcH4Qr9QdgLsY2eQ',
      '쿠킹트리': 'UCqaJYz8UIIjCjrCEL5d5Ghg',
      
      // 운동
      '빅씨스': 'UCUZS9G6eOzsq1eAqHJrZLOw',
      '힙으뜨': 'UC9P2MdJdNkKiGxdnoAmqgtw',
      
      // 기본값들...
    };
  }

  /**
   * 카테고리 매핑 초기화
   */
  initializeCategoryMapping() {
    return {
      gaming: '20',
      music: '10',
      sports: '17',
      entertainment: '24',
      education: '27',
      food: '26',
      lifestyle: '22'
    };
  }

  /**
   * 서비스 상태 조회
   */
  getStatus() {
    return {
      service: 'Query Builder Service',
      features: [
        'channel_based_queries',
        'category_filtering',
        'keyword_expansion',
        'or_operator_search',
        'time_based_filtering',
        'query_optimization'
      ],
      channelDatabase: Object.keys(this.channelDatabase).length,
      categories: Object.keys(this.categoryMapping).length,
      lastUpdate: new Date().toISOString()
    };
  }
}

module.exports = new QueryBuilderService(); 