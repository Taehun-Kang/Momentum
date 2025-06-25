/**
 * 🔥 TrendingKeywords - 실시간 트렌딩 키워드 컴포넌트
 */

import { Component } from '../../../core/Component.js'
import { trendsService } from '../../../services/trendsService.js'
import './TrendingKeywords.css'

export default class TrendingKeywords extends Component {
  static defaultProps = {
    keywords: [], // 실제 API 데이터로 채워질 예정
    onKeywordClick: () => {},
    onMoreClick: () => {},
    onViewAllVideos: () => {},
    showRanking: true,
    hotAnimationInterval: 3000,
    whiteTheme: false,
    showActionButtons: true,
    showMoreButton: true,    // 전체보기 버튼 별도 제어
    showVideoButton: true    // 영상 모아보기 버튼 별도 제어
  }

  constructor(props = {}) {
    super({
      ...TrendingKeywords.defaultProps,
      ...props,
      tagName: 'div',
      autoRender: false
    })

    this.hotAnimationTimer = null
    this.currentHotIndex = 0
    this.isDestroyed = false

    this.render()
    this.loadTrendingKeywords() // 🔥 실제 데이터 로드
  }

  // 🔥 실제 트렌딩 키워드 데이터 로드
  async loadTrendingKeywords() {
    console.log('🚀 TrendingKeywords.loadTrendingKeywords() 호출됨!')
    
    try {
      // 🎯 새로운 키워드 분석 API에서 6개 조회 (이미 순서 뒤집혀서 전달됨)
      const result = await trendsService.getTrendingKeywords(6)
      
      if (result.success && result.keywords && result.keywords.length > 0) {
        // 이미 서비스에서 순서가 뒤집혀 있고 6개로 제한되어 있음
        // 첫시 승리가 1위, 발로란트 토론토가 마지막으로 정렬된 상태
        const trendingKeywords = result.keywords.map((item, index) => ({
          rank: index + 1,
          keyword: item.keyword,
          score: item.score,
          category: item.category,
          // 추가 정보
          trendStatus: item.trendStatus,
          newsContext: item.newsContext
        }))

        this.props.keywords = trendingKeywords
        
        // UI 업데이트
        this.populateKeywords()
        
        console.log('🔥 트렌딩 키워드 로드 완료:', trendingKeywords.length, '개')
        console.log('🥇 1위 키워드:', trendingKeywords[0]?.keyword)
        console.log('🥉 마지막 키워드:', trendingKeywords[trendingKeywords.length - 1]?.keyword)
        
        // 폴백 사용 시 알림
        if (result.fallback) {
          console.log('ℹ️ 폴백 API 사용 중 (메인 API 일시 오류)')
        }
        
      } else {
        throw new Error(result.error || '트렌딩 키워드를 불러올 수 없습니다')
      }

    } catch (error) {
      console.error('❌ TrendingKeywords 로드 실패:', error.message)
      
      // 폴백 데이터 사용
      this.props.keywords = this.getFallbackKeywords()
      this.populateKeywords()
      
      console.log('🛡️ 폴백 키워드 사용 중')
    }
  }

  // 🛡️ 폴백 키워드 데이터 (실제 DB HIGH 우선순위 키워드)
  getFallbackKeywords() {
    return [
      { rank: 1, keyword: 'K-pop', score: 95, category: '음악 & 엔터테인먼트' },
      { rank: 2, keyword: '댄스챌린지', score: 89, category: '음악 & 엔터테인먼트' },
      { rank: 3, keyword: 'OOTD', score: 84, category: '뷰티 & 패션' },
      { rank: 4, keyword: '갓생', score: 78, category: '라이프스타일 & 건강' },
      { rank: 5, keyword: '밈', score: 73, category: '코미디 & 챌린지' },
      { rank: 6, keyword: '편의점 신상', score: 69, category: '먹방 & 요리' }
    ]
  }

  render() {
    this.el.className = `trending-keywords${this.props.whiteTheme ? ' white-theme' : ''}`

    this.el.innerHTML = /* html */ `
      <div class="trending-header">
        <div class="section-title">🔥 실시간 인기</div>
        ${this.props.showMoreButton ? `
          <button class="more-keywords-link" data-action="more">전체보기</button>
        ` : `
          <div class="live-indicator">LIVE</div>
        `}
      </div>
      <div class="trending-keywords-grid" id="trending-grid">
        <!-- 키워드 그리드 영역 -->
      </div>
      ${this.props.showVideoButton ? `
        <div class="trending-video-action">
          <button class="video-action-btn" data-action="videos">
            <span class="btn-text">실시간 인기 영상 모아보기</span>
          </button>
        </div>
      ` : ''}
    `

    this.bindEvents()
    return this
  }

  populateKeywords() {
    const grid = this.el.querySelector('#trending-grid')
    if (!grid) return

    // 기존 키워드 버튼들 제거
    grid.innerHTML = ''

    this.props.keywords.forEach((item, index) => {
      setTimeout(() => {
        if (this.isDestroyed) return

        const keywordBtn = document.createElement('button')
        keywordBtn.className = 'trending-grid-btn'
        keywordBtn.dataset.index = index
        keywordBtn.dataset.keyword = item.keyword

        keywordBtn.innerHTML = /* html */ `
          ${this.props.showRanking ? `<div class="grid-rank">#${item.rank}</div>` : ''}
          <div class="grid-keyword">${item.keyword}</div>
        `

        grid.appendChild(keywordBtn)

        // 마지막 키워드가 추가된 후 Hot 애니메이션 시작
        if (index === this.props.keywords.length - 1) {
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.startHotAnimation()
            }
          }, 500)
        }
      }, index * 80)
    })

    // 컴포넌트 참조 추가 (에러 상태에서 재시도용)
    grid.parentElement.__component = this
  }

  startHotAnimation() {
    if (this.hotAnimationTimer) {
      clearInterval(this.hotAnimationTimer)
    }

    const buttons = this.el.querySelectorAll('.trending-grid-btn')
    if (buttons.length === 0) return

    const animateNext = () => {
      if (this.isDestroyed) return

      // 모든 버튼의 hot 클래스 제거
      buttons.forEach(btn => btn.classList.remove('hot'))

      // 현재 인덱스의 버튼에 hot 클래스 추가
      if (buttons[this.currentHotIndex]) {
        buttons[this.currentHotIndex].classList.add('hot')
      }

      // 다음 인덱스로 순환
      this.currentHotIndex = (this.currentHotIndex + 1) % buttons.length
    }

    // 첫 번째 애니메이션 즉시 실행
    animateNext()

    // 주기적으로 실행
    this.hotAnimationTimer = setInterval(animateNext, this.props.hotAnimationInterval)
  }

  stopHotAnimation() {
    if (this.hotAnimationTimer) {
      clearInterval(this.hotAnimationTimer)
      this.hotAnimationTimer = null
    }

    // 모든 hot 클래스 제거
    const buttons = this.el.querySelectorAll('.trending-grid-btn')
    buttons.forEach(btn => btn.classList.remove('hot'))
  }

  bindEvents() {
    this.el.addEventListener('click', (e) => {
      const keywordBtn = e.target.closest('.trending-grid-btn')
      const moreBtn = e.target.closest('.more-keywords-link')
      const videoBtn = e.target.closest('.video-action-btn')
      
      if (keywordBtn) {
        const index = parseInt(keywordBtn.dataset.index)
        const keyword = keywordBtn.dataset.keyword
        const keywordData = this.props.keywords[index]

        // 클릭 피드백 애니메이션
        keywordBtn.style.transform = 'scale(0.95)'
        setTimeout(() => {
          keywordBtn.style.transform = ''
        }, 150)

        // 콜백 실행
        this.props.onKeywordClick(keywordData, index)
      } else if (moreBtn) {
        // 전체보기 링크 클릭
        moreBtn.style.transform = 'scale(0.95)'
        setTimeout(() => {
          moreBtn.style.transform = ''
        }, 150)
        
        this.props.onMoreClick()
      } else if (videoBtn) {
        // 영상 모아보기 버튼 클릭
        videoBtn.style.transform = 'scale(0.98)'
        setTimeout(() => {
          videoBtn.style.transform = ''
        }, 150)
        
        this.props.onViewAllVideos()
      }
    })
  }

  updateKeywords(newKeywords) {
    this.stopHotAnimation()
    this.props.keywords = newKeywords
    this.populateKeywords()
  }

  setHotIndex(index) {
    const buttons = this.el.querySelectorAll('.trending-grid-btn')
    buttons.forEach((btn, i) => {
      btn.classList.toggle('hot', i === index)
    })
    this.currentHotIndex = index
  }

  pauseAnimation() {
    this.stopHotAnimation()
  }

  resumeAnimation() {
    this.startHotAnimation()
  }

  destroy() {
    this.isDestroyed = true
    this.stopHotAnimation()
    super.destroy?.()
  }
} 