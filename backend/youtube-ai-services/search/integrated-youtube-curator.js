/**
 * 🎯 YouTube Shorts 통합 큐레이터
 * 
 * 3단계 워크플로우를 통한 고품질 Shorts 큐레이션:
 * 1. 🔍 검색: YouTube API search.list 
 * 2. 🎬 필터링: videos.list + 고품질 필터링
 * 3. 📄 페이지네이션: 목표 40개 달성 또는 3페이지 제한
 * 
 * 사용법:
 * const curator = new IntegratedYouTubeCurator(apiKey);
 * const result = await curator.curateVideos("먹방");
 */

// dotenv로 환경 변수 로드
import 'dotenv/config';

import YoutubeSearchEngine from './modules/youtube-search-engine.js';
import VideoCompleteFilter from './modules/video-complete-filter.js';
import PaginationHandler from './modules/pagination-handler.js';

class IntegratedYouTubeCurator {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('❌ YouTube API 키가 필요합니다.');
    }
    
    // 독립적인 3개 모듈 초기화
    this.searchEngine = new YoutubeSearchEngine(apiKey);
    this.videoFilter = new VideoCompleteFilter(apiKey);
    this.paginationHandler = new PaginationHandler();
    
    // 통계 추적
    this.stats = {
      totalRequests: 0,
      successfulCurations: 0,
      totalApiUnits: 0,
      averageQuality: 0
    };
    
    console.log('🎯 YouTube Shorts 통합 큐레이터 초기화 완료');
  }

  /**
   * 🎯 메인 큐레이션 워크플로우
   * @param {string} keyword - 검색 키워드
   * @param {Object} options - 추가 옵션
   * @param {number} options.minViewCount - 최소 조회수 (기본값: 10000)
   * @param {number} options.minEngagementRate - 최소 참여도 (기본값: 0.01)
   * @param {number} options.minDuration - 최소 길이 (기본값: 10초)
   * @param {number} options.maxDuration - 최대 길이 (기본값: 90초)
   * @returns {Object} 큐레이션 결과
   */
  async curateVideos(keyword, options = {}) {
    console.log(`\n🎯 "${keyword}" 큐레이션 시작`);
    console.log('═'.repeat(60));
    
    const startTime = Date.now();
    this.stats.totalRequests++;
    
    const result = {
      keyword,
      success: false,
      videos: [],
      summary: {
        totalSearched: 0,
        totalFiltered: 0,
        finalCount: 0,
        pagesUsed: 0,
        apiCost: 0,
        processingTime: 0,
        averageViews: 0,
        averageEngagement: 0,
        qualityDistribution: {}
      },
      metadata: {
        targetAchieved: false,
        stopReason: '',
        efficiency: 0
      }
    };

    try {
      // 워크플로우 실행
      const workflowResult = await this.runSearchWorkflow(keyword, options);
      
      // 결과 통합
      result.success = workflowResult.success;
      result.videos = workflowResult.videos;
      result.summary = workflowResult.summary;
      result.metadata = workflowResult.metadata;
      
      // 처리 시간 계산
      const endTime = Date.now();
      result.summary.processingTime = endTime - startTime;
      
      // 통계 업데이트
      if (result.success) {
        this.stats.successfulCurations++;
        this.stats.totalApiUnits += result.summary.apiCost;
      }
      
      // 결과 출력
      this.printCurationResults(result);
      
      return result;
      
    } catch (error) {
      console.error('❌ 큐레이션 중 오류:', error.message);
      result.error = error.message;
      return result;
    }
  }

  /**
   * 🔄 검색 워크플로우 실행
   */
  async runSearchWorkflow(keyword, options = {}) {
    let allVideos = [];
    let allSearchItems = []; // 🎯 모든 페이지의 search.list items 축적
    let currentPage = 1;
    let nextPageToken = null;
    let totalSearched = 0;
    let totalApiCost = 0;
    let shouldContinue = true;

    // 필터링 기준 설정 (기본값: 10000, 0.01)
    const filterCriteria = {
      minViewCount: options.minViewCount || 10000,
      minEngagementRate: options.minEngagementRate || 0.01,
      minDuration: options.minDuration || 10,
      maxDuration: options.maxDuration || 90
    };

    console.log(`🔧 필터링 기준: 조회수 ${filterCriteria.minViewCount.toLocaleString()}+, 참여도 ${(filterCriteria.minEngagementRate * 100).toFixed(1)}%+`);

    // 페이지네이션 루프
    while (shouldContinue) {
      console.log(`\n📄 페이지 ${currentPage} 처리 중...`);
      
      // 1단계: 검색
      const searchResult = await this.executeSearch(keyword, nextPageToken, options);
      if (!searchResult.success) {
        break;
      }
      
      totalSearched += searchResult.count;
      totalApiCost += searchResult.apiCost;
      
      // 🎯 search.list items 축적
      allSearchItems.push(...searchResult.searchItems);
      
      // 2단계: 필터링 (검색 데이터와 함께 전달)
      const filterResult = await this.executeFiltering(
        searchResult.videoIds, 
        searchResult.searchItems, // 🎯 현재 페이지의 search items 전달
        filterCriteria
      );
      if (!filterResult.success) {
        break;
      }
      
      totalApiCost += filterResult.apiCost;
      allVideos.push(...filterResult.videos);
      
      // 3단계: 페이지네이션 결정
      const paginationData = {
        videos: allVideos,
        pagesSearched: currentPage,
        totalProcessed: totalSearched,
        hasNextPageToken: !!searchResult.nextPageToken
      };
      
      const paginationDecision = this.paginationHandler.shouldContinuePagination(paginationData);
      shouldContinue = paginationDecision.shouldContinue;
      
      console.log(`🎯 페이지네이션 결정: ${shouldContinue ? '계속' : '중단'} (${paginationDecision.reason})`);
      
      if (shouldContinue) {
        nextPageToken = searchResult.nextPageToken;
        currentPage++;
        // API 제한 고려한 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // 중단 이유 저장
        var stopReason = paginationDecision.reason;
        var targetAchieved = paginationDecision.reason.includes('target_achieved');
      }
    }

    // 품질 분석
    const qualityAnalysis = this.analyzeVideoQuality(allVideos);
    
    return {
      success: allVideos.length > 0,
      videos: allVideos,
      searchItems: allSearchItems, // 🎯 모든 search items 포함
      summary: {
        totalSearched,
        totalFiltered: allVideos.length,
        finalCount: allVideos.length,
        pagesUsed: currentPage,
        apiCost: totalApiCost,
        ...qualityAnalysis
      },
      metadata: {
        targetAchieved: targetAchieved || false,
        stopReason: stopReason || 'unknown',
        efficiency: totalApiCost > 0 ? (allVideos.length / totalApiCost * 100).toFixed(2) : 0
      }
    };
  }

  /**
   * 🔍 1단계: 검색 실행
   */
  async executeSearch(keyword, pageToken, options) {
    try {
      const searchParams = {
        maxResults: 50,
        pageToken: pageToken,
        ...options
      };
      
      const response = await this.searchEngine.searchByKeyword(keyword, searchParams);
      
      if (!response.success || !response.data.items?.length) {
        console.log('❌ 검색 결과 없음');
        return { success: false };
      }
      
      const videoIds = response.data.items.map(item => item.id.videoId);
      
      console.log(`🔍 검색 완료: ${videoIds.length}개 발견`);
      
      return {
        success: true,
        videoIds,
        searchItems: response.data.items,
        count: videoIds.length,
        nextPageToken: response.data.nextPageToken,
        apiCost: 100 // search.list 비용
      };
      
    } catch (error) {
      console.error('❌ 검색 실패:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🎬 2단계: 필터링 실행
   */
  async executeFiltering(videoIds, searchItems, filterCriteria = {}) {
    try {
      console.log(`🎬 필터링 시작: ${videoIds.length}개 영상`);
      
      const filterResult = await this.videoFilter.filterAndAnalyzeVideos(videoIds, searchItems, filterCriteria);
      
      if (!filterResult.success) {
        console.log('❌ 필터링 실패');
        return { success: false };
      }
      
      const qualityVideos = filterResult.videos || [];
      console.log(`✅ 필터링 완료: ${qualityVideos.length}개 고품질 영상`);
      
      return {
        success: true,
        videos: qualityVideos,
        apiCost: 9 // videos.list 비용
      };
      
    } catch (error) {
      console.error('❌ 필터링 실패:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📊 영상 품질 분석
   */
  analyzeVideoQuality(videos) {
    if (!videos.length) {
      return {
        averageViews: 0,
        averageEngagement: 0,
        qualityDistribution: {}
      };
    }

    try {
      // 평균 조회수 계산
      const totalViews = videos.reduce((sum, video) => {
        const views = parseInt(video.statistics?.viewCount || 0);
        return sum + views;
      }, 0);
      const averageViews = Math.round(totalViews / videos.length);
      
      // 평균 참여율 계산
      const engagements = videos.map(video => {
        return this.videoFilter.calculateEngagementRate(video);
      });
      const averageEngagement = engagements.reduce((sum, rate) => sum + rate, 0) / engagements.length;
      
      // 품질 분포 계산
      const qualityDistribution = this.calculateQualityDistribution(videos, engagements);
      
      return {
        averageViews,
        averageEngagement,
        qualityDistribution
      };
      
    } catch (error) {
      console.warn('⚠️ 품질 분석 중 오류:', error.message);
      return {
        averageViews: 0,
        averageEngagement: 0,
        qualityDistribution: {}
      };
    }
  }

  /**
   * 📊 품질 분포 계산
   */
  calculateQualityDistribution(videos, engagements) {
    const distribution = {
      premium: 0,    // 참여율 5%+
      high: 0,       // 참여율 3-5%
      medium: 0,     // 참여율 2-3%
      standard: 0    // 참여율 2% (최소 기준)
    };

    engagements.forEach(engagement => {
      if (engagement >= 0.05) distribution.premium++;
      else if (engagement >= 0.03) distribution.high++;
      else if (engagement >= 0.02) distribution.medium++;
      else distribution.standard++;
    });

    return distribution;
  }

  /**
   * 📊 큐레이션 결과 출력
   */
  printCurationResults(result) {
    console.log(`\n📊 "${result.keyword}" 큐레이션 결과`);
    console.log('═'.repeat(60));
    
    if (result.success) {
      const summary = result.summary;
      const metadata = result.metadata;
      
      console.log(`🎯 최종 결과: ${summary.finalCount}개 고품질 영상`);
      console.log(`📄 사용 페이지: ${summary.pagesUsed}페이지`);
      console.log(`💰 API 비용: ${summary.apiCost} units`);
      console.log(`⏱️ 처리 시간: ${summary.processingTime}ms`);
      console.log(`🎯 목표 달성: ${metadata.targetAchieved ? '✅ 달성' : '❌ 미달성'}`);
      console.log(`⛔ 중단 이유: ${metadata.stopReason}`);
      
      if (summary.finalCount > 0) {
        console.log(`\n📈 품질 지표:`);
        console.log(`  👀 평균 조회수: ${summary.averageViews.toLocaleString()}회`);
        console.log(`  💝 평균 참여율: ${(summary.averageEngagement * 100).toFixed(2)}%`);
        console.log(`  🚀 효율성: ${metadata.efficiency} 영상/100units`);
        
        // 품질 분포 출력
        if (summary.qualityDistribution) {
          const dist = summary.qualityDistribution;
          console.log(`\n🏆 품질 분포:`);
          console.log(`  💎 프리미엄 (5%+): ${dist.premium}개`);
          console.log(`  🔥 고품질 (3-5%): ${dist.high}개`);
          console.log(`  ⭐ 중품질 (2-3%): ${dist.medium}개`);
          console.log(`  ✅ 표준 (2%): ${dist.standard}개`);
        }
      }
      
      // 성공률 계산
      const successRate = summary.totalSearched > 0 
        ? (summary.finalCount / summary.totalSearched * 100).toFixed(1)
        : 0;
      console.log(`📊 전체 성공률: ${successRate}%`);
      
    } else {
      console.log('❌ 큐레이션 실패');
      if (result.error) {
        console.log(`💥 오류: ${result.error}`);
      }
    }
  }

  /**
   * 📊 전체 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulCurations / this.stats.totalRequests * 100).toFixed(1) + '%'
        : '0%',
      averageApiCost: this.stats.successfulCurations > 0
        ? Math.round(this.stats.totalApiUnits / this.stats.successfulCurations)
        : 0
    };
  }
}

// 🎯 편의 함수들

/**
 * 🚀 빠른 큐레이션 (편의 함수)
 * @param {string} keyword - 검색 키워드
 * @param {Object} options - 필터링 옵션 (minViewCount, minEngagementRate 등)
 * @param {string} apiKey - YouTube API 키 (옵션, 환경변수에서 자동 로드)
 * @returns {Object} 큐레이션 결과
 */
export async function quickCurate(keyword, options = {}, apiKey = null) {
  const key = apiKey || process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error('❌ YouTube API 키가 필요합니다. 환경변수 YOUTUBE_API_KEY를 설정하거나 직접 전달하세요.');
  }
  
  const curator = new IntegratedYouTubeCurator(key);
  return await curator.curateVideos(keyword, options);
}

/**
 * 🔄 배치 큐레이션 (여러 키워드)
 * @param {Array} keywordConfigs - 키워드와 옵션 배열 [{keyword: "먹방", options: {minViewCount: 50000}}, ...]
 * @param {string} apiKey - YouTube API 키
 * @returns {Array} 큐레이션 결과 배열
 */
export async function batchCurate(keywordConfigs, apiKey = null) {
  const key = apiKey || process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error('❌ YouTube API 키가 필요합니다.');
  }
  
  const curator = new IntegratedYouTubeCurator(key);
  const results = [];
  
  console.log(`🎯 배치 큐레이션 시작: ${keywordConfigs.length}개 키워드`);
  
  for (let i = 0; i < keywordConfigs.length; i++) {
    const config = keywordConfigs[i];
    const keyword = typeof config === 'string' ? config : config.keyword;
    const options = typeof config === 'object' ? config.options || {} : {};
    
    console.log(`\n🔄 진행률: ${i + 1}/${keywordConfigs.length} - "${keyword}"`);
    
    // 사용된 옵션 표시
    if (Object.keys(options).length > 0) {
      console.log(`🔧 커스텀 옵션:`, options);
    }
    
    try {
      const result = await curator.curateVideos(keyword, options);
      results.push(result);
    } catch (error) {
      console.error(`❌ "${keyword}" 큐레이션 실패:`, error.message);
      results.push({
        keyword,
        success: false,
        error: error.message
      });
    }
    
    // API 제한 고려한 대기
    if (i < keywordConfigs.length - 1) {
      console.log('⏳ 2초 대기...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // 배치 결과 요약
  console.log(`\n📊 배치 큐레이션 완료`);
  console.log(`✅ 성공: ${results.filter(r => r.success).length}개`);
  console.log(`❌ 실패: ${results.filter(r => !r.success).length}개`);
  
  return results;
}

export default IntegratedYouTubeCurator;

// CLI에서 직접 실행 가능
if (import.meta.url === `file://${process.argv[1]}`) {
  const keyword = process.argv[2];
  const minViewCount = process.argv[3] ? parseInt(process.argv[3]) : undefined;
  const minEngagementRate = process.argv[4] ? parseFloat(process.argv[4]) : undefined;
  
  if (!keyword) {
    console.log('사용법: node integrated-youtube-curator.js "검색키워드" [최소조회수] [최소참여도]');
    console.log('예시: node integrated-youtube-curator.js "먹방" 50000 0.02');
    console.log('     node integrated-youtube-curator.js "과학" 5000 0.01');
    process.exit(1);
  }
  
  const options = {};
  if (minViewCount !== undefined) options.minViewCount = minViewCount;
  if (minEngagementRate !== undefined) options.minEngagementRate = minEngagementRate;
  
  quickCurate(keyword, options)
    .then(result => {
      console.log('\n✅ 큐레이션 완료!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 실행 오류:', error.message);
      process.exit(1);
    });
} 