/**
 * 📈 Trend Service - 트렌드 분석 관리
 * 
 * 기능:
 * - Google Trends 원본 데이터 관리 (trends_raw_data)
 * - 뉴스 기반 정제 키워드 관리 (trends_refined_keywords)
 * - 일일/시간별 분석 결과 관리 (trends_analysis_results)
 * - 실시간 키워드 분석 관리 (trends_keyword_analysis)
 * - 트렌드 통계 및 리포트
 * 
 * 통합:
 * - google-trends-collector.js
 * - news-based-trend-refiner.js
 * - realtime-trend-collector.js
 * - Claude AI 분석
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// 📊 Google Trends 원본 데이터 관리 (trends_raw_data)
// ============================================================================

/**
 * Google Trends 원본 데이터 저장
 * @param {Object} trendsData - 트렌드 데이터
 * @returns {Promise<Object>} 저장 결과
 */
export async function createRawTrendData(trendsData) {
  try {
    // ✅ 필수 필드 검증 및 필드명 매핑 (테스트에서 발견된 문제 해결)
    if (!trendsData.keyword) {
      console.error('❌ 필수 필드 누락: keyword');
      return { 
        success: false, 
        error: 'keyword는 필수 필드입니다.' 
      };
    }

    // rank 필드명 매핑 처리 (rank_position → rank)
    const rankValue = trendsData.rank || trendsData.rank_position || trendsData.rankPosition;
    if (rankValue === undefined || rankValue === null) {
      console.error('❌ 필수 필드 누락: rank');
      return { 
        success: false, 
        error: 'rank 필드는 필수입니다. rank_position 또는 rankPosition으로 전송하셔도 됩니다.' 
      };
    }

    const { data, error } = await supabase
      .from('trends_raw_data')
      .insert([{
        // Google Trends 기본 정보 (camelCase/snake_case 지원)
        keyword: trendsData.keyword,
        rank: rankValue,  // ✅ rank_position, rankPosition 모두 지원
        trend_score: trendsData.trend_score || trendsData.trendScore || 0.0,
        normalized_score: trendsData.normalized_score || trendsData.normalizedScore || 0.0,
        
        // 지역 및 언어
        region_code: trendsData.regionCode || 'KR',
        language_code: trendsData.languageCode || 'ko',
        
        // Google 제공 통계
        search_volume: trendsData.searchVolume,
        increase_percentage: trendsData.increasePercentage,
        categories: trendsData.categories || [],
        primary_category: trendsData.primaryCategory || 'general',
        related_terms: trendsData.relatedTerms || [],
        
        // 시간 정보
        start_timestamp: trendsData.startTimestamp,
        end_timestamp: trendsData.endTimestamp,
        detected_at: trendsData.detectedAt || new Date().toISOString(),
        
        // 상태 및 품질
        is_active: trendsData.isActive || false,
        confidence_score: trendsData.confidenceScore || 0.50,
        quality_grade: trendsData.qualityGrade || 'B',
        
        // 수집 메타데이터
        collection_source: trendsData.collectionSource || 'serp_api',
        serp_api_link: trendsData.serpApiLink,
        collection_batch_id: trendsData.collectionBatchId,
        api_units_consumed: trendsData.apiUnitsConsumed || 1,
        raw_google_data: trendsData.rawGoogleData || {}
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Google Trends 데이터 저장 실패:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Google Trends 데이터 저장 성공:', data.keyword);
    return { success: true, data };

  } catch (error) {
    console.error('Google Trends 데이터 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 배치로 Google Trends 데이터 저장
 * @param {Array} trendsArray - 트렌드 데이터 배열
 * @param {string} batchId - 배치 ID
 * @returns {Promise<Object>} 배치 저장 결과
 */
export async function createRawTrendDataBatch(trendsArray, batchId) {
  try {
    // ✅ 배치 데이터 필수 필드 검증 및 매핑 (테스트에서 발견된 문제 해결)
    const trendsData = trendsArray.map(trend => {
      // rank 필드명 매핑 처리
      const rankValue = trend.rank || trend.rank_position || trend.rankPosition;
      
      return {
        keyword: trend.keyword,
        rank: rankValue,  // ✅ rank_position, rankPosition 모두 지원
        trend_score: trend.trend_score || trend.trendScore || 0.0,
        region_code: trend.region_code || trend.regionCode || 'KR',
        language_code: trend.languageCode || 'ko',
        search_volume: trend.searchVolume,
        increase_percentage: trend.increasePercentage,
        categories: trend.categories || [],
        primary_category: trend.primaryCategory || 'general',
        related_terms: trend.relatedTerms || [],
        is_active: trend.isActive || false,
        confidence_score: trend.confidenceScore || 0.50,
        collection_source: trend.collectionSource || 'serp_api',
        collection_batch_id: batchId,
        api_units_consumed: trend.apiUnitsConsumed || 1,
        raw_google_data: trend.rawGoogleData || {},
        detected_at: new Date().toISOString()
      };
    });

    const { data, error } = await supabase
      .from('trends_raw_data')
      .insert(trendsData)
      .select('*');

    if (error) {
      console.error('배치 Google Trends 데이터 저장 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 배치 Google Trends 데이터 저장 성공: ${data.length}개`);
    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('배치 Google Trends 데이터 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 활성 한국 트렌드 조회 (DB 함수 활용)
 * @param {number} maxKeywords - 최대 키워드 수
 * @returns {Promise<Object>} 활성 한국 트렌드
 */
export async function getActiveKoreanTrends(maxKeywords = 50) {
  try {
    const { data, error } = await supabase
      .rpc('get_active_korean_trends', {
        max_keywords: maxKeywords
      });

    if (error) {
      console.error('활성 한국 트렌드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('활성 한국 트렌드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 지역별 트렌드 통계 조회 (DB 함수 활용)
 * @param {string} regionCode - 지역 코드 (KR, US, JP)
 * @returns {Promise<Object>} 지역별 통계
 */
export async function getTrendStatsByRegion(regionCode = 'KR') {
  try {
    const { data, error } = await supabase
      .rpc('get_trend_stats_by_region', {
        target_region: regionCode
      });

    if (error) {
      console.error('지역별 트렌드 통계 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] || null };

  } catch (error) {
    console.error('지역별 트렌드 통계 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 트렌드 순위별 조회
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 순위별 트렌드
 */
export async function getTrendsByRank(options = {}) {
  try {
    const {
      regionCode = 'KR',
      startRank = 1,
      endRank = 20,
      activeOnly = true,
      date = new Date().toISOString().split('T')[0]
    } = options;

    let query = supabase
      .from('trends_raw_data')
      .select('*')
      .eq('region_code', regionCode)
      .gte('rank', startRank)
      .lte('rank', endRank)
      .gte('detected_at', `${date}T00:00:00`)
      .lt('detected_at', `${date}T23:59:59`)
      .order('rank', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('순위별 트렌드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('순위별 트렌드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 📰 뉴스 기반 정제 키워드 관리 (trends_refined_keywords)
// ============================================================================

/**
 * 정제된 키워드 저장
 * @param {Object} refinedData - 정제된 키워드 데이터
 * @returns {Promise<Object>} 저장 결과
 */
export async function createRefinedKeyword(refinedData) {
  try {
    // ✅ 필수 필드 검증 (테스트에서 발견된 문제 해결)
    if (!refinedData.original_keyword && !refinedData.originalKeyword) {
      console.error('❌ 필수 필드 누락: original_keyword');
      return { 
        success: false, 
        error: 'original_keyword는 필수 필드입니다. NULL 제약조건 위반을 방지하기 위해 반드시 포함해야 합니다.' 
      };
    }

    if (!refinedData.refined_keyword && !refinedData.refinedKeyword) {
      console.error('❌ 필수 필드 누락: refined_keyword');
      return { 
        success: false, 
        error: 'refined_keyword는 필수 필드입니다.' 
      };
    }

    const { data, error } = await supabase
      .from('trends_refined_keywords')
      .insert([{
        // 원본 트렌드 연결
        original_trend_ids: refinedData.originalTrendIds || refinedData.original_trend_ids || [],
        
        // 정제된 키워드 정보 (camelCase/snake_case 모두 지원)
        original_keyword: refinedData.original_keyword || refinedData.originalKeyword,
        refined_keyword: refinedData.refined_keyword || refinedData.refinedKeyword,
        refinement_type: refinedData.refinement_type || refinedData.refinementType || 'news_context',
        
        // 뉴스 분석 결과
        news_articles_count: refinedData.newsArticlesCount || 0,
        news_headlines: refinedData.newsHeadlines || [],
        news_context: refinedData.newsContext,
        news_sentiment: refinedData.newsSentiment || 'neutral',
        
        // Claude AI 분석
        claude_analysis_used: refinedData.claudeAnalysisUsed || false,
        duplicate_theme: refinedData.duplicateTheme,
        original_order: refinedData.originalOrder,
        final_order: refinedData.finalOrder,
        youtube_optimization_notes: refinedData.youtubeOptimizationNotes,
        
        // 품질 및 신뢰도
        refinement_confidence: refinedData.refinementConfidence || 0.50,
        keyword_relevance_score: refinedData.keywordRelevanceScore || 0.50,
        youtube_search_potential: refinedData.youtubeSearchPotential || 0.50,
        
        // 상태
        is_active: refinedData.isActive !== false,
        is_selected_for_youtube: refinedData.isSelectedForYoutube || false,
        blocked_reason: refinedData.blockedReason,
        
        // 처리 메타데이터
        processing_batch_id: refinedData.processingBatchId,
        processing_duration_ms: refinedData.processingDurationMs,
        fallback_used: refinedData.fallbackUsed || false,
        raw_claude_response: refinedData.rawClaudeResponse || {},
        raw_news_data: refinedData.rawNewsData || {},
        
        // 만료 시간
        expires_at: refinedData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }])
      .select('*')
      .single();

    if (error) {
      console.error('정제된 키워드 저장 실패:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ 정제된 키워드 저장 성공:', data.refined_keyword);
    return { success: true, data };

  } catch (error) {
    console.error('정제된 키워드 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * YouTube 검색 준비된 키워드 조회 (DB 함수 활용)
 * @param {number} maxKeywords - 최대 키워드 수
 * @returns {Promise<Object>} YouTube 준비 키워드
 */
export async function getYoutubeReadyKeywords(maxKeywords = 10) {
  try {
    const { data, error } = await supabase
      .rpc('get_youtube_ready_keywords', {
        max_keywords: maxKeywords
      });

    if (error) {
      console.error('YouTube 준비 키워드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('YouTube 준비 키워드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 정제 성과 통계 조회 (DB 함수 활용)
 * @param {string} targetDate - 대상 날짜 (YYYY-MM-DD)
 * @returns {Promise<Object>} 정제 성과 통계
 */
export async function getRefinementStats(targetDate = null) {
  try {
    const date = targetDate || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .rpc('get_refinement_stats', {
        target_date: date
      });

    if (error) {
      console.error('정제 성과 통계 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] || null };

  } catch (error) {
    console.error('정제 성과 통계 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 정제 키워드 성과 업데이트
 * @param {string} refinedKeywordId - 정제 키워드 ID
 * @param {Object} performanceData - 성과 데이터
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function updateRefinedKeywordPerformance(refinedKeywordId, performanceData) {
  try {
    // ✅ 키워드 존재 여부 확인 (테스트에서 발견된 문제 해결)
    const { data: existingKeyword, error: checkError } = await supabase
      .from('trends_refined_keywords')
      .select('id, original_keyword, refined_keyword')
      .eq('id', refinedKeywordId)
      .single();

    if (checkError || !existingKeyword) {
      console.error('❌ 존재하지 않는 정제 키워드:', refinedKeywordId);
      return { 
        success: false, 
        error: `정제 키워드 ID '${refinedKeywordId}'를 찾을 수 없습니다. 먼저 POST /refined-keywords로 키워드를 생성해야 합니다.`,
        code: 'KEYWORD_NOT_FOUND'
      };
    }

    console.log(`✅ 정제 키워드 존재 확인: ${existingKeyword.refined_keyword}`);

    const { data, error } = await supabase
      .from('trends_refined_keywords')
      .update({
        // camelCase/snake_case 모두 지원
        youtube_search_count: performanceData.youtube_search_count || performanceData.youtubeSearchCount,
        video_found_count: performanceData.video_found_count || performanceData.videoFoundCount,
        user_interaction_count: performanceData.user_interaction_count || performanceData.userInteractionCount,
        youtube_video_count: performanceData.youtube_video_count || performanceData.youtubeVideoCount,
        avg_view_count: performanceData.avg_view_count || performanceData.avgViewCount,
        avg_engagement_rate: performanceData.avg_engagement_rate || performanceData.avgEngagementRate,
        success_score: performanceData.success_score || performanceData.successScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', refinedKeywordId)
      .select('*')
      .single();

    if (error) {
      console.error('정제 키워드 성과 업데이트 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 정제 키워드 성과 업데이트 성공: ${data.refined_keyword}`);
    return { success: true, data };

  } catch (error) {
    console.error('정제 키워드 성과 업데이트 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 📊 일일/시간별 분석 결과 관리 (trends_analysis_results)
// ============================================================================

/**
 * 트렌드 분석 결과 저장
 * @param {Object} analysisData - 분석 결과 데이터
 * @returns {Promise<Object>} 저장 결과
 */
export async function createTrendAnalysisResult(analysisData) {
  try {
    const { data, error } = await supabase
      .from('trends_analysis_results')
      .insert([{
        // 분석 기간 정보
        analysis_date: analysisData.analysisDate || new Date().toISOString().split('T')[0],
        analysis_type: analysisData.analysisType || 'daily',
        
        // 분석 결과 요약
        total_trends_collected: analysisData.totalTrendsCollected || 0,
        active_trends_count: analysisData.activeTrendsCount || 0,
        refined_keywords_count: analysisData.refinedKeywordsCount || 0,
        youtube_searches_performed: analysisData.youtubeSearchesPerformed || 0,
        
        // 성과 지표
        avg_refinement_success_rate: analysisData.avgRefinementSuccessRate || 0.0,
        avg_youtube_success_rate: analysisData.avgYoutubeSuccessRate || 0.0,
        total_videos_found: analysisData.totalVideosFound || 0,
        
        // 지역별 통계
        kr_trends_count: analysisData.krTrendsCount || 0,
        us_trends_count: analysisData.usTrendsCount || 0,
        
        // API 사용량
        serp_api_calls: analysisData.serpApiCalls || 0,
        claude_api_calls: analysisData.claudeApiCalls || 0,
        youtube_api_units: analysisData.youtubeApiUnits || 0,
        
        // 메타데이터
        top_categories: analysisData.topCategories || [],
        processing_duration_ms: analysisData.processingDurationMs
      }])
      .select('*')
      .single();

    if (error) {
      console.error('트렌드 분석 결과 저장 실패:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ 트렌드 분석 결과 저장 성공:', data.analysis_date);
    return { success: true, data };

  } catch (error) {
    console.error('트렌드 분석 결과 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 일일 트렌드 요약 생성 (DB 함수 활용)
 * @param {string} targetDate - 대상 날짜 (YYYY-MM-DD)
 * @returns {Promise<Object>} 요약 생성 결과
 */
export async function generateDailyTrendSummary(targetDate = null) {
  try {
    const date = targetDate || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .rpc('generate_daily_trend_summary', {
        target_date: date
      });

    if (error) {
      console.error('일일 트렌드 요약 생성 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 일일 트렌드 요약 생성 완료: ${date}`);
    return { success: true, message: '일일 트렌드 요약이 생성되었습니다.' };

  } catch (error) {
    console.error('일일 트렌드 요약 생성 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 분석 결과 조회 (기간별)
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 분석 결과
 */
export async function getTrendAnalysisResults(options = {}) {
  try {
    const {
      analysisType = 'daily',
      startDate = null,
      endDate = null,
      limit = 30
    } = options;

    let query = supabase
      .from('trends_analysis_results')
      .select('*')
      .eq('analysis_type', analysisType)
      .order('analysis_date', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('analysis_date', startDate);
    }

    if (endDate) {
      query = query.lte('analysis_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('분석 결과 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('분석 결과 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🔍 실시간 키워드 분석 관리 (trends_keyword_analysis)
// ============================================================================

/**
 * 전체 키워드 분석 조회 (새로 추가)
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 전체 키워드 분석 결과
 */
export async function getAllKeywordAnalyses(options = {}) {
  try {
    const {
      limit = 50,
      includeExpired = false,
      minQualityScore = 0.0,
      hoursBack = 168, // 기본 7일
      orderBy = 'analysis_timestamp'
    } = options;

    let query = supabase
      .from('trends_keyword_analysis')
      .select('*')
      .gte('analysis_quality_score', minQualityScore)
      .gte('analysis_timestamp', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .order(orderBy, { ascending: false })
      .limit(limit);

    if (!includeExpired) {
      query = query.gt('expires_at', new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('전체 키워드 분석 조회 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 전체 키워드 분석 조회 성공: ${data.length}개`);
    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('전체 키워드 분석 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 실시간 키워드 분석 저장
 * @param {Object} analysisData - 키워드 분석 데이터
 * @returns {Promise<Object>} 저장 결과
 */
export async function createKeywordAnalysis(analysisData) {
  try {
    const { data, error } = await supabase
      .from('trends_keyword_analysis')
      .insert([{
        // 키워드 정보
        keyword: analysisData.keyword,
        analysis_timestamp: analysisData.analysisTimestamp || new Date().toISOString(),
        
        // 실시간 분석 결과
        trend_status: analysisData.trendStatus,
        news_context: analysisData.newsContext,
        public_interest: analysisData.publicInterest,
        
        // YouTube 키워드들
        youtube_keywords: analysisData.youtubeKeywords || [],
        keyword_types: analysisData.keywordTypes || [],
        confidence_levels: analysisData.confidenceLevels || [],
        
        // 뉴스 분석 정보
        news_articles_analyzed: analysisData.newsArticlesAnalyzed || 0,
        frequent_keywords: analysisData.frequentKeywords || [],
        
        // 품질 점수
        analysis_quality_score: analysisData.analysisQualityScore || 0.50,
        
        // Raw 데이터
        raw_claude_analysis: analysisData.rawClaudeAnalysis || {},
        raw_news_data: analysisData.rawNewsData || {},
        
        // 만료 시간
        expires_at: analysisData.expiresAt || new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      }])
      .select('*')
      .single();

    if (error) {
      console.error('키워드 분석 저장 실패:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ 키워드 분석 저장 성공:', data.keyword);
    return { success: true, data };

  } catch (error) {
    console.error('키워드 분석 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드별 분석 결과 조회
 * @param {string} keyword - 키워드
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 분석 결과
 */
export async function getKeywordAnalysis(keyword, options = {}) {
  try {
    const {
      hoursBack = 24,
      includeExpired = false
    } = options;

    let query = supabase
      .from('trends_keyword_analysis')
      .select('*')
      .eq('keyword', keyword)
      .gte('analysis_timestamp', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .order('analysis_timestamp', { ascending: false });

    if (!includeExpired) {
      query = query.gt('expires_at', new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('키워드 분석 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('키워드 분석 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 고품질 키워드 분석 조회
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 고품질 분석 결과
 */
export async function getHighQualityKeywordAnalyses(options = {}) {
  try {
    const {
      minQualityScore = 0.7,
      hoursBack = 12,
      limit = 20
    } = options;

    const { data, error } = await supabase
      .from('trends_keyword_analysis')
      .select('*')
      .gte('analysis_quality_score', minQualityScore)
      .gte('analysis_timestamp', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .gt('expires_at', new Date().toISOString())
      .order('analysis_quality_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('고품질 키워드 분석 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('고품질 키워드 분석 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 📊 트렌드 통계 및 대시보드
// ============================================================================

/**
 * 트렌드 대시보드 데이터 조회 (뷰 활용)
 * @param {number} limit - 결과 개수 제한
 * @returns {Promise<Object>} 대시보드 데이터
 */
export async function getTrendsDashboard(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('trends_dashboard')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('트렌드 대시보드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('트렌드 대시보드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 오늘의 트렌드 요약 조회 (뷰 활용)
 * @returns {Promise<Object>} 오늘의 트렌드 요약
 */
export async function getTodaysTrendSummary() {
  try {
    const { data, error } = await supabase
      .from('todays_trend_summary')
      .select('*')
      .single();

    if (error) {
      console.error('오늘의 트렌드 요약 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('오늘의 트렌드 요약 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 트렌드 성과 지표 조회
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 성과 지표
 */
export async function getTrendPerformanceMetrics(options = {}) {
  try {
    const {
      daysBack = 7,
      regionCode = 'KR'
    } = options;

    // 원본 트렌드 통계
    const { data: rawTrends, error: rawError } = await supabase
      .from('trends_raw_data')
      .select('*')
      .eq('region_code', regionCode)
      .gte('detected_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

    if (rawError) {
      console.error('원본 트렌드 조회 실패:', rawError);
      return { success: false, error: rawError.message };
    }

    // 정제 키워드 통계
    const { data: refinedKeywords, error: refinedError } = await supabase
      .from('trends_refined_keywords')
      .select('*')
      .gte('refined_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

    if (refinedError) {
      console.error('정제 키워드 조회 실패:', refinedError);
      return { success: false, error: refinedError.message };
    }

    // 성과 지표 계산
    const totalRawTrends = rawTrends.length;
    const activeTrends = rawTrends.filter(t => t.is_active).length;
    const totalRefinedKeywords = refinedKeywords.length;
    const youtubeSelectedKeywords = refinedKeywords.filter(k => k.is_selected_for_youtube).length;
    const avgRefinementSuccess = refinedKeywords.length > 0 ? 
      refinedKeywords.reduce((sum, k) => sum + (k.success_rate || 0), 0) / refinedKeywords.length : 0;

    const metrics = {
      collection_metrics: {
        total_raw_trends: totalRawTrends,
        active_trends: activeTrends,
        activation_rate: totalRawTrends > 0 ? (activeTrends / totalRawTrends * 100).toFixed(2) : 0
      },
      refinement_metrics: {
        total_refined_keywords: totalRefinedKeywords,
        youtube_selected_count: youtubeSelectedKeywords,
        selection_rate: totalRefinedKeywords > 0 ? (youtubeSelectedKeywords / totalRefinedKeywords * 100).toFixed(2) : 0,
        avg_success_rate: avgRefinementSuccess.toFixed(3)
      },
      api_usage: {
        total_serp_calls: rawTrends.reduce((sum, t) => sum + (t.api_units_consumed || 0), 0),
        claude_analysis_count: refinedKeywords.filter(k => k.claude_analysis_used).length
      },
      time_range: {
        days_analyzed: daysBack,
        region_code: regionCode,
        analysis_date: new Date().toISOString()
      }
    };

    return { success: true, data: metrics };

  } catch (error) {
    console.error('트렌드 성과 지표 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🧹 데이터 정리 및 유틸리티
// ============================================================================

/**
 * 전체 트렌드 데이터 정리 (DB 함수 활용)
 * @returns {Promise<Object>} 정리 결과
 */
export async function cleanupAllTrendData() {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_all_trend_data');

    if (error) {
      console.error('트렌드 데이터 정리 실패:', error);
      return { success: false, error: error.message };
    }

    const cleanupResult = data[0];
    console.log(`✅ 트렌드 데이터 정리 완료:`, cleanupResult);
    return { 
      success: true, 
      data: {
        raw_deleted: cleanupResult.raw_deleted,
        refined_deleted: cleanupResult.refined_deleted,
        analysis_deleted: cleanupResult.analysis_deleted
      }
    };

  } catch (error) {
    console.error('트렌드 데이터 정리 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 만료된 정제 키워드 정리 (DB 함수 활용)
 * @returns {Promise<Object>} 정리 결과
 */
export async function cleanupExpiredRefinedKeywords() {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_expired_refined_keywords');

    if (error) {
      console.error('만료된 정제 키워드 정리 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 만료된 정제 키워드 ${data}개 정리 완료`);
    return { success: true, deletedCount: data };

  } catch (error) {
    console.error('만료된 정제 키워드 정리 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 트렌드 데이터 존재 여부 확인
 * @param {string} keyword - 키워드
 * @param {string} regionCode - 지역 코드
 * @param {string} date - 날짜 (YYYY-MM-DD)
 * @returns {Promise<boolean>} 존재 여부
 */
export async function trendDataExists(keyword, regionCode = 'KR', date = null) {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('trends_raw_data')
      .select('id')
      .eq('keyword', keyword)
      .eq('region_code', regionCode)
      .gte('detected_at', `${targetDate}T00:00:00`)
      .lt('detected_at', `${targetDate}T23:59:59`)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('트렌드 데이터 존재 확인 실패:', error);
      return false;
    }

    return !!data;

  } catch (error) {
    console.error('트렌드 데이터 존재 확인 중 오류:', error);
    return false;
  }
}

// ============================================================================
// 📊 모든 함수들은 개별적으로 export됨 (중복 방지)
// ============================================================================

// ============================================================================
// 🎯 기본 내보내기
// ============================================================================

export default {
  // Google Trends 원본 데이터 관리
  createRawTrendData,
  createRawTrendDataBatch,
  getActiveKoreanTrends,
  getTrendStatsByRegion,
  getTrendsByRank,
  
  // 뉴스 기반 정제 키워드 관리
  createRefinedKeyword,
  getYoutubeReadyKeywords,
  getRefinementStats,
  updateRefinedKeywordPerformance,
  
  // 일일/시간별 분석 결과 관리
  createTrendAnalysisResult,
  generateDailyTrendSummary,
  getTrendAnalysisResults,
  
  // 실시간 키워드 분석 관리
  getAllKeywordAnalyses,
  createKeywordAnalysis,
  getKeywordAnalysis,
  getHighQualityKeywordAnalyses,
  
  // 트렌드 통계 및 대시보드
  getTrendsDashboard,
  getTodaysTrendSummary,
  getTrendPerformanceMetrics,
  
  // 데이터 정리 및 유틸리티
  cleanupAllTrendData,
  cleanupExpiredRefinedKeywords,
  trendDataExists
}; 