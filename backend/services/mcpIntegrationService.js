const path = require('path');
// 새로운 MCP 통합 시스템 연결
const MomentumMCPClient = require('../../mcp-integration/clients/mcp-client/index.js');

/**
 * MCP 통합 서비스 - 업데이트됨
 * 최신 mcp-integration 시스템과 기존 백엔드를 연결
 * Wave Team
 */
class MCPIntegrationService {
  constructor() {
    this.mcpClient = null;
    this.isInitialized = false;
    this.connectionRetries = 0;
    this.maxRetries = 3;
    
    console.log('🔧 MCP 통합 서비스 초기화 시작 (최신 시스템)...');
  }

  /**
   * 최신 MCP 시스템과 연결
   * mcp-integration/servers/ 시스템 활용
   */
  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }

    try {
      console.log('🚀 최신 MCP 클라이언트 연결 시도...');
      console.log('📁 MCP 서버 경로: mcp-integration/servers/');
      
      // 최신 MCP 클라이언트 생성
      this.mcpClient = new MomentumMCPClient();
      
      // 모든 MCP 서버에 연결
      const connectionResult = await this.mcpClient.connectAll();
      
      if (connectionResult.success) {
        this.isInitialized = true;
        this.connectionRetries = 0;
        
        console.log('✅ 최신 MCP 통합 서비스 초기화 완료');
        console.log('📡 연결된 서버:', connectionResult.connectedServers);
        console.log('🎯 사용 가능한 도구들:');
        console.log('   - process_natural_language (자연어 분석)');
        console.log('   - intelligent_search_workflow (4단계 워크플로우)');
        console.log('   - expand_keyword (키워드 확장)');
        console.log('   - search_playable_shorts (2단계 필터링)');
        
        return {
          success: true,
          connectedServers: connectionResult.connectedServers,
          message: '최신 MCP 통합 서비스가 성공적으로 초기화되었습니다.',
          version: '2.0.0',
          features: [
            'Claude AI 자연어 분석',
            '4단계 자동 워크플로우', 
            '2단계 영상 필터링',
            '실시간 트렌드 분석'
          ]
        };
      } else {
        throw new Error('최신 MCP 서버 연결 실패');
      }

    } catch (error) {
      console.error('❌ 최신 MCP 통합 서비스 초기화 실패:', error);
      console.error('🔧 해결 방법: mcp-integration/servers/ 확인');
      
      this.connectionRetries++;
      
      if (this.connectionRetries < this.maxRetries) {
        console.log(`🔄 재연결 시도 ${this.connectionRetries}/${this.maxRetries}...`);
        
        // 10초 후 재시도 (더 긴 대기시간)
        setTimeout(async () => {
          await this.initialize();
        }, 10000);
      }
      
      return {
        success: false,
        error: error.message,
        retries: this.connectionRetries,
        troubleshooting: [
          'mcp-integration/servers/youtube-curator-mcp/ 폴더 확인',
          'npm install 실행 여부 확인',
          '.env 파일의 API 키 설정 확인'
        ]
      };
    }
  }

  /**
   * MCP 클라이언트 상태 확인
   */
  getStatus() {
    if (!this.isInitialized || !this.mcpClient) {
      return {
        initialized: false,
        connected: false,
        message: 'MCP 클라이언트가 초기화되지 않았습니다.'
      };
    }

    const connectionStatus = this.mcpClient.getConnectionStatus();
    
    return {
      initialized: this.isInitialized,
      connected: connectionStatus.allConnected,
      servers: connectionStatus,
      retries: this.connectionRetries,
      maxRetries: this.maxRetries
    };
  }

  /**
   * 연결 확인 및 자동 재연결
   */
  async ensureConnection() {
    if (!this.isInitialized || !this.mcpClient) {
      await this.initialize();
      return;
    }

    const status = this.mcpClient.getConnectionStatus();
    if (!status.allConnected) {
      console.log('🔄 MCP 연결이 끊어져 재연결 시도...');
      await this.initialize();
    }
  }

  // ==================== YouTube Curator 관련 메서드들 ====================

  /**
   * AI 기반 키워드 확장
   * @param {string} keyword - 확장할 키워드
   * @param {Object} options - 확장 옵션
   * @returns {Object} 확장된 키워드 데이터
   */
  async expandKeywordAI(keyword, options = {}) {
    await this.ensureConnection();
    
    try {
      return await this.mcpClient.expandKeyword(keyword, options);
    } catch (error) {
      console.error('AI 키워드 확장 실패:', error);
      throw error;
    }
  }

  /**
   * 최적화된 검색 쿼리 생성
   * @param {string} keyword - 검색 키워드
   * @param {string} strategy - 검색 전략
   * @param {number} maxResults - 최대 결과 수
   * @returns {Object} 최적화된 쿼리들
   */
  async buildOptimizedQueriesAI(keyword, strategy = 'auto', maxResults = 15) {
    await this.ensureConnection();
    
    try {
      return await this.mcpClient.buildOptimizedQueries(keyword, strategy, maxResults);
    } catch (error) {
      console.error('AI 쿼리 생성 실패:', error);
      throw error;
    }
  }

  /**
   * AI 기반 재생 가능한 Shorts 검색
   * @param {string} query - 검색 쿼리
   * @param {number} maxResults - 최대 결과 수
   * @param {Object} filters - 필터 옵션
   * @returns {Object} 검색 결과
   */
  async searchPlayableShortsAI(query, maxResults = 20, filters = {}) {
    await this.ensureConnection();
    
    try {
      return await this.mcpClient.searchPlayableShorts(query, maxResults, filters);
    } catch (error) {
      console.error('AI 영상 검색 실패:', error);
      throw error;
    }
  }

  /**
   * AI 기반 비디오 메타데이터 분석
   * @param {Array} videoIds - 분석할 비디오 ID 목록
   * @param {Object} criteria - 분석 기준
   * @returns {Object} 분석 결과
   */
  async analyzeVideoMetadataAI(videoIds, criteria = {}) {
    await this.ensureConnection();
    
    try {
      return await this.mcpClient.analyzeVideoMetadata(videoIds, criteria);
    } catch (error) {
      console.error('AI 비디오 분석 실패:', error);
      throw error;
    }
  }

  // ==================== User Analytics 관련 메서드들 ====================

  /**
   * AI 기반 인기 검색어 추출
   * @param {Object} options - 추출 옵션
   * @returns {Object} 인기 검색어 데이터
   */
  async getPopularKeywordsAI(options = {}) {
    await this.ensureConnection();
    
    try {
      return await this.mcpClient.getPopularKeywords(options);
    } catch (error) {
      console.error('AI 인기 검색어 추출 실패:', error);
      throw error;
    }
  }

  /**
   * AI 기반 사용자 패턴 분석
   * @param {string} userId - 사용자 ID
   * @param {string} timeRange - 분석 기간
   * @param {boolean} includeRecommendations - 추천 포함 여부
   * @returns {Object} 사용자 패턴 분석 결과
   */
  async analyzeUserPatternsAI(userId, timeRange = '30d', includeRecommendations = true) {
    await this.ensureConnection();
    
    try {
      return await this.mcpClient.analyzeUserPatterns(userId, timeRange, includeRecommendations);
    } catch (error) {
      console.error('AI 사용자 패턴 분석 실패:', error);
      throw error;
    }
  }

  /**
   * AI 기반 실시간 트렌드 분석
   * @param {number} timeWindow - 시간 윈도우
   * @param {boolean} detectSurging - 급상승 키워드 탐지 여부
   * @param {boolean} groupByTimeSlots - 시간대별 그룹화 여부
   * @returns {Object} 실시간 트렌드 데이터
   */
  async getRealtimeTrendsAI(timeWindow = 1, detectSurging = true, groupByTimeSlots = true) {
    await this.ensureConnection();
    
    try {
      return await this.mcpClient.getRealtimeTrends(timeWindow, detectSurging, groupByTimeSlots);
    } catch (error) {
      console.error('AI 실시간 트렌드 분석 실패:', error);
      throw error;
    }
  }

  /**
   * AI 기반 검색 활동 로깅
   * @param {string} userId - 사용자 ID
   * @param {string} searchQuery - 검색 쿼리
   * @param {Object} metadata - 메타데이터
   * @returns {Object} 로깅 결과
   */
  async logSearchActivityAI(userId, searchQuery, metadata = {}) {
    await this.ensureConnection();
    
    try {
      return await this.mcpClient.logSearchActivity(userId, searchQuery, metadata);
    } catch (error) {
      console.error('AI 검색 활동 로깅 실패:', error);
      throw error;
    }
  }

  /**
   * AI 기반 카테고리별 트렌드 분석
   * @param {Array} categories - 카테고리 목록
   * @param {string} timeRange - 시간 범위
   * @param {boolean} includeGrowthRate - 성장률 포함 여부
   * @returns {Object} 카테고리별 트렌드 데이터
   */
  async getCategoryTrendsAI(categories = [], timeRange = '24h', includeGrowthRate = true) {
    await this.ensureConnection();
    
    try {
      return await this.mcpClient.getCategoryTrends(categories, timeRange, includeGrowthRate);
    } catch (error) {
      console.error('AI 카테고리별 트렌드 분석 실패:', error);
      throw error;
    }
  }

  /**
   * AI 기반 트렌딩 키워드 예측
   * @param {string} predictionWindow - 예측 시간 윈도우
   * @param {number} limit - 예측 키워드 수
   * @param {number} confidenceThreshold - 신뢰도 임계값
   * @param {boolean} includeReasons - 근거 포함 여부
   * @returns {Object} 예측 결과
   */
  async predictTrendingKeywordsAI(predictionWindow = '6h', limit = 10, confidenceThreshold = 0.7, includeReasons = true) {
    await this.ensureConnection();
    
    try {
      return await this.mcpClient.predictTrendingKeywords(predictionWindow, limit, confidenceThreshold, includeReasons);
    } catch (error) {
      console.error('AI 트렌딩 키워드 예측 실패:', error);
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
  async executeAICurationWorkflow(keyword, userId = null) {
    await this.ensureConnection();
    
    try {
      console.log(`🤖 AI 큐레이션 워크플로우 실행: "${keyword}"`);
      
      const result = await this.mcpClient.aiCurationWorkflow(keyword, userId);
      
      console.log(`✅ AI 큐레이션 완료: ${result.finalResults.length}개 영상 추천`);
      
      return {
        success: true,
        data: result,
        performance: result.performance,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('AI 큐레이션 워크플로우 실패:', error);
      
      return {
        success: false,
        error: error.message,
        keyword,
        userId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 실시간 트렌드 기반 자동 큐레이션
   * @param {number} timeWindow - 분석 시간 윈도우
   * @param {number} topTrends - 상위 트렌드 수
   * @returns {Object} 트렌드 기반 큐레이션 결과
   */
  async executeTrendBasedCuration(timeWindow = 2, topTrends = 5) {
    await this.ensureConnection();
    
    try {
      console.log('📈 트렌드 기반 자동 큐레이션 실행...');
      
      const result = await this.mcpClient.trendBasedCuration(timeWindow, topTrends);
      
      console.log(`✅ 트렌드 큐레이션 완료: ${result.summary.totalVideos}개 영상`);
      
      return {
        success: true,
        data: result,
        summary: result.summary,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('트렌드 기반 큐레이션 실패:', error);
      
      return {
        success: false,
        error: error.message,
        timeWindow,
        topTrends,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 통합 검색 (기존 서비스 + AI 향상)
   * @param {string} keyword - 검색 키워드
   * @param {Object} options - 검색 옵션
   * @returns {Object} 향상된 검색 결과
   */
  async enhancedSearch(keyword, options = {}) {
    await this.ensureConnection();
    
    try {
      const {
        userTier = 'free',
        userId = null,
        enableAI = true,
        maxResults = 20
      } = options;

      console.log(`🔍 향상된 검색 실행: "${keyword}" (${userTier})`);

      let searchResult;

      if (enableAI && userTier === 'premium') {
        // 프리미엄 유저: 완전한 AI 워크플로우
        searchResult = await this.executeAICurationWorkflow(keyword, userId);
        
        return {
          success: true,
          searchType: 'ai_enhanced',
          query: keyword,
          userTier,
          videos: searchResult.data.finalResults,
          aiInsights: {
            expansion: searchResult.data.steps.expansion,
            strategies: searchResult.data.steps.queries.strategies,
            personalization: searchResult.data.steps.personalization
          },
          performance: searchResult.data.performance
        };

      } else if (enableAI && userTier === 'free') {
        // 무료 유저: 기본 AI 향상
        const expansion = await this.expandKeywordAI(keyword, { maxKeywords: 5 });
        const enhancedQuery = [keyword, ...expansion.expanded.slice(0, 2)].join(' | ');
        
        const videos = await this.searchPlayableShortsAI(enhancedQuery, maxResults);
        
        return {
          success: true,
          searchType: 'ai_basic',
          query: keyword,
          userTier,
          videos: videos.results || [],
          aiInsights: {
            expandedKeywords: expansion.expanded.slice(0, 5),
            suggestions: expansion.suggestions
          },
          performance: {
            totalResults: videos.totalResults || 0,
            filteringSuccess: videos.filteringSuccess || 0
          }
        };

      } else {
        // AI 비활성화: 기본 검색만
        return {
          success: false,
          message: 'AI가 비활성화되어 있습니다. 기존 검색 서비스를 사용하세요.',
          searchType: 'basic_only'
        };
      }

    } catch (error) {
      console.error('향상된 검색 실패:', error);
      
      return {
        success: false,
        error: error.message,
        query: keyword,
        searchType: 'failed'
      };
    }
  }

  /**
   * 서비스 종료 시 정리
   */
  async cleanup() {
    try {
      if (this.mcpClient && this.isInitialized) {
        console.log('🧹 MCP 통합 서비스 정리 중...');
        
        await this.mcpClient.disconnectAll();
        this.mcpClient = null;
        this.isInitialized = false;
        
        console.log('✅ MCP 통합 서비스 정리 완료');
      }
    } catch (error) {
      console.error('❌ MCP 통합 서비스 정리 실패:', error);
    }
  }
}

// 싱글톤 인스턴스 생성
const mcpIntegrationService = new MCPIntegrationService();

// 서버 시작 시 자동 초기화
setTimeout(async () => {
  await mcpIntegrationService.initialize();
}, 2000); // 2초 지연 후 초기화

// 프로세스 종료 시 정리
process.on('SIGTERM', async () => {
  await mcpIntegrationService.cleanup();
});

process.on('SIGINT', async () => {
  await mcpIntegrationService.cleanup();
});

module.exports = mcpIntegrationService; 