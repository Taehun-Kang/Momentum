/**
 * 🎯 YouTube 쿼리 생성 도구 테스트
 * 
 * 새로 추가된 generate_youtube_search_queries 도구를 테스트
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

class YouTubeQueryGeneratorTester {
  constructor() {
    this.mcpServerUrl = 'http://localhost:3000';
  }

  /**
   * 🧪 기본 쿼리 생성 테스트
   */
  async testBasicQueryGeneration() {
    console.log('\n🧪 기본 쿼리 생성 테스트');
    
    try {
      const response = await axios.post(`${this.mcpServerUrl}/api/tools/call`, {
        name: 'generate_youtube_search_queries',
        arguments: {
          searchKeyword: '먹방',
          userIntent: '인기 영상',
          contentType: '음식',
          timeframe: '이번주',
          maxQueries: 3
        }
      });

      console.log('✅ 기본 테스트 성공:');
      console.log(JSON.stringify(response.data.result, null, 2));
      
      return response.data.result;
    } catch (error) {
      console.error('❌ 기본 테스트 실패:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * 🎮 게임 콘텐츠 쿼리 테스트
   */
  async testGameContentQueries() {
    console.log('\n🎮 게임 콘텐츠 쿼리 테스트');
    
    try {
      const response = await axios.post(`${this.mcpServerUrl}/api/tools/call`, {
        name: 'generate_youtube_search_queries',
        arguments: {
          searchKeyword: '롤',
          userIntent: '트렌드 영상',
          contentType: '게임',
          timeframe: '오늘',
          audience: '청소년',
          maxQueries: 4
        }
      });

      console.log('✅ 게임 테스트 성공:');
      const result = response.data.result;
      
      // 생성된 쿼리들 요약 출력
      if (result.youtube_queries) {
        console.log(`📊 생성된 쿼리 수: ${result.youtube_queries.length}`);
        result.youtube_queries.forEach((query, index) => {
          console.log(`${index + 1}. ${query.strategy_name}`);
          console.log(`   검색어: ${query.api_query.q}`);
          console.log(`   정렬: ${query.api_query.order}`);
          console.log(`   카테고리: ${query.api_query.videoCategoryId || '지정 안됨'}`);
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ 게임 테스트 실패:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * 🎵 음악 콘텐츠 쿼리 테스트
   */
  async testMusicContentQueries() {
    console.log('\n🎵 음악 콘텐츠 쿼리 테스트');
    
    try {
      const response = await axios.post(`${this.mcpServerUrl}/api/tools/call`, {
        name: 'generate_youtube_search_queries',
        arguments: {
          searchKeyword: 'K-pop',
          userIntent: '최신 트렌드',
          contentType: '음악',
          timeframe: '이번달',
          maxQueries: 5
        }
      });

      console.log('✅ 음악 테스트 성공:');
      const result = response.data.result;
      
      // API 비용 분석
      if (result.usage_recommendation) {
        console.log('\n💰 API 비용 분석:');
        console.log(`총 예상 비용: ${result.usage_recommendation.estimated_total_cost} units`);
        console.log(`일일 예산 사용률: ${result.usage_recommendation.daily_limit_usage}`);
        console.log(`최대 일일 실행 횟수: ${result.usage_recommendation.max_daily_executions}회`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ 음악 테스트 실패:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * 🔄 폴백 테스트 (Claude API 없이)
   */
  async testFallbackMode() {
    console.log('\n🔄 폴백 모드 테스트');
    
    // Claude API 키를 임시로 제거한 상태에서 테스트
    const originalKey = process.env.CLAUDE_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    
    try {
      const response = await axios.post(`${this.mcpServerUrl}/api/tools/call`, {
        name: 'generate_youtube_search_queries',
        arguments: {
          searchKeyword: '요리',
          maxQueries: 2
        }
      });

      console.log('✅ 폴백 테스트 결과:');
      if (response.data.result.fallback_queries) {
        console.log('폴백 쿼리가 정상적으로 생성됨');
      }
      
      return response.data.result;
    } catch (error) {
      console.log('✅ 예상된 폴백 에러:', error.response?.data?.error || error.message);
      return null;
    } finally {
      // API 키 복원
      if (originalKey) {
        process.env.CLAUDE_API_KEY = originalKey;
      }
    }
  }

  /**
   * 📊 쿼리 품질 평가
   */
  analyzeQueryQuality(queries) {
    if (!queries || !Array.isArray(queries)) {
      return { quality: 'unknown', issues: ['결과 없음'] };
    }

    const issues = [];
    let qualityScore = 100;

    // 중복 검사
    const queryStrings = queries.map(q => q.api_query.q);
    const uniqueQueries = new Set(queryStrings);
    if (uniqueQueries.size < queryStrings.length) {
      issues.push('중복된 검색어 존재');
      qualityScore -= 20;
    }

    // 필수 매개변수 검사
    queries.forEach((query, index) => {
      if (!query.api_query.videoDuration || query.api_query.videoDuration !== 'short') {
        issues.push(`쿼리 ${index + 1}: videoDuration이 'short'가 아님`);
        qualityScore -= 10;
      }
      
      if (!query.api_query.videoEmbeddable || query.api_query.videoEmbeddable !== 'true') {
        issues.push(`쿼리 ${index + 1}: videoEmbeddable이 'true'가 아님`);
        qualityScore -= 10;
      }
    });

    // 다양성 검사
    const orders = queries.map(q => q.api_query.order).filter(Boolean);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size < 2 && queries.length > 2) {
      issues.push('정렬 기준의 다양성 부족');
      qualityScore -= 15;
    }

    return {
      quality: qualityScore >= 80 ? 'excellent' : qualityScore >= 60 ? 'good' : 'poor',
      score: qualityScore,
      issues: issues.length > 0 ? issues : ['문제 없음']
    };
  }

  /**
   * 🏃‍♂️ 전체 테스트 실행
   */
  async runAllTests() {
    console.log('🎯 YouTube 쿼리 생성 도구 전체 테스트 시작\n');
    
    const results = {
      basic: null,
      game: null,
      music: null,
      fallback: null
    };

    // 1. 기본 테스트
    results.basic = await this.testBasicQueryGeneration();
    
    // 2. 게임 콘텐츠 테스트
    results.game = await this.testGameContentQueries();
    
    // 3. 음악 콘텐츠 테스트  
    results.music = await this.testMusicContentQueries();
    
    // 4. 폴백 모드 테스트
    results.fallback = await this.testFallbackMode();

    // 결과 분석
    console.log('\n📊 전체 테스트 결과 분석:');
    
    Object.entries(results).forEach(([testName, result]) => {
      if (result && result.youtube_queries) {
        const quality = this.analyzeQueryQuality(result.youtube_queries);
        console.log(`${testName}: ${quality.quality} (${quality.score}점)`);
        if (quality.issues.length > 0) {
          console.log(`  이슈: ${quality.issues.join(', ')}`);
        }
      } else {
        console.log(`${testName}: 실패 또는 결과 없음`);
      }
    });

    return results;
  }
}

// 메인 실행
async function main() {
  const tester = new YouTubeQueryGeneratorTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ 테스트 실행 실패:', error);
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default YouTubeQueryGeneratorTester; 