/**
 * 🏷️ Tag - 태그 컴포넌트
 * 
 * 4가지 variant: default, selected, removable, outlined
 * 글래스모피즘 디자인, 선택/삭제 기능, 완벽한 일관성
 */

import { Component } from '../../../core/Component.js'
import './Tag.css'

export default class Tag extends Component {
  static defaultProps = {
    variant: 'default', // default, selected, removable, outlined
    text: '태그',
    selected: false,
    disabled: false,
    size: 'medium', // small, medium, large
    className: '',
    
    // 이벤트 핸들러
    onClick: null,
    onRemove: null
  }
  
  constructor(props = {}) {
    super({
      ...Tag.defaultProps,
      ...props
    })
    
    this.isSelected = this.props.selected || this.props.variant === 'selected'
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
      'tag',
      `tag--${this.props.variant}`,
      `tag--${this.props.size}`,
      this.isSelected ? 'tag--selected' : '',
      this.props.disabled ? 'tag--disabled' : '',
      this.props.className
    ].filter(Boolean)
    
    this.el.className = classes.join(' ')
    
    // HTML 생성
    this.el.innerHTML = this.generateHTML()
  }
  
  /**
   * HTML 생성
   */
  generateHTML() {
    const { variant, text, disabled } = this.props
    
    // 삭제 아이콘 SVG
    const removeIcon = `
      <svg class="tag-remove-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m18 6-12 12"/>
        <path d="m6 6 12 12"/>
      </svg>
    `
    
    return `
      <span class="tag-content">
        <span class="tag-text">${text}</span>
        ${variant === 'removable' && !disabled ? `
          <button class="tag-remove-btn" type="button" aria-label="태그 제거">
            ${removeIcon}
          </button>
        ` : ''}
      </span>
    `
  }
  
  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    if (this.props.disabled) return
    
    // 태그 클릭 이벤트
    this.el.addEventListener('click', (e) => {
      // 삭제 버튼 클릭인 경우 무시
      if (e.target.closest('.tag-remove-btn')) return
      
      this.handleClick(e)
    })
    
    // 삭제 버튼 이벤트
    const removeBtn = this.el.querySelector('.tag-remove-btn')
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation() // 부모 클릭 이벤트 방지
        this.handleRemove(e)
      })
    }
  }
  
  /**
   * 클릭 처리
   */
  handleClick(e) {
    // 선택 상태 토글 (default variant에서만)
    if (this.props.variant === 'default') {
      this.toggleSelection()
    }
    
    // onClick 콜백
    if (this.props.onClick) {
      this.props.onClick(this.props.text, this.isSelected, e)
    }
  }
  
  /**
   * 삭제 처리
   */
  handleRemove(e) {
    if (this.props.onRemove) {
      this.props.onRemove(this.props.text, e)
    }
  }
  
  /**
   * 선택 상태 토글
   */
  toggleSelection() {
    this.isSelected = !this.isSelected
    
    if (this.isSelected) {
      this.el.classList.add('tag--selected')
    } else {
      this.el.classList.remove('tag--selected')
    }
  }
  
  /**
   * 선택 상태 설정
   */
  setSelected(selected) {
    this.isSelected = selected
    this.props.selected = selected
    
    if (selected) {
      this.el.classList.add('tag--selected')
    } else {
      this.el.classList.remove('tag--selected')
    }
  }
  
  /**
   * 선택 상태 가져오기
   */
  getSelected() {
    return this.isSelected
  }
  
  /**
   * 텍스트 설정
   */
  setText(text) {
    this.props.text = text
    const textElement = this.el.querySelector('.tag-text')
    if (textElement) {
      textElement.textContent = text
    }
  }
  
  /**
   * 텍스트 가져오기
   */
  getText() {
    return this.props.text
  }
  
  /**
   * 비활성화 상태 설정
   */
  setDisabled(disabled) {
    this.props.disabled = disabled
    
    if (disabled) {
      this.el.classList.add('tag--disabled')
    } else {
      this.el.classList.remove('tag--disabled')
    }
  }
  
  /**
   * variant 변경
   */
  setVariant(variant) {
    // 기존 variant 클래스 제거
    this.el.classList.remove(`tag--${this.props.variant}`)
    
    // 새 variant 설정
    this.props.variant = variant
    this.el.classList.add(`tag--${variant}`)
    
    // HTML 다시 생성 (removable 버튼 처리)
    this.el.innerHTML = this.generateHTML()
    this.setupEventListeners()
  }
  
  /**
   * 컴포넌트 제거 시 정리
   */
  destroy() {
    // 이벤트 리스너 자동 제거 (엘리먼트와 함께)
    super.destroy()
  }
} 