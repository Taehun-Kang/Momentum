import { Component } from '../core/Component.js'
import BarChart from '../components/ui/BarChart/index.js'
import UserPreferenceKeywords from '../components/ui/UserPreferenceKeywords/index.js'
import Header from '../components/layout/Header/index.js'
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
      preferences: null
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
        { id: "1", text: "브이로그", category: "lifestyle" },
        { id: "2", text: "홈카페", category: "lifestyle" },
        { id: "3", text: "국내여행", category: "travel" },
        { id: "4", text: "간단요리", category: "food" },
        { id: "5", text: "ASMR", category: "music" },
        { id: "6", text: "강아지", category: "lifestyle" }
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

    // 총 시청시간 계산 및 표시
    this.updateWeeklyTotal()
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
    
    super.destroy?.()
  }
} 