/**
 * ⚙️ System Database Routes - 시스템 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/system_db/*
 * 기능: systemService.js의 실제 구현된 24개 함수를 HTTP API로 노출
 * 
 * 실제 구현된 함수 그룹:
 * - API 사용량 추적 (3개)
 * - 캐시 성능 추적 (3개) 
 * - LLM 처리 추적 (3개)
 * - 시스템 성능 모니터링 (1개)
 * - 자동화 작업 추적 (3개)
 * - 사용자 행동 로깅 (2개)
 * - 시스템 알림 관리 (3개)
 * - 비즈니스 메트릭 (3개)
 * - 시스템 관리 (3개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import * as systemService from '../../services/database/systemService.js';

const router = express.Router();

// ============================================================================
// 🔌 API 사용량 추적 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/system_db/api-usage
 * API 사용량 로그 저장
 */
router.post('/api-usage', async (req, res) => {
  try {
    const result = await systemService.logApiUsage(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/api-usage/daily
 * 일일 API 사용량 조회
 */
router.get('/api-usage/daily', async (req, res) => {
  try {
    const targetDate = req.query.target_date || null;
    const result = await systemService.getDailyApiUsage(targetDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/api-usage/current
 * 실시간 API 사용량
 */
router.get('/api-usage/current', async (req, res) => {
  try {
    const result = await systemService.getCurrentApiUsage();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 💾 캐시 성능 추적 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/system_db/cache-performance
 * 캐시 성능 로그 저장
 */
router.post('/cache-performance', async (req, res) => {
  try {
    const result = await systemService.logCachePerformance(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/cache-performance/efficiency
 * 캐시 효율성 리포트
 */
router.get('/cache-performance/efficiency', async (req, res) => {
  try {
    const daysBack = req.query.days || 7;
    const result = await systemService.getCacheEfficiencyReport(daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/cache-performance/current
 * 현재 캐시 효율성
 */
router.get('/cache-performance/current', async (req, res) => {
  try {
    const result = await systemService.getCurrentCacheEfficiency();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🤖 LLM 처리 추적 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/system_db/llm-processing
 * LLM 처리 로그 저장
 */
router.post('/llm-processing', async (req, res) => {
  try {
    const result = await systemService.logLlmProcessing(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/llm-processing/cost-analysis
 * LLM 비용 분석
 */
router.get('/llm-processing/cost-analysis', async (req, res) => {
  try {
    const startDate = req.query.start_date || null;
    const result = await systemService.getLlmCostAnalysis(startDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/llm-processing/current
 * 현재 LLM 처리 상태
 */
router.get('/llm-processing/current', async (req, res) => {
  try {
    const result = await systemService.getCurrentLlmProcessing();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 시스템 성능 모니터링 (1개 엔드포인트) ✅ 구현됨
// ============================================================================

/**
 * POST /api/system_db/system-performance
 * 시스템 성능 로그 저장
 */
router.post('/system-performance', async (req, res) => {
  try {
    const result = await systemService.logSystemPerformance(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/system-performance/dashboard
 * 시스템 성능 대시보드
 */
router.get('/system-performance/dashboard', async (req, res) => {
  try {
    const hoursBack = req.query.hours || 24;
    const result = await systemService.getSystemPerformanceDashboard(hoursBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🤖 자동화 작업 추적 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/system_db/automated-jobs
 * 자동화 작업 로그 저장
 */
router.post('/automated-jobs', async (req, res) => {
  try {
    const result = await systemService.logAutomatedJob(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/automated-jobs/status-summary
 * 작업 상태 요약
 */
router.get('/automated-jobs/status-summary', async (req, res) => {
  try {
    const daysBack = req.query.days || 7;
    const result = await systemService.getJobStatusSummary(daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/automated-jobs/recent
 * 최근 작업 상태
 */
router.get('/automated-jobs/recent', async (req, res) => {
  try {
    const result = await systemService.getRecentJobStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 👤 사용자 행동 로깅 (2개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/system_db/user-behavior
 * 사용자 행동 로그 저장
 */
router.post('/user-behavior', async (req, res) => {
  try {
    const result = await systemService.logUserBehavior(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/user-behavior/:userId/summary
 * 사용자 행동 요약
 */
router.get('/user-behavior/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await systemService.getUserBehaviorSummary(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🚨 시스템 알림 관리 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/system_db/alerts
 * 시스템 알림 생성
 */
router.post('/alerts', async (req, res) => {
  try {
    const result = await systemService.createSystemAlert(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/alerts/active
 * 활성 시스템 알림 조회
 */
router.get('/alerts/active', async (req, res) => {
  try {
    const result = await systemService.getActiveSystemAlerts();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/system_db/alerts/:alertId
 * 시스템 알림 업데이트
 */
router.put('/alerts/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    const result = await systemService.updateSystemAlert(alertId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 💼 비즈니스 메트릭 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/system_db/business-metrics
 * 비즈니스 메트릭 로그 저장
 */
router.post('/business-metrics', async (req, res) => {
  try {
    const result = await systemService.logBusinessMetrics(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/system_db/business-metrics/aggregate-daily
 * 일일 비즈니스 메트릭 집계
 */
router.post('/business-metrics/aggregate-daily', async (req, res) => {
  try {
    const targetDate = req.body.target_date || null;
    const result = await systemService.aggregateDailyBusinessMetrics(targetDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/system_db/business-metrics/daily-kpis
 * 일일 비즈니스 KPI 조회
 */
router.get('/business-metrics/daily-kpis', async (req, res) => {
  try {
    const daysBack = req.query.days || 30;
    const result = await systemService.getDailyBusinessKpis(daysBack);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 시스템 관리 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * DELETE /api/system_db/cleanup/old-logs
 * 오래된 로그 정리
 */
router.delete('/cleanup/old-logs', async (req, res) => {
  try {
    const result = await systemService.cleanupOldLogs();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/system_db/aggregate/performance-metrics
 * 성능 메트릭 집계
 */
router.post('/aggregate/performance-metrics', async (req, res) => {
  try {
    const result = await systemService.aggregatePerformanceMetrics();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 