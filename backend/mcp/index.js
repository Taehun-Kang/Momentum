/**
 * 🎯 실제 YouTube Curator MCP 서버 - 2025년 Streamable HTTP 방식
 * mcp-servers/youtube-curator-mcp/index.js를 기반으로 CommonJS로 변환
 * Railway 배포 환경에서 실제 Claude API와 YouTube API를 사용하는 진짜 MCP 서버
 */

const axios = require('axios');
require('dotenv').config();

/**
 * 실제 YouTube Curator MCP 서버 (CommonJS 버전)
 * 원본: mcp-servers/youtube-curator-mcp/index.js (1,724줄)
 */
class YouTubeCuratorMCPServer {
  constructor() {
    // API 키 설정
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    this.serpApiKey = process.env.SERPAPI_KEY;
    
    // 캐시 설정
    this.keywordCache = new Map();
    this.videoCache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24시간

    console.log('🎬 실제 YouTube Curator MCP 서버 초기화 완료 (Streamable HTTP)');
    console.log('✅ 실제 Claude API 연동 준비');
    console.log('✅ 실제 YouTube API 연동 준비');
    console.log('✅ 6개 AI 도구 제공');
  }

  /**
   * 표준 MCP 도구 목록 (실제 MCP 서버와 동일)
   */
  getTools() {
    return [
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
                maxPrimaryKeywords: { type: "number", default: 3 },
                maxSecondaryKeywords: { type: "number", default: 5 },
                includeContext: { type: "boolean", default: true }
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
            userInput: { type: "string", description: "사용자의 자연어 입력" },
            options: {
              type: "object",
              properties: {
                maxQueries: { type: "number", default: 3 },
                maxResults: { type: "number", default: 15 },
                strategy: { 
                  type: "string", 
                  enum: ["auto", "channel_focused", "category_focused", "keyword_expansion", "time_sensitive"],
                  default: "auto" 
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
            keyword: { type: "string", description: "확장할 원본 키워드" },
            options: {
              type: "object",
              properties: {
                includeChannels: { type: "boolean", default: true },
                includeTimeFilters: { type: "boolean", default: true },
                maxKeywords: { type: "number", default: 15 }
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
            keyword: { type: "string", description: "검색할 키워드" },
            strategy: {
              type: "string",
              enum: ["auto", "channel_focused", "category_focused", "keyword_expansion", "time_sensitive"],
              default: "auto"
            },
            maxResults: { type: "number", default: 15 }
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
            query: { type: "string", description: "검색 쿼리" },
            maxResults: { type: "number", default: 20 },
            filters: {
              type: "object",
              properties: {
                uploadDate: { type: "string", enum: ["today", "week", "month", "year", "any"], default: "any" },
                order: { type: "string", enum: ["relevance", "date", "viewCount", "rating"], default: "relevance" }
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
              items: { type: "string" },
              description: "분석할 비디오 ID 목록"
            },
            criteria: {
              type: "object",
              properties: {
                minViewCount: { type: "number", default: 1000 },
                maxDuration: { type: "number", default: 60 }
              }
            }
          },
          required: ["videoIds"]
        }
      }
    ];
  }

  /**
   * MCP 도구 실행 (실제 구현)
   */
  async executeTool(toolName, args) {
    console.log(`🔧 실제 MCP 도구 실행: ${toolName}`, JSON.stringify(args, null, 2));

    try {
      switch (toolName) {
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
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`도구 ${toolName} 실행 실패:`, error);
      throw error;
    }
  }

  /**
   * 자연어 입력 분석 및 키워드 추출 도구 (실제 Claude API 사용)
   * 원본: mcp-servers/youtube-curator-mcp/index.js의 processNaturalLanguage
   */
  async processNaturalLanguage(args) {
    const { userInput, options = {} } = args;

    try {
      if (!this.anthropicApiKey) {
        throw new Error('Claude API 키가 설정되지 않았습니다. ANTHROPIC_API_KEY 환경 변수를 설정해주세요.');
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

      console.log('🤖 Claude API 호출 중...');
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
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        timeout: 15000
      });

      const extractedData = JSON.parse(response.data.content[0].text);

      const result = {
        originalInput: userInput,
        analysis: extractedData,
        extractionMethod: "claude_api",
        processingTime: new Date().toISOString(),
        success: true
      };

      if (options.includeContext) {
        result.suggestions = {
          nextSteps: this.generateNextSteps(extractedData),
          searchStrategies: this.suggestSearchStrategies(extractedData.context)
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };

    } catch (error) {
      console.error('Claude API 호출 실패:', error.message);
      
      // 폴백: 간단한 키워드 추출
      const fallbackKeywords = userInput
        .replace(/[^\w\s가-힣]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 1);

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
        processingTime: new Date().toISOString(),
        success: false
      };

      return {
        content: [{ type: "text", text: JSON.stringify(fallbackResult, null, 2) }]
      };
    }
  }

  /**
   * 지능형 검색 워크플로우 (실제 구현)
   * 원본: mcp-servers/youtube-curator-mcp/index.js의 intelligentSearchWorkflow
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

      // 2단계: 키워드 확장
      console.log('🔎 2단계: 키워드 확장 중...');
      const expandedResults = {};
      
      for (const keyword of extractedData.analysis.primaryKeywords || []) {
        try {
          const expansionResult = await this.expandKeyword({ 
            keyword,
            options: { maxKeywords: 15, includeChannels: true }
          });
          expandedResults[keyword] = JSON.parse(expansionResult.content[0].text);
        } catch (error) {
          console.error(`키워드 "${keyword}" 확장 실패:`, error.message);
          expandedResults[keyword] = { expanded: [keyword], error: error.message };
        }
      }
      workflowResults.step2_keywordExpansion = expandedResults;

      // 3단계: 실제 YouTube 검색
      console.log('🎬 3단계: YouTube 검색 실행 중...');
      const searchResults = [];
      const maxQueries = Math.min(options.maxQueries || 3, extractedData.analysis.primaryKeywords?.length || 1);
      
      for (let i = 0; i < maxQueries; i++) {
        const keyword = extractedData.analysis.primaryKeywords[i];
        if (!keyword) break;

        try {
          const searchResult = await this.searchPlayableShorts({
            query: keyword,
            maxResults: options.maxResults || 15
          });
          
          const searchData = JSON.parse(searchResult.content[0].text);
          searchResults.push({
            keyword,
            results: searchData.playableVideos || [],
            totalFound: searchData.totalFound || 0,
            apiUsage: searchData.apiUsage
          });
        } catch (error) {
          console.error(`검색 실패 "${keyword}":`, error.message);
          searchResults.push({
            keyword,
            results: [],
            error: error.message
          });
        }
      }

      workflowResults.step3_youtubeSearch = {
        totalKeywords: extractedData.analysis.primaryKeywords?.length || 0,
        searchResults,
        totalVideos: searchResults.reduce((sum, r) => sum + (r.results?.length || 0), 0)
      };

      const finalResult = {
        originalInput: userInput,
        workflow: workflowResults,
        summary: {
          keywordsExtracted: extractedData.analysis.primaryKeywords?.length || 0,
          videosFound: searchResults.reduce((sum, r) => sum + (r.results?.length || 0), 0),
          totalApiUnits: searchResults.reduce((sum, r) => sum + (r.apiUsage?.totalUnits || 0), 0),
          processingTime: new Date().toISOString()
        },
        success: true
      };

      return {
        content: [{ type: "text", text: JSON.stringify(finalResult, null, 2) }]
      };

    } catch (error) {
      console.error('워크플로우 실행 실패:', error);
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            originalInput: userInput,
            error: error.message,
            success: false
          }, null, 2) 
        }]
      };
    }
  }

  /**
   * 키워드 확장 도구 (실제 구현)
   */
  async expandKeyword(args) {
    const { keyword, options = {} } = args;

    try {
      // 기본 확장 키워드 생성
      const expandedKeywords = this.generateExpandedKeywords(keyword);
      
      // 채널 추천
      const channelSuggestions = options.includeChannels 
        ? this.getChannelSuggestions(keyword)
        : [];

      const result = {
        originalKeyword: keyword,
        expanded: expandedKeywords.slice(0, options.maxKeywords || 15),
        channels: channelSuggestions,
        categories: this.categorizeKeywords([keyword, ...expandedKeywords]),
        processingTime: new Date().toISOString()
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };

    } catch (error) {
      console.error('키워드 확장 실패:', error);
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            originalKeyword: keyword,
            expanded: [keyword],
            error: error.message
          }, null, 2) 
        }]
      };
    }
  }

  /**
   * 최적화된 쿼리 생성 도구 (실제 구현)
   */
  async buildOptimizedQueries(args) {
    const { keyword, strategy = 'auto', maxResults = 15 } = args;

    try {
      const queries = [];

      // 전략에 따른 쿼리 생성
      switch (strategy) {
        case 'channel_focused':
          queries.push(...this.buildChannelQueries(keyword, maxResults));
          break;
        case 'category_focused':
          queries.push(...this.buildCategoryQueries(keyword, maxResults));
          break;
        case 'keyword_expansion':
          queries.push(...this.buildExpandedKeywordQueries(keyword, maxResults));
          break;
        case 'time_sensitive':
          queries.push(...this.buildTimeBasedQueries(keyword, maxResults));
          break;
        default: // 'auto'
          queries.push(this.buildBasicQuery(keyword, maxResults));
          break;
      }

      const result = {
        keyword,
        strategy,
        queries,
        estimatedApiUnits: queries.reduce((sum, q) => sum + (q.estimatedUnits || 107), 0),
        processingTime: new Date().toISOString()
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };

    } catch (error) {
      console.error('쿼리 생성 실패:', error);
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            keyword,
            queries: [{ query: keyword, type: 'basic', estimatedUnits: 107 }],
            error: error.message
          }, null, 2) 
        }]
      };
    }
  }

  /**
   * 재생 가능한 YouTube Shorts 검색 (2단계 필터링)
   * 원본: mcp-servers/youtube-curator-mcp/index.js의 searchPlayableShorts
   */
  async searchPlayableShorts(args) {
    const { query, maxResults = 20, filters = {} } = args;

    try {
      if (!this.youtubeApiKey) {
        console.warn('YouTube API 키가 없어 Mock 데이터를 반환합니다');
        // Mock 데이터 반환
        const mockResult = {
          query,
          playableVideos: [
            {
              videoId: "dQw4w9WgXcQ",
              title: `"${query}" 관련 샘플 영상`,
              channelTitle: "Sample Channel",
              thumbnails: { default: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg" } },
              duration: "PT45S",
              viewCount: "1000000",
              publishedAt: new Date().toISOString(),
              url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            }
          ],
          totalFound: 1,
          processingSteps: ["mock_search"],
          apiUsage: { searchUnits: 0, videoUnits: 0, totalUnits: 0 },
          mock: true
        };

        return {
          content: [{ type: "text", text: JSON.stringify(mockResult, null, 2) }]
        };
      }

      console.log(`🔍 YouTube API 검색 시작: "${query}"`);

      // 1단계: search.list로 후보 검색 (100 units)
      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: this.youtubeApiKey,
          q: query,
          type: 'video',
          videoDuration: 'short', // 4분 미만
          maxResults: Math.min(maxResults * 2, 50), // 필터링을 위해 더 많이 가져오기
          regionCode: 'KR',
          relevanceLanguage: 'ko',
          order: filters.order || 'relevance',
          publishedAfter: this.getPublishedAfterDate(filters.uploadDate)
        }
      });

      const videoIds = searchResponse.data.items.map(item => item.id.videoId);
      
      if (videoIds.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              query,
              playableVideos: [],
              totalFound: 0,
              message: "검색 결과가 없습니다",
              apiUsage: { searchUnits: 100, videoUnits: 0, totalUnits: 100 }
            }, null, 2) 
          }]
        };
      }

      // 2단계: videos.list로 상세 정보 및 재생 가능 여부 확인
      const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          key: this.youtubeApiKey,
          id: videoIds.join(','),
          part: 'snippet,contentDetails,status,statistics',
          hl: 'ko'
        }
      });

      const videoUnits = 1 + (videosResponse.data.items.length * 3); // 1 + 각 part당 3 units

      // 3단계: 재생 가능한 영상만 필터링
      const playableVideos = videosResponse.data.items.filter(video => {
        // 필수 체크 항목
        if (!video.status.embeddable) return false; // 임베드 불가
        if (video.status.privacyStatus !== 'public') return false; // 비공개

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
      }).slice(0, maxResults);

      const result = {
        query,
        playableVideos: playableVideos.map(video => ({
          videoId: video.id,
          title: video.snippet.title,
          channelTitle: video.snippet.channelTitle,
          channelId: video.snippet.channelId,
          description: video.snippet.description?.substring(0, 200) + '...',
          thumbnails: video.snippet.thumbnails,
          duration: video.contentDetails.duration,
          viewCount: video.statistics.viewCount,
          likeCount: video.statistics.likeCount,
          publishedAt: video.snippet.publishedAt,
          url: `https://www.youtube.com/watch?v=${video.id}`
        })),
        totalFound: playableVideos.length,
        processingSteps: ["search_list", "videos_list", "playability_filter"],
        apiUsage: {
          searchUnits: 100,
          videoUnits,
          totalUnits: 100 + videoUnits
        }
      };

      console.log(`✅ ${playableVideos.length}개의 재생 가능한 Shorts 발견`);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };

    } catch (error) {
      console.error('YouTube 검색 실패:', error.message);
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            query,
            error: error.message,
            playableVideos: [],
            totalFound: 0,
            apiUsage: { searchUnits: 0, videoUnits: 0, totalUnits: 0 }
          }, null, 2) 
        }]
      };
    }
  }

  /**
   * 비디오 메타데이터 분석 도구 (실제 구현)
   */
  async analyzeVideoMetadata(args) {
    const { videoIds, criteria = {} } = args;

    try {
      if (!this.youtubeApiKey) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              videoIds,
              analysis: [],
              error: "YouTube API 키가 설정되지 않았습니다"
            }, null, 2) 
          }]
        };
      }

      // YouTube API로 비디오 정보 조회
      const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          key: this.youtubeApiKey,
          id: videoIds.join(','),
          part: 'snippet,contentDetails,statistics,status'
        }
      });

      const analysis = response.data.items.map(video => {
        const score = this.calculateCurationScore(video, criteria);
        
        return {
          videoId: video.id,
          title: video.snippet.title,
          channelTitle: video.snippet.channelTitle,
          duration: video.contentDetails.duration,
          viewCount: parseInt(video.statistics.viewCount || 0),
          likeCount: parseInt(video.statistics.likeCount || 0),
          curationScore: score,
          category: this.categorizeVideo(video),
          isPlayable: video.status.embeddable && video.status.privacyStatus === 'public'
        };
      });

      const result = {
        videoIds,
        analysis,
        summary: {
          totalVideos: analysis.length,
          averageScore: analysis.reduce((sum, a) => sum + a.curationScore, 0) / analysis.length,
          playableVideos: analysis.filter(a => a.isPlayable).length
        },
        processingTime: new Date().toISOString()
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };

    } catch (error) {
      console.error('비디오 분석 실패:', error);
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            videoIds,
            error: error.message,
            analysis: []
          }, null, 2) 
        }]
      };
    }
  }

  // ==================== 유틸리티 함수들 ====================

  generateExpandedKeywords(keyword) {
    const variations = [
      keyword,
      `${keyword} shorts`,
      `${keyword} 영상`,
      `${keyword} 모음`,
      `${keyword} 하이라이트`,
      `재미있는 ${keyword}`,
      `최신 ${keyword}`,
      `인기 ${keyword}`
    ];
    
    return [...new Set(variations)];
  }

  getChannelSuggestions(keyword) {
    // 키워드별 채널 추천 (간단한 예시)
    const channelMap = {
      '게임': ['피치케이크', '도티', '잠뜰'],
      '먹방': ['쯔양', '밴쯔', '보겸'],
      '음악': ['1theK', 'Stone Music Entertainment', 'SMTOWN'],
      '댄스': ['1MILLION Dance Studio', 'FreeStyle Town', 'URBAN DANCE CAMP']
    };
    
    for (const [category, channels] of Object.entries(channelMap)) {
      if (keyword.includes(category)) {
        return channels;
      }
    }
    
    return [];
  }

  categorizeKeywords(keywords) {
    const categories = {
      entertainment: [],
      music: [],
      gaming: [],
      lifestyle: [],
      education: []
    };
    
    keywords.forEach(keyword => {
      if (keyword.match(/(음악|노래|댄스|춤)/)) categories.music.push(keyword);
      else if (keyword.match(/(게임|롤|LOL|배그)/)) categories.gaming.push(keyword);
      else if (keyword.match(/(먹방|요리|브이로그|일상)/)) categories.lifestyle.push(keyword);
      else if (keyword.match(/(강의|공부|학습)/)) categories.education.push(keyword);
      else categories.entertainment.push(keyword);
    });
    
    return categories;
  }

  buildChannelQueries(keyword, maxResults) {
    return [{
      query: `${keyword} 채널`,
      type: 'channel_search',
      priority: 'high',
      estimatedUnits: 107,
      maxResults
    }];
  }

  buildCategoryQueries(keyword, maxResults) {
    return [{
      query: `${keyword} 카테고리`,
      type: 'category_search',
      priority: 'medium',
      estimatedUnits: 107,
      maxResults
    }];
  }

  buildExpandedKeywordQueries(keyword, maxResults) {
    const expanded = this.generateExpandedKeywords(keyword);
    return expanded.slice(0, 3).map(kw => ({
      query: kw,
      type: 'expanded_search',
      priority: 'medium',
      estimatedUnits: 107,
      maxResults
    }));
  }

  buildTimeBasedQueries(keyword, maxResults) {
    return [{
      query: `${keyword} 최신`,
      type: 'time_based',
      priority: 'high',
      estimatedUnits: 107,
      maxResults,
      filters: { uploadDate: 'week' }
    }];
  }

  buildBasicQuery(keyword, maxResults) {
    return {
      query: keyword,
      type: 'basic_search',
      priority: 'medium',
      estimatedUnits: 107,
      maxResults
    };
  }

  getPublishedAfterDate(timeFilter) {
    if (!timeFilter || timeFilter === 'any') return undefined;
    
    const now = new Date();
    switch (timeFilter) {
      case 'today':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return undefined;
    }
  }

  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  calculateCurationScore(video, criteria) {
    let score = 0;
    
    // 조회수 점수
    const viewCount = parseInt(video.statistics.viewCount || 0);
    if (viewCount >= (criteria.minViewCount || 1000)) score += 3;
    
    // 좋아요 비율
    const likeCount = parseInt(video.statistics.likeCount || 0);
    if (viewCount > 0 && likeCount / viewCount > 0.01) score += 2;
    
    // 길이 점수
    const duration = this.parseDuration(video.contentDetails.duration);
    if (duration <= (criteria.maxDuration || 60)) score += 2;
    
    // 제목 품질
    if (video.snippet.title.length > 10 && video.snippet.title.length < 100) score += 1;
    
    return Math.min(score, 10);
  }

  categorizeVideo(video) {
    const title = video.snippet.title.toLowerCase();
    
    if (title.match(/(음악|노래|댄스)/)) return 'music';
    if (title.match(/(게임|롤|배그)/)) return 'gaming';
    if (title.match(/(먹방|요리|브이로그)/)) return 'lifestyle';
    if (title.match(/(강의|공부)/)) return 'education';
    
    return 'entertainment';
  }

  generateNextSteps(extractedData) {
    return [
      "키워드 확장으로 더 많은 관련 영상 찾기",
      "채널별 검색으로 특정 크리에이터 영상 탐색",
      "시간 필터 적용으로 최신 영상 우선 검색"
    ];
  }

  suggestSearchStrategies(context) {
    const strategies = [];
    
    if (context.timeContext === '최신') {
      strategies.push('time_sensitive');
    }
    if (context.category && context.category !== 'entertainment') {
      strategies.push('category_focused');
    }
    strategies.push('keyword_expansion');
    
    return strategies;
  }
}

/**
 * Streamable HTTP MCP 서버 래퍼 (2025년 스펙)
 */
class StreamableHTTPMCPServer {
  constructor() {
    this.mcpServer = new YouTubeCuratorMCPServer();
    this.sessions = new Map();
    console.log('🌐 Streamable HTTP MCP 서버 (2025년 스펙) 초기화 완료');
  }

  // 표준 MCP 요청 처리 (JSON-RPC 2.0)
  async handleRequest(request, sessionId) {
    try {
      const { method, params, id } = request;

      switch (method) {
        case 'initialize':
          return this.handleInitialize(request, sessionId);
        
        case 'tools/list':
          return this.handleListTools(request);
        
        case 'tools/call':
          return this.handleCallTool(request);
        
        case 'ping':
          return {
            jsonrpc: "2.0",
            id,
            result: {}
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
        id: request.id || null,
        error: {
          code: -32603,
          message: "Internal server error",
          data: error.message
        }
      };
    }
  }

  async handleInitialize(request, sessionId) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2025-03-26",
        capabilities: {
          tools: {},
          logging: {}
        },
        serverInfo: {
          name: "youtube-shorts-curator-real-mcp",
          version: "1.0.0"
        },
        instructions: "실제 YouTube Shorts AI 큐레이션 MCP 서버입니다. 6개의 AI 도구로 자연어 검색부터 영상 분석까지 제공합니다."
      }
    };
  }

  async handleListTools(request) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        tools: this.mcpServer.getTools()
      }
    };
  }

  async handleCallTool(request) {
    const { name, arguments: args } = request.params;
    
    try {
      const result = await this.mcpServer.executeTool(name, args);
      
      return {
        jsonrpc: "2.0",
        id: request.id,
        result
      };
    } catch (error) {
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

  getStatus() {
    return {
      connected: true,
      available: true,
      protocolVersion: "2025-03-26",
      serverType: "youtube-curator-real-mcp",
      tools: this.mcpServer.getTools().map(t => t.name),
      capabilities: ["tools/list", "tools/call", "initialize", "ping"]
    };
  }
}

// MCP 서버 인스턴스 생성 및 Export
const mcpServer = new StreamableHTTPMCPServer();

module.exports = { mcpServer };

console.log('✅ 실제 YouTube Curator MCP 서버 (Streamable HTTP) 준비 완료');
console.log('✅ 2025년 최신 MCP 스펙 준수');
console.log('✅ 6개 AI 도구 제공');
console.log('✅ Railway 배포 최적화'); 