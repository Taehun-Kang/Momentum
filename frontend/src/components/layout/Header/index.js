/**
 * 📱 Header - 페이지 상단 헤더 컴포넌트
 * 
 * 동적 시간대별 인사말, 제목, 부제목을 표시하는 헤더
 */

import { Component } from '../../../core/Component.js'
import './Header.css'

export default class Header extends Component {
  static defaultProps = {
    // 내용
    greeting: '',            // 인사말 (빈 값이면 시간대별 자동 생성)
    title: '',               // 메인 제목 (HTML 허용)
    subtitle: '',            // 부제목 (선택적)
    
    // 스타일
    variant: 'default',      // default, home, mood, topic, chat
    
    // 시간대별 인사말 설정
    enableTimeGreeting: false,  // 시간대별 동적 인사말 활성화
    
    className: ''
  }
  
  constructor(props = {}) {
    super({
      ...Header.defaultProps,
      ...props,
      tagName: 'div'
    })
  }
  
  /**
   * 시간대별 인사말 생성
   */
  getTimeBasedGreeting() {
    const hour = new Date().getHours()
    
    if (hour >= 6 && hour < 12) {
      return '새로운 하루가 시작되었네요'
    } else if (hour >= 12 && hour < 18) {
      return '활기찬 오후 시간이에요'
    } else if (hour >= 18 && hour < 22) {
      return '하루를 마무리하는 시간이에요'
    } else {
      return '고요한 밤의 여유로움'
    }
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
      'header',
      `header--${this.props.variant}`,
      this.props.className
    ].filter(Boolean)
    
    this.el.className = classes.join(' ')
    
    // 인사말 결정
    let displayGreeting = this.props.greeting
    if (this.props.enableTimeGreeting && !displayGreeting) {
      displayGreeting = this.getTimeBasedGreeting()
    }
    
    // HTML 생성
    this.el.innerHTML = `
      <div class="header__inner">
        ${displayGreeting ? `<div class="header__greeting">${displayGreeting}</div>` : ''}
        ${this.props.title ? `<div class="header__title">${this.props.title}</div>` : ''}
        ${this.props.subtitle ? `<div class="header__subtitle">${this.props.subtitle}</div>` : ''}
      </div>
    `
    
    // 제목 텍스트 길이에 따른 동적 크기 조정
    this.adjustTitleSize()
  }
  
  /**
   * 제목 텍스트 길이에 따른 크기 조정
   */
  adjustTitleSize() {
    const titleEl = this.el.querySelector('.header__title')
    if (!titleEl || !this.props.title) return
    
    // HTML 태그 제거하고 순수 텍스트 길이 측정
    const cleanText = this.props.title.replace(/<[^>]*>/g, '')
    const textLength = cleanText.length
    
    // 기존 크기 클래스 제거
    titleEl.classList.remove('long-text', 'very-long-text')
    
    // 텍스트 길이에 따라 클래스 추가
    if (textLength > 25) {
      titleEl.classList.add('very-long-text')
    } else if (textLength > 18) {
      titleEl.classList.add('long-text')
    }
    
    console.log(`📏 Title length: ${textLength}, classes:`, titleEl.className)
  }
  
  /**
   * 인사말 업데이트 (시간대별 인사말용)
   */
  updateGreeting() {
    if (this.props.enableTimeGreeting) {
      const greetingEl = this.el.querySelector('.header__greeting')
      if (greetingEl) {
        greetingEl.textContent = this.getTimeBasedGreeting()
      }
    }
  }
  
  /**
   * props 업데이트
   */
  updateProps(newProps) {
    this.props = { ...this.props, ...newProps }
    this.setupElement()
  }
} 