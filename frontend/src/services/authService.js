import { apiClient } from './apiClient.js'

// 인증 관련 API 서비스
class AuthService {
  constructor() {
    this.currentUser = null
    this.isAuthenticated = false
  }

  // 🔐 로그인
  async login(email, password) {
    try {
      console.log('🔐 로그인 시도:', email)
      
      // 실제 백엔드 API 호출 (엔드포인트 수정: login → signin)
      const response = await apiClient.post('/api/v1/auth/signin', {
        email,
        password
      })

      // 토큰 저장
      if (response.success && response.data?.session?.access_token) {
        localStorage.setItem('authToken', response.data.session.access_token)
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('userEmail', email)
        localStorage.setItem('userName', response.data.user?.name || email.split('@')[0])
        
        this.currentUser = response.data.user
        this.isAuthenticated = true
        
        console.log('✅ 로그인 성공!')
        return { success: true, user: response.data.user }
      }

      throw new Error('로그인 응답에 토큰이 없습니다')

    } catch (error) {
      console.error('❌ 로그인 실패:', error.message)
      return { 
        success: false, 
        error: error.message || '로그인에 실패했습니다' 
      }
    }
  }

  // 📝 회원가입
  async signup(userData) {
    try {
      console.log('📝 회원가입 시도:', userData.email)
      
      // 실제 백엔드 API 호출
      const response = await apiClient.post('/api/v1/auth/signup', userData)

      if (response.success) {
        console.log('✅ 회원가입 성공!')
        return { success: true, message: '회원가입이 완료되었습니다' }
      }

      throw new Error(response.error || '회원가입에 실패했습니다')

    } catch (error) {
      console.error('❌ 회원가입 실패:', error.message)
      return { 
        success: false, 
        error: error.message || '회원가입에 실패했습니다' 
      }
    }
  }

  // 🚪 로그아웃
  async logout() {
    try {
      console.log('🚪 로그아웃 처리')
      
      // 백엔드에 로그아웃 요청 (엔드포인트 수정: logout → signout)
      if (this.isAuthenticated) {
        await apiClient.post('/api/v1/auth/signout', {}, true)
      }

    } catch (error) {
      console.error('로그아웃 API 호출 실패:', error.message)
      // 로그아웃은 실패해도 로컬 데이터는 정리
    } finally {
      // 로컬 저장소 정리
      localStorage.removeItem('authToken')
      localStorage.removeItem('isLoggedIn')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userName')
      
      this.currentUser = null
      this.isAuthenticated = false
      
      console.log('✅ 로그아웃 완료')
    }
  }

  // 🔍 현재 사용자 정보 확인
  async getCurrentUser() {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        return null
      }

      // 토큰으로 사용자 정보 조회
      const response = await apiClient.get('/api/v1/auth/me', true)
      
      if (response.success) {
        this.currentUser = response.data.user
        this.isAuthenticated = true
        return response.data.user
      }

      // 토큰이 만료된 경우 로그아웃 처리
      await this.logout()
      return null

    } catch (error) {
      console.error('사용자 정보 조회 실패:', error.message)
      await this.logout()
      return null
    }
  }

  // ✅ 로그인 상태 확인
  checkAuthStatus() {
    const token = localStorage.getItem('authToken')
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
    
    this.isAuthenticated = !!(token && isLoggedIn)
    return this.isAuthenticated
  }

  // 🔄 토큰 갱신
  async refreshToken() {
    try {
      const response = await apiClient.post('/api/v1/auth/refresh', {}, true)
      
      if (response.success && response.data?.session?.access_token) {
        localStorage.setItem('authToken', response.data.session.access_token)
        return true
      }
      
      return false
    } catch (error) {
      console.error('토큰 갱신 실패:', error.message)
      return false
    }
  }
}

// 싱글톤 인스턴스 생성
export const authService = new AuthService() 