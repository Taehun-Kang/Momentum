/**
 * 🧪 포괄적 키워드 테스트
 * 
 * 키워드, 수식어, OR 연산자, API 파라미터의 모든 조합을 테스트하여
 * 최적의 검색 전략을 찾기 위한 대규모 테스트
 */

import YouTubeSearchEngine from './search/modules/youtube-search-engine.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

class ComprehensiveKeywordTester {
  constructor() {
    const apiKey = process.env.YOUTUBE_API_KEY;
    this.searchEngine = new YouTubeSearchEngine(apiKey);
    this.results = [];
    this.totalApiCalls = 0;
    this.startTime = new Date();
  }

  /**
   * 🎯 테스트 케이스 생성
   */
  generateTestCases() {
    const baseKeywords = [
      "댄스", "노래", "운동", "요리", "고양이", "먹방", "브이로그", "여행", "게임", "힐링"
    ];

    const modifiers = [
      "", // 수식어 없음
      "신나는", "재미있는", "웃긴", "귀여운", "힐링", "따뜻한", "활력", "에너지"
    ];

    const shortsModifiers = [
      "", // shorts 없음
      "shorts", "쇼츠", "#shorts"
    ];

    const testCases = [];

    // 1. 기본 키워드 테스트
    console.log('📋 테스트 케이스 생성 중...');
    
    baseKeywords.forEach(keyword => {
      // 1-1. 순수 키워드
      testCases.push({
        category: "기본키워드",
        type: "순수",
        query: keyword,
        description: `기본: ${keyword}`
      });

      // 1-2. shorts 수식어 추가
      shortsModifiers.forEach(shortsModifier => {
        if (shortsModifier) {
          testCases.push({
            category: "기본키워드+shorts",
            type: "shorts수식어", 
            query: `${keyword} ${shortsModifier}`,
            description: `기본+shorts: ${keyword} ${shortsModifier}`
          });
        }
      });

      // 1-3. 감정 수식어 추가
      modifiers.slice(1, 4).forEach(modifier => { // 처음 3개만
        testCases.push({
          category: "수식어키워드",
          type: "감정수식어",
          query: `${modifier} ${keyword}`,
          description: `수식어: ${modifier} ${keyword}`
        });

        // 수식어 + shorts 조합
        testCases.push({
          category: "수식어+shorts",
          type: "조합",
          query: `${modifier} ${keyword} shorts`,
          description: `수식어+shorts: ${modifier} ${keyword} shorts`
        });
      });
    });

    // 2. OR 연산자 테스트 (처음 5개 키워드로)
    const testKeywords = baseKeywords.slice(0, 5);
    
    // 2-1. 2개 OR 조합
    for (let i = 0; i < testKeywords.length - 1; i++) {
      testCases.push({
        category: "OR연산2개",
        type: "OR조합",
        query: `${testKeywords[i]} | ${testKeywords[i + 1]}`,
        description: `2개 OR: ${testKeywords[i]} | ${testKeywords[i + 1]}`
      });
    }

    // 2-2. 3개 OR 조합
    testCases.push({
      category: "OR연산3개", 
      type: "OR조합",
      query: `${testKeywords[0]} | ${testKeywords[1]} | ${testKeywords[2]}`,
      description: `3개 OR: ${testKeywords[0]} | ${testKeywords[1]} | ${testKeywords[2]}`
    });

    // 2-3. 4개 OR 조합 (현재 방식)
    testCases.push({
      category: "OR연산4개",
      type: "OR조합", 
      query: `${testKeywords[0]} | ${testKeywords[1]} | ${testKeywords[2]} | ${testKeywords[3]}`,
      description: `4개 OR: ${testKeywords[0]} | ${testKeywords[1]} | ${testKeywords[2]} | ${testKeywords[3]}`
    });

    // 2-4. OR + shorts 조합
    testCases.push({
      category: "OR+shorts",
      type: "OR+shorts조합",
      query: `${testKeywords[0]} shorts | ${testKeywords[1]} shorts | ${testKeywords[2]} shorts`,
      description: `OR+shorts: ${testKeywords[0]} shorts | ${testKeywords[1]} shorts | ${testKeywords[2]} shorts`
    });

    // 3. 복잡한 키워드 조합 (문제가 되었던 케이스들)
    const problematicCases = [
      "잠깨는 댄스 챌린지",
      "신나는 아침 루틴", 
      "활력 운동 영상",
      "에너지 넘치는 노래",
      "웃긴 반려동물 영상",
      "짧은 예능 하이라이트",
      "재미있는 실험 영상",
      "1분 코미디 모음"
    ];

    problematicCases.forEach(problematic => {
      testCases.push({
        category: "문제키워드",
        type: "복잡한표현",
        query: problematic,
        description: `문제: ${problematic}`
      });

      // 단순화 버전
      const simplified = this.simplifyKeyword(problematic);
      testCases.push({
        category: "단순화키워드", 
        type: "단순화",
        query: simplified,
        description: `단순화: ${simplified} (원본: ${problematic})`
      });
    });

    console.log(`✅ 총 ${testCases.length}개 테스트 케이스 생성 완료`);
    return testCases;
  }

  /**
   * 🔧 키워드 단순화
   */
  simplifyKeyword(keyword) {
    const simplificationMap = {
      "잠깨는 댄스 챌린지": "댄스",
      "신나는 아침 루틴": "루틴",
      "활력 운동 영상": "운동", 
      "에너지 넘치는 노래": "노래",
      "웃긴 반려동물 영상": "반려동물",
      "짧은 예능 하이라이트": "예능",
      "재미있는 실험 영상": "실험",
      "1분 코미디 모음": "코미디"
    };

    return simplificationMap[keyword] || keyword;
  }

  /**
   * 📊 API 파라미터 변형 생성
   */
  generateApiVariations() {
    return [
      {
        name: "기본설정",
        params: {
          part: "snippet",
          videoDuration: "short",
          maxResults: 20,
          type: "video", 
          regionCode: "KR",
          relevanceLanguage: "ko",
          safeSearch: "moderate",
          videoEmbeddable: "true",
          order: "relevance"
        }
      },
      {
        name: "embeddable제거",
        params: {
          part: "snippet",
          videoDuration: "short", 
          maxResults: 20,
          type: "video",
          regionCode: "KR", 
          relevanceLanguage: "ko",
          safeSearch: "moderate",
          order: "relevance"
          // videoEmbeddable 제거
        }
      },
      {
        name: "duration제거",
        params: {
          part: "snippet",
          maxResults: 20,
          type: "video",
          regionCode: "KR",
          relevanceLanguage: "ko", 
          safeSearch: "moderate",
          videoEmbeddable: "true",
          order: "relevance"
          // videoDuration 제거
        }
      },
      {
        name: "최소설정",
        params: {
          part: "snippet",
          maxResults: 20,
          type: "video",
          order: "relevance"
          // 모든 필터 제거
        }
      }
    ];
  }

  /**
   * 🧪 포괄적 테스트 실행
   */
  async runComprehensiveTest() {
    console.log('🚀 포괄적 키워드 테스트 시작');
    console.log('='.repeat(60));

    const testCases = this.generateTestCases();
    const apiVariations = this.generateApiVariations();

    let testNumber = 0;
    const totalTests = testCases.length * apiVariations.length;

    console.log(`📊 총 ${totalTests}개 테스트 실행 예정`);
    console.log(`⚠️ 예상 API 호출량: ${totalTests * 100} units`);
    
    // 주요 테스트 케이스만 선별 (API 절약)
    const selectedTests = this.selectKeyTests(testCases);
    console.log(`🎯 핵심 테스트 ${selectedTests.length}개로 축소`);

    for (const testCase of selectedTests) {
      for (const apiVariation of apiVariations) {
        testNumber++;
        
        console.log(`\n[${testNumber}/${selectedTests.length * apiVariations.length}] ${testCase.description} (${apiVariation.name})`);
        
        try {
          const result = await this.executeTest(testCase, apiVariation);
          this.results.push(result);
          
          console.log(`   ✅ ${result.videosFound}개 영상, ${result.totalResults.toLocaleString()}개 총 결과 (${result.responseTime}ms)`);
          
          // 샘플 영상 1개 출력
          if (result.sampleVideo) {
            console.log(`   🎬 샘플: "${result.sampleVideo.substring(0, 50)}..."`);
          }

        } catch (error) {
          console.log(`   ❌ 실패: ${error.message}`);
          
          this.results.push({
            testCase: testCase.description,
            apiVariation: apiVariation.name,
            success: false,
            error: error.message,
            timestamp: new Date()
          });
        }

        this.totalApiCalls++;
        
        // API 호출 간격 (Rate Limiting 방지)
        await this.delay(1500);

        // 주기적으로 중간 결과 저장
        if (testNumber % 10 === 0) {
          await this.saveIntermediateResults();
        }
      }
    }

    // 최종 결과 저장 및 분석
    await this.saveAndAnalyzeResults();
  }

  /**
   * 🎯 핵심 테스트 선별
   */
  selectKeyTests(allTests) {
    const keyTests = [];

    // 각 카테고리별로 대표 케이스 선별
    const categories = [...new Set(allTests.map(t => t.category))];
    
    categories.forEach(category => {
      const categoryTests = allTests.filter(t => t.category === category);
      
      if (category === "기본키워드") {
        // 기본 키워드는 처음 5개만
        keyTests.push(...categoryTests.slice(0, 5));
      } else if (category === "기본키워드+shorts") {
        // shorts 조합은 처음 3개만
        keyTests.push(...categoryTests.slice(0, 3));
      } else if (category === "수식어키워드") {
        // 수식어는 처음 5개만
        keyTests.push(...categoryTests.slice(0, 5));
      } else {
        // 나머지는 모두 포함
        keyTests.push(...categoryTests);
      }
    });

    return keyTests;
  }

  /**
   * 🔍 개별 테스트 실행
   */
  async executeTest(testCase, apiVariation) {
    const apiParams = {
      ...apiVariation.params,
      q: testCase.query
    };

    const startTime = Date.now();
    const searchResult = await this.searchEngine.searchVideos(apiParams);
    const endTime = Date.now();

    return {
      // 테스트 정보
      testCase: testCase.description,
      category: testCase.category,
      type: testCase.type,
      query: testCase.query,
      apiVariation: apiVariation.name,
      
      // 결과
      success: searchResult.success,
      videosFound: searchResult.videoIds?.length || 0,
      totalResults: searchResult.totalResults || 0,
      hasNextPage: !!searchResult.nextPageToken,
      responseTime: endTime - startTime,
      
      // 샘플 데이터
      sampleVideo: searchResult.data?.items?.[0]?.snippet?.title || null,
      sampleVideoId: searchResult.data?.items?.[0]?.id?.videoId || null,
      
      // 메타데이터
      timestamp: new Date(),
      apiParams: apiParams
    };
  }

  /**
   * 💾 중간 결과 저장
   */
  async saveIntermediateResults() {
    const fileName = `keyword-test-intermediate-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    const filePath = path.join(process.cwd(), fileName);
    
    const data = {
      metadata: {
        startTime: this.startTime,
        lastUpdate: new Date(),
        totalApiCalls: this.totalApiCalls,
        totalResults: this.results.length
      },
      results: this.results
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`   💾 중간 결과 저장: ${fileName}`);
  }

  /**
   * 📊 최종 결과 저장 및 분석
   */
  async saveAndAnalyzeResults() {
    console.log('\n📊 최종 결과 분석 중...');
    
    const fileName = `comprehensive-keyword-test-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    const filePath = path.join(process.cwd(), fileName);

    const analysis = this.analyzeResults();
    
    const finalData = {
      metadata: {
        startTime: this.startTime,
        endTime: new Date(),
        totalDuration: Date.now() - this.startTime.getTime(),
        totalApiCalls: this.totalApiCalls,
        totalResults: this.results.length,
        analysisGenerated: new Date()
      },
      analysis: analysis,
      rawResults: this.results
    };

    fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2));
    console.log(`\n💾 최종 결과 저장: ${fileName}`);
    
    // 분석 요약 출력
    this.printAnalysisSummary(analysis);
    
    return filePath;
  }

  /**
   * 📈 결과 분석
   */
  analyzeResults() {
    const successfulResults = this.results.filter(r => r.success);
    
    // 1. 카테고리별 성능
    const categoryPerformance = {};
    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = successfulResults.filter(r => r.category === category);
      categoryPerformance[category] = {
        totalTests: this.results.filter(r => r.category === category).length,
        successfulTests: categoryResults.length,
        successRate: categoryResults.length / this.results.filter(r => r.category === category).length * 100,
        avgVideosFound: categoryResults.reduce((sum, r) => sum + r.videosFound, 0) / categoryResults.length || 0,
        avgTotalResults: categoryResults.reduce((sum, r) => sum + r.totalResults, 0) / categoryResults.length || 0,
        avgResponseTime: categoryResults.reduce((sum, r) => sum + r.responseTime, 0) / categoryResults.length || 0
      };
    });

    // 2. API 설정별 성능  
    const apiVariationPerformance = {};
    const apiVariations = [...new Set(this.results.map(r => r.apiVariation))];
    
    apiVariations.forEach(variation => {
      const variationResults = successfulResults.filter(r => r.apiVariation === variation);
      apiVariationPerformance[variation] = {
        totalTests: this.results.filter(r => r.apiVariation === variation).length,
        successfulTests: variationResults.length,
        successRate: variationResults.length / this.results.filter(r => r.apiVariation === variation).length * 100,
        avgVideosFound: variationResults.reduce((sum, r) => sum + r.videosFound, 0) / variationResults.length || 0,
        avgTotalResults: variationResults.reduce((sum, r) => sum + r.totalResults, 0) / variationResults.length || 0
      };
    });

    // 3. 상위 성능 쿼리들
    const topPerformers = successfulResults
      .sort((a, b) => b.videosFound - a.videosFound)
      .slice(0, 10);

    // 4. 하위 성능 쿼리들  
    const bottomPerformers = successfulResults
      .sort((a, b) => a.videosFound - b.videosFound)
      .slice(0, 10);

    // 5. 키워드 패턴 분석
    const keywordPatterns = this.analyzeKeywordPatterns(successfulResults);

    return {
      overallStats: {
        totalTests: this.results.length,
        successfulTests: successfulResults.length,
        failedTests: this.results.length - successfulResults.length,
        overallSuccessRate: successfulResults.length / this.results.length * 100,
        totalApiCalls: this.totalApiCalls,
        avgVideosFound: successfulResults.reduce((sum, r) => sum + r.videosFound, 0) / successfulResults.length || 0,
        avgResponseTime: successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length || 0
      },
      categoryPerformance,
      apiVariationPerformance, 
      topPerformers,
      bottomPerformers,
      keywordPatterns
    };
  }

  /**
   * 🔍 키워드 패턴 분석
   */
  analyzeKeywordPatterns(results) {
    const patterns = {
      simpleVsComplex: {},
      withVsWithoutShorts: {},
      orOperatorEffect: {}
    };

    // 단순 vs 복잡 키워드
    const simpleResults = results.filter(r => r.category === "기본키워드");
    const complexResults = results.filter(r => r.category === "문제키워드");
    
    patterns.simpleVsComplex = {
      simple: {
        avgVideosFound: simpleResults.reduce((sum, r) => sum + r.videosFound, 0) / simpleResults.length || 0,
        avgTotalResults: simpleResults.reduce((sum, r) => sum + r.totalResults, 0) / simpleResults.length || 0
      },
      complex: {
        avgVideosFound: complexResults.reduce((sum, r) => sum + r.videosFound, 0) / complexResults.length || 0,
        avgTotalResults: complexResults.reduce((sum, r) => sum + r.totalResults, 0) / complexResults.length || 0
      }
    };

    // Shorts 포함 vs 미포함
    const withShortsResults = results.filter(r => r.query.includes("shorts") || r.query.includes("쇼츠"));
    const withoutShortsResults = results.filter(r => !r.query.includes("shorts") && !r.query.includes("쇼츠"));
    
    patterns.withVsWithoutShorts = {
      withShorts: {
        count: withShortsResults.length,
        avgVideosFound: withShortsResults.reduce((sum, r) => sum + r.videosFound, 0) / withShortsResults.length || 0
      },
      withoutShorts: {
        count: withoutShortsResults.length, 
        avgVideosFound: withoutShortsResults.reduce((sum, r) => sum + r.videosFound, 0) / withoutShortsResults.length || 0
      }
    };

    // OR 연산자 효과
    const orResults = results.filter(r => r.query.includes("|"));
    const nonOrResults = results.filter(r => !r.query.includes("|"));
    
    patterns.orOperatorEffect = {
      withOR: {
        count: orResults.length,
        avgVideosFound: orResults.reduce((sum, r) => sum + r.videosFound, 0) / orResults.length || 0
      },
      withoutOR: {
        count: nonOrResults.length,
        avgVideosFound: nonOrResults.reduce((sum, r) => sum + r.videosFound, 0) / nonOrResults.length || 0
      }
    };

    return patterns;
  }

  /**
   * 📋 분석 요약 출력
   */
  printAnalysisSummary(analysis) {
    console.log('\n📋 포괄적 테스트 결과 요약');
    console.log('='.repeat(60));
    
    console.log('\n📊 전체 통계:');
    console.log(`   총 테스트: ${analysis.overallStats.totalTests}개`);
    console.log(`   성공: ${analysis.overallStats.successfulTests}개`);
    console.log(`   실패: ${analysis.overallStats.failedTests}개`);
    console.log(`   성공률: ${analysis.overallStats.overallSuccessRate.toFixed(1)}%`);
    console.log(`   API 호출: ${analysis.overallStats.totalApiCalls}회`);
    console.log(`   평균 발견 영상: ${analysis.overallStats.avgVideosFound.toFixed(1)}개`);
    console.log(`   평균 응답시간: ${analysis.overallStats.avgResponseTime.toFixed(0)}ms`);

    console.log('\n🏆 최고 성능 쿼리들:');
    analysis.topPerformers.slice(0, 5).forEach((result, index) => {
      console.log(`   ${index + 1}. "${result.query}" - ${result.videosFound}개 영상`);
    });

    console.log('\n💡 핵심 발견 사항:');
    const patterns = analysis.keywordPatterns;
    
    console.log(`   🔹 단순 키워드 평균: ${patterns.simpleVsComplex.simple.avgVideosFound.toFixed(1)}개`);
    console.log(`   🔹 복잡 키워드 평균: ${patterns.simpleVsComplex.complex.avgVideosFound.toFixed(1)}개`);
    console.log(`   🔹 'shorts' 포함 평균: ${patterns.withVsWithoutShorts.withShorts.avgVideosFound.toFixed(1)}개`);
    console.log(`   🔹 'shorts' 미포함 평균: ${patterns.withVsWithoutShorts.withoutShorts.avgVideosFound.toFixed(1)}개`);
    console.log(`   🔹 OR 연산 평균: ${patterns.orOperatorEffect.withOR.avgVideosFound.toFixed(1)}개`);
    console.log(`   🔹 단일 키워드 평균: ${patterns.orOperatorEffect.withoutOR.avgVideosFound.toFixed(1)}개`);
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
  console.log('🧪 포괄적 키워드 테스트 시작');
  console.log(`📅 시작 시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log('⚠️ 이 테스트는 대량의 API 호출을 수행합니다.');

  const tester = new ComprehensiveKeywordTester();
  
  try {
    const resultFilePath = await tester.runComprehensiveTest();
    console.log(`\n✅ 테스트 완료! 결과 파일: ${resultFilePath}`);
  } catch (error) {
    console.error('\n💥 테스트 실행 중 오류:', error);
    process.exit(1);
  }
}

// 직접 실행
if (process.argv[1].endsWith('comprehensive-keyword-test.js')) {
  main();
}

export default ComprehensiveKeywordTester; 