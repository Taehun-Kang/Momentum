/**
 * 🔍 실시간 키워드 검색 서비스 v1.0
 * 
 * 사용자 요청 키워드 즉시 처리 워크플로우
 * 
 * 워크플로우:
 * 1. 사용자가 직접 키워드 입력
 * 2. YouTube Search Engine으로 검색 실행
 * 3. Video Complete Filter로 품질 필터링
 * 4. Pagination Handler로 페이지네이션 관리
 * 5. 기존 영상과 중복 제거
 * 6. Video Tagger로 영상 분류 및 태깅
 * 7. Channel Info Collector로 채널 정보 수집
 * 8. 결과 반환 및 DB 저장
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// YouTube AI 서비스 모듈들
import { searchYouTubeShorts } from './youtube-search-engine.js';
import { filterAndAnalyzeVideos } from './video-complete-filter.js';
import { shouldContinuePagination, mergeUniqueVideos } from './pagination-handler.js';
import { collectChannelInfo } from './channel-info-collector.js';
import { classifyVideoBatch } from '../../llm/modules/video-tagger.js';

// LLM 카테고리 분류를 위한 Claude API
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../../../.env') });

class RealtimeKeywordSearchService {
  constructor() {
    // YouTube API 키 확인
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!this.youtubeApiKey) {
      throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    // Claude API 키 확인 (카테고리 분류용)
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!this.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    // Claude 클라이언트 초기화
    this.claude = new Anthropic({
      apiKey: this.anthropicApiKey,
    });

    // 9개 고정 카테고리
    this.validCategories = [
      '음악 & 엔터테인먼트',
      '코미디 & 챌린지', 
      '게임 & 테크',
      '교육 & 정보',
      '뷰티 & 패션',
      '라이프스타일 & 건강',
      '여행 & 문화',
      '먹방 & 요리',
      'ASMR & 힐링'
    ];

    // 검색 세션별 통계
    this.sessionStats = {
      sessionId: null,
      startTime: null,
      keyword: null,
      category: null,
      totalVideosFound: 0,
      newVideosAdded: 0,
      duplicatesSkipped: 0,
      classificationErrors: 0,
      channelsToUpdate: new Set(),
      apiUnitsUsed: 0,
      totalPages: 0,
      isProcessing: false
    };

    // 분류 실패 영상 추적
    this.failedClassifications = [];

    console.log('🔍 실시간 키워드 검색 서비스 v1.0 초기화 완료');
    console.log('✅ YouTube API 키 확인됨');
    console.log('✅ Claude API 키 확인됨');
    console.log(`📋 지원 카테고리: ${this.validCategories.length}개`);
  }

  /**
   * 🎯 메인 실행 함수 - 사용자 키워드 즉시 처리
   */
  async searchKeywordRealtime(keywordRequest) {
    const sessionId = this.generateSessionId();
    console.log(`\n🔍 실시간 키워드 검색 시작 [${sessionId}]`);
    
    // 세션 초기화
    this.resetSessionStats(sessionId, keywordRequest);

    try {
      // 키워드 데이터 검증 및 정규화
      let keywordData = this.validateAndNormalizeKeyword(keywordRequest);
      
      // 🎯 LLM으로 카테고리 자동 분류 (핵심 수정!)
      if (keywordData.category === '사용자 검색') {
        console.log(`🤖 키워드 "${keywordData.keyword}" 카테고리 자동 분류 중...`);
        const autoCategory = await this.classifyKeywordCategory(keywordData.keyword);
        keywordData.category = autoCategory;
        console.log(`✅ 카테고리 분류 완료: "${autoCategory}"`);
      }
      
      console.log(`📋 검색 키워드: "${keywordData.keyword}" (${keywordData.category})`);
      console.log(`📊 품질 기준: 조회수 ${keywordData.min_view_count.toLocaleString()}+ / 참여도 ${keywordData.min_engagement_rate}%+`);

      // 키워드 처리 실행
      const result = await this.processKeywordRealtime(keywordData);

      // 완료 리포트 생성
      const report = this.generateSessionReport();

      return {
        success: true,
        sessionId: sessionId,
        keyword: keywordData.keyword,
        category: keywordData.category,
        results: result,
        report: report,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ 실시간 검색 실패 [${sessionId}]:`, error.message);
      
      return {
        success: false,
        sessionId: sessionId,
        error: error.message,
        partialResults: this.getPartialResults(),
        timestamp: new Date().toISOString()
      };
    } finally {
      this.sessionStats.isProcessing = false;
    }
  }

  /**
   * 🤖 LLM으로 키워드 카테고리 자동 분류 (신규 기능)
   */
  async classifyKeywordCategory(keyword) {
    try {
      const prompt = `다음 키워드를 정확히 9개 카테고리 중 하나로 분류해주세요.

키워드: "${keyword}"

카테고리 목록:
1. 음악 & 엔터테인먼트 - K-pop, 댄스, 노래, 음악, 아이돌, 연예인, 콘서트 등
2. 코미디 & 챌린지 - 개그, 웃긴, 재미있는, 챌린지, 패러디, 몰카 등
3. 게임 & 테크 - 게임, 컴퓨터, 스마트폰, 기술, IT, 리뷰, 언박싱 등
4. 교육 & 정보 - 공부, 학습, 강의, 정보, 뉴스, 역사, 과학, 실험 등
5. 뷰티 & 패션 - 화장, 메이크업, 스킨케어, 패션, 옷, 스타일링 등
6. 라이프스타일 & 건강 - 운동, 다이어트, 건강, 일상, 브이로그, 취미 등
7. 여행 & 문화 - 여행, 관광, 문화, 축제, 맛집 탐방, 지역 소개 등
8. 먹방 & 요리 - 먹방, 요리, 음식, 레시피, 맛집, 베이킹, 쿠킹 등
9. ASMR & 힐링 - ASMR, 수면, 힐링, 명상, 빗소리, 자연의소리 등

분류 규칙:
- 키워드의 핵심 의미를 파악하여 가장 적합한 카테고리 1개를 선택
- 애매한 경우 키워드의 주된 목적이나 용도를 고려
- 반드시 위 9개 중 하나만 선택

응답 형식: 카테고리명만 정확히 출력 (예: "먹방 & 요리")`;

      const response = await this.claude.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 50,
        temperature: 0.1, // 일관성을 위해 낮은 온도
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const categoryText = response.content[0].text.trim();
      
      // 응답이 유효한 카테고리인지 확인
      const matchedCategory = this.validCategories.find(cat => 
        categoryText.includes(cat) || cat.includes(categoryText)
      );

      if (matchedCategory) {
        console.log(`   🎯 LLM 분류 결과: "${keyword}" → "${matchedCategory}"`);
        return matchedCategory;
      } else {
        console.warn(`   ⚠️ LLM 분류 결과 불일치: "${categoryText}" → 기본값 사용`);
        return this.getFallbackCategory(keyword);
      }

    } catch (error) {
      console.error(`❌ 카테고리 분류 실패:`, error.message);
      return this.getFallbackCategory(keyword);
    }
  }

  /**
   * 📋 폴백 카테고리 결정 (LLM 실패 시)
   */
  getFallbackCategory(keyword) {
    const keywordLower = keyword.toLowerCase();
    
    // 키워드 기반 간단한 분류
    if (keywordLower.includes('먹방') || keywordLower.includes('요리') || keywordLower.includes('음식')) {
      return '먹방 & 요리';
    } else if (keywordLower.includes('asmr') || keywordLower.includes('힐링') || keywordLower.includes('수면')) {
      return 'ASMR & 힐링';
    } else if (keywordLower.includes('게임') || keywordLower.includes('스마트폰') || keywordLower.includes('리뷰')) {
      return '게임 & 테크';
    } else if (keywordLower.includes('댄스') || keywordLower.includes('음악') || keywordLower.includes('kpop')) {
      return '음악 & 엔터테인먼트';
    } else if (keywordLower.includes('운동') || keywordLower.includes('건강') || keywordLower.includes('다이어트')) {
      return '라이프스타일 & 건강';
    } else if (keywordLower.includes('화장') || keywordLower.includes('메이크업') || keywordLower.includes('패션')) {
      return '뷰티 & 패션';
    } else if (keywordLower.includes('여행') || keywordLower.includes('맛집')) {
      return '여행 & 문화';
    } else if (keywordLower.includes('공부') || keywordLower.includes('교육') || keywordLower.includes('정보')) {
      return '교육 & 정보';
    } else {
      // 기본값
      return '코미디 & 챌린지';
    }
  }

  /**
   * 📝 키워드 요청 검증 및 정규화
   */
  validateAndNormalizeKeyword(keywordRequest) {
    // 필수 필드 확인
    if (!keywordRequest.keyword || typeof keywordRequest.keyword !== 'string') {
      throw new Error('keyword 필드가 필요합니다 (문자열)');
    }

    // 키워드 정리
    const cleanKeyword = keywordRequest.keyword.trim();
    if (cleanKeyword.length === 0) {
      throw new Error('키워드가 비어있습니다');
    }

    if (cleanKeyword.length > 100) {
      throw new Error('키워드가 너무 깁니다 (최대 100자)');
    }

    // 카테고리 검증 (사용자가 지정한 경우)
    let category = keywordRequest.category || '사용자 검색';
    if (category !== '사용자 검색' && !this.validCategories.includes(category)) {
      console.warn(`⚠️ 잘못된 카테고리 "${category}" → 자동 분류로 변경`);
      category = '사용자 검색'; // 자동 분류하도록 설정
    }

    // 기본값 설정
    return {
      keyword: cleanKeyword,
      category: category,
      min_view_count: keywordRequest.min_view_count || 10000,
      min_engagement_rate: keywordRequest.min_engagement_rate || 1.5,
      target_count: keywordRequest.target_count || 40,
      max_pages: keywordRequest.max_pages || 3,
      priority: keywordRequest.priority || 1000
    };
  }

  /**
   * 🔍 실시간 키워드 처리 (핵심 로직)
   */
  async processKeywordRealtime(keywordData) {
    this.sessionStats.keyword = keywordData.keyword;
    this.sessionStats.category = keywordData.category;
    
    console.log(`\n🔍 키워드 처리 시작: "${keywordData.keyword}" (${keywordData.category})`);

    try {
      let allVideos = [];
      let pageToken = null;
      let page = 1;
      const targetCount = keywordData.target_count;
      const maxPages = keywordData.max_pages;

      // 1. 페이지네이션을 통한 영상 수집
      while (page <= maxPages) {
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
          totalProcessed: this.sessionStats.totalVideosFound + searchResult.data.items?.length || 0,
          hasNextPageToken: !!searchResult.nextPageToken
        }, { targetResults: targetCount, maxPages: maxPages });

        // API 사용량 추가
        this.sessionStats.apiUnitsUsed += 109; // search(100) + videos(9)
        this.sessionStats.totalPages++;

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
        console.log(`   💭 새로운 영상 없음 - 검색 완료`);
        return {
          videos: [],
          totalFound: allVideos.length,
          newVideos: 0,
          duplicatesSkipped: allVideos.length,
          message: '모든 영상이 이미 수집되었습니다'
        };
      }

      // 3. 영상 분류 및 태깅
      const classificationResult = await this.classifyAndTagVideos(newVideos, keywordData);

      // 4. 채널 정보 수집
      const channelResult = await this.collectChannelInfo();

      // 5. 통계 업데이트
      this.sessionStats.totalVideosFound += allVideos.length;
      this.sessionStats.newVideosAdded += newVideos.length;

      console.log(`✅ 키워드 "${keywordData.keyword}" 처리 완료: ${newVideos.length}개 새 영상`);

      return {
        videos: newVideos,
        totalFound: allVideos.length,
        newVideos: newVideos.length,
        duplicatesSkipped: allVideos.length - newVideos.length,
        classificationResult: classificationResult,
        channelResult: channelResult,
        failedClassifications: this.failedClassifications.length
      };

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
        minEngagementRate: keywordData.min_engagement_rate / 100, // 퍼센트를 소수점으로 변환
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
   * ⚠️ 현재는 목업 로직 사용 (25% 랜덤 제거)
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

    // 🧪 임시 목업 로직: 랜덤하게 일부 영상을 중복으로 처리 (25% 확률)
    // 실시간 검색에서는 중복률이 일일 갱신보다 낮을 것으로 예상
    const existingVideoIds = new Set();
    videos.forEach((video) => {
      if (Math.random() < 0.25) { // 25% 확률로 중복 처리
        existingVideoIds.add(video.id);
      }
    });

    const newVideos = videos.filter(video => !existingVideoIds.has(video.id));
    this.sessionStats.duplicatesSkipped += videos.length - newVideos.length;

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
              fallbackTags: failedResult.fallbackTags,
              sessionId: this.sessionStats.sessionId
            });
          }
        }

        console.log(`   📊 분류 실패 영상 추가: ${failedVideos.length}개 (총 ${this.failedClassifications.length}개 대기)`);
        
        // 채널 정보 수집 대상 추가
        videos.forEach(video => {
          if (video.channelId) {
            this.sessionStats.channelsToUpdate.add(video.channelId);
          }
        });

        this.sessionStats.classificationErrors += classificationResult.failedClassifications;
        
        return classificationResult;
      } else {
        console.error(`   ❌ 분류 실패: ${videos.length}개 영상`);
        this.sessionStats.classificationErrors += videos.length;
        return { success: false, error: '전체 배치 분류 실패' };
      }

    } catch (error) {
      console.error(`❌ 영상 분류 실패:`, error.message);
      this.sessionStats.classificationErrors += videos.length;
      return { success: false, error: error.message };
    }
  }

  /**
   * 📺 채널 정보 수집 (Channel Info Collector 사용)
   */
  async collectChannelInfo() {
    const channelIds = Array.from(this.sessionStats.channelsToUpdate);
    
    if (channelIds.length === 0) {
      console.log('📺 업데이트할 채널 정보 없음');
      return { success: true, channels: [], message: '업데이트할 채널 없음' };
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
        this.sessionStats.apiUnitsUsed += channelInfoResult.summary.apiCost;

        return channelInfoResult;
      } else {
        console.error('❌ 채널 정보 수집 실패');
        return { success: false, error: '채널 정보 수집 실패' };
      }

    } catch (error) {
      console.error('❌ 채널 정보 수집 실패:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📊 세션 리포트 생성
   */
  generateSessionReport() {
    const endTime = Date.now();
    const duration = endTime - this.sessionStats.startTime;
    
    const report = {
      sessionId: this.sessionStats.sessionId,
      keyword: this.sessionStats.keyword,
      category: this.sessionStats.category,
      duration: Math.round(duration / 1000),
      statistics: {
        totalPages: this.sessionStats.totalPages,
        totalVideosFound: this.sessionStats.totalVideosFound,
        newVideosAdded: this.sessionStats.newVideosAdded,
        duplicatesSkipped: this.sessionStats.duplicatesSkipped,
        classificationErrors: this.sessionStats.classificationErrors,
        channelsUpdated: this.sessionStats.channelsToUpdate.size,
        apiUnitsUsed: this.sessionStats.apiUnitsUsed
      },
      performance: {
        successRate: this.sessionStats.totalVideosFound > 0 
          ? ((this.sessionStats.newVideosAdded / this.sessionStats.totalVideosFound) * 100).toFixed(1)
          : '0.0',
        efficiency: this.sessionStats.apiUnitsUsed > 0
          ? (this.sessionStats.newVideosAdded / this.sessionStats.apiUnitsUsed * 100).toFixed(2)
          : '0.00',
        videosPerSecond: duration > 0 
          ? (this.sessionStats.newVideosAdded / (duration / 1000)).toFixed(2)
          : '0.00'
      }
    };

    console.log('\n📊 =======실시간 검색 완료 리포트=======');
    console.log(`🔍 세션 ID: ${report.sessionId}`);
    console.log(`🎯 검색 키워드: "${report.keyword}" (${report.category})`);
    console.log(`⏱️ 처리 시간: ${report.duration}초`);
    console.log(`📄 검색된 페이지: ${report.statistics.totalPages}개`);
    console.log(`📺 총 발견 영상: ${report.statistics.totalVideosFound}개`);
    console.log(`✨ 새로 추가된 영상: ${report.statistics.newVideosAdded}개`);
    console.log(`🔄 중복 제거된 영상: ${report.statistics.duplicatesSkipped}개`);
    console.log(`❌ 분류 실패 영상: ${report.statistics.classificationErrors}개`);
    console.log(`📺 업데이트된 채널: ${report.statistics.channelsUpdated}개`);
    console.log(`💰 사용된 API Units: ${report.statistics.apiUnitsUsed}개`);
    console.log(`📈 성공률: ${report.performance.successRate}%`);
    console.log(`🎯 효율성: ${report.performance.efficiency} 영상/100units`);
    console.log(`⚡ 처리 속도: ${report.performance.videosPerSecond} 영상/초`);
    console.log('=====================================\n');

    return report;
  }

  /**
   * 🔧 유틸리티 메서드들
   */
  generateSessionId() {
    return `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  resetSessionStats(sessionId, keywordRequest) {
    this.sessionStats = {
      sessionId: sessionId,
      startTime: Date.now(),
      keyword: keywordRequest.keyword,
      category: keywordRequest.category || '사용자 검색',
      totalVideosFound: 0,
      newVideosAdded: 0,
      duplicatesSkipped: 0,
      classificationErrors: 0,
      channelsToUpdate: new Set(),
      apiUnitsUsed: 0,
      totalPages: 0,
      isProcessing: true
    };
  }

  getPartialResults() {
    return {
      sessionId: this.sessionStats.sessionId,
      keyword: this.sessionStats.keyword,
      partialStats: { ...this.sessionStats },
      failedClassifications: this.failedClassifications.length
    };
  }

  getCurrentSession() {
    return {
      ...this.sessionStats,
      failedClassifications: this.failedClassifications.length,
      isActive: this.sessionStats.isProcessing
    };
  }

  getFailedClassifications(sessionId = null) {
    if (sessionId) {
      return this.failedClassifications.filter(item => item.sessionId === sessionId);
    }
    return this.failedClassifications;
  }
}

// 전역 인스턴스
const realtimeKeywordSearchService = new RealtimeKeywordSearchService();

/**
 * 🎯 주요 함수들
 */

// 실시간 키워드 검색 실행
export async function searchKeywordRealtime(keywordRequest) {
  return await realtimeKeywordSearchService.searchKeywordRealtime(keywordRequest);
}

// 현재 세션 상태 조회
export function getCurrentSearchSession() {
  return realtimeKeywordSearchService.getCurrentSession();
}

// 분류 실패 영상 조회
export function getRealtimeFailedClassifications(sessionId = null) {
  return realtimeKeywordSearchService.getFailedClassifications(sessionId);
}

export default realtimeKeywordSearchService;

/**
 * 🎯 사용 예시 (v1.0 실시간 검색)
 * 
 * // 1. 기본 키워드 검색
 * const result = await searchKeywordRealtime({
 *   keyword: '먹방',
 *   category: '음식',
 *   min_view_count: 50000,
 *   min_engagement_rate: 2.0,
 *   target_count: 30,
 *   max_pages: 2
 * });
 * 
 * // 2. 빠른 검색 (기본 설정)
 * const quickResult = await searchKeywordRealtime({
 *   keyword: 'ASMR'
 * });
 * 
 * // 3. 현재 세션 상태 확인
 * const session = getCurrentSearchSession();
 * console.log(`현재 처리 중: ${session.keyword} (${session.isActive ? '진행중' : '완료'})`);
 * 
 * // 4. 분류 실패 영상 조회
 * const failedVideos = getRealtimeFailedClassifications();
 * console.log(`분류 실패 영상 ${failedVideos.length}개`);
 */ 