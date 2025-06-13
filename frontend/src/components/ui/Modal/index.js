/**
 * 🎭 Modal - 모달 컴포넌트
 * 
 * 4가지 variant: alert, confirm, content, bottom-sheet
 * 브라우저 기본 alert/confirm을 대체, 글래스모피즘 디자인
 */

import { Component } from '../../../core/Component.js'
import Button from '../Button/index.js'
import './Modal.css'

export default class Modal extends Component {
  static defaultProps = {
    variant: 'content', // alert, confirm, content, bottom-sheet
    size: 'medium', // small, medium, large
    title: '',
    message: '',
    content: '',
    showOverlay: true,
    closeOnOverlayClick: true,
    closeOnEscape: true,
    showCloseButton: true,
    
    // 버튼 설정 (간결한 텍스트)
    confirmText: '확인',
    cancelText: '취소',
    showCancel: true,
    
    // 터치 피드백 설정
    confirmTouchFeedback: 'glow', // 확인 버튼은 기본적으로 glow
    cancelTouchFeedback: 'default', // 취소 버튼은 기본값
    
    // 이벤트 핸들러
    onOpen: null,
    onClose: null,
    onConfirm: null,
    onCancel: null,
    
    // 클래스명
    className: '',
    
    // Component 자동 렌더링 방지
    autoRender: false
  }
  
  constructor(props = {}) {
    super({
      ...Modal.defaultProps,
      ...props
    })
    
    this.isOpen = false
    this.focusedElementBeforeModal = null
    this.modalStack = Modal.modalStack || []
    
    // Button 인스턴스들을 관리
    this.buttons = {
      confirm: null,
      cancel: null
    }
    
    // 정적 스택 관리
    if (!Modal.modalStack) {
      Modal.modalStack = []
    }
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
      'modal-wrapper',
      `modal--${this.props.variant}`,
      `modal--${this.props.size}`,
      this.props.className
    ].filter(Boolean)
    
    this.el.className = classes.join(' ')
    
    // HTML 생성
    this.el.innerHTML = this.generateHTML()
    
    // body에 추가
    document.body.appendChild(this.el)
  }
  
  /**
   * HTML 생성
   */
  generateHTML() {
    const { variant, showOverlay, showCloseButton } = this.props
    
    return `
      ${showOverlay ? '<div class="modal-overlay"></div>' : ''}
      
      <div class="modal-container" role="dialog" aria-modal="true" tabindex="-1">
        <div class="modal-content">
          ${showCloseButton ? `
            <button class="modal-close-btn" type="button" aria-label="모달 닫기">
              <svg class="modal-close-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m18 6-12 12"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>
          ` : ''}
          
          ${this.generateContentByVariant()}
        </div>
      </div>
    `
  }
  
  /**
   * Variant별 콘텐츠 생성
   */
  generateContentByVariant() {
    const { variant } = this.props
    
    switch (variant) {
      case 'alert':
        return this.generateAlertContent()
      case 'confirm':
        return this.generateConfirmContent()
      case 'bottom-sheet':
        return this.generateBottomSheetContent()
      case 'content':
      default:
        return this.generateContentModalContent()
    }
  }
  
  /**
   * Alert 모달 콘텐츠
   */
  generateAlertContent() {
    const { title, message } = this.props
    
    return `
      <div class="modal-body">
        ${title ? `<div class="modal-title">${title}</div>` : ''}
        <div class="modal-message">${message}</div>
      </div>
      
      <div class="modal-footer">
        <div class="modal-confirm-btn-container"></div>
      </div>
    `
  }
  
  /**
   * Confirm 모달 콘텐츠
   */
  generateConfirmContent() {
    const { title, message, showCancel } = this.props
    
    return `
      <div class="modal-body">
        ${title ? `<div class="modal-title">${title}</div>` : ''}
        <div class="modal-message">${message}</div>
      </div>
      
      <div class="modal-footer">
        ${showCancel ? '<div class="modal-cancel-btn-container"></div>' : ''}
        <div class="modal-confirm-btn-container"></div>
      </div>
    `
  }
  
  /**
   * Content 모달 콘텐츠
   */
  generateContentModalContent() {
    const { title, content } = this.props
    
    return `
      <div class="modal-body">
        ${title ? `<div class="modal-title">${title}</div>` : ''}
        <div class="modal-content-area">
          ${content}
        </div>
      </div>
    `
  }
  
  /**
   * Bottom Sheet 콘텐츠
   */
  generateBottomSheetContent() {
    const { title, content } = this.props
    
    return `
      <div class="modal-handle"></div>
      
      <div class="modal-body">
        ${title ? `<div class="modal-title">${title}</div>` : ''}
        <div class="modal-content-area">
          ${content}
        </div>
      </div>
    `
  }
  
  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // Button 컴포넌트들 생성 (Alert/Confirm variant에서만)
    if (this.props.variant === 'alert' || this.props.variant === 'confirm') {
      this.createModalButtons()
    }
    
    // 오버레이 클릭
    if (this.props.closeOnOverlayClick) {
      const overlay = this.el.querySelector('.modal-overlay')
      if (overlay) {
        overlay.addEventListener('click', () => this.close())
      }
    }
    
    // 닫기 버튼
    const closeBtn = this.el.querySelector('.modal-close-btn')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close())
    }
    
    // ESC 키
    if (this.props.closeOnEscape) {
      this.escapeHandler = (e) => {
        if (e.key === 'Escape' && this.isTopModal()) {
          this.close()
        }
      }
      document.addEventListener('keydown', this.escapeHandler)
    }
    
    // 포커스 트랩
    this.setupFocusTrap()
  }
  
  /**
   * Modal 버튼들 생성
   */
  createModalButtons() {
    const { 
      variant, 
      confirmText, 
      cancelText, 
      showCancel,
      confirmTouchFeedback,
      cancelTouchFeedback
    } = this.props
    
    // Confirm 버튼 생성
    this.buttons.confirm = new Button({
      variant: 'primary',
      size: 'medium',
      fullWidth: true,
      touchFeedback: confirmTouchFeedback,
      children: confirmText,
      onClick: () => this.handleAction('confirm')
    })
    
    const confirmContainer = this.el.querySelector('.modal-confirm-btn-container')
    if (confirmContainer) {
      confirmContainer.appendChild(this.buttons.confirm.render().el)
    }
    
    // Cancel 버튼 생성 (Confirm variant에서만)
    if (variant === 'confirm' && showCancel) {
      this.buttons.cancel = new Button({
        variant: 'secondary',
        size: 'medium',
        fullWidth: true,
        touchFeedback: cancelTouchFeedback,
        children: cancelText,
        onClick: () => this.handleAction('cancel')
      })
      
      const cancelContainer = this.el.querySelector('.modal-cancel-btn-container')
      if (cancelContainer) {
        cancelContainer.appendChild(this.buttons.cancel.render().el)
      }
    }
  }
  
  /**
   * 액션 처리
   */
  handleAction(action) {
    switch (action) {
      case 'confirm':
        if (this.props.onConfirm) {
          this.props.onConfirm()
        }
        this.close()
        break
        
      case 'cancel':
        if (this.props.onCancel) {
          this.props.onCancel()
        }
        this.close()
        break
    }
  }
  
  /**
   * 포커스 트랩 설정
   */
  setupFocusTrap() {
    const container = this.el.querySelector('.modal-container')
    if (!container) return
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), .button'
    )
    
    if (focusableElements.length === 0) return
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    this.focusTrapHandler = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }
    
    container.addEventListener('keydown', this.focusTrapHandler)
  }
  
  /**
   * 모달 열기
   */
  open() {
    if (this.isOpen) return this
    
    // 현재 포커스된 요소 저장
    this.focusedElementBeforeModal = document.activeElement
    
    // 스택에 추가
    Modal.modalStack.push(this)
    
    // body 스크롤 방지
    this.preventBodyScroll()
    
    // 모달 표시
    this.el.style.display = 'flex'
    this.isOpen = true
    
    // 애니메이션 시작
    requestAnimationFrame(() => {
      this.el.classList.add('modal--open')
    })
    
    // 포커스 설정
    setTimeout(() => {
      const container = this.el.querySelector('.modal-container')
      if (container) {
        container.focus()
      }
    }, 100)
    
    // onOpen 콜백
    if (this.props.onOpen) {
      this.props.onOpen()
    }
    
    return this
  }
  
  /**
   * 모달 닫기
   */
  close() {
    if (!this.isOpen) return this
    
    // 닫기 애니메이션
    this.el.classList.add('modal--closing')
    this.el.classList.remove('modal--open')
    
    setTimeout(() => {
      // 스택에서 제거
      const index = Modal.modalStack.indexOf(this)
      if (index > -1) {
        Modal.modalStack.splice(index, 1)
      }
      
      // body 스크롤 복원 (다른 모달이 없을 때만)
      if (Modal.modalStack.length === 0) {
        this.restoreBodyScroll()
      }
      
      // 포커스 복원
      if (this.focusedElementBeforeModal) {
        this.focusedElementBeforeModal.focus()
      }
      
      // 엘리먼트 숨기기
      this.el.style.display = 'none'
      this.el.classList.remove('modal--closing')
      this.isOpen = false
      
      // onClose 콜백
      if (this.props.onClose) {
        this.props.onClose()
      }
    }, 300) // CSS 애니메이션 시간과 동일
    
    return this
  }
  
  /**
   * 현재 모달이 최상위인지 확인
   */
  isTopModal() {
    return Modal.modalStack[Modal.modalStack.length - 1] === this
  }
  
  /**
   * body 스크롤 방지
   */
  preventBodyScroll() {
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = this.getScrollbarWidth() + 'px'
  }
  
  /**
   * body 스크롤 복원
   */
  restoreBodyScroll() {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  }
  
  /**
   * 스크롤바 너비 계산
   */
  getScrollbarWidth() {
    const scrollDiv = document.createElement('div')
    scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;'
    document.body.appendChild(scrollDiv)
    const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
    document.body.removeChild(scrollDiv)
    return scrollbarWidth
  }
  
  /**
   * 컴포넌트 제거 시 정리
   */
  destroy() {
    // 모달이 열려있으면 닫기
    if (this.isOpen) {
      this.close()
    }
    
    // Button 인스턴스들 정리
    if (this.buttons.confirm) {
      this.buttons.confirm.destroy()
      this.buttons.confirm = null
    }
    
    if (this.buttons.cancel) {
      this.buttons.cancel.destroy()
      this.buttons.cancel = null
    }
    
    // 이벤트 리스너 제거
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler)
    }
    
    if (this.focusTrapHandler) {
      const container = this.el.querySelector('.modal-container')
      if (container) {
        container.removeEventListener('keydown', this.focusTrapHandler)
      }
    }
    
    // 부모 destroy 호출
    super.destroy()
  }
}

/**
 * 정적 메서드들 - 간편한 사용을 위한 팩토리 메서드들
 */

/**
 * Alert 모달 표시
 */
Modal.alert = function(message, options = {}) {
  const modal = new Modal({
    variant: 'alert',
    message,
    size: 'small',
    showCancel: false,
    ...options
  })
  
  modal.render()
  modal.open()
  
  return modal
}

/**
 * Confirm 모달 표시
 */
Modal.confirm = function(message, options = {}) {
  return new Promise((resolve) => {
    const modal = new Modal({
      variant: 'confirm',
      message,
      size: 'small',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
      onClose: () => resolve(false),
      ...options
    })
    
    modal.render()
    modal.open()
  })
}

/**
 * Content 모달 표시
 */
Modal.content = function(options = {}) {
  const modal = new Modal({
    variant: 'content',
    ...options
  })
  
  modal.render()
  modal.open()
  
  return modal
}

/**
 * Bottom Sheet 모달 표시
 */
Modal.bottomSheet = function(options = {}) {
  const modal = new Modal({
    variant: 'bottom-sheet',
    size: 'medium',
    ...options
  })
  
  modal.render()
  modal.open()
  
  return modal
}

/**
 * 삭제 확인 모달 (위험한 액션)
 */
Modal.delete = function(message, options = {}) {
  return new Promise((resolve) => {
    const modal = new Modal({
      variant: 'confirm',
      title: '삭제 확인',
      message,
      size: 'small',
      confirmText: '삭제',
      cancelText: '취소',
      confirmTouchFeedback: 'shake', // 위험한 액션이므로 shake
      cancelTouchFeedback: 'default',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
      onClose: () => resolve(false),
      ...options
    })
    
    // createModalButtons를 오버라이드해서 확인 버튼을 danger variant로 생성
    modal.createModalButtons = function() {
      const { 
        variant, 
        confirmText, 
        cancelText, 
        showCancel,
        confirmTouchFeedback,
        cancelTouchFeedback
      } = this.props
      
      // Confirm 버튼을 danger variant로 생성
      this.buttons.confirm = new Button({
        variant: 'danger', // 삭제용이므로 danger
        size: 'medium',
        fullWidth: true,
        touchFeedback: confirmTouchFeedback,
        children: confirmText,
        onClick: () => this.handleAction('confirm')
      })
      
      const confirmContainer = this.el.querySelector('.modal-confirm-btn-container')
      if (confirmContainer) {
        confirmContainer.appendChild(this.buttons.confirm.render().el)
      }
      
      // Cancel 버튼 생성
      if (variant === 'confirm' && showCancel) {
        this.buttons.cancel = new Button({
          variant: 'secondary',
          size: 'medium',
          fullWidth: true,
          touchFeedback: cancelTouchFeedback,
          children: cancelText,
          onClick: () => this.handleAction('cancel')
        })
        
        const cancelContainer = this.el.querySelector('.modal-cancel-btn-container')
        if (cancelContainer) {
          cancelContainer.appendChild(this.buttons.cancel.render().el)
        }
      }
    }
    
    modal.render()
    modal.open()
  })
}

/**
 * 경고 모달
 */
Modal.warning = function(message, options = {}) {
  const modal = new Modal({
    variant: 'alert',
    title: '⚠️ 경고',
    message,
    size: 'small',
    confirmText: '확인',
    confirmTouchFeedback: 'shake',
    ...options
  })
  
  modal.render()
  modal.open()
  
  return modal
}

/**
 * 성공 알림 모달
 */
Modal.success = function(message, options = {}) {
  const modal = new Modal({
    variant: 'alert',
    title: '✅ 성공',
    message,
    size: 'small',
    confirmText: '확인',
    confirmTouchFeedback: 'glow',
    ...options
  })
  
  modal.render()
  modal.open()
  
  return modal
}

export { Modal } 