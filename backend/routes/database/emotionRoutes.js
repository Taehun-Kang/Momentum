/**
 * 😊 Emotion Database Routes - 감정 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/emotions_db/*
 * 기능: emotionService.js의 24개 함수를 모두 HTTP API로 노출
 * 
 * 엔드포인트 그룹:
 * - 사용자 감정 로그 관리 (4개)
 * - 감정별 키워드 선택 관리 (3개)
 * - 감정별 키워드 통계 관리 (6개)
 * - 감정 분석 및 검색 (2개)
 * - 유틸리티 및 관리 기능 (2개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import emotionService from '../../services/database/emotionService.js';

const router = express.Router();

// ============================================================================
// 👤 사용자 감정 로그 관리 (4개 엔드포인트)
// ============================================================================

/**
 * POST /api/emotions_db/log
 * 사용자 감정 상태 기록 (DB 함수 활용)
 */
router.post('/log', async (req, res) => {
  try {
    const result = await emotionService.logUserEmotion(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/emotions_db/logs
 * 감정 로그 직접 생성 (Claude API 결과 저장)
 */
router.post('/logs', async (req, res) => {
  try {
    const result = await emotionService.createEmotionLog(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/emotions_db/users/:userId/history
 * 사용자별 감정 히스토리 조회 (뷰 활용)
 */
router.get('/users/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await emotionService.getUserEmotionHistory(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/emotions_db/logs/recent
 * 최근 감정 로그 조회
 */
router.get('/logs/recent', async (req, res) => {
  try {
    const result = await emotionService.getRecentEmotionLogs(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🏷️ 감정별 키워드 선택 관리 (3개 엔드포인트)
// ============================================================================

/**
 * POST /api/emotions_db/keyword-selection
 * 키워드 선택 기록 (DB 함수 활용)
 */
router.post('/keyword-selection', async (req, res) => {
  try {
    const result = await emotionService.recordKeywordSelection(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/emotions_db/keyword-selections
 * 키워드 선택 직접 생성
 */
router.post('/keyword-selections', async (req, res) => {
  try {
    const result = await emotionService.createKeywordSelection(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/emotions_db/users/:userId/keyword-selections
 * 사용자별 키워드 선택 히스토리 조회
 */
router.get('/users/:userId/keyword-selections', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await emotionService.getUserKeywordSelections(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 감정별 키워드 통계 관리 (6개 엔드포인트) 
// ============================================================================

/**
 * GET /api/emotions_db/keywords/:emotionState
 * 감정별 인기 키워드 조회 (natural-language-extractor.js 핵심 함수!)
 */
router.get('/keywords/:emotionState', async (req, res) => {
  try {
    const { emotionState } = req.params;
    const { limit = 10 } = req.query;
    const result = await emotionService.getEmotionKeywords(emotionState, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/emotions_db/keywords/top-ranking
 * 감정별 인기 키워드 TOP 랭킹 조회 (뷰 활용)
 */
router.get('/keywords/top-ranking', async (req, res) => {
  try {
    const result = await emotionService.getEmotionTopKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/emotions_db/preferences/realtime
 * 실시간 감정-키워드 선호도 조회 (뷰 활용)
 */
router.get('/preferences/realtime', async (req, res) => {
  try {
    const result = await emotionService.getRealtimeEmotionPreferences();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/emotions_db/stats/:emotionState/:keyword
 * 감정-키워드 통계 수동 업데이트 (DB 함수 활용)
 */
router.put('/stats/:emotionState/:keyword', async (req, res) => {
  try {
    const { emotionState, keyword } = req.params;
    const result = await emotionService.updateEmotionKeywordStats(emotionState, keyword);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/emotions_db/stats/recalculate
 * 모든 감정-키워드 통계 재계산 (DB 함수 활용)
 */
router.post('/stats/recalculate', async (req, res) => {
  try {
    const result = await emotionService.recalculateAllEmotionStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🔍 감정 분석 및 검색 (2개 엔드포인트)
// ============================================================================

/**
 * GET /api/emotions_db/stats/emotions
 * 감정 상태별 통계 조회
 */
router.get('/stats/emotions', async (req, res) => {
  try {
    const result = await emotionService.getEmotionStateStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/emotions_db/search
 * 감정 상태 검색
 */
router.get('/search', async (req, res) => {
  try {
    const result = await emotionService.searchEmotionStates(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 기능 (2개 엔드포인트)
// ============================================================================

/**
 * DELETE /api/emotions_db/cleanup/old-logs
 * 오래된 감정 로그 정리 (DB 함수 활용)
 */
router.delete('/cleanup/old-logs', async (req, res) => {
  try {
    const result = await emotionService.cleanupOldEmotionLogs();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/emotions_db/dashboard
 * 감정 서비스 대시보드 데이터 조회
 */
router.get('/dashboard', async (req, res) => {
  try {
    const result = await emotionService.getEmotionServiceDashboard();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 