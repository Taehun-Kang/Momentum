/**
 * 📄 Pagination Handler
 * 40개 목표 달성을 위한 스마트 페이지네이션 관리
 * - 동적 목표 조정
 * - 효율적인 API 사용
 * - 품질 기반 중단 조건
 */

class PaginationHandler {
  constructor(searchEngine, videoFilter) {
    this.searchEngine = searchEngine;
    this.videoFilter = videoFilter;
    
    // 기본 설정
    this.defaultConfig = {
      targetResults: 40,           // 목표 결과 수
      maxPages: 5,                 // 최대 페이지 수
      minSuccessRate: 0.3,         // 최소 성공률 (30%)
      maxAPIUnits: 500,            // 최대 API 사용량
      earlyStopThreshold: 0.8      // 조기 중단 임계값 (80%)
    };

    // 통계 추적
    this.stats = {
      totalPages: 0,
      totalVideoIds: 0,
      finalResults: 0,
      apiUnitsUsed: 0,
      successRate: 0,
      efficiency: 0
    };
  }

  /**
   * 📄 스마트 페이지네이션 실행
   */
  async executeSmartPagination(query, criteria = {}) {
    const config = { ...this.defaultConfig, ...criteria };
    
    console.log(`📄 스마트 페이지네이션 시작: "${query}" (목표 ${config.targetResults}개)`);

    const results = {
      videos: [],
      totalProcessed: 0,
      pagesSearched: 0,
      earlyStop: false,
      reason: '',
      summary: {}
    };

    let currentPageToken = null;
    let accumulatedVideoIds = [];
    let processedResults = [];

    try {
      while (results.pagesSearched < config.maxPages && 
             results.videos.length < config.targetResults) {
        
        results.pagesSearched++;
        console.log(`  📖 페이지 ${results.pagesSearched}/${config.maxPages} 검색 중...`);

        // 1단계: 검색 엔진으로 비디오 ID 수집
        const searchResult = await this.searchEngine.searchVideos(query, {
          pageToken: currentPageToken,
          maxResults: 50
        });

        if (!searchResult.success || searchResult.videoIds.length === 0) {
          console.log(`  ⚠️ 페이지 ${results.pagesSearched}: 검색 결과 없음`);
          results.reason = 'no_more_results';
          break;
        }

        accumulatedVideoIds.push(...searchResult.videoIds);
        results.totalProcessed += searchResult.videoIds.length;

        // 2단계: 필터링 실행
        const filterResult = await this.videoFilter.filterAndAnalyzeVideos(
          searchResult.videoIds, 
          criteria
        );

        if (filterResult.success && filterResult.videos.length > 0) {
          processedResults.push(...filterResult.videos);
          
          // 중복 제거하며 병합
          results.videos = this.mergeUniqueVideos(results.videos, filterResult.videos);
          
          console.log(`  ✅ 페이지 ${results.pagesSearched}: ${filterResult.videos.length}개 추가 (누적: ${results.videos.length}개)`);
        } else {
          console.log(`  ❌ 페이지 ${results.pagesSearched}: 필터링 결과 없음`);
        }

        // 3단계: 조기 중단 조건 확인
        const shouldStop = this.checkEarlyStopConditions(
          results, 
          config, 
          searchResult.pagination
        );

        if (shouldStop.stop) {
          results.earlyStop = true;
          results.reason = shouldStop.reason;
          console.log(`  🔄 조기 중단: ${shouldStop.reason}`);
          break;
        }

        // 4단계: 다음 페이지 준비
        currentPageToken = searchResult.pagination.nextPageToken;
        if (!currentPageToken) {
          results.reason = 'no_more_pages';
          console.log(`  📋 더 이상 페이지가 없습니다.`);
          break;
        }

        // API 호출 간격
        await this.delay(150);
      }

      // 최종 처리
      results.summary = this.generateSummary(results, config);
      this.updateStats(results);

      console.log(`🎉 페이지네이션 완료: ${results.videos.length}개 결과 (${results.pagesSearched}페이지)`);

      return {
        success: true,
        ...results,
        query,
        config
      };

    } catch (error) {
      console.error('❌ 페이지네이션 실패:', error);
      return {
        success: false,
        error: error.message,
        partialResults: results.videos.length > 0 ? results : null
      };
    }
  }

  /**
   * 🔄 조기 중단 조건 확인
   */
  checkEarlyStopConditions(results, config, pagination) {
    // 1. 목표 달성 (목표의 80% 이상)
    if (results.videos.length >= config.targetResults * config.earlyStopThreshold) {
      return { 
        stop: true, 
        reason: `target_achieved_${results.videos.length}/${config.targetResults}` 
      };
    }

    // 2. 성공률 저조
    if (results.pagesSearched >= 2) {
      const successRate = results.videos.length / results.totalProcessed;
      if (successRate < config.minSuccessRate) {
        return { 
          stop: true, 
          reason: `low_success_rate_${(successRate * 100).toFixed(1)}%` 
        };
      }
    }

    // 3. API 사용량 초과 예상
    const currentUnits = results.pagesSearched * 109; // search(100) + videos(9)
    const projectedUnits = currentUnits + 109; // 다음 페이지 예상
    if (projectedUnits > config.maxAPIUnits) {
      return { 
        stop: true, 
        reason: `api_limit_approaching_${projectedUnits}/${config.maxAPIUnits}` 
      };
    }

    // 4. 연속된 빈 결과
    if (results.pagesSearched >= 2 && 
        results.videos.length === 0) {
      return { 
        stop: true, 
        reason: 'consecutive_empty_results' 
      };
    }

    return { stop: false, reason: '' };
  }

  /**
   * 🔄 고유 영상 병합
   */
  mergeUniqueVideos(existingVideos, newVideos) {
    const existingIds = new Set(existingVideos.map(v => v.id));
    const uniqueNewVideos = newVideos.filter(v => !existingIds.has(v.id));
    
    return [...existingVideos, ...uniqueNewVideos];
  }

  /**
   * 📊 요약 정보 생성
   */
  generateSummary(results, config) {
    const apiUnitsUsed = results.pagesSearched * 109;
    const successRate = results.totalProcessed > 0 
      ? (results.videos.length / results.totalProcessed * 100).toFixed(1) + '%'
      : '0%';
    
    const efficiency = apiUnitsUsed > 0
      ? (results.videos.length / apiUnitsUsed * 100).toFixed(2) + ' videos/100units'
      : '0';

    const targetAchievement = config.targetResults > 0
      ? (results.videos.length / config.targetResults * 100).toFixed(1) + '%'
      : '0%';

    return {
      targetAchievement,
      successRate,
      efficiency,
      apiUnitsUsed,
      averageResultsPerPage: results.pagesSearched > 0 
        ? (results.videos.length / results.pagesSearched).toFixed(1) 
        : '0',
      recommendedAction: this.getRecommendedAction(results, config)
    };
  }

  /**
   * 💡 권장 액션 제안
   */
  getRecommendedAction(results, config) {
    const achievement = results.videos.length / config.targetResults;
    const successRate = results.totalProcessed > 0 
      ? results.videos.length / results.totalProcessed 
      : 0;

    if (achievement >= 1.0) {
      return 'target_achieved';
    } else if (achievement >= 0.8) {
      return 'nearly_complete';
    } else if (successRate < 0.2) {
      return 'adjust_criteria';
    } else if (results.pagesSearched >= config.maxPages) {
      return 'increase_max_pages';
    } else {
      return 'continue_search';
    }
  }

  /**
   * 🎯 적응형 페이지네이션
   */
  async executeAdaptivePagination(query, criteria = {}) {
    console.log(`🎯 적응형 페이지네이션 시작: "${query}"`);
    
    // 1단계: 첫 페이지로 성공률 측정
    const initialResult = await this.executeSmartPagination(query, {
      ...criteria,
      maxPages: 1,
      targetResults: 10
    });

    if (!initialResult.success) {
      return initialResult;
    }

    const initialSuccessRate = initialResult.totalProcessed > 0
      ? initialResult.videos.length / initialResult.totalProcessed
      : 0;

    console.log(`  📊 첫 페이지 성공률: ${(initialSuccessRate * 100).toFixed(1)}%`);

    // 2단계: 성공률 기반 전략 조정
    let adaptedConfig = { ...criteria };

    if (initialSuccessRate >= 0.4) {
      // 높은 성공률: 적은 페이지로 목표 달성 가능
      adaptedConfig.maxPages = Math.min(3, criteria.maxPages || 5);
      adaptedConfig.targetResults = criteria.targetResults || 40;
    } else if (initialSuccessRate >= 0.2) {
      // 중간 성공률: 표준 전략
      adaptedConfig.maxPages = criteria.maxPages || 4;
      adaptedConfig.targetResults = criteria.targetResults || 40;
    } else {
      // 낮은 성공률: 더 많은 페이지 필요하거나 기준 완화
      adaptedConfig.maxPages = Math.min(6, (criteria.maxPages || 5) + 1);
      adaptedConfig.minViewCount = Math.max(500, (criteria.minViewCount || 1000) * 0.7);
      adaptedConfig.minEngagementRate = Math.max(0.005, (criteria.minEngagementRate || 0.01) * 0.7);
    }

    console.log(`  🔧 전략 조정: 최대 ${adaptedConfig.maxPages}페이지, 기준 완화됨`);

    // 3단계: 조정된 전략으로 전체 검색 실행
    return await this.executeSmartPagination(query, adaptedConfig);
  }

  /**
   * 📊 통계 업데이트
   */
  updateStats(results) {
    this.stats.totalPages += results.pagesSearched;
    this.stats.totalVideoIds += results.totalProcessed;
    this.stats.finalResults += results.videos.length;
    this.stats.apiUnitsUsed += results.pagesSearched * 109;
    
    this.stats.successRate = this.stats.totalVideoIds > 0
      ? this.stats.finalResults / this.stats.totalVideoIds
      : 0;
    
    this.stats.efficiency = this.stats.apiUnitsUsed > 0
      ? this.stats.finalResults / this.stats.apiUnitsUsed
      : 0;
  }

  /**
   * 📊 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      successRateFormatted: (this.stats.successRate * 100).toFixed(1) + '%',
      efficiencyFormatted: (this.stats.efficiency * 100).toFixed(2) + ' videos/100units',
      averagePagesPerSearch: this.stats.totalPages > 0 
        ? (this.stats.totalPages / (this.stats.finalResults || 1)).toFixed(1)
        : '0',
      averageResultsPerPage: this.stats.totalPages > 0
        ? (this.stats.finalResults / this.stats.totalPages).toFixed(1)
        : '0'
    };
  }

  /**
   * 🔄 지연 함수
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default PaginationHandler;

/**
 * 🎯 편의 함수들
 */

// 전역 인스턴스 생성
function createPaginationHandler(searchEngine, videoFilter) {
  return new PaginationHandler(searchEngine, videoFilter);
}

/**
 * 📄 스마트 페이지네이션 (편의 함수)
 */
export async function executeSmartPagination(searchEngine, videoFilter, query, criteria = {}) {
  const handler = createPaginationHandler(searchEngine, videoFilter);
  return await handler.executeSmartPagination(query, criteria);
}

/**
 * 🎯 적응형 페이지네이션 (편의 함수)
 */
export async function executeAdaptivePagination(searchEngine, videoFilter, query, criteria = {}) {
  const handler = createPaginationHandler(searchEngine, videoFilter);
  return await handler.executeAdaptivePagination(query, criteria);
}

/**
 * 📊 페이지네이션 통계 조회 (편의 함수)
 */
export function getPaginationStats() {
  // 실제 구현에서는 전역 인스턴스나 캐시된 통계 사용
  return {
    message: 'Create a PaginationHandler instance to track statistics'
  };
} 