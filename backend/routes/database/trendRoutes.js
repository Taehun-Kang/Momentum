/**
 * 📈 Trend Database Routes - 트렌드 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/trend_db/*
 * 기능: trendService.js의 실제 구현된 21개 함수를 HTTP API로 노출
 * 
 * 실제 구현된 함수 그룹:
 * - Google Trends 원본 데이터 관리 (5개)
 * - 뉴스 기반 정제 키워드 관리 (4개)
 * - 일일/시간별 분석 결과 관리 (3개)
 * - 실시간 키워드 분석 관리 (3개)
 * - 트렌드 대시보드 및 요약 (3개)
 * - 유틸리티 및 관리 (3개)
 * 
 * 🌟 핵심 기능: google-trends-collector.js + news-based-trend-refiner.js 완전 통합!
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import * as trendService from '../../services/database/trendService.js';

const router = express.Router();

// ============================================================================
// 📊 Google Trends 원본 데이터 관리 (5개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/trend_db/raw-trends
 * Google Trends 원본 데이터 저장
 */
router.post('/raw-trends', async (req, res) => {
  try {
    const result = await trendService.createRawTrendData(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trend_db/raw-trends/batch
 * Google Trends 데이터 배치 저장
 */
router.post('/raw-trends/batch', async (req, res) => {
  try {
    const { trendsArray, batchId } = req.body;
    const result = await trendService.createRawTrendDataBatch(trendsArray, batchId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/active-korean-trends
 * 활성 한국 트렌드 조회 (DB 함수 활용)
 */
router.get('/active-korean-trends', async (req, res) => {
  try {
    const maxKeywords = parseInt(req.query.maxKeywords) || 50;
    const result = await trendService.getActiveKoreanTrends(maxKeywords);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/stats/region/:regionCode
 * 지역별 트렌드 통계 조회 (DB 함수 활용)
 */
router.get('/stats/region/:regionCode', async (req, res) => {
  try {
    const { regionCode } = req.params;
    const result = await trendService.getTrendStatsByRegion(regionCode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/trends/by-rank
 * 트렌드 순위별 조회
 */
router.get('/trends/by-rank', async (req, res) => {
  try {
    const options = {
      regionCode: req.query.regionCode || 'KR',
      startRank: parseInt(req.query.startRank) || 1,
      endRank: parseInt(req.query.endRank) || 20,
      activeOnly: req.query.activeOnly !== 'false',
      date: req.query.date
    };
    const result = await trendService.getTrendsByRank(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📰 뉴스 기반 정제 키워드 관리 (4개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/trend_db/refined-keywords
 * 정제된 키워드 저장
 */
router.post('/refined-keywords', async (req, res) => {
  try {
    const result = await trendService.createRefinedKeyword(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/youtube-ready-keywords
 * YouTube 검색 준비된 키워드 조회 (DB 함수 활용)
 */
router.get('/youtube-ready-keywords', async (req, res) => {
  try {
    const maxKeywords = parseInt(req.query.maxKeywords) || 10;
    const result = await trendService.getYoutubeReadyKeywords(maxKeywords);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/refinement/stats
 * 정제 성과 통계 조회 (DB 함수 활용)
 */
router.get('/refinement/stats', async (req, res) => {
  try {
    const targetDate = req.query.targetDate;
    const result = await trendService.getRefinementStats(targetDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/trend_db/refined-keywords/:keywordId/performance
 * 정제 키워드 성과 업데이트
 */
router.put('/refined-keywords/:keywordId/performance', async (req, res) => {
  try {
    const { keywordId } = req.params;
    const result = await trendService.updateRefinedKeywordPerformance(keywordId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 일일/시간별 분석 결과 관리 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/trend_db/analysis-results
 * 트렌드 분석 결과 저장
 */
router.post('/analysis-results', async (req, res) => {
  try {
    const result = await trendService.createTrendAnalysisResult(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trend_db/daily-summary/generate
 * 일일 트렌드 요약 생성 (DB 함수 활용)
 */
router.post('/daily-summary/generate', async (req, res) => {
  try {
    const targetDate = req.body.targetDate;
    const result = await trendService.generateDailyTrendSummary(targetDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/analysis-results
 * 분석 결과 조회 (기간별)
 */
router.get('/analysis-results', async (req, res) => {
  try {
    const options = {
      analysisType: req.query.analysisType || 'daily',
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 30
    };
    const result = await trendService.getTrendAnalysisResults(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 실시간 키워드 분석 관리 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * POST /api/trend_db/keyword-analysis
 * 키워드 분석 결과 저장
 */
router.post('/keyword-analysis', async (req, res) => {
  try {
    const result = await trendService.createKeywordAnalysis(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/keyword-analysis/:keyword
 * 키워드 분석 결과 조회
 */
router.get('/keyword-analysis/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const options = {
      limit: parseInt(req.query.limit) || 10,
      daysBack: parseInt(req.query.daysBack) || 7
    };
    const result = await trendService.getKeywordAnalysis(keyword, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/keyword-analysis/high-quality
 * 고품질 키워드 분석 조회
 */
router.get('/keyword-analysis/high-quality', async (req, res) => {
  try {
    const options = {
      minScore: parseFloat(req.query.minScore) || 0.7,
      limit: parseInt(req.query.limit) || 20,
      categories: req.query.categories ? req.query.categories.split(',') : null
    };
    const result = await trendService.getHighQualityKeywordAnalyses(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📋 트렌드 대시보드 및 요약 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * GET /api/trend_db/dashboard
 * 트렌드 대시보드 데이터 조회
 */
router.get('/dashboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await trendService.getTrendsDashboard(limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/today/summary
 * 오늘의 트렌드 요약
 */
router.get('/today/summary', async (req, res) => {
  try {
    const result = await trendService.getTodaysTrendSummary();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/performance/metrics
 * 트렌드 성과 지표 조회
 */
router.get('/performance/metrics', async (req, res) => {
  try {
    const options = {
      daysBack: parseInt(req.query.daysBack) || 7,
      includeRegions: req.query.includeRegions ? req.query.includeRegions.split(',') : ['KR'],
      breakdown: req.query.breakdown || 'daily'
    };
    const result = await trendService.getTrendPerformanceMetrics(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 (3개 엔드포인트) ✅ 모두 구현됨
// ============================================================================

/**
 * DELETE /api/trend_db/cleanup/all
 * 모든 트렌드 데이터 정리
 */
router.delete('/cleanup/all', async (req, res) => {
  try {
    const result = await trendService.cleanupAllTrendData();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/trend_db/cleanup/expired-keywords
 * 만료된 정제 키워드 정리
 */
router.delete('/cleanup/expired-keywords', async (req, res) => {
  try {
    const result = await trendService.cleanupExpiredRefinedKeywords();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trend_db/exists/:keyword
 * 트렌드 데이터 존재 여부 확인
 */
router.get('/exists/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const regionCode = req.query.regionCode || 'KR';
    const date = req.query.date;
    const result = await trendService.trendDataExists(keyword, regionCode, date);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 