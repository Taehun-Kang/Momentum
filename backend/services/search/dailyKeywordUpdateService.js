/**
 * 📅 매일 키워드 갱신 서비스 v2.0
 * 
 * 완전한 YouTube AI 서비스 통합 워크플로우
 * 
 * 워크플로우:
 * 1. DB에서 오늘 갱신할 키워드 조회
 * 2. YouTube Search Engine으로 검색 실행
 * 3. Video Complete Filter로 품질 필터링
 * 4. Pagination Handler로 페이지네이션 관리
 * 5. 기존 영상과 중복 제거
 * 6. Video Tagger로 영상 분류 및 태깅
 * 7. Channel Info Collector로 채널 정보 수집
 * 8. DB 저장 및 완료 리포트
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// YouTube AI 서비스 모듈들
import { searchYouTubeShorts } from '../../youtube-ai-services/search/modules/youtube-search-engine.js';
import { filterAndAnalyzeVideos } from '../../youtube-ai-services/search/modules/video-complete-filter.js';
import { shouldContinuePagination, mergeUniqueVideos } from '../../youtube-ai-services/search/modules/pagination-handler.js';
import { collectChannelInfo } from '../../youtube-ai-services/search/modules/channel-info-collector.js';
import { classifyVideoBatch } from '../../youtube-ai-services/llm/modules/video-tagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../../.env') });

class DailyKeywordUpdateService {
  constructor() {
    // YouTube API 키 확인
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!this.youtubeApiKey) {
      throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    this.stats = {
      startTime: null,
      totalKeywords: 0,
      processedKeywords: 0,
      totalVideosFound: 0,
      newVideosAdded: 0,
      duplicatesSkipped: 0,
      classificationErrors: 0,
      channelsToUpdate: new Set(),
      currentKeyword: null,
      apiUnitsUsed: 0,
      totalPages: 0
    };

    // 🔄 분류 실패 영상 추적
    this.failedClassifications = [];

    console.log('🎯 매일 키워드 갱신 서비스 v2.0 초기화 완료');
    console.log('✅ YouTube API 키 확인됨');
  }

  /**
   * 🎯 메인 실행 함수
   */
  async runDailyUpdate() {
    console.log('📅 매일 키워드 갱신 시작 (v2.0 - 완전 통합)');
    this.stats.startTime = Date.now();

    try {
      // 1. 오늘 갱신할 키워드 목록 조회
      const keywordsToUpdate = await this.getTodaysKeywords();
      this.stats.totalKeywords = keywordsToUpdate.length;
      
      console.log(`📋 오늘 갱신할 키워드: ${keywordsToUpdate.length}개`);

      // 2. 키워드별 영상 수집 및 처리
      for (const keywordData of keywordsToUpdate) {
        try {
          await this.processKeyword(keywordData);
        } catch (error) {
          console.error(`❌ 키워드 ${keywordData.keyword} 처리 실패:`, error.message);
        }
      }

      // 3. 채널 정보 수집 (마지막에 일괄 처리)
      await this.updateMissingChannelInfo();

      // 4. 완료 리포트
      this.generateCompletionReport();

    } catch (error) {
      console.error('❌ 매일 갱신 실패:', error);
      throw error;
    }
  }

  /**
   * 📋 오늘 갱신할 키워드 목록 조회
   */
  async getTodaysKeywords() {
    console.log('📋 오늘 갱신할 키워드 조회 중...');

    // TODO: DB 연동 (현재는 목업 데이터)
    /*
    const query = `
      SELECT keyword, category, min_view_count, min_engagement_rate, update_cycle
      FROM daily_keywords 
      WHERE 
        (last_updated IS NULL OR last_updated <= NOW() - INTERVAL update_cycle DAY)
        AND is_active = true
      ORDER BY priority DESC, last_updated ASC
      LIMIT 10;
    `;
    const result = await db.query(query);
    return result.rows;
    */

    // 임시 목업 데이터 (KEYWORDS.md 기반)
    const mockKeywords = [
      {
        id: 1,
        keyword: '먹방',
        category: '먹방 & 요리',
        min_view_count: 100000,
        min_engagement_rate: 2.0,
        update_cycle: 20,
        priority: 1
      },
      {
        id: 2,
        keyword: 'K-pop',
        category: '음악 & 엔터테인먼트',
        min_view_count: 200000,
        min_engagement_rate: 2.5,
        update_cycle: 10,
        priority: 2
      },
      {
        id: 3,
        keyword: '댄스챌린지',
        category: '음악 & 엔터테인먼트',
        min_view_count: 100000,
        min_engagement_rate: 3.0,
        update_cycle: 10,
        priority: 3
      }
    ];

    console.log(`✅ ${mockKeywords.length}개 키워드 조회 완료`);
    return mockKeywords;
  }

  /**
   * 🔍 키워드별 영상 처리 (완전 통합 워크플로우)
   */
  async processKeyword(keywordData) {
    this.stats.currentKeyword = keywordData.keyword;
    console.log(`\n🔍 키워드 처리 시작: "${keywordData.keyword}" (${keywordData.category})`);

    try {
      let allVideos = [];
      let pageToken = null;
      let page = 1;
      const targetCount = 40;

      // 1. 페이지네이션을 통한 영상 수집
      while (page <= 3) { // 최대 3페이지
        console.log(`   📄 ${page}페이지 검색 중...`);
        
        // 1-1. YouTube 검색
        const searchOptions = {
          maxResults: 50,
          pageToken: pageToken
        };
        
        const searchResult = await this.searchYouTubeVideos(keywordData.keyword, searchOptions);
        
        if (!searchResult.success || !searchResult.data.items?.length) {
          console.log(`   ⚠️ ${page}페이지에서 결과 없음 - 검색 종료`);
          break;
        }

        // 1-2. Video ID 추출
        const videoIds = searchResult.videoIds;
        console.log(`   📺 ${page}페이지 검색 결과: ${videoIds.length}개 영상`);

        // 1-3. Video Complete Filter로 품질 필터링
        const filterResult = await this.filterVideosWithCompleteFilter(
          videoIds, 
          searchResult.data.items, 
          keywordData
        );

        if (filterResult.success && filterResult.videos.length > 0) {
          allVideos = mergeUniqueVideos(allVideos, filterResult.videos);
          console.log(`   ✅ ${page}페이지: ${filterResult.videos.length}개 품질 영상 추가 (총 ${allVideos.length}개)`);
        }

        // 1-4. 페이지네이션 조건 확인
        const paginationCheck = shouldContinuePagination({
          videos: allVideos,
          pagesSearched: page,
          totalProcessed: this.stats.totalVideosFound + searchResult.data.items?.length || 0,
          hasNextPageToken: !!searchResult.nextPageToken
        }, { targetResults: targetCount, maxPages: 3 });

        // API 사용량 추가
        this.stats.apiUnitsUsed += 109; // search(100) + videos(9)
        this.stats.totalPages++;

        if (!paginationCheck.shouldContinue) {
          console.log(`   🛑 페이지네이션 중단: ${paginationCheck.reason}`);
          break;
        }

        pageToken = searchResult.nextPageToken;
        page++;

        // API 호출 간격 (1초 대기)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 2. 중복 영상 제거
      const newVideos = await this.removeDuplicateVideos(allVideos, keywordData.keyword);
      
      if (newVideos.length === 0) {
        console.log(`   💭 새로운 영상 없음 - 다음 키워드로 이동`);
        this.stats.processedKeywords++;
        return;
      }

      // 3. 영상 분류 및 태깅
      await this.classifyAndTagVideos(newVideos, keywordData);

      // 4. 통계 업데이트
      this.stats.processedKeywords++;
      this.stats.totalVideosFound += allVideos.length;
      this.stats.newVideosAdded += newVideos.length;

      console.log(`✅ 키워드 "${keywordData.keyword}" 처리 완료: ${newVideos.length}개 새 영상`);

    } catch (error) {
      console.error(`❌ 키워드 "${keywordData.keyword}" 처리 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 📺 YouTube 영상 검색 (YouTube Search Engine 사용)
   */
  async searchYouTubeVideos(keyword, options = {}) {
    console.log(`📺 YouTube 검색: "${keyword}"`);

    try {
      const searchResult = await searchYouTubeShorts(this.youtubeApiKey, keyword, options);
      
      if (searchResult.success) {
        console.log(`   📊 검색 성공: ${searchResult.data.items?.length || 0}개 영상`);
        return searchResult;
      } else {
        throw new Error(searchResult.error || 'YouTube 검색 실패');
      }

    } catch (error) {
      console.error(`❌ YouTube 검색 실패:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔽 Video Complete Filter를 사용한 고품질 필터링
   */
  async filterVideosWithCompleteFilter(videoIds, searchItems, keywordData) {
    console.log(`🔽 품질 필터링 시작: ${videoIds.length}개 영상`);

    try {
             const filterCriteria = {
         requireEmbeddable: true,
         requirePublic: true,
         minDuration: 10,
         maxDuration: 90,
         minViewCount: keywordData.min_view_count,
         minEngagementRate: keywordData.min_engagement_rate / 100, // 퍼센트를 소수점으로 변환 (2.5 → 0.025)
         sortBy: 'engagement',
         maxResults: 50
       };

      const filterResult = await filterAndAnalyzeVideos(videoIds, searchItems, filterCriteria);
      
      if (filterResult.success) {
        console.log(`   ✅ 필터링 완료: ${filterResult.videos.length}개 고품질 영상`);
        console.log(`   📊 품질 통계: 재생가능 ${filterResult.summary.playableVideos}개, 품질통과 ${filterResult.summary.qualityVideos}개`);
        return filterResult;
      } else {
        throw new Error('Video Complete Filter 실패');
      }

    } catch (error) {
      console.error(`❌ 품질 필터링 실패:`, error.message);
      return { success: false, videos: [], error: error.message };
    }
  }

  /**
   * 🔄 중복 영상 제거
   * 
   * ⚠️ 현재는 목업 로직 사용 (30% 랜덤 제거)
   * 실제 DB 연동 시 주석 처리된 쿼리로 교체 필요
   */
  async removeDuplicateVideos(videos, keyword) {
    console.log(`🔄 중복 영상 제거 중... (${keyword})`);

    // 🚀 실제 DB 연동 로직 (나중에 사용)
    // TODO: DB에서 기존 영상 ID 조회
    /*
    const query = `
      SELECT video_id FROM videos 
      WHERE search_keyword = $1 
        AND created_at > NOW() - INTERVAL '7 days'
    `;
    const existingVideos = await db.query(query, [keyword]);
    const existingVideoIds = new Set(existingVideos.rows.map(row => row.video_id));
    */

    // 🧪 임시 목업 로직: 랜덤하게 일부 영상을 중복으로 처리 (30% 확률)
    // 실제 일일 갱신에서 예상되는 중복률 (20-30%)과 유사하게 설정
    const existingVideoIds = new Set();
    videos.forEach((video) => {
      if (Math.random() < 0.3) { // 30% 확률로 중복 처리
        existingVideoIds.add(video.id);
      }
    });

    const newVideos = videos.filter(video => !existingVideoIds.has(video.id));
    this.stats.duplicatesSkipped += videos.length - newVideos.length;

    console.log(`   ✅ 중복 제거 완료: ${videos.length}개 → ${newVideos.length}개 (${videos.length - newVideos.length}개 중복 제거)`);
    return newVideos;
  }

  /**
   * 🏷️ 영상 분류 및 태깅 (Video Tagger 사용)
   */
  async classifyAndTagVideos(videos, keywordData) {
    console.log(`🏷️ 영상 분류 및 태깅: ${videos.length}개 영상`);

    try {
      // video-tagger용 데이터 변환
      const videosForTagging = videos.map(video => ({
        videoId: video.id,
        title: video.title,
        description: video.description,
        searchKeyword: keywordData.keyword,
        category: keywordData.category
      }));

      // 배치 분류 실행 (10개씩)
      const classificationResult = await classifyVideoBatch(videosForTagging, 10);

      if (classificationResult.success) {
        console.log(`   ✅ 분류 완료: ${classificationResult.successfulClassifications}/${classificationResult.totalProcessed}개 성공`);
        
        // 🔄 분류 실패 영상들 추적
        const failedVideos = classificationResult.results.filter(result => !result.success);
        for (const failedResult of failedVideos) {
          const originalVideo = videos.find(v => v.id === failedResult.videoId);
          if (originalVideo) {
            this.failedClassifications.push({
              videoId: failedResult.videoId,
              videoData: originalVideo,
              keywordData: keywordData,
              error: failedResult.error,
              attemptCount: 1,
              lastAttempt: new Date().toISOString(),
              fallbackTags: failedResult.fallbackTags
            });
          }
        }

        console.log(`   📊 분류 실패 영상 추가: ${failedVideos.length}개 (총 ${this.failedClassifications.length}개 대기)`);
        
        // TODO: 분류 결과를 영상 데이터에 추가하고 DB에 저장
        /*
        for (const result of classificationResult.results) {
          if (result.success) {
            const originalVideo = videos.find(v => v.id === result.videoId);
            const videoWithTags = {
              ...originalVideo,
              tags: result.tags,
              searchKeyword: keywordData.keyword,
              category: keywordData.category,
              classification_confidence: result.confidence,
              processed_at: new Date().toISOString()
            };
            
            await this.saveVideoToDB(videoWithTags);
          }
        }
        */

        // 채널 정보 수집 대상 추가
        videos.forEach(video => {
          if (video.channelId) {
            this.stats.channelsToUpdate.add(video.channelId);
          }
        });

        this.stats.classificationErrors += classificationResult.failedClassifications;
      } else {
        console.error(`   ❌ 분류 실패: ${videos.length}개 영상`);
        this.stats.classificationErrors += videos.length;
      }

    } catch (error) {
      console.error(`❌ 영상 분류 실패:`, error.message);
      this.stats.classificationErrors += videos.length;
    }
  }

  /**
   * 📺 채널 정보 수집 (Channel Info Collector 사용)
   */
  async updateMissingChannelInfo() {
    const channelIds = Array.from(this.stats.channelsToUpdate);
    
    if (channelIds.length === 0) {
      console.log('📺 업데이트할 채널 정보 없음');
      return;
    }

    console.log(`\n📺 채널 정보 수집: ${channelIds.length}개 채널`);

    try {
      const channelInfoResult = await collectChannelInfo(channelIds, {
        includeBranding: false, // 기본 정보만
        includeTopics: false,   // 주제 정보 제외
        language: 'ko'
      });

      if (channelInfoResult.success) {
        console.log(`✅ 채널 정보 수집 완료: ${channelInfoResult.channels.length}개 채널`);
        console.log(`📊 채널 통계: 평균 구독자 ${channelInfoResult.summary.averageSubscribers.toLocaleString()}명`);
        
        // API 사용량 추가
        this.stats.apiUnitsUsed += channelInfoResult.summary.apiCost;

        // TODO: 채널 정보 DB 저장
        /*
        for (const channelInfo of channelInfoResult.channels) {
          await this.saveChannelToDB(channelInfo);
        }
        */
      } else {
        console.error('❌ 채널 정보 수집 실패');
      }

    } catch (error) {
      console.error('❌ 채널 정보 수집 실패:', error.message);
    }
  }

  /**
   * 📊 완료 리포트 생성
   */
  generateCompletionReport() {
    const endTime = Date.now();
    const duration = endTime - this.stats.startTime;
    
    console.log('\n📊 =======매일 갱신 완료 리포트 v2.0=======');
    console.log(`⏱️  실행 시간: ${Math.round(duration / 1000)}초`);
    console.log(`📋 처리된 키워드: ${this.stats.processedKeywords}/${this.stats.totalKeywords}개`);
    console.log(`📄 검색된 페이지: ${this.stats.totalPages}개`);
    console.log(`📺 총 발견 영상: ${this.stats.totalVideosFound}개`);
    console.log(`✨ 새로 추가된 영상: ${this.stats.newVideosAdded}개`);
    console.log(`🔄 중복 제거된 영상: ${this.stats.duplicatesSkipped}개`);
    console.log(`❌ 분류 실패 영상: ${this.stats.classificationErrors}개`);
    console.log(`📺 업데이트된 채널: ${this.stats.channelsToUpdate.size}개`);
    console.log(`💰 사용된 API Units: ${this.stats.apiUnitsUsed}개`);
    console.log(`📈 성공률: ${((this.stats.newVideosAdded / Math.max(this.stats.totalVideosFound, 1)) * 100).toFixed(1)}%`);
    console.log(`🎯 효율성: ${(this.stats.newVideosAdded / Math.max(this.stats.apiUnitsUsed, 1) * 100).toFixed(2)} 영상/100units`);
    console.log('========================================\n');

    // TODO: 리포트를 DB에 저장하거나 슬랙 알림 등
    return {
      summary: {
        duration: Math.round(duration / 1000),
        processedKeywords: this.stats.processedKeywords,
        totalKeywords: this.stats.totalKeywords,
        newVideosAdded: this.stats.newVideosAdded,
        apiUnitsUsed: this.stats.apiUnitsUsed,
        successRate: ((this.stats.newVideosAdded / Math.max(this.stats.totalVideosFound, 1)) * 100).toFixed(1),
        efficiency: (this.stats.newVideosAdded / Math.max(this.stats.apiUnitsUsed, 1) * 100).toFixed(2)
      }
    };
  }

  /**
   * 📊 현재 진행 상황 조회
   */
  getProgress() {
    return {
      ...this.stats,
      currentProgress: this.stats.totalKeywords > 0 
        ? Math.round((this.stats.processedKeywords / this.stats.totalKeywords) * 100)
        : 0,
      elapsedTime: this.stats.startTime 
        ? Math.round((Date.now() - this.stats.startTime) / 1000)
        : 0,
      averageTimePerKeyword: this.stats.processedKeywords > 0
        ? Math.round((Date.now() - this.stats.startTime) / this.stats.processedKeywords / 1000)
        : 0,
      estimatedTimeRemaining: this.stats.processedKeywords > 0 && this.stats.totalKeywords > this.stats.processedKeywords
        ? Math.round(((Date.now() - this.stats.startTime) / this.stats.processedKeywords) * (this.stats.totalKeywords - this.stats.processedKeywords) / 1000)
        : 0
    };
  }

  /**
   * 🔄 분류 실패 영상 재분류 (신규 기능)
   */
  async retryFailedClassifications(maxRetries = 3) {
    if (this.failedClassifications.length === 0) {
      console.log('🔄 재분류할 실패 영상이 없습니다');
      return {
        success: true,
        processed: 0,
        successful: 0,
        failed: 0,
        message: '재분류할 영상이 없습니다'
      };
    }

    console.log(`🔄 분류 실패 영상 재분류 시작: ${this.failedClassifications.length}개 영상`);

    // 재시도 횟수가 maxRetries 미만인 영상들만 필터링
    const retryableVideos = this.failedClassifications.filter(item => 
      item.attemptCount < maxRetries
    );

    if (retryableVideos.length === 0) {
      console.log(`🔄 재시도 가능한 영상이 없습니다 (모든 영상이 ${maxRetries}회 이상 시도됨)`);
      return {
        success: true,
        processed: 0,
        successful: 0,
        failed: this.failedClassifications.length,
        message: '재시도 가능한 영상이 없습니다'
      };
    }

    console.log(`🔄 재시도 대상: ${retryableVideos.length}개 영상`);

    let successful = 0;
    let failed = 0;

    // 배치 단위로 재분류 (5개씩)
    const batchSize = 5;
    for (let i = 0; i < retryableVideos.length; i += batchSize) {
      const batch = retryableVideos.slice(i, i + batchSize);
      
      console.log(`   📦 재분류 배치 ${Math.floor(i/batchSize) + 1}: ${batch.length}개 영상`);

      // video-tagger용 데이터 변환
      const videosForTagging = batch.map(item => ({
        videoId: item.videoId,
        title: item.videoData.title,
        description: item.videoData.description,
        searchKeyword: item.keywordData.keyword,
        category: item.keywordData.category
      }));

      try {
        const classificationResult = await classifyVideoBatch(videosForTagging, batchSize);

        // 결과 처리
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const result = classificationResult.results[j];

          // 시도 횟수 증가
          item.attemptCount++;
          item.lastAttempt = new Date().toISOString();

          if (result && result.success) {
            // 성공 시 실패 목록에서 제거
            const index = this.failedClassifications.findIndex(f => f.videoId === item.videoId);
            if (index !== -1) {
              this.failedClassifications.splice(index, 1);
            }
            successful++;
            
            console.log(`     ✅ ${item.videoId} 재분류 성공`);

            // TODO: DB에 성공한 분류 결과 저장
            /*
            const videoWithTags = {
              ...item.videoData,
              tags: result.tags,
              searchKeyword: item.keywordData.keyword,
              category: item.keywordData.category,
              classification_confidence: result.confidence,
              processed_at: new Date().toISOString()
            };
            await this.saveVideoToDB(videoWithTags);
            */

          } else {
            // 실패 시 에러 정보 업데이트
            item.error = result ? result.error : '알 수 없는 오류';
            failed++;
            
            console.log(`     ❌ ${item.videoId} 재분류 실패: ${item.error} (${item.attemptCount}/${maxRetries})`);
          }
        }

        // 배치 간 대기
        if (i + batchSize < retryableVideos.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`   ❌ 배치 ${Math.floor(i/batchSize) + 1} 재분류 실패:`, error.message);
        
        // 배치 전체 실패 처리
        batch.forEach(item => {
          item.attemptCount++;
          item.lastAttempt = new Date().toISOString();
          item.error = error.message;
        });
        failed += batch.length;
      }
    }

    console.log(`✅ 재분류 완료: 성공 ${successful}개, 실패 ${failed}개`);

    return {
      success: true,
      processed: retryableVideos.length,
      successful,
      failed,
      remaining: this.failedClassifications.length,
      message: `재분류 완료: ${successful}개 성공, ${failed}개 실패`
    };
  }

  /**
   * 📋 분류 실패 영상 목록 조회
   */
  getFailedClassificationVideos(limit = 50) {
    const videos = this.failedClassifications
      .slice(0, limit)
      .map(item => ({
        videoId: item.videoId,
        title: item.videoData.title,
        channelTitle: item.videoData.channelTitle,
        searchKeyword: item.keywordData.keyword,
        category: item.keywordData.category,
        attemptCount: item.attemptCount,
        lastAttempt: item.lastAttempt,
        error: item.error,
        fallbackTags: item.fallbackTags
      }));

    return {
      success: true,
      total: this.failedClassifications.length,
      returned: videos.length,
      videos
    };
  }

  /**
   * 🎯 특정 영상들만 재분류
   */
  async reprocessSpecificVideos(videoIds) {
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return {
        success: false,
        error: 'videoIds 배열이 필요합니다'
      };
    }

    console.log(`🎯 특정 영상 재분류: ${videoIds.length}개`);

    const targetVideos = this.failedClassifications.filter(item => 
      videoIds.includes(item.videoId)
    );

    if (targetVideos.length === 0) {
      return {
        success: false,
        error: '해당 영상들이 실패 목록에 없습니다'
      };
    }

    console.log(`🎯 재분류 대상 발견: ${targetVideos.length}개`);

    // video-tagger용 데이터 변환
    const videosForTagging = targetVideos.map(item => ({
      videoId: item.videoId,
      title: item.videoData.title,
      description: item.videoData.description,
      searchKeyword: item.keywordData.keyword,
      category: item.keywordData.category
    }));

    try {
      const classificationResult = await classifyVideoBatch(videosForTagging, 10);

      let successful = 0;
      let failed = 0;

      // 결과 처리
      for (let i = 0; i < targetVideos.length; i++) {
        const item = targetVideos[i];
        const result = classificationResult.results[i];

        item.attemptCount++;
        item.lastAttempt = new Date().toISOString();

        if (result && result.success) {
          // 성공 시 실패 목록에서 제거
          const index = this.failedClassifications.findIndex(f => f.videoId === item.videoId);
          if (index !== -1) {
            this.failedClassifications.splice(index, 1);
          }
          successful++;
        } else {
          item.error = result ? result.error : '알 수 없는 오류';
          failed++;
        }
      }

      return {
        success: true,
        processed: targetVideos.length,
        successful,
        failed,
        message: `특정 영상 재분류 완료: ${successful}개 성공, ${failed}개 실패`
      };

    } catch (error) {
      console.error('❌ 특정 영상 재분류 실패:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🧹 분류 실패 목록 정리
   */
  cleanupFailedClassifications(maxAge = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const before = this.failedClassifications.length;
    
    this.failedClassifications = this.failedClassifications.filter(item => {
      const itemDate = new Date(item.lastAttempt);
      return itemDate > cutoffDate;
    });

    const removed = before - this.failedClassifications.length;
    
    if (removed > 0) {
      console.log(`🧹 ${maxAge}일 이상 된 실패 영상 ${removed}개 정리됨`);
    }

    return {
      success: true,
      removed,
      remaining: this.failedClassifications.length,
      message: `${removed}개 영상 정리됨`
    };
  }

  // TODO: DB 저장 메서드들 (구현 필요)
  /*
  async saveVideoToDB(videoData) {
    const query = `
      INSERT INTO videos (
        video_id, title, description, channel_id, channel_title,
        published_at, view_count, like_count, comment_count, duration,
        thumbnail_url, search_keyword, category, tags, classification_confidence,
        quality_grade, engagement_rate, is_playable, processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (video_id) DO UPDATE SET
        view_count = EXCLUDED.view_count,
        like_count = EXCLUDED.like_count,
        comment_count = EXCLUDED.comment_count,
        engagement_rate = EXCLUDED.engagement_rate,
        updated_at = NOW()
    `;
    
    await db.query(query, [
      videoData.id, videoData.title, videoData.description,
      videoData.channelId, videoData.channelTitle, videoData.publishedAt,
      videoData.viewCount, videoData.likeCount, videoData.commentCount,
      videoData.duration, videoData.thumbnail, videoData.searchKeyword,
      videoData.category, JSON.stringify(videoData.tags), videoData.classification_confidence,
      videoData.qualityGrade, videoData.engagement, videoData.isPlayable, videoData.processed_at
    ]);
  }

  async saveChannelToDB(channelData) {
    const query = `
      INSERT INTO channels (
        channel_id, channel_title, subscriber_count, video_count,
        description, channel_icon, quality_grade, collected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (channel_id) DO UPDATE SET
        subscriber_count = EXCLUDED.subscriber_count,
        video_count = EXCLUDED.video_count,
        channel_icon = EXCLUDED.channel_icon,
        quality_grade = EXCLUDED.quality_grade,
        updated_at = NOW()
    `;
    
    await db.query(query, [
      channelData.channelId, channelData.channelTitle, channelData.subscriberCount,
      channelData.videoCount, channelData.channelDescription, channelData.channelIcon,
      channelData.qualityGrade, channelData.collectedAt
    ]);
  }
  */
}

// 전역 인스턴스
const dailyKeywordUpdateService = new DailyKeywordUpdateService();

/**
 * 🎯 주요 함수들
 */

// 매일 갱신 실행
export async function runDailyKeywordUpdate() {
  return await dailyKeywordUpdateService.runDailyUpdate();
}

// 진행 상황 조회
export function getDailyUpdateProgress() {
  return dailyKeywordUpdateService.getProgress();
}

// 특정 키워드만 처리 (테스트용)
export async function processSingleKeyword(keywordData) {
  return await dailyKeywordUpdateService.processKeyword(keywordData);
}

// 서비스 통계 조회
export function getDailyUpdateServiceStats() {
  return dailyKeywordUpdateService.stats;
}

// 🔄 분류 실패 영상 재분류 (신규)
export async function retryFailedClassifications(maxRetries = 3) {
  return await dailyKeywordUpdateService.retryFailedClassifications(maxRetries);
}

// 📋 분류 실패 영상 목록 조회 (신규)
export function getFailedClassificationVideos(limit = 50) {
  return dailyKeywordUpdateService.getFailedClassificationVideos(limit);
}

// 🎯 특정 영상들만 재분류 (신규)
export async function reprocessSpecificVideos(videoIds) {
  return await dailyKeywordUpdateService.reprocessSpecificVideos(videoIds);
}

// 🧹 분류 실패 목록 정리 (신규)
export function cleanupFailedClassifications(maxAge = 7) {
  return dailyKeywordUpdateService.cleanupFailedClassifications(maxAge);
}

export default dailyKeywordUpdateService;

/**
 * 🎯 사용 예시 (v2.0 완전 통합)
 * 
 * // 1. 매일 갱신 실행 (크론잡에서 사용)
 * const result = await runDailyKeywordUpdate();
 * console.log(`성공률: ${result.summary.successRate}%`);
 * 
 * // 2. 진행 상황 확인 (API에서 사용)
 * const progress = getDailyUpdateProgress();
 * console.log(`진행률: ${progress.currentProgress}% (예상 남은 시간: ${progress.estimatedTimeRemaining}초)`);
 * 
 * // 3. 단일 키워드 테스트
 * const testKeyword = {
 *   keyword: '먹방',
 *   category: '먹방 & 요리',
 *   min_view_count: 100000,
 *   min_engagement_rate: 2.0
 * };
 * await processSingleKeyword(testKeyword);
 * 
 * // 4. 실시간 모니터링
 * setInterval(() => {
 *   const progress = getDailyUpdateProgress();
 *   console.log(`현재 처리 중: ${progress.currentKeyword} (${progress.currentProgress}%)`);
 * }, 5000);
 */ 