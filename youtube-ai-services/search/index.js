/**
 * 🎯 YouTube Search System - Main Interface
 * 
 * 모든 search 모듈들의 통합 인터페이스
 * - 검색, 필터링, 페이지네이션 통합 관리
 * - 40개 목표 달성을 위한 완전 자동화 시스템
 * - 캐싱 및 성능 최적화
 */

import YouTubeSearchEngine from './modules/youtube-search-engine.js';
import VideoCompleteFilter from './modules/video-complete-filter.js';
import PaginationHandler from './modules/pagination-handler.js';

/**
 * 🎬 통합 YouTube 검색 시스템
 */
class YouTubeSearchSystem {
  constructor(apiKey) {
    this.apiKey = apiKey;
    
    // 핵심 모듈들
    this.searchEngine = new YouTubeSearchEngine(apiKey);
    this.videoFilter = new VideoCompleteFilter(apiKey);
    this.paginationHandler = new PaginationHandler(this.searchEngine, this.videoFilter);
    
    // 캐시 시스템 (간단한 메모리 캐시)
    this.cache = new Map();
    this.cacheTTL = 4 * 60 * 60 * 1000; // 4시간

    // 통계 추적
    this.stats = {
      totalSearches: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalVideosFound: 0,
      totalAPIUnits: 0
    };
  }

  /**
   * 🎯 메인 검색 함수 (모든 기능 통합)
   */
  async searchYouTubeShorts(query, options = {}) {
    const startTime = Date.now();
    console.log(`🎯 YouTube Shorts 검색 시작: "${query}"`);
    
    // 기본 설정
    const searchOptions = {
      // 목표 설정
      targetResults: options.targetResults || 40,
      maxPages: options.maxPages || 5,
      
      // 필터링 기준
      minDuration: options.minDuration || 5,
      maxDuration: options.maxDuration || 60,
      minViewCount: options.minViewCount || 1000,
      minLikeCount: options.minLikeCount || 10,
      minEngagementRate: options.minEngagementRate || 0.01,
      
      // 정렬 및 출력
      sortBy: options.sortBy || 'engagement',
      useCache: options.useCache !== false,
      useAdaptivePagination: options.useAdaptivePagination !== false,
      
      // 고급 옵션
      maxAPIUnits: options.maxAPIUnits || 500,
      minSuccessRate: options.minSuccessRate || 0.3
    };

    try {
      // 캐시 확인
      if (searchOptions.useCache) {
        const cacheKey = this.generateCacheKey(query, searchOptions);
        const cachedResult = this.getFromCache(cacheKey);
        
        if (cachedResult) {
          console.log(`🎉 캐시에서 결과 반환: ${cachedResult.videos.length}개`);
          this.stats.cacheHits++;
          return {
            ...cachedResult,
            fromCache: true,
            cacheAge: Date.now() - cachedResult.timestamp
          };
        }
        this.stats.cacheMisses++;
      }

      // 페이지네이션 전략 선택
      let result;
      if (searchOptions.useAdaptivePagination) {
        console.log('🎯 적응형 페이지네이션 사용');
        result = await this.paginationHandler.executeAdaptivePagination(query, searchOptions);
      } else {
        console.log('📄 표준 페이지네이션 사용');
        result = await this.paginationHandler.executeSmartPagination(query, searchOptions);
      }

      if (!result.success) {
        throw new Error(result.error || '검색 실패');
      }

      // 최종 결과 처리
      const finalResult = {
        success: true,
        query,
        videos: result.videos,
        metadata: {
          totalProcessed: result.totalProcessed,
          pagesSearched: result.pagesSearched,
          processingTime: Date.now() - startTime,
          earlyStop: result.earlyStop,
          reason: result.reason,
          options: searchOptions
        },
        summary: result.summary,
        timestamp: Date.now()
      };

      // 캐시 저장
      if (searchOptions.useCache && result.videos.length > 0) {
        const cacheKey = this.generateCacheKey(query, searchOptions);
        this.saveToCache(cacheKey, finalResult);
      }

      // 통계 업데이트
      this.updateStats(finalResult);

      console.log(`🎉 검색 완료: ${result.videos.length}개 결과 (${Date.now() - startTime}ms)`);
      return finalResult;

    } catch (error) {
      console.error(`❌ 검색 실패: ${error.message}`);
      return {
        success: false,
        query,
        error: error.message,
        metadata: {
          processingTime: Date.now() - startTime,
          options: searchOptions
        }
      };
    }
  }

  /**
   * 🔍 빠른 검색 (간단한 옵션)
   */
  async quickSearch(query, maxResults = 20) {
    return await this.searchYouTubeShorts(query, {
      targetResults: maxResults,
      maxPages: 3,
      minViewCount: 500,
      useAdaptivePagination: true
    });
  }

  /**
   * 📊 고품질 검색 (엄격한 기준)
   */
  async highQualitySearch(query, maxResults = 40) {
    return await this.searchYouTubeShorts(query, {
      targetResults: maxResults,
      maxPages: 4,
      minViewCount: 5000,
      minLikeCount: 50,
      minEngagementRate: 0.02,
      sortBy: 'engagement',
      useAdaptivePagination: true
    });
  }

  /**
   * ⚡ 대량 검색 (여러 키워드)
   */
  async bulkSearch(queries, options = {}) {
    console.log(`⚡ 대량 검색 시작: ${queries.length}개 쿼리`);
    
    const results = [];
    const maxConcurrent = options.maxConcurrent || 3;
    
    // 배치 처리
    for (let i = 0; i < queries.length; i += maxConcurrent) {
      const batch = queries.slice(i, i + maxConcurrent);
      console.log(`  📦 배치 ${Math.floor(i / maxConcurrent) + 1}: ${batch.length}개 쿼리`);
      
      const batchPromises = batch.map(async (query) => {
        try {
          const result = await this.searchYouTubeShorts(query, {
            ...options,
            targetResults: options.targetResults || 20,
            maxPages: options.maxPages || 3
          });
          return { query, ...result };
        } catch (error) {
          return { query, success: false, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // API 호출 간격
      if (i + maxConcurrent < queries.length) {
        await this.delay(500);
      }
    }

    const successful = results.filter(r => r.success);
    const totalVideos = successful.reduce((sum, r) => sum + (r.videos?.length || 0), 0);

    console.log(`🎉 대량 검색 완료: ${successful.length}/${queries.length}개 성공, ${totalVideos}개 영상`);

    return {
      success: true,
      queries,
      results,
      summary: {
        totalQueries: queries.length,
        successfulQueries: successful.length,
        totalVideos,
        averageVideosPerQuery: successful.length > 0 ? (totalVideos / successful.length).toFixed(1) : 0
      }
    };
  }

  /**
   * 📊 캐시 관리
   */
  generateCacheKey(query, options) {
    const keyData = {
      query: query.toLowerCase().trim(),
      targetResults: options.targetResults,
      minViewCount: options.minViewCount,
      minEngagementRate: options.minEngagementRate,
      sortBy: options.sortBy
    };
    return JSON.stringify(keyData);
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // 캐시 크기 제한 (100개)
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ 캐시가 초기화되었습니다.');
  }

  /**
   * 📊 통계 관리
   */
  updateStats(result) {
    this.stats.totalSearches++;
    this.stats.totalVideosFound += result.videos?.length || 0;
    
    // API 사용량 추정 (페이지 수 * 109 units)
    const estimatedUnits = (result.metadata.pagesSearched || 1) * 109;
    this.stats.totalAPIUnits += estimatedUnits;
  }

  getStats() {
    const cacheHitRate = this.stats.totalSearches > 0
      ? (this.stats.cacheHits / this.stats.totalSearches * 100).toFixed(1) + '%'
      : '0%';

    const averageVideosPerSearch = this.stats.totalSearches > 0
      ? (this.stats.totalVideosFound / this.stats.totalSearches).toFixed(1)
      : '0';

    const efficiency = this.stats.totalAPIUnits > 0
      ? (this.stats.totalVideosFound / this.stats.totalAPIUnits * 100).toFixed(2) + ' videos/100units'
      : '0';

    return {
      ...this.stats,
      cacheHitRate,
      averageVideosPerSearch,
      efficiency,
      searchEngine: this.searchEngine.getStats(),
      videoFilter: this.videoFilter?.getStats?.() || {},
      paginationHandler: this.paginationHandler.getStats()
    };
  }

  /**
   * 🛠️ 시스템 관리
   */
  async validateSetup() {
    console.log('🔧 시스템 설정 검증 중...');
    
    try {
      // API 키 검증
      const apiValidation = await this.searchEngine.validateApiKey();
      if (!apiValidation.valid) {
        throw new Error(`API 키 검증 실패: ${apiValidation.message}`);
      }
      
      console.log('✅ API 키 검증 성공');
      
      // 간단한 테스트 검색
      const testResult = await this.quickSearch('test', 5);
      if (!testResult.success) {
        throw new Error(`테스트 검색 실패: ${testResult.error}`);
      }
      
      console.log(`✅ 테스트 검색 성공: ${testResult.videos.length}개 결과`);
      
      return { valid: true, message: '시스템이 정상적으로 설정되었습니다.' };
      
    } catch (error) {
      console.error('❌ 시스템 검증 실패:', error.message);
      return { valid: false, message: error.message };
    }
  }

  /**
   * 🔄 지연 함수
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default YouTubeSearchSystem;

/**
 * 🎯 편의 함수들
 */

// 전역 인스턴스 생성
let globalSearchSystem = null;

function getSearchSystem() {
  if (!globalSearchSystem) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
    }
    globalSearchSystem = new YouTubeSearchSystem(apiKey);
  }
  return globalSearchSystem;
}

/**
 * 🎯 메인 검색 (편의 함수)
 */
export async function searchYouTubeShorts(query, options = {}) {
  const system = getSearchSystem();
  return await system.searchYouTubeShorts(query, options);
}

/**
 * 🔍 빠른 검색 (편의 함수)
 */
export async function quickSearch(query, maxResults = 20) {
  const system = getSearchSystem();
  return await system.quickSearch(query, maxResults);
}

/**
 * 📊 고품질 검색 (편의 함수)
 */
export async function highQualitySearch(query, maxResults = 40) {
  const system = getSearchSystem();
  return await system.highQualitySearch(query, maxResults);
}

/**
 * ⚡ 대량 검색 (편의 함수)
 */
export async function bulkSearch(queries, options = {}) {
  const system = getSearchSystem();
  return await system.bulkSearch(queries, options);
}

/**
 * 📊 시스템 통계 조회 (편의 함수)
 */
export function getSystemStats() {
  const system = getSearchSystem();
  return system.getStats();
}

/**
 * 🛠️ 시스템 검증 (편의 함수)
 */
export async function validateSearchSystem() {
  const system = getSearchSystem();
  return await system.validateSetup();
}

/**
 * 🗑️ 캐시 초기화 (편의 함수)
 */
export function clearSearchCache() {
  const system = getSearchSystem();
  system.clearCache();
}

// 개별 모듈 내보내기 (고급 사용자용)
export {
  YouTubeSearchEngine,
  VideoCompleteFilter,
  PaginationHandler
}; 