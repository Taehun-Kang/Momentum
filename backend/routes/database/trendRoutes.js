/**
 * 📈 Trend Database Routes - 트렌드 DB 서비스 API 엔드포인트
 * 
 * 경로: /api/trends_db/*
 * 기능: trendService.js의 22개 함수를 모두 HTTP API로 노출
 * 
 * 엔드포인트 그룹:
 * - Google Trends 데이터 관리 (7개)
 * - 키워드 트렌드 분석 (6개)
 * - 뉴스 기반 키워드 관리 (4개)
 * - 트렌드 통계 및 분석 (3개)
 * - 유틸리티 및 관리 (2개)
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import express from 'express';
import trendService from '../../services/database/trendService.js';

const router = express.Router();

// ============================================================================
// 📊 Google Trends 데이터 관리 (7개 엔드포인트)
// ============================================================================

/**
 * POST /api/trends_db/google-trends
 * Google Trends 데이터 저장
 */
router.post('/google-trends', async (req, res) => {
  try {
    const result = await trendService.saveGoogleTrendsData(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/google-trends/:keyword
 * 키워드별 Google Trends 데이터 조회
 */
router.get('/google-trends/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const result = await trendService.getGoogleTrendsData(keyword, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/trends_db/google-trends/:trendId
 * Google Trends 데이터 업데이트
 */
router.put('/google-trends/:trendId', async (req, res) => {
  try {
    const { trendId } = req.params;
    const result = await trendService.updateGoogleTrendsData(trendId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/trends_db/google-trends/:trendId
 * Google Trends 데이터 삭제
 */
router.delete('/google-trends/:trendId', async (req, res) => {
  try {
    const { trendId } = req.params;
    const result = await trendService.deleteGoogleTrendsData(trendId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trends_db/google-trends/bulk
 * Google Trends 데이터 일괄 저장
 */
router.post('/google-trends/bulk', async (req, res) => {
  try {
    const result = await trendService.bulkSaveGoogleTrends(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/google-trends/recent
 * 최근 Google Trends 데이터 조회
 */
router.get('/google-trends/recent', async (req, res) => {
  try {
    const result = await trendService.getRecentGoogleTrends(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/google-trends/search
 * Google Trends 데이터 검색
 */
router.get('/google-trends/search', async (req, res) => {
  try {
    const result = await trendService.searchGoogleTrends(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🔍 키워드 트렌드 분석 (6개 엔드포인트)
// ============================================================================

/**
 * GET /api/trends_db/keywords/trending
 * 트렌딩 키워드 조회
 */
router.get('/keywords/trending', async (req, res) => {
  try {
    const result = await trendService.getTrendingKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/keywords/rising
 * 급상승 키워드 조회
 */
router.get('/keywords/rising', async (req, res) => {
  try {
    const result = await trendService.getRisingKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/keywords/category/:category
 * 카테고리별 트렌드 키워드 조회
 */
router.get('/keywords/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const result = await trendService.getTrendsByCategory(category, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trends_db/keywords/analyze
 * 키워드 트렌드 분석
 */
router.post('/keywords/analyze', async (req, res) => {
  try {
    const result = await trendService.analyzeKeywordTrend(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/keywords/compare
 * 키워드 트렌드 비교
 */
router.get('/keywords/compare', async (req, res) => {
  try {
    const result = await trendService.compareKeywordTrends(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/keywords/predictions
 * 키워드 트렌드 예측
 */
router.get('/keywords/predictions', async (req, res) => {
  try {
    const result = await trendService.predictKeywordTrends(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📰 뉴스 기반 키워드 관리 (4개 엔드포인트)
// ============================================================================

/**
 * POST /api/trends_db/news-keywords
 * 뉴스 기반 키워드 저장
 */
router.post('/news-keywords', async (req, res) => {
  try {
    const result = await trendService.saveNewsBasedKeywords(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/news-keywords
 * 뉴스 기반 키워드 조회
 */
router.get('/news-keywords', async (req, res) => {
  try {
    const result = await trendService.getNewsBasedKeywords(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/trends_db/news-keywords/:keywordId
 * 뉴스 기반 키워드 업데이트
 */
router.put('/news-keywords/:keywordId', async (req, res) => {
  try {
    const { keywordId } = req.params;
    const result = await trendService.updateNewsKeyword(keywordId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trends_db/news-keywords/refine
 * 뉴스 키워드 정제
 */
router.post('/news-keywords/refine', async (req, res) => {
  try {
    const result = await trendService.refineNewsKeywords(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📊 트렌드 통계 및 분석 (3개 엔드포인트)
// ============================================================================

/**
 * GET /api/trends_db/analytics/stats
 * 트렌드 통계 조회
 */
router.get('/analytics/stats', async (req, res) => {
  try {
    const result = await trendService.getTrendStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/analytics/patterns
 * 트렌드 패턴 분석
 */
router.get('/analytics/patterns', async (req, res) => {
  try {
    const result = await trendService.analyzeTrendPatterns(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/analytics/insights
 * 트렌드 인사이트 생성
 */
router.get('/analytics/insights', async (req, res) => {
  try {
    const result = await trendService.generateTrendInsights(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🧹 유틸리티 및 관리 기능 (2개 엔드포인트)
// ============================================================================

/**
 * DELETE /api/trends_db/cleanup/expired
 * 만료된 트렌드 데이터 정리
 */
router.delete('/cleanup/expired', async (req, res) => {
  try {
    const result = await trendService.cleanupExpiredTrends();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trends_db/dashboard
 * 트렌드 서비스 대시보드 데이터
 */
router.get('/dashboard', async (req, res) => {
  try {
    const result = await trendService.getTrendDashboard();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 🎯 라우터 내보내기
// ============================================================================

export default router; 