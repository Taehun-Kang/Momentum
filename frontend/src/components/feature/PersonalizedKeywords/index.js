/**
 * ✨ PersonalizedKeywords - AI 기반 개인화 추천 컴포넌트
 * 
 * 기능:
 * - 사용자 과거 행동 분석 기반 추천
 * - 시간대별 맞춤 키워드
 * - 감성적 개인화 메시지
 * - 동적 업데이트 시스템
 */

import { Component } from '../../../core/Component.js'
import './PersonalizedKeywords.css'

export default class PersonalizedKeywords extends Component {
  static defaultProps = {
    userId: null,
    maxKeywords: 6,
    showRefreshButton: true,
    whiteTheme: false,
    onKeywordClick: null,
    onRefresh: null,
    className: ''
  }

  constructor(props = {}) {
    // 자동 렌더링 비활성화하고 컴포넌트 생성
    super({
      ...PersonalizedKeywords.defaultProps,
      ...props,
      tagName: 'div',
      autoRender: false  // 자동 렌더링 비활성화
    })

    // 필요한 데이터 먼저 초기화
    this.currentTime = new Date()
    this.userPreferences = this.loadUserPreferences()
    
    // 이벤트 핸들러를 바인딩된 메서드로 생성 (중복 방지용)
    this.boundClickHandler = this.handleClick.bind(this)

    // 수동으로 렌더링 호출
    this.render()
  }

  render() {
    console.log('🎨 PersonalizedKeywords rendering started')
    
    // 기존 내용 초기화
    this.el.innerHTML = ''
    
    // 기존 이벤트 리스너 제거
    this.unbindEvents()
    
    this.setupContainer()
    this.renderHeader()
    this.renderKeywordsList()
    this.bindEvents()

    console.log('✅ PersonalizedKeywords rendering completed:', {
      elementClass: this.el.className,
      childrenCount: this.el.children.length,
      hasContent: this.el.innerHTML.length > 0
    })

    return this
  }

  /**
   * 컨테이너 설정
   */
  setupContainer() {
    const classes = [
      'personalized-keywords',
      this.props.whiteTheme ? 'white-theme' : '',
      this.props.className
    ].filter(Boolean)

    this.el.className = classes.join(' ')
  }

  /**
   * 헤더 렌더링
   */
  renderHeader() {
    const header = document.createElement('div')
    header.className = 'personalized-header'

    header.innerHTML = /* html */ `
      <div class="section-title">✨ AI 맞춤 추천</div>
      ${this.props.showRefreshButton ? `
        <button class="refresh-keywords-link" data-action="refresh">새로고침</button>
      ` : ''}
    `

    this.el.appendChild(header)
  }

  /**
   * 키워드 리스트 렌더링 (TrendingKeywords 스타일 순차 등장)
   */
  renderKeywordsList() {
    const keywordsContainer = document.createElement('div')
    keywordsContainer.className = 'personalized-keywords-grid'
    keywordsContainer.id = 'personalized-grid'

    this.el.appendChild(keywordsContainer)

    // TrendingKeywords 스타일로 순차 등장
    this.populateKeywords()
  }

  /**
   * 키워드 순차 등장 (TrendingKeywords 스타일)
   */
  populateKeywords() {
    const grid = this.el.querySelector('#personalized-grid')
    if (!grid) return

    // 기존 키워드 버튼들 제거
    grid.innerHTML = ''

    const keywords = this.generatePersonalizedKeywords()

    keywords.forEach((keyword, index) => {
      setTimeout(() => {
        const keywordBtn = document.createElement('button')
        keywordBtn.className = 'personalized-grid-btn'
        keywordBtn.dataset.keyword = keyword.text
        keywordBtn.dataset.reason = keyword.reason
        keywordBtn.dataset.category = keyword.category

        // 이모티콘 제거하고 키워드만 표시
        keywordBtn.innerHTML = /* html */ `
          <div class="keyword-text">${keyword.text}</div>
          <div class="keyword-category">${this.getCategoryLabel(keyword.category)}</div>
        `

        grid.appendChild(keywordBtn)
        
        // 부드러운 등장 애니메이션 트리거
        requestAnimationFrame(() => {
          keywordBtn.classList.add('animate-in')
        })
      }, index * 120) // 120ms 간격으로 순차 등장 (조금 더 여유있게)
    })
  }

  /**
   * 카테고리 라벨 반환
   */
  getCategoryLabel(category) {
    const labels = {
      lifestyle: '라이프스타일',
      travel: '여행',
      relaxation: '힐링',
      cooking: '요리',
      'self-development': '자기계발',
      wellness: '웰빙',
      art: '아트',
      hobby: '취미',
      eco: '친환경'
    }
    return labels[category] || '추천'
  }

  /**
   * 개인화 키워드 생성 (실제 DB MEDIUM 키워드 기반)
   */
  generatePersonalizedKeywords() {
    const baseKeywords = [
      { text: "브이로그", icon: "📹", category: "lifestyle" },
      { text: "홈카페", icon: "☕", category: "cooking" },
      { text: "국내여행", icon: "🇰🇷", category: "travel" },
      { text: "강아지", icon: "🐕", category: "lifestyle" },
      { text: "인테리어", icon: "🏠", category: "lifestyle" },
      { text: "간단요리", icon: "🍳", category: "cooking" },
      { text: "스킨케어 루틴", icon: "💧", category: "wellness" },
      { text: "식물키우기", icon: "🌱", category: "hobby" },
      { text: "독서", icon: "📚", category: "self-development" },
      { text: "DIY", icon: "🛠️", category: "hobby" },
      { text: "미니멀라이프", icon: "✨", category: "lifestyle" },
      { text: "맛집투어", icon: "🍽️", category: "travel" }
    ]

    // 랜덤 셔플로 매번 다른 조합
    const shuffled = baseKeywords.sort(() => Math.random() - 0.5)

    return shuffled
      .map(keyword => ({
        ...keyword,
        reason: this.generateReasonText(keyword.category)
      }))
      .slice(0, this.props.maxKeywords)
  }

  /**
   * 추천 이유 텍스트 생성
   */
  generateReasonText(category) {
    const reasons = {
      lifestyle: ["평소 일상 영상을 자주 보셨어요", "라이프스타일 콘텐츠를 선호하시네요"],
      travel: ["여행 관련 영상에 관심이 많으셨어요", "새로운 장소 탐험을 좋아하시는군요"],
      relaxation: ["힐링 콘텐츠를 즐겨보셨어요", "차분한 영상을 선호하시네요"],
      cooking: ["요리 영상을 자주 시청하셨어요", "맛있는 음식에 관심이 많으시네요"],
      "self-development": ["자기계발 콘텐츠를 좋아하셨어요", "성장하는 모습을 추구하시는군요"],
      wellness: ["웰빙 라이프에 관심이 많으셨어요", "건강한 삶을 추구하시네요"],
      art: ["창작 활동 영상을 즐겨보셨어요", "예술적 감각이 뛰어나시네요"],
      hobby: ["취미 관련 영상에 관심이 많으셨어요", "새로운 취미 탐험을 좋아하시는군요"],
      eco: ["환경 친화적 라이프에 관심이 있으셨어요", "지속가능한 삶을 추구하시네요"]
    }

    const categoryReasons = reasons[category] || ["비슷한 영상을 즐겨보셨어요"]
    return categoryReasons[Math.floor(Math.random() * categoryReasons.length)]
  }

  /**
   * 사용자 선호도 로드 (임시)
   */
  loadUserPreferences() {
    // 실제로는 localStorage나 API에서 로드
    return {
      favoriteCategories: ['lifestyle', 'travel', 'relaxation'],
      watchHistory: [],
      likedVideos: []
    }
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    this.el.addEventListener('click', this.boundClickHandler)
  }

  /**
   * 이벤트 언바인딩
   */
  unbindEvents() {
    this.el.removeEventListener('click', this.boundClickHandler)
  }

  /**
   * 통합 클릭 핸들러
   */
  handleClick(e) {
    const refreshBtn = e.target.closest('[data-action="refresh"]')
    const keywordBtn = e.target.closest('.personalized-grid-btn')

    if (refreshBtn) {
      this.handleRefresh(e)
    } else if (keywordBtn) {
      this.handleKeywordClick(keywordBtn, e)
    }
  }

  /**
   * 새로고침 처리
   */
  handleRefresh(e) {
    e.preventDefault()
    
    // 새로고침 애니메이션
    const refreshBtn = this.el.querySelector('[data-action="refresh"]')
    if (refreshBtn) {
      refreshBtn.style.transform = 'scale(0.95)'
      setTimeout(() => {
        refreshBtn.style.transform = ''
      }, 150)
    }

    // 새로운 추천 생성 및 리렌더링
    setTimeout(() => {
      this.populateKeywords()  // render() 대신 populateKeywords() 사용
      
      if (this.props.onRefresh) {
        this.props.onRefresh()
      }
    }, 300)
  }

  /**
   * 키워드 클릭 처리
   */
  handleKeywordClick(keywordBtn, e) {
    e.preventDefault()

    const keyword = keywordBtn.dataset.keyword
    const reason = keywordBtn.dataset.reason
    const category = keywordBtn.dataset.category

    // 클릭 피드백 애니메이션
    keywordBtn.style.transform = 'scale(0.96)'
    setTimeout(() => {
      keywordBtn.style.transform = ''
    }, 150)

    if (this.props.onKeywordClick) {
      this.props.onKeywordClick({
        keyword,
        reason,
        category,
        animationType: 'Simple Scale'
      })
    }
  }



  /**
   * 키워드 업데이트
   */
  updateKeywords(newPreferences) {
    this.userPreferences = { ...this.userPreferences, ...newPreferences }
    this.populateKeywords()  // render() 대신 populateKeywords() 사용
  }

  /**
   * Props 업데이트
   */
  updateProps(newProps) {
    this.props = { ...this.props, ...newProps }
    this.render()
  }

  /**
   * 테마 토글
   */
  toggleTheme() {
    this.updateProps({ whiteTheme: !this.props.whiteTheme })
  }

  /**
   * 컴포넌트 소멸
   */
  destroy() {
    this.unbindEvents()
    super.destroy?.()
  }
} 