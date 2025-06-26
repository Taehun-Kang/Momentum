/**
 * 📱 App - 메인 애플리케이션 클래스
 * 
 * 라우터 관리, 네비게이션 바, 테마 관리를 담당
 */

import { Component } from './core/Component.js'
import Home from './pages/Home.js'
import ChatFlow from './pages/ChatFlow.js'
import VideoPlayer from './pages/VideoPlayer/final/VideoPlayer.js'
import MyPage from './pages/MyPage.js'
import AuthFlow from './pages/AuthFlow/index.js'
import Navbar from './components/layout/Navbar/index.js'
import searchService from './services/searchService.js'

export default class App extends Component {
  constructor() {
    super({
      tagName: 'div',
      autoRender: false
    })
    
    // 앱 상태
    // this.theme = localStorage.getItem('theme') || 'light'  // 다크 모드 비활성화
    this.currentRoute = ''
    this.currentPage = null
    this.navbar = null
    
    // 라우트 정의
    this.routes = {
      '#/': Home,
      '#/home': Home,
      '#/auth': AuthFlow,
      '#/landing': AuthFlow,
      '#/login': AuthFlow,
      '#/signup': AuthFlow,
      '#/chat-support': ChatFlow,
      '#/mood-select': ChatFlow,
      '#/topic-select': ChatFlow,
      '#/keyword-recommend': ChatFlow,
      '#/video-confirm': ChatFlow,
      '#/video-player': VideoPlayer,
      '#/my-page': MyPage
    }
    
    // 네비바가 숨겨져야 하는 페이지들
    this.hiddenNavbarRoutes = ['#/video-player', '#/auth', '#/landing', '#/login', '#/signup']
    
    // 페이지 매핑 (URL hash → page name) - Navbar와 통합
    this.pageMap = {
      '#/': 'home',
      '#/home': 'home',
      '#/auth': 'auth',
      '#/landing': 'auth',
      '#/login': 'auth',
      '#/signup': 'auth',
      '#/chat-support': 'chat-support',
      '#/mood-select': 'chat-support',
      '#/topic-select': 'chat-support',
      '#/keyword-recommend': 'chat-support',
      '#/video-confirm': 'chat-support',
      '#/chatbot': 'chat-support',
      '#/video-player': 'video-player',
      '#/my-page': 'my-page'
    }
    
    // 전역 접근 설정
    window.router = this
    window.app = this
    
    // 초기화
    this.init()
  }
  
  init() {
    console.log('🏗️ App initialization started')
    
    // 브라우저의 스크롤 복원 기능 비활성화
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    
    // 즉시 스크롤 위치 리셋 (페이지 로드 시)
    this.resetScrollInstantly()
    
    // 테마 적용
    // this.applyTheme()  // 다크 모드 비활성화
    
    // 렌더링
    this.render()
    
    // 라우터 설정
    this.setupRouter()
    
    // 초기 라우트 렌더링
    this.handleRouteChange()
    
    // 트렌딩 영상 미리 로드
    this.loadTrendingVideos()
    
    console.log('✅ App initialization completed')
  }
  
  render() {
    this.el.className = 'app'
    
    this.el.innerHTML = /* html */ `
      <div class="app-container">
        <!-- 메인 컨텐츠 영역 -->
        <div class="router-view"></div>
        
        <!-- 전역 네비게이션 바 -->
        <div id="navbar-container"></div>
      </div>
    `
    
    return this
  }
  
  setupRouter() {
    // 라우트 변경 감지
    window.addEventListener('hashchange', () => {
      this.handleRouteChange()
    })
    
    window.addEventListener('popstate', () => {
      this.handleRouteChange()
    })
    
    console.log('🧭 Router event listeners attached')
  }
  
  handleRouteChange() {
    // 초기 로딩 시 hash가 없으면 기본값 설정
    let hash = window.location.hash
    if (!hash || hash === '' || hash === '#') {
      hash = '#/auth'  // 기본 시작 페이지를 auth로 변경
      // URL도 업데이트 (history 추가 없이)
      window.history.replaceState(null, '', hash)
    }
    
    console.log('📍 Route change:', hash)
    
    // 페이지 렌더링 전에 즉시 스크롤 위치 리셋 (애니메이션 없이)
    this.resetScrollInstantly()
    
    // 현재 라우트 업데이트
    this.currentRoute = hash
    
    // 페이지 렌더링
    this.renderPage()
    
    // 네비바 업데이트
    this.updateNavbar()
    
    // 바디 클래스 업데이트
    this.updateBodyClasses()
  }
  
  renderPage() {
    const routerView = this.el.querySelector('.router-view')
    if (!routerView) {
      console.error('❌ Router view not found')
      return
    }
    
    // 기존 페이지 정리
    if (this.currentPage && this.currentPage.destroy) {
      console.log('🗑️ Destroying current page')
      this.currentPage.destroy()
    }
    
    // 라우트에서 쿼리 파라미터 제거
    const routePath = this.currentRoute.split('?')[0]
    const PageComponent = this.routes[routePath]
    
    if (PageComponent) {
      console.log('🏗️ Creating new page:', routePath)
      
      // 새 페이지 생성
      this.currentPage = new PageComponent()
      
      // DOM에 추가
      routerView.innerHTML = ''
      routerView.appendChild(this.currentPage.el)
      
      console.log('✅ Page rendered successfully')
    } else {
      console.warn('⚠️ Route not found:', routePath)
      this.render404()
    }
  }
  
  render404() {
    const routerView = this.el.querySelector('.router-view')
    if (routerView) {
      routerView.innerHTML = /* html */ `
        <div style="
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 70vh;
          text-align: center;
          padding: 20px;
        ">
          <h2 style="color: var(--text-primary); margin-bottom: 12px;">
            페이지를 찾을 수 없습니다
          </h2>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">
            요청하신 페이지가 존재하지 않습니다.
          </p>
          <button 
            onclick="window.location.hash = '#/'"
            style="
              background: var(--gradient-purple);
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 12px;
              font-size: 14px;
              cursor: pointer;
            "
          >
            홈으로 돌아가기
          </button>
        </div>
      `
    }
  }
  
  updateNavbar() {
    const navbarContainer = this.el.querySelector('#navbar-container')
    if (!navbarContainer) {
      console.error('❌ Navbar container not found')
      return
    }
    
    // 현재 페이지 계산 (쿼리 파라미터 제거 후)
    const routePath = this.currentRoute.split('?')[0]
    const currentPageName = this.pageMap[routePath] || 'home'
    
    // 네비바를 숨겨야 하는 페이지인지 확인
    const shouldHideNavbar = this.hiddenNavbarRoutes.some(route => 
      this.currentRoute.startsWith(route)
    )
    
    if (shouldHideNavbar) {
      console.log('🚫 Hiding navbar for route:', this.currentRoute)
      if (this.navbar) {
        navbarContainer.style.display = 'none'
      }
      return
    }
    
    console.log('✅ Showing navbar for route:', this.currentRoute, 'page:', currentPageName)
    
    // 네비바가 없다면 새로 생성
    if (!this.navbar) {
      console.log('🔧 App: Creating navbar with currentPage:', currentPageName)
      
      this.navbar = new Navbar({
        currentPage: currentPageName
      })
      
      navbarContainer.innerHTML = ''
      navbarContainer.appendChild(this.navbar.el)
      
      // DOM 렌더링 완료 후 상태 재확인 (초기 로딩 문제 해결)
      requestAnimationFrame(() => {
        if (this.navbar) {
          this.navbar.updateCurrentPage(currentPageName)
          console.log('🔄 Navbar: Initial state re-confirmed for page:', currentPageName)
        }
      })
    } else {
      // 기존 네비바가 있다면 현재 페이지만 업데이트
      this.navbar.updateCurrentPage(currentPageName)
    }
    
    navbarContainer.style.display = 'block'
  }
  
  updateBodyClasses() {
    // 라우트별 body 클래스 적용
    const routePath = this.currentRoute.split('?')[0]
    const pageClass = routePath.replace('#/', '').replace('/', '-') || 'home'
    
    // 기존 페이지 클래스 제거
    document.body.className = document.body.className
      .replace(/page-\w+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    // 새 페이지 클래스 추가
    document.body.classList.add(`page-${pageClass}`)
    
    console.log('🎨 Body class updated:', `page-${pageClass}`)
  }
  
  // 네비게이션 헬퍼 메서드
  navigateTo(route) {
    console.log('🧭 Navigating to:', route)
    window.location.hash = route
  }
  
  // 🔄 현재 페이지 새로고침 (네비바에서 호출)
  refreshCurrentPage() {
    console.log('🔄 Refreshing current page:', this.currentRoute)
    
    // 스크롤 위치 리셋
    this.resetScrollInstantly()
    
    // 현재 페이지를 다시 렌더링
    this.renderPage()
    
    console.log('✅ Current page refreshed successfully')
  }
  
  // 🏠 홈으로 이동 (로그인 성공 시)
  goToHome() {
    console.log('🏠 Navigating to Home after login')
    this.navigateTo('#/home')
  }
  
  // 📺 영상 재생 페이지로 이동 (키워드/영상 클릭 시)
  goToVideoPlayer(keyword = '', videoId = '') {
    console.log('📺 Navigating to VideoPlayer with:', { keyword, videoId })
    let route = '#/video-player'
    
    // 파라미터가 있으면 URL에 추가
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (videoId) params.set('videoId', videoId)
    
    if (params.toString()) {
      route += '?' + params.toString()
    }
    
    this.navigateTo(route)
  }
  
  // 🔐 인증 페이지로 이동 (로그아웃 시)
  goToAuth() {
    console.log('🔐 Navigating to Auth (logout)')
    this.navigateTo('#/auth')
  }
  
  // 💬 채팅으로 이동
  goToChat() {
    console.log('💬 Navigating to Chat')
    this.navigateTo('#/chat-support')
  }
  
  // 👤 마이페이지로 이동
  goToMyPage() {
    console.log('👤 Navigating to MyPage')
    this.navigateTo('#/my-page')
  }
  
  // 테마 관리 (다크 모드 비활성화)
  // applyTheme() {
  //   document.documentElement.setAttribute('data-theme', this.theme)
  //   console.log('🎨 Theme applied:', this.theme)
  // }
  
  // toggleTheme() {
  //   this.theme = this.theme === 'light' ? 'dark' : 'light'
  //   localStorage.setItem('theme', this.theme)
  //   this.applyTheme()
  //   
  //   console.log('🔄 Theme toggled to:', this.theme)
  // }
  
  // 스크롤 즉시 리셋 메서드 (페이지 렌더링 전 호출)
  resetScrollInstantly() {
    try {
      // 즉시 최상단으로 이동 (애니메이션 없이)
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      
      // 메인 컨테이너들도 확실히 리셋
      const mainContainers = ['#root', '.app', '.router-view', '.app-container']
      mainContainers.forEach(selector => {
        const element = document.querySelector(selector)
        if (element) {
          element.scrollTop = 0
          element.scrollLeft = 0
        }
      })
      
      console.log('📜 Scroll instantly reset to top')
    } catch (error) {
      console.warn('⚠️ Scroll reset error:', error)
    }
  }

  // 현재 라우트 정보
  getCurrentRoute() {
    return this.currentRoute
  }
  
  getCurrentPage() {
    return this.currentPage
  }
  
  // 라우트 추가 (동적으로)
  addRoute(path, component) {
    this.routes[path] = component
    console.log('➕ Route added:', path)
  }
  
  // 컴포넌트 정리
  destroy() {
    if (this.currentPage && this.currentPage.destroy) {
      this.currentPage.destroy()
    }
    
    if (this.navbar && this.navbar.destroy) {
      this.navbar.destroy()
    }
    
    // 이벤트 리스너 제거
    window.removeEventListener('hashchange', this.handleRouteChange)
    window.removeEventListener('popstate', this.handleRouteChange)
    
    super.destroy?.()
    
    console.log('🗑️ App destroyed')
  }
  
  // 트렌딩 영상 미리 로드
  async loadTrendingVideos() {
    try {
      console.log('🚀 App: 홈페이지용 Trending 영상 미리 로드 시작...')
      
      // 비동기로 trending 영상들을 미리 로드 (백그라운드에서 실행)
      const trendingVideos = await searchService.preloadTrendingVideos()
      
      if (trendingVideos && trendingVideos.length > 0) {
        console.log('✅ App: Trending 영상 미리 로드 완료:', trendingVideos.length, '개')
        console.log('💾 App: 이제 VideoPlayer에서 폴백 시 실제 DB 영상들이 사용됩니다')
      } else {
        console.warn('⚠️ App: Trending 영상 미리 로드 실패 - 폴백은 하드코딩된 영상 사용')
      }
    } catch (error) {
      console.error('❌ App: Trending 영상 미리 로드 오류:', error)
    }
  }
} 