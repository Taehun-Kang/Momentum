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
 * 키워드 상세 정보 조회
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
 * 키워드 정보 업데이트
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
    const { data, error } = await supabase
      .from('daily_keywords')
      .select(`
        category,
        priority_tier,
        COUNT(*) as keyword_count,
        AVG(success_rate) as avg_success_rate,
        AVG(quality_score) as avg_quality_score,
        SUM(total_videos_found) as total_videos_found
      `)
      .eq('is_active', true)
      .group('category, priority_tier')
      .order('category');

    if (error) {
      console.error('카테고리별 통계 조회 실패:', error);
      return { success: false, error: error.message };
    }

    // 카테고리별로 그룹화
    const categoryStats = data.reduce((acc, row) => {
      if (!acc[row.category]) {
        acc[row.category] = {
          category: row.category,
          tiers: {},
          totals: {
            keyword_count: 0,
            total_videos_found: 0,
            avg_success_rate: 0,
            avg_quality_score: 0
          }
        };
      }

      acc[row.category].tiers[row.priority_tier] = {
        keyword_count: row.keyword_count,
        avg_success_rate: parseFloat(row.avg_success_rate || 0),
        avg_quality_score: parseFloat(row.avg_quality_score || 0),
        total_videos_found: row.total_videos_found || 0
      };

      acc[row.category].totals.keyword_count += row.keyword_count;
      acc[row.category].totals.total_videos_found += row.total_videos_found || 0;

      return acc;
    }, {});

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
 * 키워드별 순서 재정렬
 * @param {string} priorityTier - 우선순위 티어
 * @param {Array} keywordIds - 새로운 순서의 키워드 ID 배열
 * @returns {Promise<Object>} 재정렬 결과
 */
export async function reorderKeywords(priorityTier, keywordIds) {
  try {
    // 트랜잭션으로 순서 업데이트
    const updates = keywordIds.map((keywordId, index) => 
      supabase
        .from('daily_keywords')
        .update({ sequence_number: index + 1 })
        .eq('id', keywordId)
        .eq('priority_tier', priorityTier)
    );

    const results = await Promise.all(updates);
    
    // 에러 체크
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('키워드 순서 재정렬 실패:', errors);
      return { success: false, error: '일부 키워드 순서 업데이트에 실패했습니다.' };
    }

    console.log(`🔄 키워드 순서 재정렬 완료: ${priorityTier} 그룹 ${keywordIds.length}개`);
    return { success: true, message: '키워드 순서가 재정렬되었습니다.' };

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
  updateDailyKeyword,
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