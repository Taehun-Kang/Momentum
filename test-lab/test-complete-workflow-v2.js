// =============================================================================
// 🧪 test-complete-workflow-v2.js - 전체 워크플로우 통합 테스트 (ES Modules)
// =============================================================================
// 
// 📋 기능: 1-6단계 전체 모듈 통합 테스트
// 🔄 워크플로우: 키워드 선택 → Bright Data 수집 → 데이터 변환 → DB 저장 → 키워드 업데이트
// 🎯 목표: 전체 v2 캐시 시스템 검증
// 
// =============================================================================

// ES Modules 임포트
import KeywordSelector from '../backend/services/v2_cache/keywordSelector.js';
import BrightDataAPI from '../backend/services/v2_cache/brightDataAPI.js';
import VideoDataProcessor from '../backend/services/v2_cache/videoDataProcessor.js';
import VideoCacheService from '../backend/services/v2_cache/videoCacheService.js';
import KeywordUpdater from '../backend/services/v2_cache/keywordUpdater.js';

/**
 * 🚀 전체 워크플로우 통합 테스트 클래스 (ES Modules)
 */
class CompleteWorkflowTest {
  constructor() {
    // 📊 테스트 통계
    this.stats = {
      startTime: Date.now(),
      keywords: 0,
      rawVideos: 0,
      filteredShorts: 0,
      savedVideos: 0,
      updatedKeywords: 0,
      errors: []
    };

    // 🔧 모듈 인스턴스
    this.keywordSelector = new KeywordSelector();
    this.brightDataAPI = new BrightDataAPI();
    this.videoProcessor = new VideoDataProcessor();
    this.cacheService = new VideoCacheService();
    this.keywordUpdater = new KeywordUpdater();
  }

  /**
   * 🎯 전체 워크플로우 실행 (메인 함수)
   */
  async runCompleteWorkflow() {
    try {
      console.log('🚀 =====전체 워크플로우 시작===== 🚀');
      console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}\n`);

      // 1단계: 키워드 선택
      const keywords = await this.step1_selectKeywords();
      
      // 2단계: Bright Data 수집 (주석 처리 - 실제 API 호출 방지)
      // const rawData = await this.step2_collectData(keywords);
      
      // 🧪 테스트용 더미 데이터 사용
      const rawData = this.generateDummyData(keywords);
      
      // 3-4단계: 데이터 필터링 및 변환
      const transformedData = await this.step34_processData(rawData);
      
      // 5단계: 데이터베이스 저장 (주석 처리 - 실제 저장 방지)
      // const saveStats = await this.step5_saveToDatabase(transformedData);
      
      // 🧪 테스트용 더미 저장 결과
      const saveStats = { saved: transformedData.length, failed: 0 };
      
      // 6단계: 키워드 사용 기록 업데이트 (주석 처리 - 실제 업데이트 방지)
      // const updateStats = await this.step6_updateKeywords(transformedData);
      
      // 🧪 테스트용 더미 업데이트 결과
      const updateStats = { updated: keywords.length, failed: 0 };

      // 📊 최종 결과 출력
      this.showFinalResults(saveStats, updateStats);

    } catch (error) {
      console.error('❌ 전체 워크플로우 실패:', error);
      this.stats.errors.push(error.message);
    }
  }

  /**
   * 1️⃣ 단계: 키워드 선택 (실제 DB 호출)
   */
  async step1_selectKeywords() {
    try {
      console.log('1️⃣ 키워드 선택 시작...');
      
      const keywords = await this.keywordSelector.getTodaysKeywords();
      this.stats.keywords = keywords.length;
      
      console.log(`✅ 키워드 선택 완료: ${keywords.length}개`);
      keywords.forEach((kw, index) => {
        console.log(`   ${index + 1}. ${kw.keyword} (${kw.priority_tier})`);
      });
      console.log('');
      
      return keywords;
      
    } catch (error) {
      console.error('❌ 1단계 실패:', error.message);
      throw error;
    }
  }

  /**
   * 2️⃣ 단계: Bright Data 수집 (주석 처리됨)
   */
  async step2_collectData(keywords) {
    try {
      console.log('2️⃣ Bright Data 수집 시작...');
      console.log('⚠️  실제 API 호출 - 진행률 모니터링 시작');
      
      // 수집 시작
      const snapshotId = await this.brightDataAPI.startCollection(keywords, 50); // 키워드당 50개
      
      // 완료 대기
      await this.brightDataAPI.waitForCompletion(snapshotId);
      
      // 데이터 다운로드
      const rawData = await this.brightDataAPI.downloadData(snapshotId);
      this.stats.rawVideos = rawData.length;
      
      console.log(`✅ 데이터 수집 완료: ${rawData.length}개 영상\n`);
      return rawData;
      
    } catch (error) {
      console.error('❌ 2단계 실패:', error.message);
      throw error;
    }
  }

  /**
   * 3️⃣-4️⃣ 단계: 데이터 필터링 및 변환
   */
  async step34_processData(rawData) {
    try {
      console.log('3️⃣-4️⃣ 데이터 처리 시작...');
      
      // 3단계: Shorts 필터링
      const filteredShorts = this.videoProcessor.filterShorts(rawData);
      this.stats.filteredShorts = filteredShorts.length;
      
      // 4단계: DB 형식으로 변환
      const transformedData = this.videoProcessor.transformToDBFormat(filteredShorts);
      
      console.log(`✅ 데이터 처리 완료: ${transformedData.length}개 변환\n`);
      return transformedData;
      
    } catch (error) {
      console.error('❌ 3-4단계 실패:', error.message);
      throw error;
    }
  }

  /**
   * 5️⃣ 단계: 데이터베이스 저장 (주석 처리됨)
   */
  async step5_saveToDatabase(transformedData) {
    try {
      console.log('5️⃣ 데이터베이스 저장 시작...');
      console.log('⚠️  실제 DB 저장 - UPSERT 실행');
      
      const saveStats = await this.cacheService.saveVideos(transformedData);
      this.stats.savedVideos = saveStats.saved;
      
      console.log(`✅ DB 저장 완료: ${saveStats.saved}개 저장\n`);
      return saveStats;
      
    } catch (error) {
      console.error('❌ 5단계 실패:', error.message);
      throw error;
    }
  }

  /**
   * 6️⃣ 단계: 키워드 사용 기록 업데이트 (주석 처리됨)
   */
  async step6_updateKeywords(transformedData) {
    try {
      console.log('6️⃣ 키워드 업데이트 시작...');
      console.log('⚠️  실제 DB 업데이트 - update_keyword_usage_v2() 호출');
      
      const updateStats = await this.keywordUpdater.updateKeywordUsage(transformedData);
      this.stats.updatedKeywords = updateStats.updated;
      
      console.log(`✅ 키워드 업데이트 완료: ${updateStats.updated}개 성공\n`);
      return updateStats;
      
    } catch (error) {
      console.error('❌ 6단계 실패:', error.message);
      throw error;
    }
  }

  /**
   * 📊 최종 결과 출력
   */
  showFinalResults(saveStats, updateStats) {
    const endTime = Date.now();
    const duration = Math.round((endTime - this.stats.startTime) / 1000);

    console.log('🎉 ===== 전체 워크플로우 완료 ===== 🎉');
    console.log(`⏰ 종료 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log(`⌛ 총 실행 시간: ${duration}초\n`);
    
    console.log('📊 처리 통계:');
    console.log(`  1️⃣ 선택된 키워드: ${this.stats.keywords}개`);
    console.log(`  2️⃣ 수집된 원본 영상: ${this.stats.rawVideos}개`);
    console.log(`  3️⃣ 필터링된 Shorts: ${this.stats.filteredShorts}개`);
    console.log(`  4️⃣ 변환된 데이터: ${this.stats.filteredShorts}개`);
    console.log(`  5️⃣ 저장된 영상: ${saveStats.saved}개`);
    console.log(`  6️⃣ 업데이트된 키워드: ${updateStats.updated}개`);
    
    // 성공률 계산
    const conversionRate = this.stats.rawVideos > 0 
      ? Math.round((this.stats.filteredShorts / this.stats.rawVideos) * 100) 
      : 0;
    
    console.log(`\n📈 성과 지표:`);
    console.log(`  Shorts 변환율: ${conversionRate}%`);
    console.log(`  저장 성공률: ${saveStats.saved > 0 ? '100' : '0'}%`);
    console.log(`  키워드 업데이트율: ${updateStats.updated > 0 ? '100' : '0'}%`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ 발생한 에러 (${this.stats.errors.length}개):`);
      this.stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🏁 전체 워크플로우 테스트 완료! 🏁');
  }

  /**
   * 🧪 테스트용 더미 데이터 생성
   */
  generateDummyData(keywords) {
    console.log('🧪 테스트용 더미 데이터 생성...');
    
    const dummyData = [];
    
    keywords.forEach((keywordObj, keywordIndex) => {
      // 키워드당 20개 더미 영상 생성
      for (let i = 0; i < 20; i++) {
        const videoId = `${keywordIndex}${i.toString().padStart(2, '0')}test${Math.random().toString(36).substr(2, 5)}`;
        
        dummyData.push({
          video_id: videoId,
          url: `https://youtube.com/shorts/${videoId}`,
          title: `${keywordObj.keyword} 테스트 영상 ${i + 1}`,
          description: `${keywordObj.keyword} 관련 테스트 영상입니다`,
          youtuber: `테스트채널${i + 1}`,
          youtuber_id: `UC${Math.random().toString(36).substr(2, 20)}`,
          views: Math.floor(Math.random() * 100000),
          likes: Math.floor(Math.random() * 5000),
          num_comments: Math.floor(Math.random() * 500),
          subscribers: Math.floor(Math.random() * 50000),
          video_length: Math.floor(Math.random() * 60) + 15, // 15-75초
          post_type: 'short', // 중요: Shorts 필터링을 위함
          discovery_input: {
            keyword: keywordObj.keyword,
            num_of_posts: 200,
            country: 'KR'
          },
          tags: [`${keywordObj.keyword}`, '테스트', 'shorts']
        });
      }
    });
    
    this.stats.rawVideos = dummyData.length;
    console.log(`✅ 더미 데이터 생성 완료: ${dummyData.length}개\n`);
    
    return dummyData;
  }
}

// =============================================================================
// 🚀 테스트 실행 함수
// =============================================================================

async function runTest() {
  const test = new CompleteWorkflowTest();
  await test.runCompleteWorkflow();
}

// ES Modules에서 메인 스크립트 확인
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(console.error);
}

// ES Modules 내보내기
export default CompleteWorkflowTest; 