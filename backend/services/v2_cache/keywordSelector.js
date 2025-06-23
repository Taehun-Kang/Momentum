// =============================================================================
// 🎯 keywordSelector.js - 1단계: 키워드 10개 선택 모듈
// =============================================================================
// 
// 📋 기능: daily_keywords_v2 테이블에서 오늘의 키워드 10개 선택 (3+5+2 시스템)
// 📤 출력: 선택된 키워드 배열 (수집 목표는 API 호출 시 별도 지정)
// 🔧 의존성: Supabase 클라이언트, get_todays_keywords_v2() DB 함수
// 
// =============================================================================

import { createClient } from '@supabase/supabase-js';

/**
 * 🎯 KeywordSelector 클래스
 * daily_keywords_v2 테이블에서 오늘의 키워드를 선택하는 모듈
 */
class KeywordSelector {
  /**
   * 🏗️ 생성자 - Supabase 클라이언트 초기화 및 기본 설정
   */
  constructor() {
    // Supabase 클라이언트 초기화
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // 기본 설정 (검증 목적)
    this.expectedKeywordCount = 10;     // 예상 키워드 수 (3+5+2)
  }

  /**
   * 🎯 오늘의 키워드 10개 선택 (메인 함수)
   * 
   * 📝 동작 과정:
   * 1. get_todays_keywords_v2() DB 함수 호출
   * 2. 반환된 데이터 가공 및 구조화
   * 3. 선택 결과 검증 (개수, 중복, 필수 필드)
   * 4. 선택 결과 로깅 출력
   * 
   * @returns {Promise<Array>} 선택된 키워드 배열
   * @throws {Error} DB 호출 실패, 키워드 없음, 검증 실패 시
   */
  async getTodaysKeywords() {
    try {
      console.log('🔍 오늘의 키워드 선택 시작...');
      
      // 1. 데이터베이스에서 키워드 선택 (get_todays_keywords_v2 함수 호출)
      const { data, error } = await this.supabase.rpc('get_todays_keywords_v2');
      
      // 2. DB 호출 에러 처리
      if (error) {
        throw new Error(`키워드 선택 실패: ${error.message}`);
      }

      // 3. 빈 결과 처리
      if (!data || data.length === 0) {
        throw new Error('선택된 키워드가 없습니다. daily_keywords_v2 테이블을 확인해주세요.');
      }

      // 4. 키워드 데이터 가공
      const processedKeywords = this.processKeywordData(data);

      // 5. 검증 및 로깅
      this.validateKeywordSelection(processedKeywords);
      this.logKeywordSelection(processedKeywords);

      console.log(`✅ 키워드 선택 완료: ${processedKeywords.length}개`);
      return processedKeywords;

    } catch (error) {
      console.error('❌ 키워드 선택 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 🔧 키워드 데이터 가공 및 구조화
   * 
   * 📝 처리 내용:
   * - DB 원본 데이터를 표준 형식으로 변환
   * - 수집 메타데이터 추가
   * - 선택 순서 및 날짜 정보 첨부
   * 
   * @param {Array} rawKeywords - DB에서 가져온 원본 키워드 데이터
   * @returns {Array} 가공된 키워드 배열
   */
  processKeywordData(rawKeywords) {
    return rawKeywords.map((row, index) => ({
      // 🔑 기본 키워드 정보 (DB에서 가져온 원본 데이터)
      id: row.id,                           // 키워드 고유 ID
      keyword: row.keyword,                 // 검색 키워드 (예: "먹방", "ASMR")
      category: row.category,               // 카테고리 (예: "먹방 & 요리")
      priority_tier: row.priority_tier,     // 우선순위 tier (high/medium/low)
      sequence_number: row.sequence_number, // 그룹 내 순서 번호
      
      // 📊 키워드 상태 정보
      days_since_last_use: row.days_since_last_use,  // 마지막 사용 후 경과 일수
      is_new_keyword: row.is_new_keyword,             // 새 키워드 여부 (true/false)
      
      // 📋 수집 메타데이터 (선택 시점 정보)
      collection_metadata: {
        selection_date: new Date().toISOString(),    // 선택된 날짜/시간
        selection_order: index + 1,                  // 전체 선택 순서 (1~10)
        tier_display: row.priority_tier  // 표시용 tier 이름
      }
    }));
  }
  /**
   * ✅ 키워드 선택 결과 검증
   * 
   * 📝 검증 항목:
   * 1. 전체 키워드 개수 확인 (예상: 10개)
   * 2. 중복 키워드 확인 (중복 시 에러)
   * 3. 필수 필드 존재 확인 (keyword, category, priority_tier)
   * 4. Tier별 개수 현황 출력
   * 
   * @param {Array} keywords - 선택된 키워드 배열
   * @throws {Error} 중복 키워드 또는 필수 필드 누락 시
   */
  validateKeywordSelection(keywords) {
    // 1. 키워드 개수 확인 (경고만 출력, 에러 아님)
    if (keywords.length !== this.expectedKeywordCount) {
      console.warn(`⚠️ 예상 키워드 수와 다름: 예상=${this.expectedKeywordCount}, 실제=${keywords.length}`);
    }

    // 2. Tier별 개수 확인 및 출력
    const tierCounts = {};
    keywords.forEach(keyword => {
      const tier = keyword.priority_tier;
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });
    console.log('📊 Tier별 선택 현황:', tierCounts);

    // 3. 중복 키워드 확인 (에러 발생)
    const uniqueKeywords = new Set(keywords.map(k => k.keyword));
    if (uniqueKeywords.size !== keywords.length) {
      throw new Error('중복된 키워드가 선택되었습니다.');
    }

    // 4. 필수 필드 확인 (에러 발생)
    keywords.forEach((keyword, index) => {
      if (!keyword.keyword || !keyword.category || !keyword.priority_tier) {
        throw new Error(`키워드 ${index + 1}번의 필수 필드가 누락되었습니다.`);
      }
    });
  }

  /**
   * 📝 키워드 선택 결과 로깅 출력
   * 
   * 📋 출력 내용:
   * - Tier별 그룹화된 키워드 목록
   * - 각 키워드별 상세 정보 (카테고리, 마지막 사용일, 새 키워드 여부)
   * - 선택 결과 요약 통계
   * 
   * @param {Array} keywords - 선택된 키워드 배열
   */
  logKeywordSelection(keywords) {
    console.log('\n🎯 ===== 오늘의 키워드 선택 결과 =====');
    
    // Tier별로 그룹화
    const groupedByTier = {};
    keywords.forEach(keyword => {
      const tier = keyword.priority_tier;
      if (!groupedByTier[tier]) groupedByTier[tier] = [];
      groupedByTier[tier].push(keyword);
    });

    // 각 Tier별 상세 출력
    ['high', 'medium', 'low'].forEach(tier => {
      if (groupedByTier[tier]) {
        console.log(`\n🥇 ${tier.toUpperCase()} 그룹 (${groupedByTier[tier].length}개):`);
        groupedByTier[tier].forEach((keyword, index) => {
          // 새 키워드 배지 표시
          const newBadge = keyword.is_new_keyword ? ' 🆕' : '';
          // 마지막 사용일 표시 (365일 이상은 365+로 표시)
          const daysSince = keyword.days_since_last_use > 365 ? '365+' : keyword.days_since_last_use;
          
          console.log(`   ${index + 1}. ${keyword.keyword} (${keyword.category}) - ${daysSince}일 전${newBadge}`);
        });
      }
    });

    // 요약 통계 출력
    console.log(`\n📊 총 ${keywords.length}개 키워드 선택 완료`);
    console.log(`💡 각 키워드별 수집 목표: Bright Data API 호출 시 지정`);
    console.log('=====================================\n');
  }
}

// 모듈 내보내기
export default KeywordSelector; 