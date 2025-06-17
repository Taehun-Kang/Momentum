// API 호출을 위한 기본 클라이언트
class ApiClient {
  constructor() {
    // 🚀 Railway 배포 환경 사용
    this.baseURL = 'https://momentum-production-68bb.up.railway.app'
    
    // 개발 시 로컬 사용 (필요시):
    // this.baseURL = 'http://localhost:3002'
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  // 인증 토큰 가져오기
  getAuthToken() {
    return localStorage.getItem('authToken')
  }

  // 인증 헤더 추가
  getAuthHeaders() {
    const token = this.getAuthToken()
    return token ? {
      ...this.defaultHeaders,
      'Authorization': `Bearer ${token}`
    } : this.defaultHeaders
  }

  // 기본 API 호출 메서드
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const config = {
      headers: options.requireAuth ? this.getAuthHeaders() : this.defaultHeaders,
      ...options
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        console.error(`API 에러 (${response.status}):`, data.error || response.statusText)
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      return data

    } catch (error) {
      console.error(`API 호출 실패 (${endpoint}):`, error.message)
      throw error
    }
  }

  // GET 요청
  async get(endpoint, requireAuth = false) {
    return this.request(endpoint, {
      method: 'GET',
      requireAuth
    })
  }

  // POST 요청
  async post(endpoint, body, requireAuth = false) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      requireAuth
    })
  }

  // PUT 요청
  async put(endpoint, body, requireAuth = false) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      requireAuth
    })
  }

  // DELETE 요청
  async delete(endpoint, requireAuth = false) {
    return this.request(endpoint, {
      method: 'DELETE',
      requireAuth
    })
  }
}

// 싱글톤 인스턴스 생성
export const apiClient = new ApiClient() 