import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { searchYouTubeShorts } from './search/index.js';

// 환경변수 로드
dotenv.config();

async function testBTSSpecificKeywords() {
  console.log('🎯 BTS 특정 키워드 단독 검색 테스트 시작');
  console.log('목적: OR 연산에서 무시된 키워드들의 단독 검색 성능 확인\n');

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
      
      // YouTube 검색 실행
      const searchResult = await searchYouTubeShorts(testCase.query, {
        targetResults: 50,
        maxPages: 5,
        useCache: false,
        minViewCount: 100,  // 낮은 기준으로 더 많은 영상 포함
        minEngagementRate: 0.001  // 매우 낮은 기준
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // 결과 처리
      const result = {
        ...testCase,
        success: searchResult.success,
        videosFound: searchResult.videos?.length || 0,
        totalResults: searchResult.metadata?.totalProcessed || 0,
        responseTime,
        hasNextPage: false,
        nextPageToken: null,
        apiCost: (searchResult.metadata?.pagesSearched || 1) * 109, // 실제 API 비용 계산
        timestamp: new Date().toISOString(),
        videoDetails: searchResult.videos?.map(video => ({
          videoId: video.id || 'N/A',
          title: video.title || 'No title',
          channelTitle: video.channelTitle || 'Unknown',
          channelId: video.channelId || 'Unknown',
          publishedAt: video.publishedAt || 'Unknown',
          duration: video.duration || 0,
          viewCount: video.viewCount || 0,
          likeCount: video.likeCount || 0,
          commentCount: video.commentCount || 0,
          engagement: video.engagement || 0,
          isPlayable: video.isPlayable !== false,
          description: `Views: ${video.viewCount || 0}, Likes: ${video.likeCount || 0}, Duration: ${video.duration || 0}s`,
          thumbnailUrl: 'No thumbnail'
        })) || [],
        sampleTitles: searchResult.videos?.slice(0, 10).map(video => 
          video.title || 'No title'
        ) || [],
        searchMetadata: searchResult.metadata || {},
        searchSummary: searchResult.summary || {}
      };
      
      results.push(result);
      
      console.log(`✅ 성공: ${result.videosFound}개 영상, ${responseTime}ms`);
      console.log(`📊 총 결과: ${result.totalResults.toLocaleString()}개`);
      console.log(`🔗 다음 페이지: ${result.hasNextPage ? '있음' : '없음'}`);
      
      // 샘플 제목 표시
      console.log('\n📝 상위 10개 영상 제목:');
      result.sampleTitles.forEach((title, index) => {
        console.log(`   ${index + 1}. ${title}`);
      });
      
    } catch (error) {
      console.error(`❌ 실패: ${error.message}`);
      
      results.push({
        ...testCase,
        success: false,
        error: error.message,
        videosFound: 0,
        totalResults: 0,
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
  
  const totalVideos = results.reduce((sum, r) => sum + (r.videosFound || 0), 0);
  const totalApiCost = results.reduce((sum, r) => sum + (r.apiCost || 0), 0);
  const avgResponseTime = results.filter(r => r.success && r.responseTime > 0)
    .reduce((sum, r, _, arr) => sum + r.responseTime / arr.length, 0);
  
  console.log(`총 영상 수: ${totalVideos}개`);
  console.log(`평균 응답 시간: ${Math.round(avgResponseTime)}ms`);
  console.log(`총 API 비용: ${totalApiCost} units`);
  
  // 결과 파일 저장
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `bts-specific-keywords-test-${timestamp}.json`;
  const filepath = path.join(process.cwd(), filename);
  
  const outputData = {
    testInfo: {
      testName: "BTS 특정 키워드 단독 검색 테스트",
      purpose: "OR 연산에서 무시된 키워드들의 단독 검색 성능 확인",
      totalTests: results.length,
      successfulTests: results.filter(r => r.success).length,
      totalVideos,
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
testBTSSpecificKeywords()
  .then(() => {
    console.log('\n🎉 BTS 특정 키워드 테스트 완료!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 테스트 실행 중 오류:', error);
    process.exit(1);
  });

export default testBTSSpecificKeywords; 