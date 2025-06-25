import { Component } from '../../../core/Component.js'
import './SkeletonCard.css'

export default class SkeletonCard extends Component {
  constructor(options = {}) {
    super(options)
    
    this.loadingMessage = options.loadingMessage || '로딩 중...'
    this.index = options.index || 0
    
    this.render()
  }
  
  render() {
    this.el.className = 'skeleton-card shimmer'
    this.el.innerHTML = '' // 완전히 빈 박스
    
    // 접근성
    this.el.setAttribute('aria-label', '로딩 중')
    this.el.setAttribute('role', 'status')
    
    return this
  }
  
  // 클릭 방지 (빈 메서드)
  onClick() {
    return false
  }
}
