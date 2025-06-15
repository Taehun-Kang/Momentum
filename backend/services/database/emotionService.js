/**
 * 😊 Emotion Service - 감정별 키워드 선호도 관리
 * 
 * 기능:
 * - 사용자 감정 상태 기록 및 분석
 * - 감정별 키워드 선택 추적
 * - 유사 감정 사용자들의 키워드 선호도 분석
 * - 감정-키워드 매칭 통계 관리
 * 
 * 통합:
 * - natural-language-extractor.js (getSimilarEmotionPreferences)
 * - personalizedCurationService.js
 * - Claude API 감정 분석 결과 저장
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
// 👤 사용자 감정 로그 관리 (user_emotion_logs)
// ============================================================================

/**
 * 사용자 감정 상태 기록 (DB 함수 활용)
 * @param {Object} emotionData - 감정 분석 데이터
 * @returns {Promise<Object>} 기록 결과
 */
export async function logUserEmotion(emotionData) {
  try {
    const { data, error } = await supabase
      .rpc('log_user_emotion', {
        p_user_id: emotionData.user_id,
        p_emotion_state: emotionData.emotion_state,
        p_input_text: emotionData.input_text,
        p_input_type: emotionData.input_type,
        p_confidence_score: emotionData.confidence_score || 0.8,
        p_emotional_need: emotionData.emotional_need,
        p_context_description: emotionData.context_description,
        p_session_id: emotionData.session_id
      });

    if (error) {
      console.error('사용자 감정 기록 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`😊 감정 기록: ${emotionData.emotion_state} (사용자: ${emotionData.user_id})`);
    return { success: true, emotionLogId: data };

  } catch (error) {
    console.error('사용자 감정 기록 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 감정 로그 직접 생성 (Claude API 결과 저장)
 * @param {Object} emotionData - 상세 감정 데이터
 * @returns {Promise<Object>} 생성 결과
 */
export async function createEmotionLog(emotionData) {
  try {
    const { data, error } = await supabase
      .from('user_emotion_logs')
      .insert([{
        user_id: emotionData.user_id,
        emotion_state: emotionData.emotion_state,
        emotion_intensity: emotionData.emotion_intensity,
        emotional_need: emotionData.emotional_need,
        context_description: emotionData.context_description,
        input_text: emotionData.input_text,
        input_type: emotionData.input_type,
        detected_by: emotionData.detected_by || 'claude_api',
        confidence_score: emotionData.confidence_score || 0.8,
        ai_response_raw: emotionData.ai_response_raw || {},
        analysis_metadata: emotionData.analysis_metadata || {},
        session_id: emotionData.session_id,
        extraction_version: emotionData.extraction_version || '3.2'
      }])
      .select('*')
      .single();

    if (error) {
      console.error('감정 로그 생성 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('감정 로그 생성 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 사용자별 감정 히스토리 조회 (뷰 활용)
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 감정 히스토리
 */
export async function getUserEmotionHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('user_emotion_history')
      .select('*')
      .eq('user_id', userId)
      .order('emotion_frequency', { ascending: false });

    if (error) {
      console.error('사용자 감정 히스토리 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('사용자 감정 히스토리 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 최근 감정 로그 조회
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 최근 감정 로그
 */
export async function getRecentEmotionLogs(options = {}) {
  try {
    const {
      userId = null,
      emotionState = null,
      daysBack = 7,
      limit = 50,
      minConfidence = 0.7
    } = options;

    let query = supabase
      .from('user_emotion_logs')
      .select(`
        id,
        user_id,
        emotion_state,
        emotional_need,
        context_description,
        input_text,
        confidence_score,
        detected_by,
        session_id,
        created_at
      `)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .gte('confidence_score', minConfidence)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (emotionState) {
      query = query.eq('emotion_state', emotionState);
    }

    const { data, error } = await query;

    if (error) {
      console.error('최근 감정 로그 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('최근 감정 로그 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🏷️ 감정별 키워드 선택 관리 (emotion_keyword_preferences)
// ============================================================================

/**
 * 키워드 선택 기록 (DB 함수 활용)
 * @param {Object} selectionData - 키워드 선택 데이터
 * @returns {Promise<Object>} 기록 결과
 */
export async function recordKeywordSelection(selectionData) {
  try {
    const { data, error } = await supabase
      .rpc('record_keyword_selection', {
        p_user_id: selectionData.user_id,
        p_emotion_log_id: selectionData.emotion_log_id,
        p_selected_keyword: selectionData.selected_keyword,
        p_search_term: selectionData.search_term,
        p_satisfaction_score: selectionData.satisfaction_score,
        p_interaction_type: selectionData.interaction_type || 'selected'
      });

    if (error) {
      console.error('키워드 선택 기록 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`🏷️ 키워드 선택 기록: ${selectionData.selected_keyword} (만족도: ${selectionData.satisfaction_score || 'N/A'})`);
    return { success: true, preferenceId: data };

  } catch (error) {
    console.error('키워드 선택 기록 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 키워드 선택 직접 생성
 * @param {Object} selectionData - 상세 선택 데이터
 * @returns {Promise<Object>} 생성 결과
 */
export async function createKeywordSelection(selectionData) {
  try {
    // user_id가 null이면 건너뛰기 (테스트 환경)
    if (!selectionData.user_id) {
      console.log('⚠️ user_id가 null이므로 키워드 선택 생성을 건너뜁니다 (테스트 환경)');
      return { 
        success: false, 
        error: 'user_id가 필요합니다. 테스트 환경에서는 통계 업데이트를 사용하세요.',
        testAlternative: '대신 PUT /stats/:emotionState/:keyword 를 사용하세요'
      };
    }

    const { data, error } = await supabase
      .from('emotion_keyword_preferences')
      .insert([{
        user_id: selectionData.user_id,
        emotion_log_id: selectionData.emotion_log_id,
        selected_keyword: selectionData.selected_keyword,
        search_term: selectionData.search_term,
        curation_sentence: selectionData.curation_sentence,
        interaction_type: selectionData.interaction_type || 'selected',
        satisfaction_score: selectionData.satisfaction_score,
        time_spent_seconds: selectionData.time_spent_seconds,
        video_watched_count: selectionData.video_watched_count || 0,
        session_duration_minutes: selectionData.session_duration_minutes,
        emotion_match_score: selectionData.emotion_match_score,
        keyword_relevance_score: selectionData.keyword_relevance_score,
        personalization_score: selectionData.personalization_score,
        selection_context: selectionData.selection_context || {},
        extractor_version: selectionData.extractor_version || '3.2'
      }])
      .select('*')
      .single();

    if (error) {
      console.error('키워드 선택 생성 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('키워드 선택 생성 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 사용자별 키워드 선택 히스토리 조회
 * @param {string} userId - 사용자 ID
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 키워드 선택 히스토리
 */
export async function getUserKeywordSelections(userId, options = {}) {
  try {
    const {
      emotionState = null,
      daysBack = 30,
      limit = 100,
      minSatisfaction = null
    } = options;

    // 수정: nested select의 alias 문제 해결
    let query = supabase
      .from('emotion_keyword_preferences')
      .select(`
        *,
        user_emotion_logs!inner(emotion_state, created_at)
      `)
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (emotionState) {
      query = query.eq('user_emotion_logs.emotion_state', emotionState);
    }

    if (minSatisfaction) {
      query = query.gte('satisfaction_score', minSatisfaction);
    }

    const { data, error } = await query;

    if (error) {
      console.error('사용자 키워드 선택 히스토리 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('사용자 키워드 선택 히스토리 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 📊 감정별 키워드 통계 관리 (emotion_keyword_stats)
// ============================================================================

/**
 * 감정별 인기 키워드 조회 (natural-language-extractor.js 핵심 함수!)
 * @param {string} emotionState - 감정 상태
 * @param {number} limit - 반환할 키워드 수
 * @returns {Promise<Object>} 인기 키워드 목록
 */
export async function getEmotionKeywords(emotionState, limit = 10) {
  try {
    console.log(`🔍 감정별 키워드 조회 시작: ${emotionState}`);

    // 1차: 직접 테이블 조회 (필터링 조건 제거하고 전체 조회)
    const { data, error } = await supabase
      .from('emotion_keyword_stats')
      .select('keyword, selection_count, recommendation_weight, popularity_score')
      .eq('emotion_state', emotionState)
      // 임시로 필터링 조건 제거
      // .gt('selection_count', 0)  ← 이런 조건이 있었다면 제거
      .order('popularity_score', { ascending: false })
      .order('recommendation_weight', { ascending: false })
      .limit(limit);

    console.log(`📊 직접 조회 결과: ${emotionState}`, { data, error });

    if (!error && data && data.length > 0) {
      // natural-language-extractor.js 호환 형식으로 변환
      const formattedKeywords = data.map(item => ({
        keyword: item.keyword,
        score: parseFloat(item.recommendation_weight || 0.5),
        selectionCount: item.selection_count || 0,
        popularityScore: item.popularity_score || 0
      }));

      console.log(`✅ 감정별 키워드 조회 성공: ${emotionState} (${data.length}개)`, formattedKeywords);
      return {
        success: true,
        keywords: formattedKeywords,
        total: data.length,
        source: 'direct_query'
      };
    }

    // 2차: DB 함수 시도 (폴백)
    try {
      const { data: dbData, error: dbError } = await supabase
        .rpc('get_emotion_keywords', {
          target_emotion: emotionState,
          limit_count: limit
        });

      console.log(`📊 DB 함수 결과: ${emotionState}`, { dbData, dbError });

      if (!dbError && dbData && dbData.length > 0) {
        const formattedKeywords = dbData.map(item => ({
          keyword: item.keyword,
          score: parseFloat(item.score || 0.5)
        }));

        return {
          success: true,
          keywords: formattedKeywords,
          total: dbData.length,
          source: 'db_function'
        };
      }
    } catch (dbFunctionError) {
      console.log('🔧 DB 함수 실행 실패:', dbFunctionError.message);
    }

    // 3차: 빈 결과
    console.log(`📭 ${emotionState} 감정에 대한 키워드가 없습니다`);
    return {
      success: true,
      keywords: [],
      total: 0,
      source: 'empty'
    };

  } catch (error) {
    console.error('감정별 키워드 조회 실패:', error);
    return {
      success: false,
      error: error.message,
      keywords: []
    };
  }
}

/**
 * 감정별 인기 키워드 TOP 랭킹 조회 (뷰 활용)
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} TOP 키워드 랭킹
 */
export async function getEmotionTopKeywords(options = {}) {
  try {
    const {
      emotionState = null,
      minSelections = 3,
      limit = 50
    } = options;

    let query = supabase
      .from('emotion_top_keywords')
      .select('*')
      .gte('selection_count', minSelections)
      .order('popularity_score', { ascending: false })
      .limit(limit);

    if (emotionState) {
      query = query.eq('emotion_state', emotionState);
    }

    const { data, error } = await query;

    if (error) {
      console.error('감정별 TOP 키워드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('감정별 TOP 키워드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 실시간 감정-키워드 선호도 조회 (뷰 활용)
 * @returns {Promise<Object>} 실시간 선호도
 */
export async function getRealtimeEmotionPreferences() {
  try {
    const { data, error } = await supabase
      .from('realtime_emotion_preferences')
      .select('*')
      .order('recent_selections', { ascending: false });

    if (error) {
      console.error('실시간 감정 선호도 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('실시간 감정 선호도 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 감정-키워드 통계 수동 업데이트 (DB 함수 활용 + 직접 업데이트)
 * @param {string} emotionState - 감정 상태
 * @param {string} keyword - 키워드
 * @param {Object} statsData - 통계 데이터 (선택적)
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function updateEmotionKeywordStats(emotionState, keyword, statsData = {}) {
  try {
    // 1차: DB 함수 시도
    try {
      const { data, error } = await supabase
        .rpc('update_emotion_keyword_stats', {
          p_emotion_state: emotionState,
          p_keyword: keyword
        });

      if (!error) {
        console.log(`📈 통계 업데이트 (DB 함수): ${emotionState} - ${keyword}`);
        return { success: true, message: '통계가 업데이트되었습니다.', method: 'db_function' };
      }
    } catch (dbFunctionError) {
      console.log('DB 함수 없음, 직접 업데이트 실행...');
    }

    // 2차: 직접 upsert 업데이트
    const { data: existing } = await supabase
      .from('emotion_keyword_stats')
      .select('*')
      .eq('emotion_state', emotionState)
      .eq('keyword', keyword)
      .single();

    if (existing) {
      // 기존 레코드 업데이트
      const { data, error } = await supabase
        .from('emotion_keyword_stats')
        .update({
          selection_count: statsData.selection_count || existing.selection_count + 1,
          recommendation_weight: statsData.recommendation_weight || existing.recommendation_weight,
          last_selected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('emotion_state', emotionState)
        .eq('keyword', keyword)
        .select('*')
        .single();

      if (error) {
        console.error('감정-키워드 통계 업데이트 실패:', error);
        return { success: false, error: error.message };
      }

      console.log(`📈 통계 업데이트 (직접): ${emotionState} - ${keyword}`);
      return { success: true, data, method: 'direct_update' };
    } else {
      // 새 레코드 생성
      const { data, error } = await supabase
        .from('emotion_keyword_stats')
        .insert([{
          emotion_state: emotionState,
          keyword: keyword,
          selection_count: statsData.selection_count || 1,
          recommendation_weight: statsData.recommendation_weight || 0.5,
          last_selected_at: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (error) {
        console.error('감정-키워드 통계 생성 실패:', error);
        return { success: false, error: error.message };
      }

      console.log(`📈 통계 생성 (직접): ${emotionState} - ${keyword}`);
      console.log(`📊 생성된 데이터:`, { 
        emotion_state: emotionState, 
        keyword, 
        selection_count: statsData.selection_count || 1,
        recommendation_weight: statsData.recommendation_weight || 0.5 
      });
      return { success: true, data, method: 'direct_insert' };
    }

  } catch (error) {
    console.error('감정-키워드 통계 업데이트 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 모든 감정-키워드 통계 재계산 (DB 함수 활용)
 * @returns {Promise<Object>} 재계산 결과
 */
export async function recalculateAllEmotionStats() {
  try {
    const { data, error } = await supabase
      .rpc('recalculate_all_emotion_stats');

    if (error) {
      console.error('전체 감정 통계 재계산 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`🔄 전체 감정 통계 재계산 완료: ${data}개 항목`);
    return { success: true, updatedCount: data };

  } catch (error) {
    console.error('전체 감정 통계 재계산 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🔍 감정 분석 및 검색
// ============================================================================

/**
 * 감정 상태별 통계 조회
 * @returns {Promise<Object>} 감정별 통계
 */
export async function getEmotionStateStats() {
  try {
    // 전체 감정 로그 데이터 조회 후 JavaScript에서 그룹화
    const { data, error } = await supabase
      .from('user_emotion_logs')
      .select(`
        emotion_state,
        confidence_score,
        user_id
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('감정 상태별 통계 조회 실패:', error);
      return { success: false, error: error.message };
    }

    // JavaScript에서 그룹화 및 통계 계산
    const statsMap = {};
    
    data.forEach(log => {
      const emotionState = log.emotion_state || '미분류';
      
      if (!statsMap[emotionState]) {
        statsMap[emotionState] = {
          emotion_state: emotionState,
          log_count: 0,
          confidence_scores: [],
          unique_users: new Set()
        };
      }
      
      statsMap[emotionState].log_count += 1;
      statsMap[emotionState].confidence_scores.push(log.confidence_score || 0);
      if (log.user_id) {
        statsMap[emotionState].unique_users.add(log.user_id);
      }
    });

    // 최종 통계 계산
    const stats = Object.values(statsMap).map(stat => ({
      emotion_state: stat.emotion_state,
      log_count: stat.log_count,
      avg_confidence: stat.confidence_scores.length > 0 
        ? stat.confidence_scores.reduce((a, b) => a + b, 0) / stat.confidence_scores.length 
        : 0,
      unique_users: stat.unique_users.size
    }));

    // log_count 기준으로 내림차순 정렬
    stats.sort((a, b) => b.log_count - a.log_count);

    return { success: true, data: stats };

  } catch (error) {
    console.error('감정 상태별 통계 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 감정 상태 검색 - 완성된 안전한 구현 ✅
 * @param {Object} searchParams - 검색 파라미터
 * @returns {Promise<Object>} 검색 결과
 */
export async function searchEmotionStates(searchParams) {
  console.log('🔍 완성된 검색 시작:', searchParams);
  
  try {
    const { 
      query: searchQuery = '', 
      limit = 10,
      emotionState = '',
      minConfidence = 0.5 
    } = searchParams;
    
    // 검색어 정리 (query 또는 emotionState 사용)
    const finalSearchTerm = searchQuery || emotionState || '';
    console.log(`🔍 검색어: "${finalSearchTerm}"`);
    
    // 📊 안전한 전체 조회 후 JavaScript 필터링 (timeout 방지)
    const { data: allLogs, error } = await supabase
      .from('user_emotion_logs')
      .select(`
        emotion_state,
        emotional_need,
        context_description,
        confidence_score,
        input_text,
        created_at
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .gte('confidence_score', minConfidence)
      .order('created_at', { ascending: false })
      .limit(100); // 적당한 크기로 제한
    
    if (error) {
      console.error('검색 쿼리 실패:', error);
      return { success: false, error: error.message };
    }
    
    // JavaScript에서 안전한 필터링
    let filteredLogs = allLogs || [];
    
    if (finalSearchTerm) {
      filteredLogs = allLogs.filter(log => {
        const searchTerm = finalSearchTerm.toLowerCase();
        return (
          (log.emotion_state && log.emotion_state.toLowerCase().includes(searchTerm)) ||
          (log.emotional_need && log.emotional_need.toLowerCase().includes(searchTerm)) ||
          (log.context_description && log.context_description.toLowerCase().includes(searchTerm)) ||
          (log.input_text && log.input_text.toLowerCase().includes(searchTerm))
        );
      });
    }
    
    // 결과 제한
    filteredLogs = filteredLogs.slice(0, limit);
    
    console.log(`✅ 검색 완료: "${finalSearchTerm}" → ${filteredLogs.length}개 (전체: ${allLogs.length}개)`);
    
    return {
      success: true,
      data: filteredLogs,
      count: filteredLogs.length,
      method: 'safe_js_filter',
      searchTerm: finalSearchTerm,
      totalScanned: allLogs.length,
      message: filteredLogs.length === 0 ? '검색 결과가 없습니다' : `${filteredLogs.length}개 결과 찾음`
    };
    
  } catch (error) {
    console.error('검색 중 오류:', error);
    return {
      success: false,
      error: error.message,
      fallback: {
        message: '검색 대신 GET /stats/emotion-states 또는 GET /logs/recent 사용을 권장합니다'
      }
    };
  }
}

// ============================================================================
// 🧹 유틸리티 및 관리 기능
// ============================================================================

/**
 * 오래된 감정 로그 정리 (DB 함수 활용)
 * @returns {Promise<Object>} 정리 결과
 */
export async function cleanupOldEmotionLogs() {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_old_emotion_logs');

    if (error) {
      console.error('오래된 감정 로그 정리 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`🧹 오래된 감정 로그 정리: ${data}개 삭제`);
    return { success: true, deletedCount: data };

  } catch (error) {
    console.error('오래된 감정 로그 정리 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 감정 서비스 대시보드 데이터 조회
 * @returns {Promise<Object>} 대시보드 데이터
 */
export async function getEmotionServiceDashboard() {
  try {
    // 병렬로 여러 통계 조회
    const [emotionStats, topKeywords, recentActivity] = await Promise.all([
      getEmotionStateStats(),
      getEmotionTopKeywords({ limit: 20 }),
      getRecentEmotionLogs({ daysBack: 7, limit: 50 })
    ]);

    return {
      success: true,
      dashboard: {
        emotionStats: emotionStats.data || [],
        topKeywords: topKeywords.data || [],
        recentActivity: recentActivity.data || [],
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('감정 서비스 대시보드 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 🎯 완전한 기본 내보내기
// ============================================================================

export default {
  // 사용자 감정 로그 관리
  logUserEmotion,
  createEmotionLog,
  getUserEmotionHistory,
  getRecentEmotionLogs,
  
  // 감정별 키워드 선택 관리
  recordKeywordSelection,
  createKeywordSelection,
  getUserKeywordSelections,
  
  // 감정별 키워드 통계 관리 (natural-language-extractor.js 연동)
  getEmotionKeywords,           // 🔥 핵심 함수!
  getEmotionTopKeywords,
  getRealtimeEmotionPreferences,
  updateEmotionKeywordStats,
  recalculateAllEmotionStats,
  
  // 감정 분석 및 검색
  getEmotionStateStats,
  searchEmotionStates,
  
  // 유틸리티 및 관리 기능
  cleanupOldEmotionLogs,
  getEmotionServiceDashboard
}; 