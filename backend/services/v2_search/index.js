/**
 * 🔍 v2_search 통합 모듈 - YouTube Shorts VQS 기반 검색 엔진
 * 
 * 핵심 기능:
 * - 키워드 기반 영상 검색 (videos_cache_v2)
 * - VQS(Video Quality Score) 점수 계산
 * - 상위 영상 큐레이션
 * 
 * 사용법:
 * import VideoSearchEngine from './v2_search/index.js'
 * const searchEngine = new VideoSearchEngine()
 * const results = await searchEngine.searchWithVQS('먹방', 100)
 */

import SearchEngine from './core/SearchEngine.js'
import VQSCalculator from './core/VQSCalculator.js'

class VideoSearchEngine {
  constructor() {
    this.searchEngine = new SearchEngine()
    this.vqsCalculator = new VQSCalculator()
    
    console.log('🚀 VideoSearchEngine 초기화 완료')
  }

  /**
   * 🎯 메인 기능: 키워드 검색 + VQS 계산 + 큐레이션
   * @param {string} keyword - 검색 키워드
   * @param {number} limit - 반환할 최대 영상 수 (기본: 100)
   * @returns {Object} 검색 결과 및 통계
   */
  async searchWithVQS(keyword, limit = 100) {
    console.log(`🔍 통합 검색 시작: "${keyword}" (상위 ${limit}개)`)
    
    try {
      // 1. 키워드로 영상 검색
      const videos = await this.searchEngine.getVideosByKeyword(keyword)
      
      if (!videos || videos.length === 0) {
        return {
          success: false,
          message: `"${keyword}" 키워드에 해당하는 영상이 없습니다`,
          keyword,
          videos: [],
          stats: null
        }
      }

      console.log(`📺 검색 결과: ${videos.length}개 영상 발견`)

      // 2. VQS 점수 계산
      const scoredVideos = await this.vqsCalculator.calculateBatch(videos, keyword)

      // 3. 상위 N개 선별
      const topVideos = this.vqsCalculator.getTopVideos(scoredVideos, limit)

      // 4. 통계 생성
      const stats = this.vqsCalculator.getVQSStats(scoredVideos)

      console.log(`✅ 통합 검색 완료: 상위 ${topVideos.length}개 선별 (최고점수: ${stats.highest_score})`)

      return {
        success: true,
        message: `"${keyword}" 검색 완료`,
        keyword,
        videos: topVideos,
        stats: {
          ...stats,
          search_keyword: keyword,
          processed_at: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error(`❌ 통합 검색 실패: "${keyword}"`, error)
      
      return {
        success: false,
        message: `검색 중 오류가 발생했습니다: ${error.message}`,
        keyword,
        videos: [],
        stats: null,
        error: error.message
      }
    }
  }
}

export default VideoSearchEngine
 