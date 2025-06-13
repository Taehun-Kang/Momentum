/**
 * 🔥 TrendingKeywords - 실시간 트렌딩 키워드 컴포넌트
 */

import { Component } from '../../../core/Component.js'
import './TrendingKeywords.css'

export default class TrendingKeywords extends Component {
  static defaultProps = {
    keywords: [
      { rank: 1, keyword: '뉴진스 신곡' },
      { rank: 2, keyword: '일본 벚꽃 명소' },
      { rank: 3, keyword: '홈카페 레시피' },
      { rank: 4, keyword: '봄 패션 코디' },
      { rank: 5, keyword: '운동 루틴' },
      { rank: 6, keyword: '힐링 ASMR' }
    ],
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
      <div class="trending-keywords-grid" id="trending-grid"></div>
      ${this.props.showVideoButton ? `
        <div class="trending-video-action">
          <button class="video-action-btn" data-action="videos">
            <span class="btn-text">실시간 인기 영상 모아보기</span>
          </button>
        </div>
      ` : ''}
    `

    this.populateKeywords()
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