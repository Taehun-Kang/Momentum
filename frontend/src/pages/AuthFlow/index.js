import { Component } from '../../core/Component.js'
import { authService } from '../../services/authService.js'
import './AuthFlow.css'

export default class AuthFlow extends Component {
  constructor() {
    super({
      tagName: 'div',
      autoRender: false
    })
    
    this.currentStep = 'landing' // landing, login, signup
    this.animationFrameId = null
    this.isTransitioning = false
    
    this.render()
    this.startBackgroundAnimation()
  }

  render() {
    this.el.className = 'auth-flow'
    this.el.innerHTML = `
      <!-- Unified Background Animation -->
      <div class="auth-background">
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

      <!-- Shared Background Elements for All Steps -->
      <div class="shared-background">
        <div class="geometric-shape shape-1"></div>
        <div class="geometric-shape shape-2"></div>
        <div class="geometric-shape shape-3"></div>
        <div class="geometric-shape shape-4"></div>
        <div class="geometric-shape shape-5"></div>
        <div class="geometric-shape shape-6"></div>
        
        <!-- Floating Dots Network -->
        <div class="dots-network" id="dots-network">
          <!-- Dots will be generated dynamically -->
        </div>
        
        <!-- Morphing Blobs -->
        <div class="morphing-blob blob-1"></div>
        <div class="morphing-blob blob-2"></div>
      </div>

      <!-- Content Container -->
      <div class="auth-content-container">
        <!-- Landing Step -->
        <div class="auth-step landing-step active" data-step="landing">
          <div class="step-content landing-content">

            <!-- Hero Section -->
            <div class="hero-section">
              <div class="app-logo">
                <div class="logo-icon">⚡</div>
                <div class="logo-text">Momentum</div>
              </div>
              
              <div class="hero-title">
                <h1 class="main-title">당신의 완벽한 <br><span class="highlight">영상 순간</span>을 찾아드려요</h1>
                <p class="sub-title">AI가 큐레이션한 개인 맞춤 숏폼 콘텐츠로<br>의미 있고 즐거운 시간을 만들어보세요</p>
              </div>

              <div class="features-preview">
                <div class="feature-item">
                  <div class="feature-icon">🎯</div>
                  <span>개인 맞춤 추천</span>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">⏰</div>
                  <span>영상 큐레이션</span>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">✨</div>
                  <span>트렌드 분석</span>
                </div>
              </div>
            </div>

            <!-- CTA Section -->
            <div class="cta-section">
              <button class="start-button" id="start-btn">
                <span class="btn-text">지금 시작하기</span>
                <div class="btn-ripple"></div>
              </button>
            </div>
          </div>
        </div>

        <!-- Login Step -->
        <div class="auth-step login-step" data-step="login">
          <div class="step-content">
            <!-- Header -->
            <div class="auth-header">
              <div class="auth-title">
                <h1 class="main-title">다시 만나서 반가워요</h1>
                <p class="sub-title">당신만의 영상 큐레이션을 계속해보세요</p>
              </div>
            </div>

            <!-- Login Form -->
            <div class="auth-form-container">
              <form class="auth-form" id="login-form">
                <div class="input-group">
                  <label class="input-label">이메일</label>
                  <input 
                    type="email" 
                    class="form-input" 
                    placeholder="your@email.com"
                    required
                    id="login-email-input"
                  >
                </div>

                <div class="input-group">
                  <label class="input-label">비밀번호</label>
                  <input 
                    type="password" 
                    class="form-input" 
                    placeholder="8자 이상 입력해주세요"
                    required
                    id="login-password-input"
                  >
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

                <button type="submit" class="auth-button" id="login-btn">
                  <span class="btn-text">로그인</span>
                  <div class="btn-loader">
                    <div class="loader-spinner"></div>
                  </div>
                  <div class="btn-ripple"></div>
                </button>
              </form>
            </div>

            <!-- Footer -->
            <div class="auth-footer">
              <p class="auth-prompt">
                아직 계정이 없으신가요? 
                <button class="auth-link" id="goto-signup">회원가입</button>
              </p>
              <button class="back-btn" id="back-to-landing">← 돌아가기</button>
            </div>
          </div>
        </div>

        <!-- Signup Step -->
        <div class="auth-step signup-step" data-step="signup">
          <div class="step-content">
            <!-- Header -->
            <div class="auth-header">
              <div class="auth-title">
                <h1 class="main-title">새로운 영상 여행을<br>시작해보세요</h1>
                <p class="sub-title">몇 분만에 가입하고 개인 맞춤 큐레이션을 받아보세요</p>
              </div>
            </div>

            <!-- Signup Form -->
            <div class="auth-form-container">
              <form class="auth-form" id="signup-form">
                <div class="input-group">
                  <label class="input-label">이름</label>
                  <input 
                    type="text" 
                    class="form-input" 
                    placeholder="실제 이름을 입력해주세요"
                    required
                    id="signup-name-input"
                  >
                </div>

                <div class="input-group">
                  <label class="input-label">이메일</label>
                  <input 
                    type="email" 
                    class="form-input" 
                    placeholder="your@email.com"
                    required
                    id="signup-email-input"
                  >
                </div>

                <div class="input-group">
                  <label class="input-label">비밀번호</label>
                  <input 
                    type="password" 
                    class="form-input" 
                    placeholder="8자 이상, 영문+숫자 포함"
                    required
                    id="signup-password-input"
                  >
                </div>

                <div class="input-group">
                  <label class="input-label">비밀번호 확인</label>
                  <input 
                    type="password" 
                    class="form-input" 
                    placeholder="비밀번호를 다시 입력해주세요"
                    required
                    id="signup-password-confirm-input"
                  >
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

                <button type="submit" class="auth-button" id="signup-btn">
                  <span class="btn-text">회원가입 완료</span>
                  <div class="btn-loader">
                    <div class="loader-spinner"></div>
                  </div>
                  <div class="btn-ripple"></div>
                </button>
              </form>
            </div>

            <!-- Footer -->
            <div class="auth-footer">
              <p class="auth-prompt">
                이미 계정이 있으신가요? 
                <button class="auth-link" id="goto-login">로그인</button>
              </p>
            </div>
          </div>
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

  generateFloatingDots() {
    const dots = []
    for (let i = 0; i < 12; i++) {
      const randomX = Math.random() * 100
      const randomY = Math.random() * 100
      const randomDelay = Math.random() * 3
      const randomDuration = 8 + Math.random() * 4
      
      dots.push(`
        <div class="floating-dot" style="
          left: ${randomX}%;
          top: ${randomY}%;
          --delay: ${randomDelay}s;
          --duration: ${randomDuration}s;
        "></div>
      `)
    }
    return dots.join('')
  }

  startBackgroundAnimation() {
    const orbs = this.el.querySelectorAll('.floating-orb')
    let time = 0

    const animate = () => {
      time += 0.005
      
      orbs.forEach((orb, index) => {
        const factor = (index + 1) * 0.6
        const x = Math.sin(time * factor) * 35
        const y = Math.cos(time * factor * 0.8) * 25
        const scale = 1 + Math.sin(time * factor * 1.4) * 0.12
        
        orb.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
      })

      this.animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    // 기존 Landing 애니메이션들도 초기화
    this.initLandingAnimations()
  }

  initLandingAnimations() {
    // 플로팅 도트들 동적 생성
    const dotsContainer = this.el.querySelector('#dots-network')
    if (dotsContainer) {
      dotsContainer.innerHTML = this.generateFloatingDots()
    }

    // 숏폼 카드들 균등 배치 초기화
    const shortFormCards = this.el.querySelectorAll('.geometric-shape')
    
    // 3x2 그리드 기반 위치 (약간의 랜덤 오프셋과 함께)
    const gridPositions = [
      { x: 15, y: 20 },  // 좌상단
      { x: 50, y: 15 },  // 중상단  
      { x: 85, y: 25 },  // 우상단
      { x: 20, y: 70 },  // 좌하단
      { x: 75, y: 75 },  // 우하단
      { x: 45, y: 60 }   // 중하단
    ]
    
    shortFormCards.forEach((card, index) => {
      const basePos = gridPositions[index]
      
      // 기본 위치에서 약간의 랜덤 오프셋 추가 (±8% 범위)
      const offsetX = (Math.random() - 0.5) * 16
      const offsetY = (Math.random() - 0.5) * 16
      const finalX = Math.max(5, Math.min(95, basePos.x + offsetX))
      const finalY = Math.max(5, Math.min(95, basePos.y + offsetY))
      
      // 크기도 조금 더 안정적으로
      const randomScale = 0.8 + Math.random() * 0.4 // 0.8 ~ 1.2 범위
      
      card.style.left = `${finalX}%`
      card.style.top = `${finalY}%`
      card.style.transform = `translate(-50%, -50%) scale(${randomScale})`
      
      // 순차적 등장 (조금 더 빠르게)
      setTimeout(() => {
        card.classList.add('animate')
      }, index * 200)
    })

    // 플로팅 도트들 초기화
    setTimeout(() => {
      const floatingDots = this.el.querySelectorAll('.floating-dot')
      floatingDots.forEach((dot, index) => {
        setTimeout(() => {
          dot.classList.add('animate')
        }, index * 100)
      })
    }, 500)

    // 숏폼 카드 상호작용 추가
    shortFormCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.animationPlayState = 'paused'
        card.style.transform += ' scale(1.15)'
        card.style.filter = 'blur(0px) brightness(1.2)'
        card.style.zIndex = '100'
      })
      
      card.addEventListener('mouseleave', () => {
        card.style.animationPlayState = 'running'
        card.style.transform = card.style.transform.replace(' scale(1.15)', '')
        card.style.filter = 'blur(0.5px)'
        card.style.zIndex = ''
      })
    })
  }

  // 단계 전환 메서드
  async transitionToStep(newStep) {
    if (this.isTransitioning || this.currentStep === newStep) return

    this.isTransitioning = true
    
    const currentStepEl = this.el.querySelector(`[data-step="${this.currentStep}"]`)
    const newStepEl = this.el.querySelector(`[data-step="${newStep}"]`)
    
    // 현재 단계 숨기기
    currentStepEl.classList.add('exiting')
    
    // 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 단계 전환
    currentStepEl.classList.remove('active', 'exiting')
    newStepEl.classList.add('active')
    
    // 진입 애니메이션
    setTimeout(() => {
      newStepEl.classList.add('entered')
    }, 50)
    
    this.currentStep = newStep
    this.isTransitioning = false
    
    console.log(`🔄 단계 전환: ${newStep}`)
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
    // Landing 단계 이벤트
    const startBtn = this.el.querySelector('#start-btn')
    if (startBtn) {
      startBtn.addEventListener('click', (e) => {
        this.createRippleEffect(e, startBtn)
        setTimeout(() => {
          this.transitionToStep('login')
        }, 200)
      })
    }

    // 네비게이션 이벤트
    const gotoSignup = this.el.querySelector('#goto-signup')
    const gotoLogin = this.el.querySelector('#goto-login')
    const backToLanding = this.el.querySelector('#back-to-landing')
    const backToLogin = this.el.querySelector('#back-to-login')

    if (gotoSignup) {
      gotoSignup.addEventListener('click', () => {
        this.transitionToStep('signup')
      })
    }

    if (gotoLogin) {
      gotoLogin.addEventListener('click', () => {
        this.transitionToStep('login')
      })
    }

    if (backToLanding) {
      backToLanding.addEventListener('click', () => {
        this.transitionToStep('landing')
      })
    }

    if (backToLogin) {
      backToLogin.addEventListener('click', () => {
        this.transitionToStep('login')
      })
    }

    // 폼 제출 이벤트
    const loginForm = this.el.querySelector('#login-form')
    const signupForm = this.el.querySelector('#signup-form')

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleLogin()
      })
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleSignup()
      })
    }

    // 버튼 리플 이펙트
    const buttons = this.el.querySelectorAll('.auth-button')
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.createRippleEffect(e, btn)
      })
    })

    // 입력 필드 포커스 효과 - 간단하게 처리
    const inputs = this.el.querySelectorAll('.form-input')
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        input.classList.add('focused')
      })
      
      input.addEventListener('blur', () => {
        input.classList.remove('focused')
      })
    })

    // 약관 링크 및 모달 이벤트
    const agreementLinks = this.el.querySelectorAll('.agreement-link')
    const modalOverlay = this.el.querySelector('#modal-overlay')
    const modalClose = this.el.querySelector('#modal-close')
    const modalAgree = this.el.querySelector('#modal-agree')

    agreementLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const modalType = link.dataset.modal
        this.showModal(modalType)
      })
    })

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          this.hideModal()
        }
      })
    }

    if (modalClose) {
      modalClose.addEventListener('click', () => {
        this.hideModal()
      })
    }

    if (modalAgree) {
      modalAgree.addEventListener('click', () => {
        const modalType = modalOverlay.dataset.type
        if (modalType === 'terms') {
          const termsCheckbox = this.el.querySelector('#terms-agree')
          termsCheckbox.checked = true
        }
        this.hideModal()
      })
    }
  }

  async handleLogin() {
    console.log('🚀 === AuthFlow 로그인 핸들러 시작 ===')
    
    const loginBtn = this.el.querySelector('#login-btn')
    const email = this.el.querySelector('#login-email-input').value
    const password = this.el.querySelector('#login-password-input').value

    console.log('📝 입력된 데이터:', { email, password: password ? '***' : '(없음)' })

    if (!email || !password) {
      console.log('❌ 입력 검증 실패: 이메일 또는 패스워드 누락')
      alert('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    // Loading state
    console.log('⏳ 로딩 상태 시작...')
    loginBtn.classList.add('loading')
    loginBtn.disabled = true

    try {
      // 🔥 실제 백엔드 API 호출!
      console.log('🔥 === authService.login() 호출 시작 ===')
      console.log('📤 전달할 데이터:', { email, password: '***' })
      
      const result = await authService.login(email, password)
      
      console.log('📥 === authService.login() 응답 받음 ===')
      console.log('📋 전체 응답:', result)
      console.log('✅ result.success:', result.success)
      console.log('👤 result.user:', result.user)
      console.log('❌ result.error:', result.error)
      
      if (result.success) {
        console.log('🎉 === 로그인 성공 처리 시작 ===')
        console.log('👤 로그인된 사용자:', result.user)
        
        // 성공 시 홈으로 이동
        console.log('🏠 홈 페이지로 리다이렉트...')
        if (window.app) {
          window.app.goToHome()
        } else {
          window.location.hash = '#/home'
        }
      } else {
        console.log('💥 === 로그인 실패 처리 시작 ===')
        console.log('❌ 에러 메시지:', result.error)
        
        // 에러 처리
        alert(result.error || '로그인에 실패했습니다.')
      }
      
    } catch (error) {
      console.log('🚨 === CATCH 블록 진입 ===')
      console.error('❌ 로그인 오류:', error)
      console.error('❌ 에러 타입:', typeof error)
      console.error('❌ 에러 메시지:', error.message)
      console.error('❌ 전체 에러 객체:', error)
      
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      console.log('🏁 === FINALLY 블록 진입 ===')
      loginBtn.classList.remove('loading')
      loginBtn.disabled = false
      console.log('⏳ 로딩 상태 종료')
    }
    
    console.log('🔚 === AuthFlow 로그인 핸들러 종료 ===')
  }

  async handleSignup() {
    const signupBtn = this.el.querySelector('#signup-btn')
    const name = this.el.querySelector('#signup-name-input').value.trim()
    const email = this.el.querySelector('#signup-email-input').value.trim()
    const password = this.el.querySelector('#signup-password-input').value
    const confirmPassword = this.el.querySelector('#signup-password-confirm-input').value
    const termsAgree = this.el.querySelector('#terms-agree').checked

    // 유효성 검사
    if (!name) {
      alert('이름을 입력해주세요.')
      return
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('올바른 이메일을 입력해주세요.')
      return
    }

    if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      alert('비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.')
      return
    }

    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.')
      return
    }

    if (!termsAgree) {
      alert('이용약관에 동의해주세요.')
      return
    }

    // Loading state
    signupBtn.classList.add('loading')
    signupBtn.disabled = true

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log('회원가입 성공:', { name, email })
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userEmail', email)
      localStorage.setItem('userName', name)
      
      // 홈으로 이동
      if (window.app) {
        window.app.goToHome()
      } else {
        window.location.hash = '#/home'
      }
      
    } catch (error) {
      alert('회원가입에 실패했습니다. 다시 시도해주세요.')
    } finally {
      signupBtn.classList.remove('loading')
      signupBtn.disabled = false
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    
    super.destroy?.()
  }
} 