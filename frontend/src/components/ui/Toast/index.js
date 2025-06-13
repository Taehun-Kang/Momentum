/**
 * 🔔 Toast - 알림 메시지 컴포넌트
 * 
 * 4가지 variant: success, error, warning, info
 * 글래스모피즘 디자인, 자동 스택 관리, 슬라이드 애니메이션
 */

import { Component } from '../../../core/Component.js'
import './Toast.css'

export default class Toast extends Component {
  static defaultProps = {
    variant: 'info',        // success, error, warning, info
    title: '',              // 제목 (선택적)
    message: '',            // 메시지
    duration: 4000,         // 자동 사라짐 시간 (0이면 수동)
    position: 'top-right',  // top-right, top-center, top-left, bottom-right, bottom-center, bottom-left
    showIcon: true,         // 아이콘 표시 여부
    showClose: true,        // 닫기 버튼 표시 여부
    action: null,           // 액션 버튼 { text: '실행취소', handler: () => {} }
    className: '',
    
    // 이벤트 핸들러
    onShow: null,
    onHide: null,
    onAction: null,
    onClick: null
  }
  
  constructor(props = {}) {
    super({
      ...Toast.defaultProps,
      ...props
    })
    
    this.isVisible = false
    this.timer = null
    this.toastId = this.generateToastId()
    
    // 컨테이너에 추가될 때까지 숨김
    this.el.style.display = 'none'
  }
  
  /**
   * 고유 Toast ID 생성
   */
  generateToastId() {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  render() {
    this.setupElement()
    this.setupEventListeners()
    return this
  }
  
  /**
   * 엘리먼트 설정
   */
  setupElement() {
    // CSS 클래스 설정
    const classes = [
      'toast',
      `toast--${this.props.variant}`,
      this.props.className
    ].filter(Boolean)
    
    this.el.className = classes.join(' ')
    this.el.setAttribute('data-toast-id', this.toastId)
    
    // HTML 생성
    this.el.innerHTML = this.generateHTML()
  }
  
  /**
   * HTML 생성
   */
  generateHTML() {
    const { variant, title, message, showIcon, showClose, action } = this.props
    
    // 아이콘 SVG들
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22,4 12,14.01 9,11.01"/>
      </svg>`,
      
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`,
      
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <path d="M12 9v4"/>
        <path d="m12 17 .01 0"/>
      </svg>`,
      
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="m12 16 0-4"/>
        <path d="m12 8 .01 0"/>
      </svg>`
    }
    
    const closeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m18 6-12 12"/>
      <path d="m6 6 12 12"/>
    </svg>`
    
    return `
      <div class="toast__container">
        ${showIcon ? `
          <div class="toast__icon">
            ${icons[variant]}
          </div>
        ` : ''}
        
        <div class="toast__content">
          ${title ? `<div class="toast__title">${title}</div>` : ''}
          <div class="toast__message">${message}</div>
        </div>
        
        ${action ? `
          <button class="toast__action" type="button">
            ${action.text}
          </button>
        ` : ''}
        
        ${showClose ? `
          <button class="toast__close" type="button" aria-label="알림 닫기">
            ${closeIcon}
          </button>
        ` : ''}
      </div>
      
      <div class="toast__progress">
        <div class="toast__progress-bar"></div>
      </div>
    `
  }
  
  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 닫기 버튼
    const closeBtn = this.el.querySelector('.toast__close')
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.hide()
      })
    }
    
    // 액션 버튼
    const actionBtn = this.el.querySelector('.toast__action')
    if (actionBtn && this.props.action) {
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (this.props.action.handler) {
          this.props.action.handler()
        }
        if (this.props.onAction) {
          this.props.onAction(this.props.action)
        }
        this.hide()
      })
    }
    
    // Toast 클릭 (선택적)
    if (this.props.onClick) {
      this.el.addEventListener('click', () => {
        this.props.onClick(this)
      })
    }
    
    // 호버 시 타이머 일시정지
    this.el.addEventListener('mouseenter', () => {
      this.pauseTimer()
    })
    
    this.el.addEventListener('mouseleave', () => {
      this.resumeTimer()
    })
  }
  
  /**
   * Toast 표시
   */
  show() {
    if (this.isVisible) return this
    
    // Toast 컨테이너에 추가
    Toast.addToContainer(this)
    
    this.el.style.display = 'block'
    
    // 슬라이드 인 애니메이션
    requestAnimationFrame(() => {
      this.el.classList.add('toast--visible')
    })
    
    this.isVisible = true
    
    // onShow 콜백
    if (this.props.onShow) {
      this.props.onShow(this)
    }
    
    // 자동 숨기기 타이머
    if (this.props.duration > 0) {
      this.startTimer()
    }
    
    return this
  }
  
  /**
   * Toast 숨김
   */
  hide() {
    if (!this.isVisible) return this
    
    this.clearTimer()
    this.el.classList.remove('toast--visible')
    
    // 슬라이드 아웃 애니메이션 완료 후 제거
    setTimeout(() => {
      if (this.isVisible) { // 애니메이션 중에 다시 표시되지 않았다면
        this.el.style.display = 'none'
        Toast.removeFromContainer(this)
        this.isVisible = false
        
        // onHide 콜백
        if (this.props.onHide) {
          this.props.onHide(this)
        }
      }
    }, 300) // CSS transition과 맞춤
    
    return this
  }
  
  /**
   * 타이머 시작
   */
  startTimer() {
    if (this.props.duration <= 0) return
    
    this.clearTimer()
    
    // 프로그레스 바 애니메이션
    const progressBar = this.el.querySelector('.toast__progress-bar')
    if (progressBar) {
      progressBar.style.animation = `toast-progress ${this.props.duration}ms linear`
    }
    
    this.timer = setTimeout(() => {
      this.hide()
    }, this.props.duration)
  }
  
  /**
   * 타이머 일시정지
   */
  pauseTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      
      // 프로그레스 바 애니메이션 일시정지
      const progressBar = this.el.querySelector('.toast__progress-bar')
      if (progressBar) {
        progressBar.style.animationPlayState = 'paused'
      }
    }
  }
  
  /**
   * 타이머 재개
   */
  resumeTimer() {
    const progressBar = this.el.querySelector('.toast__progress-bar')
    if (progressBar) {
      progressBar.style.animationPlayState = 'running'
    }
    
    // 실제로는 재개가 아니라 다시 시작 (간단한 구현)
    if (this.props.duration > 0 && this.isVisible) {
      this.startTimer()
    }
  }
  
  /**
   * 타이머 정리
   */
  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
  
  /**
   * 메시지 업데이트
   */
  updateMessage(message, title) {
    const messageEl = this.el.querySelector('.toast__message')
    const titleEl = this.el.querySelector('.toast__title')
    
    if (messageEl) {
      messageEl.textContent = message
      this.props.message = message
    }
    
    if (title !== undefined) {
      if (title && !titleEl) {
        // 제목 엘리먼트 추가
        const content = this.el.querySelector('.toast__content')
        content.insertAdjacentHTML('afterbegin', `<div class="toast__title">${title}</div>`)
      } else if (title && titleEl) {
        titleEl.textContent = title
      } else if (!title && titleEl) {
        titleEl.remove()
      }
      this.props.title = title
    }
    
    return this
  }
  
  /**
   * variant 변경
   */
  setVariant(variant) {
    this.el.classList.remove(`toast--${this.props.variant}`)
    this.props.variant = variant
    this.el.classList.add(`toast--${variant}`)
    
    // 아이콘도 업데이트
    const iconEl = this.el.querySelector('.toast__icon svg')
    if (iconEl) {
      const icons = this.generateHTML().match(/<svg[^>]*>.*?<\/svg>/)[0]
      iconEl.outerHTML = icons
    }
    
    return this
  }
  
  /**
   * 컴포넌트 제거 시 정리
   */
  destroy() {
    this.clearTimer()
    Toast.removeFromContainer(this)
    super.destroy()
  }
}

/**
 * ===== 정적 메서드들 (글로벌 사용) =====
 */

// 전역 Toast 컨테이너 관리
Toast.containers = new Map() // position별 컨테이너
Toast.instances = new Set()  // 모든 Toast 인스턴스

/**
 * Toast 컨테이너 가져오기 또는 생성
 */
Toast.getContainer = function(position = 'top-right') {
  if (!Toast.containers.has(position)) {
    const container = document.createElement('div')
    container.className = `toast-container toast-container--${position}`
    container.setAttribute('data-position', position)
    document.body.appendChild(container)
    Toast.containers.set(position, container)
  }
  return Toast.containers.get(position)
}

/**
 * Toast를 컨테이너에 추가
 */
Toast.addToContainer = function(toastInstance) {
  const container = Toast.getContainer(toastInstance.props.position)
  container.appendChild(toastInstance.el)
  Toast.instances.add(toastInstance)
  
  // 컨테이너 위치 업데이트
  Toast.updateContainerPositions(toastInstance.props.position)
}

/**
 * Toast를 컨테이너에서 제거
 */
Toast.removeFromContainer = function(toastInstance) {
  if (toastInstance.el.parentNode) {
    toastInstance.el.parentNode.removeChild(toastInstance.el)
  }
  Toast.instances.delete(toastInstance)
  
  // 컨테이너 위치 업데이트
  Toast.updateContainerPositions(toastInstance.props.position)
}

/**
 * 컨테이너 위치 업데이트 (스택 효과)
 */
Toast.updateContainerPositions = function(position) {
  const container = Toast.containers.get(position)
  if (!container) return
  
  const toasts = Array.from(container.children)
  toasts.forEach((toast, index) => {
    const offset = index * 8 // 8px씩 오프셋
    toast.style.transform = `translateY(${offset}px)`
    toast.style.zIndex = 1000 - index
  })
}

/**
 * 편의 메서드들
 */
Toast.success = function(message, options = {}) {
  return Toast.show(message, { ...options, variant: 'success' })
}

Toast.error = function(message, options = {}) {
  return Toast.show(message, { ...options, variant: 'error' })
}

Toast.warning = function(message, options = {}) {
  return Toast.show(message, { ...options, variant: 'warning' })
}

Toast.info = function(message, options = {}) {
  return Toast.show(message, { ...options, variant: 'info' })
}

/**
 * 메인 표시 메서드
 */
Toast.show = function(message, options = {}) {
  const toast = new Toast({
    message,
    ...options
  })
  
  toast.render().show()
  return toast
}

/**
 * 모든 Toast 숨기기
 */
Toast.hideAll = function(position) {
  Toast.instances.forEach(toast => {
    if (!position || toast.props.position === position) {
      toast.hide()
    }
  })
}

/**
 * 특정 variant의 Toast들 숨기기
 */
Toast.hideByVariant = function(variant) {
  Toast.instances.forEach(toast => {
    if (toast.props.variant === variant) {
      toast.hide()
    }
  })
}

/**
 * 모든 컨테이너 정리
 */
Toast.cleanup = function() {
  Toast.hideAll()
  
  setTimeout(() => {
    Toast.containers.forEach(container => {
      if (container.parentNode) {
        container.parentNode.removeChild(container)
      }
    })
    Toast.containers.clear()
    Toast.instances.clear()
  }, 350)
} 