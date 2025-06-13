/**
 * 📱 VideoPlayer - 최종 완성본 (Old 시스템 기반)
 * 
 * Old 시스템의 완벽하게 작동하는 VideoSwiper + VideoSlide + TimeBreakSlide 사용
 */

import { Component } from './Component.js'
import VideoSwiper from './VideoSwiper.js'
import './VideoPlayer.css'

export default class VideoPlayer extends Component {
  constructor() {
    super({ tagName: 'div' })
    
    // 비디오 관련 설정
    this.keyword = '추천 영상'
    this.videos = []
    this.videoSwiper = null
    
    // 뒤로가기 감지
    this.handlePopState = this.handleBackNavigation.bind(this)
    
    this.parseKeywordFromURL()
    this.render()
  }
  
  parseKeywordFromURL() {
    // URL에서 키워드 파라미터 추출
    const hash = window.location.hash
    const queryString = hash.split('?')[1]
    
    if (queryString) {
      const params = new URLSearchParams(queryString)
      const keyword = params.get('keyword')
      
      if (keyword) {
        this.keyword = decodeURIComponent(keyword)
        console.log('📋 URL에서 키워드 추출:', this.keyword)
      }
    }
  }
  
  render() {
    this.el.className = 'video-page'
    
    // 네비게이션 바 숨기기
    this.hideNavbar()
    
    // 뒤로가기 이벤트 리스너 등록
    window.addEventListener('popstate', this.handlePopState)
    
    // body에 video-page-active 클래스 추가
    document.body.classList.add('video-page-active')
    
    // 비디오 데이터 생성
    this.videos = this.generateVideoData()
    
    // VideoSwiper 생성
    this.createVideoSwiper()
  }
  
  generateVideoData() {
    // 🇰🇷 인기 한국 YouTube Shorts 영상 ID들 (임베드 허용 확인됨)
    const koreanShortsVideos = [
      { id: 'P_9XDrMCjjM', title: '여름 메이크업 꿀팁', topic: '뷰티', channel: '@olens_official' },
      { id: 'ZoJ2z3oEz2E', title: '홈카페 만들기', topic: '일상', channel: '@dailycafe_kr' },
      { id: 'X7OR3OYHROw', title: '요리 레시피 쇼츠', topic: '요리', channel: '@cooking_hacks' },
      { id: 'cQcLK8nMCuk', title: '패션 코디 팁', topic: '패션', channel: '@fashion_daily' },
      { id: '9AQyPu8KVMc', title: '운동 루틴', topic: '운동', channel: '@health_shorts' },
      { id: 'Rjh_YaRPKcE', title: '댄스 챌린지', topic: '댄스', channel: '@dance_cover' },
      { id: 'L_jSLtWQtow', title: '여행 브이로그', topic: '여행', channel: '@travel_korea' },
      { id: 'mNkR6HATNzQ', title: '일상 VLOG', topic: '일상', channel: '@daily_moments' },
      { id: 'jHGEGEE7Xm4', title: '음악 커버', topic: '음악', channel: '@music_cover_kr' }
    ]
    
    const koreanCreators = [
      { name: '@올렌즈', avatar: '💄', topic: '뷰티', tags: ['#뷰티', '#메이크업', '#렌즈'] },
      { name: '@데일리카페', avatar: '☕', topic: '카페', tags: ['#카페', '#홈카페', '#커피'] },
      { name: '@요리팁', avatar: '🍳', topic: '요리', tags: ['#요리', '#레시피', '#꿀팁'] },
      { name: '@패션데일리', avatar: '👗', topic: '패션', tags: ['#패션', '#코디', '#스타일'] },
      { name: '@헬스쇼츠', avatar: '💪', topic: '운동', tags: ['#운동', '#홈트', '#헬스'] },
      { name: '@댄스커버', avatar: '💃', topic: '댄스', tags: ['#댄스', '#커버', '#안무'] },
      { name: '@여행코리아', avatar: '🗺️', topic: '여행', tags: ['#여행', '#국내여행', '#맛집'] },
      { name: '@일상모먼트', avatar: '📸', topic: '일상', tags: ['#일상', '#브이로그', '#데일리'] },
      { name: '@음악커버', avatar: '🎤', topic: '음악', tags: ['#음악', '#커버', '#노래'] }
    ]
    
    // 🇰🇷 한국 Shorts 비디오 8개 생성 (실제 Shorts 영상 ID 사용)
    return Array.from({ length: 8 }, (_, i) => {
      const video = koreanShortsVideos[Math.floor(Math.random() * koreanShortsVideos.length)]
      const creator = koreanCreators[Math.floor(Math.random() * koreanCreators.length)]
      
      return {
        videoId: video.id, // 🎬 실제 한국 Shorts 영상 ID
        creator: creator.name,
        avatar: creator.avatar,
        title: `${video.title} | ${this.keyword}`,
        desc: `${this.keyword}과 관련된 ${creator.topic} 쇼츠 콘텐츠! ${video.title}`,
        tags: [...creator.tags, `#${this.keyword}`, '#쇼츠', '#한국'],
        likes: Math.floor(Math.random() * 100000) + 5000, // 한국 쇼츠 좋아요 수준
        comments: Math.floor(Math.random() * 8000) + 500,
        dislikes: Math.floor(Math.random() * 500) + 20,
        followers: Math.floor(Math.random() * 500000) + 10000, // 한국 유튜버 구독자 수준
        isLiked: Math.random() > 0.8,
        isDisliked: false,
        isFollowing: Math.random() > 0.6
      }
    })
  }
  
  createVideoSwiper() {
    try {
      this.videoSwiper = new VideoSwiper({
        videos: this.videos,
        keyword: this.keyword
      })
      
      this.el.appendChild(this.videoSwiper.el)
      
      console.log('✅ VideoSwiper 생성 완료:', this.videos.length, '개 비디오')
      
    } catch (error) {
      console.error('❌ VideoSwiper 생성 실패:', error)
      this.showErrorMessage()
    }
  }
  
  showErrorMessage() {
    this.el.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-align: center;
        padding: 40px;
      ">
        <div>
          <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
          <div style="font-size: 18px; margin-bottom: 10px;">비디오를 로드할 수 없습니다</div>
          <div style="font-size: 14px; opacity: 0.8;">잠시 후 다시 시도해주세요</div>
          <button onclick="window.history.back()" style="
            margin-top: 30px;
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            color: white;
            cursor: pointer;
            font-size: 16px;
          ">돌아가기</button>
        </div>
      </div>
    `
  }
  
  handleBackNavigation() {
    // 뒤로가기 시 정리 작업은 destroy에서 처리됨
  }
  
  hideNavbar() {
    const navbar = document.querySelector('.navbar')
    if (navbar) {
      navbar.style.display = 'none'
    }
  }
  
  showNavbar() {
    const navbar = document.querySelector('.navbar')
    if (navbar) {
      navbar.style.display = 'flex'
    }
  }
  
  // 컴포넌트 정리
  destroy() {
    console.log('🧹 VideoPlayer 정리 시작')
    
    // 네비게이션 바 복원
    this.showNavbar()
    
    // body 클래스 제거
    document.body.classList.remove('video-page-active')
    
    // VideoSwiper 정리
    if (this.videoSwiper) {
      try {
        this.videoSwiper.destroy()
        this.videoSwiper = null
        console.log('✅ VideoSwiper 정리 완료')
      } catch (error) {
        console.warn('⚠️ VideoSwiper 정리 중 오류:', error)
      }
    }
    
    // 이벤트 리스너 제거
    window.removeEventListener('popstate', this.handlePopState)
    
    console.log('🧹 VideoPlayer 정리 완료')
    
    super.destroy?.()
  }
} 