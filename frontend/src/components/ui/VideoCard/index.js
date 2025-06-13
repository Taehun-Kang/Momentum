import './VideoCard.css'

export default class VideoCard {
  constructor(container, options = {}) {
    this.container = container
    this.video = options.video || {}
    this.onClick = options.onClick || null
    this.size = options.size || 'medium' // small, medium, large
    
    this.init()
  }
  
  init() {
    this.render()
    this.bindEvents()
  }
  
  render() {
    const {
      id = '',
      thumbnail = 'https://picsum.photos/400/700?random=' + Math.floor(Math.random() * 1000),
      title = '제목 없음',
      duration = '0:00',
      date = '방금 전',
      views = '0',
      channel = '채널명'
    } = this.video
    
    this.container.innerHTML = `
      <div class="video-card ${this.size}" data-video-id="${id}">
        <div class="video-thumbnail">
          <img class="video-image" src="${thumbnail}" alt="${title}" loading="lazy" />
          <div class="video-info-overlay">
            <div class="video-title">${title}</div>
            <div class="video-channel">${channel}</div>
          </div>
        </div>
      </div>
    `
  }
  
  bindEvents() {
    const videoCard = this.container.querySelector('.video-card')
    if (!videoCard) return
    
    // 클릭 이벤트
    videoCard.addEventListener('click', (e) => {
      e.preventDefault()
      
      // 클릭 애니메이션
      videoCard.style.transform = 'scale(0.95)'
      
      setTimeout(() => {
        videoCard.style.transform = ''
        
        // 콜백 함수 호출
        if (this.onClick) {
          this.onClick(this.video)
        }
      }, 150)
    })
    
    // 호버 이벤트는 CSS로 처리 (이미지 스케일 효과)
  }
  
  // 비디오 데이터 업데이트
  updateVideo(newVideo) {
    this.video = { ...this.video, ...newVideo }
    this.render()
    this.bindEvents()
  }
  
  // 선택 상태 토글
  setSelected(selected = true) {
    const videoCard = this.container.querySelector('.video-card')
    if (videoCard) {
      if (selected) {
        videoCard.classList.add('selected')
      } else {
        videoCard.classList.remove('selected')
      }
    }
  }
  
  // 로딩 상태 설정
  setLoading(loading = true) {
    const videoCard = this.container.querySelector('.video-card')
    if (videoCard) {
      if (loading) {
        videoCard.classList.add('loading')
      } else {
        videoCard.classList.remove('loading')
      }
    }
  }
  
  // 컴포넌트 정리
  destroy() {
    this.container.innerHTML = ''
  }
} 