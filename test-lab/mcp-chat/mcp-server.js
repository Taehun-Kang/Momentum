import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

/**
 * 🌊 Momentum YouTube Curator MCP 서버
 * Wave Team의 AI 큐레이션 시스템을 위한 MCP 구현
 * 
 * 기능:
 * - 자연어 → 키워드 추출
 * - YouTube API 지능형 호출
 * - 사용자 맞춤형 추천
 * - 실시간 트렌드 분석
 */
class YouTubeCuratorMCP {
  constructor() {
    this.server = new Server(
      {
        name: 'momentum-youtube-curator',
        version: '1.0.0',
        description: 'AI-powered YouTube Shorts curation system by Wave Team'
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    // Claude API 클라이언트 초기화 (API 키가 있을 때만)
    if (process.env.CLAUDE_API_KEY) {
      this.claude = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY
      });
    }

    // 백엔드 API 베이스 URL
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';

    this.setupTools();
    this.setupResources();
    this.setupPrompts();
  }

  /**
   * 🛠️ MCP 도구들 설정 (docs/basic/3.MCP 구현.md 기반)
   */
  setupTools() {
    // 도구 목록 핸들러
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'extract_keywords',
            description: '사용자의 자연어 입력에서 YouTube 검색용 키워드를 추출합니다',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: '사용자의 자연어 입력 (예: "퇴근하고 너무 지쳐", "뭔가 웃긴 거")'
                },
                context: {
                  type: 'object',
                  properties: {
                    timeOfDay: { type: 'string', description: '현재 시간대' },
                    previousKeywords: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: '이전 검색 키워드들' 
                    },
                    userMood: { type: 'string', description: '사용자 감정 상태' }
                  }
                }
              },
              required: ['message']
            }
          },

          {
            name: 'search_youtube_shorts',
            description: 'YouTube Shorts를 검색하고 컨텍스트에 맞게 필터링합니다',
            inputSchema: {
              type: 'object',
              properties: {
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '검색할 키워드 목록'
                },
                maxResults: {
                  type: 'number',
                  default: 10,
                  description: '최대 결과 수'
                },
                filters: {
                  type: 'object',
                  properties: {
                    minViews: { type: 'number', default: 100000 },
                    maxDuration: { type: 'number', default: 60 },
                    language: { type: 'string', default: 'ko' }
                  }
                }
              },
              required: ['keywords']
            }
          },

          {
            name: 'analyze_trends',
            description: '현재 트렌드를 분석하고 관련 키워드를 제공합니다',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['comedy', 'music', 'gaming', 'education', 'lifestyle', 'food', 'sports', 'tech'],
                  description: '분석할 카테고리'
                },
                timeRange: {
                  type: 'string',
                  enum: ['realtime', 'today', 'week'],
                  default: 'realtime'
                }
              }
            }
          },

          {
            name: 'generate_response',
            description: '자연스러운 대화형 응답을 생성합니다',
            inputSchema: {
              type: 'object',
              properties: {
                keywords: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: '추출된 키워드들'
                },
                videoCount: { 
                  type: 'number',
                  description: '찾은 영상 수'
                },
                context: { 
                  type: 'object',
                  description: '대화 컨텍스트'
                }
              },
              required: ['keywords']
            }
          }
        ]
      };
    });

    // 도구 실행 핸들러
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'extract_keywords':
            return await this.extractKeywords(args);
            
          case 'search_youtube_shorts':
            return await this.searchYouTubeShorts(args);
            
          case 'analyze_trends':
            return await this.analyzeTrends(args);
            
          case 'generate_response':
            return await this.generateResponse(args);
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: error.message,
              tool: name,
              timestamp: new Date().toISOString()
            })
          }],
          isError: true
        };
      }
    });
  }

  /**
   * 🔍 자연어에서 키워드 추출 (docs 기반 구현)
   */
  async extractKeywords({ message, context = {} }) {
    try {
      // 1. 빠른 패턴 매칭 시도
      const quickKeywords = this.quickExtraction(message);
      if (quickKeywords.length > 0) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              keywords: quickKeywords,
              confidence: 0.8,
              method: 'pattern_matching',
              context: this.getTimeContext()
            })
          }]
        };
      }

      // 2. Claude를 사용한 고급 추출 (API 키가 있을 때만)
      if (this.claude) {
        const prompt = `
사용자 입력: "${message}"

다음은 YouTube Shorts 검색을 위한 키워드 추출 작업입니다.

사용자의 감정, 상황, 의도를 분석하여 적절한 한국어 검색 키워드 3-5개를 추출해주세요.

규칙:
1. 한국어 키워드 우선
2. YouTube에서 실제 검색 가능한 키워드
3. Shorts에 적합한 키워드 (짧고 임팩트 있는)
4. 감정과 상황을 고려

JSON 형식으로 응답:
{
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "emotion": "감정분석결과",
  "intent": "사용자의도",
  "confidence": 0.95
}
`;

        const response = await this.claude.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        });

        const result = JSON.parse(response.content[0].text);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              keywords: result.keywords,
              emotion: result.emotion,
              intent: result.intent,
              confidence: result.confidence,
              method: 'claude_analysis',
              context: this.getTimeContext()
            })
          }]
        };
      }

      // 3. 폴백: 기본 키워드 제공
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            keywords: ['인기영상', '추천영상', '재미있는영상'],
            confidence: 0.3,
            method: 'fallback',
            note: 'Claude API 키가 설정되지 않음'
          })
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            keywords: ['인기영상', '추천영상', '재미있는영상'],
            confidence: 0.3,
            method: 'fallback',
            error: error.message
          })
        }]
      };
    }
  }

  /**
   * 🎬 YouTube Shorts 검색 (백엔드 API 활용)
   */
  async searchYouTubeShorts({ keywords, maxResults = 10, filters = {} }) {
    try {
      const searchPromises = keywords.map(async (keyword) => {
        const response = await fetch(
          `${this.backendUrl}/api/v1/videos/search?q=${encodeURIComponent(keyword)}&maxResults=${maxResults}`
        );
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
      });

      const results = await Promise.all(searchPromises);
      const allVideos = results.flatMap(result => result.data?.videos || []);

      // 중복 제거 및 필터링
      const uniqueVideos = this.deduplicateVideos(allVideos);
      const filteredVideos = this.applyFilters(uniqueVideos, filters);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            videos: filteredVideos.slice(0, maxResults),
            totalFound: filteredVideos.length,
            keywords: keywords,
            timestamp: new Date().toISOString()
          })
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            videos: [],
            keywords: keywords
          })
        }],
        isError: true
      };
    }
  }

  /**
   * 📈 트렌드 분석 (백엔드 API 활용)
   */
  async analyzeTrends({ category, timeRange = 'realtime' }) {
    try {
      const endpoint = category 
        ? `/api/v1/videos/categories/${category}`
        : '/api/v1/videos/trending';

      const response = await fetch(`${this.backendUrl}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`Trends API Error: ${response.status}`);
      }
      
      const data = await response.json();

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            trends: data.data,
            category: category || 'general',
            timeRange: timeRange,
            analysis: this.extractTrendKeywords(data.data),
            timestamp: new Date().toISOString()
          })
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            trends: [],
            category: category || 'general'
          })
        }],
        isError: true
      };
    }
  }

  /**
   * 💬 대화형 응답 생성
   */
  async generateResponse({ keywords, videoCount, context = {} }) {
    try {
      // Claude가 있으면 고급 응답 생성
      if (this.claude) {
        const prompt = `
사용자가 다음 키워드로 영상을 검색했습니다: ${keywords.join(', ')}
찾은 영상 수: ${videoCount}개

자연스럽고 친근한 톤으로 응답을 생성해주세요.

규칙:
1. 짧고 간결한 응답 (2-3문장)
2. 찾은 영상에 대한 설명
3. 다음 검색 제안 포함
4. 이모지 적절히 사용

JSON 형식:
{
  "message": "응답 메시지",
  "suggestions": ["다음 검색 제안1", "제안2", "제안3"]
}
`;

        const response = await this.claude.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }]
        });

        const result = JSON.parse(response.content[0].text);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: result.message,
              suggestions: result.suggestions,
              keywords: keywords,
              videoCount: videoCount,
              timestamp: new Date().toISOString()
            })
          }]
        };
      }

      // 폴백: 간단한 응답
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: `${keywords.join(', ')}로 ${videoCount}개의 영상을 찾았어요! 🎬`,
            suggestions: ['더 웃긴 영상', '힐링되는 영상', '최신 트렌드'],
            keywords: keywords,
            videoCount: videoCount,
            note: 'Claude API 키가 설정되지 않음'
          })
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: `${keywords.join(', ')}로 ${videoCount}개의 영상을 찾았어요! 🎬`,
            suggestions: ['더 웃긴 영상', '힐링되는 영상', '최신 트렌드'],
            error: error.message
          })
        }]
      };
    }
  }

  // === 유틸리티 메서드들 ===

  /**
   * 🔍 빠른 패턴 매칭으로 키워드 추출
   */
  quickExtraction(message) {
    const patterns = {
      mood: {
        '피곤': ['힐링영상', 'ASMR', '휴식'],
        '스트레스': ['웃긴영상', '귀여운동물', '힐링'],
        '지루': ['재미있는영상', '신기한영상', '놀라운'],
        '외로': ['따뜻한영상', '감동영상', '위로']
      },
      activity: {
        '퇴근': ['퇴근길영상', '하루마무리', '휴식'],
        '점심': ['점심시간', '식사영상', '짧은영상'],
        '새벽': ['새벽감성', '조용한영상', '잠깐']
      },
      content: {
        '웃긴': ['웃긴영상', '코미디', '유머'],
        '힐링': ['힐링영상', '자연영상', 'ASMR'],
        '동물': ['귀여운동물', '강아지', '고양이'],
        '음식': ['먹방', '요리영상', '맛집']
      }
    };

    const keywords = [];
    const lowerMessage = message.toLowerCase();

    for (const [category, patternMap] of Object.entries(patterns)) {
      for (const [pattern, relatedKeywords] of Object.entries(patternMap)) {
        if (lowerMessage.includes(pattern)) {
          keywords.push(...relatedKeywords);
        }
      }
    }

    return [...new Set(keywords)].slice(0, 5);
  }

  /**
   * ⏰ 시간 컨텍스트 분석
   */
  getTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    let timeOfDay;
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const isWeekend = day === 0 || day === 6;

    return {
      timeOfDay,
      hour,
      isWeekend,
      dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][day]
    };
  }

  /**
   * 🎯 영상 중복 제거
   */
  deduplicateVideos(videos) {
    const seen = new Set();
    return videos.filter(video => {
      if (seen.has(video.videoId)) {
        return false;
      }
      seen.add(video.videoId);
      return true;
    });
  }

  /**
   * 🔧 필터 적용
   */
  applyFilters(videos, filters) {
    return videos.filter(video => {
      if (filters.minViews && video.viewCount < filters.minViews) return false;
      if (filters.maxDuration && video.duration > filters.maxDuration) return false;
      return true;
    });
  }

  /**
   * 📊 트렌드에서 키워드 추출
   */
  extractTrendKeywords(trendData) {
    if (!trendData?.videos) return [];
    
    const keywords = trendData.videos
      .map(video => video.title)
      .join(' ')
      .split(' ')
      .filter(word => word.length > 1)
      .slice(0, 10);

    return [...new Set(keywords)];
  }

  /**
   * 📝 리소스 설정 (추후 확장)
   */
  setupResources() {
    this.server.setRequestHandler('resources/list', async () => {
      return {
        resources: []
      };
    });
  }

  /**
   * 💭 프롬프트 설정 (추후 확장)
   */
  setupPrompts() {
    this.server.setRequestHandler('prompts/list', async () => {
      return {
        prompts: []
      };
    });
  }

  /**
   * 🚀 MCP 서버 시작
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('🌊 Momentum YouTube Curator MCP Server started successfully!');
    console.log('📡 Ready to handle AI curation requests...');
  }
}

// 서버 실행
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const server = new YouTubeCuratorMCP();
  server.start().catch(console.error);
}

export default YouTubeCuratorMCP; 