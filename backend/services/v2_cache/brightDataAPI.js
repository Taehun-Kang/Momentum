// =============================================================================
// 🌐 brightDataAPI.js - 2단계: Bright Data API 통합 모듈 (ES Modules)
// =============================================================================
// 
// 📋 기능: Bright Data API를 통한 YouTube 영상 데이터 수집
// 🔄 워크플로우: 수집 시작 → 진행률 모니터링 → 완료 대기 → 데이터 다운로드
// 🔧 의존성: built-in fetch (Node.js 18+), 환경변수 (BRIGHT_DATA_*)
// 
// =============================================================================

/**
 * 🌐 BrightDataAPI 클래스
 * Bright Data API를 통한 YouTube 영상 수집 통합 관리 (ES Modules)
 */
class BrightDataAPI {
  /**
   * 🏗️ 생성자 - API 설정 및 엔드포인트 초기화
   */
  constructor() {
    // 🔑 API 인증 정보
    this.apiToken = process.env.BRIGHT_DATA_API_TOKEN;
    this.datasetId = process.env.BRIGHT_DATA_DATASET_ID;
    this.baseUrl = process.env.BRIGHT_DATA_BASE_URL;
    
    // ⚙️ 기본 설정
    this.defaultVideosPerKeyword = 200;     // 키워드별 기본 수집 영상 수
    this.pollInterval = 600000;             // 진행률 확인 간격 (10분)
    this.requestTimeout = 60000;            // 요청 타임아웃 (60초) - 무한 대기 방지용
    
    // 🌐 API 엔드포인트 구성 (올바른 URL 구조)
    this.endpoints = {
      // 수집 시작 - limit_per_input 파라미터 추가
      trigger: `${this.baseUrl}?dataset_id=${this.datasetId}&include_errors=true&type=discover_new&discover_by=search_filters&limit_per_input=${this.defaultVideosPerKeyword}`,
      // 진행률 확인 - progress 엔드포인트에 snapshot_id 추가
      snapshot: (snapshotId) => `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`,
      // 데이터 다운로드 - ndjson 형식으로 변경
      download: (snapshotId) => `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=ndjson`
    };
    
    // ✅ 환경변수 검증
    this.validateConfig();
  }

  /**
   * 🔍 환경변수 설정 검증
   * @throws {Error} 필수 환경변수 누락 시
   */
  validateConfig() {
    const requiredEnvs = ['BRIGHT_DATA_API_TOKEN', 'BRIGHT_DATA_DATASET_ID', 'BRIGHT_DATA_BASE_URL'];
    const missing = requiredEnvs.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Bright Data 환경변수 누락: ${missing.join(', ')}`);
    }
    
    console.log('✅ Bright Data API 설정 확인 완료');
  }

  /**
   * 🚀 키워드 수집 시작 (메인 함수)
   * 
   * 📝 동작 과정:
   * 1. 키워드 배열을 Bright Data 요청 형식으로 변환
   * 2. POST 요청으로 수집 작업 시작 (올바른 URL + body)
   * 3. snapshot_id 반환 (진행률 추적용)
   * 
   * @param {Array} keywords - 선택된 키워드 배열 (keywordSelector에서 받은 데이터)
   * @param {number} videosPerKeyword - 키워드별 수집할 영상 수 (기본값: 200)
   * @returns {Promise<string>} snapshot_id
   * @throws {Error} API 호출 실패, 잘못된 응답 시
   */
  async startCollection(keywords, videosPerKeyword = this.defaultVideosPerKeyword) {
    try {
      console.log(`🚀 Bright Data 수집 시작: ${keywords.length}개 키워드, 각 ${videosPerKeyword}개 영상`);
      
      // 1. 요청 데이터 구성 (POST body용)
      const requestData = this.buildRequestData(keywords, videosPerKeyword);
      
      // 2. POST 요청으로 API 호출 (올바른 URL)
      const response = await this.makeRequest('POST', this.endpoints.trigger, requestData);
      
      // 3. 응답 검증 및 snapshot_id 추출
      if (!response.snapshot_id) {
        throw new Error('snapshot_id가 응답에 포함되지 않음');
      }
      
      console.log(`✅ 수집 작업 시작됨: snapshot_id = ${response.snapshot_id}`);
      console.log(`📊 총 예상 수집량: ${keywords.length * videosPerKeyword}개 영상`);
      console.log(`⏰ 진행률 확인 간격: 10분마다`);
      
      return response.snapshot_id;
      
    } catch (error) {
      console.error('❌ 수집 시작 실패:', error.message);
      throw error;
    }
  }

  /**
   * ⏳ 수집 완료까지 대기 (진행률 모니터링)
   * 
   * 📝 동작 과정:
   * 1. 주기적으로 snapshot 상태 확인 (10분 간격)
   * 2. 상태가 'ready'가 될 때까지 대기
   * 3. 진행률 로그 출력
   * 
   * @param {string} snapshotId - 수집 작업 ID
   * @returns {Promise<Object>} 완료된 수집 정보
   * @throws {Error} 타임아웃, API 호출 실패 시
   */
  async waitForCompletion(snapshotId) {
    try {
      console.log(`⏳ 수집 진행률 모니터링 시작: ${snapshotId}`);
      console.log(`📋 확인 간격: 10분마다`);
      
      let attempt = 0;
      const maxAttempts = 18; // 10분 * 18 = 최대 3시간 대기
      
      while (attempt < maxAttempts) {
        // 1. 진행률 확인
        const status = await this.checkProgress(snapshotId);
        
        // 2. 완료 상태 확인
        if (status.state === 'ready') {
          const records = status.total_rows || 0;
          const duration = status.collection_duration ? Math.round(status.collection_duration / 1000) : 'N/A';
          console.log(`🎉 수집 완료! 총 ${records}개 레코드 수집 (소요시간: ${duration}초)`);
          return status;
        }
        
        // 3. 실패 상태 확인
        if (status.state === 'failed') {
          throw new Error(`수집 작업 실패: ${status.error || '알 수 없는 오류'}`);
        }
        
        // 4. 진행 중 상태 로깅 (간소화)
        if (status.state === 'running') {
          const elapsedTime = Math.round((attempt * this.pollInterval) / 1000 / 60); // 분
          console.log(`📊 수집 진행 중... (${elapsedTime}분 경과, ${attempt + 1}/${maxAttempts}번째 확인)`);
        } else {
          console.log(`📋 현재 상태: ${status.state}`);
        }
        
        // 5. 대기 후 재시도
        await this.sleep(this.pollInterval);
        attempt++;
      }
      
      throw new Error(`수집 타임아웃: ${maxAttempts * this.pollInterval / 1000 / 60}분 초과`);
      
    } catch (error) {
      console.error('❌ 진행률 모니터링 실패:', error.message);
      throw error;
    }
  }

  /**
   * 📥 완료된 데이터 다운로드 (NDJSON 형식)
   * 
   * 📝 동작 과정:
   * 1. snapshot_id로 완성된 데이터 다운로드 (NDJSON 형식)
   * 2. 줄 단위로 파싱하여 JSON 배열로 변환
   * 3. 데이터 검증 및 통계 출력
   * 
   * @param {string} snapshotId - 수집 작업 ID
   * @returns {Promise<Array>} 수집된 영상 데이터 배열
   * @throws {Error} 다운로드 실패, 빈 데이터 시
   */
  async downloadData(snapshotId) {
    try {
      console.log(`📥 데이터 다운로드 시작: ${snapshotId}`);
      
      // 1. 데이터 다운로드 (NDJSON 형식 - 텍스트로 받기)
      const response = await this.makeRequestText('GET', this.endpoints.download(snapshotId));
      
      // 2. NDJSON 파싱 (줄 단위로 JSON 파싱)
      const lines = response.split('\n').filter(line => line.trim());
      const data = [];
      
      for (const line of lines) {
        try {
          const jsonObject = JSON.parse(line);
          data.push(jsonObject);
        } catch (parseError) {
          console.warn('JSON 파싱 실패한 줄:', line.substring(0, 100) + '...');
        }
      }
      
      // 3. 데이터 검증
      if (data.length === 0) {
        throw new Error('파싱된 데이터가 없습니다');
      }
      
      // 4. 데이터 통계 출력 (간소화)
      console.log(`✅ NDJSON 파싱 완료: ${data.length}개 레코드`);
      // 상세 통계는 상위 모듈에서 출력하므로 여기서는 생략
      
      return data;
      
    } catch (error) {
      console.error('❌ 데이터 다운로드 실패:', error.message);
      throw error;
    }
  }

  /**
   * 📊 진행률 확인 (단일 호출) - 간소화
   * 
   * @param {string} snapshotId - 수집 작업 ID  
   * @returns {Promise<Object>} 진행률 상태 정보
   */
  async checkProgress(snapshotId) {
    try {
      const response = await this.makeRequest('GET', this.endpoints.snapshot(snapshotId));
      return {
        state: response.status,          // 'running', 'ready', 'failed' 등
        total_rows: response.records,    // 수집된 행 수 (완료 시 표시용)
        collection_duration: response.collection_duration  // 소요 시간 (완료 시 표시용)
      };
    } catch (error) {
      console.error('진행률 확인 실패:', error.message);
      throw error;
    }
  }

  // =============================================================================
  // 🔧 내부 헬퍼 함수들 
  // =============================================================================

  /**
   * 🏗️ Bright Data 요청 데이터 구성 (올바른 JSON 배열 형식)
   * 
   * @param {Array} keywords - 키워드 배열
   * @param {number} videosPerKeyword - 키워드별 영상 수 (현재 사용 안함)
   * @returns {Array} API 요청용 JSON 배열
   */
  buildRequestData(keywords, videosPerKeyword) {
    // 각 키워드별로 검색 조건 객체 생성
    return keywords.map(keywordObj => ({
      keyword_search: keywordObj.keyword,
      type: "Video",
      duration: "Under 4 minutes",
      country: "KR",
      upload_date: "",
      features: ""
    }));
  }

  /**
   * 🌐 HTTP 요청 실행 (재시도 없음)
   * 
   * 📝 참고: 재시도 로직 제거됨 (실패 시 처음부터 다시 시작하는 것이 안전)
   * 📝 requestTimeout: 네트워크 요청의 무한 대기를 방지하기 위해 유지
   * 
   * @param {string} method - HTTP 메소드 ('GET', 'POST')
   * @param {string} url - 요청 URL
   * @param {Object} data - 요청 데이터 (POST만)
   * @returns {Promise<Object>} 응답 데이터
   * @throws {Error} API 호출 실패 시
   */
  async makeRequest(method, url, data = null) {
    try {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        signal: AbortSignal.timeout(this.requestTimeout) // Node.js 18+ timeout
      };
      
      // POST 요청일 때만 Content-Type 추가
      if (data && method === 'POST') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error(`${method} ${url} 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 🌐 HTTP 요청 실행 (텍스트 형식으로 응답 받기)
   * 
   * 📝 참고: 재시도 로직 제거됨 (실패 시 처음부터 다시 시작하는 것이 안전)
   * 📝 requestTimeout: 네트워크 요청의 무한 대기를 방지하기 위해 유지
   * 
   * @param {string} method - HTTP 메소드 ('GET', 'POST')
   * @param {string} url - 요청 URL
   * @returns {Promise<string>} 응답 텍스트
   * @throws {Error} API 호출 실패 시
   */
  async makeRequestText(method, url) {
    try {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        signal: AbortSignal.timeout(this.requestTimeout) // Node.js 18+ timeout
      };
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
      
    } catch (error) {
      console.error(`${method} ${url} 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 📊 수집 데이터 통계 출력
   * 
   * @param {Array} data - 수집된 영상 데이터
   */
  logDataStatistics(data) {
    console.log('\n📊 ===== 수집 데이터 통계 =====');
    console.log(`총 영상 수: ${data.length}개`);
    
    // 키워드별 분포 (있다면)
    if (data.length > 0 && data[0].search_keyword) {
      const keywordCounts = {};
      data.forEach(video => {
        const keyword = video.search_keyword || 'unknown';
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
      
      console.log('키워드별 수집량:');
      Object.entries(keywordCounts).forEach(([keyword, count]) => {
        console.log(`  - ${keyword}: ${count}개`);
      });
    }
    
    console.log('==============================\n');
  }

  /**
   * ⏰ 지연 함수 (비동기 대기)
   * 
   * @param {number} ms - 대기 시간 (밀리초)
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ES Modules 내보내기
export default BrightDataAPI; 