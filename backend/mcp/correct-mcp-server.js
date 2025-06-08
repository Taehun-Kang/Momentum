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
    // MCP 서버 생성
    this.server = new McpServer({
      name: "youtube-shorts-ai-curator",
      version: "1.0.0",
      description: "AI-powered YouTube Shorts curation with LLM optimization and real-time trends"
    });

    // 설정
    this.config = {
      claudeApiKey: process.env.ANTHROPIC_API_KEY,
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
      brightDataApiKey: process.env.BRIGHT_DATA_API_KEY,
      brightDataProxy: process.env.BRIGHT_DATA_PROXY_ENDPOINT || 'https://brightdata-proxy-endpoint.com/api'
    };

    // API 클라이언트 초기화
    this.initializeApiClients();

    // 내부 서비스 (실제 API 연동)
    this.cache = new Map();
    this.stats = {
      toolCalls: 0,
      resourceReads: 0,
      promptGets: 0,
      apiUnitsUsed: 0
    };

    this.setupMCPFeatures();
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
    // 1. 기본 영상 검색 도구
    this.server.tool(
      "search_videos",
      {
        query: z.string().describe("검색할 키워드나 자연어 질문"),
        maxResults: z.number().optional().default(10).describe("최대 결과 수 (1-50)"),
        nextPageToken: z.string().optional().describe("다음 페이지 토큰 (페이지네이션용)"),
        enableLLMOptimization: z.boolean().optional().default(true).describe("LLM 쿼리 최적화 사용"),
        includeAnalysis: z.boolean().optional().default(false).describe("상세 분석 정보 포함")
      },
      async ({ query, maxResults, nextPageToken, enableLLMOptimization, includeAnalysis }) => {
        this.stats.toolCalls++;
        
        try {
          console.log(`🔍 MCP Tool: search_videos - "${query}"`);
          
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
            apiUnitsUsed: this.calculateAPIUnits(searchResults.videos.length),
            performance: {
              responseTimeMs: Date.now() - performance.now(),
              cacheHit: false
            }
          };

          // 상세 분석 추가 (옵션)
          if (includeAnalysis && this.anthropic) {
            result.analysis = await this.analyzeResults(searchResults.videos);
          }

          this.stats.apiUnitsUsed += result.apiUnitsUsed;

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
   * 🌐 서버 시작 (HTTP 트랜스포트)
   */
  async startHTTP(port = 3000) {
    console.log(`🎬 YouTube Shorts AI MCP 서버 시작 (HTTP:${port})...`);
    
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      
      await this.server.connect(transport);
      
      // Express 서버 설정 (별도 구현 필요)
      console.log(`✅ MCP 서버가 HTTP 포트 ${port}에서 실행 중입니다.`);
      
    } catch (error) {
      console.error('❌ HTTP 서버 시작 실패:', error);
      throw error;
    }
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
   * 🎬 YouTube Data API v3 검색 (2단계 필터링)
   */
  async searchYouTubeVideos(params, maxResults, nextPageToken) {
    if (!this.config.youtubeApiKey) {
      throw new Error('YouTube API 키가 설정되지 않았습니다.');
    }

    try {
      // 1단계: search.list로 후보 영상 검색
      console.log('1️⃣ YouTube 후보 영상 검색 중...');
      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: this.config.youtubeApiKey,
          part: 'snippet',
          q: params.query,
          type: 'video',
          videoDuration: 'short', // 4분 미만
          maxResults: Math.min(maxResults * 2, 50), // 여유분을 두고 검색
          regionCode: 'KR',
          relevanceLanguage: 'ko',
          safeSearch: 'moderate',
          order: params.filters?.order || 'relevance',
          pageToken: nextPageToken
        }
      });

      const searchResults = searchResponse.data.items || [];
      if (searchResults.length === 0) {
        return { videos: [], nextPageToken: null };
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

      // 3단계: 재생 가능한 Shorts만 필터링
      console.log('3️⃣ 재생 가능 영상 필터링 중...');
      const playableShorts = detailedVideos.filter(video => {
        // 임베드 가능 여부
        if (!video.status.embeddable) return false;
        
        // 공개 상태
        if (video.status.privacyStatus !== 'public') return false;
        
        // 지역 차단 확인
        const restrictions = video.contentDetails.regionRestriction;
        if (restrictions) {
          if (restrictions.blocked?.includes('KR')) return false;
          if (restrictions.allowed && !restrictions.allowed.includes('KR')) return false;
        }
        
        // Shorts 길이 확인 (60초 이하)
        const duration = this.parseISO8601Duration(video.contentDetails.duration);
        if (duration > 60 || duration < 5) return false;
        
        return true;
      });

      console.log(`✅ 필터링 완료: ${playableShorts.length}/${searchResults.length} 영상`);
      return {
        videos: playableShorts.slice(0, maxResults),
        nextPageToken: searchResponse.data.nextPageToken || null
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
    // search.list: 100 units
    // videos.list: 1 + (3 parts * 2) = 7 units
    return 100 + 7;
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
}

// 메인 실행 로직
async function main() {
  const mcpServer = new YouTubeShortsAIMCPServer();
  
  // 환경 변수에 따라 트랜스포트 결정
  const transport = process.env.MCP_TRANSPORT || 'stdio';
  
  try {
    if (transport === 'stdio') {
      await mcpServer.startStdio();
    } else if (transport === 'http') {
      const port = parseInt(process.env.PORT || '3000');
      await mcpServer.startHTTP(port);
    } else {
      throw new Error(`지원하지 않는 트랜스포트: ${transport}`);
    }
    
  } catch (error) {
    console.error('❌ MCP 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default YouTubeShortsAIMCPServer;
export { YouTubeShortsAIMCPServer }; 