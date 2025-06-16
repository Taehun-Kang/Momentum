/**
 * 📺 Videos Database Routes - 영상 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/videos_db/*
 * 기능: videoService.js의 실제 구현된 21개 함수를 HTTP API로 노출
 * 
 * 실제 구현된 함수 그룹:
 * - 영상 캐시 관리 (5개)
 * - 영상 검색 및 필터링 (3개) 
 * - 채널 정보 관리 (7개)
 * - 영상 품질 및 상태 관리 (3개)
 * - 유틸리티 및 관리 (3개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import * as videoService from '../../services/database/videoService.js';

const router = express.Router();

// ============================================================================
// 💾 영상 캐시 관리 (5개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/videos_db/cache
 * 영상 데이터 캐시 저장
 */
router.post('/cache', async (req, res) => {
  try {
    const result = await videoService.cacheVideoData(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/videos_db/cache/batch-save
 * 여러 영상 배치 저장 (신규 추가 - Rate Limiting 해결)
 */
router.post('/cache/batch-save', async (req, res) => {
  try {
    const { videos } = req.body;
    
    if (!Array.isArray(videos)) {
      return res.status(400).json({
        success: false,
        error: 'videos 필드는 배열이어야 합니다'
      });
    }

    const result = await videoService.saveVideosBatch(videos);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/cache/:videoId
 * 캐시된 영상 정보 조회 (조회수 증가 옵션)
 */
router.get('/cache/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const incrementHit = req.query.increment_hit !== 'false';
    const result = await videoService.getCachedVideo(videoId, incrementHit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/videos_db/cache/batch
 * 여러 영상 캐시 정보 일괄 조회
 */
router.post('/cache/batch', async (req, res) => {
  try {
    const { videoIds } = req.body;
    const result = await videoService.getCachedVideos(videoIds);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/videos_db/cache/batch-check
 * 기존 영상 존재 여부 확인 (UPSERT 방식용)
 */
router.post('/cache/batch-check', async (req, res) => {
  try {
    const { video_ids } = req.body;
    
    if (!Array.isArray(video_ids)) {
      return res.status(400).json({
        success: false,
        error: 'video_ids 필드는 배열이어야 합니다'
      });
    }

    const result = await videoService.checkExistingVideos(video_ids);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/analytics/cache
 * 캐시 통계 조회
 */
router.get('/analytics/cache', async (req, res) => {
  try {
    const result = await videoService.getCacheStatistics();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/videos_db/cache/cleanup
 * 만료된 영상 캐시 정리
 */
router.delete('/cache/cleanup', async (req, res) => {
  try {
    const result = await videoService.cleanupExpiredVideoCache();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🔍 영상 검색 및 필터링 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * GET /api/videos_db/playable-quality-shorts
 * 재생 가능한 고품질 Shorts 조회
 */
router.get('/playable-quality-shorts', async (req, res) => {
  try {
    const result = await videoService.getPlayableQualityShorts(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/trending
 * 트렌딩 Shorts 조회
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const result = await videoService.getTrendingShorts(limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/search
 * 키워드로 영상 검색 (채널 정보 포함)
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    const result = await videoService.searchVideosWithChannelInfo(keyword, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📺 채널 정보 관리 (7개 엔드포인트) ✅ 모두 구현됨
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
 * POST /api/videos_db/channels/batch-save
 * 여러 채널 배치 저장 (신규 추가 - Rate Limiting 해결)
 */
router.post('/channels/batch-save', async (req, res) => {
  try {
    const { channels } = req.body;
    
    if (!Array.isArray(channels)) {
      return res.status(400).json({
        success: false,
        error: 'channels 필드는 배열이어야 합니다'
      });
    }

    const result = await videoService.saveChannelsBatch(channels);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/channels/high-quality
 * 고품질 채널 조회 (⚠️ 파라미터 라우터보다 먼저 정의 필요)
 */
router.get('/channels/high-quality', async (req, res) => {
  try {
    const result = await videoService.getHighQualityChannels(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/channels/active-shorts
 * 활발한 Shorts 채널 조회 (⚠️ 파라미터 라우터보다 먼저 정의 필요)
 */
router.get('/channels/active-shorts', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const result = await videoService.getActiveShortsChannels(limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/channels/stats-summary
 * 채널 통계 요약 (⚠️ 파라미터 라우터보다 먼저 정의 필요)
 */
router.get('/channels/stats-summary', async (req, res) => {
  try {
    const result = await videoService.getChannelStatsSummary();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/videos_db/channels/:channelId
 * 채널 정보 조회 (⚠️ 파라미터 라우터는 마지막에 정의)
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
 * GET /api/videos_db/channels/:channelId/videos
 * 채널별 영상 조회 (⚠️ 파라미터 라우터는 마지막에 정의)
 */
router.get('/channels/:channelId/videos', async (req, res) => {
  try {
    const { channelId } = req.params;
    const result = await videoService.getVideosByChannel(channelId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/videos_db/channels/:channelId/block
 * 채널 차단/해제 (⚠️ 파라미터 라우터는 마지막에 정의)
 */
router.put('/channels/:channelId/block', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { isBlocked, blockReason } = req.body;
    const result = await videoService.blockUnblockChannel(channelId, isBlocked, blockReason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ⭐ 영상 품질 및 상태 관리 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * GET /api/videos_db/tag/:tag
 * 태그별 영상 조회
 */
router.get('/tag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const tagType = req.query.tag_type || null;
    const limit = req.query.limit || 15;
    const result = await videoService.getVideosByTag(tag, tagType, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/videos_db/:videoId/quality-score
 * 영상 품질 점수 업데이트
 */
router.put('/:videoId/quality-score', async (req, res) => {
  try {
    const { videoId } = req.params;
    const result = await videoService.updateVideoQualityScore(videoId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/videos_db/:videoId/playability
 * 영상 재생 가능 여부 업데이트
 */
router.put('/:videoId/playability', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { isPlayable, reason } = req.body;
    const result = await videoService.updateVideoPlayability(videoId, isPlayable, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 유틸리티 및 관리 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * PUT /api/videos_db/channels/:channelId/quality-metrics
 * 채널 품질 메트릭 업데이트
 */
router.put('/channels/:channelId/quality-metrics', async (req, res) => {
  try {
    const { channelId } = req.params;
    const result = await videoService.updateChannelQualityMetrics(channelId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/videos_db/channels/update-all-quality-scores
 * 모든 채널 품질 점수 업데이트
 */
router.post('/channels/update-all-quality-scores', async (req, res) => {
  try {
    const result = await videoService.updateAllChannelQualityScores();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/videos_db/channels/cleanup-expired
 * 만료된 채널 캐시 정리
 */
router.delete('/channels/cleanup-expired', async (req, res) => {
  try {
    const result = await videoService.cleanupExpiredChannelCache();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 