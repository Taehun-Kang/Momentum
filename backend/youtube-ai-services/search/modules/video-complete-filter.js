/**
 * 📊 Video Complete Filter
 * YouTube Shorts 재생 가능성 + 품질 필터링 통합 모듈
 * - 9 units (snippet, contentDetails, status, statistics) 사용
 * - 재생 가능성 및 품질 기준 필터링
 * - 40개 목표 달성을 위한 효율적 처리
 */

import axios from 'axios';

class VideoCompleteFilter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.youtubeApiUrl = 'https://www.googleapis.com/youtube/v3';
    
    // Full 모드 고정 (9 units)
    this.requiredParts = ['snippet', 'contentDetails', 'status', 'statistics'];
    
    console.log(`🔧 필터 모드: full (9 units)`);
  }

  /**
   * 📊 통합 필터링 메인 함수
   */
  async filterAndAnalyzeVideos(videoIds, searchItems = null, criteria = {}) {
    if (!videoIds || videoIds.length === 0) {
      return this.getEmptyResult();
    }

    console.log(`📊 통합 필터링 시작: ${videoIds.length}개 영상 분석`);

    const filterCriteria = {
      requireEmbeddable: criteria.requireEmbeddable !== false,
      requirePublic: criteria.requirePublic !== false,
      minDuration: criteria.minDuration || 10,      // 10초 이상 (너무 짧은 영상 제외)
      maxDuration: criteria.maxDuration || 90,      // 90초 이하 (1분 30초, Shorts+ 기준)
      minViewCount: criteria.minViewCount || 10000, // 10,000회 이상 (고품질 기준 강화)
      minEngagementRate: criteria.minEngagementRate || 0.01, // 1% 이상 (현실적 기준)
      sortBy: criteria.sortBy || 'engagement',
      maxResults: criteria.maxResults || 40
    };

    try {
      // 배치 처리로 videos.list 호출
      const detailedVideos = await this.getVideoDetailsInBatches(videoIds);
      
      // 통합 필터링 실행
      const filterResults = this.executeIntegratedFiltering(detailedVideos, filterCriteria);
      
      // 최종 처리 (search.list 정보 병합)
      const finalVideos = this.finalizeResults(
        filterResults.validVideos, 
        filterCriteria, 
        searchItems // 🎯 search.list items 전달
      );

      console.log(`✅ 통합 필터링 완료: ${finalVideos.length}/${videoIds.length}개`);

      return {
        success: true,
        videos: finalVideos,
        summary: {
          totalProcessed: videoIds.length,
          playableVideos: filterResults.playableCount,
          qualityVideos: filterResults.qualityCount,
          finalResults: finalVideos.length
        }
      };

    } catch (error) {
      console.error('❌ 통합 필터링 실패:', error);
      throw error;
    }
  }

  /**
   * 🎬 videos.list API 배치 호출
   */
  async getVideoDetailsInBatches(videoIds) {
    const batches = this.createBatches(videoIds, 50);
    let allVideos = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        const response = await axios.get(`${this.youtubeApiUrl}/videos`, {
          params: {
            key: this.apiKey,
            part: this.requiredParts.join(','),
            id: batch.join(','),
            hl: 'ko'
          }
        });

        const batchVideos = response.data.items || [];
        allVideos.push(...batchVideos);

        if (i < batches.length - 1) {
          await this.delay(100);
        }

      } catch (error) {
        console.error(`  ❌ 배치 ${i + 1} 실패:`, error.message);
        throw error;
      }
    }

    return { videos: allVideos };
  }

  /**
   * 🔍 통합 필터링 실행
   */
  executeIntegratedFiltering(detailedVideos, criteria) {
    const { videos } = detailedVideos;
    
    console.log(`🔍 필터링 실행: ${videos.length}개 영상`);
    
    // 📊 단계별 필터링 통계
    const filterStats = {
      total: videos.length,
      embeddablePass: 0,
      publicPass: 0,
      durationPass: 0,
      viewCountPass: 0,
      engagementPass: 0,
      finalPass: 0
    };

    // 재생 가능성 + 품질 통합 검사
    const validVideos = videos.filter(video => {
      // 1. 임베드 가능성 확인
      if (criteria.requireEmbeddable && !video.status?.embeddable) {
        return false;
      }
      filterStats.embeddablePass++;

      // 2. 공개 상태 확인
      if (criteria.requirePublic && video.status?.privacyStatus !== 'public') {
        return false;
      }
      filterStats.publicPass++;

      // 3. Shorts 길이 확인
      const duration = this.parseISO8601Duration(video.contentDetails?.duration);
      if (duration < criteria.minDuration || duration > criteria.maxDuration) {
        return false;
      }
      filterStats.durationPass++;

      // 4. 품질 필터링 (조회수)
      const stats = video.statistics;
      if (!stats) return false;

      const viewCount = parseInt(stats.viewCount) || 0;
      if (viewCount < criteria.minViewCount) {
        return false;
      }
      filterStats.viewCountPass++;

      // 5. 참여도 필터링
      const engagementRate = this.calculateEngagementRate(video);
      if (engagementRate < criteria.minEngagementRate) {
        return false;
      }
      filterStats.engagementPass++;

      filterStats.finalPass++;
      return true;
    });

    // 📊 필터링 통계 출력
    this.printFilteringStats(filterStats);

    return {
      validVideos,
      playableCount: validVideos.length,
      qualityCount: validVideos.length,
      filterStats
    };
  }

  /**
   * 📊 필터링 단계별 통계 출력
   */
  printFilteringStats(stats) {
    console.log(`📊 필터링 결과: ${stats.finalPass}/${stats.total}개 통과 (${(stats.finalPass/stats.total*100).toFixed(1)}%)`);
  }

  /**
   * 🔧 최종 결과 처리 - search.list와 videos.list 데이터 병합
   */
  finalizeResults(videos, criteria, searchItems) {
    // 정렬
    const sortedVideos = this.sortVideos(videos, criteria.sortBy);
    
    // 최대 결과 수 제한
    const finalVideos = sortedVideos.slice(0, criteria.maxResults);

    // 🎯 search.list items를 Map으로 변환 (빠른 검색)
    const searchMap = new Map();
    if (searchItems && Array.isArray(searchItems)) {
      searchItems.forEach(item => {
        if (item.id?.videoId) {
          searchMap.set(item.id.videoId, item);
        }
      });
    }

    // 🎯 완전한 데이터 병합
    return finalVideos.map(video => {
      const searchData = searchMap.get(video.id);
      
      return {
        // 📋 기본 정보 (videos.list 우선)
        id: video.id,
        title: video.snippet?.title || searchData?.snippet?.title || 'No Title',
        description: searchData?.snippet?.description || video.snippet?.description || '', // search.list 우선!
        
        // 🖼️ 썸네일 정보 (search.list에서, 필수!)
        thumbnails: searchData?.snippet?.thumbnails || video.snippet?.thumbnails || {
          default: { url: '', width: 120, height: 90 },
          medium: { url: '', width: 320, height: 180 },
          high: { url: '', width: 480, height: 360 }
        },
        
        // 📺 채널 정보
        channelTitle: video.snippet?.channelTitle || searchData?.snippet?.channelTitle || 'Unknown Channel',
        channelId: video.snippet?.channelId || searchData?.snippet?.channelId || '',
        
        // 📅 날짜 정보
        publishedAt: video.snippet?.publishedAt || searchData?.snippet?.publishedAt || '',
        
        // ⏱️ 영상 상세 정보 (videos.list에서)
        duration: this.parseISO8601Duration(video.contentDetails?.duration),
        durationFormatted: this.formatDuration(this.parseISO8601Duration(video.contentDetails?.duration)),
        
        // 📊 통계 정보 (videos.list에서)
        viewCount: parseInt(video.statistics?.viewCount) || 0,
        likeCount: parseInt(video.statistics?.likeCount) || 0,
        commentCount: parseInt(video.statistics?.commentCount) || 0,
        engagement: this.calculateEngagementRate(video),
        engagementFormatted: (this.calculateEngagementRate(video) * 100).toFixed(2) + '%',
        
        // 🎯 재생 가능성 정보
        isPlayable: true, // 필터링을 통과했으므로 재생 가능
        quality: {
          embeddable: video.status?.embeddable || false,
          processed: video.status?.uploadStatus === 'processed',
          definition: video.contentDetails?.definition || 'sd',
          caption: video.contentDetails?.caption === 'true'
        },
        
        // 🏷️ 메타데이터 (videos.list에서)
        tags: video.snippet?.tags || [],
        categoryId: video.snippet?.categoryId || '',
        defaultLanguage: video.snippet?.defaultLanguage || '',
        
        // 🌍 지역 제한 정보
        regionRestriction: video.contentDetails?.regionRestriction || null,
        
        // 🔗 URL 정보
        url: `https://www.youtube.com/watch?v=${video.id}`,
        shortUrl: `https://youtu.be/${video.id}`,
        embedUrl: `https://www.youtube.com/embed/${video.id}`,
        
        // 📱 프론트엔드 최적화 정보
        thumbnail: searchData?.snippet?.thumbnails?.medium?.url || 
                   searchData?.snippet?.thumbnails?.high?.url || 
                   searchData?.snippet?.thumbnails?.default?.url || '',
        
        // 🎨 추가 UI 정보
        shortDescription: this.truncateDescription(
          searchData?.snippet?.description || video.snippet?.description || '', 
          100
        ),
        
        // 📊 품질 등급
        qualityGrade: this.calculateQualityGrade(video),
        
        // 🕐 데이터 생성 시간
        processedAt: new Date().toISOString(),
        
        // 🔍 검색 관련 메타데이터
        searchRelevance: searchData ? 'high' : 'medium', // search.list에서 온 경우 높은 관련성
        
        // 🎯 디버깅 정보 (개발용)
        _debug: {
          hasSearchData: !!searchData,
          hasVideoData: !!video,
          apiSources: {
            search: !!searchData,
            videos: !!video
          }
        }
      };
    });
  }

  /**
   * 🕐 시간 포맷팅 (59초 → "59초", 90초 → "1분 30초")
   */
  formatDuration(totalSeconds) {
    if (totalSeconds < 60) {
      return `${totalSeconds}초`;
    } else {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return seconds > 0 ? `${minutes}분 ${seconds}초` : `${minutes}분`;
    }
  }

  /**
   * ✂️ 설명 요약 (100자 제한)
   */
  truncateDescription(description, maxLength = 100) {
    if (!description || description.length <= maxLength) {
      return description;
    }
    return description.substring(0, maxLength) + '...';
  }

  /**
   * 🏆 품질 등급 계산 (A+, A, B+, B, C)
   */
  calculateQualityGrade(video) {
    const engagement = this.calculateEngagementRate(video);
    const viewCount = parseInt(video.statistics?.viewCount) || 0;
    
    if (engagement >= 0.05 && viewCount >= 100000) return 'A+';
    if (engagement >= 0.03 && viewCount >= 50000) return 'A';
    if (engagement >= 0.02 && viewCount >= 20000) return 'B+';
    if (engagement >= 0.01 && viewCount >= 10000) return 'B';
    return 'C';
  }

  /**
   * 📈 참여도 계산
   */
  calculateEngagementRate(video) {
    const stats = video.statistics;
    if (!stats) return 0;

    const viewCount = parseInt(stats.viewCount) || 0;
    const likeCount = parseInt(stats.likeCount) || 0;
    const commentCount = parseInt(stats.commentCount) || 0;

    if (viewCount === 0) return 0;
    return (likeCount + commentCount) / viewCount;
  }

  /**
   * ⏱️ ISO 8601 Duration 파싱
   */
  parseISO8601Duration(duration) {
    if (!duration || typeof duration !== 'string') return 0;

    try {
      const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      if (!match) return 0;

      const hours = match[1] ? parseInt(match[1].replace('H', '')) || 0 : 0;
      const minutes = match[2] ? parseInt(match[2].replace('M', '')) || 0 : 0;
      const seconds = match[3] ? parseInt(match[3].replace('S', '')) || 0 : 0;

      return hours * 3600 + minutes * 60 + seconds;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 📊 영상 정렬
   */
  sortVideos(videos, sortBy = 'engagement') {
    return [...videos].sort((a, b) => {
      switch (sortBy) {
        case 'viewCount':
          return (b.statistics?.viewCount || 0) - (a.statistics?.viewCount || 0);
        case 'likeCount':
          return (b.statistics?.likeCount || 0) - (a.statistics?.likeCount || 0);
        case 'publishedAt':
          return new Date(b.snippet?.publishedAt) - new Date(a.snippet?.publishedAt);
        case 'engagement':
          return this.calculateEngagementRate(b) - this.calculateEngagementRate(a);
        default:
          return 0;
      }
    });
  }

  /**
   * 📦 배치 생성
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 🔄 지연 함수
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 빈 결과 반환
   */
  getEmptyResult() {
    return {
      success: false,
      videos: [],
      summary: { totalProcessed: 0, playableVideos: 0, qualityVideos: 0, finalResults: 0 }
    };
  }
}

export default VideoCompleteFilter;

/**
 * 🎯 편의 함수들
 */

// 전역 인스턴스 생성
function createVideoFilter() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return new VideoCompleteFilter(apiKey);
}

/**
 * 📊 통합 필터링 (편의 함수)
 */
export async function filterAndAnalyzeVideos(videoIds, searchItems = null, criteria = {}) {
  const filter = createVideoFilter();
  return await filter.filterAndAnalyzeVideos(videoIds, searchItems, criteria);
}

/**
 * 🔍 빠른 필터링 (편의 함수)
 */
export async function quickFilterVideos(videoIds, searchItems = null, options = {}) {
  const filter = createVideoFilter();
  const result = await filter.filterAndAnalyzeVideos(videoIds, searchItems, {
    minViewCount: options.minViewCount || 1000,
    minEngagementRate: options.minEngagementRate || 0.01,
    maxResults: options.maxResults || 20,
    sortBy: options.sortBy || 'engagement'
  });
  return result.videos;
}
