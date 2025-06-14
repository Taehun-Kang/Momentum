import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyToken, optionalAuth } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

const router = express.Router();

// Supabase 클라이언트 (사용자 인증용) - 조건부 생성
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  console.log('✅ Auth Routes: Supabase 클라이언트 초기화 완료');
} else {
  console.warn('⚠️ Auth Routes: Supabase 환경변수가 설정되지 않았습니다');
}

/**
 * 간소화된 인증 API 라우트
 * 핵심 기능만 유지: 회원가입, 로그인, 로그아웃, 토큰 갱신, 기본 프로필
 * 
 * 보안 헤더는 server.js의 helmet과 cors에서 전역 처리됨
 */

// Supabase 연결 상태 확인 미들웨어
const checkSupabaseConnection = (req, res, next) => {
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: 'SERVICE_UNAVAILABLE', 
      message: '인증 서비스가 현재 사용할 수 없습니다. 관리자에게 문의해주세요.'
    });
  }
  next();
};

// ============================================
// 1. 핵심 인증 기능
// ============================================

/**
 * POST /api/v1/auth/signup
 * 회원가입
 */
router.post('/signup', checkSupabaseConnection, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: '이메일과 비밀번호는 필수입니다'
      });
    }

    // Supabase 회원가입
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0]
        }
      }
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        error: authError.code || 'SIGNUP_FAILED',
        message: authError.message || '회원가입에 실패했습니다'
      });
    }

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다. 이메일 인증을 확인해주세요.',
      data: {
        user: {
          id: authData.user?.id,
          email: authData.user?.email,
          name: authData.user?.user_metadata?.name,
          emailConfirmed: authData.user?.email_confirmed_at != null
        },
        session: authData.session
      }
    });

  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/v1/auth/signin
 * 로그인
 */
router.post('/signin', checkSupabaseConnection, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: '이메일과 비밀번호를 입력해주세요'
      });
    }

    // Supabase 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({
        success: false,
        error: authError.code || 'SIGNIN_FAILED',
        message: authError.message || '로그인에 실패했습니다'
      });
    }

    res.json({
      success: true,
      message: '로그인되었습니다',
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name,
          emailConfirmed: authData.user.email_confirmed_at != null
        },
        session: authData.session
      }
    });

  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/v1/auth/signout
 * 로그아웃
 */
router.post('/signout', verifyToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({
        success: true,
        message: '로그아웃되었습니다'
      });
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.code || 'SIGNOUT_FAILED',
        message: error.message || '로그아웃에 실패했습니다'
      });
    }

    res.json({
      success: true,
      message: '로그아웃되었습니다'
    });

  } catch (error) {
    console.error('로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * 토큰 갱신
 */
router.post('/refresh', checkSupabaseConnection, async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REFRESH_TOKEN',
        message: '리프레시 토큰이 필요합니다'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: error.code || 'REFRESH_FAILED',
        message: error.message || '토큰 갱신에 실패했습니다'
      });
    }

    res.json({
      success: true,
      data: {
        session: data.session,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name
        }
      }
    });

  } catch (error) {
    console.error('토큰 갱신 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다'
    });
  }
});

// ============================================
// 2. 기본 사용자 정보
// ============================================

/**
 * GET /api/v1/auth/me
 * 현재 사용자 정보 (토큰 있으면 조회, 없으면 null)
 */
router.get('/me', optionalAuth, async (req, res) => {
  try {
    if (!req.user || !supabase) {
      return res.json({
        success: true,
        data: { user: null }
      });
    }

    // Supabase에서 최신 사용자 정보 조회
    const { data: { user }, error } = await supabase.auth.getUser(
      req.headers.authorization?.substring(7)
    );

    if (error || !user) {
      return res.json({
        success: true,
        data: { user: null }
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name,
          emailConfirmed: user.email_confirmed_at != null,
          createdAt: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '사용자 정보 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * PUT /api/v1/auth/profile
 * 기본 프로필 업데이트
 */
router.put('/profile', verifyToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: '프로필 업데이트 서비스가 현재 사용할 수 없습니다'
      });
    }

    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_NAME',
        message: '이름을 입력해주세요'
      });
    }

    // Supabase 사용자 메타데이터 업데이트
    const { data, error } = await supabase.auth.updateUser({
      data: { name: name.trim() }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.code || 'UPDATE_FAILED',
        message: error.message || '프로필 업데이트에 실패했습니다'
      });
    }

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name,
          emailConfirmed: data.user.email_confirmed_at != null
        }
      }
    });

  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '프로필 업데이트 중 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/v1/auth/reset-password
 * 비밀번호 재설정 요청 (간소화 버전)
 */
router.post('/reset-password', checkSupabaseConnection, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_EMAIL',
        message: '이메일을 입력해주세요'
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.code || 'RESET_FAILED',
        message: error.message || '비밀번호 재설정 요청에 실패했습니다'
      });
    }

    res.json({
      success: true,
      message: '비밀번호 재설정 링크가 이메일로 전송되었습니다'
    });

  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다'
    });
  }
});

export default router; 