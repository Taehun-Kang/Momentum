/**
 * 📈 Google Trends 전용 트렌드 수집기
 * 
 * SerpAPI를 통한 Google Trends 데이터 수집
 * - Google Trends Trending Now (실시간 트렌딩)
 * - Google Trends Autocomplete (자동완성)
 * 
 * 🎯 특징: 모든 트렌드 키워드를 제한 없이 수집
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class GoogleTrendsCollector {
  constructor() {
    this.serpApiKey = process.env.SERP_API_KEY;
    this.serpApiUrl = 'https://serpapi.com/search.json';
    
    console.log('🔑 Google Trends API 키 상태:', this.serpApiKey ? '✅ 설정됨' : '❌ 없음');
    
    // 통계 초기화
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      trendsCollected: 0,
      lastUpdate: null,
      apiCallsToday: 0,
      quotaUsage: 0
    };
  }

  /**
   * 🌟 Google Trends 실시간 데이터 수집 (제한 없음)
   */
  async collectAllGoogleTrends(options = {}) {
    const { 
      includeRegions = ['KR', 'US', 'JP'],
      includeMetadata = true,
      maxKeywords = 1000, // 최대 키워드 수 (제한 완화)
      sortBy = 'trending_score', // trending_score, alphabetical, region
      timeout = 10000, // 타임아웃 시간 단축
      noCache = false // 캐시 사용 (권장: 1시간 캐시로 안정성+성능 최적화)
    } = options;

    console.log('📈 Google Trends 실시간 수집 시작...');
    console.log(`🎯 대상 지역: ${includeRegions.join(', ')}`);
    console.log(`📊 최대 키워드: ${maxKeywords}개`);
    console.log(`💾 캐시 모드: ${noCache ? '❌ 실시간 강제' : '✅ 캐시 사용'}`);
    
    const startTime = Date.now();
    const allTrends = [];
    const collectionResults = {};
    
    try {
      // 실시간 트렌딩 수집 (지역별)
      for (const region of includeRegions) {
        console.log(`🔥 ${region} 실시간 트렌딩 수집 중...`);
        
        try {
          const trends = await this.collectTrendingNow(region, { timeout, noCache });
          allTrends.push(...trends);
          
          collectionResults[`trending_now_${region.toLowerCase()}`] = {
            success: true,
            count: trends.length,
            region: region,
            type: 'trending_now'
          };
          
          console.log(`   ✅ ${region}: ${trends.length}개 수집`);
          
          // API 호출 간격 (Rate Limiting 방지)
          await this.delay(1000);
          
        } catch (error) {
          console.error(`   ❌ ${region} 실시간 트렌딩 실패: ${error.message}`);
          collectionResults[`trending_now_${region.toLowerCase()}`] = {
            success: false,
            count: 0,
            region: region,
            type: 'trending_now',
            error: error.message
          };
        }
      }
      
      // 3. Raw 트렌드 데이터 처리 (지역별 분리)
      const trendsByRegion = this.processRawTrends(allTrends);
      
      const totalTime = Date.now() - startTime;
      const totalTrends = trendsByRegion.KR.length + trendsByRegion.US.length;
      this.updateStats(totalTrends, true);
      
      console.log(`✅ Google Trends 수집 완료: KR ${trendsByRegion.KR.length}개, US ${trendsByRegion.US.length}개 (${totalTime}ms)`);
      
      // 4. 수집된 트렌드 지역별 출력
      this.displayTrendsByRegion(trendsByRegion);
      
      return {
        trends: trendsByRegion,
        metadata: includeMetadata ? {
          totalTrends: totalTrends,
          collectionResults,
          processingTime: totalTime,
          regions: includeRegions,
          sortedBy: sortBy,
          timestamp: new Date().toISOString(),
          apiUsage: this.getApiUsageStats()
        } : undefined
      };
      
    } catch (error) {
      console.error('❌ Google Trends 수집 실패:', error.message);
      this.updateStats(0, false);
      
      return {
        trends: [],
        metadata: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 🔥 실시간 트렌딩 수집 (특정 지역)
   */
  async collectTrendingNow(region = 'KR', options = {}) {
    const { timeout = 10000, noCache = false } = options;
    
    if (!this.serpApiKey) {
      throw new Error('SerpAPI 키가 설정되지 않음');
    }
    
    try {
      const params = {
        engine: 'google_trends_trending_now',
        geo: region,
        hl: region === 'KR' ? 'ko' : region === 'JP' ? 'ja' : 'en',
        api_key: this.serpApiKey
      };
      
      // no_cache 옵션 추가 (실시간 강제 호출)
      if (noCache) {
        params.no_cache = true;
      }
      
      const response = await axios.get(this.serpApiUrl, {
        params,
        timeout: timeout
      });
      
      // 📊 원본 JSON 응답 출력 (디버깅 필요시 주석 해제)
      // console.log('🔍 ===== 원본 JSON 응답 =====');
      // console.log(JSON.stringify(response.data, null, 2));
      // console.log('===== 원본 JSON 응답 끝 =====');
      
      const trends = this.parseTrendingNowResponse(response.data, region);
      this.updateApiStats();
      
      return trends;
      
    } catch (error) {
      console.error(`실시간 트렌딩 API 오류 (${region}):`, error.response?.data || error.message);
      throw error;
    }
  }



  /**
   * 📊 실시간 트렌딩 응답 파싱 (모든 데이터 수집)
   */
  parseTrendingNowResponse(data, region) {
    const trends = [];
    
    try {
      if (data.trending_searches && Array.isArray(data.trending_searches)) {
        console.log(`   📊 ${region} 원본 트렌드: ${data.trending_searches.length}개`);
        
        // 모든 트렌드 수집 (원본 순서 유지)
        data.trending_searches.forEach((item, index) => {
          if (item.query) {
            const trend = {
              keyword: item.query,
              rank: index + 1, // 원본 순서 유지
              source: 'google_trending_now',
              region: region,
              
              // 구글 제공 정보 그대로 유지
              searchVolume: item.search_volume || null,
              increasePercentage: item.increase_percentage || null,
              
              // 카테고리 정보 (전체 포함)
              categories: item.categories || [],
              primaryCategory: item.categories?.[0]?.name || 'general',
              
              // 관련 검색어 (trend_breakdown)
              relatedTerms: item.trend_breakdown || [],
              
              // 시간 정보
              startTimestamp: item.start_timestamp || null,
              endTimestamp: item.end_timestamp || null,
              
              // 상태 정보
              isActive: item.active || false,
              
              // 추가 메타데이터
              serpApiLink: item.serpapi_google_trends_link || null,
              
              timestamp: new Date().toISOString(),
              collectedAt: new Date().toISOString()
            };
            
            trends.push(trend);
          }
        });
        
        // 원본 순서 유지 (Google의 중요도 순서 그대로)
      }
      
    } catch (error) {
      console.error(`${region} 트렌딩 파싱 오류:`, error);
    }
    
    return trends;
  }







  /**
   * 🔄 Raw 트렌드 데이터 처리 (지역별 분리)
   */
  processRawTrends(allTrends) {
    console.log(`🔄 Raw 트렌드 처리 시작: ${allTrends.length}개`);
    
    // 지역별로 분리
    const trendsByRegion = {
      KR: [],
      US: []
    };
    
    allTrends.forEach(trend => {
      if (trendsByRegion[trend.region]) {
        trendsByRegion[trend.region].push(trend);
      }
    });
    
    // 각 지역별로 상위 50개씩 (원본 순서 유지)
    const processed = {
      KR: trendsByRegion.KR.slice(0, 50),
      US: trendsByRegion.US.slice(0, 50)
    };
    
    console.log(`✅ Raw 트렌드 처리 완료: KR ${processed.KR.length}개, US ${processed.US.length}개`);
    
    return processed;
  }



  /**
   * 📋 지역별 트렌드 출력
   */
  displayTrendsByRegion(trendsByRegion) {
    // 한국 트렌드 출력
    if (trendsByRegion.KR?.length > 0) {
      console.log('\n📋 ===== 🇰🇷 한국 Google Trends =====');
      console.log(`총 ${trendsByRegion.KR.length}개의 한국 트렌드:`);
      
      trendsByRegion.KR.forEach((trend, index) => {
        console.log(`${String(index + 1).padStart(3, ' ')}. ${trend.keyword}`);
      });
      
      console.log('===== 한국 트렌드 끝 =====\n');
    }
    
    // 미국 트렌드 출력
    if (trendsByRegion.US?.length > 0) {
      console.log('📋 ===== 🇺🇸 미국 Google Trends =====');
      console.log(`총 ${trendsByRegion.US.length}개의 미국 트렌드:`);
      
      trendsByRegion.US.forEach((trend, index) => {
        console.log(`${String(index + 1).padStart(3, ' ')}. ${trend.keyword}`);
      });
      
      console.log('===== 미국 트렌드 끝 =====\n');
    }
  }

  /**
   * 🔧 유틸리티 메서드들
   */
  parseSearchVolume(volumeStr) {
    if (typeof volumeStr === 'number') return volumeStr;
    if (!volumeStr) return 0;
    
    const str = volumeStr.toString().toLowerCase();
    const number = parseFloat(str.replace(/[^0-9.]/g, ''));
    
    if (str.includes('k')) return number * 1000;
    if (str.includes('m')) return number * 1000000;
    if (str.includes('b')) return number * 1000000000;
    
    return number || 0;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateStats(trendsCount, success) {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
      this.stats.trendsCollected += trendsCount;
    } else {
      this.stats.failedRequests++;
    }
    
    this.stats.lastUpdate = new Date().toISOString();
  }

  updateApiStats() {
    this.stats.apiCallsToday++;
    this.stats.quotaUsage++;
  }

  getApiUsageStats() {
    return {
      apiCallsToday: this.stats.apiCallsToday,
      quotaUsage: this.stats.quotaUsage,
      successRate: this.stats.totalRequests > 0 
        ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * 📊 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(1) + '%'
        : '0%',
      avgTrendsPerRequest: this.stats.successfulRequests > 0 
        ? (this.stats.trendsCollected / this.stats.successfulRequests).toFixed(1)
        : '0'
    };
  }
}

export default GoogleTrendsCollector;

/**
 * 🎯 편의 함수들 - 직접 사용 가능
 */

/**
 * 🇰🇷 한국 활성화 트렌드 키워드 수집 (메인 함수)
 * - 한국(KR) 지역만 대상
 * - 활성화된 키워드(active: true)만 반환
 * - YouTube Shorts 검색에 최적화
 */
export async function getActiveKoreanTrends(options = {}) {
  console.log('🇰🇷 한국 활성화 트렌드 수집 시작...');
  
  const { 
    maxKeywords = 50,     // 최대 키워드 수
    includeMetadata = true,
    timeout = 10000,
    noCache = false       // 실시간 강제 호출 여부
  } = options;
  
  try {
    const collector = new GoogleTrendsCollector();
    
    // 한국 지역 실시간 트렌딩 수집
    const trendingData = await collector.collectTrendingNow('KR', { 
      timeout, 
      noCache 
    });
    
    console.log(`📊 수집된 한국 트렌드: ${trendingData.length}개`);
    
    // 활성화된 키워드만 필터링
    const activeTrends = trendingData.filter(trend => trend.isActive === true);
    
    console.log(`✅ 활성화된 키워드: ${activeTrends.length}개`);
    
    // 최대 개수로 제한 (Google 원본 순서 유지)
    const limitedTrends = activeTrends.slice(0, maxKeywords);
    
    // 키워드만 추출한 배열 (단순 사용용)
    const keywordsOnly = limitedTrends.map(trend => trend.keyword);
    
    const result = {
      success: true,
      keywords: keywordsOnly,                    // 🎯 키워드 배열 (단순 사용)
      trends: limitedTrends,                     // 📊 완전한 트렌드 정보
      summary: {
        totalCollected: trendingData.length,
        activeCount: activeTrends.length,
        finalCount: limitedTrends.length,
        region: 'KR',
        timestamp: new Date().toISOString()
      }
    };
    
    // 메타데이터 포함 여부
    if (includeMetadata) {
      result.metadata = {
        collectionTime: Date.now(),
        source: 'google_trending_now',
        filterCriteria: {
          region: 'KR',
          activeOnly: true,
          maxKeywords
        }
      };
    }
    
    // 결과 출력
    console.log('\n🎯 ===== 한국 활성화 키워드 =====');
    keywordsOnly.forEach((keyword, index) => {
      console.log(`${String(index + 1).padStart(3, ' ')}. ${keyword}`);
    });
    console.log('===== 한국 활성화 키워드 끝 =====\n');
    
    return result;
    
  } catch (error) {
    console.error('❌ 한국 활성화 트렌드 수집 실패:', error.message);
    
    return {
      success: false,
      keywords: [],
      trends: [],
      error: error.message,
      summary: {
        totalCollected: 0,
        activeCount: 0,
        finalCount: 0,
        region: 'KR',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * 📈 모든 Google Trends 수집 (기존 함수)
 */
export async function collectAllGoogleTrends(options = {}) {
  const collector = new GoogleTrendsCollector();
  return await collector.collectAllGoogleTrends(options);
}

/**
 * 🔥 실시간 트렌딩만 수집
 */
export async function collectGoogleTrendingNow(regions = ['KR', 'US']) {
  const collector = new GoogleTrendsCollector();
  return await collector.collectAllGoogleTrends({
    includeRegions: regions,
    maxKeywords: 500
  });
}

/**
 * 📊 Google Trends 통계 조회
 */
export function getGoogleTrendsStats() {
  const collector = new GoogleTrendsCollector();
  return collector.getStats();
}
