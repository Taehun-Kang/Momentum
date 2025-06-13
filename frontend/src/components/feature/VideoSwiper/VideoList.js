/**
 * 📱 VideoList - 간단한 세로 스크롤 비디오 목록
 * 
 * TikTok 스타일 비디오 목록 (간단한 버전)
 */

import Component from '../../../core/Component.js'
import VideoItem from './VideoItem.js'

export default class VideoList extends Component {
  constructor(options = {}) {
    super({ tagName: 'div', autoRender: false })
    
    // 기본 설정
    this.videos = Array.isArray(options.videos) ? options.videos : []
    this.keyword = options.keyword || '추천 영상'
    this.currentIndex = 0
    this.videoItems = []
    
    // 수동으로 렌더링
    this.render()
  }
  
  render() {
    this.el.className = 'video-list'
    this.el.innerHTML = /* html */ `
      <div class="video-container">
        <div class="video-list-wrapper">
          <!-- 비디오 아이템들이 여기에 추가됨 -->
        </div>
      </div>
    `
    
    // 비디오 아이템 생성
    this.createVideoItems()
  }
  
  createVideoItems() {
    const wrapper = this.el.querySelector('.video-list-wrapper')
    if (!wrapper) {
      console.error('❌ video-list-wrapper를 찾을 수 없음')
      return
    }
    
    // 각 비디오에 대해 VideoItem 생성
    this.videos.forEach((video, index) => {
      try {
        const videoItem = new VideoItem({
          video: video,
          index: index,
          isActive: index === 0, // 첫 번째 비디오만 활성화
          onAction: this.handleVideoAction.bind(this),
          onNext: this.handleNextVideo.bind(this)
        })
        
        this.videoItems.push(videoItem)
        wrapper.appendChild(videoItem.el)
        
      } catch (error) {
        console.error(`❌ VideoItem ${index + 1} 생성 실패:`, error)
      }
    })
  }
  
  handleVideoAction(action, video, index) {
    switch (action) {
      case 'like':
        // 좋아요 처리
        break
      case 'dislike':
        // 싫어요 처리
        this.handleNextVideo() // 싫어요시 다음 비디오로
        break
      case 'share':
        // 공유 처리
        break
      case 'youtube':
        // YouTube 링크 처리
        break
    }
  }
  
  handleNextVideo() {
    if (this.currentIndex < this.videoItems.length - 1) {
      // 현재 비디오 비활성화
      this.videoItems[this.currentIndex].setActive(false)
      
      // 다음 비디오 활성화
      this.currentIndex++
      this.videoItems[this.currentIndex].setActive(true)
    }
  }
  
  // 정리
  destroy() {
    // 모든 VideoItem 정리
    this.videoItems.forEach(item => {
      try {
        item.destroy()
      } catch (error) {
        console.warn('VideoItem 정리 실패:', error)
      }
    })
    
    this.videoItems = []
    
    super.destroy?.()
  }
} 