/**
 * �� Pagination Handler - 독립적 페이지네이션 조건 관리
 * 40개 목표 달성을 위한 페이지네이션 조건 판단
 * - 다음 페이지 진행 여부 결정
 * - 조기 중단 조건 체크
 * - 페이지네이션 통계 관리
 */

class PaginationHandler {
  constructor() {
    // 기본 설정
    this.defaultConfig = {
      targetResults: 40,           // 목표 결과 수 (달성시 즉시 중단)
      maxPages: 3,                 // 최대 3페이지 제한
      minSuccessRate: 0.3,         // 사용 안함 (제거 예정)
      maxAPIUnits: 500,            // 사용 안함 (제거 예정)
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
   * 🔄 다음 페이지 진행 여부 판단
   */
  shouldContinuePagination(currentResults, config = {}) {
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    const pageData = {
      currentResultCount: currentResults.videos ? currentResults.videos.length : 0,
      pagesSearched: currentResults.pagesSearched || 0,
      totalProcessed: currentResults.totalProcessed || 0,
      hasNextPageToken: currentResults.hasNextPageToken || false
    };

    console.log(`🔄 페이지네이션 조건 확인: ${pageData.currentResultCount}/${mergedConfig.targetResults}개 (${pageData.pagesSearched}페이지)`);

    // 1. 기본 중단 조건들
    const stopConditions = this.checkStopConditions(pageData, mergedConfig);
    
    if (stopConditions.shouldStop) {
      console.log(`  ⛔ 중단: ${stopConditions.reason}`);
      return {
        shouldContinue: false,
        reason: stopConditions.reason,
        stats: this.calculateCurrentStats(pageData, mergedConfig)
      };
    }

    // 2. 계속 진행 가능
    console.log(`  ✅ 계속 진행: ${stopConditions.reason}`);
    return {
      shouldContinue: true,
      reason: stopConditions.reason,
      stats: this.calculateCurrentStats(pageData, mergedConfig)
    };
  }

  /**
   * 🛑 중단 조건 체크
   */
  checkStopConditions(pageData, config) {
    // 1. 목표 달성 (40개 이상) - 최우선 중단 조건
    if (pageData.currentResultCount >= config.targetResults) {
      return { 
        shouldStop: true, 
        reason: `target_achieved_${pageData.currentResultCount}/${config.targetResults}` 
      };
    }

    // 2. 최대 페이지 수 도달 (3페이지)
    if (pageData.pagesSearched >= config.maxPages) {
      return { 
        shouldStop: true, 
        reason: `max_pages_reached_${pageData.pagesSearched}/${config.maxPages}` 
      };
    }

    // 3. 더 이상 페이지가 없음 (YouTube API 한계)
    if (!pageData.hasNextPageToken) {
      return { 
        shouldStop: true, 
        reason: 'no_more_pages_available' 
      };
    }

    // 4. 연속된 빈 결과 (2페이지 이상 진행했는데 결과 0개)
    if (pageData.pagesSearched >= 2 && pageData.currentResultCount === 0) {
      return { 
        shouldStop: true, 
        reason: 'consecutive_empty_results' 
      };
    }

    // 계속 진행 (목표 미달성 + 다른 중단 조건 없음)
    const remaining = config.targetResults - pageData.currentResultCount;
    return { 
      shouldStop: false, 
      reason: `continue_search_need_${remaining}_more`
    };
  }

  /**
   * 📊 현재 통계 계산
   */
  calculateCurrentStats(pageData, config) {
    const apiUnitsUsed = pageData.pagesSearched * 109; // search(100) + videos(9) per page
    const successRate = pageData.totalProcessed > 0 
      ? (pageData.currentResultCount / pageData.totalProcessed * 100).toFixed(1) + '%'
      : '0%';
    
    const efficiency = apiUnitsUsed > 0
      ? (pageData.currentResultCount / apiUnitsUsed * 100).toFixed(2) + ' videos/100units'
      : '0';

    const targetAchievement = config.targetResults > 0
      ? (pageData.currentResultCount / config.targetResults * 100).toFixed(1) + '%'
      : '0%';

    const maxPossibleUnits = config.maxPages * 109; // 최대 3페이지 = 327 units

    return {
      targetAchievement,
      successRate,
      efficiency,
      apiUnitsUsed,
      maxPossibleUnits, // 최대 사용 가능 API units
      averageResultsPerPage: pageData.pagesSearched > 0 
        ? (pageData.currentResultCount / pageData.pagesSearched).toFixed(1) 
        : '0',
      recommendedAction: this.getRecommendedAction(pageData, config)
    };
  }

  /**
   * 💡 권장 액션 제안
   */
  getRecommendedAction(pageData, config) {
    const achievement = pageData.currentResultCount / config.targetResults;

    if (achievement >= 1.0) {
      return 'target_achieved'; // 40개 이상 달성
    } else if (achievement >= 0.8) {
      return 'nearly_complete'; // 32개 이상 (80% 이상)
    } else if (pageData.pagesSearched >= config.maxPages) {
      return 'max_pages_completed'; // 3페이지 완료
    } else if (!pageData.hasNextPageToken) {
      return 'no_more_pages'; // 더 이상 페이지 없음
    } else {
      return 'continue_to_max_pages'; // 3페이지까지 계속 진행
    }
  }

  /**
   * 🔄 고유 영상 병합 (유틸리티 함수)
   */
  mergeUniqueVideos(existingVideos, newVideos) {
    const existingIds = new Set(existingVideos.map(v => v.id));
    const uniqueNewVideos = newVideos.filter(v => !existingIds.has(v.id));
    
    return [...existingVideos, ...uniqueNewVideos];
  }

  /**
   * 📊 전체 통계 업데이트
   */
  updateGlobalStats(finalResults) {
    this.stats.totalPages += finalResults.pagesSearched || 0;
    this.stats.totalVideoIds += finalResults.totalProcessed || 0;
    this.stats.finalResults += finalResults.videos ? finalResults.videos.length : 0;
    this.stats.apiUnitsUsed += (finalResults.pagesSearched || 0) * 109;
    
    this.stats.successRate = this.stats.totalVideoIds > 0
      ? this.stats.finalResults / this.stats.totalVideoIds
      : 0;
    
    this.stats.efficiency = this.stats.apiUnitsUsed > 0
      ? this.stats.finalResults / this.stats.apiUnitsUsed
      : 0;
  }

  /**
   * 📊 전체 통계 조회
   */
  getGlobalStats() {
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
   * 🔧 설정 조회
   */
  getConfig() {
    return { ...this.defaultConfig };
  }

  /**
   * 🔧 설정 업데이트
   */
  updateConfig(newConfig) {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig };
    return this.defaultConfig;
  }
}

export default PaginationHandler;

/**
 * 🎯 편의 함수들
 */

// 전역 인스턴스 생성
function createPaginationHandler() {
  return new PaginationHandler();
}

/**
 * 🔄 페이지네이션 진행 여부 체크 (편의 함수)
 */
export function shouldContinuePagination(currentResults, config = {}) {
  const handler = createPaginationHandler();
  return handler.shouldContinuePagination(currentResults, config);
}

/**
 * 🔄 고유 영상 병합 (편의 함수)
 */
export function mergeUniqueVideos(existingVideos, newVideos) {
  const handler = createPaginationHandler();
  return handler.mergeUniqueVideos(existingVideos, newVideos);
}

/**
 * 📊 페이지네이션 통계 조회 (편의 함수)
 */
export function getPaginationStats() {
  const handler = createPaginationHandler();
  return handler.getGlobalStats();
} 