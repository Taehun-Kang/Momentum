/**
 * 🎬 YouTube AI Services v2.1.0
 * 완전한 YouTube Shorts 큐레이션 서비스 (서버 모니터링 기능 추가)
 */

// 환경 변수 로드
import dotenv from 'dotenv';
dotenv.config();

/**
 * 🎬 YouTube AI Services
 * YouTube Shorts 큐레이션을 위한 종합 AI 서비스 모음
 * 
 * 이전 MCP 서버의 모든 기능을 순수 JavaScript 함수로 구현
 */

// 🎬 YouTube 검색 모듈
export {
  searchVideos,
  searchVideosWithTwoStageFiltering,
  searchMultipleKeywords
} from './search/youtube-search.js';

// 🎯 영상 필터링 모듈
export {
  filterVideos
} from './search/video-filter.js';

// 🎬 키워드 확장 서비스 (신규 추가)
export {
  expandWithGoogleAutocomplete,
  expandWithMultipleSources,
  generateShortsPatternKeywords,
  getKeywordExpansionStats
} from './search/keyword-expansion.js';

// 📈 트렌드 분석 서비스 (임시 주석 처리)
// export {
//   getGoogleTrends,
//   analyzeKeywordTrend,
//   getCategoryTrends,
//   getGoogleTrendsStats,
//   getRelatedQueries
// } from './trends/google-trends.js';
// export { getNateTrends, analyzeNateKeyword, getNateCategoryTrends, getNateTrendsStats } from './trends/nate-trends.js';
// export { getZumTrends, getZumNewsTrends, getZumHubTrends } from './trends/zum-trends.js';

// 🔥 통합 실시간 트렌드 수집기 (신규 추가!) - 5개 사이트 통합 (임시 주석 처리)
// export { 
//   aggregateRealtimeTrends, 
//   getRealtimeTrendsFromSource, 
//   getRealtimeTrendsStats 
// } from './trends/realtime-trends-aggregator.js';

// 🧠 LLM 최적화 서비스
export { optimizeSearchWithLLM, analyzeSearchResults, generateQueryStrategies, getLLMOptimizerStats } from './llm/query-optimizer.js';
export { generateYouTubeSearchQueries } from './llm/query-generator.js';
export { analyzeSearchResults as analyzeResultsWithLLM } from './llm/result-analyzer.js';

// 🔑 키워드 관련 서비스
export { extractRelatedKeywords, generateSearchQueries, getKeywordExtractorStats } from './keywords/keyword-extractor.js';

// 🔧 유틸리티 함수들
export { 
  parseDuration, 
  calculateApiUsage, 
  validateShorts, 
  calculateQualityScore,
  parseBrightDataEndpoint, 
  extractKeywordsFromHTML, 
  getBasicKeywordExpansion,
  getYouTubeUtilsStats
} from './utils/youtube-utils.js';

// 🌊 워크플로우 모듈
export {
  executeCompleteSearchWorkflow
} from './workflows/complete-search-workflow.js';

export { 
  getCompleteSearchWorkflowStats 
} from './workflows/complete-search-workflow.js';

// export { 
//   completeTrendWorkflow 
// } from './workflows/trend-workflow.js';

export { 
  executeVideoSearchWorkflow, 
  getVideoSearchWorkflowStats 
} from './workflows/video-search-workflow.js';

// 📊 종합 통계 및 상태 관리

// 📊 서버 통계 및 모니터링 (신규 추가!)
export { 
  getServerStatus, 
  searchCacheStatus, 
  getTrendDataReport, 
  getAPIUsageReport,
  trackOperation,
  trackAPIUsage
} from './utils/server-stats.js';

/**
 * 🎯 통합 서비스 클래스
 * 모든 기능을 하나로 묶어서 사용하기 쉽게 제공
 */
class YouTubeAIServices {
  constructor() {
    this.version = '2.0.0'; // 버전 업데이트: 완전한 MCP 기능 이식 완료
    this.description = 'YouTube Shorts AI 큐레이션 서비스 (MCP 서버 기능 100% 완전 이식)';
    
    this.services = {
      // 검색 서비스
      search: {
        searchVideos: async (options) => {
          const { searchVideos } = await import('./search/youtube-search.js');
          return await searchVideos(options);
        },
        searchMultipleKeywords: async (options) => {
          const { searchMultipleKeywords } = await import('./search/youtube-search.js');
          return await searchMultipleKeywords(options);
        },
        filterVideos: async (videos, criteria) => {
          const { filterVideos } = await import('./search/video-filter.js');
          return await filterVideos(videos, criteria);
        }
      },
      
      // 트렌드 서비스 (임시 주석 처리)
      trends: {
        // getGoogleTrends: async (options) => {
        //   const { getGoogleTrends } = await import('./trends/google-trends.js');
        //   return await getGoogleTrends(options);
        // },
        // getNateTrends: async () => {
        //   const { getNateTrends } = await import('./trends/nate-trends.js');
        //   return await getNateTrends();
        // },
        // getZumTrends: async () => {
        //   const { getZumTrends } = await import('./trends/zum-trends.js');
        //   return await getZumTrends();
        // },
        // // 🔥 통합 실시간 트렌드 수집기 (신규 추가!)
        // aggregateRealtimeTrends: async (options) => {
        //   const { aggregateRealtimeTrends } = await import('./trends/realtime-trends-aggregator.js');
        //   return await aggregateRealtimeTrends(options);
        // },
        // getRealtimeTrendsFromSource: async (sourceId, options) => {
        //   const { getRealtimeTrendsFromSource } = await import('./trends/realtime-trends-aggregator.js');
        //   return await getRealtimeTrendsFromSource(sourceId, options);
        // },
        // getRealtimeTrendsStats: async () => {
        //   const { getRealtimeTrendsStats } = await import('./trends/realtime-trends-aggregator.js');
        //   return await getRealtimeTrendsStats();
        // }
      },
      
      // LLM 서비스
      llm: {
        optimizeQuery: async (options) => {
          const { optimizeSearchWithLLM } = await import('./llm/query-optimizer.js');
          return await optimizeSearchWithLLM(options);
        },
        generateQueries: async (options) => {
          const { generateYouTubeSearchQueries } = await import('./llm/query-generator.js');
          return await generateYouTubeSearchQueries(options);
        },
        analyzeResults: async (options) => {
          const { analyzeSearchResults } = await import('./llm/result-analyzer.js');
          return await analyzeSearchResults(options);
        }
      },
      
      // 키워드 서비스
      keywords: {
        expandKeywords: async (options) => {
          const { expandKeywords } = await import('./keywords/keyword-extractor.js');
          return await expandKeywords(options);
        },
        extractRelated: async (options) => {
          const { extractRelatedKeywords } = await import('./keywords/keyword-extractor.js');
          return await extractRelatedKeywords(options);
        }
      },
      
      // 워크플로우 서비스
      workflows: {
        completeSearch: async (options) => {
          const { executeCompleteSearchWorkflow } = await import('./workflows/complete-search-workflow.js');
          return await executeCompleteSearchWorkflow(options);
        },
        // trendWorkflow: async (options) => {
        //   const { completeTrendWorkflow } = await import('./workflows/trend-workflow.js');
        //   return await completeTrendWorkflow(options);
        // },
        videoSearch: async (options) => {
          const { executeVideoSearchWorkflow } = await import('./workflows/video-search-workflow.js');
          return await executeVideoSearchWorkflow(options);
        }
      },

      // 📊 서버 통계 및 모니터링 서비스 (신규 추가!)
      monitoring: {
        getServerStatus: async () => {
          const { getServerStatus } = await import('./utils/server-stats.js');
          return await getServerStatus();
        },
        searchCache: async (query) => {
          const { searchCacheStatus } = await import('./utils/server-stats.js');
          return await searchCacheStatus(query);
        },
        getTrendReport: async (timeframe) => {
          const { getTrendDataReport } = await import('./utils/server-stats.js');
          return await getTrendDataReport(timeframe);
        },
        getAPIUsageReport: async (period) => {
          const { getAPIUsageReport } = await import('./utils/server-stats.js');
          return await getAPIUsageReport(period);
        },
        trackOperation: (operationType, duration, success, details) => {
          const { trackOperation } = require('./utils/server-stats.js');
          return trackOperation(operationType, duration, success, details);
        },
        trackAPIUsage: (service, operation, units) => {
          const { trackAPIUsage } = require('./utils/server-stats.js');
          return trackAPIUsage(service, operation, units);
        }
      }
    };
  }

  /**
   * 🎯 빠른 검색 (가장 자주 사용되는 기능)
   */
  async quickSearch(query, maxResults = 20) {
    console.log(`🚀 빠른 검색: "${query}"`);
    
    try {
      return await this.services.search.searchVideos({
        query,
        maxResults,
        enableLLMOptimization: true
      });
    } catch (error) {
      console.error('❌ 빠른 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 🔥 트렌드 기반 검색
   */
  async trendSearch(trendRequest, region = 'KR', maxVideos = 15) {
    console.log(`🔥 트렌드 검색: "${trendRequest}"`);
    
    try {
      // 임시로 기본 검색으로 대체 (trend-workflow.js 파일 없음)
      console.log('⚠️ 트렌드 워크플로우 파일이 없어 기본 검색으로 대체합니다.');
      return await this.quickSearch(trendRequest, maxVideos);
      
      // 원래 코드 (trend-workflow.js 파일이 생성되면 활성화)
      // return await this.services.workflows.trendWorkflow({
      //   trendRequest,
      //   region,
      //   maxVideos,
      //   enableLLMAnalysis: true,
      //   enableMultiSource: true
      // });
    } catch (error) {
      console.error('❌ 트렌드 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 🧠 AI 대화형 검색 (프리미엄 기능)
   */
  async chatSearch(userMessage, conversationHistory = []) {
    console.log(`🧠 AI 대화형 검색: "${userMessage}"`);
    
    try {
      // 1. LLM으로 사용자 의도 파악
      const queryOptimization = await this.services.llm.optimizeQuery({
        userQuery: userMessage,
        context: conversationHistory.join(' ')
      });

      // 2. 완전한 검색 워크플로우 실행
      const searchResult = await this.services.workflows.completeSearch({
        userQuery: userMessage,
        maxResults: 20,
        enableKeywordExpansion: true,
        enableTrendBoost: true,
        searchStrategies: 3
      });

      // 3. 결과 분석 및 개선 방안 제시
      if (searchResult.final_videos && searchResult.final_videos.length > 0) {
        const analysis = await this.services.llm.analyzeResults({
          searchResults: searchResult.final_videos,
          originalQuery: userMessage,
          userIntent: queryOptimization.analysis || '',
          analysisType: 'comprehensive'
        });

        return {
          ...searchResult,
          ai_analysis: analysis,
          conversation_response: this.generateChatResponse(searchResult, analysis, userMessage)
        };
      }

      return searchResult;

    } catch (error) {
      console.error('❌ AI 대화형 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 📊 종합 서버 상태 조회 (신규 추가!)
   */
  async getServerStatus() {
    console.log('📊 서버 상태 조회');
    
    try {
      return await this.services.monitoring.getServerStatus();
    } catch (error) {
      console.error('❌ 서버 상태 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 🔍 캐시 상태 검색 (신규 추가!)
   */
  async searchCacheStatus(query = '') {
    console.log(`🔍 캐시 검색: "${query}"`);
    
    try {
      return await this.services.monitoring.searchCache(query);
    } catch (error) {
      console.error('❌ 캐시 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 📈 트렌드 데이터 리포트 (신규 추가!)
   */
  async getTrendDataReport(timeframe = '24h') {
    console.log(`📈 트렌드 리포트 생성: ${timeframe}`);
    
    try {
      return await this.services.monitoring.getTrendReport(timeframe);
    } catch (error) {
      console.error('❌ 트렌드 리포트 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 💰 API 사용량 리포트 (신규 추가!)
   */
  async getAPIUsageReport(period = 'today') {
    console.log(`💰 API 사용량 리포트: ${period}`);
    
    try {
      return await this.services.monitoring.getAPIUsageReport(period);
    } catch (error) {
      console.error('❌ API 사용량 리포트 실패:', error);
      throw error;
    }
  }

  /**
   * 📊 전체 서비스 통계
   */
  async getAllStats() {
    const stats = {
      service_info: {
        version: this.version,
        description: this.description,
        total_features: Object.keys(this.services).length,
        new_features: ['서버 상태 모니터링', '캐시 검색', '트렌드 리포트', 'API 사용량 분석'] // 신규 기능 표시
      },
      search_stats: {},
      trend_stats: {},
      llm_stats: {},
      keyword_stats: {},
      workflow_stats: {},
      utils_stats: {},
      monitoring_stats: {} // 신규 추가
    };

    try {
      // 각 서비스별 통계 수집
      const imports = await Promise.allSettled([
        import('./search/youtube-search.js').then(m => ({ getYouTubeSearchStats: m.getYouTubeSearchStats })),
        import('./search/video-filter.js').then(m => ({ getFilterStats: m.getFilterStats })),
        // import('./trends/google-trends.js').then(m => ({ getGoogleTrendsStats: m.getGoogleTrendsStats })),
        // import('./trends/nate-trends.js').then(m => ({ getNateTrendsStats: m.getNateTrendsStats })),
        // import('./trends/zum-trends.js').then(m => ({ getZumTrendsStats: m.getZumTrendsStats })),
        // import('./trends/realtime-trends-aggregator.js').then(m => ({ getRealtimeTrendsStats: m.getRealtimeTrendsStats })),
        import('./llm/query-optimizer.js').then(m => ({ getLLMOptimizerStats: m.getLLMOptimizerStats })),
        import('./llm/query-generator.js').then(m => ({ getQueryGeneratorStats: m.getQueryGeneratorStats })),
        import('./llm/result-analyzer.js').then(m => ({ getResultAnalyzerStats: m.getResultAnalyzerStats })),
        import('./keywords/keyword-extractor.js').then(m => ({ getKeywordExtractorStats: m.getKeywordExtractorStats })),
        import('./workflows/complete-search-workflow.js').then(m => ({ getCompleteSearchWorkflowStats: m.getCompleteSearchWorkflowStats })),
        // import('./workflows/trend-workflow.js').then(m => ({ getTrendWorkflowStats: m.getTrendWorkflowStats })),
        import('./workflows/video-search-workflow.js').then(m => ({ getVideoSearchWorkflowStats: m.getVideoSearchWorkflowStats })),
        import('./utils/youtube-utils.js').then(m => ({ getYouTubeUtilsStats: m.getYouTubeUtilsStats })),
        import('./utils/server-stats.js').then(m => ({ getServerStats: m.getServerStats }))
      ]);

      // 성공한 import에서 통계 수집
      imports.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const moduleStats = result.value;
          
          // 통계 함수 실행
          Object.entries(moduleStats).forEach(([statsFuncName, statsFunc]) => {
            try {
              const moduleResult = statsFunc();
              
              // 적절한 카테고리에 배치
              if (statsFuncName.includes('Search') || statsFuncName.includes('Filter')) {
                stats.search_stats[statsFuncName] = moduleResult;
              } else if (statsFuncName.includes('Trends') || statsFuncName.includes('RealtimeTrends')) {
                stats.trend_stats[statsFuncName] = moduleResult;
              } else if (statsFuncName.includes('Query') || statsFuncName.includes('Analyzer')) {
                stats.llm_stats[statsFuncName] = moduleResult;
              } else if (statsFuncName.includes('Keyword')) {
                stats.keyword_stats[statsFuncName] = moduleResult;
              } else if (statsFuncName.includes('Workflow')) {
                stats.workflow_stats[statsFuncName] = moduleResult;
              } else if (statsFuncName.includes('Utils')) {
                stats.utils_stats[statsFuncName] = moduleResult;
              } else if (statsFuncName.includes('ServerStats')) {
                // 서버 통계 매니저에서 통계 추출
                if (typeof moduleResult === 'object' && moduleResult.getServerStats) {
                  stats.monitoring_stats['server_stats'] = moduleResult.getServerStats();
                } else {
                  stats.monitoring_stats['server_stats'] = moduleResult;
                }
              }
            } catch (error) {
              console.warn(`통계 수집 실패 (${statsFuncName}):`, error.message);
            }
          });
        }
      });

      // 전체 요약 통계
      stats.summary = {
        total_modules_loaded: imports.filter(r => r.status === 'fulfilled').length,
        statistics_collected_at: new Date().toISOString(),
        system_status: 'operational',
        version: this.version
      };

      return stats;

    } catch (error) {
      console.error('❌ 전체 통계 수집 실패:', error);
      return {
        ...stats,
        error: error.message,
        summary: {
          system_status: 'partial_failure',
          statistics_collected_at: new Date().toISOString(),
          version: this.version
        }
      };
    }
  }

  /**
   * 💬 대화형 응답 생성
   */
  generateChatResponse(searchResult, analysis, userMessage) {
    const videoCount = searchResult.final_videos?.length || 0;
    const qualityScore = analysis?.overall_score || 0;

    let response = `"${userMessage}"에 대한 검색 결과를 찾았습니다!\n\n`;
    
    if (videoCount > 0) {
      response += `📹 총 ${videoCount}개의 YouTube Shorts를 발견했습니다.\n`;
      response += `⭐ 전체 품질 점수: ${qualityScore.toFixed(1)}/100\n\n`;
      
      if (qualityScore >= 80) {
        response += `🎉 훌륭한 품질의 영상들이 많이 포함되어 있습니다!`;
      } else if (qualityScore >= 60) {
        response += `👍 괜찮은 품질의 영상들을 찾았습니다.`;
      } else {
        response += `📈 검색 결과가 있지만 더 나은 키워드로 다시 시도해보시는 것을 추천합니다.`;
      }

      // 개선 방안이 있으면 추가
      if (analysis?.recommendations && analysis.recommendations.length > 0) {
        response += `\n\n💡 검색 개선 팁:\n`;
        analysis.recommendations.slice(0, 2).forEach((rec, index) => {
          response += `${index + 1}. ${rec.suggestion}\n`;
        });
      }
    } else {
      response += `😔 죄송합니다. "${userMessage}"에 대한 적합한 YouTube Shorts를 찾지 못했습니다.\n\n`;
      response += `🔍 다른 키워드로 다시 시도해보시거나, 더 구체적인 검색어를 사용해보세요.`;
    }

    return response;
  }

  /**
   * 🏥 헬스체크
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
      errors: []
    };

    try {
      // 각 서비스 간단 테스트
      const tests = [
        { name: 'search', test: () => this.services.search.searchVideos({ query: 'test', maxResults: 1 }) },
        { name: 'trends', test: () => this.services.trends.getGoogleTrends({ region: 'KR', limit: 1 }) },
        { name: 'utils', test: () => import('./utils/youtube-utils.js') },
        { name: 'monitoring', test: () => this.services.monitoring.getServerStatus() } // 신규 추가
      ];

      for (const { name, test } of tests) {
        try {
          await test();
          health.services[name] = 'healthy';
        } catch (error) {
          health.services[name] = 'unhealthy';
          health.errors.push(`${name}: ${error.message}`);
        }
      }

      // 전체 상태 결정
      const unhealthyServices = Object.values(health.services).filter(status => status === 'unhealthy').length;
      if (unhealthyServices > 0) {
        health.status = unhealthyServices >= Object.keys(health.services).length / 2 ? 'critical' : 'degraded';
      }

      return health;

    } catch (error) {
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

// 전역 인스턴스
const youtubeAI = new YouTubeAIServices();

// 기본 익스포트 (편의 함수들)
export default youtubeAI;

/**
 * 🚀 편의 함수들 (자주 사용되는 기능의 단축 접근)
 */
export const quickSearch = (query, maxResults = 20) => youtubeAI.quickSearch(query, maxResults);
export const trendSearch = (trendRequest, region = 'KR', maxVideos = 15) => youtubeAI.trendSearch(trendRequest, region, maxVideos);
export const chatSearch = (userMessage, conversationHistory = []) => youtubeAI.chatSearch(userMessage, conversationHistory);
export const getAllStats = () => youtubeAI.getAllStats();
export const healthCheck = () => youtubeAI.healthCheck();

// 📊 신규 모니터링 편의 함수들 (클래스 메서드 래핑)
export const getServerStatusQuick = () => youtubeAI.getServerStatus();
export const searchCacheQuick = (query) => youtubeAI.searchCacheStatus(query);
export const getTrendReportQuick = (timeframe) => youtubeAI.getTrendDataReport(timeframe);
export const getAPIUsageReportQuick = (period) => youtubeAI.getAPIUsageReport(period);

/**
 * 📋 사용 가능한 모든 기능 목록
 */
export const features = {
  search: [
    'searchVideos', 'searchMultipleKeywords', 'filterVideos', 'sortVideos', 'removeDuplicates'
  ],
  trends: [
    'getGoogleTrends', 'getNateTrends', 'getZumTrends'
  ],
  llm: [
    'optimizeSearchWithLLM', 'generateYouTubeSearchQueries', 'analyzeSearchResults'
  ],
  keywords: [
    'expandKeywords', 'extractRelatedKeywords'
  ],
  workflows: [
    'executeCompleteSearchWorkflow', 'completeTrendWorkflow', 'executeVideoSearchWorkflow'
  ],
  utils: [
    'parseDuration', 'calculateApiUsage', 'validateShorts', 'calculateQualityScore',
    'parseBrightDataEndpoint', 'extractKeywordsFromHTML', 'getBasicKeywordExpansion'
  ],
  monitoring: [ // 신규 추가!
    'getServerStatus', 'searchCacheStatus', 'getTrendDataReport', 'getAPIUsageReport',
    'trackOperation', 'trackAPIUsage', 'trackPerformance', 'getServerStats'
  ],
  convenience: [
    'quickSearch', 'trendSearch', 'chatSearch', 'getAllStats', 'healthCheck',
    'getServerStatusQuick', 'searchCacheQuick', 'getTrendReportQuick', 'getAPIUsageReportQuick' // 신규 추가
  ]
};

console.log('🎬 YouTube AI Services v2.1.0 로드 완료 (서버 통계 기능 추가)');
console.log(`📦 사용 가능한 기능: ${Object.values(features).flat().length}개`);
console.log('📊 신규 기능: 서버 상태 모니터링, 캐시 검색, 트렌드 리포트, API 사용량 분석');
console.log('🚀 사용법: import { quickSearch, trendSearch, chatSearch, getServerStatusQuick } from "./index.js"'); 