import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 환경변수 로드 (authMiddleware가 먼저 로드될 수 있으므로)
dotenv.config();

/**
 * Supabase 인증 미들웨어 (핵심 기능 + Database Routes 보안)
 * - verifyToken: 필수 인증
 * - optionalAuth: 선택적 인증
 * - verifyDbAccess: Database Routes 접근 제어 (신규)
 * - verifyOwnership: 본인 데이터만 접근 (신규)
 * - verifyAdmin: 관리자 권한 체크 (신규)
 */
class AuthMiddleware {
  constructor() {
    // Supabase 설정이 있을 때만 클라이언트 생성
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      console.log('✅ Supabase Auth 미들웨어 초기화 완료');
    } else {
      console.warn('⚠️ Supabase 환경변수가 설정되지 않았습니다. 인증 기능이 비활성화됩니다.');
      this.supabase = null;
    }
  }

  /**
   * JWT 토큰 검증 미들웨어 (필수 인증)
   * Supabase Auth JWT 토큰을 검증합니다
   */
  verifyToken = async (req, res, next) => {
    try {
      // Supabase가 설정되지 않았으면 에러 반환
      if (!this.supabase) {
        return res.status(503).json({
          success: false,
          error: 'SERVICE_UNAVAILABLE',
          message: '인증 서비스가 설정되지 않았습니다'
        });
      }

      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '인증 토큰이 필요합니다'
        });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_TOKEN',
          message: '유효하지 않은 토큰입니다'
        });
      }

      // 기본 사용자 정보만 설정
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role || 'authenticated'
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
      // Supabase가 설정되지 않았으면 익명으로 처리
      if (!this.supabase) {
        req.user = null;
        return next();
      }

      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
      }

      const token = authHeader.substring(7);
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        req.user = null;
        return next();
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role || 'authenticated'
      };

      next();
    } catch (error) {
      console.error('선택적 인증 오류:', error);
      req.user = null;
      next();
    }
  };

  /**
   * 🔒 Database Routes 접근 제어 (신규)
   * 인증된 사용자만 Database API에 접근 가능
   */
  verifyDbAccess = async (req, res, next) => {
    try {
      // 개발 환경에서는 인증 우회 옵션
      if (process.env.NODE_ENV === 'development' && process.env.BYPASS_DB_AUTH === 'true') {
        console.log('🧪 개발 모드: DB 인증 우회');
        return next();
      }

      // 기본 토큰 검증 먼저 실행
      await this.verifyToken(req, res, (error) => {
        if (error) return;
        
        // 추가 DB 접근 권한 체크
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'DB_ACCESS_DENIED',
            message: 'Database API 접근 권한이 없습니다'
          });
        }

        console.log(`🔒 DB 접근 허용: ${req.user.email} → ${req.method} ${req.originalUrl}`);
        next();
      });
    } catch (error) {
      console.error('DB 접근 권한 확인 오류:', error);
      res.status(500).json({
        success: false,
        error: 'DB_ACCESS_ERROR',
        message: 'DB 접근 권한 확인 중 오류가 발생했습니다'
      });
    }
  };

  /**
   * 👤 본인 데이터 접근 검증 (신규)
   * URL의 userId가 현재 사용자와 일치하는지 확인
   */
  verifyOwnership = async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '인증이 필요합니다'
        });
      }

      if (userId && userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'ACCESS_FORBIDDEN',
          message: '본인의 데이터만 접근할 수 있습니다'
        });
      }

      console.log(`👤 본인 데이터 접근 허용: ${req.user.email}`);
      next();
    } catch (error) {
      console.error('소유권 확인 오류:', error);
      res.status(500).json({
        success: false,
        error: 'OWNERSHIP_ERROR',
        message: '소유권 확인 중 오류가 발생했습니다'
      });
    }
  };

  /**
   * 🛡️ 관리자 권한 체크 (신규)
   * 시스템 관리 API 접근용
   */
  verifyAdmin = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '인증이 필요합니다'
        });
      }

      // 관리자 이메일 체크 (환경변수로 설정)
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
      const isAdmin = adminEmails.includes(req.user.email) || req.user.role === 'admin';

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'ADMIN_REQUIRED',
          message: '관리자 권한이 필요합니다'
        });
      }

      console.log(`🛡️ 관리자 접근 허용: ${req.user.email} → ${req.originalUrl}`);
      next();
    } catch (error) {
      console.error('관리자 권한 확인 오류:', error);
      res.status(500).json({
        success: false,
        error: 'ADMIN_ERROR',
        message: '관리자 권한 확인 중 오류가 발생했습니다'
      });
    }
  };

  /**
   * 🔄 Rate Limiting for Database APIs (신규)
   * Database API 전용 속도 제한
   */
  rateLimit = {
    windowMs: 15 * 60 * 1000, // 15분
    max: 1000, // IP당 최대 요청 수 (Database API는 더 높게)
    message: {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many database requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  };
}

// 싱글톤 인스턴스 생성
const authMiddleware = new AuthMiddleware();

// 기존 미들웨어 내보내기
export const verifyToken = authMiddleware.verifyToken;
export const optionalAuth = authMiddleware.optionalAuth; 

// 신규 Database Routes 보안 미들웨어 내보내기
export const verifyDbAccess = authMiddleware.verifyDbAccess;
export const verifyOwnership = authMiddleware.verifyOwnership;
export const verifyAdmin = authMiddleware.verifyAdmin;
export const dbRateLimit = authMiddleware.rateLimit; 