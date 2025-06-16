// API 호출을 위한 기본 클라이언트
class ApiClient {
  constructor() {
    // 개발 환경에서는 localhost:3002, 배포 시에는 실제 도메인
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://your-railway-domain.com' 
      : 'http://localhost:3002'
    
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
      console.log(`🔗 API 호출: ${options.method || 'GET'} ${url}`)
      console.log(`📤 요청 헤더:`, config.headers)
      console.log(`📤 요청 바디:`, config.body)
      
      const response = await fetch(url, config)
      console.log(`📡 응답 상태: ${response.status} ${response.statusText}`)
      
      const data = await response.json()
      console.log(`📥 응답 데이터:`, data)

      if (!response.ok) {
        console.error(`❌ HTTP 에러: ${response.status}`)
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      console.log(`✅ API 응답 성공!`)
      return data

    } catch (error) {
      console.error(`❌ API 호출 실패 (${endpoint}):`, error.message)
      console.error(`❌ 전체 에러:`, error)
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