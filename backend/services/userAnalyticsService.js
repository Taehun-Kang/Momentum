const supabaseService = require('./supabaseService');

/**
 * 사용자 분석 서비스
 * - 검색 패턴 추적
 * - 인기 검색어 추출 (요구사항 8번)
 * - 사용자별 개인화 데이터 생성
 * - 실시간 트렌드 분석
 */
class UserAnalyticsService {
  constructor() {
    this.searchCache = new Map();
    this.popularKeywordsCache = null;
    this.cacheTimeout = 10 * 60 * 1000; // 10분 캐시
    
    console.log('📊 사용자 분석 서비스 초기화 완료');
  }

  /**
   * 검색 로그 기록
   * @param {string} userId - 사용자 ID (null 가능)
   * @param {string} keyword - 검색 키워드
   * @param {Object} metadata - 추가 메타데이터
   */
  async logSearch(userId, keyword, metadata = {}) {
    try {
      const searchLog = {
        user_id: userId,
        search_query: keyword,
        search_type: metadata.searchType || 'basic',
        results_count: metadata.resultsCount || 0,
        response_time: metadata.responseTime || 0,
        user_tier: metadata.userTier || 'free',
        ip_address: metadata.ipAddress || '0.0.0.0',
        user_agent: metadata.userAgent || '',
        created_at: new Date().toISOString()
      };

      const { error } = await supabaseService.client
        .from('search_logs')
        .insert([searchLog]);

      if (error) {
        console.error('검색 로그 저장 실패:', error);
      } else {
        console.log(`📝 검색 로그 저장: "${keyword}" (${userId || 'anonymous'})`);
      }

      // 실시간 인기 키워드 캐시 무효화
      this.invalidatePopularKeywordsCache();

    } catch (error) {
      console.error('검색 로그 기록 실패:', error);
    }
  }

  /**
   * 현재 인기 검색어 추출 (요구사항 8번)
   * @param {Object} options - 옵션
   * @returns {Array} 인기 검색어 목록
   */
  async getPopularSearchKeywords(options = {}) {
    const {
      timeRange = '24h', // 1h, 6h, 24h, 7d, 30d
      limit = 20,
      userTier = 'all', // all, free, premium
      excludeCommon = true // 일반적인 키워드 제외
    } = options;

    const cacheKey = `popular_${timeRange}_${userTier}_${limit}`;
    
    // 캐시 확인
    if (this.popularKeywordsCache?.key === cacheKey && 
        Date.now() - this.popularKeywordsCache.timestamp < this.cacheTimeout) {
      console.log('📦 인기 검색어 캐시 적중');
      return this.popularKeywordsCache.data;
    }

    try {
      console.log(`🔥 인기 검색어 분석 시작 (${timeRange})`);
      
      // 시간 범위 설정
      const timeFilter = this.getTimeFilter(timeRange);
      
      // 기본 쿼리 구성
      let query = supabaseService.client
        .from('search_logs')
        .select('search_query, user_tier, created_at')
        .gte('created_at', timeFilter)
        .not('search_query', 'is', null)
        .not('search_query', 'eq', '');

      // 사용자 티어 필터링
      if (userTier !== 'all') {
        query = query.eq('user_tier', userTier);
      }

      const { data: searchLogs, error } = await query;

      if (error) {
        throw error;
      }

      console.log(`📊 ${searchLogs.length}개 검색 로그 분석 중...`);

      // 키워드 빈도 계산
      const keywordFrequency = this.calculateKeywordFrequency(searchLogs);
      
      // 트렌드 점수 계산 (최근일수록 높은 점수)
      const trendScores = this.calculateTrendScores(searchLogs, timeRange);
      
      // 최종 점수 계산 및 정렬
      const rankedKeywords = this.rankKeywords(keywordFrequency, trendScores);
      
      // 일반적인 키워드 필터링
      const filteredKeywords = excludeCommon ? 
        this.filterCommonKeywords(rankedKeywords) : rankedKeywords;
      
      // 상위 키워드 선택
      const topKeywords = filteredKeywords.slice(0, limit);
      
      // 추가 메타데이터 추가
      const enrichedKeywords = await this.enrichKeywordData(topKeywords, timeRange);

      // 캐시 저장
      this.popularKeywordsCache = {
        key: cacheKey,
        data: enrichedKeywords,
        timestamp: Date.now()
      };

      console.log(`✅ 인기 검색어 ${enrichedKeywords.length}개 추출 완료`);
      return enrichedKeywords;

    } catch (error) {
      console.error('인기 검색어 추출 실패:', error);
      return this.getFallbackPopularKeywords();
    }
  }

  /**
   * 사용자별 검색 패턴 분석
   * @param {string} userId - 사용자 ID
   * @returns {Object} 사용자 검색 패턴
   */
  async getUserSearchPatterns(userId) {
    try {
      // 최근 30일 검색 로그 조회
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: userLogs, error } = await supabaseService.client
        .from('search_logs')
        .select('search_query, search_type, results_count, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return this.analyzeUserPatterns(userLogs);

    } catch (error) {
      console.error('사용자 패턴 분석 실패:', error);
      return this.getDefaultUserPattern();
    }
  }

  /**
   * 실시간 검색 트렌드 (최근 1시간)
   */
  async getRealtimeSearchTrends() {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data: recentLogs, error } = await supabaseService.client
        .from('search_logs')
        .select('search_query, created_at')
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 10분 단위로 그룹화
      const timeSlots = this.groupByTimeSlots(recentLogs, 10);
      
      // 급상승 키워드 탐지
      const surgingKeywords = this.detectSurgingKeywords(timeSlots);

      return {
        totalSearches: recentLogs.length,
        timeSlots,
        surgingKeywords,
        lastUpdate: new Date().toISOString()
      };

    } catch (error) {
      console.error('실시간 트렌드 분석 실패:', error);
      return { totalSearches: 0, timeSlots: [], surgingKeywords: [] };
    }
  }

  /**
   * 키워드 빈도 계산
   */
  calculateKeywordFrequency(searchLogs) {
    const frequency = new Map();
    
    searchLogs.forEach(log => {
      const keyword = log.search_query.toLowerCase().trim();
      if (keyword.length > 0) {
        frequency.set(keyword, (frequency.get(keyword) || 0) + 1);
      }
    });
    
    return frequency;
  }

  /**
   * 트렌드 점수 계산 (시간 가중치)
   */
  calculateTrendScores(searchLogs, timeRange) {
    const scores = new Map();
    const now = Date.now();
    const timeWindow = this.getTimeWindowMs(timeRange);
    
    searchLogs.forEach(log => {
      const keyword = log.search_query.toLowerCase().trim();
      const logTime = new Date(log.created_at).getTime();
      const timeElapsed = now - logTime;
      
      // 최근일수록 높은 가중치 (지수 감소)
      const timeWeight = Math.exp(-timeElapsed / (timeWindow * 0.3));
      
      scores.set(keyword, (scores.get(keyword) || 0) + timeWeight);
    });
    
    return scores;
  }

  /**
   * 키워드 랭킹 계산
   */
  rankKeywords(frequency, trendScores) {
    const keywords = new Set([...frequency.keys(), ...trendScores.keys()]);
    
    return Array.from(keywords)
      .map(keyword => ({
        keyword,
        frequency: frequency.get(keyword) || 0,
        trendScore: trendScores.get(keyword) || 0,
        totalScore: (frequency.get(keyword) || 0) * 0.7 + (trendScores.get(keyword) || 0) * 0.3
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * 일반적인 키워드 필터링
   */
  filterCommonKeywords(rankedKeywords) {
    const commonKeywords = new Set([
      '영상', '비디오', '쇼츠', 'shorts', '유튜브', 'youtube',
      '검색', '찾기', '보기', '재생', '추천', '인기'
    ]);
    
    return rankedKeywords.filter(item => 
      !commonKeywords.has(item.keyword) && 
      item.keyword.length > 1 &&
      !/^[0-9]+$/.test(item.keyword)
    );
  }

  /**
   * 키워드 데이터 보강
   */
  async enrichKeywordData(topKeywords, timeRange) {
    return topKeywords.map((item, index) => ({
      rank: index + 1,
      keyword: item.keyword,
      searchCount: item.frequency,
      trendScore: Math.round(item.trendScore * 100) / 100,
      totalScore: Math.round(item.totalScore * 100) / 100,
      category: this.categorizeKeyword(item.keyword),
      growth: this.calculateGrowth(item.keyword, timeRange),
      estimatedPopularity: this.estimatePopularity(item.frequency, timeRange)
    }));
  }

  /**
   * 키워드 카테고리 분류
   */
  categorizeKeyword(keyword) {
    const categories = {
      gaming: ['게임', '롤', '배그', '피파', '포트나이트', '마인크래프트'],
      food: ['먹방', '요리', '맛집', '음식', '레시피', '카페'],
      music: ['음악', '노래', 'kpop', '댄스', 'mv', '뮤직'],
      lifestyle: ['브이로그', '일상', '루틴', '데이트', '여행'],
      sports: ['축구', '야구', '농구', '운동', '헬스', '다이어트'],
      entertainment: ['예능', '드라마', '영화', '웃긴', '재미']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(cat => keyword.includes(cat))) {
        return category;
      }
    }
    
    return 'general';
  }

  /**
   * 사용자 패턴 분석
   */
  analyzeUserPatterns(userLogs) {
    const patterns = {
      totalSearches: userLogs.length,
      avgSearchesPerDay: userLogs.length / 30,
      favoriteCategories: this.extractFavoriteCategories(userLogs),
      searchTimes: this.analyzeSearchTimes(userLogs),
      searchTypes: this.analyzeSearchTypes(userLogs),
      recentKeywords: userLogs.slice(0, 10).map(log => log.search_query)
    };

    return patterns;
  }

  /**
   * 선호 카테고리 추출
   */
  extractFavoriteCategories(userLogs) {
    const categoryCount = {};
    
    userLogs.forEach(log => {
      const category = this.categorizeKeyword(log.search_query);
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));
  }

  /**
   * 시간 필터 생성
   */
  getTimeFilter(timeRange) {
    const now = new Date();
    
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '6h':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  /**
   * 시간 윈도우 밀리초 변환
   */
  getTimeWindowMs(timeRange) {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * 캐시 무효화
   */
  invalidatePopularKeywordsCache() {
    this.popularKeywordsCache = null;
  }

  /**
   * 폴백 인기 키워드
   */
  getFallbackPopularKeywords() {
    return [
      { rank: 1, keyword: '먹방', category: 'food', estimatedPopularity: 'high' },
      { rank: 2, keyword: '브이로그', category: 'lifestyle', estimatedPopularity: 'high' },
      { rank: 3, keyword: '게임', category: 'gaming', estimatedPopularity: 'medium' },
      { rank: 4, keyword: '음악', category: 'music', estimatedPopularity: 'medium' },
      { rank: 5, keyword: '운동', category: 'sports', estimatedPopularity: 'medium' }
    ];
  }

  /**
   * 기본 사용자 패턴
   */
  getDefaultUserPattern() {
    return {
      totalSearches: 0,
      avgSearchesPerDay: 0,
      favoriteCategories: [],
      searchTimes: {},
      searchTypes: {},
      recentKeywords: []
    };
  }

  /**
   * 서비스 상태 조회
   */
  getStatus() {
    return {
      service: 'User Analytics Service',
      cacheSize: this.searchCache.size,
      popularKeywordsCached: !!this.popularKeywordsCache,
      features: [
        'search_logging',
        'popular_keywords_extraction',
        'user_pattern_analysis',
        'realtime_trends',
        'keyword_categorization'
      ],
      lastUpdate: new Date().toISOString()
    };
  }
}

module.exports = new UserAnalyticsService(); 