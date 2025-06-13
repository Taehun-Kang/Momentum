/**
 * 🧩 Component - 기본 컴포넌트 클래스
 * 
 * 모든 UI 컴포넌트의 베이스 클래스
 */

import { EventEmitter } from './EventEmitter.js'
import { Logger } from './Logger.js'

export class Component extends EventEmitter {
  static defaultProps = {}
  
  constructor(props = {}) {
    super()
    
    this.props = { 
      ...this.constructor.defaultProps, 
      ...props 
    }
    
    // DOM 엘리먼트 생성
    this.el = this.createElement()
    
    // 컴포넌트 식별자
    this.componentId = this.generateId()
    this.el.setAttribute('data-component-id', this.componentId)
    
    // 이벤트 리스너 저장소
    this.eventListeners = new Map()
    
    // 상태 플래그
    this.isMounted = false
    this.isDestroyed = false
    
    // 성능 측정
    this.renderTime = 0
    
    // 자동 렌더링 설정
    if (this.props.autoRender !== false) {
      this.render()
    }
    
    Logger.debug(`📦 Component created: ${this.constructor.name}`, { 
      id: this.componentId, 
      props: this.props 
    })
  }
  
  /**
   * DOM 엘리먼트 생성
   */
  createElement() {
    const tagName = this.props.tagName || 'div'
    return document.createElement(tagName)
  }
  
  /**
   * 고유 ID 생성
   */
  generateId() {
    return `${this.constructor.name.toLowerCase()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * 렌더링 메서드 (하위 클래스에서 구현)
   */
  render() {
    // 하위 클래스에서 override
    return this
  }
  
  /**
   * 이벤트 바인딩을 위한 헬퍼 메서드
   */
  bindEvents() {
    // 하위 클래스에서 구현
  }
  
  /**
   * 컴포넌트 마운트
   */
  mount(parent) {
    if (this.isMounted) {
      Logger.warn(`⚠️  Component ${this.constructor.name} is already mounted`)
      return this
    }
    
    try {
      const startTime = performance.now()
      
      // 렌더링
      this.render()
      
      // 이벤트 바인딩
      this.bindEvents()
      
      // DOM에 추가
      if (parent) {
        if (typeof parent === 'string') {
          parent = document.querySelector(parent)
        }
        parent.appendChild(this.el)
      }
      
      this.isMounted = true
      this.renderTime = performance.now() - startTime
      
      // 마운트 완료 이벤트
      this.emit('mounted')
      
      Logger.debug(`✅ Component mounted: ${this.constructor.name}`, {
        renderTime: `${this.renderTime.toFixed(2)}ms`
      })
      
    } catch (error) {
      Logger.error(`❌ Error mounting component ${this.constructor.name}:`, error)
      this.emit('error', error)
    }
    
    return this
  }
  
  /**
   * props 업데이트
   */
  updateProps(newProps) {
    const oldProps = { ...this.props }
    this.props = { ...this.props, ...newProps }
    
    // props 변경 이벤트
    this.emit('propsUpdated', { newProps: this.props, oldProps })
    
    // 자동 리렌더링 (성능상 옵션으로)
    if (this.props.autoRerender !== false) {
      this.rerender()
    }
    
    return this
  }
  
  /**
   * State 업데이트
   */
  setState(updates, callback) {
    const oldState = { ...this.state }
    
    if (typeof updates === 'function') {
      this.state = { ...this.state, ...updates(this.state) }
    } else {
      this.state = { ...this.state, ...updates }
    }
    
    // state 변경 이벤트
    this.emit('stateUpdated', { newState: this.state, oldState })
    
    // 콜백 실행
    if (callback) {
      callback(this.state, oldState)
    }
    
    // 자동 리렌더링
    this.rerender()
    
    return this
  }
  
  /**
   * 리렌더링
   */
  rerender() {
    if (!this.isMounted || this.isDestroyed) {
      return this
    }
    
    try {
      const startTime = performance.now()
      
      // 기존 이벤트 리스너 정리
      this.clearEventListeners()
      
      // 렌더링
      this.render()
      
      // 이벤트 다시 바인딩
      this.bindEvents()
      
      this.renderTime = performance.now() - startTime
      
      // 리렌더링 완료 이벤트
      this.emit('rerendered')
      
      Logger.debug(`🔄 Component rerendered: ${this.constructor.name}`, {
        renderTime: `${this.renderTime.toFixed(2)}ms`
      })
      
    } catch (error) {
      Logger.error(`❌ Error rerendering component ${this.constructor.name}:`, error)
      this.emit('error', error)
    }
    
    return this
  }
  
  /**
   * DOM 요소 찾기
   */
  find(selector) {
    return this.el.querySelector(selector)
  }
  
  /**
   * 여러 DOM 요소 찾기
   */
  findAll(selector) {
    return Array.from(this.el.querySelectorAll(selector))
  }
  
  /**
   * 이벤트 리스너 추가 (자동 정리)
   */
  addEventListener(element, event, handler, options = {}) {
    if (typeof element === 'string') {
      element = this.find(element)
    }
    
    if (!element) {
      Logger.warn(`⚠️  Element not found for event listener: ${event}`)
      return this
    }
    
    // 이벤트 리스너 저장
    const listenerId = `${event}_${Math.random().toString(36).substr(2, 9)}`
    this.eventListeners.set(listenerId, { element, event, handler, options })
    
    // 이벤트 리스너 추가
    element.addEventListener(event, handler, options)
    
    return this
  }
  
  /**
   * 모든 이벤트 리스너 정리
   */
  clearEventListeners() {
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler, options)
      }
    })
    this.eventListeners.clear()
  }
  
  /**
   * 클래스 토글
   */
  toggleClass(className, force) {
    this.el.classList.toggle(className, force)
    return this
  }
  
  /**
   * 클래스 추가
   */
  addClass(className) {
    if (!className) return this
    
    // 공백으로 구분된 여러 클래스 처리
    const classes = className.split(/\s+/).filter(cls => cls.trim())
    classes.forEach(cls => this.el.classList.add(cls))
    
    return this
  }
  
  /**
   * 클래스 제거
   */
  removeClass(className) {
    if (!className) return this
    
    // 공백으로 구분된 여러 클래스 처리
    const classes = className.split(/\s+/).filter(cls => cls.trim())
    classes.forEach(cls => this.el.classList.remove(cls))
    
    return this
  }
  
  /**
   * 속성 설정
   */
  setAttribute(name, value) {
    this.el.setAttribute(name, value)
    return this
  }
  
  /**
   * 속성 가져오기
   */
  getAttribute(name) {
    return this.el.getAttribute(name)
  }
  
  /**
   * 스타일 설정
   */
  setStyle(property, value) {
    if (typeof property === 'object') {
      Object.assign(this.el.style, property)
    } else {
      this.el.style[property] = value
    }
    return this
  }
  
  /**
   * 애니메이션 유틸리티
   */
  animate(keyframes, options = {}) {
    if (!this.el.animate) {
      Logger.warn('⚠️  Web Animations API not supported')
      return Promise.resolve()
    }
    
    const animation = this.el.animate(keyframes, {
      duration: 300,
      easing: 'ease-out',
      ...options
    })
    
    return animation.finished
  }
  
  /**
   * 요소 표시
   */
  show() {
    this.el.style.display = ''
    this.removeClass('hidden')
    return this
  }
  
  /**
   * 요소 숨기기
   */
  hide() {
    this.el.style.display = 'none'
    this.addClass('hidden')
    return this
  }
  
  /**
   * 컴포넌트 정리 및 파괴
   */
  destroy() {
    if (this.isDestroyed) {
      return this
    }
    
    try {
      // 파괴 시작 이벤트
      this.emit('beforeDestroy')
      
      // 이벤트 리스너 정리
      this.clearEventListeners()
      
      // 모든 이벤트 리스너 제거
      this.removeAllListeners()
      
      // DOM에서 제거
      if (this.el && this.el.parentNode) {
        this.el.parentNode.removeChild(this.el)
      }
      
      // 상태 초기화
      this.isMounted = false
      this.isDestroyed = true
      
      // 파괴 완료 이벤트
      this.emit('destroyed')
      
      Logger.debug(`🗑️  Component destroyed: ${this.constructor.name}`)
      
    } catch (error) {
      Logger.error(`❌ Error destroying component ${this.constructor.name}:`, error)
    }
    
    return this
  }
}

export default Component 