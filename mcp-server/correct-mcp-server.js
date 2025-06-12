/**
 * 🔥 간소화된 MCP 서버: YouTube Shorts AI 큐레이션 서버
 * 
 * Model Context Protocol (MCP) 2025-03-26 사양 준수
 * @modelcontextprotocol/sdk 사용
 * 
 * 실제 구현은 youtube-ai-services 모듈에서 처리
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// youtube-ai-services 모듈들 임포트
import YouTubeSearch from '../youtube-ai-services/search/youtube-search.js';
import VideoFilter from '../youtube-ai-services/search/video-filter.js';
import GoogleTrends from '../youtube-ai-services/trends/google-trends.js';
import NateTrends from '../youtube-ai-services/trends/nate-trends.js';

// 새로 구현된 모듈들 임포트
import QueryOptimizer from '../youtube-ai-services/llm/query-optimizer.js';
import KeywordExtractor from '../youtube-ai-services/keywords/keyword-extractor.js';
import CompleteSearchWorkflow from '../youtube-ai-services/workflows/complete-search-workflow.js';
import YouTubeUtils from '../youtube-ai-services/utils/youtube-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 부모 폴더의 .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * 🎯 YouTube Shorts AI 큐레이션 MCP 서버 (완전 기능 버전)
 */
class YouTubeShortsAIMCPServer {
  constructor() {
    this.server = new McpServer({
      name: "youtube-shorts-curator-mcp",
      version: "2.0.0"
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });

    // 설정 초기화
    this.config = {
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
      claudeApiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
      serpApiKey: process.env.SERP_API_KEY,
      brightDataApiKey: process.env.BRIGHT_DATA_API_KEY,
      brightDataEndpoint: process.env.BRIGHT_DATA_ENDPOINT
    };

    // 기존 서비스 인스턴스
    this.youtubeSearch = new YouTubeSearch(this.config.youtubeApiKey);
    this.videoFilter = new VideoFilter(this.config.youtubeApiKey);
    this.googleTrends = new GoogleTrends(this.config.serpApiKey);
    this.nateTrends = new NateTrends({
      apiKey: this.config.brightDataApiKey,
      endpoint: this.config.brightDataEndpoint
    });

    // 새로운 서비스 인스턴스
    this.queryOptimizer = new QueryOptimizer(this.config.claudeApiKey);
    this.keywordExtractor = new KeywordExtractor({
      brightDataApiKey: this.config.brightDataApiKey,
      brightDataEndpoint: this.config.brightDataEndpoint
    });
    this.completeWorkflow = new CompleteSearchWorkflow(this.config);
    this.youtubeUtils = new YouTubeUtils();

    // 통계 추적
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      apiQuotaUsed: 0,
      toolCalls: 0,
      resourceReads: 0,
      apiUnitsUsed: 0
    };

    this.setupTools();
    this.setupResources();
    this.setupPrompts();
  }

  /**
   * 🔧 MCP Tools 설정 (9개 도구)
   */
  setupTools() {
    // === 기존 4개 도구 ===

    // 1. 기본 영상 검색 도구
    this.server.tool(
      "search_videos",
      {
        query: z.string().describe("검색할 키워드나 자연어 질문"),
        maxResults: z.number().optional().default(20).describe("최대 결과 수"),
        enableFiltering: z.boolean().optional().default(true).describe("재생 가능 여부 필터링 사용")
      },
      async ({ query, maxResults, enableFiltering }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🔍 MCP Tool: search_videos - "${query}"`);
          
          const searchResult = await this.youtubeSearch.searchYouTubeVideos(
            { query },
            maxResults
          );

          let finalVideos = searchResult.videos;
          if (enableFiltering && finalVideos.length > 0) {
            const videoIds = finalVideos.map(v => v.id.videoId || v.id);
            const filterResult = await this.videoFilter.filterPlayableVideos(videoIds);
            finalVideos = filterResult.playableVideos;
          }

          const result = {
            query: query,
            totalResults: finalVideos.length,
            videos: finalVideos.map(video => ({
              id: video.id.videoId || video.id,
              title: video.snippet?.title,
              channel: video.snippet?.channelTitle,
              description: video.snippet?.description?.substring(0, 200) + "...",
              thumbnailUrl: video.snippet?.thumbnails?.medium?.url,
              publishedAt: video.snippet?.publishedAt,
              url: `https://www.youtube.com/shorts/${video.id.videoId || video.id}`
            })),
            apiUnitsUsed: searchResult.apiUsage?.totalUnits || 109,
            filteringStats: searchResult.filteringStats
          };

          this.stats.apiUnitsUsed += result.apiUnitsUsed;
          this.stats.successfulRequests++;

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ search_videos 도구 오류:', error);
          this.stats.failedRequests++;
          return {
            content: [{
              type: "text", 
              text: JSON.stringify({ 
                error: error.message,
                query: query,
                timestamp: new Date().toISOString()
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 2. Google 트렌드 수집 도구
    this.server.tool(
      "get_google_trends",
      {
        geo: z.string().optional().default("KR").describe("지역 코드"),
        limit: z.number().optional().default(10).describe("가져올 트렌드 수")
      },
      async ({ geo, limit }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`📈 MCP Tool: get_google_trends - ${geo}`);
          
          const trends = await this.googleTrends.getTrendingNow({
            geo,
            limit
          });
          
          const result = {
            geo,
            trends: trends.map(trend => ({
              keyword: trend.keyword,
              trendScore: trend.trendScore,
              type: trend.type,
              searchVolume: trend.searchVolume,
              growth: trend.growth,
              category: trend.category
            })),
            updatedAt: new Date().toISOString(),
            source: "google_trends"
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ get_google_trends 도구 오류:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                geo,
                fallbackMessage: "트렌드 데이터를 가져올 수 없습니다."
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 3. NATE 실시간 검색어 도구
    this.server.tool(
      "get_nate_trends",
      {
        limit: z.number().optional().default(10).describe("가져올 검색어 수")
      },
      async ({ limit }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🔥 MCP Tool: get_nate_trends - ${limit}개`);
          
          const trends = await this.nateTrends.getRealTimeSearches({
            limit
          });
          
          const result = {
            trends: trends.map(trend => ({
              keyword: trend.keyword,
              rank: trend.rank,
              trendScore: trend.trendScore,
              change: trend.change,
              changeValue: trend.changeValue,
              category: trend.category,
              categoryKr: trend.categoryKr
            })),
            updatedAt: new Date().toISOString(),
            source: "nate_realtime"
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ get_nate_trends 도구 오류:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                fallbackMessage: "NATE 실시간 검색어를 가져올 수 없습니다."
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 4. 서버 상태 및 통계 도구
    this.server.tool(
      "get_server_stats",
      {},
      async () => {
        this.stats.toolCalls++;
        
        const stats = {
          server: "youtube-shorts-ai-curator",
          version: "2.0.0",
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          stats: this.stats,
          services: {
            youtubeSearch: this.youtubeSearch.getStats(),
            videoFilter: this.videoFilter.getStats(),
            googleTrends: this.googleTrends.getStats(),
            nateTrends: this.nateTrends.getStats(),
            queryOptimizer: this.queryOptimizer.getStats(),
            keywordExtractor: this.keywordExtractor.getStats(),
            completeWorkflow: this.completeWorkflow.getStats(),
            youtubeUtils: this.youtubeUtils.getStats()
          },
          config: {
            hasYouTubeKey: !!this.config.youtubeApiKey,
            hasSerpApiKey: !!this.config.serpApiKey,
            hasBrightDataKey: !!this.config.brightDataApiKey,
            hasClaudeKey: !!this.config.claudeApiKey
          },
          timestamp: new Date().toISOString()
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(stats, null, 2)
          }]
        };
      }
    );

    // === 새로운 5개 도구 ===

    // 5. LLM 쿼리 최적화 도구
    this.server.tool(
      "optimize_search_query",
      {
        userMessage: z.string().describe("사용자의 자연어 검색 요청"),
        context: z.string().optional().describe("추가 컨텍스트 정보")
      },
      async ({ userMessage, context }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🧠 MCP Tool: optimize_search_query - "${userMessage}"`);
          
          const optimization = await this.queryOptimizer.optimizeSearchQuery(userMessage, context);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(optimization, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ optimize_search_query 도구 오류:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                userMessage: userMessage,
                fallback: {
                  query: userMessage,
                  keywords: userMessage.split(' ').filter(w => w.length > 2)
                }
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 6. 키워드 확장 도구
    this.server.tool(
      "expand_keywords",
      {
        baseKeywords: z.array(z.string()).describe("기본 키워드 배열"),
        searchContext: z.string().optional().describe("검색 컨텍스트"),
        maxKeywords: z.number().optional().default(20).describe("최대 키워드 수")
      },
      async ({ baseKeywords, searchContext, maxKeywords }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🔍 MCP Tool: expand_keywords - ${baseKeywords.join(', ')}`);
          
          const expansion = await this.keywordExtractor.extractRelatedKeywords(
            baseKeywords, 
            searchContext, 
            maxKeywords
          );
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(expansion, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ expand_keywords 도구 오류:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                baseKeywords,
                fallbackKeywords: this.keywordExtractor.generateFallbackKeywords(baseKeywords)
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 7. 완전한 검색 워크플로우 도구
    this.server.tool(
      "complete_search_workflow",
      {
        userQuery: z.string().describe("사용자 검색 요청"),
        maxResults: z.number().optional().default(20).describe("최대 결과 수"),
        maxQueries: z.number().optional().default(3).describe("실행할 검색 쿼리 수"),
        strictMode: z.boolean().optional().default(true).describe("엄격한 필터링 모드"),
        context: z.string().optional().describe("추가 컨텍스트")
      },
      async ({ userQuery, maxResults, maxQueries, strictMode, context }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🚀 MCP Tool: complete_search_workflow - "${userQuery}"`);
          
          const workflowResult = await this.completeWorkflow.executeCompleteSearchWorkflow({
            userQuery,
            maxResults,
            maxQueries,
            strictMode,
            context,
            maxResultsPerQuery: Math.ceil(maxResults / maxQueries)
          });
          
          // API 사용량 통계 업데이트
          this.stats.apiUnitsUsed += workflowResult.metadata.totalAPIUnits;
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(workflowResult, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ complete_search_workflow 도구 오류:', error);
          this.stats.failedRequests++;
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                userQuery: userQuery,
                fallback: "워크플로우 실행 실패 - 기본 검색을 시도해보세요"
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 8. 영상 품질 분석 도구
    this.server.tool(
      "analyze_video_quality",
      {
        videoData: z.object({}).describe("분석할 영상 데이터 (YouTube API 응답 형식)"),
        strictMode: z.boolean().optional().default(true).describe("엄격한 검증 모드")
      },
      async ({ videoData, strictMode }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`📊 MCP Tool: analyze_video_quality`);
          
          const validation = this.youtubeUtils.isValidShort(videoData, strictMode);
          const qualityScore = this.youtubeUtils.calculateQualityScore(videoData);
          const stats = this.youtubeUtils.calculateVideoStats(videoData);
          const category = this.youtubeUtils.categorizeVideo(videoData);
          
          const analysis = {
            validation,
            qualityScore,
            stats,
            category,
            recommendations: [],
            analysisDetails: {
              strictMode,
              analyzedAt: new Date().toISOString()
            }
          };

          // 개선 제안 생성
          if (qualityScore < 50) {
            analysis.recommendations.push("품질 점수가 낮습니다. 조회수나 참여율이 높은 영상을 찾아보세요.");
          }
          if (!validation.valid) {
            analysis.recommendations.push(`재생 제한: ${validation.reason}`);
          }
          if (stats.duration > 60) {
            analysis.recommendations.push("Shorts 기준(60초)을 초과합니다.");
          }
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(analysis, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ analyze_video_quality 도구 오류:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                fallback: "영상 분석 실패 - 데이터 형식을 확인해주세요"
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 9. API 사용량 계산 도구
    this.server.tool(
      "calculate_api_usage",
      {
        operation: z.string().describe("API 작업 (예: search.list, videos.list)"),
        parts: z.array(z.string()).optional().default([]).describe("사용할 parts 목록")
      },
      async ({ operation, parts }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`💰 MCP Tool: calculate_api_usage - ${operation}`);
          
          const usage = this.youtubeUtils.calculateAPIUnits(operation, parts);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(usage, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ calculate_api_usage 도구 오류:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                operation: operation,
                fallback: { total: 1, description: "추정값" }
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );
  }

  /**
   * 🔧 MCP Resources 설정  
   */
  setupResources() {
    // 1. 서비스 통계 리소스
    this.server.resource(
      "stats/services",
      "각 서비스별 통계 정보",
      "application/json",
      async () => {
        const stats = {
          youtubeSearch: this.youtubeSearch.getStats(),
          videoFilter: this.videoFilter.getStats(),
          googleTrends: this.googleTrends.getStats(),
          nateTrends: this.nateTrends.getStats(),
          queryOptimizer: this.queryOptimizer.getStats(),
          keywordExtractor: this.keywordExtractor.getStats(),
          completeWorkflow: this.completeWorkflow.getStats(),
          youtubeUtils: this.youtubeUtils.getStats(),
          generatedAt: new Date().toISOString()
        };
        return JSON.stringify(stats, null, 2);
      }
    );

    // 2. API 사용량 리포트 리소스
    this.server.resource(
      "usage/report",
      "API 사용량 및 할당량 리포트", 
      "application/json",
      async () => {
        const report = {
          totalAPIUnits: this.stats.apiUnitsUsed,
          dailyLimit: 10000,
          usagePercentage: (this.stats.apiUnitsUsed / 10000) * 100,
          remainingUnits: 10000 - this.stats.apiUnitsUsed,
          breakdown: {
            toolCalls: this.stats.toolCalls,
            averageUnitsPerCall: this.stats.apiUnitsUsed / Math.max(this.stats.toolCalls, 1)
          },
          timestamp: new Date().toISOString()
        };
        return JSON.stringify(report, null, 2);
      }
    );

    // 3. 기능 목록 리소스
    this.server.resource(
      "features/list",
      "사용 가능한 기능 목록",
      "application/json",
      async () => {
        const features = {
          tools: [
            { name: "search_videos", description: "기본 영상 검색" },
            { name: "get_google_trends", description: "Google 트렌드 수집" },
            { name: "get_nate_trends", description: "NATE 실시간 검색어" },
            { name: "get_server_stats", description: "서버 상태 및 통계" },
            { name: "optimize_search_query", description: "LLM 검색 쿼리 최적화" },
            { name: "expand_keywords", description: "키워드 확장" },
            { name: "complete_search_workflow", description: "완전한 검색 워크플로우" },
            { name: "analyze_video_quality", description: "영상 품질 분석" },
            { name: "calculate_api_usage", description: "API 사용량 계산" }
          ],
          resources: [
            { name: "stats/services", description: "서비스별 통계" },
            { name: "usage/report", description: "API 사용량 리포트" },
            { name: "features/list", description: "기능 목록" }
          ],
          prompts: [
            { name: "optimize_search", description: "검색 최적화 프롬프트" },
            { name: "analyze_trends", description: "트렌드 분석 프롬프트" },
            { name: "workflow_guide", description: "워크플로우 가이드" }
          ],
          generatedAt: new Date().toISOString()
        };
        return JSON.stringify(features, null, 2);
      }
    );
  }

  /**
   * 💬 MCP Prompts 설정
   */
  setupPrompts() {
    // 1. 검색 최적화 프롬프트
    this.server.prompt(
      "optimize_search",
      "YouTube Shorts 검색 쿼리 최적화",
      [
        {
          name: "user_query", 
          description: "사용자의 자연어 검색 요청",
          required: true
        }
      ],
      async ({ user_query }) => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `다음 사용자 요청을 YouTube Shorts 검색에 최적화해주세요:\n\n요청: "${user_query}"\n\n최적화된 검색 키워드와 필터를 제안해주세요.`
              }
            }
          ]
        };
      }
    );

    // 2. 트렌드 분석 프롬프트
    this.server.prompt(
      "analyze_trends",
      "트렌드 데이터 분석 및 인사이트",
      [
        {
          name: "trend_data",
          description: "분석할 트렌드 데이터",
          required: true
        }
      ],
      async ({ trend_data }) => {
        return {
          messages: [
            {
              role: "user", 
              content: {
                type: "text",
                text: `다음 트렌드 데이터를 분석하고 YouTube Shorts 콘텐츠 제작에 유용한 인사이트를 제공해주세요:\n\n${trend_data}`
              }
            }
          ]
        };
      }
    );

    // 3. 워크플로우 가이드 프롬프트
    this.server.prompt(
      "workflow_guide",
      "완전한 검색 워크플로우 사용 가이드",
      [
        {
          name: "search_goal",
          description: "검색 목표",
          required: true
        }
      ],
      async ({ search_goal }) => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `다음 검색 목표를 달성하기 위한 완전한 워크플로우 전략을 제안해주세요:\n\n목표: "${search_goal}"\n\n1. 쿼리 최적화 방법\n2. 키워드 확장 전략\n3. 필터링 기준\n4. 결과 평가 방법을 포함해서 답변해주세요.`
              }
            }
          ]
        };
      }
    );
  }

  /**
   * 🚀 STDIO 서버 시작
   */
  async startStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🔌 MCP 서버가 STDIO 모드로 시작되었습니다.');
  }

  /**
   * 🌐 HTTP 서버 시작
   */
  async startHTTP(port = 3000) {
    const transport = new StreamableHTTPServerTransport({
      port: port
    });
    await this.server.connect(transport);
    console.log(`🌐 MCP 서버가 HTTP 모드로 시작되었습니다. 포트: ${port}`);
    console.log(`📍 엔드포인트: http://localhost:${port}/mcp`);
  }

  /**
   * 📡 Express HTTP 서버 시작 (Railway 배포용)
   */
  async startExpressHTTP(port = 3000) {
    const express = require('express');
    const app = express();
    
    app.use(express.json());
    
    // 헬스체크 엔드포인트
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        server: 'youtube-shorts-ai-curator',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        stats: this.stats
      });
    });

    // 기본 정보 엔드포인트
    app.get('/', (req, res) => {
      res.json({
        name: 'YouTube Shorts AI 큐레이션 MCP 서버',
        version: '2.0.0',
        tools: [
          'search_videos', 'get_google_trends', 'get_nate_trends', 'get_server_stats',
          'optimize_search_query', 'expand_keywords', 'complete_search_workflow',
          'analyze_video_quality', 'calculate_api_usage'
        ],
        resources: ['stats/services', 'usage/report', 'features/list'],
        prompts: ['optimize_search', 'analyze_trends', 'workflow_guide'],
        features: {
          llm_optimization: !!this.config.claudeApiKey,
          keyword_expansion: !!this.config.brightDataApiKey,
          complete_workflow: true,
          video_analysis: true,
          api_calculation: true
        }
      });
    });

    app.listen(port, () => {
      console.log(`📡 Express HTTP 서버가 포트 ${port}에서 시작되었습니다.`);
    });
  }
}

// 메인 실행 로직
async function main() {
  const server = new YouTubeShortsAIMCPServer();
  
  console.log('🎬 YouTube Shorts AI MCP 서버 초기화 중...');
  
  // 환경 감지
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
  const isStdio = process.argv.includes('--stdio');
  const isHTTP = process.argv.includes('--http') || process.env.MCP_TRANSPORT === 'http';
  
  console.log(`📍 감지된 환경: ${isRailway ? 'Railway (배포)' : '로컬'}`);
  console.log(`🚀 트랜스포트 모드: ${isStdio ? 'STDIO' : isHTTP || isRailway ? 'HTTP' : 'STDIO'}`);
  
  // API 상태 표시
  console.log('\n🔑 API 설정 상태:');
  console.log(`  - YouTube API: ${server.config.youtubeApiKey ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`  - Claude API: ${server.config.claudeApiKey ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`  - SerpAPI: ${server.config.serpApiKey ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`  - Bright Data API: ${server.config.brightDataApiKey ? '✅ 설정됨' : '❌ 미설정'}`);
  
  // 기능 개요 표시
  console.log('\n🎯 제공 기능:');
  console.log('  - 🛠️  9개 MCP 도구 (검색, 트렌드, 최적화, 워크플로우, 분석)');
  console.log('  - 📁 3개 리소스 (통계, 사용량, 기능목록)');
  console.log('  - 💬 3개 프롬프트 (최적화, 분석, 가이드)');
  console.log('  - 🧠 LLM 쿼리 최적화 (Claude API)');
  console.log('  - 🔍 키워드 확장 (Bright Data)');
  console.log('  - 🚀 완전한 검색 워크플로우');
  console.log('  - 📊 영상 품질 분석');
  console.log('  - 💰 API 사용량 계산');

  try {
    if (isStdio) {
      console.log('\n🔌 STDIO 모드 시작...');
      await server.startStdio();
    } else if (isHTTP || isRailway) {
      const port = parseInt(process.env.PORT) || 3000;
      
      if (isRailway) {
        console.log(`\n🌐 Railway 배포 모드 - Express HTTP 서버 (포트: ${port})...`);
        await server.startExpressHTTP(port);
      } else {
        console.log(`\n🌐 HTTP 모드 시작 (로컬 개발용) - 포트: ${port}...`);
        
        try {
          await server.startHTTP(port);
        } catch (mcpError) {
          console.error('❌ MCP StreamableHTTP 시작 실패:', mcpError);
          console.log('🔄 Express HTTP 폴백 모드로 전환...');
          await server.startExpressHTTP(port);
        }
      }
    } else {
      console.log('\n🔌 기본값: STDIO 모드 시작...');
      await server.startStdio();
    }
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default YouTubeShortsAIMCPServer;
export { YouTubeShortsAIMCPServer }; 