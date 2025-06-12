/**
 * 🧪 OR 연산 비교 테스트
 * 
 * 기본 키워드 5개 OR vs 복합 키워드 5개 OR 비교
 */

import YouTubeSearchEngine from './search/modules/youtube-search-engine.js';
import dotenv from 'dotenv';

dotenv.config();

class ORComparisonTester {
  constructor() {
    const apiKey = process.env.YOUTUBE_API_KEY;
    this.searchEngine = new YouTubeSearchEngine(apiKey);
  }

  /**
   * 🔍 OR 연산 비교 테스트 실행
   */
  async runComparisonTest() {
    console.log('🧪 OR 연산 비교 테스트 시작');
    console.log('='.repeat(60));

    // 테스트 케이스 정의
    const testCases = [
      {
        name: "기본 키워드 5개 OR",
        query: "댄스 | 노래 | 운동 | 요리 | 고양이",
        description: "단순한 키워드들의 OR 조합"
      },
      {
        name: "복합 키워드 5개 OR", 
        query: "신나는 댄스 | 재미있는 노래 | 웃긴 운동 | 맛있는 요리 | 귀여운 고양이",
        description: "감정 수식어가 포함된 복합 키워드들의 OR 조합"
      }
    ];

    const results = [];

    // API 파라미터 (기본 설정)
    const apiParams = {
      part: "snippet",
      videoDuration: "short",
      maxResults: 20,
      type: "video",
      regionCode: "KR", 
      relevanceLanguage: "ko",
      safeSearch: "moderate",
      order: "relevance"
    };

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      console.log(`\n[${i + 1}/2] ${testCase.name}`);
      console.log(`쿼리: "${testCase.query}"`);
      console.log(`설명: ${testCase.description}`);

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
          console.log(`✅ 성공!`);
          console.log(`   📊 발견 영상: ${searchResult.videoIds.length}개`);
          console.log(`   📈 총 결과: ${searchResult.totalResults.toLocaleString()}개`);
          console.log(`   ⏱️ 응답 시간: ${responseTime}ms`);
          console.log(`   🔗 다음 페이지: ${searchResult.nextPageToken ? 'O' : 'X'}`);
          
          // 샘플 영상 3개 출력
          if (searchResult.data?.items?.length > 0) {
            console.log(`   🎬 샘플 영상들:`);
            searchResult.data.items.slice(0, 3).forEach((video, index) => {
              const title = video.snippet.title.substring(0, 60);
              console.log(`      ${index + 1}. "${title}..."`);
              console.log(`         채널: ${video.snippet.channelTitle}`);
            });
          }

          results.push({
            name: testCase.name,
            query: testCase.query,
            success: true,
            videosFound: searchResult.videoIds.length,
            totalResults: searchResult.totalResults,
            responseTime: responseTime,
            hasNextPage: !!searchResult.nextPageToken,
            sampleVideos: searchResult.data?.items?.slice(0, 3).map(v => ({
              title: v.snippet.title,
              channel: v.snippet.channelTitle,
              videoId: v.id.videoId
            })) || []
          });

        } else {
          console.log(`❌ 실패: ${searchResult.error}`);
          results.push({
            name: testCase.name,
            query: testCase.query,
            success: false,
            error: searchResult.error
          });
        }

      } catch (error) {
        console.log(`💥 오류: ${error.message}`);
        results.push({
          name: testCase.name,
          query: testCase.query,
          success: false,
          error: error.message
        });
      }

      // API 호출 간격
      if (i < testCases.length - 1) {
        console.log('\n⏳ 잠시 대기 중...');
        await this.delay(2000);
      }
    }

    // 결과 비교 분석
    this.analyzeResults(results);
    
    return results;
  }

  /**
   * 📈 결과 비교 분석
   */
  analyzeResults(results) {
    console.log('\n📈 OR 연산 비교 분석');
    console.log('='.repeat(60));

    const successfulResults = results.filter(r => r.success);

    if (successfulResults.length === 2) {
      const [basic, complex] = successfulResults;

      console.log('\n📊 성능 비교:');
      console.log(`   기본 키워드: ${basic.videosFound}개, ${basic.responseTime}ms`);
      console.log(`   복합 키워드: ${complex.videosFound}개, ${complex.responseTime}ms`);
      
      const speedDiff = basic.responseTime - complex.responseTime;
      if (speedDiff > 0) {
        console.log(`   🚀 복합 키워드가 ${speedDiff}ms 더 빠름`);
      } else if (speedDiff < 0) {
        console.log(`   🚀 기본 키워드가 ${Math.abs(speedDiff)}ms 더 빠름`);
      } else {
        console.log(`   ⚖️ 응답 시간 동일`);
      }

      console.log('\n🎯 콘텐츠 차이:');
      console.log(`   기본 키워드 총 결과: ${basic.totalResults.toLocaleString()}개`);
      console.log(`   복합 키워드 총 결과: ${complex.totalResults.toLocaleString()}개`);

      if (basic.totalResults > complex.totalResults) {
        const ratio = (basic.totalResults / complex.totalResults).toFixed(1);
        console.log(`   📈 기본 키워드가 ${ratio}배 더 많은 콘텐츠`);
      } else if (complex.totalResults > basic.totalResults) {
        const ratio = (complex.totalResults / basic.totalResults).toFixed(1);
        console.log(`   📈 복합 키워드가 ${ratio}배 더 많은 콘텐츠`);
      }

      console.log('\n🎬 콘텐츠 성격 비교:');
      console.log('   기본 키워드 샘플:');
      basic.sampleVideos.forEach((video, index) => {
        console.log(`      ${index + 1}. "${video.title.substring(0, 50)}..."`);
      });
      
      console.log('   복합 키워드 샘플:');
      complex.sampleVideos.forEach((video, index) => {
        console.log(`      ${index + 1}. "${video.title.substring(0, 50)}..."`);
      });

    } else {
      console.log('❌ 일부 테스트 실패로 비교 분석 불가');
    }

    console.log('\n💡 결론:');
    if (successfulResults.length === 2) {
      const [basic, complex] = successfulResults;
      
      if (basic.responseTime < complex.responseTime && basic.totalResults > complex.totalResults) {
        console.log('   🏆 기본 키워드가 속도와 콘텐츠 양 모두 우수');
      } else if (complex.responseTime < basic.responseTime && complex.totalResults > basic.totalResults) {
        console.log('   🏆 복합 키워드가 속도와 콘텐츠 양 모두 우수');
      } else {
        console.log('   ⚖️ 각각 장단점이 있음 - 상황에 따라 선택');
      }
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
 * 🎯 메인 실행
 */
async function main() {
  console.log('🧪 OR 연산 비교 테스트 시작');
  console.log(`📅 시작 시간: ${new Date().toLocaleString('ko-KR')}`);

  const tester = new ORComparisonTester();
  
  try {
    await tester.runComparisonTest();
    console.log('\n✅ 테스트 완료!');
  } catch (error) {
    console.error('\n💥 테스트 실행 중 오류:', error);
    process.exit(1);
  }
}

// 직접 실행
if (process.argv[1].endsWith('or-comparison-test.js')) {
  main();
}

export default ORComparisonTester; 