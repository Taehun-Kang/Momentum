import { Component } from './Component.js'

export default class TimeBreakSlide extends Component {
  constructor(options = {}) {
    super(options)
    this.watchTime = options.watchTime || 0 // 시청 시간 (분)
    this.onAction = options.onAction || (() => {})
    this.index = options.index || 0
    
    this.render()
    this.setupEventListeners()
  }
  
  render() {
    this.el.className = 'shortform-slide break-slide'
    this.el.setAttribute('data-index', this.index)
    
    const breakData = this.getBreakData()
    
    this.el.innerHTML = /* html */ `
      <div class="break-container">
        <div class="break-content">
          <div class="break-emoji">${breakData.emoji}</div>
          <div class="break-title">
            ${breakData.title}
          </div>
          <div class="break-subtitle">
            ${breakData.subtitle}
          </div>
          <div class="break-description">
            ${breakData.description}
          </div>
          
          <!-- 시청 시간 통계 -->
          <div class="watch-stats">
            <div class="stat-item">
              <div class="stat-value">${this.watchTime}분</div>
              <div class="stat-label">연속 시청</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.getVideosWatched()}개</div>
              <div class="stat-label">영상 시청</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.getRecommendedBreak()}</div>
              <div class="stat-label">권장 휴식</div>
            </div>
          </div>
          
          <div class="break-buttons">
            <button class="break-btn rest-btn" data-action="rest">
              <span class="btn-icon">${breakData.restIcon}</span>
              <span class="btn-text">${breakData.restText}</span>
            </button>
            <button class="break-btn continue-btn" data-action="continue">
              <span class="btn-icon">▶️</span>
              <span class="btn-text">조금 더 볼래요</span>
            </button>
          </div>
          
          <div class="break-tip">
            ${breakData.tip}
          </div>
          
          <!-- 휴식 타이머 (선택사항) -->
          <div class="rest-timer" style="display: none;">
            <div class="timer-circle">
              <div class="timer-text">
                <span class="timer-minutes">5</span>
                <span class="timer-label">분</span>
              </div>
            </div>
            <div class="timer-message">눈을 감고 휴식을 취해보세요</div>
            <button class="timer-skip-btn" data-action="skip-timer">휴식 끝내기</button>
          </div>
        </div>
      </div>
    `
    
    this.startBreakAnimation()
  }
  
  getBreakData() {
    // 시청 시간에 따른 다양한 메시지
    if (this.watchTime >= 60) {
      return {
        emoji: '😴',
        title: '잠깐! 1시간째 시청 중이에요',
        subtitle: '충분히 즐기셨어요. 이제 휴식할 시간!',
        description: '긴 시간 시청은 눈 건강에 좋지 않아요.<br>잠시 휴식을 취하고 돌아오시면 어떨까요?',
        restIcon: '💤',
        restText: '10분 휴식할게요',
        tip: '💡 Tip: 1시간마다 10분씩 휴식하면 집중력이 향상돼요!'
      }
    } else if (this.watchTime >= 45) {
      return {
        emoji: '⏰',
        title: '45분째 시청 중이에요',
        subtitle: '거의 한 시간이 다 되어가네요!',
        description: '시간이 정말 빨리 가죠?<br>잠시 휴식을 취해보는 건 어떨까요?',
        restIcon: '🧘',
        restText: '5분만 쉬어갈게요',
        tip: '💡 Tip: 휴식 중에는 창밖을 보거나 스트레칭을 해보세요!'
      }
    } else if (this.watchTime >= 30) {
      return {
        emoji: '⏰',
        title: '30분째 시청 중이에요',
        subtitle: '이쯤에서 잠시 쉬어가는 건 어떨까요?',
        description: '눈과 마음을 잠시 쉬게 해주면<br>더 즐거운 시청이 될 거예요 😊',
        restIcon: '🌿',
        restText: '5분만 쉬어갈게요',
        tip: '💡 Tip: 휴식을 취하면 추천 영상의 품질이 더 좋아져요!'
      }
    } else {
      return {
        emoji: '👀',
        title: `${this.watchTime}분째 시청 중이에요`,
        subtitle: '재미있는 영상들이 많죠?',
        description: '잠시 휴식을 취하고 오시면<br>더 신선한 콘텐츠를 만나볼 수 있어요!',
        restIcon: '☕',
        restText: '잠깐 휴식할게요',
        tip: '💡 Tip: 규칙적인 휴식이 건강한 시청 습관을 만들어요!'
      }
    }
  }
  
  getVideosWatched() {
    // 시청 시간 기반으로 대략적인 영상 개수 계산 (평균 1분/영상)
    return Math.floor(this.watchTime * 0.8) + Math.floor(Math.random() * 5)
  }
  
  getRecommendedBreak() {
    if (this.watchTime >= 60) return '10분'
    if (this.watchTime >= 45) return '7분'
    if (this.watchTime >= 30) return '5분'
    return '3분'
  }
  
  startBreakAnimation() {
    // 컴포넌트 진입 애니메이션
    const content = this.el.querySelector('.break-content')
    
    content.style.opacity = '0'
    content.style.transform = 'translateY(30px) scale(0.9)'
    
    setTimeout(() => {
      content.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      content.style.opacity = '1'
      content.style.transform = 'translateY(0) scale(1)'
    }, 100)
    
    // 통계 애니메이션
    setTimeout(() => {
      this.animateStats()
    }, 600)
  }
  
  animateStats() {
    const statItems = this.el.querySelectorAll('.stat-item')
    
    statItems.forEach((item, index) => {
      item.style.opacity = '0'
      item.style.transform = 'translateY(20px)'
      
      setTimeout(() => {
        item.style.transition = 'all 0.5s ease-out'
        item.style.opacity = '1'
        item.style.transform = 'translateY(0)'
        
        // 숫자 카운팅 애니메이션
        this.animateNumber(item.querySelector('.stat-value'))
      }, index * 150)
    })
  }
  
  animateNumber(element) {
    const finalValue = element.textContent
    const isTime = finalValue.includes('분')
    const numberMatch = finalValue.match(/\d+/)
    
    if (!numberMatch) return
    
    const finalNumber = parseInt(numberMatch[0])
    const duration = 1000
    const steps = 30
    const increment = finalNumber / steps
    let current = 0
    
    const timer = setInterval(() => {
      current += increment
      if (current >= finalNumber) {
        current = finalNumber
        clearInterval(timer)
      }
      
      const suffix = isTime ? '분' : (finalValue.includes('개') ? '개' : '')
      element.textContent = Math.floor(current) + suffix
    }, duration / steps)
  }
  
  setupEventListeners() {
    // 모든 버튼 클릭 이벤트 처리
    this.el.addEventListener('click', (e) => {
      console.log('🖱️ TimeBreakSlide 클릭:', e.target)
      
      const actionElement = e.target.closest('[data-action]')
      if (!actionElement) return
      
      const action = actionElement.dataset.action
      console.log('🎯 TimeBreakSlide 액션:', action)
      
      this.handleAction(action, e)
    })
  }
  
  handleAction(action, event) {
    event.stopPropagation()
    
    console.log('⚡ TimeBreakSlide 액션 처리:', action)
    
    switch (action) {
      case 'rest':
        this.startRestTimer()
        break
      case 'continue':
        this.continueWatching()
        break
      case 'skip-timer':
        this.skipRestTimer()
        break
    }
    
    // 부모 컴포넌트에 액션 알림
    this.onAction(action, { watchTime: this.watchTime })
  }
  
  startRestTimer() {
    console.log('⏲️ 휴식 타이머 시작')
    
    const content = this.el.querySelector('.break-content')
    const timer = this.el.querySelector('.rest-timer')
    
    // 버튼 피드백
    const restBtn = this.el.querySelector('.rest-btn')
    restBtn.style.transform = 'scale(0.95)'
    
    setTimeout(() => {
      // 메인 콘텐츠 숨기고 타이머 표시
      content.style.transition = 'all 0.5s ease-out'
      content.style.opacity = '0'
      content.style.transform = 'translateY(-30px) scale(0.95)'
      
      setTimeout(() => {
        content.style.display = 'none'
        timer.style.display = 'block'
        timer.style.opacity = '0'
        timer.style.transform = 'translateY(30px)'
        
        setTimeout(() => {
          timer.style.transition = 'all 0.5s ease-out'
          timer.style.opacity = '1'
          timer.style.transform = 'translateY(0)'
          
          this.runRestTimer()
        }, 50)
      }, 500)
    }, 100)
  }
  
  runRestTimer() {
    const minutes = parseInt(this.getRecommendedBreak())
    let totalSeconds = minutes * 60
    
    console.log(`⏰ 타이머 실행: ${minutes}분 (${totalSeconds}초)`)
    
    const timerText = this.el.querySelector('.timer-minutes')
    const circle = this.el.querySelector('.timer-circle')
    
    // 타이머 시각화
    const updateTimer = () => {
      const currentMinutes = Math.floor(totalSeconds / 60)
      const currentSeconds = totalSeconds % 60
      
      if (currentSeconds === 0) {
        timerText.textContent = currentMinutes
      } else {
        timerText.textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}`
      }
      
      // 원형 진행바
      const progress = 1 - (totalSeconds / (minutes * 60))
      circle.style.background = `conic-gradient(var(--primary-color) ${progress * 360}deg, rgba(154, 120, 219, 0.2) 0deg)`
      
      totalSeconds--
      
      if (totalSeconds < 0) {
        this.completeRestTimer()
        return
      }
      
      setTimeout(updateTimer, 1000)
    }
    
    updateTimer()
  }
  
  completeRestTimer() {
    console.log('✅ 휴식 타이머 완료')
    
    // 휴식 완료
    const timerText = this.el.querySelector('.timer-minutes')
    const message = this.el.querySelector('.timer-message')
    
    timerText.textContent = '완료!'
    message.textContent = '휴식이 끝났어요! 새로운 영상을 즐겨보세요 😊'
    
    setTimeout(() => {
      this.onAction('rest-complete', { watchTime: this.watchTime })
    }, 2000)
  }
  
  skipRestTimer() {
    console.log('⏭️ 휴식 타이머 건너뛰기')
    this.onAction('rest-skip', { watchTime: this.watchTime })
  }
  
  continueWatching() {
    console.log('▶️ 계속 시청하기 선택')
    
    // 계속 시청하기 버튼 피드백
    const continueBtn = this.el.querySelector('.continue-btn')
    continueBtn.style.transform = 'scale(0.95)'
    
    setTimeout(() => {
      this.onAction('continue', { watchTime: this.watchTime })
    }, 150)
  }
  
  // setActive 메서드 추가 (VideoSwiper와의 호환성을 위해)
  setActive(isActive) {
    // 휴식 슬라이드는 항상 활성 상태로 표시
    console.log('🎯 TimeBreakSlide setActive:', isActive)
  }
  
  // 시청 시간 업데이트
  updateWatchTime(newWatchTime) {
    this.watchTime = newWatchTime
    this.render()
  }
  
  // 정리
  destroy() {
    console.log('🗑️ TimeBreakSlide 정리')
  }
} 