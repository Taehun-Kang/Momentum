/**
 * YouTube API 서비스
 * Momentum by Wave Team
 * 
 * YouTube Data API v3를 활용한 Shorts 영상 검색 및 필터링 서비스
 */

const { google } = require('googleapis');
const NodeCache = require('node-cache');
const { config } = require('../config/config');

class YouTubeService {
  constructor() {
    // YouTube API 클라이언트 초기화
    this.youtube = google.youtube({
      version: 'v3',
      auth: config.YOUTUBE_API_KEY
    });

    // 캐시 초기화 (1시간 TTL)
    this.cache = new NodeCache({ 
      stdTTL: config.CACHE_TTL,
      maxKeys: config.CACHE_MAX_SIZE,
      checkperiod: 600 // 10분마다 만료된 키 정리
    });

    // 할당량 추적
    this.quotaUsed = 0;
    this.resetQuotaDaily();
  }

  /**
   * 일일 할당량 리셋 (매일 자정)
   */
  resetQuotaDaily() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.quotaUsed = 0;
      console.log('🔄 YouTube API 할당량 리셋됨');
      this.resetQuotaDaily(); // 다음 날도 예약
    }, msUntilMidnight);
  }

  /**
   * 할당량 사용량 체크
   */
  checkQuota(requiredUnits) {
    if (this.quotaUsed + requiredUnits > config.YOUTUBE_QUOTA_PER_DAY) {
      throw new Error(`YouTube API 일일 할당량 초과. 사용량: ${this.quotaUsed}/${config.YOUTUBE_QUOTA_PER_DAY}`);
    }
  }

  /**
   * YouTube duration 형식을 초로 변환
   * @param {string} duration - PT1M30S 형식
   * @returns {number} - 초 단위 시간
   */
  parseDuration(duration) {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Shorts 영상 여부 확인
   * @param {Object} video - videos.list API 응답의 video 객체
   * @returns {boolean} - Shorts 영상 여부
   */
  isShortsVideo(video) {
    const { contentDetails, status } = video;
    
    if (!contentDetails || !status) return false;

    // 1. 재생 시간 체크 (60초 이하)
    const duration = this.parseDuration(contentDetails.duration);
    if (duration > 60) return false;

    // 2. 공개 상태 확인
    if (status.privacyStatus !== 'public') return false;

    // 3. 임베드 가능 여부
    if (status.embeddable === false) return false;

    // 4. 업로드 제한 확인
    if (status.uploadStatus !== 'processed') return false;

    return true;
  }

  /**
   * 캐시 키 생성
   */
  generateCacheKey(type, params) {
    const paramString = JSON.stringify(params);
    return `${type}:${Buffer.from(paramString).toString('base64')}`;
  }

  /**
   * 2단계 필터링으로 Shorts 검색
   * @param {string} query - 검색어
   * @param {Object} options - 검색 옵션
   * @returns {Promise<Array>} - Shorts 영상 목록
   */
  async searchShorts(query, options = {}) {
    const {
      maxResults = 10,
      order = 'relevance',
      publishedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      regionCode = 'US'
    } = options;

    // 캐시 확인
    const cacheKey = this.generateCacheKey('search', { query, maxResults, order, publishedAfter, regionCode });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`📦 캐시에서 검색 결과 반환: ${query}`);
      return cached;
    }

    try {
      // 할당량 체크 (예상 사용량: 검색 100 + 비디오 확인)
      const estimatedQuota = 100 + Math.ceil(maxResults * 3 / 50);
      this.checkQuota(estimatedQuota);

      console.log(`🔍 Shorts 검색 시작: "${query}"`);

      // 1단계: 기본 검색
      const searchResponse = await this.youtube.search.list({
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: maxResults * 3, // Shorts 비율을 고려해 3배로 검색
        order,
        publishedAfter,
        regionCode
      });

      this.quotaUsed += 100; // search.list = 100 units

      const videoIds = searchResponse.data.items.map(item => item.id.videoId);
      
      if (videoIds.length === 0) {
        return [];
      }

      // 2단계: 상세 정보 확인 및 Shorts 필터링
      const videosResponse = await this.youtube.videos.list({
        part: 'contentDetails,status,snippet,statistics',
        id: videoIds.join(',')
      });

      this.quotaUsed += Math.ceil(videoIds.length / 50); // videos.list = 1 unit per 50 videos

      // Shorts 필터링
      const shortsVideos = [];
      
      videosResponse.data.items.forEach(video => {
        if (this.isShortsVideo(video)) {
          shortsVideos.push({
            id: video.id,
            title: video.snippet.title,
            channel: video.snippet.channelTitle,
            channelId: video.snippet.channelId,
            duration: this.parseDuration(video.contentDetails.duration),
            publishedAt: video.snippet.publishedAt,
            description: video.snippet.description,
            thumbnails: video.snippet.thumbnails,
            viewCount: parseInt(video.statistics.viewCount || 0),
            likeCount: parseInt(video.statistics.likeCount || 0),
            commentCount: parseInt(video.statistics.commentCount || 0),
            tags: video.snippet.tags || [],
            categoryId: video.snippet.categoryId
          });
        }
      });

      // 조회수 기준 정렬 후 결과 제한
      shortsVideos.sort((a, b) => b.viewCount - a.viewCount);
      const result = shortsVideos.slice(0, maxResults);

      // 캐시 저장
      this.cache.set(cacheKey, result);

      console.log(`✅ Shorts 검색 완료: ${result.length}개 발견 (할당량 사용: ${estimatedQuota})`);
      return result;

    } catch (error) {
      console.error('❌ Shorts 검색 실패:', error.message);
      throw error;
    }
  }

  /**
   * 인기 Shorts 가져오기
   * @param {Object} options - 옵션
   * @returns {Promise<Array>} - 인기 Shorts 목록
   */
  async getTrendingShorts(options = {}) {
    const { maxResults = 20, regionCode = 'US' } = options;

    // 캐시 확인 (30분 TTL)
    const cacheKey = this.generateCacheKey('trending', { maxResults, regionCode });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('📦 캐시에서 트렌딩 결과 반환');
      return cached;
    }

    try {
      console.log('🔥 인기 Shorts 검색 중...');

      // 인기 검색어들로 다양한 Shorts 수집
      const trendingQueries = [
        'viral shorts',
        'trending shorts', 
        'funny shorts',
        'comedy shorts',
        'dance shorts'
      ];

      const allShorts = [];

      // 각 검색어당 적은 수량으로 검색해서 다양성 확보
      for (const query of trendingQueries.slice(0, 3)) {
        try {
          const shorts = await this.searchShorts(query, { 
            maxResults: Math.ceil(maxResults / 3),
            order: 'relevance'
          });
          allShorts.push(...shorts);
        } catch (error) {
          console.warn(`⚠️ 트렌딩 검색 실패: ${query}`, error.message);
        }
      }

      // 중복 제거 및 인기도 정렬
      const uniqueShorts = [];
      const seenIds = new Set();

      allShorts
        .sort((a, b) => b.viewCount - a.viewCount)
        .forEach(video => {
          if (!seenIds.has(video.id)) {
            seenIds.add(video.id);
            uniqueShorts.push(video);
          }
        });

      const result = uniqueShorts.slice(0, maxResults);

      // 캐시 저장 (30분 TTL)
      this.cache.set(cacheKey, result, 1800);

      console.log(`✅ 인기 Shorts 수집 완료: ${result.length}개`);
      return result;

    } catch (error) {
      console.error('❌ 인기 Shorts 수집 실패:', error.message);
      throw error;
    }
  }

  /**
   * 카테고리별 Shorts 검색
   * @param {string} category - 카테고리
   * @param {Object} options - 옵션
   * @returns {Promise<Array>} - 카테고리별 Shorts 목록
   */
  async getShortsByCategory(category, options = {}) {
    const categoryQueries = {
      comedy: 'funny comedy shorts',
      music: 'music dance shorts',
      gaming: 'gaming highlights shorts',
      education: 'educational learning shorts',
      lifestyle: 'lifestyle vlog shorts',
      food: 'cooking food shorts',
      sports: 'sports highlights shorts',
      tech: 'tech review shorts'
    };

    const query = categoryQueries[category.toLowerCase()] || `${category} shorts`;
    
    return await this.searchShorts(query, {
      ...options,
      maxResults: options.maxResults || 15
    });
  }

  /**
   * 서비스 상태 정보
   */
  getStatus() {
    return {
      quotaUsed: this.quotaUsed,
      quotaRemaining: config.YOUTUBE_QUOTA_PER_DAY - this.quotaUsed,
      cacheStats: this.cache.getStats(),
      isApiKeyConfigured: !!config.YOUTUBE_API_KEY
    };
  }

  /**
   * 캐시 정리
   */
  clearCache() {
    this.cache.flushAll();
    console.log('🗑️ YouTube 캐시 정리 완료');
  }
}

module.exports = new YouTubeService(); 