/**
 * 👤 User Database Routes - 사용자 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/users_db/*
 * 기능: userService.js의 32개 함수를 모두 HTTP API로 노출
 * 
 * 엔드포인트 그룹:
 * - 사용자 프로필 관리 (8개)
 * - 키워드 선호도 관리 (6개) 
 * - 영상 상호작용 관리 (8개)
 * - 사용자 분석 및 통계 (7개)
 * - 유틸리티 및 관리 (3개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import userService from '../../services/database/userService.js';

const router = express.Router();

// ============================================================================
// 👤 사용자 프로필 관리 (8개 엔드포인트)
// ============================================================================

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

/**
 * GET /api/users_db/profiles
 * 모든 사용자 프로필 조회
 */
router.get('/profiles', async (req, res) => {
  try {
    const result = await userService.getAllUserProfiles(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/profile/:userId/settings
 * 사용자 설정 조회
 */
router.get('/profile/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserSettings(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users_db/profile/:userId/settings
 * 사용자 설정 업데이트
 */
router.put('/profile/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.updateUserSettings(userId, req.body);
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
    const result = await userService.searchUsers(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🏷️ 키워드 선호도 관리 (6개 엔드포인트)
// ============================================================================

/**
 * GET /api/users_db/:userId/keyword-preferences
 * 사용자 키워드 선호도 조회
 */
router.get('/:userId/keyword-preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserKeywordPreferences(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users_db/:userId/keyword-preferences
 * 키워드 선호도 추가
 */
router.post('/:userId/keyword-preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.addKeywordPreference(userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users_db/:userId/keyword-preferences/:preferenceId
 * 키워드 선호도 업데이트
 */
router.put('/:userId/keyword-preferences/:preferenceId', async (req, res) => {
  try {
    const { preferenceId } = req.params;
    const result = await userService.updateKeywordPreference(preferenceId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/users_db/:userId/keyword-preferences/:preferenceId
 * 키워드 선호도 삭제
 */
router.delete('/:userId/keyword-preferences/:preferenceId', async (req, res) => {
  try {
    const { preferenceId } = req.params;
    const result = await userService.removeKeywordPreference(preferenceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/preferred-keywords
 * 사용자 선호 키워드 목록 조회
 */
router.get('/:userId/preferred-keywords', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserPreferredKeywords(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users_db/:userId/keyword-preferences/bulk
 * 키워드 선호도 일괄 업데이트
 */
router.put('/:userId/keyword-preferences/bulk', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.bulkUpdateKeywordPreferences(userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📺 영상 상호작용 관리 (8개 엔드포인트)
// ============================================================================

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
 * POST /api/users_db/:userId/video-interactions
 * 영상 상호작용 기록
 */
router.post('/:userId/video-interactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.recordVideoInteraction({ userId, ...req.body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users_db/:userId/video-interactions/:interactionId
 * 영상 상호작용 업데이트
 */
router.put('/:userId/video-interactions/:interactionId', async (req, res) => {
  try {
    const { interactionId } = req.params;
    const result = await userService.updateVideoInteraction(interactionId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/users_db/:userId/video-interactions/:interactionId
 * 영상 상호작용 삭제
 */
router.delete('/:userId/video-interactions/:interactionId', async (req, res) => {
  try {
    const { interactionId } = req.params;
    const result = await userService.deleteVideoInteraction(interactionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/favorite-videos
 * 즐겨찾기 영상 조회
 */
router.get('/:userId/favorite-videos', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getFavoriteVideos(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users_db/:userId/favorite-videos
 * 즐겨찾기 영상 추가
 */
router.post('/:userId/favorite-videos', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.addFavoriteVideo(userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/users_db/:userId/favorite-videos/:videoId
 * 즐겨찾기 영상 삭제
 */
router.delete('/:userId/favorite-videos/:videoId', async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const result = await userService.removeFavoriteVideo(userId, videoId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/watch-history
 * 시청 히스토리 조회
 */
router.get('/:userId/watch-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getWatchHistory(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 사용자 분석 및 통계 (7개 엔드포인트)
// ============================================================================

/**
 * GET /api/users_db/:userId/analytics/dashboard
 * 사용자 대시보드 데이터
 */
router.get('/:userId/analytics/dashboard', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserDashboard(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/analytics/activity
 * 사용자 활동 통계
 */
router.get('/:userId/analytics/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserActivityStats(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/analytics/preferences
 * 사용자 선호도 분석
 */
router.get('/:userId/analytics/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.analyzeUserPreferences(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/analytics/patterns
 * 사용자 패턴 분석
 */
router.get('/:userId/analytics/patterns', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserBehaviorPatterns(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/recommendations
 * 사용자 맞춤 추천
 */
router.get('/:userId/recommendations', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.generateUserRecommendations(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/:userId/similar-users
 * 유사 사용자 찾기
 */
router.get('/:userId/similar-users', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.findSimilarUsers(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users_db/:userId/analytics/engagement
 * 사용자 참여도 업데이트
 */
router.post('/:userId/analytics/engagement', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.updateUserEngagement(userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 기능 (3개 엔드포인트)
// ============================================================================

/**
 * DELETE /api/users_db/cleanup/inactive
 * 비활성 사용자 정리
 */
router.delete('/cleanup/inactive', async (req, res) => {
  try {
    const result = await userService.cleanupInactiveUsers(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users_db/analytics/recalculate
 * 사용자 통계 재계산
 */
router.post('/analytics/recalculate', async (req, res) => {
  try {
    const result = await userService.recalculateUserStats(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users_db/analytics/summary
 * 전체 사용자 요약 통계
 */
router.get('/analytics/summary', async (req, res) => {
  try {
    const result = await userService.getUsersSummaryStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 