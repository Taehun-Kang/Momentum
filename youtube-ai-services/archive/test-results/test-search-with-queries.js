/**
 * 🧪 Search 모듈 테스트 실행기
 * 
 * 생성된 test-queries를 사용해서 search 모듈의 모든 기능을 테스트
 */

import { searchYouTubeShorts, quickSearch, getSystemStats, validateSearchSystem } from './search/index.js';
import fs from 'fs';
import path from 'path';

class SearchModuleTester {
  constructor() {
    this.testQueries = null;
    this.results = [];
    this.loadTestQueries();
  }

  /**
   * 📋 테스트 쿼리 로드
   */
  loadTestQueries() {
    try {
      const queriesPath = path.join(process.cwd(), 'search-test-queries.json');
      const queriesData = fs.readFileSync(queriesPath, 'utf-8');
      this.testQueries = JSON.parse(queriesData);
      console.log(`📋 테스트 쿼리 로드 완료: ${this.testQueries.queries.length}개`);
    } catch (error) {
      console.error('❌ 테스트 쿼리 로드 실패:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 모든 테스트 실행
   */
  async runAllTests() {
    console.log('\n🚀 Search 모듈 전체 테스트 시작');
    console.log('=' .repeat(60));

    // 1. 시스템 검증
    await this.testSystemValidation();

    // 2. 기본 검색 테스트 (3개 쿼리만)
    await this.testBasicSearch(3);

    // 3. 빠른 검색 테스트 (5개 쿼리)
    await this.testQuickSearch(5);

    // 4. 시스템 통계 확인
    await this.testSystemStats();

    // 5. 결과 요약
    this.printTestSummary();

    console.log('\n✅ 모든 테스트 완료!');
  }

  /**
   * ✅ 시스템 검증 테스트
   */
  async testSystemValidation() {
    console.log('\n📋 1. 시스템 검증 테스트');
    console.log('-'.repeat(40));

    try {
      const validation = await validateSearchSystem();
      console.log(`✅ YouTube API: ${validation.youtubeApi ? '정상' : '실패'}`);
      console.log(`✅ 모듈 로드: ${validation.modulesLoaded ? '정상' : '실패'}`);
      console.log(`✅ 환경 설정: ${validation.configValid ? '정상' : '실패'}`);

      if (!validation.youtubeApi) {
        throw new Error('YouTube API 검증 실패 - API 키 확인 필요');
      }
    } catch (error) {
      console.error('❌ 시스템 검증 실패:', error.message);
      throw error;
    }
  }

  /**
   * 🔍 기본 검색 테스트
   */
  async testBasicSearch(limit = 3) {
    console.log(`\n📊 2. 기본 검색 테스트 (${limit}개 쿼리)`);
    console.log('-'.repeat(40));

    const testQueries = this.testQueries.queries.slice(0, limit);

    for (let i = 0; i < testQueries.length; i++) {
      const queryData = testQueries[i];
      console.log(`\n[${i + 1}/${limit}] ${queryData.testCase}`);
      console.log(`   입력: "${queryData.originalInput}"`);
      console.log(`   쿼리: "${queryData.query}"`);

      try {
        const startTime = Date.now();
        
        // 첫 번째 키워드만 사용 (API 사용량 절약)
        const keyword = queryData.extractedKeywords[0] || '테스트';
        
        const result = await searchYouTubeShorts(keyword, {
          targetResults: 10,  // 적은 수로 테스트
          useAdaptivePagination: false,  // 성능 최적화
          useCache: true
        });

        const duration = Date.now() - startTime;

        console.log(`   ✅ 성공: ${result.videos?.length || 0}개 영상 발견 (${duration}ms)`);
        console.log(`   📊 API 사용량: ${result.apiUsage?.totalUnits || 0} units`);
        console.log(`   🎯 필터링 성공률: ${result.statistics?.filteringSuccessRate || 0}%`);

        this.results.push({
          type: 'basic',
          testCase: queryData.testCase,
          keyword,
          success: true,
          videoCount: result.videos?.length || 0,
          duration,
          apiUsage: result.apiUsage?.totalUnits || 0
        });

      } catch (error) {
        console.error(`   ❌ 실패: ${error.message}`);
        this.results.push({
          type: 'basic',
          testCase: queryData.testCase,
          success: false,
          error: error.message
        });
      }

      // API 호출 간격
      await this.delay(2000);
    }
  }

  /**
   * ⚡ 빠른 검색 테스트
   */
  async testQuickSearch(limit = 5) {
    console.log(`\n⚡ 3. 빠른 검색 테스트 (${limit}개 쿼리)`);
    console.log('-'.repeat(40));

    const testQueries = this.testQueries.queries.slice(3, 3 + limit);

    for (let i = 0; i < testQueries.length; i++) {
      const queryData = testQueries[i];
      console.log(`\n[${i + 1}/${limit}] ${queryData.testCase}`);

      try {
        const startTime = Date.now();
        
        const keyword = queryData.extractedKeywords[0] || '테스트';
        const result = await quickSearch(keyword, 5);  // 5개만 요청

        const duration = Date.now() - startTime;

        console.log(`   ✅ 성공: ${result.videos?.length || 0}개 영상 (${duration}ms)`);

        this.results.push({
          type: 'quick',
          testCase: queryData.testCase,
          keyword,
          success: true,
          videoCount: result.videos?.length || 0,
          duration
        });

      } catch (error) {
        console.error(`   ❌ 실패: ${error.message}`);
        this.results.push({
          type: 'quick',
          testCase: queryData.testCase,
          success: false,
          error: error.message
        });
      }

      await this.delay(1500);
    }
  }

  /**
   * 📊 시스템 통계 테스트
   */
  async testSystemStats() {
    console.log('\n📊 4. 시스템 통계 확인');
    console.log('-'.repeat(40));

    try {
      const stats = getSystemStats();
      
      console.log('🎬 검색 엔진 통계:');
      console.log(`   - 총 요청: ${stats.searchEngine?.totalRequests || 0}개`);
      console.log(`   - 성공률: ${stats.searchEngine?.successRate || 0}%`);
      
      console.log('📊 필터링 통계:');
      console.log(`   - 재생가능률: ${stats.videoFilter?.playabilitySuccessRate || 0}%`);
      console.log(`   - 품질통과율: ${stats.videoFilter?.qualitySuccessRate || 0}%`);
      
      console.log('🏠 전체 시스템:');
      console.log(`   - 캐시 적중률: ${stats.cacheHitRate || 0}%`);
      console.log(`   - 총 API 사용량: ${stats.totalApiUsage || 0} units`);

    } catch (error) {
      console.error('❌ 통계 조회 실패:', error.message);
    }
  }

  /**
   * 📋 테스트 결과 요약
   */
  printTestSummary() {
    console.log('\n📋 5. 테스트 결과 요약');
    console.log('='.repeat(60));

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log(`✅ 성공: ${successful.length}개`);
    console.log(`❌ 실패: ${failed.length}개`);
    console.log(`📊 성공률: ${((successful.length / this.results.length) * 100).toFixed(1)}%`);

    if (successful.length > 0) {
      const avgDuration = successful.reduce((sum, r) => sum + (r.duration || 0), 0) / successful.length;
      const totalVideos = successful.reduce((sum, r) => sum + (r.videoCount || 0), 0);
      const totalApiUsage = successful.reduce((sum, r) => sum + (r.apiUsage || 0), 0);

      console.log(`⏱️ 평균 응답시간: ${avgDuration.toFixed(0)}ms`);
      console.log(`🎬 총 발견 영상: ${totalVideos}개`);
      console.log(`📡 총 API 사용량: ${totalApiUsage} units`);
    }

    if (failed.length > 0) {
      console.log('\n❌ 실패한 테스트들:');
      failed.forEach(f => {
        console.log(`   - ${f.testCase}: ${f.error}`);
      });
    }
  }

  /**
   * 🔄 지연 함수
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 🎯 메인 실행 함수
 */
async function main() {
  console.log('🧪 Search 모듈 테스트 실행기');
  console.log(`📅 실행 시간: ${new Date().toLocaleString('ko-KR')}`);

  const tester = new SearchModuleTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('\n💥 테스트 실행 중 심각한 오류:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default SearchModuleTester; 