import { Component } from '../../core/Component.js'
import './Login.css'

export default class Login extends Component {
  constructor() {
    super({
      tagName: 'div',
      autoRender: false
    })
    
    this.animationFrameId = null
    this.render()
    this.startBackgroundAnimation()
  }

  render() {
    this.el.className = 'login-page'
    this.el.innerHTML = `
      <!-- Background Animation -->
      <div class="login-background">
        <div class="floating-orb orb-1"></div>
        <div class="floating-orb orb-2"></div>
        <div class="floating-orb orb-3"></div>
        
        <!-- Geometric Patterns -->
        <div class="geometric-pattern pattern-1"></div>
        <div class="geometric-pattern pattern-2"></div>
        <div class="geometric-pattern pattern-3"></div>
      </div>

      <!-- Main Content -->
      <div class="login-content">
        <!-- Header -->
        <div class="login-header">
          <div class="app-logo">
            <div class="logo-icon">⚡</div>
            <div class="logo-text">Momentum</div>
          </div>
          
          <div class="login-title">
            <h1 class="main-title">다시 만나서 반가워요</h1>
            <p class="sub-title">당신만의 영상 큐레이션을 계속해보세요</p>
          </div>
        </div>

        <!-- Login Form -->
        <div class="login-form-container">
          <form class="login-form" id="login-form">
            <div class="input-group">
              <label class="input-label">이메일</label>
              <div class="input-wrapper">
                <input 
                  type="email" 
                  class="form-input" 
                  placeholder="your@email.com"
                  required
                  id="email-input"
                >
                <div class="input-focus-border"></div>
              </div>
            </div>

            <div class="input-group">
              <label class="input-label">비밀번호</label>
              <div class="input-wrapper">
                <input 
                  type="password" 
                  class="form-input" 
                  placeholder="8자 이상 입력해주세요"
                  required
                  id="password-input"
                >
                <div class="input-focus-border"></div>
              </div>
            </div>

            <div class="form-options">
              <label class="checkbox-container">
                <input type="checkbox" class="checkbox-input" id="remember-me">
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">로그인 상태 유지</span>
              </label>
              
              <button type="button" class="forgot-password-btn">
                비밀번호 찾기
              </button>
            </div>

            <button type="submit" class="login-button" id="login-btn">
              <span class="btn-text">로그인</span>
              <div class="btn-loader">
                <div class="loader-spinner"></div>
              </div>
              <div class="btn-ripple"></div>
            </button>
          </form>
        </div>

        <!-- Footer -->
        <div class="login-footer">
          <p class="signup-prompt">
            아직 계정이 없으신가요? 
            <button class="signup-link" id="signup-link">회원가입</button>
          </p>
        </div>
      </div>
    `
    
    this.bindEvents()
  }

  startBackgroundAnimation() {
    const orbs = this.el.querySelectorAll('.floating-orb')
    let time = 0

    const animate = () => {
      time += 0.008
      
      orbs.forEach((orb, index) => {
        const factor = (index + 1) * 0.7
        const x = Math.sin(time * factor) * 30
        const y = Math.cos(time * factor * 0.8) * 20
        const scale = 1 + Math.sin(time * factor * 1.2) * 0.1
        
        orb.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
      })

      this.animationFrameId = requestAnimationFrame(animate)
    }

    animate()
  }

  createRippleEffect(event, button) {
    const ripple = button.querySelector('.btn-ripple')
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    ripple.style.width = ripple.style.height = size + 'px'
    ripple.style.left = x + 'px'
    ripple.style.top = y + 'px'
    ripple.classList.add('animate')

    setTimeout(() => {
      ripple.classList.remove('animate')
    }, 600)
  }

  bindEvents() {
    const form = this.el.querySelector('#login-form')
    const loginBtn = this.el.querySelector('#login-btn')
    const signupLink = this.el.querySelector('#signup-link')
    const forgotBtn = this.el.querySelector('.forgot-password-btn')

    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleLogin()
    })

    // Button ripple effect
    loginBtn.addEventListener('click', (e) => {
      this.createRippleEffect(e, loginBtn)
    })

    // Input focus effects
    const inputs = this.el.querySelectorAll('.form-input')
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        input.closest('.input-wrapper').classList.add('focused')
      })
      
      input.addEventListener('blur', () => {
        if (!input.value) {
          input.closest('.input-wrapper').classList.remove('focused')
        }
      })

      input.addEventListener('input', () => {
        if (input.value) {
          input.closest('.input-wrapper').classList.add('has-value')
        } else {
          input.closest('.input-wrapper').classList.remove('has-value')
        }
      })
    })

    // Navigation
    signupLink.addEventListener('click', () => {
      console.log('회원가입 페이지로 이동')
      // TODO: 회원가입 페이지로 이동
      // window.location.href = '#/signup'
    })

    forgotBtn.addEventListener('click', () => {
      console.log('비밀번호 찾기')
      // TODO: 비밀번호 찾기 기능
    })
  }

  async handleLogin() {
    const loginBtn = this.el.querySelector('#login-btn')
    const email = this.el.querySelector('#email-input').value
    const password = this.el.querySelector('#password-input').value

    if (!email || !password) {
      this.showError('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    // Loading state
    loginBtn.classList.add('loading')
    loginBtn.disabled = true

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 성공
      console.log('로그인 성공:', { email })
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userEmail', email)
      localStorage.setItem('userName', email.split('@')[0])
      
      // 홈으로 이동
      window.location.href = '#/'
      
    } catch (error) {
      this.showError('로그인에 실패했습니다. 다시 시도해주세요.')
    } finally {
      loginBtn.classList.remove('loading')
      loginBtn.disabled = false
    }
  }

  showError(message) {
    // Simple error display
    alert(message) // TODO: Replace with elegant error modal
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    
    super.destroy?.()
  }
} 