/**
 * 📝 Input - 텍스트 입력 컴포넌트
 * 
 * 3가지 variant: default, chat, search
 * 글래스모피즘 디자인, 자동 리사이즈, SVG 아이콘 지원
 */

import { Component } from '../../../core/Component.js'
import './Input.css'

export default class Input extends Component {
  static defaultProps = {
    variant: 'default', // default, chat, search
    placeholder: '텍스트를 입력하세요',
    value: '',
    disabled: false,
    showSendButton: false,
    autoResize: true, // chat variant에서 자동 리사이즈
    maxRows: 4,
    className: '',
    
    // 이벤트 핸들러
    onChange: null,
    onSend: null,
    onFocus: null,
    onBlur: null,
    onKeyPress: null
  }
  
  constructor(props = {}) {
    super({
      ...Input.defaultProps,
      ...props
    })
    
    this.inputElement = null
    this.isTextarea = this.props.variant === 'chat'
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
      'input-container',
      `input-container--${this.props.variant}`,
      this.props.disabled ? 'input-container--disabled' : '',
      this.props.className
    ].filter(Boolean)
    
    this.el.className = classes.join(' ')
    
    // HTML 생성
    this.el.innerHTML = this.generateHTML()
    
    // 입력 엘리먼트 참조 저장
    this.inputElement = this.el.querySelector('.input-field')
    
    // 초기 값 설정
    if (this.props.value) {
      this.inputElement.value = this.props.value
    }
  }
  
  /**
   * HTML 생성
   */
  generateHTML() {
    const { variant, placeholder, disabled, showSendButton } = this.props
    
    // 아이콘 SVG
    const searchIcon = `
      <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    `
    
    const sendIcon = `
      <svg class="send-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m22 2-7 20-4-9-9-4Z"/>
        <path d="M22 2 11 13"/>
      </svg>
    `
    
    // 입력 필드 생성
    const inputField = this.isTextarea 
      ? `<textarea class="input-field" placeholder="${placeholder}" ${disabled ? 'disabled' : ''} rows="1"></textarea>`
      : `<input type="text" class="input-field" placeholder="${placeholder}" ${disabled ? 'disabled' : ''}>`
    
    return `
      <div class="input-wrapper">
        ${variant === 'search' ? `<div class="input-icon-wrapper">${searchIcon}</div>` : ''}
        ${inputField}
        ${showSendButton || variant === 'chat' ? `
          <button class="send-button" ${disabled ? 'disabled' : ''} type="button">
            ${sendIcon}
          </button>
        ` : ''}
      </div>
    `
  }
  
  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    if (!this.inputElement) return
    
    // 입력 이벤트
    this.inputElement.addEventListener('input', (e) => {
      this.handleInput(e)
    })
    
    // 포커스 이벤트
    this.inputElement.addEventListener('focus', (e) => {
      this.el.classList.add('input-container--focused')
      if (this.props.onFocus) {
        this.props.onFocus(e)
      }
    })
    
    // 블러 이벤트
    this.inputElement.addEventListener('blur', (e) => {
      this.el.classList.remove('input-container--focused')
      if (this.props.onBlur) {
        this.props.onBlur(e)
      }
    })
    
    // 키 이벤트
    this.inputElement.addEventListener('keypress', (e) => {
      if (this.props.onKeyPress) {
        this.props.onKeyPress(e)
      }
      
      // Enter 키 처리
      if (e.key === 'Enter') {
        if (this.props.variant === 'chat' && !e.shiftKey) {
          e.preventDefault()
          this.handleSend()
        } else if (this.props.variant !== 'chat') {
          e.preventDefault()
          this.handleSend()
        }
      }
    })
    
    // 전송 버튼 이벤트
    const sendButton = this.el.querySelector('.send-button')
    if (sendButton) {
      sendButton.addEventListener('click', () => {
        this.handleSend()
      })
    }
  }
  
  /**
   * 입력 처리
   */
  handleInput(e) {
    const value = e.target.value
    
    // 자동 리사이즈 (chat variant)
    if (this.isTextarea && this.props.autoResize) {
      this.autoResize()
    }
    
    // onChange 콜백
    if (this.props.onChange) {
      this.props.onChange(value, e)
    }
    
    // 전송 버튼 상태 업데이트
    this.updateSendButton()
  }
  
  /**
   * 전송 처리
   */
  handleSend() {
    const value = this.getValue().trim()
    
    if (value && this.props.onSend) {
      this.props.onSend(value)
      this.clear()
    }
  }
  
  /**
   * 자동 리사이즈 (textarea)
   */
  autoResize() {
    if (!this.isTextarea) return
    
    const element = this.inputElement
    const maxRows = this.props.maxRows || 4
    
    // 높이 초기화
    element.style.height = 'auto'
    
    // 스크롤 높이 계산
    const scrollHeight = element.scrollHeight
    const lineHeight = parseInt(getComputedStyle(element).lineHeight)
    const maxHeight = lineHeight * maxRows
    
    // 최대 높이 제한
    element.style.height = Math.min(scrollHeight, maxHeight) + 'px'
    element.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
  }
  
  /**
   * 전송 버튼 상태 업데이트
   */
  updateSendButton() {
    const sendButton = this.el.querySelector('.send-button')
    if (!sendButton) return
    
    const hasValue = this.getValue().trim().length > 0
    
    if (hasValue) {
      sendButton.classList.add('send-button--active')
      sendButton.disabled = false
    } else {
      sendButton.classList.remove('send-button--active')
      sendButton.disabled = this.props.variant === 'chat'
    }
  }
  
  /**
   * 값 가져오기
   */
  getValue() {
    return this.inputElement ? this.inputElement.value : ''
  }
  
  /**
   * 값 설정
   */
  setValue(value) {
    if (this.inputElement) {
      this.inputElement.value = value
      this.updateSendButton()
      
      if (this.isTextarea && this.props.autoResize) {
        this.autoResize()
      }
    }
  }
  
  /**
   * 입력 내용 지우기
   */
  clear() {
    this.setValue('')
  }
  
  /**
   * 포커스
   */
  focus() {
    if (this.inputElement) {
      this.inputElement.focus()
    }
  }
  
  /**
   * 비활성화 상태 설정
   */
  setDisabled(disabled) {
    this.props.disabled = disabled
    
    if (this.inputElement) {
      this.inputElement.disabled = disabled
    }
    
    const sendButton = this.el.querySelector('.send-button')
    if (sendButton) {
      sendButton.disabled = disabled || (this.props.variant === 'chat' && !this.getValue().trim())
    }
    
    if (disabled) {
      this.el.classList.add('input-container--disabled')
    } else {
      this.el.classList.remove('input-container--disabled')
    }
  }
  
  /**
   * placeholder 업데이트
   */
  setPlaceholder(placeholder) {
    this.props.placeholder = placeholder
    if (this.inputElement) {
      this.inputElement.placeholder = placeholder
    }
  }
  
  /**
   * 컴포넌트 제거 시 정리
   */
  destroy() {
    // 이벤트 리스너 자동 제거 (엘리먼트와 함께)
    super.destroy()
  }
} 