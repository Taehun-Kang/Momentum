/**
 * 🎬 YouTube Search Engine (단순화 버전)
 * 
 * 핵심 기능만 포함:
 * - JSON apiParams → YouTube API search.list 호출
 * - 원본 JSON 결과 반환
 * - API 키 검증
 */

import axios from 'axios';

class YouTubeSearchEngine {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.youtubeApiUrl = 'https://www.googleapis.com/youtube/v3';
    
    // 기본 통계만
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    };
  }

  /**
   * 🔑 API 키 검증
   */
  async validateApiKey() {
    try {
      const response = await axios.get(`${this.youtubeApiUrl}/search`, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          q: 'test',
          maxResults: 1,
          type: 'video'
        }
      });
      
      console.log('✅ YouTube API 키 검증 성공');
      return true;
    } catch (error) {
      console.error('❌ YouTube API 키 검증 실패:', error.response?.data || error.message);
      return false;
    }
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
      console.log('\n🎬 YouTube API 검색 시작');
      console.log('📡 API URL:', `${this.youtubeApiUrl}/search`);
      console.log('📋 전달받은 파라미터:', JSON.stringify(apiParams, null, 2));

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
    console.log('\n📊 검색 결과 요약:');
    console.log(`   🎬 발견된 영상: ${result.data.items?.length || 0}개`);
    console.log(`   📋 총 가능 결과: ${result.totalResults.toLocaleString()}개`);
    console.log(`   📄 페이지당 결과: ${result.resultsPerPage}개`);
    console.log(`   🔗 다음 페이지: ${result.nextPageToken ? 'O' : 'X'}`);
    console.log(`   ⏱️ 응답 시간: ${result.responseTime}ms`);
    console.log(`   💰 API 비용: ${result.apiCost} units`);

    // 영상 샘플 출력 (처음 3개)
    if (result.data.items && result.data.items.length > 0) {
      console.log('\n🎬 영상 샘플 (처음 3개):');
      result.data.items.slice(0, 3).forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.snippet?.title}`);
        console.log(`      ID: ${video.id?.videoId}`);
        console.log(`      채널: ${video.snippet?.channelTitle}`);
        console.log(`      게시일: ${video.snippet?.publishedAt}`);
      });
    }
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

export default YouTubeSearchEngine; 