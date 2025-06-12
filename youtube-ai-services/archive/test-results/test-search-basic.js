/**
 * 🧪 YouTube Search Engine 기본 테스트
 * 
 * JSON 쿼리 → youtube-search-engine.js → YouTube API search.list 원본 결과만 확인
 * 필터링, 페이지네이션 등은 제외
 */

import YouTubeSearchEngine from './search/modules/youtube-search-engine.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

class BasicSearchTester {
  constructor() {
    this.testQueries = null;
    this.searchEngine = null;
    this.results = [];
    this.loadTestQueries();
    this.initSearchEngine();
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
   * 🎬 Search Engine 초기화
   */
  initSearchEngine() {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
    }
    
    this.searchEngine = new YouTubeSearchEngine(apiKey);
    console.log('🎬 YouTube Search Engine 초기화 완료');
  }

  /**
   * 🎯 기본 검색 테스트 실행
   */
  async runBasicSearchTests(limit = 5) {
    console.log('\n🚀 YouTube Search Engine 기본 테스트 시작');
    console.log('=' .repeat(60));

    // API 키 검증
    await this.validateApiKey();

    // 기본 검색 테스트
    await this.testBasicSearches(limit);

    // 결과 요약
    this.printTestSummary();

    console.log('\n✅ 기본 테스트 완료!');
  }

  /**
   * 🔧 API 키 검증
   */
  async validateApiKey() {
    console.log('\n📋 1. API 키 검증');
    console.log('-'.repeat(40));

    try {
      const isValid = await this.searchEngine.validateApiKey();
      
      if (isValid) {
        console.log('✅ YouTube API 키가 유효합니다.');
      } else {
        throw new Error('API 키 검증 실패');
      }
    } catch (error) {
      console.error('❌ API 키 검증 실패:', error.message);
      throw error;
    }
  }

  /**
   * 🔍 기본 검색 테스트들
   */
  async testBasicSearches(limit) {
    console.log(`\n🔍 2. 기본 검색 테스트 (${limit}개 쿼리)`);
    console.log('-'.repeat(40));

    const testQueries = this.testQueries.queries.slice(0, limit);

    for (let i = 0; i < testQueries.length; i++) {
      const queryData = testQueries[i];
      
      console.log(`\n[${i + 1}/${limit}] ${queryData.testCase}`);
      console.log(`   원본 입력: "${queryData.originalInput}"`);
      console.log(`   생성된 쿼리: "${queryData.query}"`);

      try {
        const startTime = Date.now();
        
        // ✅ JSON의 apiParams를 그대로 사용
        const result = await this.searchEngine.searchVideos(queryData.apiParams);

        const duration = Date.now() - startTime;

        if (result.success) {
          console.log(`   ✅ 성공: ${result.videoIds.length}개 영상 ID 발견 (${duration}ms)`);
          console.log(`   📊 API 사용량: ${result.apiCost} units`);
          console.log(`   🔗 다음 페이지 토큰: ${result.nextPageToken ? 'O' : 'X'}`);
          console.log(`   📋 총 가능 결과: ${result.totalResults.toLocaleString()}개`);

          // 첫 3개 영상 ID 샘플 출력
          if (result.videoIds.length > 0) {
            const sampleIds = result.videoIds.slice(0, 3);
            console.log(`   🎬 영상 ID 샘플: [${sampleIds.join(', ')}]`);
          }

          this.results.push({
            testCase: queryData.testCase,
            query: queryData.query,
            success: true,
            videoCount: result.videoIds.length,
            duration,
            apiUnitsUsed: result.apiCost,
            hasNextPage: !!result.nextPageToken,
            totalResults: result.totalResults
          });

        } else {
          throw new Error(`검색 실패: ${result.error}`);
        }

      } catch (error) {
        console.error(`   ❌ 실패: ${error.message}`);
        
        this.results.push({
          testCase: queryData.testCase,
          query: queryData.query,
          success: false,
          error: error.message
        });
      }

      // API 호출 간격 (Rate Limiting 방지)
      if (i < limit - 1) {
        console.log('   ⏳ 2초 대기...');
        await this.delay(2000);
      }
    }
  }

  /**
   * 📊 테스트 결과 요약
   */
  printTestSummary() {
    console.log('\n📊 3. 테스트 결과 요약');
    console.log('='.repeat(60));

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log(`✅ 성공: ${successful.length}개`);
    console.log(`❌ 실패: ${failed.length}개`);
    console.log(`📊 성공률: ${((successful.length / this.results.length) * 100).toFixed(1)}%`);

    if (successful.length > 0) {
      const totalVideos = successful.reduce((sum, r) => sum + r.videoCount, 0);
      const totalApiUnits = successful.reduce((sum, r) => sum + r.apiUnitsUsed, 0);
      const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      const withNextPage = successful.filter(r => r.hasNextPage).length;

      console.log(`\n📈 성공한 검색들의 통계:`);
      console.log(`   🎬 총 발견 영상: ${totalVideos}개`);
      console.log(`   📡 총 API 사용량: ${totalApiUnits} units`);
      console.log(`   ⏱️ 평균 응답시간: ${avgDuration.toFixed(0)}ms`);
      console.log(`   📄 다음 페이지 있음: ${withNextPage}/${successful.length}개`);
      console.log(`   🔢 평균 영상/검색: ${(totalVideos / successful.length).toFixed(1)}개`);
    }

    if (failed.length > 0) {
      console.log(`\n❌ 실패한 검색들:`);
      failed.forEach(f => {
        console.log(`   - ${f.testCase}: ${f.error}`);
      });
    }

    // Search Engine 내부 통계
    console.log(`\n🎬 Search Engine 통계:`);
    const engineStats = this.searchEngine.getStats();
    console.log(`   - 총 요청: ${engineStats.totalRequests}개`);
    console.log(`   - 성공률: ${engineStats.successRate}`);
    console.log(`   - 평균 응답시간: ${engineStats.averageResponseTime}`);
    console.log(`   - 효율성: ${engineStats.efficiency}`);
  }

  /**
   * 🔄 지연 함수
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🧪 단일 쿼리 테스트
   */
  async testSingleQuery(queryData) {
    try {
      console.log(`\n🧪 테스트: ${queryData.testCase}`);
      console.log(`📝 원본 입력: "${queryData.originalInput}"`);
      console.log(`🔍 생성된 쿼리: "${queryData.query}"`);

      // ✅ JSON의 apiParams를 그대로 사용
      const result = await this.searchEngine.searchVideos(queryData.apiParams);

      if (result.success) {
        console.log(`✅ 검색 성공!`);
        
        this.results.push({
          testCase: queryData.testCase,
          success: true,
          videosFound: result.videoIds.length,
          totalResults: result.totalResults,
          hasNextPage: !!result.nextPageToken,
          responseTime: result.responseTime,
          apiCost: result.apiCost
        });
      } else {
        console.log(`❌ 검색 실패: ${result.error}`);
        
        this.results.push({
          testCase: queryData.testCase,
          success: false,
          error: result.error,
          responseTime: result.responseTime || 0,
          apiCost: result.apiCost || 0
        });
      }

    } catch (error) {
      console.error(`❌ 테스트 실행 오류:`, error.message);
      
      this.results.push({
        testCase: queryData.testCase,
        success: false,
        error: error.message,
        responseTime: 0,
        apiCost: 0
      });
    }
  }
}

/**
 * 🎯 메인 실행 함수
 */
async function main() {
  console.log('🧪 YouTube Search Engine 기본 테스트');
  console.log(`📅 실행 시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log(`🎯 목표: search.list API 호출 및 원본 JSON 결과 확인`);

  const tester = new BasicSearchTester();
  
  try {
    // 5개 쿼리로 기본 테스트
    await tester.runBasicSearchTests(5);
    
  } catch (error) {
    console.error('\n💥 테스트 실행 중 심각한 오류:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (process.argv[1].endsWith('test-search-basic.js')) {
  main();
}

export default BasicSearchTester; 