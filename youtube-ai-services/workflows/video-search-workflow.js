import YouTubeSearch from '../search/youtube-search.js';
import VideoFilter from '../search/video-filter.js';
import GoogleTrends from '../trends/google-trends.js';
import NateTrends from '../trends/nate-trends.js';
import ZumTrends from '../trends/zum-trends.js';

/**
 * 🎬 완전한 YouTube 영상 검색 워크플로우
 */
class VideoSearchWorkflow {
  constructor(config) {
    this.youtubeSearch = new YouTubeSearch(config.youtubeApiKey);
    this.videoFilter = new VideoFilter(config.youtubeApiKey);
    this.googleTrends = new GoogleTrends(config.serpApiKey);
    this.nateTrends = new NateTrends(config.brightData);
    this.zumTrends = new ZumTrends(config.brightData);
    
    this.config = config;
    this.cache = new Map();
  }

  /**
   * 🎯 완전한 영상 검색 워크플로우 실행
   */
  async executeCompleteSearch(options = {}) {
    const {
      query = null,
      useTrends = false,
      maxResults = 20,
      filterPlayable = true,
      includeStats = true,
      cacheResults = true
    } = options;

    console.log('🎬 완전한 영상 검색 워크플로우 시작...');

    try {
      let searchKeywords = [];

      // 1. 검색 키워드 결정
      if (query) {
        searchKeywords = [query];
        console.log(`🔍 사용자 쿼리 사용: "${query}"`);
      } else if (useTrends) {
        searchKeywords = await this.getTrendingKeywords({ limit: 5 });
        console.log(`📈 트렌드 키워드 사용: ${searchKeywords.join(', ')}`);
      } else {
        throw new Error('검색 쿼리 또는 트렌드 사용 옵션이 필요합니다');
      }

      // 2. 키워드별 검색 실행
      const searchResults = [];
      let totalApiUnits = 0;

      for (const keyword of searchKeywords) {
        console.log(`🔍 키워드 검색: "${keyword}"`);

        // 캐시 확인
        const cacheKey = `search:${keyword}:${maxResults}`;
        if (this.cache.has(cacheKey)) {
          const cached = this.cache.get(cacheKey);
          if (Date.now() < cached.expiresAt) {
            console.log(`💾 캐시에서 로드: "${keyword}"`);
            searchResults.push(cached.data);
            continue;
          }
        }

        // YouTube API 검색
        const searchResult = await this.youtubeSearch.searchVideos(keyword, {
          maxResults,
          videoDuration: 'short',
          regionCode: 'KR'
        });

        totalApiUnits += searchResult.apiUnitsUsed;

        // 3. 2단계 필터링 (재생 가능 여부 확인)
        if (filterPlayable) {
          console.log(`🔍 2단계 필터링 실행: "${keyword}"`);
          
          const filterResult = await this.videoFilter.filterPlayableVideos(searchResult, {
            maxDurationSeconds: 60,
            requiredEmbeddable: true,
            requiredPublic: true,
            regionCode: 'KR'
          });

          totalApiUnits += filterResult.apiUnitsUsed;

          const processedResult = {
            keyword,
            videos: filterResult.playableVideos,
            originalCount: filterResult.originalCount,
            filteredCount: filterResult.filteredCount,
            filterRate: filterResult.filterRate,
            apiUnitsUsed: searchResult.apiUnitsUsed + filterResult.apiUnitsUsed
          };

          searchResults.push(processedResult);

          // 캐시 저장
          if (cacheResults) {
            this.cache.set(cacheKey, {
              data: processedResult,
              expiresAt: Date.now() + 4 * 60 * 60 * 1000 // 4시간
            });
          }

        } else {
          // 필터링 없이 원본 결과 사용
          const processedResult = {
            keyword,
            videos: searchResult.videos,
            originalCount: searchResult.videos.length,
            filteredCount: searchResult.videos.length,
            filterRate: '100.0',
            apiUnitsUsed: searchResult.apiUnitsUsed
          };

          searchResults.push(processedResult);
        }

        // API 호출 간격
        await this.delay(200);
      }

      // 4. 결과 통합 및 중복 제거
      const allVideos = this.mergeAndDeduplicateVideos(searchResults);

      // 5. 통계 생성
      const statistics = this.generateSearchStatistics(searchResults, totalApiUnits);

      // 6. 최종 결과 생성
      const finalResult = {
        videos: allVideos.slice(0, maxResults),
        searchKeywords,
        totalVideos: allVideos.length,
        searchResults,
        statistics,
        executedAt: new Date(),
        workflow: 'complete_video_search'
      };

      console.log(`✅ 워크플로우 완료: ${finalResult.totalVideos}개 영상, API ${totalApiUnits} units 사용`);
      return finalResult;

    } catch (error) {
      console.error('❌ 영상 검색 워크플로우 실패:', error.message);
      throw error;
    }
  }

  /**
   * 📈 트렌딩 키워드 수집
   */
  async getTrendingKeywords(options = {}) {
    const { limit = 10, sources = ['google', 'nate', 'zum'] } = options;

    console.log('📈 트렌딩 키워드 수집 시작...');

    const allTrends = [];

    try {
      // 구글 트렌드 수집
      if (sources.includes('google')) {
        const googleTrends = await this.googleTrends.getTrendingNow({ limit: 5 });
        allTrends.push(...googleTrends.map(t => ({ ...t, source: 'google' })));
      }

      // 네이트 트렌드 수집
      if (sources.includes('nate')) {
        const nateTrends = await this.nateTrends.getRealTimeSearches({ limit: 5 });
        allTrends.push(...nateTrends.map(t => ({ ...t, source: 'nate' })));
      }

      // 줌 트렌드 수집
      if (sources.includes('zum')) {
        const zumTrends = await this.zumTrends.getAIIssueTrends({ limit: 5 });
        allTrends.push(...zumTrends.map(t => ({ ...t, source: 'zum' })));
      }

      // 트렌드 점수 기반 정렬 및 선택
      const sortedTrends = allTrends
        .sort((a, b) => b.trendScore - a.trendScore)
        .slice(0, limit);

      const keywords = sortedTrends.map(trend => trend.keyword);
      console.log(`✅ 트렌딩 키워드 수집 완료: ${keywords.join(', ')}`);

      return keywords;

    } catch (error) {
      console.error('❌ 트렌딩 키워드 수집 실패:', error.message);
      return ['먹방', '브이로그', 'ASMR', '챌린지', '댄스']; // 폴백
    }
  }

  /**
   * 🔄 영상 결과 병합 및 중복 제거
   */
  mergeAndDeduplicateVideos(searchResults) {
    const videoMap = new Map();
    const mergedVideos = [];

    for (const result of searchResults) {
      for (const video of result.videos) {
        if (!videoMap.has(video.videoId)) {
          videoMap.set(video.videoId, true);
          mergedVideos.push({
            ...video,
            searchKeyword: result.keyword,
            originalRank: video.rank || mergedVideos.length + 1
          });
        }
      }
    }

    // 조회수 기준 정렬 (옵션)
    return mergedVideos.sort((a, b) => {
      const viewsA = parseInt(a.viewCount) || 0;
      const viewsB = parseInt(b.viewCount) || 0;
      return viewsB - viewsA;
    });
  }

  /**
   * 📊 검색 통계 생성
   */
  generateSearchStatistics(searchResults, totalApiUnits) {
    const totalSearched = searchResults.reduce((sum, r) => sum + r.originalCount, 0);
    const totalFiltered = searchResults.reduce((sum, r) => sum + r.filteredCount, 0);
    
    return {
      totalKeywords: searchResults.length,
      totalVideosSearched: totalSearched,
      totalVideosFiltered: totalFiltered,
      overallFilterRate: totalSearched > 0 ? ((totalFiltered / totalSearched) * 100).toFixed(1) : '0.0',
      totalApiUnitsUsed: totalApiUnits,
      averageFilterRate: searchResults.length > 0 
        ? (searchResults.reduce((sum, r) => sum + parseFloat(r.filterRate), 0) / searchResults.length).toFixed(1)
        : '0.0',
      keywordPerformance: searchResults.map(r => ({
        keyword: r.keyword,
        originalCount: r.originalCount,
        filteredCount: r.filteredCount,
        filterRate: r.filterRate,
        efficiency: r.filteredCount > 0 ? 'Good' : 'Poor'
      }))
    };
  }

  /**
   * 🎯 키워드 기반 스마트 검색
   */
  async smartKeywordSearch(query, options = {}) {
    const {
      expandKeywords = true,
      maxResults = 20,
      useRelatedTerms = true
    } = options;

    console.log(`🎯 스마트 키워드 검색: "${query}"`);

    try {
      let searchKeywords = [query];

      // 키워드 확장
      if (expandKeywords) {
        const relatedKeywords = await this.googleTrends.getRelatedSearches(query, { limit: 3 });
        const additionalKeywords = relatedKeywords.map(r => r.keyword).slice(0, 2);
        searchKeywords.push(...additionalKeywords);
        
        console.log(`🔗 확장된 키워드: ${additionalKeywords.join(', ')}`);
      }

      // 확장된 키워드로 검색 실행
      return await this.executeCompleteSearch({
        query: null, // 직접 키워드 배열 사용
        customKeywords: searchKeywords,
        maxResults,
        filterPlayable: true,
        includeStats: true
      });

    } catch (error) {
      console.error(`❌ 스마트 키워드 검색 실패: "${query}":`, error.message);
      throw error;
    }
  }

  /**
   * 🔄 캐시 관리
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ 캐시 클리어 완료');
  }

  getCacheStats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now < value.expiresAt) {
        validCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      totalCached: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      hitRate: validCount > 0 ? ((validCount / this.cache.size) * 100).toFixed(1) : '0.0'
    };
  }

  /**
   * ⏱️ 지연 함수
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🎮 워크플로우 프리셋
   */
  async getTrendingShorts() {
    return await this.executeCompleteSearch({
      useTrends: true,
      maxResults: 20,
      filterPlayable: true
    });
  }

  async searchPopularContent(query) {
    return await this.executeCompleteSearch({
      query,
      maxResults: 15,
      filterPlayable: true
    });
  }

  async getRecentTrendingVideos() {
    const trendKeywords = await this.getTrendingKeywords({ limit: 3 });
    
    return await this.executeCompleteSearch({
      customKeywords: trendKeywords,
      maxResults: 25,
      filterPlayable: true
    });
  }
}

export default VideoSearchWorkflow;

/**
 * 🎯 편의 함수들 - 직접 사용 가능
 */

// 전역 인스턴스 생성 함수
function createVideoSearchWorkflow() {
  const config = {
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    serpApiKey: process.env.SERP_API_KEY,
    brightData: {
      apiKey: process.env.BRIGHT_DATA_API_KEY,
      endpoint: process.env.BRIGHT_DATA_ENDPOINT
    }
  };
  return new VideoSearchWorkflow(config);
}

/**
 * 🎬 영상 검색 워크플로우 실행 (편의 함수)
 */
export async function executeVideoSearchWorkflow(options = {}) {
  const workflow = createVideoSearchWorkflow();
  return await workflow.executeCompleteSearch(options);
}

/**
 * 📊 영상 검색 워크플로우 통계 조회 (편의 함수)
 */
export function getVideoSearchWorkflowStats() {
  const workflow = createVideoSearchWorkflow();
  return workflow.getCacheStats();
} 