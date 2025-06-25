import { Component } from './Component.js'

export default class VideoSlide extends Component {
  constructor(options = {}) {
    super(options)
    this.video = options.video || {}
    this.index = options.index || 0
    this.isActive = options.isActive || false
    this.onAction = options.onAction || (() => {})
    this.onAutoNext = options.onAutoNext || (() => {})
    
    // 🚀 백그라운드 로딩 시스템
    this.enableBackgroundLoading = options.enableBackgroundLoading !== false
    this.preloadDistance = options.preloadDistance || 2  // 앞뒤 2개씩 미리 로딩
    this.isPlayerInitialized = false
    
    // YouTube Player 관련
    this.youtubePlayer = null
    this.isYouTubeAPIReady = false
    this.playerReady = false
    this.videoDuration = 0 // 실제 비디오 길이 (초)
    this.videoCurrentTime = 0 // 현재 재생 시간
    this.progressUpdateInterval = null // 진행바 업데이트 인터벌
    
    // 상태 관리 개선
    this.isPlaying = false // 내부 재생 상태
    this.isProcessingToggle = false // 토글 처리 중 플래그
    this.lastToggleTime = 0 // 마지막 토글 시간 (디바운스용)
    
    this.progressTimer = null
    
    this.render()
    this.setupEventListeners()
    
    // 🎯 백그라운드 로딩: 활성화된 슬라이드만 즉시 초기화
    if (this.isActive || !this.enableBackgroundLoading) {
      this.initializePlayer()
    }
  }
  
  // 🎯 플레이어 초기화 (지연 로딩 지원)
  initializePlayer() {
    if (this.isPlayerInitialized) return
    
    this.isPlayerInitialized = true
    console.log(`🔄 플레이어 초기화: ${this.video.title} (인덱스: ${this.index})`)
    this.loadYouTubeAPI()
  }
  
  // 📋 백그라운드 미리 로딩 트리거 (외부에서 호출)
  preload() {
    if (!this.isPlayerInitialized) {
      console.log(`🔄 백그라운드 미리 로딩: ${this.video.title}`)
      this.initializePlayer()
    }
  }
  
  loadYouTubeAPI() {
    // 🔍 YouTube API 로딩 최적화 (가이드 문서 베스트 프랙티스)
    if (!window.YT) {
      // API가 없으면 로드 시작
      if (!window.youtubeAPILoading) {
        window.youtubeAPILoading = true
        
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        
        // 로드 완료/실패 처리
        tag.onload = () => {
          console.log('🎬 YouTube iframe API 스크립트 로드 완료')
          window.youtubeAPILoading = false
        }
        
        tag.onerror = () => {
          console.error('❌ YouTube API 로드 실패')
          window.youtubeAPILoading = false
          this.handleAPILoadError()
        }
        
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
        
        // 전역 콜백 함수 설정 (API 명세서 필수 사항)
        window.onYouTubeIframeAPIReady = () => {
          console.log('🎬 YouTube API 준비 완료')
          window.youtubeAPILoaded = true
          // 대기 중인 모든 플레이어들에게 알림
          document.dispatchEvent(new CustomEvent('youtubeAPIReady'))
        }
      }
      
      // API 로드 대기
      this.onAPIReady = () => {
        this.isYouTubeAPIReady = true
        this.initializeYouTubePlayer()
      }
      document.addEventListener('youtubeAPIReady', this.onAPIReady, { once: true })
      
    } else if (window.YT.Player) {
      // YT.Player 클래스 사용 가능
      this.isYouTubeAPIReady = true
      this.initializeYouTubePlayer()
    } else {
      // YT 객체는 있지만 Player 클래스 대기 중
      window.onYouTubeIframeAPIReady = () => {
        this.isYouTubeAPIReady = true
        this.initializeYouTubePlayer()
      }
    }
  }
  
  handleAPILoadError() {
    // API 로드 실패 시 폴백 처리
    console.warn('⚠️ YouTube API 사용 불가 - 폴백 모드로 전환')
    this.showFallbackImage('YouTube API를 로드할 수 없습니다')
  }
  
  initializeYouTubePlayer() {
    if (!this.isYouTubeAPIReady || !this.video.videoId) return
    
    const playerElement = this.el.querySelector('.youtube-player')
    if (!playerElement) return
    
    try {
      this.youtubePlayer = new YT.Player(playerElement, {
        height: '100%',
        width: '100%',
        videoId: this.video.videoId,
        playerVars: {
          // 🔧 컨트롤 및 UI (2025년 기준 최적화)
          controls: 0,              // 0=숨김, 1=표시(기본값)
          disablekb: 1,            // 1=키보드 컨트롤 비활성화
          fs: 0,                   // 0=전체화면 버튼 숨김
          
          // 🎬 재생 설정
          autoplay: 1,             // 1=자동재생 (숏폼 비디오 표준)
          mute: 1,                 // 1=음소거 시작 (자동재생 시 필요)
          
          // 📱 모바일 최적화
          playsinline: 1,          // 1=인라인 재생 (iOS)
          
          // 🔗 관련 동영상
          rel: 0,                  // 0=같은 채널 관련 동영상만
          
          // 🎨 UI 요소
          iv_load_policy: 3,       // 3=주석 숨김
          cc_load_policy: 0,       // 0=자막 숨김
          
          // 🔒 보안
          enablejsapi: 1,          // 1=JavaScript API 활성화
          origin: window.location.origin,
          widget_referrer: window.location.origin,
          
          // 🌍 지역화
          hl: 'ko',               // 인터페이스 언어
          cc_lang_pref: 'ko',     // 자막 언어
          
          // 🎨 스타일링
          color: 'white'          // 진행바 색상 (red/white)
        },
        events: {
          onReady: this.onPlayerReady.bind(this),
          onStateChange: this.onPlayerStateChange.bind(this),
          onError: this.onPlayerError.bind(this)
        }
      })
      
      console.log(`🎬 YouTube 플레이어 초기화 (자동재생): ${this.video.videoId}`)
    } catch (error) {
      console.error('YouTube 플레이어 초기화 실패:', error)
      this.showFallbackImage()
    }
  }
  
  // 🛡️ 안전한 YouTube API 메소드 호출 (가이드 문서 베스트 프랙티스)
  safeCall(method, ...args) {
    try {
      if (this.youtubePlayer && typeof this.youtubePlayer[method] === 'function') {
        return this.youtubePlayer[method](...args)
      }
    } catch (error) {
      console.warn(`🚫 YouTube API 호출 실패: ${method}`, error)
      return null
    }
    return null
  }
  
  // 🔍 강화된 플레이어 및 DOM 상태 확인
  isPlayerReady() {
    return this.youtubePlayer && 
           this.playerReady &&
           this.isDOMConnected() &&
           typeof this.youtubePlayer.getPlayerState === 'function' &&
           this.youtubePlayer.getPlayerState() !== undefined
  }
  
  // 🌐 더 강력한 DOM 연결 상태 확인
  isDOMConnected() {
    return this.el && 
           this.el.isConnected && 
           this.el.offsetParent !== null &&  // display: none 체크
           document.contains(this.el)        // 실제 DOM 트리에 연결됨
  }

  onPlayerReady(event) {
    this.playerReady = true
    
    // 안전한 메소드 호출로 비디오 길이 가져오기
    this.videoDuration = this.safeCall('getDuration') || 30
    console.log(`✅ YouTube 플레이어 준비 완료: ${this.video.videoId} (${this.videoDuration}초)`)
    
    // ✅ 플레이어 준비 완료 시 액션 버튼 활성화
    this.enableActionButtons()
    
    // 활성 슬라이드면 재생 시작
    if (this.isActive) {
      this.startVideoPlayback()
    }
  }
  
  onPlayerStateChange(event) {
    const state = event.data
    const playerElement = this.el.querySelector('.youtube-player')
    
    // 버퍼링 상태 시각화
    if (playerElement) {
      playerElement.classList.remove('buffering', 'error')
    }
    
    switch (state) {
      case YT.PlayerState.PLAYING:
        this.isPlaying = true
        this.video.isPlaying = true
        this.startProgress()
        this.updatePlayIcon('⏸')
        break
      case YT.PlayerState.PAUSED:
        this.isPlaying = false
        this.video.isPlaying = false
        this.pauseProgress()
        this.updatePlayIcon('▶')
        break
      case YT.PlayerState.ENDED:
        this.isPlaying = false
        this.video.isPlaying = false
        this.resetProgress()
        this.updatePlayIcon('▶')
        // 약간의 딜레이 후 다음 슬라이드로
        setTimeout(() => {
          this.onAutoNext()
        }, 500)
        break
      case YT.PlayerState.BUFFERING:
        if (playerElement) {
          playerElement.classList.add('buffering')
        }
        break
      case YT.PlayerState.CUED:
        // 비디오 준비됨
        break
    }
    
    // 토글 처리 중 플래그 해제
    this.isProcessingToggle = false
  }
  
  updatePlayIcon(iconType) {
    // 재생/일시정지 아이콘 업데이트
    const playIcon = this.el.querySelector('.play-indicator .play-icon')
    if (playIcon) {
      if (iconType === '▶') {
        // 재생 아이콘 (삼각형)
        playIcon.innerHTML = `
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <polygon points="8,5 19,12 8,19" fill="currentColor"/>
          </svg>
        `
      } else {
        // 일시정지 아이콘 (두 개 막대)
        playIcon.innerHTML = `
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
          </svg>
        `
      }
    }
  }
  
  onPlayerError(event) {
    const errorCode = event.data
    console.error('YouTube 플레이어 오류:', errorCode)
    
    // 에러 상태 시각화
    const playerElement = this.el.querySelector('.youtube-player')
    if (playerElement) {
      playerElement.classList.add('error')
      playerElement.classList.remove('buffering')
    }
    
    // 에러 코드별 처리
    let errorMessage = '비디오를 로드할 수 없습니다'
    switch (errorCode) {
      case 2:
        console.error('잘못된 비디오 ID')
        errorMessage = '잘못된 비디오 ID입니다'
        break
      case 5:
        console.error('HTML5 플레이어 오류')
        errorMessage = '플레이어 오류가 발생했습니다'
        break
      case 100:
        console.error('비디오를 찾을 수 없음')
        errorMessage = '비디오를 찾을 수 없습니다'
        break
      case 101:
      case 150:
        console.error('임베드 허용되지 않음')
        errorMessage = '이 비디오는 재생할 수 없습니다'
        break
    }
    
    this.showFallbackImage(errorMessage)
  }
  
  showFallbackImage(errorMessage = '이 비디오는 재생할 수 없습니다') {
    // YouTube 비디오 로드 실패 시 상세한 안내 모달 표시
    const playerContainer = this.el.querySelector('.video-background')
    if (playerContainer) {
      // 🖼️ 다단계 썸네일 폴백 시스템 (404 오류 방지)
      const fallbackChain = this.createThumbnailFallbackChain()
      
      playerContainer.innerHTML = `
        <img class="video-image" 
             src="${fallbackChain[0]}" 
             alt="${this.video.title}"
             data-fallback-index="0"
             data-fallback-chain='${JSON.stringify(fallbackChain)}'
             onerror="this.dataset.fallbackIndex++; 
                     const chain = JSON.parse(this.dataset.fallbackChain); 
                     if (this.dataset.fallbackIndex < chain.length) { 
                       this.src = chain[this.dataset.fallbackIndex]; 
                     }" />
        
        <!-- 확장된 비디오 오류 모달 -->
        <div class="video-error-modal">
          <div class="error-modal-content">
            <div class="error-icon">⚠️</div>
            <div class="error-title">${errorMessage}</div>
            <div class="error-description">
              비디오는 재생할 수 없지만,<br>
              YouTube에서 직접 확인하실 수 있습니다.
            </div>
            <div class="error-actions">
              <button class="youtube-watch-btn" data-action="youtube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" 
                        stroke="white" stroke-width="2" fill="none"/>
                  <polygon points="9.75,15.02 15.5,11.75 9.75,8.48" fill="white"/>
                </svg>
                YouTube에서 보기
              </button>
              <button class="dismiss-btn" data-action="dismiss-error">
                다음 영상으로
              </button>
            </div>
          </div>
        </div>
        
        <div class="play-indicator" style="opacity: 0;">
          <div class="play-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <polygon points="8,5 19,12 8,19" fill="currentColor"/>
            </svg>
          </div>
        </div>
      `
      
      // 버튼 이벤트 리스너 추가
      this.setupErrorModalListeners()
      
      // 액션 버튼들 비활성화
      this.disableActionButtons()
      
      // 폴백 진행바 사용
      setTimeout(() => {
        if (this.isActive) {
          this.startFallbackProgress()
        }
      }, 1000)
    }
  }
  
  // 🖼️ 다단계 썸네일 폴백 체인 생성
  createThumbnailFallbackChain() {
    const videoId = this.video.videoId
    const randomSeed = this.index + 1
    
    return [
      // 1차: 고화질 썸네일
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      // 2차: 중화질 썸네일
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      // 3차: 기본 썸네일
      `https://img.youtube.com/vi/${videoId}/default.jpg`,
      // 4차: 고정 색상 배경
      `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="700" viewBox="0 0 400 700"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23667eea"/><stop offset="100%" style="stop-color:%23764ba2"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23bg)"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-size="32" font-family="Arial">${this.video.title || '영상'}</text></svg>`,
      // 5차: 랜덤 이미지 (마지막 폴백)
      `https://picsum.photos/400/700?random=${randomSeed}`
    ]
  }

  // 🚨 오류 모달 버튼 이벤트 리스너 설정
  setupErrorModalListeners() {
    const modal = this.el.querySelector('.video-error-modal')
    if (!modal) return
    
    // YouTube에서 보기 버튼
    const youtubeBtn = modal.querySelector('.youtube-watch-btn')
    if (youtubeBtn) {
      youtubeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.animateButton(youtubeBtn)
        this.openInYoutube()
      })
    }
    
    // 다음 영상으로 버튼
    const dismissBtn = modal.querySelector('.dismiss-btn')
    if (dismissBtn) {
      dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.animateButton(dismissBtn)
        
        // 액션 버튼 재활성화
        this.enableActionButtons()
        
        // 0.3초 후 다음 슬라이드로 이동
        setTimeout(() => {
          this.onAutoNext()
        }, 300)
      })
    }
  }

  // 🔒 액션 버튼들 비활성화
  disableActionButtons() {
    const videoActions = this.el.querySelector('.video-actions')
    if (videoActions) {
      videoActions.classList.add('disabled')
      videoActions.style.opacity = '0.3'
      videoActions.style.pointerEvents = 'none'
      videoActions.style.filter = 'grayscale(50%)'
      
      // 모든 액션 버튼들 비활성화
      const actionBtns = videoActions.querySelectorAll('.action-btn')
      actionBtns.forEach(btn => {
        btn.style.cursor = 'not-allowed'
        btn.style.transform = 'none'
      })
      
      console.log('🔒 액션 버튼들 비활성화됨 (오류 모달 표시)')
    }
  }

  // ✅ 액션 버튼들 활성화
  enableActionButtons() {
    const videoActions = this.el.querySelector('.video-actions')
    if (videoActions) {
      videoActions.classList.remove('disabled')
      videoActions.style.opacity = ''
      videoActions.style.pointerEvents = ''
      videoActions.style.filter = ''
      
      // 모든 액션 버튼들 활성화
      const actionBtns = videoActions.querySelectorAll('.action-btn')
      actionBtns.forEach(btn => {
        btn.style.cursor = ''
        btn.style.transform = ''
      })
      
      console.log('✅ 액션 버튼들 활성화됨')
    }
  }
  
  startVideoPlayback(fromBeginning = false) {
    // 안전한 YouTube 플레이어 상태 확인
    if (this.isPlayerReady() && this.el.isConnected) {
      const playerState = this.safeCall('getPlayerState')
      
      if (playerState !== null) {
        // 🔄 처음부터 재생할 때만 seekTo 호출
        if (fromBeginning) {
          this.safeCall('seekTo', 0, true)
        }
        
        // 음소거 상태 확인 후 해제 시도
        const isMuted = this.safeCall('isMuted')
        if (isMuted) {
          this.safeCall('unMute')
        }
        
        // 안전한 재생 명령
        const result = this.safeCall('playVideo')
        if (result !== null) {
          console.log(`✅ YouTube 플레이어 재생 시작 ${fromBeginning ? '(처음부터)' : '(현재 위치에서)'}`)
          this.isProcessingToggle = false
          return
        }
      }
    }
    
    // 폴백: YouTube 실패 시 진행바만 사용
    if (this.isActive) {
      this.startFallbackProgress()
    }
    this.isProcessingToggle = false
  }
  
  pauseVideoPlayback() {
    // 안전한 YouTube 플레이어 상태 확인
    if (this.isPlayerReady() && this.el.isConnected) {
      const playerState = this.safeCall('getPlayerState')
      
      if (playerState !== null) {
        // 안전한 일시정지 명령
        const result = this.safeCall('pauseVideo')
        if (result !== null) {
          console.log('✅ YouTube 플레이어 일시정지')
          this.isProcessingToggle = false
          return
        }
      }
    }
    
    // 폴백: YouTube 실패 시 진행바만 정지
    this.pauseProgress()
    this.isProcessingToggle = false
  }
  
  render() {
    this.el.className = 'shortform-slide'
    this.el.setAttribute('data-index', this.index)
    
    this.el.innerHTML = /* html */ `
      <div class="video-container">
        <!-- YouTube 비디오 플레이어 -->
        <div class="video-background" data-action="toggle-play">
          ${this.video.videoId ? 
            `<div class="youtube-player" id="youtube-player-${this.index}"></div>` :
            `<img class="video-image" src="https://picsum.photos/400/700?random=${this.index + 1}" alt="Video ${this.index + 1}" />`
          }
          <!-- 재생/정지 인디케이터 (터치 피드백용) -->
          <div class="play-indicator" style="opacity: 0;">
            <div class="play-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
              </svg>
            </div>
          </div>
        </div>
        
        <!-- 우측 액션 버튼들 -->
        <div class="video-actions">
          <div class="action-btn like-btn" data-action="like">
            <div class="action-icon ${this.video.isLiked ? 'active' : ''}">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" 
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          
          <div class="action-btn dislike-btn" data-action="dislike">
            <div class="action-icon ${this.video.isDisliked ? 'active' : ''}">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" 
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          
          <div class="action-btn share-btn" data-action="share">
            <div class="action-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="2"/>
                <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
          </div>
          
          <div class="action-btn youtube-btn" data-action="youtube">
            <div class="action-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" 
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polygon points="9.75,15.02 15.5,11.75 9.75,8.48" fill="currentColor"/>
              </svg>
            </div>
          </div>
        </div>
        
        <!-- 하단 정보 영역 (제목과 크리에이터 이름만) -->
        <div class="video-info">
          <div class="content-section">
            <div class="content-details">
              <div class="video-title">${this.video.title || '멋진 영상입니다!'}</div>
              <div class="creator-name">${this.video.creator || '@creator'}</div>
            </div>
          </div>
        </div>
        
        <!-- 진행바 -->
        <div class="video-progress">
          <div class="progress-fill" style="width: 0%;"></div>
        </div>
      </div>
    `
    
    // 🔄 백그라운드 로딩이 비활성화된 경우에만 즉시 초기화
    if (!this.enableBackgroundLoading && !this.isPlayerInitialized) {
      setTimeout(() => {
        this.initializePlayer()
      }, 100)
    }
    
    // ✅ 초기 렌더링 시 액션 버튼 활성화
    this.enableActionButtons()
    
    // 활성 상태면 진행바 시작
    if (this.isActive) {
      setTimeout(() => {
        this.startProgress()
      }, 500)
    }
  }
  
  formatCount(count) {
    if (!count) return '0'
    if (typeof count === 'string') return count
    
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }
  
  setupEventListeners() {
    // 액션 버튼 클릭
    this.el.addEventListener('click', (e) => {
      const actionElement = e.target.closest('[data-action]')
      if (!actionElement) return
      
      const action = actionElement.dataset.action
      this.handleAction(action, e)
    })
  }
  
  handleAction(action, event) {
    event.stopPropagation()
    
    switch (action) {
      case 'toggle-play':
        this.togglePlay()
        break
      case 'like':
        this.toggleLike()
        break
      case 'dislike':
        this.toggleDislike()
        break
      case 'share':
        this.handleShare()
        break
      case 'youtube':
        this.openInYoutube()
        break
    }
    
    // 부모 컴포넌트에 액션 알림
    this.onAction(action, this.video, this.index)
  }
  
  togglePlay() {
    // 디바운스: 300ms 내 중복 호출 방지
    const now = Date.now()
    if (now - this.lastToggleTime < 300) {
      return
    }
    this.lastToggleTime = now
    
    // 이미 처리 중이면 무시
    if (this.isProcessingToggle) {
      return
    }
    
    this.isProcessingToggle = true
    
    const playIndicator = this.el.querySelector('.play-indicator')
    const playIcon = this.el.querySelector('.play-icon')
    
    if (this.isPlaying) {
      // 일시정지
      this.pauseVideoPlayback()
      this.isPlaying = false
      this.video.isPlaying = false
      
      // UI 즉시 업데이트
      this.updatePlayIcon('▶')
      
      // 일시정지 인디케이터 표시
      this.showPlayIndicator('⏸')
      
    } else {
      // 재생 (현재 위치에서)
      this.startVideoPlayback()
      this.isPlaying = true
      this.video.isPlaying = true
      
      // UI 즉시 업데이트
      this.updatePlayIcon('⏸')
      
      // 재생 인디케이터 표시
      this.showPlayIndicator('▶')
    }
    
    // 짧은 딜레이 후 플래그 해제 (YouTube 상태 변화가 없을 경우 대비)
    setTimeout(() => {
      this.isProcessingToggle = false
    }, 1000)
  }
  
  showPlayIndicator(iconType) {
    const playIndicator = this.el.querySelector('.play-indicator')
    const playIcon = this.el.querySelector('.play-icon')
    
    if (playIndicator && playIcon) {
      // SVG 아이콘 업데이트
      if (iconType === '▶') {
        // 재생 아이콘 (삼각형)
        playIcon.innerHTML = `
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <polygon points="8,5 19,12 8,19" fill="currentColor"/>
          </svg>
        `
      } else {
        // 일시정지 아이콘 (두 개 막대)
        playIcon.innerHTML = `
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
          </svg>
        `
      }
      
      playIndicator.style.opacity = '1'
      playIndicator.style.transform = 'translate(-50%, -50%) scale(1.2)'
      
      setTimeout(() => {
        playIndicator.style.opacity = '0'
        playIndicator.style.transform = 'translate(-50%, -50%) scale(1)'
      }, 800)
    }
  }
  
  handleShare() {
    // 공유 버튼 클릭 효과
    this.animateButton(this.el.querySelector('.share-btn'))
    
    // 실제 YouTube URL 공유
    const youtubeUrl = `https://youtube.com/watch?v=${this.video.videoId}`
    
    // 공유 기능 (실제 구현 시 Web Share API 또는 복사 기능 사용)
    if (navigator.share) {
      navigator.share({
        title: this.video.title,
        text: `${this.video.creator}의 영상을 확인해보세요!`,
        url: youtubeUrl
      })
    } else {
      // 폴백: 클립보드에 복사
      navigator.clipboard.writeText(youtubeUrl).then(() => {
        console.log('YouTube URL 클립보드에 복사됨')
        // 토스트 메시지 표시 (실제 구현 시)
      })
    }
  }
  
  toggleLike() {
    this.video.isLiked = !this.video.isLiked
    
    // 좋아요와 싫어요는 상호 배타적
    if (this.video.isLiked && this.video.isDisliked) {
      this.video.isDisliked = false
      this.updateDislikeButton()
    }
    
    this.updateLikeButton()
    this.animateButton(this.el.querySelector('.like-btn'))
  }
  
  toggleDislike() {
    this.video.isDisliked = !this.video.isDisliked
    
    // 좋아요와 싫어요는 상호 배타적
    if (this.video.isDisliked && this.video.isLiked) {
      this.video.isLiked = false
      this.updateLikeButton()
    }
    
    this.updateDislikeButton()
    this.animateButton(this.el.querySelector('.dislike-btn'))
  }
  
  updateLikeButton() {
    const likeIcon = this.el.querySelector('.like-btn .action-icon')
    
    if (likeIcon) {
      likeIcon.classList.toggle('active', this.video.isLiked)
      // CSS로 색상 변경 처리 (.active 클래스로)
    }
  }
  
  updateDislikeButton() {
    const dislikeIcon = this.el.querySelector('.dislike-btn .action-icon')
    
    if (dislikeIcon) {
      dislikeIcon.classList.toggle('active', this.video.isDisliked)
      // CSS로 색상 변경 처리 (.active 클래스로)
    }
  }
  
  openInYoutube() {
    this.animateButton(this.el.querySelector('.youtube-btn'))
    
    // YouTube URL 생성 및 새 탭에서 열기
    const youtubeUrl = this.video.videoId ? 
      `https://youtube.com/watch?v=${this.video.videoId}` :
      `https://youtube.com/results?search_query=${encodeURIComponent(this.video.title || '재미있는 영상')}`
    
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer')
  }
  
  animateButton(button) {
    if (!button) return
    
    button.style.transform = 'scale(0.85)'
    setTimeout(() => {
      button.style.transform = ''  // 완전히 제거하여 기본값으로 복원
    }, 150)
  }
  
  startProgress() {
    // 이미 진행 중이면 중복 방지
    this.clearProgressUpdates()
    
    if (this.youtubePlayer && this.playerReady) {
      // YouTube 플레이어와 동기화된 진행바
      this.syncProgressWithYouTube()
    } else {
      // 폴백 진행바 (30초 기본)
      this.startFallbackProgress()
    }
  }
  
  syncProgressWithYouTube() {
    
    this.progressUpdateInterval = setInterval(() => {
      if (this.isPlayerReady() && this.isPlaying) {
        // 안전한 메소드 호출로 현재 시간과 길이 가져오기
        const currentTime = this.safeCall('getCurrentTime')
        const duration = this.safeCall('getDuration')
        
        if (currentTime !== null && duration !== null && duration > 0) {
          const progress = (currentTime / duration) * 100
          this.updateProgressBar(Math.min(progress, 100))
          
          // 영상 끝나면 다음으로 (안전장치)
          if (progress >= 99.5) {
            this.clearProgressUpdates()
            setTimeout(() => {
              this.onAutoNext()
            }, 200)
          }
        } else {
          // YouTube API 응답 없으면 폴백으로 전환
          this.clearProgressUpdates()
          this.startFallbackProgress()
        }
      }
    }, 100) // 100ms마다 업데이트
  }
  
  startFallbackProgress() {
    
    const duration = this.videoDuration > 0 ? this.videoDuration * 1000 : 30000 // 30초 기본
    const startTime = Date.now()
    
    this.progressUpdateInterval = setInterval(() => {
      if (!this.isPlaying) return
      
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / duration) * 100, 100)
      
      this.updateProgressBar(progress)
      
      // 100% 도달 시 다음 슬라이드로
      if (progress >= 100) {
        console.log('📊 폴백 진행바 완료 - 다음 슬라이드')
        this.clearProgressUpdates()
        this.onAutoNext()
      }
    }, 100) // 100ms마다 업데이트
  }
  
  pauseProgress() {
    this.isPlaying = false
    
    // 진행바 업데이트 중지 (인터벌은 유지하되 업데이트만 중지)
    // YouTube와 동기화된 경우에도 상태만 변경
  }
  
  resumeProgress() {
    this.isPlaying = true
    
    // 이미 인터벌이 실행 중이므로 상태만 변경
    // YouTube 플레이어의 경우 자동으로 동기화됨
  }
  
  updateProgressBar(percentage) {
    const progressFill = this.el.querySelector('.progress-fill')
    if (progressFill) {
      progressFill.style.width = `${percentage}%`
    }
  }
  
  resetProgress() {
    this.clearProgressUpdates()
    this.isPlaying = false
    
    // 진행바 0%로 리셋
    this.updateProgressBar(0)
  }
  
  clearProgressUpdates() {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval)
      this.progressUpdateInterval = null
    }
  }
  
  setActive(isActive) {
    this.isActive = isActive
    this.el.classList.toggle('active', isActive)
    
    if (isActive) {
      // 🔄 활성화 시 진행바 리셋 (항상 처음부터 시작)
      this.resetProgress()
      
      // ✅ 활성화 시 액션 버튼 활성화 (오류 상태가 아닌 경우)
      if (!this.el.querySelector('.video-error-modal')) {
        this.enableActionButtons()
      }
      
      // 🚀 활성화 시: 백그라운드 로딩이 활성화된 경우 플레이어 초기화
      if (!this.isPlayerInitialized) {
        this.initializePlayer()
      }
      
      // 재생 시작 (슬라이드 활성화 시에는 항상 처음부터)
      if (this.isPlayerReady()) {
        this.startVideoPlayback(true)
      } else {
        // 아직 준비되지 않았으면 폴백 진행바 시작
        this.isPlaying = true
        this.video.isPlaying = true
        setTimeout(() => {
          this.startFallbackProgress()
        }, 500)
      }
    } else {
      // 비활성화: 일시정지
      if (this.isPlayerReady()) {
        this.pauseVideoPlayback()
      } else {
        this.pauseProgress()
      }
      
      this.isPlaying = false
      this.video.isPlaying = false
    }
  }
  
  updateVideo(newVideoData) {
    this.video = { ...this.video, ...newVideoData }
    this.render()
  }
  
  destroy() {
    console.log('🗑️ VideoSlide 정리:', this.video.title)
    
    // 진행바 정리
    this.clearProgressUpdates()
    
    // YouTube 플레이어 안전한 정리 (가이드 문서 베스트 프랙티스)
    if (this.youtubePlayer) {
      const destroyResult = this.safeCall('destroy')
      if (destroyResult !== null) {
        console.log('✅ YouTube 플레이어 정리 완료')
      }
      this.youtubePlayer = null
    }
    
    // 이벤트 리스너 정리
    document.removeEventListener('youtubeAPIReady', this.onAPIReady)
    
    // 플래그 리셋
    this.playerReady = false
    this.isYouTubeAPIReady = false
    this.isProcessingToggle = false
    
    super.destroy?.()
  }
} 