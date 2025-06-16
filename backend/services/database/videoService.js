/**
 * @fileoverview 영상 및 채널 완전 시스템 서비스
 * @description 02_video_cache_extended.sql + 03_video_channels.sql의 모든 기능을 포괄하는 ES Module
 * 
 * 🗄️ 관리 테이블:
 * - video_cache_extended (YouTube 영상 확장 캐시)
 * - video_channels (YouTube 채널 정보)
 * 
 * 🔗 연동 대상:
 * - video-tagger.js (LLM 분류 시스템)
 * - channel-info-collector.js (채널 정보 수집)
 * - youtube-search-engine.js (영상 검색)
 * - video-complete-filter.js (재생 가능 필터링)
 * - trendVideoService.js
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
// 📋 1. 영상 캐시 관리 (video_cache_extended 테이블)
// =============================================================================

/**
 * 영상 캐시 저장 (YouTube API + LLM 분류 결과)
 * @param {Object} videoData - 영상 데이터
 * @param {string} videoData.video_id - YouTube 영상 ID
 * @param {string} videoData.title - 영상 제목
 * @param {string} videoData.channel_id - 채널 ID
 * @param {Object} [videoData.llm_classification] - LLM 분류 결과
 * @param {string[]} [videoData.llm_classification.topic_tags] - 주제 태그
 * @param {string[]} [videoData.llm_classification.mood_tags] - 분위기 태그
 * @param {string[]} [videoData.llm_classification.context_tags] - 상황 태그
 * @param {string[]} [videoData.llm_classification.genre_tags] - 장르 태그
 * @returns {Promise<Object>} 저장 결과
 */
export const cacheVideoData = async (videoData) => {
  try {
    // 1. channel_id 필수 검증
    if (!videoData.channel_id) {
      return {
        success: false,
        error: 'channel_id는 필수 필드입니다. 먼저 채널을 생성해주세요.'
      };
    }

    // 2. 채널 존재 여부 확인
    const { data: channel, error: channelError } = await supabase
      .from('video_channels')
      .select('id')
      .eq('channel_id', videoData.channel_id)
      .single();

    if (channelError && channelError.code !== 'PGRST116') {
      throw channelError;
    }

    if (!channel) {
      return {
        success: false,
        error: `채널 ID '${videoData.channel_id}'가 존재하지 않습니다. 먼저 POST /channels로 생성해주세요.`
      };
    }

    // 3. quality_score 스케일링 (NUMERIC(3,2) → 9.99 이하)
    let qualityScore = videoData.quality_score || 0.5;
    if (qualityScore > 9.99) {
      qualityScore = Math.min(qualityScore / 10, 9.99);
      console.log(`quality_score ${videoData.quality_score} → ${qualityScore} (스케일링 적용)`);
    }

    // LLM 분류 데이터 분리
    const llmData = videoData.llm_classification || {};
    
    const insertData = {
      video_id: videoData.video_id,
      title: videoData.title,
      description: videoData.description || null,
      channel_id: videoData.channel_id,
      channel_title: videoData.channel_title || null,
      published_at: videoData.published_at || null,
      category_id: videoData.category_id || null,
      default_language: videoData.default_language || 'ko',
      default_audio_language: videoData.default_audio_language || 'ko',
      
      // 썸네일 정보
      thumbnails: videoData.thumbnails || {},
      thumbnail_url: videoData.thumbnail_url || null,
      
      // YouTube 태그 및 통계
      youtube_tags: videoData.youtube_tags || [],
      view_count: videoData.view_count || 0,
      like_count: videoData.like_count || 0,
      dislike_count: videoData.dislike_count || 0,
      comment_count: videoData.comment_count || 0,
      favorite_count: videoData.favorite_count || 0,
      
      // 콘텐츠 정보
      duration: videoData.duration || 0,
      duration_iso: videoData.duration_iso || null,
      definition: videoData.definition || 'hd',
      caption: videoData.caption || false,
      licensed_content: videoData.licensed_content || false,
      projection: videoData.projection || 'rectangular',
      
      // 상태 정보
      upload_status: videoData.upload_status || 'processed',
      privacy_status: videoData.privacy_status || 'public',
      license: videoData.license || 'youtube',
      embeddable: videoData.embeddable !== false,
      public_stats_viewable: videoData.public_stats_viewable !== false,
      made_for_kids: videoData.made_for_kids || false,
      region_restriction: videoData.region_restriction || {},
      
      // LLM 분류 태그
      topic_tags: llmData.topic_tags || [],
      mood_tags: llmData.mood_tags || [],
      context_tags: llmData.context_tags || [],
      genre_tags: llmData.genre_tags || [],
      
      // LLM 분류 메타데이터
      classification_confidence: llmData.confidence || 0.8,
      classified_by: llmData.engine || 'claude_api',
      classification_model: llmData.model || null,
      classification_prompt_hash: llmData.prompt_hash || null,
      classified_at: llmData.classified_at || new Date().toISOString(),
      used_fallback: llmData.used_fallback || false,
      fallback_reason: llmData.fallback_reason || null,
      
      // 검색 정보
      search_keyword: videoData.search_keyword || null,
      search_category: videoData.search_category || null,
      
      // 재생 가능성
      is_playable: videoData.is_playable !== false,
      playability_check_at: new Date().toISOString(),
      playability_reason: videoData.playability_reason || null,
      
      // 점수 정보 (스케일링 적용됨)
      quality_score: qualityScore,
      engagement_score: videoData.engagement_score || null,
      freshness_score: videoData.freshness_score || null,
      
      // 캐시 관리
      api_units_consumed: videoData.api_units_consumed || 107,
      cache_source: videoData.cache_source || 'youtube_api',
      
      // Raw 데이터
      raw_youtube_data: videoData.raw_youtube_data || {},
      raw_classification_data: llmData.raw_data || {}
    };

    const { data, error } = await supabase
      .from('video_cache_extended')
      .upsert(insertData, { 
        onConflict: 'video_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '영상 캐시가 저장되었습니다',
      data
    };
  } catch (error) {
    console.error('영상 캐시 저장 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 영상 캐시 조회 (단일 영상)
 * @param {string} videoId - YouTube 영상 ID
 * @param {boolean} [incrementHit=true] - 캐시 히트 카운트 증가 여부
 * @returns {Promise<Object>} 영상 정보
 */
export const getCachedVideo = async (videoId, incrementHit = true) => {
  try {
    const { data, error } = await supabase
      .from('video_cache_extended')
      .select('*')
      .eq('video_id', videoId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) throw error;

    // 캐시 히트 카운트 증가
    if (incrementHit && data) {
      await supabase.rpc('increment_video_cache_hit', {
        video_id_param: videoId
      });
    }

    return {
      success: true,
      data,
      cached: true
    };
  } catch (error) {
    console.error('영상 캐시 조회 실패:', error);
    return {
      success: false,
      error: error.message,
      cached: false
    };
  }
};

/**
 * 영상 캐시 조회 (다중 영상)
 * @param {string[]} videoIds - YouTube 영상 ID 배열
 * @returns {Promise<Object>} 영상 목록
 */
export const getCachedVideos = async (videoIds) => {
  try {
    const { data, error } = await supabase
      .from('video_cache_extended')
      .select('*')
      .in('video_id', videoIds)
      .gt('expires_at', new Date().toISOString())
      .order('quality_score', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      message: `${data.length}개 영상 캐시 조회 완료`,
      data,
      found_count: data.length,
      requested_count: videoIds.length
    };
  } catch (error) {
    console.error('영상 캐시 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 재생 가능한 고품질 Shorts 조회 (뷰 활용)
 * @param {Object} [options={}] - 조회 옵션
 * @param {number} [options.limit=20] - 조회 개수
 * @param {string} [options.search_keyword] - 검색 키워드 필터
 * @param {string[]} [options.topic_tags] - 주제 태그 필터
 * @param {string[]} [options.mood_tags] - 분위기 태그 필터
 * @returns {Promise<Object>} 고품질 Shorts 목록
 */
export const getPlayableQualityShorts = async (options = {}) => {
  try {
    let query = supabase
      .from('playable_quality_shorts')
      .select('*')
      .limit(options.limit || 20);

    if (options.search_keyword) {
      query = query.eq('search_keyword', options.search_keyword);
    }

    if (options.topic_tags && options.topic_tags.length > 0) {
      query = query.overlaps('topic_tags', options.topic_tags);
    }

    if (options.mood_tags && options.mood_tags.length > 0) {
      query = query.overlaps('mood_tags', options.mood_tags);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: '고품질 Shorts 조회 완료',
      data
    };
  } catch (error) {
    console.error('고품질 Shorts 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 트렌딩 Shorts 조회 (뷰 활용)
 * @param {number} [limit=20] - 조회 개수
 * @returns {Promise<Object>} 트렌딩 Shorts 목록
 */
export const getTrendingShorts = async (limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('trending_shorts')
      .select('*')
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      message: '트렌딩 Shorts 조회 완료',
      data
    };
  } catch (error) {
    console.error('트렌딩 Shorts 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 태그별 인기 영상 조회 (뷰 활용)
 * @param {string} tag - 검색할 태그
 * @param {string} [tagType] - 태그 타입 ('topic', 'mood')
 * @param {number} [limit=15] - 조회 개수
 * @returns {Promise<Object>} 태그별 인기 영상 목록
 */
export const getVideosByTag = async (tag, tagType = null, limit = 15) => {
  try {
    let query = supabase
      .from('tag_based_popular_shorts')
      .select('*')
      .eq('tag', tag)
      .limit(limit);

    if (tagType) {
      query = query.eq('tag_type', tagType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: `태그 "${tag}" 영상 조회 완료`,
      data
    };
  } catch (error) {
    console.error('태그별 영상 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 영상 품질 점수 업데이트 (DB 함수 활용)
 * @param {string} videoId - YouTube 영상 ID
 * @returns {Promise<Object>} 업데이트 결과
 */
export const updateVideoQualityScore = async (videoId) => {
  try {
    // 영상 정보 조회
    const { data: video, error: fetchError } = await supabase
      .from('video_cache_extended')
      .select('view_count, like_count, comment_count, duration, channel_subscriber_count')
      .eq('video_id', videoId)
      .single();

    if (fetchError) throw fetchError;

    // 품질 점수 계산
    const { data: qualityScore, error: calcError } = await supabase.rpc('calculate_video_quality_score', {
      view_count_param: video.view_count,
      like_count_param: video.like_count,
      comment_count_param: video.comment_count,
      duration_param: video.duration,
      channel_subscriber_count_param: video.channel_subscriber_count || 0
    });

    if (calcError) throw calcError;

    // 품질 점수 업데이트
    const { data, error } = await supabase
      .from('video_cache_extended')
      .update({
        quality_score: qualityScore,
        updated_at: new Date().toISOString()
      })
      .eq('video_id', videoId)
      .select('quality_score')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '영상 품질 점수가 업데이트되었습니다',
      data: { video_id: videoId, quality_score: qualityScore }
    };
  } catch (error) {
    console.error('영상 품질 점수 업데이트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 만료된 영상 캐시 정리 (DB 함수 활용)
 * @returns {Promise<Object>} 정리 결과
 */
export const cleanupExpiredVideoCache = async () => {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_video_cache');

    if (error) throw error;

    return {
      success: true,
      message: `${data}개의 만료된 영상 캐시가 정리되었습니다`,
      deleted_count: data
    };
  } catch (error) {
    console.error('영상 캐시 정리 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =============================================================================
// 📋 2. 채널 정보 관리 (video_channels 테이블)
// =============================================================================

/**
 * 채널 정보 저장 (channel-info-collector.js 연동)
 * @param {Object} channelData - 채널 데이터
 * @param {string} channelData.channel_id - YouTube 채널 ID
 * @param {string} channelData.channel_title - 채널명
 * @param {Object} [channelData.statistics] - 채널 통계
 * @param {Object} [channelData.branding] - 브랜딩 정보
 * @param {Object} [channelData.topics] - 주제 정보
 * @returns {Promise<Object>} 저장 결과
 */
export const saveChannelInfo = async (channelData) => {
  try {
    // 필드명 매핑 처리 (channel_name → channel_title)
    if (channelData.channel_name && !channelData.channel_title) {
      channelData.channel_title = channelData.channel_name;
      delete channelData.channel_name;
    }

    if (channelData.name && !channelData.channel_title) {
      channelData.channel_title = channelData.name;
      delete channelData.name;
    }

    // channel_title 필수 검증
    if (!channelData.channel_title) {
      return {
        success: false,
        error: 'channel_title은 필수 필드입니다. channel_name이 아닌 channel_title을 사용해주세요.'
      };
    }

    const statistics = channelData.statistics || {};
    const branding = channelData.branding || {};
    const topics = channelData.topics || {};

    const insertData = {
      channel_id: channelData.channel_id,
      channel_title: channelData.channel_title,
      channel_description: channelData.channel_description || null,
      custom_url: channelData.custom_url || null,
      country: channelData.country || 'KR',
      default_language: channelData.default_language || 'ko',
      published_at: channelData.published_at || null,
      created_year: channelData.published_at ? new Date(channelData.published_at).getFullYear() : null,
      
      // 아이콘 및 썸네일
      channel_icon_url: channelData.channel_icon_url || null,
      channel_thumbnails: channelData.channel_thumbnails || {},
      thumbnail_default: channelData.thumbnails?.default?.url || null,
      thumbnail_medium: channelData.thumbnails?.medium?.url || null,
      thumbnail_high: channelData.thumbnails?.high?.url || null,
      thumbnail_maxres: channelData.thumbnails?.maxres?.url || null,
      
      // 통계 정보
      subscriber_count: statistics.subscriber_count || 0,
      hidden_subscriber_count: statistics.hidden_subscriber_count || false,
      total_view_count: statistics.total_view_count || 0,
      video_count: statistics.video_count || 0,
      
      // 브랜딩 정보
      branding_keywords: branding.keywords || null,
      unsubscribed_trailer: branding.unsubscribed_trailer || null,
      branding_country: branding.country || null,
      
      // 주제 정보
      topic_ids: topics.topic_ids || [],
      topic_categories: topics.topic_categories || [],
      
      // URL 정보
      channel_url: `https://www.youtube.com/channel/${channelData.channel_id}`,
      custom_channel_url: channelData.custom_url ? `https://www.youtube.com/${channelData.custom_url}` : null,
      
      // 품질 정보 (초기값)
      quality_grade: 'C',
      quality_score: 0.5,
      
      // 캐시 관리
      collected_at: new Date().toISOString(),
      api_units_consumed: channelData.api_units_consumed || 5,
      collection_options: channelData.collection_options || {},
      included_branding: !!branding && Object.keys(branding).length > 0,
      included_topics: !!topics && Object.keys(topics).length > 0,
      
      // Raw 데이터
      raw_youtube_data: channelData.raw_youtube_data || {}
    };

    const { data, error } = await supabase
      .from('video_channels')
      .upsert(insertData, { 
        onConflict: 'channel_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) throw error;

    // 구독자 수 포맷팅 및 품질 등급 계산
    await updateChannelQualityMetrics(channelData.channel_id);

    return {
      success: true,
      message: '채널 정보가 저장되었습니다',
      data
    };
  } catch (error) {
    console.error('채널 정보 저장 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 채널 정보 조회 (단일 채널)
 * @param {string} channelId - YouTube 채널 ID
 * @returns {Promise<Object>} 채널 정보
 */
export const getChannelInfo = async (channelId) => {
  try {
    const { data, error } = await supabase
      .from('video_channels')
      .select('*')
      .eq('channel_id', channelId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) throw error;

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('채널 정보 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 고품질 채널 조회 (테이블 직접 조회로 안전 처리)
 * @param {Object} [options={}] - 조회 옵션
 * @param {string} [options.quality_grade] - 품질 등급 필터 ('S', 'A', 'B')
 * @param {string} [options.content_type] - 콘텐츠 타입 필터
 * @param {number} [options.limit=20] - 조회 개수
 * @returns {Promise<Object>} 고품질 채널 목록
 */
export const getHighQualityChannels = async (options = {}) => {
  try {
    let query = supabase
      .from('video_channels')
      .select('*')
      .in('quality_grade', ['A', 'S', 'B', 'C', 'D'])  // 임시: 모든 채널
      .eq('is_active', true)
      .eq('is_blocked', false)
      .limit(options.limit || 20);

    if (options.quality_grade) {
      query = query.eq('quality_grade', options.quality_grade);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: data.length > 0 ? '고품질 채널 조회 완료' : '고품질 채널이 없습니다',
      data: data || []
    };
  } catch (error) {
    console.error('고품질 채널 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 활성 Shorts 채널 조회 (테이블 직접 조회로 안전 처리)
 * @param {number} [limit=20] - 조회 개수
 * @returns {Promise<Object>} 활성 Shorts 채널 목록
 */
export const getActiveShortsChannels = async (limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('video_channels')
      .select('*')
      .eq('is_active', true)
      .eq('is_blocked', false)
      .gte('video_count', 10)  // 최소 10개 이상 영상
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      message: data.length > 0 ? '활성 Shorts 채널 조회 완료' : '활성 Shorts 채널이 없습니다',
      data: data || []
    };
  } catch (error) {
    console.error('활성 Shorts 채널 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 채널 통계 요약 조회 (뷰 활용)
 * @returns {Promise<Object>} 채널 통계 요약
 */
export const getChannelStatsSummary = async () => {
  try {
    const { data, error } = await supabase
      .from('channel_stats_summary')
      .select('*');

    if (error) throw error;

    // 데이터가 배열로 반환되므로 요약 처리
    const summary = data.length > 0 ? data[0] : {
      total_channels: 0,
      total_videos: 0,
      total_views: 0,
      avg_quality_score: 0,
      high_quality_channels: 0
    };

    return {
      success: true,
      message: data.length > 0 ? '채널 통계 요약 조회 완료' : '채널 데이터가 없습니다',
      data: summary
    };
  } catch (error) {
    console.error('채널 통계 요약 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 채널 품질 메트릭 업데이트 (DB 함수 활용)
 * @param {string} channelId - YouTube 채널 ID
 * @returns {Promise<Object>} 업데이트 결과
 */
export const updateChannelQualityMetrics = async (channelId) => {
  try {
    // 채널 정보 조회
    const { data: channel, error: fetchError } = await supabase
      .from('video_channels')
      .select('subscriber_count, video_count, total_view_count')
      .eq('channel_id', channelId)
      .single();

    if (fetchError) throw fetchError;

    // 평균 조회수 계산
    const avgViewsPerVideo = channel.video_count > 0 
      ? Math.floor(channel.total_view_count / channel.video_count) 
      : 0;

    // 품질 등급 계산
    const { data: qualityGrade, error: gradeError } = await supabase.rpc('calculate_channel_quality_grade', {
      subscriber_count_param: channel.subscriber_count,
      video_count_param: channel.video_count,
      total_view_count_param: channel.total_view_count,
      avg_views_per_video_param: avgViewsPerVideo
    });

    if (gradeError) throw gradeError;

    // 구독자 수 포맷팅
    const { data: formattedCount, error: formatError } = await supabase.rpc('format_subscriber_count', {
      count_param: channel.subscriber_count
    });

    if (formatError) throw formatError;

    // 업데이트
    const { data, error } = await supabase
      .from('video_channels')
      .update({
        avg_views_per_video: avgViewsPerVideo,
        quality_grade: qualityGrade,
        subscriber_count_formatted: formattedCount,
        last_updated: new Date().toISOString()
      })
      .eq('channel_id', channelId)
      .select('quality_grade, subscriber_count_formatted, avg_views_per_video')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '채널 품질 메트릭이 업데이트되었습니다',
      data: { channel_id: channelId, ...data }
    };
  } catch (error) {
    console.error('채널 품질 메트릭 업데이트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 전체 채널 품질 점수 업데이트 (DB 함수 활용)
 * @returns {Promise<Object>} 업데이트 결과
 */
export const updateAllChannelQualityScores = async () => {
  try {
    const { data, error } = await supabase.rpc('update_channel_quality_scores');

    if (error) throw error;

    return {
      success: true,
      message: `${data}개 채널의 품질 점수가 업데이트되었습니다`,
      updated_count: data
    };
  } catch (error) {
    console.error('전체 채널 품질 점수 업데이트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 만료된 채널 캐시 정리 (DB 함수 활용)
 * @returns {Promise<Object>} 정리 결과
 */
export const cleanupExpiredChannelCache = async () => {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_channel_cache');

    if (error) throw error;

    return {
      success: true,
      message: `${data}개의 만료된 채널 캐시가 정리되었습니다`,
      deleted_count: data
    };
  } catch (error) {
    console.error('채널 캐시 정리 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =============================================================================
// 📋 3. 통합 검색 및 필터링 기능
// =============================================================================

/**
 * 키워드 기반 영상 검색 (영상+채널 정보 통합)
 * @param {string} keyword - 검색 키워드
 * @param {Object} [options={}] - 검색 옵션
 * @param {number} [options.limit=20] - 조회 개수
 * @param {boolean} [options.playable_only=true] - 재생 가능한 영상만
 * @param {number} [options.min_quality_score=0.5] - 최소 품질 점수
 * @param {string[]} [options.topic_tags] - 주제 태그 필터
 * @param {string[]} [options.mood_tags] - 분위기 태그 필터
 * @returns {Promise<Object>} 검색 결과
 */
export const searchVideosWithChannelInfo = async (keyword, options = {}) => {
  try {
    let query = supabase
      .from('video_cache_extended')
      .select(`
        *,
        video_channels!inner(
          channel_title,
          channel_icon_url,
          subscriber_count_formatted,
          quality_grade
        )
      `)
      .or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%,search_keyword.eq.${keyword}`)
      .lte('duration', 60)  // Shorts만
      .gt('expires_at', new Date().toISOString())
      .order('quality_score', { ascending: false })
      .limit(options.limit || 20);

    if (options.playable_only !== false) {
      query = query.eq('is_playable', true);
    }

    if (options.min_quality_score) {
      query = query.gte('quality_score', options.min_quality_score);
    }

    if (options.topic_tags && options.topic_tags.length > 0) {
      query = query.overlaps('topic_tags', options.topic_tags);
    }

    if (options.mood_tags && options.mood_tags.length > 0) {
      query = query.overlaps('mood_tags', options.mood_tags);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: `키워드 "${keyword}" 검색 완료`,
      data,
      total_found: data.length
    };
  } catch (error) {
    console.error('키워드 기반 영상 검색 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 채널별 영상 조회
 * @param {string} channelId - YouTube 채널 ID
 * @param {Object} [options={}] - 조회 옵션
 * @param {number} [options.limit=20] - 조회 개수
 * @param {boolean} [options.playable_only=true] - 재생 가능한 영상만
 * @returns {Promise<Object>} 채널별 영상 목록
 */
export const getVideosByChannel = async (channelId, options = {}) => {
  try {
    let query = supabase
      .from('video_cache_extended')
      .select('*')
      .eq('channel_id', channelId)
      .lte('duration', 60)  // Shorts만
      .gt('expires_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(options.limit || 20);

    if (options.playable_only !== false) {
      query = query.eq('is_playable', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: '채널별 영상 조회 완료',
      data
    };
  } catch (error) {
    console.error('채널별 영상 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =============================================================================
// 📋 4. 유틸리티 및 관리 기능
// =============================================================================

/**
 * 영상 재생 가능성 확인 및 업데이트
 * @param {string} videoId - YouTube 영상 ID
 * @param {boolean} isPlayable - 재생 가능 여부
 * @param {string} [reason] - 재생 불가 사유
 * @returns {Promise<Object>} 업데이트 결과
 */
export const updateVideoPlayability = async (videoId, isPlayable, reason = null) => {
  try {
    const { data, error } = await supabase
      .from('video_cache_extended')
      .update({
        is_playable: isPlayable,
        playability_check_at: new Date().toISOString(),
        playability_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('video_id', videoId)
      .select('video_id, is_playable, playability_reason')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '영상 재생 가능성이 업데이트되었습니다',
      data
    };
  } catch (error) {
    console.error('영상 재생 가능성 업데이트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 채널 차단/해제
 * @param {string} channelId - YouTube 채널 ID
 * @param {boolean} isBlocked - 차단 여부
 * @param {string} [blockReason] - 차단 사유
 * @returns {Promise<Object>} 업데이트 결과
 */
export const blockUnblockChannel = async (channelId, isBlocked, blockReason = null) => {
  try {
    const { data, error } = await supabase
      .from('video_channels')
      .update({
        is_blocked: isBlocked,
        block_reason: isBlocked ? blockReason : null,
        updated_at: new Date().toISOString()
      })
      .eq('channel_id', channelId)
      .select('channel_id, channel_title, is_blocked, block_reason')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `채널 "${data.channel_title}"이 ${isBlocked ? '차단' : '해제'}되었습니다`,
      data
    };
  } catch (error) {
    console.error('채널 차단/해제 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 캐시 통계 조회
 * @returns {Promise<Object>} 캐시 통계
 */
export const getCacheStatistics = async () => {
  try {
    // 영상 캐시 통계
    const { data: videoStats, error: videoError } = await supabase
      .from('video_cache_extended')
      .select('*')
      .gt('expires_at', new Date().toISOString());

    if (videoError) throw videoError;

    // 채널 캐시 통계  
    const { data: channelStats, error: channelError } = await supabase
      .from('video_channels')
      .select('*')
      .gt('expires_at', new Date().toISOString());

    if (channelError) throw channelError;

    const stats = {
      videos: {
        total: videoStats.length,
        playable: videoStats.filter(v => v.is_playable).length,
        high_quality: videoStats.filter(v => v.quality_score >= 0.7).length,
        with_llm_tags: videoStats.filter(v => v.topic_tags.length > 0).length,
        total_cache_hits: videoStats.reduce((sum, v) => sum + v.cache_hit_count, 0)
      },
      channels: {
        total: channelStats.length,
        active: channelStats.filter(c => c.is_active).length,
        blocked: channelStats.filter(c => c.is_blocked).length,
        s_grade: channelStats.filter(c => c.quality_grade === 'S').length,
        a_grade: channelStats.filter(c => c.quality_grade === 'A').length,
        b_grade: channelStats.filter(c => c.quality_grade === 'B').length
      }
    };

    return {
      success: true,
      message: '캐시 통계 조회 완료',
      data: stats
    };
  } catch (error) {
    console.error('캐시 통계 조회 실패:', error);
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
 * 기본 내보내기: 전체 비디오 서비스 객체
 */
export default {
  // 1. 영상 캐시 관리
  cacheVideoData,
  getCachedVideo,
  getCachedVideos,
  getPlayableQualityShorts,
  getTrendingShorts,
  getVideosByTag,
  updateVideoQualityScore,
  cleanupExpiredVideoCache,

  // 2. 채널 정보 관리
  saveChannelInfo,
  getChannelInfo,
  getHighQualityChannels,
  getActiveShortsChannels,
  getChannelStatsSummary,
  updateChannelQualityMetrics,
  updateAllChannelQualityScores,
  cleanupExpiredChannelCache,

  // 3. 통합 검색 및 필터링
  searchVideosWithChannelInfo,
  getVideosByChannel,

  // 4. 유틸리티 및 관리
  updateVideoPlayability,
  blockUnblockChannel,
  getCacheStatistics
};