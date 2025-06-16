/**
 * 🔍 Search Database Routes - 검색 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/search_db/*
 * 기능: searchService.js의 실제 구현된 21개 함수를 HTTP API로 노출
 * 
 * 실제 구현된 함수 그룹:
 * - 검색 로그 저장 및 관리 (4개)
 * - 인기 키워드 및 트렌드 분석 (4개) 
 * - API 사용량 및 성능 분석 (4개)
 * - 사용자 검색 패턴 분석 (3개)
 * - 검색 세션 및 에러 분석 (3개)
 * - 유틸리티 및 관리 (3개)
 * 
 * 🌟 핵심 기능: realtime-keyword-search.js와 완전 통합!
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import * as searchService from '../../services/database/searchService.js';

const router = express.Router();

// ============================================================================
// 📝 검색 로그 저장 및 관리 (4개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/search_db/logs
 * 새로운 검색 로그 저장
 */
router.post('/logs', async (req, res) => {
  try {
    const result = await searchService.createSearchLog(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/search_db/logs/:logId
 * 검색 로그 업데이트 (검색 완료 시)
 */
router.put('/logs/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const result = await searchService.updateSearchLog(logId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/logs/popular
 * 인기 키워드 상세 분석 (DB 함수 활용)
 * ⚠️ 주의: 반드시 /logs/:logId보다 먼저 정의해야 함!
 */
router.get('/logs/popular', async (req, res) => {
  try {
    const result = await searchService.getPopularKeywordsDetailed(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/logs/:logId
 * 검색 로그 조회 (ID로)
 */
router.get('/logs/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const result = await searchService.getSearchLogById(logId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/logs/:logId/exists
 * 검색 로그 존재 여부 확인
 * ⚠️ 주의: 반드시 /logs/:logId보다 먼저 정의해야 함!
 */
router.get('/logs/:logId/exists', async (req, res) => {
  try {
    const { logId } = req.params;
    const result = await searchService.searchLogExists(logId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/users/:userId/logs
 * 사용자별 검색 로그 조회
 */
router.get('/users/:userId/logs', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await searchService.getUserSearchLogs(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 인기 키워드 및 트렌드 분석 (4개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * GET /api/search_db/keywords/realtime-trends
 * 실시간 트렌드 키워드 분석 (DB 함수 활용)
 */
router.get('/keywords/realtime-trends', async (req, res) => {
  try {
    const hoursBack = req.query.hours || 1;
    const result = await searchService.getRealtimeTrendKeywords(hoursBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/keywords/category/:category
 * 카테고리별 인기 키워드 조회
 */
router.get('/keywords/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const result = await searchService.getPopularKeywordsByCategory(category, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/autocomplete
 * 검색어 자동완성 후보 조회
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { prefix } = req.query;
    const limit = req.query.limit || 10;
    const result = await searchService.getSearchAutocompleteSuggestions(prefix, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📈 API 사용량 및 성능 분석 (4개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * GET /api/search_db/analytics/api-usage
 * API 사용량 분석 (DB 함수 활용)
 */
router.get('/analytics/api-usage', async (req, res) => {
  try {
    const daysBack = req.query.days || 1;
    const result = await searchService.analyzeApiUsage(daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/analytics/quota-usage
 * 할당량 카테고리별 사용량 조회
 */
router.get('/analytics/quota-usage', async (req, res) => {
  try {
    const daysBack = req.query.days || 1;
    const result = await searchService.getQuotaUsageByCategory(daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/analytics/cache-efficiency
 * 캐시 효율성 분석
 */
router.get('/analytics/cache-efficiency', async (req, res) => {
  try {
    const daysBack = req.query.days || 1;
    const result = await searchService.analyzeCacheEfficiency(daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/analytics/performance-summary
 * 성능 요약 분석
 */
router.get('/analytics/performance-summary', async (req, res) => {
  try {
    const daysBack = req.query.days || 1;
    const result = await searchService.getPerformanceSummary(daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 👤 사용자 검색 패턴 분석 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * GET /api/search_db/users/:userId/search-patterns
 * 사용자 검색 패턴 분석
 */
router.get('/users/:userId/search-patterns', async (req, res) => {
  try {
    const { userId } = req.params;
    const daysBack = req.query.days || 30;
    const result = await searchService.analyzeUserSearchPatterns(userId, daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/users/:userId/preferred-keywords
 * 사용자 선호 키워드 분석
 */
router.get('/users/:userId/preferred-keywords', async (req, res) => {
  try {
    const { userId } = req.params;
    const daysBack = req.query.days || 30;
    const result = await searchService.getUserPreferredKeywords(userId, daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/sessions/:sessionId/analysis
 * 검색 세션 분석
 */
router.get('/sessions/:sessionId/analysis', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await searchService.analyzeSearchSession(sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🚨 검색 세션 및 에러 분석 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * GET /api/search_db/analytics/errors
 * 검색 에러 분석
 */
router.get('/analytics/errors', async (req, res) => {
  try {
    const daysBack = req.query.days || 1;
    const result = await searchService.analyzeSearchErrors(daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/analytics/quota-status
 * 할당량 상태 모니터링
 */
router.get('/analytics/quota-status', async (req, res) => {
  try {
    const hoursBack = req.query.hours || 24;
    const result = await searchService.monitorQuotaStatus(hoursBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/sessions/realtime/:sessionId
 * 실시간 검색 세션 상태 조회 (realtime-keyword-search.js 연동)
 */
router.get('/sessions/realtime/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await searchService.getRealtimeSearchSessionStatus(sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * DELETE /api/search_db/cleanup/old-logs
 * 오래된 검색 로그 정리
 */
router.delete('/cleanup/old-logs', async (req, res) => {
  try {
    const result = await searchService.cleanupOldSearchLogs();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/statistics/:viewName
 * 검색 로그 통계 조회 (뷰 기반)
 */
router.get('/statistics/:viewName', async (req, res) => {
  try {
    const { viewName } = req.params;
    const limit = req.query.limit || 50;
    const result = await searchService.getSearchLogStatistics(viewName, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 