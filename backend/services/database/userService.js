/**
 * @fileoverview 사용자 프로필 완전 시스템 서비스
 * @description 01_user_profiles.sql의 모든 기능을 포괄하는 ES Module
 * 
 * 🗄️ 관리 테이블:
 * - user_profiles (사용자 프로필 메인)
 * - user_keyword_preferences (키워드 선호도 상세)
 * - user_video_interactions (사용자-영상 상호작용)
 * 
 * 🔗 연동 대상:
 * - PersonalizedKeywords 컴포넌트
 * - UserPreferenceKeywords 컴포넌트
 * - natural-language-extractor.js
 * - personalizedCurationService.js
 */

import { createClient } from '@supabase/supabase-js';

// =============================================================================
// 🔧 Supabase 클라이언트 설정
// =============================================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================================
// 📋 1. 사용자 프로필 메인 관리 (user_profiles 테이블)
// =============================================================================

/**
 * 사용자 프로필 생성 (새 사용자 등록 시)
 * @param {Object} userData - 사용자 기본 정보
 * @param {string} userData.user_id - Supabase Auth 사용자 ID
 * @param {string} [userData.display_name] - 표시 이름
 * @param {string} [userData.avatar_url] - 프로필 이미지 URL
 * @param {string} [userData.bio] - 자기소개
 * @returns {Promise<Object>} 생성된 프로필 정보
 */
export const createUserProfile = async (userdata) => {
  try {
    // user_id 또는 id 필드 모두 처리
    const userId = userdata.user_id || userdata.id;
    
    if (!userId) {
      throw new Error('user_id 또는 id 필드가 필요합니다');
    }

    // UUID 형식 검증 추가
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error(`유효하지 않은 UUID 형식입니다. 정확한 UUID 형식(예: 550e8400-e29b-41d4-a716-446655440000)을 사용해주세요. 받은 값: "${userId}"`);
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        display_name: userdata.display_name || 'Unknown User',
        avatar_url: userdata.avatar_url || null,
        bio: userdata.bio || null,
        user_tier: userdata.user_tier || 'free',
        preferences: userdata.preferences || {},  // ✅ 추가: preferences 필드 처리
        onboarding_completed: false
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '사용자 프로필이 생성되었습니다',
      data
    };
  } catch (error) {
    console.error('사용자 프로필 생성 실패:', error);
    
    // UUID 관련 에러에 대한 구체적인 처리
    let errorMessage = error.message;
    if (error.code === '22P02' && error.message.includes('invalid input syntax for type uuid')) {
      errorMessage = `UUID 형식 오류: 유효한 UUID 형식을 사용해주세요. 예시: 550e8400-e29b-41d4-a716-446655440000`;
    } else if (error.code === '23505') {
      errorMessage = '이미 존재하는 사용자 ID입니다';
    }
    
    return {
      success: false,
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR',
      suggestion: error.code === '22P02' 
        ? 'Supabase Auth를 통해 가입하거나 정확한 UUID 형식을 사용해주세요' 
        : '다시 시도해주세요'
    };
  }
};

/**
 * 사용자 프로필 조회 (기본 정보)
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 사용자 프로필 정보
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('사용자 프로필 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 사용자 프로필 요약 조회 (DB 함수 활용)
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 사용자 프로필 요약 정보
 */
export const getUserProfileSummary = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('get_user_profile_summary', {
      target_user_id: userId
    });

    if (error) throw error;

    return {
      success: true,
      message: '사용자 프로필 요약 조회 완료',
      data: data[0] || null
    };
  } catch (error) {
    console.error('사용자 프로필 요약 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 사용자 프로필 업데이트
 * @param {string} userId - 사용자 ID
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<Object>} 업데이트 결과
 */
export const updateUserProfile = async (userId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '사용자 프로필이 업데이트되었습니다',
      data
    };
  } catch (error) {
    console.error('사용자 프로필 업데이트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 사용자 설정(preferences) 업데이트
 * @param {string} userId - 사용자 ID
 * @param {Object} preferences - 설정 데이터 (JSONB)
 * @returns {Promise<Object>} 업데이트 결과
 */
export const updateUserPreferences = async (userId, preferences) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        preferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('preferences')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '사용자 설정이 업데이트되었습니다',
      data
    };
  } catch (error) {
    console.error('사용자 설정 업데이트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 사용자 티어 업데이트
 * @param {string} userId - 사용자 ID
 * @param {string} tier - 새로운 티어 ('free', 'premium', 'pro', 'enterprise')
 * @param {Date} [expiresAt] - 만료일 (유료 티어일 때)
 * @returns {Promise<Object>} 업데이트 결과
 */
export const updateUserTier = async (userId, tier, expiresAt = null) => {
  try {
    const updateData = {
      user_tier: tier,
      updated_at: new Date().toISOString()
    };

    if (tier !== 'free' && expiresAt) {
      // expiresAt이 문자열인지 Date 객체인지 확인
      updateData.tier_expires_at = typeof expiresAt === 'string' 
        ? expiresAt 
        : new Date(expiresAt).toISOString();
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select('user_tier, tier_expires_at')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `사용자 티어가 ${tier}로 업데이트되었습니다`,
      data
    };
  } catch (error) {
    console.error('사용자 티어 업데이트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 개인화 점수 계산 및 업데이트 (DB 함수 활용)
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 계산된 개인화 점수
 */
export const calculatePersonalizationScore = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('calculate_user_personalization_score', {
      target_user_id: userId
    });

    if (error) throw error;

    // 계산된 점수를 프로필에 업데이트
    await supabase
      .from('user_profiles')
      .update({
        personalization_score: data,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return {
      success: true,
      message: '개인화 점수가 계산되었습니다',
      data: { personalization_score: data }
    };
  } catch (error) {
    console.error('개인화 점수 계산 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =============================================================================
// 📋 2. 키워드 선호도 관리 (user_keyword_preferences 테이블)
// =============================================================================

/**
 * 사용자 선호 키워드 상세 조회 (DB 함수 활용)
 * @param {string} userId - 사용자 ID
 * @param {number} [limit=10] - 조회할 키워드 수
 * @returns {Promise<Object>} 사용자 선호 키워드 목록
 */
export const getUserPreferencesDetailed = async (userId, limit = 10) => {
  try {
    const { data, error } = await supabase.rpc('get_user_preferences_detailed', {
      target_user_id: userId,
      limit_count: limit
    });

    if (error) throw error;

    return {
      success: true,
      message: '사용자 선호 키워드 조회 완료',
      data
    };
  } catch (error) {
    console.error('사용자 선호 키워드 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 키워드 선호도 업데이트 (DB 함수 활용 - PersonalizedKeywords 컴포넌트 연동)
 * @param {string} userId - 사용자 ID
 * @param {string} keyword - 키워드
 * @param {boolean} [incrementSelection=true] - 선택 횟수 증가 여부
 * @returns {Promise<Object>} 업데이트 결과
 */
export const upsertKeywordPreference = async (userId, keyword, incrementSelection = true) => {
  try {
    const { error } = await supabase.rpc('upsert_keyword_preference', {
      target_user_id: userId,
      target_keyword: keyword,
      increment_selection: incrementSelection
    });

    if (error) throw error;

    return {
      success: true,
      message: `키워드 "${keyword}" 선호도가 업데이트되었습니다`
    };
  } catch (error) {
    console.error('키워드 선호도 업데이트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 키워드 선호도 수동 생성/업데이트
 * @param {Object} preferenceData - 키워드 선호도 데이터
 * @param {string} preferenceData.user_id - 사용자 ID
 * @param {string} preferenceData.keyword - 키워드
 * @param {string} [preferenceData.keyword_type='general'] - 키워드 타입
 * @param {number} [preferenceData.preference_score=0.5] - 선호도 점수
 * @param {string[]} [preferenceData.associated_emotions=[]] - 연관 감정
 * @returns {Promise<Object>} 생성/업데이트 결과
 */
export const createOrUpdateKeywordPreference = async (preferenceData) => {
  try {
    const { data, error } = await supabase
      .from('user_keyword_preferences')
      .upsert({
        user_id: preferenceData.user_id,
        keyword: preferenceData.keyword,
        keyword_type: preferenceData.keyword_type || 'general',
        preference_score: preferenceData.preference_score || 0.5,
        associated_emotions: preferenceData.associated_emotions || [],
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '키워드 선호도가 저장되었습니다',
      data
    };
  } catch (error) {
    console.error('키워드 선호도 저장 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 키워드 선호도 조회 (기본)
 * @param {string} userId - 사용자 ID
 * @param {Object} [filters={}] - 필터 옵션
 * @param {string} [filters.keyword_type] - 키워드 타입 필터
 * @param {boolean} [filters.is_blocked=false] - 차단된 키워드 포함 여부
 * @param {number} [filters.limit=50] - 조회 개수 제한
 * @returns {Promise<Object>} 키워드 선호도 목록
 */
export const getKeywordPreferences = async (userId, filters = {}) => {
  try {
    let query = supabase
      .from('user_keyword_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('is_blocked', filters.is_blocked || false)
      .order('preference_score', { ascending: false })
      .order('selection_count', { ascending: false });

    if (filters.keyword_type) {
      query = query.eq('keyword_type', filters.keyword_type);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: '키워드 선호도 조회 완료',
      data
    };
  } catch (error) {
    console.error('키워드 선호도 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 키워드 차단/해제
 * @param {string} userId - 사용자 ID
 * @param {string} keyword - 키워드
 * @param {boolean} isBlocked - 차단 여부
 * @param {string} [blockReason] - 차단 사유
 * @returns {Promise<Object>} 업데이트 결과
 */
export const blockUnblockKeyword = async (userId, keyword, isBlocked, blockReason = null) => {
  try {
    // 1. 먼저 키워드 선호도가 존재하는지 확인
    const { data: existingPreference, error: checkError } = await supabase
      .from('user_keyword_preferences')
      .select('id, keyword, selection_count')
      .eq('user_id', userId)
      .eq('keyword', keyword)
      .single();

    // 2. 키워드 선호도가 존재하지 않으면 먼저 생성
    if (checkError?.code === 'PGRST116') {
      console.log(`키워드 "${keyword}" 선호도가 존재하지 않아 먼저 생성합니다`);
      
      const { data: newPreference, error: createError } = await supabase
        .from('user_keyword_preferences')
        .insert({
          user_id: userId,
          keyword: keyword,
          selection_count: 0,
          preference_score: 0.1,
          is_blocked: isBlocked,
          block_reason: isBlocked ? blockReason : null
        })
        .select()
        .single();

      if (createError) throw createError;

      return {
        success: true,
        message: `키워드 "${keyword}"가 생성 후 ${isBlocked ? '차단' : '해제'}되었습니다`,
        data: newPreference
      };
    }

    if (checkError) throw checkError;

    // 3. 기존 키워드 선호도 업데이트
    const { data, error } = await supabase
      .from('user_keyword_preferences')
      .update({
        is_blocked: isBlocked,
        block_reason: isBlocked ? blockReason : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('keyword', keyword)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `키워드 "${keyword}"가 ${isBlocked ? '차단' : '해제'}되었습니다`,
      data
    };
  } catch (error) {
    console.error('키워드 차단/해제 실패:', error);
    return {
      success: false,
      error: `키워드 차단/해제 처리 중 오류가 발생했습니다: ${error.message}`
    };
  }
};

// =============================================================================
// 📋 3. 사용자-영상 상호작용 관리 (user_video_interactions 테이블)
// =============================================================================

/**
 * 영상 상호작용 기록 생성
 * @param {Object} interactionData - 상호작용 데이터
 * @param {string} interactionData.user_id - 사용자 ID
 * @param {string} interactionData.video_id - YouTube 영상 ID
 * @param {string} interactionData.interaction_type - 상호작용 타입
 * @param {number} [interactionData.watch_duration] - 시청 시간 (초)
 * @param {number} [interactionData.video_duration] - 영상 길이 (초)
 * @param {string} [interactionData.search_keyword] - 검색 키워드
 * @param {string} [interactionData.recommendation_type] - 추천 타입
 * @param {string} [interactionData.user_emotion] - 사용자 감정
 * @returns {Promise<Object>} 생성 결과
 */
export const createVideoInteraction = async (interactionData) => {
  try {
    const { data, error } = await supabase
      .from('user_video_interactions')
      .insert({
        user_id: interactionData.user_id,
        video_id: interactionData.video_id,
        interaction_type: interactionData.interaction_type,
        watch_duration: interactionData.watch_duration || null,
        video_duration: interactionData.video_duration || null,
        search_keyword: interactionData.search_keyword || null,
        recommendation_type: interactionData.recommendation_type || null,
        user_emotion: interactionData.user_emotion || null,
        user_intent: interactionData.user_intent || null,
        session_id: interactionData.session_id || null,
        device_type: interactionData.device_type || 'unknown',
        device_info: interactionData.device_info || {},
        quality_rating: interactionData.quality_rating || null,
        quality_feedback: interactionData.quality_feedback || null,
        feedback_tags: interactionData.feedback_tags || [],
        source_platform: interactionData.source_platform || 'web',
        app_version: interactionData.app_version || null,
        interaction_value: interactionData.interaction_value || null,
        interaction_metadata: interactionData.interaction_metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '영상 상호작용이 기록되었습니다',
      data
    };
  } catch (error) {
    console.error('영상 상호작용 기록 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 사용자 영상 상호작용 조회
 * @param {string} userId - 사용자 ID
 * @param {Object} [options={}] - 조회 옵션
 * @param {string} [options.interaction_type] - 상호작용 타입 필터
 * @param {number} [options.days=30] - 조회 기간 (일)
 * @param {number} [options.limit=100] - 조회 개수 제한
 * @returns {Promise<Object>} 상호작용 목록
 */
export const getUserVideoInteractions = async (userId, options = {}) => {
  try {
    const days = options.days || 30;
    const limit = options.limit || 100;
    
    let query = supabase
      .from('user_video_interactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options.interaction_type) {
      query = query.eq('interaction_type', options.interaction_type);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: '사용자 영상 상호작용 조회 완료',
      data
    };
  } catch (error) {
    console.error('사용자 영상 상호작용 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 특정 영상에 대한 사용자 상호작용 조회
 * @param {string} userId - 사용자 ID
 * @param {string} videoId - YouTube 영상 ID
 * @returns {Promise<Object>} 영상별 상호작용 목록
 */
export const getUserVideoInteractionsByVideo = async (userId, videoId) => {
  try {
    const { data, error } = await supabase
      .from('user_video_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      message: '영상별 상호작용 조회 완료',
      data
    };
  } catch (error) {
    console.error('영상별 상호작용 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 사용자 시청 통계 조회
 * @param {string} userId - 사용자 ID
 * @param {number} [days=30] - 조회 기간 (일)
 * @returns {Promise<Object>} 시청 통계
 */
export const getUserWatchingStats = async (userId, days = 30) => {
  try {
    const { data, error } = await supabase
      .from('user_video_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('interaction_type', 'view')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // 통계 계산
    const stats = {
      total_views: data.length,
      total_watch_time: data.reduce((sum, item) => sum + (item.watch_duration || 0), 0),
      average_completion_rate: data.length > 0 
        ? data.reduce((sum, item) => sum + (item.completion_rate || 0), 0) / data.length 
        : 0,
      unique_videos: new Set(data.map(item => item.video_id)).size,
      watch_sessions: new Set(data.map(item => item.session_id)).size
    };

    return {
      success: true,
      message: '시청 통계 조회 완료',
      data: stats
    };
  } catch (error) {
    console.error('시청 통계 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =============================================================================
// 📋 4. 뷰(Views) 조회 함수들
// =============================================================================

/**
 * 활성 사용자 프로필 뷰 조회
 * @param {number} [limit=50] - 조회 개수 제한
 * @returns {Promise<Object>} 활성 사용자 목록
 */
export const getActiveUserProfiles = async (limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('active_user_profiles')
      .select('*')
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      message: '활성 사용자 프로필 조회 완료',
      data
    };
  } catch (error) {
    console.error('활성 사용자 프로필 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 인기 키워드 선호도 뷰 조회
 * @param {number} [limit=20] - 조회 개수 제한
 * @returns {Promise<Object>} 인기 키워드 목록
 */
export const getPopularKeywordPreferences = async (limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('popular_keyword_preferences')
      .select('*')
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      message: '인기 키워드 선호도 조회 완료',
      data
    };
  } catch (error) {
    console.error('인기 키워드 선호도 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 사용자 행동 요약 뷰 조회
 * @param {string} [userId] - 특정 사용자 ID (선택사항)
 * @param {number} [limit=50] - 조회 개수 제한
 * @returns {Promise<Object>} 사용자 행동 요약
 */
export const getUserBehaviorSummary = async (userId = null, limit = 50) => {
  try {
    let query = supabase
      .from('user_behavior_summary')
      .select('*')
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: '사용자 행동 요약 조회 완료',
      data: userId ? (data[0] || null) : data
    };
  } catch (error) {
    console.error('사용자 행동 요약 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =============================================================================
// 📋 5. 통계 및 분석 함수들
// =============================================================================

/**
 * 사용자 활동 상태 업데이트 (로그인 시 호출)
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 업데이트 결과
 */
export const updateUserActivity = async (userId) => {
  try {
    // 먼저 현재 login_count 조회
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('login_count')
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // login_count 증가하여 업데이트
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        last_active_at: new Date().toISOString(),
        login_count: (currentProfile.login_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('last_active_at, login_count')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '사용자 활동 상태가 업데이트되었습니다',
      data
    };
  } catch (error) {
    console.error('사용자 활동 상태 업데이트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * AI 검색 사용량 확인 및 업데이트
 * @param {string} userId - 사용자 ID
 * @param {boolean} [incrementUsage=true] - 사용량 증가 여부
 * @returns {Promise<Object>} 사용량 정보
 */
export const checkAiSearchQuota = async (userId, incrementUsage = true) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('ai_searches_used, ai_searches_limit, user_tier')
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    const canUseAi = profile.ai_searches_used < profile.ai_searches_limit;

    if (incrementUsage && canUseAi) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          ai_searches_used: profile.ai_searches_used + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    }

    return {
      success: true,
      message: canUseAi ? 'AI 검색 사용 가능' : 'AI 검색 한도 초과',
      data: {
        can_use_ai: canUseAi,
        used: incrementUsage && canUseAi ? profile.ai_searches_used + 1 : profile.ai_searches_used,
        limit: profile.ai_searches_limit,
        remaining: incrementUsage && canUseAi 
          ? profile.ai_searches_limit - profile.ai_searches_used - 1 
          : profile.ai_searches_limit - profile.ai_searches_used,
        user_tier: profile.user_tier
      }
    };
  } catch (error) {
    console.error('AI 검색 사용량 확인 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 온보딩 완료 처리
 * @param {string} userId - 사용자 ID
 * @param {Object} onboardingData - 온보딩 데이터
 * @returns {Promise<Object>} 완료 처리 결과
 */
export const completeOnboarding = async (userId, onboardingData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        onboarding_data: onboardingData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('onboarding_completed, onboarding_data')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '온보딩이 완료되었습니다',
      data
    };
  } catch (error) {
    console.error('온보딩 완료 처리 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =============================================================================
// 📋 6. 검색 및 필터링 함수들
// =============================================================================

/**
 * 사용자 검색 (관리자용) - 성능 최적화 버전
 * @param {Object} searchParams - 검색 조건
 * @param {string} [searchParams.display_name] - 이름 검색 (query 필드로도 받음)
 * @param {string} [searchParams.query] - 이름 검색 (display_name과 동일)
 * @param {string} [searchParams.user_tier] - 티어 필터
 * @param {number} [searchParams.days_inactive] - 비활성 기간 필터
 * @param {number} [searchParams.limit=20] - 조회 개수 제한 (기본값 축소)
 * @returns {Promise<Object>} 사용자 검색 결과
 */
export const searchUsers = async (searchParams) => {
  try {
    // 성능을 위해 기본 limit을 20으로 축소
    const limit = Math.min(searchParams.limit || 20, 100);
    
    // 검색어 정규화 (display_name 또는 query 필드 모두 처리)
    const searchQuery = searchParams.display_name || searchParams.query;
    
    // 기본 쿼리 - 필수 필드만 선택하여 성능 향상
    let query = supabase
      .from('user_profiles')
      .select('user_id, display_name, user_tier, last_active_at, total_searches')
      .limit(limit);

    // 검색 조건이 있으면 먼저 적용
    if (searchQuery) {
      console.log('사용자 검색어:', searchQuery);
      // 정확한 매칭 우선, 부분 매칭은 제한적으로
      query = query.or(`display_name.eq.${searchQuery},display_name.ilike.%${searchQuery}%`);
    }

    if (searchParams.user_tier) {
      query = query.eq('user_tier', searchParams.user_tier);
    }

    if (searchParams.days_inactive) {
      const cutoffDate = new Date(Date.now() - searchParams.days_inactive * 24 * 60 * 60 * 1000);
      query = query.lt('last_active_at', cutoffDate.toISOString());
    }

    // 마지막에 정렬 적용 (인덱스 활용을 위해)
    query = query.order('created_at', { ascending: false });

    // Timeout 방지를 위한 간단한 타임아웃 설정
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('사용자 검색 시간 초과 (10초)')), 10000);
    });

    const queryPromise = query;
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) throw error;

    return {
      success: true,
      message: `사용자 검색 완료 (${data.length}명 찾음)`,
      data,
      searchParams: {
        query: searchQuery,
        limit,
        total_found: data.length
      }
    };
  } catch (error) {
    console.error('사용자 검색 실패:', error);
    
    // 더 구체적인 에러 메시지
    let errorMessage = '사용자 검색 중 오류가 발생했습니다';
    if (error.message.includes('시간 초과')) {
      errorMessage = '검색 시간이 초과되었습니다. 더 구체적인 검색어를 사용해주세요';
    } else if (error.code) {
      errorMessage = `데이터베이스 오류 (${error.code}): ${error.message}`;
    }

    return {
      success: false,
      error: errorMessage,
      suggestion: '검색어를 더 구체적으로 입력하거나 필터 조건을 추가해보세요'
    };
  }
};

// =============================================================================
// 📋 7. 유틸리티 및 헬퍼 함수들
// =============================================================================

/**
 * 사용자 존재 여부 확인
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 존재 여부 확인 결과
 */
export const checkUserExists = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    return {
      success: true,
      exists: !error && !!data,
      message: !error && !!data ? '사용자가 존재합니다' : '사용자를 찾을 수 없습니다'
    };
  } catch (error) {
    return {
      success: false,
      exists: false,
      error: error.message
    };
  }
};

/**
 * 사용자 프로필 삭제 (완전 삭제)
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 삭제 결과
 */
export const deleteUserProfile = async (userId) => {
  try {
    // user_video_interactions 삭제
    await supabase
      .from('user_video_interactions')
      .delete()
      .eq('user_id', userId);

    // user_keyword_preferences 삭제
    await supabase
      .from('user_keyword_preferences')
      .delete()
      .eq('user_id', userId);

    // user_profiles 삭제
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
      message: '사용자 프로필이 완전히 삭제되었습니다'
    };
  } catch (error) {
    console.error('사용자 프로필 삭제 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =============================================================================
// 💾 ES Module 내보내기
// =============================================================================

/**
 * 기본 내보내기: 전체 사용자 서비스 객체
 */
export default {
  // 1. 사용자 프로필 메인 관리
  createUserProfile,
  getUserProfile,
  getUserProfileSummary,
  updateUserProfile,
  updateUserPreferences,
  updateUserTier,
  calculatePersonalizationScore,

  // 2. 키워드 선호도 관리
  getUserPreferencesDetailed,
  upsertKeywordPreference,
  createOrUpdateKeywordPreference,
  getKeywordPreferences,
  blockUnblockKeyword,

  // 3. 사용자-영상 상호작용 관리
  createVideoInteraction,
  getUserVideoInteractions,
  getUserVideoInteractionsByVideo,
  getUserWatchingStats,

  // 4. 뷰 조회
  getActiveUserProfiles,
  getPopularKeywordPreferences,
  getUserBehaviorSummary,

  // 5. 통계 및 분석
  updateUserActivity,
  checkAiSearchQuota,
  completeOnboarding,

  // 6. 검색 및 필터링
  searchUsers,

  // 7. 유틸리티
  checkUserExists,
  deleteUserProfile
}; 