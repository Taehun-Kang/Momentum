/**
 * 🧭 Navbar - 하단 네비게이션 바 컴포넌트
 * 
 * 플로팅 글래스모피즘 디자인, 4개 탭, 동적 페이지 감지
 */

import { Component } from '../../../core/Component.js'
import './Navbar.css'

export default class Navbar extends Component {
  static defaultProps = {
    // 현재 페이지 (App.js에서 전달)
    currentPage: 'home',
    
    // 네비게이션 아이템들 (SVG 아이콘으로 업그레이드)
    items: [
      { 
        icon: 'home', 
        label: '홈', 
        page: 'home', 
        hash: '#/',
        svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>`
      },
      { 
        icon: 'chat', 
        label: '채팅', 
        page: 'chat-support', 
        hash: '#/chat-support',
        svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>`
      },
      { 
        icon: 'play', 
        label: '재생', 
        page: 'video-player', 
        hash: '#/video-player',
        svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5,3 19,12 5,21"/>
        </svg>`
      },
      { 
        icon: 'user', 
        label: '마이', 
        page: 'my-page', 
        hash: '#/my-page',
        svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>`
      }
    ],
    
    // 숨김 페이지들 (네비바가 표시되지 않는 페이지)
    hiddenPages: ['video-player'],
    

    
    className: ''
  }
  
  constructor(props = {}) {
    super({
      tagName: 'nav',
      autoRender: false,  // 자동 렌더링 비활성화
      ...Navbar.defaultProps,
      ...props
    })
    
    this.currentPage = this.props.currentPage
    this.isVisible = true
    
    console.log('🧭 Navbar: Constructor - received currentPage:', this.props.currentPage)
    
    // constructor에서 명시적으로 render 호출
    this.render()
  }
  

  
  render() {
    this.setupElement()
    this.setupEventListeners()
    
    // 초기 상태 명시적 설정
    this.updateActiveState()
    this.updateBodyDataAttribute()
    
    console.log('🧭 Navbar: Initial render completed for page:', this.currentPage)
    
    return this
  }
  
  /**
   * 엘리먼트 설정
   */
  setupElement() {
    // CSS 클래스 설정
    const classes = [
      'navbar-container',
      this.props.className
    ].filter(Boolean)
    
    this.el.className = classes.join(' ')
    
    // HTML 생성
    this.el.innerHTML = this.props.items.map(item => `
      <button class="nav-btn ${this.currentPage === item.page ? 'active' : ''}" 
              data-page="${item.page}" 
              data-hash="${item.hash}"
              aria-label="${item.label}">
        <div class="nav-icon">${item.svg}</div>
        <div class="nav-label">${item.label}</div>
      </button>
    `).join('')
    
    // 초기 가시성 설정
    this.updateVisibility()
  }
  
  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 네비게이션 버튼 클릭
    this.el.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        this.handleNavigation(btn)
      })
    })
  }
  
  /**
   * 네비게이션 처리
   */
  handleNavigation(btn) {
    const hash = btn.dataset.hash
    const page = btn.dataset.page
    
    // 클릭 피드백
    btn.classList.add('clicked')
    setTimeout(() => btn.classList.remove('clicked'), 150)
    
    if (hash === window.location.hash || page === this.currentPage) {
      // 🔄 현재 페이지를 다시 클릭한 경우 - 새로고침
      console.log('🧭 Navbar: Refreshing current page', { page, hash })
      
      // 현재 페이지 컴포넌트 새로고침
      if (window.app && typeof window.app.refreshCurrentPage === 'function') {
        window.app.refreshCurrentPage()
      } else {
        // 페이지 전체 새로고침 (fallback)
        window.location.reload()
      }
    } else if (hash) {
      // 🚀 다른 페이지로 이동
      console.log('🧭 Navbar: Navigating to', { page, hash })
      window.location.hash = hash
    }
  }
  
  /**
   * Props 업데이트 시 호출 (App.js에서 현재 페이지 변경 시)
   */
  updateCurrentPage(newPage) {
    if (this.currentPage !== newPage) {
      this.currentPage = newPage
      this.updateActiveState()
      this.updateVisibility()
      this.updateBodyDataAttribute()
      
      console.log('🧭 Navbar: Page updated to', newPage)
    }
  }
  
  /**
   * 활성 상태 업데이트
   */
  updateActiveState() {
    this.el.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active')
      if (btn.dataset.page === this.currentPage) {
        btn.classList.add('active')
      }
    })
  }
  
  /**
   * 네비바 가시성 업데이트
   */
  updateVisibility() {
    const shouldHide = this.props.hiddenPages.includes(this.currentPage)
    
    if (shouldHide && this.isVisible) {
      this.hide()
    } else if (!shouldHide && !this.isVisible) {
      this.show()
    }
  }
  
  /**
   * 네비바 숨기기
   */
  hide() {
    console.log('🧭 Navbar: Hiding navbar for page', this.currentPage)
    
    this.el.classList.add('video-hidden')
    this.el.style.opacity = '0'
    this.el.style.visibility = 'hidden'
    this.el.style.transform = 'translateX(-50%) translateY(100px)'
    this.el.style.pointerEvents = 'none'
    this.el.style.zIndex = '-1'
    
    this.isVisible = false
  }
  
  /**
   * 네비바 표시
   */
  show() {
    console.log('🧭 Navbar: Showing navbar for page', this.currentPage)
    
    this.el.classList.remove('video-hidden')
    this.el.style.opacity = '1'
    this.el.style.visibility = 'visible'
    this.el.style.transform = 'translateX(-50%)'
    this.el.style.pointerEvents = 'auto'
    this.el.style.zIndex = '1000'
    
    this.isVisible = true
  }
  
  /**
   * Body data attribute 업데이트
   */
  updateBodyDataAttribute() {
    document.body.setAttribute('data-current-page', this.currentPage)
    
    // Video page 클래스 토글
    if (this.currentPage === 'video-player') {
      document.body.classList.add('video-page-active')
    } else {
      document.body.classList.remove('video-page-active')
    }
  }
  
  /**
   * 현재 페이지 반환
   */
  getCurrentPage() {
    return this.currentPage
  }
  
  /**
   * 특정 페이지로 이동
   */
  navigateTo(page) {
    const item = this.props.items.find(item => item.page === page)
    if (item) {
      window.location.hash = item.hash
    }
  }
  
  /**
   * 컴포넌트 제거 시 정리
   */
  destroy() {
    // Body 클래스 정리
    document.body.classList.remove('video-page-active')
    document.body.removeAttribute('data-current-page')
    
    super.destroy()
  }
} 