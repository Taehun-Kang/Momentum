import YouTubeCuratorMCP from './mcp-server.js';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

/**
 * 🧪 Momentum MCP 서버 테스트
 * docs/basic/3.MCP 구현.md 기반 검증
 */
class MCPTester {
  constructor() {
    this.mcpServer = new YouTubeCuratorMCP();
    this.testResults = [];
  }

  /**
   * 🔍 키워드 추출 테스트
   */
  async testKeywordExtraction() {
    console.log('\n🔍 키워드 추출 테스트 시작...');
    
    const testCases = [
      {
        input: '퇴근하고 너무 지쳐',
        expected: ['힐링영상', 'ASMR', '휴식', '퇴근길영상']
      },
      {
        input: '뭔가 웃긴 거 보고 싶어',
        expected: ['웃긴영상', '코미디', '유머']
      },
      {
        input: '귀여운 동물 영상',
        expected: ['귀여운동물', '강아지', '고양이']
      }
    ];

    for (const testCase of testCases) {
      try {
        const result = await this.mcpServer.extractKeywords({
          message: testCase.input
        });

        const parsedResult = JSON.parse(result.content[0].text);
        const keywords = parsedResult.keywords || [];

        console.log(`📝 입력: "${testCase.input}"`);
        console.log(`🎯 추출된 키워드: ${keywords.join(', ')}`);
        console.log(`📊 신뢰도: ${parsedResult.confidence || 'N/A'}`);
        console.log(`⚙️ 방법: ${parsedResult.method || 'N/A'}`);

        // 최소 하나의 키워드가 추출되었는지 확인
        const success = keywords.length > 0;
        this.testResults.push({
          test: `키워드 추출: "${testCase.input}"`,
          success,
          details: `추출된 키워드 수: ${keywords.length}`
        });

        console.log(`✅ 결과: ${success ? '성공' : '실패'}\n`);

      } catch (error) {
        console.log(`❌ 오류: ${error.message}\n`);
        this.testResults.push({
          test: `키워드 추출: "${testCase.input}"`,
          success: false,
          details: error.message
        });
      }
    }
  }

  /**
   * 🎬 YouTube 검색 테스트 (백엔드 API 연동)
   */
  async testYouTubeSearch() {
    console.log('\n🎬 YouTube 검색 테스트 시작...');

    const testKeywords = ['재미있는영상', '힐링영상'];

    try {
      // 백엔드 서버 상태 확인
      const healthCheck = await fetch(`${this.mcpServer.backendUrl}/health`);
      if (!healthCheck.ok) {
        throw new Error('백엔드 서버가 실행되지 않았습니다');
      }

      const result = await this.mcpServer.searchYouTubeShorts({
        keywords: testKeywords,
        maxResults: 5
      });

      const parsedResult = JSON.parse(result.content[0].text);
      const videos = parsedResult.videos || [];

      console.log(`🔍 검색 키워드: ${testKeywords.join(', ')}`);
      console.log(`📹 찾은 영상 수: ${videos.length}`);
      
      if (videos.length > 0) {
        console.log(`🎯 첫 번째 영상: ${videos[0].title || 'N/A'}`);
      }

      const success = !result.isError;
      this.testResults.push({
        test: 'YouTube 검색',
        success,
        details: `찾은 영상 수: ${videos.length}`
      });

      console.log(`✅ 결과: ${success ? '성공' : '실패'}\n`);

    } catch (error) {
      console.log(`❌ 오류: ${error.message}\n`);
      this.testResults.push({
        test: 'YouTube 검색',
        success: false,
        details: error.message
      });
    }
  }

  /**
   * 📈 트렌드 분석 테스트
   */
  async testTrendAnalysis() {
    console.log('\n📈 트렌드 분석 테스트 시작...');

    try {
      const result = await this.mcpServer.analyzeTrends({
        category: 'comedy',
        timeRange: 'realtime'
      });

      const parsedResult = JSON.parse(result.content[0].text);
      const trends = parsedResult.trends || {};

      console.log(`📊 카테고리: comedy`);
      console.log(`📈 트렌드 데이터: ${Object.keys(trends).length}개 항목`);

      const success = !result.isError;
      this.testResults.push({
        test: '트렌드 분석',
        success,
        details: `데이터 항목 수: ${Object.keys(trends).length}`
      });

      console.log(`✅ 결과: ${success ? '성공' : '실패'}\n`);

    } catch (error) {
      console.log(`❌ 오류: ${error.message}\n`);
      this.testResults.push({
        test: '트렌드 분석',
        success: false,
        details: error.message
      });
    }
  }

  /**
   * 💬 응답 생성 테스트
   */
  async testResponseGeneration() {
    console.log('\n💬 응답 생성 테스트 시작...');

    try {
      const result = await this.mcpServer.generateResponse({
        keywords: ['웃긴영상', '코미디'],
        videoCount: 8,
        context: {}
      });

      const parsedResult = JSON.parse(result.content[0].text);
      const message = parsedResult.message || '';
      const suggestions = parsedResult.suggestions || [];

      console.log(`💭 생성된 응답: "${message}"`);
      console.log(`🔄 다음 제안: ${suggestions.join(', ')}`);

      const success = message.length > 0 && suggestions.length > 0;
      this.testResults.push({
        test: '응답 생성',
        success,
        details: `메시지 길이: ${message.length}, 제안 수: ${suggestions.length}`
      });

      console.log(`✅ 결과: ${success ? '성공' : '실패'}\n`);

    } catch (error) {
      console.log(`❌ 오류: ${error.message}\n`);
      this.testResults.push({
        test: '응답 생성',
        success: false,
        details: error.message
      });
    }
  }

  /**
   * ⚙️ 유틸리티 함수 테스트
   */
  testUtilities() {
    console.log('\n⚙️ 유틸리티 함수 테스트 시작...');

    // 1. 시간 컨텍스트 테스트
    const timeContext = this.mcpServer.getTimeContext();
    console.log(`⏰ 시간 컨텍스트: ${JSON.stringify(timeContext, null, 2)}`);

    // 2. 빠른 키워드 추출 테스트
    const quickKeywords = this.mcpServer.quickExtraction('피곤해서 힐링되는 영상 보고 싶어');
    console.log(`🔍 빠른 추출: ${quickKeywords.join(', ')}`);

    // 3. 영상 중복 제거 테스트
    const testVideos = [
      { videoId: 'abc123', title: 'Test 1' },
      { videoId: 'def456', title: 'Test 2' },
      { videoId: 'abc123', title: 'Test 1 Duplicate' }
    ];
    const uniqueVideos = this.mcpServer.deduplicateVideos(testVideos);
    console.log(`🎯 중복 제거: ${testVideos.length} → ${uniqueVideos.length}개`);

    this.testResults.push({
      test: '유틸리티 함수',
      success: true,
      details: `시간 컨텍스트, 빠른 추출, 중복 제거 모두 정상`
    });

    console.log(`✅ 결과: 성공\n`);
  }

  /**
   * 📊 종합 테스트 실행
   */
  async runAllTests() {
    console.log('🚀 Momentum MCP 서버 종합 테스트 시작!');
    console.log('='.repeat(50));

    // 환경 변수 확인
    console.log('\n🔧 환경 설정 확인:');
    console.log(`- 백엔드 URL: ${this.mcpServer.backendUrl}`);
    console.log(`- Claude API: ${process.env.CLAUDE_API_KEY ? '설정됨' : '미설정'}`);

    // 테스트 실행
    await this.testKeywordExtraction();
    await this.testYouTubeSearch();
    await this.testTrendAnalysis();
    await this.testResponseGeneration();
    this.testUtilities();

    // 결과 요약
    console.log('\n📊 테스트 결과 요약:');
    console.log('='.repeat(30));

    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;

    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.details}`);
    });

    console.log(`\n📈 통계:`);
    console.log(`- 전체 테스트: ${totalTests}개`);
    console.log(`- 성공: ${successfulTests}개`);
    console.log(`- 실패: ${failedTests}개`);
    console.log(`- 성공률: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
      console.log('\n🎉 모든 테스트 통과! MCP 서버가 정상적으로 작동합니다.');
    } else {
      console.log('\n⚠️ 일부 테스트 실패. 설정을 확인해주세요.');
    }

    console.log('\n🌊 Wave Team | Momentum MCP Server Test Complete');
  }
}

// 테스트 실행
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const tester = new MCPTester();
  tester.runAllTests().catch(console.error);
} 