/**
 * 🚀 단순화된 Express HTTP 서버 (Railway 배포 최적화)
 * 
 * StreamableHTTP 없이 Backend 호환성에 집중
 * Railway Private Networking 최적화
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 부모 폴더의 .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * 🎬 YouTube Shorts AI 서버 (Express 전용)
 */
class YouTubeShortsExpressServer {
  constructor() {
    this.config = {
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
      claudeApiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
      brightDataApiKey: process.env.BRIGHT_DATA_API_KEY
    };

    // Claude API 설정
    this.anthropic = this.config.claudeApiKey ? new Anthropic({
      apiKey: this.config.claudeApiKey
    }) : null;

    // 통계 추적
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      apiUnitsUsed: 0
    };

    console.log('🎬 YouTube Shorts Express 서버 초기화...');
  }

  /**
   * 🌐 Express HTTP 서버 시작
   */
  async startExpress(port = 3000) {
    const express = (await import('express')).default;
    const cors = (await import('cors')).default;
    const app = express();

    // 미들웨어 설정
    app.use(cors());
    app.use(express.json());
    
    // 로깅 미들웨어
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      this.stats.totalRequests++;
      next();
    });

    // 헬스 체크
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'YouTube Shorts AI Express Server',
        version: '1.0.0',
        mode: 'express_only',
        timestamp: new Date().toISOString(),
        config: {
          hasClaudeKey: !!this.config.claudeApiKey,
          hasYouTubeKey: !!this.config.youtubeApiKey,
          hasBrightDataKey: !!this.config.brightDataApiKey
        },
        stats: this.stats
      });
    });

    // Backend 호환 API
    this.setupBackendAPIs(app);

    // 에러 핸들러
    app.use((error, req, res, next) => {
      console.error('Express 에러:', error);
      this.stats.failedRequests++;
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    // 404 핸들러
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        availableEndpoints: [
          'GET /health',
          'POST /api/search',
          'POST /api/chat',
          'GET /api/trends',
          'GET /api/stats'
        ]
      });
    });

    // 서버 시작
    app.listen(port, () => {
      console.log(`✅ Express 서버가 포트 ${port}에서 실행 중입니다.`);
      console.log(`🌐 Health Check: http://localhost:${port}/health`);
      console.log(`🎬 Backend APIs:`);
      console.log(`  - POST http://localhost:${port}/api/search`);
      console.log(`  - POST http://localhost:${port}/api/chat`);
      console.log(`  - GET http://localhost:${port}/api/trends`);
      console.log(`  - GET http://localhost:${port}/api/stats`);
      
      console.log('\n🚀 Railway 배포 최적화:');
      console.log('  - Private Networking 지원');
      console.log('  - Backend 완벽 호환');
      console.log('  - 단순한 HTTP 통신');
    });
  }

  /**
   * 🔗 Backend 호환 API 설정
   */
  setupBackendAPIs(app) {
    // YouTube Shorts 검색 API
    app.post('/api/search', async (req, res) => {
      try {
        const { query, options = {} } = req.body;
        
        if (!query) {
          return res.status(400).json({
            success: false,
            error: 'query parameter is required'
          });
        }

        console.log(`🔍 검색 요청: "${query}"`);
        
        // YouTube API 검색 실행
        const result = await this.searchYouTubeVideos(query, options);
        
        this.stats.successfulRequests++;
        res.json({
          success: true,
          results: result,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('검색 API 오류:', error);
        this.stats.failedRequests++;
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // AI 대화형 검색 API
    app.post('/api/chat', async (req, res) => {
      try {
        const { message, useAI = true, maxResults = 20 } = req.body;
        
        if (!message) {
          return res.status(400).json({
            success: false,
            error: 'message parameter is required'
          });
        }

        console.log(`💬 AI 채팅: "${message}"`);
        
        let optimizedQuery = message;
        let keywords = [message];
        let analysis = null;

        // Claude AI 최적화 (가능한 경우)
        if (useAI && this.anthropic) {
          try {
            const optimization = await this.optimizeWithClaude(message);
            optimizedQuery = optimization.query || message;
            keywords = optimization.keywords || [message];
            analysis = optimization.analysis;
          } catch (error) {
            console.warn('Claude 최적화 실패, 기본 검색 사용:', error.message);
          }
        }
        
        // 최적화된 쿼리로 검색
        const searchResult = await this.searchYouTubeVideos(optimizedQuery, { maxResults });
        
        this.stats.successfulRequests++;
        res.json({
          success: true,
          response: `"${message}"에 대한 검색 결과입니다.`,
          keywords: keywords,
          videos: searchResult.videos || [],
          optimizedQuery: optimizedQuery !== message ? optimizedQuery : null,
          analysis: analysis,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('AI 채팅 API 오류:', error);
        this.stats.failedRequests++;
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 트렌드 키워드 API
    app.get('/api/trends', async (req, res) => {
      try {
        const { region = 'KR', category = 'entertainment' } = req.query;
        
        console.log(`📈 트렌드 요청: ${region}/${category}`);
        
        // 기본 트렌드 데이터 (실제로는 Bright Data나 외부 API 연동)
        const trends = this.getFallbackTrends(region);
        
        this.stats.successfulRequests++;
        res.json({
          success: true,
          trending: trends,
          categories: { [category]: trends },
          region: region,
          updatedAt: new Date().toISOString(),
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('트렌드 API 오류:', error);
        this.stats.failedRequests++;
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 서버 통계 API
    app.get('/api/stats', (req, res) => {
      const uptime = process.uptime();
      const memory = process.memoryUsage();
      
      res.json({
        success: true,
        server: {
          name: 'YouTube Shorts AI Express Server',
          version: '1.0.0',
          uptime: uptime,
          memory: memory
        },
        stats: this.stats,
        config: {
          hasClaudeKey: !!this.config.claudeApiKey,
          hasYouTubeKey: !!this.config.youtubeApiKey,
          hasBrightDataKey: !!this.config.brightDataApiKey
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * 🎬 YouTube API 검색 (2단계 필터링)
   */
  async searchYouTubeVideos(query, options = {}) {
    if (!this.config.youtubeApiKey) {
      throw new Error('YouTube API 키가 설정되지 않았습니다.');
    }

    const { maxResults = 10, nextPageToken = null } = options;

    try {
      console.log(`🎬 YouTube 검색: "${query}" (최대 ${maxResults}개)`);

      // 1단계: search.list (항상 50개 후보)
      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: this.config.youtubeApiKey,
          part: 'snippet',
          q: query,
          type: 'video',
          videoDuration: 'short',
          videoEmbeddable: 'true',
          maxResults: 50, // 항상 최대
          regionCode: 'KR',
          relevanceLanguage: 'ko',
          safeSearch: 'moderate',
          order: 'relevance',
          pageToken: nextPageToken
        }
      });

      const searchResults = searchResponse.data.items || [];
      console.log(`📊 search.list 결과: ${searchResults.length}개 후보`);

      // 2단계: videos.list로 상세 정보 및 재생 가능 여부 확인
      if (searchResults.length === 0) {
        return {
          videos: [],
          totalResults: 0,
          nextPageToken: null,
          apiUnitsUsed: 100,
          filteringStats: { successRate: 0 }
        };
      }

      const videoIds = searchResults.map(item => item.id.videoId);
      const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          key: this.config.youtubeApiKey,
          part: 'snippet,contentDetails,status,statistics',
          id: videoIds.join(','),
          hl: 'ko'
        }
      });

      const detailedVideos = videosResponse.data.items || [];

      // 3단계: 재생 가능한 Shorts만 필터링
      const playableShorts = detailedVideos.filter(video => {
        // 기본 검증
        if (!video.status.embeddable) return false;
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

      const filteringRatio = searchResults.length > 0 ? 
        (playableShorts.length / searchResults.length * 100).toFixed(1) : 0;

      console.log(`✅ 필터링 완료: ${playableShorts.length}/${searchResults.length} (${filteringRatio}% 성공)`);

      // 최종 결과 포맷
      const finalVideos = playableShorts.slice(0, maxResults).map(video => ({
        id: video.id,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        description: video.snippet.description.substring(0, 200) + "...",
        thumbnailUrl: video.snippet.thumbnails.medium?.url,
        publishedAt: video.snippet.publishedAt,
        duration: this.parseISO8601Duration(video.contentDetails.duration),
        viewCount: parseInt(video.statistics?.viewCount || 0),
        url: `https://www.youtube.com/shorts/${video.id}`
      }));

      // API 사용량 추적
      const apiUnits = 109; // search.list(100) + videos.list(9)
      this.stats.apiUnitsUsed += apiUnits;

      return {
        videos: finalVideos,
        totalResults: finalVideos.length,
        nextPageToken: searchResponse.data.nextPageToken,
        apiUnitsUsed: apiUnits,
        filteringStats: {
          candidates: searchResults.length,
          playable: playableShorts.length,
          returned: finalVideos.length,
          successRate: parseFloat(filteringRatio)
        }
      };

    } catch (error) {
      console.error('YouTube API 오류:', error);
      if (error.response?.status === 403) {
        throw new Error('YouTube API 할당량이 초과되었거나 권한이 없습니다.');
      }
      throw error;
    }
  }

  /**
   * 🧠 Claude를 사용한 쿼리 최적화
   */
  async optimizeWithClaude(userMessage) {
    if (!this.anthropic) {
      return {
        query: userMessage,
        keywords: [userMessage],
        analysis: 'Claude API 비활성화'
      };
    }

    try {
      const prompt = `YouTube Shorts 검색을 위해 다음 사용자 요청을 최적화해주세요:

사용자 요청: "${userMessage}"

다음 JSON 형식으로 응답해주세요:
{
  "query": "최적화된 검색 키워드",
  "keywords": ["핵심", "키워드", "목록"],
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
      console.log('🧠 Claude 최적화 완료:', result.query);
      return result;

    } catch (error) {
      console.error('Claude 최적화 실패:', error);
      return {
        query: userMessage,
        keywords: [userMessage],
        analysis: 'Claude 최적화 실패 - 원본 사용'
      };
    }
  }

  /**
   * 🔄 폴백 트렌드 데이터
   */
  getFallbackTrends(region) {
    const trends = {
      'KR': [
        { keyword: '먹방', score: 95 },
        { keyword: '댄스', score: 90 },
        { keyword: '브이로그', score: 85 },
        { keyword: '요리', score: 80 },
        { keyword: '게임', score: 75 },
        { keyword: 'ASMR', score: 70 },
        { keyword: '메이크업', score: 65 },
        { keyword: '운동', score: 60 },
        { keyword: '여행', score: 55 },
        { keyword: '펫', score: 50 }
      ],
      'US': [
        { keyword: 'dance', score: 95 },
        { keyword: 'cooking', score: 90 },
        { keyword: 'gaming', score: 85 },
        { keyword: 'makeup', score: 80 },
        { keyword: 'fitness', score: 75 }
      ]
    };
    
    return trends[region] || trends['KR'];
  }

  /**
   * ⏱️ ISO8601 duration 파싱
   */
  parseISO8601Duration(duration) {
    if (!duration) return 0;
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '') || 0;
    const minutes = (match[2] || '').replace('M', '') || 0;
    const seconds = (match[3] || '').replace('S', '') || 0;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
  }
}

// 메인 실행
async function main() {
  const server = new YouTubeShortsExpressServer();
  
  const isRailway = !!process.env.PORT;
  const port = parseInt(process.env.PORT || '3000');
  
  console.log('🎬 YouTube Shorts Express 서버 시작...');
  console.log(`📍 환경: ${isRailway ? 'Railway (배포)' : 'Local (개발)'}`);
  console.log(`🚀 포트: ${port}`);
  
  console.log('\n🔑 API 설정:');
  console.log(`  - YouTube API: ${server.config.youtubeApiKey ? '✅' : '❌'}`);
  console.log(`  - Claude API: ${server.config.claudeApiKey ? '✅' : '❌'}`);
  console.log(`  - Bright Data API: ${server.config.brightDataApiKey ? '✅' : '❌'}`);
  
  console.log('\n⚙️ 최적화 설정:');
  console.log('  - Express 전용 (StreamableHTTP 없음)');
  console.log('  - Railway Private Networking 최적화');
  console.log('  - Backend 완벽 호환');
  console.log('  - 2단계 필터링 (재생 가능 영상만)');
  
  try {
    await server.startExpress(port);
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default YouTubeShortsExpressServer; 