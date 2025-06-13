import { Component } from '../../core/Component.js'
import './Signup.css'

export default class Signup extends Component {
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
    this.el.className = 'signup-page'
    this.el.innerHTML = `
      <!-- Background Animation -->
      <div class="signup-background">
        <div class="floating-orb orb-1"></div>
        <div class="floating-orb orb-2"></div>
        <div class="floating-orb orb-3"></div>
        <div class="floating-orb orb-4"></div>
        
        <!-- Geometric Patterns -->
        <div class="geometric-pattern pattern-1"></div>
        <div class="geometric-pattern pattern-2"></div>
        <div class="geometric-pattern pattern-3"></div>
        <div class="geometric-pattern pattern-4"></div>
      </div>

      <!-- Main Content -->
      <div class="signup-content">
        <!-- Header -->
        <div class="signup-header">
          <div class="app-logo">
            <div class="logo-icon">⚡</div>
            <div class="logo-text">Momentum</div>
          </div>
          
          <div class="signup-title">
            <h1 class="main-title">새로운 영상 여행을<br>시작해보세요</h1>
            <p class="sub-title">몇 분만에 가입하고 개인 맞춤 큐레이션을 받아보세요</p>
          </div>
        </div>

        <!-- Signup Form -->
        <div class="signup-form-container">
          <form class="signup-form" id="signup-form">
            <div class="input-group">
              <label class="input-label">이름</label>
              <div class="input-wrapper">
                <input 
                  type="text" 
                  class="form-input" 
                  placeholder="실제 이름을 입력해주세요"
                  required
                  id="name-input"
                >
                <div class="input-focus-border"></div>
              </div>
            </div>

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
                  placeholder="8자 이상, 영문+숫자 포함"
                  required
                  id="password-input"
                >
                <div class="input-focus-border"></div>
              </div>
            </div>

            <div class="input-group">
              <label class="input-label">비밀번호 확인</label>
              <div class="input-wrapper">
                <input 
                  type="password" 
                  class="form-input" 
                  placeholder="비밀번호를 다시 입력해주세요"
                  required
                  id="password-confirm-input"
                >
                <div class="input-focus-border"></div>
              </div>
            </div>

            <div class="agreements-section">
              <label class="checkbox-container required">
                <input type="checkbox" class="checkbox-input" id="terms-agree" required>
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">
                  <span class="required-mark">*</span>
                  <span class="agreement-link" data-modal="terms">이용약관</span> 및 
                  <span class="agreement-link" data-modal="privacy">개인정보처리방침</span>에 동의합니다
                </span>
              </label>
              
              <label class="checkbox-container">
                <input type="checkbox" class="checkbox-input" id="marketing-agree">
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">마케팅 정보 수신에 동의합니다 (선택)</span>
              </label>
            </div>

            <button type="submit" class="signup-button" id="signup-btn">
              <span class="btn-text">회원가입 완료</span>
              <div class="btn-loader">
                <div class="loader-spinner"></div>
              </div>
              <div class="btn-ripple"></div>
            </button>
          </form>
        </div>

        <!-- Footer -->
        <div class="signup-footer">
          <p class="login-prompt">
            이미 계정이 있으신가요? 
            <button class="login-link" id="login-link">로그인</button>
          </p>
        </div>
      </div>

      <!-- Agreement Modals -->
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content" id="modal-content">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-title">이용약관</h3>
            <button class="modal-close" id="modal-close">×</button>
          </div>
          <div class="modal-body" id="modal-body">
            <!-- Content will be dynamically loaded -->
          </div>
          <div class="modal-footer">
            <button class="modal-agree-btn" id="modal-agree">동의</button>
          </div>
        </div>
      </div>
    `
    
    this.bindEvents()
  }

  startBackgroundAnimation() {
    const orbs = this.el.querySelectorAll('.floating-orb')
    let time = 0

    const animate = () => {
      time += 0.006
      
      orbs.forEach((orb, index) => {
        const factor = (index + 1) * 0.5
        const x = Math.sin(time * factor) * 40
        const y = Math.cos(time * factor * 0.7) * 25
        const scale = 1 + Math.sin(time * factor * 1.3) * 0.15
        
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

  showModal(type) {
    const overlay = this.el.querySelector('#modal-overlay')
    const title = this.el.querySelector('#modal-title')
    const body = this.el.querySelector('#modal-body')
    
    const content = {
      terms: {
        title: '이용약관',
        content: `
          <h4>제1조 (목적)</h4>
          <p>본 약관은 Momentum(이하 "회사")이 제공하는 영상 큐레이션 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          
          <h4>제2조 (서비스의 내용)</h4>
          <p>회사가 제공하는 서비스는 다음과 같습니다:</p>
          <ul>
            <li>AI 기반 개인 맞춤 영상 추천</li>
            <li>시간대별 영상 큐레이션</li>
            <li>트렌드 분석 및 추천</li>
          </ul>
          
          <h4>제3조 (개인정보 보호)</h4>
          <p>회사는 관련 법령에 따라 회원의 개인정보를 보호하며, 개인정보처리방침에 따라 처리합니다.</p>
        `
      },
      privacy: {
        title: '개인정보처리방침',
        content: `
          <h4>1. 개인정보의 처리목적</h4>
          <p>Momentum은 다음의 목적을 위하여 개인정보를 처리합니다:</p>
          <ul>
            <li>회원 가입 및 관리</li>
            <li>개인 맞춤 서비스 제공</li>
            <li>서비스 개선 및 개발</li>
          </ul>
          
          <h4>2. 개인정보의 처리 및 보유기간</h4>
          <p>회원탈퇴 시까지 또는 법정 보존기간에 따라 보관합니다.</p>
          
          <h4>3. 정보주체의 권리</h4>
          <p>정보주체는 언제든지 개인정보 열람, 정정·삭제, 처리정지 요구 등의 권리를 행사할 수 있습니다.</p>
        `
      }
    }
    
    title.textContent = content[type].title
    body.innerHTML = content[type].content
    overlay.classList.add('show')
    overlay.dataset.type = type
  }

  hideModal() {
    const overlay = this.el.querySelector('#modal-overlay')
    overlay.classList.remove('show')
  }

  bindEvents() {
    const form = this.el.querySelector('#signup-form')
    const signupBtn = this.el.querySelector('#signup-btn')
    const loginLink = this.el.querySelector('#login-link')
    const modalOverlay = this.el.querySelector('#modal-overlay')
    const modalClose = this.el.querySelector('#modal-close')
    const modalAgree = this.el.querySelector('#modal-agree')

    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleSignup()
    })

    // Button ripple effect
    signupBtn.addEventListener('click', (e) => {
      this.createRippleEffect(e, signupBtn)
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

    // Agreement links
    const agreementLinks = this.el.querySelectorAll('.agreement-link')
    agreementLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const modalType = link.dataset.modal
        this.showModal(modalType)
      })
    })

    // Modal events
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        this.hideModal()
      }
    })

    modalClose.addEventListener('click', () => {
      this.hideModal()
    })

    modalAgree.addEventListener('click', () => {
      const modalType = modalOverlay.dataset.type
      if (modalType === 'terms') {
        const termsCheckbox = this.el.querySelector('#terms-agree')
        termsCheckbox.checked = true
      }
      this.hideModal()
    })

    // Navigation
    loginLink.addEventListener('click', () => {
      console.log('로그인 페이지로 이동')
      // TODO: 로그인 페이지로 이동
      // window.location.href = '#/login'
    })
  }

  validateForm() {
    const name = this.el.querySelector('#name-input').value.trim()
    const email = this.el.querySelector('#email-input').value.trim()
    const password = this.el.querySelector('#password-input').value
    const confirmPassword = this.el.querySelector('#password-confirm-input').value
    const termsAgree = this.el.querySelector('#terms-agree').checked

    if (!name) {
      this.showError('이름을 입력해주세요.')
      return false
    }

    if (!email) {
      this.showError('이메일을 입력해주세요.')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.showError('올바른 이메일 형식을 입력해주세요.')
      return false
    }

    if (!password) {
      this.showError('비밀번호를 입력해주세요.')
      return false
    }

    if (password.length < 8) {
      this.showError('비밀번호는 8자 이상이어야 합니다.')
      return false
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      this.showError('비밀번호는 영문과 숫자를 포함해야 합니다.')
      return false
    }

    if (password !== confirmPassword) {
      this.showError('비밀번호가 일치하지 않습니다.')
      return false
    }

    if (!termsAgree) {
      this.showError('이용약관에 동의해주세요.')
      return false
    }

    return true
  }

  async handleSignup() {
    if (!this.validateForm()) {
      return
    }

    const signupBtn = this.el.querySelector('#signup-btn')
    const name = this.el.querySelector('#name-input').value.trim()
    const email = this.el.querySelector('#email-input').value.trim()
    const password = this.el.querySelector('#password-input').value
    const marketingAgree = this.el.querySelector('#marketing-agree').checked

    // Loading state
    signupBtn.classList.add('loading')
    signupBtn.disabled = true

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 성공
      console.log('회원가입 성공:', { name, email, marketingAgree })
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userEmail', email)
      localStorage.setItem('userName', name)
      
      // 홈으로 이동
      window.location.href = '#/'
      
    } catch (error) {
      this.showError('회원가입에 실패했습니다. 다시 시도해주세요.')
    } finally {
      signupBtn.classList.remove('loading')
      signupBtn.disabled = false
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