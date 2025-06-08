/**
 * 🚀 Railway MCP Host - YouTube Shorts AI 큐레이션
 * 
 * Railway 서버에서 MCP Host 역할을 하며 Claude API와 통합
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 부모 폴더의 .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * 🤖 Railway MCP Host 서버
 * 
 * 기능:
 * - Express.js REST API 제공
 * - Claude API를 사용한 자연어 처리
 * - 기존 백엔드 API와 통합
 */
class RailwayMCPHost {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    
    // API 클라이언트 초기화
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 🔧 Express 미들웨어 설정
   */
  setupMiddleware() {
    this.app.use(helmet());
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
        service: 'Railway MCP Host',
        timestamp: new Date().toISOString(),
        config: {
          hasClaudeAPI: !!process.env.ANTHROPIC_API_KEY,
          hasYouTubeAPI: !!process.env.YOUTUBE_API_KEY,
          hasBrightData: !!process.env.BRIGHT_DATA_API_KEY
        }
      });
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
        
        // 2단계: YouTube API 직접 호출 (MCP 서버 사용 안함)
        const searchResults = await this.searchYouTubeDirectly(optimizedQuery, options);
        
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
        const response = await this.handleChatSearch(message, conversationHistory);
        
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
        
        const trends = await this.getTrendingKeywords(region, category);
        
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
          'POST /api/search',
          'POST /api/chat',
          'GET /api/trends'
        ]
      });
    });
  }

  /**
   * 🧠 Claude API로 쿼리 최적화
   */
  async optimizeQueryWithClaude(userQuery) {
    if (!this.claude) {
      return {
        query: userQuery,
        keywords: userQuery.split(' ').filter(w => w.length > 2),
        analysis: 'Claude API 비활성화'
      };
    }

    try {
      const prompt = `YouTube Shorts 검색을 위해 다음 사용자 요청을 분석하고 최적화해주세요:

사용자 요청: "${userQuery}"

다음 JSON 형식으로 응답해주세요:
{
  "query": "최적화된 검색 키워드",
  "keywords": ["핵심", "키워드", "목록"],
  "intent": "사용자 의도",
  "analysis": "최적화 이유"
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
      console.log('🧠 Claude 최적화 완료:', result.query);
      return result;

    } catch (error) {
      console.error('❌ Claude 최적화 실패:', error);
      // 폴백
      return {
        query: userQuery,
        keywords: userQuery.split(' ').filter(w => w.length > 2),
        intent: '기본 검색',
        analysis: 'Claude API 오류 - 기본 최적화 적용'
      };
    }
  }

  /**
   * 🎬 YouTube API 직접 검색 (2단계 필터링)
   */
  async searchYouTubeDirectly(optimizedQuery, options = {}) {
    const axios = (await import('axios')).default;
      
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('YouTube API 키가 설정되지 않았습니다.');
    }

    try {
      // 1단계: search.list로 후보 영상 검색
      console.log('1️⃣ YouTube 검색 중...');
      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          part: 'snippet',
          q: optimizedQuery.query,
          type: 'video',
          videoDuration: 'short',
          maxResults: options.maxResults || 20,
          regionCode: 'KR',
          relevanceLanguage: 'ko',
          safeSearch: 'moderate',
          order: 'relevance'
        }
      });

      const searchResults = searchResponse.data.items || [];
      if (searchResults.length === 0) {
        return { videos: [], totalResults: 0 };
      }

      // 2단계: videos.list로 상세 정보 조회
      console.log('2️⃣ 영상 상세 정보 조회 중...');
      const videoIds = searchResults.map(item => item.id.videoId);
      const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          part: 'snippet,contentDetails,status,statistics',
          id: videoIds.join(','),
          hl: 'ko'
        }
      });

      const detailedVideos = videosResponse.data.items || [];

      // 3단계: 재생 가능한 Shorts만 필터링
      const playableShorts = detailedVideos.filter(video => {
        if (!video.status.embeddable) return false;
        if (video.status.privacyStatus !== 'public') return false;
        
        const duration = this.parseISO8601Duration(video.contentDetails.duration);
        if (duration > 60 || duration < 5) return false;
        
        return true;
      });
      
      console.log(`✅ ${playableShorts.length}/${searchResults.length} 재생 가능한 영상 발견`);

      return {
        videos: playableShorts.map(video => ({
          id: video.id,
          title: video.snippet.title,
          channel: video.snippet.channelTitle,
          description: video.snippet.description.substring(0, 200) + "...",
          thumbnailUrl: video.snippet.thumbnails.medium?.url,
          publishedAt: video.snippet.publishedAt,
          duration: this.parseISO8601Duration(video.contentDetails.duration),
          viewCount: parseInt(video.statistics?.viewCount || 0),
          url: `https://www.youtube.com/shorts/${video.id}`
        })),
        totalResults: playableShorts.length,
        apiUnitsUsed: 107 // search.list (100) + videos.list (7)
      };

    } catch (error) {
      console.error('❌ YouTube API 오류:', error);
      throw error;
    }
  }

  /**
   * 💬 대화형 AI 검색 처리
   */
  async handleChatSearch(message, conversationHistory) {
    if (!this.claude) {
      return {
        message: 'Claude API가 설정되지 않았습니다.',
        needsSearch: false
      };
    }

    try {
      // 1단계: 대화 맥락 분석
      const contextPrompt = `사용자와의 대화에서 YouTube Shorts 검색이 필요한지 판단하고, 필요하다면 검색어를 추출해주세요:

현재 메시지: "${message}"

다음 JSON 형식으로 응답해주세요:
{
  "needsSearch": true/false,
  "searchQuery": "검색어 (필요한 경우)",
  "userIntent": "사용자 의도 분석",
  "responseMessage": "사용자에게 보낼 응답 메시지"
}`;

      const contextResponse = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: contextPrompt
        }]
      });

      const analysis = JSON.parse(contextResponse.content[0].text);

      // 2단계: 검색이 필요한 경우 영상 검색
      let searchResults = null;
      if (analysis.needsSearch && analysis.searchQuery) {
        const optimizedQuery = await this.optimizeQueryWithClaude(analysis.searchQuery);
        searchResults = await this.searchYouTubeDirectly(optimizedQuery, { maxResults: 10 });
      }

      return {
        message: analysis.responseMessage,
        analysis,
        searchResults,
        hasVideoResults: !!searchResults?.videos?.length
      };

    } catch (error) {
      console.error('❌ 대화형 검색 처리 실패:', error);
      return {
        message: '죄송합니다. 처리 중 오류가 발생했습니다.',
        error: error.message
      };
    }
  }

  /**
   * 📈 트렌딩 키워드 조회
   */
  async getTrendingKeywords(region, category) {
    // 기본 트렌드 데이터 (실제로는 Bright Data API 연동)
    const fallbackTrends = [
      { keyword: '먹방', score: 85, searchVolume: 50000, growthRate: 15 },
      { keyword: '댄스', score: 80, searchVolume: 45000, growthRate: 12 },
      { keyword: '브이로그', score: 75, searchVolume: 40000, growthRate: 10 },
      { keyword: '요리', score: 70, searchVolume: 35000, growthRate: 8 },
      { keyword: '게임', score: 65, searchVolume: 30000, growthRate: 5 }
    ];

    // TODO: Bright Data API 연동
      return {
        region,
        category,
      trends: fallbackTrends,
      source: 'fallback',
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 🔧 유틸리티: ISO8601 duration 파싱
   */
  parseISO8601Duration(duration) {
    if (!duration) return 0;
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '') || 0;
    const minutes = (match[2] || '').replace('M', '') || 0;
    const seconds = (match[3] || '').replace('S', '') || 0;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
  }

  /**
   * 🚀 서버 시작
   */
  async start() {
    try {
      this.app.listen(this.port, () => {
        console.log(`🚀 Railway MCP Host 서버 실행 중!`);
        console.log(`📡 포트: ${this.port}`);
        console.log(`🌐 헬스 체크: http://localhost:${this.port}/health`);
        console.log(`🎬 YouTube 검색: POST /api/search`);
        console.log(`💬 대화형 검색: POST /api/chat`);
        console.log(`📈 트렌드 조회: GET /api/trends`);
      });

    } catch (error) {
      console.error('❌ 서버 시작 실패:', error);
      process.exit(1);
    }
  }
}

// 서버 시작
const railwayHost = new RailwayMCPHost();
railwayHost.start(); 