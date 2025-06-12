/**
 * 🧪 OR 쿼리 테스트
 * 
 * OR 연산자 개수가 검색 결과에 미치는 영향 테스트
 */

import YouTubeSearchEngine from './search/modules/youtube-search-engine.js';
import dotenv from 'dotenv';

dotenv.config();

class ORQueryTester {
  constructor() {
    const apiKey = process.env.YOUTUBE_API_KEY;
    this.searchEngine = new YouTubeSearchEngine(apiKey);
  }

  /**
   * 🔍 OR 연산자 개수별 테스트
   */
  async testORVariations() {
    console.log('🧪 OR 연산자 개수별 검색 결과 테스트');
    console.log('='.repeat(60));

    // 기본 키워드
    const baseKeywords = ["댄스", "춤", "운동", "에너지", "활력"];

    const testCases = [
      {
        name: "단일 키워드",
        query: "댄스",
        apiParams: this.createApiParams("댄스")
      },
      {
        name: "2개 OR",
        query: "댄스 | 춤",
        apiParams: this.createApiParams("댄스 | 춤")
      },
      {
        name: "3개 OR", 
        query: "댄스 | 춤 | 운동",
        apiParams: this.createApiParams("댄스 | 춤 | 운동")
      },
      {
        name: "4개 OR (현재 방식)",
        query: "댄스 | 춤 | 운동 | 에너지",
        apiParams: this.createApiParams("댄스 | 춤 | 운동 | 에너지")
      },
      {
        name: "5개 OR",
        query: "댄스 | 춤 | 운동 | 에너지 | 활력",
        apiParams: this.createApiParams("댄스 | 춤 | 운동 | 에너지 | 활력")
      },
      {
        name: "구체적 키워드 (문제 쿼리)",
        query: "잠깨는 댄스 챌린지 | 신나는 아침 루틴 | 활력 운동 영상 | 에너지 넘치는 노래",
        apiParams: this.createApiParams("잠깨는 댄스 챌린지 | 신나는 아침 루틴 | 활력 운동 영상 | 에너지 넘치는 노래")
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      console.log(`\n[${i + 1}/${testCases.length}] ${testCase.name}`);
      console.log(`쿼리: "${testCase.query}"`);

      try {
        const result = await this.searchEngine.searchVideos(testCase.apiParams);

        if (result.success) {
          console.log(`✅ 성공: ${result.videoIds.length}개 영상 발견`);
          console.log(`📊 총 가능 결과: ${result.totalResults.toLocaleString()}개`);
          console.log(`⏱️ 응답 시간: ${result.responseTime}ms`);
          
          // 샘플 1개만 출력
          if (result.data.items && result.data.items.length > 0) {
            const sample = result.data.items[0];
            console.log(`🎬 샘플: "${sample.snippet?.title}"`);
          }
        } else {
          console.log(`❌ 실패: ${result.error}`);
        }

      } catch (error) {
        console.log(`❌ 오류: ${error.message}`);
      }

      // API 호출 간격
      if (i < testCases.length - 1) {
        console.log('⏳ 2초 대기...');
        await this.delay(2000);
      }
    }
  }

  /**
   * 📋 API 파라미터 생성
   */
  createApiParams(query) {
    return {
      part: "snippet",
      videoDuration: "short",
      maxResults: 20, // 테스트용으로 적게
      type: "video",
      regionCode: "KR",
      relevanceLanguage: "ko",
      safeSearch: "moderate",
      videoEmbeddable: "true",
      q: query,
      order: "relevance"
    };
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
  console.log('🧪 OR 쿼리 영향 분석 테스트');
  console.log(`📅 실행 시간: ${new Date().toLocaleString('ko-KR')}`);

  const tester = new ORQueryTester();
  
  try {
    await tester.testORVariations();
    console.log('\n✅ 테스트 완료!');
  } catch (error) {
    console.error('\n💥 테스트 실행 중 오류:', error);
    process.exit(1);
  }
}

// 직접 실행
if (process.argv[1].endsWith('test-or-query.js')) {
  main();
}

export default ORQueryTester; 