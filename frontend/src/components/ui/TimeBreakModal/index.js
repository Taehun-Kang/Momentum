/**
 * ⏰ TimeBreakModal - 휴식 알림 모달 컴포넌트
 * 
 * 시청 시간 기반 휴식 알림, 홈/채팅 페이지와 유사한 디자인
 * 배경: 그라데이션 + 글래스모피즘, 옵션: 계속보기/그만보기
 */

import { Component } from '../../../core/Component.js'
import './TimeBreakModal.css'

export default class TimeBreakModal extends Component {
  constructor(options = {}) {
    super({ tagName: 'div' })
    
    this.watchTime = options.watchTime || 0 // 분 단위
    this.onAction = options.onAction || (() => {})
    
    // 시청 시간별 메시지
    this.messages = this.getWatchTimeMessages()
    
    this.render()
    this.setupEventListeners()
    this.animateIn()
  }
  
  getWatchTimeMessages() {
    const time = this.watchTime
    
    if (time <= 1) {
      return {
        title: '잠깐 쉬어가볼까요?',
        subtitle: `${time}분간 시청했어요`,
        message: '눈이 조금 피로할 수 있어요.<br>잠시 휴식을 취하는 것은 어떨까요?',
        emoji: '😌',
        suggestion: '눈을 깜빡이고 먼 곳을 바라보세요'
      }
    } else if (time <= 3) {
      return {
        title: '휴식 시간이에요',
        subtitle: `${time}분간 연속 시청 중`,
        message: '이제 잠시 휴식을 취할 시간입니다.<br>건강한 시청 습관을 만들어보세요.',
        emoji: '🧘‍♀️',
        suggestion: '스트레칭이나 물 마시기를 해보세요'
      }
    } else if (time <= 5) {
      return {
        title: '휴식이 필요해요',
        subtitle: `${time}분간 계속 시청하고 있어요`,
        message: '너무 오랫동안 시청하고 계세요.<br>건강을 위해 휴식을 권해드려요.',
        emoji: '💤',
        suggestion: '5분간 휴식을 취하고 돌아오세요'
      }
    } else {
      return {
        title: '충분히 시청했어요',
        subtitle: `${time}분간 시청했습니다`,
        message: '오늘은 충분히 영상을 즐겼어요.<br>다른 활동을 해보는 것은 어떨까요?',
        emoji: '🌟',
        suggestion: '산책이나 다른 취미 활동을 해보세요'
      }
    }
  }
  
  render() {
    this.el.className = 'time-break-modal'
    
    const { title, subtitle, message, emoji, suggestion } = this.messages
    
    this.el.innerHTML = /* html */ `
      <!-- 배경 오버레이 -->
      <div class="modal-overlay"></div>
      
      <!-- 메인 컨테이너 (홈 페이지와 유사한 배경) -->
      <div class="modal-container">
        <!-- 배경 그라데이션 (홈 페이지 스타일) -->
        <div class="modal-background">
          <div class="background-gradient"></div>
          <div class="background-pattern"></div>
        </div>
        
        <!-- 메인 콘텐츠 -->
        <div class="modal-content">
          <!-- 헤더 -->
          <div class="modal-header">
            <div class="time-emoji">${emoji}</div>
            <div class="modal-title">${title}</div>
            <div class="modal-subtitle">${subtitle}</div>
          </div>
          
          <!-- 메시지 -->
          <div class="modal-message">
            <div class="message-text">${message}</div>
            <div class="suggestion-text">${suggestion}</div>
          </div>
          
          <!-- 시청 통계 -->
          <div class="watch-stats">
            <div class="stats-card">
              <div class="stats-title">시청 시간</div>
              <div class="stats-value">${this.watchTime}분</div>
            </div>
            <div class="stats-card">
              <div class="stats-title">추천 휴식</div>
              <div class="stats-value">${this.getRecommendedBreak()}분</div>
            </div>
          </div>
          
          <!-- 액션 버튼들 -->
          <div class="modal-actions">
            <button class="action-btn continue-btn" data-action="continue">
              <div class="btn-icon">▶</div>
              <div class="btn-text">계속 시청하기</div>
            </button>
            
            <button class="action-btn stop-btn" data-action="stop">
              <div class="btn-icon">🏠</div>
              <div class="btn-text">영상 그만보기</div>
            </button>
          </div>
          
          <!-- 하단 팁 -->
          <div class="modal-tip">
            <div class="tip-icon">💡</div>
            <div class="tip-text">건강한 시청을 위해 정기적인 휴식을 취하세요</div>
          </div>
        </div>
      </div>
    `
  }
  
  getRecommendedBreak() {
    // 시청 시간에 따른 추천 휴식 시간
    if (this.watchTime <= 1) return 1
    if (this.watchTime <= 3) return 3
    if (this.watchTime <= 5) return 5
    return 10
  }
  
  setupEventListeners() {
    // 액션 버튼 클릭
    this.el.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]')
      if (!actionBtn) return
      
      const action = actionBtn.dataset.action
      this.handleAction(action)
    })
    
    // 오버레이 클릭으로 닫기 (옵션)
    const overlay = this.el.querySelector('.modal-overlay')
    if (overlay) {
      overlay.addEventListener('click', () => {
        // 오버레이 클릭으로는 닫지 않음 (의도적 휴식)
        console.log('⚠️ 오버레이 클릭 - 휴식 모달은 버튼으로만 닫을 수 있습니다')
      })
    }
    
    // ESC 키로 닫기 방지 (의도적 휴식)
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }
  
  handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      console.log('⚠️ ESC 키 - 휴식 모달은 버튼으로만 닫을 수 있습니다')
    }
  }
  
  handleAction(action) {
    console.log(`⏰ 휴식 모달 액션: ${action}`)
    
    // 버튼 애니메이션
    const btn = this.el.querySelector(`[data-action="${action}"]`)
    if (btn) {
      this.animateButton(btn)
    }
    
    // 액션 처리
    switch (action) {
      case 'continue':
        console.log('▶️ 계속 시청하기 선택')
        this.animateOut(() => {
          this.onAction('continue', {
            watchTime: this.watchTime,
            action: 'continue'
          })
        })
        break
        
      case 'stop':
        console.log('🛑 영상 그만보기 선택')
        this.animateOut(() => {
          this.onAction('stop', {
            watchTime: this.watchTime,
            action: 'stop'
          })
        })
        break
    }
  }
  
  animateButton(button) {
    if (!button) return
    
    button.style.transform = 'scale(0.95)'
    button.style.transition = 'transform 0.1s ease'
    
    setTimeout(() => {
      button.style.transform = 'scale(1)'
    }, 100)
  }
  
  animateIn() {
    // 진입 애니메이션
    const container = this.el.querySelector('.modal-container')
    const overlay = this.el.querySelector('.modal-overlay')
    
    if (overlay) {
      overlay.style.opacity = '0'
      overlay.style.animation = 'fadeIn 0.3s ease-out forwards'
    }
    
    if (container) {
      container.style.opacity = '0'
      container.style.transform = 'scale(0.9) translateY(20px)'
      container.style.animation = 'slideUpFadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s forwards'
    }
    
    // 개별 요소들 순차 애니메이션
    const elements = [
      '.modal-header',
      '.modal-message', 
      '.watch-stats',
      '.modal-actions',
      '.modal-tip'
    ]
    
    elements.forEach((selector, index) => {
      const element = this.el.querySelector(selector)
      if (element) {
        element.style.opacity = '0'
        element.style.transform = 'translateY(20px)'
        element.style.animation = `slideUpFadeIn 0.3s ease-out ${0.2 + index * 0.1}s forwards`
      }
    })
  }
  
  animateOut(callback) {
    // 종료 애니메이션
    const container = this.el.querySelector('.modal-container')
    const overlay = this.el.querySelector('.modal-overlay')
    
    if (container) {
      container.style.animation = 'slideDownFadeOut 0.3s ease-in forwards'
    }
    
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.4s ease-out 0.1s forwards'
    }
    
    // 애니메이션 완료 후 콜백 실행
    setTimeout(() => {
      if (callback) callback()
    }, 400)
  }
  
  // 컴포넌트 정리
  destroy() {
    console.log('🗑️ TimeBreakModal 정리')
    
    // 키보드 이벤트 리스너 제거
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    
    super.destroy?.()
  }
} 