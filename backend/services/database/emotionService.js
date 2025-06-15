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
        p_user_id: emotionData.userId,
        p_emotion_state: emotionData.emotionState,
        p_input_text: emotionData.inputText,
        p_input_type: emotionData.inputType,
        p_confidence_score: emotionData.confidenceScore || 0.8,
        p_emotional_need: emotionData.emotionalNeed,
        p_context_description: emotionData.contextDescription,
        p_session_id: emotionData.sessionId
      });

    if (error) {
      console.error('사용자 감정 기록 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`😊 감정 기록: ${emotionData.emotionState} (사용자: ${emotionData.userId})`);
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
        user_id: emotionData.userId,
        emotion_state: emotionData.emotionState,
        emotion_intensity: emotionData.emotionIntensity,
        emotional_need: emotionData.emotionalNeed,
        context_description: emotionData.contextDescription,
        input_text: emotionData.inputText,
        input_type: emotionData.inputType,
        detected_by: emotionData.detectedBy || 'claude_api',
        confidence_score: emotionData.confidenceScore || 0.8,
        ai_response_raw: emotionData.aiResponseRaw || {},
        analysis_metadata: emotionData.analysisMetadata || {},
        session_id: emotionData.sessionId,
        extraction_version: emotionData.extractionVersion || '3.2'
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
        p_user_id: selectionData.userId,
        p_emotion_log_id: selectionData.emotionLogId,
        p_selected_keyword: selectionData.selectedKeyword,
        p_search_term: selectionData.searchTerm,
        p_satisfaction_score: selectionData.satisfactionScore,
        p_interaction_type: selectionData.interactionType || 'selected'
      });

    if (error) {
      console.error('키워드 선택 기록 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`🏷️ 키워드 선택 기록: ${selectionData.selectedKeyword} (만족도: ${selectionData.satisfactionScore || 'N/A'})`);
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
    const { data, error } = await supabase
      .from('emotion_keyword_preferences')
      .insert([{
        user_id: selectionData.userId,
        emotion_log_id: selectionData.emotionLogId,
        selected_keyword: selectionData.selectedKeyword,
        search_term: selectionData.searchTerm,
        curation_sentence: selectionData.curationSentence,
        interaction_type: selectionData.interactionType || 'selected',
        satisfaction_score: selectionData.satisfactionScore,
        time_spent_seconds: selectionData.timeSpentSeconds,
        video_watched_count: selectionData.videoWatchedCount || 0,
        session_duration_minutes: selectionData.sessionDurationMinutes,
        emotion_match_score: selectionData.emotionMatchScore,
        keyword_relevance_score: selectionData.keywordRelevanceScore,
        personalization_score: selectionData.personalizationScore,
        selection_context: selectionData.selectionContext || {},
        extractor_version: selectionData.extractorVersion || '3.2'
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
 * @returns {Promise<Object>} 선택 히스토리
 */
export async function getUserKeywordSelections(userId, options = {}) {
  try {
    const {
      emotionState = null,
      daysBack = 30,
      limit = 100,
      minSatisfaction = null
    } = options;

    let query = supabase
      .from('emotion_keyword_preferences')
      .select(`
        *,
        user_emotion_logs!inner(emotion_state, created_at as emotion_recorded_at)
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
    const { data, error } = await supabase
      .rpc('get_emotion_keywords', {
        target_emotion: emotionState,
        limit_count: limit
      });

    if (error) {
      console.error('감정별 키워드 조회 실패:', error);
      return { success: false, error: error.message };
    }

    // natural-language-extractor.js 호환 형식으로 변환
    const formattedKeywords = data.map(item => ({
      keyword: item.keyword,
      score: parseFloat(item.score)
    }));

    console.log(`📊 감정별 키워드 조회: ${emotionState} → ${formattedKeywords.length}개`);
    return { success: true, data: formattedKeywords };

  } catch (error) {
    console.error('감정별 키워드 조회 중 오류:', error);
    return { success: false, error: error.message };
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
 * 감정-키워드 통계 수동 업데이트 (DB 함수 활용)
 * @param {string} emotionState - 감정 상태
 * @param {string} keyword - 키워드
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function updateEmotionKeywordStats(emotionState, keyword) {
  try {
    const { data, error } = await supabase
      .rpc('update_emotion_keyword_stats', {
        p_emotion_state: emotionState,
        p_keyword: keyword
      });

    if (error) {
      console.error('감정-키워드 통계 업데이트 실패:', error);
      return { success: false, error: error.message };
    }

    console.log(`📈 통계 업데이트: ${emotionState} - ${keyword}`);
    return { success: true, message: '통계가 업데이트되었습니다.' };

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
    const { data, error } = await supabase
      .from('user_emotion_logs')
      .select(`
        emotion_state,
        COUNT(*) as log_count,
        AVG(confidence_score) as avg_confidence,
        COUNT(DISTINCT user_id) as unique_users
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .group('emotion_state')
      .order('log_count', { ascending: false });

    if (error) {
      console.error('감정 상태별 통계 조회 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    console.error('감정 상태별 통계 조회 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 감정 상태 검색
 * @param {Object} searchParams - 검색 파라미터
 * @returns {Promise<Object>} 검색 결과
 */
export async function searchEmotionStates(searchParams) {
  try {
    const {
      emotionState = '',
      minConfidence = 0.7,
      inputType = null,
      daysBack = 30,
      limit = 100
    } = searchParams;

    let query = supabase
      .from('user_emotion_logs')
      .select(`
        emotion_state,
        emotional_need,
        context_description,
        confidence_score,
        input_text,
        input_type,
        detected_by,
        created_at
      `)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .gte('confidence_score', minConfidence)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (emotionState) {
      query = query.ilike('emotion_state', `%${emotionState}%`);
    }

    if (inputType) {
      query = query.eq('input_type', inputType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('감정 상태 검색 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data, count: data.length };

  } catch (error) {
    console.error('감정 상태 검색 중 오류:', error);
    return { success: false, error: error.message };
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