require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Route imports
const videoRoutes = require('./routes/videoRoutes');
const authRoutes = require('./routes/authRoutes');
const trendRoutes = require('./routes/trendRoutes');
const systemRoutes = require('./routes/systemRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Middleware imports
const { securityHeaders, logApiUsage, rateLimitByTier } = require('./middleware/authMiddleware');

/**
 * Momentum YouTube Shorts AI 큐레이션 서비스
 * Express.js 백엔드 서버
 * Wave Team
 */

const app = express();
const PORT = process.env.PORT || 3002;

// ============================================
// 기본 미들웨어 설정
// ============================================

// 보안 헤더 (전역 적용)
app.use(securityHeaders);

// 헬멧 보안 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.youtube.com", "https://*.supabase.co"]
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

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request 로깅
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================
// Health Check & Status
// ============================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Momentum YouTube Shorts AI 큐레이션 서비스',
    version: '1.0.0',
    team: 'Wave Team',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    endpoints: {
      videos: '/api/v1/videos',
      auth: '/api/v1/auth',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  // 서비스 상태 체크
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      youtube_api: process.env.YOUTUBE_API_KEY ? 'configured' : 'missing',
      claude_api: process.env.CLAUDE_API_KEY ? 'configured' : 'missing',
      supabase: process.env.SUPABASE_URL ? 'configured' : 'missing'
    }
  };

  res.json(health);
});

// ============================================
// API 라우트 등록
// ============================================

// 인증 라우트 (Rate limiting 적용)
app.use('/api/v1/auth', 
  rateLimitByTier({
    free: { requests: 50, window: 3600 },     // 인증은 좀 더 관대하게
    premium: { requests: 200, window: 3600 },
    pro: { requests: 1000, window: 3600 }
  }),
  logApiUsage('auth_api', 1),
  authRoutes
);

// 비디오 라우트 (Rate limiting 적용)
app.use('/api/v1/videos',
  rateLimitByTier({
    free: { requests: 100, window: 3600 },
    premium: { requests: 1000, window: 3600 },
    pro: { requests: 10000, window: 3600 }
  }),
  logApiUsage('video_api', 5),  // 비디오 API는 더 많은 리소스 사용
  videoRoutes
);

// 트렌드 라우트
app.use('/api/v1/trends',
  rateLimitByTier({
    free: { requests: 50, window: 3600 },
    premium: { requests: 500, window: 3600 },
    pro: { requests: 5000, window: 3600 }
  }),
  logApiUsage('trend_api', 2),
  trendRoutes
);

// 시스템 모니터링 라우트 (관리자 전용, Rate limiting 관대)
app.use('/api/v1/system',
  rateLimitByTier({
    free: { requests: 20, window: 3600 },
    premium: { requests: 100, window: 3600 },
    pro: { requests: 1000, window: 3600 }
  }),
  logApiUsage('system_api', 1),
  systemRoutes
);

// 분석 라우트
app.use('/api/v1/analytics',
  rateLimitByTier({
    free: { requests: 50, window: 3600 },
    premium: { requests: 500, window: 3600 },
    pro: { requests: 5000, window: 3600 }
  }),
  logApiUsage('analytics_api', 3),
  analyticsRoutes
);

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
      'POST /api/v1/auth/signup',
      'POST /api/v1/auth/signin',
      'GET /api/v1/videos/search',
      'GET /api/v1/videos/trending',
      'POST /api/v1/videos/ai-search',
      'GET /api/v1/trends/keywords',
      'GET /api/v1/system/db-status',
      'GET /api/v1/system/health',
      'GET /api/v1/analytics/reports'
    ]
  });
});

// 전역 에러 핸들러
app.use((error, req, res, next) => {
  console.error('서버 에러:', error);

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
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error.message 
    })
  });
});

// ============================================
// 서버 시작 - server.js에서 처리
// ============================================

// Graceful shutdown 처리
process.on('SIGTERM', () => {
  console.log('SIGTERM 수신, 서버를 종료합니다...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT 수신, 서버를 종료합니다...');
  process.exit(0);
});

// server.js에서 서버 시작을 담당하므로 여기서는 app만 export
module.exports = app; 