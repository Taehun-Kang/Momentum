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

// 💾 Database 서비스들 import
import { 
  createRawTrendDataBatch, 
  createTrendAnalysisResult, 
  createKeywordAnalysis 
} from '../database/trendService.js';
import { 
  saveVideosBatch, 
  saveChannelsBatch, 
  checkExistingVideos 
} from '../database/videoService.js';
import { 
  createSearchLog, 
  updateSearchLog 
} from '../database/searchService.js';
import { 
  logApiUsage, 
  logSystemPerformance, 
  logAutomatedJob 
} from '../database/systemService.js';

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
    
    // 실행 시작 시간 (generateSummary에서 사용)
    this.startTime = null;
    
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
    this.startTime = startTime; // DB 저장용 시작 시간
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
    const dbSaveStartTime = Date.now();
    
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
        
        // 📋 [DB 저장 1] 원시 트렌드 데이터 배치 저장
        console.log(`💾 [DB 저장 1/3] 원시 트렌드 데이터 저장 중...`);
        try {
          // ✅ UUID 형식으로 batchId 생성
          const { randomUUID } = await import('crypto');
          const batchId = randomUUID();
          
          const trendsArray = result.keywords.map((keyword, index) => ({
            keyword,
            rank: index + 1, // ✅ NOT NULL 제약조건 해결: 순위 추가
            regionCode: 'KR',
            trendScore: Math.max(0.5, 1.0 - (index * 0.05)), // 순위별 트렌드 점수
            sourceData: result.trends || {},
            collectionTimestamp: new Date().toISOString()
          }));

          const trendSaveResult = await createRawTrendDataBatch(trendsArray, batchId);
          
          if (trendSaveResult.success) {
            console.log(`   ✅ 원시 트렌드 데이터 저장 성공: ${result.keywords.length}개`);
          } else {
            console.error(`   ⚠️ 원시 트렌드 데이터 저장 실패: ${trendSaveResult.error}`);
          }
        } catch (dbError) {
          console.error(`   ❌ 원시 트렌드 데이터 저장 중 오류:`, dbError.message);
        }

        // 📋 [DB 저장 2] API 사용량 기록
        console.log(`💾 [DB 저장 2/3] API 사용량 기록 중...`);
        try {
          const apiUsageResult = await logApiUsage({
            sessionId: `trend_collection_${Date.now()}`,
            apiProvider: 'google_trends', // ✅ DB enum 값 수정: 'google' → 'google_trends'
            apiEndpoint: 'trends_api',
            responseTimeMs: Math.round(Date.now() - dbSaveStartTime), // ✅ Integer 타입 보장
            success: true,
            operationType: 'trend_collection',
            moduleName: 'trendVideoService',
            searchKeyword: `batch_${result.keywords.length}_keywords`,
            processedAt: new Date().toISOString()
          });

          if (apiUsageResult.success) {
            console.log(`   ✅ API 사용량 기록 성공`);
          } else {
            console.error(`   ⚠️ API 사용량 기록 실패: ${apiUsageResult.error}`);
          }
        } catch (dbError) {
          console.error(`   ❌ API 사용량 기록 중 오류:`, dbError.message);
        }

        // 📋 [DB 저장 3] 시스템 성능 지표 기록
        console.log(`💾 [DB 저장 3/3] 시스템 성능 지표 기록 중...`);
        try {
          const perfResult = await logSystemPerformance({
            metricType: 'search_performance', // ✅ DB enum 값 수정: 'search_efficiency' → 'search_performance'
            searchResultsCount: result.keywords.length,
            apiUnitsUsed: 0, // Google Trends는 무료
            efficiencyVideosPer100units: 0,
            totalApiCalls: 1,
            successfulApiCalls: 1,
            apiSuccessRate: 1.0,
            averageResponseTimeMs: Math.round(Date.now() - dbSaveStartTime), // ✅ Integer 타입 보장
            moduleName: 'trendVideoService',
            operationType: 'trend_collection',
            measurementTimestamp: new Date().toISOString()
          });

          if (perfResult.success) {
            console.log(`   ✅ 시스템 성능 지표 기록 성공`);
          } else {
            console.error(`   ⚠️ 시스템 성능 지표 기록 실패: ${perfResult.error}`);
          }
        } catch (dbError) {
          console.error(`   ❌ 시스템 성능 지표 기록 중 오류:`, dbError.message);
        }

        this.stats.totalTrendsCollected += result.keywords.length;
        
        const dbSaveTime = Date.now() - dbSaveStartTime;
        console.log(`💾 [DB 저장 완료] 총 소요 시간: ${dbSaveTime}ms`);
        
        return {
          success: true,
          keywords: result.keywords,
          trends: result.trends,
          summary: result.summary,
          dbSaveTime: dbSaveTime
        };
      } else {
        throw new Error('활성 트렌드가 없음');
      }

    } catch (error) {
      console.error('❌ 트렌드 수집 실패:', error.message);
      
      // 🚨 실패 시에도 DB에 기록
      try {
        await logApiUsage({
          sessionId: `trend_collection_failed_${Date.now()}`,
          apiProvider: 'google_trends',
          apiEndpoint: 'trends_api',
          responseTimeMs: Date.now() - dbSaveStartTime,
          success: false,
          errorMessage: error.message,
          errorType: 'trend_collection_failure',
          operationType: 'trend_collection',
          moduleName: 'trendVideoService'
        });
      } catch (dbError) {
        console.error('❌ 실패 로그 기록 중 오류:', dbError.message);
      }
      
      throw error;
    }
  }

  /**
   * 📰 2단계: 뉴스 기반 키워드 정제
   */
  async refineKeywords(keywords, config) {
    console.log(`🎯 키워드 정제 시작: ${keywords.length}개 → 최대 ${config.maxFinalKeywords}개`);
    const dbSaveStartTime = Date.now();
    
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
        
        // 📋 [DB 저장 1] 트렌드 분석 결과 저장
        console.log(`💾 [DB 저장 1/2] 트렌드 분석 결과 저장 중...`);
        try {
          // ✅ 중복 방지: 유니크한 분석 ID 생성
          const { randomUUID } = await import('crypto');
          
          const analysisResult = await createTrendAnalysisResult({
            originalKeywords: keywords,
            refinedKeywords: result.refinedKeywords,
            analysisMethod: 'news_based_refinement',
            qualityScore: result.refinedKeywords.length / keywords.length, // 정제 효율성
            confidence: 0.8,
            analysisData: {
              refinement_ratio: result.refinedKeywords.length / keywords.length,
              analysis_results: result.analysis,
              statistics: result.statistics,
              processing_time: Date.now() - dbSaveStartTime,
              config: config,
              unique_id: randomUUID() // 중복 방지를 위한 유니크 ID
            },
            regionCode: 'KR',
            executedAt: new Date().toISOString()
          });

          if (analysisResult.success) {
            console.log(`   ✅ 트렌드 분석 결과 저장 성공`);
          } else {
            console.error(`   ⚠️ 트렌드 분석 결과 저장 실패: ${analysisResult.error}`);
          }
        } catch (dbError) {
          console.error(`   ❌ 트렌드 분석 결과 저장 중 오류:`, dbError.message);
        }

        // 📋 [DB 저장 2] 키워드별 분석 데이터 저장
        console.log(`💾 [DB 저장 2/2] 키워드별 분석 데이터 저장 중...`);
        try {
          for (let i = 0; i < result.refinedKeywords.length; i++) { // 상위 5개만
            const keyword = result.refinedKeywords[i];
            const keywordAnalysisResult = await createKeywordAnalysis({
              keyword: keyword,
              analysisType: 'trend_refinement',
              qualityScore: Math.max(0.5, 1.0 - (i * 0.1)), // 순위별 품질 점수
              confidence: 0.8,
              analysisData: {
                refinement_rank: i + 1,
                original_index: keywords.indexOf(keyword),
                context_added: config.addContext,
                news_sources_count: config.newsPerKeyword,
                duplicate_removed: config.removeDuplicates
              },
              tags: ['trend', 'news_based', 'refined'],
              regionCode: 'KR',
              executedAt: new Date().toISOString()
            });

            if (keywordAnalysisResult.success) {
              console.log(`   ✅ "${keyword}" 키워드 분석 저장 성공`);
            } else {
              console.error(`   ⚠️ "${keyword}" 키워드 분석 저장 실패: ${keywordAnalysisResult.error}`);
            }
          }
        } catch (dbError) {
          console.error(`   ❌ 키워드별 분석 데이터 저장 중 오류:`, dbError.message);
        }
        
        this.stats.totalRefinedKeywords += result.refinedKeywords.length;
        
        const dbSaveTime = Date.now() - dbSaveStartTime;
        console.log(`💾 [DB 저장 완료] 키워드 정제 결과 저장 시간: ${dbSaveTime}ms`);
        
        return {
          success: true,
          refinedKeywords: result.refinedKeywords,
          originalKeywords: result.originalKeywords,
          analysis: result.analysis,
          statistics: result.statistics,
          dbSaveTime: dbSaveTime
        };
      } else {
        throw new Error('키워드 정제 실패');
      }

    } catch (error) {
      console.error('❌ 키워드 정제 실패:', error.message);
      
      // 폴백: 원본 키워드 상위 10개 사용
      const fallbackKeywords = keywords.slice(0, config.maxFinalKeywords);
      console.log(`🔄 폴백 모드: 원본 키워드 상위 ${fallbackKeywords.length}개 사용`);
      
      // 🚨 폴백 사용 시에도 DB에 기록 (중복 방지 포함)
      try {
        const { randomUUID } = await import('crypto');
        
        await createTrendAnalysisResult({
          originalKeywords: keywords,
          refinedKeywords: fallbackKeywords,
          analysisMethod: 'fallback_mode',
          qualityScore: 0.3, // 폴백 모드는 낮은 품질 점수
          confidence: 0.5,
          analysisData: {
            fallback_reason: error.message,
            fallback_used: true,
            original_method: 'news_based_refinement',
            unique_id: randomUUID() // ✅ 중복 방지를 위한 유니크 ID
          },
          regionCode: 'KR',
          executedAt: new Date().toISOString()
        });
        console.log(`💾 폴백 모드 DB 기록 완료`);
      } catch (dbError) {
        console.error(`❌ 폴백 모드 DB 기록 중 오류:`, dbError.message);
      }
      
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

    // 📋 [DB 저장] 검색 기록만 저장 (영상은 채널 필터링 후 저장)
    if (allVideos.length > 0) {
      console.log(`💾 [DB 저장] 검색 기록 저장 시작... (영상은 채널 필터링 후 저장)`);
      const dbSaveStartTime = Date.now();
      
      try {
        // 📋 [DB 저장 1] 키워드별 검색 실행 기록
        console.log(`💾 [DB 저장 1/2] 키워드별 검색 실행 기록 중... (${keywords.length}개)`);
        for (const keyword of keywords) {
          const keywordResult = keywordResults[keyword];
          if (keywordResult && keywordResult.videoCount > 0) {
            try {
              const searchLogResult = await createSearchLog({
                sessionId: `trend_search_${Date.now()}_${keyword}`,
                searchQuery: keyword,
                searchType: 'trending', // ✅ DB enum 값 수정: 더 적절한 타입
                searchSource: 'trending_click', // ✅ DB enum 값 수정: 'api' → 'trending_click'
                keywordsUsed: [keyword],
                filtersApplied: {
                  videoDuration: 'short',
                  regionCode: 'KR',
                  publishedAfter: config.publishedAfter
                },
                resultsCount: keywordResult.totalResults,
                resultsReturned: keywordResult.videoCount,
                playableResultsCount: keywordResult.videoCount, // 기본값으로 전체 재생 가능
                apiUnitsConsumed: 100, // search.list 기본 비용
                responseTime: Math.round(keywordResult.responseTime || 1000), // ✅ Integer 타입 보장
                searchFailed: false,
                moduleName: 'trendVideoService',
                searchStartedAt: new Date().toISOString(),
                searchCompletedAt: new Date().toISOString()
              });

              if (searchLogResult.success) {
                console.log(`   ✅ "${keyword}" 검색 기록 성공`);
              } else {
                console.error(`   ⚠️ "${keyword}" 검색 기록 실패: ${searchLogResult.error}`);
              }
            } catch (dbError) {
              console.error(`   ❌ "${keyword}" 검색 기록 중 오류:`, dbError.message);
            }
          }
        }

        // 📋 [DB 저장 2] API 사용량 집계 기록
        console.log(`💾 [DB 저장 2/2] API 사용량 집계 기록 중...`);
        try {
          const apiUsageResult = await logApiUsage({
            sessionId: `trend_video_search_${Date.now()}`,
            apiProvider: 'youtube_data_api', // ✅ DB enum 값 수정: 'youtube_v3' → 'youtube_data_api'
            apiEndpoint: 'search.list',
            youtubeQuotaUnits: totalApiCost,
            youtubeVideoCount: allVideos.length,
            responseTimeMs: Math.round(keywords.length * 1000), // ✅ Integer 타입 보장
            success: true,
            operationType: 'batch_video_search',
            moduleName: 'trendVideoService',
            searchKeyword: `batch_${keywords.length}_keywords`,
            processedAt: new Date().toISOString()
          });

          if (apiUsageResult.success) {
            console.log(`   ✅ API 사용량 집계 기록 성공`);
          } else {
            console.error(`   ⚠️ API 사용량 집계 기록 실패: ${apiUsageResult.error}`);
          }
        } catch (dbError) {
          console.error(`   ❌ API 사용량 집계 기록 중 오류:`, dbError.message);
        }

        const dbSaveTime = Date.now() - dbSaveStartTime;
        console.log(`💾 [DB 저장 완료] 검색 기록 저장 시간: ${dbSaveTime}ms`);
        console.log(`🎬 영상은 채널 필터링 후 FK 제약 조건을 만족한 상태로 저장됩니다`);
        
      } catch (error) {
        console.error(`❌ 검색 기록 DB 저장 중 전체 오류:`, error.message);
      }
    } else {
      console.log(`💾 [DB 저장 생략] 저장할 검색 기록 없음`);
    }

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

      // 📋 [DB 저장] 채널 품질 데이터 저장
      if (qualityChannels.length > 0) {
        console.log(`💾 [DB 저장] 채널 품질 데이터 저장 시작...`);
        const dbSaveStartTime = Date.now();
        
        try {
          // 📋 [DB 저장 1] 고품질 채널 배치 저장
          console.log(`💾 [DB 저장 1/2] 고품질 채널 배치 저장 중... (${qualityChannels.length}개)`);
          const channelsForDB = qualityChannels.map(channel => ({
            channel_id: channel.channelId,
            channel_title: channel.channelTitle,
            subscriber_count: channel.subscriberCount,
            video_count: channel.videoCount,
            channel_icon_url: channel.channelIcon,
            channel_description: channel.channelDescription || '',
            quality_grade: channel.qualityGrade,
            collected_at: new Date().toISOString(),
            api_units_consumed: Math.floor((channelResult.summary.apiCost || 0) / qualityChannels.length),
            collection_context: {
              collection_method: 'trend_quality_filtering',
              min_subscribers: config.minSubscribers,
              filter_applied: true,
              total_channels_checked: channelIds.length,
              filter_success_rate: ((qualityChannels.length / channelIds.length) * 100).toFixed(1) + '%'
            }
          }));

          const channelSaveResult = await saveChannelsBatch(channelsForDB);
          
          if (channelSaveResult.success) {
            console.log(`   ✅ 채널 배치 저장 성공: ${channelSaveResult.data?.saved_count || qualityChannels.length}개`);
          } else {
            console.error(`   ⚠️ 채널 배치 저장 실패: ${channelSaveResult.error}`);
          }

          // 📋 [DB 저장 2] 시스템 성능 지표 기록 (필터링 효율성)
          console.log(`💾 [DB 저장 2/2] 필터링 성능 지표 기록 중...`);
          try {
            const filterEfficiencyRate = (enrichedVideos.length / allVideos.length);
            const perfResult = await logSystemPerformance({
              metricType: 'search_performance', // ✅ DB enum 값 수정: 'search_efficiency' → 'search_performance'
              searchResultsCount: allVideos.length,
              apiUnitsUsed: channelResult.summary.apiCost || 0,
              efficiencyVideosPer100units: Math.round((enrichedVideos.length / Math.max(1, channelResult.summary.apiCost || 1)) * 100),
              targetAchievementRate: filterEfficiencyRate,
              totalApiCalls: 1, // channels.list 호출
              successfulApiCalls: 1,
              apiSuccessRate: 1.0,
              averageResponseTimeMs: Math.round(Date.now() - dbSaveStartTime), // ✅ Integer 타입 보장
              cacheHitRate: 0, // 채널 정보는 실시간 수집
              moduleName: 'trendVideoService',
              operationType: 'channel_quality_filtering',
              measurementTimestamp: new Date().toISOString()
            });

            if (perfResult.success) {
              console.log(`   ✅ 필터링 성능 지표 기록 성공`);
            } else {
              console.error(`   ⚠️ 필터링 성능 지표 기록 실패: ${perfResult.error}`);
            }
          } catch (dbError) {
            console.error(`   ❌ 필터링 성능 지표 기록 중 오류:`, dbError.message);
          }

          const dbSaveTime = Date.now() - dbSaveStartTime;
          console.log(`💾 [DB 저장 완료] 채널 데이터 저장 시간: ${dbSaveTime}ms`);
          
        } catch (error) {
          console.error(`❌ 채널 데이터 DB 저장 중 전체 오류:`, error.message);
        }
      } else {
        console.log(`💾 [DB 저장 생략] 저장할 고품질 채널 없음`);
      }

      // 📋 [DB 저장] 필터링된 영상 저장 (FK 제약 조건 만족)
      if (enrichedVideos.length > 0) {
        console.log(`💾 [DB 저장] 필터링된 영상 저장 시작... (${enrichedVideos.length}개)`);
        const videoSaveStartTime = Date.now();
        
        try {
          const videosForDB = enrichedVideos.map(video => ({
            video_id: video.id?.videoId || video.snippet?.resourceId?.videoId,
            title: video.snippet?.title || '',
            description: video.snippet?.description || '',
            channel_id: video.snippet?.channelId,
            channel_title: video.snippet?.channelTitle,
            published_at: video.snippet?.publishedAt,
            thumbnail_url: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.default?.url,
            search_keyword: video.searchKeyword,
            category: '트렌드',
            is_playable: true, // 고품질 채널의 영상이므로 재생 가능으로 가정
            quality_score: video.channelInfo ? 
              Math.min(0.9, 0.5 + (video.channelInfo.subscriberCount / 1000000) * 0.4) : 0.7, // 구독자 수 기반 품질 점수
            api_units_consumed: 5, // 채널 정보 수집 비용
            cache_source: 'trend_quality_filtered',
            collection_context: {
              collection_method: 'trend_quality_filtering',
              keyword_rank: video.keywordRank,
              channel_quality_grade: video.channelInfo?.qualityGrade,
              filter_applied: true,
              collected_at: new Date().toISOString()
            }
          }));

          const videoSaveResult = await saveVideosBatch(videosForDB);
          
          if (videoSaveResult.success) {
            console.log(`   ✅ 필터링된 영상 저장 성공: ${videoSaveResult.data?.saved_count || videosForDB.length}개`);
          } else {
            console.error(`   ⚠️ 필터링된 영상 저장 실패: ${videoSaveResult.error}`);
          }

          const videoSaveTime = Date.now() - videoSaveStartTime;
          console.log(`💾 [DB 저장 완료] 필터링된 영상 저장 시간: ${videoSaveTime}ms`);
          
        } catch (error) {
          console.error(`❌ 필터링된 영상 DB 저장 중 오류:`, error.message);
        }
      } else {
        console.log(`💾 [DB 저장 생략] 저장할 필터링된 영상 없음`);
      }

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
    const summary = {
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

    console.log('\n🎯 === 트렌드 영상 수집 완료 ===');
    console.log(`📊 최종 결과:`);
    console.log(`   🔥 수집된 트렌드 키워드: ${this.stats.totalTrendsCollected}개`);
    console.log(`   🎨 정제된 키워드: ${this.stats.totalRefinedKeywords}개`);
    console.log(`   🎬 발견된 영상: ${this.stats.totalVideosFound}개`);
    console.log(`   🏆 고품질 영상: ${this.stats.totalQualityVideos}개`);
    console.log(`   ⏱️ 총 소요 시간: ${((Date.now() - this.startTime) / 1000).toFixed(1)}초`);
    console.log(`   💰 총 API 비용: ${summary.performance.apiCosts.total} units`);
    console.log(`   📈 영상 품질 점수: ${summary.quality.averageSubscribers.toLocaleString()}명 평균 구독자`);
    console.log(`   ✨ 수집 효율성: ${summary.performance.filteringEfficiency}`);

    // 📋 [DB 저장] 최종 성과 지표 및 자동화 작업 완료 기록
    this.saveFinalMetricsToDatabase(summary, trendsResult, refinedResult, searchResults, finalResult);

    return summary;
  }

  /**
   * 📋 [DB 저장] 최종 성과 지표 저장 메서드
   */
  async saveFinalMetricsToDatabase(summary, trendsResult, refinedResult, searchResults, finalResult) {
    console.log(`💾 [DB 저장] 최종 성과 지표 저장 시작...`);
    const dbSaveStartTime = Date.now();
    
    try {
      // 📋 [DB 저장 1] 자동화 작업 완료 기록
      console.log(`💾 [DB 저장 1/2] 자동화 작업 완료 기록 중...`);
      try {
        const jobResult = await logAutomatedJob({
          jobName: 'trend_video_collection',
          jobType: 'trend_collection', // ✅ DB enum 값 수정: 'scheduled_data_collection' → 'trend_collection'
          status: this.stats.totalQualityVideos > 0 ? 'completed' : 'partial_success',
          scheduledAt: new Date(this.startTime).toISOString(), // ✅ NOT NULL 제약 조건 해결
          totalDurationMs: Math.round(Date.now() - this.startTime), // ✅ Integer 타입 보장
          recordsProcessed: this.stats.totalVideosFound,
          recordsSuccessful: this.stats.totalQualityVideos,
          recordsFailed: this.stats.totalVideosFound - this.stats.totalQualityVideos,
          apiCostTotal: summary.performance.apiCosts.total,
          errorCount: 0, // TODO: 실제 에러 카운트 추가
          configData: {
            collection_config: this.config,
            target_keywords: this.stats.totalRefinedKeywords,
            quality_filter_applied: true
          },
          resultData: {
            final_summary: summary,
            collection_stats: this.stats,
            quality_metrics: {
              trend_collection_rate: this.stats.totalTrendsCollected > 0 ? 1.0 : 0.0,
              keyword_refinement_rate: this.stats.totalRefinedKeywords / Math.max(1, this.stats.totalTrendsCollected),
              video_discovery_rate: this.stats.totalVideosFound / Math.max(1, this.stats.totalRefinedKeywords),
              quality_filter_rate: this.stats.totalQualityVideos / Math.max(1, this.stats.totalVideosFound)
            }
          },
          startedAt: new Date(this.startTime).toISOString(),
          completedAt: new Date().toISOString()
        });

        if (jobResult.success) {
          console.log(`   ✅ 자동화 작업 완료 기록 성공: Job ID ${jobResult.data?.id || 'unknown'}`);
        } else {
          console.error(`   ⚠️ 자동화 작업 완료 기록 실패: ${jobResult.error}`);
        }
      } catch (dbError) {
        console.error(`   ❌ 자동화 작업 완료 기록 중 오류:`, dbError.message);
      }

      // 📋 [DB 저장 2] 전체 시스템 성능 지표 종합
      console.log(`💾 [DB 저장 2/2] 전체 시스템 성능 지표 종합 기록 중...`);
      try {
        const overallEfficiency = (this.stats.totalQualityVideos / Math.max(1, summary.performance.apiCosts.total)) * 100;
        const systemPerfResult = await logSystemPerformance({
          metricType: 'search_performance', // ✅ DB enum 값 수정: 'search_efficiency' → 'search_performance'
          searchResultsCount: this.stats.totalVideosFound,
          apiUnitsUsed: summary.performance.apiCosts.total,
          efficiencyVideosPer100units: Math.round(overallEfficiency),
          targetAchievementRate: parseFloat(summary.performance.filteringEfficiency.replace('%', '')) / 100,
          totalApiCalls: this.stats.totalRefinedKeywords + 1, // 검색 + 채널 정보
          successfulApiCalls: this.stats.totalRefinedKeywords + 1,
          apiSuccessRate: 1.0,
          averageResponseTimeMs: Math.round((Date.now() - this.startTime) / (this.stats.totalRefinedKeywords + 1)), // ✅ Integer 타입 보장
          quotaUsagePercentage: (summary.performance.apiCosts.total / 10000) * 100, // 일일 할당량 대비
          userSatisfactionScore: this.stats.totalQualityVideos > 20 ? 0.9 : 0.7, // 품질 영상 20개 이상이면 높은 만족도
          moduleName: 'trendVideoService',
          operationType: 'complete_trend_collection_workflow',
          measurementTimestamp: new Date().toISOString(),
          aggregationPeriod: 'realtime' // ✅ DB enum 값 올바르게 설정
        });

        if (systemPerfResult.success) {
          console.log(`   ✅ 전체 시스템 성능 지표 기록 성공`);
        } else {
          console.error(`   ⚠️ 전체 시스템 성능 지표 기록 실패: ${systemPerfResult.error}`);
        }
      } catch (dbError) {
        console.error(`   ❌ 전체 시스템 성능 지표 기록 중 오류:`, dbError.message);
      }

      const dbSaveTime = Date.now() - dbSaveStartTime;
      console.log(`💾 [DB 저장 완료] 최종 성과 지표 저장 시간: ${dbSaveTime}ms`);
      console.log(`🎉 === 트렌드 영상 수집 및 DB 저장 완전 완료! ===\n`);
      
    } catch (error) {
      console.error(`❌ 최종 성과 지표 DB 저장 중 전체 오류:`, error.message);
    }
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