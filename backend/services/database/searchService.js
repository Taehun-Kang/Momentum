/**
 * 🔍 Search Service - 검색 로그 관리
 * 
 * 기능:
 * - 검색 로그 저장 및 조회
 * - 인기 키워드 분석
 * - 실시간 트렌드 분석
 * - API 사용량 추적
 * - 사용자 검색 패턴 분석
 * - 성능 모니터링
 * 
 * 통합:
 * - realtime-keyword-search.js
 * - youtube-search-engine.js  
 * - Claude API 연동
 * - YouTube API 할당량 관리
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
// 📝 검색 로그 저장 및 관리
// ============================================================================

/**
 * 새로운 검색 로그 저장
 * @param {Object} searchData - 검색 데이터
 * @returns {Promise<Object>} 생성된 검색 로그
 */
export async function createSearchLog(searchData) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .insert([{
        // 사용자 및 세션 정보
        user_id: searchData.userId || null,
        session_id: searchData.sessionId,
        guest_fingerprint: searchData.guestFingerprint,
        
        // 검색 쿼리 정보
        search_query: searchData.searchQuery,
        original_query: searchData.originalQuery,
        normalized_query: searchData.normalizedQuery,
        search_type: searchData.searchType || 'basic',
        search_source: searchData.searchSource || 'user_input',
        
        // 검색 파라미터
        keywords_used: searchData.keywordsUsed || [],
        filters_applied: searchData.filtersApplied || {},
        sort_order: searchData.sortOrder || 'relevance',
        search_options: searchData.searchOptions || {},
        
        // 검색 결과 정보
        results_count: searchData.resultsCount || 0,
        results_returned: searchData.resultsReturned || 0,
        playable_results_count: searchData.playableResultsCount || 0,
        results_clicked: searchData.resultsClicked || 0,
        result_quality_score: searchData.resultQualityScore,
        relevance_score: searchData.relevanceScore,
        diversity_score: searchData.diversityScore,
        
        // AI 처리 정보
        ai_enabled: searchData.aiEnabled || false,
        ai_method: searchData.aiMethod,
        ai_confidence: searchData.aiConfidence,
        ai_processing_time: searchData.aiProcessingTime,
        ai_tokens_used: searchData.aiTokensUsed || 0,
        ai_cost_usd: searchData.aiCostUsd || 0,
        ai_classified_category: searchData.aiClassifiedCategory,
        ai_suggested_keywords: searchData.aiSuggestedKeywords || [],
        ai_intent_detected: searchData.aiIntentDetected,
        
        // YouTube API 사용량
        api_units_consumed: searchData.apiUnitsConsumed || 0,
        search_api_units: searchData.searchApiUnits || 100,
        videos_api_units: searchData.videosApiUnits || 0,
        channels_api_units: searchData.channelsApiUnits || 0,
        api_calls_made: searchData.apiCallsMade || {},
        quota_category: searchData.quotaCategory || 'realtime_trends',
        
        // 성능 정보
        response_time: searchData.responseTime,
        search_engine_time: searchData.searchEngineTime,
        filter_processing_time: searchData.filterProcessingTime,
        classification_time: searchData.classificationTime,
        cache_hit: searchData.cacheHit || false,
        cache_source: searchData.cacheSource,
        cache_efficiency: searchData.cacheEfficiency,
        
        // 검색 개선
        spell_corrected: searchData.spellCorrected || false,
        did_you_mean: searchData.didYouMean,
        suggested_keywords: searchData.suggestedKeywords || [],
        auto_completed: searchData.autoCompleted || false,
        search_failed: searchData.searchFailed || false,
        failure_reason: searchData.failureReason,
        fallback_used: searchData.fallbackUsed || false,
        fallback_method: searchData.fallbackMethod,
        
        // 디바이스 정보
        ip_address: searchData.ipAddress,
        user_agent: searchData.userAgent,
        device_type: searchData.deviceType,
        browser_info: searchData.browserInfo || {},
        geo_location: searchData.geoLocation || {},
        timezone: searchData.timezone || 'Asia/Seoul',
        
        // 사용자 행동
        is_repeat_search: searchData.isRepeatSearch || false,
        search_sequence_number: searchData.searchSequenceNumber || 1,
        previous_search_query: searchData.previousSearchQuery,
        time_since_last_search: searchData.timeSinceLastSearch,
        user_satisfaction_rating: searchData.userSatisfactionRating,
        user_feedback: searchData.userFeedback,
        exit_without_click: searchData.exitWithoutClick || false,
        
        // 비즈니스 인텔리전스
        search_intent: searchData.searchIntent,
        commercial_intent: searchData.commercialIntent || 'none',
        content_preference: searchData.contentPreference,
        ab_test_variant: searchData.abTestVariant,
        experiment_id: searchData.experimentId,
        
        // realtime-keyword-search.js
        realtime_session_id: searchData.realtimeSessionId,
        keyword_category: searchData.keywordCategory,
        target_video_count: searchData.targetVideoCount || 20,
        max_pages_searched: searchData.maxPagesSearched || 3,
        pages_actually_searched: searchData.pagesActuallySearched || 0,
        new_videos_found: searchData.newVideosFound || 0,
        duplicate_videos_skipped: searchData.duplicateVideosSkipped || 0,
        classification_errors: searchData.classificationErrors || 0,
        channels_discovered: searchData.channelsDiscovered || 0,
        
        // 에러 정보
        error_occurred: searchData.errorOccurred || false,
        error_type: searchData.errorType,
        error_message: searchData.errorMessage,
        error_stack: searchData.errorStack || {},
        api_error_code: searchData.apiErrorCode,
        quota_exceeded: searchData.quotaExceeded || false,
        rate_limited: searchData.rateLimited || false,
        
        // 메타데이터
        referrer_url: searchData.referrerUrl,
        landing_page: searchData.landingPage,
        conversion_event: searchData.conversionEvent,
        search_context: searchData.searchContext || {},
        user_journey_stage: searchData.userJourneyStage,
        raw_search_params: searchData.rawSearchParams || {},
        raw_api_response: searchData.rawApiResponse || {},
        debug_info: searchData.debugInfo || {},
        
        // 타임스탬프
        search_started_at: searchData.searchStartedAt || new Date().toISOString(),
        search_completed_at: searchData.searchCompletedAt
      }])
      .select('*')
      .single();

    if (error) {
      console.error('검색 로그 저장 실패:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ 검색 로그 저장 성공:', data.id);
    return { success: true, data };

  } catch (error) {
    console.error('검색 로그 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 검색 로그 업데이트 (검색 완료 시)
 * @param {string} logId - 검색 로그 ID
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function updateSearchLog(logId, updateData) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
      .select('*')
      .single();

    if (error) {
      console.error('검색 로그 업데이트 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('검색 로그 업데이트 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 검색 로그 조회 (ID로)
 * @param {string} logId - 검색 로그 ID
 * @returns {Promise<Object>} 검색 로그 데이터
 */
export async function getSearchLogById(logId) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error) {
      console.error('검색 로그 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('검색 로그 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 사용자별 검색 로그 조회
 * @param {string} userId - 사용자 ID
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 검색 로그 리스트
 */
export async function getUserSearchLogs(userId, options = {}) {
  try {
    const {
      limit = 50,
      offset = 0,
      searchType = null,
      daysBack = 30,
      includeFailures = false
    } = options;

    let query = supabase
      .from('search_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (searchType) {
      query = query.eq('search_type', searchType);
    }

    if (!includeFailures) {
      query = query.eq('search_failed', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('사용자 검색 로그 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('사용자 검색 로그 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 📊 인기 키워드 및 트렌드 분석
// ============================================================================

/**
 * 인기 키워드 상세 분석 (DB 함수 활용)
 * @param {Object} options - 분석 옵션
 * @returns {Promise<Object>} 인기 키워드 데이터
 */
export async function getPopularKeywordsDetailed(options = {}) {
  try {
    const {
      daysBack = 7,
      minSearches = 2,
      limitCount = 20
    } = options;

    const { data, error } = await supabase
      .rpc('get_popular_keywords_detailed', {
        days_back: daysBack,
        min_searches: minSearches,
        limit_count: limitCount
      });

    if (error) {
      console.error('인기 키워드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('인기 키워드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 실시간 트렌드 키워드 분석 (DB 함수 활용)
 * @param {number} hoursBack - 분석할 시간 범위 (시간)
 * @returns {Promise<Object>} 실시간 트렌드 데이터
 */
export async function getRealtimeTrendKeywords(hoursBack = 1) {
  try {
    const { data, error } = await supabase
      .rpc('get_realtime_trend_keywords', {
        hours_back: hoursBack
      });

    if (error) {
      console.error('실시간 트렌드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('실시간 트렌드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 카테고리별 인기 키워드 조회
 * @param {string} category - 키워드 카테고리
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 카테고리별 인기 키워드
 */
export async function getPopularKeywordsByCategory(category, options = {}) {
  try {
    const {
      daysBack = 7,
      limit = 20
    } = options;

    const { data, error } = await supabase
      .from('search_logs')
      .select('search_query, COUNT(*) as search_count, COUNT(DISTINCT user_id) as unique_users')
      .eq('keyword_category', category)
      .eq('search_failed', false)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .not('search_query', 'is', null)
      .group('search_query')
      .order('search_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('카테고리별 인기 키워드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('카테고리별 인기 키워드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 검색어 자동완성 후보 조회
 * @param {string} prefix - 검색어 접두사
 * @param {number} limit - 결과 개수 제한
 * @returns {Promise<Object>} 자동완성 후보
 */
export async function getSearchAutocompleteSuggestions(prefix, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select('search_query, COUNT(*) as frequency')
      .ilike('search_query', `${prefix}%`)
      .eq('search_failed', false)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .group('search_query')
      .order('frequency', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('자동완성 후보 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data.map(item => item.search_query) };

  } catch (error) {
    console.error('자동완성 후보 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 📈 API 사용량 및 성능 분석
// ============================================================================

/**
 * API 사용량 분석 (DB 함수 활용)
 * @param {number} daysBack - 분석할 일수
 * @returns {Promise<Object>} API 사용량 데이터
 */
export async function analyzeApiUsage(daysBack = 1) {
  try {
    const { data, error } = await supabase
      .rpc('analyze_api_usage', {
        days_back: daysBack
      });

    if (error) {
      console.error('API 사용량 분석 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('API 사용량 분석 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 할당량 카테고리별 사용량 조회
 * @param {number} daysBack - 조회할 일수
 * @returns {Promise<Object>} 카테고리별 사용량
 */
export async function getQuotaUsageByCategory(daysBack = 1) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select(`
        quota_category,
        SUM(api_units_consumed) as total_units,
        COUNT(*) as total_searches,
        AVG(response_time) as avg_response_time
      `)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .group('quota_category')
      .order('total_units', { ascending: false });

    if (error) {
      console.error('할당량 카테고리별 사용량 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('할당량 카테고리별 사용량 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 캐시 효율성 분석
 * @param {number} daysBack - 분석할 일수
 * @returns {Promise<Object>} 캐시 효율성 데이터
 */
export async function analyzeCacheEfficiency(daysBack = 1) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select(`
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as total_searches,
        COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
        AVG(response_time) as avg_response_time,
        AVG(response_time) FILTER (WHERE cache_hit = true) as avg_cache_response_time,
        AVG(response_time) FILTER (WHERE cache_hit = false) as avg_api_response_time
      `)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .group('DATE_TRUNC(hour, created_at)')
      .order('hour', { ascending: false });

    if (error) {
      console.error('캐시 효율성 분석 실패:', error);
      return { success: false, error: error.message };
    }

    // 캐시 적중률 계산
    const processedData = data.map(row => ({
      ...row,
      cache_hit_rate: row.total_searches > 0 ? 
        (row.cache_hits / row.total_searches * 100).toFixed(2) : 0
    }));

    return { success: true, data: processedData };

  } catch (error) {
    console.error('캐시 효율성 분석 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 성능 지표 요약
 * @param {number} daysBack - 분석할 일수
 * @returns {Promise<Object>} 성능 지표 요약
 */
export async function getPerformanceSummary(daysBack = 1) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select(`
        COUNT(*) as total_searches,
        COUNT(*) FILTER (WHERE search_failed = false) as successful_searches,
        COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
        AVG(response_time) as avg_response_time,
        AVG(api_units_consumed) as avg_api_units,
        SUM(api_units_consumed) as total_api_units,
        AVG(ai_cost_usd) as avg_ai_cost,
        SUM(ai_cost_usd) as total_ai_cost
      `)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (error) {
      console.error('성능 지표 요약 조회 실패:', error);
      return { success: false, error: error.message };
    }

    // 계산된 지표 추가
    const summary = {
      ...data,
      success_rate: data.total_searches > 0 ? 
        (data.successful_searches / data.total_searches * 100).toFixed(2) : 0,
      cache_hit_rate: data.total_searches > 0 ? 
        (data.cache_hits / data.total_searches * 100).toFixed(2) : 0,
      api_efficiency: data.total_api_units > 0 ? 
        (data.successful_searches / data.total_api_units).toFixed(4) : 0
    };

    return { success: true, data: summary };

  } catch (error) {
    console.error('성능 지표 요약 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 👤 사용자 검색 패턴 분석
// ============================================================================

/**
 * 사용자 검색 패턴 분석 (DB 함수 활용)
 * @param {string} userId - 사용자 ID
 * @param {number} daysBack - 분석할 일수
 * @returns {Promise<Object>} 사용자 검색 패턴
 */
export async function analyzeUserSearchPatterns(userId, daysBack = 30) {
  try {
    const { data, error } = await supabase
      .rpc('analyze_user_search_patterns', {
        target_user_id: userId,
        days_back: daysBack
      });

    if (error) {
      console.error('사용자 검색 패턴 분석 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] || null };

  } catch (error) {
    console.error('사용자 검색 패턴 분석 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 사용자 선호 키워드 분석
 * @param {string} userId - 사용자 ID
 * @param {number} daysBack - 분석할 일수
 * @returns {Promise<Object>} 사용자 선호 키워드
 */
export async function getUserPreferredKeywords(userId, daysBack = 30) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select(`
        search_query,
        keyword_category,
        COUNT(*) as search_count,
        AVG(user_satisfaction_rating) as avg_satisfaction,
        AVG(results_clicked) as avg_clicks
      `)
      .eq('user_id', userId)
      .eq('search_failed', false)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .not('search_query', 'is', null)
      .group('search_query, keyword_category')
      .order('search_count', { ascending: false })
      .limit(20);

    if (error) {
      console.error('사용자 선호 키워드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('사용자 선호 키워드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 사용자 검색 세션 분석
 * @param {string} sessionId - 세션 ID
 * @returns {Promise<Object>} 세션 분석 데이터
 */
export async function analyzeSearchSession(sessionId) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('search_sequence_number', { ascending: true });

    if (error) {
      console.error('검색 세션 분석 실패:', error);
      return { success: false, error: error.message };
    }

    // 세션 분석 계산
    const sessionAnalysis = {
      total_searches: data.length,
      successful_searches: data.filter(log => !log.search_failed).length,
      total_duration: data.length > 1 ? 
        new Date(data[data.length - 1].created_at) - new Date(data[0].created_at) : 0,
      avg_response_time: data.reduce((sum, log) => sum + (log.response_time || 0), 0) / data.length,
      total_results_clicked: data.reduce((sum, log) => sum + (log.results_clicked || 0), 0),
      query_refinements: data.filter(log => log.spell_corrected || log.auto_completed).length,
      searches: data
    };

    return { success: true, data: sessionAnalysis };

  } catch (error) {
    console.error('검색 세션 분석 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🚨 에러 및 모니터링
// ============================================================================

/**
 * 검색 에러 분석
 * @param {number} daysBack - 분석할 일수
 * @returns {Promise<Object>} 에러 분석 데이터
 */
export async function analyzeSearchErrors(daysBack = 1) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select(`
        error_type,
        api_error_code,
        failure_reason,
        COUNT(*) as error_count,
        COUNT(DISTINCT user_id) as affected_users
      `)
      .eq('error_occurred', true)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .group('error_type, api_error_code, failure_reason')
      .order('error_count', { ascending: false });

    if (error) {
      console.error('검색 에러 분석 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('검색 에러 분석 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 할당량 초과 모니터링
 * @param {number} hoursBack - 모니터링할 시간 (시간)
 * @returns {Promise<Object>} 할당량 상태
 */
export async function monitorQuotaStatus(hoursBack = 24) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select(`
        quota_category,
        SUM(api_units_consumed) as total_units,
        COUNT(*) FILTER (WHERE quota_exceeded = true) as quota_exceeded_count,
        MAX(created_at) as last_quota_exceeded
      `)
      .gte('created_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .group('quota_category');

    if (error) {
      console.error('할당량 모니터링 실패:', error);
      return { success: false, error: error.message };
    }

    // 할당량 한도와 비교
    const quotaLimits = {
      popular_keywords: 2500,
      realtime_trends: 2000,
      premium_users: 3500,
      emergency_reserve: 2000
    };

    const quotaStatus = data.map(category => ({
      ...category,
      quota_limit: quotaLimits[category.quota_category] || 0,
      usage_percentage: category.total_units / (quotaLimits[category.quota_category] || 1) * 100,
      is_approaching_limit: (category.total_units / (quotaLimits[category.quota_category] || 1)) > 0.8
    }));

    return { success: true, data: quotaStatus };

  } catch (error) {
    console.error('할당량 모니터링 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🧹 유틸리티 및 관리 기능
// ============================================================================

/**
 * 만료된 검색 로그 정리 (DB 함수 활용)
 * @returns {Promise<Object>} 정리 결과
 */
export async function cleanupOldSearchLogs() {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_old_search_logs');

    if (error) {
      console.error('검색 로그 정리 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 만료된 검색 로그 ${data}개 정리 완료`);
    return { success: true, deletedCount: data };

  } catch (error) {
    console.error('검색 로그 정리 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 검색 로그 통계 조회 (뷰 활용)
 * @param {string} viewName - 뷰 이름 (successful_searches, trending_searches_1h, api_usage_dashboard)
 * @param {number} limit - 결과 개수 제한
 * @returns {Promise<Object>} 통계 데이터
 */
export async function getSearchLogStatistics(viewName, limit = 50) {
  try {
    const validViews = ['successful_searches', 'trending_searches_1h', 'api_usage_dashboard'];
    
    if (!validViews.includes(viewName)) {
      return { success: false, error: '유효하지 않은 뷰 이름입니다.' };
    }

    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(limit);

    if (error) {
      console.error('검색 로그 통계 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('검색 로그 통계 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 실시간 검색 세션 상태 확인
 * @param {string} realtimeSessionId - 실시간 세션 ID
 * @returns {Promise<Object>} 세션 상태
 */
export async function getRealtimeSearchSessionStatus(realtimeSessionId) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select(`
        id,
        search_query,
        keyword_category,
        target_video_count,
        new_videos_found,
        duplicate_videos_skipped,
        classification_errors,
        channels_discovered,
        pages_actually_searched,
        created_at,
        search_completed_at
      `)
      .eq('realtime_session_id', realtimeSessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('실시간 검색 세션 상태 조회 실패:', error);
      return { success: false, error: error.message };
    }

    // 세션 통계 계산
    const sessionStats = {
      total_searches: data.length,
      total_videos_found: data.reduce((sum, log) => sum + (log.new_videos_found || 0), 0),
      total_duplicates_skipped: data.reduce((sum, log) => sum + (log.duplicate_videos_skipped || 0), 0),
      total_classification_errors: data.reduce((sum, log) => sum + (log.classification_errors || 0), 0),
      total_channels_discovered: data.reduce((sum, log) => sum + (log.channels_discovered || 0), 0),
      session_duration: data.length > 0 ? 
        new Date(data[data.length - 1].created_at) - new Date(data[0].created_at) : 0,
      searches: data
    };

    return { success: true, data: sessionStats };

  } catch (error) {
    console.error('실시간 검색 세션 상태 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 검색 로그 존재 여부 확인
 * @param {string} logId - 검색 로그 ID
 * @returns {Promise<boolean>} 존재 여부
 */
export async function searchLogExists(logId) {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select('id')
      .eq('id', logId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('검색 로그 존재 확인 실패:', error);
      return false;
    }

    return !!data;

  } catch (error) {
    console.error('검색 로그 존재 확인 중 오류:', error);
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
  // 검색 로그 관리
  createSearchLog,
  updateSearchLog,
  getSearchLogById,
  getUserSearchLogs,
  searchLogExists,
  
  // 인기 키워드 및 트렌드
  getPopularKeywordsDetailed,
  getRealtimeTrendKeywords,
  getPopularKeywordsByCategory,
  getSearchAutocompleteSuggestions,
  
  // API 사용량 및 성능 분석
  analyzeApiUsage,
  getQuotaUsageByCategory,
  analyzeCacheEfficiency,
  getPerformanceSummary,
  
  // 사용자 검색 패턴
  analyzeUserSearchPatterns,
  getUserPreferredKeywords,
  analyzeSearchSession,
  
  // 에러 및 모니터링
  analyzeSearchErrors,
  monitorQuotaStatus,
  
  // 유틸리티
  cleanupOldSearchLogs,
  getSearchLogStatistics,
  getRealtimeSearchSessionStatus
}; 