/**
 * 🔥 올바른 MCP 구현: YouTube Shorts AI 큐레이션 서버
 * 
 * Model Context Protocol (MCP) 2025-03-26 사양 준수
 * @modelcontextprotocol/sdk 사용
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import BrightDataMCPIntegration from './bright-data-integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 부모 폴더의 .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * 🎯 YouTube Shorts AI 큐레이션 MCP 서버
 * 
 * 제공 기능:
 * - Tools: 영상 검색, 트렌드 분석, LLM 최적화
 * - Resources: 캐시된 영상 데이터, 트렌드 데이터
 * - Prompts: 검색 최적화 프롬프트
 */
class YouTubeShortsAIMCPServer {
  constructor() {
    this.server = new McpServer({
      name: "youtube-shorts-curator-mcp",
      version: "1.0.0"
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
      claudeApiKey: process.env.CLAUDE_API_KEY,
      brightDataApiKey: process.env.BRIGHT_DATA_API_KEY,
      brightDataProxy: process.env.BRIGHT_DATA_PROXY_URL || 'http://localhost:3001'
    };

    // YouTube API 설정 (하위 호환성)
    this.youtubeApiKey = this.config.youtubeApiKey;
    this.youtubeApiUrl = 'https://www.googleapis.com/youtube/v3';

    // Claude API 설정
    this.anthropic = null;
    if (this.config.claudeApiKey) {
      this.anthropic = new Anthropic({
        apiKey: this.config.claudeApiKey
      });
    }

    // 캐시 설정
    this.cache = new Map();
    this.cacheTTL = 4 * 60 * 60 * 1000; // 4시간

    // 통계 추적 초기화
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

    // 사용량 추적 (하위 호환성)
    this.usageStats = this.stats;

    // Bright Data MCP 통합 초기화
    this.brightDataMcp = new BrightDataMCPIntegration();

    this.setupTools();
    this.setupResources();
    this.setupPrompts();
  }

  /**
   * 🔧 API 클라이언트 초기화
   */
  initializeApiClients() {
    // Claude API 클라이언트
    if (this.config.claudeApiKey) {
      this.anthropic = new Anthropic({
        apiKey: this.config.claudeApiKey
      });
    }

    // YouTube API - 단순하게 axios만 사용
    // API 키는 각 요청에서 파라미터로 전달
  }

  /**
   * 🛠️ MCP 기능 설정 (Tools, Resources, Prompts)
   */
  setupMCPFeatures() {
    this.setupTools();
    this.setupResources();
    this.setupPrompts();
  }

  /**
   * 🔧 MCP Tools 설정
   */
  setupTools() {
    // 1. 기본 영상 검색 도구 (스마트 페이지네이션 지원)
    this.server.tool(
      "search_videos",
      {
        query: z.string().describe("검색할 키워드나 자연어 질문"),
        maxResults: z.number().optional().default(10).describe("최대 결과 수 (1-50). 30개 미만 시 자동으로 다음 페이지 검색"),
        nextPageToken: z.string().optional().describe("다음 페이지 토큰 (페이지네이션용)"),
        enableLLMOptimization: z.boolean().optional().default(true).describe("LLM 쿼리 최적화 사용"),
        includeAnalysis: z.boolean().optional().default(false).describe("상세 분석 정보 포함")
      },
      async ({ query, maxResults, nextPageToken, enableLLMOptimization, includeAnalysis }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🔍 MCP Tool: search_videos - "${query}"`);
          console.log(`🎯 설정: maxResults=${maxResults}, LLM최적화=${enableLLMOptimization}`);
          console.log(`⚡ 스마트 검색: 기본 필터링 + 자동 페이지네이션 (30개 미만 시)`);
          
          // LLM 최적화 단계
          let optimizedParams = { query };
          if (enableLLMOptimization && this.anthropic) {
            optimizedParams = await this.optimizeSearchWithLLM(query);
          }

          // YouTube API 검색 (2단계 필터링)
          const searchResults = await this.searchYouTubeVideos(optimizedParams, maxResults, nextPageToken);
          
          // 결과 포맷
          const result = {
            query: query,
            optimizedQuery: optimizedParams.query !== query ? optimizedParams.query : null,
            totalResults: searchResults.videos.length,
            videos: searchResults.videos.map(video => ({
              id: video.id.videoId || video.id,
              title: video.snippet.title,
              channel: video.snippet.channelTitle,
              description: video.snippet.description.substring(0, 200) + "...",
              thumbnailUrl: video.snippet.thumbnails.medium?.url,
              publishedAt: video.snippet.publishedAt,
              duration: this.parseISO8601Duration(video.contentDetails?.duration),
              viewCount: parseInt(video.statistics?.viewCount || 0),
              url: `https://www.youtube.com/shorts/${video.id.videoId || video.id}`
            })),
            nextPageToken: searchResults.nextPageToken,
            apiUnitsUsed: searchResults.apiUsage?.totalUnits || 109, // 새로운 구조 사용
            filteringStats: searchResults.filteringStats,
            searchEfficiency: searchResults.filteringStats?.searchEfficiency || 'N/A'
          };

          // 상세 분석 추가 (옵션)
          if (includeAnalysis && this.anthropic) {
            result.analysis = await this.analyzeResults(searchResults.videos);
          }

          // API 사용량 통계 업데이트
          this.stats.apiUnitsUsed += result.apiUnitsUsed;
          this.stats.successfulRequests++;

          // 📊 상세 성능 및 효율성 정보 추가
          result.performance = {
            apiEfficiency: {
              unitsUsed: result.apiUnitsUsed,
              videosPerUnit: (result.totalResults / result.apiUnitsUsed).toFixed(3),
              searchEfficiency: result.searchEfficiency,
              pagesSearched: result.filteringStats?.pagesSearched || 1
            },
            quotaStatus: {
              dailyUsed: this.stats.apiUnitsUsed,
              dailyLimit: 10000,
              remainingPercent: ((10000 - this.stats.apiUnitsUsed) / 10000 * 100).toFixed(1) + '%'
            },
            searchQuality: {
              totalCandidates: result.filteringStats?.totalCandidates || 0,
              totalPlayable: result.filteringStats?.totalPlayable || 0,
              finalReturned: result.totalResults,
              overallFilteringRatio: result.filteringStats?.overallFilteringRatio || 'N/A',
              searchStrategy: result.filteringStats?.pagesSearched > 1 ? 'multi_page' : 'single_page'
            }
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ search_videos 도구 오류:', error);
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

    // 2. 실시간 트렌드 분석 도구
    this.server.tool(
      "get_trending_keywords",
      {
        region: z.string().optional().default("KR").describe("지역 코드 (KR, US, JP 등)"),
        category: z.string().optional().default("entertainment").describe("카테고리 (entertainment, music, gaming 등)"),
        limit: z.number().optional().default(10).describe("가져올 트렌드 수")
      },
      async ({ region, category, limit }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`📈 MCP Tool: get_trending_keywords - ${region}/${category}`);
          
          const trends = await this.getBrightDataTrends(region, category, limit);
          
          const result = {
            region,
            category,
            trends: trends.map(trend => ({
              keyword: trend.keyword,
              score: trend.score,
              searchVolume: trend.searchVolume,
              growthRate: trend.growthRate,
              relatedTerms: trend.relatedTerms
            })),
            updatedAt: new Date().toISOString(),
            source: "bright_data_mcp"
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ get_trending_keywords 도구 오류:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                region,
                category,
                fallbackMessage: "트렌드 데이터를 가져올 수 없습니다."
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 3. LLM 기반 쿼리 최적화 도구
    this.server.tool(
      "optimize_query",
      {
        userMessage: z.string().describe("사용자의 자연어 요청"),
        context: z.string().optional().describe("추가 컨텍스트 정보")
      },
      async ({ userMessage, context }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🧠 MCP Tool: optimize_query - "${userMessage}"`);
          
          if (!this.anthropic) {
            throw new Error("Claude API 키가 설정되지 않았습니다.");
          }

          const optimizedParams = await this.optimizeSearchWithLLM(userMessage, context);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(optimizedParams, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ optimize_query 도구 오류:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
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

    // 4. 서버 상태 및 통계 도구
    this.server.tool(
      "get_server_stats",
      {},
      async () => {
        this.stats.toolCalls++;
        
        const stats = {
          server: "youtube-shorts-ai-curator",
          version: "1.0.0",
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          stats: {
            ...this.stats,
            cacheSize: this.cache.size
          },
          config: {
            hasClaudeKey: !!this.config.claudeApiKey,
            hasYouTubeKey: !!this.config.youtubeApiKey,
            hasBrightDataKey: !!this.config.brightDataApiKey
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

    // 5. Bright Data MCP 키워드 추출 도구
    this.server.tool(
      "extract_related_keywords",
      {
        baseKeywords: z.array(z.string()).describe("기본 키워드 배열"),
        searchContext: z.string().optional().describe("검색 컨텍스트 (예: 먹방, 여행, 게임)"),
        maxKeywords: z.number().optional().default(20).describe("최대 키워드 수")
      },
      async ({ baseKeywords, searchContext, maxKeywords }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🔍 MCP Tool: extract_related_keywords - ${baseKeywords.join(', ')}`);
          
          // Bright Data MCP를 통한 관련 키워드 추출
          const relatedKeywords = await this.extractRelatedKeywordsWithBrightData(
            baseKeywords, 
            searchContext, 
            maxKeywords
          );
          
          const result = {
            baseKeywords,
            searchContext,
            relatedKeywords: relatedKeywords.slice(0, maxKeywords),
            generatedSearchQueries: this.generateSearchQueries(baseKeywords, relatedKeywords),
            timestamp: new Date().toISOString(),
            source: "bright_data_mcp"
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ extract_related_keywords 도구 오류:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                baseKeywords,
                fallbackKeywords: this.generateFallbackKeywords(baseKeywords)
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 6. Bright Data MCP 키워드 확장 도구 (새로 추가)
    this.server.tool(
      "expand_keywords_with_brightdata",
      {
        claudeKeywords: z.array(z.string()).describe("Claude가 추출한 기본 키워드"),
        searchContext: z.string().optional().describe("검색 맥락 (예: 'YouTube Shorts 트렌드')"),
        maxKeywords: z.number().optional().default(20).describe("확장할 최대 키워드 수"),
        includeAutocomplete: z.boolean().optional().default(true).describe("자동완성 키워드 포함")
      },
      async ({ claudeKeywords, searchContext, maxKeywords, includeAutocomplete }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🔍 MCP Tool: expand_keywords_with_brightdata - ${claudeKeywords.join(', ')}`);
          
          // Bright Data MCP를 통한 키워드 확장
          const expandedKeywords = await this.expandKeywordsWithBrightDataMCP(
            claudeKeywords, 
            searchContext, 
            maxKeywords,
            includeAutocomplete
          );
          
          // 검색 쿼리 생성 (OR 연산자 사용)
          const searchQueries = this.generateAdvancedSearchQueries(claudeKeywords, expandedKeywords);
          
          const result = {
            originalKeywords: claudeKeywords,
            expandedKeywords: expandedKeywords,
            totalKeywords: claudeKeywords.length + expandedKeywords.length,
            searchQueries: searchQueries,
            recommendedQueries: searchQueries.slice(0, 5), // 상위 5개 추천
            searchContext,
            metadata: {
              source: "bright_data_mcp",
              includeAutocomplete,
              expandedAt: new Date().toISOString()
            }
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ expand_keywords_with_brightdata 도구 오류:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                originalKeywords: claudeKeywords,
                fallbackKeywords: this.generateFallbackKeywords(claudeKeywords),
                fallbackQueries: claudeKeywords.map(k => `${k} 유튜브 쇼츠`)
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 7. 고급 트렌드 추출 도구 (LLM 주도 방식) - 새로 추가
    this.server.tool(
      "extract_trending_keywords_advanced",
      {
        region: z.string().default("KR").describe("지역 코드 (KR, US, JP 등)"),
        maxKeywords: z.number().default(15).describe("추출할 최대 키워드 수"),
        timeContext: z.string().default("현재").describe("시간 맥락 (현재, 오늘, 이번주 등)"),
        categories: z.array(z.string()).optional().describe("관심 카테고리 (예: 엔터테인먼트, 뉴스, 스포츠)"),
        useAIStrategy: z.boolean().default(true).describe("LLM이 스크래핑 전략을 결정하도록 할지")
      },
      async ({ region, maxKeywords, timeContext, categories, useAIStrategy }) => {
        try {
          console.log(`🔥 LLM 주도 트렌드 추출 시작: ${region}, ${timeContext}`);

          let trendingKeywords = [];

          if (useAIStrategy) {
            // LLM이 직접 전략 결정
            const strategyPrompt = `
현재 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
임무: ${region} 지역의 ${timeContext} 실시간 트렌드 키워드를 수집하세요.

사용 가능한 도구들:
1. web_search: 검색 엔진에서 검색
2. web_scrape: 웹페이지 스크래핑
3. browser_navigate: 브라우저로 페이지 탐색

전략 수립:
1. 어떤 웹사이트들을 방문할지 결정 (네이버 실시간 검색어, 다음 실시간 이슈, 구글 트렌드 등)
2. 각 사이트에서 어떤 방식으로 데이터를 추출할지 계획
3. 수집된 데이터를 어떻게 통합하고 분석할지 전략 수립

${categories ? `관심 카테고리: ${categories.join(', ')}` : ''}

답변 형식: JSON
{
  "strategy": "전략 설명",
  "target_sites": ["사이트1", "사이트2"],
  "extraction_method": "추출 방법",
  "expected_keywords": ["예상 키워드1", "예상 키워드2"]
}
`;

            const strategyResponse = await this.anthropic.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 1000,
              messages: [{
                role: 'user',
                content: strategyPrompt
              }]
            });

            const strategy = this.parseClaudeResponse(strategyResponse);
            console.log('🧠 LLM 생성 전략:', strategy);

            // LLM 전략에 따라 실제 스크래핑 실행
            if (strategy.target_sites) {
              for (const site of strategy.target_sites) {
                try {
                  const siteKeywords = await this.extractFromSpecificSite(site, region, timeContext);
                  trendingKeywords.push(...siteKeywords);
                } catch (error) {
                  console.error(`${site} 스크래핑 실패:`, error.message);
                }
              }
            }
          }

          // 폴백: 기본 사이트들 스크래핑
          if (trendingKeywords.length === 0) {
            console.log('🔄 폴백 모드: 기본 트렌드 사이트 스크래핑');
            const defaultSites = region === 'KR' 
              ? ['naver_realtime', 'daum_realtime', 'google_trends_kr']
              : ['google_trends', 'twitter_trending', 'reddit_trending'];
            
            for (const site of defaultSites) {
              try {
                const siteKeywords = await this.extractFromSpecificSite(site, region, timeContext);
                trendingKeywords.push(...siteKeywords);
              } catch (error) {
                console.error(`${site} 스크래핑 실패:`, error.message);
              }
            }
          }

          // 키워드 중복 제거 및 점수 계산
          const consolidatedTrends = this.consolidateTrendingKeywords(trendingKeywords, maxKeywords);

          // LLM으로 최종 분석 및 개선
          const finalAnalysisPrompt = `
수집된 트렌드 키워드들을 분석하고 개선하세요:

원본 데이터: ${JSON.stringify(consolidatedTrends)}

다음 기준으로 분석:
1. 실제 트렌드 가능성 (현실성)
2. YouTube Shorts 콘텐츠 적합성
3. 키워드 품질 및 검색 가능성

개선된 결과를 JSON으로 반환:
{
  "trending_keywords": [
    {
      "keyword": "키워드",
      "score": 95,
      "source": "출처",
      "category": "카테고리",
      "trend_reason": "트렌드 이유"
    }
  ],
  "analysis": "전체 트렌드 분석"
}
`;

          const finalResponse = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            messages: [{
              role: 'user',
              content: finalAnalysisPrompt
            }]
          });

          const finalResult = this.parseClaudeResponse(finalResponse);

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                region,
                timestamp: new Date().toISOString(),
                collection_method: useAIStrategy ? 'llm_guided' : 'traditional',
                trending_keywords: finalResult.trending_keywords || consolidatedTrends,
                analysis: finalResult.analysis || '고급 트렌드 분석 완료',
                total_sources: [...new Set(trendingKeywords.map(t => t.source))].length,
                total_keywords: finalResult.trending_keywords?.length || consolidatedTrends.length
              }, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ 고급 트렌드 추출 실패:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: error.message,
                region,
                fallback_keywords: this.getFallbackTrendingKeywords(region),
                message: 'LLM 주도 트렌드 추출 실패, 폴백 키워드 제공'
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 8. YouTube 검색 쿼리 생성 도구 (LLM 기반) - 새로 추가
    this.server.tool(
      "generate_youtube_search_queries",
      {
        searchKeyword: z.string().describe("기본 검색 키워드"),
        userIntent: z.string().optional().describe("사용자 의도 (예: '최신 트렌드', '인기 영상', '힐링')"),
        contentType: z.string().optional().describe("원하는 콘텐츠 타입 (예: '음악', '게임', '요리', '댄스')"),
        timeframe: z.string().optional().describe("시간 범위 (예: '오늘', '이번주', '이번달', '전체')"),
        audience: z.string().optional().describe("대상 연령층 (예: '전체', '성인', '청소년')"),
        maxQueries: z.number().optional().default(5).describe("생성할 쿼리 수 (1-10)")
      },
      async ({ searchKeyword, userIntent, contentType, timeframe, audience, maxQueries }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🎯 YouTube 쿼리 생성: "${searchKeyword}" - ${userIntent || '일반'}`);
          
          if (!this.anthropic) {
            throw new Error("Claude API 키가 설정되지 않았습니다.");
          }

          // LLM을 사용한 쿼리 전략 생성
          const queryStrategies = await this.generateQueryStrategiesWithLLM(
            searchKeyword, 
            userIntent, 
            contentType, 
            timeframe, 
            audience, 
            maxQueries
          );

          // 각 전략을 실제 YouTube API 쿼리로 변환
          const youtubeQueries = queryStrategies.map(strategy => 
            this.convertToYouTubeAPIQuery(strategy, searchKeyword)
          );

          // 쿼리 품질 평가 및 최적화
          const optimizedQueries = await this.optimizeQueriesWithLLM(youtubeQueries, searchKeyword);

          const result = {
            search_keyword: searchKeyword,
            user_intent: userIntent,
            content_type: contentType,
            timeframe: timeframe,
            strategies: queryStrategies,
            youtube_queries: optimizedQueries,
            total_queries: optimizedQueries.length,
            estimated_api_cost: optimizedQueries.length * 100, // search.list = 100 units each
            usage_recommendation: this.generateUsageRecommendation(optimizedQueries),
            generated_at: new Date().toISOString()
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ YouTube 쿼리 생성 실패:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                search_keyword: searchKeyword,
                fallback_queries: this.generateFallbackQueries(searchKeyword)
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 9. 완전한 영상 검색 워크플로우 (통합 도구) - 새로 추가
    this.server.tool(
      "complete_video_search_workflow",
      {
        userQuery: z.string().describe("사용자의 자연어 요청 (예: '오늘 기분 좋아지는 댄스 영상 찾아줘')"),
        maxResults: z.number().optional().default(20).describe("최종 결과 영상 수"),
        enableKeywordExpansion: z.boolean().optional().default(true).describe("키워드 확장 사용 여부"),
        enableTrendBoost: z.boolean().optional().default(true).describe("트렌드 기반 부스팅 사용 여부"),
        searchStrategies: z.number().optional().default(3).describe("검색 전략 수 (1-5)")
      },
      async ({ userQuery, maxResults, enableKeywordExpansion, enableTrendBoost, searchStrategies }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🌊 완전한 워크플로우 시작: "${userQuery}"`);
          
          const workflowResult = {
            user_query: userQuery,
            workflow_steps: [],
            final_videos: [],
            performance: {
              total_time_ms: 0,
              api_units_used: 0,
              cache_hits: 0
            }
          };

          const startTime = Date.now();

          // 🧠 1단계: LLM 키워드 추출
          console.log('🧠 1단계: LLM 키워드 추출');
          const keywordExtraction = await this.optimizeSearchWithLLM(userQuery);
          workflowResult.workflow_steps.push({
            step: 1,
            name: "LLM 키워드 추출",
            input: userQuery,
            output: keywordExtraction,
            success: true
          });

          // 🔍 2단계: 키워드 확장 (선택적)
          let expandedKeywords = keywordExtraction.keywords || [];
          if (enableKeywordExpansion && expandedKeywords.length > 0) {
            console.log('🔍 2단계: Bright Data 키워드 확장');
            try {
              const expansion = await this.executeExpandKeywordsWithBrightdata({
                claudeKeywords: expandedKeywords.slice(0, 3), // 상위 3개만 확장
                searchContext: keywordExtraction.analysis || 'YouTube Shorts',
                maxKeywords: 15
              });
              
              if (expansion.expanded_keywords) {
                expandedKeywords = [
                  ...expandedKeywords,
                  ...expansion.expanded_keywords.map(k => k.keyword || k).slice(0, 10)
                ];
              }
              
              workflowResult.workflow_steps.push({
                step: 2,
                name: "키워드 확장",
                input: keywordExtraction.keywords,
                output: expandedKeywords,
                success: true
              });
            } catch (error) {
              console.warn('키워드 확장 실패, 기본 키워드 사용:', error.message);
              workflowResult.workflow_steps.push({
                step: 2,
                name: "키워드 확장",
                input: keywordExtraction.keywords,
                output: expandedKeywords,
                success: false,
                error: error.message
              });
            }
          }

          // 📈 2.5단계: 트렌드 부스팅 (선택적)
          if (enableTrendBoost) {
            console.log('📈 2.5단계: 트렌드 키워드 부스팅');
            try {
              const trendData = await this.executeGetTrendingKeywords({
                region: 'KR',
                category: 'entertainment',
                limit: 5
              });
              
              if (trendData.trends && trendData.trends.length > 0) {
                const trendKeywords = trendData.trends.map(t => t.keyword);
                expandedKeywords = [...expandedKeywords, ...trendKeywords];
                
                workflowResult.workflow_steps.push({
                  step: 2.5,
                  name: "트렌드 부스팅",
                  input: expandedKeywords.length - trendKeywords.length,
                  output: expandedKeywords.length,
                  success: true
                });
              }
            } catch (error) {
              console.warn('트렌드 부스팅 실패:', error.message);
            }
          }

          // 🎯 3단계: YouTube API 쿼리 생성
          console.log('🎯 3단계: YouTube API 쿼리 생성');
          const queryGeneration = await this.executeGenerateYouTubeSearchQueries({
            searchKeyword: keywordExtraction.query || userQuery,
            userIntent: keywordExtraction.analysis,
            contentType: this.detectContentType(userQuery),
            timeframe: this.detectTimeframe(userQuery),
            maxQueries: searchStrategies
          });

          workflowResult.workflow_steps.push({
            step: 3,
            name: "YouTube 쿼리 생성",
            input: keywordExtraction.query,
            output: queryGeneration.youtube_queries?.length || 0,
            success: true
          });

          // 🎬 4단계: 실제 YouTube API 호출 (다중 전략)
          console.log('🎬 4단계: YouTube API 다중 검색 실행');
          const allVideos = [];
          let totalApiUnits = 0;

          if (queryGeneration.youtube_queries) {
            // 우선순위 순으로 검색 실행
            const sortedQueries = queryGeneration.youtube_queries
              .sort((a, b) => (a.priority || 5) - (b.priority || 5))
              .slice(0, searchStrategies);

            console.log(`📝 ${sortedQueries.length}개 검색 전략 실행 중...`);

            for (const queryStrategy of sortedQueries) {
              try {
                console.log(`  🎯 전략 실행: ${queryStrategy.strategy_name}`);
                
                // ⭐ 각 전략마다 충분한 후보 요청 (필터링으로 많이 줄어들 것을 고려)
                const targetResults = Math.ceil(maxResults / searchStrategies) + 10; // 여유분 추가
                console.log(`     요청 결과 수: ${targetResults}개 (search.list에서는 50개 후보 확보)`);
                
                const searchResult = await this.executeSearchVideos({
                  query: queryStrategy.api_query.q,
                  maxResults: targetResults, // 목표 결과 수
                  enableLLMOptimization: false // 이미 최적화됨
                });

                if (searchResult.videos) {
                  // 전략별 태그 추가
                  const taggedVideos = searchResult.videos.map(video => ({
                    ...video,
                    search_strategy: queryStrategy.strategy_name,
                    strategy_priority: queryStrategy.priority || 5,
                    filtering_stats: searchResult.filteringStats // 필터링 통계 추가
                  }));
                  
                  allVideos.push(...taggedVideos);
                  totalApiUnits += searchResult.apiUnitsUsed || 107;
                  
                  console.log(`     ✅ ${taggedVideos.length}개 영상 수집 완료`);
                  if (searchResult.filteringStats) {
                    console.log(`     📊 필터링: ${searchResult.filteringStats.overallFilteringRatio} 통과율 (${searchResult.filteringStats.pagesSearched}페이지 검색)`);
                    console.log(`     💎 효율성: ${searchResult.filteringStats.searchEfficiency}`);
                  }
                }
              } catch (error) {
                console.error(`❌ 전략 "${queryStrategy.strategy_name}" 실행 실패:`, error.message);
              }
            }
            
            console.log(`🎊 전체 수집 완료: ${allVideos.length}개 후보 영상`);
          }

          // 🎨 5단계: 결과 통합 및 중복 제거
          console.log('🎨 5단계: 결과 통합 및 최적화');
          const uniqueVideos = this.deduplicateAndRankVideos(allVideos, expandedKeywords);
          const finalVideos = uniqueVideos.slice(0, maxResults);

          workflowResult.workflow_steps.push({
            step: 4,
            name: "YouTube API 다중 검색",
            input: queryGeneration.youtube_queries?.length || 0,
            output: allVideos.length,
            success: true
          });

          workflowResult.workflow_steps.push({
            step: 5,
            name: "결과 통합 및 중복 제거",
            input: allVideos.length,
            output: finalVideos.length,
            success: true
          });

          // 최종 결과 구성
          workflowResult.final_videos = finalVideos;
          workflowResult.performance = {
            total_time_ms: Date.now() - startTime,
            api_units_used: totalApiUnits,
            cache_hits: this.stats.cacheHits,
            workflow_efficiency: finalVideos.length / Math.max(totalApiUnits / 100, 1)
          };

          // 추가 메타데이터
          workflowResult.metadata = {
            extracted_keywords: keywordExtraction.keywords,
            expanded_keywords: expandedKeywords.slice(0, 10),
            search_strategies_used: queryGeneration.youtube_queries?.map(q => q.strategy_name) || [],
            total_candidates_found: allVideos.length,
            deduplication_ratio: allVideos.length > 0 ? (finalVideos.length / allVideos.length * 100).toFixed(1) + '%' : '0%'
          };

          console.log(`✅ 워크플로우 완료: ${finalVideos.length}개 영상, ${totalApiUnits} units 사용`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(workflowResult, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ 완전한 워크플로우 실패:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                error: error.message,
                user_query: userQuery,
                partial_results: "워크플로우 중단됨"
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // 10. 완전한 트렌드 워크플로우 (통합 도구) - 새로 추가
    this.server.tool(
      "complete_trend_workflow",
      {
        trendRequest: z.string().describe("트렌드 요청 (예: '현재 인기 있는 댄스 영상', '오늘의 트렌드 먹방')"),
        region: z.string().optional().default("KR").describe("지역 코드"),
        maxVideos: z.number().optional().default(15).describe("최종 영상 수"),
        timeContext: z.string().optional().default("현재").describe("시간 맥락"),
        categories: z.array(z.string()).optional().describe("관심 카테고리")
      },
      async ({ trendRequest, region, maxVideos, timeContext, categories }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🔥 완전한 트렌드 워크플로우 시작: "${trendRequest}"`);
          
          const trendWorkflow = {
            trend_request: trendRequest,
            region: region,
            workflow_steps: [],
            trending_videos: [],
            performance: {
              total_time_ms: 0,
              api_units_used: 0,
              sources_used: []
            }
          };

          const startTime = Date.now();

          // 🧠 1단계: LLM 트렌드 전략 결정
          console.log('🧠 1단계: LLM 트렌드 전략 결정');
          const trendAnalysis = await this.optimizeSearchWithLLM(trendRequest, `트렌드 검색, 지역: ${region}, 시간: ${timeContext}`);
          
          trendWorkflow.workflow_steps.push({
            step: 1,
            name: "LLM 트렌드 분석",
            input: trendRequest,
            output: trendAnalysis,
            success: true
          });

          // 📈 2단계: 고급 트렌드 키워드 추출
          console.log('📈 2단계: 다중 소스 트렌드 수집');
          const advancedTrends = await this.executeExtractTrendingKeywordsAdvanced({
            region: region,
            maxKeywords: 20,
            timeContext: timeContext,
            categories: categories,
            useAIStrategy: true
          });

          let trendingKeywords = [];
          if (advancedTrends.content && advancedTrends.content[0]) {
            const trendData = JSON.parse(advancedTrends.content[0].text);
            trendingKeywords = trendData.trending_keywords || [];
          }

          trendWorkflow.workflow_steps.push({
            step: 2,
            name: "고급 트렌드 추출",
            input: `${region}/${timeContext}`,
            output: trendingKeywords.length,
            success: trendingKeywords.length > 0
          });

          // 🔍 3단계: 트렌드 키워드 확장 및 조합
          console.log('🔍 3단계: 트렌드 키워드 확장');
          const topTrendKeywords = trendingKeywords.slice(0, 5).map(t => t.keyword);
          let expandedTrendKeywords = [...topTrendKeywords];

          if (topTrendKeywords.length > 0) {
            try {
              const expansion = await this.executeExpandKeywordsWithBrightdata({
                claudeKeywords: topTrendKeywords,
                searchContext: `${timeContext} 트렌드 ${region}`,
                maxKeywords: 15
              });
              
              if (expansion.expanded_keywords) {
                const newKeywords = expansion.expanded_keywords.map(k => k.keyword || k);
                expandedTrendKeywords = [...expandedTrendKeywords, ...newKeywords];
              }
            } catch (error) {
              console.warn('트렌드 키워드 확장 실패:', error.message);
            }
          }

          trendWorkflow.workflow_steps.push({
            step: 3,
            name: "트렌드 키워드 확장",
            input: topTrendKeywords.length,
            output: expandedTrendKeywords.length,
            success: true
          });

          // 🎯 4단계: 트렌드 최적화 쿼리 생성
          console.log('🎯 4단계: 트렌드 최적화 YouTube 쿼리 생성');
          const trendQueries = [];
          
          // 각 상위 트렌드 키워드별로 쿼리 생성
          for (const keyword of topTrendKeywords.slice(0, 3)) {
            try {
              const queryGen = await this.executeGenerateYouTubeSearchQueries({
                searchKeyword: keyword,
                userIntent: '트렌드 영상',
                contentType: this.detectContentType(keyword),
                timeframe: timeContext === '현재' ? '오늘' : timeContext,
                maxQueries: 2
              });
              
              if (queryGen.youtube_queries) {
                trendQueries.push(...queryGen.youtube_queries);
              }
            } catch (error) {
              console.warn(`키워드 "${keyword}" 쿼리 생성 실패:`, error.message);
            }
          }

          trendWorkflow.workflow_steps.push({
            step: 4,
            name: "트렌드 쿼리 생성",
            input: topTrendKeywords.slice(0, 3),
            output: trendQueries.length,
            success: trendQueries.length > 0
          });

          // 🎬 5단계: 트렌드 영상 검색 실행
          console.log('🎬 5단계: 트렌드 영상 다중 검색');
          const allTrendVideos = [];
          let totalApiUnits = 0;

          const executionQueries = trendQueries.slice(0, 4); // 최대 4개 쿼리
          console.log(`🔥 ${executionQueries.length}개 트렌드 쿼리 실행 중...`);

          for (const query of executionQueries) {
            try {
              console.log(`  🎯 트렌드 쿼리: ${query.strategy_name} - "${query.api_query.q}"`);
              
              // ⭐ 트렌드 검색도 충분한 후보 확보 (필터링률 고려)
              const targetResults = Math.ceil(maxVideos / Math.min(trendQueries.length, 4)) + 8; // 여유분
              console.log(`     요청 결과 수: ${targetResults}개 (search.list에서는 50개 후보 확보)`);
              
              const searchResult = await this.executeSearchVideos({
                query: query.api_query.q,
                maxResults: targetResults,
                enableLLMOptimization: false
              });

              if (searchResult.videos) {
                const taggedVideos = searchResult.videos.map(video => ({
                  ...video,
                  trend_source: query.strategy_name,
                  trend_score: this.calculateTrendScore(video, trendingKeywords),
                  is_trending: true,
                  filtering_stats: searchResult.filteringStats
                }));
                
                allTrendVideos.push(...taggedVideos);
                totalApiUnits += searchResult.apiUnitsUsed || 107;
                
                console.log(`     ✅ ${taggedVideos.length}개 트렌드 영상 수집`);
                if (searchResult.filteringStats) {
                  console.log(`     📊 필터링: ${searchResult.filteringStats.overallFilteringRatio} 통과율 (${searchResult.filteringStats.pagesSearched}페이지 검색)`);
                  console.log(`     💎 효율성: ${searchResult.filteringStats.searchEfficiency}`);
                }
              }
            } catch (error) {
              console.error(`❌ 트렌드 쿼리 실행 실패:`, error.message);
            }
          }
          
          console.log(`🔥 트렌드 수집 완료: ${allTrendVideos.length}개 후보 영상`);

          trendWorkflow.workflow_steps.push({
            step: 5,
            name: "트렌드 영상 검색",
            input: trendQueries.length,
            output: allTrendVideos.length,
            success: true
          });

          trendWorkflow.workflow_steps.push({
            step: 6,
            name: "트렌드 점수 정렬",
            input: allTrendVideos.length,
            output: this.deduplicateAndRankVideos(allTrendVideos, expandedTrendKeywords).length,
            success: true
          });

          // 최종 결과 구성
          trendWorkflow.trending_videos = this.deduplicateAndRankVideos(allTrendVideos, expandedTrendKeywords);
          trendWorkflow.performance = {
            total_time_ms: Date.now() - startTime,
            api_units_used: totalApiUnits,
            sources_used: [...new Set(trendingKeywords.map(t => t.source))],
            trend_coverage: `${trendWorkflow.trending_videos.length}/${maxVideos}`
          };

          // 트렌드 분석 메타데이터
          trendWorkflow.trend_analysis = {
            discovered_trends: trendingKeywords.slice(0, 10),
            trend_categories: [...new Set(trendingKeywords.map(t => t.category))],
            avg_trend_score: trendWorkflow.trending_videos.length > 0 
              ? (trendWorkflow.trending_videos.reduce((sum, v) => sum + (v.trend_score || 0), 0) / trendWorkflow.trending_videos.length).toFixed(2)
              : 0,
            trend_freshness: timeContext
          };

          console.log(`✅ 트렌드 워크플로우 완료: ${trendWorkflow.trending_videos.length}개 트렌드 영상`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(trendWorkflow, null, 2)
            }]
          };

        } catch (error) {
          console.error('❌ 트렌드 워크플로우 실패:', error);
          throw error;
        }
      }
    );
  }

  /**
   * 📁 MCP Resources 설정
   */
  setupResources() {
    // 1. 캐시된 검색 결과 리소스
    this.server.resource(
      "cached-searches",
      "cache://searches",
      async (uri) => {
        this.stats.resourceReads++;
        
        const cachedSearches = Array.from(this.cache.entries())
          .filter(([key]) => key.startsWith('search:'))
          .map(([key, value]) => ({
            query: key.replace('search:', ''),
            resultCount: value.videos?.length || 0,
            cachedAt: value.cachedAt,
            expiresAt: value.expiresAt
          }));

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(cachedSearches, null, 2)
          }]
        };
      }
    );

    // 2. 트렌드 데이터 리소스
    this.server.resource(
      "trend-data",
      "trends://current",
      async (uri) => {
        this.stats.resourceReads++;
        
        try {
          const regions = ['KR', 'US', 'JP'];
          const allTrends = {};

          for (const region of regions) {
            const trends = await this.getBrightDataTrends(region, 'entertainment', 5);
            allTrends[region] = trends;
          }

          return {
            contents: [{
              uri: uri.href,
              mimeType: "application/json", 
              text: JSON.stringify({
                trends: allTrends,
                updatedAt: new Date().toISOString(),
                source: "bright_data_realtime"
              }, null, 2)
            }]
          };

        } catch (error) {
          return {
            contents: [{
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({
                error: error.message,
                fallback: "트렌드 데이터를 사용할 수 없습니다."
              }, null, 2)
            }]
          };
        }
      }
    );

    // 3. API 사용량 리포트 리소스
    this.server.resource(
      "api-usage",
      "reports://api-usage",
      async (uri) => {
        this.stats.resourceReads++;
        
        const usageReport = {
          totalAPIUnits: this.stats.apiUnitsUsed,
          dailyLimit: 10000,
          usagePercentage: (this.stats.apiUnitsUsed / 10000) * 100,
          remainingUnits: 10000 - this.stats.apiUnitsUsed,
          breakdown: {
            searchCalls: this.stats.toolCalls,
            averageUnitsPerCall: this.stats.apiUnitsUsed / Math.max(this.stats.toolCalls, 1)
          },
          timestamp: new Date().toISOString()
        };

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(usageReport, null, 2)
          }]
        };
      }
    );
  }

  /**
   * 💬 MCP Prompts 설정
   */
  setupPrompts() {
    // 1. 검색 최적화 프롬프트
    this.server.prompt(
      "optimize-search",
      {
        userQuery: z.string().describe("사용자의 원본 검색 요청"),
        context: z.string().optional().describe("추가 컨텍스트")
      },
      ({ userQuery, context }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `YouTube Shorts 검색을 위해 다음 사용자 요청을 최적화해주세요:

사용자 요청: "${userQuery}"
${context ? `추가 컨텍스트: ${context}` : ''}

다음 JSON 형식으로 응답해주세요:
{
  "query": "최적화된 검색 키워드",
  "keywords": ["핵심", "키워드", "목록"],
  "filters": {
    "duration": "short",
    "order": "relevance",
    "regionCode": "KR"
  },
  "analysis": "최적화 이유"
}`
          }
        }]
      })
    );

    // 2. 결과 분석 프롬프트
    this.server.prompt(
      "analyze-results",
      {
        searchQuery: z.string().describe("검색 쿼리"),
        results: z.string().describe("검색 결과 JSON")
      },
      ({ searchQuery, results }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `다음 YouTube Shorts 검색 결과를 분석해주세요:

검색 쿼리: "${searchQuery}"
결과 데이터: ${results}

다음 관점에서 분석해주세요:
1. 결과의 다양성과 품질
2. 트렌드 부합도
3. 사용자 의도 충족도
4. 개선 제안사항

JSON 형식으로 응답해주세요.`
          }
        }]
      })
    );

    // 3. 트렌드 기반 추천 프롬프트
    this.server.prompt(
      "trend-recommendations",
      {
        currentTrends: z.string().describe("현재 트렌드 데이터"),
        userPreferences: z.string().optional().describe("사용자 선호도")
      },
      ({ currentTrends, userPreferences }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `현재 트렌드를 바탕으로 YouTube Shorts 추천을 생성해주세요:

현재 트렌드: ${currentTrends}
${userPreferences ? `사용자 선호도: ${userPreferences}` : ''}

다음을 포함한 추천을 생성해주세요:
1. 트렌딩 키워드 기반 검색어 5개
2. 각 추천의 이유
3. 예상 인기도 점수 (1-10)

JSON 형식으로 응답해주세요.`
          }
        }]
      })
    );
  }

  /**
   * 🚀 서버 시작 (stdio 트랜스포트)
   */
  async startStdio() {
    console.log('🎬 YouTube Shorts AI MCP 서버 시작 (stdio)...');
    
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('✅ MCP 서버가 stdio에서 실행 중입니다.');
      
    } catch (error) {
      console.error('❌ stdio 서버 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 🌐 MCP StreamableHTTP 서버 시작 (정식 MCP 규격 준수)
   */
  async startHTTP(port = 3000) {
    console.log(`🎬 YouTube Shorts AI MCP 서버 시작 (MCP StreamableHTTP:${port})...`);
    
    try {
      // ⭐ 정식 MCP StreamableHTTP 트랜스포트 사용
      const httpTransport = new StreamableHTTPServerTransport(port);
      await this.server.connect(httpTransport);
      
      console.log(`✅ MCP StreamableHTTP 서버가 포트 ${port}에서 실행 중입니다.`);
      console.log(`🌐 MCP Endpoint: http://localhost:${port}/`);
      console.log(`📡 지원 프로토콜: Model Context Protocol (MCP) over HTTP`);
      
      // 🔧 Express 기반 Backend 호환 레이어 추가
      await this.startBackendCompatibilityLayer(port + 1); // 다음 포트에서 실행
      
    } catch (error) {
      console.error('❌ MCP StreamableHTTP 서버 시작 실패:', error);
      console.log('🔄 Express 기반 HTTP 서버로 폴백...');
      await this.startExpressHTTP(port);
    }
  }

  /**
   * 🔗 Backend 호환성 레이어 (별도 포트)
   */
  async startBackendCompatibilityLayer(port = 3001) {
    console.log(`🔗 Backend 호환성 레이어 시작 (포트 ${port})...`);
    
    try {
      // Express 서버 생성
      const express = (await import('express')).default;
      const cors = (await import('cors')).default;
      const app = express();

      // 미들웨어 설정
      app.use(cors());
      app.use(express.json());
      
      // 로깅 미들웨어
      app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} Backend API ${req.method} ${req.path}`);
        next();
      });

      // Backend 호환 엔드포인트들
      this.setupBackendEndpoints(app);

      // Backend 호환성 서버 시작
      app.listen(port, () => {
        console.log(`✅ Backend 호환성 레이어가 포트 ${port}에서 실행 중입니다.`);
        console.log(`🎬 Backend APIs:`);
        console.log(`  - POST http://localhost:${port}/api/search`);
        console.log(`  - POST http://localhost:${port}/api/chat`);
        console.log(`  - GET http://localhost:${port}/api/trends`);
      });
      
    } catch (error) {
      console.error('❌ Backend 호환성 레이어 시작 실패:', error);
    }
  }

  /**
   * 🔄 Express HTTP 서버 (폴백용)
   */
  async startExpressHTTP(port = 3000) {
    console.log(`🔄 Express HTTP 서버 시작 (폴백 모드, 포트:${port})...`);
    
    try {
      // Express 서버 생성
      const express = (await import('express')).default;
      const cors = (await import('cors')).default;
      const app = express();

      // 미들웨어 설정
      app.use(cors());
      app.use(express.json());
      
      // 로깅 미들웨어
      app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} HTTP ${req.method} ${req.path}`);
        next();
      });

      // 헬스 체크 엔드포인트
      app.get('/health', (req, res) => {
        res.json({
          status: 'ok',
          service: 'YouTube Shorts AI MCP Server (Express 폴백)',
          version: '1.0.0',
          mode: 'express_fallback',
          timestamp: new Date().toISOString(),
          config: {
            hasClaudeKey: !!this.config.claudeApiKey,
            hasYouTubeKey: !!this.config.youtubeApiKey,
            hasBrightDataKey: !!this.config.brightDataApiKey
          }
        });
      });

      // Backend 호환 엔드포인트들
      this.setupBackendEndpoints(app);

      // MCP 도구 호출 API
      this.setupMCPToolsAPI(app);

      // 리소스 조회 API
      this.setupResourcesAPI(app);

      // 404 핸들러
      app.use('*', (req, res) => {
        res.status(404).json({
          error: 'Endpoint not found',
          path: req.originalUrl,
          availableEndpoints: [
            'GET /health',
            'POST /api/tools/call',
            'GET /api/resources/:name',
            'POST /api/search',
            'POST /api/chat', 
            'GET /api/trends'
          ]
        });
      });

      // HTTP 서버 시작
      app.listen(port, () => {
        console.log(`✅ Express HTTP 서버가 포트 ${port}에서 실행 중입니다.`);
        console.log(`🌐 Health Check: http://localhost:${port}/health`);
        console.log(`🛠️ Tools API: POST http://localhost:${port}/api/tools/call`);
        console.log(`📁 Resources API: GET http://localhost:${port}/api/resources/:name`);
        console.log(`🎬 Backend APIs:`);
        console.log(`  - POST http://localhost:${port}/api/search`);
        console.log(`  - POST http://localhost:${port}/api/chat`);
        console.log(`  - GET http://localhost:${port}/api/trends`);
      });
      
    } catch (error) {
      console.error('❌ Express HTTP 서버 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 🔗 Backend 호환 엔드포인트 설정
   */
  setupBackendEndpoints(app) {
    // YouTube Shorts 검색 API (Backend 호환)
    app.post('/api/search', async (req, res) => {
      try {
        const { query, options = {} } = req.body;
        
        if (!query) {
          return res.status(400).json({
            success: false,
            error: 'query parameter is required'
          });
        }

        console.log(`🔍 Backend Search: "${query}"`);
        
        // MCP Tool 'search_videos' 호출
        const result = await this.executeSearchVideos({
          query,
          maxResults: options.maxResults || 10,
          enableLLMOptimization: options.enableLLMOptimization !== false,
          includeAnalysis: options.includeAnalysis || false
        });
        
        res.json({
          success: true,
          results: result,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error(`❌ Backend Search Error:`, error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // AI 대화형 검색 API (Backend 호환)  
    app.post('/api/chat', async (req, res) => {
      try {
        const { message, useAI = true, maxResults = 20 } = req.body;
        
        if (!message) {
          return res.status(400).json({
            success: false,
            error: 'message parameter is required'
          });
        }

        console.log(`💬 Backend Chat: "${message}"`);
        
        // 1단계: Claude AI로 쿼리 최적화
        const optimizedQuery = await this.executeOptimizeQuery({
          userMessage: message
        });
        
        // 2단계: 최적화된 쿼리로 검색
        const searchResult = await this.executeSearchVideos({
          query: optimizedQuery.query || message,
          maxResults,
          enableLLMOptimization: false, // 이미 최적화됨
          includeAnalysis: true
        });
        
        res.json({
          success: true,
          response: `"${message}"에 대한 검색 결과입니다.`,
          keywords: optimizedQuery.keywords || [],
          videos: searchResult.videos || [],
          optimizedQuery: optimizedQuery.query,
          analysis: optimizedQuery.analysis,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error(`❌ Backend Chat Error:`, error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 트렌드 키워드 API (Backend 호환)
    app.get('/api/trends', async (req, res) => {
      try {
        const { region = 'KR', category = 'entertainment' } = req.query;
        
        console.log(`📈 Backend Trends: ${region}/${category}`);
        
        // MCP Tool 'get_trending_keywords' 호출
        const result = await this.executeGetTrendingKeywords({
          region,
          category,
          limit: 10
        });
        
        res.json({
          success: true,
          trending: result.trends || [],
          categories: { [category]: result.trends || [] },
          region: result.region,
          updatedAt: result.updatedAt,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error(`❌ Backend Trends Error:`, error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  /**
   * 🛠️ MCP 도구 호출 API 설정
   */
  setupMCPToolsAPI(app) {
    app.post('/api/tools/call', async (req, res) => {
      try {
        const { name, arguments: args } = req.body;
        
        if (!name) {
          return res.status(400).json({
            success: false,
            error: 'Tool name is required'
          });
        }

        console.log(`🔧 HTTP Tool Call: ${name}`);
        
        let result;
        
        // 도구별 실행
        switch (name) {
          case 'search_videos':
            result = await this.executeSearchVideos(args);
            break;
          case 'optimize_query':
            result = await this.executeOptimizeQuery(args);
            break;
          case 'get_trending_keywords':
            result = await this.executeGetTrendingKeywords(args);
            break;
          case 'get_server_stats':
            result = await this.executeGetServerStats(args);
            break;
          case 'extract_related_keywords':
            result = await this.executeExtractRelatedKeywords(args);
            break;
          case 'expand_keywords_with_brightdata':
            result = await this.executeExpandKeywordsWithBrightdata(args);
            break;
          case 'extract_trending_keywords_advanced':
            result = await this.executeExtractTrendingKeywordsAdvanced(args);
            break;
          case 'generate_youtube_search_queries':
            result = await this.executeGenerateYouTubeSearchQueries(args);
            break;
          case 'complete_video_search_workflow':
            result = await this.executeCompleteVideoSearchWorkflow(args);
            break;
          case 'complete_trend_workflow':
            result = await this.executeCompleteTrendWorkflow(args);
            break;
          default:
            return res.status(404).json({
              success: false,
              error: `Tool '${name}' not found`,
              availableTools: [
                'search_videos',
                'optimize_query', 
                'get_trending_keywords',
                'get_server_stats',
                'extract_related_keywords',
                'expand_keywords_with_brightdata',
                'extract_trending_keywords_advanced',
                'generate_youtube_search_queries',
                'complete_video_search_workflow',
                'complete_trend_workflow'
              ]
            });
        }

        res.json({
          success: true,
          result: result,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error(`❌ HTTP Tool Error:`, error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * 📁 리소스 조회 API 설정
   */
  setupResourcesAPI(app) {
    app.get('/api/resources/:name', async (req, res) => {
      try {
        const { name } = req.params;
        
        let data;
        switch (name) {
          case 'cached-searches':
            data = this.getCachedSearches();
            break;
          case 'trend-data':
            data = await this.getCurrentTrendData();
            break;
          case 'api-usage':
            data = this.getApiUsageReport();
            break;
          default:
            return res.status(404).json({
              success: false,
              error: `Resource '${name}' not found`
            });
        }

        res.json({
          success: true,
          resource: name,
          data: data,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error(`❌ HTTP Resource Error:`, error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  // === HTTP API 도구 실행 메서드들 ===

  async executeSearchVideos(args) {
    const { query, maxResults = 10, nextPageToken, enableLLMOptimization = true, includeAnalysis = false } = args || {};
    
    if (!query) {
      throw new Error('query parameter is required');
    }

    // LLM 최적화
    let optimizedParams = { query };
    if (enableLLMOptimization && this.anthropic) {
      optimizedParams = await this.optimizeSearchWithLLM(query);
    }

    // YouTube 검색
    const searchResults = await this.searchYouTubeVideos(optimizedParams, maxResults, nextPageToken);
    
    // 결과 포맷
    const result = {
      query: query,
      optimizedQuery: optimizedParams.query !== query ? optimizedParams.query : null,
      totalResults: searchResults.videos.length,
      videos: searchResults.videos.map(video => ({
        id: video.id.videoId || video.id,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        description: video.snippet.description.substring(0, 200) + "...",
        thumbnailUrl: video.snippet.thumbnails.medium?.url,
        publishedAt: video.snippet.publishedAt,
        duration: this.parseISO8601Duration(video.contentDetails?.duration),
        viewCount: parseInt(video.statistics?.viewCount || 0),
        url: `https://www.youtube.com/shorts/${video.id.videoId || video.id}`
      })),
      nextPageToken: searchResults.nextPageToken,
      apiUnitsUsed: searchResults.apiUsage?.totalUnits || 109, // 새로운 구조 사용
      filteringStats: searchResults.filteringStats,
      searchEfficiency: searchResults.filteringStats?.searchEfficiency || 'N/A'
    };

    // 상세 분석 추가
    if (includeAnalysis && this.anthropic) {
      result.analysis = await this.analyzeResults(searchResults.videos);
    }

    this.stats.apiUnitsUsed += result.apiUnitsUsed;
    return result;
  }

  async executeOptimizeQuery(args) {
    const { userMessage, context } = args || {};
    
    if (!userMessage) {
      throw new Error('userMessage parameter is required');
    }

    return await this.optimizeSearchWithLLM(userMessage, context);
  }

  async executeGetTrendingKeywords(args) {
    const { region = 'KR', category = 'entertainment', limit = 10 } = args || {};
    
    const trends = await this.getBrightDataTrends(region, category, limit);
    
    return {
      region,
      category,
      trends: trends.map(trend => ({
        keyword: trend.keyword,
        score: trend.score,
        searchVolume: trend.searchVolume,
        growthRate: trend.growthRate,
        relatedTerms: trend.relatedTerms
      })),
      updatedAt: new Date().toISOString(),
      source: "bright_data_mcp"
    };
  }

  async executeGetServerStats() {
    return {
      server: "youtube-shorts-ai-curator",
      version: "1.0.0",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      stats: {
        ...this.stats,
        cacheSize: this.cache.size
      },
      config: {
        hasClaudeKey: !!this.config.claudeApiKey,
        hasYouTubeKey: !!this.config.youtubeApiKey,
        hasBrightDataKey: !!this.config.brightDataApiKey
      },
      timestamp: new Date().toISOString()
    };
  }

  async executeExtractRelatedKeywords(args) {
    const { baseKeywords, searchContext, maxKeywords = 20 } = args || {};
    
    if (!baseKeywords || !Array.isArray(baseKeywords)) {
      throw new Error('baseKeywords parameter is required and must be an array');
    }

    const relatedKeywords = await this.extractRelatedKeywordsWithBrightData(
      baseKeywords, 
      searchContext, 
      maxKeywords
    );
    
    return {
      baseKeywords,
      searchContext,
      relatedKeywords: relatedKeywords.slice(0, maxKeywords),
      generatedSearchQueries: this.generateSearchQueries(baseKeywords, relatedKeywords),
      timestamp: new Date().toISOString(),
      source: "bright_data_mcp"
    };
  }

  async executeExpandKeywordsWithBrightdata(args) {
    const { claudeKeywords, searchContext, maxKeywords = 20, includeAutocomplete = true } = args || {};
    
    if (!claudeKeywords || !Array.isArray(claudeKeywords)) {
      throw new Error('claudeKeywords parameter is required and must be an array');
    }

    try {
      console.log(`🔍 Bright Data MCP 키워드 확장: ${claudeKeywords.join(', ')}`);

      let expandedKeywords = [];

      // Bright Data MCP 초기화
      if (!this.brightDataMcp.isConnected) {
        await this.brightDataMcp.startBrightDataMCP();
      }

      // 각 Claude 키워드에 대해 확장 수행
      for (const keyword of claudeKeywords) {
        try {
          // 1. Google 자동완성 수집
          if (includeAutocomplete) {
            const autocomplete = await this.brightDataMcp.getAutocomplete(keyword, searchContext);
            expandedKeywords.push(...autocomplete.map(k => ({ keyword: k, source: 'google_autocomplete', baseKeyword: keyword })));
          }

          // 2. 관련 검색어 수집
          const related = await this.brightDataMcp.getRelatedKeywords(keyword);
          expandedKeywords.push(...related.map(k => ({ keyword: k, source: 'related_search', baseKeyword: keyword })));

          // 3. YouTube 제안 수집
          const youtube = await this.brightDataMcp.getYouTubeSuggestions(keyword);
          expandedKeywords.push(...youtube.map(k => ({ keyword: k, source: 'youtube_suggestions', baseKeyword: keyword })));

        } catch (error) {
          console.error(`키워드 "${keyword}" 확장 실패:`, error.message);
          
          // 폴백: 기본 확장 패턴 사용
          const fallbackExpansion = this.generateFallbackExpansion(keyword);
          expandedKeywords.push(...fallbackExpansion);
        }
      }

      // 중복 제거 및 정제
      const uniqueKeywords = this.deduplicateAndScore(expandedKeywords, maxKeywords);

      // Claude를 사용한 최종 키워드 품질 평가
      const qualityEvaluationPrompt = `
다음 확장된 키워드들을 평가하고 YouTube Shorts에 가장 적합한 키워드들을 선별하세요:

기본 키워드: ${claudeKeywords.join(', ')}
확장된 키워드들: ${uniqueKeywords.map(k => k.keyword).join(', ')}
검색 맥락: ${searchContext || '일반'}

평가 기준:
1. YouTube Shorts 콘텐츠 적합성
2. 검색 볼륨 가능성
3. 기본 키워드와의 관련성
4. 트렌드 가능성

최고 품질의 키워드 ${Math.min(maxKeywords, 20)}개를 선별하여 JSON으로 반환:
{
  "expanded_keywords": [
    {
      "keyword": "선별된 키워드",
      "score": 95,
      "reason": "선별 이유",
      "category": "카테고리",
      "search_potential": "high/medium/low"
    }
  ],
  "expansion_summary": "확장 과정 요약"
}
`;

      const evaluationResponse = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: qualityEvaluationPrompt
        }]
      });

      const evaluation = this.parseClaudeResponse(evaluationResponse);

      // OR 연산자 기반 고급 검색 쿼리 생성
      const advancedQueries = this.generateAdvancedSearchQueries(
        claudeKeywords, 
        evaluation.expanded_keywords || uniqueKeywords
      );

      return {
        base_keywords: claudeKeywords,
        search_context: searchContext,
        expanded_keywords: evaluation.expanded_keywords || uniqueKeywords,
        total_expanded: (evaluation.expanded_keywords || uniqueKeywords).length,
        advanced_queries: advancedQueries,
        expansion_summary: evaluation.expansion_summary || '키워드 확장 완료',
        sources_used: [...new Set(expandedKeywords.map(k => k.source))],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Bright Data 키워드 확장 실패:', error);
      throw error;
    }
  }

  async executeExtractTrendingKeywordsAdvanced(args) {
    const { region = 'KR', maxKeywords = 15, timeContext = '현재', categories = [], useAIStrategy = true } = args || {};
    
    try {
      console.log(`🔥 LLM 주도 트렌드 추출 시작: ${region}, ${timeContext}`);

      let trendingKeywords = [];

      if (useAIStrategy) {
        // LLM이 직접 전략 결정
        const strategyPrompt = `
현재 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
임무: ${region} 지역의 ${timeContext} 실시간 트렌드 키워드를 수집하세요.

사용 가능한 도구들:
1. web_search: 검색 엔진에서 검색
2. web_scrape: 웹페이지 스크래핑
3. browser_navigate: 브라우저로 페이지 탐색

전략 수립:
1. 어떤 웹사이트들을 방문할지 결정 (네이버 실시간 검색어, 다음 실시간 이슈, 구글 트렌드 등)
2. 각 사이트에서 어떤 방식으로 데이터를 추출할지 계획
3. 수집된 데이터를 어떻게 통합하고 분석할지 전략 수립

${categories ? `관심 카테고리: ${categories.join(', ')}` : ''}

답변 형식: JSON
{
  "strategy": "전략 설명",
  "target_sites": ["사이트1", "사이트2"],
  "extraction_method": "추출 방법",
  "expected_keywords": ["예상 키워드1", "예상 키워드2"]
}
`;

        const strategyResponse = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: strategyPrompt
          }]
        });

        const strategy = this.parseClaudeResponse(strategyResponse);
        console.log('🧠 LLM 생성 전략:', strategy);

        // LLM 전략에 따라 실제 스크래핑 실행
        if (strategy.target_sites) {
          for (const site of strategy.target_sites) {
            try {
              const siteKeywords = await this.extractFromSpecificSite(site, region, timeContext);
              trendingKeywords.push(...siteKeywords);
            } catch (error) {
              console.error(`${site} 스크래핑 실패:`, error.message);
            }
          }
        }
      }

      // 폴백: 기본 사이트들 스크래핑
      if (trendingKeywords.length === 0) {
        console.log('🔄 폴백 모드: 기본 트렌드 사이트 스크래핑');
        const defaultSites = region === 'KR' 
          ? ['naver_realtime', 'daum_realtime', 'google_trends_kr']
          : ['google_trends', 'twitter_trending', 'reddit_trending'];
        
        for (const site of defaultSites) {
          try {
            const siteKeywords = await this.extractFromSpecificSite(site, region, timeContext);
            trendingKeywords.push(...siteKeywords);
          } catch (error) {
            console.error(`${site} 스크래핑 실패:`, error.message);
          }
        }
      }

      // 키워드 중복 제거 및 점수 계산
      const consolidatedTrends = this.consolidateTrendingKeywords(trendingKeywords, maxKeywords);

      // LLM으로 최종 분석 및 개선
      const finalAnalysisPrompt = `
수집된 트렌드 키워드들을 분석하고 개선하세요:

원본 데이터: ${JSON.stringify(consolidatedTrends)}

다음 기준으로 분석:
1. 실제 트렌드 가능성 (현실성)
2. YouTube Shorts 콘텐츠 적합성
3. 키워드 품질 및 검색 가능성

개선된 결과를 JSON으로 반환:
{
  "trending_keywords": [
    {
      "keyword": "키워드",
      "score": 95,
      "source": "출처",
      "category": "카테고리",
      "trend_reason": "트렌드 이유"
    }
  ],
  "analysis": "전체 트렌드 분석"
}
`;

      const finalResponse = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: finalAnalysisPrompt
        }]
      });

      const finalResult = this.parseClaudeResponse(finalResponse);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            region,
            timestamp: new Date().toISOString(),
            collection_method: useAIStrategy ? 'llm_guided' : 'traditional',
            trending_keywords: finalResult.trending_keywords || consolidatedTrends,
            analysis: finalResult.analysis || '고급 트렌드 분석 완료',
            total_sources: [...new Set(trendingKeywords.map(t => t.source))].length,
            total_keywords: finalResult.trending_keywords?.length || consolidatedTrends.length
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error('❌ 고급 트렌드 추출 실패:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error.message,
            region,
            fallback_keywords: this.getFallbackTrendingKeywords(region),
            message: 'LLM 주도 트렌드 추출 실패, 폴백 키워드 제공'
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  async executeGenerateYouTubeSearchQueries(args) {
    const { searchKeyword, userIntent, contentType, timeframe, audience, maxQueries = 5 } = args || {};
    
    try {
      console.log(`🎯 YouTube 쿼리 생성: "${searchKeyword}" - ${userIntent || '일반'}`);
      
      if (!this.anthropic) {
        throw new Error("Claude API 키가 설정되지 않았습니다.");
      }

      // LLM을 사용한 쿼리 전략 생성
      const queryStrategies = await this.generateQueryStrategiesWithLLM(
        searchKeyword, 
        userIntent, 
        contentType, 
        timeframe, 
        audience, 
        maxQueries
      );

      // 각 전략을 실제 YouTube API 쿼리로 변환
      const youtubeQueries = queryStrategies.map(strategy => 
        this.convertToYouTubeAPIQuery(strategy, searchKeyword)
      );

      // 쿼리 품질 평가 및 최적화
      const optimizedQueries = await this.optimizeQueriesWithLLM(youtubeQueries, searchKeyword);

      const result = {
        search_keyword: searchKeyword,
        user_intent: userIntent,
        content_type: contentType,
        timeframe: timeframe,
        strategies: queryStrategies,
        youtube_queries: optimizedQueries,
        total_queries: optimizedQueries.length,
        estimated_api_cost: optimizedQueries.length * 100, // search.list = 100 units each
        usage_recommendation: this.generateUsageRecommendation(optimizedQueries),
        generated_at: new Date().toISOString()
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      console.error('❌ YouTube 쿼리 생성 실패:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            error: error.message,
            search_keyword: searchKeyword,
            fallback_queries: this.generateFallbackQueries(searchKeyword)
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  async executeCompleteVideoSearchWorkflow(args) {
    const { userQuery, maxResults = 20, enableKeywordExpansion = true, enableTrendBoost = true, searchStrategies = 3 } = args || {};
    
    try {
      console.log(`🌊 완전한 워크플로우 실행: "${userQuery}"`);
      
      const workflowResult = {
        user_query: userQuery,
        workflow_steps: [],
        final_videos: [],
        performance: {
          total_time_ms: 0,
          api_units_used: 0,
          cache_hits: 0
        }
      };

      const startTime = Date.now();

      // 🧠 1단계: LLM 키워드 추출
      console.log('🧠 1단계: LLM 키워드 추출');
      const keywordExtraction = await this.optimizeSearchWithLLM(userQuery);
      workflowResult.workflow_steps.push({
        step: 1,
        name: "LLM 키워드 추출",
        input: userQuery,
        output: keywordExtraction,
        success: true
      });

      // 🔍 2단계: 키워드 확장 (선택적)
      let expandedKeywords = keywordExtraction.keywords || [];
      if (enableKeywordExpansion && expandedKeywords.length > 0) {
        console.log('🔍 2단계: Bright Data 키워드 확장');
        try {
          const expansion = await this.executeExpandKeywordsWithBrightdata({
            claudeKeywords: expandedKeywords.slice(0, 3), // 상위 3개만 확장
            searchContext: keywordExtraction.analysis || 'YouTube Shorts',
            maxKeywords: 15
          });
          
          if (expansion.expanded_keywords) {
            expandedKeywords = [
              ...expandedKeywords,
              ...expansion.expanded_keywords.map(k => k.keyword || k).slice(0, 10)
            ];
          }
          
          workflowResult.workflow_steps.push({
            step: 2,
            name: "키워드 확장",
            input: keywordExtraction.keywords,
            output: expandedKeywords,
            success: true
          });
        } catch (error) {
          console.warn('키워드 확장 실패, 기본 키워드 사용:', error.message);
          workflowResult.workflow_steps.push({
            step: 2,
            name: "키워드 확장",
            input: keywordExtraction.keywords,
            output: expandedKeywords,
            success: false,
            error: error.message
          });
        }
      }

      // 📈 2.5단계: 트렌드 부스팅 (선택적)
      if (enableTrendBoost) {
        console.log('📈 2.5단계: 트렌드 키워드 부스팅');
        try {
          const trendData = await this.executeGetTrendingKeywords({
            region: 'KR',
            category: 'entertainment',
            limit: 5
          });
          
          if (trendData.trends && trendData.trends.length > 0) {
            const trendKeywords = trendData.trends.map(t => t.keyword);
            expandedKeywords = [...expandedKeywords, ...trendKeywords];
            
            workflowResult.workflow_steps.push({
              step: 2.5,
              name: "트렌드 부스팅",
              input: expandedKeywords.length - trendKeywords.length,
              output: expandedKeywords.length,
              success: true
            });
          }
        } catch (error) {
          console.warn('트렌드 부스팅 실패:', error.message);
        }
      }

      // 🎯 3단계: YouTube API 쿼리 생성
      console.log('🎯 3단계: YouTube API 쿼리 생성');
      const queryGeneration = await this.executeGenerateYouTubeSearchQueries({
        searchKeyword: keywordExtraction.query || userQuery,
        userIntent: keywordExtraction.analysis,
        contentType: this.detectContentType(userQuery),
        timeframe: this.detectTimeframe(userQuery),
        maxQueries: searchStrategies
      });

      workflowResult.workflow_steps.push({
        step: 3,
        name: "YouTube 쿼리 생성",
        input: keywordExtraction.query,
        output: queryGeneration.youtube_queries?.length || 0,
        success: true
      });

      // 🎬 4단계: 실제 YouTube API 호출 (다중 전략)
      console.log('🎬 4단계: YouTube API 다중 검색 실행');
      const allVideos = [];
      let totalApiUnits = 0;

      if (queryGeneration.youtube_queries) {
        // 우선순위 순으로 검색 실행
        const sortedQueries = queryGeneration.youtube_queries
          .sort((a, b) => (a.priority || 5) - (b.priority || 5))
          .slice(0, searchStrategies);

        for (const queryStrategy of sortedQueries) {
          try {
            console.log(`  📝 전략 실행: ${queryStrategy.strategy_name}`);
            
            const searchResult = await this.executeSearchVideos({
              query: queryStrategy.api_query.q,
              maxResults: Math.ceil(maxResults / searchStrategies) + 5, // 여유분
              enableLLMOptimization: false // 이미 최적화됨
            });

            if (searchResult.videos) {
              // 전략별 태그 추가
              const taggedVideos = searchResult.videos.map(video => ({
                ...video,
                search_strategy: queryStrategy.strategy_name,
                strategy_priority: queryStrategy.priority || 5
              }));
              
              allVideos.push(...taggedVideos);
              totalApiUnits += searchResult.apiUnitsUsed || 107;
            }
          } catch (error) {
            console.error(`전략 "${queryStrategy.strategy_name}" 실행 실패:`, error.message);
          }
        }
      }

      // 🎨 5단계: 결과 통합 및 중복 제거
      console.log('🎨 5단계: 결과 통합 및 최적화');
      const uniqueVideos = this.deduplicateAndRankVideos(allVideos, expandedKeywords);
      const finalVideos = uniqueVideos.slice(0, maxResults);

      workflowResult.workflow_steps.push({
        step: 4,
        name: "YouTube API 다중 검색",
        input: queryGeneration.youtube_queries?.length || 0,
        output: allVideos.length,
        success: true
      });

      workflowResult.workflow_steps.push({
        step: 5,
        name: "결과 통합 및 중복 제거",
        input: allVideos.length,
        output: finalVideos.length,
        success: true
      });

      // 최종 결과 구성
      workflowResult.final_videos = finalVideos;
      workflowResult.performance = {
        total_time_ms: Date.now() - startTime,
        api_units_used: totalApiUnits,
        cache_hits: this.stats.cacheHits,
        workflow_efficiency: finalVideos.length / Math.max(totalApiUnits / 100, 1)
      };

      // 추가 메타데이터
      workflowResult.metadata = {
        extracted_keywords: keywordExtraction.keywords,
        expanded_keywords: expandedKeywords.slice(0, 10),
        search_strategies_used: queryGeneration.youtube_queries?.map(q => q.strategy_name) || [],
        total_candidates_found: allVideos.length,
        deduplication_ratio: allVideos.length > 0 ? (finalVideos.length / allVideos.length * 100).toFixed(1) + '%' : '0%'
      };

      console.log(`✅ 워크플로우 완료: ${finalVideos.length}개 영상, ${totalApiUnits} units 사용`);

      return workflowResult;

    } catch (error) {
      console.error('❌ 완전한 워크플로우 실패:', error);
      throw error;
    }
  }

  async executeCompleteTrendWorkflow(args) {
    const { trendRequest, region = 'KR', maxVideos = 15, timeContext = '현재', categories } = args || {};
    
    try {
      console.log(`🔥 완전한 트렌드 워크플로우 실행: "${trendRequest}"`);
      
      const trendWorkflow = {
        trend_request: trendRequest,
        region: region,
        workflow_steps: [],
        trending_videos: [],
        performance: {
          total_time_ms: 0,
          api_units_used: 0,
          sources_used: []
        }
      };

      const startTime = Date.now();

      // 🧠 1단계: LLM 트렌드 전략 결정
      console.log('🧠 1단계: LLM 트렌드 전략 결정');
      const trendAnalysis = await this.optimizeSearchWithLLM(trendRequest, `트렌드 검색, 지역: ${region}, 시간: ${timeContext}`);
      
      trendWorkflow.workflow_steps.push({
        step: 1,
        name: "LLM 트렌드 분석",
        input: trendRequest,
        output: trendAnalysis,
        success: true
      });

      // 📈 2단계: 고급 트렌드 키워드 추출
      console.log('📈 2단계: 다중 소스 트렌드 수집');
      const advancedTrends = await this.executeExtractTrendingKeywordsAdvanced({
        region: region,
        maxKeywords: 20,
        timeContext: timeContext,
        categories: categories,
        useAIStrategy: true
      });

      let trendingKeywords = [];
      if (advancedTrends.content && advancedTrends.content[0]) {
        const trendData = JSON.parse(advancedTrends.content[0].text);
        trendingKeywords = trendData.trending_keywords || [];
      }

      trendWorkflow.workflow_steps.push({
        step: 2,
        name: "고급 트렌드 추출",
        input: `${region}/${timeContext}`,
        output: trendingKeywords.length,
        success: trendingKeywords.length > 0
      });

      // 🔍 3단계: 트렌드 키워드 확장 및 조합
      console.log('🔍 3단계: 트렌드 키워드 확장');
      const topTrendKeywords = trendingKeywords.slice(0, 5).map(t => t.keyword);
      let expandedTrendKeywords = [...topTrendKeywords];

      if (topTrendKeywords.length > 0) {
        try {
          const expansion = await this.executeExpandKeywordsWithBrightdata({
            claudeKeywords: topTrendKeywords,
            searchContext: `${timeContext} 트렌드 ${region}`,
            maxKeywords: 15
          });
          
          if (expansion.expanded_keywords) {
            const newKeywords = expansion.expanded_keywords.map(k => k.keyword || k);
            expandedTrendKeywords = [...expandedTrendKeywords, ...newKeywords];
          }
        } catch (error) {
          console.warn('트렌드 키워드 확장 실패:', error.message);
        }
      }

      trendWorkflow.workflow_steps.push({
        step: 3,
        name: "트렌드 키워드 확장",
        input: topTrendKeywords.length,
        output: expandedTrendKeywords.length,
        success: true
      });

      // 🎯 4단계: 트렌드 최적화 쿼리 생성
      console.log('🎯 4단계: 트렌드 최적화 YouTube 쿼리 생성');
      const trendQueries = [];
      
      // 각 상위 트렌드 키워드별로 쿼리 생성
      for (const keyword of topTrendKeywords.slice(0, 3)) {
        try {
          const queryGen = await this.executeGenerateYouTubeSearchQueries({
            searchKeyword: keyword,
            userIntent: '트렌드 영상',
            contentType: this.detectContentType(keyword),
            timeframe: timeContext === '현재' ? '오늘' : timeContext,
            maxQueries: 2
          });
          
          if (queryGen.youtube_queries) {
            trendQueries.push(...queryGen.youtube_queries);
          }
        } catch (error) {
          console.warn(`키워드 "${keyword}" 쿼리 생성 실패:`, error.message);
        }
      }

      trendWorkflow.workflow_steps.push({
        step: 4,
        name: "트렌드 쿼리 생성",
        input: topTrendKeywords.slice(0, 3),
        output: trendQueries.length,
        success: trendQueries.length > 0
      });

      // 🎬 5단계: 트렌드 영상 검색 실행
      console.log('🎬 5단계: 트렌드 영상 다중 검색');
      const allTrendVideos = [];
      let totalApiUnits = 0;

      const executionQueries = trendQueries.slice(0, 4); // 최대 4개 쿼리
      console.log(`🔥 ${executionQueries.length}개 트렌드 쿼리 실행 중...`);

      for (const query of executionQueries) {
        try {
          console.log(`  🎯 트렌드 쿼리: ${query.strategy_name} - "${query.api_query.q}"`);
          
          // ⭐ 트렌드 검색도 충분한 후보 확보 (필터링률 고려)
          const targetResults = Math.ceil(maxVideos / Math.min(trendQueries.length, 4)) + 8; // 여유분
          console.log(`     요청 결과 수: ${targetResults}개 (search.list에서는 50개 후보 확보)`);
          
          const searchResult = await this.executeSearchVideos({
            query: query.api_query.q,
            maxResults: targetResults,
            enableLLMOptimization: false
          });

          if (searchResult.videos) {
            const taggedVideos = searchResult.videos.map(video => ({
              ...video,
              trend_source: query.strategy_name,
              trend_score: this.calculateTrendScore(video, trendingKeywords),
              is_trending: true,
              filtering_stats: searchResult.filteringStats
            }));
            
            allTrendVideos.push(...taggedVideos);
            totalApiUnits += searchResult.apiUnitsUsed || 107;
            
            console.log(`     ✅ ${taggedVideos.length}개 트렌드 영상 수집`);
            if (searchResult.filteringStats) {
              console.log(`     📊 필터링: ${searchResult.filteringStats.overallFilteringRatio} 통과율 (${searchResult.filteringStats.pagesSearched}페이지 검색)`);
              console.log(`     💎 효율성: ${searchResult.filteringStats.searchEfficiency}`);
            }
          }
        } catch (error) {
          console.error(`❌ 트렌드 쿼리 실행 실패:`, error.message);
        }
      }
      
      console.log(`🔥 트렌드 수집 완료: ${allTrendVideos.length}개 후보 영상`);

          trendWorkflow.workflow_steps.push({
            step: 5,
            name: "트렌드 영상 검색",
            input: trendQueries.length,
            output: allTrendVideos.length,
            success: true
          });

          trendWorkflow.workflow_steps.push({
            step: 6,
            name: "트렌드 점수 정렬",
            input: allTrendVideos.length,
        output: this.deduplicateAndRankVideos(allTrendVideos, expandedTrendKeywords).length,
            success: true
          });

          // 최종 결과 구성
      trendWorkflow.trending_videos = this.deduplicateAndRankVideos(allTrendVideos, expandedTrendKeywords);
      trendWorkflow.performance = {
        total_time_ms: Date.now() - startTime,
        api_units_used: totalApiUnits,
        sources_used: [...new Set(trendingKeywords.map(t => t.source))],
        trend_coverage: `${trendWorkflow.trending_videos.length}/${maxVideos}`
      };

      // 트렌드 분석 메타데이터
      trendWorkflow.trend_analysis = {
        discovered_trends: trendingKeywords.slice(0, 10),
        trend_categories: [...new Set(trendingKeywords.map(t => t.category))],
        avg_trend_score: trendWorkflow.trending_videos.length > 0 
          ? (trendWorkflow.trending_videos.reduce((sum, v) => sum + (v.trend_score || 0), 0) / trendWorkflow.trending_videos.length).toFixed(2)
          : 0,
        trend_freshness: timeContext
      };

      console.log(`✅ 트렌드 워크플로우 완료: ${trendWorkflow.trending_videos.length}개 트렌드 영상`);

      return trendWorkflow;

    } catch (error) {
      console.error('❌ 트렌드 워크플로우 실패:', error);
      throw error;
    }
  }

  // === HTTP API 리소스 메서드들 ===

  getCachedSearches() {
    return Array.from(this.cache.entries())
      .filter(([key]) => key.startsWith('search:'))
      .map(([key, value]) => ({
        query: key.replace('search:', ''),
        resultCount: value.videos?.length || 0,
        cachedAt: value.cachedAt,
        expiresAt: value.expiresAt
      }));
  }

  async getCurrentTrendData() {
    const regions = ['KR', 'US', 'JP'];
    const allTrends = {};

    for (const region of regions) {
      try {
        const trends = await this.getBrightDataTrends(region, 'entertainment', 5);
        allTrends[region] = trends;
      } catch (error) {
        console.error(`트렌드 데이터 가져오기 실패 (${region}):`, error);
        allTrends[region] = [];
      }
    }

    return {
      trends: allTrends,
      updatedAt: new Date().toISOString(),
      source: "bright_data_realtime"
    };
  }

  getApiUsageReport() {
    return {
      totalAPIUnits: this.stats.apiUnitsUsed,
      dailyLimit: 10000,
      usagePercentage: (this.stats.apiUnitsUsed / 10000) * 100,
      remainingUnits: 10000 - this.stats.apiUnitsUsed,
      breakdown: {
        searchCalls: this.stats.toolCalls,
        averageUnitsPerCall: this.stats.apiUnitsUsed / Math.max(this.stats.toolCalls, 1)
      },
      timestamp: new Date().toISOString()
    };
  }

  // === 실제 API 연동 메서드들 ===

  /**
   * 🧠 Claude API를 사용한 검색 최적화
   */
  async optimizeSearchWithLLM(userMessage, context = '') {
    if (!this.anthropic) {
      // 폴백: 단순 키워드 추출
      return {
        query: userMessage,
        keywords: userMessage.split(' ').filter(w => w.length > 2),
        filters: {
          duration: 'short',
          order: 'relevance',
          regionCode: 'KR'
        },
        analysis: 'Claude API 비활성화 - 기본 최적화 적용'
      };
    }

    try {
      const prompt = `YouTube Shorts 검색을 위해 다음 사용자 요청을 분석하고 최적화해주세요:

사용자 요청: "${userMessage}"
${context ? `추가 컨텍스트: ${context}` : ''}

다음 JSON 형식으로 응답해주세요:
{
  "query": "최적화된 검색 키워드",
  "keywords": ["핵심", "키워드", "목록"],
  "filters": {
    "duration": "short",
    "order": "relevance",
    "regionCode": "KR"
  },
  "analysis": "최적화 이유"
}`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: prompt
        }]
      });

      const result = JSON.parse(response.content[0].text);
      console.log('🧠 LLM 최적화 완료:', result.query);
      return result;

    } catch (error) {
      console.error('❌ LLM 최적화 실패:', error);
      // 폴백
      return {
        query: userMessage,
        keywords: userMessage.split(' ').filter(w => w.length > 2),
        filters: {
          duration: 'short',
          order: 'relevance',
          regionCode: 'KR'
        },
        analysis: 'LLM 최적화 실패 - 기본 최적화 적용'
      };
    }
  }

  /**
   * 🎬 YouTube Data API v3 검색 (2단계 필터링 + 스마트 페이지네이션)
   */
  async searchYouTubeVideos(params, maxResults, nextPageToken) {
    if (!this.config.youtubeApiKey) {
      throw new Error('YouTube API 키가 설정되지 않았습니다.');
    }

    try {
      let allPlayableVideos = [];
      let currentPageToken = nextPageToken;
      let totalCandidates = 0;
      let totalApiUnits = 0;
      let pageCount = 0;
      const maxPages = 3; // 최대 3페이지까지만 (API 할당량 보호)

      console.log(`🎬 YouTube 검색 시작: "${params.query}" (목표: ${maxResults}개)`);

      // 📄 페이지별 검색 루프
      while (allPlayableVideos.length < Math.max(maxResults, 30) && pageCount < maxPages) {
        pageCount++;
        console.log(`\n📄 페이지 ${pageCount} 검색 중...`);

        // 1단계: search.list로 후보 영상 검색 (기본 필터링 적용)
        console.log('1️⃣ YouTube 후보 영상 검색 중... (maxResults=50, 기본 필터링 적용)');
        const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            key: this.config.youtubeApiKey,
            part: 'snippet',
            q: params.query,
            type: 'video',
            videoDuration: 'short', // ⭐ 4분 미만 (Shorts 길이)
            videoEmbeddable: 'true', // ⭐ 임베드 가능한 영상만 (기본 필터링)
            maxResults: 50, // 항상 최대 50개로 고정
            regionCode: 'KR',
            relevanceLanguage: 'ko',
            safeSearch: 'moderate',
            order: params.filters?.order || 'relevance',
            pageToken: currentPageToken
          }
        });

        const searchResults = searchResponse.data.items || [];
        totalCandidates += searchResults.length;
        console.log(`📊 search.list 결과: ${searchResults.length}개 후보 영상 (기본 필터링 적용됨)`);
        
        if (searchResults.length === 0) {
          console.log('⚠️ 더 이상 검색 결과가 없습니다.');
          break;
        }

        // 2단계: videos.list로 상세 정보 및 재생 가능 여부 확인
        console.log('2️⃣ 영상 상세 정보 조회 중...');
        const videoIds = searchResults.map(item => item.id.videoId);
        const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            key: this.config.youtubeApiKey,
            part: 'snippet,contentDetails,status,statistics',
            id: videoIds.join(','),
            hl: 'ko',
            regionCode: 'KR'
          }
        });

        const detailedVideos = videosResponse.data.items || [];

        // 3단계: 엄격한 재생 가능 Shorts 필터링
        console.log('3️⃣ 엄격한 재생 가능 영상 필터링 중...');
        const playableShorts = detailedVideos.filter(video => {
          // 임베드 가능 여부 (이미 search.list에서 걸렀지만 재확인)
          if (!video.status.embeddable) return false;
          
          // 공개 상태
          if (video.status.privacyStatus !== 'public') return false;
          
          // 지역 차단 확인
          const restrictions = video.contentDetails.regionRestriction;
          if (restrictions) {
            if (restrictions.blocked?.includes('KR')) return false;
            if (restrictions.allowed && !restrictions.allowed.includes('KR')) return false;
          }
          
          // Shorts 길이 확인 (60초 이하, 5초 이상)
          const duration = this.parseISO8601Duration(video.contentDetails.duration);
          if (duration > 60 || duration < 5) return false;
          
          // 업로드 라이선스 확인 (선택적)
          if (video.status.license === 'creativeCommon') {
            // Creative Commons 라이선스는 허용
          }
          
          return true;
        });

        const pageFilteringRatio = searchResults.length > 0 ? (playableShorts.length / searchResults.length * 100).toFixed(1) : 0;
        console.log(`✅ 페이지 ${pageCount} 필터링: ${playableShorts.length}/${searchResults.length} 영상 (${pageFilteringRatio}% 통과)`);
        
        // 이 페이지의 재생 가능한 영상들을 전체 목록에 추가
        allPlayableVideos.push(...playableShorts);
        
        // API 사용량 계산
        const pageApiUnits = this.calculateAPIUnits();
        totalApiUnits += pageApiUnits.total;

        // 다음 페이지 토큰 확인
        currentPageToken = searchResponse.data.nextPageToken;
        
        console.log(`📈 현재 누적: ${allPlayableVideos.length}개 재생 가능 영상`);
        
        // 📋 결과 충분성 검사
        if (allPlayableVideos.length >= maxResults) {
          console.log(`🎯 목표 달성: ${maxResults}개 이상 확보`);
          break;
        } else if (allPlayableVideos.length >= 30) {
          console.log(`✅ 최소 요구사항 충족: 30개 이상 확보`);
          break;
        } else if (!currentPageToken) {
          console.log(`⚠️ 더 이상 페이지가 없습니다. (현재: ${allPlayableVideos.length}개)`);
          break;
        } else {
          console.log(`🔄 결과 부족 (${allPlayableVideos.length}개 < 30개), 다음 페이지 검색 계속...`);
        }
      }

      // 📊 최종 통계
      const totalFilteringRatio = totalCandidates > 0 ? (allPlayableVideos.length / totalCandidates * 100).toFixed(1) : 0;
      console.log(`\n🎊 검색 완료!`);
      console.log(`  📄 검색된 페이지: ${pageCount}개`);
      console.log(`  📊 총 후보 영상: ${totalCandidates}개`);
      console.log(`  ✅ 재생 가능 영상: ${allPlayableVideos.length}개`);
      console.log(`  📈 전체 필터링 성공률: ${totalFilteringRatio}%`);
      console.log(`  💰 총 API 사용량: ${totalApiUnits} units`);
      
      // 🎯 최종 결과는 요청된 maxResults 수만큼만 반환
      const finalVideos = allPlayableVideos.slice(0, maxResults);
      console.log(`🎬 최종 반환: ${finalVideos.length}개 영상`);

      return {
        videos: finalVideos,
        nextPageToken: allPlayableVideos.length > maxResults ? currentPageToken : null, // 더 많은 결과가 있는 경우만
        filteringStats: {
          pagesSearched: pageCount,
          totalCandidates: totalCandidates,
          totalPlayable: allPlayableVideos.length,
          finalReturned: finalVideos.length,
          overallFilteringRatio: totalFilteringRatio + '%',
          searchEfficiency: (finalVideos.length / totalApiUnits * 100).toFixed(2) + ' videos/100units'
        },
        apiUsage: {
          totalUnits: totalApiUnits,
          breakdown: {
            pagesSearched: pageCount,
            searchUnits: pageCount * 100,
            videosUnits: pageCount * 9,
            avgUnitsPerVideo: (totalApiUnits / Math.max(finalVideos.length, 1)).toFixed(1)
          }
        }
      };

    } catch (error) {
      console.error('❌ YouTube API 오류:', error);
      if (error.response?.status === 403) {
        throw new Error('YouTube API 할당량이 초과되었거나 권한이 없습니다.');
      }
      throw error;
    }
  }

  /**
   * 📈 Bright Data API를 통한 실시간 트렌드 수집
   */
  async getBrightDataTrends(region, category, limit) {
    if (!this.config.brightDataApiKey) {
      // 폴백: 기본 트렌드 데이터
      console.log('⚠️ Bright Data API 키 없음 - 폴백 트렌드 사용');
      return [
        { keyword: '먹방', score: 85, searchVolume: 50000, growthRate: 15, relatedTerms: ['ASMR', '리뷰'] },
        { keyword: '댄스', score: 80, searchVolume: 45000, growthRate: 12, relatedTerms: ['챌린지', '커버'] },
        { keyword: '브이로그', score: 75, searchVolume: 40000, growthRate: 10, relatedTerms: ['일상', '여행'] },
        { keyword: '요리', score: 70, searchVolume: 35000, growthRate: 8, relatedTerms: ['레시피', '홈쿡'] },
        { keyword: '게임', score: 65, searchVolume: 30000, growthRate: 5, relatedTerms: ['플레이', '리뷰'] }
      ].slice(0, limit);
    }

    try {
      // Bright Data 프록시를 통한 트렌드 수집
      const response = await axios.post(this.config.brightDataProxy, {
        url: 'https://trends.google.com/trends/api/dailytrends',
        region: region,
        category: category,
        limit: limit
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.brightDataApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      // 응답 데이터 파싱 및 처리
      return this.parseTrendData(response.data, limit);

    } catch (error) {
      console.error('❌ Bright Data 트렌드 수집 실패:', error);
      // 폴백 데이터 반환
      return [
        { keyword: '트렌드 키워드 1', score: Math.random() * 100, searchVolume: Math.floor(Math.random() * 10000), growthRate: Math.random() * 50, relatedTerms: ['관련어1', '관련어2'] },
        { keyword: '트렌드 키워드 2', score: Math.random() * 100, searchVolume: Math.floor(Math.random() * 10000), growthRate: Math.random() * 50, relatedTerms: ['관련어3', '관련어4'] }
      ].slice(0, limit);
    }
  }

  /**
   * 🎨 Claude API를 사용한 결과 분석
   */
  async analyzeResults(results) {
    if (!this.anthropic) {
      return {
        diversityScore: Math.random() * 10,
        qualityScore: Math.random() * 10,
        trendAlignment: Math.random() * 10,
        recommendations: ['Claude API 비활성화']
      };
    }

    try {
      const prompt = `다음 YouTube Shorts 검색 결과를 분석해주세요:

결과 수: ${results.length}
영상 제목들: ${results.slice(0, 5).map(v => v.snippet.title).join(', ')}

다음 JSON 형식으로 분석해주세요:
{
  "diversityScore": 1-10점,
  "qualityScore": 1-10점,
  "trendAlignment": 1-10점,
  "recommendations": ["개선 제안 목록"]
}`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: prompt
        }]
      });

      return JSON.parse(response.content[0].text);

    } catch (error) {
      console.error('❌ 결과 분석 실패:', error);
      return {
        diversityScore: 7,
        qualityScore: 8,
        trendAlignment: 6,
        recommendations: ['분석 실패 - 기본 점수 적용']
      };
    }
  }

  // === 유틸리티 메서드들 ===

  parseISO8601Duration(duration) {
    if (!duration) return 0;
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '') || 0;
    const minutes = (match[2] || '').replace('M', '') || 0;
    const seconds = (match[3] || '').replace('S', '') || 0;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
  }

  calculateAPIUnits(resultCount) {
    // ⭐ 정확한 API 비용 계산
    // search.list: 항상 100 units (maxResults와 관계없이)
    // videos.list: 1 unit (기본) + parts별 추가 비용
    //   - snippet: +2 units
    //   - contentDetails: +2 units  
    //   - status: +2 units
    //   - statistics: +2 units
    // 총: 1 + (4 parts × 2) = 9 units
    const searchUnits = 100;
    const videosUnits = 9; // 1 + (snippet + contentDetails + status + statistics) × 2
    
    return {
      search: searchUnits,
      videos: videosUnits,
      total: searchUnits + videosUnits,
      breakdown: {
        'search.list': searchUnits,
        'videos.list (base)': 1,
        'videos.list (parts)': 8,
        'videos.list (total)': videosUnits
      }
    };
  }

  parseTrendData(rawData, limit) {
    // Bright Data 응답 파싱 (실제 구조에 따라 조정 필요)
    try {
      const trends = rawData.trends || rawData.data || [];
      return trends.slice(0, limit).map((trend, index) => ({
        keyword: trend.keyword || trend.title || `트렌드 ${index + 1}`,
        score: trend.score || Math.random() * 100,
        searchVolume: trend.volume || Math.floor(Math.random() * 10000),
        growthRate: trend.growth || Math.random() * 50,
        relatedTerms: trend.related || ['관련어1', '관련어2']
      }));
    } catch (error) {
      console.error('❌ 트렌드 데이터 파싱 실패:', error);
      return [];
    }
  }

  /**
   * 🔍 Bright Data MCP를 통한 관련 키워드 추출
   */
  async extractRelatedKeywordsWithBrightData(baseKeywords, searchContext, maxKeywords) {
    if (!this.config.brightDataApiKey) {
      console.log('⚠️ Bright Data API 키 없음 - 폴백 키워드 사용');
      return this.generateFallbackKeywords(baseKeywords);
    }

    try {
      const searchQueries = baseKeywords.map(keyword => 
        searchContext ? `${keyword} ${searchContext}` : keyword
      );

      const allRelatedKeywords = [];

      for (const query of searchQueries) {
        // Google Trends 관련 검색어 수집
        const trendsResponse = await axios.post(this.config.brightDataProxy, {
          url: 'https://trends.google.com/trends/api/related',
          query: query,
          region: 'KR',
          timeframe: 'now 7-d'
        }, {
          headers: {
            'Authorization': `Bearer ${this.config.brightDataApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const relatedTerms = this.parseRelatedKeywords(trendsResponse.data);
        allRelatedKeywords.push(...relatedTerms);

        // YouTube 검색 제안 수집
        const suggestResponse = await axios.post(this.config.brightDataProxy, {
          url: 'http://suggestqueries.google.com/complete/search',
          params: {
            client: 'youtube',
            ds: 'yt',
            q: query
          }
        }, {
          headers: {
            'Authorization': `Bearer ${this.config.brightDataApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const suggestions = this.parseYoutubeSuggestions(suggestResponse.data);
        allRelatedKeywords.push(...suggestions);
      }

      // 중복 제거 및 관련성 스코어링
      const uniqueKeywords = [...new Set(allRelatedKeywords)]
        .filter(keyword => keyword.length > 2)
        .filter(keyword => !baseKeywords.includes(keyword))
        .map(keyword => ({
          keyword,
          relevanceScore: this.calculateRelevanceScore(keyword, baseKeywords, searchContext)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxKeywords)
        .map(item => item.keyword);

      console.log(`✅ ${uniqueKeywords.length}개 관련 키워드 추출 완료`);
      return uniqueKeywords;

    } catch (error) {
      console.error('❌ Bright Data 키워드 추출 실패:', error);
      return this.generateFallbackKeywords(baseKeywords);
    }
  }

  /**
   * 🎯 검색 쿼리 생성 (OR 연산자 사용)
   */
  generateSearchQueries(baseKeywords, relatedKeywords) {
    const allKeywords = [...baseKeywords, ...relatedKeywords.slice(0, 10)];
    
    // 다양한 조합 생성
    const queries = [
      // 기본 OR 쿼리
      allKeywords.slice(0, 5).join(' | '),
      
      // 카테고리별 그룹화
      baseKeywords.join(' | '),
      relatedKeywords.slice(0, 5).join(' | '),
      
      // 혼합 쿼리
      `${baseKeywords[0]} | ${relatedKeywords.slice(0, 3).join(' | ')}`,
      
      // 한국어 특화
      allKeywords.filter(k => /[가-힣]/.test(k)).slice(0, 4).join(' | ')
    ].filter(query => query.length > 0);

    console.log(`🎯 ${queries.length}개 검색 쿼리 생성 완료`);
    return queries;
  }

  /**
   * 🔄 폴백 키워드 생성
   */
  generateFallbackKeywords(baseKeywords) {
    const fallbackPatterns = {
      '먹방': ['ASMR', '요리', '리뷰', '맛집', '홈쿡'],
      '댄스': ['챌린지', '커버', '안무', '댄서', 'K-pop'],
      '브이로그': ['일상', '여행', '루틴', '일상템', 'GRWM'],
      '게임': ['플레이', '리뷰', '공략', '스트리밍', 'e스포츠'],
      '요리': ['레시피', '홈쿡', '먹방', 'ASMR', '맛집']
    };

    const relatedKeywords = [];
    
    baseKeywords.forEach(keyword => {
      if (fallbackPatterns[keyword]) {
        relatedKeywords.push(...fallbackPatterns[keyword]);
      } else {
        // 일반적인 YouTube Shorts 키워드
        relatedKeywords.push('챌린지', '리뷰', '꿀팁', '루틴', 'ASMR');
      }
    });

    return [...new Set(relatedKeywords)].slice(0, 15);
  }

  /**
   * 📊 관련성 스코어 계산
   */
  calculateRelevanceScore(keyword, baseKeywords, searchContext) {
    let score = 0;
    
    // 기본 키워드와의 유사성
    baseKeywords.forEach(baseKeyword => {
      if (keyword.includes(baseKeyword) || baseKeyword.includes(keyword)) {
        score += 10;
      }
    });
    
    // 컨텍스트와의 관련성
    if (searchContext && keyword.includes(searchContext)) {
      score += 5;
    }
    
    // 한국어 키워드 우대
    if (/[가-힣]/.test(keyword)) {
      score += 3;
    }
    
    // YouTube Shorts 관련 키워드 우대
    const shortsKeywords = ['챌린지', '꿀팁', 'ASMR', '루틴', '리뷰'];
    if (shortsKeywords.some(sk => keyword.includes(sk))) {
      score += 5;
    }

    return score;
  }

  /**
   * 🔍 Google Trends 관련 키워드 파싱
   */
  parseRelatedKeywords(data) {
    try {
      const related = data.related || data.queries || [];
      return related.map(item => item.query || item.keyword || '').filter(Boolean);
    } catch (error) {
      console.error('❌ 관련 키워드 파싱 실패:', error);
      return [];
    }
  }

  /**
   * 📺 YouTube 검색 제안 파싱
   */
  parseYoutubeSuggestions(data) {
    try {
      // YouTube Suggest API 응답 형식: [query, [suggestions]]
      if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
        return data[1].filter(suggestion => suggestion && suggestion.length > 2);
      }
      return [];
    } catch (error) {
      console.error('❌ YouTube 제안 파싱 실패:', error);
      return [];
    }
  }

  // === 새로 추가된 HTTP API 실행 메서드들 ===

  /**
   * 🔍 키워드 확장 도구 실행
   */
  async executeExpandKeywordsWithBrightdata(args) {
    const { claudeKeywords, searchContext, maxKeywords = 20, includeAutocomplete = true } = args || {};
    
    if (!claudeKeywords || !Array.isArray(claudeKeywords)) {
      throw new Error('claudeKeywords parameter is required and must be an array');
    }

    try {
      console.log(`🔍 Bright Data MCP 키워드 확장: ${claudeKeywords.join(', ')}`);

      let expandedKeywords = [];

      // Bright Data MCP 초기화
      if (!this.brightDataMcp.isConnected) {
        await this.brightDataMcp.startBrightDataMCP();
      }

      // 각 Claude 키워드에 대해 확장 수행
      for (const keyword of claudeKeywords) {
        try {
          // 1. Google 자동완성 수집
          if (includeAutocomplete) {
            const autocomplete = await this.brightDataMcp.getAutocomplete(keyword, searchContext);
            expandedKeywords.push(...autocomplete.map(k => ({ keyword: k, source: 'google_autocomplete', baseKeyword: keyword })));
          }

          // 2. 관련 검색어 수집
          const related = await this.brightDataMcp.getRelatedKeywords(keyword);
          expandedKeywords.push(...related.map(k => ({ keyword: k, source: 'related_search', baseKeyword: keyword })));

          // 3. YouTube 제안 수집
          const youtube = await this.brightDataMcp.getYouTubeSuggestions(keyword);
          expandedKeywords.push(...youtube.map(k => ({ keyword: k, source: 'youtube_suggestions', baseKeyword: keyword })));

        } catch (error) {
          console.error(`키워드 "${keyword}" 확장 실패:`, error.message);
          
          // 폴백: 기본 확장 패턴 사용
          const fallbackExpansion = this.generateFallbackExpansion(keyword);
          expandedKeywords.push(...fallbackExpansion);
        }
      }

      // 중복 제거 및 정제
      const uniqueKeywords = this.deduplicateAndScore(expandedKeywords, maxKeywords);

      // Claude를 사용한 최종 키워드 품질 평가
      const qualityEvaluationPrompt = `
다음 확장된 키워드들을 평가하고 YouTube Shorts에 가장 적합한 키워드들을 선별하세요:

기본 키워드: ${claudeKeywords.join(', ')}
확장된 키워드들: ${uniqueKeywords.map(k => k.keyword).join(', ')}
검색 맥락: ${searchContext || '일반'}

평가 기준:
1. YouTube Shorts 콘텐츠 적합성
2. 검색 볼륨 가능성
3. 기본 키워드와의 관련성
4. 트렌드 가능성

최고 품질의 키워드 ${Math.min(maxKeywords, 20)}개를 선별하여 JSON으로 반환:
{
  "expanded_keywords": [
    {
      "keyword": "선별된 키워드",
      "score": 95,
      "reason": "선별 이유",
      "category": "카테고리",
      "search_potential": "high/medium/low"
    }
  ],
  "expansion_summary": "확장 과정 요약"
}
`;

      const evaluationResponse = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: qualityEvaluationPrompt
        }]
      });

      const evaluation = this.parseClaudeResponse(evaluationResponse);

      // OR 연산자 기반 고급 검색 쿼리 생성
      const advancedQueries = this.generateAdvancedSearchQueries(
        claudeKeywords, 
        evaluation.expanded_keywords || uniqueKeywords
      );

      return {
        base_keywords: claudeKeywords,
        search_context: searchContext,
        expanded_keywords: evaluation.expanded_keywords || uniqueKeywords,
        total_expanded: (evaluation.expanded_keywords || uniqueKeywords).length,
        advanced_queries: advancedQueries,
        expansion_summary: evaluation.expansion_summary || '키워드 확장 완료',
        sources_used: [...new Set(expandedKeywords.map(k => k.source))],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Bright Data 키워드 확장 실패:', error);
      throw error;
    }
  }

  /**
   * 🌐 Bright Data로 Google 자동완성 수집
   */
  async getBrightDataAutocomplete(keyword, context) {
    if (!this.config.brightDataApiKey) {
      return [];
    }

    try {
      const searchQuery = context ? `${keyword} ${context}` : keyword;
      
      // Bright Data MCP 호출 시뮬레이션 (실제로는 npx @brightdata/mcp 호출)
      const response = await axios.post('http://localhost:3001/api/tools/call', {
        name: 'web_scrape',
        arguments: {
          url: `https://www.google.com/complete/search?client=chrome&q=${encodeURIComponent(searchQuery)}`,
          extract_data: true,
          format: 'json'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.brightDataApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return this.parseAutocompleteResponse(response.data);

    } catch (error) {
      console.error('❌ Google 자동완성 수집 실패:', error);
      return [];
    }
  }

  /**
   * 🔗 Bright Data로 관련 키워드 수집
   */
  async getBrightDataRelatedKeywords(keyword, context) {
    if (!this.config.brightDataApiKey) {
      return [];
    }

    try {
      // Google Trends 관련 검색어 수집
      const response = await axios.post('http://localhost:3001/api/tools/call', {
        name: 'web_search',
        arguments: {
          query: `${keyword} 관련 검색어 유튜브`,
          extract_data: true,
          max_results: 10
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.brightDataApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return this.parseRelatedKeywordsResponse(response.data);

    } catch (error) {
      console.error('❌ 관련 키워드 수집 실패:', error);
      return [];
    }
  }

  /**
   * 📺 Bright Data로 YouTube 검색 제안 수집
   */
  async getBrightDataYoutubeSuggestions(keyword) {
    if (!this.config.brightDataApiKey) {
      return [];
    }

    try {
      const response = await axios.post('http://localhost:3001/api/tools/call', {
        name: 'browser_action',
        arguments: {
          action: 'navigate',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`,
          extract_suggestions: true
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.brightDataApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      return this.parseYoutubeSuggestionsResponse(response.data);

    } catch (error) {
      console.error('❌ YouTube 검색 제안 수집 실패:', error);
      return [];
    }
  }

  // === SerpAPI 연동 메서드들 ===

  /**
   * 📊 SerpAPI로 Google Trends 수집
   */
  async getGoogleTrendsWithSerpAPI(region, timeframe, limit) {
    if (!process.env.SERPAPI_KEY) {
      console.log('⚠️ SerpAPI 키 없음 - 폴백 트렌드 사용');
      return this.getFallbackTrends(region).slice(0, limit);
    }

    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          engine: 'google_trends',
          data_type: 'TIMESERIES',
          geo: region,
          time: this.convertTimeframeToSerpAPI(timeframe),
          api_key: process.env.SERPAPI_KEY
        },
        timeout: 10000
      });

      return this.parseSerpAPITrends(response.data, limit);

    } catch (error) {
      console.error('❌ SerpAPI Google Trends 수집 실패:', error);
      return this.getFallbackTrends(region).slice(0, limit);
    }
  }

  /**
   * 🌐 Bright Data로 다중 소스 트렌드 수집
   */
  async getMultiSourceTrendsWithBrightData(region, sources, categories, limit) {
    if (!this.config.brightDataApiKey) {
      console.log('⚠️ Bright Data API 키 없음 - 폴백 트렌드 사용');
      return this.getFallbackTrends(region).slice(0, limit);
    }

    try {
      const allTrends = [];

      for (const source of sources) {
        const sourceTrends = await this.scrapeTrendSource(source, region, categories);
        allTrends.push(...sourceTrends);
      }

      return allTrends.slice(0, limit);

    } catch (error) {
      console.error('❌ 다중 소스 트렌드 수집 실패:', error);
      return this.getFallbackTrends(region).slice(0, limit);
    }
  }

  /**
   * 🔍 개별 트렌드 소스 스크래핑
   */
  async scrapeTrendSource(source, region, categories) {
    const sourceUrls = {
      'naver_trends': 'https://datalab.naver.com/keyword/trendSearch.naver',
      'youtube_trending': 'https://www.youtube.com/feed/trending',
      'twitter_trends': 'https://twitter.com/explore/tabs/trending',
      'instagram_trending': 'https://www.instagram.com/explore/tags/'
    };

    if (!sourceUrls[source]) {
      return [];
    }

    try {
      const response = await axios.post('http://localhost:3001/api/tools/call', {
        name: 'web_scrape',
        arguments: {
          url: sourceUrls[source],
          extract_data: true,
          data_type: 'trending_keywords'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.brightDataApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      return this.parseTrendSourceResponse(response.data, source);

    } catch (error) {
      console.error(`❌ ${source} 응답 파싱 실패:`, error);
      return [];
    }
  }

  // === 유틸리티 메서드들 ===

  /**
   * 🎯 고급 검색 쿼리 생성 (OR 연산자 활용)
   */
  generateAdvancedSearchQueries(baseKeywords, expandedKeywords) {
    const queries = [];

    // 1. 기본 키워드 + 확장 키워드 조합
    baseKeywords.forEach(baseKeyword => {
      const relatedExpanded = expandedKeywords
        .filter(exp => exp.baseKeyword === baseKeyword || exp.keyword.includes(baseKeyword))
        .slice(0, 3)
        .map(exp => exp.keyword);

      if (relatedExpanded.length > 0) {
        // OR 연산자 사용
        queries.push(`${baseKeyword} OR ${relatedExpanded.join(' OR ')}`);
        
        // 개별 조합 쿼리
        relatedExpanded.forEach(expanded => {
          queries.push(`${baseKeyword} ${expanded}`);
        });
      }
    });

    // 2. 고품질 확장 키워드들만으로 OR 쿼리
    const highScoreKeywords = expandedKeywords
      .filter(exp => exp.score > 70)
      .slice(0, 5)
      .map(exp => exp.keyword);

    if (highScoreKeywords.length > 2) {
      queries.push(highScoreKeywords.join(' OR '));
    }

    // 3. 카테고리별 쿼리
    const categoryGroups = {};
    expandedKeywords.forEach(exp => {
      const category = exp.category || 'general';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(exp.keyword);
    });

    Object.entries(categoryGroups).forEach(([category, keywords]) => {
      if (keywords.length > 2) {
        queries.push(keywords.slice(0, 4).join(' OR '));
      }
    });

    // 중복 제거 및 정렬
    return [...new Set(queries)]
      .filter(query => query.length > 5 && query.length < 200)
      .slice(0, 15); // 최대 15개 쿼리
  }

  /**
   * 📈 트렌드 기반 검색 쿼리 생성
   */
  generateTrendBasedQueries(trendingKeywords) {
    return trendingKeywords.map(trend => {
      const variations = [
        `${trend.keyword}`,
        `${trend.keyword} 쇼츠`,
        `${trend.keyword} 유튜브`,
        `${trend.keyword} 트렌드`,
        `${trend.keyword} 인기`
      ];
      
      return variations.slice(0, 3).join(' | ');
    });
  }

  /**
   * 🔄 트렌드 데이터 통합
   */
  consolidateTrendData(googleTrends, multiSourceTrends, limit) {
    const allTrends = [...googleTrends, ...multiSourceTrends];
    
    // 중복 제거 및 점수 기반 정렬
    const uniqueTrends = allTrends.reduce((acc, trend) => {
      const existing = acc.find(t => t.keyword === trend.keyword);
      if (existing) {
        existing.score = Math.max(existing.score, trend.score);
        existing.sources = [...new Set([...existing.sources, trend.source])];
      } else {
        acc.push({
          ...trend,
          sources: [trend.source]
        });
      }
      return acc;
    }, []);
    
    return uniqueTrends
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 🔄 폴백 트렌드 데이터
   */
  getFallbackTrends(region) {
    const trends = {
      'KR': [
        { keyword: '먹방', score: 95, source: 'fallback' },
        { keyword: '댄스', score: 90, source: 'fallback' },
        { keyword: '브이로그', score: 85, source: 'fallback' },
        { keyword: '요리', score: 80, source: 'fallback' },
        { keyword: '게임', score: 75, source: 'fallback' },
        { keyword: 'ASMR', score: 70, source: 'fallback' },
        { keyword: '메이크업', score: 65, source: 'fallback' },
        { keyword: '운동', score: 60, source: 'fallback' },
        { keyword: '여행', score: 55, source: 'fallback' },
        { keyword: '펫', score: 50, source: 'fallback' }
      ],
      'US': [
        { keyword: 'dance', score: 95, source: 'fallback' },
        { keyword: 'cooking', score: 90, source: 'fallback' },
        { keyword: 'gaming', score: 85, source: 'fallback' },
        { keyword: 'makeup', score: 80, source: 'fallback' },
        { keyword: 'fitness', score: 75, source: 'fallback' }
      ]
    };
    
    return trends[region] || trends['KR'];
  }

  /**
   * 🔧 응답 파싱 메서드들
   */
  parseAutocompleteResponse(data) {
    try {
      if (data && data.result && Array.isArray(data.result)) {
        return data.result.map(item => item.suggestion || item).filter(Boolean);
      }
      return [];
    } catch (error) {
      console.error('❌ 자동완성 응답 파싱 실패:', error);
      return [];
    }
  }

  parseRelatedKeywordsResponse(data) {
    try {
      if (data && data.result && Array.isArray(data.result)) {
        return data.result.map(item => item.keyword || item.title || '').filter(Boolean);
      }
      return [];
    } catch (error) {
      console.error('❌ 관련 키워드 응답 파싱 실패:', error);
      return [];
    }
  }

  parseYoutubeSuggestionsResponse(data) {
    try {
      // YouTube Suggest API 응답 형식: [query, [suggestions]]
      if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
        return data[1].filter(suggestion => suggestion && suggestion.length > 2);
      }
      return [];
    } catch (error) {
      console.error('❌ YouTube 제안 응답 파싱 실패:', error);
      return [];
    }
  }

  parseSerpAPITrends(data, limit) {
    try {
      if (data && data.interest_over_time) {
        return data.interest_over_time.timeline_data
          .flatMap(item => item.values)
          .map(trend => ({
            keyword: trend.query,
            score: trend.value,
            source: 'google_trends'
          }))
          .slice(0, limit);
      }
      return [];
    } catch (error) {
      console.error('❌ SerpAPI 트렌드 파싱 실패:', error);
      return [];
    }
  }

  parseTrendSourceResponse(data, source) {
    try {
      if (data && data.result && Array.isArray(data.result)) {
        return data.result.map(item => ({
          keyword: item.keyword || item.title || item,
          score: item.score || Math.random() * 100,
          source: source
        })).filter(item => item.keyword);
      }
      return [];
    } catch (error) {
      console.error(`❌ ${source} 응답 파싱 실패:`, error);
      return [];
    }
  }

  convertTimeframeToSerpAPI(timeframe) {
    const mapping = {
      '1h': 'now 1-H',
      '24h': 'now 1-d', 
      '7d': 'now 7-d',
      '30d': 'today 1-m'
    };
    return mapping[timeframe] || 'now 1-d';
  }

  // === LLM 주도 트렌드 수집 보조 메서드들 ===

  /**
   * 🌐 특정 사이트에서 트렌드 키워드 추출
   */
  async extractFromSpecificSite(site, region, timeContext) {
    console.log(`🔍 사이트별 트렌드 추출: ${site}`);
    
    const siteConfigs = {
      'naver_realtime': {
        url: 'https://datalab.naver.com/keyword/realtimeList.naver',
        method: 'scrape',
        selectors: ['.item_title', '.rank_item'],
        fallback: ['먹방', '브이로그', '댄스', '요리', 'ASMR']
      },
      'daum_realtime': {
        url: 'https://www.daum.net/',
        method: 'scrape',
        selectors: ['.realtime_part .link_issue'],
        fallback: ['트렌드', '이슈', '핫이슈', '실시간']
      },
      'google_trends_kr': {
        url: 'https://trends.google.com/trends/trendingsearches/daily?geo=KR',
        method: 'bright_data',
        fallback: ['유튜브 쇼츠', '바이럴', '챌린지', '밈']
      },
      'twitter_trending': {
        url: 'https://twitter.com/explore/tabs/trending',
        method: 'bright_data',
        fallback: ['trending', 'viral', 'challenge']
      },
      'reddit_trending': {
        url: 'https://www.reddit.com/r/popular/',
        method: 'bright_data',
        fallback: ['popular', 'trending', 'hot']
      }
    };

    const config = siteConfigs[site];
    if (!config) {
      console.warn(`⚠️ 지원하지 않는 사이트: ${site}`);
      return [];
    }

    try {
      let keywords = [];

      if (config.method === 'bright_data' && this.brightDataMcp) {
        // Bright Data MCP를 통한 스크래핑
        try {
          await this.brightDataMcp.startBrightDataMCP();
          keywords = await this.brightDataMcp.scrapeTrendSource(site, region);
        } catch (error) {
          console.error(`Bright Data MCP 오류 (${site}):`, error.message);
          keywords = config.fallback || [];
        }
      } else {
        // 기본 스크래핑 (axios 사용)
        try {
          const response = await axios.get(config.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
          });

          // 간단한 HTML 파싱으로 키워드 추출
          const html = response.data;
          const extractedKeywords = this.extractKeywordsFromHTML(html, config.selectors);
          keywords = extractedKeywords.length > 0 ? extractedKeywords : config.fallback;
        } catch (error) {
          console.error(`기본 스크래핑 오류 (${site}):`, error.message);
          keywords = config.fallback || [];
        }
      }

      return keywords.map(keyword => ({
        keyword: keyword,
        score: Math.random() * 100,
        source: site,
        extractedAt: new Date().toISOString()
      }));

    } catch (error) {
      console.error(`${site} 추출 전체 실패:`, error);
      return config.fallback.map(keyword => ({
        keyword,
        score: Math.random() * 50, // 폴백 데이터는 낮은 점수
        source: `${site}_fallback`,
        extractedAt: new Date().toISOString()
      }));
    }
  }

  /**
   * 📝 HTML에서 키워드 추출 (간단한 파싱)
   */
  extractKeywordsFromHTML(html, selectors) {
    const keywords = [];
    
    for (const selector of selectors) {
      // 매우 기본적인 HTML 파싱 (정규식 사용)
      const regex = new RegExp(`<[^>]*class="${selector.replace('.', '')}"[^>]*>([^<]+)<`, 'gi');
      let match;
      
      while ((match = regex.exec(html)) !== null) {
        const keyword = match[1].trim();
        if (keyword && keyword.length > 1 && keyword.length < 50) {
          keywords.push(keyword);
        }
      }
    }

    return [...new Set(keywords)].slice(0, 10); // 중복 제거 및 상위 10개
  }

  /**
   * 🔄 트렌드 키워드 통합 및 점수 계산
   */
  consolidateTrendingKeywords(allKeywords, maxResults) {
    const keywordMap = new Map();

    // 키워드별 점수 통합
    allKeywords.forEach(item => {
      const keyword = item.keyword.toLowerCase().trim();
      
      if (keywordMap.has(keyword)) {
        const existing = keywordMap.get(keyword);
        existing.score = Math.max(existing.score, item.score);
        existing.sources.push(item.source);
      } else {
        keywordMap.set(keyword, {
          keyword: item.keyword,
          score: item.score,
          sources: [item.source],
          category: this.categorizeKeyword(item.keyword),
          extractedAt: item.extractedAt
        });
      }
    });

    // 점수 순으로 정렬하고 상위 결과 반환
    return Array.from(keywordMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * 🏷️ 키워드 카테고리 분류
   */
  categorizeKeyword(keyword) {
    const categories = {
      entertainment: ['먹방', '브이로그', '댄스', 'ASMR', '챌린지', '밈', '유튜버'],
      music: ['음악', '노래', 'MV', '커버', 'K-pop', '아이돌'],
      lifestyle: ['일상', '루틴', '여행', 'GRWM', '힐링', '라이프'],
      gaming: ['게임', '게이밍', '스트리밍', '플레이', 'e스포츠'],
      news: ['뉴스', '이슈', '정치', '사회', '경제']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(cat => keyword.includes(cat))) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * 🤖 Claude 응답 파싱
   */
  parseClaudeResponse(response) {
    try {
      const content = response.content[0]?.text || '';
      
      // JSON 블록 찾기
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      
      // 일반 JSON 파싱 시도
      return JSON.parse(content);
    } catch (error) {
      console.error('Claude 응답 파싱 실패:', error);
      return {
        strategy: content,
        target_sites: ['naver_realtime', 'google_trends_kr'],
        extraction_method: 'fallback',
        expected_keywords: ['트렌드', '이슈']
      };
    }
  }

  /**
   * 🔄 폴백 트렌딩 키워드
   */
  getFallbackTrendingKeywords(region) {
    const fallbackKeywords = {
      'KR': [
        { keyword: '먹방', score: 95, source: 'fallback', category: 'entertainment' },
        { keyword: '브이로그', score: 90, source: 'fallback', category: 'lifestyle' },
        { keyword: '댄스', score: 85, source: 'fallback', category: 'entertainment' },
        { keyword: 'ASMR', score: 80, source: 'fallback', category: 'entertainment' },
        { keyword: '요리', score: 75, source: 'fallback', category: 'lifestyle' },
        { keyword: '챌린지', score: 70, source: 'fallback', category: 'entertainment' },
        { keyword: '여행', score: 65, source: 'fallback', category: 'lifestyle' },
        { keyword: '게임', score: 60, source: 'fallback', category: 'gaming' }
      ],
      'US': [
        { keyword: 'viral', score: 95, source: 'fallback', category: 'entertainment' },
        { keyword: 'trending', score: 90, source: 'fallback', category: 'general' },
        { keyword: 'challenge', score: 85, source: 'fallback', category: 'entertainment' },
        { keyword: 'meme', score: 80, source: 'fallback', category: 'entertainment' }
      ]
    };

    return fallbackKeywords[region] || fallbackKeywords['KR'];
  }

  // === 키워드 확장 보조 메서드들 ===

  /**
   * 🔄 키워드 중복 제거 및 점수 계산
   */
  deduplicateAndScore(keywords, maxResults) {
    const keywordMap = new Map();

    keywords.forEach(item => {
      const normalizedKeyword = item.keyword.toLowerCase().trim();
      
      if (keywordMap.has(normalizedKeyword)) {
        const existing = keywordMap.get(normalizedKeyword);
        // 더 높은 점수 유지, 소스 추가
        existing.score = Math.max(existing.score, item.score || 50);
        existing.sources = [...new Set([...existing.sources, item.source])];
      } else {
        keywordMap.set(normalizedKeyword, {
          keyword: item.keyword,
          score: item.score || Math.random() * 100,
          sources: [item.source],
          baseKeyword: item.baseKeyword,
          category: this.categorizeKeyword(item.keyword)
        });
      }
    });

    return Array.from(keywordMap.values())
      .filter(item => item.keyword.length > 2 && item.keyword.length < 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * 🔄 폴백 키워드 확장
   */
  generateFallbackExpansion(baseKeyword) {
    const expansionPatterns = {
      '먹방': ['ASMR 먹방', '먹방 브이로그', '먹방 리뷰', '먹방 추천'],
      '댄스': ['댄스 커버', '댄스 챌린지', '댄스 안무', '댄스 배우기'],
      '요리': ['요리 레시피', '요리 팁', '간단한 요리', '홈쿠킹'],
      '브이로그': ['일상 브이로그', '여행 브이로그', '브이로그 추천', 'GRWM'],
      '게임': ['게임 플레이', '게임 리뷰', '게임 공략', '게임 스트리밍'],
      'ASMR': ['ASMR 영상', 'ASMR 사운드', 'ASMR 릴렉스', 'ASMR 힐링']
    };

    const fallbackWords = expansionPatterns[baseKeyword] || [
      `${baseKeyword} 트렌드`,
      `${baseKeyword} 인기`,
      `${baseKeyword} 추천`,
      `${baseKeyword} 영상`
    ];

    return fallbackWords.map(keyword => ({
      keyword,
      score: Math.random() * 60 + 20, // 20-80점
      source: 'fallback_expansion',
      baseKeyword
    }));
  }

  // === YouTube 쿼리 생성 메서드들 ===

  /**
   * 🧠 LLM을 사용한 검색 전략 생성
   */
  async generateQueryStrategiesWithLLM(searchKeyword, userIntent, contentType, timeframe, audience, maxQueries) {
    const prompt = `YouTube Shorts에 최적화된 검색 전략을 생성해주세요.

검색 키워드: "${searchKeyword}"
사용자 의도: ${userIntent || '일반 검색'}
콘텐츠 타입: ${contentType || '지정되지 않음'}
시간 범위: ${timeframe || '전체'}
대상 연령층: ${audience || '전체'}

YouTube Data API v3 매개변수를 활용해서 ${maxQueries}개의 다양한 검색 전략을 생성하세요:

활용 가능한 주요 매개변수:
- videoDuration: short (4분 미만), medium (4-20분), long (20분 초과)
- order: date (최신순), viewCount (인기순), relevance (관련성), rating (평점순)
- videoCategoryId: 10(음악), 20(게임), 22(블로그), 23(코미디), 24(엔터테인먼트), 26(노하우)
- publishedAfter/Before: 시간 필터
- regionCode: KR, US, JP
- safeSearch: none, moderate, strict
- videoEmbeddable: true (필수)
- relevanceLanguage: ko, en

각 전략은 다른 접근법을 사용해야 합니다:
1. 인기 기반 전략
2. 최신 트렌드 전략  
3. 관련성 기반 전략
4. 카테고리 특화 전략
5. 시간 기반 전략

JSON 형식으로 응답:
{
  "strategies": [
    {
      "name": "전략명",
      "description": "전략 설명",
      "target_audience": "대상",
      "api_parameters": {
        "q": "최적화된 검색어",
        "videoDuration": "short",
        "order": "viewCount",
        "videoCategoryId": "24",
        "publishedAfter": "2024-01-01T00:00:00Z",
        "regionCode": "KR",
        "relevanceLanguage": "ko",
        "safeSearch": "moderate",
        "videoEmbeddable": "true",
        "maxResults": 20
      },
      "expected_results": "예상 결과 타입",
      "priority": 1
    }
  ],
  "overall_strategy": "전체 전략 설명"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const result = this.parseClaudeResponse(response);
      return result.strategies || [];
    } catch (error) {
      console.error('LLM 전략 생성 실패:', error);
      return this.generateFallbackStrategies(searchKeyword, userIntent);
    }
  }

  /**
   * 🔄 전략을 실제 YouTube API 쿼리로 변환
   */
  convertToYouTubeAPIQuery(strategy, baseKeyword) {
    // 기본 쿼리 구조
    const query = {
      part: 'snippet',
      type: 'video',
      videoDuration: 'short', // Shorts 필수
      videoEmbeddable: 'true', // 재생 가능 필수
      safeSearch: 'moderate',
      maxResults: 20,
      regionCode: 'KR',
      relevanceLanguage: 'ko'
    };

    // 전략의 API 매개변수 적용
    if (strategy.api_parameters) {
      Object.assign(query, strategy.api_parameters);
    }

    // 검색어 최적화
    if (!query.q || query.q.includes('검색어')) {
      query.q = this.optimizeSearchQuery(baseKeyword, strategy);
    }

    // 시간 필터 설정
    if (strategy.name.includes('최신') || strategy.name.includes('트렌드')) {
      query.publishedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query.order = 'date';
    } else if (strategy.name.includes('인기')) {
      query.order = 'viewCount';
      query.publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    return {
      strategy_name: strategy.name,
      description: strategy.description,
      api_query: query,
      estimated_cost: 100, // search.list = 100 units
      priority: strategy.priority || 5,
      expected_results: strategy.expected_results
    };
  }

  /**
   * 🎯 검색어 최적화
   */
  optimizeSearchQuery(baseKeyword, strategy) {
    const optimizations = {
      '인기': `${baseKeyword} 인기`,
      '최신': `${baseKeyword} 최신`,
      '트렌드': `${baseKeyword} 트렌드`,
      '음악': `${baseKeyword} 음악`,
      '댄스': `${baseKeyword} 댄스`,
      '게임': `${baseKeyword} 게임`,
      '요리': `${baseKeyword} 요리`,
      '브이로그': `${baseKeyword} 브이로그`
    };

    for (const [key, value] of Object.entries(optimizations)) {
      if (strategy.name.includes(key) || strategy.description.includes(key)) {
        return value;
      }
    }

    return baseKeyword;
  }

  /**
   * 🔧 LLM으로 쿼리 품질 최적화
   */
  async optimizeQueriesWithLLM(queries, searchKeyword) {
    const prompt = `다음 YouTube API 쿼리들을 분석하고 최적화해주세요:

원본 검색어: "${searchKeyword}"
생성된 쿼리들: ${JSON.stringify(queries, null, 2)}

최적화 기준:
1. YouTube Shorts에 적합성
2. API 할당량 효율성 (일일 10,000 units)
3. 다양성 (중복 방지)
4. 한국 사용자 적합성
5. 실제 결과 예상 품질

최적화된 쿼리를 JSON으로 반환:
{
  "optimized_queries": [
    {
      "strategy_name": "전략명",
      "description": "개선된 설명",
      "api_query": {...},
      "optimization_notes": "최적화 내용",
      "quality_score": 95,
      "recommended_use": "사용 시점",
      "priority": 1
    }
  ],
  "optimization_summary": "전체 최적화 요약"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const result = this.parseClaudeResponse(response);
      return result.optimized_queries || queries;
    } catch (error) {
      console.error('쿼리 최적화 실패:', error);
      return queries.map(q => ({ ...q, quality_score: 70 }));
    }
  }

  /**
   * 📋 사용 가이드 생성
   */
  generateUsageRecommendation(queries) {
    const totalCost = queries.length * 100;
    const dailyBudget = 10000;
    const maxDailyCalls = Math.floor(dailyBudget / 100);

    return {
      total_queries: queries.length,
      estimated_total_cost: totalCost,
      daily_limit_usage: `${(totalCost / dailyBudget * 100).toFixed(1)}%`,
      max_daily_executions: Math.floor(maxDailyCalls / queries.length),
      recommended_execution_order: queries
        .sort((a, b) => (a.priority || 5) - (b.priority || 5))
        .map(q => q.strategy_name),
      cost_optimization_tips: [
        '높은 우선순위 쿼리부터 실행',
        '결과가 만족스러우면 나머지 쿼리 생략 가능',
        '캐시된 결과 활용으로 중복 호출 방지',
        `일일 예산 ${dailyBudget} units 초과 주의`
      ]
    };
  }

  /**
   * 🔄 폴백 전략 생성
   */
  generateFallbackStrategies(searchKeyword, userIntent) {
    return [
      {
        name: '기본 인기순 검색',
        description: '인기순 정렬로 검증된 콘텐츠 우선',
        api_parameters: {
          q: searchKeyword,
          order: 'viewCount',
          publishedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        priority: 1
      },
      {
        name: '최신 콘텐츠 검색',
        description: '최신 트렌드 반영 콘텐츠',
        api_parameters: {
          q: `${searchKeyword} 최신`,
          order: 'date',
          publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        priority: 2
      },
      {
        name: '관련성 기반 검색',
        description: '검색어와 가장 관련성 높은 콘텐츠',
        api_parameters: {
          q: searchKeyword,
          order: 'relevance'
        },
        priority: 3
      }
    ];
  }

  /**
   * 🔄 폴백 쿼리 생성
   */
  generateFallbackQueries(searchKeyword) {
    return [
      {
        strategy_name: '기본 검색',
        api_query: {
          part: 'snippet',
          q: searchKeyword,
          type: 'video',
          videoDuration: 'short',
          videoEmbeddable: 'true',
          regionCode: 'KR',
          maxResults: 20
        },
        estimated_cost: 100
      }
    ];
  }

  // === 통합 워크플로우 보조 메서드들 ===

  /**
   * 🎨 영상 중복 제거 및 랭킹
   */
  deduplicateAndRankVideos(videos, keywords) {
    if (!videos || videos.length === 0) return [];

    // 중복 제거 (영상 ID 기준)
    const uniqueVideos = videos.reduce((acc, video) => {
      const videoId = video.id;
      if (!acc.find(v => v.id === videoId)) {
        acc.push(video);
      }
      return acc;
    }, []);

    // 키워드 관련성 점수 계산 및 정렬
    const rankedVideos = uniqueVideos.map(video => {
      const relevanceScore = this.calculateRelevanceScore(video, keywords);
      const viewScore = Math.log10(video.viewCount || 1) / 10; // 조회수 점수 (0-1)
      const strategyScore = 10 - (video.strategy_priority || 5); // 전략 우선순위 점수
      
      const totalScore = relevanceScore * 0.5 + viewScore * 0.3 + strategyScore * 0.2;
      
      return {
        ...video,
        relevance_score: relevanceScore,
        total_score: totalScore
      };
    });

    // 총점 기준 정렬
    return rankedVideos.sort((a, b) => b.total_score - a.total_score);
  }

  /**
   * 📊 키워드 관련성 점수 계산
   */
  calculateRelevanceScore(video, keywords) {
    if (!keywords || keywords.length === 0) return 0.5;

    let score = 0;
    const title = (video.title || '').toLowerCase();
    const description = (video.description || '').toLowerCase();
    const channel = (video.channel || '').toLowerCase();

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // 제목에서 발견 (가중치 3)
      if (title.includes(keywordLower)) {
        score += 3;
      }
      
      // 설명에서 발견 (가중치 1)
      if (description.includes(keywordLower)) {
        score += 1;
      }
      
      // 채널명에서 발견 (가중치 2)
      if (channel.includes(keywordLower)) {
        score += 2;
      }
    });

    // 정규화 (0-1 범위)
    return Math.min(score / (keywords.length * 3), 1);
  }

  /**
   * 🔥 트렌드 점수 계산
   */
  calculateTrendScore(video, trendingKeywords) {
    if (!trendingKeywords || trendingKeywords.length === 0) return 50;

    let trendScore = 0;
    const title = (video.title || '').toLowerCase();
    const description = (video.description || '').toLowerCase();

    trendingKeywords.forEach(trend => {
      const keyword = (trend.keyword || '').toLowerCase();
      const keywordScore = trend.score || 50;
      
      if (title.includes(keyword)) {
        trendScore += keywordScore * 1.5; // 제목에서 발견 시 1.5배
      }
      
      if (description.includes(keyword)) {
        trendScore += keywordScore * 0.5; // 설명에서 발견 시 0.5배
      }
    });

    // 최근성 보너스 (24시간 이내 업로드)
    const publishedAt = new Date(video.publishedAt);
    const hoursSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSincePublished <= 24) {
      trendScore += 20; // 24시간 이내 보너스
    } else if (hoursSincePublished <= 168) { // 7일 이내
      trendScore += 10;
    }

    // 조회수 비례 보너스
    const viewCount = video.viewCount || 0;
    if (viewCount > 100000) {
      trendScore += 15;
    } else if (viewCount > 10000) {
      trendScore += 10;
    } else if (viewCount > 1000) {
      trendScore += 5;
    }

    return Math.min(trendScore, 100); // 최대 100점
  }

  /**
   * 🎭 콘텐츠 타입 자동 감지
   */
  detectContentType(query) {
    const contentTypes = {
      '먹방': '음식',
      'ASMR': '음식',
      '요리': '음식',
      '맛집': '음식',
      '댄스': '엔터테인먼트',
      '춤': '엔터테인먼트',
      '안무': '엔터테인먼트',
      '음악': '음악',
      '노래': '음악',
      'K-pop': '음악',
      'MV': '음악',
      '커버': '음악',
      '게임': '게임',
      '게이밍': '게임',
      '플레이': '게임',
      '리뷰': '게임',
      '롤': '게임',
      '브이로그': '라이프스타일',
      'vlog': '라이프스타일',
      '일상': '라이프스타일',
      '루틴': '라이프스타일',
      'GRWM': '라이프스타일',
      '여행': '여행',
      '운동': '스포츠',
      '헬스': '스포츠',
      '요가': '스포츠',
      '메이크업': '뷰티',
      '화장': '뷰티',
      '스킨케어': '뷰티',
      '펫': '펫',
      '강아지': '펫',
      '고양이': '펫'
    };

    const queryLower = query.toLowerCase();
    
    for (const [keyword, type] of Object.entries(contentTypes)) {
      if (queryLower.includes(keyword.toLowerCase())) {
        return type;
      }
    }

    return '일반'; // 기본값
  }

  /**
   * ⏰ 시간 범위 자동 감지
   */
  detectTimeframe(query) {
    const timeframes = {
      '오늘': '오늘',
      '어제': '어제',
      '이번주': '이번주',
      '이번달': '이번달',
      '최신': '이번주',
      '최근': '이번주',
      '트렌드': '오늘',
      '핫': '오늘',
      '인기': '이번주',
      '지금': '오늘',
      '현재': '오늘',
      '요즘': '이번주',
      '신곡': '이번달',
      '신작': '이번달'
    };

    const queryLower = query.toLowerCase();
    
    for (const [keyword, timeframe] of Object.entries(timeframes)) {
      if (queryLower.includes(keyword)) {
        return timeframe;
      }
    }

    return '전체'; // 기본값
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
  console.log('\\n🔑 API 설정 상태:');
  console.log(`  - YouTube API: ${server.config.youtubeApiKey ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`  - Claude API: ${server.config.claudeApiKey ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`  - Bright Data API: ${server.config.brightDataApiKey ? '✅ 설정됨' : '❌ 미설정'}`);
  
  // 최적화 설정 표시
  console.log('\\n⚙️ 최적화 설정:');
  console.log('  - search.list maxResults: 50 (최대 후보 확보)');
  console.log('  - 2단계 필터링: 활성화 (재생 가능 영상만)');
  console.log('  - API 할당량 관리: 일일 10,000 units');
  console.log('  - 캐싱 전략: 4시간 TTL');
  console.log('  - 스마트 페이지네이션: 30개 미만 시 자동 다음 페이지');
  
  // 기능 개요 표시
  console.log('\\n🎯 제공 기능:');
  console.log('  - 🛠️  10개 MCP 도구 (검색, 트렌드, 워크플로우)');
  console.log('  - 📁 3개 리소스 (캐시, 트렌드, 사용량)');
  console.log('  - 💬 3개 프롬프트 (최적화, 분석, 추천)');
  
  console.log('\\n🌐 연결 방식:');
  console.log('  - 🌐 StreamableHTTP: 정식 MCP over HTTP (포트 3000)');
  console.log('  - 🔗 Backend 호환성: Express API 레이어 (포트 3001)');
  console.log('  - 🔄 폴백: Express HTTP 서버 (MCP 실패 시)');

  try {
    if (isStdio) {
      console.log('\\n🔌 STDIO 모드 시작...');
      await server.startStdio();
    } else if (isHTTP || isRailway) {
      const port = parseInt(process.env.PORT) || 3000;
      
      if (isRailway) {
        // Railway: Express HTTP 서버만 사용 (헬스체크 호환성)
        console.log(`\\n🌐 Railway 배포 모드 - Express HTTP 서버 (포트: ${port})...`);
        await server.startExpressHTTP(port);
      } else {
        // 로컬: MCP StreamableHTTP 우선 시도
        console.log(`\\n🌐 HTTP 모드 시작 (로컬 개발용) - 포트: ${port}...`);
        console.log('⭐ 정식 MCP StreamableHTTP 트랜스포트 우선 시도');
        
        try {
          await server.startHTTP(port);
          
          // Backend 호환성 레이어도 시작 (다른 포트)
          setTimeout(async () => {
            await server.startBackendCompatibilityLayer(port + 1);
          }, 1000);
          
        } catch (mcpError) {
          console.error('❌ MCP StreamableHTTP 시작 실패:', mcpError);
          console.log('🔄 Express HTTP 폴백 모드로 전환...');
          await server.startExpressHTTP(port);
        }
      }
    } else {
      console.log('\\n🔌 기본값: STDIO 모드 시작...');
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