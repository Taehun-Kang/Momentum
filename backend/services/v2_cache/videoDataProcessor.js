// =============================================================================
// 🔄 videoDataProcessor.js - 3-4단계: 영상 데이터 필터링 및 변환 모듈 (ES Modules)
// =============================================================================
// 
// 📋 기능: Bright Data 수집 데이터 → videos_cache_v2 테이블 형식 변환
// 🔄 워크플로우: Shorts 필터링 → 데이터 변환 → 검증
// 🎯 목표: post_type이 'short'인 영상만 선별하여 DB 저장 형식으로 변환
// 
// =============================================================================

/**
 * 🔄 VideoDataProcessor 클래스
 * Bright Data API 응답 데이터를 videos_cache_v2 테이블 형식으로 변환 (ES Modules)
 */
class VideoDataProcessor {
  /**
   * 🏗️ 생성자 - 기본 설정 초기화
   */
  constructor() {
    // ⚙️ 필터링 설정
    this.validPostTypes = ['short'];           // 허용할 post_type 목록
    this.requiredFields = ['url', 'title', 'video_id'];  // 필수 필드 목록
  }

  /**
   * 🎯 Shorts 필터링 (3단계)
   * 
   * 📝 필터링 조건:
   * 1. post_type이 'short'인 영상만
   * 2. 필수 필드 존재 확인 (url, title, video_id)
   * 
   * ❗ 중복 제거는 데이터베이스 저장 시점에 처리 (UPSERT 활용)
   * 
   * @param {Array} rawData - Bright Data에서 받은 원본 영상 데이터
   * @returns {Array} 필터링된 Shorts 영상 배열
   */
  filterShorts(rawData) {
    try {
      console.log(`📊 필터링 시작: ${rawData.length}개 영상 → Shorts만 선별`);

      // post_type이 'short'이고 필수 필드가 있는 영상만 필터링
      const filteredShorts = rawData.filter(video => {
        // post_type 확인
        if (!this.validPostTypes.includes(video.post_type)) {
          return false;
        }

        // 필수 필드 존재 확인
        for (const field of this.requiredFields) {
          if (!video[field] || video[field].toString().trim() === '') {
            return false;
          }
        }

        return true;
      });

      console.log(`✅ Shorts 필터링 완료: ${rawData.length}개 → ${filteredShorts.length}개 (${Math.round(filteredShorts.length/rawData.length*100)}%)`);
      
      return filteredShorts;

    } catch (error) {
      console.error('❌ Shorts 필터링 실패:', error.message);
      throw error;
    }
  }

  /**
   * 🔧 데이터 변환 (4단계)
   * 
   * 📝 변환 과정:
   * 1. Bright Data 필드 → videos_cache_v2 필드 매핑
   * 2. discovery_input에서 키워드 추출
   * 3. 기본값 설정 및 데이터 타입 변환
   * 
   * @param {Array} filteredVideos - 필터링된 Shorts 영상 배열
   * @returns {Array} videos_cache_v2 형식으로 변환된 데이터
   */
  transformToDBFormat(filteredVideos) {
    try {
      console.log(`🔧 데이터 변환 시작: ${filteredVideos.length}개 영상`);

      const transformedVideos = filteredVideos.map((video) => ({
        // 🔑 기본 영상 정보 (Bright Data 직접 매핑)
        video_id: video.video_id,                     // YouTube 영상 ID (직접 제공)
        url: video.url,                               // 영상 URL
        title: video.title || 'Untitled',             // 영상 제목
        description: video.description || '',         // 영상 설명
        youtuber: video.youtuber || 'Unknown',        // 채널명
        youtuber_id: video.youtuber_id || null,       // 채널 ID
        channel_url: video.channel_url || null,       // 채널 URL
        handle_name: video.handle_name || null,       // @채널핸들
        avatar_img_channel: video.avatar_img_channel || null, // 채널 아바타

        // 📊 영상 메트릭 (숫자 파싱)
        views: this.parseNumber(video.views) || 0,
        likes: this.parseNumber(video.likes) || 0,
        num_comments: this.parseNumber(video.num_comments) || 0,
        subscribers: this.parseNumber(video.subscribers) || 0,
        video_length: this.parseNumber(video.video_length) || 60,

        // 🎬 메타데이터
        date_posted: this.parseDate(video.date_posted),
        preview_image: video.preview_image || null,   // 썸네일 URL
        quality_label: video.quality_label || null,   // 화질
        post_type: video.post_type,                   // 게시물 타입
        verified: Boolean(video.verified),            // 채널 인증 여부

        // 🏷️ 태그 및 분류 정보
        tags: this.parseTags(video.tags),             // YouTube 원본 태그 (JSON)
        
        // LLM 분류 (추후 채움)
        topic_tags: [],
        mood_tags: [],
        context_tags: [],
        genre_tags: [],

        // ⚠️ 에러 및 경고
        error: video.error || null,
        error_code: video.error_code || null,
        warning: video.warning || null,
        warning_code: video.warning_code || null,

        // 📋 수집 메타데이터 (discovery_input에서 키워드 추출)
        data_source: 'bright_data',
        collection_keyword: this.extractKeywordFromDiscovery(video.discovery_input),
        collection_batch_id: this.generateBatchId(),
        collection_filters: video.discovery_input || {},

        // 🔍 기본 설정
        is_playable: true,
        is_shorts: true,
        is_korean_content: true,
        classification_confidence: null,
        classified_by: null,
        classified_at: null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후
      }));

      console.log(`✅ 데이터 변환 완료: ${transformedVideos.length}개 영상`);
      this.logTransformationStats(transformedVideos);

      return transformedVideos;

    } catch (error) {
      console.error('❌ 데이터 변환 실패:', error.message);
      throw error;
    }
  }

  // =============================================================================
  // 🔧 내부 헬퍼 함수들
  // =============================================================================

  /**
   * 🔍 discovery_input에서 키워드 추출
   * 
   * 📝 discovery_input 구조 예시:
   * {"keyword":"먹방","num_of_posts":"100","country":"KR","start_date":"","end_date":""}
   * 
   * @param {Object} discoveryInput - Bright Data discovery_input 객체
   * @returns {string} 추출된 키워드
   */
  extractKeywordFromDiscovery(discoveryInput) {
    try {
      // discovery_input이 객체가 아니면 파싱 시도
      let input = discoveryInput;
      if (typeof discoveryInput === 'string') {
        input = JSON.parse(discoveryInput);
      }
      
      // keyword 또는 keyword_search 필드에서 추출
      return input?.keyword || input?.keyword_search || 'unknown';
      
    } catch (error) {
      console.error('discovery_input 파싱 실패:', error.message);
      return 'unknown';
    }
  }

  /**
   * 🔢 숫자 파싱 (문자열 → 숫자 변환)
   * 
   * 📝 변환 규칙:
   * - 이미 숫자면 그대로 반환
   * - 문자열이면 "1.2K", "3.5M" 형태 처리
   * 
   * @param {any} value - 변환할 값
   * @returns {number|null} 변환된 숫자
   */
  parseNumber(value) {
    // 이미 숫자면 그대로 반환
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      // "1.2K", "3.5M" 형태 처리
      const cleaned = value.replace(/[,\s]/g, '').toLowerCase();
      if (cleaned.includes('k')) return Math.round(parseFloat(cleaned) * 1000);
      if (cleaned.includes('m')) return Math.round(parseFloat(cleaned) * 1000000);
      return parseInt(cleaned) || null;
    }
    return null;
  }

  /**
   * 📅 날짜 파싱
   * @param {any} dateValue - 날짜 값
   * @returns {Date|null} 파싱된 날짜
   */
  parseDate(dateValue) {
    if (!dateValue) return null;
    
    try {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      return null;
    }
  }

  /**
   * 🏷️ 태그 파싱 (JSON 형태로 변환)
   * @param {any} tagsValue - 태그 값
   * @returns {Object} JSON 형태의 태그
   */
  parseTags(tagsValue) {
    if (!tagsValue) return [];
    
    try {
      // 이미 배열이면 그대로 반환
      if (Array.isArray(tagsValue)) return tagsValue;
      
      // 문자열이면 JSON 파싱 시도
      if (typeof tagsValue === 'string') {
        return JSON.parse(tagsValue);
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 🆔 배치 ID 생성
   * @returns {string} 고유한 배치 ID
   */
  generateBatchId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `batch_${timestamp}_${random}`;
  }

  /**
   * 📊 변환 통계 로깅
   * @param {Array} videos - 변환된 영상 배열
   */
  logTransformationStats(videos) {
    console.log('\n🔄 ===== 데이터 변환 통계 =====');
    
    // 키워드별 분포
    const keywordCounts = {};
    videos.forEach(video => {
      const keyword = video.collection_keyword;
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    });

    console.log('키워드별 변환 결과:');
    Object.entries(keywordCounts).forEach(([keyword, count]) => {
      console.log(`  - ${keyword}: ${count}개`);
    });

    // 평균 메트릭
    if (videos.length > 0) {
      const avgViews = Math.round(videos.reduce((sum, v) => sum + v.views, 0) / videos.length);
      const avgLikes = Math.round(videos.reduce((sum, v) => sum + v.likes, 0) / videos.length);
      
      console.log('평균 메트릭:');
      console.log(`  - 조회수: ${avgViews.toLocaleString()}회`);
      console.log(`  - 좋아요: ${avgLikes.toLocaleString()}개`);
    }

    // 에러/경고 통계
    const errorsCount = videos.filter(v => v.error).length;
    const warningsCount = videos.filter(v => v.warning).length;
    
    if (errorsCount > 0 || warningsCount > 0) {
      console.log('품질 현황:');
      console.log(`  - 에러: ${errorsCount}개`);
      console.log(`  - 경고: ${warningsCount}개`);
    }
    
    console.log('==============================\n');
  }
}

// ES Modules 내보내기
export default VideoDataProcessor; 