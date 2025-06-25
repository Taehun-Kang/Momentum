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
      <div class="skeleton-inner">
        <!-- 보이지 않는 아이콘 (크기 맞추기용) -->
        <div class="skeleton-icon">🎯</div>
        
        <!-- 보이지 않는 제목 (크기 맞추기용) -->
        <div class="skeleton-title">샘플 제목 텍스트</div>
        
        <!-- 보이지 않는 설명 (크기 맞추기용) -->
        <div class="skeleton-description">
          샘플 설명 텍스트가 여기에 들어갑니다<br>
          두 번째 줄 설명 텍스트
        </div>
      </div>
    `
    
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
