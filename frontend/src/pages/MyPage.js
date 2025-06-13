import { Component } from '../core/Component.js'
import BarChart from '../components/ui/BarChart/index.js'
import UserPreferenceKeywords from '../components/ui/UserPreferenceKeywords/index.js'
import Header from '../components/layout/Header/index.js'
import VideoCard from '../components/ui/VideoCard/index.js'
import '../styles/variables.css'
import './MyPage.css'

export default class MyPage extends Component {
  constructor() {
    super({
      tagName: 'div',
      autoRender: false
    })
    
    this.components = {
      header: null,
      chart: null,
      preferences: null,
      videoCards: []
    }
    this.data = this.initializeData()
    
    // 렌더링
    this.render()
  }

  initializeData() {
    return {
      user: {
        name: localStorage.getItem('userName') || '사용자',
        totalVideos: 127,
        totalWatchTime: '18시간 42분',
        joinDate: '2024년 3월'
      },
      weeklyData: [45, 95, 60, 120, 35, 105, 80], // 주간 시청 시간 (분)
      preferences: [
        { id: "1", text: "일상 브이로그", category: "lifestyle" },
        { id: "2", text: "카페 투어", category: "lifestyle" },
        { id: "3", text: "일본 여행", category: "travel" },
        { id: "4", text: "홈쿡 레시피", category: "food" },
        { id: "5", text: "힐링 ASMR", category: "music" },
        { id: "6", text: "드로잉 타임랩스", category: "art" }
      ],
      recentVideos: [
        {
          id: "video1",
          title: "서울 카페 탐방 VLOG 🌱",
          duration: "02:34",
          date: "2일 전",
          thumbnail: "https://picsum.photos/400/700?random=1",
          views: "1.2만",
          channel: "카페 브이로거"
        },
        {
          id: "video2",
          title: "10분 홈트레이닝 루틴",
          duration: "10:15",
          date: "3일 전",
          thumbnail: "https://picsum.photos/400/700?random=2",
          views: "8.5천",
          channel: "홈트 코치"
        },
        {
          id: "video3", 
          title: "새벽 공부 with 로파이",
          duration: "01:47",
          date: "5일 전",
          thumbnail: "https://picsum.photos/400/700?random=3",
          views: "2.1만",
          channel: "스터디 ASMR"
        },
        {
          id: "video4",
          title: "간단 브런치 만들기",
          duration: "03:22",
          date: "1주 전",
          thumbnail: "https://picsum.photos/400/700?random=4",
          views: "5.8천",
          channel: "요리하는 일상"
        }
      ]
    }
  }

  render() {
    this.el.className = 'mypage'
    this.el.innerHTML = `
      <div class="mypage-content">
        <!-- Header Component Container -->
        <div id="header-container"></div>
        
        <!-- Main Content Area -->
        <div class="mypage-main-content">
          <!-- 통계 Section -->
          <div class="mypage-section">
            <div class="chart-container">
              <div class="section-header">
                <h2 class="section-title">📊 주간 시청 통계</h2>
              </div>
              <div class="chart-info">
                이번 주 총 시청시간: <strong id="total-weekly-time">8시간 20분</strong>
              </div>
              <div id="weekly-chart"></div>
            </div>
          </div>

          <!-- 선호 키워드 Section -->
          <div class="mypage-section">
            <div id="preference-keywords"></div>
          </div>

          <!-- 시청 기록 Section -->
          <div class="mypage-section">
            <div class="video-history-container">
              <div class="section-header">
                <div class="section-header-content">
                  <div class="section-text">
                    <h2 class="section-title">🎬 최근 시청 기록</h2>
                  </div>
                  <button class="view-more-link" id="view-more-button">더보기</button>
                </div>
              </div>
              <div class="video-grid" id="video-grid"></div>
            </div>
          </div>

          <!-- 로그아웃 Section -->
          <div class="mypage-section logout-section">
            <button class="logout-btn" id="logout-button">
              <span class="logout-icon">🚪</span>
              <span class="logout-text">로그아웃</span>
            </button>
          </div>
        </div>
      </div>
    `

    this.initializeComponents()
    this.bindEvents()
  }

  initializeComponents() {
    // Header 컴포넌트 초기화
    const headerContainer = this.el.querySelector('#header-container')
    if (headerContainer) {
      this.components.header = new Header({
        greeting: `안녕하세요, ${this.data.user.name}님!`,
        title: '당신만의 특별한<br>영상 순간들을 모아봤어요',
        subtitle: '지금까지의 시청 취향과 소중한 기록들을 둘러보세요',
        variant: 'mypage'
      })
      headerContainer.appendChild(this.components.header.el)
    }

    // BarChart 컴포넌트 초기화
    const chartContainer = this.el.querySelector('#weekly-chart')
    if (chartContainer) {
      this.components.chart = new BarChart(chartContainer, {
        data: this.data.weeklyData,
        maxHeight: 140,
        onBarClick: (label, value) => {
          console.log(`${label}요일: ${value}분 시청`)
          this.updateChartInfo(label, value)
        }
      })
    }

    // UserPreferenceKeywords 컴포넌트 초기화
    const preferencesContainer = this.el.querySelector('#preference-keywords')
    if (preferencesContainer) {
      this.components.preferences = new UserPreferenceKeywords(preferencesContainer, {
        keywords: this.data.preferences,
        title: "AI가 분석한 나의 취향",
        onKeywordClick: (data) => {
          console.log('키워드 클릭:', data)
          this.handleKeywordSearch(data)
        }
      })
    }

    // VideoCard 컴포넌트들 초기화
    this.initializeVideoCards()

    // 총 시청시간 계산 및 표시
    this.updateWeeklyTotal()
  }

  initializeVideoCards() {
    const videoGrid = this.el.querySelector('#video-grid')
    if (!videoGrid) return

    // 기존 VideoCard 컴포넌트들 정리
    this.components.videoCards.forEach(card => {
      if (card.destroy) card.destroy()
    })
    this.components.videoCards = []

    // 각 비디오에 대해 VideoCard 컴포넌트 생성
    this.data.recentVideos.forEach(video => {
      const cardContainer = document.createElement('div')
      cardContainer.className = 'video-card-container'
      videoGrid.appendChild(cardContainer)

      const videoCard = new VideoCard(cardContainer, {
        video: video,
        size: 'medium',
        onClick: (videoData) => {
          console.log('비디오 클릭:', videoData)
          this.handleVideoClick(videoData.id)
        }
      })

      this.components.videoCards.push(videoCard)
    })
  }

  updateChartInfo(label, value) {
    // 클릭해도 텍스트를 바꾸지 않고 원래 상태 유지
    console.log(`${label}요일: ${value}분 시청됨 (총 시청시간은 변경되지 않음)`)
  }

  updateWeeklyTotal() {
    const total = this.data.weeklyData.reduce((sum, minutes) => sum + minutes, 0)
    const hours = Math.floor(total / 60)
    const mins = total % 60
    
    const summaryElement = this.el.querySelector('#total-weekly-time')
    if (summaryElement) {
      summaryElement.textContent = `${hours}시간 ${mins}분`
    }
  }

  handleKeywordSearch(keywordData) {
    console.log(`"${keywordData.text}" 키워드로 영상 검색`)
    // AI 분석한 나의 취향 키워드 → 영상 재생 페이지로 이동
    if (window.app) {
      window.app.goToVideoPlayer(keywordData.text)
    } else {
      window.location.hash = `#/video-player?keyword=${encodeURIComponent(keywordData.text)}&source=preference`
    }
  }

  handleVideoClick(videoId) {
    console.log('비디오 클릭:', videoId)
    // 최근 시청 기록 → 영상 재생 페이지로 이동
    if (window.app) {
      window.app.goToVideoPlayer('', videoId)
    } else {
      window.location.hash = `#/video-player?videoId=${videoId}&source=history`
    }
  }

  handleLogout() {
    if (confirm('정말 로그아웃 하시겠습니까?')) {
      // 로그인 정보 모두 삭제
      localStorage.removeItem('userName')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('isLoggedIn')
      console.log('로그아웃 완료')
      
      // auth 페이지로 이동
      if (window.app) {
        window.app.goToAuth()
      } else {
        window.location.hash = '#/auth'
      }
    }
  }

  bindEvents() {
    // 더보기 버튼 - 최근 시청 기록 전체보기
    const viewMoreBtn = this.el.querySelector('#view-more-button')
    if (viewMoreBtn) {
      viewMoreBtn.addEventListener('click', () => {
        console.log('최근 시청 기록 더보기 클릭')
        // 최근 시청 기록 → 영상 재생 페이지로 이동
        if (window.app) {
          window.app.goToVideoPlayer('recent-history', 'all-history')
        } else {
          window.location.hash = '#/video-player?type=recent-history'
        }
      })
    }

    // 로그아웃 버튼
    const logoutBtn = this.el.querySelector('#logout-button')
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.handleLogout()
      })
    }
  }

  destroy() {
    // 컴포넌트 정리
    if (this.components.header) {
      this.components.header.destroy()
    }
    if (this.components.chart) {
      this.components.chart.destroy()
    }
    if (this.components.preferences) {
      this.components.preferences.destroy()
    }
    this.components.videoCards.forEach(card => {
      if (card.destroy) card.destroy()
    })
    
    super.destroy?.()
  }
} 