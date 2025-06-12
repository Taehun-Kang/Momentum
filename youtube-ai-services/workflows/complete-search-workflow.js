/**
 * 🔄 완전한 검색 워크플로우
 * LLM 쿼리 최적화 → 키워드 확장 → YouTube 검색 → 필터링 → 결과 분석을 통합
 */

import QueryOptimizer from '../llm/query-optimizer.js';
import KeywordExtractor from '../keywords/keyword-extractor.js';
import YouTubeSearch from '../search/youtube-search.js';
import VideoFilter from '../search/video-filter.js';
import YouTubeUtils from '../utils/youtube-utils.js';

class CompleteSearchWorkflow {
  constructor(config = {}) {
    this.config = {
      youtubeApiKey: config.youtubeApiKey,
      claudeApiKey: config.claudeApiKey,
      brightDataApiKey: config.brightDataApiKey,
      brightDataEndpoint: config.brightDataEndpoint,
      ...config
    };

    // 모듈 인스턴스 초기화
    this.queryOptimizer = new QueryOptimizer(this.config.claudeApiKey);
    this.keywordExtractor = new KeywordExtractor({
      brightDataApiKey: this.config.brightDataApiKey,
      brightDataEndpoint: this.config.brightDataEndpoint
    });
    this.youtubeSearch = new YouTubeSearch(this.config.youtubeApiKey);
    this.videoFilter = new VideoFilter(this.config.youtubeApiKey);
    this.youtubeUtils = new YouTubeUtils();

    this.stats = {
      totalWorkflows: 0,
      successfulWorkflows: 0,
      failedWorkflows: 0,
      averageProcessingTime: 0,
      totalVideosProcessed: 0,
      totalAPIUnitsUsed: 0
    };
  }

  /**
   * 🚀 완전한 검색 워크플로우 실행
   */
  async executeCompleteSearchWorkflow(params) {
    const startTime = Date.now();
    this.stats.totalWorkflows++;

    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 완전한 검색 워크플로우 시작 [${workflowId}]`);
    console.log(`📝 입력: "${params.userQuery}"`);

    try {
      const result = {
        workflowId,
        userQuery: params.userQuery,
        steps: [],
        finalResults: [],
        metadata: {
          startTime: new Date(startTime).toISOString(),
          endTime: null,
          processingTimeMs: 0,
          totalAPIUnits: 0,
          stepsCompleted: 0,
          success: false
        }
      };

      // 1단계: LLM 쿼리 최적화
      console.log('\n🧠 1단계: LLM 쿼리 최적화...');
      const optimizationStep = await this.step1_OptimizeQuery(params);
      result.steps.push(optimizationStep);
      result.metadata.totalAPIUnits += optimizationStep.apiUnits || 0;

      // 2단계: 키워드 확장
      console.log('\n🔍 2단계: 키워드 확장...');
      const keywordStep = await this.step2_ExpandKeywords(optimizationStep.output);
      result.steps.push(keywordStep);
      result.metadata.totalAPIUnits += keywordStep.apiUnits || 0;

      // 3단계: 다중 검색 전략 실행
      console.log('\n🎯 3단계: 다중 검색 전략 실행...');
      const searchStep = await this.step3_ExecuteSearchStrategies(keywordStep.output, params);
      result.steps.push(searchStep);
      result.metadata.totalAPIUnits += searchStep.apiUnits || 0;

      // 4단계: 고급 필터링 및 품질 평가
      console.log('\n✨ 4단계: 고급 필터링 및 품질 평가...');
      const filterStep = await this.step4_AdvancedFiltering(searchStep.output, params);
      result.steps.push(filterStep);
      result.metadata.totalAPIUnits += filterStep.apiUnits || 0;

      // 5단계: 결과 분석 및 추천
      console.log('\n📊 5단계: 결과 분석 및 추천...');
      const analysisStep = await this.step5_AnalyzeResults(filterStep.output, params);
      result.steps.push(analysisStep);

      // 최종 결과 정리
      result.finalResults = filterStep.output.finalVideos || [];
      result.metadata.endTime = new Date().toISOString();
      result.metadata.processingTimeMs = Date.now() - startTime;
      result.metadata.stepsCompleted = result.steps.length;
      result.metadata.success = true;

      // 통계 업데이트
      this.updateStats(true, result.metadata.processingTimeMs, result.finalResults.length, result.metadata.totalAPIUnits);

      console.log(`\n🎉 워크플로우 완료! [${workflowId}]`);
      console.log(`📊 결과: ${result.finalResults.length}개 영상, ${result.metadata.totalAPIUnits} API units, ${result.metadata.processingTimeMs}ms`);

      return result;

    } catch (error) {
      console.error(`❌ 워크플로우 실패 [${workflowId}]:`, error);
      this.stats.failedWorkflows++;
      
      throw new Error(`Complete search workflow failed: ${error.message}`);
    }
  }

  /**
   * 🧠 1단계: LLM 쿼리 최적화
   */
  async step1_OptimizeQuery(params) {
    const stepStart = Date.now();
    
    try {
      const optimization = await this.queryOptimizer.optimizeSearchQuery(
        params.userQuery, 
        params.context || ''
      );

      // 검색 전략도 생성
      const strategies = await this.queryOptimizer.generateQueryStrategies(
        optimization.query,
        optimization.searchIntent,
        optimization.contentType,
        params.maxStrategies || 3
      );

      return {
        step: 1,
        name: 'LLM Query Optimization',
        processingTimeMs: Date.now() - stepStart,
        success: true,
        output: {
          originalQuery: params.userQuery,
          optimizedQuery: optimization.query,
          keywords: optimization.keywords,
          searchIntent: optimization.searchIntent,
          contentType: optimization.contentType,
          strategies: strategies.strategies,
          filters: optimization.filters
        },
        apiUnits: optimization.optimized ? 1 : 0, // Claude API 사용 시 추정
        metadata: {
          optimized: optimization.optimized,
          fallback: optimization.fallback || false
        }
      };

    } catch (error) {
      console.error('❌ 1단계 실패:', error);
      return {
        step: 1,
        name: 'LLM Query Optimization',
        processingTimeMs: Date.now() - stepStart,
        success: false,
        error: error.message,
        output: {
          originalQuery: params.userQuery,
          optimizedQuery: params.userQuery,
          keywords: [params.userQuery],
          searchIntent: 'general',
          contentType: 'mixed',
          strategies: []
        },
        apiUnits: 0
      };
    }
  }

  /**
   * 🔍 2단계: 키워드 확장
   */
  async step2_ExpandKeywords(optimizationOutput) {
    const stepStart = Date.now();
    
    try {
      const keywordExpansion = await this.keywordExtractor.extractRelatedKeywords(
        optimizationOutput.keywords,
        optimizationOutput.contentType,
        20
      );

      // 검색 쿼리 생성
      const searchQueries = this.keywordExtractor.generateSearchQueries(
        optimizationOutput.keywords,
        keywordExpansion.relatedKeywords.map(k => k.keyword)
      );

      return {
        step: 2,
        name: 'Keyword Expansion',
        processingTimeMs: Date.now() - stepStart,
        success: true,
        output: {
          baseKeywords: optimizationOutput.keywords,
          expandedKeywords: keywordExpansion.relatedKeywords,
          searchQueries: searchQueries,
          totalKeywords: keywordExpansion.finalCount,
          sources: keywordExpansion.sources
        },
        apiUnits: 0, // Bright Data API 사용량은 별도 계산
        metadata: {
          fallback: keywordExpansion.fallback || false,
          cacheHit: false // TODO: 캐시 히트 여부 추가
        }
      };

    } catch (error) {
      console.error('❌ 2단계 실패:', error);
      return {
        step: 2,
        name: 'Keyword Expansion', 
        processingTimeMs: Date.now() - stepStart,
        success: false,
        error: error.message,
        output: {
          baseKeywords: optimizationOutput.keywords,
          expandedKeywords: [],
          searchQueries: [optimizationOutput.optimizedQuery],
          totalKeywords: optimizationOutput.keywords.length
        },
        apiUnits: 0
      };
    }
  }

  /**
   * 🎯 3단계: 다중 검색 전략 실행
   */
  async step3_ExecuteSearchStrategies(keywordOutput, params) {
    const stepStart = Date.now();
    
    try {
      const allVideos = [];
      let totalAPIUnits = 0;
      const searchResults = [];

      // 다양한 검색 쿼리로 검색 실행
      const queries = keywordOutput.searchQueries.slice(0, params.maxQueries || 3);
      
      for (const query of queries) {
        try {
          console.log(`🔍 검색 실행: "${query}"`);
          
          const searchResult = await this.youtubeSearch.searchYouTubeVideos(
            { query },
            params.maxResultsPerQuery || 20
          );

          searchResults.push({
            query,
            videosFound: searchResult.videos.length,
            apiUnits: searchResult.apiUsage?.totalUnits || 109
          });

          allVideos.push(...searchResult.videos);
          totalAPIUnits += searchResult.apiUsage?.totalUnits || 109;

        } catch (error) {
          console.error(`검색 실패: "${query}"`, error.message);
          searchResults.push({
            query,
            videosFound: 0,
            apiUnits: 0,
            error: error.message
          });
        }
      }

      // 중복 제거
      const uniqueVideos = this.removeDuplicateVideos(allVideos);

      return {
        step: 3,
        name: 'Multi-Strategy Search',
        processingTimeMs: Date.now() - stepStart,
        success: true,
        output: {
          searchResults: searchResults,
          allVideos: uniqueVideos,
          totalFound: uniqueVideos.length,
          duplicatesRemoved: allVideos.length - uniqueVideos.length
        },
        apiUnits: totalAPIUnits,
        metadata: {
          queriesExecuted: queries.length,
          successfulQueries: searchResults.filter(r => !r.error).length
        }
      };

    } catch (error) {
      console.error('❌ 3단계 실패:', error);
      return {
        step: 3,
        name: 'Multi-Strategy Search',
        processingTimeMs: Date.now() - stepStart,
        success: false,
        error: error.message,
        output: {
          allVideos: [],
          totalFound: 0
        },
        apiUnits: 0
      };
    }
  }

  /**
   * ✨ 4단계: 고급 필터링 및 품질 평가
   */
  async step4_AdvancedFiltering(searchOutput, params) {
    const stepStart = Date.now();
    
    try {
      const videos = searchOutput.allVideos || [];
      
      if (videos.length === 0) {
        return {
          step: 4,
          name: 'Advanced Filtering',
          processingTimeMs: Date.now() - stepStart,
          success: true,
          output: {
            finalVideos: [],
            filteringStats: { noVideosToFilter: true }
          },
          apiUnits: 0
        };
      }

      // 재생 가능 여부 필터링 (이미 videos.list로 상세 정보 있음)
      const playableVideos = videos.filter(video => {
        const validation = this.youtubeUtils.isValidShort(video, params.strictMode !== false);
        return validation.valid;
      });

      // 품질 점수 계산 및 정렬
      const scoredVideos = playableVideos.map(video => {
        const qualityScore = this.youtubeUtils.calculateQualityScore(video);
        const stats = this.youtubeUtils.calculateVideoStats(video);
        const category = this.youtubeUtils.categorizeVideo(video);

        return {
          ...video,
          qualityScore,
          stats,
          category,
          url: `https://www.youtube.com/shorts/${video.id.videoId || video.id}`
        };
      });

      // 점수순 정렬 및 최종 선택
      const sortedVideos = scoredVideos.sort((a, b) => b.qualityScore - a.qualityScore);
      const finalVideos = sortedVideos.slice(0, params.maxResults || 20);

      const filteringStats = {
        originalCount: videos.length,
        playableCount: playableVideos.length,
        finalCount: finalVideos.length,
        playableRate: videos.length > 0 ? (playableVideos.length / videos.length * 100).toFixed(1) + '%' : '0%',
        averageQualityScore: finalVideos.length > 0 
          ? (finalVideos.reduce((sum, v) => sum + v.qualityScore, 0) / finalVideos.length).toFixed(1)
          : '0'
      };

      return {
        step: 4,
        name: 'Advanced Filtering',
        processingTimeMs: Date.now() - stepStart,
        success: true,
        output: {
          finalVideos: finalVideos,
          filteringStats: filteringStats
        },
        apiUnits: 0, // 필터링은 API 사용 없음
        metadata: {
          strictMode: params.strictMode !== false
        }
      };

    } catch (error) {
      console.error('❌ 4단계 실패:', error);
      return {
        step: 4,
        name: 'Advanced Filtering',
        processingTimeMs: Date.now() - stepStart,
        success: false,
        error: error.message,
        output: {
          finalVideos: [],
          filteringStats: { error: true }
        },
        apiUnits: 0
      };
    }
  }

  /**
   * 📊 5단계: 결과 분석 및 추천
   */
  async step5_AnalyzeResults(filterOutput, params) {
    const stepStart = Date.now();
    
    try {
      const videos = filterOutput.finalVideos || [];
      
      // LLM을 통한 결과 분석
      const analysis = await this.queryOptimizer.analyzeSearchResults(
        videos,
        params.userQuery
      );

      // 추가 통계 계산
      const statistics = this.calculateDetailedStatistics(videos);
      
      // 개선 제안 생성
      const recommendations = this.generateRecommendations(videos, filterOutput.filteringStats, params);

      return {
        step: 5,
        name: 'Result Analysis',
        processingTimeMs: Date.now() - stepStart,
        success: true,
        output: {
          analysis: analysis,
          statistics: statistics,
          recommendations: recommendations,
          summary: {
            totalResults: videos.length,
            topCategories: statistics.topCategories,
            averageQualityScore: statistics.averageQualityScore,
            overallAssessment: analysis.overallAssessment
          }
        },
        apiUnits: analysis.analyzed ? 1 : 0, // Claude API 사용 시 추정
        metadata: {
          analysisMethod: analysis.analyzed ? 'llm' : 'fallback'
        }
      };

    } catch (error) {
      console.error('❌ 5단계 실패:', error);
      return {
        step: 5,
        name: 'Result Analysis',
        processingTimeMs: Date.now() - stepStart,
        success: false,
        error: error.message,
        output: {
          analysis: { error: true },
          statistics: {},
          recommendations: []
        },
        apiUnits: 0
      };
    }
  }

  /**
   * 🔄 중복 영상 제거
   */
  removeDuplicateVideos(videos) {
    const seen = new Set();
    return videos.filter(video => {
      const videoId = video.id?.videoId || video.id;
      if (seen.has(videoId)) {
        return false;
      }
      seen.add(videoId);
      return true;
    });
  }

  /**
   * 📊 상세 통계 계산
   */
  calculateDetailedStatistics(videos) {
    if (videos.length === 0) {
      return {
        totalVideos: 0,
        averageQualityScore: 0,
        topCategories: [],
        durationDistribution: {},
        viewCountDistribution: {}
      };
    }

    const qualityScores = videos.map(v => v.qualityScore || 0);
    const categories = videos.map(v => v.category?.categoryName || '기타');
    const durations = videos.map(v => v.stats?.duration || 0);
    const viewCounts = videos.map(v => v.stats?.viewCount || 0);

    // 카테고리 분포
    const categoryCount = {};
    categories.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // 길이 분포
    const durationRanges = {
      '5-15초': durations.filter(d => d >= 5 && d <= 15).length,
      '16-30초': durations.filter(d => d >= 16 && d <= 30).length,
      '31-45초': durations.filter(d => d >= 31 && d <= 45).length,
      '46-60초': durations.filter(d => d >= 46 && d <= 60).length
    };

    // 조회수 분포
    const viewRanges = {
      '1K 미만': viewCounts.filter(v => v < 1000).length,
      '1K-10K': viewCounts.filter(v => v >= 1000 && v < 10000).length,
      '10K-100K': viewCounts.filter(v => v >= 10000 && v < 100000).length,
      '100K-1M': viewCounts.filter(v => v >= 100000 && v < 1000000).length,
      '1M+': viewCounts.filter(v => v >= 1000000).length
    };

    return {
      totalVideos: videos.length,
      averageQualityScore: (qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length).toFixed(1),
      topCategories,
      durationDistribution: durationRanges,
      viewCountDistribution: viewRanges,
      averageDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) + '초',
      averageViews: Math.round(viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length).toLocaleString()
    };
  }

  /**
   * 💡 개선 제안 생성
   */
  generateRecommendations(videos, filteringStats, params) {
    const recommendations = [];

    // 결과 수 기반 제안
    if (videos.length < 5) {
      recommendations.push({
        type: 'low_results',
        message: '검색 결과가 적습니다. 더 일반적인 키워드를 사용해보세요.',
        action: 'broaden_search'
      });
    } else if (videos.length > 50) {
      recommendations.push({
        type: 'too_many_results',
        message: '검색 결과가 많습니다. 더 구체적인 키워드를 사용해보세요.',
        action: 'narrow_search'
      });
    }

    // 필터링 성공률 기반 제안
    if (filteringStats.playableRate && parseFloat(filteringStats.playableRate) < 50) {
      recommendations.push({
        type: 'low_playable_rate',
        message: '재생 가능한 영상 비율이 낮습니다. 다른 키워드를 시도해보세요.',
        action: 'try_different_keywords'
      });
    }

    // 품질 점수 기반 제안
    const avgQuality = parseFloat(filteringStats.averageQualityScore || 0);
    if (avgQuality < 50) {
      recommendations.push({
        type: 'low_quality',
        message: '평균 품질 점수가 낮습니다. 인기순 정렬을 시도해보세요.',
        action: 'try_popularity_sort'
      });
    }

    // API 사용량 기반 제안
    if (params.conserveAPI) {
      recommendations.push({
        type: 'api_conservation',
        message: 'API 절약 모드가 활성화되어 있습니다. 캐시된 결과를 우선 사용합니다.',
        action: 'use_cached_results'
      });
    }

    return recommendations;
  }

  /**
   * 📊 통계 업데이트
   */
  updateStats(success, processingTime, videosProcessed, apiUnits) {
    if (success) {
      this.stats.successfulWorkflows++;
    } else {
      this.stats.failedWorkflows++;
    }

    this.stats.totalVideosProcessed += videosProcessed;
    this.stats.totalAPIUnitsUsed += apiUnits;

    // 평균 처리 시간 업데이트
    const totalWorkflows = this.stats.successfulWorkflows + this.stats.failedWorkflows;
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (totalWorkflows - 1) + processingTime) / totalWorkflows;
  }

  /**
   * 📊 워크플로우 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalWorkflows > 0 
        ? (this.stats.successfulWorkflows / this.stats.totalWorkflows * 100).toFixed(1) + '%'
        : '0%',
      averageVideosPerWorkflow: this.stats.successfulWorkflows > 0
        ? (this.stats.totalVideosProcessed / this.stats.successfulWorkflows).toFixed(1)
        : '0',
      averageAPIUnitsPerWorkflow: this.stats.successfulWorkflows > 0
        ? (this.stats.totalAPIUnitsUsed / this.stats.successfulWorkflows).toFixed(1)
        : '0',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 🔧 설정 업데이트
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // 각 모듈의 설정도 업데이트
    if (newConfig.claudeApiKey) {
      this.queryOptimizer.updateConfig(newConfig.claudeApiKey);
    }
    
    if (newConfig.brightDataApiKey || newConfig.brightDataEndpoint) {
      this.keywordExtractor.updateConfig({
        brightDataApiKey: newConfig.brightDataApiKey,
        brightDataEndpoint: newConfig.brightDataEndpoint
      });
    }

    console.log('✅ 완전한 검색 워크플로우 설정 업데이트 완료');
  }
}

export default CompleteSearchWorkflow;

/**
 * 🎯 편의 함수들 - 직접 사용 가능
 */

// 전역 인스턴스 생성 함수
function createCompleteSearchWorkflow() {
  const config = {
    claudeApiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    brightDataApiKey: process.env.BRIGHT_DATA_API_KEY,
    brightDataEndpoint: process.env.BRIGHT_DATA_ENDPOINT
  };
  return new CompleteSearchWorkflow(config);
}

/**
 * 🔄 완전한 검색 워크플로우 실행 (편의 함수)
 */
export async function executeCompleteSearchWorkflow(params) {
  const workflow = createCompleteSearchWorkflow();
  return await workflow.executeCompleteSearchWorkflow(params);
}

/**
 * 📊 완전한 검색 워크플로우 통계 조회 (편의 함수)
 */
export function getCompleteSearchWorkflowStats() {
  const workflow = createCompleteSearchWorkflow();
  return workflow.getStats();
} 