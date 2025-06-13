/**
 * 🔥 Trend Video Service (트렌드 영상 큐레이션 서비스)
 * 
 * 🎯 목적: 실시간 트렌드 기반 고품질 YouTube Shorts 큐레이션
 * 
 * 🔄 4단계 워크플로우:
 * 1. Google Trends 활성 키워드 수집 (korean-only, active-only)
 * 2. 뉴스 기반 키워드 정제 (중복 제거 + 맥락 추가 → 10개)
 * 3. YouTube 최신 영상 검색 (24시간 이내, 트렌드 특화)
 * 4. 채널 품질 필터링 (구독자 5만명 이상)
 * 
 * 💡 결과: 재생 보장 + 트렌드 + 고품질 채널의 최신 Shorts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경변수 로드
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 🤖 AI 모듈들 import
import { getActiveKoreanTrends } from '../../youtube-ai-services/trends/modules/google-trends-collector.js';
import { refineKoreanTrends } from '../../youtube-ai-services/keywords/modules/news-based-trend-refiner.js';
import { searchYouTubeShorts } from '../../youtube-ai-services/search/modules/youtube-search-engine.js';
import { collectChannelInfo } from '../../youtube-ai-services/search/modules/channel-info-collector.js';

class TrendVideoService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.serpApiKey = process.env.SERP_API_KEY;
    this.claudeApiKey = process.env.ANTHROPIC_API_KEY;
    
    // 서비스 설정 (트렌드 특화)
    this.config = {
      // 1단계: 트렌드 수집 설정
      trends: {
        maxKeywords: 50,        // 최대 트렌드 키워드 수
        activeOnly: true,       // 활성 키워드만
        region: 'KR',           // 한국 지역만
        noCache: false          // 캐시 사용 (1시간)
      },
      
      // 2단계: 키워드 정제 설정
      refiner: {
        maxFinalKeywords: 10,   // 최종 10개로 정제
        newsPerKeyword: 3,      // 키워드당 뉴스 3개
        removeDuplicates: true, // 중복 제거
        addContext: true,       // 맥락 추가 ("키워드 + 한 단어")
        timeout: 30000          // 30초 타임아웃
      },
      
      // 3단계: YouTube 검색 설정 (트렌드 특화)
      search: {
        part: 'snippet',
        videoDuration: 'short',    // Shorts만
        maxResults: 50,            // 키워드당 50개
        type: 'video',
        regionCode: 'KR',
        relevanceLanguage: 'ko',
        safeSearch: 'moderate',
        videoEmbeddable: 'true',   // 임베드 가능
        videoSyndicated: 'true',   // 외부 재생 가능
        videoDefinition: 'high',   // HD 화질
        publishedAfter: null       // 동적 설정 (24시간 이내)
      },
      
      // 4단계: 채널 필터링 설정
      channelFilter: {
        minSubscribers: 50000,     // 5만명 이상
        includeBranding: false,    // 브랜딩 정보 불필요
        includeTopics: false,      // 주제 정보 불필요
        language: 'ko'             // 한국어
      }
    };
    
    // 통계 초기화
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      totalTrendsCollected: 0,
      totalRefinedKeywords: 0,
      totalVideosFound: 0,
      totalQualityVideos: 0,
      averageProcessingTime: 0,
      lastRunTime: null,
      apiCostsBreakdown: {
        trendsCollection: 0,
        keywordRefinement: 0,
        youtubeSearch: 0,
        channelInfo: 0,
        total: 0
      }
    };
    
    console.log('🔥 Trend Video Service 초기화 완료');
    console.log(`🔑 API 키 상태:`);
    console.log(`   YouTube: ${this.apiKey ? '✅' : '❌'}`);
    console.log(`   SerpAPI: ${this.serpApiKey ? '✅' : '❌'}`);
    console.log(`   Claude: ${this.claudeApiKey ? '✅' : '❌'}`);
  }

  /**
   * 🎯 메인 함수: 트렌드 기반 영상 큐레이션 실행
   */
  async generateTrendVideos(options = {}) {
    console.log('\n🔥 ===== 트렌드 영상 큐레이션 시작 =====');
    const startTime = Date.now();
    this.stats.totalRuns++;

    try {
      // 설정 병합
      const config = this.mergeConfig(options);
      
      // 24시간 이내 영상 검색을 위한 시간 설정
      const publishedAfter = this.get24HoursAgo();
      config.search.publishedAfter = publishedAfter;
      
      console.log(`⏰ 검색 기준: ${publishedAfter} 이후 업로드된 영상`);

      // 🔥 1단계: Google Trends 활성 키워드 수집
      console.log('\n📈 1단계: Google Trends 활성 키워드 수집');
      const trendsResult = await this.collectActiveTrends(config.trends);
      
      if (!trendsResult.success || trendsResult.keywords.length === 0) {
        throw new Error('트렌드 키워드 수집 실패');
      }

      // 🔥 2단계: 뉴스 기반 키워드 정제
      console.log('\n📰 2단계: 뉴스 기반 키워드 정제');
      const refinedResult = await this.refineKeywords(trendsResult.keywords, config.refiner);
      
      if (!refinedResult.success || refinedResult.refinedKeywords.length === 0) {
        throw new Error('키워드 정제 실패');
      }

      // 🔥 3단계: YouTube 최신 영상 검색
      console.log('\n🎬 3단계: YouTube 최신 영상 검색');
      const searchResults = await this.searchTrendVideos(refinedResult.refinedKeywords, config.search);
      
      if (searchResults.totalVideos === 0) {
        throw new Error('검색된 영상이 없음');
      }

      // 🔥 4단계: 채널 품질 필터링
      console.log('\n📺 4단계: 채널 품질 필터링');
      const finalResult = await this.filterByChannelQuality(searchResults, config.channelFilter);

      // 📊 결과 요약
      const processingTime = Date.now() - startTime;
      const summary = this.generateSummary(
        trendsResult,
        refinedResult, 
        searchResults,
        finalResult,
        processingTime
      );

      // 통계 업데이트
      this.updateStats(summary, true);

      console.log('\n✅ ===== 트렌드 영상 큐레이션 완료 =====');
      console.log(`🎯 최종 결과: ${finalResult.qualityVideos.length}개 고품질 트렌드 영상`);
      console.log(`⏱️ 처리 시간: ${processingTime}ms`);

      return {
        success: true,
        data: {
          trendVideos: finalResult.qualityVideos,
          keywords: refinedResult.refinedKeywords,
          trendsData: trendsResult,
          searchData: searchResults,
          channelData: finalResult.channelData
        },
        summary,
        processingTime,
        config: {
          searchTimeRange: `${publishedAfter} ~ now`,
          channelMinSubscribers: config.channelFilter.minSubscribers,
          finalKeywordCount: refinedResult.refinedKeywords.length
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ 트렌드 영상 큐레이션 실패:', error.message);
      
      this.updateStats(null, false);
      
      return {
        success: false,
        error: error.message,
        processingTime,
        fallback: await this.generateFallbackResult()
      };
    }
  }

  /**
   * 📈 1단계: Google Trends 활성 키워드 수집
   */
  async collectActiveTrends(config) {
    console.log(`📊 한국 활성 트렌드 수집 중... (최대 ${config.maxKeywords}개)`);
    
    try {
      const result = await getActiveKoreanTrends({
        maxKeywords: config.maxKeywords,
        includeMetadata: true,
        timeout: 10000,
        noCache: config.noCache
      });

      if (result.success && result.keywords.length > 0) {
        console.log(`✅ 활성 트렌드 수집 성공: ${result.keywords.length}개`);
        console.log(`🔥 상위 5개: ${result.keywords.slice(0, 5).join(', ')}`);
        
        this.stats.totalTrendsCollected += result.keywords.length;
        
        return {
          success: true,
          keywords: result.keywords,
          trends: result.trends,
          summary: result.summary
        };
      } else {
        throw new Error('활성 트렌드가 없음');
      }

    } catch (error) {
      console.error('❌ 트렌드 수집 실패:', error.message);
      throw error;
    }
  }

  /**
   * 📰 2단계: 뉴스 기반 키워드 정제
   */
  async refineKeywords(keywords, config) {
    console.log(`🎯 키워드 정제 시작: ${keywords.length}개 → 최대 ${config.maxFinalKeywords}개`);
    
    try {
      const result = await refineKoreanTrends(keywords, {
        maxFinalKeywords: config.maxFinalKeywords,
        newsPerKeyword: config.newsPerKeyword,
        removeDuplicates: config.removeDuplicates,
        addContext: config.addContext,
        timeout: config.timeout
      });

      if (result.success && result.refinedKeywords.length > 0) {
        console.log(`✅ 키워드 정제 성공: ${result.refinedKeywords.length}개`);
        console.log(`🎨 정제된 키워드:`);
        result.refinedKeywords.forEach((keyword, index) => {
          console.log(`   ${index + 1}. "${keyword}"`);
        });
        
        this.stats.totalRefinedKeywords += result.refinedKeywords.length;
        
        return {
          success: true,
          refinedKeywords: result.refinedKeywords,
          originalKeywords: result.originalKeywords,
          analysis: result.analysis,
          statistics: result.statistics
        };
      } else {
        throw new Error('키워드 정제 실패');
      }

    } catch (error) {
      console.error('❌ 키워드 정제 실패:', error.message);
      
      // 폴백: 원본 키워드 상위 10개 사용
      const fallbackKeywords = keywords.slice(0, config.maxFinalKeywords);
      console.log(`🔄 폴백 모드: 원본 키워드 상위 ${fallbackKeywords.length}개 사용`);
      
      return {
        success: true,
        refinedKeywords: fallbackKeywords,
        originalKeywords: keywords,
        fallback: true,
        error: error.message
      };
    }
  }

  /**
   * 🎬 3단계: YouTube 최신 영상 검색 (트렌드 특화)
   */
  async searchTrendVideos(keywords, config) {
    console.log(`🔍 ${keywords.length}개 키워드로 최신 영상 검색 중...`);
    console.log(`📅 검색 범위: ${config.publishedAfter} 이후`);
    
    const allVideos = [];
    const keywordResults = {};
    let totalApiCost = 0;

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      console.log(`\n🎯 [${i + 1}/${keywords.length}] "${keyword}" 검색 중...`);
      
      try {
        const searchResult = await searchYouTubeShorts(this.apiKey, keyword, config);
        
        if (searchResult.success && searchResult.data.items) {
          const videos = searchResult.data.items.map(item => ({
            ...item,
            searchKeyword: keyword,
            keywordRank: i + 1
          }));
          
          allVideos.push(...videos);
          keywordResults[keyword] = {
            videoCount: videos.length,
            totalResults: searchResult.totalResults,
            responseTime: searchResult.responseTime
          };
          
          totalApiCost += searchResult.apiCost || 100;
          
          console.log(`   ✅ ${videos.length}개 영상 발견 (총 ${searchResult.totalResults.toLocaleString()}개 가능)`);
        } else {
          console.log(`   ⚠️ "${keyword}" 검색 결과 없음`);
          keywordResults[keyword] = { videoCount: 0, totalResults: 0 };
        }

        // API 호출 간격 (Rate Limiting 방지)
        if (i < keywords.length - 1) {
          await this.delay(1000);
        }

      } catch (error) {
        console.error(`   ❌ "${keyword}" 검색 실패:`, error.message);
        keywordResults[keyword] = { 
          videoCount: 0, 
          error: error.message 
        };
      }
    }

    this.stats.totalVideosFound += allVideos.length;

    console.log(`\n📊 검색 완료: 총 ${allVideos.length}개 영상 발견`);
    console.log(`💰 API 비용: ${totalApiCost} units`);

    return {
      allVideos,
      keywordResults,
      totalVideos: allVideos.length,
      apiCost: totalApiCost,
      searchConfig: config
    };
  }

  /**
   * 📺 4단계: 채널 품질 필터링 (구독자 5만명 이상)
   */
  async filterByChannelQuality(searchResults, config) {
    const { allVideos } = searchResults;
    
    if (allVideos.length === 0) {
      return { qualityVideos: [], channelData: {}, filterStats: {} };
    }

    console.log(`📺 채널 품질 필터링 시작: ${allVideos.length}개 영상`);
    console.log(`🎯 필터 조건: 구독자 ${config.minSubscribers.toLocaleString()}명 이상`);

    try {
      // 고유 채널 ID 추출
      const channelIds = [...new Set(
        allVideos.map(video => video.snippet?.channelId).filter(id => id)
      )];
      
      console.log(`📊 분석 대상 채널: ${channelIds.length}개`);

      // 채널 정보 수집
      const channelResult = await collectChannelInfo(channelIds, {
        includeBranding: config.includeBranding,
        includeTopics: config.includeTopics,
        language: config.language
      });

      if (!channelResult.success) {
        throw new Error('채널 정보 수집 실패');
      }

      // 구독자 수 기준 필터링
      const qualityChannels = channelResult.channels.filter(
        channel => channel.subscriberCount >= config.minSubscribers
      );

      const qualityChannelIds = new Set(
        qualityChannels.map(channel => channel.channelId)
      );

      // 고품질 채널의 영상만 필터링
      const qualityVideos = allVideos.filter(video => 
        qualityChannelIds.has(video.snippet?.channelId)
      );

      // 채널 정보 맵 생성 (빠른 조회용)
      const channelDataMap = {};
      qualityChannels.forEach(channel => {
        channelDataMap[channel.channelId] = {
          channelTitle: channel.channelTitle,
          channelIcon: channel.channelIcon,
          subscriberCount: channel.subscriberCount,
          subscriberCountFormatted: channel.subscriberCountFormatted,
          videoCount: channel.videoCount,
          qualityGrade: channel.qualityGrade
        };
      });

      // 영상에 채널 정보 추가
      const enrichedVideos = qualityVideos.map(video => ({
        ...video,
        channelInfo: channelDataMap[video.snippet?.channelId] || null
      }));

      console.log(`✅ 품질 필터링 완료:`);
      console.log(`   📊 전체 채널: ${channelIds.length}개`);
      console.log(`   🏆 고품질 채널: ${qualityChannels.length}개`);
      console.log(`   🎬 고품질 영상: ${enrichedVideos.length}개`);
      console.log(`   📈 필터링 성공률: ${((enrichedVideos.length / allVideos.length) * 100).toFixed(1)}%`);

      this.stats.totalQualityVideos += enrichedVideos.length;

      return {
        qualityVideos: enrichedVideos,
        channelData: channelDataMap,
        filterStats: {
          totalChannels: channelIds.length,
          qualityChannels: qualityChannels.length,
          totalVideos: allVideos.length,
          qualityVideos: enrichedVideos.length,
          filterSuccessRate: (enrichedVideos.length / allVideos.length * 100).toFixed(1) + '%',
          apiCost: channelResult.summary.apiCost
        }
      };

    } catch (error) {
      console.error('❌ 채널 필터링 실패:', error.message);
      
      // 폴백: 원본 영상 반환 (채널 정보 없이)
      console.log('🔄 폴백 모드: 채널 필터링 없이 원본 영상 반환');
      
      return {
        qualityVideos: allVideos,
        channelData: {},
        filterStats: {
          totalVideos: allVideos.length,
          qualityVideos: allVideos.length,
          fallback: true,
          error: error.message
        }
      };
    }
  }

  /**
   * 📊 결과 요약 생성
   */
  generateSummary(trendsResult, refinedResult, searchResults, finalResult, processingTime) {
    return {
      pipeline: {
        trendsCollected: trendsResult.keywords.length,
        keywordsRefined: refinedResult.refinedKeywords.length,
        videosSearched: searchResults.totalVideos,
        qualityVideosFiltered: finalResult.qualityVideos.length
      },
      performance: {
        processingTime,
        apiCosts: {
          youtubeSearch: searchResults.apiCost,
          channelInfo: finalResult.filterStats.apiCost || 0,
          total: (searchResults.apiCost || 0) + (finalResult.filterStats.apiCost || 0)
        },
        filteringEfficiency: finalResult.filterStats.filterSuccessRate || 'N/A'
      },
      quality: {
        trendKeywords: refinedResult.refinedKeywords,
        channelQualityDistribution: this.analyzeChannelQuality(finalResult.channelData),
        averageSubscribers: this.calculateAverageSubscribers(finalResult.channelData)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🔧 유틸리티 메서드들
   */
  
  get24HoursAgo() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return yesterday.toISOString();
  }

  mergeConfig(options) {
    return {
      trends: { ...this.config.trends, ...options.trends },
      refiner: { ...this.config.refiner, ...options.refiner },
      search: { ...this.config.search, ...options.search },
      channelFilter: { ...this.config.channelFilter, ...options.channelFilter }
    };
  }

  analyzeChannelQuality(channelData) {
    const grades = {};
    Object.values(channelData).forEach(channel => {
      const grade = channel.qualityGrade || 'Unknown';
      grades[grade] = (grades[grade] || 0) + 1;
    });
    return grades;
  }

  calculateAverageSubscribers(channelData) {
    const channels = Object.values(channelData);
    if (channels.length === 0) return 0;
    
    const total = channels.reduce((sum, channel) => sum + (channel.subscriberCount || 0), 0);
    return Math.round(total / channels.length);
  }

  updateStats(summary, success) {
    if (success) {
      this.stats.successfulRuns++;
      if (summary) {
        this.stats.averageProcessingTime = 
          (this.stats.averageProcessingTime * (this.stats.successfulRuns - 1) + summary.performance.processingTime) / this.stats.successfulRuns;
      }
    }
    this.stats.lastRunTime = new Date().toISOString();
  }

  async generateFallbackResult() {
    return {
      message: '폴백 모드: 기본 트렌드 키워드로 검색',
      fallbackKeywords: ['쇼츠', '트렌드', '인기', '바이럴', '요즘'],
      suggestion: 'API 키 설정을 확인하고 다시 시도해주세요'
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 서비스 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRuns > 0 
        ? (this.stats.successfulRuns / this.stats.totalRuns * 100).toFixed(1) + '%'
        : '0%',
      averageQualityVideos: this.stats.successfulRuns > 0
        ? Math.round(this.stats.totalQualityVideos / this.stats.successfulRuns)
        : 0
    };
  }
}

export default TrendVideoService;

/**
 * 🎯 편의 함수 - 바로 사용 가능
 */
export async function generateTrendVideos(options = {}) {
  const service = new TrendVideoService();
  return await service.generateTrendVideos(options);
}

/**
 * 📊 서비스 통계 조회
 */
export function getTrendVideoStats() {
  const service = new TrendVideoService();
  return service.getStats();
}

/**
 * 🎨 빠른 트렌드 키워드 조회 (1-2단계만)
 * 
 * Google Trends → 뉴스 정제만 실행 (영상 검색 생략)
 */
export async function getQuickTrendKeywords(options = {}) {
  const {
    maxKeywords = 20,
    finalKeywords = 10,
    region = 'KR',
    noCache = false,
    includeContext = false,
    timeout = 30000
  } = options;

  const startTime = Date.now();
  
  try {
    console.log('🎨 빠른 키워드 조회 시작');
    
    const service = new TrendVideoService();
    
    // 🔥 1단계: Google Trends 수집
    const trendsResult = await service.collectActiveTrends({
      maxKeywords,
      region,
      noCache
    });
    
    if (!trendsResult.success) {
      throw new Error('트렌드 수집 실패');
    }

    // 🔥 2단계: 뉴스 기반 정제
    const refinedResult = await service.refineKeywords(trendsResult.keywords, {
      maxFinalKeywords: finalKeywords,
      timeout,
      newsPerKeyword: 3,
      removeDuplicates: true,
      addContext: true
    });

    if (!refinedResult.success) {
      throw new Error('키워드 정제 실패');
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        keywords: refinedResult.refinedKeywords,
        context: includeContext ? {
          originalTrends: trendsResult.keywords,
          analysis: refinedResult.analysis,
          statistics: refinedResult.statistics
        } : undefined
      },
      processingTime,
      config: {
        region,
        maxKeywords,
        finalKeywords
      }
    };

  } catch (error) {
    console.error('🎨 빠른 키워드 조회 실패:', error);
    
    return {
      success: false,
      error: error.message,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * ✅ 설정 유효성 검증
 */
export function validateConfig(config) {
  const errors = [];
  
  try {
    // 트렌드 설정 검증
    if (config.trends) {
      if (config.trends.maxKeywords && (config.trends.maxKeywords < 1 || config.trends.maxKeywords > 100)) {
        errors.push('maxKeywords는 1-100 사이여야 합니다');
      }
      
      if (config.trends.region && !/^[A-Z]{2}$/.test(config.trends.region)) {
        errors.push('region은 2자리 국가 코드여야 합니다 (예: KR, US)');
      }
    }

    // 정제 설정 검증
    if (config.refiner) {
      if (config.refiner.maxFinalKeywords && (config.refiner.maxFinalKeywords < 1 || config.refiner.maxFinalKeywords > 50)) {
        errors.push('maxFinalKeywords는 1-50 사이여야 합니다');
      }
      
      if (config.refiner.timeout && (config.refiner.timeout < 5000 || config.refiner.timeout > 120000)) {
        errors.push('timeout은 5000-120000ms 사이여야 합니다');
      }
    }

    // 검색 설정 검증
    if (config.search) {
      if (config.search.maxResults && (config.search.maxResults < 1 || config.search.maxResults > 50)) {
        errors.push('maxResults는 1-50 사이여야 합니다');
      }
      
      if (config.search.timeRange && !['24h', '7d', '30d'].includes(config.search.timeRange)) {
        errors.push('timeRange는 24h, 7d, 30d 중 하나여야 합니다');
      }
    }

    // 채널 필터 설정 검증
    if (config.channelFilter) {
      if (config.channelFilter.minSubscribers && config.channelFilter.minSubscribers < 0) {
        errors.push('minSubscribers는 0 이상이어야 합니다');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };

  } catch (error) {
    return {
      isValid: false,
      errors: ['설정 검증 중 오류 발생: ' + error.message]
    };
  }
} 