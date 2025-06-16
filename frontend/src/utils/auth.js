import { authService } from '../services/authService.js'

// 인증 관련 유틸리티 함수들
export const authUtils = {
  
  // 🔍 현재 로그인 상태 확인
  isLoggedIn() {
    return authService.checkAuthStatus()
  },

  // 👤 현재 사용자 정보 가져오기
  getCurrentUser() {
    return {
      email: localStorage.getItem('userEmail'),
      name: localStorage.getItem('userName'),
      isAuthenticated: this.isLoggedIn()
    }
  },

  // 🛡️ 인증이 필요한 페이지 보호
  requireAuth() {
    if (!this.isLoggedIn()) {
      console.log('🚫 로그인이 필요합니다. 로그인 페이지로 이동...')
      window.location.href = '#/login'
      return false
    }
    return true
  },

  // 🚪 로그아웃 및 리다이렉트
  async logout() {
    await authService.logout()
    window.location.href = '#/login'
  },

  // 📱 앱 시작시 인증 상태 복원
  async initializeAuth() {
    try {
      if (this.isLoggedIn()) {
        // 토큰이 유효한지 서버에서 확인
        const user = await authService.getCurrentUser()
        
        if (user) {
          console.log('✅ 사용자 인증 상태 복원:', user)
          return user
        } else {
          console.log('⚠️ 토큰이 만료되었습니다. 로그아웃 처리...')
          await authService.logout()
        }
      }
    } catch (error) {
      console.error('❌ 인증 상태 복원 실패:', error)
      await authService.logout()
    }
    
    return null
  },

  // 🔄 자동 토큰 갱신 설정
  setupAutoRefresh() {
    // 30분마다 토큰 갱신 확인
    setInterval(async () => {
      if (this.isLoggedIn()) {
        const refreshed = await authService.refreshToken()
        if (!refreshed) {
          console.log('⚠️ 토큰 갱신 실패. 로그아웃 처리...')
          await this.logout()
        }
      }
    }, 30 * 60 * 1000) // 30분
  },

  // 🎯 로그인 후 원래 페이지로 돌아가기
  saveReturnUrl() {
    const currentPath = window.location.hash || '#/'
    if (currentPath !== '#/login' && currentPath !== '#/signup') {
      localStorage.setItem('returnUrl', currentPath)
    }
  },

  getReturnUrl() {
    const returnUrl = localStorage.getItem('returnUrl')
    localStorage.removeItem('returnUrl')
    return returnUrl || '#/'
  }
} 