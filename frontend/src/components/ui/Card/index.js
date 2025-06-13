import { Component } from '../../../core/Component.js'
import './Card.css'

export default class SelectableCard extends Component {
  static defaultProps = {
    icon: '',
    title: '',
    description: '',
    value: '',
    variant: 'glass',
    size: 'medium',
    selected: false,
    selectedColor: 'purple',
    disabled: false,
    onClick: null,
    onSelect: null,
    onDeselect: null,
    className: ''
  }
  
  constructor(props = {}) {
    super({
      ...SelectableCard.defaultProps,
      ...props,
      tagName: 'div'
    })
    
    // isSelected 초기값을 명확히 boolean으로 설정
    this.isSelected = Boolean(this.props.selected)
  }
  
  /**
   * 같은 컨테이너의 다른 카드들 선택 해제
   */
  deselectSiblings() {
    if (!this.el.parentNode) return
    
    // 같은 부모 컨테이너 내의 모든 SelectableCard 찾기
    const siblingCards = this.el.parentNode.querySelectorAll('.card')
    
    siblingCards.forEach(cardEl => {
      // 자기 자신은 제외
      if (cardEl !== this.el && cardEl._component && cardEl._component.isSelected) {
        cardEl._component.deselect()
      }
    })
  }
  
  render() {
    this.updateElement()
    this.bindEvents()
    
    // DOM 요소에 컴포넌트 참조 저장 (형제 카드 찾기용)
    this.el._component = this
    
    return this
  }
  
  updateElement() {
    const classes = [
      'card',
      `card--${this.props.variant}`,
      `card--${this.props.size}`,
      this.isSelected ? 'card--selected' : '',
      this.isSelected ? `card--${this.props.selectedColor}` : '',
      this.props.disabled ? 'card--disabled' : '',
      this.props.className
    ].filter(Boolean)
    
    this.el.className = classes.join(' ')
    
    // 처음 렌더링시에만 innerHTML 설정
    if (!this.el.querySelector('.card__inner')) {
    let iconHtml = ''
    if (this.props.icon) {
      iconHtml = `<div class="card__icon">${this.props.icon}</div>`
    }
    
    let contentHtml = ''
    if (this.props.title || this.props.description) {
      contentHtml = `
        <div class="card__content">
          ${this.props.title ? `<h3 class="card__title">${this.props.title}</h3>` : ''}
          ${this.props.description ? `<p class="card__description">${this.props.description}</p>` : ''}
        </div>
      `
    }
    
    this.el.innerHTML = `
      <div class="card__inner">
        ${iconHtml}
        ${contentHtml}
      </div>
    `
    }
  }
  
  bindEvents() {
    if (this.props.disabled) return
    
    // 기존 이벤트 리스너 제거 (중복 방지)
    this.el.removeEventListener('click', this.handleClick)
    
    // 클릭 핸들러를 인스턴스 메서드로 바인딩
    this.handleClick = (event) => {
      // 🎯 클릭 애니메이션 추가
      this.playClickAnimation()
      
      // 선택/해제 동작 제거 - ChatFlow에서 처리
      // this.toggle()
      
      if (this.props.onClick) {
        this.props.onClick(event, this)
      }
    }
    
    // 이벤트 리스너 추가
    this.el.addEventListener('click', this.handleClick)
  }
  
  /**
   * 🎯 클릭 애니메이션 재생
   */
  playClickAnimation() {
    console.log('🎯 Click animation started') // 디버깅용
    
    // 기존 애니메이션 클래스 제거
    this.el.classList.remove('card--clicking')
    
    // 강제로 리플로우 발생시켜 클래스 제거 확실히 적용
    this.el.offsetHeight
    
    // 인라인 스타일로 확실한 애니메이션 적용
    this.el.style.transform = 'scale(0.9)'
    this.el.style.transition = 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
    
    // 애니메이션 클래스도 추가 (CSS 우선순위 높이기 위해)
    this.el.classList.add('card--clicking')
    console.log('🎯 Added card--clicking class and inline styles') // 디버깅용
    
    // 애니메이션 완료 후 원래 상태로 복원
    setTimeout(() => {
      if (this.el) {
        this.el.style.transform = 'scale(1)'
        this.el.classList.remove('card--clicking')
        
        // 추가로 잠시 후 인라인 스타일 제거
        setTimeout(() => {
          if (this.el) {
            this.el.style.transform = ''
            this.el.style.transition = ''
          }
        }, 200) // transition 완료 후 제거
        
        console.log('🎯 Removed card--clicking class and restored scale') // 디버깅용
      }
    }, 150)
  }
  
  toggle() {
    if (this.isSelected) {
      this.deselect()
    } else {
      this.select()
    }
  }
  
  select() {
    if (this.props.disabled || this.isSelected) return
    
    // 같은 컨테이너의 다른 카드들 먼저 해제
    this.deselectSiblings()
    
    this.isSelected = true
    this.updateElement()
    
    this.emit('select', { value: this.props.value, card: this })
    
    if (this.props.onSelect) {
      this.props.onSelect(this)
    }
  }
  
  deselect() {
    if (this.props.disabled || !this.isSelected) return
    
    this.isSelected = false
    this.updateElement()
    
    this.emit('deselect', { value: this.props.value, card: this })
    
    if (this.props.onDeselect) {
      this.props.onDeselect(this)
    }
  }
  
  setSelected(selected) {
    if (selected) {
      this.select()
    } else {
      this.deselect()
    }
  }
  
  getSelected() {
    return this.isSelected
  }
  
  /**
   * 컴포넌트 정리
   */
  destroy() {
    // 이벤트 리스너 제거
    if (this.handleClick) {
      this.el.removeEventListener('click', this.handleClick)
    }
    
    if (this.el) {
      this.el._component = null
    }
    super.destroy?.()
  }
} 