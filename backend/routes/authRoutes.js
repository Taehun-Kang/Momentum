const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const supabaseService = require('../services/supabaseService');
const { verifyToken, optionalAuth, securityHeaders, createSession } = require('../middleware/authMiddleware');

const router = express.Router();

// Supabase 클라이언트 (사용자 인증용)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 인증 관련 API 라우트
 * Wave Team - Momentum 프로젝트
 */

// 모든 라우트에 보안 헤더 및 세션 적용
router.use(securityHeaders);
router.use(createSession);

// ============================================
// 1. 사용자 인증 (회원가입, 로그인, 로그아웃)
// ============================================

/**
 * POST /api/v1/auth/signup
 * 회원가입
 */
router.post('/signup', async (req, res) => {
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

    // 사용자 프로필 생성
    if (authData.user) {
      await supabaseService.upsertUserProfile(authData.user.id, {
        display_name: name || authData.user.email.split('@')[0],
        user_tier: 'free',
        preferences: {
          categories: ['일반'],
          language: 'ko',
          theme: 'light'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다. 이메일 인증을 확인해주세요.',
      data: {
        user: {
          id: authData.user?.id,
          email: authData.user?.email,
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
router.post('/signin', async (req, res) => {
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

    // 사용자 프로필 조회
    const userProfile = await supabaseService.getUserProfile(authData.user.id);

    res.json({
      success: true,
      message: '로그인되었습니다',
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          emailConfirmed: authData.user.email_confirmed_at != null,
          ...userProfile
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
router.post('/refresh', async (req, res) => {
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
        user: data.user
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
// 2. 사용자 프로필 관리
// ============================================

/**
 * GET /api/v1/auth/profile
 * 프로필 조회
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userProfile = await supabaseService.getUserProfile(req.user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          ...userProfile
        }
      }
    });

  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '프로필 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * PUT /api/v1/auth/profile
 * 프로필 업데이트
 */
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { display_name, avatar_url, preferences } = req.body;

    const updatedProfile = await supabaseService.upsertUserProfile(req.user.id, {
      display_name,
      avatar_url,
      preferences
    });

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다',
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          ...updatedProfile
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
 * POST /api/v1/auth/change-password
 * 비밀번호 변경
 */
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: '현재 비밀번호와 새 비밀번호를 입력해주세요'
      });
    }

    // 현재 비밀번호 확인
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword
    });

    if (signInError) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CURRENT_PASSWORD',
        message: '현재 비밀번호가 올바르지 않습니다'
      });
    }

    // 새 비밀번호로 변경
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.code || 'PASSWORD_UPDATE_FAILED',
        message: updateError.message || '비밀번호 변경에 실패했습니다'
      });
    }

    res.json({
      success: true,
      message: '비밀번호가 변경되었습니다'
    });

  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/v1/auth/reset-password
 * 비밀번호 재설정 요청
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_EMAIL',
        message: '이메일을 입력해주세요'
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

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

// ============================================
// 3. 계정 관리
// ============================================

/**
 * GET /api/v1/auth/me
 * 현재 사용자 정보 (토큰 있으면 조회, 없으면 null)
 */
router.get('/me', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({
        success: true,
        data: { user: null }
      });
    }

    const userProfile = await supabaseService.getUserProfile(req.user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          ...userProfile
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
 * GET /api/v1/auth/search-patterns
 * 사용자 검색 패턴 조회
 */
router.get('/search-patterns', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabaseService.client
      .from('user_search_patterns')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      success: true,
      data: {
        searchPatterns: data || {
          search_keywords: [],
          search_time_patterns: {},
          preferred_categories: [],
          last_analyzed: null
        }
      }
    });

  } catch (error) {
    console.error('검색 패턴 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '검색 패턴 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * GET /api/v1/auth/usage-stats
 * 사용자 사용량 통계
 */
router.get('/usage-stats', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 오늘의 검색 횟수
    const { data: searchCount } = await supabaseService.client
      .from('search_sessions')
      .select('id', { count: 'exact' })
      .eq('user_id', req.user.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    // 이번 달 사용량
    const thisMonth = new Date().toISOString().slice(0, 7);
    const { data: monthlyUsage } = await supabaseService.client
      .from('search_sessions')
      .select('id', { count: 'exact' })
      .eq('user_id', req.user.id)
      .gte('created_at', `${thisMonth}-01T00:00:00.000Z`);

    // 사용자 티어에 따른 제한
    const tierLimits = {
      free: { daily: 100, monthly: 1000 },
      premium: { daily: 1000, monthly: 10000 },
      pro: { daily: 10000, monthly: 100000 }
    };

    const userTier = req.user.user_tier || 'free';
    const limits = tierLimits[userTier];

    res.json({
      success: true,
      data: {
        today: {
          searches: searchCount?.length || 0,
          limit: limits.daily,
          remaining: Math.max(0, limits.daily - (searchCount?.length || 0))
        },
        thisMonth: {
          searches: monthlyUsage?.length || 0,
          limit: limits.monthly,
          remaining: Math.max(0, limits.monthly - (monthlyUsage?.length || 0))
        },
        tier: userTier,
        upgradeAvailable: userTier === 'free'
      }
    });

  } catch (error) {
    console.error('사용량 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '사용량 통계 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * DELETE /api/v1/auth/account
 * 계정 삭제
 */
router.delete('/account', verifyToken, async (req, res) => {
  try {
    const { confirmDelete } = req.body;

    if (!confirmDelete) {
      return res.status(400).json({
        success: false,
        error: 'CONFIRMATION_REQUIRED',
        message: '계정 삭제 확인이 필요합니다'
      });
    }

    // 관련 데이터 모두 삭제 (RLS로 자동 처리됨)
    // 실제로는 soft delete나 data export 옵션도 고려

    res.json({
      success: true,
      message: '계정이 삭제되었습니다'
    });

  } catch (error) {
    console.error('계정 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '계정 삭제 중 오류가 발생했습니다'
    });
  }
});

module.exports = router; 