/**
 * ⏳ Loading - 로딩 컴포넌트
 * 
 * 4가지 variant: spinner, dots, pulse, skeleton
 * 글래스모피즘 디자인, 전체 화면 오버레이, 커스텀 메시지
 */

import { Component } from '../../../core/Component.js'
import './Loading.css'

export default class Loading extends Component {
  static defaultProps = {
    variant: 'spinner', // spinner, dots, pulse, skeleton
    size: 'medium',     // small, medium, large
    overlay: false,     // 전체 화면 오버레이
    message: '',        // 로딩 메시지
    transparent: false, // 투명 배경
    position: 'center', // center, top, bottom
    color: 'primary',   // primary, white, dark
    className: ''
  }
  
  constructor(props = {}) {
    super({
      ...Loading.defaultProps,
      ...props
    })
    
    this.isVisible = false
  }
  
  render() {
    this.setupElement()
    return this
  }
  
  /**
   * 엘리먼트 설정
   */
  setupElement() {
    // CSS 클래스 설정
    const classes = [
      'loading',
      `loading--${this.props.variant}`,
      `loading--${this.props.size}`,
      `loading--${this.props.position}`,
      `loading--${this.props.color}`,
      this.props.overlay ? 'loading--overlay' : '',
      this.props.transparent ? 'loading--transparent' : '',
      this.props.className
    ].filter(Boolean)
    
    this.el.className = classes.join(' ')
    
    // HTML 생성
    this.el.innerHTML = this.generateHTML()
    
    // 초기 상태 (숨김)
    this.el.style.display = 'none'
  }
  
  /**
   * HTML 생성
   */
  generateHTML() {
    const { variant, message } = this.props
    
    const animations = {
      spinner: this.generateSpinner(),
      dots: this.generateDots(),
      pulse: this.generatePulse(),
      skeleton: this.generateSkeleton()
    }
    
    return `
      <div class="loading__container">
        <div class="loading__animation">
          ${animations[variant]}
        </div>
        ${message ? `<div class="loading__message">${message}</div>` : ''}
      </div>
    `
  }
  
  /**
   * 스피너 애니메이션 생성
   */
  generateSpinner() {
    return `
      <div class="loading-spinner">
        <svg class="loading-spinner__svg" viewBox="0 0 50 50">
          <circle 
            class="loading-spinner__circle" 
            cx="25" 
            cy="25" 
            r="20" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray="31.416" 
            stroke-dashoffset="31.416">
          </circle>
        </svg>
      </div>
    `
  }
  
  /**
   * 점 애니메이션 생성
   */
  generateDots() {
    return `
      <div class="loading-dots">
        <div class="loading-dots__dot"></div>
        <div class="loading-dots__dot"></div>
        <div class="loading-dots__dot"></div>
      </div>
    `
  }
  
  /**
   * 펄스 애니메이션 생성
   */
  generatePulse() {
    return `
      <div class="loading-pulse">
        <div class="loading-pulse__circle loading-pulse__circle--1"></div>
        <div class="loading-pulse__circle loading-pulse__circle--2"></div>
        <div class="loading-pulse__circle loading-pulse__circle--3"></div>
      </div>
    `
  }
  
  /**
   * 스켈레톤 애니메이션 생성
   */
  generateSkeleton() {
    return `
      <div class="loading-skeleton">
        <div class="loading-skeleton__line loading-skeleton__line--long"></div>
        <div class="loading-skeleton__line loading-skeleton__line--medium"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
      </div>
    `
  }
  
  /**
   * 로딩 표시
   */
  show(message) {
    if (message) {
      this.setMessage(message)
    }
    
    // 오버레이 스타일 복원
    if (this.props.overlay) {
      this.el.style.opacity = '1'
      this.el.style.visibility = 'visible'
      this.el.style.transform = 'scale(1)'
      this.el.style.pointerEvents = 'auto'
      this.el.style.zIndex = '9999'
      
      // 스크롤 방지
      document.body.style.overflow = 'hidden'
    }
    
    this.el.style.display = 'flex'
    
    // 페이드 인 애니메이션
    requestAnimationFrame(() => {
      this.el.classList.add('loading--visible')
    })
    
    this.isVisible = true
  }
  
  /**
   * 로딩 숨김
   */
  hide() {
    if (!this.isVisible) return
    
    this.el.classList.remove('loading--visible')
    
    // 즉시 포인터 이벤트 차단
    if (this.props.overlay) {
      this.el.style.pointerEvents = 'none'
      this.el.style.zIndex = '-1'
    }
    
    // 애니메이션 완료 후 완전히 숨김
    setTimeout(() => {
      if (this.isVisible) return // 이미 다시 표시된 경우 무시
      
      this.el.style.display = 'none'
      
      // 오버레이 정리
      if (this.props.overlay) {
        this.el.style.opacity = '0'
        this.el.style.visibility = 'hidden'
        this.el.style.transform = 'scale(0.9)'
        this.el.style.pointerEvents = 'none'
        this.el.style.zIndex = '-9999'
        
        // 스크롤 복원
        document.body.style.overflow = ''
      }
    }, 300) // CSS transition과 맞춤
    
    this.isVisible = false
  }
  
  /**
   * 로딩 상태 토글
   */
  toggle(message) {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show(message)
    }
  }
  
  /**
   * 메시지 설정
   */
  setMessage(message) {
    this.props.message = message
    const messageEl = this.el.querySelector('.loading__message')
    
    if (message && !messageEl) {
      // 메시지 엘리먼트가 없으면 추가
      const container = this.el.querySelector('.loading__container')
      container.insertAdjacentHTML('beforeend', `<div class="loading__message">${message}</div>`)
    } else if (message && messageEl) {
      // 메시지 업데이트
      messageEl.textContent = message
    } else if (!message && messageEl) {
      // 메시지 제거
      messageEl.remove()
    }
  }
  
  /**
   * variant 변경
   */
  setVariant(variant) {
    // 기존 variant 클래스 제거
    this.el.classList.remove(`loading--${this.props.variant}`)
    
    // 새 variant 설정
    this.props.variant = variant
    this.el.classList.add(`loading--${variant}`)
    
    // 애니메이션 부분 업데이트
    const animationEl = this.el.querySelector('.loading__animation')
    if (animationEl) {
      animationEl.innerHTML = this.generateHTML().match(/<div class="loading__animation">(.*?)<\/div>/s)[1]
    }
  }
  
  /**
   * 크기 변경
   */
  setSize(size) {
    this.el.classList.remove(`loading--${this.props.size}`)
    this.props.size = size
    this.el.classList.add(`loading--${size}`)
  }
  
  /**
   * 색상 변경
   */
  setColor(color) {
    this.el.classList.remove(`loading--${this.props.color}`)
    this.props.color = color
    this.el.classList.add(`loading--${color}`)
  }
  
  /**
   * 가시성 상태 확인
   */
  isShowing() {
    return this.isVisible
  }
  
  /**
   * 지연된 표시 (사용자 경험 개선)
   */
  showDelayed(delay = 500, message) {
    setTimeout(() => {
      if (!this.isVisible) { // 이미 다른 곳에서 숨겨졌으면 표시하지 않음
        this.show(message)
      }
    }, delay)
  }
  
  /**
   * 정적 메서드들 (글로벌 사용)
   */
  static show(message, options = {}) {
    if (!Loading.globalInstance) {
      Loading.globalInstance = new Loading({
        overlay: true,
        ...options
      })
      document.body.appendChild(Loading.globalInstance.render().el)
    }
    Loading.globalInstance.show(message)
    return Loading.globalInstance
  }
  
  static hide() {
    if (Loading.globalInstance) {
      Loading.globalInstance.hide()
      
      // 글로벌 인스턴스 완전 정리
      setTimeout(() => {
        if (Loading.globalInstance && !Loading.globalInstance.isVisible) {
          Loading.globalInstance.destroy()
          Loading.globalInstance = null
        }
      }, 350) // hide 애니메이션보다 약간 더 긴 시간
    }
  }
  
  static setMessage(message) {
    if (Loading.globalInstance) {
      Loading.globalInstance.setMessage(message)
    }
  }
  
  /**
   * 컴포넌트 제거 시 정리
   */
  destroy() {
    // 스크롤 복원 및 오버레이 완전 정리
    if (this.props.overlay && this.isVisible) {
      document.body.style.overflow = ''
      this.el.style.pointerEvents = 'none'
      this.el.style.zIndex = '-9999'
    }
    
    super.destroy()
  }
}

// 글로벌 인스턴스 저장
Loading.globalInstance = null 