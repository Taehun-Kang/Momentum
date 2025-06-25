/**
 * 🔍 SearchEngine - 키워드별 영상 검색 엔진
 * 
 * 핵심 기능:
 * - videos_cache_v2 테이블에서 단일 키워드 영상 조회
 * - 기본 필터링 (재생가능, Shorts)
 * - 다중 키워드 처리는 상위 레벨에서 담당
 */

import { createClient } from '@supabase/supabase-js'

class SearchEngine {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }

  /**
   * 단일 키워드로 영상 검색 - 메인 기능
   * @param {string} keyword - 검색 키워드
   * @returns {Array} 영상 배열
   */
  async getVideosByKeyword(keyword) {
    try {
      const { data, error } = await this.supabase
        .from('videos_cache_v2')
        .select(`
          id,
          video_id,
          title,
          description,
          handle_name,
          youtuber_id,
          views,
          likes,
          num_comments,
          subscribers,
          video_length,
          date_posted,
          preview_image,
          verified,
          topic_tags,
          mood_tags,
          context_tags,
          genre_tags,
          classification_confidence,
          collection_keyword,
          cached_at
        `)
        .eq('collection_keyword', keyword)
        .eq('is_playable', true)
        .eq('is_shorts', true)
        .order('cached_at', { ascending: false })

      if (error) {
        console.error(`❌ DB 조회 실패 (${keyword}):`, error)
        return []
      }

      return data || []
    } catch (error) {
      console.error(`❌ 검색 오류 (${keyword}):`, error)
      return []
    }
  }

  /**
   * 키워드별 영상 수 확인 (미리보기용)
   * @param {string[]} keywords - 확인할 키워드들
   * @returns {Object} 키워드별 영상 수
   */
  async getKeywordStats(keywords) {
    const stats = {}

    for (const keyword of keywords) {
      try {
        const { count } = await this.supabase
          .from('videos_cache_v2')
          .select('*', { count: 'exact', head: true })
          .eq('collection_keyword', keyword)
          .eq('is_playable', true)
          .eq('is_shorts', true)

        stats[keyword] = count || 0
      } catch (error) {
        console.error(`❌ 통계 조회 실패 (${keyword}):`, error)
        stats[keyword] = 0
      }
    }

    return stats
  }
}

export default SearchEngine 