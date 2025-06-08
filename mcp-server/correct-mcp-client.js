/**
 * 🔥 올바른 MCP 클라이언트 구현: YouTube Shorts AI 큐레이션 클라이언트
 * 
 * Model Context Protocol (MCP) 2025-03-26 사양 준수
 * @modelcontextprotocol/sdk 사용
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

/**
 * 🎯 YouTube Shorts AI 큐레이션 MCP 클라이언트
 * 
 * MCP 서버와 통신하여 다음 기능 제공:
 * - 영상 검색 (Tools 사용)
 * - 트렌드 데이터 조회 (Resources 사용)
 * - LLM 기반 쿼리 최적화 (Prompts 사용)
 */
class YouTubeShortsAIMCPClient {
  constructor() {
    // MCP 클라이언트 생성
    this.client = new Client({
      name: "youtube-shorts-ai-client",
      version: "1.0.0"
    });

    this.isConnected = false;
    this.availableTools = [];
    this.availableResources = [];
    this.availablePrompts = [];
  }

  /**
   * 🔌 MCP 서버 연결 (stdio)
   */
  async connectStdio(serverCommand, serverArgs = []) {
    console.log('🔌 MCP 서버 연결 시도 (stdio)...');
    
    try {
      const transport = new StdioClientTransport({
        command: serverCommand,
        args: serverArgs
      });

      await this.client.connect(transport);
      this.isConnected = true;

      console.log('✅ MCP 서버 연결 성공!');
      
      // 서버 기능 조회
      await this.discoverServerCapabilities();
      
    } catch (error) {
      console.error('❌ MCP 서버 연결 실패:', error);
      throw error;
    }
  }

  /**
   * 🌐 MCP 서버 연결 (HTTP)
   */
  async connectHTTP(serverUrl) {
    console.log(`🌐 MCP 서버 연결 시도 (HTTP): ${serverUrl}`);
    
    try {
      const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
      
      await this.client.connect(transport);
      this.isConnected = true;

      console.log('✅ MCP 서버 연결 성공!');
      
      // 서버 기능 조회
      await this.discoverServerCapabilities();
      
    } catch (error) {
      console.error('❌ MCP 서버 연결 실패:', error);
      throw error;
    }
  }

  /**
   * 🔍 서버 기능 탐색
   */
  async discoverServerCapabilities() {
    if (!this.isConnected) {
      throw new Error('MCP 서버에 연결되지 않았습니다.');
    }

    try {
      // 사용 가능한 도구 조회
      const tools = await this.client.listTools();
      this.availableTools = tools.tools;
      console.log(`📋 사용 가능한 도구: ${this.availableTools.length}개`);
      this.availableTools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });

      // 사용 가능한 리소스 조회
      const resources = await this.client.listResources();
      this.availableResources = resources.resources;
      console.log(`📁 사용 가능한 리소스: ${this.availableResources.length}개`);
      this.availableResources.forEach(resource => {
        console.log(`  - ${resource.name} (${resource.uri}): ${resource.description}`);
      });

      // 사용 가능한 프롬프트 조회
      const prompts = await this.client.listPrompts();
      this.availablePrompts = prompts.prompts;
      console.log(`💬 사용 가능한 프롬프트: ${this.availablePrompts.length}개`);
      this.availablePrompts.forEach(prompt => {
        console.log(`  - ${prompt.name}: ${prompt.description}`);
      });

    } catch (error) {
      console.error('❌ 서버 기능 탐색 실패:', error);
    }
  }

  /**
   * 🔍 영상 검색 (MCP Tool 사용)
   */
  async searchVideos(query, options = {}) {
    this.ensureConnected();

    const {
      maxResults = 10,
      enableLLMOptimization = true,
      includeAnalysis = false
    } = options;

    try {
      console.log(`🔍 영상 검색: "${query}"`);

      const result = await this.client.callTool({
        name: "search_videos",
        arguments: {
          query,
          maxResults,
          enableLLMOptimization,
          includeAnalysis
        }
      });

      const searchResults = JSON.parse(result.content[0].text);
      
      console.log(`✅ 검색 완료: ${searchResults.totalResults}개 영상`);
      console.log(`💰 API 사용량: ${searchResults.apiUnitsUsed} units`);

      return searchResults;

    } catch (error) {
      console.error('❌ 영상 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 📈 트렌드 키워드 조회 (MCP Tool 사용)
   */
  async getTrendingKeywords(options = {}) {
    this.ensureConnected();

    const {
      region = "KR",
      category = "entertainment",
      limit = 10
    } = options;

    try {
      console.log(`📈 트렌드 조회: ${region}/${category}`);

      const result = await this.client.callTool({
        name: "get_trending_keywords",
        arguments: {
          region,
          category,
          limit
        }
      });

      const trendData = JSON.parse(result.content[0].text);
      
      console.log(`✅ 트렌드 조회 완료: ${trendData.trends.length}개 키워드`);
      
      return trendData;

    } catch (error) {
      console.error('❌ 트렌드 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 🧠 쿼리 최적화 (MCP Tool 사용)
   */
  async optimizeQuery(userMessage, context = '') {
    this.ensureConnected();

    try {
      console.log(`🧠 쿼리 최적화: "${userMessage}"`);

      const result = await this.client.callTool({
        name: "optimize_query",
        arguments: {
          userMessage,
          context
        }
      });

      const optimizedParams = JSON.parse(result.content[0].text);
      
      console.log(`✅ 쿼리 최적화 완료`);
      console.log(`원본: "${userMessage}"`);
      console.log(`최적화: "${optimizedParams.query}"`);
      
      return optimizedParams;

    } catch (error) {
      console.error('❌ 쿼리 최적화 실패:', error);
      throw error;
    }
  }

  /**
   * 📊 서버 상태 조회 (MCP Tool 사용)
   */
  async getServerStats() {
    this.ensureConnected();

    try {
      console.log('📊 서버 상태 조회...');

      const result = await this.client.callTool({
        name: "get_server_stats",
        arguments: {}
      });

      const stats = JSON.parse(result.content[0].text);
      
      console.log('✅ 서버 상태:');
      console.log(`  - 서버: ${stats.server} v${stats.version}`);
      console.log(`  - 업타임: ${Math.floor(stats.uptime)}초`);
      console.log(`  - 메모리: ${Math.round(stats.memory.used / 1024 / 1024)}MB`);
      console.log(`  - Tool 호출: ${stats.stats.toolCalls}회`);
      console.log(`  - API 사용량: ${stats.stats.apiUnitsUsed} units`);
      
      return stats;

    } catch (error) {
      console.error('❌ 서버 상태 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 📁 캐시된 검색 결과 조회 (MCP Resource 사용)
   */
  async getCachedSearches() {
    this.ensureConnected();

    try {
      console.log('📁 캐시된 검색 결과 조회...');

      const result = await this.client.readResource({
        uri: "cache://searches"
      });

      const cachedData = JSON.parse(result.contents[0].text);
      
      console.log(`✅ 캐시 조회 완료: ${cachedData.length}개 검색 결과`);
      
      return cachedData;

    } catch (error) {
      console.error('❌ 캐시 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 📈 트렌드 데이터 조회 (MCP Resource 사용)
   */
  async getTrendData() {
    this.ensureConnected();

    try {
      console.log('📈 트렌드 데이터 조회...');

      const result = await this.client.readResource({
        uri: "trends://current"
      });

      const trendData = JSON.parse(result.contents[0].text);
      
      console.log(`✅ 트렌드 데이터 조회 완료`);
      console.log(`업데이트: ${trendData.updatedAt}`);
      
      return trendData;

    } catch (error) {
      console.error('❌ 트렌드 데이터 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 📊 API 사용량 리포트 조회 (MCP Resource 사용)
   */
  async getAPIUsageReport() {
    this.ensureConnected();

    try {
      console.log('📊 API 사용량 리포트 조회...');

      const result = await this.client.readResource({
        uri: "reports://api-usage"
      });

      const usageReport = JSON.parse(result.contents[0].text);
      
      console.log('✅ API 사용량 리포트:');
      console.log(`  - 총 사용량: ${usageReport.totalAPIUnits} units`);
      console.log(`  - 사용률: ${usageReport.usagePercentage.toFixed(1)}%`);
      console.log(`  - 남은 할당량: ${usageReport.remainingUnits} units`);
      
      return usageReport;

    } catch (error) {
      console.error('❌ API 사용량 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 💬 검색 최적화 프롬프트 사용 (MCP Prompt 사용)
   */
  async getSearchOptimizationPrompt(userQuery, context = '') {
    this.ensureConnected();

    try {
      console.log(`💬 검색 최적화 프롬프트 생성: "${userQuery}"`);

      const result = await this.client.getPrompt({
        name: "optimize-search",
        arguments: {
          userQuery,
          context
        }
      });

      console.log('✅ 프롬프트 생성 완료');
      
      return result;

    } catch (error) {
      console.error('❌ 프롬프트 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 📊 종합 대시보드 조회
   */
  async getDashboard() {
    this.ensureConnected();

    try {
      console.log('📊 종합 대시보드 생성 중...');

      // 병렬로 여러 데이터 조회
      const [serverStats, trendData, usageReport, cachedSearches] = await Promise.all([
        this.getServerStats(),
        this.getTrendData().catch(() => null),
        this.getAPIUsageReport(),
        this.getCachedSearches().catch(() => [])
      ]);

      const dashboard = {
        timestamp: new Date().toISOString(),
        server: {
          name: serverStats.server,
          version: serverStats.version,
          uptime: serverStats.uptime,
          memory: serverStats.memory
        },
        statistics: {
          toolCalls: serverStats.stats.toolCalls,
          resourceReads: serverStats.stats.resourceReads,
          apiUnitsUsed: serverStats.stats.apiUnitsUsed,
          cacheSize: serverStats.stats.cacheSize
        },
        apiUsage: {
          totalUnits: usageReport.totalAPIUnits,
          usagePercentage: usageReport.usagePercentage,
          remainingUnits: usageReport.remainingUnits
        },
        cache: {
          searchCount: cachedSearches.length,
          recentSearches: cachedSearches.slice(-5)
        },
        trends: trendData ? {
          updatedAt: trendData.updatedAt,
          regionsAvailable: Object.keys(trendData.trends || {})
        } : null
      };

      console.log('✅ 대시보드 생성 완료');
      
      return dashboard;

    } catch (error) {
      console.error('❌ 대시보드 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 🧪 전체 기능 테스트
   */
  async runComprehensiveTest() {
    console.log('🧪 MCP 클라이언트 종합 테스트 시작...');

    try {
      // 1. 서버 상태 확인
      console.log('\n1️⃣ 서버 상태 확인...');
      await this.getServerStats();

      // 2. 트렌드 키워드 조회
      console.log('\n2️⃣ 트렌드 키워드 조회...');
      const trends = await this.getTrendingKeywords({ limit: 5 });

      // 3. 쿼리 최적화 테스트
      console.log('\n3️⃣ 쿼리 최적화 테스트...');
      await this.optimizeQuery('재미있는 먹방 영상 보고 싶어');

      // 4. 영상 검색 테스트
      console.log('\n4️⃣ 영상 검색 테스트...');
      const searchResults = await this.searchVideos('댄스 챌린지', { 
        maxResults: 3,
        includeAnalysis: true 
      });

      // 5. 리소스 조회 테스트
      console.log('\n5️⃣ 리소스 조회 테스트...');
      await this.getAPIUsageReport();
      await this.getCachedSearches();

      // 6. 프롬프트 사용 테스트
      console.log('\n6️⃣ 프롬프트 사용 테스트...');
      await this.getSearchOptimizationPrompt('힐링되는 자연 영상');

      // 7. 대시보드 생성
      console.log('\n7️⃣ 대시보드 생성...');
      const dashboard = await this.getDashboard();

      console.log('\n✅ 종합 테스트 완료!');
      console.log('📊 테스트 요약:');
      console.log(`  - 트렌드: ${trends.trends.length}개`);
      console.log(`  - 검색 결과: ${searchResults.totalResults}개`);
      console.log(`  - API 사용량: ${dashboard.apiUsage.totalUnits} units`);
      console.log(`  - 캐시 항목: ${dashboard.cache.searchCount}개`);

      return {
        success: true,
        summary: {
          trendsCount: trends.trends.length,
          searchResults: searchResults.totalResults,
          apiUnitsUsed: dashboard.apiUsage.totalUnits,
          cacheItems: dashboard.cache.searchCount
        }
      };

    } catch (error) {
      console.error('❌ 종합 테스트 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 유틸리티 메서드들
  ensureConnected() {
    if (!this.isConnected) {
      throw new Error('MCP 서버에 연결되지 않았습니다. connectStdio() 또는 connectHTTP()를 먼저 호출하세요.');
    }
  }

  /**
   * 🔌 연결 해제
   */
  async disconnect() {
    if (this.isConnected && this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('📴 MCP 서버 연결 해제됨');
    }
  }

  // 상태 조회
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      toolsAvailable: this.availableTools.length,
      resourcesAvailable: this.availableResources.length,
      promptsAvailable: this.availablePrompts.length
    };
  }
}

// 사용 예시 및 테스트
async function demonstrateUsage() {
  console.log('🎬 YouTube Shorts AI MCP 클라이언트 데모');
  
  const client = new YouTubeShortsAIMCPClient();
  
  try {
    // stdio 연결 (MCP 서버가 실행 중이어야 함)
    // await client.connectStdio('node', ['correct-mcp-server.js']);
    
    // 또는 HTTP 연결
    // await client.connectHTTP('http://localhost:3000/mcp');
    
    console.log('⚠️ 실제 연결을 위해서는 서버가 실행 중이어야 합니다.');
    console.log('다음 명령으로 서버를 시작하세요:');
    console.log('node correct-mcp-server.js');
    
    // 연결이 되었다면 종합 테스트 실행
    // await client.runComprehensiveTest();
    
  } catch (error) {
    console.error('❌ 데모 실행 실패:', error);
  } finally {
    // await client.disconnect();
  }
}

// ES6 모듈 export
export default YouTubeShortsAIMCPClient;
export { YouTubeShortsAIMCPClient };

// 스크립트 직접 실행 시 데모 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateUsage();
} 