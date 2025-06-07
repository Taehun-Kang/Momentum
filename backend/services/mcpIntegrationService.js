const path = require('path');

// MCP 클라이언트 안전하게 로드 (backend/mcp 폴더에서)
let mcpClient = null;

try {
  // backend/mcp 폴더에서 통합 MCP 클라이언트 로드
  mcpClient = require('../mcp/index.js');
  console.log('✅ MCP 클라이언트 모듈 로드 성공 (backend/mcp)');
} catch (error) {
  console.log('⚠️ MCP 클라이언트 모듈을 찾을 수 없습니다:', error.message);
  console.log('📝 MCP 기능이 비활성화됩니다. 기본 YouTube 검색만 사용 가능합니다.');
  
  // 더미 클래스 생성 (에러 방지)
  mcpClient = {
    available: false,
    getStatus: () => ({ connected: false, available: false }),
    processNaturalLanguage: () => { throw new Error('MCP_NOT_AVAILABLE') },
    expandKeyword: () => { throw new Error('MCP_NOT_AVAILABLE') },
    buildOptimizedQueries: () => { throw new Error('MCP_NOT_AVAILABLE') },
    searchPlayableShorts: () => { throw new Error('MCP_NOT_AVAILABLE') },
    analyzeVideoMetadata: () => { throw new Error('MCP_NOT_AVAILABLE') },
    aiCurationWorkflow: () => { throw new Error('MCP_NOT_AVAILABLE') }
  };
}

/**
 * MCP 통합 서비스 - 업데이트됨 (backend/mcp 통합)
 * backend/mcp 시스템과 백엔드를 연결
 * Wave Team
 */
class MCPIntegrationService {
  constructor() {
    this.mcpClient = mcpClient;
    this.isInitialized = false;
    this.connectionRetries = 0;
    this.maxRetries = 3;
    this.mcpAvailable = mcpClient && mcpClient.available !== false;
    
    if (this.mcpAvailable) {
      console.log('🔧 MCP 통합 서비스 초기화 시작 (backend/mcp)...');
      this.isInitialized = true; // 통합 클라이언트는 즉시 사용 가능
    } else {
      console.log('🔧 MCP 통합 서비스 (기본 모드) - MCP 기능 비활성화');
      this.isInitialized = true;
    }
  }

  /**
   * backend/mcp 시스템과 연결
   * backend/mcp/servers/ 시스템 활용
   */
  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }

    // MCP 클라이언트가 사용 불가능한 경우
    if (!this.mcpAvailable) {
      console.log('⚠️ MCP 시스템 사용 불가 - 기본 검색 모드로 실행');
      this.isInitialized = true;
      
      return {
        success: false,
        mode: 'fallback',
        message: 'MCP 시스템을 사용할 수 없어 기본 모드로 실행됩니다.',
        availableFeatures: [
          '기본 YouTube 검색',
          '캐시된 트렌드 키워드',
          '사용자 인증'
        ],
        missingFeatures: [
          'AI 자연어 검색',
          '4단계 워크플로우',
          '지능형 키워드 확장'
        ]
      };
    }

    // 통합 MCP 클라이언트는 이미 초기화됨
    this.isInitialized = true;
    
    console.log('✅ MCP 통합 서비스 초기화 완료 (backend/mcp)');
    console.log('🎯 사용 가능한 도구들:');
    console.log('   - process_natural_language (자연어 분석)');
    console.log('   - intelligent_search_workflow (4단계 워크플로우)');
    console.log('   - expand_keyword (키워드 확장)');
    console.log('   - search_playable_shorts (2단계 필터링)');
    
    return {
      success: true,
      message: 'MCP 통합 서비스가 성공적으로 초기화되었습니다.',
      version: '2.1.0',
      features: [
        'Claude AI 자연어 분석',
        '4단계 자동 워크플로우', 
        '2단계 영상 필터링',
        '실시간 트렌드 분석'
      ]
    };
  }

  /**
   * MCP 클라이언트 상태 확인
   */
  getStatus() {
    if (!this.mcpAvailable) {
      return {
        initialized: true,
        connected: false,
        mode: 'fallback',
        message: 'MCP 클라이언트가 사용 불가능합니다. 기본 검색 모드로 실행 중입니다.',
        availableFeatures: ['기본 YouTube 검색', '캐시된 트렌드', '사용자 인증'],
        missingFeatures: ['AI 자연어 검색', '4단계 워크플로우', '지능형 분석']
      };
    }

    return this.mcpClient.getStatus();
  }

  /**
   * 연결 확인 및 자동 재연결
   */
  async ensureConnection() {
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE');
    }

    // 통합 클라이언트는 항상 연결됨
    return true;
  }

  // ==================== 안전한 폴백 메서드들 ====================

  /**
   * 안전한 키워드 추출 (MCP 없을 때 폴백)
   */
  async extractKeywords(message, options = {}) {
    if (!this.mcpAvailable) {
      // 간단한 키워드 추출 폴백
      const keywords = message
        .replace(/[^\w\s가-힣]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 1)
        .slice(0, 5);

      return {
        keywords,
        intent: 'general',
        confidence: 0.5,
        fallback: true
      };
    }

    return await this.mcpClient.processNaturalLanguage(message, options);
  }

  // ==================== YouTube Curator 관련 메서드들 ====================

  /**
   * AI 기반 키워드 확장
   * @param {string} keyword - 확장할 키워드
   * @param {Object} options - 확장 옵션
   * @returns {Object} 확장된 키워드 데이터
   */
  async expandKeywordAI(keyword, options = {}) {
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: AI 키워드 확장 기능을 사용할 수 없습니다.');
    }

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
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: AI 쿼리 최적화 기능을 사용할 수 없습니다.');
    }

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
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: AI 영상 검색 기능을 사용할 수 없습니다.');
    }

    try {
      return await this.mcpClient.searchPlayableShorts(query, maxResults, filters);
    } catch (error) {
      console.error('AI 영상 검색 실패:', error);
      throw error;
    }
  }

  /**
   * AI 기반 비디오 메타데이터 분석
   * @param {Array} videos - 분석할 비디오 목록
   * @param {Object} criteria - 분석 기준
   * @returns {Object} 분석 결과
   */
  async analyzeVideoMetadataAI(videos, criteria = {}) {
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: AI 비디오 분석 기능을 사용할 수 없습니다.');
    }

    try {
      return await this.mcpClient.analyzeVideoMetadata(videos, criteria);
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
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: AI 인기 검색어 분석 기능을 사용할 수 없습니다.');
    }

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
   * @param {Object} options - 분석 옵션
   * @returns {Object} 사용자 패턴 분석 결과
   */
  async analyzeUserPatternsAI(userId, options = {}) {
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: AI 사용자 패턴 분석 기능을 사용할 수 없습니다.');
    }

    try {
      return await this.mcpClient.analyzeUserPatterns(userId, options);
    } catch (error) {
      console.error('AI 사용자 패턴 분석 실패:', error);
      throw error;
    }
  }

  /**
   * AI 기반 실시간 트렌드 분석
   * @param {Object} options - 분석 옵션
   * @returns {Object} 실시간 트렌드 데이터
   */
  async getRealtimeTrendsAI(options = {}) {
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: AI 실시간 트렌드 분석 기능을 사용할 수 없습니다.');
    }

    try {
      return await this.mcpClient.getRealtimeTrends(options);
    } catch (error) {
      console.error('AI 실시간 트렌드 분석 실패:', error);
      throw error;
    }
  }

  /**
   * AI 기반 트렌딩 키워드 예측
   * @param {string} baseKeyword - 기준 키워드
   * @param {Object} options - 예측 옵션
   * @returns {Object} 예측 결과
   */
  async predictTrendingKeywordsAI(baseKeyword, options = {}) {
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: AI 트렌딩 키워드 예측 기능을 사용할 수 없습니다.');
    }

    try {
      return await this.mcpClient.predictTrendingKeywords(baseKeyword, options);
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
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: AI 큐레이션 워크플로우 기능을 사용할 수 없습니다.');
    }

    try {
      console.log(`🤖 AI 큐레이션 워크플로우 실행: "${keyword}"`);
      
      const result = await this.mcpClient.aiCurationWorkflow(keyword, userId);
      
      if (result.success) {
        console.log(`✅ AI 큐레이션 완료: ${result.data.finalResults.length}개 영상 추천`);
      }
      
      return result;

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
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: 트렌드 기반 큐레이션 기능을 사용할 수 없습니다.');
    }

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
    const {
      userTier = 'free',
      userId = null,
      enableAI = true,
      maxResults = 20
    } = options;

    console.log(`🔍 향상된 검색 실행: "${keyword}" (${userTier})`);

    if (!this.mcpAvailable || !enableAI) {
      // MCP 없이 기본 검색
      return {
        success: false,
        message: 'AI 기능을 사용할 수 없습니다. 기본 검색을 사용해주세요.',
        searchType: 'basic_fallback',
        fallbackUrl: '/api/v1/videos/search'
      };
    }

    await this.ensureConnection();
    
    try {
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
      if (this.mcpClient && this.isInitialized && this.mcpAvailable) {
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