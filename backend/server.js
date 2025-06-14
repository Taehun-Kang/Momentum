#!/usr/bin/env node

/**
 * 🚀 Momentum Backend Server - YouTube Shorts AI 큐레이션 서비스
 * Wave Team
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

// 🔧 routes/index.js 통합 사용
import allRoutes from './routes/index.js';

dotenv.config();

// 서비스 초기화
console.log('🔧 Momentum 백엔드 서버 초기화 중...');

// 앱 초기화
const app = express();

// ============================================
// 보안 미들웨어
// ============================================

// 고급 헬멧 보안 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.youtube.com", "https://*.supabase.co", "https://serpapi.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS 설정
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-Id']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 최대 요청 수
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request 로깅
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================
// 기본 라우트
// ============================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Momentum YouTube Shorts AI 큐레이션 서비스',
    version: '1.0',
    team: 'Wave Team',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    endpoints: {
      auth: '/api/v1/auth',
      trends: '/api/v1/trends',
      llm: '/api/v1/llm',
      search: '/api/v1/search',
      health: '/health'
    },
    features: [
      '🔥 실시간 트렌드 영상 큐레이션',
      '🎬 4단계 워크플로우 (Google Trends → 뉴스 정제 → YouTube 검색 → 채널 필터링)',
      '📊 고품질 채널 필터링 (5만+ 구독자)',
      '🎯 개인화 감성 분석 API (신규)',
      '🗣️ 자연어 감정 분석 및 키워드 추출',
      '💬 AI 감성 문장 큐레이션',
      '🔍 매일 키워드 갱신 서비스 (신규)',
      '🤖 AI 기반 영상 분류 및 태깅',
      '⚡ 실시간 키워드 검색 서비스 (신규)',
      '🔍 사용자 요청 즉시 처리',
      '🔐 Supabase 인증 시스템',
      '⚡ Railway 배포 최적화'
    ]
  });
});

// 헬스 체크
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      youtube_api: process.env.YOUTUBE_API_KEY ? 'configured' : 'missing',
      serpapi: process.env.SERP_API_KEY ? 'configured' : 'missing',
      claude_api: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
      supabase: process.env.SUPABASE_URL ? 'configured' : 'missing'
    },
    activeApis: [
      'User Authentication',
      'Trend Video Curation',
      'Trend Keywords',
      'LLM Analysis',
      'Search Services'
    ]
  };

  res.json(health);
});

// ============================================
// API Routes
// ============================================

// 🎯 통합 라우트 사용 (권장 방식)
app.use('/api/v1', allRoutes);

// 테스트 라우트
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: '테스트 라우트 작동!' });
});

console.log('📡 API 라우트 등록 완료: auth, trends, llm, search');

// ============================================
// 에러 처리 미들웨어
// ============================================

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `요청하신 경로 ${req.originalUrl}을 찾을 수 없습니다`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/test',
      'POST /api/v1/auth/signup',
      'POST /api/v1/auth/signin',
      'POST /api/v1/auth/signout',
      'POST /api/v1/auth/refresh',
      'GET /api/v1/auth/me',
      'PUT /api/v1/auth/profile',
      'POST /api/v1/auth/reset-password',
      'GET /api/v1/trends/videos',
      'GET /api/v1/trends/keywords',
      'GET /api/v1/trends/stats',
      'POST /api/v1/llm/analyze',
      'GET /api/v1/search/health'
    ]
  });
});

// 글로벌 에러 핸들러 (간소화된 버전)
app.use((error, req, res, next) => {
  console.error('💥 서버 에러:', error);

  // 요청 크기 초과 에러
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'FILE_TOO_LARGE',
      message: '요청 크기가 너무 큽니다'
    });
  }

  // JSON 파싱 에러
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_JSON',
      message: 'JSON 형식이 올바르지 않습니다'
    });
  }

  // YouTube API 에러
  if (error.message?.includes('quotaExceeded')) {
    return res.status(429).json({
      success: false,
      error: 'QUOTA_EXCEEDED',
      message: 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.'
    });
  }

  // 기본 서버 에러
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: '서버 내부 오류가 발생했습니다',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error.message 
    })
  });
});

// ============================================
// 서버 시작
// ============================================

// 서버 시작 함수
function startServer() {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  app.listen(PORT, HOST, () => {
    console.log('🚀 Momentum Backend Server 시작!');
    console.log(`📍 서버 주소: http://${HOST}:${PORT}`);
    console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
    console.log('🔧 활성화된 API: auth, trends, llm, search');
    
    // API 키 상태 확인
    const apiKeyStatus = [];
    if (!process.env.YOUTUBE_API_KEY) apiKeyStatus.push('YouTube API');
    if (!process.env.SERP_API_KEY) apiKeyStatus.push('SerpAPI');
    if (!process.env.ANTHROPIC_API_KEY) apiKeyStatus.push('Claude API');
    if (!process.env.SUPABASE_URL) apiKeyStatus.push('Supabase URL');
    
    if (apiKeyStatus.length > 0) {
      console.log(`⚠️ 누락된 설정: ${apiKeyStatus.join(', ')}`);
    } else {
      console.log('✅ 모든 API 키 설정 완료');
    }
    
    console.log(`🎯 헬스 체크: GET ${HOST}:${PORT}/health`);
    console.log(`🔐 인증 API: POST ${HOST}:${PORT}/api/v1/auth/signin`);
  });
}

// 🚀 서버 시작 실행
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM 신호 수신. 서버 종료 중...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT 신호 수신. 서버 종료 중...');
  process.exit(0);
});

export default app;

/*
===============================================
🧪 API 테스트 예시 (개발 참고용)
===============================================

// 기본 헬스 체크
curl -X GET http://localhost:3002/health

// 트렌드 API 테스트
curl -X GET "http://localhost:3002/api/v1/trends/keywords"
curl -X GET "http://localhost:3002/api/v1/trends/videos?maxKeywords=5"
curl -X GET "http://localhost:3002/api/v1/trends/videos/quick"
curl -X GET "http://localhost:3002/api/v1/trends/stats"
curl -X POST "http://localhost:3002/api/v1/trends/videos/custom" \
  -H "Content-Type: application/json" \
  -d '{"keywords":["먹방","브이로그"],"maxResults":10}'

// LLM 감성 분석 API 테스트
curl -X POST "http://localhost:3002/api/v1/llm/analyze" \
  -H "Content-Type: application/json" \
  -d '{"userInput":"퇴근하고 와서 피곤해","inputType":"emotion"}'
curl -X POST "http://localhost:3002/api/v1/llm/quick-keywords" \
  -H "Content-Type: application/json" \
  -d '{"userInput":"오늘 기분이 좋아서 신나는 영상 보고싶어"}'
curl -X POST "http://localhost:3002/api/v1/llm/track-click" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"sample123","keyword":"먹방","emotion":"happy"}'
curl -X GET "http://localhost:3002/api/v1/llm/stats"
curl -X GET "http://localhost:3002/api/v1/llm/health"

// 검색 서비스 API 테스트
curl -X POST "http://localhost:3002/api/v1/search/daily-update" \
  -H "Content-Type: application/json" \
  -d '{"targetKeywords":["먹방","브이로그","댄스"]}'
curl -X GET "http://localhost:3002/api/v1/search/daily-update/progress"
curl -X POST "http://localhost:3002/api/v1/search/test-keyword" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"먹방","category":"음식","min_view_count":50000}'
curl -X POST "http://localhost:3002/api/v1/search/batch-keywords" \
  -H "Content-Type: application/json" \
  -d '{"keywords":["요리","레시피","먹방"],"options":{"maxResults":20}}'
curl -X GET "http://localhost:3002/api/v1/search/daily-update/stats"
curl -X POST "http://localhost:3002/api/v1/search/retry-classifications" \
  -H "Content-Type: application/json" \
  -d '{"maxRetries":3}'
curl -X GET "http://localhost:3002/api/v1/search/failed-videos"
curl -X POST "http://localhost:3002/api/v1/search/reprocess-videos" \
  -H "Content-Type: application/json" \
  -d '{"videoIds":["video1","video2"]}'
curl -X POST "http://localhost:3002/api/v1/search/cleanup-failed"
curl -X POST "http://localhost:3002/api/v1/search/realtime" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"유튜브쇼츠","category":"엔터테인먼트"}'
curl -X GET "http://localhost:3002/api/v1/search/realtime/session"
curl -X GET "http://localhost:3002/api/v1/search/realtime/failed-videos"
curl -X POST "http://localhost:3002/api/v1/search/quick" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"유튜브쇼츠","category":"엔터테인먼트"}'
curl -X GET "http://localhost:3002/api/v1/search/health"

// 테스트 라우트
curl -X GET "http://localhost:3002/api/test"

===============================================
*/ 