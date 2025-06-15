/**
 * 🔍 Search Database Routes - 검색 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/search_db/*
 * 기능: searchService.js의 30개 함수를 모두 HTTP API로 노출
 * 
 * 엔드포인트 그룹:
 * - 검색 로그 관리 (8개)
 * - 검색 성능 분석 (6개)
 * - API 사용량 추적 (7개)
 * - 검색 패턴 분석 (5개)
 * - 유틸리티 및 관리 (4개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import searchService from '../../services/database/searchService.js';

const router = express.Router();

// ============================================================================
// 📝 검색 로그 관리 (8개 엔드포인트)
// ============================================================================

/**
 * POST /api/search_db/logs
 * 검색 로그 기록
 */
router.post('/logs', async (req, res) => {
  try {
    const result = await searchService.logSearch(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/logs/:searchId
 * 검색 로그 조회
 */
router.get('/logs/:searchId', async (req, res) => {
  try {
    const { searchId } = req.params;
    const result = await searchService.getSearchLog(searchId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/logs/user/:userId
 * 사용자별 검색 히스토리 조회
 */
router.get('/logs/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await searchService.getUserSearchHistory(userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/logs/recent
 * 최근 검색 로그 조회
 */
router.get('/logs/recent', async (req, res) => {
  try {
    const result = await searchService.getRecentSearches(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/logs/popular
 * 인기 검색어 조회
 */
router.get('/logs/popular', async (req, res) => {
  try {
    const result = await searchService.getPopularSearchTerms(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/search_db/logs/:searchId
 * 검색 로그 업데이트
 */
router.put('/logs/:searchId', async (req, res) => {
  try {
    const { searchId } = req.params;
    const result = await searchService.updateSearchLog(searchId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/search_db/logs/:searchId
 * 검색 로그 삭제
 */
router.delete('/logs/:searchId', async (req, res) => {
  try {
    const { searchId } = req.params;
    const result = await searchService.deleteSearchLog(searchId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/search_db/logs/bulk
 * 검색 로그 일괄 처리
 */
router.post('/logs/bulk', async (req, res) => {
  try {
    const result = await searchService.bulkInsertSearchLogs(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 검색 성능 분석 (6개 엔드포인트)
// ============================================================================

/**
 * GET /api/search_db/analytics/performance
 * 검색 성능 통계 조회
 */
router.get('/analytics/performance', async (req, res) => {
  try {
    const result = await searchService.getSearchPerformanceStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/analytics/response-time
 * 응답 시간 분석
 */
router.get('/analytics/response-time', async (req, res) => {
  try {
    const result = await searchService.analyzeResponseTimes(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/analytics/success-rates
 * 검색 성공률 분석
 */
router.get('/analytics/success-rates', async (req, res) => {
  try {
    const result = await searchService.analyzeSearchSuccessRates(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/analytics/trends
 * 검색 트렌드 분석
 */
router.get('/analytics/trends', async (req, res) => {
  try {
    const result = await searchService.getSearchTrends(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/analytics/keywords
 * 키워드 성능 분석
 */
router.get('/analytics/keywords', async (req, res) => {
  try {
    const result = await searchService.analyzeKeywordPerformance(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/analytics/user-behavior
 * 사용자 검색 행동 분석
 */
router.get('/analytics/user-behavior', async (req, res) => {
  try {
    const result = await searchService.analyzeUserSearchBehavior(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🔌 API 사용량 추적 (7개 엔드포인트)
// ============================================================================

/**
 * POST /api/search_db/api-usage
 * API 사용량 기록
 */
router.post('/api-usage', async (req, res) => {
  try {
    const result = await searchService.trackAPIUsage(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/api-usage/stats
 * API 사용량 통계 조회
 */
router.get('/api-usage/stats', async (req, res) => {
  try {
    const result = await searchService.getAPIUsageStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/api-usage/quota
 * API 할당량 현황 조회
 */
router.get('/api-usage/quota', async (req, res) => {
  try {
    const result = await searchService.getQuotaUsage(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/api-usage/limits
 * API 한도 모니터링
 */
router.get('/api-usage/limits', async (req, res) => {
  try {
    const result = await searchService.monitorAPILimits();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/api-usage/optimization
 * API 사용량 최적화 제안
 */
router.get('/api-usage/optimization', async (req, res) => {
  try {
    const result = await searchService.getUsageOptimizationSuggestions();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/api-usage/hourly
 * 시간대별 API 사용량 조회
 */
router.get('/api-usage/hourly', async (req, res) => {
  try {
    const result = await searchService.getHourlyUsageStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/api-usage/daily
 * 일별 API 사용량 조회
 */
router.get('/api-usage/daily', async (req, res) => {
  try {
    const result = await searchService.getDailyUsageStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 검색 패턴 분석 (5개 엔드포인트)
// ============================================================================

/**
 * GET /api/search_db/patterns/seasonal
 * 계절별 검색 패턴 분석
 */
router.get('/patterns/seasonal', async (req, res) => {
  try {
    const result = await searchService.analyzeSeasonalPatterns(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/patterns/geographic
 * 지역별 검색 패턴 분석
 */
router.get('/patterns/geographic', async (req, res) => {
  try {
    const result = await searchService.analyzeGeographicPatterns(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/patterns/demographic
 * 인구통계학적 검색 패턴 분석
 */
router.get('/patterns/demographic', async (req, res) => {
  try {
    const result = await searchService.analyzeDemographicPatterns(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/patterns/device
 * 디바이스별 검색 패턴 분석
 */
router.get('/patterns/device', async (req, res) => {
  try {
    const result = await searchService.analyzeDevicePatterns(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/patterns/temporal
 * 시간대별 검색 패턴 분석
 */
router.get('/patterns/temporal', async (req, res) => {
  try {
    const result = await searchService.analyzeTemporalPatterns(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 기능 (4개 엔드포인트)
// ============================================================================

/**
 * DELETE /api/search_db/cleanup/old-logs
 * 오래된 검색 로그 정리
 */
router.delete('/cleanup/old-logs', async (req, res) => {
  try {
    const result = await searchService.cleanupOldSearchLogs(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/search_db/analytics/aggregate
 * 검색 데이터 집계
 */
router.post('/analytics/aggregate', async (req, res) => {
  try {
    const result = await searchService.aggregateSearchData(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search_db/dashboard
 * 검색 서비스 대시보드 데이터
 */
router.get('/dashboard', async (req, res) => {
  try {
    const result = await searchService.getSearchDashboard();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/search_db/export
 * 검색 데이터 내보내기
 */
router.post('/export', async (req, res) => {
  try {
    const result = await searchService.exportSearchData(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 