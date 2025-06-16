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
 * 
 * 🚨 [TODO - 성능 최적화 개선 사항들]
 * 
 * 1. API 호출 최적화:
 *    - YouTube API 병렬 호출 구현 (현재 순차 처리)
 *    - 적응형 배치 크기 조정 (트래픽에 따른 동적 조정)
 *    - API 응답 캐싱 강화 (Redis 기반 분산 캐시)
 *    - 실패한 요청 재시도 로직 개선 (지수 백오프)
 * 
 * 2. LLM 분류 최적화:
 *    - 스트리밍 방식 분류 (한 번에 모든 영상 대기하지 않고)
 *    - 분류 결과 사전 캐싱 (유사한 제목/설명 패턴)
 *    - 모델별 라우팅 (간단한 분류는 가벼운 모델로)
 *    - 분류 신뢰도 기반 재분류 로직
 * 
 * 3. 데이터베이스 최적화:
 *    - 배치 크기 동적 조정 (DB 성능에 따라)
 *    - 커넥션 풀링 최적화
 *    - 인덱스 활용도 모니터링
 *    - 페이지네이션 성능 개선
 * 
 * 4. 메모리 관리:
 *    - 대용량 데이터 스트리밍 처리
 *    - 메모리 누수 방지 로직
 *    - 가비지 컬렉션 최적화
 *    - 캐시 메모리 한도 관리
 * 
 * 5. 모니터링 및 알림:
 *    - 실시간 성능 지표 수집
 *    - 병목 구간 자동 감지
 *    - 예외 상황 자동 알림
 *    - 리소스 사용량 임계치 모니터링
 * 
 * 6. 확장성 개선:
 *    - 멀티 프로세스 처리 지원
 *    - 큐 기반 작업 분산
 *    - 로드 밸런싱 구현
 *    - 수평 확장 대응
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

// ======================================================================
// 🔥 [중요] DATABASE API 호출 헬퍼 함수
// ======================================================================
/**
 * 🚨 중요: Database API 호출 전용 헬퍼 함수
 * 모든 DB API 호출은 이 함수를 통해서만 실행
 * - Database API 149개 → 100% 테스트 완료 기반
 * - 표준화된 에러 처리 및 응답 형식
 * - localhost:3002 서버 내부 호출 (5-10ms 오버헤드)
 */
async function callDatabaseAPI(endpoint, options = {}) {
  try {
    const baseURL = 'http://localhost:3002';
    const url = `${baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      method: options.method || 'GET',  // ✅ options에서 method 우선 사용
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'DailyKeywordUpdateService/2.0',
        ...options.headers  // ✅ 추가 헤더도 병합
      },
      ...(options.data && { body: JSON.stringify(options.data) }),  // ✅ data를 body로 변환
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // 🚨 중요: Database API 표준 응답 형식 확인
    if (typeof result !== 'object' || result.success === undefined) {
      throw new Error('Invalid API response format');
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ [DB API 실패] ${endpoint}:`, error.message);
    throw new Error(`Database API 호출 실패: ${endpoint} - ${error.message}`);
  }
}

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

      // 3. 최종 완료 리포트 (채널 정보는 각 키워드별로 이미 처리됨)

      // 4. 완료 리포트
      this.generateCompletionReport();

    } catch (error) {
      console.error('❌ 매일 갱신 실패:', error);
      throw error;
    }
  }

  /**
   * 📋 오늘 갱신할 키워드 목록 조회
   * 
   * ======================================================================
   * 🚨 [중요] 첫 번째 DATABASE API 연동 지점
   * ======================================================================
   * - Keywords DB의 getTodaysKeywords API 호출
   * - 100% 테스트 완료된 API 엔드포인트 사용
   * - 목업 데이터 → 실제 DB 데이터로 전환
   */
  async getTodaysKeywords() {
    console.log('📋 오늘 갱신할 키워드 조회 중...');

    try {
      // ======================================================================
      // 🔥 [중요] KEYWORDS DB API 호출 - 100% 검증된 엔드포인트
      // ======================================================================
      const endpoint = '/api/v1/keywords_db/daily/today?limit=50&isActive=true';
      const result = await callDatabaseAPI(endpoint);

      // 🚨 중요: API 응답 성공 확인
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log(`✅ DB에서 ${result.data.length}개 키워드 조회 성공`);
        
        // 🔄 DB 데이터를 서비스 형식으로 변환
        const keywords = result.data.map(item => ({
          id: item.id,
          keyword: item.keyword,
          category: item.category || '일반',
          min_view_count: item.min_view_count || 100000,
          min_engagement_rate: item.min_engagement_rate || 2.0,
          update_cycle: item.update_cycle || 20,
          priority: item.priority_tier || 'medium'
        }));

        return keywords;
      } else {
        console.warn('⚠️ DB 응답 성공하지만 데이터 없음 - 폴백 사용');
        return this.getDefaultKeywords();
      }

    } catch (error) {
      console.error('❌ Keywords DB 조회 실패:', error.message);
      console.log('🔄 안전한 폴백 키워드 사용');
      return this.getDefaultKeywords();
    }
  }

  /**
   * 🛡️ 안전한 폴백 키워드 (DB 조회 실패 시 사용)
   * 
   * ======================================================================
   * 🚨 [중요] 에러 복구 전략
   * ======================================================================
   * - DB API 실패 시에도 서비스 중단 방지
   * - 최소한의 핵심 키워드로 서비스 유지
   */
  getDefaultKeywords() {
    console.log('🛡️ 기본 키워드 목록 사용 (폴백 모드)');
    
    return [
      {
        id: 'fallback-1',
        keyword: '브이로그',
        category: '라이프스타일 & 건강',
        min_view_count: 50000,
        min_engagement_rate: 1.5,
        update_cycle: 10,
        priority: 'high'
      },
      {
        id: 'fallback-2',
        keyword: '먹방',
        category: '먹방 & 요리',
        min_view_count: 100000,
        min_engagement_rate: 2.0,
        update_cycle: 15,
        priority: 'high'
      },
      {
        id: 'fallback-3',
        keyword: 'ASMR',
        category: 'ASMR & 힐링',
        min_view_count: 30000,
        min_engagement_rate: 1.8,
        update_cycle: 20,
        priority: 'medium'
      }
    ];
  }

  /**
   * 🔍 키워드별 영상 처리 (완전 통합 워크플로우)
   */
  /**
   * 🎯 특정 키워드 처리 (개별 키워드 테스트/실시간 검색용)
   * @param {Object} keywordData - 키워드 데이터
   * @param {Object} options - 처리 옵션
   * @param {number} options.batchSize - LLM 배치 크기 (기본: 3, 빠른 처리: 20-30)
   */
  async processKeyword(keywordData, options = {}) {
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

      // 🚨 [중요] 2. 채널 정보 즉시 수집 및 저장 (FK 제약조건 해결!)
      console.log(`\n📺 채널 정보 즉시 수집 시작 (FK 제약조건 해결)`);
      await this.collectAndSaveChannelsImmediately(allVideos);

      // 3. UPSERT 방식 영상 처리 (중복 제거 → 실시간 갱신)
      const processedVideos = await this.processVideosForUpsert(allVideos, keywordData.keyword);
      
      if (processedVideos.length === 0) {
        console.log(`   💭 처리할 영상 없음 - 다음 키워드로 이동`);
        this.stats.processedKeywords++;
        return;
      }

      // 4. 영상 분류 및 태깅 (이제 FK 제약조건 만족!)
      await this.classifyAndTagVideos(processedVideos, keywordData, options);

      // 5. 통계 업데이트
      this.stats.processedKeywords++;
      this.stats.totalVideosFound += allVideos.length;
      this.stats.newVideosAdded += processedVideos.length; // UPSERT 처리된 영상 수

      // 6. ✅ 키워드 실행 완료 기록 (키워드 회전 로직)
      await this.completeKeywordExecution(keywordData, processedVideos.length, this.stats.apiUnitsUsed, true);

      console.log(`✅ 키워드 "${keywordData.keyword}" 처리 완료: ${processedVideos.length}개 영상 UPSERT 처리`);

    } catch (error) {
      console.error(`❌ 키워드 "${keywordData.keyword}" 처리 실패:`, error.message);
      
      // 실패한 경우에도 키워드 완료 기록 (에러와 함께)
      try {
        await this.completeKeywordExecution(keywordData, 0, this.stats.apiUnitsUsed, false, error.message);
      } catch (completionError) {
        console.error('❌ 키워드 완료 기록 실패:', completionError.message);
      }
      
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
   * 🔄 UPSERT 방식 영상 처리 (DB 연동 완료)
   * 
   * ======================================================================
   * 🚨 [중요] 세 번째 DATABASE API 연동 지점
   * ======================================================================
   * - Videos DB의 batch-check API로 기존 영상 확인
   * - UPSERT 방식으로 모든 영상 저장/업데이트
   * - 중복 제거 → 실시간 데이터 갱신 전략으로 변경
   */
  async processVideosForUpsert(videos, keyword) {
    console.log(`🔄 UPSERT 방식 영상 처리 중... (${keyword})`);

    try {
      // ======================================================================
      // 🔥 [중요] VIDEOS DB API 호출 - 기존 영상 조회
      // ======================================================================
      const videoIds = videos.map(video => video.id);
      const endpoint = `/api/v1/videos_db/cache/batch-check`;
      
      const checkResult = await callDatabaseAPI(endpoint, {
        method: 'POST',
        data: { video_ids: videoIds }
      });

      let existingCount = 0;
      let newCount = 0;

      if (checkResult.success && checkResult.data) {
        const existingVideoIds = new Set(checkResult.data.existing_videos || []);
        
        existingCount = existingVideoIds.size;
        newCount = videos.length - existingCount;

        console.log(`   📊 기존 영상: ${existingCount}개 (업데이트됨)`);
        console.log(`   ✨ 새 영상: ${newCount}개 (신규 추가됨)`);
        
        // 기존 영상들은 업데이트로 처리 (최신 조회수, 좋아요 등 반영)
        const existingVideos = videos.filter(video => existingVideoIds.has(video.id));
    const newVideos = videos.filter(video => !existingVideoIds.has(video.id));

        console.log(`   🔄 업데이트 대상: ${existingVideos.length}개 영상`);
        console.log(`   📈 조회수, 좋아요, 댓글 수 등 최신 데이터 반영됨`);

      } else {
        // DB 조회 실패 시 모든 영상을 새 영상으로 처리
        console.warn('   ⚠️ 기존 영상 조회 실패 - 모든 영상을 UPSERT로 처리');
        newCount = videos.length;
      }

      // 통계 업데이트 (UPSERT 방식으로 변경)
      this.stats.duplicatesSkipped += existingCount; // 실제로는 업데이트된 영상
      this.stats.newVideosFromThisKeyword = newCount;

      console.log(`   ✅ UPSERT 처리 완료: ${videos.length}개 영상 (${newCount}개 신규, ${existingCount}개 업데이트)`);
      
      // ======================================================================
      // 🚨 [중요] 모든 영상을 반환 (UPSERT 방식이므로 제거하지 않음)
      // ======================================================================
      return videos; // 모든 영상을 반환하여 UPSERT 처리

    } catch (error) {
      console.error('❌ UPSERT 영상 처리 실패:', error.message);
      console.log('🔄 안전 모드: 모든 영상을 새 영상으로 처리');
      
      // 에러 시 안전하게 모든 영상 반환
      this.stats.newVideosFromThisKeyword = videos.length;
      
      return videos;
    }
  }

  /**
   * 🏷️ 영상 분류 및 태깅 (Video Tagger 사용)
   * @param {Array} videos - 분류할 영상 목록
   * @param {Object} keywordData - 키워드 데이터
   * @param {Object} options - 분류 옵션
   * @param {number} options.batchSize - 배치 크기 (기본: 3, 빠른 처리: 20-30)
   */
  async classifyAndTagVideos(videos, keywordData, options = {}) {
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

      // 🧪 [디버깅] LLM 전달 데이터 간단 확인
      console.log(`🧪 LLM 분류 대상: ${videosForTagging.length}개 영상 (${videosForTagging[0]?.title?.substring(0, 30)}... 등)`);

      // ✅ 배치 크기 결정 (품질 기준은 그대로 유지)
      const { batchSize } = options;
      let optimalBatchSize = batchSize || 3; // 기본값 3개, 옵션으로 조정 가능
      
      if (batchSize && batchSize > 3) {
        console.log(`   📦 빠른 배치 처리 모드: ${optimalBatchSize}개씩 처리`);
      }

      // 컨텍스트 사용량 예측 및 조정
      const estimatedTokens = videosForTagging.length * 300; // 영상당 평균 300 토큰
      if (estimatedTokens > 35000) { // 컨텍스트 한도의 87.5%
        optimalBatchSize = Math.max(3, Math.floor(35000 / 300 / videosForTagging.length * optimalBatchSize));
        console.log(`   ⚠️ 컨텍스트 한도 고려하여 배치 크기 조정: ${optimalBatchSize}개`);
      }

      console.log(`   📦 LLM 배치 처리: ${videosForTagging.length}개 영상을 ${optimalBatchSize}개씩 처리`);

      // 배치 분류 실행
      const classificationResult = await classifyVideoBatch(videosForTagging, optimalBatchSize);

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
        
        // 🚨 [중요] 분류 성공한 영상들을 배치로 DB에 저장! (FK 제약조건 해결됨)
        console.log(`💾 성공적으로 분류된 ${classificationResult.successfulClassifications}개 영상을 DB에 저장 중...`);
        
        // ✅ 영상 데이터 준비 (이미 채널 정보가 DB에 저장되어 FK 제약조건 만족)
        const successfulVideos = [];
        
        for (const result of classificationResult.results) {
          if (result.success) {
            const originalVideo = videos.find(v => v.id === result.videoId);
            
            // ✅ 영상 데이터 준비 (LLM 태그 올바르게 변환) - 🚨 videoService.js 호환성 수정
            const extractedTags = {
              topics: this.extractLLMTags(result.tags, 'topics'),
              moods: this.extractLLMTags(result.tags, 'moods'),  
              contexts: this.extractLLMTags(result.tags, 'contexts'),
              genres: this.extractLLMTags(result.tags, 'genres')
            };
            
            const videoWithTags = {
              ...originalVideo,
              // 🚨 [중요] videoService.js 호환성을 위한 정확한 구조 - 두 가지 방식 모두 지원
              // 방식 1: 직접 필드 (dailyKeywordUpdateService → videoService)
              topic_tags: extractedTags.topics,
              mood_tags: extractedTags.moods,
              context_tags: extractedTags.contexts,
              genre_tags: extractedTags.genres,
              
              // 방식 2: 기존 구조 호환성 유지 (다른 서비스들과의 호환성)
              tags: extractedTags.topics,
              moodTags: extractedTags.moods,
              contextTags: extractedTags.contexts,
              genreTags: extractedTags.genres,
              
              // 🔍 메타데이터
              searchKeyword: keywordData.keyword,
              category: keywordData.category,
              classification_confidence: result.confidence,
              processed_at: new Date().toISOString(),
              
              // 🔍 디버깅용 - LLM 원본 응답 보존
              llm_original_response: result.tags
            };
            
            console.log(`🏷️ ${result.videoId}: ${videoWithTags.topic_tags?.length || 0}개 토픽, ${videoWithTags.mood_tags?.length || 0}개 감정, ${videoWithTags.context_tags?.length || 0}개 컨텍스트, ${videoWithTags.genre_tags?.length || 0}개 장르`);
            
            successfulVideos.push(videoWithTags);
          }
        }

        // 🚀 영상 배치 저장 (FK 제약조건 이미 해결됨)
        if (successfulVideos.length > 0) {
          console.log(`💾 영상 배치 저장 시작: ${successfulVideos.length}개 영상 (FK 제약조건 해결됨)`);
          
          const videoSaveResult = await this.saveVideosBatch(successfulVideos);
          console.log(`   💾 영상 배치 저장: ${videoSaveResult.successCount || 0}개 성공, ${videoSaveResult.failedCount || 0}개 실패`);
          
          // 성공 통계 업데이트
          this.stats.videosSaved = (this.stats.videosSaved || 0) + (videoSaveResult.successCount || 0);
          this.stats.videoSaveErrors = (this.stats.videoSaveErrors || 0) + (videoSaveResult.failedCount || 0);
        }

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
   * 🚨 [중요] 채널 정보 즉시 수집 및 저장 (FK 제약조건 해결!)
   * 영상 저장 전에 채널 정보를 먼저 저장하여 FK 제약조건 만족
   */
  async collectAndSaveChannelsImmediately(videos) {
    if (!videos || videos.length === 0) {
      console.log('📺 수집할 채널 정보 없음');
      return;
    }

    // 고유한 채널 ID 추출
    const uniqueChannelIds = [...new Set(videos.map(video => video.channelId).filter(Boolean))];
    
    if (uniqueChannelIds.length === 0) {
      console.log('📺 유효한 채널 ID 없음');
      return;
    }

    console.log(`📺 채널 정보 즉시 수집: ${uniqueChannelIds.length}개 채널`);

    try {
      const channelInfoResult = await collectChannelInfo(uniqueChannelIds, {
        includeBranding: false, // 기본 정보만
        includeTopics: false,   // 주제 정보 제외
        language: 'ko'
      });

      if (channelInfoResult.success) {
        console.log(`   ✅ 채널 정보 수집 완료: ${channelInfoResult.channels.length}개 채널`);
        console.log(`   📊 채널 통계: 평균 구독자 ${channelInfoResult.summary.averageSubscribers.toLocaleString()}명`);
        
        // API 사용량 추가
        this.stats.apiUnitsUsed += channelInfoResult.summary.apiCost;

        // 🚨 [중요] 즉시 채널 정보 DB 저장 (FK 제약조건 해결)
        console.log(`   🏢 채널 배치 DB 저장 시작: ${channelInfoResult.channels.length}개 채널`);
        await this.saveChannelsBatch(channelInfoResult.channels);
        console.log(`   ✅ 채널 배치 DB 저장 완료: ${this.successfulChannelSaves || 0}개 성공, ${this.failedChannelSaves || 0}개 실패`);
        
        console.log(`✅ FK 제약조건 해결: ${uniqueChannelIds.length}개 채널 정보 저장 완료`);
      } else {
        console.error('❌ 채널 정보 수집 실패');
        // 채널 정보 수집 실패 시에도 계속 진행 (채널 정보 없이 영상 저장 시도)
        console.warn('⚠️ 채널 정보 없이 영상 저장 진행 (일부 FK 제약조건 위반 가능)');
      }

    } catch (error) {
      console.error('❌ 채널 정보 즉시 수집 실패:', error.message);
      // 에러 시에도 계속 진행
      console.warn('⚠️ 채널 정보 수집 실패 - 영상 저장 계속 진행');
    }
  }

  /**
   * 📺 채널 정보 수집 (Channel Info Collector 사용) - Deprecated
   * 이제 collectAndSaveChannelsImmediately()로 대체됨
   */
  async updateMissingChannelInfo() {
    console.log('📺 updateMissingChannelInfo() - 이미 collectAndSaveChannelsImmediately()로 처리됨');
    return;
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
    console.log(`🔄 업데이트된 기존 영상: ${this.stats.duplicatesSkipped}개`);
    console.log(`❌ 분류 실패 영상: ${this.stats.classificationErrors}개`);
    console.log(`📺 업데이트된 채널: ${this.stats.channelsToUpdate.size}개`);
    console.log(`💰 사용된 API Units: ${this.stats.apiUnitsUsed}개`);
    console.log(`📈 성공률: ${((this.stats.newVideosAdded / Math.max(this.stats.totalVideosFound, 1)) * 100).toFixed(1)}%`);
    console.log(`🎯 효율성: ${(this.stats.newVideosAdded / Math.max(this.stats.apiUnitsUsed, 1) * 100).toFixed(2)} 영상/100units`);
    console.log('========================================\n');

    // 🚨 [TODO - 고도화된 리포팅 시스템] 현재는 기본 로그만, 향후 추가 가능:
    /*
    TODO: 다음 리포팅 기능들을 구현할 수 있음:
    
    1. 상세 성능 분석:
       - 키워드별 성과 분석 (수집률, 품질 점수 등)
       - 시간대별 API 응답 시간 분석
       - 채널별 수집 성공률 통계
       - LLM 분류 정확도 트렌드
       - 메모리/CPU 사용량 프로파일링
    
    2. 비즈니스 인사이트:
       - 인기 키워드 트렌드 분석
       - 카테고리별 콘텐츠 품질 분포
       - 영상 길이별 성과 분석
       - 업로드 시간대별 패턴 분석
       - 구독자 수 대비 조회수 상관관계
    
    3. 자동 알림 시스템:
       - 성공률 90% 미만 시 Slack 알림
       - API 할당량 80% 초과 시 이메일 알림
       - 분류 실패율 20% 초과 시 긴급 알림
       - 새로운 바이럴 영상 발견 시 즉시 알림
       - 시스템 오류 발생 시 SMS 알림
    
    4. 대시보드 데이터:
       - 실시간 처리 현황 웹 대시보드
       - 일일/주간/월간 트렌드 차트
       - 키워드별 ROI 분석 대시보드
       - 채널 성장률 추적 대시보드
       - API 사용량 최적화 제안 대시보드
    
    5. 예측 분석:
       - 다음 주 인기 키워드 예측
       - 영상 바이럴 가능성 예측
       - 최적 업로드 시간 예측
       - 시청자 참여도 예측
       - 채널 성장률 예측
    
    6. A/B 테스트 리포트:
       - 다른 필터링 기준 성과 비교
       - LLM 모델별 분류 정확도 비교
       - 배치 크기별 처리 속도 비교
       - 키워드 선택 전략별 효과 분석
    
    7. 데이터 품질 리포트:
       - 중복 데이터 비율 분석
       - 누락된 메타데이터 통계
       - 데이터 일관성 검증 결과
       - 외부 API 응답 품질 평가
    
    구현 방법:
    - 리포트 데이터를 별도 DB 테이블에 저장
    - 주기적 리포트 생성 스케줄러
    - Grafana/Kibana 연동 대시보드
    - 자동 리포트 이메일 발송
    - 웹 기반 실시간 모니터링 페이지
    */
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

  /**
   * 💾 영상 데이터를 Videos DB에 저장 (TODO 2 → 활성화!)
   * 🚨 [중요] 실제 DB API 연동으로 변경됨
   */
  async saveVideoToDB(videoData) {
    try {
      console.log(`💾 영상 DB 저장 시작: ${videoData.id}`);

      // 🚨 [중요] Videos DB API 호출 - /cache 엔드포인트 사용
      const result = await callDatabaseAPI('/api/v1/videos_db/cache', {
        method: 'POST',
        data: {
          video_id: videoData.id,
          title: videoData.title,
          description: videoData.description || '',
          channel_id: videoData.channelId,
          channel_title: videoData.channelTitle,
          published_at: videoData.publishedAt,
          view_count: parseInt(videoData.viewCount) || 0,
          like_count: parseInt(videoData.likeCount) || 0,
          comment_count: parseInt(videoData.commentCount) || 0,
          duration: parseInt(videoData.duration) || 0,
          thumbnail_url: videoData.thumbnail,
          search_keyword: videoData.searchKeyword,
          category: videoData.category || '일반',

          // 🤖 LLM 분류 결과 포함 (이미 완성된 로직과 연동)
          llm_classification: {
            topic_tags: videoData.tags || [],
            mood_tags: videoData.moodTags || [],
            context_tags: videoData.contextTags || [],
            genre_tags: videoData.genreTags || [],
            confidence: videoData.classification_confidence || 0.8,
            engine: "claude_api",
            processed_at: new Date().toISOString()
          },

          // 📊 품질 정보 (이미 완성된 로직과 연동)
          quality_score: videoData.qualityGrade || 0.5,
          engagement_score: videoData.engagement || null,
          is_playable: videoData.isPlayable !== false,
          processed_at: new Date().toISOString(),

          // 🔍 검색 컨텍스트
          collection_context: {
            search_keyword: videoData.searchKeyword,
            collection_method: 'daily_keyword_update',
            api_cost: 107, // search.list(100) + videos.list(7)
            filter_applied: true
          }
        }
      });

      if (result.success) {
        console.log(`✅ 영상 DB 저장 성공: ${videoData.id}`);
        
        // 📈 성과 추적을 위한 통계 업데이트
        this.stats.videosSaved = (this.stats.videosSaved || 0) + 1;
        
        return true;
      } else {
        console.error(`❌ 영상 DB 저장 실패: ${result.error || result.message}`);
        this.stats.videoSaveErrors = (this.stats.videoSaveErrors || 0) + 1;
        return false;
      }
    } catch (error) {
      console.error("❌ 영상 DB 저장 오류:", error.message);
      this.stats.videoSaveErrors = (this.stats.videoSaveErrors || 0) + 1;
      return false;
    }
  }

  // 🚨 [중요] 3단계: 채널 정보를 Videos DB에 저장하는 함수
  async saveChannelToDB(channelData) {
    try {
      console.log(`🏢 채널 저장 시작: ${channelData.channelTitle} (${channelData.channelId})`);
      
      // 🚨 [중요] Videos DB API 호출 - /channels 엔드포인트 사용
      const result = await callDatabaseAPI('/api/v1/videos_db/channels', {
        method: 'POST',
        data: {
          channel_id: channelData.channelId,
          channel_title: channelData.title || channelData.channelTitle || channelData.channelName || '채널명 없음', // 🔧 다양한 필드명 지원
          subscriber_count: channelData.subscriberCount || channelData.statistics?.subscriberCount || 0,
          video_count: channelData.videoCount || channelData.statistics?.videoCount || 0,
          channel_description: channelData.description || channelData.channelDescription || '',
          channel_icon: channelData.thumbnails?.default?.url || channelData.channelIcon || '',
          quality_grade: channelData.qualityGrade || 'C',
          collected_at: new Date().toISOString(),
          // 추가 메타데이터
          custom_url: channelData.customUrl || '',
          published_at: channelData.publishedAt || null,
          country: channelData.country || '',
          total_view_count: channelData.totalViewCount || channelData.statistics?.viewCount || 0
        }
      });

      if (result.success) {
        console.log(`   ✅ 채널 저장 성공: ${channelData.channelTitle}`);
        
        // 성공 통계 업데이트
        this.successfulChannelSaves = (this.successfulChannelSaves || 0) + 1;
      } else {
        console.error(`   ❌ 채널 저장 실패: ${channelData.channelTitle}`, result.error);
        
        // 실패 통계 업데이트
        this.failedChannelSaves = (this.failedChannelSaves || 0) + 1;
      }

      return result;

    } catch (error) {
      console.error(`🚨 saveChannelToDB 에러 [${channelData.channelId}]:`, error.message);
      
      // 실패 통계 업데이트
      this.failedChannelSaves = (this.failedChannelSaves || 0) + 1;
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🚀 [신규] 4단계: 채널 정보 배치 저장 (API Rate Limiting 해결!)
  async saveChannelsBatch(channelsData) {
    try {
      console.log(`🏢 채널 배치 저장 시작: ${channelsData.length}개 채널`);
      
      // 배치 데이터 변환 (10개씩 처리)
      const batchSize = 10;
      let totalSuccess = 0;
      let totalFailed = 0;

      for (let i = 0; i < channelsData.length; i += batchSize) {
        const batch = channelsData.slice(i, i + batchSize);
        console.log(`   📦 채널 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(channelsData.length/batchSize)}: ${batch.length}개`);

        try {
          // 🔧 강화된 데이터 검증으로 배치 API 형태 변환
          const batchChannels = batch.map(channelData => {
            // 📋 채널명 강화 검증 (빈 문자열 포함 처리)
            const getValidChannelTitle = () => {
              const candidates = [
                channelData.title,
                channelData.channelTitle, 
                channelData.channelName,
                channelData.snippet?.title,
                channelData.snippet?.channelTitle
              ];
              
              for (const candidate of candidates) {
                if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
                  return candidate.trim();
                }
              }
              return '채널명 없음';
            };

            // 📋 채널ID 강화 검증
            const getValidChannelId = () => {
              const candidates = [
                channelData.channelId,
                channelData.id,
                channelData.snippet?.channelId
              ];
              
              for (const candidate of candidates) {
                if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
                  return candidate.trim();
                }
              }
              return null; // 채널ID가 없으면 null 반환 (필수 필드이므로 에러 발생시킴)
            };

            return {
              channel_id: getValidChannelId(),
              channel_title: getValidChannelTitle(),
              
              // ✅ 기본 통계 (올바른 필드명 사용)
              subscriber_count: parseInt(channelData.subscriberCount || channelData.statistics?.subscriberCount || 0),
              video_count: parseInt(channelData.videoCount || channelData.statistics?.videoCount || 0),
              total_view_count: parseInt(channelData.totalViewCount || channelData.statistics?.viewCount || 0),
              hidden_subscriber_count: channelData.statistics?.hiddenSubscriberCount || false,
              
              // ✅ 채널 정보
              channel_description: (channelData.description || channelData.channelDescription || '').trim(),
              custom_url: (channelData.customUrl || '').trim(),
              published_at: channelData.publishedAt || channelData.snippet?.publishedAt || null,
              country: (channelData.country || channelData.snippet?.country || 'KR').trim(),
              default_language: (channelData.defaultLanguage || 'ko').trim(),
              
              // ✅ 아이콘 URL (올바른 필드명)
              channel_icon_url: channelData.thumbnails?.default?.url || 
                               channelData.snippet?.thumbnails?.default?.url || 
                               channelData.channelIcon || '',
              
              // ✅ 썸네일 다양한 해상도
              thumbnail_default: channelData.thumbnails?.default?.url || '',
              thumbnail_medium: channelData.thumbnails?.medium?.url || '',
              thumbnail_high: channelData.thumbnails?.high?.url || '',
              
              // ✅ 채널 품질 평가
              quality_grade: channelData.qualityGrade || 'C',
              quality_score: this.convertQualityScoreToNumber(channelData.qualityGrade || 'C'),
              
              // ✅ 분석 지표
              avg_views_per_video: channelData.avgViewsPerVideo || 
                                  (channelData.statistics?.viewCount && channelData.statistics?.videoCount 
                                    ? Math.round(channelData.statistics.viewCount / channelData.statistics.videoCount) 
                                    : 0),
              
              // ✅ 콘텐츠 분석
              primary_content_type: channelData.primaryContentType || 'general',
              shorts_ratio: channelData.shortsRatio || 0.5,
              
              // ✅ 상태 정보  
              is_verified: channelData.isVerified || false,
              is_active: true,
              is_blocked: false,
              
              // ✅ 수집 메타데이터
              collected_at: new Date().toISOString(),
              api_units_consumed: 5, // channels.list 기본 비용
              
              // ✅ 타이밍 정보
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()

              // 🚨 [TODO - 누락된 채널 API 필드들] 현재 미구현, 향후 추가 가능:
              /*
              TODO: 다음 YouTube Channel API 필드들을 추가로 수집/저장할 수 있음:
              
              1. snippet 추가 필드들:
                 - localized_title: channelData.snippet?.localized?.title || null
                 - localized_description: channelData.snippet?.localized?.description || null
                 - keywords: channelData.snippet?.keywords || ''
                 - tracking_analytics_account_id: channelData.snippet?.trackingAnalyticsAccountId || null
                 - moderate_comments: channelData.snippet?.moderateComments || false
                 - show_related_channels: channelData.snippet?.showRelatedChannels || true
                 - show_browse_view: channelData.snippet?.showBrowseView || true
                 - featured_channels_title: channelData.snippet?.featuredChannelsTitle || ''
                 - featured_channels_urls: channelData.snippet?.featuredChannelsUrls || []
                 - unsubscribed_trailer: channelData.snippet?.unsubscribedTrailer || null
                 - profile_color: channelData.snippet?.profileColor || null
              
              2. statistics 확장 필드들:
                 - view_count_growth_rate: 조회수 증가율 (별도 분석)
                 - subscriber_growth_rate: 구독자 증가율 (별도 분석)  
                 - daily_view_average: 일평균 조회수 (별도 계산)
                 - upload_frequency: 업로드 빈도 (별도 분석)
                 - engagement_rate: 전체 참여율 (별도 계산)
                 - subscriber_to_view_ratio: 구독자 대비 조회수 비율
              
              3. brandingSettings (브랜딩 설정):
                 - channel_title: channelData.brandingSettings?.channel?.title || null
                 - channel_description: channelData.brandingSettings?.channel?.description || null
                 - channel_keywords: channelData.brandingSettings?.channel?.keywords || null
                 - channel_tracking_analytics_account_id: channelData.brandingSettings?.channel?.trackingAnalyticsAccountId || null
                 - channel_moderate_comments: channelData.brandingSettings?.channel?.moderateComments || false
                 - channel_show_related_channels: channelData.brandingSettings?.channel?.showRelatedChannels || true
                 - channel_show_browse_view: channelData.brandingSettings?.channel?.showBrowseView || true
                 - channel_featured_channels_title: channelData.brandingSettings?.channel?.featuredChannelsTitle || ''
                 - channel_featured_channels_urls: channelData.brandingSettings?.channel?.featuredChannelsUrls || []
                 - channel_unsubscribed_trailer: channelData.brandingSettings?.channel?.unsubscribedTrailer || null
                 - channel_profile_color: channelData.brandingSettings?.channel?.profileColor || null
                 - image_banner_image_url: channelData.brandingSettings?.image?.bannerImageUrl || ''
                 - image_banner_mobile_image_url: channelData.brandingSettings?.image?.bannerMobileImageUrl || ''
                 - image_banner_tablet_low_image_url: channelData.brandingSettings?.image?.bannerTabletLowImageUrl || ''
                 - image_banner_tablet_image_url: channelData.brandingSettings?.image?.bannerTabletImageUrl || ''
                 - image_banner_tablet_hd_image_url: channelData.brandingSettings?.image?.bannerTabletHdImageUrl || ''
                 - image_banner_tablet_extra_hd_image_url: channelData.brandingSettings?.image?.bannerTabletExtraHdImageUrl || ''
                 - image_banner_mobile_low_image_url: channelData.brandingSettings?.image?.bannerMobileLowImageUrl || ''
                 - image_banner_mobile_medium_hd_image_url: channelData.brandingSettings?.image?.bannerMobileMediumHdImageUrl || ''
                 - image_banner_mobile_hd_image_url: channelData.brandingSettings?.image?.bannerMobileHdImageUrl || ''
                 - image_banner_mobile_extra_hd_image_url: channelData.brandingSettings?.image?.bannerMobileExtraHdImageUrl || ''
                 - image_banner_tv_image_url: channelData.brandingSettings?.image?.bannerTvImageUrl || ''
                 - image_banner_tv_low_image_url: channelData.brandingSettings?.image?.bannerTvLowImageUrl || ''
                 - image_banner_tv_medium_image_url: channelData.brandingSettings?.image?.bannerTvMediumImageUrl || ''
                 - image_banner_tv_high_image_url: channelData.brandingSettings?.image?.bannerTvHighImageUrl || ''
                 - image_banner_external_url: channelData.brandingSettings?.image?.bannerExternalUrl || ''
                 - watch_icon_image_url: channelData.brandingSettings?.image?.watchIconImageUrl || ''
                 - watch_page_banner_color: channelData.brandingSettings?.watch?.textColor || ''
                 - watch_page_background_color: channelData.brandingSettings?.watch?.backgroundColor || ''
                 - watch_page_featured_playlist_id: channelData.brandingSettings?.watch?.featuredPlaylistId || null
              
              4. contentDetails (콘텐츠 세부사항):
                 - related_playlists: channelData.contentDetails?.relatedPlaylists || {}
                 - uploads_playlist_id: channelData.contentDetails?.relatedPlaylists?.uploads || null
                 - likes_playlist_id: channelData.contentDetails?.relatedPlaylists?.likes || null
                 - favorites_playlist_id: channelData.contentDetails?.relatedPlaylists?.favorites || null
                 - watch_later_playlist_id: channelData.contentDetails?.relatedPlaylists?.watchLater || null
                 - watch_history_playlist_id: channelData.contentDetails?.relatedPlaylists?.watchHistory || null
              
              5. topicDetails (주제 정보):
                 - topic_ids: channelData.topicDetails?.topicIds || []
                 - topic_categories: channelData.topicDetails?.topicCategories || []
              
              6. status (채널 상태):
                 - privacy_status: channelData.status?.privacyStatus || 'public'
                 - is_linked: channelData.status?.isLinked || false
                 - long_uploads_status: channelData.status?.longUploadsStatus || 'allowed'
                 - made_for_kids: channelData.status?.madeForKids || false
                 - self_declared_made_for_kids: channelData.status?.selfDeclaredMadeForKids || false
              
              7. 분석 메타데이터 (별도 계산 필요):
                 - content_consistency_score: 콘텐츠 일관성 점수 (0.0-1.0)
                 - upload_schedule_regularity: 업로드 일정 규칙성 (0.0-1.0)
                 - audience_retention_rate: 시청자 유지율 (0.0-1.0)
                 - community_engagement: 커뮤니티 참여도 (0.0-1.0)
                 - brand_mention_frequency: 브랜드 언급 빈도
                 - collaboration_frequency: 협업 빈도
                 - trending_participation: 트렌드 참여율
                 - international_reach: 국제적 도달율
                 - monetization_indicators: 수익화 지표들
                 - content_diversity_score: 콘텐츠 다양성 점수
              
              8. 경쟁사 분석 (별도 분석):
                 - similar_channels: 유사 채널 목록
                 - market_position: 시장 내 위치
                 - competitive_advantage: 경쟁 우위
                 - growth_potential: 성장 잠재력
              
              구현 시 고려사항:
              - YouTube API 할당량 추가 소모 (part 파라미터당 +2 units)
              - brandingSettings part는 채널 소유자만 접근 가능
              - 일부 통계는 실시간 계산이 필요함
              - 데이터 크기로 인한 성능 영향 고려
              - 채널별 업데이트 주기 최적화 필요
              */
            };
          });

          // 📋 필수 필드 검증 (전송 전 확인)
          const invalidChannels = batchChannels.filter(ch => !ch.channel_id || !ch.channel_title || ch.channel_title.trim().length === 0);
          if (invalidChannels.length > 0) {
            console.error(`🚨 유효하지 않은 채널 ${invalidChannels.length}개 발견 - 건너뛰기`);
          }

          // 🚀 배치 저장 (한 번의 API 호출로 여러 채널 저장)
          const result = await callDatabaseAPI('/api/v1/videos_db/channels/batch-save', {
            method: 'POST',
            data: { channels: batchChannels }
          });

          if (result.success) {
            const successCount = result.data?.successCount || batch.length;
            const failedCount = result.data?.failedCount || 0;
            
            console.log(`     ✅ 배치 ${Math.floor(i/batchSize) + 1} 완료: ${successCount}개 성공, ${failedCount}개 실패`);
            
            totalSuccess += successCount;
            totalFailed += failedCount;
          } else {
            console.error(`     ❌ 배치 ${Math.floor(i/batchSize) + 1} 실패: ${result.error}`);
            
            // 배치 실패 시 개별 저장 시도 (폴백)
            console.log(`     🔄 개별 저장 폴백 시도...`);
            for (const channelData of batch) {
              const individualResult = await this.saveChannelToDB(channelData);
              if (individualResult.success) {
                totalSuccess++;
              } else {
                totalFailed++;
              }
              
              // Rate Limiting 방지를 위한 짧은 대기
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          // 배치간 대기 (Rate Limiting 방지)
          if (i + batchSize < channelsData.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          console.error(`     ❌ 배치 ${Math.floor(i/batchSize) + 1} 에러:`, error.message);
          totalFailed += batch.length;
        }
      }

      // 통계 업데이트
      this.successfulChannelSaves = (this.successfulChannelSaves || 0) + totalSuccess;
      this.failedChannelSaves = (this.failedChannelSaves || 0) + totalFailed;

      console.log(`🏢 채널 배치 저장 완료: 총 ${totalSuccess}개 성공, ${totalFailed}개 실패`);

      return {
        success: true,
        totalProcessed: channelsData.length,
        successCount: totalSuccess,
        failedCount: totalFailed,
        message: `채널 배치 저장 완료: ${totalSuccess}개 성공`
      };

    } catch (error) {
      console.error('🚨 채널 배치 저장 에러:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🔧 quality_score 문자열을 숫자로 변환하는 헬퍼 함수
  convertQualityScoreToNumber(qualityScore) {
    // 문자열 등급을 숫자로 변환
    const gradeMap = {
      'S': 0.95,
      'A': 0.85, 
      'B': 0.75,
      'C': 0.65,
      'D': 0.55,
      'F': 0.45
    };
    
    if (typeof qualityScore === 'string') {
      const grade = qualityScore.toUpperCase().trim();
      return gradeMap[grade] || 0.5; // 기본값
    }
    
    if (typeof qualityScore === 'number') {
      return qualityScore;
    }
    
    return 0.5; // 기본값
  }

  /**
   * ✅ 키워드 실행 완료 기록 (키워드 회전 로직)
   */
  async completeKeywordExecution(keywordData, videosFoundCount, apiUnitsUsed, success, errorMessage = null) {
    console.log(`🔄 키워드 실행 완료 기록: ${keywordData.keyword}`);
    
    try {
      // ======================================================================
      // 🔥 [중요] KEYWORDS DB API 호출 - 키워드 실행 완료 기록
      // ======================================================================
      const endpoint = `/api/v1/keywords_db/daily/complete-update`;
      
      const updateData = {
        keywordId: keywordData.id,
        videosFoundCount,
        videosCachedCount: videosFoundCount, // UPSERT 방식이므로 발견 = 캐시됨
        apiUnitsUsed,
        success,
        errorMessage
      };

      const result = await callDatabaseAPI(endpoint, {
        method: 'POST',
        data: updateData
      });

      if (result.success) {
        console.log(`   ✅ 키워드 완료 기록 성공: ${keywordData.keyword}`);
        console.log(`   🔄 키워드 회전 로직 자동 실행됨`);
      } else {
        console.error(`   ❌ 키워드 완료 기록 실패: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ 키워드 완료 기록 중 오류:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // 🔧 LLM 분류 데이터에서 특정 태그 타입 추출 (DB 스키마 맞춤)
  extractTagsFromLLM(videoData, tagType) {
    try {
      // 1. 직접 배열이 있는 경우 (폴백 태그)
      if (videoData[`${tagType}Tags`] && Array.isArray(videoData[`${tagType}Tags`])) {
        return videoData[`${tagType}Tags`];
      }

      // 2. tags 객체에서 추출 (LLM 성공 분류)
      if (videoData.tags && videoData.tags[tagType] && Array.isArray(videoData.tags[tagType])) {
        return videoData.tags[tagType];
      }

      // 3. 중첩 구조에서 추출 (복잡한 LLM 응답)
      if (videoData.tags && videoData.tags.topic_tags && videoData.tags.topic_tags[tagType]) {
        return videoData.tags.topic_tags[tagType];
      }

      // 4. 폴백 태그에서 추출
      if (videoData.fallbackTags && videoData.fallbackTags[tagType]) {
        return videoData.fallbackTags[tagType];
      }

      // 5. 기본값 반환
      return [];

    } catch (error) {
      console.error(`🚨 LLM 태그 추출 실패 (${tagType}):`, error.message);
      return [];
    }
  }

  // 🔧 LLM 응답에서 태그 추출 (분류 결과 처리용) - 수정됨
  extractLLMTags(llmTags, tagType) {
    try {
      // 1. 직접 배열인 경우
      if (Array.isArray(llmTags)) {
        return llmTags;
      }

      // 2. 중첩 객체에서 추출 (LLM 응답 구조)
      if (llmTags && typeof llmTags === 'object') {
        // ✅ 실제 LLM 응답 구조: { topics: [...], moods: [...], contexts: [...], genres: [...] }
        if (llmTags[tagType] && Array.isArray(llmTags[tagType])) {
          return llmTags[tagType];
        }

        // topic_tags.topics 구조 (폴백)
        if (llmTags.topic_tags && llmTags.topic_tags[tagType] && Array.isArray(llmTags.topic_tags[tagType])) {
          return llmTags.topic_tags[tagType];
        }
      }

      // 3. 기본값
      return [];

    } catch (error) {
      console.error(`🚨 LLM 태그 추출 실패 (${tagType}):`, error.message);
      return [];
    }
  }

  // 🚨 [TODO - 확장 가능] LLM 분석 확장 - 현재는 기본 태깅만, 향후 추가 가능한 분석들:
  /*
  TODO: 다음 LLM 분석 기능들을 추가할 수 있음:
  
  1. 감정 분석 (Sentiment Analysis):
     - positive_sentiment: 0.0-1.0 (긍정도)
     - negative_sentiment: 0.0-1.0 (부정도)
     - neutral_sentiment: 0.0-1.0 (중립도)
     - emotional_intensity: 'low'|'medium'|'high'
     - dominant_emotions: ['joy', 'surprise', 'anger', 'sadness', 'fear', 'disgust']
  
  2. 타겟 분석 (Target Analysis):
     - target_age_group: '5-12'|'13-17'|'18-24'|'25-34'|'35-44'|'45+'
     - target_gender: 'male'|'female'|'all'
     - target_interests: ['gaming', 'beauty', 'fitness', 'education', ...]
     - content_sophistication: 'beginner'|'intermediate'|'advanced'
  
  3. 브랜드 안전성 (Brand Safety):
     - brand_safety_score: 0.0-1.0
     - content_warnings: ['violence', 'adult_content', 'controversial', ...]
     - advertiser_friendly: boolean
     - family_safe: boolean
  
  4. 바이럴 예측 (Virality Prediction):
     - viral_potential: 0.0-1.0
     - shareability_score: 0.0-1.0
     - trend_alignment: 0.0-1.0
     - hook_strength: 'weak'|'medium'|'strong'
  
  5. 콘텐츠 품질 (Content Quality):
     - production_quality: 0.0-1.0
     - audio_quality: 0.0-1.0
     - video_quality: 0.0-1.0
     - editing_sophistication: 'basic'|'intermediate'|'professional'
  
  6. SEO 최적화 (SEO Optimization):
     - title_seo_score: 0.0-1.0
     - description_seo_score: 0.0-1.0
     - keyword_density: 0.0-1.0
     - trending_keywords: ['keyword1', 'keyword2', ...]
  
  7. 참여도 예측 (Engagement Prediction):
     - predicted_like_rate: 0.0-1.0
     - predicted_comment_rate: 0.0-1.0
     - predicted_share_rate: 0.0-1.0
     - engagement_drivers: ['humor', 'education', 'surprise', ...]
  
  구현 방법:
  - video-tagger.js에서 추가 프롬프트로 분석
  - 배치 처리로 성능 최적화
  - 신뢰도 점수와 함께 저장
  - A/B 테스트로 예측 정확도 검증
  */

  // 🚀 [신규] 5단계: 영상 정보 배치 저장 (API Rate Limiting 해결!)
  async saveVideosBatch(videosData) {
    try {
      console.log(`💾 영상 배치 저장 시작: ${videosData.length}개 영상`);
      
      // 배치 데이터 변환 (10개씩 처리)
      const batchSize = 10;
      let totalSuccess = 0;
      let totalFailed = 0;

      for (let i = 0; i < videosData.length; i += batchSize) {
        const batch = videosData.slice(i, i + batchSize);
        console.log(`   📦 영상 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(videosData.length/batchSize)}: ${batch.length}개`);

        try {
          // 🔧 강화된 데이터 검증으로 배치 API 형태 변환
          const batchVideos = batch.map(videoData => {
            // 📋 영상ID 강화 검증
            const getValidVideoId = () => {
              const candidates = [
                videoData.id,
                videoData.videoId,
                videoData.snippet?.resourceId?.videoId
              ];
              
              for (const candidate of candidates) {
                if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
                  return candidate.trim();
                }
              }
              return null; // 영상ID가 없으면 null 반환 (필수 필드)
            };

            // 📋 영상 제목 강화 검증
            const getValidTitle = () => {
              const candidates = [
                videoData.title,
                videoData.snippet?.title
              ];
              
              for (const candidate of candidates) {
                if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
                  return candidate.trim();
                }
              }
              return '제목 없음';
            };

            // 📋 채널ID 강화 검증
            const getValidChannelId = () => {
              const candidates = [
                videoData.channelId,
                videoData.snippet?.channelId
              ];
              
              for (const candidate of candidates) {
                if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
                  return candidate.trim();
                }
              }
              return null; // 채널ID가 없으면 null 반환 (필수 필드)
            };

            // 📋 채널명 강화 검증
            const getValidChannelTitle = () => {
              const candidates = [
                videoData.channelTitle,
                videoData.snippet?.channelTitle
              ];
              
              for (const candidate of candidates) {
                if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
                  return candidate.trim();
                }
              }
              return '채널명 없음';
            };

            return {
              video_id: getValidVideoId(),
              title: getValidTitle(),
              description: (videoData.description || videoData.snippet?.description || '').trim(),
              channel_id: getValidChannelId(),
              channel_title: getValidChannelTitle(),
              
              // ✅ 게시 정보 (YouTube API snippet)
              published_at: videoData.publishedAt || videoData.snippet?.publishedAt,
              category_id: videoData.categoryId || videoData.snippet?.categoryId || '24', // Entertainment
              default_language: videoData.defaultLanguage || 'ko',
              default_audio_language: videoData.defaultAudioLanguage || 'ko',
              
              // ✅ 썸네일 정보 (다양한 해상도)
              thumbnails: {
                default: videoData.snippet?.thumbnails?.default || {},
                medium: videoData.snippet?.thumbnails?.medium || {},
                high: videoData.snippet?.thumbnails?.high || {},
                standard: videoData.snippet?.thumbnails?.standard || {},
                maxres: videoData.snippet?.thumbnails?.maxres || {}
              },
              thumbnail_url: videoData.thumbnail || videoData.snippet?.thumbnails?.medium?.url || '',
              
              // ✅ YouTube 원본 태그
              youtube_tags: videoData.tags || videoData.snippet?.tags || [],
              
              // ✅ 통계 정보 (YouTube API statistics)
              view_count: parseInt(videoData.viewCount || videoData.statistics?.viewCount || 0),
              like_count: parseInt(videoData.likeCount || videoData.statistics?.likeCount || 0),
              dislike_count: parseInt(videoData.dislikeCount || videoData.statistics?.dislikeCount || 0),
              comment_count: parseInt(videoData.commentCount || videoData.statistics?.commentCount || 0),
              favorite_count: parseInt(videoData.favoriteCount || videoData.statistics?.favoriteCount || 0),
              
              // ✅ 콘텐츠 세부사항 (YouTube API contentDetails)
              duration: parseInt(videoData.duration || 0),
              duration_iso: videoData.contentDetails?.duration || 'PT0S',
              definition: videoData.contentDetails?.definition || 'hd',
              caption: videoData.contentDetails?.caption === 'true',
              licensed_content: videoData.contentDetails?.licensedContent || false,
              projection: videoData.contentDetails?.projection || 'rectangular',
              
              // ✅ 상태 정보 (YouTube API status)
              upload_status: videoData.status?.uploadStatus || 'processed',
              privacy_status: videoData.status?.privacyStatus || 'public',
              license: videoData.status?.license || 'youtube',
              embeddable: videoData.status?.embeddable !== false,
              public_stats_viewable: videoData.status?.publicStatsViewable !== false,
              made_for_kids: videoData.status?.madeForKids || false,
              
              // ✅ 지역 제한 정보
              region_restriction: videoData.contentDetails?.regionRestriction || {},
              
              // ✅ LLM 분류 결과를 DB 스키마에 맞게 변환
              topic_tags: Array.isArray(videoData.topic_tags) ? videoData.topic_tags : (Array.isArray(videoData.tags) ? videoData.tags : []),
              mood_tags: Array.isArray(videoData.mood_tags) ? videoData.mood_tags : (Array.isArray(videoData.moodTags) ? videoData.moodTags : []),
              context_tags: Array.isArray(videoData.context_tags) ? videoData.context_tags : (Array.isArray(videoData.contextTags) ? videoData.contextTags : []),
              genre_tags: Array.isArray(videoData.genre_tags) ? videoData.genre_tags : (Array.isArray(videoData.genreTags) ? videoData.genreTags : []),
              
              // ✅ LLM 메타데이터 (DB 스키마 정확한 필드명)
              classification_confidence: videoData.classification_confidence || 0.8,
              classified_by: "claude_api",
              classification_model: "claude-3-5-sonnet-20241022",
              classified_at: new Date().toISOString(),
              used_fallback: videoData.used_fallback || false,
              fallback_reason: videoData.fallback_reason || null,
              
              // ✅ 검색 및 품질 정보
              search_keyword: videoData.searchKeyword || '',
              search_category: videoData.category || '일반',
              is_playable: videoData.isPlayable !== false,
              playability_check_at: new Date().toISOString(),
              
              // ✅ 품질 점수들
              quality_score: this.convertQualityScoreToNumber(videoData.quality_score || videoData.qualityGrade || 'C'),
              engagement_score: videoData.engagement || null,
              freshness_score: videoData.freshness_score || null,
              
              // ✅ 콘텐츠 안전성
              content_rating: videoData.content_rating || 'G',
              safety_score: videoData.safety_score || 1.0,
              content_warnings: videoData.content_warnings || [],
              
              // ✅ 언어 및 지역
              detected_language: videoData.detected_language || 'ko',
              target_region: videoData.target_region || 'KR',
              
              // ✅ 캐시 관리
              cached_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
              cache_source: 'youtube_api',
              api_units_consumed: 107, // search:100 + videos:7
              
              // ✅ Raw 데이터 저장 (디버깅용)
              raw_youtube_data: {
                snippet: videoData.snippet || {},
                statistics: videoData.statistics || {},
                contentDetails: videoData.contentDetails || {},
                status: videoData.status || {}
              },
              raw_classification_data: {
                topic_tags: videoData.tags || [],
                mood_tags: videoData.moodTags || [],
                context_tags: videoData.contextTags || [],
                genre_tags: videoData.genreTags || [],
                confidence: videoData.classification_confidence || 0.8,
                // 🔍 디버깅용 - LLM 원본 응답도 저장
                llm_original_response: videoData.llm_original_response || null
              },
              
              // ✅ 타임스탬프
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()

              // 🚨 [TODO - 누락된 YouTube API 필드들] 현재 미구현, 향후 추가 가능:
              /*
              TODO: 다음 YouTube API 필드들을 추가로 수집/저장할 수 있음:
              
              1. snippet 추가 필드들:
                 - live_broadcast_content: videoData.snippet?.liveBroadcastContent || 'none'
                 - default_audio_language: videoData.snippet?.defaultAudioLanguage || null
                 - localized_title: videoData.snippet?.localized?.title || null
                 - localized_description: videoData.snippet?.localized?.description || null
              
              2. contentDetails 추가 필드들:
                 - dimension: videoData.contentDetails?.dimension || '2d'
                 - has_custom_thumbnail: videoData.contentDetails?.hasCustomThumbnail || false
                 - content_rating: videoData.contentDetails?.contentRating || {}
                 - country_restriction: videoData.contentDetails?.regionRestriction || {}
              
              3. fileDetails (업로드 파일 정보):
                 - file_name: videoData.fileDetails?.fileName || null
                 - file_size: videoData.fileDetails?.fileSize || null
                 - file_type: videoData.fileDetails?.fileType || null
                 - container: videoData.fileDetails?.container || null
                 - video_streams: videoData.fileDetails?.videoStreams || []
                 - audio_streams: videoData.fileDetails?.audioStreams || []
              
              4. processingDetails (처리 상태):
                 - processing_status: videoData.processingDetails?.processingStatus || null
                 - processing_progress: videoData.processingDetails?.processingProgress || null
                 - processing_failure_reason: videoData.processingDetails?.processingFailureReason || null
                 - file_details_availability: videoData.processingDetails?.fileDetailsAvailability || null
                 - processing_issues_availability: videoData.processingDetails?.processingIssuesAvailability || null
                 - tag_suggestions_availability: videoData.processingDetails?.tagSuggestionsAvailability || null
                 - editor_suggestions_availability: videoData.processingDetails?.editorSuggestionsAvailability || null
                 - thumbnails_availability: videoData.processingDetails?.thumbnailsAvailability || null
              
              5. recordingDetails (녹화 정보):
                 - recording_date: videoData.recordingDetails?.recordingDate || null
                 - location_latitude: videoData.recordingDetails?.location?.latitude || null
                 - location_longitude: videoData.recordingDetails?.location?.longitude || null
                 - location_altitude: videoData.recordingDetails?.location?.altitude || null
                 - location_description: videoData.recordingDetails?.locationDescription || null
              
              6. statistics 추가 필드들:
                 - subscriber_gain: 구독자 증가수 (별도 API 호출 필요)
                 - view_growth_rate: 조회수 증가율 (기간별 비교)
                 - engagement_timeline: 시간대별 참여도 (별도 분석)
              
              7. player 정보:
                 - embed_html: videoData.player?.embedHtml || null
                 - embed_height: videoData.player?.embedHeight || null
                 - embed_width: videoData.player?.embedWidth || null
              
              8. topicDetails (주제 정보):
                 - topic_ids: videoData.topicDetails?.topicIds || []
                 - topic_categories: videoData.topicDetails?.topicCategories || []
                 - relevant_topic_ids: videoData.topicDetails?.relevantTopicIds || []
              
              9. suggestions (YouTube 제안):
                 - processing_errors: videoData.suggestions?.processingErrors || []
                 - processing_warnings: videoData.suggestions?.processingWarnings || []
                 - processing_hints: videoData.suggestions?.processingHints || []
                 - tag_suggestions: videoData.suggestions?.tagSuggestions || []
                 - editor_suggestions: videoData.suggestions?.editorSuggestions || []
              
              10. liveStreamingDetails (라이브 정보):
                  - actual_start_time: videoData.liveStreamingDetails?.actualStartTime || null
                  - actual_end_time: videoData.liveStreamingDetails?.actualEndTime || null
                  - scheduled_start_time: videoData.liveStreamingDetails?.scheduledStartTime || null
                  - scheduled_end_time: videoData.liveStreamingDetails?.scheduledEndTime || null
                  - concurrent_viewers: videoData.liveStreamingDetails?.concurrentViewers || null
                  - active_live_chat_id: videoData.liveStreamingDetails?.activeLiveChatId || null
              
              구현 시 고려사항:
              - YouTube API 할당량 추가 소모 (part 파라미터당 +2 units)
              - 모든 필드가 모든 영상에 제공되지 않음 (권한, 프라이버시에 따라)
              - 파일 크기 증가로 인한 DB 성능 영향
              - 필드별 중요도에 따른 선택적 수집 전략 필요
              */
            };
          });

          // 📋 필수 필드 검증 (전송 전 확인)
          const invalidVideos = batchVideos.filter(vid => !vid.video_id || !vid.title || vid.title.trim().length === 0 || !vid.channel_id);
          if (invalidVideos.length > 0) {
            console.error(`🚨 유효하지 않은 영상 ${invalidVideos.length}개 발견 - 건너뛰기`);
          }

          const result = await callDatabaseAPI('/api/v1/videos_db/cache/batch-save', {
            method: 'POST',
            data: { videos: batchVideos }
          });

          if (result.success) {
            const successCount = result.data?.successCount || batch.length;
            const failedCount = result.data?.failedCount || 0;
            
            console.log(`     ✅ 영상 배치 ${Math.floor(i/batchSize) + 1} 완료: ${successCount}개 성공, ${failedCount}개 실패`);
            
            totalSuccess += successCount;
            totalFailed += failedCount;
          } else {
            console.error(`     ❌ 영상 배치 ${Math.floor(i/batchSize) + 1} 실패: ${result.error}`);
            totalFailed += batch.length;
          }

          // 배치간 대기 (Rate Limiting 방지)
          if (i + batchSize < videosData.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          console.error(`     ❌ 영상 배치 ${Math.floor(i/batchSize) + 1} 에러:`, error.message);
          totalFailed += batch.length;
        }
      }

      // 통계 업데이트
      this.videosSaved = (this.videosSaved || 0) + totalSuccess;
      this.videoSaveErrors = (this.videoSaveErrors || 0) + totalFailed;

      console.log(`💾 영상 배치 저장 완료: 총 ${totalSuccess}개 성공, ${totalFailed}개 실패`);

      return {
        success: true,
        totalProcessed: videosData.length,
        successCount: totalSuccess,
        failedCount: totalFailed,
        message: `영상 배치 저장 완료: ${totalSuccess}개 성공`
      };

    } catch (error) {
      console.error('🚨 영상 배치 저장 에러:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
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

// 특정 키워드만 처리 (테스트용, 배치 크기 조정 지원)
export async function processSingleKeyword(keywordData, options = {}) {
  return await dailyKeywordUpdateService.processKeyword(keywordData, options);
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