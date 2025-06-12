import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import YouTubeSearchEngine from './search/modules/youtube-search-engine.js';

// 환경변수 로드
dotenv.config();

async function testBTSSpecificKeywordsSimple() {
  console.log('🎯 BTS 특정 키워드 단독 검색 테스트 (기본 엔진)');
  console.log('목적: OR 연산에서 무시된 키워드들의 단독 검색 성능 확인\n');

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('❌ YOUTUBE_API_KEY가 설정되지 않았습니다.');
    return;
  }

  const searchEngine = new YouTubeSearchEngine(apiKey);

  const testCases = [
    {
      testId: 1,
      testName: "BTS 댄스 단독 검색",
      query: "BTS 댄스",
      category: "dance_specific",
      description: "OR 연산에서 무시된 댄스 키워드의 단독 검색 결과"
    },
    {
      testId: 2,
      testName: "BTS 브이로그 단독 검색", 
      query: "BTS 브이로그",
      category: "vlog_specific",
      description: "OR 연산에서 완전히 무시된 브이로그 키워드의 단독 검색 결과"
    }
  ];

  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n📋 테스트 ${testCase.testId}: ${testCase.testName}`);
    console.log(`🔍 검색어: "${testCase.query}"`);
    
    try {
      const startTime = Date.now();
      
      // 기본 YouTube 검색 실행
      const searchResult = await searchEngine.searchVideos({
        q: testCase.query,
        type: 'video',
        videoDuration: 'short',
        maxResults: 50,
        part: 'snippet',
        regionCode: 'KR',
        relevanceLanguage: 'ko'
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // 결과 처리 - raw 데이터 그대로 저장
      const result = {
        ...testCase,
        success: true,
        responseTime,
        timestamp: new Date().toISOString(),
        rawSearchResult: searchResult, // 전체 응답 데이터 저장
        apiCost: 100
      };
      
      results.push(result);
      
      console.log(`✅ 성공: API 응답 받음, ${responseTime}ms`);
      console.log(`📊 응답 데이터 저장 완료`);
      
    } catch (error) {
      console.error(`❌ 실패: ${error.message}`);
      
      results.push({
        ...testCase,
        success: false,
        error: error.message,
        responseTime: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // API 요청 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 결과 요약
  console.log('\n\n📊 === 테스트 결과 요약 ===');
  console.log(`총 테스트: ${results.length}개`);
  console.log(`성공: ${results.filter(r => r.success).length}개`);
  console.log(`실패: ${results.filter(r => !r.success).length}개`);
  
  const totalApiCost = results.reduce((sum, r) => sum + (r.apiCost || 0), 0);
  const avgResponseTime = results.filter(r => r.success && r.responseTime > 0)
    .reduce((sum, r, _, arr) => sum + r.responseTime / arr.length, 0);
  
  console.log(`평균 응답 시간: ${Math.round(avgResponseTime)}ms`);
  console.log(`총 API 비용: ${totalApiCost} units`);
  console.log(`📊 Raw 데이터 저장 완료 - JSON 파일에서 분석 가능`);
  
  // 결과 파일 저장
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `bts-specific-keywords-simple-${timestamp}.json`;
  const filepath = path.join(process.cwd(), filename);
  
  const outputData = {
    testInfo: {
      testName: "BTS 특정 키워드 단독 검색 테스트 (기본 엔진)",
      purpose: "OR 연산에서 무시된 키워드들의 단독 검색 성능 확인",
      engine: "기본 YouTube Search Engine (search.list만 사용)",
      totalTests: results.length,
      successfulTests: results.filter(r => r.success).length,
      totalVideos: 0, // raw 데이터에서 확인 필요
      averageResponseTime: Math.round(avgResponseTime),
      totalApiCost,
      timestamp: new Date().toISOString()
    },
    results
  };
  
  fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`\n💾 결과가 저장되었습니다: ${filename}`);
  
  return results;
}

// 실행
testBTSSpecificKeywordsSimple()
  .then(() => {
    console.log('\n🎉 BTS 특정 키워드 테스트 완료!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 테스트 실행 중 오류:', error);
    process.exit(1);
  });

export default testBTSSpecificKeywordsSimple; 