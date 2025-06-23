// =============================================================================
// 🔄 keywordUpdater.js - 6단계: 키워드 사용 기록 업데이트 모듈 (ES Modules)
// =============================================================================
// 
// 📋 기능: 수집 완료된 키워드들의 사용 기록 업데이트
// 🔄 워크플로우: 키워드별 수집량 집계 → DB 함수 호출 → 결과 로깅
// 🎯 목표: daily_keywords_v2 테이블의 사용 기록 업데이트
// 
// =============================================================================

import { createClient } from '@supabase/supabase-js';

/**
 * 🔄 KeywordUpdater 클래스
 * 키워드 사용 기록 업데이트 전담 서비스 (ES Modules)
 */
class KeywordUpdater {
  /**
   * 🏗️ 생성자 - Supabase 클라이언트 초기화
   */
  constructor() {
    // 🔑 Supabase 연결
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * 🔄 키워드 사용 기록 업데이트 (메인 함수)
   * 
   * 📝 업데이트 과정:
   * 1. 키워드별 수집 영상 수 집계
   * 2. update_keyword_usage_v2() DB 함수 호출
   * 3. 결과 통계 출력
   * 
   * @param {Array} savedVideos - 저장된 영상 데이터 (collection_keyword 포함)
   * @returns {Promise<Object>} 업데이트 결과 통계
   */
  async updateKeywordUsage(savedVideos) {
    try {
      console.log(`🔄 키워드 사용 기록 업데이트 시작: ${savedVideos.length}개 영상`);
      
      // 1. 키워드별 수집량 집계
      const keywordStats = this.aggregateKeywordStats(savedVideos);
      
      if (Object.keys(keywordStats).length === 0) {
        console.log('⚠️ 업데이트할 키워드가 없습니다');
        return { updated: 0, failed: 0, keywords: [] };
      }
      
      // 2. 키워드별 업데이트 실행
      const results = await this.updateKeywords(keywordStats);
      
      // 3. 결과 통계
      const stats = this.calculateUpdateStats(results);
      console.log(`✅ 키워드 업데이트 완료: ${stats.updated}개 성공, ${stats.failed}개 실패`);
      
      return stats;
      
    } catch (error) {
      console.error('❌ 키워드 사용 기록 업데이트 실패:', error.message);
      throw error;
    }
  }

  /**
   * 📊 키워드별 수집량 집계
   * 
   * @param {Array} videos - 저장된 영상 배열
   * @returns {Object} 키워드별 통계 객체
   */
  aggregateKeywordStats(videos) {
    const stats = {};
    
    videos.forEach(video => {
      const keyword = video.collection_keyword;
      
      // 'unknown' 키워드는 제외
      if (!keyword || keyword === 'unknown') {
        return;
      }
      
      if (!stats[keyword]) {
        stats[keyword] = {
          keyword: keyword,
          videos_collected: 0,
          total_views: 0,
          total_likes: 0
        };
      }
      
      stats[keyword].videos_collected++;
      stats[keyword].total_views += video.views || 0;
      stats[keyword].total_likes += video.likes || 0;
    });
    
    console.log(`📊 키워드별 집계 완료: ${Object.keys(stats).length}개 키워드`);
    this.logKeywordStats(stats);
    
    return stats;
  }

  /**
   * 🔄 키워드별 업데이트 실행
   * 
   * @param {Object} keywordStats - 키워드별 통계
   * @returns {Promise<Array>} 업데이트 결과
   */
  async updateKeywords(keywordStats) {
    const results = [];
    const keywords = Object.keys(keywordStats);
    
    console.log(`🔄 ${keywords.length}개 키워드 업데이트 시작`);
    
    for (const keyword of keywords) {
      const stats = keywordStats[keyword];
      
      try {
        console.log(`📝 업데이트 중: ${keyword} (${stats.videos_collected}개 영상)`);
        
        // update_keyword_usage_v2() DB 함수 호출
        const result = await this.callUpdateFunction(
          keyword,
          stats.videos_collected
        );
        
        results.push({
          keyword: keyword,
          success: true,
          videos_collected: stats.videos_collected,
          result: result
        });
        
        // 각 키워드 간 짧은 대기
        await this.sleep(50);
        
      } catch (error) {
        console.error(`❌ ${keyword} 업데이트 실패:`, error.message);
        results.push({
          keyword: keyword,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 📞 update_keyword_usage_v2() DB 함수 호출
   * 
   * @param {string} keyword - 키워드
   * @param {number} videosCollected - 수집된 영상 수
   * @returns {Promise<Object>} DB 함수 실행 결과
   */
  async callUpdateFunction(keyword, videosCollected) {
    const { data, error } = await this.supabase
      .rpc('update_keyword_usage_v2', {
        keyword_name: keyword,
        videos_collected: videosCollected
      });
    
    if (error) {
      throw new Error(`DB 함수 호출 실패: ${error.message}`);
    }
    
    return data;
  }

  // =============================================================================
  // 🔧 헬퍼 함수들
  // =============================================================================

  /**
   * 📊 업데이트 결과 통계 계산
   * 
   * @param {Array} results - 업데이트 결과
   * @returns {Object} 통계 객체
   */
  calculateUpdateStats(results) {
    const stats = {
      total: results.length,
      updated: 0,
      failed: 0,
      keywords: [],
      totalVideos: 0
    };
    
    results.forEach(result => {
      if (result.success) {
        stats.updated++;
        stats.totalVideos += result.videos_collected || 0;
        stats.keywords.push({
          keyword: result.keyword,
          videos: result.videos_collected
        });
      } else {
        stats.failed++;
      }
    });
    
    // 상세 결과 로깅
    this.logUpdateResults(stats, results);
    
    return stats;
  }

  /**
   * 📊 키워드 통계 로깅
   * 
   * @param {Object} stats - 키워드별 통계
   */
  logKeywordStats(stats) {
    console.log('\n📊 ===== 키워드별 수집 통계 =====');
    
    Object.entries(stats).forEach(([keyword, data]) => {
      const avgViews = data.videos_collected > 0 
        ? Math.round(data.total_views / data.videos_collected)
        : 0;
      
      console.log(`  ${keyword}: ${data.videos_collected}개 (평균 조회수: ${avgViews.toLocaleString()})`);
    });
    
    console.log('================================\n');
  }

  /**
   * 📊 업데이트 결과 로깅
   * 
   * @param {Object} stats - 기본 통계
   * @param {Array} results - 상세 결과
   */
  logUpdateResults(stats, results) {
    console.log('\n🔄 ===== 키워드 업데이트 결과 =====');
    console.log(`처리 키워드: ${stats.total}개`);
    console.log(`성공: ${stats.updated}개`);
    console.log(`실패: ${stats.failed}개`);
    console.log(`총 수집 영상: ${stats.totalVideos}개`);
    
    // 성공한 키워드들
    if (stats.keywords.length > 0) {
      console.log('\n✅ 업데이트 완료:');
      stats.keywords.forEach(item => {
        console.log(`  - ${item.keyword}: ${item.videos}개 영상`);
      });
    }
    
    // 실패한 키워드들
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      console.log('\n❌ 업데이트 실패:');
      failedResults.forEach(result => {
        console.log(`  - ${result.keyword}: ${result.error}`);
      });
    }
    
    console.log('===================================\n');
  }

  /**
   * ⏰ 지연 함수
   * 
   * @param {number} ms - 대기 시간 (밀리초)
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =============================================================================
  // 🔍 추가 유틸리티 함수들
  // =============================================================================

  /**
   * 📋 키워드 사용 현황 조회
   * 
   * @param {string} keyword - 조회할 키워드 (선택사항)
   * @returns {Promise<Array>} 키워드 사용 현황
   */
  async getKeywordUsageStatus(keyword = null) {
    try {
      let query = this.supabase
        .from('daily_keywords_v2')
        .select('keyword, usage_count, total_videos_collected, last_used_at')
        .order('last_used_at', { ascending: false });
      
      if (keyword) {
        query = query.eq('keyword', keyword);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
      
    } catch (error) {
      console.error('키워드 사용 현황 조회 실패:', error.message);
      return [];
    }
  }

  /**
   * 📊 오늘 사용된 키워드 통계
   * 
   * @returns {Promise<Object>} 일일 키워드 통계
   */
  async getTodayKeywordStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await this.supabase
        .from('daily_keywords_v2')
        .select('keyword, usage_count, total_videos_collected')
        .gte('last_used_at', `${today}T00:00:00`)
        .order('total_videos_collected', { ascending: false });
      
      if (error) throw error;
      
      const stats = {
        total_keywords: data?.length || 0,
        total_usage: data?.reduce((sum, item) => sum + (item.usage_count || 0), 0) || 0,
        total_videos: data?.reduce((sum, item) => sum + (item.total_videos_collected || 0), 0) || 0,
        keywords: data || []
      };
      
      return stats;
      
    } catch (error) {
      console.error('일일 키워드 통계 조회 실패:', error.message);
      return { total_keywords: 0, total_usage: 0, total_videos: 0, keywords: [] };
    }
  }
}

// ES Modules 내보내기
export default KeywordUpdater; 