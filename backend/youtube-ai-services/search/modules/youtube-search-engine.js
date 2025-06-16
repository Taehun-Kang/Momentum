/**
 * 🎬 YouTube Search Engine (단순화 버전)
 * 
 * 핵심 기능:
 * - JSON apiParams → YouTube API search.list 호출
 * - 키워드 직접 검색 (고정 파라미터 사용)
 * - 원본 JSON 결과 반환
 * - API 할당량 절약 최적화
 */

import axios from 'axios';

class YouTubeSearchEngine {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.youtubeApiUrl = 'https://www.googleapis.com/youtube/v3';
    
    // 🎯 고정 파라미터 (고품질 Shorts 최적화)
    this.defaultParams = {
      part: 'snippet',         // 기본 정보 포함
      videoDuration: 'short',  // 4분 미만 (Shorts)
      maxResults: 50,          // 최대 결과 수
      type: 'video',           // 비디오만
      regionCode: 'KR',        // 한국 지역
      relevanceLanguage: 'ko', // 한국어 관련성
      safeSearch: 'moderate',  // 균형잡힌 안전 검색
      videoEmbeddable: 'true', // 임베드 가능한 영상만
      videoLicense: 'any',     // 모든 라이선스
      videoSyndicated: 'true', // 외부 재생 보장 (필수)
      videoDefinition: 'high', // HD 화질만 (고품질)
      order: 'relevance'       // 관련성 우선
    };
    
    // 기본 통계만
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    };
  }

  /**
   * 🎯 키워드 직접 검색 (단순화된 인터페이스)
   * @param {string} keyword - 검색할 키워드
   * @param {Object} options - 추가 옵션
   * @returns {Object} 검색 결과
   */
  async searchByKeyword(keyword, options = {}) {
    if (!keyword?.trim()) {
      throw new Error('검색 키워드가 필요합니다');
    }

    // 키워드 그대로 사용 (shorts 자동 추가 제거)
    const searchQuery = keyword.trim();

    // 고정 파라미터와 사용자 옵션 병합
    const apiParams = {
      ...this.defaultParams,
      q: searchQuery,
      ...options // 사용자 커스텀 옵션으로 오버라이드 가능
    };

    console.log(`🎯 키워드 검색: "${keyword}"`);
    
    return await this.searchVideos(apiParams);
  }

  /**
   * 🎬 JSON apiParams를 사용한 영상 검색
   * @param {Object} apiParams - JSON에서 전달받은 완전한 API 파라미터
   * @returns {Object} 검색 결과
   */
  async searchVideos(apiParams) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {

      // JSON의 apiParams에 API 키 추가
      const searchParams = {
        ...apiParams,
        key: this.apiKey
      };

      // YouTube API 호출
      const response = await axios.get(`${this.youtubeApiUrl}/search`, {
        params: searchParams
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      this.stats.successfulRequests++;

      const result = {
        success: true,
        data: response.data,
        originalResponse: response.data, // 원본 JSON 보존
        videoIds: response.data.items?.map(item => item.id?.videoId).filter(id => id) || [],
        nextPageToken: response.data.nextPageToken || null,
        totalResults: parseInt(response.data.pageInfo?.totalResults) || 0,
        resultsPerPage: parseInt(response.data.pageInfo?.resultsPerPage) || 0,
        responseTime,
        apiCost: 100 // search.list 기본 비용
      };

      // 검색 결과 요약 출력
      this.printSearchSummary(result);

      return result;

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.stats.failedRequests++;

      console.error('❌ YouTube API 호출 실패:', error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data || error.message,
        responseTime,
        apiCost: 0
      };
    }
  }

  /**
   * 📊 검색 결과 요약 출력
   */
  printSearchSummary(result) {
    console.log(`🎬 검색 완료: ${result.data.items?.length || 0}개 발견 (${result.responseTime}ms, ${result.apiCost} units)`);
  }

  /**
   * 📈 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

// 🎯 편의 함수들 (전역 인스턴스 없이 바로 사용)

/**
 * 🎬 키워드로 바로 검색 (편의 함수)
 * @param {string} apiKey - YouTube API 키
 * @param {string} keyword - 검색 키워드
 * @param {Object} options - 추가 옵션
 * @returns {Object} 검색 결과
 */
export async function searchYouTubeShorts(apiKey, keyword, options = {}) {
  const engine = new YouTubeSearchEngine(apiKey);
  return await engine.searchByKeyword(keyword, options);
}

/**
 * 🎬 여러 키워드로 검색 (순차 실행)
 * @param {string} apiKey - YouTube API 키
 * @param {string[]} keywords - 검색 키워드 배열
 * @param {Object} options - 추가 옵션
 * @returns {Array} 검색 결과 배열
 */
export async function searchMultipleKeywords(apiKey, keywords, options = {}) {
  const engine = new YouTubeSearchEngine(apiKey);
  const results = [];
  
  for (const keyword of keywords) {
    try {
      console.log(`🔍 검색 중: ${keyword}`);
      const result = await engine.searchByKeyword(keyword, options);
      results.push({ keyword, ...result });
    } catch (error) {
      console.error(`❌ ${keyword} 검색 실패:`, error.message);
      results.push({ 
        keyword, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  return results;
}

/**
 * 🎬 사용자 정의 파라미터로 검색
 * @param {string} apiKey - YouTube API 키
 * @param {Object} customParams - 사용자 정의 API 파라미터
 * @returns {Object} 검색 결과
 */
export async function searchWithCustomParams(apiKey, customParams) {
  const engine = new YouTubeSearchEngine(apiKey);
  return await engine.searchVideos(customParams);
}

/**
 * 📊 검색 엔진 통계 조회 (전역)
 */
export function getGlobalSearchStats() {
  // 전역 통계는 각 인스턴스별로 관리됨
  return {
    message: '각 검색 인스턴스별로 통계가 관리됩니다',
    usage: '인스턴스.getStats()를 사용하세요'
  };
}

export default YouTubeSearchEngine; 