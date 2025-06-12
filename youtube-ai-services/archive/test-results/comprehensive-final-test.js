/**
 * 🧪 최종 키워드 비교 테스트
 * 
 * 10개 키워드 각각 50개 결과 수집 및 JSON 저장
 */

import YouTubeSearchEngine from './search/modules/youtube-search-engine.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

class ComprehensiveFinalTester {
  constructor() {
    const apiKey = process.env.YOUTUBE_API_KEY;
    this.searchEngine = new YouTubeSearchEngine(apiKey);
    this.results = [];
    this.startTime = new Date();
  }

  /**
   * 🎯 테스트 케이스 정의
   */
  getTestCases() {
    return [
      {
        id: 1,
        name: "BTS 검색",
        query: "BTS",
        category: "kpop_basic",
        description: "기본 BTS 검색"
      },
      {
        id: 2,
        name: "BTS shorts 검색", 
        query: "BTS shorts",
        category: "kpop_shorts",
        description: "BTS + shorts 수식어"
      },
      {
        id: 3,
        name: "BTS 복합 OR 검색",
        query: "BTS | BTS 브이로그 | BTS 무대",
        category: "kpop_complex",
        description: "BTS 관련 복합 OR 검색"
      },
      {
        id: 4,
        name: "강아지 검색",
        query: "강아지",
        category: "pet_basic",
        description: "기본 강아지 검색"
      },
      {
        id: 5,
        name: "강아지 shorts 검색",
        query: "강아지 shorts", 
        category: "pet_shorts",
        description: "강아지 + shorts 수식어"
      },
      {
        id: 6,
        name: "산책하는 강아지 검색",
        query: "산책하는 강아지",
        category: "pet_descriptive",
        description: "구체적 행동 묘사"
      },
      {
        id: 7,
        name: "댄스 검색",
        query: "댄스",
        category: "dance_basic", 
        description: "기본 댄스 검색"
      },
      {
        id: 8,
        name: "신나는 댄스 검색",
        query: "신나는 댄스",
        category: "dance_emotion",
        description: "감정 수식어 댄스"
      },
      {
        id: 9,
        name: "맛있는 요리 검색",
        query: "맛있는 요리",
        category: "cooking_emotion",
        description: "감정 수식어 요리"
      },
      {
        id: 10,
        name: "복합 OR 검색",
        query: "산책하는 강아지 | 신나는 댄스 | 맛있는 요리",
        category: "mixed_complex",
        description: "서로 다른 카테고리 복합 검색"
      }
    ];
  }

  /**
   * 🔍 전체 테스트 실행
   */
  async runComprehensiveTest() {
    console.log('🧪 최종 키워드 비교 테스트 시작');
    console.log('='.repeat(70));
    console.log(`📅 시작 시간: ${this.startTime.toLocaleString('ko-KR')}`);

    const testCases = this.getTestCases();
    
    // 고정 API 파라미터
    const apiParams = {
      part: "snippet",
      videoDuration: "short",
      maxResults: 50,  // 50개로 설정
      type: "video", 
      regionCode: "KR",
      relevanceLanguage: "ko",
      safeSearch: "moderate",
      order: "relevance"
    };

    console.log(`\n📊 테스트 설정:`);
    console.log(`   총 테스트: ${testCases.length}개`);
    console.log(`   키워드당 결과: ${apiParams.maxResults}개`);
    console.log(`   예상 API 비용: ${testCases.length * 100} units`);

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      console.log(`\n[${i + 1}/${testCases.length}] ${testCase.name}`);
      console.log(`   쿼리: "${testCase.query}"`);
      console.log(`   카테고리: ${testCase.category}`);

      try {
        const startTime = Date.now();
        
        // API 호출
        const searchResult = await this.searchEngine.searchVideos({
          ...apiParams,
          q: testCase.query
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (searchResult.success) {
          console.log(`   ✅ 성공!`);
          console.log(`   📊 발견 영상: ${searchResult.videoIds.length}개`);
          console.log(`   📈 총 결과: ${searchResult.totalResults.toLocaleString()}개`);
          console.log(`   ⏱️ 응답 시간: ${responseTime}ms`);
          console.log(`   🔗 다음 페이지: ${searchResult.nextPageToken ? 'O' : 'X'}`);

          // 영상 상세 정보 수집
          const videoDetails = searchResult.data?.items?.map(video => ({
            videoId: video.id.videoId,
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            publishedAt: video.snippet.publishedAt,
            description: video.snippet.description?.substring(0, 200) + '...' || '',
            thumbnailUrl: video.snippet.thumbnails?.medium?.url || ''
          })) || [];

          // 결과 저장
          this.results.push({
            testId: testCase.id,
            testName: testCase.name,
            query: testCase.query,
            category: testCase.category,
            description: testCase.description,
            success: true,
            videosFound: searchResult.videoIds.length,
            totalResults: searchResult.totalResults,
            responseTime: responseTime,
            hasNextPage: !!searchResult.nextPageToken,
            nextPageToken: searchResult.nextPageToken || null,
            apiCost: 100,
            timestamp: new Date(),
            videoDetails: videoDetails,
            sampleTitles: videoDetails.slice(0, 5).map(v => v.title)
          });

          // 샘플 영상 출력
          console.log(`   🎬 샘플 영상 (처음 3개):`);
          videoDetails.slice(0, 3).forEach((video, index) => {
            const title = video.title.substring(0, 50);
            console.log(`      ${index + 1}. "${title}..."`);
            console.log(`         채널: ${video.channelTitle}`);
          });

        } else {
          console.log(`   ❌ 실패: ${searchResult.error}`);
          
          this.results.push({
            testId: testCase.id,
            testName: testCase.name,
            query: testCase.query,
            category: testCase.category,
            description: testCase.description,
            success: false,
            error: searchResult.error,
            timestamp: new Date()
          });
        }

      } catch (error) {
        console.log(`   💥 오류: ${error.message}`);
        
        this.results.push({
          testId: testCase.id,
          testName: testCase.name,
          query: testCase.query,
          category: testCase.category,
          description: testCase.description,
          success: false,
          error: error.message,
          timestamp: new Date()
        });
      }

      // API 호출 간격 (Rate Limiting 방지)
      if (i < testCases.length - 1) {
        console.log(`   ⏳ 2초 대기 중...`);
        await this.delay(2000);
      }
    }

    // 결과 저장 및 분석
    await this.saveAndAnalyzeResults();
  }

  /**
   * 💾 결과 저장 및 분석
   */
  async saveAndAnalyzeResults() {
    const endTime = new Date();
    const fileName = `final-keyword-test-results-${endTime.toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    const filePath = path.join(process.cwd(), fileName);

    // 분석 생성
    const analysis = this.generateAnalysis();

    // 최종 데이터 구조
    const finalData = {
      metadata: {
        testName: "최종 키워드 비교 테스트",
        startTime: this.startTime,
        endTime: endTime,
        totalDuration: endTime.getTime() - this.startTime.getTime(),
        totalTests: this.results.length,
        successfulTests: this.results.filter(r => r.success).length,
        totalApiCost: this.results.filter(r => r.success).length * 100,
        totalVideosFound: this.results.filter(r => r.success).reduce((sum, r) => sum + r.videosFound, 0)
      },
      testResults: this.results,
      analysis: analysis
    };

    // JSON 파일 저장
    fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2));
    
    console.log(`\n💾 결과 저장 완료!`);
    console.log(`   파일: ${fileName}`);
    console.log(`   크기: ${(fs.statSync(filePath).size / 1024).toFixed(1)} KB`);

    // 분석 요약 출력
    this.printAnalysisSummary(analysis);

    return filePath;
  }

  /**
   * 📈 결과 분석 생성
   */
  generateAnalysis() {
    const successfulResults = this.results.filter(r => r.success);

    // 1. 전체 통계
    const overallStats = {
      totalTests: this.results.length,
      successfulTests: successfulResults.length,
      successRate: (successfulResults.length / this.results.length * 100).toFixed(1),
      avgResponseTime: Math.round(successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length),
      avgVideosFound: Math.round(successfulResults.reduce((sum, r) => sum + r.videosFound, 0) / successfulResults.length),
      totalApiCost: successfulResults.length * 100
    };

    // 2. 카테고리별 성능
    const categoryPerformance = {};
    const categories = [...new Set(successfulResults.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = successfulResults.filter(r => r.category === category);
      categoryPerformance[category] = {
        count: categoryResults.length,
        avgResponseTime: Math.round(categoryResults.reduce((sum, r) => sum + r.responseTime, 0) / categoryResults.length),
        avgVideosFound: Math.round(categoryResults.reduce((sum, r) => sum + r.videosFound, 0) / categoryResults.length),
        avgTotalResults: Math.round(categoryResults.reduce((sum, r) => sum + r.totalResults, 0) / categoryResults.length)
      };
    });

    // 3. 속도 순위
    const speedRanking = successfulResults
      .sort((a, b) => a.responseTime - b.responseTime)
      .map((r, index) => ({
        rank: index + 1,
        testName: r.testName,
        query: r.query,
        responseTime: r.responseTime,
        videosFound: r.videosFound
      }));

    // 4. 콘텐츠 양 순위
    const contentRanking = successfulResults
      .sort((a, b) => b.totalResults - a.totalResults)
      .map((r, index) => ({
        rank: index + 1,
        testName: r.testName,
        query: r.query,
        totalResults: r.totalResults,
        videosFound: r.videosFound
      }));

    // 5. 키워드 타입별 비교
    const keywordTypeComparison = {
      basic: successfulResults.filter(r => !r.query.includes('|') && !r.query.includes('shorts') && !r.query.includes(' ')),
      withShorts: successfulResults.filter(r => r.query.includes('shorts')),
      withAdjectives: successfulResults.filter(r => (r.query.includes('신나는') || r.query.includes('맛있는') || r.query.includes('산책하는')) && !r.query.includes('|')),
      orOperator: successfulResults.filter(r => r.query.includes('|'))
    };

    // 각 타입별 평균 계산
    Object.keys(keywordTypeComparison).forEach(type => {
      const typeResults = keywordTypeComparison[type];
      if (typeResults.length > 0) {
        keywordTypeComparison[type] = {
          count: typeResults.length,
          avgResponseTime: Math.round(typeResults.reduce((sum, r) => sum + r.responseTime, 0) / typeResults.length),
          avgVideosFound: Math.round(typeResults.reduce((sum, r) => sum + r.videosFound, 0) / typeResults.length),
          avgTotalResults: Math.round(typeResults.reduce((sum, r) => sum + r.totalResults, 0) / typeResults.length),
          examples: typeResults.map(r => r.query)
        };
      }
    });

    return {
      overallStats,
      categoryPerformance,
      speedRanking,
      contentRanking,
      keywordTypeComparison
    };
  }

  /**
   * 📋 분석 요약 출력
   */
  printAnalysisSummary(analysis) {
    console.log('\n📋 최종 테스트 결과 분석');
    console.log('='.repeat(70));

    console.log('\n📊 전체 통계:');
    console.log(`   총 테스트: ${analysis.overallStats.totalTests}개`);
    console.log(`   성공률: ${analysis.overallStats.successRate}%`);
    console.log(`   평균 응답시간: ${analysis.overallStats.avgResponseTime}ms`);
    console.log(`   평균 발견 영상: ${analysis.overallStats.avgVideosFound}개`);
    console.log(`   총 API 비용: ${analysis.overallStats.totalApiCost} units`);

    console.log('\n🏆 속도 순위 (TOP 5):');
    analysis.speedRanking.slice(0, 5).forEach(item => {
      console.log(`   ${item.rank}. ${item.testName}: ${item.responseTime}ms (${item.videosFound}개)`);
    });

    console.log('\n📈 콘텐츠 양 순위 (TOP 5):');
    analysis.contentRanking.slice(0, 5).forEach(item => {
      console.log(`   ${item.rank}. ${item.testName}: ${item.totalResults.toLocaleString()}개 총 결과`);
    });

    console.log('\n🎯 키워드 타입별 성능:');
    Object.entries(analysis.keywordTypeComparison).forEach(([type, data]) => {
      if (data.count > 0) {
        console.log(`   ${type}: ${data.avgResponseTime}ms 평균, ${data.avgVideosFound}개 평균 (${data.count}개 테스트)`);
      }
    });
  }

  /**
   * 🔄 지연 함수
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 🎯 메인 실행
 */
async function main() {
  const tester = new ComprehensiveFinalTester();
  
  try {
    const resultFile = await tester.runComprehensiveTest();
    console.log(`\n✅ 모든 테스트 완료!`);
    console.log(`📄 결과 파일: ${path.basename(resultFile)}`);
  } catch (error) {
    console.error('\n💥 테스트 실행 중 오류:', error);
    process.exit(1);
  }
}

// 직접 실행
if (process.argv[1].endsWith('comprehensive-final-test.js')) {
  main();
}

export default ComprehensiveFinalTester; 