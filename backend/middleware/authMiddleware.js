import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 환경변수 로드 (authMiddleware가 먼저 로드될 수 있으므로)
dotenv.config();

/**
 * Supabase 인증 미들웨어 (핵심 기능만)
 * - verifyToken: 필수 인증
 * - optionalAuth: 선택적 인증
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
}

// 싱글톤 인스턴스 생성
const authMiddleware = new AuthMiddleware();

export const verifyToken = authMiddleware.verifyToken;
export const optionalAuth = authMiddleware.optionalAuth; 