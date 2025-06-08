#!/usr/bin/env node

/**
 * 🚀 Momentum Backend Server - YouTube Shorts AI 큐레이션 서비스
 * Wave Team
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

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

// 보안 미들웨어
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
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
app.use(express.urlencoded({ extended: true }));

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    service: 'Momentum Backend',
    description: 'YouTube Shorts AI 큐레이션 서비스 - API 서버',
    version: '1.0.0',
    team: 'Wave Team',
    endpoints: {
      health: '/health',
      videos: '/api/v1/videos/*'
    },
    features: [
      '🎬 실제 YouTube API 2단계 필터링',
      '📊 사용자 분석 및 키워드 확장',
      '🔍 고급 검색 최적화',
      '⚡ Railway 배포 최적화'
    ]
  });
});

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development',
    services: {
      backend: 'active',
      youtube_api: process.env.YOUTUBE_API_KEY ? 'configured' : 'mock',
      claude_api: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY ? 'configured' : 'mock',
      supabase: process.env.SUPABASE_URL ? 'configured' : 'mock'
    }
  });
});

// Video API Routes
try {
  const videoRoutes = require('./routes/videoRoutes');
  app.use('/api/v1/videos', videoRoutes);
  console.log('✅ Video API 라우트 로드 완료');
} catch (error) {
  console.error('❌ Video 라우트 로드 실패:', error.message);
}

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /',
      'GET /health', 
      'GET|POST /api/v1/videos/*'
    ]
  });
});

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  console.error('💥 서버 에러:', err);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message,
    timestamp: new Date().toISOString()
  });
});

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
  console.log('  ✅ YouTube Shorts API 서버');
  console.log('  ✅ 사용자 분석 시스템');
  console.log('  ✅ 키워드 확장 서비스');
  console.log('  ✅ 2단계 영상 필터링');
  console.log('');
  console.log('📡 주요 엔드포인트:');
  console.log(`  🎬 Video API: GET ${HOST}:${PORT}/api/v1/videos/*`);
  console.log(`  ❤️ Health Check: GET ${HOST}:${PORT}/health`);
  console.log('');
  
  if (!process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_API_KEY) {
    console.log('⚠️ Claude API 키가 설정되지 않음 - Mock 모드로 실행');
  }
  
  if (!process.env.YOUTUBE_API_KEY) {
    console.log('⚠️ YouTube API 키가 설정되지 않음 - Mock 모드로 실행');
  }
  
  console.log('');
  console.log('🎯 테스트 방법:');
  console.log(`  curl -X GET ${HOST}:${PORT}/health`);
  console.log(`  curl -X GET "${HOST}:${PORT}/api/v1/videos/search?q=먹방"`);
  console.log('');
  console.log('🚀 ================================ 🚀');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM 신호 수신. 서버 종료 중...');
    process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT 신호 수신. 서버 종료 중...');
    process.exit(0);
});

module.exports = app; 