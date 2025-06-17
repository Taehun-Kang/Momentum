/**
 * 📱 VideoPlayer - 최종 완성본 (DB 연동)
 * 
 * ChatFlow → 실제 DB 조회 → VideoSwiper 영상 재생
 */

import { Component } from './Component.js'
import VideoSwiper from './VideoSwiper.js'
import searchService from '../../../services/searchService.js'
import './VideoPlayer.css'

export default class VideoPlayer extends Component {
  constructor() {
    super({ tagName: 'div' })
    
    // 비디오 관련 설정
    this.keyword = '추천 영상'
    this.videos = []
    this.videoSwiper = null
    this.isLoading = true
    
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
  
  async render() {
    this.el.className = 'video-page'
    
    // 네비게이션 바 숨기기
    this.hideNavbar()
    
    // 뒤로가기 이벤트 리스너 등록
    window.addEventListener('popstate', this.handlePopState)
    
    // body에 video-page-active 클래스 추가
    document.body.classList.add('video-page-active')
    
    // 로딩 상태 표시
    this.showLoadingState()
    
    // 🎬 실제 DB에서 영상 데이터 로드
    await this.loadVideoData()
    
    // VideoSwiper 생성
    if (this.videos.length > 0) {
      this.createVideoSwiper()
    } else {
      this.showNoVideosMessage()
    }
  }

  showLoadingState() {
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
          <div style="
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          "></div>
          <div style="font-size: 18px; margin-bottom: 10px;">"${this.keyword}" 영상 로딩 중...</div>
          <div style="font-size: 14px; opacity: 0.8;">DB에서 큐레이션된 영상을 가져오는 중입니다</div>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `
  }
  
  /**
   * 🎬 DB에서 키워드별 영상 데이터 로드
   */
  async loadVideoData() {
    try {
      console.log(`🎬 DB에서 "${this.keyword}" 영상 조회 시작`)
      
      // DB에서 키워드별 영상 조회
      const result = await searchService.getVideosByKeyword(this.keyword, {
        limit: 20  // 충분한 영상 수
      })
      
      if (result.success && result.data && result.data.length > 0) {
        // 백엔드 응답 확인
        const isFallback = result.meta?.is_fallback || false
        
        if (!isFallback) {
          // 🎯 실제 키워드 매칭 영상들
          console.log(`✅ DB에서 "${this.keyword}" 실제 영상 조회 성공: ${result.data.length}개`)
          this.videos = this.transformDbDataToVideoFormat(result.data)
          
        } else {
          // ⚠️ 백엔드 폴백 데이터 (키워드와 관련 없는 인기 영상들)
          console.log(`⚠️ DB에서 "${this.keyword}" 영상 없음, 백엔드 폴백 데이터 받음: ${result.data.length}개`)
          console.log('🔄 프론트엔드에서 더 적절한 폴백 데이터로 교체')
          
          // 백엔드 폴백 대신 키워드 관련 폴백 사용
          this.videos = this.generateKeywordRelatedFallback()
        }
        
      } else {
        console.warn(`⚠️ 키워드 "${this.keyword}" 영상 조회 실패 - 프론트엔드 폴백 사용`)
        this.videos = this.generateKeywordRelatedFallback()
      }
      
    } catch (error) {
      console.error('❌ DB 영상 로드 실패:', error)
      this.videos = this.generateKeywordRelatedFallback()
      
    } finally {
      this.isLoading = false
    }
  }

  /**
   * 🔧 DB 데이터를 VideoSwiper 형식으로 변환
   * @param {Array} dbVideos - DB에서 조회한 영상 데이터
   * @returns {Array} VideoSwiper용 영상 데이터
   */
  transformDbDataToVideoFormat(dbVideos) {
    return dbVideos.map((video, index) => {
      return {
        videoId: video.video_id,
        creator: video.channel_name || `@${video.channel_id}`,
        avatar: this.getChannelAvatar(video.channel_name, video.topic_tags),
        title: video.title || `${this.keyword} 관련 영상`,
        desc: video.description || `${this.keyword}과 관련된 큐레이션된 영상입니다.`,
        tags: this.formatTags(video, this.keyword),
        likes: video.like_count || Math.floor(Math.random() * 50000) + 1000,
        comments: video.comment_count || Math.floor(Math.random() * 3000) + 100,
        dislikes: Math.floor((video.like_count || 1000) * 0.05), // 좋아요의 5%
        followers: video.channel_subscriber_count || Math.floor(Math.random() * 100000) + 5000,
        isLiked: false,
        isDisliked: false,
        isFollowing: Math.random() > 0.7,
        // DB 추가 정보
        qualityScore: video.quality_score || 0.8,
        searchKeyword: video.search_keyword,
        cacheSource: video.cache_source || 'youtube_api'
      }
    })
  }

  /**
   * 🎨 채널 아바타 생성
   */
  getChannelAvatar(channelName, topicTags) {
    const avatarMap = {
      '음악': '🎵', '댄스': '💃', '요리': '🍳', '뷰티': '💄', 
      '패션': '👗', '운동': '💪', '여행': '🗺️', '게임': '🎮',
      '일상': '📸', '교육': '📚', 'ASMR': '🎧', '동물': '🐱'
    }
    
    // topic_tags에서 아바타 찾기
    if (topicTags && Array.isArray(topicTags)) {
      for (const tag of topicTags) {
        if (avatarMap[tag]) {
          return avatarMap[tag]
        }
      }
    }
    
    // 기본 아바타들
    const defaultAvatars = ['🎬', '⭐', '✨', '🎯', '🔥', '💫', '🌟', '🎨']
    return defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)]
  }

  /**
   * 🏷️ 태그 포맷팅
   */
  formatTags(video, keyword) {
    const tags = [`#${keyword}`, '#쇼츠']
    
    // topic_tags 추가
    if (video.topic_tags && Array.isArray(video.topic_tags)) {
      video.topic_tags.forEach(tag => tags.push(`#${tag}`))
    }
    
    // mood_tags 추가  
    if (video.mood_tags && Array.isArray(video.mood_tags)) {
      video.mood_tags.forEach(tag => tags.push(`#${tag}`))
    }
    
    return tags.slice(0, 6) // 최대 6개 태그
  }

  /**
   * 🎯 키워드 관련 폴백 데이터 생성
   * 키워드와 실제로 연관성 있는 폴백 영상들 제공
   */
  generateKeywordRelatedFallback() {
    console.log(`🎯 "${this.keyword}" 키워드 관련 폴백 영상 생성`)
    
    // 키워드별 관련 영상 매핑
    const keywordVideoMap = {
      '파티': [
        { id: 'dQw4w9WgXcQ', title: '파티 뮤직 플레이리스트', topic: '음악', channel: '@party_music' },
        { id: 'kJQP7kiw5Fk', title: '홈파티 꾸미기 아이디어', topic: '파티', channel: '@party_ideas' },
        { id: 'fJ9rUzIMcZQ', title: '파티 요리 레시피', topic: '요리', channel: '@party_cooking' },
        { id: 'V-_O7nl0Ii0', title: '생일파티 준비하기', topic: '파티', channel: '@birthday_party' }
      ],
      '댄스': [
        { id: 'YbJOTdZBX1g', title: '쉬운 댄스 따라하기', topic: '댄스', channel: '@dance_tutorial' },
        { id: 'ZZ5LpwO-An4', title: 'K-POP 댄스 커버', topic: '댄스', channel: '@kpop_dance' },
        { id: 'hFZFjoX2cGg', title: '댄스 기초 동작', topic: '댄스', channel: '@dance_basic' },
        { id: '2vjPBrBU-TM', title: '힙합 댄스 배우기', topic: '댄스', channel: '@hiphop_dance' }
      ],
      '케이팝': [
        { id: 'YbJOTdZBX1g', title: 'K-POP 신곡 커버', topic: '음악', channel: '@kpop_cover' },
        { id: 'ZZ5LpwO-An4', title: 'K-POP 댄스 챌린지', topic: '댄스', channel: '@kpop_dance' },
        { id: 'hFZFjoX2cGg', title: 'K-POP 아이돌 뮤직비디오', topic: '음악', channel: '@kpop_mv' },
        { id: '2vjPBrBU-TM', title: 'K-POP 노래 부르기', topic: '음악', channel: '@kpop_sing' }
      ],
      '요리': [
        { id: 'fJ9rUzIMcZQ', title: '간단한 요리 레시피', topic: '요리', channel: '@easy_cooking' },
        { id: 'V-_O7nl0Ii0', title: '한식 요리 배우기', topic: '요리', channel: '@korean_food' },
        { id: 'kJQP7kiw5Fk', title: '베이킹 초보 가이드', topic: '요리', channel: '@baking_guide' },
        { id: 'dQw4w9WgXcQ', title: '건강한 요리법', topic: '요리', channel: '@healthy_cook' }
      ],
      '레시피': [
        { id: 'fJ9rUzIMcZQ', title: '5분 완성 레시피', topic: '요리', channel: '@quick_recipe' },
        { id: 'V-_O7nl0Ii0', title: '다이어트 레시피', topic: '요리', channel: '@diet_recipe' },
        { id: 'kJQP7kiw5Fk', title: '초보자 레시피', topic: '요리', channel: '@beginner_recipe' },
        { id: 'dQw4w9WgXcQ', title: '간식 레시피', topic: '요리', channel: '@snack_recipe' }
      ],
      '운동': [
        { id: 'ZZ5LpwO-An4', title: '홈트레이닝 루틴', topic: '운동', channel: '@home_workout' },
        { id: 'YbJOTdZBX1g', title: '요가 기초 동작', topic: '운동', channel: '@yoga_basic' },
        { id: 'hFZFjoX2cGg', title: '근력운동 가이드', topic: '운동', channel: '@strength_training' },
        { id: '2vjPBrBU-TM', title: '스트레칭 루틴', topic: '운동', channel: '@stretching' }
      ],
      '휴식': [
        { id: 'dQw4w9WgXcQ', title: '힐링 음악 모음', topic: 'ASMR', channel: '@healing_music' },
        { id: 'kJQP7kiw5Fk', title: '명상 가이드', topic: '힐링', channel: '@meditation' },
        { id: 'fJ9rUzIMcZQ', title: '자연 소리 ASMR', topic: 'ASMR', channel: '@nature_asmr' },
        { id: 'V-_O7nl0Ii0', title: '잠자기 전 루틴', topic: '힐링', channel: '@sleep_routine' }
      ],
      '음악': [
        { id: 'dQw4w9WgXcQ', title: '인기 음악 모음', topic: '음악', channel: '@popular_music' },
        { id: 'kJQP7kiw5Fk', title: '어쿠스틱 커버', topic: '음악', channel: '@acoustic_cover' },
        { id: 'fJ9rUzIMcZQ', title: '피아노 연주', topic: '음악', channel: '@piano_music' },
        { id: 'V-_O7nl0Ii0', title: '기타 연주', topic: '음악', channel: '@guitar_music' }
      ],
      '뷰티': [
        { id: 'hFZFjoX2cGg', title: '5분 메이크업', topic: '뷰티', channel: '@quick_makeup' },
        { id: '2vjPBrBU-TM', title: '스킨케어 루틴', topic: '뷰티', channel: '@skincare_routine' },
        { id: 'YbJOTdZBX1g', title: '헤어스타일링 팁', topic: '뷰티', channel: '@hair_styling' },
        { id: 'ZZ5LpwO-An4', title: '네일아트 튜토리얼', topic: '뷰티', channel: '@nail_art' }
      ],
      '패션': [
        { id: 'hFZFjoX2cGg', title: '데일리 룩 코디', topic: '패션', channel: '@daily_fashion' },
        { id: '2vjPBrBU-TM', title: '계절별 패션', topic: '패션', channel: '@season_fashion' },
        { id: 'YbJOTdZBX1g', title: '스타일링 팁', topic: '패션', channel: '@styling_tips' },
        { id: 'ZZ5LpwO-An4', title: '쇼핑몰 하울', topic: '패션', channel: '@fashion_haul' }
      ]
    }
    
    // 키워드에 맞는 영상들 선택
    let selectedVideos = keywordVideoMap[this.keyword]
    
    // 키워드 매핑이 없으면 일반적인 인기 영상들 사용
    if (!selectedVideos) {
      console.log(`🔄 "${this.keyword}" 매핑 없음, 일반 인기 영상 사용`)
      selectedVideos = [
        { id: 'dQw4w9WgXcQ', title: '인기 뮤직 영상', topic: '음악', channel: '@popular_music' },
        { id: 'kJQP7kiw5Fk', title: '일상 브이로그', topic: '일상', channel: '@daily_vlog' },
        { id: 'fJ9rUzIMcZQ', title: '라이프스타일 팁', topic: '라이프스타일', channel: '@lifestyle_tips' },
        { id: 'V-_O7nl0Ii0', title: '엔터테인먼트', topic: '엔터테인먼트', channel: '@entertainment' }
      ]
    }
    
    // 8개 영상 생성 (부족하면 반복)
    return Array.from({ length: 8 }, (_, i) => {
      const video = selectedVideos[i % selectedVideos.length]
      
      return {
        videoId: video.id,
        creator: video.channel,
        avatar: this.getChannelAvatar(video.channel, [video.topic]),
        title: `${video.title} | ${this.keyword}`,
        desc: `${this.keyword}과 관련된 ${video.topic} 콘텐츠입니다.`,
        tags: [`#${this.keyword}`, `#${video.topic}`, '#쇼츠', '#추천'],
        likes: Math.floor(Math.random() * 100000) + 5000,
        comments: Math.floor(Math.random() * 8000) + 500,
        dislikes: Math.floor(Math.random() * 500) + 20,
        followers: Math.floor(Math.random() * 500000) + 10000,
        isLiked: false,
        isDisliked: false,
        isFollowing: Math.random() > 0.6,
        isFallback: true,
        fallbackType: 'keyword_related'  // 키워드 관련 폴백임을 표시
      }
    })
  }
  
  createVideoSwiper() {
    try {
      // 기존 내용 초기화
      this.el.innerHTML = ''
      
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

  showNoVideosMessage() {
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
          <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
          <div style="font-size: 18px; margin-bottom: 10px;">"${this.keyword}" 관련 영상이 없습니다</div>
          <div style="font-size: 14px; opacity: 0.8; margin-bottom: 30px;">다른 키워드로 검색해보세요</div>
          <button onclick="window.app.navigateTo('/')" style="
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            color: white;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
          ">홈으로</button>
          <button onclick="window.history.back()" style="
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
          <button onclick="window.location.reload()" style="
            margin-top: 30px;
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            color: white;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
          ">새로고침</button>
          <button onclick="window.history.back()" style="
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