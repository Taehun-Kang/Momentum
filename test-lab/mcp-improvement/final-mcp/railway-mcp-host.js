/**
 * 🚀 Railway MCP Host - YouTube Shorts AI 큐레이션
 * 
 * Railway 서버에서 MCP Host 역할을 하며 Claude API와 통합
 */

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

/**
 * 🤖 Railway MCP Host 서버
 * 
 * 기능:
 * - MCP Client로 MCP 서버와 통신
 * - Claude API를 사용한 자연어 처리
 * - Express.js REST API 제공
 * - 프론트엔드와 MCP 서버 사이의 브릿지 역할
 */
class RailwayMCPHost {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    
    // API 클라이언트 초기화
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    // MCP 클라이언트들
    this.mcpClients = new Map();
    this.availableTools = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 🔧 Express 미들웨어 설정
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // 로깅 미들웨어
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * 🛣️ API 라우트 설정
   */
  setupRoutes() {
    // 헬스 체크
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        connectedServers: Array.from(this.mcpClients.keys()),
        availableTools: Array.from(this.availableTools.keys())
      });
    });

    // MCP 서버 연결
    this.app.post('/mcp/connect', async (req, res) => {
      try {
        const { serverName, url, transport = 'streamable-http' } = req.body;
        
        if (!serverName || !url) {
          return res.status(400).json({
            error: 'serverName과 url이 필요합니다'
          });
        }

        await this.connectToMCPServer(serverName, url, transport);
        
        res.json({
          success: true,
          message: `${serverName} MCP 서버에 연결되었습니다`,
          connectedServers: Array.from(this.mcpClients.keys())
        });
      } catch (error) {
        console.error('MCP 서버 연결 실패:', error);
        res.status(500).json({
          error: '서버 연결 실패',
          details: error.message
        });
      }
    });

    // 사용 가능한 도구 목록
    this.app.get('/mcp/tools', async (req, res) => {
      try {
        const allTools = {};
        
        for (const [serverName, client] of this.mcpClients) {
          try {
            const tools = await client.listTools();
            allTools[serverName] = tools.tools || [];
          } catch (error) {
            console.error(`${serverName} 도구 목록 조회 실패:`, error);
            allTools[serverName] = [];
          }
        }

        res.json({
          success: true,
          tools: allTools,
          totalServers: this.mcpClients.size
        });
      } catch (error) {
        console.error('도구 목록 조회 실패:', error);
        res.status(500).json({
          error: '도구 목록 조회 실패',
          details: error.message
        });
      }
    });

    // 🎬 YouTube Shorts 검색 (메인 API)
    this.app.post('/api/search', async (req, res) => {
      try {
        const { query, options = {} } = req.body;
        
        if (!query) {
          return res.status(400).json({
            error: 'query가 필요합니다'
          });
        }

        console.log(`🔍 검색 요청: "${query}"`);
        
        // 1단계: Claude API로 자연어 쿼리 분석
        const optimizedQuery = await this.optimizeQueryWithClaude(query);
        
        // 2단계: MCP 서버를 통해 YouTube 영상 검색
        const searchResults = await this.searchVideosWithMCP(optimizedQuery, options);
        
        // 3단계: 결과 반환
        res.json({
          success: true,
          originalQuery: query,
          optimizedQuery,
          results: searchResults,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('검색 실패:', error);
        res.status(500).json({
          error: '검색 실패',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // 🔥 대화형 AI 검색 (프리미엄 기능)
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { message, conversationHistory = [] } = req.body;
        
        if (!message) {
          return res.status(400).json({
            error: 'message가 필요합니다'
          });
        }

        console.log(`💬 대화형 검색: "${message}"`);
        
        // Claude API를 사용한 대화형 처리
        const response = await this.handleChatWithMCP(message, conversationHistory);
        
        res.json({
          success: true,
          response,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('대화형 검색 실패:', error);
        res.status(500).json({
          error: '대화형 검색 실패',
          details: error.message
        });
      }
    });

    // 📈 트렌드 키워드 조회
    this.app.get('/api/trends', async (req, res) => {
      try {
        const { region = 'KR', category = 'entertainment' } = req.query;
        
        console.log(`📈 트렌드 조회: ${region}/${category}`);
        
        const trends = await this.getTrendsWithMCP(region, category);
        
        res.json({
          success: true,
          trends,
          region,
          category,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('트렌드 조회 실패:', error);
        res.status(500).json({
          error: '트렌드 조회 실패',
          details: error.message
        });
      }
    });

    // 404 핸들러
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'API 엔드포인트를 찾을 수 없습니다',
        path: req.originalUrl,
        availableEndpoints: [
          'GET /health',
          'POST /mcp/connect',
          'GET /mcp/tools',
          'POST /api/search',
          'POST /api/chat',
          'GET /api/trends'
        ]
      });
    });
  }

  /**
   * 🔌 MCP 서버 연결
   */
  async connectToMCPServer(serverName, url, transportType = 'streamable-http') {
    try {
      console.log(`🔌 ${serverName} MCP 서버 연결 중... (${transportType})`);
      
      // MCP 클라이언트 생성
      const client = new Client({
        name: 'railway-mcp-host',
        version: '1.0.0'
      });

      // 트랜스포트 선택
      let transport;
      if (transportType === 'streamable-http') {
        transport = new StreamableHTTPClientTransport(new URL(url));
      } else if (transportType === 'sse') {
        transport = new SSEClientTransport(new URL(url));
      } else {
        throw new Error(`지원하지 않는 트랜스포트: ${transportType}`);
      }

      // 연결
      await client.connect(transport);
      
      // 클라이언트 저장
      this.mcpClients.set(serverName, client);
      
      // 사용 가능한 도구 로드
      await this.loadToolsFromServer(serverName, client);
      
      console.log(`✅ ${serverName} MCP 서버 연결 완료`);
      
    } catch (error) {
      console.error(`❌ ${serverName} MCP 서버 연결 실패:`, error);
      throw error;
    }
  }

  /**
   * 🛠️ 서버에서 도구 로드
   */
  async loadToolsFromServer(serverName, client) {
    try {
      const toolsResponse = await client.listTools();
      const tools = toolsResponse.tools || [];
      
      console.log(`🛠️ ${serverName}에서 ${tools.length}개 도구 로드됨`);
      
      // 도구를 serverName과 함께 저장
      for (const tool of tools) {
        this.availableTools.set(`${serverName}.${tool.name}`, {
          serverName,
          tool,
          client
        });
      }
      
    } catch (error) {
      console.error(`도구 로드 실패 (${serverName}):`, error);
    }
  }

  /**
   * 🧠 Claude API로 쿼리 최적화
   */
  async optimizeQueryWithClaude(userQuery) {
    try {
      const prompt = `YouTube Shorts 검색을 위해 다음 사용자 요청을 분석하고 최적화해주세요:

사용자 요청: "${userQuery}"

다음 JSON 형식으로 응답해주세요:
{
  "optimizedKeywords": "최적화된 검색 키워드",
  "intent": "사용자 의도 분석",
  "filters": {
    "maxResults": 10,
    "enableLLMOptimization": true
  }
}`;

      const response = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: prompt
        }]
      });

      const result = JSON.parse(response.content[0].text);
      console.log('🧠 Claude 쿼리 최적화:', result);
      
      return result;

    } catch (error) {
      console.error('Claude 쿼리 최적화 실패:', error);
      // 폴백
      return {
        optimizedKeywords: userQuery,
        intent: '기본 검색',
        filters: {
          maxResults: 10,
          enableLLMOptimization: false
        }
      };
    }
  }

  /**
   * 🎬 MCP를 통한 YouTube 영상 검색
   */
  async searchVideosWithMCP(optimizedQuery, options) {
    try {
      // YouTube Shorts AI MCP 서버의 search_videos 도구 사용
      const toolKey = 'youtube-shorts-ai.search_videos';
      const toolInfo = this.availableTools.get(toolKey);
      
      if (!toolInfo) {
        throw new Error('YouTube 검색 도구를 찾을 수 없습니다. MCP 서버가 연결되어 있는지 확인하세요.');
      }

      const searchParams = {
        query: optimizedQuery.optimizedKeywords,
        maxResults: optimizedQuery.filters?.maxResults || 10,
        enableLLMOptimization: optimizedQuery.filters?.enableLLMOptimization !== false,
        includeAnalysis: options.includeAnalysis || false
      };

      console.log('🎬 MCP 도구 호출:', searchParams);

      const result = await toolInfo.client.callTool({
        name: 'search_videos',
        arguments: searchParams
      });

      // MCP 응답 파싱
      const searchResults = JSON.parse(result.content[0].text);
      
      console.log(`✅ ${searchResults.totalResults}개 영상 검색 완료`);
      
      return searchResults;

    } catch (error) {
      console.error('MCP 영상 검색 실패:', error);
      throw new Error(`영상 검색 실패: ${error.message}`);
    }
  }

  /**
   * 💬 대화형 AI 처리 (MCP + Claude)
   */
  async handleChatWithMCP(message, conversationHistory) {
    try {
      // 1단계: 대화 컨텍스트 분석
      const contextPrompt = `사용자와의 대화에서 YouTube Shorts 검색이 필요한지 판단하고, 필요하다면 검색어를 추출해주세요:

대화 내역:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

현재 메시지: "${message}"

다음 JSON 형식으로 응답해주세요:
{
  "needsSearch": true/false,
  "searchQuery": "검색어 (필요한 경우)",
  "responseType": "search|info|chat",
  "userIntent": "사용자 의도 분석"
}`;

      const contextAnalysis = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: contextPrompt
        }]
      });

      const analysis = JSON.parse(contextAnalysis.content[0].text);
      console.log('💬 대화 분석:', analysis);

      // 2단계: 검색이 필요한 경우 MCP 도구 사용
      let searchResults = null;
      if (analysis.needsSearch && analysis.searchQuery) {
        const optimizedQuery = await this.optimizeQueryWithClaude(analysis.searchQuery);
        searchResults = await this.searchVideosWithMCP(optimizedQuery, {});
      }

      // 3단계: Claude로 최종 응답 생성
      const responsePrompt = `YouTube Shorts AI 어시스턴트로서 사용자에게 도움이 되는 응답을 해주세요.

사용자 메시지: "${message}"
분석 결과: ${JSON.stringify(analysis)}
${searchResults ? `검색 결과: ${JSON.stringify(searchResults, null, 2)}` : ''}

자연스럽고 도움이 되는 응답을 한국어로 작성해주세요.`;

      const finalResponse = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: responsePrompt
        }]
      });

      return {
        message: finalResponse.content[0].text,
        analysis,
        searchResults,
        hasVideoResults: !!searchResults?.videos?.length
      };

    } catch (error) {
      console.error('대화형 처리 실패:', error);
      return {
        message: '죄송합니다. 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        error: error.message
      };
    }
  }

  /**
   * 📈 MCP를 통한 트렌드 조회
   */
  async getTrendsWithMCP(region, category) {
    try {
      const toolKey = 'youtube-shorts-ai.get_trending_keywords';
      const toolInfo = this.availableTools.get(toolKey);
      
      if (!toolInfo) {
        throw new Error('트렌드 조회 도구를 찾을 수 없습니다.');
      }

      const result = await toolInfo.client.callTool({
        name: 'get_trending_keywords',
        arguments: {
          region,
          category,
          limit: 10
        }
      });

      const trendsData = JSON.parse(result.content[0].text);
      console.log(`📈 ${trendsData.trends?.length || 0}개 트렌드 조회 완료`);
      
      return trendsData;

    } catch (error) {
      console.error('MCP 트렌드 조회 실패:', error);
      // 폴백 데이터
      return {
        region,
        category,
        trends: [
          { keyword: '먹방', score: 85, searchVolume: 50000, growthRate: 15 },
          { keyword: '댄스', score: 80, searchVolume: 45000, growthRate: 12 },
          { keyword: '브이로그', score: 75, searchVolume: 40000, growthRate: 10 }
        ],
        fallback: true,
        message: 'MCP 서버 연결 실패로 기본 트렌드 데이터를 반환합니다.'
      };
    }
  }

  /**
   * 🚀 서버 시작
   */
  async start() {
    try {
      // 기본 MCP 서버들 자동 연결 (환경 변수에서 설정)
      await this.connectDefaultMCPServers();
      
      // Express 서버 시작
      this.app.listen(this.port, () => {
        console.log(`🚀 Railway MCP Host 서버 실행 중!`);
        console.log(`📡 포트: ${this.port}`);
        console.log(`🔌 연결된 MCP 서버: ${this.mcpClients.size}개`);
        console.log(`🛠️ 사용 가능한 도구: ${this.availableTools.size}개`);
        console.log(`🌐 헬스 체크: http://localhost:${this.port}/health`);
      });

    } catch (error) {
      console.error('❌ 서버 시작 실패:', error);
      process.exit(1);
    }
  }

  /**
   * 🔧 기본 MCP 서버들 연결
   */
  async connectDefaultMCPServers() {
    const defaultServers = [
      {
        name: 'youtube-shorts-ai',
        url: process.env.YOUTUBE_SHORTS_MCP_URL || 'http://localhost:3001',
        transport: 'streamable-http'
      }
    ];

    for (const server of defaultServers) {
      try {
        if (server.url) {
          await this.connectToMCPServer(server.name, server.url, server.transport);
        }
      } catch (error) {
        console.warn(`⚠️ 기본 MCP 서버 연결 실패 (${server.name}):`, error.message);
      }
    }
  }
}

// 서버 시작
const railwayMCPHost = new RailwayMCPHost();
railwayMCPHost.start(); 