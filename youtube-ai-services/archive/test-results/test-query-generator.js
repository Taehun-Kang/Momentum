/**
 * 🧪 테스트 쿼리 생성기
 * 
 * natural-language-extractor + youtube-query-builder를 사용해서
 * 다양한 테스트 시나리오의 쿼리를 생성하고 JSON으로 저장
 */

import { extractKeywordsFromText } from './llm/modules/natural-language-extractor.js';
import { buildFromExtractorResult } from './llm/modules/youtube-query-builder.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

class TestQueryGenerator {
  constructor() {
    this.testCases = [
      // 감정 기반 입력
      { input: "오늘 우울한데 기분 좋아지는 영상", type: "emotion", description: "우울함 → 힐링" },
      { input: "스트레스 받아서 웃고 싶어", type: "emotion", description: "스트레스 → 웃음" },
      { input: "졸린데 잠 깨는 영상", type: "emotion", description: "졸림 → 각성" },
      { input: "심심해서 재미있는거 보고싶어", type: "emotion", description: "심심함 → 재미" },
      { input: "혼자 있어서 외로워", type: "emotion", description: "외로움 → 위로" },
      
      // 주제 기반 입력
      { input: "먹방 보고싶어", type: "topic", description: "음식 관련" },
      { input: "운동 동기부여 영상", type: "topic", description: "운동 관련" },
      { input: "여행 브이로그", type: "topic", description: "여행 관련" },
      { input: "댄스 챌린지", type: "topic", description: "댄스 관련" },
      { input: "요리 레시피", type: "topic", description: "요리 관련" },
      { input: "고양이 영상", type: "topic", description: "동물 관련" },
      { input: "메이크업 튜토리얼", type: "topic", description: "뷰티 관련" },
      { input: "게임 하이라이트", type: "topic", description: "게임 관련" },
      
      // 복합 입력
      { input: "비오는 날 집에서 보기 좋은 카페 음악", type: "emotion", description: "날씨+장소+음악" },
      { input: "퇴근 후 피로 풀기 위한 힐링 영상", type: "emotion", description: "시간+상태+목적" }
    ];

    this.results = [];
  }

  /**
   * 🎯 전체 테스트 실행
   */
  async generateAllQueries() {
    console.log('🧪 테스트 쿼리 생성 시작');
    console.log(`📋 총 ${this.testCases.length}개 테스트 케이스`);

    for (let i = 0; i < this.testCases.length; i++) {
      const testCase = this.testCases[i];
      console.log(`\n📝 [${i + 1}/${this.testCases.length}] ${testCase.description}`);
      console.log(`   입력: "${testCase.input}"`);

      try {
        const result = await this.processTestCase(testCase);
        this.results.push(result);
        console.log(`   ✅ 성공: ${result.queries?.length || 0}개 쿼리 생성`);
      } catch (error) {
        console.error(`   ❌ 실패: ${error.message}`);
        this.results.push({
          ...testCase,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      // API 호출 간격 (Claude API 요청 제한 고려)
      await this.delay(1000);
    }

    console.log(`\n🎉 테스트 완료: ${this.results.filter(r => r.success).length}/${this.results.length}개 성공`);
    return this.results;
  }

  /**
   * 📝 개별 테스트 케이스 처리
   */
  async processTestCase(testCase) {
    const startTime = Date.now();

    // 1단계: 자연어에서 키워드 추출
    console.log(`   🗣️ 키워드 추출 중...`);
    const extractorResult = await extractKeywordsFromText(
      testCase.input, 
      testCase.type, 
      5
    );

    if (!extractorResult.success) {
      throw new Error(`키워드 추출 실패: ${extractorResult.error}`);
    }

    console.log(`   📊 추출된 키워드:`);
    console.log(`      직접검색: [${extractorResult.directSearch?.join(', ') || 'none'}]`);
    console.log(`      확장용: [${extractorResult.expansionTerms?.join(', ') || 'none'}]`);

    // 2단계: 키워드를 YouTube 쿼리로 변환
    console.log(`   🎯 YouTube 쿼리 생성 중...`);
    const queryResult = await buildFromExtractorResult(extractorResult, {
      maxQueries: 3,
      originalInput: testCase.input
    });

    if (!queryResult.success) {
      throw new Error(`쿼리 생성 실패: ${queryResult.error}`);
    }

    console.log(`   📄 생성된 쿼리:`);
    queryResult.queries.forEach((q, idx) => {
      console.log(`      ${idx + 1}. ${q.strategyName}: "${q.optimizedQuery}"`);
    });

    const processingTime = Date.now() - startTime;

    return {
      ...testCase,
      success: true,
      processingTime,
      timestamp: new Date().toISOString(),
      
      // 키워드 추출 결과
      extraction: {
        originalInput: extractorResult.originalInput,
        inputType: extractorResult.inputType,
        directSearch: extractorResult.directSearch,
        expansionTerms: extractorResult.expansionTerms,
        analysis: extractorResult.analysis,
        confidence: extractorResult.confidence
      },
      
      // 쿼리 생성 결과
      queryGeneration: {
        totalQueries: queryResult.totalQueries,
        estimatedApiCost: queryResult.estimatedApiCost,
        selectedKeywords: queryResult.selectedKeywords,
        usedAdvancedQueries: queryResult.usedAdvancedQueries,
        advancedAnalysis: queryResult.advancedAnalysis
      },
      
      // 최종 쿼리들
      queries: queryResult.queries.map(q => ({
        strategyName: q.strategyName,
        optimizedQuery: q.optimizedQuery,
        apiParams: q.apiParams,
        priority: q.priority,
        reasoning: q.reasoning,
        type: q.type,
        llmGenerated: q.llmGenerated
      }))
    };
  }

  /**
   * 💾 결과를 JSON 파일로 저장
   */
  async saveResults(filename = 'test-queries.json') {
    const outputPath = path.join(process.cwd(), filename);
    
    const outputData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalTestCases: this.testCases.length,
        successfulCases: this.results.filter(r => r.success).length,
        failedCases: this.results.filter(r => !r.success).length,
        totalQueries: this.results.reduce((sum, r) => sum + (r.queries?.length || 0), 0)
      },
      testResults: this.results
    };

    try {
      await fs.promises.writeFile(
        outputPath, 
        JSON.stringify(outputData, null, 2), 
        'utf-8'
      );
      
      console.log(`\n💾 결과 저장 완료: ${filename}`);
      console.log(`   📁 경로: ${outputPath}`);
      console.log(`   📊 통계: ${outputData.metadata.successfulCases}/${outputData.metadata.totalTestCases}개 성공, 총 ${outputData.metadata.totalQueries}개 쿼리`);
      
      return outputPath;
    } catch (error) {
      console.error(`❌ 파일 저장 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📋 간단한 쿼리 리스트만 저장 (search 모듈 테스트용)
   */
  async saveQueriesOnly(filename = 'search-test-queries.json') {
    const queries = [];
    
    this.results.forEach(result => {
      if (result.success && result.queries) {
        result.queries.forEach(query => {
          queries.push({
            testCase: result.description,
            originalInput: result.input,
            extractedKeywords: result.extraction?.directSearch || [],
            query: query.optimizedQuery,
            apiParams: query.apiParams,
            strategy: query.strategyName
          });
        });
      }
    });

    const outputData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalQueries: queries.length,
        description: 'search 모듈 테스트용 쿼리 모음'
      },
      queries: queries
    };

    const outputPath = path.join(process.cwd(), filename);
    
    try {
      await fs.promises.writeFile(
        outputPath, 
        JSON.stringify(outputData, null, 2), 
        'utf-8'
      );
      
      console.log(`\n📋 쿼리 전용 파일 저장: ${filename}`);
      console.log(`   총 ${queries.length}개 쿼리 저장됨`);
      
      return outputPath;
    } catch (error) {
      console.error(`❌ 쿼리 파일 저장 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔄 지연 함수
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 통계 출력
   */
  printSummary() {
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    const totalQueries = successful.reduce((sum, r) => sum + (r.queries?.length || 0), 0);
    
    console.log('\n📊 테스트 요약:');
    console.log(`   성공: ${successful.length}개`);
    console.log(`   실패: ${failed.length}개`);
    console.log(`   총 쿼리: ${totalQueries}개`);
    
    if (failed.length > 0) {
      console.log('\n❌ 실패한 케이스:');
      failed.forEach(f => {
        console.log(`   - ${f.description}: ${f.error}`);
      });
    }
  }
}

/**
 * 🎯 메인 실행 함수
 */
async function main() {
  console.log('🚀 테스트 쿼리 생성기 시작\n');

  const generator = new TestQueryGenerator();
  
  try {
    // 모든 테스트 케이스 실행
    await generator.generateAllQueries();
    
    // 통계 출력
    generator.printSummary();
    
    // 결과 저장
    await generator.saveResults('test-queries-full.json');
    await generator.saveQueriesOnly('search-test-queries.json');
    
    console.log('\n✅ 모든 작업 완료!');
    
  } catch (error) {
    console.error('\n❌ 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
console.log('📝 스크립트 로딩 완료');

// URL 인코딩 문제 해결을 위해 fileURLToPath 사용
const __filename = fileURLToPath(import.meta.url);
const isDirectExecution = process.argv[1] === __filename;

console.log('🔍 __filename:', __filename);
console.log('🔍 process.argv[1]:', process.argv[1]);
console.log('🔍 직접 실행?', isDirectExecution);

// ES 모듈에서 직접 실행 체크
if (isDirectExecution) {
  console.log('✅ 직접 실행 감지 - main() 함수 호출');
  main();
} else {
  console.log('📦 모듈로 import됨 - main() 함수 호출하지 않음');
}

export default TestQueryGenerator; 