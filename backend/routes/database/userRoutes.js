/**
 * 👤 User Database Routes - 사용자 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/users_db/*
 * 기능: userService.js의 실제 구현된 25개 함수를 HTTP API로 노출
 * 
 * 실제 구현된 함수 그룹:
 * - 사용자 프로필 관리 (7개)
 * - 키워드 선호도 관리 (5개) 
 * - 영상 상호작용 관리 (4개)
 * - 사용자 분석 및 통계 (6개)
 * - 유틸리티 및 관리 (3개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import * as userService from '../../services/database/userService.js';

const router = express.Router();

// ============================================================================
// 👤 사용자 프로필 관리 (7개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/users_db/profile
 * 사용자 프로필 생성
 */
router.post('/profile', async (req, res) => {
  try {
    const result = await userService.createUserProfile(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/profile/:userId
 * 사용자 프로필 조회
 */
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserProfile(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/profile/:userId/summary
 * 사용자 프로필 요약 조회 (DB 함수 활용)
 */
router.get('/profile/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserProfileSummary(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users_db/profile/:userId
 * 사용자 프로필 업데이트
 */
router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.updateUserProfile(userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users_db/profile/:userId/preferences
 * 사용자 설정(preferences) 업데이트
 */
router.put('/profile/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.updateUserPreferences(userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users_db/profile/:userId/tier
 * 사용자 티어 업데이트
 */
router.put('/profile/:userId/tier', async (req, res) => {
  try {
    const { userId } = req.params;
    const { tier, expiresAt } = req.body;
    const result = await userService.updateUserTier(userId, tier, expiresAt);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/users_db/profile/:userId
 * 사용자 프로필 삭제
 */
router.delete('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.deleteUserProfile(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🏷️ 키워드 선호도 관리 (5개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * GET /api/users_db/:userId/keyword-preferences
 * 키워드 선호도 조회 (기본)
 */
router.get('/:userId/keyword-preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getKeywordPreferences(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/keyword-preferences/detailed
 * 사용자 선호 키워드 상세 조회 (DB 함수 활용)
 */
router.get('/:userId/keyword-preferences/detailed', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit || 10;
    const result = await userService.getUserPreferencesDetailed(userId, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users_db/:userId/keyword-preferences/upsert
 * 키워드 선호도 업데이트 (DB 함수 활용)
 */
router.post('/:userId/keyword-preferences/upsert', async (req, res) => {
  try {
    const { userId } = req.params;
    const { keyword, incrementSelection } = req.body;
    const result = await userService.upsertKeywordPreference(userId, keyword, incrementSelection);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users_db/:userId/keyword-preferences
 * 키워드 선호도 수동 생성/업데이트
 */
router.post('/:userId/keyword-preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferenceData = { user_id: userId, ...req.body };
    const result = await userService.createOrUpdateKeywordPreference(preferenceData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users_db/:userId/keyword-preferences/:keyword/block
 * 키워드 차단/해제
 */
router.put('/:userId/keyword-preferences/:keyword/block', async (req, res) => {
  try {
    const { userId, keyword } = req.params;
    const { isBlocked, blockReason } = req.body;
    const result = await userService.blockUnblockKeyword(userId, keyword, isBlocked, blockReason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📺 영상 상호작용 관리 (4개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/users_db/:userId/video-interactions
 * 영상 상호작용 기록 생성
 */
router.post('/:userId/video-interactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const interactionData = { user_id: userId, ...req.body };
    const result = await userService.createVideoInteraction(interactionData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/video-interactions
 * 사용자 영상 상호작용 조회
 */
router.get('/:userId/video-interactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserVideoInteractions(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/video-interactions/:videoId
 * 특정 영상에 대한 사용자 상호작용 조회
 */
router.get('/:userId/video-interactions/:videoId', async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const result = await userService.getUserVideoInteractionsByVideo(userId, videoId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/watching-stats
 * 사용자 시청 통계
 */
router.get('/:userId/watching-stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const days = req.query.days || 30;
    const result = await userService.getUserWatchingStats(userId, days);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 사용자 분석 및 통계 (6개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * GET /api/users_db/profiles
 * 활성 사용자 프로필 조회
 */
router.get('/profiles', async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const result = await userService.getActiveUserProfiles(limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/keyword-preferences/popular
 * 인기 키워드 선호도 조회
 */
router.get('/keyword-preferences/popular', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const result = await userService.getPopularKeywordPreferences(limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/behavior-summary
 * 사용자 행동 요약 (또는 전체 사용자)
 */
router.get('/:userId/behavior-summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit || 50;
    const result = await userService.getUserBehaviorSummary(userId, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users_db/:userId/activity
 * 사용자 활동 업데이트
 */
router.post('/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.updateUserActivity(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/ai-search-quota
 * AI 검색 할당량 확인 (및 사용량 증가)
 */
router.get('/:userId/ai-search-quota', async (req, res) => {
  try {
    const { userId } = req.params;
    const incrementUsage = req.query.increment === 'true';
    const result = await userService.checkAiSearchQuota(userId, incrementUsage);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users_db/:userId/personalization-score
 * 개인화 점수 계산 및 업데이트 (DB 함수 활용)
 */
router.post('/:userId/personalization-score', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.calculatePersonalizationScore(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 기능 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/users_db/:userId/onboarding
 * 온보딩 완료 처리
 */
router.post('/:userId/onboarding', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.completeOnboarding(userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/search
 * 사용자 검색
 */
router.get('/search', async (req, res) => {
  try {
    // query 파라미터를 display_name으로 매핑
    const searchParams = {
      ...req.query,
      display_name: req.query.query || req.query.display_name
    };
    
    const result = await userService.searchUsers(searchParams);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/exists
 * 사용자 존재 여부 확인
 */
router.get('/:userId/exists', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.checkUserExists(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 