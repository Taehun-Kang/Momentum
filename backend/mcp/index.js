/**
 * 🤖 MCP 서버 인덱스 - YouTube Shorts AI 큐레이션
 * 
 * Express.js 백엔드에서 사용할 MCP 서버 래퍼
 */

const YouTubeShortsAIMCPServer = require('./correct-mcp-server.js').YouTubeShortsAIMCPServer;

class MCPServerWrapper {
  constructor() {
    this.mcpServer = null;
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🤖 MCP 서버 초기화 중...');
      
      // YouTubeShortsAIMCPServer 인스턴스 생성
      this.mcpServer = new YouTubeShortsAIMCPServer();
      
      // 서버 초기화 (transport 연결은 하지 않음)
      console.log('✅ MCP 서버 초기화 완료');
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ MCP 서버 초기화 실패:', error);
      this.isInitialized = false;
    }
  }

  /**
   * MCP 요청 처리
   */
  async handleRequest(request, sessionId) {
    if (!this.isInitialized || !this.mcpServer) {
      throw new Error('MCP 서버가 초기화되지 않았습니다.');
    }

    try {
      // JSON-RPC 2.0 요청 처리
      const { id, method, params } = request;

      switch (method) {
        case 'tools/list':
          return {
            jsonrpc: "2.0",
            id,
            result: {
              tools: this.getTools()
            }
          };

        case 'tools/call':
          const toolResult = await this.callTool(params.name, params.arguments);
          return {
            jsonrpc: "2.0",
            id,
            result: toolResult
          };

        case 'resources/list':
          return {
            jsonrpc: "2.0",
            id,
            result: {
              resources: this.getResources()
            }
          };

        case 'prompts/list':
          return {
            jsonrpc: "2.0",
            id,
            result: {
              prompts: this.getPrompts()
            }
          };

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            }
          };
      }

    } catch (error) {
      console.error('MCP 요청 처리 실패:', error);
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }

  /**
   * 사용 가능한 도구 목록 반환
   */
  getTools() {
    return [
      {
        name: "search_videos",
        description: "YouTube Shorts 검색 (2단계 필터링)"
      },
      {
        name: "get_trending_keywords",
        description: "실시간 트렌드 키워드 조회"
      },
      {
        name: "optimize_query",
        description: "Claude AI를 사용한 쿼리 최적화"
      },
      {
        name: "extract_related_keywords",
        description: "Bright Data를 통한 관련 키워드 추출"
      },
      {
        name: "get_server_stats",
        description: "서버 상태 및 통계 조회"
      }
    ];
  }

  /**
   * 도구 실행
   */
  async callTool(toolName, args) {
    console.log(`🛠️ MCP 도구 실행: ${toolName}`);

    try {
      switch (toolName) {
        case 'search_videos':
          return await this.mcpServer.searchYouTubeVideos(
            { query: args.query }, 
            args.maxResults || 10,
            args.nextPageToken
          );

        case 'get_trending_keywords':
          return await this.mcpServer.getBrightDataTrends(
            args.region || 'KR',
            args.category || 'entertainment',
            args.limit || 10
          );

        case 'optimize_query':
          return await this.mcpServer.optimizeSearchWithLLM(
            args.userMessage,
            args.context
          );

        case 'get_server_stats':
          return {
            server: "youtube-shorts-ai-curator",
            version: "1.0.0",
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
          };

        default:
          throw new Error(`알 수 없는 도구: ${toolName}`);
      }

    } catch (error) {
      console.error(`❌ 도구 ${toolName} 실행 실패:`, error);
      throw error;
    }
  }

  /**
   * 리소스 목록 반환
   */
  getResources() {
    return [
      {
        uri: "cache://searches",
        name: "cached-searches",
        description: "캐시된 검색 결과"
      },
      {
        uri: "trends://current",
        name: "trend-data", 
        description: "실시간 트렌드 데이터"
      },
      {
        uri: "reports://api-usage",
        name: "api-usage",
        description: "API 사용량 리포트"
      }
    ];
  }

  /**
   * 프롬프트 목록 반환
   */
  getPrompts() {
    return [
      {
        name: "optimize-search",
        description: "검색 최적화 프롬프트"
      },
      {
        name: "analyze-results",
        description: "결과 분석 프롬프트"
      },
      {
        name: "trend-recommendations",
        description: "트렌드 기반 추천 프롬프트"
      }
    ];
  }
}

// MCP 서버 인스턴스 생성 및 export
const mcpServer = new MCPServerWrapper();

module.exports = {
  mcpServer
}; 