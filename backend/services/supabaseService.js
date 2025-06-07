const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase 데이터베이스 서비스
 * Wave Team - Momentum 프로젝트
 */
class SupabaseService {
  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase 환경 변수가 설정되지 않았습니다');
    }

    // 서비스 롤 키로 클라이언트 생성 (RLS 우회 가능)
    this.client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 일반 사용자용 클라이언트 (RLS 적용)
    this.userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // ============================================
  // 1. 사용자 프로필 관리
  // ============================================

  /**
   * 사용자 프로필 조회
   */
  async getUserProfile(userId) {
    try {
      const { data, error } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      if (error.code === 'PGRST116') {
        // 프로필이 없으면 null 반환
        return null;
      }
      throw error;
    }
  }

  /**
   * 사용자 프로필 생성 또는 업데이트
   */
  async upsertUserProfile(userId, profileData) {
    try {
      const { data, error } = await this.client
        .from('user_profiles')
        .upsert({
          user_id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('프로필 업서트 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 검색 패턴 업데이트
   */
  async updateUserSearchPattern(userId, keywords, timeContext) {
    try {
      // 기존 패턴 조회
      let { data: pattern } = await this.client
        .from('user_search_patterns')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!pattern) {
        // 새로운 패턴 생성
        const { data: newPattern, error } = await this.client
          .from('user_search_patterns')
          .insert({
            user_id: userId,
            search_keywords: keywords,
            search_time_patterns: { [timeContext.hour]: 1 },
            preferred_categories: [],
            last_analyzed: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return newPattern;
      } else {
        // 기존 패턴 업데이트
        const updatedKeywords = [...new Set([...pattern.search_keywords, ...keywords])];
        const timePatterns = pattern.search_time_patterns || {};
        timePatterns[timeContext.hour] = (timePatterns[timeContext.hour] || 0) + 1;

        const { data: updatedPattern, error } = await this.client
          .from('user_search_patterns')
          .update({
            search_keywords: updatedKeywords,
            search_time_patterns: timePatterns,
            last_analyzed: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return updatedPattern;
      }
    } catch (error) {
      console.error('검색 패턴 업데이트 실패:', error);
      throw error;
    }
  }

  // ============================================
  // 2. 영상 캐시 관리
  // ============================================

  /**
   * 영상 캐시 저장
   */
  async cacheVideo(videoData) {
    try {
      const { data, error } = await this.client
        .from('cached_videos')
        .upsert({
          video_id: videoData.id,
          title: videoData.snippet.title,
          channel_name: videoData.snippet.channelTitle,
          channel_id: videoData.snippet.channelId,
          duration: this.parseDuration(videoData.contentDetails?.duration),
          view_count: parseInt(videoData.statistics?.viewCount) || 0,
          like_count: parseInt(videoData.statistics?.likeCount) || 0,
          comment_count: parseInt(videoData.statistics?.commentCount) || 0,
          thumbnail_url: videoData.snippet.thumbnails?.medium?.url,
          published_at: videoData.snippet.publishedAt,
          description: videoData.snippet.description,
          tags: videoData.snippet.tags || [],
          category_id: videoData.snippet.categoryId,
          is_playable: videoData.status?.embeddable !== false,
          quality_score: this.calculateQualityScore(videoData),
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('영상 캐시 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 키워드별 영상 매핑 저장
   */
  async saveKeywordVideoMapping(keyword, videoId, relevanceScore = 0.5, searchRank = null) {
    try {
      const { data, error } = await this.client
        .from('keyword_video_mappings')
        .upsert({
          keyword: keyword.toLowerCase(),
          video_id: videoId,
          relevance_score: relevanceScore,
          search_rank: searchRank
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('키워드-영상 매핑 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 키워드로 캐시된 영상 조회
   */
  async getCachedVideosByKeyword(keyword, limit = 20) {
    try {
      const { data, error } = await this.client
        .from('keyword_video_mappings')
        .select(`
          relevance_score,
          search_rank,
          cached_videos (
            video_id,
            title,
            channel_name,
            duration,
            view_count,
            thumbnail_url,
            is_playable,
            quality_score,
            expires_at
          )
        `)
        .eq('keyword', keyword.toLowerCase())
        .eq('cached_videos.is_playable', true)
        .gt('cached_videos.expires_at', new Date().toISOString())
        .order('relevance_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return data.map(item => ({
        ...item.cached_videos,
        relevance_score: item.relevance_score,
        search_rank: item.search_rank
      }));
    } catch (error) {
      console.error('캐시된 영상 조회 실패:', error);
      return [];
    }
  }

  // ============================================
  // 3. 트렌드 데이터 관리
  // ============================================

  /**
   * 트렌딩 키워드 저장
   */
  async saveTrendingKeywords(keywords) {
    try {
      const keywordData = keywords.map(keyword => ({
        keyword: keyword.keyword,
        category: keyword.category,
        trend_score: keyword.trendScore || 0,
        search_volume: keyword.searchVolume || 0,
        growth_rate: keyword.growthRate || 0,
        data_source: keyword.source || 'internal',
        region_code: 'KR',
        detected_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      }));

      const { data, error } = await this.client
        .from('trending_keywords')
        .upsert(keywordData)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('트렌딩 키워드 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 트렌딩 키워드 조회
   */
  async getTrendingKeywords(category = null, limit = 20) {
    try {
      let query = this.client
        .from('trending_keywords')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('trend_score', { ascending: false })
        .limit(limit);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('트렌딩 키워드 조회 실패:', error);
      return [];
    }
  }

  // ============================================
  // 4. 사용자 상호작용 추적
  // ============================================

  /**
   * 검색 세션 기록
   */
  async logSearchSession(sessionData) {
    try {
      const { data, error } = await this.client
        .from('search_sessions')
        .insert({
          user_id: sessionData.userId || null,
          session_id: sessionData.sessionId,
          search_query: sessionData.query,
          search_type: sessionData.searchType,
          keywords_used: sessionData.keywords,
          results_count: sessionData.resultsCount,
          ai_method: sessionData.aiMethod,
          response_time: sessionData.responseTime,
          user_agent: sessionData.userAgent,
          ip_address: sessionData.ipAddress
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('검색 세션 로그 실패:', error);
      throw error;
    }
  }

  /**
   * 영상 상호작용 기록
   */
  async logVideoInteraction(userId, videoId, interactionType, context = {}) {
    try {
      const { data, error } = await this.client
        .from('video_interactions')
        .insert({
          user_id: userId,
          video_id: videoId,
          interaction_type: interactionType,
          watch_duration: context.watchDuration,
          interaction_context: context
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('영상 상호작용 로그 실패:', error);
      throw error;
    }
  }

  // ============================================
  // 5. API 사용량 추적
  // ============================================

  /**
   * API 사용량 로그
   */
  async logApiUsage(apiData) {
    try {
      const { data, error } = await this.client
        .from('api_usage_logs')
        .insert({
          api_name: apiData.apiName,
          endpoint: apiData.endpoint,
          method: apiData.method,
          units_consumed: apiData.unitsConsumed,
          quota_category: apiData.quotaCategory,
          response_time: apiData.responseTime,
          status_code: apiData.statusCode,
          error_message: apiData.errorMessage,
          request_params: apiData.requestParams
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('API 사용량 로그 실패:', error);
      throw error;
    }
  }

  /**
   * 오늘의 API 사용량 조회
   */
  async getTodaysApiUsage() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await this.client
        .from('api_usage_logs')
        .select('quota_category, units_consumed')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      if (error) throw error;

      // 카테고리별 사용량 집계
      const usage = data.reduce((acc, log) => {
        const category = log.quota_category || 'unknown';
        acc[category] = (acc[category] || 0) + log.units_consumed;
        return acc;
      }, {});

      const totalUsed = Object.values(usage).reduce((sum, val) => sum + val, 0);

      return {
        totalUsed,
        categories: usage,
        remaining: 10000 - totalUsed,
        usagePercent: (totalUsed / 10000) * 100
      };
    } catch (error) {
      console.error('API 사용량 조회 실패:', error);
      return { totalUsed: 0, categories: {}, remaining: 10000, usagePercent: 0 };
    }
  }

  // ============================================
  // 6. 유틸리티 함수들
  // ============================================

  /**
   * YouTube duration 파싱 (PT1M30S -> 90초)
   */
  parseDuration(duration) {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * 영상 품질 점수 계산
   */
  calculateQualityScore(videoData) {
    let score = 0.5; // 기본 점수

    const stats = videoData.statistics || {};
    const viewCount = parseInt(stats.viewCount) || 0;
    const likeCount = parseInt(stats.likeCount) || 0;
    const dislikeCount = parseInt(stats.dislikeCount) || 0;

    // 조회수 점수 (최대 0.3)
    if (viewCount > 100000) score += 0.3;
    else if (viewCount > 10000) score += 0.2;
    else if (viewCount > 1000) score += 0.1;

    // 좋아요 비율 점수 (최대 0.2)
    if (likeCount > 0) {
      const likeRatio = likeCount / (likeCount + dislikeCount);
      if (likeRatio > 0.9) score += 0.2;
      else if (likeRatio > 0.8) score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 데이터베이스 정리 작업 실행
   */
  async cleanupExpiredData() {
    try {
      const { data, error } = await this.client.rpc('cleanup_expired_data');
      if (error) throw error;
      
      console.log(`만료된 데이터 ${data}개 정리 완료`);
      return data;
    } catch (error) {
      console.error('데이터 정리 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 맞춤 추천 영상 조회
   */
  async getUserRecommendations(userId, limit = 20) {
    try {
      const { data, error } = await this.client.rpc('get_user_recommendations', {
        p_user_id: userId,
        p_limit: limit
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('추천 영상 조회 실패:', error);
      return [];
    }
  }
}

module.exports = new SupabaseService(); 