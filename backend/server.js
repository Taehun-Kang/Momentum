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
import trendRoutes from './routes/trendRoutes.js';
import llmRoutes from './routes/llmRoutes.js';

dotenv.config();

// 서비스 초기화
console.log('🔧 Momentum 백엔드 서버 초기화 중...');

// 환경 변수 확인
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`⚠️ 누락된 환경 변수: ${missingEnvVars.join(', ')}`);
  console.warn('📝 기본 모드로 실행됩니다.');
}

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
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000', 'http://127.0.0.1:8000'],
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
      trends: '/api/v1/trends',
      llm: '/api/v1/llm',
      health: '/health'
    },
    features: [
      '🔥 실시간 트렌드 영상 큐레이션',
      '🎬 4단계 워크플로우 (Google Trends → 뉴스 정제 → YouTube 검색 → 채널 필터링)',
      '📊 고품질 채널 필터링 (5만+ 구독자)',
      '🎯 개인화 감성 분석 API (신규)',
      '🗣️ 자연어 감정 분석 및 키워드 추출',
      '💬 AI 감성 문장 큐레이션',
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
      'Trend Video Curation',
      'Trend Keywords',
      'Service Statistics'
    ]
  };

  res.json(health);
});

// ============================================
// API Routes
// ============================================

// 🔥 Trend API Routes - 메인 기능!
console.log('🔄 Trend 라우트 등록 시작...');
console.log('🔍 trendRoutes type:', typeof trendRoutes);
console.log('🔍 trendRoutes stack length:', trendRoutes.stack?.length || 'undefined');

// 라우트 등록
app.use('/api/v1/trends', trendRoutes);
console.log('🔥 Trend API 라우트 등록 완료');

// 🎯 LLM 감성 분석 API Routes - 새로운 기능!
console.log('🔄 LLM 라우트 등록 시작...');
console.log('🔍 llmRoutes type:', typeof llmRoutes);
console.log('🔍 llmRoutes stack length:', llmRoutes.stack?.length || 'undefined');

app.use('/api/v1/llm', llmRoutes);
console.log('🎯 LLM 감성 분석 API 라우트 등록 완료');

// 🧪 간단한 테스트 라우트 추가
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: '테스트 라우트 작동!' });
});
console.log('🧪 테스트 라우트 추가 완료');

// 🔍 라우트 등록 확인
function checkRoutes() {
  console.log('📋 등록된 라우트 수:', app._router?.stack?.length || 'unknown');
  
  if (app._router && app._router.stack) {
    const trendRoute = app._router.stack.find(layer => {
      return layer.regexp.test('/api/v1/trends');
    });
    
    if (trendRoute) {
      console.log('✅ 트렌드 라우트 찾음!');
      console.log('📍 라우트 패턴:', trendRoute.regexp);
      
      // 서브 라우터의 라우트들 확인
      if (trendRoute.handle && trendRoute.handle.stack) {
        console.log('📋 트렌드 서브라우트 수:', trendRoute.handle.stack.length);
        trendRoute.handle.stack.forEach((subLayer, index) => {
          if (subLayer.route) {
            console.log(`  🔗 [${index}] ${Object.keys(subLayer.route.methods).join(',')} ${subLayer.route.path}`);
          }
        });
      } else {
        console.log('⚠️ 서브라우트 정보를 찾을 수 없음');
      }
    } else {
      console.log('❌ 트렌드 라우트를 찾을 수 없음!');
    }
  }
}

// ============================================
// 개발 전용 테스트 엔드포인트 (주석 처리)
// ============================================

/*
// MCP 기능 테스트 엔드포인트 (개발 전용)
app.get('/test-mcp', async (req, res) => {
  try {
    const { default: mcpIntegrationService } = await import('./services/mcpIntegrationService.js');
    
    // MCP 상태 확인
    const status = mcpIntegrationService.getStatus();
    console.log('🧪 MCP 상태 테스트:', status);
    
    // 기본 검색 테스트
    const searchResult = await mcpIntegrationService.searchVideos('먹방', 5);
    console.log('🧪 MCP 검색 테스트 결과:', searchResult);
    
    res.json({
      success: true,
      message: 'MCP 기능 테스트 완료',
      data: {
        status,
        searchTest: searchResult
      }
    });
  } catch (error) {
    console.error('🧪 MCP 테스트 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// 트렌드 키워드 테스트 (개발 전용)
app.get('/test-trends', async (req, res) => {
  try {
    const { default: mcpIntegrationService } = await import('./services/mcpIntegrationService.js');
    
    const trends = await mcpIntegrationService.getTrendingKeywords('KR', 'entertainment', 5);
    console.log('🧪 트렌드 테스트 결과:', trends);
    
    res.json({
      success: true,
      message: '트렌드 키워드 테스트 완료',
      data: trends
    });
  } catch (error) {
    console.error('🧪 트렌드 테스트 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// AI 자연어 처리 테스트 (개발 전용)
app.post('/test-ai', async (req, res) => {
  try {
    const { message = '재미있는 먹방 영상 보고 싶어' } = req.body;
    const { default: mcpIntegrationService } = await import('./services/mcpIntegrationService.js');
    
    const optimized = await mcpIntegrationService.optimizeQuery(message);
    console.log('🧪 AI 처리 테스트 결과:', optimized);
    
    res.json({
      success: true,
      message: 'AI 자연어 처리 테스트 완료',
      input: message,
      data: optimized
    });
  } catch (error) {
    console.error('🧪 AI 테스트 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
*/

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
      'GET /api/v1/trends/videos',
      'GET /api/v1/trends/keywords',
      'GET /api/v1/trends/stats',
      'GET /api/v1/trends/videos/quick',
      'POST /api/v1/trends/videos/custom',
      'GET /api/v1/trends/health',
      'POST /api/v1/llm/analyze',
      'POST /api/v1/llm/quick-keywords',
      'POST /api/v1/llm/track-click',
      'GET /api/v1/llm/stats',
      'GET /api/v1/llm/health',
      'POST /api/v1/llm/test'
    ]
  });
});

// 글로벌 에러 핸들러 (고급 버전)
app.use((error, req, res, next) => {
  console.error('💥 서버 에러:', error);

  // JWT 관련 에러
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: '유효하지 않은 토큰입니다'
    });
  }

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

  // Supabase 관련 에러
  if (error.code?.startsWith('PGRST')) {
    return res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: '데이터베이스 오류가 발생했습니다'
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
  // 🔍 라우트 등록 확인
  checkRoutes();
  
  // 서버 시작
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  app.listen(PORT, HOST, () => {
  console.log('');
  console.log('🚀 ================================ 🚀');
  console.log('🎉 Momentum Backend Server 시작!');
  console.log('🚀 ================================ 🚀');
  console.log('');
  console.log(`📍 서버 주소: http://${HOST}:${PORT}`);
  console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('🔧 활성화된 서비스:');
  console.log('  🔥 트렌드 영상 큐레이션 API');
  console.log('  📊 Google Trends 실시간 수집');
  console.log('  📰 뉴스 기반 키워드 정제');
  console.log('  🎬 YouTube 최신 영상 검색');
  console.log('  📺 채널 품질 필터링 (5만+ 구독자)');
  console.log('  🎯 개인화 감성 분석 API (신규)');
  console.log('  🗣️ 자연어 감정 분석 및 키워드 추출');
  console.log('  💬 AI 감성 문장 큐레이션');
  console.log('');
  console.log('📡 주요 엔드포인트:');
  console.log(`  🔥 Trend Videos: GET ${HOST}:${PORT}/api/v1/trends/videos`);
  console.log(`  🎨 Trend Keywords: GET ${HOST}:${PORT}/api/v1/trends/keywords`);
  console.log(`  ⚡ Quick Videos: GET ${HOST}:${PORT}/api/v1/trends/videos/quick`);
  console.log(`  📊 Service Stats: GET ${HOST}:${PORT}/api/v1/trends/stats`);
  console.log(`  🎯 Emotion Analysis: POST ${HOST}:${PORT}/api/v1/llm/analyze`);
  console.log(`  💬 Quick Keywords: POST ${HOST}:${PORT}/api/v1/llm/quick-keywords`);
  console.log(`  🔍 Click Tracking: POST ${HOST}:${PORT}/api/v1/llm/track-click`);
  console.log(`  ❤️ Health Check: GET ${HOST}:${PORT}/health`);
  console.log('');
  
  // API 키 상태 확인
  const apiKeyStatus = [];
  if (!process.env.YOUTUBE_API_KEY) {
    apiKeyStatus.push('⚠️ YouTube API 키 누락');
  }
  if (!process.env.SERP_API_KEY) {
    apiKeyStatus.push('⚠️ SerpAPI 키 누락');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    apiKeyStatus.push('⚠️ Claude API 키 누락');
  }
  
  if (apiKeyStatus.length > 0) {
    console.log('🔑 API 키 상태:');
    apiKeyStatus.forEach(status => console.log(`  ${status}`));
    console.log('');
  }
  
  console.log('🎯 테스트 방법:');
  console.log(`  curl -X GET ${HOST}:${PORT}/health`);
  console.log(`  curl -X GET "${HOST}:${PORT}/api/v1/trends/keywords"`);
  console.log(`  curl -X GET "${HOST}:${PORT}/api/v1/trends/videos?maxKeywords=5"`);
  console.log('');
  console.log('🎯 새로운 감성 분석 API 테스트:');
  console.log(`  curl -X POST ${HOST}:${PORT}/api/v1/llm/analyze \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"userInput":"퇴근하고 와서 피곤해","inputType":"emotion"}'`);
  console.log(`  curl -X GET ${HOST}:${PORT}/api/v1/llm/health`);
  console.log('');
    console.log('🚀 ================================ 🚀');
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