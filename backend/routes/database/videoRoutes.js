/**
 * 📺 Video Database Routes - 영상 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/videos_db/*
 * 기능: videoService.js의 21개 함수를 모두 HTTP API로 노출
 * 
 * 엔드포인트 그룹:
 * - 영상 캐시 관리 (6개)
 * - 채널 정보 관리 (4개)
 * - 영상 검색 및 필터링 (5개)
 * - 통계 및 분석 (4개)
 * - 유틸리티 및 관리 (2개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import videoService from '../../services/database/videoService.js';

const router = express.Router();

// ============================================================================
// 📺 영상 캐시 관리 (6개 엔드포인트)
// ============================================================================

/**
 * POST /api/videos_db/cache
 * 영상 캐시 저장
 */
router.post('/cache', async (req, res) => {
  try {
    const result = await videoService.cacheVideoInfo(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/cache/:videoId
 * 영상 캐시 조회
 */
router.get('/cache/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const result = await videoService.getCachedVideoInfo(videoId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/videos_db/cache/:videoId
 * 영상 캐시 업데이트
 */
router.put('/cache/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const result = await videoService.updateVideoCache(videoId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/videos_db/cache/:videoId
 * 영상 캐시 삭제
 */
router.delete('/cache/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const result = await videoService.deleteVideoCache(videoId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/videos_db/cache/bulk
 * 영상 일괄 캐시 저장
 */
router.post('/cache/bulk', async (req, res) => {
  try {
    const result = await videoService.bulkCacheVideos(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/cache/check/:videoId
 * 영상 캐시 존재 확인
 */
router.get('/cache/check/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const result = await videoService.checkVideoInCache(videoId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎬 채널 정보 관리 (4개 엔드포인트)
// ============================================================================

/**
 * POST /api/videos_db/channels
 * 채널 정보 저장
 */
router.post('/channels', async (req, res) => {
  try {
    const result = await videoService.saveChannelInfo(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/channels/:channelId
 * 채널 정보 조회
 */
router.get('/channels/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const result = await videoService.getChannelInfo(channelId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/videos_db/channels/:channelId
 * 채널 정보 업데이트
 */
router.put('/channels/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const result = await videoService.updateChannelInfo(channelId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/channels/search
 * 채널 검색
 */
router.get('/channels/search', async (req, res) => {
  try {
    const result = await videoService.searchChannels(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🔍 영상 검색 및 필터링 (5개 엔드포인트)
// ============================================================================

/**
 * GET /api/videos_db/search
 * 영상 검색
 */
router.get('/search', async (req, res) => {
  try {
    const result = await videoService.searchVideos(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/category/:category
 * 카테고리별 영상 조회
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const result = await videoService.getVideosByCategory(category, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/duration/:durationType
 * 길이별 영상 조회
 */
router.get('/duration/:durationType', async (req, res) => {
  try {
    const { durationType } = req.params;
    const result = await videoService.getVideosByDuration(durationType, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/playable
 * 재생 가능한 영상 조회
 */
router.get('/playable', async (req, res) => {
  try {
    const result = await videoService.getPlayableVideos(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/popular
 * 인기 영상 조회
 */
router.get('/popular', async (req, res) => {
  try {
    const result = await videoService.getPopularVideos(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 통계 및 분석 (4개 엔드포인트)
// ============================================================================

/**
 * GET /api/videos_db/analytics/cache
 * 영상 캐시 통계 조회
 */
router.get('/analytics/cache', async (req, res) => {
  try {
    const result = await videoService.getVideoCacheStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/analytics/channels
 * 채널 통계 조회
 */
router.get('/analytics/channels', async (req, res) => {
  try {
    const result = await videoService.getChannelStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/analytics/categories
 * 카테고리별 통계 조회
 */
router.get('/analytics/categories', async (req, res) => {
  try {
    const result = await videoService.getCategoryStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/analytics/performance
 * 영상 성능 분석
 */
router.get('/analytics/performance', async (req, res) => {
  try {
    const result = await videoService.analyzeVideoPerformance(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 기능 (2개 엔드포인트)
// ============================================================================

/**
 * DELETE /api/videos_db/cleanup/expired
 * 만료된 영상 캐시 정리
 */
router.delete('/cleanup/expired', async (req, res) => {
  try {
    const result = await videoService.cleanupExpiredVideos();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/dashboard
 * 영상 서비스 대시보드 데이터
 */
router.get('/dashboard', async (req, res) => {
  try {
    const result = await videoService.getVideoDashboard();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 