#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Momentum MCP Client
 * YouTube Curator MCP와 User Analytics MCP 서버들을 통합하는 클라이언트
 * Wave Team
 */
class MomentumMCPClient {
  constructor() {
    this.clients = {
      youtubeCurator: null,
      userAnalytics: null
    };
    
    this.transports = {
      youtubeCurator: null,
      userAnalytics: null
    };

    this.isConnected = {
      youtubeCurator: false,
      userAnalytics: false
    };

    console.log('🚀 Momentum MCP Client 초기화 중...');
  }

  /**
   * 모든 MCP 서버에 연결
   */
  async connectAll() {
    try {
      console.log('📡 MCP 서버들에 연결 중...');
      
      // YouTube Curator MCP 연결
      await this.connectYouTubeCurator();
      
      // User Analytics MCP 연결
      await this.connectUserAnalytics();
      
      console.log('✅ 모든 MCP 서버 연결 완료');
      
      return {
        success: true,
        connectedServers: Object.keys(this.clients).filter(key => this.isConnected[key])
      };

    } catch (error) {
      console.error('❌ MCP 서버 연결 실패:', error);
      throw error;
    }
  }

  /**
   * YouTube Curator MCP 서버 연결
   */
  async connectYouTubeCurator() {
    try {
      const serverPath = path.join(__dirname, '../youtube-curator-mcp/index.js');
      
      this.transports.youtubeCurator = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
        env: {
          ...process.env,
          YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
          SERPAPI_KEY: process.env.SERPAPI_KEY
        }
      });

      this.clients.youtubeCurator = new Client({
        name: "momentum-youtube-curator-client",
        version: "1.0.0"
      }, {
        capabilities: {}
      });

      await this.clients.youtubeCurator.connect(this.transports.youtubeCurator);
      this.isConnected.youtubeCurator = true;
      
      console.log('🎬 YouTube Curator MCP 연결 완료');

    } catch (error) {
      console.error('❌ YouTube Curator MCP 연결 실패:', error);
      throw error;
    }
  }

  /**
   * User Analytics MCP 서버 연결
   */
  async connectUserAnalytics() {
    try {
      const serverPath = path.join(__dirname, '../user-analytics-mcp/index.js');
      
      this.transports.userAnalytics = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
        env: {
          ...process.env,
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });

      this.clients.userAnalytics = new Client({
        name: "momentum-user-analytics-client",
        version: "1.0.0"
      }, {
        capabilities: {}
      });

      await this.clients.userAnalytics.connect(this.transports.userAnalytics);
      this.isConnected.userAnalytics = true;
      
      console.log('📊 User Analytics MCP 연결 완료');

    } catch (error) {
      console.error('❌ User Analytics MCP 연결 실패:', error);
      throw error;
    }
  }

  // ==================== YouTube Curator MCP 메서드들 ====================

  /**
   * 키워드 확장
   * @param {string} keyword - 확장할 키워드
   * @param {Object} options - 옵션
   * @returns {Object} 확장된 키워드 데이터
   */
  async expandKeyword(keyword, options = {}) {
    if (!this.isConnected.youtubeCurator) {
      throw new Error('YouTube Curator MCP가 연결되지 않았습니다');
    }

    try {
      const result = await this.clients.youtubeCurator.callTool({
        name: "expand_keyword",
        arguments: {
          keyword,
          options
        }
      });

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('키워드 확장 실패:', error);
      throw error;
    }
  }

  /**
   * 최적화된 쿼리 생성
   * @param {string} keyword - 검색 키워드
   * @param {string} strategy - 검색 전략
   * @param {number} maxResults - 최대 결과 수
   * @returns {Object} 최적화된 쿼리들
   */
  async buildOptimizedQueries(keyword, strategy = 'auto', maxResults = 15) {
    if (!this.isConnected.youtubeCurator) {
      throw new Error('YouTube Curator MCP가 연결되지 않았습니다');
    }

    try {
      const result = await this.clients.youtubeCurator.callTool({
        name: "build_optimized_queries",
        arguments: {
          keyword,
          strategy,
          maxResults
        }
      });

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('쿼리 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 재생 가능한 Shorts 검색
   * @param {string} query - 검색 쿼리
   * @param {number} maxResults - 최대 결과 수
   * @param {Object} filters - 필터 옵션
   * @returns {Object} 검색 결과
   */
  async searchPlayableShorts(query, maxResults = 20, filters = {}) {
    if (!this.isConnected.youtubeCurator) {
      throw new Error('YouTube Curator MCP가 연결되지 않았습니다');
    }

    try {
      const result = await this.clients.youtubeCurator.callTool({
        name: "search_playable_shorts",
        arguments: {
          query,
          maxResults,
          filters
        }
      });

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('영상 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 비디오 메타데이터 분석
   * @param {Array} videoIds - 분석할 비디오 ID 목록
   * @param {Object} criteria - 분석 기준
   * @returns {Object} 분석 결과
   */
  async analyzeVideoMetadata(videoIds, criteria = {}) {
    if (!this.isConnected.youtubeCurator) {
      throw new Error('YouTube Curator MCP가 연결되지 않았습니다');
    }

    try {
      const result = await this.clients.youtubeCurator.callTool({
        name: "analyze_video_metadata",
        arguments: {
          videoIds,
          criteria
        }
      });

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('비디오 분석 실패:', error);
      throw error;
    }
  }

  // ==================== User Analytics MCP 메서드들 ====================

  /**
   * 인기 검색어 조회
   * @param {Object} options - 조회 옵션
   * @returns {Object} 인기 검색어 데이터
   */
  async getPopularKeywords(options = {}) {
    if (!this.isConnected.userAnalytics) {
      throw new Error('User Analytics MCP가 연결되지 않았습니다');
    }

    try {
      const result = await this.clients.userAnalytics.callTool({
        name: "get_popular_keywords",
        arguments: options
      });

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('인기 검색어 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 패턴 분석
   * @param {string} userId - 사용자 ID
   * @param {string} timeRange - 분석 기간
   * @param {boolean} includeRecommendations - 추천 포함 여부
   * @returns {Object} 사용자 패턴 분석 결과
   */
  async analyzeUserPatterns(userId, timeRange = '30d', includeRecommendations = true) {
    if (!this.isConnected.userAnalytics) {
      throw new Error('User Analytics MCP가 연결되지 않았습니다');
    }

    try {
      const result = await this.clients.userAnalytics.callTool({
        name: "analyze_user_patterns",
        arguments: {
          userId,
          timeRange,
          includeRecommendations
        }
      });

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('사용자 패턴 분석 실패:', error);
      throw error;
    }
  }

  /**
   * 실시간 트렌드 조회
   * @param {number} timeWindow - 시간 윈도우 (시간)
   * @param {boolean} detectSurging - 급상승 키워드 탐지 여부
   * @param {boolean} groupByTimeSlots - 시간대별 그룹화 여부
   * @returns {Object} 실시간 트렌드 데이터
   */
  async getRealtimeTrends(timeWindow = 1, detectSurging = true, groupByTimeSlots = true) {
    if (!this.isConnected.userAnalytics) {
      throw new Error('User Analytics MCP가 연결되지 않았습니다');
    }

    try {
      const result = await this.clients.userAnalytics.callTool({
        name: "get_realtime_trends",
        arguments: {
          timeWindow,
          detectSurging,
          groupByTimeSlots
        }
      });

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('실시간 트렌드 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 검색 활동 로깅
   * @param {string} userId - 사용자 ID
   * @param {string} searchQuery - 검색 쿼리
   * @param {Object} metadata - 메타데이터
   * @returns {Object} 로깅 결과
   */
  async logSearchActivity(userId, searchQuery, metadata = {}) {
    if (!this.isConnected.userAnalytics) {
      throw new Error('User Analytics MCP가 연결되지 않았습니다');
    }

    try {
      const result = await this.clients.userAnalytics.callTool({
        name: "log_search_activity",
        arguments: {
          userId,
          searchQuery,
          metadata
        }
      });

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('검색 활동 로깅 실패:', error);
      throw error;
    }
  }

  /**
   * 카테고리별 트렌드 조회
   * @param {Array} categories - 카테고리 목록
   * @param {string} timeRange - 시간 범위
   * @param {boolean} includeGrowthRate - 성장률 포함 여부
   * @returns {Object} 카테고리별 트렌드 데이터
   */
  async getCategoryTrends(categories = [], timeRange = '24h', includeGrowthRate = true) {
    if (!this.isConnected.userAnalytics) {
      throw new Error('User Analytics MCP가 연결되지 않았습니다');
    }

    try {
      const result = await this.clients.userAnalytics.callTool({
        name: "get_category_trends",
        arguments: {
          categories,
          timeRange,
          includeGrowthRate
        }
      });

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('카테고리별 트렌드 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 트렌딩 키워드 예측
   * @param {string} predictionWindow - 예측 시간 윈도우
   * @param {number} limit - 예측 키워드 수
   * @param {number} confidenceThreshold - 신뢰도 임계값
   * @param {boolean} includeReasons - 근거 포함 여부
   * @returns {Object} 예측 결과
   */
  async predictTrendingKeywords(predictionWindow = '6h', limit = 10, confidenceThreshold = 0.7, includeReasons = true) {
    if (!this.isConnected.userAnalytics) {
      throw new Error('User Analytics MCP가 연결되지 않았습니다');
    }

    try {
      const result = await this.clients.userAnalytics.callTool({
        name: "predict_trending_keywords",
        arguments: {
          predictionWindow,
          limit,
          confidenceThreshold,
          includeReasons
        }
      });

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('트렌딩 키워드 예측 실패:', error);
      throw error;
    }
  }

  // ==================== 통합 워크플로우 메서드들 ====================

  /**
   * 완전한 AI 큐레이션 워크플로우
   * @param {string} keyword - 초기 키워드
   * @param {string} userId - 사용자 ID (선택사항)
   * @returns {Object} 큐레이션 결과
   */
  async aiCurationWorkflow(keyword, userId = null) {
    try {
      console.log(`🤖 AI 큐레이션 워크플로우 시작: "${keyword}"`);
      
      // 1. 키워드 확장
      console.log('1️⃣ 키워드 확장 중...');
      const expansion = await this.expandKeyword(keyword, {
        includeChannels: true,
        includeTimeFilters: true,
        maxKeywords: 15
      });

      // 2. 최적화된 쿼리 생성
      console.log('2️⃣ 최적화된 쿼리 생성 중...');
      const queries = await this.buildOptimizedQueries(keyword, 'auto', 10);

      // 3. 다중 검색 실행
      console.log('3️⃣ 다중 검색 실행 중...');
      const searchPromises = queries.queries.slice(0, 3).map(query => 
        this.searchPlayableShorts(query.query, 10, {})
      );
      const searchResults = await Promise.all(searchPromises);

      // 4. 모든 비디오 ID 수집
      const allVideoIds = searchResults
        .flatMap(result => result.results || [])
        .map(video => video.id)
        .filter((id, index, self) => self.indexOf(id) === index) // 중복 제거
        .slice(0, 30); // 최대 30개

      // 5. 비디오 메타데이터 분석
      console.log('4️⃣ 비디오 메타데이터 분석 중...');
      const analysis = allVideoIds.length > 0 ? 
        await this.analyzeVideoMetadata(allVideoIds, {
          minViewCount: 1000,
          maxDuration: 60
        }) : { videos: [] };

      // 6. 사용자 패턴 기반 개인화 (사용자 ID가 있는 경우)
      let userPersonalization = null;
      if (userId) {
        console.log('5️⃣ 사용자 개인화 중...');
        try {
          userPersonalization = await this.analyzeUserPatterns(userId, '30d', true);
        } catch (error) {
          console.warn('사용자 패턴 분석 실패, 건너뜀:', error.message);
        }
      }

      // 7. 검색 활동 로깅
      if (userId) {
        await this.logSearchActivity(userId, keyword, {
          searchType: 'ai_curation',
          resultsCount: analysis.videos?.length || 0,
          responseTime: Date.now(),
          userTier: 'premium'
        });
      }

      // 8. 최종 결과 조합
      const finalResults = analysis.videos
        ?.filter(video => video.isRecommended)
        .slice(0, 15) || [];

      const result = {
        workflow: 'ai_curation',
        keyword,
        userId,
        steps: {
          expansion,
          queries: {
            totalQueries: queries.queries.length,
            strategies: queries.strategy,
            estimatedApiUnits: queries.estimatedApiUnits
          },
          searchResults: {
            totalVideosFound: allVideoIds.length,
            sourcesUsed: searchResults.length,
            playableVideos: searchResults.reduce((sum, r) => sum + (r.totalResults || 0), 0)
          },
          analysis: {
            totalAnalyzed: analysis.totalAnalyzed || 0,
            recommendedCount: analysis.recommendedCount || 0,
            averageScore: analysis.averageScore || 0
          },
          personalization: userPersonalization ? {
            userSearches: userPersonalization.patterns.totalSearches,
            favoriteCategories: userPersonalization.patterns.favoriteCategories,
            recommendations: userPersonalization.recommendations
          } : null
        },
        finalResults,
        performance: {
          totalVideosRecommended: finalResults.length,
          qualityScore: analysis.averageScore || 0,
          relevanceScore: this.calculateRelevanceScore(keyword, expansion, finalResults),
          processingTime: Date.now(),
          cacheHits: 0 // MCP 서버에서 확인 필요
        },
        timestamp: new Date().toISOString()
      };

      console.log(`✅ AI 큐레이션 완료: ${finalResults.length}개 영상 추천`);
      return result;

    } catch (error) {
      console.error('❌ AI 큐레이션 워크플로우 실패:', error);
      throw error;
    }
  }

  /**
   * 실시간 트렌드 기반 자동 큐레이션
   * @param {number} timeWindow - 분석 시간 윈도우
   * @param {number} topTrends - 상위 트렌드 수
   * @returns {Object} 트렌드 기반 큐레이션 결과
   */
  async trendBasedCuration(timeWindow = 2, topTrends = 5) {
    try {
      console.log('📈 트렌드 기반 큐레이션 시작...');

      // 1. 실시간 트렌드 조회
      const trends = await this.getRealtimeTrends(timeWindow, true, true);
      
      // 2. 인기 키워드 조회
      const popularKeywords = await this.getPopularKeywords({
        timeRange: `${timeWindow * 6}h`,
        limit: topTrends,
        excludeCommon: true
      });

      // 3. 각 트렌드 키워드에 대해 큐레이션 실행
      const trendCurations = [];
      
      for (const keyword of popularKeywords.keywords.slice(0, topTrends)) {
        try {
          console.log(`🔍 "${keyword.keyword}" 트렌드 큐레이션 중...`);
          
          const curation = await this.aiCurationWorkflow(keyword.keyword);
          trendCurations.push({
            keyword: keyword.keyword,
            trendScore: keyword.trendScore,
            category: keyword.category,
            curation: curation,
            videos: curation.finalResults.slice(0, 5) // 트렌드당 5개만
          });
          
        } catch (error) {
          console.error(`트렌드 "${keyword.keyword}" 큐레이션 실패:`, error.message);
        }
      }

      const result = {
        workflow: 'trend_based_curation',
        timeWindow: `${timeWindow}h`,
        trends,
        popularKeywords,
        trendCurations,
        summary: {
          totalTrends: trendCurations.length,
          totalVideos: trendCurations.reduce((sum, t) => sum + t.videos.length, 0),
          categories: [...new Set(trendCurations.map(t => t.category))],
          averageQuality: trendCurations.reduce((sum, t) => 
            sum + (t.curation.performance.qualityScore || 0), 0) / trendCurations.length
        },
        timestamp: new Date().toISOString()
      };

      console.log(`✅ 트렌드 기반 큐레이션 완료: ${result.summary.totalVideos}개 영상`);
      return result;

    } catch (error) {
      console.error('❌ 트렌드 기반 큐레이션 실패:', error);
      throw error;
    }
  }

  /**
   * 관련성 점수 계산
   */
  calculateRelevanceScore(originalKeyword, expansion, results) {
    if (!results || results.length === 0) return 0;
    
    const expandedKeywords = [originalKeyword, ...expansion.expanded];
    let totalScore = 0;
    
    results.forEach(video => {
      let videoScore = 0;
      const title = video.title?.toLowerCase() || '';
      
      expandedKeywords.forEach(keyword => {
        if (title.includes(keyword.toLowerCase())) {
          videoScore += 1;
        }
      });
      
      totalScore += videoScore / expandedKeywords.length;
    });
    
    return Math.round((totalScore / results.length) * 100) / 100;
  }

  /**
   * 연결 상태 확인
   */
  getConnectionStatus() {
    return {
      youtubeCurator: this.isConnected.youtubeCurator,
      userAnalytics: this.isConnected.userAnalytics,
      allConnected: this.isConnected.youtubeCurator && this.isConnected.userAnalytics
    };
  }

  /**
   * 모든 연결 해제
   */
  async disconnectAll() {
    try {
      console.log('🔌 MCP 연결 해제 중...');
      
      if (this.clients.youtubeCurator && this.isConnected.youtubeCurator) {
        await this.clients.youtubeCurator.close();
        this.isConnected.youtubeCurator = false;
      }
      
      if (this.clients.userAnalytics && this.isConnected.userAnalytics) {
        await this.clients.userAnalytics.close();
        this.isConnected.userAnalytics = false;
      }
      
      console.log('✅ 모든 MCP 연결 해제 완료');
      
    } catch (error) {
      console.error('❌ MCP 연결 해제 실패:', error);
    }
  }
}

// 사용 예시 (모듈로 사용할 때는 제거)
async function exampleUsage() {
  const client = new MomentumMCPClient();
  
  try {
    // 연결
    await client.connectAll();
    
    // AI 큐레이션 워크플로우 테스트
    const result = await client.aiCurationWorkflow('먹방', 'test-user-id');
    console.log('큐레이션 결과:', result.performance);
    
    // 트렌드 기반 큐레이션 테스트
    const trendResult = await client.trendBasedCuration(2, 3);
    console.log('트렌드 큐레이션 결과:', trendResult.summary);
    
  } catch (error) {
    console.error('예시 실행 실패:', error);
  } finally {
    await client.disconnectAll();
  }
}

// 직접 실행시에만 예시 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage();
}

export default MomentumMCPClient; 