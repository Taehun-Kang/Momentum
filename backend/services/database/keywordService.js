/**
 * 🔑 Keyword Service - 일일 키워드 관리 및 성과 추적
 * 
 * 기능:
 * - 일일 키워드 풀 관리 (실행 기반 순환 시스템)
 * - 키워드 갱신 스케줄 관리
 * - 키워드 성과 추적 및 분석
 * - 우선순위별 자동 키워드 선택 (high: 3개, medium: 5개, low: 2개)
 * - API 효율성 및 품질 점수 추적
 * 
 * 통합:
 * - dailyKeywordUpdateService.js
 * - realtime-keyword-search.js
 * - youtube-ai-services/KEYWORDS.md
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
// 🔑 일일 키워드 관리 (daily_keywords)
// ============================================================================

/**
 * 새 키워드 추가 (DB 함수 활용)
 * @param {Object} keywordData - 키워드 데이터
 * @returns {Promise<Object>} 추가 결과
 */
export async function addDailyKeyword(keywordData) {
  try {
    const { data, error } = await supabase
      .rpc('insert_keyword', {
        p_keyword: keywordData.keyword,
        p_category: keywordData.category,
        p_keyword_type: keywordData.keywordType,
        p_priority_tier: keywordData.priorityTier,
        p_min_view_count: keywordData.minViewCount || 30000,
        p_min_engagement_rate: keywordData.minEngagementRate || 2.0,
        p_description: keywordData.description
      });

    if (error) {
      console.error('키워드 추가 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 키워드 추가: ${keywordData.keyword} (${keywordData.priorityTier})`);
    return { success: true, keywordId: data };

  } catch (error) {
    console.error('키워드 추가 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 오늘 실행할 키워드 조회 (DB 함수 활용)
 * @returns {Promise<Object>} 오늘의 키워드 목록
 */
export async function getTodaysKeywords() {
  try {
    const { data, error } = await supabase
      .rpc('get_todays_keywords');

    if (error) {
      console.error('오늘의 키워드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`🎯 오늘 실행할 키워드: ${data.length}개`);
    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('오늘의 키워드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 실행 완료 기록 (DB 함수 활용)
 * @param {Object} updateData - 실행 완료 데이터
 * @returns {Promise<Object>} 완료 기록 결과
 */
export async function completeKeywordUpdate(updateData) {
  try {
    const { data, error } = await supabase
      .rpc('complete_keyword_update', {
        keyword_id: updateData.keywordId,
        videos_found_count: updateData.videosFoundCount,
        videos_cached_count: updateData.videosCachedCount,
        api_units_used: updateData.apiUnitsUsed || 107,
        success: updateData.success !== false,
        error_message: updateData.errorMessage
      });

    if (error) {
      console.error('키워드 실행 완료 기록 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 키워드 실행 완료: ${updateData.keywordId}`);
    return { success: true, message: '키워드 실행 완료가 기록되었습니다.' };

  } catch (error) {
    console.error('키워드 실행 완료 기록 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 목록 조회 (우선순위별 정렬)
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 키워드 목록
 */
export async function getDailyKeywords(options = {}) {
  try {
    const {
      priorityTier = null,
      category = null,
      isActive = true,
      limit = 50
    } = options;

    let query = supabase
      .from('daily_keywords')
      .select(`
        id,
        keyword,
        category,
        keyword_type,
        priority_tier,
        sequence_number,
        min_view_count,
        min_engagement_rate,
        total_searches_performed,
        total_videos_found,
        total_videos_cached,
        avg_videos_per_search,
        success_rate,
        quality_score,
        last_executed_at,
        consecutive_failures,
        is_active,
        is_blocked,
        created_at
      `)
      .eq('is_active', isActive)
      .order('priority_tier')
      .order('sequence_number')
      .limit(limit);

    if (priorityTier) {
      query = query.eq('priority_tier', priorityTier);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('키워드 목록 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('키워드 목록 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 상세 정보 조회 (ID 기반)
 * @param {string} keywordId - 키워드 ID
 * @returns {Promise<Object>} 키워드 상세 정보
 */
export async function getKeywordById(keywordId) {
  try {
    const { data, error } = await supabase
      .from('daily_keywords')
      .select('*')
      .eq('id', keywordId)
      .single();

    if (error) {
      console.error('키워드 상세 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('키워드 상세 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 상세 정보 조회 (키워드명 기반)
 * @param {string} keyword - 키워드명
 * @returns {Promise<Object>} 키워드 상세 정보
 */
export async function getKeywordByName(keyword) {
  try {
    const { data, error } = await supabase
      .from('daily_keywords')
      .select('*')
      .eq('keyword', keyword)
      .single();

    if (error) {
      // 키워드가 없는 경우 더 명확한 메시지
      if (error.code === 'PGRST116') {
        return { 
          success: false, 
          error: `키워드 "${keyword}"를 찾을 수 없습니다.`,
          code: 'KEYWORD_NOT_FOUND'
        };
      }
      console.error('키워드명 기반 조회 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 키워드명으로 조회 성공: ${keyword}`);
    return { success: true, data };

  } catch (error) {
    console.error('키워드명 기반 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 정보 업데이트 (ID 기반)
 * @param {string} keywordId - 키워드 ID
 * @param {Object} updateData - 업데이트 데이터
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function updateDailyKeyword(keywordId, updateData) {
  try {
    const { data, error } = await supabase
      .from('daily_keywords')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', keywordId)
      .select('*')
      .single();

    if (error) {
      console.error('키워드 업데이트 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('키워드 업데이트 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 정보 업데이트 (키워드명 기반)
 * @param {string} keyword - 키워드명
 * @param {Object} updateData - 업데이트 데이터
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function updateDailyKeywordByName(keyword, updateData) {
  try {
    const { data, error } = await supabase
      .from('daily_keywords')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('keyword', keyword)
      .select('*')
      .single();

    if (error) {
      // 키워드가 없는 경우 더 명확한 메시지
      if (error.code === 'PGRST116') {
        return { 
          success: false, 
          error: `키워드 "${keyword}"를 찾을 수 없습니다.`,
          code: 'KEYWORD_NOT_FOUND'
        };
      }
      console.error('키워드명 기반 업데이트 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 키워드명으로 업데이트 성공: ${keyword}`);
    return { success: true, data };

  } catch (error) {
    console.error('키워드명 기반 업데이트 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 활성화/비활성화
 * @param {string} keywordId - 키워드 ID
 * @param {boolean} isActive - 활성화 여부
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function toggleKeywordStatus(keywordId, isActive) {
  try {
    const { data, error } = await supabase
      .from('daily_keywords')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', keywordId)
      .select('keyword, is_active')
      .single();

    if (error) {
      console.error('키워드 상태 변경 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`🔄 키워드 상태 변경: ${data.keyword} → ${isActive ? '활성' : '비활성'}`);
    return { success: true, data };

  } catch (error) {
    console.error('키워드 상태 변경 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 삭제
 * @param {string} keywordId - 키워드 ID
 * @returns {Promise<Object>} 삭제 결과
 */
export async function deleteDailyKeyword(keywordId) {
  try {
    const { data, error } = await supabase
      .from('daily_keywords')
      .delete()
      .eq('id', keywordId)
      .select('keyword')
      .single();

    if (error) {
      console.error('키워드 삭제 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`🗑️ 키워드 삭제: ${data.keyword}`);
    return { success: true, message: `키워드 "${data.keyword}"가 삭제되었습니다.` };

  } catch (error) {
    console.error('키워드 삭제 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 📅 키워드 갱신 스케줄 관리 (keyword_update_schedules)
// ============================================================================

/**
 * 키워드 갱신 스케줄 생성 (DB 함수 활용)
 * @param {Object} scheduleData - 스케줄 데이터
 * @returns {Promise<Object>} 스케줄 생성 결과
 */
export async function scheduleKeywordUpdate(scheduleData) {
  try {
    const { data, error } = await supabase
      .rpc('schedule_keyword_update', {
        keyword_id: scheduleData.keywordId,
        schedule_for: scheduleData.scheduledFor || new Date().toISOString(),
        schedule_type: scheduleData.scheduleType || 'regular'
      });

    if (error) {
      console.error('키워드 스케줄 생성 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`📅 키워드 스케줄 생성: ${scheduleData.keywordId}`);
    return { success: true, scheduleId: data };

  } catch (error) {
    console.error('키워드 스케줄 생성 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 실행 대기 중인 스케줄 조회 (뷰 활용)
 * @returns {Promise<Object>} 대기 중인 스케줄 목록
 */
export async function getPendingSchedules() {
  try {
    const { data, error } = await supabase
      .from('pending_keyword_schedules')
      .select('*')
      .order('scheduled_for');

    if (error) {
      console.error('대기 중인 스케줄 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('대기 중인 스케줄 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 스케줄 상태 업데이트
 * @param {string} scheduleId - 스케줄 ID
 * @param {Object} updateData - 업데이트 데이터
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function updateScheduleStatus(scheduleId, updateData) {
  try {
    const { data, error } = await supabase
      .from('keyword_update_schedules')
      .update({
        status: updateData.status,
        started_at: updateData.startedAt,
        completed_at: updateData.completedAt,
        execution_duration_ms: updateData.executionDurationMs,
        videos_found: updateData.videosFound,
        videos_cached: updateData.videosCached,
        api_units_consumed: updateData.apiUnitsConsumed,
        error_message: updateData.errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId)
      .select('*')
      .single();

    if (error) {
      console.error('스케줄 상태 업데이트 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('스케줄 상태 업데이트 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 오래된 스케줄 정리 (DB 함수 활용)
 * @returns {Promise<Object>} 정리 결과
 */
export async function cleanupOldSchedules() {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_old_keyword_schedules');

    if (error) {
      console.error('오래된 스케줄 정리 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`🧹 오래된 스케줄 정리: ${data}개 삭제`);
    return { success: true, deletedCount: data };

  } catch (error) {
    console.error('오래된 스케줄 정리 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 📊 키워드 성과 추적 (keyword_performance_logs)
// ============================================================================

/**
 * 키워드 성과 로그 저장
 * @param {Object} performanceData - 성과 데이터
 * @returns {Promise<Object>} 저장 결과
 */
export async function logKeywordPerformance(performanceData) {
  try {
    const { data, error } = await supabase
      .from('keyword_performance_logs')
      .insert([{
        daily_keyword_id: performanceData.dailyKeywordId,
        keyword: performanceData.keyword,
        search_session_id: performanceData.searchSessionId,
        videos_found: performanceData.videosFound || 0,
        videos_qualified: performanceData.videosQualified || 0,
        videos_cached: performanceData.videosCached || 0,
        duplicates_removed: performanceData.duplicatesRemoved || 0,
        channels_discovered: performanceData.channelsDiscovered || 0,
        channels_quality_passed: performanceData.channelsQualityPassed || 0,
        avg_video_quality_score: performanceData.avgVideoQualityScore || 0.0,
        avg_view_count: performanceData.avgViewCount || 0,
        avg_engagement_rate: performanceData.avgEngagementRate || 0.0,
        quality_threshold_met: performanceData.qualityThresholdMet || false,
        total_processing_time_ms: performanceData.totalProcessingTimeMs,
        api_response_time_ms: performanceData.apiResponseTimeMs,
        classification_time_ms: performanceData.classificationTimeMs,
        database_save_time_ms: performanceData.databaseSaveTimeMs,
        api_units_consumed: performanceData.apiUnitsConsumed || 0,
        api_cost_usd: performanceData.apiCostUsd || 0.0,
        cost_per_video_usd: performanceData.costPerVideoUsd || 0.0,
        efficiency_score: performanceData.efficiencyScore || 0.0,
        errors_encountered: performanceData.errorsEncountered || 0,
        api_errors: performanceData.apiErrors || 0,
        classification_errors: performanceData.classificationErrors || 0,
        database_errors: performanceData.databaseErrors || 0,
        error_details: performanceData.errorDetails || {},
        search_parameters: performanceData.searchParameters || {},
        filter_criteria: performanceData.filterCriteria || {},
        performance_metrics: performanceData.performanceMetrics || {},
        measurement_start: performanceData.measurementStart,
        measurement_end: performanceData.measurementEnd
      }])
      .select('*')
      .single();

    if (error) {
      console.error('키워드 성과 로그 저장 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('키워드 성과 로그 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 성과 통계 조회 (DB 함수 활용)
 * @param {number} daysBack - 분석할 일수
 * @returns {Promise<Object>} 키워드 성과 통계
 */
export async function getKeywordPerformanceStats(daysBack = 7) {
  try {
    const { data, error } = await supabase
      .rpc('get_keyword_performance_stats', {
        days_back: daysBack
      });

    if (error) {
      console.error('키워드 성과 통계 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('키워드 성과 통계 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 성과 대시보드 조회 (뷰 활용)
 * @returns {Promise<Object>} 키워드 성과 대시보드
 */
export async function getKeywordPerformanceDashboard() {
  try {
    const { data, error } = await supabase
      .from('keyword_performance_dashboard')
      .select('*')
      .order('efficiency_score', { ascending: false })
      .limit(50);

    if (error) {
      console.error('키워드 성과 대시보드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('키워드 성과 대시보드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 특정 키워드의 성과 히스토리 조회
 * @param {string} keywordId - 키워드 ID
 * @param {number} daysBack - 조회할 일수
 * @returns {Promise<Object>} 키워드 성과 히스토리
 */
export async function getKeywordPerformanceHistory(keywordId, daysBack = 30) {
  try {
    const { data, error } = await supabase
      .from('keyword_performance_logs')
      .select(`
        search_session_id,
        videos_found,
        videos_qualified,
        videos_cached,
        avg_video_quality_score,
        avg_view_count,
        efficiency_score,
        api_units_consumed,
        total_processing_time_ms,
        quality_threshold_met,
        created_at
      `)
      .eq('daily_keyword_id', keywordId)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('키워드 성과 히스토리 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('키워드 성과 히스토리 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🔍 키워드 검색 및 필터링
// ============================================================================

/**
 * 키워드 검색 (키워드명, 카테고리별)
 * @param {Object} searchParams - 검색 파라미터
 * @returns {Promise<Object>} 검색 결과
 */
export async function searchKeywords(searchParams) {
  try {
    const {
      keyword = '',
      category = '',
      priorityTier = '',
      isActive = null,
      sortBy = 'sequence_number',
      sortOrder = 'asc',
      limit = 50,
      offset = 0
    } = searchParams;

    let query = supabase
      .from('daily_keywords')
      .select(`
        id,
        keyword,
        category,
        keyword_type,
        priority_tier,
        sequence_number,
        success_rate,
        quality_score,
        total_searches_performed,
        total_videos_found,
        last_executed_at,
        is_active,
        is_blocked
      `)
      .range(offset, offset + limit - 1);

    // 키워드명 검색
    if (keyword) {
      query = query.ilike('keyword', `%${keyword}%`);
    }

    // 카테고리 필터
    if (category) {
      query = query.eq('category', category);
    }

    // 우선순위 티어 필터
    if (priorityTier) {
      query = query.eq('priority_tier', priorityTier);
    }

    // 활성화 상태 필터
    if (isActive !== null) {
      query = query.eq('is_active', isActive);
    }

    // 정렬
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) {
      console.error('키워드 검색 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('키워드 검색 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 카테고리별 키워드 통계
 * @returns {Promise<Object>} 카테고리별 통계
 */
export async function getCategoryStats() {
  try {
    // 전체 활성 키워드 데이터 조회
    const { data, error } = await supabase
      .from('daily_keywords')
      .select(`
        category,
        priority_tier,
        success_rate,
        quality_score,
        total_videos_found
      `)
      .eq('is_active', true);

    if (error) {
      console.error('카테고리별 통계 조회 실패:', error);
      return { success: false, error: error.message };
    }

    // JavaScript에서 그룹화 처리
    const categoryStats = data.reduce((acc, row) => {
      const category = row.category || '미분류';
      const priorityTier = row.priority_tier || 'normal';

      if (!acc[category]) {
        acc[category] = {
          category: category,
          tiers: {},
          totals: {
            keyword_count: 0,
            total_videos_found: 0,
            avg_success_rate: 0,
            avg_quality_score: 0
          }
        };
      }

      if (!acc[category].tiers[priorityTier]) {
        acc[category].tiers[priorityTier] = {
          keyword_count: 0,
          success_rates: [],
          quality_scores: [],
          total_videos_found: 0
        };
      }

      // 티어별 데이터 누적
      acc[category].tiers[priorityTier].keyword_count += 1;
      acc[category].tiers[priorityTier].success_rates.push(row.success_rate || 0);
      acc[category].tiers[priorityTier].quality_scores.push(row.quality_score || 0);
      acc[category].tiers[priorityTier].total_videos_found += row.total_videos_found || 0;

      // 전체 카테고리 합계
      acc[category].totals.keyword_count += 1;
      acc[category].totals.total_videos_found += row.total_videos_found || 0;

      return acc;
    }, {});

    // 평균값 계산
    Object.values(categoryStats).forEach(categoryData => {
      let totalSuccessRates = [];
      let totalQualityScores = [];

      Object.values(categoryData.tiers).forEach(tierData => {
        // 티어별 평균 계산
        tierData.avg_success_rate = tierData.success_rates.length > 0 
          ? tierData.success_rates.reduce((a, b) => a + b, 0) / tierData.success_rates.length 
          : 0;
        tierData.avg_quality_score = tierData.quality_scores.length > 0 
          ? tierData.quality_scores.reduce((a, b) => a + b, 0) / tierData.quality_scores.length 
          : 0;

        // 전체 평균 계산용 배열 누적
        totalSuccessRates.push(...tierData.success_rates);
        totalQualityScores.push(...tierData.quality_scores);

        // 임시 배열 제거
        delete tierData.success_rates;
        delete tierData.quality_scores;
      });

      // 카테고리 전체 평균 계산
      categoryData.totals.avg_success_rate = totalSuccessRates.length > 0 
        ? totalSuccessRates.reduce((a, b) => a + b, 0) / totalSuccessRates.length 
        : 0;
      categoryData.totals.avg_quality_score = totalQualityScores.length > 0 
        ? totalQualityScores.reduce((a, b) => a + b, 0) / totalQualityScores.length 
        : 0;
    });

    return { success: true, data: Object.values(categoryStats) };

  } catch (error) {
    console.error('카테고리별 통계 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🔄 키워드 초기화 및 유틸리티
// ============================================================================

/**
 * 키워드 실행 날짜 초기화 (DB 함수 활용)
 * @returns {Promise<Object>} 초기화 결과
 */
export async function initializeKeywordExecutionDates() {
  try {
    const { data, error } = await supabase
      .rpc('initialize_keyword_execution_dates');

    if (error) {
      console.error('키워드 실행 날짜 초기화 실패:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ 키워드 실행 날짜 초기화 완료');
    return { success: true, message: '키워드 실행 날짜가 초기화되었습니다.' };

  } catch (error) {
    console.error('키워드 실행 날짜 초기화 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 오늘 갱신 대상 키워드 뷰 조회
 * @returns {Promise<Object>} 갱신 대상 키워드 목록
 */
export async function getTodaysUpdateKeywords() {
  try {
    const { data, error } = await supabase
      .from('todays_update_keywords')
      .select('*')
      .order('priority_tier')
      .order('sequence_number');

    if (error) {
      console.error('오늘 갱신 대상 키워드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('오늘 갱신 대상 키워드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드별 순서 재정렬 (중복 키 제약조건 위반 방지)
 * @param {string} priorityTier - 우선순위 티어
 * @param {Array} keywordIds - 새로운 순서의 키워드 ID 배열
 * @returns {Promise<Object>} 재정렬 결과
 */
export async function reorderKeywords(priorityTier, keywordIds) {
  try {
    console.log(`🔄 키워드 순서 재정렬 시작: ${priorityTier} 그룹 ${keywordIds.length}개`);

    // 1단계: 해당 priority_tier의 모든 키워드를 임시 번호로 변경 (중복 방지)
    const { data: existingKeywords, error: fetchError } = await supabase
      .from('daily_keywords')
      .select('id, sequence_number')
      .eq('priority_tier', priorityTier)
      .order('sequence_number');

    if (fetchError) {
      console.error('기존 키워드 조회 실패:', fetchError);
      return { success: false, error: fetchError.message };
    }

    // 2단계: 기존 키워드들을 임시로 큰 번호로 변경 (1000부터 시작)
    const tempUpdates = existingKeywords.map((keyword, index) => 
      supabase
        .from('daily_keywords')
        .update({ sequence_number: 1000 + index })
        .eq('id', keyword.id)
    );

    console.log(`📝 임시 번호 변경: ${existingKeywords.length}개 키워드`);
    const tempResults = await Promise.all(tempUpdates);
    
    const tempErrors = tempResults.filter(result => result.error);
    if (tempErrors.length > 0) {
      console.error('임시 번호 변경 실패:', tempErrors);
      return { success: false, error: '임시 순서 변경에 실패했습니다.' };
    }

    // 3단계: 요청된 키워드들을 새로운 순서로 업데이트
    const finalUpdates = keywordIds.map((keywordId, index) => 
      supabase
        .from('daily_keywords')
        .update({ sequence_number: index + 1 })
        .eq('id', keywordId)
        .eq('priority_tier', priorityTier)
    );

    console.log(`🎯 최종 순서 적용: ${keywordIds.length}개 키워드`);
    const finalResults = await Promise.all(finalUpdates);
    
    // 최종 결과 에러 체크
    const finalErrors = finalResults.filter(result => result.error);
    if (finalErrors.length > 0) {
      console.error('키워드 순서 재정렬 실패:', finalErrors);
      return { success: false, error: '일부 키워드 순서 업데이트에 실패했습니다.', details: finalErrors };
    }

    // 4단계: 재정렬되지 않은 기존 키워드들을 뒤쪽 순서로 재배치
    const unorderedKeywords = existingKeywords.filter(
      keyword => !keywordIds.includes(keyword.id)
    );

    if (unorderedKeywords.length > 0) {
      const remainingUpdates = unorderedKeywords.map((keyword, index) => 
        supabase
          .from('daily_keywords')
          .update({ sequence_number: keywordIds.length + index + 1 })
          .eq('id', keyword.id)
      );

      console.log(`🔄 나머지 키워드 재배치: ${unorderedKeywords.length}개`);
      await Promise.all(remainingUpdates);
    }

    console.log(`✅ 키워드 순서 재정렬 완료: ${priorityTier} 그룹 총 ${existingKeywords.length}개 처리`);
    return { 
      success: true, 
      message: `키워드 순서가 재정렬되었습니다.`,
      reorderedCount: keywordIds.length,
      totalCount: existingKeywords.length
    };

  } catch (error) {
    console.error('키워드 순서 재정렬 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🎯 완전한 기본 내보내기
// ============================================================================

export default {
  // 일일 키워드 관리
  addDailyKeyword,
  getTodaysKeywords,
  completeKeywordUpdate,
  getDailyKeywords,
  getKeywordById,
  getKeywordByName,                    // 🆕 키워드명으로 조회
  updateDailyKeyword,
  updateDailyKeywordByName,            // 🆕 키워드명으로 업데이트
  toggleKeywordStatus,
  deleteDailyKeyword,
  
  // 키워드 갱신 스케줄 관리
  scheduleKeywordUpdate,
  getPendingSchedules,
  updateScheduleStatus,
  cleanupOldSchedules,
  
  // 키워드 성과 추적
  logKeywordPerformance,
  getKeywordPerformanceStats,
  getKeywordPerformanceDashboard,
  getKeywordPerformanceHistory,
  
  // 키워드 검색 및 필터링
  searchKeywords,
  getCategoryStats,
  
  // 키워드 초기화 및 유틸리티
  initializeKeywordExecutionDates,
  getTodaysUpdateKeywords,
  reorderKeywords
}; 