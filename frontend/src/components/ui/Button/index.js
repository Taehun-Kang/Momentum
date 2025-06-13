/**
 * 🔘 Button - 재사용 가능한 버튼 컴포넌트
 * 
 * 기능:
 * - Variant (primary, secondary, ghost, danger)
 * - Size (small, medium, large)
 * - Icon 지원
 * - Loading 상태
 * - Disabled 상태
 * - 글래스모피즘 스타일
 */

import { Component } from '../../../core/Component.js'
import './Button.css'

export default class Button extends Component {
  static defaultProps = {
    variant: 'primary',     // primary, secondary, ghost, danger
    size: 'medium',         // small, medium, large
    type: 'button',         // button, submit, reset
    disabled: false,
    loading: false,
    fullWidth: false,
    touchFeedback: 'default', // default, glow, shake
    icon: null,             // 아이콘 (SVG 문자열 또는 emoji)
    iconPosition: 'left',   // left, right
    children: '',           // 버튼 텍스트
    onClick: null,
    className: ''
  }
  
  constructor(props = {}) {
    super({
      ...Button.defaultProps,
      ...props,
      tagName: 'button'
    })
    
    this.state = {
      isPressed: false,
      isHovered: false
    }
  }
  
  render() {
    this.updateClasses()
    this.updateAttributes()
    this.updateContent()
    this.bindEvents()
    
    return this
  }
  
  /**
   * CSS 클래스 업데이트
   */
  updateClasses() {
    const baseClass = 'button'
    const classes = [
      baseClass,
      `${baseClass}--${this.props.variant}`,
      `${baseClass}--${this.props.size}`,
      this.props.fullWidth ? `${baseClass}--full-width` : '',
      this.props.loading ? `${baseClass}--loading` : '',
      this.props.disabled ? `${baseClass}--disabled` : '',
      this.props.touchFeedback !== 'default' ? `${baseClass}--${this.props.touchFeedback}` : '',
      this.props.className
    ].filter(Boolean)
    
    this.el.className = classes.join(' ')
  }
  
  /**
   * 버튼 속성 업데이트
   */
  updateAttributes() {
    this.el.type = this.props.type
    this.el.disabled = this.props.disabled || this.props.loading
    
    // 접근성 속성
    if (this.props.loading) {
      this.el.setAttribute('aria-busy', 'true')
    } else {
      this.el.removeAttribute('aria-busy')
    }
  }
  
  /**
   * 버튼 내용 업데이트
   */
  updateContent() {
    const { icon, iconPosition, children, loading } = this.props
    
    let content = ''
    
    if (loading) {
      content = this.renderLoadingSpinner()
    } else if (icon && children) {
      // 아이콘 + 텍스트
      if (iconPosition === 'left') {
        content = `${this.renderIcon()} <span class="button__text">${children}</span>`
      } else {
        content = `<span class="button__text">${children}</span> ${this.renderIcon()}`
      }
    } else if (icon) {
      // 아이콘만
      content = this.renderIcon()
    } else {
      // 텍스트만
      content = `<span class="button__text">${children}</span>`
    }
    
    this.el.innerHTML = content
  }
  
  /**
   * 아이콘 렌더링
   */
  renderIcon() {
    const { icon } = this.props
    
    if (!icon) return ''
    
    // SVG 문자열인 경우
    if (icon.includes('<svg')) {
      return `<span class="button__icon">${icon}</span>`
    }
    
    // 이모지 또는 텍스트인 경우
    return `<span class="button__icon">${icon}</span>`
  }
  
  /**
   * 로딩 스피너 렌더링
   */
  renderLoadingSpinner() {
    return `<span class="button__spinner"></span>`
  }
  
  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 기존 이벤트 리스너들 제거 (중복 방지)
    this.unbindEvents()
    
    // 클릭 이벤트
    this.handleClickBound = this.handleClick.bind(this)
    this.el.addEventListener('click', this.handleClickBound)
    
    // 터치/마우스 이벤트 (시각적 피드백)
    this.handleMouseDownBound = this.handleMouseDown.bind(this)
    this.handleMouseUpBound = this.handleMouseUp.bind(this)
    this.handleMouseEnterBound = this.handleMouseEnter.bind(this)
    this.handleMouseLeaveBound = this.handleMouseLeave.bind(this)
    
    this.el.addEventListener('mousedown', this.handleMouseDownBound)
    this.el.addEventListener('mouseup', this.handleMouseUpBound)
    this.el.addEventListener('mouseenter', this.handleMouseEnterBound)
    this.el.addEventListener('mouseleave', this.handleMouseLeaveBound)
    
    // 터치 이벤트
    this.handleTouchStartBound = this.handleTouchStart.bind(this)
    this.handleTouchEndBound = this.handleTouchEnd.bind(this)
    
    this.el.addEventListener('touchstart', this.handleTouchStartBound, { passive: true })
    this.el.addEventListener('touchend', this.handleTouchEndBound, { passive: true })
    
    // 키보드 이벤트
    this.handleKeyDownBound = this.handleKeyDown.bind(this)
    this.el.addEventListener('keydown', this.handleKeyDownBound)
  }
  
  /**
   * 이벤트 언바인딩
   */
  unbindEvents() {
    if (this.handleClickBound) {
      this.el.removeEventListener('click', this.handleClickBound)
    }
    if (this.handleMouseDownBound) {
      this.el.removeEventListener('mousedown', this.handleMouseDownBound)
    }
    if (this.handleMouseUpBound) {
      this.el.removeEventListener('mouseup', this.handleMouseUpBound)
    }
    if (this.handleMouseEnterBound) {
      this.el.removeEventListener('mouseenter', this.handleMouseEnterBound)
    }
    if (this.handleMouseLeaveBound) {
      this.el.removeEventListener('mouseleave', this.handleMouseLeaveBound)
    }
    if (this.handleTouchStartBound) {
      this.el.removeEventListener('touchstart', this.handleTouchStartBound)
    }
    if (this.handleTouchEndBound) {
      this.el.removeEventListener('touchend', this.handleTouchEndBound)
    }
    if (this.handleKeyDownBound) {
      this.el.removeEventListener('keydown', this.handleKeyDownBound)
    }
  }
  
  /**
   * 클릭 핸들러
   */
  handleClick(event) {
    if (this.props.disabled || this.props.loading) {
      event.preventDefault()
      return
    }
    
    // 리플 효과
    this.createRippleEffect(event)
    
    // 커스텀 onClick 호출
    if (this.props.onClick) {
      this.props.onClick(event, this)
    }
    
    // 컴포넌트 이벤트 발생
    this.emit('click', { event, button: this })
  }
  
  /**
   * 마우스 다운 핸들러
   */
  handleMouseDown() {
    if (this.props.disabled || this.props.loading) return
    
    this.addClass('button--pressed')
  }
  
  /**
   * 마우스 업 핸들러
   */
  handleMouseUp() {
    this.removeClass('button--pressed')
  }
  
  /**
   * 마우스 엔터 핸들러
   */
  handleMouseEnter() {
    if (this.props.disabled || this.props.loading) return
    
    this.addClass('button--hovered')
  }
  
  /**
   * 마우스 리브 핸들러
   */
  handleMouseLeave() {
    this.removeClass('button--pressed button--hovered')
  }
  
  /**
   * 터치 시작 핸들러
   */
  handleTouchStart() {
    if (this.props.disabled || this.props.loading) return
    
    this.addClass('button--pressed')
  }
  
  /**
   * 터치 끝 핸들러
   */
  handleTouchEnd() {
    setTimeout(() => {
      this.removeClass('button--pressed')
    }, 150)
  }
  
  /**
   * 키보드 핸들러
   */
  handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.handleClick(event)
    }
  }
  
  /**
   * 리플 효과 생성
   */
  createRippleEffect(event) {
    const ripple = document.createElement('span')
    const rect = this.el.getBoundingClientRect()
    
    // 클릭 위치 계산
    const x = (event.clientX || event.touches?.[0]?.clientX) - rect.left
    const y = (event.clientY || event.touches?.[0]?.clientY) - rect.top
    
    ripple.className = 'button__ripple'
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    
    this.el.appendChild(ripple)
    
    // 애니메이션 완료 후 제거
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    }, 600)
  }
  
  /**
   * 버튼 상태 업데이트
   */
  setLoading(loading) {
    this.updateProps({ loading })
  }
  
  setDisabled(disabled) {
    this.updateProps({ disabled })
  }
  
  setText(children) {
    this.updateProps({ children })
  }
  
  setIcon(icon) {
    this.updateProps({ icon })
  }
  
  setVariant(variant) {
    this.updateProps({ variant })
  }
  
  setTouchFeedback(touchFeedback) {
    this.updateProps({ touchFeedback })
    }
    
  /**
   * 컴포넌트 정리
   */
  destroy() {
    // 이벤트 리스너 제거
    this.unbindEvents()
    
    // 기존 리플 요소들 제거
    const ripples = this.el.querySelectorAll('.button__ripple')
    ripples.forEach(ripple => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    })
    
    // 부모 클래스의 destroy 호출
    super.destroy?.()
  }
} 