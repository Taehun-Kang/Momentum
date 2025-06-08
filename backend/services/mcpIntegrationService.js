const path = require('path');
const axios = require('axios');

/**
 * MCP 통합 서비스 - Railway Private Networking 기반
 * mcp-service.railway.internal과 HTTP 통신
 * Wave Team
 */
class MCPIntegrationService {
  constructor() {
    // Railway 내부 네트워킹 URL
    this.mcpServiceUrl = process.env.MCP_SERVICE_URL || 'http://mcp-service.railway.internal:8080';
    this.isInitialized = false;
    this.connectionRetries = 0;
    this.maxRetries = 3;
    this.mcpAvailable = false;
    
    console.log('🔧 MCP 통합 서비스 (Railway Networking) 초기화...');
    console.log(`📡 MCP Service URL: ${this.mcpServiceUrl}`);
    
    // 초기 연결 테스트
    this.testConnection();
  }

  /**
   * MCP 서비스와의 연결 테스트
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.mcpServiceUrl}/health`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Momentum-Backend/1.0.0'
        }
      });
      
      if (response.status === 200) {
        this.mcpAvailable = true;
        this.isInitialized = true;
        console.log('✅ MCP 서비스 연결 성공 (Railway Private Network)');
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('⚠️ MCP 서비스 연결 실패:', error.message);
      console.log('📝 MCP 기능이 비활성화됩니다. 기본 YouTube 검색만 사용 가능합니다.');
      
      this.mcpAvailable = false;
      this.isInitialized = true; // 폴백 모드로 초기화
    }
  }

  /**
   * MCP 서비스에 HTTP 요청 전송
   */
  async callMCPService(endpoint, method = 'POST', data = null) {
    if (!this.mcpAvailable) {
      throw new Error('MCP_NOT_AVAILABLE: MCP 서비스에 연결할 수 없습니다.');
    }

    try {
      const config = {
        method,
        url: `${this.mcpServiceUrl}${endpoint}`,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Momentum-Backend/1.0.0'
        }
      };

      if (data && method !== 'GET') {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;

    } catch (error) {
      console.error(`MCP 서비스 호출 실패 (${endpoint}):`, error.message);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.mcpAvailable = false;
        console.log('🔌 MCP 서비스와의 연결이 끊어졌습니다. 재연결 시도...');
        
        // 비동기 재연결 시도
        setTimeout(() => this.testConnection(), 5000);
      }
      
      throw error;
    }
  }

  /**
   * MCP 클라이언트 상태 확인
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      connected: this.mcpAvailable,
      serviceUrl: this.mcpServiceUrl,
      mode: this.mcpAvailable ? 'railway_networking' : 'fallback',
      message: this.mcpAvailable 
        ? 'MCP 서비스와 Railway Private Network로 연결됨'
        : 'MCP 서비스에 연결할 수 없습니다. 기본 검색 모드로 실행 중입니다.',
      availableFeatures: this.mcpAvailable 
        ? ['AI 자연어 검색', '4단계 워크플로우', '지능형 분석', 'MCP Tools']
        : ['기본 YouTube 검색', '캐시된 트렌드', '사용자 인증'],
      missingFeatures: this.mcpAvailable 
        ? []
        : ['AI 자연어 검색', '4단계 워크플로우', '지능형 분석']
    };
  }

  /**
   * 연결 확인 및 자동 재연결
   */
  async ensureConnection() {
    if (!this.mcpAvailable) {
      await this.testConnection();
      
      if (!this.mcpAvailable) {
        throw new Error('MCP_NOT_AVAILABLE');
      }
    }
    return true;
  }

  // ==================== MCP Tools 호출 메서드들 ====================

  /**
   * search_videos 도구 호출
   */
  async searchVideos(query, maxResults = 10, nextPageToken = null) {
    const data = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "search_videos",
        arguments: {
          query,
          maxResults,
          nextPageToken
        }
      }
    };

    const response = await this.callMCPService('/mcp', 'POST', data);
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result;
  }

  /**
   * get_trending_keywords 도구 호출
   */
  async getTrendingKeywords(region = 'KR', category = 'entertainment', limit = 10) {
    const data = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "get_trending_keywords",
        arguments: {
          region,
          category,
          limit
        }
      }
    };

    const response = await this.callMCPService('/mcp', 'POST', data);
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result;
  }

  /**
   * optimize_query 도구 호출 (Claude AI 자연어 처리)
   */
  async optimizeQuery(userMessage, context = null) {
    const data = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "optimize_query",
        arguments: {
          userMessage,
          context
        }
      }
    };

    const response = await this.callMCPService('/mcp', 'POST', data);
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result;
  }

  /**
   * get_server_stats 도구 호출
   */
  async getServerStats() {
    const data = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "get_server_stats",
        arguments: {}
      }
    };

    const response = await this.callMCPService('/mcp', 'POST', data);
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result;
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

    try {
      return await this.optimizeQuery(message, options);
    } catch (error) {
      console.error('키워드 추출 실패, 폴백 사용:', error);
      return await this.extractKeywords(message, options);
    }
  }

  // ==================== 통합 워크플로우 메서드들 ====================

  /**
   * 통합 검색 (Railway MCP Service 활용)
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

    try {
      await this.ensureConnection();

      if (enableAI && userTier === 'premium') {
        // 프리미엄 유저: 완전한 AI 워크플로우
        const optimized = await this.optimizeQuery(keyword, { userTier, userId });
        const videos = await this.searchVideos(optimized.optimizedQuery || keyword, maxResults);
        
        return {
          success: true,
          searchType: 'ai_enhanced',
          query: keyword,
          userTier,
          videos: videos.results || [],
          aiInsights: {
            optimizedQuery: optimized.optimizedQuery,
            keywords: optimized.keywords,
            intent: optimized.intent
          },
          performance: {
            totalResults: videos.totalResults || 0,
            responseTime: videos.responseTime || 0
          }
        };

      } else if (enableAI && userTier === 'free') {
        // 무료 유저: 기본 AI 향상
        const videos = await this.searchVideos(keyword, Math.min(maxResults, 10));
        
        return {
          success: true,
          searchType: 'ai_basic',
          query: keyword,
          userTier,
          videos: videos.results || [],
          performance: {
            totalResults: videos.totalResults || 0,
            responseTime: videos.responseTime || 0
          }
        };

      } else {
        // AI 비활성화
        return {
          success: false,
          message: 'AI가 비활성화되어 있습니다.',
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
      console.log('🧹 MCP 통합 서비스 정리 중...');
      
      this.mcpAvailable = false;
      this.isInitialized = false;
      
      console.log('✅ MCP 통합 서비스 정리 완료');
    } catch (error) {
      console.error('❌ MCP 통합 서비스 정리 실패:', error);
    }
  }
}

// MCP 통합 서비스 인스턴스 생성 및 export
const mcpIntegrationService = new MCPIntegrationService();

module.exports = mcpIntegrationService; 