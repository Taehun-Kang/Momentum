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
    this.el.className = 'skeleton-card'
    this.el.innerHTML = `
      <div class="skeleton-content">
        <!-- Skeleton 아이콘 -->
        <div class="skeleton-icon shimmer"></div>
        
        <!-- Skeleton 제목 -->
        <div class="skeleton-title shimmer"></div>
        
        <!-- Skeleton 설명 (2줄) -->
        <div class="skeleton-description">
          <div class="skeleton-line shimmer"></div>
          <div class="skeleton-line shimmer"></div>
        </div>
        
        <!-- 로딩 메시지 -->
        <div class="skeleton-loading-message">
          ${this.loadingMessage}
        </div>
      </div>
    `
    
    // 순차 등장 애니메이션은 ChatFlow.css에서 처리하므로 제거
    // this.el.style.animationDelay = `${this.index * 200}ms`
    
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
