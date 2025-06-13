import { Component } from '../../core/Component.js'
import './Landing.css'

export default class Landing extends Component {
  constructor() {
    super({
      tagName: 'div',
      autoRender: false
    })
    
    this.floatingVideos = []
    this.animationFrameId = null
    
    this.render()
    this.startAnimations()
  }

  render() {
    this.el.className = 'landing-page'
    this.el.innerHTML = `
      <!-- Animated Background -->
      <div class="landing-background">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
      </div>

      <!-- Modern Background Elements -->
      <div class="modern-background">
        <div class="geometric-shape shape-1"></div>
        <div class="geometric-shape shape-2"></div>
        <div class="geometric-shape shape-3"></div>
        <div class="geometric-shape shape-4"></div>
        <div class="geometric-shape shape-5"></div>
        <div class="geometric-shape shape-6"></div>
        
        <!-- Floating Dots Network -->
        <div class="dots-network">
          ${this.generateFloatingDots()}
        </div>
        
        <!-- Morphing Blobs -->
        <div class="morphing-blob blob-1"></div>
        <div class="morphing-blob blob-2"></div>
      </div>

      <!-- Main Content -->
      <div class="landing-content">
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
            <div class="btn-arrow">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M13 7L18 12L13 17M6 12H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="btn-ripple"></div>
          </button>
          

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

  startAnimations() {
    // 버튼 클릭 시 리플 효과
    const startBtn = this.el.querySelector('#start-btn')
    if (startBtn) {
      startBtn.addEventListener('click', (e) => {
        this.createRippleEffect(e, startBtn)
      })
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
    const floatingDots = this.el.querySelectorAll('.floating-dot')
    floatingDots.forEach((dot, index) => {
      setTimeout(() => {
        dot.classList.add('animate')
      }, index * 100)
    })

    // 백그라운드 orb 애니메이션
    this.animateOrbs()
  }

  animateOrbs() {
    const orbs = this.el.querySelectorAll('.gradient-orb')
    let time = 0

    const animate = () => {
      time += 0.01
      
      orbs.forEach((orb, index) => {
        const factor = index + 1
        const x = Math.sin(time * factor) * 50
        const y = Math.cos(time * factor * 0.7) * 30
        const scale = 1 + Math.sin(time * factor * 1.5) * 0.1
        
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
    const startBtn = this.el.querySelector('#start-btn')
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        console.log('시작하기 버튼 클릭')
        // TODO: 로그인 페이지나 홈 페이지로 이동
        // window.location.href = '#/login'
        window.location.href = '#/'
      })
    }

    // 숏폼 카드 상호작용
    const shortFormCards = this.el.querySelectorAll('.geometric-shape')
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

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    
    super.destroy?.()
  }
} 