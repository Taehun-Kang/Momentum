const axios = require('axios');

class TrendService {
  constructor() {
    this.serpApiKey = process.env.SERPAPI_KEY || '';
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30분 캐시
    
    console.log('🔥 단순화된 Google Trends 서비스 초기화 완료');
  }

  // 메인 트렌드 수집 함수 (Google Trends만 사용)
  async getTrendingKeywords(region = 'KR', forceRefresh = false) {
    const cacheKey = `google_trends_${region}`;
    
    // 캐시 확인
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('🎯 캐시된 Google Trends 데이터 반환');
        return cached.data;
      }
    }

    try {
      console.log('🔥 Google Trends 실시간 수집 시작...');
      
      // Google Trends만 사용
      const googleTrends = await this.getGoogleTrendsFromSerpApi(region);

      // 중복 제거 및 점수순 정렬
      const uniqueTrends = this.deduplicateAndSort(googleTrends);

      // 🔍 간단한 데이터 분석
      const analysis = this.analyzeGoogleTrendsData(uniqueTrends);

      const result = {
        success: true,
        data: uniqueTrends,
        sources: ['google_trends'],
        timestamp: new Date().toISOString(),
        region,
        total: uniqueTrends.length,
        // 단순화된 분석 데이터
        analysis: {
          overall: {
            totalTrends: uniqueTrends.length,
            koreanKeywords: uniqueTrends.filter(t => /[가-힣]/.test(t.keyword)).length,
            avgScore: Math.round(uniqueTrends.reduce((sum, t) => sum + t.score, 0) / uniqueTrends.length),
            uniqueSources: 1,
            sourceDistribution: { 'google_trends': uniqueTrends.length }
          },
          bySource: {
            googleTrends: {
              count: uniqueTrends.length,
              quality: 'excellent',
              avgScore: Math.round(uniqueTrends.reduce((sum, t) => sum + t.score, 0) / uniqueTrends.length),
              koreanRatio: Math.round((uniqueTrends.filter(t => /[가-힣]/.test(t.keyword)).length / uniqueTrends.length) * 100),
              uniqueKeywords: uniqueTrends.length,
              searchVolumeAvg: Math.round(uniqueTrends.reduce((sum, t) => sum + (t.searchVolume || 0), 0) / uniqueTrends.length),
              categoryDistribution: this.getCategoryDistribution(uniqueTrends),
              issues: []
            }
          },
          recommendations: [
            {
              type: 'primary_source',
              message: 'Google Trends 단독 사용 추천',
              reason: '신뢰도 높은 실시간 트렌드 데이터'
            },
            {
              type: 'optimization',
              message: '한국 시장 최적화 완료',
              reason: `한국어 키워드 비율: ${Math.round((uniqueTrends.filter(t => /[가-힣]/.test(t.keyword)).length / uniqueTrends.length) * 100)}%`
            }
          ]
        },
        sourceBreakdown: {
          googleTrends: uniqueTrends
        }
      };

      // 캐시 저장
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      console.log(`✅ Google Trends 수집 완료: ${uniqueTrends.length}개 키워드`);
      return result;

    } catch (error) {
      console.error('❌ Google Trends 수집 실패:', error);
      
      // 폴백: 기본 트렌드 사용
      return this.getFallbackTrends(region);
    }
  }

  // 🔥 Google Trends (SerpAPI 활용) - 개선된 버전
  async getGoogleTrendsFromSerpApi(region = 'KR') {
    try {
      console.log('📊 Google Trends 수집 중...');
      
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google_trends_trending_now',
          geo: region,
          api_key: this.serpApiKey
        },
        timeout: 15000
      });

      if (response.data.trending_searches) {
        return this.processGoogleTrendsResults(response.data.trending_searches);
      }

      return [];
    } catch (error) {
      console.error('Google Trends SerpAPI 오류:', error.message);
      throw error;
    }
  }

  // 🔧 Google Trends 데이터 처리 (향상된 버전)
  processGoogleTrendsResults(trending_searches) {
    console.log(`📊 Google Trends 원본 데이터: ${trending_searches.length}개`);
    
    // 활성 상태인 트렌드만 필터링하고 검색량 순으로 정렬
    const activeTrends = trending_searches
      .filter(trend => trend.active === true)
      .sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0))
      .slice(0, 20); // 상위 20개만

    console.log(`✅ 활성 Google Trends: ${activeTrends.length}개`);

    return activeTrends.map((trend, index) => ({
      keyword: trend.query,
      category: this.categorizeGoogleTrend(trend.categories),
      score: 100 - index * 2, // 순위 기반 점수
      source: 'google_trends',
      searchVolume: trend.search_volume || 0,
      increasePercentage: trend.increase_percentage || 0,
      relatedKeywords: trend.trend_breakdown?.slice(0, 3) || [],
      originalData: {
        categories: trend.categories,
        trend_breakdown: trend.trend_breakdown,
        active: trend.active
      }
    }));
  }

  // 🏷️ Google Trends 카테고리 분류
  categorizeGoogleTrend(categories) {
    if (!categories || !categories.length) return 'general';
    
    const categoryMap = {
      'Sports': 'sports',
      'Entertainment': 'entertainment',
      'Politics': 'politics',
      'Law and Government': 'politics',
      'Health': 'health',
      'Technology': 'technology',
      'Business': 'business',
      'Science': 'science',
      'Arts & Entertainment': 'entertainment',
      'Games': 'gaming',
      'Food & Drink': 'food',
      'Travel': 'travel',
      'Beauty & Fitness': 'beauty'
    };

    const firstCategory = categories[0]?.name;
    return categoryMap[firstCategory] || 'general';
  }

  // 중복 제거 및 정렬
  deduplicateAndSort(trends) {
    const seen = new Set();
    const unique = trends.filter(trend => {
      const key = trend.keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // 상위 20개만
  }

  // Google Trends 데이터 분석
  analyzeGoogleTrendsData(trends) {
    const totalTrends = trends.length;
    const koreanKeywords = trends.filter(t => /[가-힣]/.test(t.keyword)).length;
    const avgSearchVolume = trends.reduce((sum, t) => sum + (t.searchVolume || 0), 0) / totalTrends;

    return {
      dataQuality: avgSearchVolume > 100000 ? 'excellent' : avgSearchVolume > 50000 ? 'good' : 'fair',
      koreanRatio: Math.round((koreanKeywords / totalTrends) * 100),
      avgSearchVolume: Math.round(avgSearchVolume),
      topCategories: this.getTopCategories(trends),
      recommendations: this.generateSimpleRecommendations(trends)
    };
  }

  // 카테고리 분포 계산
  getCategoryDistribution(trends) {
    const distribution = {};
    trends.forEach(trend => {
      const category = trend.category || 'general';
      distribution[category] = (distribution[category] || 0) + 1;
    });
    return distribution;
  }

  // 상위 카테고리 추출
  getTopCategories(trends) {
    const distribution = this.getCategoryDistribution(trends);
    return Object.entries(distribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
  }

  // 간단한 추천사항 생성
  generateSimpleRecommendations(trends) {
    const recommendations = [];
    
    const koreanRatio = (trends.filter(t => /[가-힣]/.test(t.keyword)).length / trends.length) * 100;
    const avgSearchVolume = trends.reduce((sum, t) => sum + (t.searchVolume || 0), 0) / trends.length;

    if (koreanRatio > 70) {
      recommendations.push('한국 시장에 최적화된 트렌드 데이터');
    }

    if (avgSearchVolume > 100000) {
      recommendations.push('높은 검색량의 신뢰할 수 있는 트렌드');
    }

    if (trends.length > 15) {
      recommendations.push('충분한 양의 다양한 트렌드 키워드');
    }

    return recommendations;
  }

  // 폴백 트렌드 데이터
  getFallbackTrends(region) {
    const fallbackTrends = [
      { keyword: '챌린지', category: 'entertainment', score: 95, source: 'fallback' },
      { keyword: '먹방', category: 'food', score: 90, source: 'fallback' },
      { keyword: '브이로그', category: 'lifestyle', score: 85, source: 'fallback' },
      { keyword: 'K-POP', category: 'music', score: 80, source: 'fallback' },
      { keyword: '게임', category: 'gaming', score: 75, source: 'fallback' }
    ];

    return {
      success: false,
      data: fallbackTrends,
      sources: ['fallback'],
      timestamp: new Date().toISOString(),
      region,
      total: fallbackTrends.length,
      error: 'Google Trends API 오류 - 폴백 데이터 사용'
    };
  }

  // 통계 정보
  async getStats() {
    return {
      service: 'Simplified Google Trends Service',
      cacheSize: this.cache.size,
      availableApis: {
        googleTrends: !!this.serpApiKey,
        serpapi: !!this.serpApiKey
      },
      lastUpdate: new Date().toISOString(),
      apiEndpoints: {
        googleTrends: 'google_trends_trending_now (SerpAPI)'
      },
      simplification: {
        removedSources: ['youtube_trending', 'youtube_shorts', 'n8n_workflow'],
        benefits: [
          '단순한 구조',
          '높은 신뢰도',
          '일관된 데이터 품질',
          '빠른 응답 시간'
        ]
      }
    };
  }
}

module.exports = new TrendService(); 