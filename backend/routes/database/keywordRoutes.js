/**
 * 🏷️ Keywords Database Routes - 키워드 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/keywords_db/*
 * 기능: keywordService.js의 실제 구현된 21개 함수를 HTTP API로 노출
 * 
 * 실제 구현된 함수 그룹:
 * - 일일 키워드 관리 (8개)
 * - 키워드 스케줄링 (4개) 
 * - 성과 추적 및 분석 (4개)
 * - 검색 및 통계 (3개)
 * - 유틸리티 및 관리 (2개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import * as keywordService from '../../services/database/keywordService.js';

const router = express.Router();

// ============================================================================
// 📅 일일 키워드 관리 (8개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/keywords_db/daily
 * 일일 키워드 추가
 */
router.post('/daily', async (req, res) => {
  try {
    const result = await keywordService.addDailyKeyword(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/daily/today
 * 오늘 실행할 키워드 조회
 */
router.get('/daily/today', async (req, res) => {
  try {
    const result = await keywordService.getTodaysKeywords();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/daily/today/update
 * 오늘 업데이트할 키워드 조회
 */
router.get('/daily/today/update', async (req, res) => {
  try {
    const result = await keywordService.getTodaysUpdateKeywords();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/keywords_db/daily/complete-update
 * 키워드 업데이트 완료 처리
 */
router.post('/daily/complete-update', async (req, res) => {
  try {
    const result = await keywordService.completeKeywordUpdate(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/daily
 * 일일 키워드 목록 조회
 */
router.get('/daily', async (req, res) => {
  try {
    const result = await keywordService.getDailyKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/daily/:keywordId
 * 키워드 ID로 상세 조회
 */
router.get('/daily/:keywordId', async (req, res) => {
  try {
    const { keywordId } = req.params;
    const result = await keywordService.getKeywordById(keywordId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/keywords_db/daily/:keywordId
 * 키워드 정보 업데이트
 */
router.put('/daily/:keywordId', async (req, res) => {
  try {
    const { keywordId } = req.params;
    const result = await keywordService.updateDailyKeyword(keywordId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/keywords_db/daily/:keywordId
 * 키워드 삭제
 */
router.delete('/daily/:keywordId', async (req, res) => {
  try {
    const { keywordId } = req.params;
    const result = await keywordService.deleteDailyKeyword(keywordId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🆕 키워드명 직접 접근 (2개 엔드포인트) ✅ 새로 추가됨
// ============================================================================

/**
 * GET /api/keywords_db/daily/by-name/:keyword
 * 키워드명으로 상세 조회 (URL 인코딩 필요)
 */
router.get('/daily/by-name/:keyword', async (req, res) => {
  try {
    const keyword = decodeURIComponent(req.params.keyword);
    const result = await keywordService.getKeywordByName(keyword);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/keywords_db/daily/by-name/:keyword
 * 키워드명으로 정보 업데이트 (URL 인코딩 필요)
 */
router.put('/daily/by-name/:keyword', async (req, res) => {
  try {
    const keyword = decodeURIComponent(req.params.keyword);
    const result = await keywordService.updateDailyKeywordByName(keyword, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ⏰ 키워드 스케줄링 (4개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/keywords_db/schedule
 * 키워드 스케줄 생성
 */
router.post('/schedule', async (req, res) => {
  try {
    const result = await keywordService.scheduleKeywordUpdate(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/schedule/pending
 * 대기 중인 스케줄 조회
 */
router.get('/schedule/pending', async (req, res) => {
  try {
    const result = await keywordService.getPendingSchedules();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/keywords_db/schedule/:scheduleId
 * 스케줄 상태 업데이트
 */
router.put('/schedule/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const result = await keywordService.updateScheduleStatus(scheduleId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/keywords_db/schedule/cleanup
 * 오래된 스케줄 정리
 */
router.delete('/schedule/cleanup', async (req, res) => {
  try {
    const result = await keywordService.cleanupOldSchedules();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 성과 추적 및 분석 (4개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/keywords_db/performance/log
 * 키워드 성과 기록
 */
router.post('/performance/log', async (req, res) => {
  try {
    const result = await keywordService.logKeywordPerformance(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/performance/stats
 * 키워드 성과 통계 조회
 */
router.get('/performance/stats', async (req, res) => {
  try {
    const daysBack = req.query.days || 7;
    const result = await keywordService.getKeywordPerformanceStats(daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/performance/dashboard
 * 키워드 성과 대시보드
 */
router.get('/performance/dashboard', async (req, res) => {
  try {
    const result = await keywordService.getKeywordPerformanceDashboard();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/performance/:keywordId/history
 * 키워드별 성과 히스토리
 */
router.get('/performance/:keywordId/history', async (req, res) => {
  try {
    const { keywordId } = req.params;
    const daysBack = req.query.days || 30;
    const result = await keywordService.getKeywordPerformanceHistory(keywordId, daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🔍 검색 및 통계 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * GET /api/keywords_db/search
 * 키워드 검색
 */
router.get('/search', async (req, res) => {
  try {
    const result = await keywordService.searchKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/category/stats
 * 카테고리별 통계
 */
router.get('/category/stats', async (req, res) => {
  try {
    const result = await keywordService.getCategoryStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/keywords_db/daily/:keywordId/toggle-status
 * 키워드 활성화/비활성화 토글
 */
router.put('/daily/:keywordId/toggle-status', async (req, res) => {
  try {
    const { keywordId } = req.params;
    const { isActive } = req.body;
    const result = await keywordService.toggleKeywordStatus(keywordId, isActive);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 기능 (2개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/keywords_db/initialize-dates
 * 키워드 실행 날짜 초기화
 */
router.post('/initialize-dates', async (req, res) => {
  try {
    const result = await keywordService.initializeKeywordExecutionDates();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/keywords_db/reorder
 * 키워드 순서 재정렬
 */
router.put('/reorder', async (req, res) => {
  try {
    const { priorityTier, keywordIds } = req.body;
    const result = await keywordService.reorderKeywords(priorityTier, keywordIds);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 