/**
 * 🔍 검색 서비스
 * YouTube 영상 검색 및 결과 처리
 */

class SearchService {
  constructor() {
    // 🚂 Railway 프로덕션 서버 URL 사용
    this.baseUrl = 'https://momentum-production-68bb.up.railway.app/api/v1/search'
  }

  /**
   * 실시간 키워드 검색
   * @param {string} keyword - 검색할 키워드
   * @param {Object} options - 검색 옵션
   * @returns {Promise<Object>} 검색 결과
   */
  async searchRealtime(keyword, options = {}) {
    try {
      console.log('🔍 실시간 검색 시작:', keyword)

      // 기본 옵션 설정
      const searchParams = {
        keyword: keyword.trim(),
        category: options.category || null,
        min_view_count: options.minViewCount || 10000,
        min_engagement_rate: options.minEngagementRate || 1.5,
        target_count: options.targetCount || 20,
        max_pages: options.maxPages || 3
      }

      const response = await fetch(`${this.baseUrl}/realtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchParams)
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ 실시간 검색 완료:', result)
        return {
          success: true,
          keyword: keyword,
          duration: result.duration,
          message: result.message
        }
      } else {
        console.error('❌ 검색 실패:', result.error)
        return {
          success: false,
          error: result.error || '검색 중 오류가 발생했습니다'
        }
      }
    } catch (error) {
      console.error('❌ 검색 서비스 오류:', error)
      return {
        success: false,
        error: '네트워크 오류가 발생했습니다'
      }
    }
  }

  /**
   * 빠른 키워드 검색
   * @param {string} keyword - 검색할 키워드
   * @param {Object} options - 검색 옵션
   * @returns {Promise<Object>} 검색 결과
   */
  async searchQuick(keyword, options = {}) {
    try {
      console.log('⚡ 빠른 검색 시작:', keyword)

      const searchParams = {
        keyword: keyword.trim(),
        category: options.category || null
      }

      const response = await fetch(`${this.baseUrl}/quick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchParams)
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ 빠른 검색 완료:', result)
        return {
          success: true,
          keyword: keyword,
          duration: result.duration,
          message: result.message
        }
      } else {
        console.error('❌ 빠른 검색 실패:', result.error)
        return {
          success: false,
          error: result.error || '검색 중 오류가 발생했습니다'
        }
      }
    } catch (error) {
      console.error('❌ 빠른 검색 서비스 오류:', error)
      return {
        success: false,
        error: '네트워크 오류가 발생했습니다'
      }
    }
  }

  /**
   * 검색 서비스 상태 확인
   * @returns {Promise<Object>} 상태 정보
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      const result = await response.json()
      
      return {
        success: result.success,
        status: result.status,
        services: result.services
      }
    } catch (error) {
      console.error('❌ 헬스체크 실패:', error)
      return {
        success: false,
        status: 'unreachable'
      }
    }
  }

  /**
   * 사용자가 선택한 키워드에서 카테고리 추출
   * @param {string} keyword - 키워드
   * @returns {string|null} 추출된 카테고리
   */
  extractCategory(keyword) {
    const categoryKeywords = {
      '먹방 & 요리': ['먹방', '요리', '레시피', '음식', '맛집', '홈쿡'],
      '음악 & 엔터테인먼트': ['음악', '댄스', '노래', '커버', '엔터'],
      '코미디 & 챌린지': ['챌린지', '웃긴', '코미디', '개그'],
      '게임 & 테크': ['게임', '테크', '기술', '리뷰'],
      '교육 & 정보': ['교육', '정보', '팁', '강의'],
      '뷰티 & 패션': ['뷰티', '메이크업', '패션', '코디'],
      '라이프스타일 & 건강': ['일상', '브이로그', '운동', '건강', '힐링'],
      '여행 & 문화': ['여행', '문화', '맛집'],
      'ASMR & 힐링': ['ASMR', '힐링', '편안', '위로']
    }

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => keyword.includes(k))) {
        return category
      }
    }

    return null
  }

  /**
   * 키워드별 저장된 영상 조회 (video_cache_extended DB에서)
   * @param {string} keyword - 검색할 키워드
   * @param {Object} options - 조회 옵션
   * @returns {Promise<Object>} 저장된 영상 결과
   */
  async getVideosByKeyword(keyword, options = {}) {
    try {
      console.log('🎬 DB에서 키워드별 영상 조회:', keyword)

      const searchParams = new URLSearchParams({
        limit: options.limit || 20
      })

      // topic_tags가 있으면 추가
      if (options.topicTags && Array.isArray(options.topicTags)) {
        searchParams.append('topic_tags', options.topicTags.join(','))
      }

      // mood_tags가 있으면 추가
      if (options.moodTags && Array.isArray(options.moodTags)) {
        searchParams.append('mood_tags', options.moodTags.join(','))
      }

      const response = await fetch(`${this.baseUrl}/videos/${encodeURIComponent(keyword)}?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        console.log('✅ DB 영상 조회 성공:', {
          keyword,
          count: result.data?.length || 0,
          queryTime: result.meta?.query_time_ms || 0,
          isFallback: result.meta?.is_fallback || false
        })

        return {
          success: true,
          data: result.data || [],
          meta: result.meta || {},
          keyword: result.keyword,
          source: result.source,
          timestamp: result.timestamp
        }
      } else {
        throw new Error(result.error || 'DB 영상 조회 실패')
      }

    } catch (error) {
      console.error('❌ DB 영상 조회 오류:', error)
      return {
        success: false,
        error: error.message,
        data: [],
        keyword
      }
    }
  }
}

// 싱글톤 인스턴스 생성
const searchService = new SearchService()

export default searchService 