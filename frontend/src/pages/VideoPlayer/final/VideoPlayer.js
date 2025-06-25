/**
 * 📱 VideoPlayer - 최종 완성본 (DB 연동)
 * 
 * ChatFlow → 실제 DB 조회 → VideoSwiper 영상 재생
 */

import { Component } from './Component.js'
import VideoSwiper from './VideoSwiper.js'
import Loading from '../../../components/ui/Loading/index.js'
import searchService from '../../../services/searchService.js'
import { searchServiceV2 } from '../../../services/v2/searchServiceV2.js'
import './VideoPlayer.css'

export default class VideoPlayer extends Component {
  constructor() {
    super({ tagName: 'div' })
    
    // 비디오 관련 설정
    this.keyword = '추천 영상'
    this.keywords = []              // ✅ 키워드 배열 추가
    this.isV2Search = false         // ✅ v2 검색 모드 플래그 추가
    this.videos = []
    this.videoSwiper = null
    this.isLoading = true
    this.realtimeCompleted = false  // 🔧 realtime 검색 완료 여부
    this.timestamp = null           // 🔧 검색 타임스탬프
    
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
      const keywords = params.get('keywords')      // 새로운 키워드 배열 형식
      const keyword = params.get('keyword')        // 기존 단일 키워드 (호환성)
      const v2Search = params.get('v2_search')     // v2 검색 모드
      const timestamp = params.get('timestamp')
      
      // ✅ 새로운 키워드 배열 형식 처리
      if (keywords) {
        try {
          this.keywords = JSON.parse(decodeURIComponent(keywords))
          this.keyword = this.keywords.join(' ')  // 표시용 문자열
          this.isV2Search = v2Search === 'true'
          console.log('📋 URL에서 키워드 배열 추출:', this.keywords)
          console.log('🔧 v2 검색 모드:', this.isV2Search)
        } catch (error) {
          console.error('❌ 키워드 배열 파싱 실패:', error)
          this.keywords = [keywords]
          this.keyword = keywords
          this.isV2Search = true  // ✅ 파싱 실패해도 v2 검색 사용
        }
      }
      // 🔄 기존 단일 키워드 형식 (호환성) - v2 검색으로 강제 설정
      else if (keyword) {
        // ✅ + 기호를 띄어쓰기로 변환 후 디코딩
        this.keyword = decodeURIComponent(keyword.replace(/\+/g, ' '))
        this.keywords = [this.keyword]
        this.isV2Search = true  // ✅ 기존 URL도 v2 검색 모드로 강제 설정
        console.log('📋 URL에서 기존 키워드 추출 (v2 모드로 설정):', this.keyword)
      }
      
      this.timestamp = timestamp
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
    // 🔧 기존 Loading 컴포넌트 사용으로 중복 제거
    const loadingText = this.isV2Search ? 
      `"${this.keyword}" 영상 검색 중...` : 
      `"${this.keyword}" 영상 로딩 중...`
    
    const loadingSubtext = this.isV2Search ? 
      'v2 API로 최적화된 영상을 검색하는 중입니다' : 
      'DB에서 큐레이션된 영상을 가져오는 중입니다'
    
    const loadingComponent = new Loading({
      text: loadingText,
      subtext: loadingSubtext,
      theme: 'video-loading'
    })

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
      </div>
    `

    // Loading 컴포넌트를 로딩 컨테이너에 추가
    const loadingContainer = this.el.querySelector('div')
    loadingContainer.appendChild(loadingComponent.el)
  }
  
  /**
   * 🎬 v2 API로 영상 검색 (모든 키워드 v2 API 사용)
   */
  async loadVideoData() {
    try {
      console.log(`🎬 "${this.keyword}" 영상 검색 시작`)
      console.log(`🔧 키워드 배열:`, this.keywords)
      console.log(`🔧 v2 검색 모드:`, this.isV2Search)
      
      // ✅ 모든 경우에 v2 API 사용 (조건 체크 제거)
      if (this.keywords.length > 0) {
        console.log('🚀 v2 API로 영상 검색 실행')
        
        // ✅ 키워드 배열을 그대로 전달 (join 하지 않음!)
        const searchResult = await searchServiceV2.searchForVideoPlayer(this.keywords, {
          limit: 50
        })
        
        if (searchResult.success && searchResult.data?.length > 0) {
          console.log(`✅ v2 API 검색 성공: ${searchResult.data.length}개 영상`)
          this.videos = searchResult.data  // v2 API 결과 그대로 사용
          this.isLoading = false
          return
        } else {
          console.warn('⚠️ v2 API 검색 결과 없음')
          this.videos = []
        }
      } else {
        console.error('❌ 키워드가 없습니다')
        this.videos = []
      }
      
    } catch (error) {
      console.error('❌ 영상 검색 실패:', error)
      this.videos = []
      
    } finally {
      this.isLoading = false
    }
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