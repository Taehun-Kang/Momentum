import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Anthropic from '@anthropic-ai/sdk';
import { z } from "zod";
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

/**
 * 🌊 Momentum YouTube Curator MCP Server (공식 문서 기반)
 * Wave Team의 AI 큐레이션 시스템을 위한 올바른 MCP 구현
 * 
 * 기능:
 * - 자연어 → 키워드 추출
 * - YouTube API 지능형 호출  
 * - 사용자 맞춤형 추천
 * - 실시간 트렌드 분석
 */

// MCP 서버 생성 (공식 문서 방식)
const server = new McpServer({
  name: "momentum-youtube-curator",
  version: "1.0.0"
});

// Claude API 클라이언트 (API 키가 있을 때만)
let claude = null;
if (process.env.CLAUDE_API_KEY) {
  claude = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
  });
}

// 백엔드 API 설정
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

// === 유틸리티 함수들 ===

/**
 * 🔍 빠른 패턴 매칭으로 키워드 추출
 */
function quickExtraction(message) {
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
function getTimeContext() {
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

// === 1. TOOLS 구현 (docs 기반) ===

/**
 * 🔍 자연어에서 키워드 추출 도구
 */
server.tool(
  "extract-keywords",
  {
    message: z.string().describe("사용자의 자연어 입력 (예: '퇴근하고 너무 지쳐', '뭔가 웃긴 거')"),
    context: z.object({
      timeOfDay: z.string().optional(),
      previousKeywords: z.array(z.string()).optional(),
      userMood: z.string().optional()
    }).optional()
  },
  async ({ message, context = {} }) => {
    try {
      // 1. 빠른 패턴 매칭 시도
      const quickKeywords = quickExtraction(message);
      if (quickKeywords.length > 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              keywords: quickKeywords,
              confidence: 0.8,
              method: 'pattern_matching',
              context: getTimeContext()
            }, null, 2)
          }]
        };
      }

      // 2. Claude를 사용한 고급 추출 (API 키가 있을 때만)
      if (claude) {
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

        const response = await claude.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        });

        const result = JSON.parse(response.content[0].text);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              keywords: result.keywords,
              emotion: result.emotion,
              intent: result.intent,
              confidence: result.confidence,
              method: 'claude_analysis',
              context: getTimeContext()
            }, null, 2)
          }]
        };
      }

      // 3. 폴백: 기본 키워드 제공
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            keywords: ['인기영상', '추천영상', '재미있는영상'],
            confidence: 0.3,
            method: 'fallback',
            note: 'Claude API 키가 설정되지 않음'
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            keywords: ['인기영상', '추천영상', '재미있는영상'],
            confidence: 0.3,
            method: 'fallback_error',
            error: error.message
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

/**
 * 🎬 YouTube Shorts 검색 도구
 */
server.tool(
  "search-youtube-shorts",
  {
    keywords: z.array(z.string()).describe("검색할 키워드 목록"),
    maxResults: z.number().default(10).describe("최대 결과 수"),
    filters: z.object({
      minViews: z.number().default(100000),
      maxDuration: z.number().default(60),
      language: z.string().default('ko')
    }).optional()
  },
  async ({ keywords, maxResults = 10, filters = {} }) => {
    try {
      const searchPromises = keywords.map(async (keyword) => {
        const response = await fetch(
          `${BACKEND_URL}/api/v1/videos/search?q=${encodeURIComponent(keyword)}&maxResults=${maxResults}`
        );
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
      });

      const results = await Promise.all(searchPromises);
      const allVideos = results.flatMap(result => result.data?.videos || []);

      // 중복 제거
      const seen = new Set();
      const uniqueVideos = allVideos.filter(video => {
        if (seen.has(video.videoId)) return false;
        seen.add(video.videoId);
        return true;
      });

      // 필터 적용
      const filteredVideos = uniqueVideos.filter(video => {
        if (filters.minViews && video.viewCount < filters.minViews) return false;
        if (filters.maxDuration && video.duration > filters.maxDuration) return false;
        return true;
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            videos: filteredVideos.slice(0, maxResults),
            totalFound: filteredVideos.length,
            keywords: keywords,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error.message,
            videos: [],
            keywords: keywords
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

/**
 * 📈 트렌드 분석 도구
 */
server.tool(
  "analyze-trends",
  {
    category: z.enum(['comedy', 'music', 'gaming', 'education', 'lifestyle', 'food', 'sports', 'tech']).optional(),
    timeRange: z.enum(['realtime', 'today', 'week']).default('realtime')
  },
  async ({ category, timeRange = 'realtime' }) => {
    try {
      const endpoint = category 
        ? `/api/v1/videos/categories/${category}`
        : '/api/v1/videos/trending';

      const response = await fetch(`${BACKEND_URL}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`Trends API Error: ${response.status}`);
      }
      
      const data = await response.json();

      // 트렌드에서 키워드 추출
      const extractTrendKeywords = (trendData) => {
        if (!trendData?.videos) return [];
        
        const keywords = trendData.videos
          .map(video => video.title)
          .join(' ')
          .split(' ')
          .filter(word => word.length > 1)
          .slice(0, 10);

        return [...new Set(keywords)];
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            trends: data.data,
            category: category || 'general',
            timeRange: timeRange,
            analysis: extractTrendKeywords(data.data),
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error.message,
            trends: [],
            category: category || 'general'
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

/**
 * 💬 대화형 응답 생성 도구
 */
server.tool(
  "generate-response",
  {
    keywords: z.array(z.string()).describe("추출된 키워드들"),
    videoCount: z.number().describe("찾은 영상 수"),
    context: z.object({}).optional()
  },
  async ({ keywords, videoCount, context = {} }) => {
    try {
      // Claude가 있으면 고급 응답 생성
      if (claude) {
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

        const response = await claude.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }]
        });

        const result = JSON.parse(response.content[0].text);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              message: result.message,
              suggestions: result.suggestions,
              keywords: keywords,
              videoCount: videoCount,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

      // 폴백: 간단한 응답
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: `${keywords.join(', ')}로 ${videoCount}개의 영상을 찾았어요! 🎬`,
            suggestions: ['더 웃긴 영상', '힐링되는 영상', '최신 트렌드'],
            keywords: keywords,
            videoCount: videoCount,
            note: 'Claude API 키가 설정되지 않음'
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: `${keywords.join(', ')}로 ${videoCount}개의 영상을 찾았어요! 🎬`,
            suggestions: ['더 웃긴 영상', '힐링되는 영상', '최신 트렌드'],
            error: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// === 2. RESOURCES 구현 (docs 기반) ===

/**
 * 📊 서버 상태 리소스
 */
server.resource(
  "server-status",
  "status://momentum",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        service: "Momentum YouTube Curator",
        status: "operational",
        backend: BACKEND_URL,
        claude: claude ? "configured" : "not_configured",
        timestamp: new Date().toISOString(),
        timeContext: getTimeContext()
      }, null, 2)
    }]
  })
);

/**
 * 🔗 백엔드 API 상태 리소스
 */
server.resource(
  "backend-status",
  "backend://api/status",
  async (uri) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/videos/status`);
      const data = await response.json();
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2)
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({
            error: error.message,
            backend: BACKEND_URL,
            status: "connection_failed"
          }, null, 2)
        }]
      };
    }
  }
);

// === 3. PROMPTS 구현 (docs 기반) ===

/**
 * 🔍 키워드 추출 프롬프트
 */
server.prompt(
  "extract-keywords-prompt",
  {
    userMessage: z.string().describe("사용자의 자연어 입력")
  },
  ({ userMessage }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `사용자가 "${userMessage}"라고 말했습니다. 이를 바탕으로 YouTube Shorts 검색에 적합한 키워드를 추출해주세요.`
      }
    }]
  })
);

/**
 * 🎬 영상 추천 프롬프트
 */
server.prompt(
  "recommend-videos-prompt",
  {
    mood: z.string().describe("사용자의 현재 기분"),
    situation: z.string().describe("사용자의 현재 상황")
  },
  ({ mood, situation }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `사용자는 현재 "${mood}" 기분이고 "${situation}" 상황입니다. 적절한 YouTube Shorts를 추천해주세요.`
      }
    }]
  })
);

// === 서버 시작 (공식 문서 방식) ===
async function main() {
  console.log('🌊 Starting Momentum YouTube Curator MCP Server...');
  
  // 환경 변수 확인
  console.log('🔧 Environment Check:');
  console.log(`- Backend URL: ${BACKEND_URL}`);
  console.log(`- Claude API: ${claude ? 'Configured ✅' : 'Not configured ⚠️'}`);
  
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.log('✅ MCP Server started successfully!');
    console.log('📡 Ready to handle AI curation requests...');
  } catch (error) {
    console.error('❌ Failed to start MCP Server:', error);
    process.exit(1);
  }
}

// 서버 실행
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { server as default }; 