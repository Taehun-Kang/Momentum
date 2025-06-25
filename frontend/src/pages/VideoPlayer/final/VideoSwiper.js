import { Component, navigateTo } from './Component.js'
import VideoSlide from './VideoSlide.js'
import TimeBreakSlide from './TimeBreakSlide.js'

export default class VideoSwiper extends Component {
  constructor(options = {}) {
    super(options)
    
    // 초기 비디오 데이터
    this.initialVideos = options.videos || []
    this.slides = [] // 슬라이드 컴포넌트들 (VideoSlide + TimeBreakSlide)
    this.currentIndex = 0
    
    // 스와이프 상태
    this.isAnimating = false
    this.isDragging = false
    this.startY = 0
    this.currentY = 0
    this.lastY = 0
    this.velocity = 0
    this.startTime = 0
    
    // 시청 시간 추적
    this.watchStartTime = Date.now()
    this.totalWatchTime = 0 // 분 단위
    this.videoStartTime = Date.now()
    
    // 🔥 테스트용 빠른 휴식 간격 (원래: [10, 25, 45, 65, 90])
    this.breakIntervals = [0.5, 1.5, 3, 5, 7] // 30초, 1.5분, 3분, 5분, 7분 (테스트용)
    // 실제 운영용: this.breakIntervals = [10, 25, 45, 65, 90]
    
    this.lastBreakTime = 0
    this.insertedBreakTimes = new Set() // 이미 삽입된 휴식 시간들을 추적
    this.isBreakSlideInserting = false // 휴식 슬라이드 삽입 중인지 추적
    
    // 무한 스크롤 설정
    this.videosPerBatch = 5 // 한 번에 추가할 비디오 수
    this.loadThreshold = 3  // 남은 슬라이드가 이 수보다 적으면 새로 로드
    
    // 스와이프 설정
    this.swipeConfig = {
      threshold: 30,
      velocityThreshold: 0.3,
      maxResistance: 0.3,
      elasticDuration: 400,
      swipeDuration: 300
    }
    
    console.log('🎬 VideoSwiper 초기화 - 테스트 모드')
    console.log('📅 휴식 알림 간격:', this.breakIntervals, '분')
    
    this.render()
    this.startWatchTimeTracking()
  }
  
  render() {
    this.el.className = 'shortform-swiper'
    this.el.innerHTML = /* html */ `
      <!-- 뒤로가기 버튼 -->
      <div class="video-back-btn" id="video-back-btn">
        <div class="back-btn-icon">←</div>
      </div>
      
      <div class="shortform-track" id="shortform-track"></div>
    `
    
    // 초기 슬라이드 생성
    this.loadInitialSlides()
    this.updateSlidePosition()
    this.setupEventListeners()
    this.setupBackButton()
  }
  
  setupBackButton() {
    const backBtn = this.el.querySelector('#video-back-btn')
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        console.log('🔙 뒤로가기 버튼 클릭')
        
        // 브라우저 히스토리가 있으면 뒤로가기, 없으면 홈으로
        if (window.history.length > 1) {
          console.log('📖 히스토리 존재 - 이전 페이지로 이동')
          window.history.back()
        } else {
          console.log('🏠 히스토리 없음 - 홈으로 이동')
          navigateTo('home')
        }
      })
    }
  }
  
  loadInitialSlides() {
    console.log('📱 초기 슬라이드 로드:', this.initialVideos.length, '개')
    
    // 초기 비디오들로 슬라이드 생성
    this.initialVideos.forEach((video, index) => {
      this.createVideoSlide(video, index)
    })
    
    // 추가 비디오 로드
    this.loadMoreVideos()
    
    console.log('✅ 총 슬라이드 수:', this.slides.length)
  }
  
  createVideoSlide(videoData, index) {
    console.log('🎥 비디오 슬라이드 생성:', videoData.title)
    
    const videoSlide = new VideoSlide({
      video: videoData,
      index: this.slides.length,
      isActive: this.slides.length === 0,
      onAction: this.handleSlideAction.bind(this),
      onAutoNext: this.handleAutoNext.bind(this)
    })
    
    this.slides.push({
      component: videoSlide,
      type: 'video',
      data: videoData
    })
    
    const track = this.el.querySelector('#shortform-track')
    track.appendChild(videoSlide.el)
    
    return videoSlide
  }
  
  createTimeBreakSlide(watchTime) {
    console.log('⏰ 휴식 슬라이드 생성 - 시청시간:', Math.floor(watchTime), '분')
    
    const breakSlide = new TimeBreakSlide({
      watchTime: Math.floor(watchTime),
      index: this.slides.length,
      onAction: this.handleBreakAction.bind(this)
    })
    
    this.slides.push({
      component: breakSlide,
      type: 'break',
      data: { watchTime }
    })
    
    const track = this.el.querySelector('#shortform-track')
    track.appendChild(breakSlide.el)
    
    return breakSlide
  }
  
  loadMoreVideos() {
    // 새로운 비디오 데이터 생성
    const newVideos = this.generateNewVideos(this.videosPerBatch)
    
    newVideos.forEach(video => {
      this.createVideoSlide(video, this.slides.length)
    })
  }
  
  generateNewVideos(count) {
    // ✅ v2 API 형식에 맞는 간단한 더미 데이터 (개발/테스트용)
    const simpleVideos = [
      { id: 'P_9XDrMCjjM', title: '힐링 영상 1', creator: '힐링채널' },
      { id: 'ZoJ2z3oEz2E', title: '댄스 영상 1', creator: '댄스크루' },
      { id: 'X7OR3OYHROw', title: '요리 영상 1', creator: '요리왕' },
      { id: 'cQcLK8nMCuk', title: '뷰티 영상 1', creator: '뷰티구루' },
      { id: '9AQyPu8KVMc', title: '운동 영상 1', creator: '헬스트레이너' },
      { id: 'Rjh_YaRPKcE', title: '음악 영상 1', creator: '음악가' },
      { id: 'L_jSLtWQtow', title: '여행 영상 1', creator: '여행러' },
      { id: 'mNkR6HATNzQ', title: '일상 영상 1', creator: '브이로거' },
      { id: 'jHGEGEE7Xm4', title: '게임 영상 1', creator: '게이머' }
    ]
    
    return Array.from({ length: count }, (_, i) => {
      const video = simpleVideos[i % simpleVideos.length]
      
      // ✅ v2 API 형식과 동일한 간단한 구조
      return {
        videoId: video.id,
        title: `${video.title} #${i + 1}`,
        creator: video.creator,
        
        // 기본 UI 상태만
        isLiked: false,
        isDisliked: false,
        isPlaying: false
      }
    })
  }
  
  checkForBreakSlide() {
    // 휴식 슬라이드 삽입 중이면 건너뛰기
    if (this.isBreakSlideInserting) {
      console.log('🔄 휴식 슬라이드 삽입 중이므로 체크 건너뛰기')
      return false
    }
    
    // 현재 슬라이드가 휴식 슬라이드이면 건너뛰기
    if (this.slides[this.currentIndex]?.type === 'break') {
      console.log('🛑 현재 휴식 슬라이드이므로 체크 건너뛰기')
      return false
    }
    
    const currentWatchMinutes = this.getTotalWatchTime()
    
    // 다음 휴식 시간 확인 (아직 삽입되지 않은 것만)
    const nextBreakTime = this.breakIntervals.find(time => 
      time > this.lastBreakTime && 
      currentWatchMinutes >= time &&
      !this.insertedBreakTimes.has(time)
    )
    
    if (nextBreakTime) {
      console.log('🛑 휴식 알림 조건 충족!', nextBreakTime, '분')
      
      // 삽입된 휴식 시간으로 추가
      this.insertedBreakTimes.add(nextBreakTime)
      this.lastBreakTime = nextBreakTime
      
      // 휴식 슬라이드 삽입 중 플래그 설정
      this.isBreakSlideInserting = true
      
      // 현재 위치 다음에 휴식 슬라이드 삽입
      setTimeout(() => {
        this.insertBreakSlide(currentWatchMinutes)
        // 삽입 완료 후 플래그 해제
        setTimeout(() => {
          this.isBreakSlideInserting = false
        }, 1000)
      }, 500) // 짧은 딜레이로 변경
      
      return true
    }
    
    return false
  }
  
  insertBreakSlide(watchTime) {
    const insertIndex = this.currentIndex + 1
    
    console.log('🔄 휴식 슬라이드 삽입 위치:', insertIndex)
    
    // 휴식 슬라이드 생성
    const breakSlide = new TimeBreakSlide({
      watchTime: Math.floor(watchTime),
      index: insertIndex,
      onAction: this.handleBreakAction.bind(this)
    })
    
    // 슬라이드 배열에 삽입
    this.slides.splice(insertIndex, 0, {
      component: breakSlide,
      type: 'break',
      data: { watchTime }
    })
    
    // DOM에 삽입
    const track = this.el.querySelector('#shortform-track')
    const nextSlide = track.children[insertIndex]
    
    if (nextSlide) {
      track.insertBefore(breakSlide.el, nextSlide)
    } else {
      track.appendChild(breakSlide.el)
    }
    
    // 인덱스 재조정
    this.slides.forEach((slide, index) => {
      slide.component.index = index
      slide.component.el.setAttribute('data-index', index)
    })
    
    console.log(`🛑 휴식 알림 삽입 완료: ${Math.floor(watchTime)}분 시청 후`)
  }
  
  moveToSlide(index, animated = true) {
    if (this.isAnimating || index < 0 || index >= this.slides.length) return
    
    // 이전 슬라이드 비활성화
    if (this.slides[this.currentIndex]) {
      this.slides[this.currentIndex].component.setActive?.(false)
    }
    
    this.isAnimating = true
    this.currentIndex = index
    
    // 새 슬라이드 활성화
    if (this.slides[this.currentIndex]) {
      this.slides[this.currentIndex].component.setActive?.(true)
    }
    
    // 🚀 백그라운드 미리 로딩 트리거
    this.preloadNearbySlides()
    
    // 무한 스크롤 체크
    this.checkInfiniteScroll()
    
    // 휴식 슬라이드 체크 (비디오 슬라이드일 때만, 그리고 앞으로 이동할 때만)
    if (this.slides[this.currentIndex]?.type === 'video' && !this.isBreakSlideInserting) {
      // 약간의 딜레이를 주고 체크 (슬라이드 이동이 완료된 후)
      setTimeout(() => {
        this.checkForBreakSlide()
      }, 500)
    }
    
    // 슬라이드 이동
    if (animated) {
      this.updateSlidePosition(true)
    setTimeout(() => {
        this.isAnimating = false
      }, this.swipeConfig.swipeDuration)
    } else {
      this.updateSlidePosition(false)
      this.isAnimating = false
    }
    
    this.updateVideoWatchTime()
  }
  
  // 🔄 주변 슬라이드 백그라운드 미리 로딩
  preloadNearbySlides() {
    const preloadDistance = 2 // 앞뒤 2개씩 미리 로딩
    const start = Math.max(0, this.currentIndex - preloadDistance)
    const end = Math.min(this.slides.length - 1, this.currentIndex + preloadDistance)
    
    let preloadCount = 0
    for (let i = start; i <= end; i++) {
      if (i !== this.currentIndex && 
          this.slides[i] && 
          this.slides[i].type === 'video' &&
          typeof this.slides[i].component.preload === 'function') {
        this.slides[i].component.preload()
        preloadCount++
      }
    }
    
    if (preloadCount > 0) {
      console.log(`🔄 백그라운드 미리 로딩: ${preloadCount}개 슬라이드 (현재: ${this.currentIndex})`)
    }
  }
  
  checkInfiniteScroll() {
    const remainingSlides = this.slides.length - this.currentIndex - 1
    
    if (remainingSlides <= this.loadThreshold) {
      this.loadMoreVideos()
      console.log(`📱 새 비디오 로드: ${this.videosPerBatch}개 추가`)
    }
  }
  
  updateSlidePosition(smooth = false) {
    const track = this.el.querySelector('#shortform-track')
    if (!track) return
    
    const translateY = -this.currentIndex * 100
    
    if (smooth) {
      track.style.transition = `transform ${this.swipeConfig.swipeDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
      track.style.transform = `translateY(${translateY}%)`
      
      setTimeout(() => {
      track.style.transition = ''
      }, this.swipeConfig.swipeDuration)
    } else {
      track.style.transform = `translateY(${translateY}%)`
    }
  }
  
  startWatchTimeTracking() {
    console.log('⏱️ 시청 시간 추적 시작')
    
    // 시간 업데이트 (5초마다)
    setInterval(() => {
      this.updateVideoWatchTime()
    }, 5000)
    
    // 실시간 추적 (1초마다)
    setInterval(() => {
      this.updateVideoWatchTime()
    }, 1000)
  }
  
  updateVideoWatchTime() {
    const now = Date.now()
    this.totalWatchTime = (now - this.watchStartTime) / 1000 / 60 // 분 단위
  }
  
  getTotalWatchTime() {
    this.updateVideoWatchTime()
    return this.totalWatchTime
  }
  
  handleSlideAction(action, video, index) {
    console.log(`🎬 비디오 액션: ${action}`, video.title)
    
    // 액션별 처리
    switch (action) {
      case 'like':
        // 좋아요 분석 데이터 수집 등
        break
      case 'dislike':
        // 싫어요 분석 데이터 수집 등
        break
    }
  }
  
  handleAutoNext() {
    console.log('⏭️ 자동 다음 슬라이드 이동')
    
    // 다음 슬라이드로 이동
    const nextIndex = this.currentIndex + 1
    
    if (nextIndex < this.slides.length) {
      this.moveToSlide(nextIndex, true)
    } else {
      // 마지막 슬라이드면 새 비디오 로드 후 이동
      this.loadMoreVideos()
      this.moveToSlide(nextIndex, true)
    }
  }
  
  handleBreakAction(action, data) {
    console.log(`⏰ 휴식 액션: ${action}`, data)
    
    switch (action) {
      case 'rest':
        // 휴식 타이머 시작됨
        console.log('💤 휴식 타이머 시작')
        break
      case 'continue':
        // 계속 시청
        console.log('▶️ 계속 시청하기')
        this.moveToSlide(this.currentIndex + 1)
        break
      case 'rest-complete':
        // 휴식 완료
        console.log('✅ 휴식 완료 - 다음 영상으로')
        this.moveToSlide(this.currentIndex + 1)
        break
      case 'rest-skip':
        // 휴식 건너뛰기
        console.log('⏭️ 휴식 건너뛰기')
        this.moveToSlide(this.currentIndex + 1)
        break
    }
  }
  
  getResistance(distance, direction) {
    const isAtBoundary = 
      (direction > 0 && this.currentIndex >= this.slides.length - 1) ||
      (direction < 0 && this.currentIndex <= 0)
    
    if (!isAtBoundary) return 1
    
    const resistance = Math.exp(-Math.abs(distance) / 200)
    return Math.max(resistance, this.swipeConfig.maxResistance)
  }
  
  setupEventListeners() {
    // 터치 이벤트
    this.el.addEventListener('touchstart', this.handleStart.bind(this), { passive: true })
    this.el.addEventListener('touchmove', this.handleMove.bind(this), { passive: false })
    this.el.addEventListener('touchend', this.handleEnd.bind(this))
    
    // 마우스 이벤트
    this.el.addEventListener('mousedown', this.handleStart.bind(this))
    this.el.addEventListener('mousemove', this.handleMove.bind(this))
    this.el.addEventListener('mouseup', this.handleEnd.bind(this))
    this.el.addEventListener('mouseleave', this.handleEnd.bind(this))
    
    // 휠 이벤트
    this.el.addEventListener('wheel', (e) => {
      if (this.isAnimating || this.isDragging) return
      
      e.preventDefault()
      
      const direction = e.deltaY > 0 ? 1 : -1
      const targetIndex = this.currentIndex + direction
      
      if (targetIndex >= 0 && targetIndex < this.slides.length) {
        this.moveToSlide(targetIndex)
      }
    }, { passive: false })
    
    // 키보드 이벤트
    document.addEventListener('keydown', (e) => {
      if (!this.el.closest('.video-page')) return
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = this.currentIndex + 1
        if (nextIndex < this.slides.length) {
          this.moveToSlide(nextIndex)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = this.currentIndex - 1
        if (prevIndex >= 0) {
          this.moveToSlide(prevIndex)
        }
      }
    })
  }
  
  handleStart(e) {
    if (this.isAnimating) return
    
    this.isDragging = true
    this.startTime = Date.now()
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    this.startY = clientY
    this.currentY = clientY
    this.lastY = clientY
    this.velocity = 0
  }
  
  handleMove(e) {
    if (!this.isDragging || this.isAnimating) return
    
    e.preventDefault()
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const deltaY = clientY - this.lastY
    const distance = clientY - this.startY
    
    this.currentY = clientY
    this.velocity = deltaY
    this.lastY = clientY
    
    // 저항감 계산
    const direction = distance > 0 ? -1 : 1 // 스와이프 방향 (위로 스와이프시 +1)
    const resistance = this.getResistance(Math.abs(distance), direction)
    const adjustedDistance = distance * resistance
    
    // 실시간 위치 업데이트
    const track = this.el.querySelector('#shortform-track')
    if (track) {
      const baseTranslate = -this.currentIndex * 100
      const percentageMove = (adjustedDistance / window.innerHeight) * 100
      track.style.transform = `translateY(${baseTranslate + percentageMove}%)`
    }
  }
  
  handleEnd() {
    if (!this.isDragging) return
    
    this.isDragging = false
    
    const distance = this.currentY - this.startY
    const duration = Date.now() - this.startTime
    const absDistance = Math.abs(distance)
    const absVelocity = Math.abs(this.velocity)
    
    const shouldSwipe = 
      absDistance > this.swipeConfig.threshold || 
      (absVelocity > this.swipeConfig.velocityThreshold && duration < 300)
    
    if (shouldSwipe) {
      const direction = distance > 0 ? -1 : 1 // 위로 스와이프시 +1 (다음 슬라이드)
      const targetIndex = this.currentIndex + direction
      
      if (targetIndex >= 0 && targetIndex < this.slides.length) {
        this.moveToSlide(targetIndex)
      } else {
        // 경계에서는 원래 위치로 돌아가기
        this.updateSlidePosition(true)
      }
    } else {
      // 원래 위치로 돌아가기
      this.updateSlidePosition(true)
    }
  }
  
  destroy() {
    console.log('🗑️ VideoSwiper 정리')
    
    // 모든 슬라이드 정리
    this.slides.forEach(slideData => {
      try {
        slideData.component.destroy?.()
      } catch (error) {
        console.warn('슬라이드 정리 실패:', error)
      }
    })
    
    this.slides = []
    
    super.destroy?.()
  }
} 