/**
 * 🚀 v2 API 전용 클라이언트
 * Railway 서버의 v2 엔드포인트 전용
 */

class ApiClientV2 {
  constructor() {
    // 🚀 Railway v2 API 베이스 URL
    this.baseURL = 'https://momentum-production-68bb.up.railway.app/api/v2'
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
    
    console.log('🚀 v2 API Client 초기화:', this.baseURL)
  }

  /**
   * 인증 토큰 가져오기
   */
  getAuthToken() {
    return localStorage.getItem('authToken')
  }

  /**
   * 인증 헤더 생성
   */
  getAuthHeaders() {
    const token = this.getAuthToken()
    return token ? {
      ...this.defaultHeaders,
      'Authorization': `Bearer ${token}`
    } : this.defaultHeaders
  }

  /**
   * 기본 API 요청 메서드
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const config = {
      headers: options.requireAuth ? this.getAuthHeaders() : this.defaultHeaders,
      ...options
    }

    try {
      console.log(`🔗 v2 API 호출: ${options.method || 'GET'} ${endpoint}`)
      
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        console.error(`❌ v2 API 에러 (${response.status}):`, data.error || response.statusText)
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      console.log(`✅ v2 API 성공: ${endpoint}`)
      return data

    } catch (error) {
      console.error(`❌ v2 API 호출 실패 (${endpoint}):`, error.message)
      throw error
    }
  }

  /**
   * GET 요청
   */
  async get(endpoint, requireAuth = false) {
    return this.request(endpoint, {
      method: 'GET',
      requireAuth
    })
  }

  /**
   * POST 요청
   */
  async post(endpoint, body, requireAuth = false) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      requireAuth
    })
  }

  /**
   * PUT 요청
   */
  async put(endpoint, body, requireAuth = false) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      requireAuth
    })
  }

  /**
   * DELETE 요청
   */
  async delete(endpoint, requireAuth = false) {
    return this.request(endpoint, {
      method: 'DELETE',
      requireAuth
    })
  }
}

// 싱글톤 인스턴스 생성
export const apiClientV2 = new ApiClientV2()
