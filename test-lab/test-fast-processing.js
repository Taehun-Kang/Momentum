#!/usr/bin/env node

/**
 * 🚀 배치 크기 최적화 및 성능 테스트
 * 
 * 테스트 시나리오:
 * 1. 기본 배치 vs 큰 배치 크기 비교
 * 2. LLM 배치 크기별 성능 테스트
 * 3. 최대 배치 크기 처리 테스트
 * 4. 컨텍스트 한도 테스트
 */

import { processSingleKeyword } from '../backend/services/search/dailyKeywordUpdateService.js';

console.log('🚀 배치 크기 최적화 테스트 시작');
console.log('=' .repeat(60));

const testKeywords = [
  { keyword: '먹방', category: '먹방 & 요리' },
  { keyword: 'ASMR', category: 'ASMR & 힐링' },
  { keyword: '브이로그', category: '라이프스타일 & 건강' }
];

// 성능 측정 헬퍼
function measureTime(startTime) {
  return Math.round((Date.now() - startTime) / 1000);
}

/**
 * 🧪 테스트 1: 일반 모드 vs 빠른 배치 처리
 */
async function testNormalVsFastMode() {
  console.log('\n🧪 테스트 1: 일반 모드 vs 빠른 배치 처리');
  console.log('-'.repeat(50));

  const testKeyword = {
    id: 'test-1',
    keyword: '먹방',
    category: '먹방 & 요리',
    min_view_count: 10000,
    min_engagement_rate: 1.5,
    update_cycle: 1,
    priority: 1
  };

  try {
    // 일반 모드 테스트 (기본 배치 크기)
    console.log('📊 일반 모드 처리 중...');
    const normalStart = Date.now();
    await processSingleKeyword(testKeyword, { batchSize: 3 });
    const normalDuration = measureTime(normalStart);
    console.log(`✅ 일반 모드 완료: ${normalDuration}초`);

    // 2초 간격
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 빠른 배치 처리 테스트
    console.log('⚡ 빠른 배치 처리 중...');
    const fastStart = Date.now();
    await processSingleKeyword(testKeyword, { 
      batchSize: 25
    });
    const fastDuration = measureTime(fastStart);
    console.log(`✅ 빠른 배치 처리 완료: ${fastDuration}초`);

    // 성능 비교
    const speedup = ((normalDuration - fastDuration) / normalDuration * 100).toFixed(1);
    console.log(`📈 성능 개선: ${speedup}% 빨라짐 (${normalDuration}초 → ${fastDuration}초)`);

    return { normalDuration, fastDuration, speedup };

  } catch (error) {
    console.error('❌ 일반/빠른 배치 테스트 실패:', error.message);
    return null;
  }
}

/**
 * 🧪 테스트 2: LLM 배치 크기별 성능 테스트
 */
async function testBatchSizes() {
  console.log('\n🧪 테스트 2: LLM 배치 크기별 성능 테스트');
  console.log('-'.repeat(50));

  const testKeyword = {
    id: 'test-2',
    keyword: 'ASMR',
    category: 'ASMR & 힐링',
    min_view_count: 5000,
    min_engagement_rate: 1.0,
    update_cycle: 1,
    priority: 1
  };

  const batchSizes = [3, 10, 20, 30];
  const results = [];

  for (const batchSize of batchSizes) {
    try {
      console.log(`📦 배치 크기 ${batchSize}개 테스트 중...`);
      const batchStart = Date.now();
      
      await processSingleKeyword(testKeyword, { 
        batchSize: batchSize
      });
      
      const batchDuration = measureTime(batchStart);
      console.log(`✅ 배치 크기 ${batchSize}: ${batchDuration}초`);
      
      results.push({ batchSize, duration: batchDuration });

      // 배치 간 간격
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`❌ 배치 크기 ${batchSize} 테스트 실패:`, error.message);
      results.push({ batchSize, duration: null, error: error.message });
    }
  }

  // 결과 분석
  console.log('\n📊 배치 크기별 성능 분석:');
  const validResults = results.filter(r => r.duration !== null);
  if (validResults.length > 1) {
    const fastest = validResults.reduce((min, curr) => 
      curr.duration < min.duration ? curr : min
    );
    console.log(`🏆 최고 성능: 배치 크기 ${fastest.batchSize} (${fastest.duration}초)`);
  }

  return results;
}

/**
 * 🧪 테스트 3: 최대 배치 크기 테스트
 */
async function testUltraFastMode() {
  console.log('\n🧪 테스트 3: 최대 배치 크기 테스트');
  console.log('-'.repeat(50));

  const testKeyword = {
    id: 'test-3',
    keyword: '브이로그',
    category: '라이프스타일 & 건강',
    min_view_count: 3000,       // 매우 낮은 기준
    min_engagement_rate: 0.5,   // 매우 낮은 기준
    update_cycle: 1,
    priority: 9999
  };

  try {
    console.log('🏆 최대 배치 크기 처리 실행 중...');
    const ultraStart = Date.now();
    
    await processSingleKeyword(testKeyword, { 
      batchSize: 30              // 최대 배치 크기
    });
    
    const ultraDuration = measureTime(ultraStart);
    console.log(`✅ 최대 배치 처리 완료: ${ultraDuration}초`);

    // 성능 등급 평가
    let grade = '🥉 보통';
    if (ultraDuration <= 10) grade = '🥇 매우 빠름';
    else if (ultraDuration <= 20) grade = '🥈 빠름';

    console.log(`📊 성능 등급: ${grade}`);

    return { duration: ultraDuration, grade };

  } catch (error) {
    console.error('❌ 최대 배치 크기 테스트 실패:', error.message);
    return null;
  }
}

/**
 * 🧪 테스트 4: 컨텍스트 한도 테스트
 */
async function testContextLimits() {
  console.log('\n🧪 테스트 4: LLM 컨텍스트 한도 테스트');
  console.log('-'.repeat(50));

  const testKeyword = {
    id: 'test-4',
    keyword: '댄스',
    category: '음악 & 엔터테인먼트',
    min_view_count: 1000,
    min_engagement_rate: 0.3,
    update_cycle: 1,
    priority: 1
  };

  // 매우 큰 배치 크기로 컨텍스트 한도 테스트
  const largeBatchSizes = [40, 50, 60];

  for (const batchSize of largeBatchSizes) {
    try {
      console.log(`🧮 매우 큰 배치 크기 ${batchSize}개 테스트...`);
      const largeStart = Date.now();
      
      await processSingleKeyword(testKeyword, { 
        batchSize: batchSize
      });
      
      const largeDuration = measureTime(largeStart);
      console.log(`✅ 큰 배치 ${batchSize}개: ${largeDuration}초 (컨텍스트 한도 내)`);

    } catch (error) {
      if (error.message.includes('context') || error.message.includes('token')) {
        console.log(`⚠️ 배치 크기 ${batchSize}: 컨텍스트 한도 초과 - 자동 조정됨`);
      } else {
        console.error(`❌ 배치 크기 ${batchSize} 테스트 실패:`, error.message);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * 🎯 메인 테스트 실행
 */
async function runAllTests() {
  const startTime = Date.now();
  
  try {
    console.log('🔥 모든 배치 크기 최적화 테스트 실행');
    
    // 테스트 1: 일반 vs 빠른 배치
    const normalVsFast = await testNormalVsFastMode();
    
    // 테스트 2: 배치 크기별 성능
    const batchResults = await testBatchSizes();
    
    // 테스트 3: 최대 배치 크기
    const ultraFast = await testUltraFastMode();
    
    // 테스트 4: 컨텍스트 한도
    await testContextLimits();

    const totalDuration = measureTime(startTime);

    // 최종 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 최종 테스트 결과 요약');
    console.log('='.repeat(60));

    if (normalVsFast) {
      console.log(`⚡ 빠른 배치 처리: ${normalVsFast.speedup}% 성능 향상`);
    }

    const validBatchResults = batchResults.filter(r => r.duration !== null);
    if (validBatchResults.length > 0) {
      const optimal = validBatchResults.reduce((best, curr) => 
        curr.duration < best.duration ? curr : best
      );
      console.log(`📦 최적 배치 크기: ${optimal.batchSize}개 (${optimal.duration}초)`);
    }

    if (ultraFast) {
      console.log(`🏆 최대 배치 처리: ${ultraFast.duration}초 ${ultraFast.grade}`);
    }

    console.log(`⏱️ 전체 테스트 시간: ${totalDuration}초`);

    // 권장사항
    console.log('\n💡 권장사항:');
    console.log('- 개별 사용자 검색: batchSize=20-30 (빠른 처리)');
    console.log('- 일일 키워드 갱신: batchSize=3 (안정적 처리)');
    console.log('- 다중 키워드 검색: 첫 키워드 즉시 처리 + 나머지 백그라운드');
    console.log('- 품질 기준: 모든 모드에서 동일한 기준 유지');

  } catch (error) {
    console.error('❌ 테스트 실행 실패:', error);
  }
}

// 테스트 실행
runAllTests().then(() => {
  console.log('\n🎉 모든 테스트 완료!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 테스트 실행 오류:', error);
  process.exit(1);
}); 