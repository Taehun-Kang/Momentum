/**
 * 🔍 v2 검색 서비스 (간소화 버전)
 * Railway v2 search API 전용 래퍼
 */

import { apiClientV2 } from './apiClientV2.js'

class SearchServiceV2 {
  constructor() {
    this.apiClient = apiClientV2
    console.log('🔍 v2 Search Service 초기화')
  }

  /**
   * 🎯 VQS 기반 영상 검색 (단일/다중 키워드 통합 처리)
   * @param {string|Array} keywords - 검색 키워드(들)
   * @param {Object} options - 검색 옵션
   * @returns {Promise<Object>} 검색 결과
   */
  async searchVideos(keywords, options = {}) {
    try {
      // 단일 키워드든 배열이든 모두 배열로 처리
      const keywordArray = Array.isArray(keywords) ? keywords : [keywords]
      console.log('🎯 v2 VQS 기반 영상 검색 시작:', keywordArray)

      const requestData = {
        keywords: keywordArray,
        limit: options.limit || 50  // 기본 50개로 변경
      }

      const response = await this.apiClient.post('/search/batch', requestData)

      if (response.success) {
        console.log('✅ v2 영상 검색 성공:', {
          keywords: keywordArray,
          resultsCount: response.results?.length || 0,
          totalVideos: response.summary?.totalVideos || 0,
          duration: response.summary?.totalDuration || 0
        })

        return {
          success: true,
          keywords: keywordArray,
          results: response.results || [],
          summary: response.summary || {},
          timestamp: response.timestamp
        }
      } else {
        throw new Error(response.error || 'v2 영상 검색 실패')
      }

    } catch (error) {
      console.error('❌ v2 영상 검색 실패:', error.message)
      
      return {
        success: false,
        error: error.message,
        keywords: Array.isArray(keywords) ? keywords : [keywords],
        results: [],
        summary: { totalVideos: 0 }
      }
    }
  }

  /**
   * 🎨 v2 검색 결과를 VideoPlayer 호환 형식으로 변환 (최소화)
   * @param {Object} v2SearchResult - v2 검색 결과
   * @returns {Object} VideoPlayer 호환 데이터
   */
  transformToVideoPlayerData(v2SearchResult) {
    if (!v2SearchResult.success || !v2SearchResult.results || v2SearchResult.results.length === 0) {
      return {
        success: false,
        data: [],
        meta: {
          total_found: 0,
          is_fallback: true,
          source: 'v2_search_failed'
        }
      }
    }

    // 첫 번째 키워드의 결과를 사용 (단일 키워드 검색과 호환)
    const firstResult = v2SearchResult.results[0]
    
    if (!firstResult || !firstResult.videos) {
      return {
        success: false,
        data: [],
        meta: {
          total_found: 0,
          is_fallback: true,
          source: 'v2_search_no_videos'
        }
      }
    }

    // v2 영상 데이터를 VideoPlayer가 기대하는 최소 형식으로 변환
    const transformedVideos = firstResult.videos.map(video => ({
      // VideoPlayer 필수 필드만
      videoId: video.video_id,           // YouTube 영상 ID (필수)
      title: video.title || '영상 제목',  // 영상 제목 (필수)
      creator: video.handle_name || '크리에이터', // 크리에이터명 (필수) - handle_name 사용
      
      // UI 상태 필드 (초기값)
      isLiked: false,
      isDisliked: false,
      isPlaying: false,
      avatar: '👤'
    }))

    return {
      success: true,
      data: transformedVideos,
      meta: {
        total_found: firstResult.videos.length,
        query_time_ms: v2SearchResult.summary?.totalDuration * 1000 || 0,
        is_fallback: false,
        source: 'v2_search_vqs',
        search_keyword: firstResult.keyword
      },
      keyword: firstResult.keyword,
      timestamp: v2SearchResult.timestamp
    }
  }

  /**
   * 🎯 ChatFlow에서 VideoPlayer로 전환하는 통합 메서드
   * @param {string} keyword - 선택된 키워드 (공백으로 연결된 문자열)
   * @param {Object} options - 검색 옵션
   * @returns {Promise<Object>} VideoPlayer 전환 결과
   */
  async searchForVideoPlayer(keyword, options = {}) {
    try {
      console.log('🎯 ChatFlow → VideoPlayer 검색 시작:', keyword)

      // ✅ 키워드 문자열을 개별 키워드 배열로 분리
      const keywordArray = keyword.split(' ').filter(k => k.trim().length > 0)
      console.log('🔧 키워드 분리:', keyword, '→', keywordArray)

      // 개별 키워드 배열로 검색 실행
      const searchResult = await this.searchVideos(keywordArray, {
        limit: options.limit || 50  // VideoPlayer용 기본 50개
      })

      if (searchResult.success && searchResult.summary?.totalVideos > 0) {
        // VideoPlayer 호환 형식으로 변환
        const videoPlayerData = this.transformToVideoPlayerData(searchResult)
        
        // ✅ 영상 결과를 랜덤으로 섞기
        if (videoPlayerData.success && videoPlayerData.data.length > 0) {
          videoPlayerData.data = this.shuffleArray(videoPlayerData.data)
          console.log(`🔀 영상 ${videoPlayerData.data.length}개 랜덤 섞기 완료`)
        }
        
        console.log('✅ ChatFlow → VideoPlayer 검색 성공:', {
          originalKeyword: keyword,
          splitKeywords: keywordArray,
          videoCount: videoPlayerData.data.length
        })

        return videoPlayerData
      } else {
        throw new Error('검색된 영상이 없습니다')
      }

    } catch (error) {
      console.error('❌ ChatFlow → VideoPlayer 검색 실패:', error.message)
      
      return {
        success: false,
        error: error.message,
        data: [],
        meta: {
          total_found: 0,
          is_fallback: true,
          source: 'v2_search_failed'
        },
        keyword
      }
    }
  }

  /**
   * 🔀 배열을 랜덤으로 섞는 유틸리티 메서드 (Fisher-Yates 알고리즘)
   * @param {Array} array - 섞을 배열
   * @returns {Array} 섞인 배열
   */
  shuffleArray(array) {
    const shuffled = [...array] // 원본 배열 복사
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return shuffled
  }
}

// 싱글톤 인스턴스 생성
export const searchServiceV2 = new SearchServiceV2()
