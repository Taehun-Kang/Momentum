// =============================================================================
// 🧪 test-keyword-selector-v2.js - KeywordSelector 모듈 테스트
// =============================================================================

require('dotenv').config();
const KeywordSelector = require('../backend/services/v2_cache/keywordSelector');

async function testKeywordSelector() {
  console.log('🧪 ===== KeywordSelector 테스트 시작 =====\n');

  try {
    // KeywordSelector 인스턴스 생성
    const keywordSelector = new KeywordSelector();
    
    console.log('📊 환경 변수 확인:');
    console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ 설정됨' : '❌ 누락'}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 누락'}`);
    console.log();

    // 1. 키워드 통계 조회 테스트
    console.log('1️⃣ 키워드 통계 조회 테스트...');
    const stats = await keywordSelector.getKeywordStats();
    if (stats) {
      console.log('✅ 키워드 통계:', stats);
    } else {
      console.log('⚠️ 키워드 통계 조회 실패');
    }
    console.log();

    // 2. 오늘의 키워드 선택 테스트 (메인 기능)
    console.log('2️⃣ 오늘의 키워드 10개 선택 테스트...');
    const todaysKeywords = await keywordSelector.getTodaysKeywords();
    
    // 3. 결과 검증
    console.log('\n🔍 ===== 선택 결과 검증 =====');
    console.log(`총 키워드 개수: ${todaysKeywords.length}개`);
    
    // Tier별 개수 확인
    const tierCounts = todaysKeywords.reduce((counts, keyword) => {
      counts[keyword.priority_tier] = (counts[keyword.priority_tier] || 0) + 1;
      return counts;
    }, {});
    
    console.log('Tier별 분포:', tierCounts);
    console.log('예상 분포: { high: 3, medium: 5, low: 2 }');
    
    // 4. 키워드 상세 정보 출력
    console.log('\n📋 ===== 선택된 키워드 상세 =====');
    todaysKeywords.forEach((keyword, index) => {
      console.log(`${index + 1}. [${keyword.priority_tier.toUpperCase()}] ${keyword.keyword}`);
      console.log(`   카테고리: ${keyword.category}`);
      console.log(`   수집 목표: ${keyword.targetCount}개`);
      console.log(`   마지막 사용: ${keyword.days_since_last_use}일 전`);
      console.log(`   새 키워드: ${keyword.is_new_keyword ? '🆕 예' : '아니오'}`);
      console.log();
    });

    // 5. 총 예상 수집량 계산
    const totalTargetVideos = todaysKeywords.reduce((sum, keyword) => sum + keyword.targetCount, 0);
    console.log(`🎯 총 예상 수집 영상: ${totalTargetVideos}개`);
    
    console.log('\n✅ ===== KeywordSelector 테스트 완료! =====');
    
    // 6. 반환 데이터 샘플 출력 (JSON 형태)
    console.log('\n📄 반환 데이터 샘플 (첫 번째 키워드):');
    console.log(JSON.stringify(todaysKeywords[0], null, 2));

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('상세 오류:', error);
  }
}

// 테스트 실행
if (require.main === module) {
  testKeywordSelector();
}

module.exports = testKeywordSelector; 