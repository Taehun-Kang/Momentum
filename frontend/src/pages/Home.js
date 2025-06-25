/**
 * 🏠 Home - 홈 페이지 컴포넌트
 * 
 * Header, PersonalizedKeywords, TrendingKeywords, TimeBasedKeywords로 구성
 */

import { Component } from '../core/Component.js'
import Header from '../components/layout/Header/index.js'
import PersonalizedKeywords from '../components/feature/PersonalizedKeywords/index.js'
import TrendingKeywords from '../components/feature/TrendingKeywords/index.js'
import TimeBasedKeywords from '../components/feature/TimeBasedKeywords/index.js'
import './Home.css'

export default class Home extends Component {
  static defaultProps = {}

  constructor(props = {}) {
    super({
      ...Home.defaultProps,
      ...props,
      tagName: 'div',
      autoRender: false
    })

    // 컴포넌트 인스턴스들
    this.header = null
    this.personalizedKeywords = null
    this.trendingKeywords = null
    this.timeBasedKeywords = null

    this.render()
  }

  render() {
    this.el.className = 'home-page'

    // 기본 HTML 구조 생성
    this.el.innerHTML = /* html */ `
      <div class="home-container">
        <div id="header-container"></div>
        <div class="chat-support-section">
          <button class="chat-support-button" id="chat-support-btn">
            <span class="chat-icon">💬</span>
            <div class="chat-text">
              <span class="chat-title">AI 영상 추천받기</span>
              <span class="chat-subtitle">기분이나 주제를 말해보세요</span>
            </div>
            <span class="chat-arrow">→</span>
          </button>
        </div>
        <div class="home-content">
          <div id="trending-container"></div>
          <div id="timebased-container"></div>
          <div id="personalized-container"></div>
        </div>
      </div>
    `

    // 컴포넌트들 생성 및 마운트
    this.initializeComponents()
    
    // 이벤트 리스너 설정
    this.setupEventListeners()

    return this
  }

  initializeComponents() {
    // 1. Header 컴포넌트
    this.header = new Header({
      greeting: '', // 시간대별 인사말 자동 생성
      title: '오늘 하루, 어떤 영상과 함께할까요?',
      subtitle: '당신만을 위한 키워드 추천',
      variant: 'home',
      enableTimeGreeting: true
    })
    this.mountComponent('header-container', this.header)

    // 2. TrendingKeywords 컴포넌트 (위로 이동)
    console.log('🔧 TrendingKeywords 컴포넌트 생성 시작...')
    this.trendingKeywords = new TrendingKeywords({
      keywords: [
        { rank: 1, keyword: '뉴진스 신곡' },
        { rank: 2, keyword: '일본 벚꽃 명소' },
        { rank: 3, keyword: '홈카페 레시피' },
        { rank: 4, keyword: '봄 패션 코디' },
        { rank: 5, keyword: '운동 루틴' },
        { rank: 6, keyword: '힐링 ASMR' }
      ],
      onKeywordClick: (keywordData, index) => {
        this.handleKeywordClick('trending', keywordData, index)
      },
      onMoreClick: () => {
        console.log('🔥 TrendingKeywords 전체보기')
        this.handleTrendingMoreClick()
      },
      onViewAllVideos: () => {
        console.log('🎬 실시간 인기 영상 모아보기')
        this.handleViewAllVideos()
      },
      showRanking: true,
      hotAnimationInterval: 3000,
      showActionButtons: true,
      showMoreButton: false,   // MVP: 전체보기 버튼 비활성화
      showVideoButton: true    // 영상 모아보기 버튼은 유지
    })
    console.log('✅ TrendingKeywords 컴포넌트 생성 완료:', !!this.trendingKeywords)
    this.mountComponent('trending-container', this.trendingKeywords)

    // 3. TimeBasedKeywords 컴포넌트
    this.timeBasedKeywords = new TimeBasedKeywords({
      maxKeywords: 4,
      onKeywordClick: (timeData) => {
        this.handleKeywordClick('timebased', timeData)
      },
      autoUpdate: true,
      updateInterval: 60000 // 1분마다 시간 체크
    })
    this.mountComponent('timebased-container', this.timeBasedKeywords)

    // 4. PersonalizedKeywords 컴포넌트 (가장 아래로 이동)
    this.personalizedKeywords = new PersonalizedKeywords({
      userId: 'user123',
      maxKeywords: 6,
      showAnalysisInfo: false,
      showRefreshButton: false, // MVP: 새로고침 버튼 비활성화
      animationDelay: 200,
      onKeywordClick: (keyword, index) => {
        this.handleKeywordClick('personalized', keyword, index)
      },
      onRefresh: () => {
        console.log('🔄 PersonalizedKeywords 새로고침')
      }
    })
    this.mountComponent('personalized-container', this.personalizedKeywords)

    // 페이지 진입 애니메이션
    this.playEntranceAnimation()
  }

  /**
   * 컴포넌트를 컨테이너에 마운트
   */
  mountComponent(containerId, component) {
    const container = this.el.querySelector(`#${containerId}`)
    console.log(`🔧 Mounting ${containerId}:`, {
      container: !!container,
      component: !!component,
      componentEl: !!component?.el,
      componentClass: component?.constructor?.name
    })
    
    if (container && component && component.el) {
      container.appendChild(component.el)
      console.log(`✅ Successfully mounted ${containerId}`)
    } else {
      console.error(`❌ Failed to mount ${containerId}:`, {
        container: !!container,
        component: !!component,
        componentEl: !!component?.el
      })
    }
  }

  /**
   * 키워드 클릭 핸들러 - 영상 재생 페이지로 이동
   */
  handleKeywordClick(source, data, index) {
    console.log(`🔍 키워드 클릭 [${source}]:`, data, 'index:', index)
    
    // 키워드 추출 (PersonalizedKeywords는 객체 형태로 전달됨)
    let keyword
    if (source === 'trending') {
      keyword = data.keyword
    } else if (source === 'timebased') {
      keyword = data.keyword
    } else if (source === 'personalized') {
      // PersonalizedKeywords는 객체로 전달되므로 keyword 필드 추출
      keyword = data.keyword || data.text || data
      console.log('🔧 PersonalizedKeywords 키워드 추출:', data, '→', keyword)
    } else {
      keyword = typeof data === 'string' ? data : data.keyword || data.text || '일반'
    }
    
    console.log('🎯 최종 키워드:', keyword)
    
    // 영상 재생 페이지로 이동
    if (window.app) {
      window.app.goToVideoPlayer(keyword)
    } else {
      window.location.hash = `#/video-player?keyword=${encodeURIComponent(keyword)}&source=${source}`
    }
  }

  /**
   * 트렌딩 전체보기 클릭 핸들러 - 영상 재생 페이지로 이동
   */
  handleTrendingMoreClick() {
    console.log('🔥 실시간 인기 키워드 전체보기')
    if (window.app) {
      window.app.goToVideoPlayer('trending-keywords', 'trending-all')
    } else {
      window.location.hash = '#/video-player?type=trending-keywords'
    }
  }

  /**
   * 인기 영상 모아보기 클릭 핸들러 - 영상 재생 페이지로 이동
   */
  handleViewAllVideos() {
    console.log('🎬 실시간 인기 영상 모아보기')
    if (window.app) {
      window.app.goToVideoPlayer('trending-videos', 'trending-videos')
    } else {
      window.location.hash = '#/video-player?type=trending-videos'
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    const chatSupportBtn = this.el.querySelector('#chat-support-btn')
    if (chatSupportBtn) {
      chatSupportBtn.addEventListener('click', () => {
        console.log('💬 AI 영상 추천받기 버튼 클릭')
        window.app?.navigateTo('#/chat-support')
      })
    }
  }

  /**
   * 페이지 진입 애니메이션
   */
  playEntranceAnimation() {
    // 컨테이너 초기 상태
    this.el.style.opacity = '0'
    this.el.style.transform = 'translateY(20px)'
    
    // 자연스러운 페이드인
    requestAnimationFrame(() => {
      this.el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out'
      this.el.style.opacity = '1'
      this.el.style.transform = 'translateY(0)'
    })
  }

  /**
   * 컴포넌트 정리
   */
  destroy() {
    // 모든 하위 컴포넌트들 정리
    if (this.header) this.header.destroy?.()
    if (this.personalizedKeywords) this.personalizedKeywords.destroy?.()
    if (this.trendingKeywords) this.trendingKeywords.destroy?.()
    if (this.timeBasedKeywords) this.timeBasedKeywords.destroy?.()

    super.destroy?.()
  }
}