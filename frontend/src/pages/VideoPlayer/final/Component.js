/**
 * 🧩 Component - Old 시스템 기반 간단한 Component 클래스
 * 
 * VideoPlayer 전용으로 단순화된 Component 시스템
 */

export class Component {
  constructor(options = {}) {
    this.el = document.createElement(options.tagName || 'div')
    if (options.className) {
      this.el.className = options.className
    }
    // render()는 자동으로 호출하지 않음 - 각 컴포넌트에서 수동 호출
  }
  
  render() {
    // Override in child classes
  }
  
  destroy() {
    // Override in child classes for cleanup
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el)
    }
  }
}

// 네비게이션 헬퍼 (간단버전)
export function navigateTo(path) {
  if (path === 'home' || path === '#/' || path === '/') {
    window.location.hash = '#/'
  } else {
    window.location.hash = path
  }
}

export default Component 