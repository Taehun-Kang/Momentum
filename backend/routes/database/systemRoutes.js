/**
 * ⚙️ System Database Routes - 시스템 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/system_db/*
 * 기능: systemService.js의 26개 함수를 모두 HTTP API로 노출
 * 
 * 엔드포인트 그룹:
 * - API 사용량 모니터링 (7개)
 * - 캐시 성능 관리 (6개)
 * - LLM 서비스 모니터링 (5개)
 * - 시스템 상태 관리 (4개)
 * - 유틸리티 및 관리 (4개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import systemService from '../../services/database/systemService.js';

const router = express.Router();

// ============================================================================
// 🔌 API 사용량 모니터링 (7개 엔드포인트)
// ============================================================================

/**
 * POST /api/system_db/api-usage
 * API 사용량 로그 기록
 */
router.post('/api-usage', async (req, res) => {
  try {
    const result = await systemService.logAPIUsage(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/api-usage/stats
 * API 사용량 통계 조회
 */
router.get('/api-usage/stats', async (req, res) => {
  try {
    const result = await systemService.getAPIUsageStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/api-usage/current
 * 현재 API 사용량 조회
 */
router.get('/api-usage/current', async (req, res) => {
  try {
    const result = await systemService.getCurrentAPIUsage();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/api-usage/limits
 * API 한도 모니터링
 */
router.get('/api-usage/limits', async (req, res) => {
  try {
    const result = await systemService.monitorAPILimits();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/api-usage/hourly
 * 시간별 API 사용량 조회
 */
router.get('/api-usage/hourly', async (req, res) => {
  try {
    const result = await systemService.getHourlyAPIStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/api-usage/daily
 * 일별 API 사용량 조회
 */
router.get('/api-usage/daily', async (req, res) => {
  try {
    const result = await systemService.getDailyAPIStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/system_db/api-usage/alert
 * API 사용량 알림 설정
 */
router.post('/api-usage/alert', async (req, res) => {
  try {
    const result = await systemService.setAPIUsageAlert(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 💾 캐시 성능 관리 (6개 엔드포인트)
// ============================================================================

/**
 * POST /api/system_db/cache/metrics
 * 캐시 성능 메트릭 기록
 */
router.post('/cache/metrics', async (req, res) => {
  try {
    const result = await systemService.logCacheMetrics(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/cache/stats
 * 캐시 성능 통계 조회
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const result = await systemService.getCachePerformanceStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/cache/hit-rates
 * 캐시 적중률 분석
 */
router.get('/cache/hit-rates', async (req, res) => {
  try {
    const result = await systemService.analyzeCacheHitRates(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/cache/trends
 * 캐시 성능 트렌드 분석
 */
router.get('/cache/trends', async (req, res) => {
  try {
    const result = await systemService.getCachePerformanceTrends(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/system_db/cache/optimize
 * 캐시 최적화 제안
 */
router.post('/cache/optimize', async (req, res) => {
  try {
    const result = await systemService.optimizeCacheSettings(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/system_db/cache/cleanup
 * 캐시 데이터 정리
 */
router.delete('/cache/cleanup', async (req, res) => {
  try {
    const result = await systemService.cleanupCacheMetrics(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🤖 LLM 서비스 모니터링 (5개 엔드포인트)
// ============================================================================

/**
 * POST /api/system_db/llm/requests
 * LLM 요청 로그 기록
 */
router.post('/llm/requests', async (req, res) => {
  try {
    const result = await systemService.logLLMRequest(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/llm/stats
 * LLM 사용 통계 조회
 */
router.get('/llm/stats', async (req, res) => {
  try {
    const result = await systemService.getLLMUsageStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/llm/performance
 * LLM 성능 분석
 */
router.get('/llm/performance', async (req, res) => {
  try {
    const result = await systemService.analyzeLLMPerformance(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/llm/errors
 * LLM 에러 모니터링
 */
router.get('/llm/errors', async (req, res) => {
  try {
    const result = await systemService.monitorLLMErrors(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/llm/costs
 * LLM 비용 분석
 */
router.get('/llm/costs', async (req, res) => {
  try {
    const result = await systemService.analyzeLLMCosts(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🔧 시스템 상태 관리 (4개 엔드포인트)
// ============================================================================

/**
 * POST /api/system_db/health/check
 * 시스템 상태 체크 기록
 */
router.post('/health/check', async (req, res) => {
  try {
    const result = await systemService.logSystemHealth(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/health/status
 * 시스템 상태 조회
 */
router.get('/health/status', async (req, res) => {
  try {
    const result = await systemService.getSystemHealthStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/health/history
 * 시스템 상태 이력 조회
 */
router.get('/health/history', async (req, res) => {
  try {
    const result = await systemService.getSystemHealthHistory(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/system_db/health/alerts
 * 시스템 알림 설정
 */
router.post('/health/alerts', async (req, res) => {
  try {
    const result = await systemService.configureHealthAlerts(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 기능 (4개 엔드포인트)
// ============================================================================

/**
 * GET /api/system_db/dashboard
 * 시스템 대시보드 데이터 조회
 */
router.get('/dashboard', async (req, res) => {
  try {
    const result = await systemService.getSystemDashboard();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/system_db/maintenance
 * 시스템 유지보수 작업
 */
router.post('/maintenance', async (req, res) => {
  try {
    const result = await systemService.performSystemMaintenance(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/reports/generate
 * 시스템 리포트 생성
 */
router.get('/reports/generate', async (req, res) => {
  try {
    const result = await systemService.generateSystemReport(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/system_db/cleanup/old-logs
 * 오래된 시스템 로그 정리
 */
router.delete('/cleanup/old-logs', async (req, res) => {
  try {
    const result = await systemService.cleanupOldSystemLogs(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 