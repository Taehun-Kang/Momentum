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
    description: 'YouTube Shorts AI 큐레이션 서비스',
    version: '1.0.0',
    team: 'Wave Team',
    endpoints: {
      health: '/health',
      mcp: '/mcp',
      tools: '/tools',
      videos: '/api/v1/videos/*'
    },
    features: [
      '🤖 실제 MCP 서버 (Streamable HTTP)',
      '🧠 실제 Claude API 자연어 처리',
      '🎬 실제 YouTube API 2단계 필터링',
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
      mcp: 'active',
      youtube_api: process.env.YOUTUBE_API_KEY ? 'configured' : 'mock',
      claude_api: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY ? 'configured' : 'mock',
      supabase: process.env.SUPABASE_URL ? 'configured' : 'mock'
    }
  });
});

// 실제 MCP 서버 로드 및 연결
try {
  console.log('🎬 실제 YouTube Curator MCP 서버 로드 중...');
  const { mcpServer } = require('./mcp/index.js');
  
  // MCP 엔드포인트 직접 구현 (라우터 마운트 대신)
  app.post('/mcp', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] || require('crypto').randomUUID();
      const request = req.body;

      console.log(`📨 MCP 요청 수신 [${sessionId}]:`, request.method);

      const response = await mcpServer.handleRequest(request, sessionId);
      
      res.setHeader('mcp-session-id', sessionId);
      res.json(response);

    } catch (error) {
      console.error('MCP 요청 처리 실패:', error);
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error"
        },
        id: null
      });
    }
  });

  // GET 요청은 405 Method Not Allowed 반환
  app.get('/mcp', (req, res) => {
    res.status(405).setHeader('Allow', 'POST').json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed. Use POST for MCP requests."
      },
      id: null
    });
  });

  // 사용 가능한 도구 목록 (디버깅용)
  app.get('/tools', (req, res) => {
    res.json({
      tools: mcpServer.mcpServer.getTools(),
      count: mcpServer.mcpServer.getTools().length
    });
  });
  
  console.log('✅ 실제 MCP 서버 연결 완료');
  console.log('📍 MCP 엔드포인트: POST /mcp');
  console.log('📍 도구 목록: GET /tools');
  
} catch (error) {
  console.error('❌ MCP 서버 로드 실패:', error.message);
  console.log('📝 기본 서버만 실행됩니다.');
}

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
      'POST /mcp',
      'GET /tools',
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
  console.log('  ✅ 실제 MCP 서버 (Streamable HTTP)');
  console.log('  ✅ YouTube Shorts AI 큐레이션');
  console.log('  ✅ 자연어 검색 (Claude API)');
  console.log('  ✅ 2단계 영상 필터링');
  console.log('');
  console.log('📡 주요 엔드포인트:');
  console.log(`  🤖 MCP Server: POST ${HOST}:${PORT}/mcp`);
  console.log(`  🛠️ Tools List: GET ${HOST}:${PORT}/tools`);
  console.log(`  ❤️ Health Check: GET ${HOST}:${PORT}/health`);
  console.log(`  🎬 Video API: GET ${HOST}:${PORT}/api/v1/videos/*`);
  console.log('');
  
  if (!process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_API_KEY) {
    console.log('⚠️ Claude API 키가 설정되지 않음 - Mock 모드로 실행');
  }
  
  if (!process.env.YOUTUBE_API_KEY) {
    console.log('⚠️ YouTube API 키가 설정되지 않음 - Mock 모드로 실행');
  }
  
  console.log('');
  console.log('🎯 테스트 방법:');
  console.log('  curl -X POST http://localhost:3000/mcp \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\'');
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