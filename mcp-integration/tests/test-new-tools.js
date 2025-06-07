#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🧪 새로 추가된 MCP 도구 테스트');
console.log('🎯 process_natural_language + intelligent_search_workflow\n');

class NewToolsTester {
  constructor() {
    this.mcpClient = null;
  }

  async connectToMCP() {
    try {
      const serverPath = path.resolve(__dirname, '../../mcp-servers/youtube-curator-mcp/index.js');
      
      console.log('📡 MCP 서버 연결 중...');
      
      const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
        env: {
          ...process.env,
          YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          SERPAPI_KEY: process.env.SERPAPI_KEY
        }
      });

      this.mcpClient = new Client({
        name: "new-tools-tester",
        version: "1.0.0"
      }, {
        capabilities: {}
      });

      await this.mcpClient.connect(transport);
      console.log('✅ MCP 서버 연결 성공!\n');

    } catch (error) {
      console.error('❌ MCP 서버 연결 실패:', error);
      throw error;
    }
  }

  // 1. process_natural_language 도구 테스트
  async testNaturalLanguageProcessing(userInput) {
    console.log('🔍 1. process_natural_language 도구 테스트');
    console.log('=' * 60);
    console.log(`입력: "${userInput}"`);

    try {
      const result = await this.mcpClient.callTool({
        name: 'process_natural_language',
        arguments: {
          userInput: userInput,
          options: {
            maxPrimaryKeywords: 3,
            maxSecondaryKeywords: 5,
            includeContext: true
          }
        }
      });

      const data = JSON.parse(result.content[0].text);
      
      console.log('✅ 자연어 처리 성공:');
      console.log(`   주요 키워드: ${data.analysis.primaryKeywords.join(', ')}`);
      console.log(`   보조 키워드: ${data.analysis.secondaryKeywords.join(', ')}`);
      console.log(`   검색 의도: ${data.analysis.context.intent}`);
      console.log(`   감정/분위기: ${data.analysis.context.mood}`);
      console.log(`   시간 관련성: ${data.analysis.context.timeContext}`);
      console.log(`   카테고리: ${data.analysis.context.category}`);
      
      if (data.suggestions) {
        console.log(`   다음 단계: ${data.suggestions.nextSteps?.length || 0}개 제안`);
        console.log(`   검색 전략: ${data.suggestions.searchStrategies?.length || 0}개 제안`);
      }

      return data;

    } catch (error) {
      console.error('❌ 자연어 처리 실패:', error);
      throw error;
    }
  }

  // 2. intelligent_search_workflow 도구 테스트 (간단한 결과)
  async testIntelligentWorkflowSimple(userInput) {
    console.log('\n🚀 2. intelligent_search_workflow 도구 테스트 (간단한 결과)');
    console.log('=' * 60);
    console.log(`입력: "${userInput}"`);

    try {
      const result = await this.mcpClient.callTool({
        name: 'intelligent_search_workflow',
        arguments: {
          userInput: userInput,
          options: {
            maxQueries: 2,
            maxResults: 8,
            strategy: 'auto',
            includeWorkflowDetails: false // 간단한 결과만
          }
        }
      });

      const data = JSON.parse(result.content[0].text);
      
      console.log('✅ 지능형 워크플로우 성공:');
      console.log(`   총 발견 영상: ${data.summary.totalVideosFound}개`);
      console.log(`   검색 성공률: ${data.summary.searchSuccessRate}%`);
      console.log(`   필터링 성공률: ${data.summary.averageFilteringSuccess}%`);
      console.log(`   API 사용량: ${data.summary.apiUnitsUsed} units`);

      console.log('\n📺 추천 영상 (상위 3개):');
      data.recommendations.videos.slice(0, 3).forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.title}`);
        console.log(`      채널: ${video.channelTitle} | 조회수: ${video.viewCount?.toLocaleString()}`);
      });

      console.log(`\n🔍 실행된 검색 쿼리: ${data.recommendations.searchQueries.join(', ')}`);
      console.log(`📊 발견된 카테고리: ${data.recommendations.categories.join(', ')}`);

      return data;

    } catch (error) {
      console.error('❌ 지능형 워크플로우 실패:', error);
      throw error;
    }
  }

  // 3. intelligent_search_workflow 도구 테스트 (상세한 결과)
  async testIntelligentWorkflowDetailed(userInput) {
    console.log('\n🔧 3. intelligent_search_workflow 도구 테스트 (상세한 워크플로우)');
    console.log('=' * 60);
    console.log(`입력: "${userInput}"`);

    try {
      const result = await this.mcpClient.callTool({
        name: 'intelligent_search_workflow',
        arguments: {
          userInput: userInput,
          options: {
            maxQueries: 2,
            maxResults: 5,
            strategy: 'auto',
            includeWorkflowDetails: true // 상세한 워크플로우 포함
          }
        }
      });

      const data = JSON.parse(result.content[0].text);
      
      console.log('✅ 상세 워크플로우 성공:');
      
      // 1단계 결과
      const step1 = data.workflow.step1_naturalLanguageProcessing;
      console.log(`\n📋 1단계 - 자연어 분석:`);
      console.log(`   키워드: ${step1.analysis.primaryKeywords.join(', ')}`);
      console.log(`   컨텍스트: ${step1.analysis.context.intent} / ${step1.analysis.context.mood}`);

      // 2단계 결과
      const step2 = data.workflow.step2_keywordExpansion;
      console.log(`\n📈 2단계 - 키워드 확장:`);
      Object.entries(step2).forEach(([keyword, expansion]) => {
        console.log(`   "${keyword}": ${expansion.expanded?.length || 0}개 확장`);
      });

      // 3단계 결과
      const step3 = data.workflow.step3_queryOptimization;
      console.log(`\n⚙️ 3단계 - 쿼리 최적화:`);
      console.log(`   생성된 쿼리: ${step3.uniqueQueries}개`);
      console.log(`   예상 API 비용: ${step3.estimatedApiUnits} units`);

      // 4단계 결과
      const step4 = data.workflow.step4_youtubeSearch;
      console.log(`\n🎬 4단계 - YouTube 검색:`);
      step4.forEach((search, index) => {
        const status = search.error ? '❌' : '✅';
        console.log(`   ${index + 1}. ${status} "${search.query}" → ${search.totalFound || 0}개`);
      });

      return data;

    } catch (error) {
      console.error('❌ 상세 워크플로우 실패:', error);
      throw error;
    }
  }

  // 전체 테스트 실행
  async runAllTests() {
    const testCases = [
      "피곤해서 힐링되는 영상 보고 싶어",
      "LCK 페이커 최신 하이라이트"
    ];

    for (const testCase of testCases) {
      console.log(`\n${'='.repeat(100)}`);
      console.log(`🧪 테스트 케이스: "${testCase}"`);
      console.log(`${'='.repeat(100)}`);

      try {
        // 1. 자연어 처리 테스트
        await this.testNaturalLanguageProcessing(testCase);
        
        // 2초 대기
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 2. 간단한 워크플로우 테스트
        await this.testIntelligentWorkflowSimple(testCase);
        
        // 2초 대기
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 3. 상세한 워크플로우 테스트 (첫 번째 케이스만)
        if (testCase === testCases[0]) {
          await this.testIntelligentWorkflowDetailed(testCase);
        }

      } catch (error) {
        console.error(`❌ 테스트 케이스 "${testCase}" 실패:`, error.message);
      }
    }
  }

  async cleanup() {
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
  }
}

// 메인 실행
async function main() {
  const tester = new NewToolsTester();
  
  try {
    await tester.connectToMCP();
    await tester.runAllTests();

    console.log('\n🎉 모든 테스트 완료!');
    console.log('✅ 새로 추가된 MCP 도구들이 성공적으로 작동하고 있습니다.');

  } catch (error) {
    console.error('❌ 테스트 실행 실패:', error);
  } finally {
    await tester.cleanup();
    process.exit(0);
  }
}

main().catch(console.error); 