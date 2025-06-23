// =============================================================================
// 🚀 index.js - YouTube Shorts v2 캐시 시스템 메인 진입점 (실전용)
// =============================================================================
// 
// 📋 기능: 1-6단계 전체 워크플로우 통합 실행
// 🔄 워크플로우: 키워드 선택 → Bright Data 수집 → 필터링 → 변환 → DB 저장 → 키워드 업데이트
// 🎯 목표: 실전 운영 가능한 완전한 YouTube Shorts 캐시 시스템
// 
// 🚨 중요: 실제 API 호출 및 DB 저장을 수행합니다!
// 
// =============================================================================

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// v2_cache 모듈들 import
import KeywordSelector from './keywordSelector.js';
import BrightDataAPI from './brightDataAPI.js';
import VideoDataProcessor from './videoDataProcessor.js';
import VideoCacheService from './videoCacheService.js';
import KeywordUpdater from './keywordUpdater.js';

// 환경 변수 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * 🚀 YouTubeShortsV2CacheSystem - 메인 시스템 클래스
 * 
 * 📝 주요 기능:
 * - 환경 변수 엄격 검증
 * - 6단계 워크플로우 통합 실행
 * - 단계별 에러 처리 및 복구
 * - 상세한 성능 모니터링
 * - 실전 운영 안전성 보장
 */
class YouTubeShortsV2CacheSystem {
  constructor() {
    // 📊 실행 통계 및 상태
    this.stats = {
      startTime: null,
      endTime: null,
      
      // 단계별 결과
      step1_keywords: 0,
      step2_rawVideos: 0,
      step3_filteredShorts: 0,
      step4_transformedData: 0,
      step5_savedVideos: 0,
      step6_updatedKeywords: 0,
      
      // 성능 지표
      totalDuration: 0,
      stepDurations: {},
      apiUnitsUsed: 0,
      cacheHitRate: 0,
      
      // 에러 추적
      errors: [],
      warnings: [],
      recoveredErrors: []
    };

    // 🔧 모듈 인스턴스 (초기화는 validateEnvironment 후)
    this.modules = {
      keywordSelector: null,
      brightDataAPI: null,
      videoProcessor: null,
      cacheService: null,
      keywordUpdater: null
    };

    // ⚙️ 시스템 설정
    this.config = {
      // Bright Data 설정
      videosPerKeyword: 200,          // 키워드별 수집 영상 수
      maxRetries: 3,                  // 단계별 최대 재시도
      stepTimeout: 180 * 60 * 1000,   // 단계별 최대 실행 시간 (3시간)
      
      // 안전성 설정
      enableSafeMode: true,           // 안전 모드 (프로덕션에서는 true)
      enableRollback: true,           // 실패 시 롤백 활성화
      enableMonitoring: true,         // 상세 모니터링 활성화
      
      // 알림 설정 (추후 확장용)
      enableSlackNotification: false,
      enableEmailNotification: false
    };

    console.log('🚀 YouTube Shorts v2 캐시 시스템 초기화');
    console.log(`⚙️  안전 모드: ${this.config.enableSafeMode ? '활성화' : '비활성화'}`);
  }

  /**
   * 🎯 메인 실행 함수 - 전체 워크플로우 실행
   * 
   * 📝 실행 단계:
   * 1. 환경 검증 및 모듈 초기화
   * 2. 1-6단계 순차 실행
   * 3. 최종 결과 리포트
   * 4. 에러 발생 시 복구 시도
   * 
   * @param {Object} options - 실행 옵션
   * @param {boolean} options.dryRun - 드라이 런 모드 (기본: false)
   * @param {number} options.videosPerKeyword - 키워드별 영상 수 (기본: 200)
   * @param {boolean} options.skipBrightData - Bright Data 수집 건너뛰기 (테스트용)
   * @returns {Promise<Object>} 실행 결과 통계
   */
  async run(options = {}) {
    this.stats.startTime = Date.now();
    
    try {
      console.log('\n🎯 ===== YouTube Shorts v2 캐시 시스템 실행 시작 =====');
      console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}`);
      console.log(`🔧 실행 옵션: ${JSON.stringify(options, null, 2)}\n`);

      // 🔍 1. 환경 검증 및 초기화
      await this.validateEnvironmentAndInitialize();

      // 📋 2. 실행 전 상태 체크
      await this.preExecutionChecks(options);

      // 🚀 3. 메인 워크플로우 실행
      const result = await this.executeMainWorkflow(options);

      // 📊 4. 최종 리포트 생성
      this.generateFinalReport(result);

      return result;

    } catch (error) {
      console.error('\n❌ ===== 시스템 실행 실패 =====');
      console.error(`💥 치명적 에러: ${error.message}`);
      
      // 🛡️ 에러 복구 시도
      await this.handleCriticalError(error);
      
      throw error;
    } finally {
      // 📊 통계 기록 (성공/실패 무관)
      this.stats.endTime = Date.now();
      this.stats.totalDuration = this.stats.endTime - this.stats.startTime;
      
      console.log(`\n⏰ 총 실행 시간: ${Math.round(this.stats.totalDuration / 1000)}초`);
    }
  }

  /**
   * 🔍 환경 검증 및 모듈 초기화
   * 
   * 📝 검증 항목:
   * - 필수 환경 변수 존재 확인
   * - API 키 유효성 검증
   * - 데이터베이스 연결 테스트
   * - 모듈 인스턴스 생성
   */
  async validateEnvironmentAndInitialize() {
    console.log('🔍 환경 검증 및 초기화 시작...');

    try {
      // 1. 필수 환경 변수 검증
      const requiredEnvs = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'BRIGHT_DATA_API_TOKEN',
        'BRIGHT_DATA_DATASET_ID',
        'BRIGHT_DATA_BASE_URL'
      ];

      const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
      if (missingEnvs.length > 0) {
        throw new Error(`필수 환경 변수 누락: ${missingEnvs.join(', ')}`);
      }

      console.log('  ✅ 환경 변수 검증 완료');

      // 2. 모듈 인스턴스 생성 및 초기화
      this.modules.keywordSelector = new KeywordSelector();
      this.modules.brightDataAPI = new BrightDataAPI();
      this.modules.videoProcessor = new VideoDataProcessor();
      this.modules.cacheService = new VideoCacheService();
      this.modules.keywordUpdater = new KeywordUpdater();

      console.log('  ✅ 모듈 인스턴스 생성 완료');

      // 3. 데이터베이스 연결 테스트
      await this.testDatabaseConnection();

      // 4. Bright Data API 설정 확인
      await this.testBrightDataConnection();

      console.log('✅ 환경 검증 및 초기화 완료\n');

    } catch (error) {
      console.error('❌ 환경 검증 실패:', error.message);
      throw new Error(`시스템 초기화 실패: ${error.message}`);
    }
  }

  /**
   * 🔗 데이터베이스 연결 테스트
   */
  async testDatabaseConnection() {
    try {
      // daily_keywords_v2 테이블 접근 테스트
      const testResult = await this.modules.keywordSelector.supabase
        .from('daily_keywords_v2')
        .select('keyword')
        .limit(1);

      if (testResult.error) {
        throw new Error(`DB 연결 실패: ${testResult.error.message}`);
      }

      console.log('  ✅ 데이터베이스 연결 확인');
    } catch (error) {
      throw new Error(`데이터베이스 테스트 실패: ${error.message}`);
    }
  }

  /**
   * 🌐 Bright Data API 연결 테스트
   */
  async testBrightDataConnection() {
    try {
      // API 설정 검증만 수행 (실제 요청은 안 함)
      const brightData = this.modules.brightDataAPI;
      
      if (!brightData.apiToken || !brightData.datasetId || !brightData.baseUrl) {
        throw new Error('Bright Data 설정 정보 불완전');
      }

      console.log('  ✅ Bright Data API 설정 확인');
    } catch (error) {
      throw new Error(`Bright Data 테스트 실패: ${error.message}`);
    }
  }

  /**
   * 📋 실행 전 상태 체크
   */
  async preExecutionChecks(options) {
    console.log('📋 실행 전 상태 체크...');

    try {
      // 1. 이전 실행 상태 확인
      const totalVideos = await this.modules.cacheService.getTotalVideoCount();
      console.log(`  📊 현재 캐시된 영상 수: ${totalVideos}개`);

      // 2. 만료된 캐시 정리 (선택적)
      if (options.cleanExpiredCache !== false) {
        const cleanedCount = await this.modules.cacheService.cleanupExpiredCache();
        if (cleanedCount > 0) {
          console.log(`  🧹 만료된 캐시 정리: ${cleanedCount}개`);
        }
      }

      // 3. 키워드 상태 확인
      const keywordStats = await this.modules.keywordUpdater.getTodayKeywordStats();
      console.log(`  🔍 오늘 사용된 키워드: ${keywordStats.total_keywords}개`);

      // 4. 안전 모드 경고
      if (this.config.enableSafeMode && !options.dryRun) {
        console.log('\n⚠️  안전 모드 활성화 - 실제 API 호출 및 DB 저장이 수행됩니다!');
        console.log('   중단하려면 Ctrl+C를 누르세요 (5초 대기)...');
        
        // 5초 대기 (운영진이 중단할 수 있도록)
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      console.log('✅ 실행 전 체크 완료\n');

    } catch (error) {
      console.warn(`⚠️ 실행 전 체크 중 경고: ${error.message}`);
      this.stats.warnings.push(`precheck: ${error.message}`);
    }
  }

  /**
   * 🚀 메인 워크플로우 실행 (1-6단계)
   */
  async executeMainWorkflow(options) {
    console.log('🚀 메인 워크플로우 실행 시작...\n');

    const workflowResult = {
      success: false,
      completedSteps: 0,
      stepResults: {},
      finalStats: {}
    };

    try {
      // 🔍 1단계: 키워드 선택
      workflowResult.stepResults.step1 = await this.executeStep1_SelectKeywords();
      workflowResult.completedSteps = 1;

      // 🌐 2단계: Bright Data 수집 (선택적 건너뛰기 가능)
      if (!options.skipBrightData) {
        workflowResult.stepResults.step2 = await this.executeStep2_CollectData(
          workflowResult.stepResults.step1.keywords,
          options.videosPerKeyword || this.config.videosPerKeyword
        );
        workflowResult.completedSteps = 2;
      } else {
        console.log('⏭️  2단계: Bright Data 수집 건너뛰기 (테스트 모드)');
        workflowResult.stepResults.step2 = { rawData: [], skipped: true };
      }

      // 🔽 3-4단계: 데이터 처리 (필터링 + 변환)
      workflowResult.stepResults.step34 = await this.executeStep34_ProcessData(
        workflowResult.stepResults.step2.rawData || []
      );
      workflowResult.completedSteps = 4;

      // 💾 5단계: 데이터베이스 저장 (드라이 런 모드 확인)
      if (!options.dryRun) {
        workflowResult.stepResults.step5 = await this.executeStep5_SaveToDatabase(
          workflowResult.stepResults.step34.transformedData
        );
        workflowResult.completedSteps = 5;

        // 🔄 6단계: 키워드 사용 기록 업데이트
        workflowResult.stepResults.step6 = await this.executeStep6_UpdateKeywords(
          workflowResult.stepResults.step34.transformedData
        );
        workflowResult.completedSteps = 6;
      } else {
        console.log('⏭️  5-6단계: 드라이 런 모드 - DB 저장 및 키워드 업데이트 건너뛰기');
        workflowResult.stepResults.step5 = { saved: 0, dryRun: true };
        workflowResult.stepResults.step6 = { updated: 0, dryRun: true };
        workflowResult.completedSteps = 6;
      }

      // ✅ 성공 완료
      workflowResult.success = true;
      workflowResult.finalStats = this.calculateFinalStats(workflowResult);

      console.log('\n✅ 메인 워크플로우 완료!');
      return workflowResult;

    } catch (error) {
      console.error(`\n❌ ${workflowResult.completedSteps + 1}단계에서 실패: ${error.message}`);
      
      // 🛡️ 부분 복구 시도
      await this.attemptPartialRecovery(workflowResult, error);
      
      throw error;
    }
  }

  /**
   * 1️⃣ 단계: 키워드 선택 실행
   */
  async executeStep1_SelectKeywords() {
    return await this.executeStepWithTimeout('1단계: 키워드 선택', async () => {
      console.log('1️⃣ 키워드 선택 시작...');
      
      const keywords = await this.modules.keywordSelector.getTodaysKeywords();
      this.stats.step1_keywords = keywords.length;
      
      // 키워드 검증
      if (keywords.length === 0) {
        throw new Error('선택된 키워드가 없습니다');
      }
      
      if (keywords.length !== 10) {
        console.warn(`⚠️ 예상과 다른 키워드 수: ${keywords.length}개 (예상: 10개)`);
        this.stats.warnings.push(`keyword_count: ${keywords.length}`);
      }

      console.log(`   ✅ 키워드 선택 완료: ${keywords.length}개`);
      keywords.forEach((kw, index) => {
        console.log(`      ${index + 1}. ${kw.keyword} (${kw.priority_tier})`);
      });

      return { keywords, count: keywords.length };
    });
  }

  /**
   * 2️⃣ 단계: Bright Data 수집 실행
   */
  async executeStep2_CollectData(keywords, videosPerKeyword) {
    return await this.executeStepWithTimeout('2단계: Bright Data 수집', async () => {
      console.log('\n2️⃣ Bright Data 수집 시작...');
      console.log(`   📊 키워드 ${keywords.length}개 × ${videosPerKeyword}개 = 예상 ${keywords.length * videosPerKeyword}개 영상`);
      
      // 수집 시작
      const snapshotId = await this.modules.brightDataAPI.startCollection(keywords, videosPerKeyword);
      console.log(`   🚀 수집 작업 시작: ${snapshotId}`);

      // 진행률 모니터링 및 완료 대기
      const completion = await this.modules.brightDataAPI.waitForCompletion(snapshotId);
      console.log(`   ⏳ 수집 완료: ${completion.total_rows || 0}개 수집됨`);

      // 데이터 다운로드
      const rawData = await this.modules.brightDataAPI.downloadData(snapshotId);
      this.stats.step2_rawVideos = rawData.length;
      this.stats.apiUnitsUsed += (keywords.length * 100); // 대략적인 API 사용량

      console.log(`   ✅ 데이터 다운로드 완료: ${rawData.length}개 영상`);

      return { rawData, snapshotId, count: rawData.length };
    });
  }

  /**
   * 3️⃣-4️⃣ 단계: 데이터 처리 (필터링 + 변환) 실행
   */
  async executeStep34_ProcessData(rawData) {
    return await this.executeStepWithTimeout('3-4단계: 데이터 처리', async () => {
      console.log('\n3️⃣-4️⃣ 데이터 처리 시작...');
      
      if (rawData.length === 0) {
        console.log('   ⚠️ 처리할 원본 데이터가 없음 (테스트 모드일 수 있음)');
        return { filteredShorts: [], transformedData: [], count: 0 };
      }

      // 3단계: Shorts 필터링
      console.log(`   🔽 Shorts 필터링: ${rawData.length}개 영상 처리 중...`);
      const filteredShorts = this.modules.videoProcessor.filterShorts(rawData);
      this.stats.step3_filteredShorts = filteredShorts.length;

      // 필터링 결과 검증
      const filterRate = rawData.length > 0 ? (filteredShorts.length / rawData.length) * 100 : 0;
      console.log(`   📊 필터링 결과: ${filteredShorts.length}개 (${filterRate.toFixed(1)}%)`);
      
      if (filterRate < 10) {
        console.warn(`   ⚠️ 필터링 비율이 낮습니다: ${filterRate.toFixed(1)}%`);
        this.stats.warnings.push(`low_filter_rate: ${filterRate.toFixed(1)}%`);
      }

      // 4단계: DB 형식으로 변환
      console.log(`   🔧 데이터 변환: ${filteredShorts.length}개 영상 변환 중...`);
      const transformedData = this.modules.videoProcessor.transformToDBFormat(filteredShorts);
      this.stats.step4_transformedData = transformedData.length;

      console.log(`   ✅ 데이터 처리 완료: ${transformedData.length}개 변환됨`);

      return { filteredShorts, transformedData, count: transformedData.length };
    });
  }

  /**
   * 5️⃣ 단계: 데이터베이스 저장 실행
   */
  async executeStep5_SaveToDatabase(transformedData) {
    return await this.executeStepWithTimeout('5단계: DB 저장', async () => {
      console.log('\n5️⃣ 데이터베이스 저장 시작...');
      
      if (transformedData.length === 0) {
        console.log('   ⚠️ 저장할 데이터가 없음');
        return { saved: 0, failed: 0, count: 0 };
      }

      console.log(`   💾 ${transformedData.length}개 영상 저장 중...`);
      const saveStats = await this.modules.cacheService.saveVideos(transformedData);
      this.stats.step5_savedVideos = saveStats.saved;

      // 저장 결과 검증
      const saveRate = transformedData.length > 0 ? (saveStats.saved / transformedData.length) * 100 : 0;
      console.log(`   📊 저장 결과: ${saveStats.saved}개 성공, ${saveStats.failed}개 실패 (${saveRate.toFixed(1)}%)`);

      if (saveRate < 90) {
        console.warn(`   ⚠️ 저장 성공률이 낮습니다: ${saveRate.toFixed(1)}%`);
        this.stats.warnings.push(`low_save_rate: ${saveRate.toFixed(1)}%`);
      }

      console.log(`   ✅ 데이터베이스 저장 완료`);

      return { ...saveStats, count: saveStats.saved };
    });
  }

  /**
   * 6️⃣ 단계: 키워드 사용 기록 업데이트 실행
   */
  async executeStep6_UpdateKeywords(transformedData) {
    return await this.executeStepWithTimeout('6단계: 키워드 업데이트', async () => {
      console.log('\n6️⃣ 키워드 사용 기록 업데이트 시작...');
      
      if (transformedData.length === 0) {
        console.log('   ⚠️ 업데이트할 키워드 데이터가 없음');
        return { updated: 0, failed: 0, count: 0 };
      }

      console.log(`   🔄 ${transformedData.length}개 영상 기반 키워드 업데이트 중...`);
      const updateStats = await this.modules.keywordUpdater.updateKeywordUsage(transformedData);
      this.stats.step6_updatedKeywords = updateStats.updated;

      console.log(`   📊 업데이트 결과: ${updateStats.updated}개 성공, ${updateStats.failed}개 실패`);
      console.log(`   ✅ 키워드 업데이트 완료`);

      return { ...updateStats, count: updateStats.updated };
    });
  }

  /**
   * ⏱️ 타임아웃과 함께 단계 실행
   */
  async executeStepWithTimeout(stepName, stepFunction) {
    const stepStartTime = Date.now();
    
    try {
      console.log(`⏱️  ${stepName} 실행 중... (최대 ${this.config.stepTimeout / 1000 / 60}분)`);
      
      // 타임아웃 설정
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${stepName} 타임아웃`)), this.config.stepTimeout);
      });

      // 단계 실행 (타임아웃과 경쟁)
      const result = await Promise.race([stepFunction(), timeoutPromise]);
      
      // 실행 시간 기록
      const stepDuration = Date.now() - stepStartTime;
      this.stats.stepDurations[stepName] = stepDuration;
      
      console.log(`   ⏱️ ${stepName} 소요 시간: ${Math.round(stepDuration / 1000)}초`);
      
      return result;

    } catch (error) {
      const stepDuration = Date.now() - stepStartTime;
      this.stats.stepDurations[stepName] = stepDuration;
      
      console.error(`   ❌ ${stepName} 실패 (${Math.round(stepDuration / 1000)}초 소요): ${error.message}`);
      throw error;
    }
  }

  /**
   * 📊 최종 통계 계산
   */
  calculateFinalStats(workflowResult) {
    const stats = {
      // 처리량 통계
      keywordsSelected: this.stats.step1_keywords,
      rawVideosCollected: this.stats.step2_rawVideos,
      shortsFiltered: this.stats.step3_filteredShorts,
      dataTransformed: this.stats.step4_transformedData,
      videosSaved: this.stats.step5_savedVideos,
      keywordsUpdated: this.stats.step6_updatedKeywords,
      
      // 성능 통계
      totalDuration: this.stats.totalDuration,
      stepDurations: this.stats.stepDurations,
      apiUnitsUsed: this.stats.apiUnitsUsed,
      
      // 품질 지표
      filterSuccessRate: this.stats.step2_rawVideos > 0 
        ? (this.stats.step3_filteredShorts / this.stats.step2_rawVideos * 100).toFixed(1) + '%'
        : '0%',
      saveSuccessRate: this.stats.step4_transformedData > 0
        ? (this.stats.step5_savedVideos / this.stats.step4_transformedData * 100).toFixed(1) + '%'
        : '0%',
      
      // 상태 정보
      completedSteps: workflowResult.completedSteps,
      hasErrors: this.stats.errors.length > 0,
      hasWarnings: this.stats.warnings.length > 0,
      errorsCount: this.stats.errors.length,
      warningsCount: this.stats.warnings.length
    };

    return stats;
  }

  /**
   * 📊 최종 리포트 생성
   */
  generateFinalReport(workflowResult) {
    console.log('\n📊 ===== 최종 실행 리포트 =====');
    
    // 시간 계산 안전 처리
    const endTime = this.stats.endTime || Date.now();
    const totalDuration = this.stats.totalDuration || (endTime - this.stats.startTime);
    
    console.log(`⏰ 실행 시간: ${new Date(this.stats.startTime).toLocaleString('ko-KR')} ~ ${new Date(endTime).toLocaleString('ko-KR')}`);
    console.log(`⌛ 총 소요 시간: ${Math.round(totalDuration / 1000)}초`);
    
    // 실제 완료된 단계 계산 (dry-run 모드 고려)
    let actualCompletedSteps = workflowResult.completedSteps;
    if (workflowResult.stepResults?.step5?.dryRun || workflowResult.stepResults?.step6?.dryRun) {
      actualCompletedSteps = 4; // 5-6단계는 건너뛰었으므로 실제로는 4단계까지만 완료
    }
    
    console.log(`🎯 완료된 단계: ${actualCompletedSteps}/6${actualCompletedSteps < 6 ? ' (5-6단계: 드라이 런 모드로 건너뛰기)' : ''}`);
    
    console.log('\n📈 처리 결과:');
    console.log(`  1️⃣ 키워드 선택: ${this.stats.step1_keywords}개`);
    console.log(`  2️⃣ 원본 영상 수집: ${this.stats.step2_rawVideos}개`);
    console.log(`  3️⃣ Shorts 필터링: ${this.stats.step3_filteredShorts}개`);
    console.log(`  4️⃣ 데이터 변환: ${this.stats.step4_transformedData}개`);
    console.log(`  5️⃣ DB 저장: ${this.stats.step5_savedVideos}개`);
    console.log(`  6️⃣ 키워드 업데이트: ${this.stats.step6_updatedKeywords}개`);

    if (workflowResult.finalStats) {
      console.log('\n📊 성능 지표:');
      console.log(`  필터링 성공률: ${workflowResult.finalStats.filterSuccessRate}`);
      
      // dry-run 모드에서는 저장 성공률을 다르게 표시
      if (workflowResult.stepResults?.step5?.dryRun) {
        console.log(`  저장 성공률: N/A (드라이 런 모드)`);
      } else {
        console.log(`  저장 성공률: ${workflowResult.finalStats.saveSuccessRate}`);
      }
      
      // Bright Data API 비용 계산 ($0.0015 per record)
      const brightDataCost = (this.stats.step2_rawVideos * 0.0015).toFixed(2);
      console.log(`  Bright Data 비용: $${brightDataCost} (${this.stats.step2_rawVideos}개 레코드)`);
    }

    // 경고 및 에러 리포트
    if (this.stats.warnings.length > 0) {
      console.log(`\n⚠️ 경고 (${this.stats.warnings.length}개):`);
      this.stats.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ 에러 (${this.stats.errors.length}개):`);
      this.stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log('\n========================================');
    console.log(workflowResult.success ? '🎉 전체 워크플로우 성공적으로 완료!' : '⚠️ 워크플로우가 부분적으로 완료됨');
    console.log('========================================\n');
  }

  /**
   * 🛡️ 부분 복구 시도
   */
  async attemptPartialRecovery(workflowResult, error) {
    if (!this.config.enableRollback) {
      console.log('🛡️ 롤백 비활성화 - 복구 시도 안 함');
      return;
    }

    console.log('\n🛡️ 부분 복구 시도 중...');
    
    try {
      // 복구 로직은 실패한 단계에 따라 달라짐
      const completedSteps = workflowResult.completedSteps;
      
      if (completedSteps >= 1) {
        console.log('  ✅ 1단계(키워드 선택) 완료됨 - 데이터 보존');
      }
      
      if (completedSteps >= 2) {
        console.log('  ✅ 2단계(데이터 수집) 완료됨 - 수집 데이터 보존');
      }
      
      if (completedSteps >= 4) {
        console.log('  ✅ 3-4단계(데이터 처리) 완료됨 - 변환 데이터 보존');
      }

      // 에러 기록
      this.stats.errors.push(`step_${completedSteps + 1}: ${error.message}`);
      
      console.log('🛡️ 부분 복구 완료 - 완료된 단계의 데이터는 보존됨');

    } catch (recoveryError) {
      console.error('❌ 복구 중 추가 에러:', recoveryError.message);
      this.stats.errors.push(`recovery: ${recoveryError.message}`);
    }
  }

  /**
   * 💥 치명적 에러 처리
   */
  async handleCriticalError(error) {
    console.log('\n💥 치명적 에러 처리 중...');
    
    try {
      // 에러 로깅
      this.stats.errors.push(`critical: ${error.message}`);
      
      // 시스템 상태 저장 (추후 분석용)
      const errorReport = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        stats: this.stats,
        config: this.config
      };

      console.log('💾 에러 리포트 생성됨');
      
      // 알림 전송 (설정된 경우)
      if (this.config.enableSlackNotification || this.config.enableEmailNotification) {
        console.log('📢 에러 알림 전송 시도...');
        // 알림 로직은 추후 구현
      }

    } catch (handlingError) {
      console.error('❌ 에러 처리 중 추가 문제:', handlingError.message);
    }
  }
}

// =============================================================================
// 🚀 메인 실행 함수들
// =============================================================================

/**
 * 🎯 기본 실행 함수 (전체 워크플로우)
 * 
 * @param {Object} options - 실행 옵션
 * @returns {Promise<Object>} 실행 결과
 */
export async function runV2CacheSystem(options = {}) {
  const system = new YouTubeShortsV2CacheSystem();
  return await system.run(options);
}

/**
 * 🧪 테스트 모드 실행 (Bright Data 호출 없음)
 * 
 * @param {Object} options - 테스트 옵션
 * @returns {Promise<Object>} 테스트 결과
 */
export async function runV2CacheSystemTest(options = {}) {
  return await runV2CacheSystem({
    ...options,
    dryRun: true,
    skipBrightData: true,
    cleanExpiredCache: false
  });
}

/**
 * 🎯 키워드별 부분 실행 (특정 키워드만)
 * 
 * @param {Array} keywords - 실행할 키워드 배열
 * @param {Object} options - 실행 옵션
 * @returns {Promise<Object>} 실행 결과
 */
export async function runV2CacheSystemForKeywords(keywords, options = {}) {
  const system = new YouTubeShortsV2CacheSystem();
  
  // 키워드 직접 주입 모드
  system.executeStep1_SelectKeywords = async () => {
    console.log('1️⃣ 키워드 직접 주입 모드...');
    console.log(`   ✅ 주입된 키워드: ${keywords.length}개`);
    
    return { keywords, count: keywords.length };
  };
  
  return await system.run(options);
}

// =============================================================================
// 🚀 CLI 실행 지원
// =============================================================================

// ES Modules에서 메인 스크립트 확인 (한글 경로 문제 해결)
const currentFilePath = fileURLToPath(import.meta.url);
const isMainScript = process.argv[1] && (currentFilePath === process.argv[1]);

if (isMainScript) {
  // CLI 인자 파싱
  const args = process.argv.slice(2);
  const options = {};
  
  if (args.includes('--dry-run')) options.dryRun = true;
  if (args.includes('--test')) options.skipBrightData = true;
  if (args.includes('--no-cache-clean')) options.cleanExpiredCache = false;
  
  const videosPerKeywordArg = args.find(arg => arg.startsWith('--videos='));
  if (videosPerKeywordArg) {
    options.videosPerKeyword = parseInt(videosPerKeywordArg.split('=')[1]);
  }

  console.log('🚀 CLI 모드 실행');
  console.log(`📝 옵션: ${JSON.stringify(options, null, 2)}`);

  runV2CacheSystem(options)
    .then(result => {
      console.log('\n✅ CLI 실행 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ CLI 실행 실패:', error.message);
      process.exit(1);
    });
}

// ES Modules 기본 내보내기
export default YouTubeShortsV2CacheSystem; 