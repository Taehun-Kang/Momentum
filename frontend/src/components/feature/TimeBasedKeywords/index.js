/**
 * ⏰ TimeBasedKeywords - 시간대별 키워드 컴포넌트
 */

import { Component } from '../../../core/Component.js'
import './TimeBasedKeywords.css'

export default class TimeBasedKeywords extends Component {
  static defaultProps = {
    maxKeywords: 4,
    onKeywordClick: () => {},
    autoUpdate: true,
    updateInterval: 60000, // 1분마다 시간 체크
    whiteTheme: false
  }

  constructor(props = {}) {
    super({
      ...TimeBasedKeywords.defaultProps,
      ...props,
      tagName: 'div',
      autoRender: false
    })

    this.currentTime = new Date()
    this.updateTimer = null
    this.isDestroyed = false

    this.render()

    // 자동 업데이트 설정
    if (this.props.autoUpdate) {
      this.startAutoUpdate()
    }
  }

  render() {
    this.el.className = `time-based-keywords${this.props.whiteTheme ? ' white-theme' : ''}`

    const timeContent = this.getTimeBasedContent()
    
    // 시간대별 data attribute 추가
    const hour = this.currentTime.getHours()
    let timeSlot = 'night'
    if (hour >= 6 && hour < 12) timeSlot = 'morning'
    else if (hour >= 12 && hour < 18) timeSlot = 'afternoon'
    else if (hour >= 18 && hour < 22) timeSlot = 'evening'
    
    this.el.dataset.timeSlot = timeSlot

    this.el.innerHTML = /* html */ `
      <div class="time-header">
        <div class="section-title">${timeContent.timeSlot}</div>
      </div>
      <div class="time-keywords-vertical" id="time-keywords"></div>
    `

    this.populateKeywords()
    this.bindEvents()

    return this
  }

  getTimeBasedContent() {
    const hour = this.currentTime.getHours()
    const day = this.currentTime.getDay() // 0: 일요일, 1: 월요일, ...
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    const currentDay = dayNames[day]
    
    if (hour >= 6 && hour < 12) {
      return {
        greeting: '좋은 아침이에요! 👋',
        timeSlot: `${currentDay} 아침`,
        description: '하루를 시작하는 사람들이 많이 보는 영상',
        icon: '🌅'
      }
    } else if (hour >= 12 && hour < 18) {
      return {
        greeting: '좋은 오후에요! 👋',
        timeSlot: `${currentDay} 점심시간`,
        description: '잠깐의 휴식시간에 보기 좋은 영상',
        icon: '☀️'
      }
    } else if (hour >= 18 && hour < 22) {
      return {
        greeting: '편안한 저녁이에요! 👋',
        timeSlot: `${currentDay} 저녁`,
        description: '하루를 마무리하며 보는 영상',
        icon: '🌆'
      }
    } else {
      return {
        greeting: '깊은 밤이네요! 👋',
        timeSlot: `${currentDay} 밤`,
        description: '잠들기 전 마음을 달래는 영상',
        icon: '🌙'
      }
    }
  }

  getTimeBasedKeywords() {
    const hour = this.currentTime.getHours()
    
    if (hour >= 6 && hour < 12) { // 아침
      return ['모닝 루틴', '출근 준비', '아침 운동', '간단 아침식사', '출근길 음악', '하루 계획']
    } else if (hour >= 12 && hour < 18) { // 오후
      return ['점심 브이로그', '직장인 일상', '오후 휴식', '카페 음악', '간단 요리', '업무 팁']
    } else if (hour >= 18 && hour < 22) { // 저녁
      return ['퇴근 루틴', '집밥 레시피', '저녁 운동', '힐링 음악', '취미 시간', '일상 브이로그']
    } else { // 밤
      return ['수면 음악', '밤 브이로그', '독서 ASMR', '명상 영상', '조용한 힐링', '잠자리 루틴']
    }
  }

  populateKeywords() {
    const container = this.el.querySelector('#time-keywords')
    if (!container) return

    // 기존 키워드 제거
    container.innerHTML = ''

    const keywords = this.getTimeBasedKeywords().slice(0, this.props.maxKeywords)
    const timeContent = this.getTimeBasedContent()
    
    // 컨테이너 초기 설정 (자연스러운 높이 증가를 위해)
    container.style.height = 'auto'
    container.style.overflow = 'visible'
    container.style.opacity = '1'
    container.style.transform = 'translateY(0) scale(1)'
    container.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

    // 키워드가 없는 경우 처리
    if (keywords.length === 0) {
      return
    }

    // 모든 키워드를 미리 생성 (원래 크기로 시작, 투명하게)
    keywords.forEach((keyword, index) => {
      const keywordBtn = document.createElement('button')
      keywordBtn.className = 'time-vertical-btn'
      keywordBtn.dataset.index = index
      keywordBtn.dataset.keyword = keyword

      keywordBtn.innerHTML = /* html */ `
        <div class="time-icon">${timeContent.icon}</div>
        <div class="time-text">${keyword}</div>
      `

      // 반응형 크기 계산
      const getResponsiveHeight = () => {
        const width = window.innerWidth
        if (width <= 375) return '46px'
        else if (width <= 430) return '50px'
        else return '56px'
      }

      const getResponsivePadding = () => {
        const width = window.innerWidth
        if (width <= 375) return '12px 14px'
        else if (width <= 430) return '14px 16px'
        else return '16px 20px'
      }

      // 초기 상태: 원래 크기, 투명
      keywordBtn.style.height = getResponsiveHeight()
      keywordBtn.style.minHeight = getResponsiveHeight()
      keywordBtn.style.padding = getResponsivePadding()
      keywordBtn.style.opacity = '0'
      keywordBtn.style.transform = 'translateX(20px) scale(0.95)'
      keywordBtn.style.transition = 'opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

      // 미리 DOM에 추가
      container.appendChild(keywordBtn)
    })

    // 키워드들을 순차적으로 나타내기 (대기 없이 바로 시작)
    keywords.forEach((keyword, index) => {
      setTimeout(() => {
        if (this.isDestroyed) return
        
        const keywordBtn = container.children[index]
        if (keywordBtn) {
          // 자연스럽게 나타내기 (크기는 이미 설정됨)
          keywordBtn.style.opacity = '1'
          keywordBtn.style.transform = 'translateX(0) scale(1)'
        }
      }, index * 250) // 250ms 간격으로 순차 나타내기
    })
  }

  bindEvents() {
    this.el.addEventListener('click', (e) => {
      const keywordBtn = e.target.closest('.time-vertical-btn')
      if (!keywordBtn) return

      const index = parseInt(keywordBtn.dataset.index)
      const keyword = keywordBtn.dataset.keyword
      const timeContent = this.getTimeBasedContent()

      // 클릭 피드백 애니메이션
      keywordBtn.style.transform = 'translateX(8px) scale(0.98)'
      setTimeout(() => {
        keywordBtn.style.transform = ''
      }, 150)

      // 콜백 실행
      this.props.onKeywordClick({
        keyword,
        timeSlot: timeContent.timeSlot,
        icon: timeContent.icon,
        index
      })
    })
  }



  startAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
    }

    this.updateTimer = setInterval(() => {
      if (this.isDestroyed) return

      const newTime = new Date()
      const oldHour = this.currentTime.getHours()
      const newHour = newTime.getHours()

      // 시간대가 바뀌었는지 확인
      const oldTimeSlot = this.getTimeSlotByHour(oldHour)
      const newTimeSlot = this.getTimeSlotByHour(newHour)

      if (oldTimeSlot !== newTimeSlot) {
        this.currentTime = newTime
        this.updateDisplay()
      }
    }, this.props.updateInterval)
  }

  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
  }

  getTimeSlotByHour(hour) {
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }

  updateDisplay() {
    // 헤더 업데이트
    const timeContent = this.getTimeBasedContent()
    const sectionTitle = this.el.querySelector('.section-title')
    if (sectionTitle) {
      sectionTitle.textContent = timeContent.timeSlot
    }

    // 시간대별 data attribute 업데이트
    const hour = this.currentTime.getHours()
    let timeSlot = 'night'
    if (hour >= 6 && hour < 12) timeSlot = 'morning'
    else if (hour >= 12 && hour < 18) timeSlot = 'afternoon'
    else if (hour >= 18 && hour < 22) timeSlot = 'evening'
    
    this.el.dataset.timeSlot = timeSlot

    // 컨테이너 재시작 애니메이션
    this.el.style.animation = 'none'
    setTimeout(() => {
      this.el.style.animation = 'containerFadeIn 0.6s ease-out forwards'
    }, 10)

    // 키워드 다시 생성
    this.populateKeywords()
  }

  updateTime(newTime) {
    this.currentTime = new Date(newTime)
    this.updateDisplay()
  }

  setMaxKeywords(count) {
    this.props.maxKeywords = Math.max(1, Math.min(6, count))
    this.populateKeywords()
  }

  getCurrentTimeSlot() {
    return this.getTimeBasedContent()
  }

  getKeywords() {
    return this.getTimeBasedKeywords()
  }

  destroy() {
    this.isDestroyed = true
    this.stopAutoUpdate()
    super.destroy?.()
  }
} 