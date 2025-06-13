/**
 * 📺 Channel Info Collector
 * 채널 ID들로부터 채널 정보 및 아이콘 추출 모듈
 * - 5 units (snippet, statistics) 사용
 * - 최대 50개 채널 배치 처리
 * - 채널 아이콘, 구독자 수, 영상 수 등 완전한 정보 제공
 */

import axios from 'axios';

class ChannelInfoCollector {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.youtubeApiUrl = 'https://www.googleapis.com/youtube/v3';
    
    // 기본 파라미터 (채널 아이콘 + 통계)
    this.defaultParts = ['snippet', 'statistics'];
    
    // 통계 추적
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      totalChannelsProcessed: 0,
      totalApiUnits: 0
    };
    
    console.log(`📺 채널 정보 수집기 초기화 완료 (${this.defaultParts.length + 1} units per request)`);
  }

  /**
   * 📊 채널 정보 수집 메인 함수
   * @param {string[]} channelIds - 채널 ID 배열
   * @param {Object} options - 추가 옵션
   * @returns {Object} 채널 정보 수집 결과
   */
  async collectChannelInfo(channelIds, options = {}) {
    if (!channelIds || channelIds.length === 0) {
      return this.getEmptyResult();
    }

    // 중복 제거 및 유효성 검사
    const uniqueChannelIds = [...new Set(channelIds)].filter(id => 
      id && typeof id === 'string' && id.startsWith('UC')
    );

    console.log(`📺 채널 정보 수집 시작: ${uniqueChannelIds.length}개 채널`);

    const collectionOptions = {
      includeBranding: options.includeBranding || false, // 브랜딩 정보 포함 여부
      includeTopics: options.includeTopics || false,     // 주제 정보 포함 여부
      language: options.language || 'ko',                // 언어 설정
      ...options
    };

    try {
      // 배치 처리로 channels.list 호출
      const channelDetails = await this.getChannelDetailsInBatches(uniqueChannelIds, collectionOptions);
      
      // 데이터 정제 및 최종 처리
      const processedChannels = this.processChannelData(channelDetails.channels, collectionOptions);

      console.log(`✅ 채널 정보 수집 완료: ${processedChannels.length}/${uniqueChannelIds.length}개`);

      return {
        success: true,
        channels: processedChannels,
        summary: {
          totalRequested: uniqueChannelIds.length,
          successfullyProcessed: processedChannels.length,
          apiCost: channelDetails.totalApiCost,
          averageSubscribers: this.calculateAverageSubscribers(processedChannels),
          totalVideos: processedChannels.reduce((sum, ch) => sum + (ch.videoCount || 0), 0)
        }
      };

    } catch (error) {
      console.error('❌ 채널 정보 수집 실패:', error);
      throw error;
    }
  }

  /**
   * 🎬 channels.list API 배치 호출
   */
  async getChannelDetailsInBatches(channelIds, options) {
    const batches = this.createBatches(channelIds, 50); // 최대 50개씩
    let allChannels = [];
    let totalApiCost = 0;

    console.log(`📦 배치 처리: ${batches.length}개 배치`);

    // 요청할 part 파라미터 결정
    const parts = [...this.defaultParts];
    if (options.includeBranding) parts.push('brandingSettings');
    if (options.includeTopics) parts.push('topicDetails');
    
    const costPerRequest = 1 + (parts.length * 2); // 1 (기본) + parts * 2

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        this.stats.totalRequests++;

        const response = await axios.get(`${this.youtubeApiUrl}/channels`, {
          params: {
            key: this.apiKey,
            part: parts.join(','),
            id: batch.join(','),
            hl: options.language || 'ko'
          }
        });

        const batchChannels = response.data.items || [];
        allChannels.push(...batchChannels);
        totalApiCost += costPerRequest;

        this.stats.successfulRequests++;
        this.stats.totalChannelsProcessed += batchChannels.length;
        this.stats.totalApiUnits += costPerRequest;

        console.log(`  ✅ 배치 ${i + 1}: ${batchChannels.length}개 성공 (${costPerRequest} units)`);

        // API 제한 고려한 대기 (마지막 배치 제외)
        if (i < batches.length - 1) {
          await this.delay(100);
        }

      } catch (error) {
        console.error(`  ❌ 배치 ${i + 1} 실패:`, error.message);
        throw error;
      }
    }

    console.log(`📊 전체 API 비용: ${totalApiCost} units`);

    return { 
      channels: allChannels, 
      totalApiCost 
    };
  }

  /**
   * 🔧 채널 데이터 처리 및 정제
   */
  processChannelData(channels, options) {
    return channels.map(channel => {
      const snippet = channel.snippet || {};
      const statistics = channel.statistics || {};
      const branding = channel.brandingSettings?.channel || {};
      const topics = channel.topicDetails || {};

      return {
        // 📋 기본 정보
        channelId: channel.id,
        channelTitle: snippet.title || 'Unknown Channel',
        channelDescription: snippet.description || '',
        customUrl: snippet.customUrl || '',
        
        // 🖼️ 채널 아이콘 (여러 해상도)
        channelIcon: snippet.thumbnails?.high?.url || 
                     snippet.thumbnails?.medium?.url || 
                     snippet.thumbnails?.default?.url || '',
        channelThumbnails: snippet.thumbnails || {},
        
        // 📊 통계 정보
        subscriberCount: parseInt(statistics.subscriberCount) || 0,
        subscriberCountFormatted: this.formatSubscriberCount(parseInt(statistics.subscriberCount) || 0),
        hiddenSubscriberCount: statistics.hiddenSubscriberCount || false,
        totalViewCount: parseInt(statistics.viewCount) || 0,
        videoCount: parseInt(statistics.videoCount) || 0,
        
        // 📅 날짜 정보
        publishedAt: snippet.publishedAt || '',
        createdYear: snippet.publishedAt ? new Date(snippet.publishedAt).getFullYear() : null,
        
        // 🌍 지역 및 언어
        country: snippet.country || '',
        defaultLanguage: snippet.defaultLanguage || '',
        
        // 🔗 URL 정보
        channelUrl: `https://www.youtube.com/channel/${channel.id}`,
        customChannelUrl: snippet.customUrl ? `https://www.youtube.com/${snippet.customUrl}` : '',
        
        // 🎨 브랜딩 정보 (옵션)
        branding: options.includeBranding ? {
          keywords: branding.keywords || '',
          unsubscribedTrailer: branding.unsubscribedTrailer || '',
          country: branding.country || ''
        } : null,
        
        // 🏷️ 주제 정보 (옵션)
        topics: options.includeTopics ? {
          topicIds: topics.topicIds || [],
          topicCategories: topics.topicCategories || []
        } : null,
        
        // 📊 추가 분석 데이터
        engagement: {
          videosPerSubscriber: this.calculateVideosPerSubscriber(
            parseInt(statistics.videoCount) || 0,
            parseInt(statistics.subscriberCount) || 0
          ),
          avgViewsPerVideo: this.calculateAverageViewsPerVideo(
            parseInt(statistics.viewCount) || 0,
            parseInt(statistics.videoCount) || 0
          )
        },
        
        // 🎯 채널 품질 등급
        qualityGrade: this.calculateChannelQualityGrade(statistics),
        
        // 🕐 수집 시간
        collectedAt: new Date().toISOString(),
        
        // 🎯 디버깅 정보
        _debug: {
          hasIcon: !!snippet.thumbnails?.high,
          hasStatistics: !!statistics.subscriberCount,
          hasBranding: !!channel.brandingSettings,
          originalData: {
            snippet: !!snippet,
            statistics: !!statistics,
            branding: !!channel.brandingSettings,
            topics: !!channel.topicDetails
          }
        }
      };
    });
  }

  /**
   * 👥 구독자 수 포맷팅
   */
  formatSubscriberCount(count) {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }

  /**
   * 📊 영상당 평균 조회수 계산
   */
  calculateAverageViewsPerVideo(totalViews, videoCount) {
    return videoCount > 0 ? Math.round(totalViews / videoCount) : 0;
  }

  /**
   * 📊 구독자당 영상 수 계산
   */
  calculateVideosPerSubscriber(videoCount, subscriberCount) {
    return subscriberCount > 0 ? (videoCount / subscriberCount).toFixed(4) : 0;
  }

  /**
   * 🏆 채널 품질 등급 계산
   */
  calculateChannelQualityGrade(statistics) {
    const subscriberCount = parseInt(statistics.subscriberCount) || 0;
    const videoCount = parseInt(statistics.videoCount) || 0;
    
    if (subscriberCount >= 1000000 && videoCount >= 100) return 'S';
    if (subscriberCount >= 100000 && videoCount >= 50) return 'A';
    if (subscriberCount >= 10000 && videoCount >= 20) return 'B';
    if (subscriberCount >= 1000 && videoCount >= 10) return 'C';
    return 'D';
  }

  /**
   * 📊 평균 구독자 수 계산
   */
  calculateAverageSubscribers(channels) {
    if (!channels.length) return 0;
    const total = channels.reduce((sum, ch) => sum + (ch.subscriberCount || 0), 0);
    return Math.round(total / channels.length);
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
      channels: [],
      summary: { 
        totalRequested: 0, 
        successfullyProcessed: 0, 
        apiCost: 0,
        averageSubscribers: 0,
        totalVideos: 0
      }
    };
  }

  /**
   * 📈 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(1) + '%'
        : '0%',
      averageChannelsPerRequest: this.stats.successfulRequests > 0
        ? (this.stats.totalChannelsProcessed / this.stats.successfulRequests).toFixed(1)
        : '0',
      averageApiCostPerChannel: this.stats.totalChannelsProcessed > 0
        ? (this.stats.totalApiUnits / this.stats.totalChannelsProcessed).toFixed(1)
        : '0'
    };
  }
}

export default ChannelInfoCollector;

/**
 * 🎯 편의 함수들
 */

// 전역 인스턴스 생성
function createChannelCollector() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return new ChannelInfoCollector(apiKey);
}

/**
 * 📺 채널 정보 수집 (편의 함수)
 */
export async function collectChannelInfo(channelIds, options = {}) {
  const collector = createChannelCollector();
  return await collector.collectChannelInfo(channelIds, options);
}

/**
 * 🖼️ 채널 아이콘만 빠르게 수집 (편의 함수)
 */
export async function getChannelIcons(channelIds) {
  const collector = createChannelCollector();
  const result = await collector.collectChannelInfo(channelIds, { 
    includeBranding: false, 
    includeTopics: false 
  });
  
  return result.channels.map(channel => ({
    channelId: channel.channelId,
    channelTitle: channel.channelTitle,
    channelIcon: channel.channelIcon,
    subscriberCount: channel.subscriberCountFormatted
  }));
}

/**
 * 📊 채널 통계 조회 (편의 함수)
 */
export async function getChannelStats(channelIds) {
  const collector = createChannelCollector();
  const result = await collector.collectChannelInfo(channelIds);
  
  return result.channels.map(channel => ({
    channelId: channel.channelId,
    channelTitle: channel.channelTitle,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    totalViewCount: channel.totalViewCount,
    qualityGrade: channel.qualityGrade,
    engagement: channel.engagement
  }));
}

/**
 * 📊 전역 통계 조회 (편의 함수)
 */
export function getChannelCollectorStats() {
  // 인스턴스별 통계 관리
  return {
    message: '각 인스턴스별로 통계가 관리됩니다',
    usage: '인스턴스.getStats()를 사용하세요'
  };
} 