/**
 * 🎨 LoadingSpinner 컴포넌트
 * 화면 전체를 덮는 로딩 스피너 컴포넌트
 * CSS와 독립적으로 테스트 가능한 구조
 */

import Component from '../../../core/Component.js'

export default class LoadingSpinner extends Component {
  constructor(props = {}) {
    super(props)
    
    // 기본 props 설정
    this.text = props.text || '로딩 중...'
    this.visible = props.visible !== undefined ? props.visible : true
    this.onClose = props.onClose || null
    
    // CSS 파일 로드
    this.loadCSS()
    
    console.log('🎨 LoadingSpinner 생성:', { text: this.text, visible: this.visible })
  }
  
  /**
   * 🎨 CSS 파일 동적 로드
   */
  loadCSS() {
    const cssId = 'unique-loading-spinner-css'
    
    // 이미 로드된 경우 건너뛰기
    if (document.getElementById(cssId)) {
      return
    }
    
    const link = document.createElement('link')
    link.id = cssId
    link.rel = 'stylesheet'
    link.href = '/src/components/ui/LoadingSpinner/LoadingSpinner.css'
    document.head.appendChild(link)
    
    console.log('🎨 LoadingSpinner CSS 로드됨')
  }
  
  /**
   * 🎯 컴포넌트 렌더링
   */
  render() {
    return `
      <div class="unique-loading-spinner-overlay" 
           style="display: ${this.visible ? 'flex' : 'none'}"
           role="progressbar" 
           aria-label="페이지 로딩 중"
           tabindex="0">
        <div class="unique-loading-spinner-container">
          <!-- 원형 스피너 -->
          <div class="unique-loading-spinner-wheel" aria-hidden="true"></div>
          
          <!-- 로딩 텍스트 -->
          <p class="unique-loading-spinner-text">${this.text}</p>
        </div>
      </div>
    `
  }
  
  /**
   * 🔧 컴포넌트 마운트 후 이벤트 설정
   */
  mount() {
    // ESC 키로 닫기 (onClose 콜백이 있는 경우)
    this.handleKeyPress = (e) => {
      if (e.key === 'Escape' && this.onClose) {
        this.hide()
        this.onClose()
      }
    }
    
    // 클릭으로 닫기 (onClose 콜백이 있는 경우)
    this.handleClick = (e) => {
      if (e.target === this.el && this.onClose) {
        this.hide()
        this.onClose()
      }
    }
    
    // 이벤트 리스너 등록
    document.addEventListener('keydown', this.handleKeyPress)
    this.el.addEventListener('click', this.handleClick)
    
    // 접근성: 로딩 시작 시 스크린 리더에 알림
    if (this.visible) {
      this.announceToScreenReader('로딩이 시작되었습니다')
    }
    
    console.log('✅ LoadingSpinner 마운트 완료')
  }
  
  /**
   * 👁️ 스피너 표시
   */
  show(newText) {
    if (newText) {
      this.setText(newText)
    }
    
    this.visible = true
    
    if (this.el) {
      this.el.style.display = 'flex'
      this.announceToScreenReader(`로딩 시작: ${this.text}`)
    }
    
    console.log('👁️ LoadingSpinner 표시:', this.text)
  }
  
  /**
   * 🙈 스피너 숨기기
   */
  hide() {
    this.visible = false
    
    if (this.el) {
      this.el.style.display = 'none'
      this.announceToScreenReader('로딩이 완료되었습니다')
    }
    
    console.log('🙈 LoadingSpinner 숨김')
  }
  
  /**
   * 📝 텍스트 변경
   */
  setText(newText) {
    this.text = newText
    
    const textEl = this.el?.querySelector('.unique-loading-spinner-text')
    if (textEl) {
      textEl.textContent = newText
      this.announceToScreenReader(newText)
    }
    
    console.log('📝 LoadingSpinner 텍스트 변경:', newText)
  }
  
  /**
   * 🔄 표시/숨김 토글
   */
  toggle(newText) {
    if (this.visible) {
      this.hide()
    } else {
      this.show(newText)
    }
  }
  
  /**
   * ♿ 스크린 리더에 메시지 전달
   */
  announceToScreenReader(message) {
    // aria-live 영역이 없으면 생성
    let liveRegion = document.getElementById('unique-spinner-live-region')
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'unique-spinner-live-region'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      document.body.appendChild(liveRegion)
    }
    
    // 메시지 전달
    liveRegion.textContent = message
    
    // 약간의 지연 후 초기화 (다음 메시지를 위해)
    setTimeout(() => {
      liveRegion.textContent = ''
    }, 1000)
  }
  
  /**
   * 🧹 컴포넌트 정리
   */
  destroy() {
    // 이벤트 리스너 제거
    if (this.handleKeyPress) {
      document.removeEventListener('keydown', this.handleKeyPress)
    }
    
    if (this.handleClick && this.el) {
      this.el.removeEventListener('click', this.handleClick)
    }
    
    // aria-live 영역 정리
    const liveRegion = document.getElementById('unique-spinner-live-region')
    if (liveRegion) {
      liveRegion.remove()
    }
    
    console.log('🧹 LoadingSpinner 정리 완료')
    
    super.destroy?.()
  }
}

// 🧪 테스트용 정적 메서드들
LoadingSpinner.createTest = function(containerId = 'test-container') {
  console.log('🧪 LoadingSpinner 테스트 생성 시작...')
  
  // 테스트 컨테이너 생성 또는 찾기
  let container = document.getElementById(containerId)
  if (!container) {
    container = document.createElement('div')
    container.id = containerId
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000;
    `
    document.body.appendChild(container)
  }
  
  // LoadingSpinner 인스턴스 생성
  const spinner = new LoadingSpinner({
    text: '테스트 로딩 중...',
    visible: true,
    onClose: () => {
      console.log('🧪 테스트 스피너 닫힘')
      container.remove()
    }
  })
  
  // 컨테이너에 렌더링
  container.innerHTML = spinner.render()
  spinner.el = container.firstElementChild
  spinner.mount()
  
  // 테스트 제어 버튼들 추가
  const controls = document.createElement('div')
  controls.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10001;
    display: flex;
    gap: 10px;
    flex-direction: column;
  `
  
  const buttonStyle = `
    padding: 8px 16px;
    background: #1a73e8;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `
  
  controls.innerHTML = `
    <button style="${buttonStyle}" id="test-hide">숨기기</button>
    <button style="${buttonStyle}" id="test-show">표시</button>
    <button style="${buttonStyle}" id="test-change">텍스트 변경</button>
    <button style="${buttonStyle}" id="test-close">테스트 종료</button>
  `
  
  document.body.appendChild(controls)
  
  // 버튼 이벤트 설정
  document.getElementById('test-hide').onclick = () => spinner.hide()
  document.getElementById('test-show').onclick = () => spinner.show('다시 표시됨!')
  document.getElementById('test-change').onclick = () => {
    const messages = ['새로운 메시지...', '데이터 처리 중...', '거의 완료...', '마지막 단계...']
    const randomMsg = messages[Math.floor(Math.random() * messages.length)]
    spinner.setText(randomMsg)
  }
  document.getElementById('test-close').onclick = () => {
    spinner.destroy()
    container.remove()
    controls.remove()
  }
  
  console.log('🧪 LoadingSpinner 테스트 준비 완료!')
  console.log('💡 사용법:')
  console.log('  - ESC 키 또는 오버레이 클릭으로 닫기')
  console.log('  - 우측 상단 버튼들로 테스트')
  
  return spinner
}

// 🌐 전역 테스트 함수 등록 (브라우저 콘솔에서 사용 가능)
if (typeof window !== 'undefined') {
  window.testLoadingSpinner = LoadingSpinner.createTest
} 