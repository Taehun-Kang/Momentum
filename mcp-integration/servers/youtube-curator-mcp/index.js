#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * YouTube Shorts Curator MCP Server
 * AI 큐레이션을 위한 YouTube Shorts 관련 도구들을 제공
 * Wave Team
 */
class YouTubeCuratorMCP {
  constructor() {
    this.server = new Server(
      {
        name: "youtube-shorts-curator",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // API 키 설정
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    this.serpApiKey = process.env.SERPAPI_KEY;
    
    // 캐시 설정
    this.keywordCache = new Map();
    this.videoCache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24시간

    console.log('🎬 YouTube Curator MCP Server 초기화 완료');
    
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Tools 리스트 정의
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "process_natural_language",
            description: "자연어 입력을 분석하여 YouTube Shorts 검색에 적합한 키워드를 추출합니다",
            inputSchema: {
              type: "object",
              properties: {
                userInput: {
                  type: "string",
                  description: "사용자의 자연어 입력 (예: '피곤해서 힐링되는 영상 보고 싶어', 'LCK 페이커 최신 하이라이트')"
                },
                options: {
                  type: "object",
                  properties: {
                    maxPrimaryKeywords: {
                      type: "number",
                      description: "최대 주요 키워드 수",
                      default: 3
                    },
                    maxSecondaryKeywords: {
                      type: "number", 
                      description: "최대 보조 키워드 수",
                      default: 5
                    },
                    includeContext: {
                      type: "boolean",
                      description: "컨텍스트 정보 포함 여부",
                      default: true
                    }
                  }
                }
              },
              required: ["userInput"]
            }
          },
          {
            name: "intelligent_search_workflow",
            description: "자연어 입력부터 YouTube Shorts 검색까지 전체 워크플로우를 실행합니다",
            inputSchema: {
              type: "object",
              properties: {
                userInput: {
                  type: "string",
                  description: "사용자의 자연어 입력"
                },
                options: {
                  type: "object",
                  properties: {
                    maxQueries: {
                      type: "number",
                      description: "실행할 최대 쿼리 수",
                      default: 3
                    },
                    maxResults: {
                      type: "number",
                      description: "쿼리당 최대 결과 수",
                      default: 15
                    },
                    strategy: {
                      type: "string",
                      enum: ["auto", "channel_focused", "category_focused", "keyword_expansion", "time_sensitive"],
                      description: "검색 전략",
                      default: "auto"
                    },
                    includeWorkflowDetails: {
                      type: "boolean",
                      description: "워크플로우 상세 과정 포함 여부",
                      default: false
                    }
                  }
                }
              },
              required: ["userInput"]
            }
          },
          {
            name: "expand_keyword",
            description: "키워드를 확장하여 관련 검색어, 채널, 카테고리 추천을 생성합니다",
            inputSchema: {
              type: "object",
              properties: {
                keyword: {
                  type: "string",
                  description: "확장할 원본 키워드 (예: '롤드컵', '먹방', '브이로그')"
                },
                options: {
                  type: "object",
                  properties: {
                    includeChannels: {
                      type: "boolean",
                      description: "채널 추천 포함 여부",
                      default: true
                    },
                    includeTimeFilters: {
                      type: "boolean", 
                      description: "시간 필터 추천 포함 여부",
                      default: true
                    },
                    maxKeywords: {
                      type: "number",
                      description: "최대 확장 키워드 수",
                      default: 15
                    }
                  }
                }
              },
              required: ["keyword"]
            }
          },
          {
            name: "build_optimized_queries",
            description: "키워드에 대한 최적화된 YouTube 검색 쿼리들을 생성합니다",
            inputSchema: {
              type: "object",
              properties: {
                keyword: {
                  type: "string",
                  description: "검색할 키워드"
                },
                strategy: {
                  type: "string",
                  enum: ["auto", "channel_focused", "category_focused", "keyword_expansion", "time_sensitive"],
                  description: "검색 전략",
                  default: "auto"
                },
                maxResults: {
                  type: "number",
                  description: "쿼리당 최대 결과 수",
                  default: 15
                }
              },
              required: ["keyword"]
            }
          },
          {
            name: "search_playable_shorts",
            description: "재생 가능한 YouTube Shorts를 검색합니다 (2단계 필터링 적용)",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "검색 쿼리 (OR 연산자 지원: 'keyword1 | keyword2')"
                },
                maxResults: {
                  type: "number",
                  description: "최대 결과 수",
                  default: 20
                },
                filters: {
                  type: "object",
                  properties: {
                    uploadDate: {
                      type: "string",
                      enum: ["today", "week", "month", "year", "any"],
                      description: "업로드 날짜 필터",
                      default: "any"
                    },
                    order: {
                      type: "string", 
                      enum: ["relevance", "date", "viewCount", "rating"],
                      description: "정렬 순서",
                      default: "relevance"
                    },
                    channelId: {
                      type: "string",
                      description: "특정 채널 ID로 제한"
                    }
                  }
                }
              },
              required: ["query"]
            }
          },
          {
            name: "analyze_video_metadata",
            description: "YouTube 영상의 메타데이터를 분석하고 큐레이션 점수를 계산합니다",
            inputSchema: {
              type: "object",
              properties: {
                videoIds: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "분석할 비디오 ID 목록"
                },
                criteria: {
                  type: "object",
                  properties: {
                    minViewCount: {
                      type: "number",
                      description: "최소 조회수",
                      default: 1000
                    },
                    maxDuration: {
                      type: "number", 
                      description: "최대 길이 (초)",
                      default: 60
                    },
                    preferredCategories: {
                      type: "array",
                      items: {
                        type: "string"
                      },
                      description: "선호 카테고리 목록"
                    }
                  }
                }
              },
              required: ["videoIds"]
            }
          }
        ]
      };
    });

    // Tool 실행 핸들러
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "process_natural_language":
            return await this.processNaturalLanguage(args);
          
          case "intelligent_search_workflow":
            return await this.intelligentSearchWorkflow(args);
          
          case "expand_keyword":
            return await this.expandKeyword(args);
          
          case "build_optimized_queries":
            return await this.buildOptimizedQueries(args);
          
          case "search_playable_shorts":
            return await this.searchPlayableShorts(args);
          
          case "analyze_video_metadata":
            return await this.analyzeVideoMetadata(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`Tool ${name} 실행 오류:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  /**
   * 자연어 입력 분석 및 키워드 추출 도구
   */
  async processNaturalLanguage(args) {
    const { userInput, options = {} } = args;

    try {
      if (!process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_API_KEY) {
        throw new Error('Claude API 키가 설정되지 않았습니다');
      }

      const prompt = `다음 사용자 입력에서 YouTube Shorts 검색에 적합한 핵심 키워드를 추출해주세요:

사용자 입력: "${userInput}"

다음 JSON 형태로 응답해주세요:
{
  "primaryKeywords": ["주요 키워드 ${options.maxPrimaryKeywords || 3}개까지"],
  "secondaryKeywords": ["보조 키워드 ${options.maxSecondaryKeywords || 5}개까지"],
  "context": {
    "intent": "검색 의도 (예: 힐링, 정보, 엔터테인먼트)",
    "mood": "감정/분위기 (예: 피곤함, 스트레스, 흥미)",
    "timeContext": "시간 관련성 (예: 최신, 일반, 특정 시기)",
    "category": "예상 카테고리 (예: 음악, 게임, 라이프스타일)"
  },
  "searchHints": ["검색 힌트나 추가 정보"]
}`;

      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 15000
      });

      const extractedData = JSON.parse(response.data.content[0].text);

      const result = {
        originalInput: userInput,
        analysis: extractedData,
        extractionMethod: "claude_api",
        processingTime: new Date().toISOString()
      };

      if (options.includeContext) {
        result.suggestions = {
          nextSteps: this.generateNextSteps(extractedData),
          searchStrategies: this.suggestSearchStrategies(extractedData.context)
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('자연어 처리 실패:', error);
      
      // 폴백: 간단한 키워드 추출
      const fallbackKeywords = userInput.replace(/[^\w\s가-힣]/g, '').split(/\s+/).filter(word => word.length > 1);
      const fallbackResult = {
        originalInput: userInput,
        analysis: {
          primaryKeywords: fallbackKeywords.slice(0, options.maxPrimaryKeywords || 3),
          secondaryKeywords: fallbackKeywords.slice(3, 3 + (options.maxSecondaryKeywords || 5)),
          context: { 
            intent: 'general', 
            mood: 'neutral', 
            timeContext: 'general', 
            category: 'entertainment' 
          },
          searchHints: []
        },
        extractionMethod: "fallback_regex",
        error: error.message,
        processingTime: new Date().toISOString()
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(fallbackResult, null, 2)
          }
        ]
      };
    }
  }

  /**
   * 지능형 검색 워크플로우 통합 실행 도구
   */
  async intelligentSearchWorkflow(args) {
    const { userInput, options = {} } = args;
    const workflowResults = {};

    try {
      console.log(`🚀 지능형 검색 워크플로우 시작: "${userInput}"`);

      // 1단계: 자연어 분석 및 키워드 추출
      console.log('🔍 1단계: 자연어 분석 중...');
      const nlpResult = await this.processNaturalLanguage({ 
        userInput, 
        options: { includeContext: false } 
      });
      const extractedData = JSON.parse(nlpResult.content[0].text);
      workflowResults.step1_naturalLanguageProcessing = extractedData;

      // 2단계: 주요 키워드들에 대한 확장
      console.log('🔎 2단계: 키워드 확장 중...');
      const expandedResults = {};
      
      for (const keyword of extractedData.analysis.primaryKeywords) {
        try {
          const expansionResult = await this.expandKeyword({ 
            keyword,
            options: {
              maxKeywords: 15,
              includeChannels: true,
              includeTimeFilters: extractedData.analysis.context.timeContext !== 'general'
            }
          });
          expandedResults[keyword] = JSON.parse(expansionResult.content[0].text);
        } catch (error) {
          console.error(`키워드 "${keyword}" 확장 실패:`, error.message);
          expandedResults[keyword] = { expanded: [keyword], error: error.message };
        }
      }
      workflowResults.step2_keywordExpansion = expandedResults;

      // 3단계: 최적화된 쿼리 생성
      console.log('🔧 3단계: 쿼리 최적화 중...');
      const allQueries = [];

      for (const keyword of extractedData.analysis.primaryKeywords) {
        try {
          const queryResult = await this.buildOptimizedQueries({
            keyword,
            strategy: options.strategy || 'auto',
            maxResults: options.maxResults || 15
          });
          const queryData = JSON.parse(queryResult.content[0].text);
          allQueries.push(...(queryData.queries || []));
        } catch (error) {
          console.error(`쿼리 생성 실패 "${keyword}":`, error.message);
          allQueries.push({
            query: keyword,
            type: 'basic_search',
            priority: 'medium',
            estimatedUnits: 107,
            maxResults: options.maxResults || 15
          });
        }
      }

      // 쿼리 중복 제거 및 우선순위 정렬
      const uniqueQueries = this.deduplicateQueries(allQueries);
      const sortedQueries = uniqueQueries.sort((a, b) => {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      });

      workflowResults.step3_queryOptimization = {
        totalGenerated: allQueries.length,
        uniqueQueries: sortedQueries.length,
        queries: sortedQueries,
        estimatedApiUnits: sortedQueries.reduce((sum, q) => sum + (q.estimatedUnits || 107), 0)
      };

      // 4단계: 실제 YouTube 검색 실행
      console.log('🎬 4단계: YouTube 검색 실행 중...');
      const searchResults = [];
      const maxQueries = Math.min(options.maxQueries || 3, sortedQueries.length);
      const executedQueries = sortedQueries.slice(0, maxQueries);

      for (const queryObj of executedQueries) {
        try {
          const searchResult = await this.searchPlayableShorts({
            query: queryObj.query,
            maxResults: queryObj.maxResults || 10,
            filters: {
              order: queryObj.order || 'relevance',
              uploadDate: queryObj.timeFilter || 'any',
              channelId: queryObj.channelId || null
            }
          });

          const searchData = JSON.parse(searchResult.content[0].text);
          searchResults.push({
            query: queryObj.query,
            type: queryObj.type,
            results: searchData.results || [],
            totalFound: searchData.totalResults || 0,
            filteringSuccess: searchData.filteringSuccess || 0
          });

        } catch (error) {
          console.error(`검색 실패 "${queryObj.query}":`, error.message);
          searchResults.push({
            query: queryObj.query,
            type: queryObj.type,
            error: error.message,
            results: []
          });
        }
      }

      workflowResults.step4_youtubeSearch = searchResults;

      // 최종 결과 분석
      const allVideos = searchResults.flatMap(search => search.results || []);
      const totalVideosFound = searchResults.reduce((sum, search) => sum + (search.totalFound || 0), 0);
      const successfulSearches = searchResults.filter(search => !search.error && search.totalFound > 0).length;
      const averageFilteringSuccess = searchResults.length > 0 ? 
        Math.round(searchResults.reduce((sum, search) => sum + (search.filteringSuccess || 0), 0) / searchResults.length) : 0;

      // 상위 추천 영상 (조회수 기준 정렬)
      const topVideos = allVideos
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 10);

      const finalResult = {
        originalInput: userInput,
        workflow: workflowResults,
        summary: {
          totalVideosFound,
          successfulSearches,
          totalSearches: searchResults.length,
          searchSuccessRate: Math.round((successfulSearches / Math.max(searchResults.length, 1)) * 100),
          averageFilteringSuccess,
          apiUnitsUsed: workflowResults.step3_queryOptimization.estimatedApiUnits,
          processingTime: new Date().toISOString()
        },
        recommendations: {
          videos: topVideos,
          searchQueries: executedQueries.map(q => q.query),
          categories: [...new Set(allVideos.map(v => this.categorizeVideo(v)).filter(Boolean))]
        }
      };

      // 워크플로우 상세 정보 포함 여부 결정
      if (!options.includeWorkflowDetails) {
        // 간단한 형태로 반환 (최종 결과만)
        const simplifiedResult = {
          originalInput: userInput,
          recommendations: finalResult.recommendations,
          summary: finalResult.summary
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(simplifiedResult, null, 2)
            }
          ]
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(finalResult, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('지능형 검색 워크플로우 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "지능형 검색 워크플로우 실패",
              message: error.message,
              originalInput: userInput,
              workflowResults: workflowResults,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * 키워드 확장 도구
   */
  async expandKeyword(args) {
    const { keyword, options = {} } = args;
    
    // 캐시 확인
    const cacheKey = `expand_${keyword.toLowerCase()}`;
    if (this.keywordCache.has(cacheKey)) {
      const cached = this.keywordCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...cached.data,
                fromCache: true
              }, null, 2)
            }
          ]
        };
      }
    }

    try {
      // 1. SerpAPI로 관련 검색어 수집
      const relatedKeywords = await this.getRelatedKeywords(keyword);
      
      // 2. 컨텍스트 기반 키워드 생성
      const contextKeywords = this.getContextualKeywords(keyword);
      
      // 3. YouTube 특화 키워드 생성
      const youtubeKeywords = this.generateYouTubeKeywords(keyword);
      
      // 4. 모든 키워드 통합 및 중복 제거
      const allKeywords = [
        ...relatedKeywords,
        ...contextKeywords,
        ...youtubeKeywords
      ];
      
      const uniqueKeywords = this.deduplicateKeywords(allKeywords);
      const rankedKeywords = this.rankKeywords(keyword, uniqueKeywords);
      
      const result = {
        original: keyword,
        expanded: rankedKeywords.slice(0, options.maxKeywords || 15),
        categories: this.categorizeKeywords(rankedKeywords),
        suggestions: {
          channels: options.includeChannels ? await this.extractChannelSuggestions(rankedKeywords) : [],
          hashtags: this.extractHashtagSuggestions(rankedKeywords),
          timeFilters: options.includeTimeFilters ? this.suggestTimeFilters(keyword) : []
        },
        expansionStrategy: this.determineExpansionStrategy(keyword),
        timestamp: new Date().toISOString()
      };

      // 캐시 저장
      this.keywordCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('키워드 확장 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "키워드 확장 실패",
              message: error.message,
              fallback: this.getFallbackExpansion(keyword)
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * 최적화된 쿼리 생성 도구
   */
  async buildOptimizedQueries(args) {
    const { keyword, strategy = "auto", maxResults = 15 } = args;

    try {
      // 키워드 확장 먼저 수행
      const expansionResult = await this.expandKeyword({ keyword });
      const expansion = JSON.parse(expansionResult.content[0].text);
      
      // 전략 결정
      const finalStrategy = strategy === "auto" ? 
        this.determineSearchStrategy(keyword, expansion) : [strategy];
      
      const queries = [];
      
      for (const strategyType of finalStrategy) {
        switch (strategyType) {
          case "channel_focused":
            queries.push(...this.buildChannelQueries(keyword, expansion, maxResults));
            break;
          case "category_focused":
            queries.push(...this.buildCategoryQueries(keyword, expansion, maxResults));
            break;
          case "keyword_expansion":
            queries.push(...this.buildExpandedKeywordQueries(keyword, expansion, maxResults));
            break;
          case "time_sensitive":
            queries.push(...this.buildTimeBasedQueries(keyword, expansion, maxResults));
            break;
          default:
            queries.push(this.buildBasicQuery(keyword, maxResults));
        }
      }
      
      // 쿼리 최적화 (중복 제거, 우선순위 정렬)
      const optimizedQueries = this.optimizeQueries(queries);
      
      const result = {
        original: keyword,
        strategy: finalStrategy,
        queries: optimizedQueries,
        estimatedApiUnits: optimizedQueries.reduce((sum, q) => sum + (q.estimatedUnits || 107), 0),
        estimatedResults: Math.floor(optimizedQueries.length * maxResults * 0.7),
        timestamp: new Date().toISOString()
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('쿼리 빌드 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "쿼리 빌드 실패",
              message: error.message,
              fallback: {
                original: keyword,
                strategy: ["basic_search"],
                queries: [this.buildBasicQuery(keyword, maxResults)]
              }
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * 재생 가능한 Shorts 검색 도구
   */
  async searchPlayableShorts(args) {
    const { query, maxResults = 20, filters = {} } = args;

    try {
      if (!this.youtubeApiKey) {
        throw new Error('YouTube API 키가 설정되지 않았습니다');
      }

      // 1단계: search.list로 후보 영상 검색
      const searchParams = {
        part: 'snippet',
        q: query,
        type: 'video',
        videoDuration: 'short', // 4분 미만
        maxResults: Math.min(maxResults * 2, 50), // 여유분 확보
        regionCode: 'KR',
        relevanceLanguage: 'ko',
        order: filters.order || 'relevance',
        key: this.youtubeApiKey
      };

      // 날짜 필터 추가
      if (filters.uploadDate && filters.uploadDate !== 'any') {
        searchParams.publishedAfter = this.getPublishedAfterDate(filters.uploadDate);
      }

      // 채널 필터 추가
      if (filters.channelId) {
        searchParams.channelId = filters.channelId;
      }

      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: searchParams,
        timeout: 10000
      });

      const videoIds = searchResponse.data.items.map(item => item.id.videoId);
      
      if (videoIds.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                query,
                results: [],
                totalResults: 0,
                message: "검색 결과가 없습니다"
              }, null, 2)
            }
          ]
        };
      }

      // 2단계: videos.list로 상세 정보 및 재생 가능 여부 확인
      const videoResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet,contentDetails,status,statistics',
          id: videoIds.join(','),
          key: this.youtubeApiKey
        },
        timeout: 10000
      });

      // 3단계: 재생 가능한 Shorts만 필터링
      const playableVideos = videoResponse.data.items.filter(video => {
        // 재생 가능 여부 확인
        if (!video.status.embeddable) return false;
        if (video.status.privacyStatus !== 'public') return false;
        
        // 지역 제한 확인
        const restrictions = video.contentDetails.regionRestriction;
        if (restrictions) {
          if (restrictions.blocked?.includes('KR')) return false;
          if (restrictions.allowed && !restrictions.allowed.includes('KR')) return false;
        }
        
        // Shorts 길이 확인 (60초 이하)
        const duration = this.parseDuration(video.contentDetails.duration);
        if (duration > 60) return false;
        
        return true;
      });

      // 메타데이터 정리
      const cleanedResults = playableVideos.slice(0, maxResults).map(video => ({
        id: video.id,
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        description: video.snippet.description.substring(0, 200),
        thumbnails: video.snippet.thumbnails,
        publishedAt: video.snippet.publishedAt,
        duration: video.contentDetails.duration,
        viewCount: parseInt(video.statistics.viewCount || 0),
        likeCount: parseInt(video.statistics.likeCount || 0),
        commentCount: parseInt(video.statistics.commentCount || 0),
        tags: video.snippet.tags?.slice(0, 5) || []
      }));

      const result = {
        query,
        results: cleanedResults,
        totalResults: cleanedResults.length,
        filteredFrom: videoIds.length,
        filteringSuccess: Math.round((cleanedResults.length / videoIds.length) * 100),
        searchStrategy: "2_stage_filtering",
        timestamp: new Date().toISOString()
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('YouTube 검색 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "YouTube 검색 실패",
              message: error.message,
              query,
              results: []
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * 비디오 메타데이터 분석 도구
   */
  async analyzeVideoMetadata(args) {
    const { videoIds, criteria = {} } = args;

    try {
      if (!this.youtubeApiKey) {
        throw new Error('YouTube API 키가 설정되지 않았습니다');
      }

      // 최대 50개씩 배치 처리
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < videoIds.length; i += batchSize) {
        batches.push(videoIds.slice(i, i + batchSize));
      }

      const allVideos = [];
      
      for (const batch of batches) {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            part: 'snippet,contentDetails,status,statistics',
            id: batch.join(','),
            key: this.youtubeApiKey
          },
          timeout: 10000
        });
        
        allVideos.push(...response.data.items);
      }

      // 분석 및 점수 계산
      const analyzedVideos = allVideos.map(video => {
        const analysis = this.calculateCurationScore(video, criteria);
        
        return {
          id: video.id,
          title: video.snippet.title,
          channelTitle: video.snippet.channelTitle,
          publishedAt: video.snippet.publishedAt,
          duration: this.parseDuration(video.contentDetails.duration),
          viewCount: parseInt(video.statistics.viewCount || 0),
          likeCount: parseInt(video.statistics.likeCount || 0),
          commentCount: parseInt(video.statistics.commentCount || 0),
          curationScore: analysis.score,
          curationReasons: analysis.reasons,
          isRecommended: analysis.score >= 70,
          category: this.categorizeVideo(video)
        };
      });

      // 점수순 정렬
      analyzedVideos.sort((a, b) => b.curationScore - a.curationScore);

      const result = {
        totalAnalyzed: analyzedVideos.length,
        recommendedCount: analyzedVideos.filter(v => v.isRecommended).length,
        averageScore: Math.round(analyzedVideos.reduce((sum, v) => sum + v.curationScore, 0) / analyzedVideos.length),
        videos: analyzedVideos,
        criteria: criteria,
        timestamp: new Date().toISOString()
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('비디오 분석 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "비디오 분석 실패",
              message: error.message,
              videoIds
            }, null, 2)
          }
        ]
      };
    }
  }

  // ==================== 헬퍼 메서드들 ====================

  async getRelatedKeywords(keyword) {
    if (!this.serpApiKey) {
      console.warn('SerpAPI 키가 없습니다. LLM 기반 키워드 확장을 사용합니다.');
      return this.getLLMBasedKeywords(keyword);
    }

    try {
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google',
          q: keyword + ' 유튜브',
          api_key: this.serpApiKey,
          gl: 'kr',
          hl: 'ko',
          num: 10
        },
        timeout: 10000
      });

      const relatedSearches = response.data.related_searches || [];
      const peopleAlsoAsk = response.data.people_also_ask || [];
      
      const serpKeywords = [
        ...relatedSearches.map(item => item.query),
        ...peopleAlsoAsk.map(item => item.question)
      ]
      .filter(q => q && q.length > 0)
      .map(q => q.replace(/[^\w\s가-힣]/g, '').trim())
      .filter(q => q.length > 1);

      // SerpAPI 결과와 LLM 결과 결합
      const llmKeywords = await this.getLLMBasedKeywords(keyword);
      
      return [...new Set([...serpKeywords, ...llmKeywords])];

    } catch (error) {
      console.error('SerpAPI 오류:', error);
      return this.getLLMBasedKeywords(keyword);
    }
  }

  async getLLMBasedKeywords(keyword) {
    try {
      // Claude API 호출로 동적 키워드 확장
      const prompt = `키워드 "${keyword}"와 관련된 YouTube에서 인기 있을 만한 검색어 15개를 JSON 배열 형태로 생성해주세요. 
      
다음 조건을 만족해야 합니다:
1. 한국어로 작성
2. YouTube Shorts에 적합한 내용
3. 현재 트렌드를 반영
4. 다양한 관점에서 접근 (리뷰, 하이라이트, 브이로그, 챌린지, 꿀팁, ASMR 등)
5. 원본 키워드와 의미적으로 연관성 있음

응답은 반드시 JSON 배열 형태로만 해주세요:
["키워드1", "키워드2", "키워드3", ...]`;

      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 15000
      });

      const content = response.data.content[0].text;
      
      // JSON 파싱 시도
      try {
        const keywords = JSON.parse(content);
        if (Array.isArray(keywords)) {
          return keywords.filter(k => k && k.length > 1).slice(0, 15);
        }
      } catch (parseError) {
        console.log('LLM 응답 파싱 실패, 응답 내용:', content);
      }

      // 파싱 실패 시 응답에서 키워드 추출
      const extractedKeywords = content
        .match(/"([^"]+)"/g)
        ?.map(k => k.replace(/"/g, ''))
        .filter(k => k.length > 1) || [];

      return extractedKeywords.length > 0 ? extractedKeywords.slice(0, 15) : this.getFallbackKeywords(keyword);

    } catch (error) {
      console.error('LLM 키워드 확장 실패:', error.message);
      return this.getFallbackKeywords(keyword);
    }
  }

  getFallbackKeywords(keyword) {
    const basicExpansions = [
      `${keyword} 리뷰`,
      `${keyword} 추천`,
      `${keyword} 꿀팁`,
      `${keyword} 하이라이트`,
      `${keyword} 브이로그`
    ];
    return basicExpansions;
  }

  getContextualKeywords(keyword) {
    // 하드코딩 제거하고 동적 생성
    return this.generateContextualVariations(keyword);
  }

  generateContextualVariations(keyword) {
    const variations = [];
    
    // 동적 패턴 생성
    const patterns = [
      `${keyword} 챌린지`,
      `${keyword} 하는법`,
      `${keyword} 비교`,
      `${keyword} 추천`,
      `${keyword} 꿀팁`,
      `${keyword} 리뷰`,
      `${keyword} 하이라이트`,
      `${keyword} 브이로그`,
      `${keyword} ASMR`,
      `${keyword} 튜토리얼`
    ];

    // 키워드 길이에 따라 다른 전략
    if (keyword.length <= 2) {
      // 짧은 키워드는 더 많은 변형 생성
      variations.push(...patterns);
    } else {
      // 긴 키워드는 선별적 변형
      variations.push(...patterns.slice(0, 6));
    }

    return variations;
  }

  generateYouTubeKeywords(keyword) {
    // 동적 YouTube 특화 키워드 생성
    const currentTime = new Date();
    const timeBasedSuffixes = [
      currentTime.getHours() < 12 ? '아침' : currentTime.getHours() < 18 ? '오후' : '저녁',
      currentTime.getMonth() + 1 + '월',
      ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'][currentTime.getDay()]
    ];

    const dynamicFormats = [
      `${keyword} 실시간`,
      `${keyword} 최신`,
      `${keyword} 인기`,
      `${keyword} ${timeBasedSuffixes[0]}`,
      `${keyword} 오늘`,
      `${keyword} 2025`,
      `${keyword} 트렌드`
    ];

    return keyword.length <= 3 ? dynamicFormats.slice(0, 8) : dynamicFormats.slice(0, 5);
  }

  deduplicateKeywords(keywords) {
    return [...new Set(keywords
      .map(k => k.toLowerCase().trim())
      .filter(k => k.length > 1)
      .filter(k => !/^\d+$/.test(k))
    )];
  }

  rankKeywords(originalKeyword, keywords) {
    return keywords
      .map(keyword => ({
        keyword,
        score: this.calculateKeywordScore(originalKeyword, keyword)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.keyword);
  }

  calculateKeywordScore(original, keyword) {
    let score = 0;
    if (keyword.length >= 2 && keyword.length <= 20) score += 10;
    if (/[가-힣]/.test(keyword)) score += 15;
    if (keyword.includes(original) || original.includes(keyword)) score += 20;
    
    const youtubeTerms = ['리뷰', '하이라이트', '브이로그', '챌린지', '꿀팁'];
    if (youtubeTerms.some(term => keyword.includes(term))) score += 10;
    
    return score;
  }

  categorizeKeywords(keywords) {
    const categories = {
      gaming: [],
      food: [],
      lifestyle: [],
      music: [],
      sports: [],
      education: [],
      entertainment: []
    };

    keywords.forEach(keyword => {
      if (/게임|롤|배그|피파/.test(keyword)) categories.gaming.push(keyword);
      else if (/먹방|요리|맛집|음식/.test(keyword)) categories.food.push(keyword);
      else if (/브이로그|일상|루틴/.test(keyword)) categories.lifestyle.push(keyword);
      else if (/음악|댄스|노래/.test(keyword)) categories.music.push(keyword);
      else if (/축구|야구|농구|운동/.test(keyword)) categories.sports.push(keyword);
      else if (/공부|교육|강의/.test(keyword)) categories.education.push(keyword);
      else categories.entertainment.push(keyword);
    });

    return categories;
  }

  async extractChannelSuggestions(keywords) {
    // 하드코딩 제거하고 동적 채널 추천으로 변경
    return await this.generateDynamicChannelSuggestions(keywords);
  }

  async generateDynamicChannelSuggestions(keywords) {
    try {
      if (!this.youtubeApiKey) {
        return this.getFallbackChannels(keywords);
      }

      // 키워드 중 상위 3개로 채널 검색
      const topKeywords = keywords.slice(0, 3);
      const channelSuggestions = [];

      for (const keyword of topKeywords) {
        try {
          // YouTube에서 실제 채널 검색
          const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
              part: 'snippet',
              q: keyword,
              type: 'channel',
              maxResults: 5,
              regionCode: 'KR',
              relevanceLanguage: 'ko',
              key: this.youtubeApiKey
            },
            timeout: 8000
          });

          const channels = response.data.items
            .map(item => item.snippet.title)
            .filter(title => title && title.length < 20) // 너무 긴 채널명 제외
            .slice(0, 3);

          channelSuggestions.push(...channels);

        } catch (error) {
          console.log(`채널 검색 실패 (${keyword}):`, error.message);
        }
      }

      // 중복 제거 후 상위 6개 반환
      const uniqueChannels = [...new Set(channelSuggestions)].slice(0, 6);
      return uniqueChannels.length > 0 ? uniqueChannels : this.getFallbackChannels(keywords);

    } catch (error) {
      console.error('동적 채널 추천 실패:', error);
      return this.getFallbackChannels(keywords);
    }
  }

  getFallbackChannels(keywords) {
    // 매우 제한적인 폴백만 제공
    const randomChannels = [
      '대한민국',
      '리뷰어',
      '크리에이터',
      '유튜버'
    ];
    
    return randomChannels.slice(0, 2); // 최소한의 폴백만
  }

  extractHashtagSuggestions(keywords) {
    return keywords
      .slice(0, 10)
      .map(keyword => `#${keyword.replace(/\s+/g, '')}`)
      .filter(tag => tag.length <= 15);
  }

  suggestTimeFilters(keyword) {
    if (/뉴스|시사|정치/.test(keyword)) {
      return ['today', 'week'];
    } else if (/트렌드|인기|최신/.test(keyword)) {
      return ['week', 'month'];
    } else {
      return ['month', 'year'];
    }
  }

  determineExpansionStrategy(keyword) {
    if (keyword.length <= 3) {
      return 'broad_expansion';
    } else if (/브랜드|제품명/.test(keyword)) {
      return 'product_focused';
    } else {
      return 'semantic_expansion';
    }
  }

  getFallbackExpansion(keyword) {
    return {
      original: keyword,
      expanded: [`${keyword} 리뷰`, `${keyword} 추천`, `${keyword} 꿀팁`],
      categories: { entertainment: [`${keyword} 리뷰`] },
      suggestions: {
        channels: [],
        hashtags: [`#${keyword}`],
        timeFilters: ['month']
      },
      expansionStrategy: 'fallback',
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }

  determineSearchStrategy(keyword, expansion) {
    const strategies = [];
    
    if (expansion.suggestions.channels.length > 0) {
      strategies.push('channel_focused');
    }
    
    const activeCategories = Object.keys(expansion.categories).filter(k => 
      expansion.categories[k].length > 0
    );
    if (activeCategories.length > 0) {
      strategies.push('category_focused');
    }
    
    if (expansion.expanded.length > 5) {
      strategies.push('keyword_expansion');
    }
    
    if (this.isTimeRelevant(keyword)) {
      strategies.push('time_sensitive');
    }
    
    return strategies.length > 0 ? strategies : ['basic_search'];
  }

  isTimeRelevant(keyword) {
    const timeRelevantKeywords = [
      '뉴스', '실시간', '최신', '오늘', '어제', '이번주',
      '트렌드', '핫이슈', '속보', '업데이트'
    ];
    
    return timeRelevantKeywords.some(timeKeyword => 
      keyword.includes(timeKeyword)
    );
  }

  buildChannelQueries(keyword, expansion, maxResults) {
    const queries = [];
    const suggestedChannels = expansion.suggestions.channels;
    
    suggestedChannels.slice(0, 3).forEach(channel => {
      queries.push({
        type: 'channel_search',
        query: keyword,
        channel: channel,
        params: {
          type: 'video',
          videoDuration: 'short',
          maxResults: maxResults,
          order: 'relevance',
          regionCode: 'KR'
        },
        weight: 0.9,
        estimatedUnits: 107,
        description: `${channel} 채널에서 "${keyword}" 검색`
      });
    });

    return queries;
  }

  buildCategoryQueries(keyword, expansion, maxResults) {
    const queries = [];
    const categoryMapping = {
      gaming: '20',
      music: '10',
      sports: '17',
      entertainment: '24',
      education: '27',
      food: '26',
      lifestyle: '22'
    };
    
    Object.entries(expansion.categories).forEach(([category, keywords]) => {
      if (keywords.length > 0 && categoryMapping[category]) {
        queries.push({
          type: 'category_search',
          query: keyword,
          params: {
            type: 'video',
            videoDuration: 'short',
            videoCategoryId: categoryMapping[category],
            maxResults: maxResults,
            order: 'relevance',
            regionCode: 'KR'
          },
          weight: 0.8,
          estimatedUnits: 107,
          description: `${category} 카테고리에서 "${keyword}" 검색`
        });
      }
    });

    return queries;
  }

  buildExpandedKeywordQueries(keyword, expansion, maxResults) {
    const queries = [];
    const expandedKeywords = expansion.expanded;
    
    // 키워드를 5개씩 그룹화하여 OR 연산자로 연결
    for (let i = 0; i < expandedKeywords.length; i += 5) {
      const group = expandedKeywords.slice(i, i + 5);
      const orQuery = group.join(' | ');
      
      queries.push({
        type: 'expanded_search',
        query: orQuery,
        originalKeyword: keyword,
        expandedKeywords: group,
        params: {
          type: 'video',
          videoDuration: 'short',
          maxResults: maxResults,
          order: 'relevance',
          regionCode: 'KR'
        },
        weight: 0.8 - (Math.floor(i / 5) * 0.1),
        estimatedUnits: 107,
        description: `확장 키워드 그룹: ${group.join(', ')}`
      });
    }

    return queries;
  }

  buildTimeBasedQueries(keyword, expansion, maxResults) {
    const queries = [];
    const timeFilters = expansion.suggestions.timeFilters;
    
    timeFilters.forEach(timeFilter => {
      queries.push({
        type: 'time_based_search',
        query: keyword,
        timeFilter,
        params: {
          type: 'video',
          videoDuration: 'short',
          publishedAfter: this.getPublishedAfterDate(timeFilter),
          maxResults: maxResults,
          order: 'date',
          regionCode: 'KR'
        },
        weight: 0.7,
        estimatedUnits: 107,
        description: `${timeFilter} 기간의 "${keyword}" 검색`
      });
    });

    return queries;
  }

  buildBasicQuery(keyword, maxResults) {
    return {
      type: 'basic_search',
      query: keyword,
      params: {
        type: 'video',
        videoDuration: 'short',
        maxResults: maxResults,
        order: 'relevance',
        regionCode: 'KR'
      },
      weight: 0.6,
      estimatedUnits: 107,
      description: `기본 "${keyword}" 검색`
    };
  }

  optimizeQueries(queries) {
    // 중복 제거
    const seen = new Set();
    const uniqueQueries = queries.filter(query => {
      const key = `${query.type}_${query.query}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 가중치별 정렬 후 상위 8개 선택
    return uniqueQueries
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8);
  }

  getPublishedAfterDate(timeFilter) {
    const now = new Date();
    
    switch (timeFilter) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default:
        return undefined;
    }
  }

  parseDuration(duration) {
    // PT1M30S 형태를 초로 변환
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  calculateCurationScore(video, criteria) {
    let score = 0;
    const reasons = [];

    // 조회수 점수
    const viewCount = parseInt(video.statistics.viewCount || 0);
    if (viewCount >= (criteria.minViewCount || 1000)) {
      score += 20;
      reasons.push(`충분한 조회수 (${viewCount.toLocaleString()})`);
    }

    // 길이 점수
    const duration = this.parseDuration(video.contentDetails.duration);
    if (duration <= (criteria.maxDuration || 60)) {
      score += 25;
      reasons.push(`적절한 길이 (${duration}초)`);
    }

    // 참여도 점수 (좋아요/조회수 비율)
    const likeCount = parseInt(video.statistics.likeCount || 0);
    const engagementRate = viewCount > 0 ? (likeCount / viewCount) * 100 : 0;
    if (engagementRate > 1) {
      score += 15;
      reasons.push(`높은 참여도 (${engagementRate.toFixed(2)}%)`);
    }

    // 재생 가능 여부
    if (video.status.embeddable && video.status.privacyStatus === 'public') {
      score += 30;
      reasons.push('재생 가능한 영상');
    }

    // 최신성 점수
    const publishedDate = new Date(video.snippet.publishedAt);
    const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePublished <= 30) {
      score += 10;
      reasons.push('최근 업로드');
    }

    return { score: Math.min(100, score), reasons };
  }

  categorizeVideo(video) {
    // 안전한 속성 접근 - video 객체나 snippet, title이 없을 수 있음
    if (!video || !video.snippet || !video.snippet.title) {
      return 'entertainment'; // 기본값
    }
    
    const title = video.snippet.title.toLowerCase();
    
    if (/게임|롤|배그|피파/.test(title)) return 'gaming';
    if (/먹방|요리|맛집|음식/.test(title)) return 'food';
    if (/브이로그|일상|루틴/.test(title)) return 'lifestyle';
    if (/음악|댄스|노래/.test(title)) return 'music';
    if (/축구|야구|농구|운동/.test(title)) return 'sports';
    if (/공부|교육|강의/.test(title)) return 'education';
    
    return 'entertainment';
  }

  // ==================== 새로 추가된 지원 메서드들 ====================

  /**
   * 자연어 분석 결과를 바탕으로 다음 단계 제안
   */
  generateNextSteps(extractedData) {
    const nextSteps = [];
    const { primaryKeywords, context } = extractedData;

    // 키워드 기반 다음 단계
    if (primaryKeywords.length > 0) {
      nextSteps.push(`"${primaryKeywords[0]}" 키워드를 중심으로 확장 검색 진행`);
    }

    // 컨텍스트 기반 다음 단계
    if (context.timeContext === '최신') {
      nextSteps.push('최신 업로드된 영상 위주로 검색');
    }

    if (context.intent === '힐링') {
      nextSteps.push('ASMR, 명상, 자연 관련 채널 우선 탐색');
    } else if (context.intent === '엔터테인먼트') {
      nextSteps.push('인기 크리에이터 채널 우선 탐색');
    }

    // 검색 전략 제안
    if (primaryKeywords.length === 1) {
      nextSteps.push('키워드 확장을 통한 다양한 검색어 생성');
    } else {
      nextSteps.push('다중 키워드 조합으로 정밀 검색');
    }

    return nextSteps.slice(0, 4); // 최대 4개
  }

  /**
   * 컨텍스트에 따른 검색 전략 제안
   */
  suggestSearchStrategies(context) {
    const strategies = [];

    // 시간 컨텍스트 기반
    if (context.timeContext === '최신') {
      strategies.push({
        name: 'time_priority',
        description: '최신 업로드 순으로 검색',
        params: { order: 'date', publishedAfter: 'week' }
      });
    }

    // 카테고리 기반
    if (context.category === '음악') {
      strategies.push({
        name: 'music_channels',
        description: '음악 전문 채널 우선 탐색',
        params: { videoCategoryId: '10' }
      });
    } else if (context.category === '게임') {
      strategies.push({
        name: 'gaming_channels', 
        description: '게임 전문 채널 우선 탐색',
        params: { videoCategoryId: '20' }
      });
    }

    // 감정/의도 기반
    if (context.intent === '힐링') {
      strategies.push({
        name: 'healing_content',
        description: '힐링 콘텐츠 중심 검색',
        params: { keywords: ['ASMR', '명상', '자연소리', '힐링음악'] }
      });
    }

    // 기본 전략
    strategies.push({
      name: 'balanced_search',
      description: '조회수와 관련성 균형 검색',
      params: { order: 'relevance' }
    });

    return strategies.slice(0, 3); // 최대 3개
  }

  /**
   * 쿼리 중복 제거 (intelligentSearchWorkflow에서 사용)
   */
  deduplicateQueries(queries) {
    const seen = new Set();
    return queries.filter(query => {
      const key = query.query.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🚀 YouTube Curator MCP 서버 시작됨');
  }
}

// 서버 시작
const server = new YouTubeCuratorMCP();
server.start().catch(error => {
  console.error('서버 시작 실패:', error);
  process.exit(1);
}); 