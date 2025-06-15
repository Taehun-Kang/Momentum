/**
 * 🏷️ Keyword Database Routes - 키워드 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/keywords_db/*
 * 기능: keywordService.js의 24개 함수를 모두 HTTP API로 노출
 * 
 * 엔드포인트 그룹:
 * - 일일 키워드 관리 (8개)
 * - 키워드 실행 관리 (6개)
 * - 키워드 분석 및 통계 (5개)
 * - 키워드 검색 및 필터링 (3개)
 * - 유틸리티 및 관리 (2개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import keywordService from '../../services/database/keywordService.js';

const router = express.Router();

// ============================================================================
// 📅 일일 키워드 관리 (8개 엔드포인트)
// ============================================================================

/**
 * POST /api/keywords_db/daily
 * 일일 키워드 생성
 */
router.post('/daily', async (req, res) => {
  try {
    const result = await keywordService.createDailyKeywords(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/daily/:date
 * 특정 날짜 키워드 조회
 */
router.get('/daily/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const result = await keywordService.getDailyKeywords(date, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/keywords_db/daily/:keywordId
 * 일일 키워드 업데이트
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
 * 일일 키워드 삭제
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

/**
 * GET /api/keywords_db/daily/today/list
 * 오늘의 키워드 목록 조회
 */
router.get('/daily/today/list', async (req, res) => {
  try {
    const result = await keywordService.getTodayKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/keywords_db/daily/bulk
 * 일일 키워드 일괄 생성
 */
router.post('/daily/bulk', async (req, res) => {
  try {
    const result = await keywordService.bulkCreateDailyKeywords(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/daily/range
 * 날짜 범위별 키워드 조회
 */
router.get('/daily/range', async (req, res) => {
  try {
    const result = await keywordService.getKeywordsByDateRange(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/daily/active
 * 활성 키워드 조회
 */
router.get('/daily/active', async (req, res) => {
  try {
    const result = await keywordService.getActiveKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ⚙️ 키워드 실행 관리 (6개 엔드포인트)
// ============================================================================

/**
 * POST /api/keywords_db/execution
 * 키워드 실행 기록
 */
router.post('/execution', async (req, res) => {
  try {
    const result = await keywordService.logKeywordExecution(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/execution/:executionId
 * 키워드 실행 로그 조회
 */
router.get('/execution/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const result = await keywordService.getExecutionLog(executionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/execution/keyword/:keywordId
 * 키워드별 실행 히스토리 조회
 */
router.get('/execution/keyword/:keywordId', async (req, res) => {
  try {
    const { keywordId } = req.params;
    const result = await keywordService.getKeywordExecutionHistory(keywordId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/keywords_db/execution/:executionId
 * 키워드 실행 로그 업데이트
 */
router.put('/execution/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const result = await keywordService.updateExecutionLog(executionId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/keywords_db/rotation/update
 * 키워드 로테이션 업데이트
 */
router.post('/rotation/update', async (req, res) => {
  try {
    const result = await keywordService.updateKeywordRotation(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/rotation/next
 * 다음 실행할 키워드 조회
 */
router.get('/rotation/next', async (req, res) => {
  try {
    const result = await keywordService.getNextExecutionKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 키워드 분석 및 통계 (5개 엔드포인트)
// ============================================================================

/**
 * GET /api/keywords_db/analytics/performance
 * 키워드 성능 분석
 */
router.get('/analytics/performance', async (req, res) => {
  try {
    const result = await keywordService.analyzeKeywordPerformance(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/analytics/trends
 * 키워드 트렌드 분석
 */
router.get('/analytics/trends', async (req, res) => {
  try {
    const result = await keywordService.getKeywordTrends(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/analytics/stats
 * 키워드 통계 조회
 */
router.get('/analytics/stats', async (req, res) => {
  try {
    const result = await keywordService.getKeywordStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/analytics/execution-stats
 * 키워드 실행 통계 조회
 */
router.get('/analytics/execution-stats', async (req, res) => {
  try {
    const result = await keywordService.getExecutionStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/analytics/effectiveness
 * 키워드 효과성 분석
 */
router.get('/analytics/effectiveness', async (req, res) => {
  try {
    const result = await keywordService.analyzeKeywordEffectiveness(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🔍 키워드 검색 및 필터링 (3개 엔드포인트)
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
 * GET /api/keywords_db/category/:category
 * 카테고리별 키워드 조회
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const result = await keywordService.getKeywordsByCategory(category, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/filter
 * 키워드 필터링
 */
router.get('/filter', async (req, res) => {
  try {
    const result = await keywordService.filterKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 기능 (2개 엔드포인트)
// ============================================================================

/**
 * DELETE /api/keywords_db/cleanup/old-keywords
 * 오래된 키워드 정리
 */
router.delete('/cleanup/old-keywords', async (req, res) => {
  try {
    const result = await keywordService.cleanupOldKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/keywords_db/dashboard
 * 키워드 서비스 대시보드 데이터
 */
router.get('/dashboard', async (req, res) => {
  try {
    const result = await keywordService.getKeywordDashboard();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 