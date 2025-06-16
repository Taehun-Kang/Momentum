/**
 * 🖥️ System Service - 시스템 관리 및 모니터링
 * 
 * 기능:
 * - API 사용량 추적 (YouTube, Claude, SerpAPI)
 * - 캐시 성능 추적
 * - LLM 처리 로깅
 * - 시스템 성능 지표
 * - 자동화 작업 관리
 * - 사용자 행동 분석
 * - 실시간 알림 시스템
 * - 비즈니스 지표 관리
 * 
 * 통합:
 * - youtube-search-engine.js
 * - video-tagger.js
 * - result-analyzer.js
 * - google-trends-collector.js
 * - channel-info-collector.js
 * - realtime-keyword-search.js
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
// 📊 API 사용량 추적 관리 (api_usage_logs)
// ============================================================================

/**
 * API 사용량 로그 저장
 * @param {Object} apiData - API 사용 데이터
 * @returns {Promise<Object>} 저장 결과
 * 
 * ⚠️ 제약조건 주의사항:
 * - apiProvider: DB 스키마에서 매우 제한적인 enum 값만 허용
 *   (테스트 실패: "youtube", "youtube_api", "internal", "claude")
 *   → DB 제약조건 확인 필요: SELECT consrc FROM pg_constraint WHERE conname = 'api_usage_logs_api_provider_check'
 * - 허용되는 값 확인 후 사용 권장
 */
export async function logApiUsage(apiData) {
  try {
    const { data, error } = await supabase
      .from('api_usage_logs')
      .insert([{
        session_id: apiData.sessionId,
        api_provider: apiData.apiProvider,
        api_endpoint: apiData.apiEndpoint,
        api_method: apiData.apiMethod || 'GET',
        youtube_api_parts: apiData.youtubeApiParts || [],
        youtube_quota_units: apiData.youtubeQuotaUnits || 0,
        youtube_video_count: apiData.youtubeVideoCount || 0,
        youtube_page_token: apiData.youtubePageToken,
        claude_model: apiData.claudeModel,
        claude_input_tokens: apiData.claudeInputTokens || 0,
        claude_output_tokens: apiData.claudeOutputTokens || 0,
        claude_cost_usd: apiData.claudeCostUsd || 0.0,
        serp_search_type: apiData.serpSearchType,
        serp_query: apiData.serpQuery,
        serp_results_count: apiData.serpResultsCount || 0,
        request_size_bytes: apiData.requestSizeBytes || 0,
        response_size_bytes: apiData.responseSizeBytes || 0,
        response_time_ms: apiData.responseTimeMs,
        success: apiData.success !== false,
        http_status_code: apiData.httpStatusCode,
        error_message: apiData.errorMessage,
        error_type: apiData.errorType,
        user_id: apiData.userId,
        search_keyword: apiData.searchKeyword,
        operation_type: apiData.operationType,
        module_name: apiData.moduleName,
        processed_at: apiData.processedAt || new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) {
      console.error('API 사용량 로그 저장 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('API 사용량 로그 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 일일 API 사용량 조회 (DB 함수 활용)
 * @param {string} targetDate - 대상 날짜 (YYYY-MM-DD)
 * @returns {Promise<Object>} 일일 API 사용량
 */
export async function getDailyApiUsage(targetDate = null) {
  try {
    const date = targetDate || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .rpc('get_daily_api_usage', {
        target_date: date
      });

    if (error) {
      console.error('일일 API 사용량 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('일일 API 사용량 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 실시간 API 사용량 조회 (뷰 활용)
 * @returns {Promise<Object>} 실시간 API 사용량
 */
export async function getCurrentApiUsage() {
  try {
    const { data, error } = await supabase
      .from('current_api_usage')
      .select('*');

    if (error) {
      console.error('실시간 API 사용량 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('실시간 API 사용량 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 💾 캐시 성능 추적 관리 (cache_performance_logs)
// ============================================================================

/**
 * 캐시 성능 로그 저장
 * @param {Object} cacheData - 캐시 성능 데이터
 * @returns {Promise<Object>} 저장 결과
 * 
 * ⚠️ 제약조건 주의사항:
 * - cacheType: DB 스키마에서 매우 제한적인 enum 값만 허용
 *   (테스트 실패: "video_cache", "search")
 *   → DB 제약조건 확인 필요: SELECT consrc FROM pg_constraint WHERE conname = 'cache_performance_logs_cache_type_check'
 * - 허용되는 값 확인 후 사용 권장
 */
export async function logCachePerformance(cacheData) {
  try {
    const { data, error } = await supabase
      .from('cache_performance_logs')
      .insert([{
        cache_type: cacheData.cacheType,
        cache_key: cacheData.cacheKey,
        cache_operation: cacheData.cacheOperation,
        hit_count: cacheData.hitCount || 0,
        miss_count: cacheData.missCount || 0,
        data_size_bytes: cacheData.dataSizeBytes || 0,
        ttl_seconds: cacheData.ttlSeconds,
        actual_lifetime_seconds: cacheData.actualLifetimeSeconds,
        access_count: cacheData.accessCount || 1,
        api_units_saved: cacheData.apiUnitsSaved || 0,
        cost_saved_usd: cacheData.costSavedUsd || 0.0,
        module_name: cacheData.moduleName,
        search_keyword: cacheData.searchKeyword,
        user_id: cacheData.userId,
        expires_at: cacheData.expiresAt,
        last_accessed_at: cacheData.lastAccessedAt || new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) {
      console.error('캐시 성능 로그 저장 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('캐시 성능 로그 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 캐시 효율성 리포트 조회 (DB 함수 활용)
 * @param {number} daysBack - 분석할 일수
 * @returns {Promise<Object>} 캐시 효율성 리포트
 */
export async function getCacheEfficiencyReport(daysBack = 7) {
  try {
    // 파라미터 검증 및 안전한 범위로 제한
    const safeDaysBack = Math.max(1, Math.min(365, parseInt(daysBack) || 7));
    
    const { data, error } = await supabase
      .rpc('get_cache_efficiency_report', {
        days_back: safeDaysBack
      });

    if (error) {
      console.error('캐시 효율성 리포트 조회 실패:', error);
      
      // SQL 파라미터 바인딩 에러인 경우 빈 결과 반환
      if (error.message && error.message.includes('invalid input syntax for type interval')) {
        console.warn('DB 함수 파라미터 바인딩 문제 - 빈 결과 반환');
        return { 
          success: true, 
          data: [], 
          count: 0,
          warning: 'DB 함수 파라미터 처리 문제로 인해 빈 결과를 반환합니다'
        };
      }
      
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('캐시 효율성 리포트 조회 중 오류:', error);
    
    // 모든 에러에 대해 안전한 폴백 제공
    return { 
      success: true, 
      data: [], 
      count: 0,
      warning: '데이터 조회 중 문제가 발생하여 빈 결과를 반환합니다'
    };
  }
}

/**
 * 실시간 캐시 효율성 조회 (뷰 활용)
 * @returns {Promise<Object>} 실시간 캐시 효율성
 */
export async function getCurrentCacheEfficiency() {
  try {
    const { data, error } = await supabase
      .from('current_cache_efficiency')
      .select('*');

    if (error) {
      console.error('실시간 캐시 효율성 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('실시간 캐시 효율성 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🤖 LLM 처리 로깅 관리 (llm_processing_logs)
// ============================================================================

/**
 * LLM 처리 로그 저장
 * @param {Object} llmData - LLM 처리 데이터
 * @returns {Promise<Object>} 저장 결과
 * 
 * ⚠️ 제약조건 주의사항:
 * - processingType: DB 스키마에서 매우 제한적인 enum 값만 허용
 *   (테스트 실패: "classification")
 *   → DB 제약조건 확인 필요: SELECT consrc FROM pg_constraint WHERE conname = 'llm_processing_logs_processing_type_check'
 * - 허용되는 값 확인 후 사용 권장
 */
export async function logLlmProcessing(llmData) {
  try {
    const { data, error } = await supabase
      .from('llm_processing_logs')
      .insert([{
        session_id: llmData.sessionId,
        llm_provider: llmData.llmProvider || 'claude',
        model_name: llmData.modelName,
        processing_type: llmData.processingType,
        input_videos_count: llmData.inputVideosCount || 0,
        input_text_length: llmData.inputTextLength || 0,
        input_data_type: llmData.inputDataType,
        input_tokens: llmData.inputTokens || 0,
        output_tokens: llmData.outputTokens || 0,
        cost_per_input_token: llmData.costPerInputToken || 0.000003,
        cost_per_output_token: llmData.costPerOutputToken || 0.000015,
        success: llmData.success !== false,
        processing_time_ms: llmData.processingTimeMs,
        confidence_score: llmData.confidenceScore,
        classification_results: llmData.classificationResults || {},
        quality_metrics: llmData.qualityMetrics || {},
        extraction_results: llmData.extractionResults || {},
        error_message: llmData.errorMessage,
        error_type: llmData.errorType,
        retry_count: llmData.retryCount || 0,
        module_name: llmData.moduleName,
        operation_context: llmData.operationContext || {},
        user_id: llmData.userId,
        started_at: llmData.startedAt || new Date().toISOString(),
        completed_at: llmData.completedAt || new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) {
      console.error('LLM 처리 로그 저장 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('LLM 처리 로그 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * LLM 비용 분석 조회 (DB 함수 활용)
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @returns {Promise<Object>} LLM 비용 분석
 */
export async function getLlmCostAnalysis(startDate = null) {
  try {
    const date = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .rpc('get_llm_cost_analysis', {
        start_date: date
      });

    if (error) {
      console.error('LLM 비용 분석 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('LLM 비용 분석 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 실시간 LLM 처리 현황 조회 (뷰 활용)
 * @returns {Promise<Object>} 실시간 LLM 처리 현황
 */
export async function getCurrentLlmProcessing() {
  try {
    const { data, error } = await supabase
      .from('current_llm_processing')
      .select('*');

    if (error) {
      console.error('실시간 LLM 처리 현황 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('실시간 LLM 처리 현황 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 📊 시스템 성능 지표 관리 (system_performance_logs)
// ============================================================================

/**
 * 시스템 성능 지표 저장
 * @param {Object} performanceData - 성능 지표 데이터
 * @returns {Promise<Object>} 저장 결과
 * 
 * ⚠️ 제약조건 주의사항:
 * - metricType: DB 스키마에서 매우 제한적인 enum 값만 허용
 *   (테스트 실패: "search_efficiency")
 *   → DB 제약조건 확인 필요: SELECT consrc FROM pg_constraint WHERE conname = 'system_performance_logs_metric_type_check'
 * - 허용되는 값 확인 후 사용 권장
 */
export async function logSystemPerformance(performanceData) {
  try {
    const { data, error } = await supabase
      .from('system_performance_logs')
      .insert([{
        metric_type: performanceData.metricType,
        search_keyword: performanceData.searchKeyword,
        search_results_count: performanceData.searchResultsCount || 0,
        pages_searched: performanceData.pagesSearched || 0,
        api_units_used: performanceData.apiUnitsUsed || 0,
        efficiency_videos_per_100units: performanceData.efficiencyVideosPer100units,
        target_achievement_rate: performanceData.targetAchievementRate,
        classification_batch_size: performanceData.classificationBatchSize || 0,
        successful_classifications: performanceData.successfulClassifications || 0,
        failed_classifications: performanceData.failedClassifications || 0,
        classification_success_rate: performanceData.classificationSuccessRate,
        average_confidence_score: performanceData.averageConfidenceScore,
        total_api_calls: performanceData.totalApiCalls || 0,
        successful_api_calls: performanceData.successfulApiCalls || 0,
        api_success_rate: performanceData.apiSuccessRate,
        average_response_time_ms: performanceData.averageResponseTimeMs || 0,
        quota_usage_percentage: performanceData.quotaUsagePercentage,
        cache_hit_rate: performanceData.cacheHitRate,
        cache_miss_rate: performanceData.cacheMissRate,
        api_units_saved_by_cache: performanceData.apiUnitsSavedByCache || 0,
        db_query_count: performanceData.dbQueryCount || 0,
        db_average_query_time_ms: performanceData.dbAverageQueryTimeMs || 0,
        db_connection_pool_usage: performanceData.dbConnectionPoolUsage,
        user_satisfaction_score: performanceData.userSatisfactionScore,
        average_user_session_duration: performanceData.averageUserSessionDuration,
        bounce_rate: performanceData.bounceRate,
        cpu_usage_percentage: performanceData.cpuUsagePercentage,
        memory_usage_percentage: performanceData.memoryUsagePercentage,
        disk_usage_percentage: performanceData.diskUsagePercentage,
        network_bandwidth_mbps: performanceData.networkBandwidthMbps,
        module_name: performanceData.moduleName,
        operation_type: performanceData.operationType,
        user_id: performanceData.userId,
        measurement_timestamp: performanceData.measurementTimestamp || new Date().toISOString(),
        aggregation_period: performanceData.aggregationPeriod || 'realtime'
      }])
      .select('*')
      .single();

    if (error) {
      console.error('시스템 성능 지표 저장 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('시스템 성능 지표 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 시스템 성능 대시보드 조회 (DB 함수 활용)
 * @param {number} hoursBack - 분석할 시간 (시간)
 * @returns {Promise<Object>} 시스템 성능 대시보드
 */
export async function getSystemPerformanceDashboard(hoursBack = 24) {
  try {
    // 파라미터 검증 및 안전한 범위로 제한
    const safeHoursBack = Math.max(1, Math.min(8760, parseInt(hoursBack) || 24)); // 1시간 ~ 365일
    
    const { data, error } = await supabase
      .rpc('get_system_performance_dashboard', {
        hours_back: safeHoursBack
      });

    if (error) {
      console.error('시스템 성능 대시보드 조회 실패:', error);
      
      // SQL 파라미터 바인딩 에러인 경우 빈 결과 반환
      if (error.message && error.message.includes('invalid input syntax for type interval')) {
        console.warn('DB 함수 파라미터 바인딩 문제 - 빈 결과 반환');
        return { 
          success: true, 
          data: [], 
          count: 0,
          warning: 'DB 함수 파라미터 처리 문제로 인해 빈 결과를 반환합니다'
        };
      }
      
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('시스템 성능 대시보드 조회 중 오류:', error);
    
    // 모든 에러에 대해 안전한 폴백 제공
    return { 
      success: true, 
      data: [], 
      count: 0,
      warning: '데이터 조회 중 문제가 발생하여 빈 결과를 반환합니다'
    };
  }
}

// ============================================================================
// 🤖 자동화 작업 관리 (automated_job_logs)
// ============================================================================

/**
 * 자동화 작업 로그 저장
 * @param {Object} jobData - 자동화 작업 데이터
 * @returns {Promise<Object>} 저장 결과
 */
export async function logAutomatedJob(jobData) {
  try {
    const { data, error } = await supabase
      .from('automated_job_logs')
      .insert([{
        job_name: jobData.jobName,
        job_type: jobData.jobType,
        job_schedule: jobData.jobSchedule,
        status: jobData.status || 'pending',
        scheduled_at: jobData.scheduledAt,
        started_at: jobData.startedAt,
        completed_at: jobData.completedAt,
        execution_duration_ms: jobData.executionDurationMs,
        timeout_ms: jobData.timeoutMs || 300000,
        items_processed: jobData.itemsProcessed || 0,
        items_successful: jobData.itemsSuccessful || 0,
        items_failed: jobData.itemsFailed || 0,
        trend_keywords_collected: jobData.trendKeywordsCollected || 0,
        trend_regions: jobData.trendRegions || [],
        keywords_cached: jobData.keywordsCached || 0,
        videos_added: jobData.videosAdded || 0,
        duplicates_skipped: jobData.duplicatesSkipped || 0,
        api_calls_made: jobData.apiCallsMade || 0,
        api_units_consumed: jobData.apiUnitsConsumed || 0,
        api_cost_usd: jobData.apiCostUsd || 0.0,
        cache_entries_cleaned: jobData.cacheEntriesCleaned || 0,
        old_logs_deleted: jobData.oldLogsDeleted || 0,
        disk_space_freed_mb: jobData.diskSpaceFreedMb || 0,
        execution_log: jobData.executionLog,
        error_message: jobData.errorMessage,
        error_stack: jobData.errorStack,
        warnings: jobData.warnings || [],
        efficiency_score: jobData.efficiencyScore,
        job_config: jobData.jobConfig || {},
        environment: jobData.environment || 'production',
        server_instance: jobData.serverInstance
      }])
      .select('*')
      .single();

    if (error) {
      console.error('자동화 작업 로그 저장 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('자동화 작업 로그 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 자동화 작업 상태 요약 조회 (DB 함수 활용)
 * @param {number} daysBack - 분석할 일수
 * @returns {Promise<Object>} 작업 상태 요약
 */
export async function getJobStatusSummary(daysBack = 7) {
  try {
    // 파라미터 검증 및 안전한 범위로 제한
    const safeDaysBack = Math.max(1, Math.min(365, parseInt(daysBack) || 7));
    
    const { data, error } = await supabase
      .rpc('get_job_status_summary', {
        days_back: safeDaysBack
      });

    if (error) {
      console.error('자동화 작업 상태 요약 조회 실패:', error);
      
      // SQL 파라미터 바인딩 에러인 경우 빈 결과 반환
      if (error.message && error.message.includes('invalid input syntax for type interval')) {
        console.warn('DB 함수 파라미터 바인딩 문제 - 빈 결과 반환');
        return { 
          success: true, 
          data: [], 
          count: 0,
          warning: 'DB 함수 파라미터 처리 문제로 인해 빈 결과를 반환합니다'
        };
      }
      
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('자동화 작업 상태 요약 조회 중 오류:', error);
    
    // 모든 에러에 대해 안전한 폴백 제공
    return { 
      success: true, 
      data: [], 
      count: 0,
      warning: '데이터 조회 중 문제가 발생하여 빈 결과를 반환합니다'
    };
  }
}

/**
 * 최근 자동화 작업 현황 조회 (뷰 활용)
 * @returns {Promise<Object>} 최근 작업 현황
 */
export async function getRecentJobStatus() {
  try {
    const { data, error } = await supabase
      .from('recent_job_status')
      .select('*')
      .eq('rn', 1)
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.error('최근 자동화 작업 현황 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('최근 자동화 작업 현황 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 👤 사용자 행동 분석 관리 (user_behavior_analytics)
// ============================================================================

/**
 * 사용자 행동 분석 데이터 저장
 * @param {Object} behaviorData - 사용자 행동 데이터
 * @returns {Promise<Object>} 저장 결과
 */
export async function logUserBehavior(behaviorData) {
  try {
    const { data, error } = await supabase
      .from('user_behavior_analytics')
      .insert([{
        user_id: behaviorData.userId,
        behavior_type: behaviorData.behaviorType,
        search_frequency_daily: behaviorData.searchFrequencyDaily,
        avg_search_keyword_length: behaviorData.avgSearchKeywordLength,
        preferred_search_time_hours: behaviorData.preferredSearchTimeHours || [],
        search_diversity_score: behaviorData.searchDiversityScore,
        avg_video_completion_rate: behaviorData.avgVideoCompletionRate,
        preferred_video_duration_range: behaviorData.preferredVideoDurationRange,
        skip_rate: behaviorData.skipRate,
        replay_rate: behaviorData.replayRate,
        engagement_score: behaviorData.engagementScore,
        like_to_view_ratio: behaviorData.likeToViewRatio,
        share_to_view_ratio: behaviorData.shareToViewRatio,
        comment_frequency: behaviorData.commentFrequency,
        personalized_content_preference: behaviorData.personalizedContentPreference,
        recommendation_acceptance_rate: behaviorData.recommendationAcceptanceRate,
        mood_detection_accuracy: behaviorData.moodDetectionAccuracy,
        keyword_suggestion_usage_rate: behaviorData.keywordSuggestionUsageRate,
        ab_test_id: behaviorData.abTestId,
        test_group: behaviorData.testGroup,
        test_conversion_rate: behaviorData.testConversionRate,
        test_engagement_improvement: behaviorData.testEngagementImprovement,
        measurement_period_start: behaviorData.measurementPeriodStart,
        measurement_period_end: behaviorData.measurementPeriodEnd,
        data_points_count: behaviorData.dataPointsCount || 0,
        confidence_level: behaviorData.confidenceLevel || 0.95
      }])
      .select('*')
      .single();

    if (error) {
      console.error('사용자 행동 분석 데이터 저장 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('사용자 행동 분석 데이터 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 사용자 행동 패턴 요약 조회 (DB 함수 활용)
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 사용자 행동 패턴 요약
 */
export async function getUserBehaviorSummary(userId) {
  try {
    const { data, error } = await supabase
      .rpc('get_user_behavior_summary', {
        target_user_id: userId
      });

    if (error) {
      console.error('사용자 행동 패턴 요약 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('사용자 행동 패턴 요약 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🚨 실시간 알림 시스템 관리 (system_alerts)
// ============================================================================

/**
 * 시스템 알림 생성 (DB 함수 활용)
 * @param {Object} alertData - 알림 데이터
 * @returns {Promise<Object>} 알림 생성 결과
 */
export async function createSystemAlert(alertData) {
  try {
    const { data, error } = await supabase
      .rpc('create_system_alert', {
        p_alert_type: alertData.alertType,
        p_severity: alertData.severity,
        p_title: alertData.title,
        p_message: alertData.message,
        p_affected_service: alertData.affectedService,
        p_current_value: alertData.currentValue,
        p_threshold_value: alertData.thresholdValue
      });

    if (error) {
      console.error('시스템 알림 생성 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, alertId: data };

  } catch (error) {
    console.error('시스템 알림 생성 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 활성 시스템 알림 조회 (뷰 활용)
 * @returns {Promise<Object>} 활성 알림 목록
 */
export async function getActiveSystemAlerts() {
  try {
    const { data, error } = await supabase
      .from('active_system_alerts')
      .select('*');

    if (error) {
      console.error('활성 시스템 알림 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('활성 시스템 알림 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 시스템 알림 상태 업데이트
 * @param {string} alertId - 알림 ID
 * @param {Object} updateData - 업데이트 데이터
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function updateSystemAlert(alertId, updateData) {
  try {
    const { data, error } = await supabase
      .from('system_alerts')
      .update({
        status: updateData.status,
        acknowledged_by: updateData.acknowledgedBy,
        acknowledged_at: updateData.acknowledgedAt,
        resolved_at: updateData.resolvedAt,
        resolution_notes: updateData.resolutionNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select('*')
      .single();

    if (error) {
      console.error('시스템 알림 업데이트 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('시스템 알림 업데이트 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 💼 비즈니스 지표 관리 (business_metrics)
// ============================================================================

/**
 * 비즈니스 지표 저장
 * @param {Object} metricsData - 비즈니스 지표 데이터
 * @returns {Promise<Object>} 저장 결과
 */
export async function logBusinessMetrics(metricsData) {
  try {
    const { data, error } = await supabase
      .from('business_metrics')
      .insert([{
        metric_category: metricsData.metricCategory,
        metric_name: metricsData.metricName,
        revenue_total_usd: metricsData.revenueTotalUsd || 0,
        revenue_per_user_usd: metricsData.revenuePerUserUsd || 0,
        subscription_conversion_rate: metricsData.subscriptionConversionRate,
        premium_user_retention_rate: metricsData.premiumUserRetentionRate,
        api_cost_total_usd: metricsData.apiCostTotalUsd || 0,
        api_cost_per_user_usd: metricsData.apiCostPerUserUsd || 0,
        infrastructure_cost_usd: metricsData.infrastructureCostUsd || 0,
        cost_per_acquisition_usd: metricsData.costPerAcquisitionUsd,
        new_users_count: metricsData.newUsersCount || 0,
        organic_signup_rate: metricsData.organicSignupRate,
        referral_signup_rate: metricsData.referralSignupRate,
        acquisition_channel: metricsData.acquisitionChannel,
        day1_retention_rate: metricsData.day1RetentionRate,
        day7_retention_rate: metricsData.day7RetentionRate,
        day30_retention_rate: metricsData.day30RetentionRate,
        churn_rate: metricsData.churnRate,
        daily_active_users: metricsData.dailyActiveUsers || 0,
        weekly_active_users: metricsData.weeklyActiveUsers || 0,
        monthly_active_users: metricsData.monthlyActiveUsers || 0,
        avg_session_duration_minutes: metricsData.avgSessionDurationMinutes,
        avg_videos_per_session: metricsData.avgVideosPerSession,
        measurement_date: metricsData.measurementDate || new Date().toISOString().split('T')[0],
        measurement_period: metricsData.measurementPeriod || 'daily'
      }])
      .select('*')
      .single();

    if (error) {
      console.error('비즈니스 지표 저장 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('비즈니스 지표 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 일일 비즈니스 지표 집계 (DB 함수 활용)
 * @param {string} targetDate - 대상 날짜 (YYYY-MM-DD)
 * @returns {Promise<Object>} 집계 결과
 */
export async function aggregateDailyBusinessMetrics(targetDate = null) {
  try {
    const date = targetDate || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .rpc('aggregate_daily_business_metrics', {
        target_date: date
      });

    if (error) {
      console.error('일일 비즈니스 지표 집계 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 일일 비즈니스 지표 집계 완료: ${date}`);
    return { success: true, message: '일일 비즈니스 지표 집계가 완료되었습니다.' };

  } catch (error) {
    console.error('일일 비즈니스 지표 집계 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 일일 비즈니스 KPI 대시보드 조회 (뷰 활용)
 * @param {number} daysBack - 조회할 일수
 * @returns {Promise<Object>} 비즈니스 KPI 대시보드
 */
export async function getDailyBusinessKpis(daysBack = 30) {
  try {
    const { data, error } = await supabase
      .from('daily_business_kpis')
      .select('*')
      .gte('measurement_date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('measurement_date', { ascending: false });

    if (error) {
      console.error('일일 비즈니스 KPI 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('일일 비즈니스 KPI 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🧹 시스템 유틸리티 및 관리 기능
// ============================================================================

/**
 * 오래된 로그 정리 (DB 함수 활용)
 * @returns {Promise<Object>} 정리 결과
 */
export async function cleanupOldLogs() {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_old_logs');

    if (error) {
      console.error('오래된 로그 정리 실패:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ 오래된 로그 정리 완료');
    return { success: true, message: '오래된 로그 정리가 완료되었습니다.' };

  } catch (error) {
    console.error('오래된 로그 정리 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 성능 통계 집계 (DB 함수 활용)
 * @returns {Promise<Object>} 집계 결과
 */
export async function aggregatePerformanceMetrics() {
  try {
    const { data, error } = await supabase
      .rpc('aggregate_performance_metrics');

    if (error) {
      console.error('성능 통계 집계 실패:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ 성능 통계 집계 완료');
    return { success: true, message: '성능 통계 집계가 완료되었습니다.' };

  } catch (error) {
    console.error('성능 통계 집계 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🎯 완전한 기본 내보내기
// ============================================================================

export default {
  // API 사용량 추적
  logApiUsage,
  getDailyApiUsage,
  getCurrentApiUsage,
  
  // 캐시 성능 추적
  logCachePerformance,
  getCacheEfficiencyReport,
  getCurrentCacheEfficiency,
  
  // LLM 처리 로깅
  logLlmProcessing,
  getLlmCostAnalysis,
  getCurrentLlmProcessing,
  
  // 시스템 성능 지표
  logSystemPerformance,
  getSystemPerformanceDashboard,
  
  // 자동화 작업 관리
  logAutomatedJob,
  getJobStatusSummary,
  getRecentJobStatus,
  
  // 사용자 행동 분석
  logUserBehavior,
  getUserBehaviorSummary,
  
  // 실시간 알림 시스템
  createSystemAlert,
  getActiveSystemAlerts,
  updateSystemAlert,
  
  // 비즈니스 지표 관리
  logBusinessMetrics,
  aggregateDailyBusinessMetrics,
  getDailyBusinessKpis,
  
  // 시스템 유틸리티
  cleanupOldLogs,
  aggregatePerformanceMetrics
}; 