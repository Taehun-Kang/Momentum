const { createClient } = require('@supabase/supabase-js');
const supabaseService = require('../services/supabaseService');

/**
 * Supabase 인증 미들웨어
 * JWT 토큰 검증 및 사용자 인증 처리
 * Wave Team - Momentum 프로젝트
 */
class AuthMiddleware {
  constructor() {
    // Supabase 클라이언트 (토큰 검증용)
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * JWT 토큰 검증 미들웨어
   */
  verifyToken = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '인증 토큰이 필요합니다'
        });
      }

      const token = authHeader.substring(7); // 'Bearer ' 제거

      // Supabase JWT 토큰 검증
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_TOKEN',
          message: '유효하지 않은 토큰입니다'
        });
      }

      // 사용자 프로필 조회 (없으면 기본 프로필 생성)
      let userProfile = await supabaseService.getUserProfile(user.id);
      
      if (!userProfile) {
        userProfile = await supabaseService.upsertUserProfile(user.id, {
          display_name: user.user_metadata?.name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url,
          user_tier: 'free',
          preferences: {
            categories: ['일반'],
            language: 'ko',
            theme: 'light'
          }
        });
      }

      // req 객체에 사용자 정보 추가
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        ...userProfile
      };

      next();
    } catch (error) {
      console.error('토큰 검증 오류:', error);
      res.status(500).json({
        success: false,
        error: 'AUTH_ERROR',
        message: '인증 처리 중 오류가 발생했습니다'
      });
    }
  };

  /**
   * 선택적 인증 미들웨어 (토큰이 있으면 검증, 없어도 통과)
   */
  optionalAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // 토큰이 없으면 익명 사용자로 처리
        req.user = null;
        return next();
      }

      const token = authHeader.substring(7);
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        // 잘못된 토큰이면 익명 사용자로 처리
        req.user = null;
        return next();
      }

      // 유효한 토큰이면 사용자 정보 설정
      const userProfile = await supabaseService.getUserProfile(user.id);
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        ...userProfile
      };

      next();
    } catch (error) {
      console.error('선택적 인증 오류:', error);
      // 오류가 발생해도 익명 사용자로 처리
      req.user = null;
      next();
    }
  };

  /**
   * 프리미엄 사용자 전용 미들웨어
   */
  requirePremium = async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      });
    }

    if (req.user.user_tier === 'free') {
      return res.status(403).json({
        success: false,
        error: 'PREMIUM_REQUIRED',
        message: '프리미엄 회원 전용 기능입니다',
        upgradeUrl: '/upgrade'
      });
    }

    next();
  };

  /**
   * 관리자 전용 미들웨어
   */
  requireAdmin = async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      });
    }

    if (req.user.role !== 'service_role') {
      return res.status(403).json({
        success: false,
        error: 'ADMIN_REQUIRED',
        message: '관리자 권한이 필요합니다'
      });
    }

    next();
  };

  /**
   * 사용자 검색 패턴 업데이트
   */
  updateSearchPattern = async (req, res, next) => {
    // 응답 후 검색 패턴 업데이트
    res.on('finish', async () => {
      try {
        if (req.user && req.body.keywords) {
          const timeContext = {
            hour: new Date().getHours(),
            isWeekend: [0, 6].includes(new Date().getDay())
          };

          await supabaseService.updateUserSearchPattern(
            req.user.id,
            req.body.keywords,
            timeContext
          );
        }
      } catch (error) {
        console.error('검색 패턴 업데이트 실패:', error);
      }
    });

    next();
  };

  /**
   * 사용량 추적 미들웨어 (Rate Limiting + API 사용량 로깅 조합)
   */
  trackUsage = (options = {}) => {
    const {
      quotaCategory = 'general',
      unitsConsumed = 1,
      enableRateLimit = true,
      rateLimits = {}
    } = options;

    return async (req, res, next) => {
      const startTime = Date.now();

      try {
        // 1. Rate Limiting (선택사항)
        if (enableRateLimit) {
          const userId = req.user?.id || req.ip;
          const userTier = req.user?.user_tier || 'free';
          
          const defaultLimits = {
            free: { requests: 100, window: 3600 },
            premium: { requests: 1000, window: 3600 },
            pro: { requests: 10000, window: 3600 }
          };

          const limits = { ...defaultLimits, ...rateLimits };
          const limit = limits[userTier];

          // 간단한 메모리 기반 Rate Limiting (프로덕션에서는 Redis 권장)
          if (!this.requestCounts) this.requestCounts = new Map();
          
          const now = Date.now();
          const windowStart = now - (limit.window * 1000);
          
          let userRequests = this.requestCounts.get(userId) || [];
          userRequests = userRequests.filter(timestamp => timestamp > windowStart);
          
          if (userRequests.length >= limit.requests) {
            return res.status(429).json({
              success: false,
              error: 'RATE_LIMIT_EXCEEDED',
              message: `요청 한도 초과. ${userTier} 티어는 ${limit.window/3600}시간에 ${limit.requests}회까지 가능합니다.`,
              retryAfter: Math.ceil((userRequests[0] - windowStart) / 1000)
            });
          }

          userRequests.push(now);
          this.requestCounts.set(userId, userRequests);

          // 헤더 설정
          res.set({
            'X-RateLimit-Limit': limit.requests,
            'X-RateLimit-Remaining': limit.requests - userRequests.length,
            'X-RateLimit-Reset': Math.ceil((windowStart + limit.window * 1000) / 1000)
          });
        }

        // 2. API 사용량 로깅 (응답 후)
        res.on('finish', async () => {
          try {
            const responseTime = Date.now() - startTime;
            
            await supabaseService.logApiUsage({
              apiName: 'momentum_api',
              endpoint: req.originalUrl,
              method: req.method,
              unitsConsumed,
              quotaCategory,
              responseTime,
              statusCode: res.statusCode,
              errorMessage: res.statusCode >= 400 ? 'API Error' : null,
              requestParams: {
                query: req.query,
                body: req.method === 'POST' ? req.body : undefined,
                userAgent: req.headers['user-agent'],
                userId: req.user?.id
              }
            });
          } catch (error) {
            console.error('API 사용량 로깅 실패:', error);
          }
        });

        next();
      } catch (error) {
        console.error('사용량 추적 미들웨어 오류:', error);
        next(); // 오류가 발생해도 계속 진행
      }
    };
  };

  /**
   * CORS 및 보안 헤더 설정
   */
  securityHeaders = (req, res, next) => {
    // CORS 헤더
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    // 보안 헤더
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  };

  /**
   * 세션 생성 및 추적
   */
  createSession = async (req, res, next) => {
    // 세션 ID 생성 (실제로는 더 안전한 방법 사용)
    req.sessionId = req.headers['x-session-id'] || 
                   `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 응답 헤더에 세션 ID 추가
    res.set('X-Session-Id', req.sessionId);

    next();
  };
}

// 싱글톤 인스턴스 내보내기
const authMiddleware = new AuthMiddleware();

module.exports = {
  verifyToken: authMiddleware.verifyToken,
  optionalAuth: authMiddleware.optionalAuth,
  requirePremium: authMiddleware.requirePremium,
  requireAdmin: authMiddleware.requireAdmin,
  trackUsage: authMiddleware.trackUsage,
  securityHeaders: authMiddleware.securityHeaders,
  createSession: authMiddleware.createSession,
  updateSearchPattern: authMiddleware.updateSearchPattern
}; 