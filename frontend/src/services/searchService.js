/**
 * 🔍 검색 서비스
 * YouTube 영상 검색 및 결과 처리
 */

class SearchService {
  constructor() {
    // 🚂 Railway 프로덕션 서버 강제 사용 (로컬 백엔드 비활성화)
    const baseApiUrl = 'https://momentum-production-68bb.up.railway.app/api/v1'
    
    this.baseUrl = `${baseApiUrl}/search`
    // 🎬 Videos DB API 전용 베이스 URL 추가
    this.videosDbUrl = `${baseApiUrl}/videos_db`
    
    // 🎯 Trending 영상 캐시
    this.trendingVideosCache = null
    this.trendingCacheTimestamp = null
    this.trendingCacheTTL = 10 * 60 * 1000  // 10분 캐시
    
    console.log('🌍 Search Service 초기화:', {
      environment: 'production (Railway 강제)',
      searchApiUrl: this.baseUrl,
      videosDbApiUrl: this.videosDbUrl
    })
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
      console.log('🚀 Railway 서버로 realtime API 호출 중...')

      // 기본 옵션 설정
      const searchParams = {
        keyword: keyword.trim(),
        category: options.category || null,
        min_view_count: options.minViewCount || 5000,
        min_engagement_rate: options.minEngagementRate || 1.0,
        target_count: options.targetCount || 20,
        max_pages: options.maxPages || 3
      }

      // 🔧 긴 타임아웃 설정 (realtime 검색은 최대 120초 소요 가능)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 120000) // 120초 타임아웃

      const response = await fetch(`${this.baseUrl}/realtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchParams),
        signal: controller.signal  // 🔧 AbortController 사용
      })

      clearTimeout(timeoutId)  // 성공 시 타임아웃 해제

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        console.log('✅ realtime 검색 완료:', result)
        console.log(`⏱️ 처리 시간: ${result.duration}초`)
        return {
          success: true,
          keyword: keyword,
          duration: result.duration,
          message: result.message,
          timestamp: result.timestamp
        }
      } else {
        console.error('❌ realtime 검색 실패:', result.error)
        return {
          success: false,
          error: result.error || '검색 중 오류가 발생했습니다'
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ realtime 검색 타임아웃 (120초 초과)')
        return {
          success: false,
          error: 'realtime 검색이 너무 오래 걸립니다. 다시 시도해주세요.'
        }
      }
      
      console.error('❌ realtime 검색 서비스 오류:', error)
      return {
        success: false,
        error: '네트워크 오류가 발생했습니다: ' + error.message
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
        keyword: keyword,  // 🔧 keyword를 쿼리 파라미터로 전달
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

      // 🎯 올바른 Videos DB API 호출 (쿼리 파라미터 방식)
      const response = await fetch(`${this.videosDbUrl}/search?${searchParams}`, {
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
          total_found: result.total_found || 0,
          message: result.message
        })

        return {
          success: true,
          data: result.data || [],
          meta: {
            total_found: result.total_found || 0,
            query_time_ms: 0,  // Videos DB API는 응답 시간 정보 없음
            is_fallback: (result.data?.length || 0) === 0  // 데이터가 없으면 폴백으로 간주
          },
          keyword: result.keyword || keyword,
          source: 'videos_db',
          timestamp: new Date().toISOString()
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

  /**
   * 🔥 Trending 영상 가져오기 (캐시 지원)
   * @param {Object} options - 조회 옵션
   * @returns {Promise<Object>} Trending 영상 결과
   */
  async getTrendingVideos(options = {}) {
    try {
      // 캐시된 데이터가 있고 아직 유효하면 반환
      if (this.trendingVideosCache && this.isTrendingCacheValid()) {
        console.log('💾 Trending 영상 캐시 사용:', this.trendingVideosCache.length, '개')
        return {
          success: true,
          data: this.trendingVideosCache,
          fromCache: true,
          timestamp: this.trendingCacheTimestamp
        }
      }

      console.log('🔥 Trending 영상 조회 시작...')

      const searchParams = new URLSearchParams({
        limit: options.limit || 100  // 기본 100개
      })

      // topic_tags 필터가 있으면 추가
      if (options.topicTags && Array.isArray(options.topicTags)) {
        searchParams.append('topic_tags', options.topicTags.join(','))
      }

      // 🎯 Videos DB Trending API 호출
      const response = await fetch(`${this.videosDbUrl}/trending?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        console.log('✅ Trending 영상 조회 성공:', result.data.length, '개')
        
        // 🎲 영상들을 랜덤으로 섞기
        const shuffledVideos = this.shuffleArray([...result.data])
        
        // 캐시에 저장
        this.trendingVideosCache = shuffledVideos
        this.trendingCacheTimestamp = new Date()
        
        return {
          success: true,
          data: shuffledVideos,
          meta: {
            total_found: result.data.length,
            source: 'trending_db',
            shuffled: true
          },
          fromCache: false,
          timestamp: this.trendingCacheTimestamp
        }
      } else {
        throw new Error(result.error || 'Trending 영상 조회 실패')
      }

    } catch (error) {
      console.error('❌ Trending 영상 조회 오류:', error)
      return {
        success: false,
        error: error.message,
        data: [],
        fromCache: false
      }
    }
  }

  /**
   * 🎲 배열 랜덤 섞기 (Fisher-Yates 알고리즘)
   * @param {Array} array - 섞을 배열
   * @returns {Array} 섞인 배열
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  /**
   * 📅 Trending 캐시 유효성 확인
   * @returns {boolean} 캐시가 유효한지 여부
   */
  isTrendingCacheValid() {
    if (!this.trendingCacheTimestamp) return false
    
    const now = new Date()
    const elapsed = now.getTime() - this.trendingCacheTimestamp.getTime()
    
    return elapsed < this.trendingCacheTTL
  }

  /**
   * 🧹 Trending 캐시 클리어
   */
  clearTrendingCache() {
    this.trendingVideosCache = null
    this.trendingCacheTimestamp = null
    console.log('🧹 Trending 영상 캐시 클리어됨')
  }

  /**
   * 🎯 홈페이지용 Trending 영상 미리 로드
   * 앱 시작 시 호출하여 trending 영상들을 캐시에 미리 저장
   */
  async preloadTrendingVideos() {
    try {
      console.log('🚀 홈페이지용 Trending 영상 미리 로드 시작...')
      
      const result = await this.getTrendingVideos({ limit: 100 })
      
      if (result.success) {
        console.log('✅ Trending 영상 미리 로드 완료:', result.data.length, '개')
        return result.data
      } else {
        console.warn('⚠️ Trending 영상 미리 로드 실패:', result.error)
        return []
      }
    } catch (error) {
      console.error('❌ Trending 영상 미리 로드 오류:', error)
      return []
    }
  }
}

// 싱글톤 인스턴스 생성
const searchService = new SearchService()

export default searchService 