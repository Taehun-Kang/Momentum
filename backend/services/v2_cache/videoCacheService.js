// =============================================================================
// 💾 videoCacheService.js - 5단계: 영상 데이터 저장 모듈 (ES Modules)
// =============================================================================
// 
// 📋 기능: 변환된 영상 데이터를 videos_cache_v2 테이블에 저장
// 🔄 워크플로우: 데이터 검증 → UPSERT 저장 → 통계 로깅
// 🎯 목표: 중복 처리 + 대량 저장 + 간단한 에러 처리
// 
// =============================================================================

import { createClient } from '@supabase/supabase-js';

/**
 * 💾 VideoCacheService 클래스
 * videos_cache_v2 테이블 저장 전담 서비스 (ES Modules)
 */
class VideoCacheService {
  /**
   * 🏗️ 생성자 - Supabase 클라이언트 초기화
   */
  constructor() {
    // 🔑 Supabase 연결
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // ⚙️ 저장 설정
    this.tableName = 'videos_cache_v2';
    this.batchSize = 100;                    // 한 번에 저장할 최대 영상 수
  }

  /**
   * 💾 영상 데이터 대량 저장 (메인 함수)
   * 
   * 📝 저장 과정:
   * 1. 데이터 검증
   * 2. 배치 단위로 분할
   * 3. UPSERT로 저장 (중복 자동 처리)
   * 4. 결과 통계 출력
   * 
   * @param {Array} transformedVideos - 변환된 영상 데이터 배열
   * @returns {Promise<Object>} 저장 결과 통계
   */
  async saveVideos(transformedVideos) {
    try {
      console.log(`💾 영상 데이터 저장 시작: ${transformedVideos.length}개`);
      
      // 1. 데이터 검증
      const validVideos = this.validateVideos(transformedVideos);
      if (validVideos.length === 0) {
        throw new Error('저장할 유효한 영상 데이터가 없습니다');
      }
      
      // 2. 배치 처리로 저장
      const results = await this.saveBatches(validVideos);
      
      // 3. 결과 통계
      const stats = this.calculateStats(results);
      console.log(`✅ 저장 완료: ${stats.saved}개 저장, ${stats.updated}개 업데이트, ${stats.failed}개 실패`);
      
      return stats;
      
    } catch (error) {
      console.error('❌ 영상 데이터 저장 실패:', error.message);
      throw error;
    }
  }

  /**
   * 📦 배치 단위로 저장 처리
   * 
   * @param {Array} videos - 검증된 영상 데이터
   * @returns {Promise<Array>} 배치별 저장 결과
   */
  async saveBatches(videos) {
    const batches = this.splitIntoBatches(videos);
    const results = [];
    
    console.log(`📦 배치 처리: ${batches.length}개 배치 (${this.batchSize}개씩)`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📋 배치 ${i + 1}/${batches.length} 저장 중... (${batch.length}개)`);
      
      try {
        const result = await this.saveBatch(batch);
        results.push({ success: true, count: batch.length, data: result });
        
        // 배치 간 짧은 대기 (DB 부하 방지)
        if (i < batches.length - 1) {
          await this.sleep(100); // 100ms 대기
        }
        
      } catch (error) {
        console.error(`❌ 배치 ${i + 1} 저장 실패:`, error.message);
        results.push({ success: false, count: batch.length, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * 💽 단일 배치 저장 (UPSERT 사용)
   * 
   * @param {Array} batch - 저장할 영상 배열
   * @returns {Promise<Object>} Supabase 응답
   */
  async saveBatch(batch) {
    // UPSERT: video_id 중복 시 업데이트, 없으면 삽입
    const { data, error } = await this.supabase
      .from(this.tableName)
      .upsert(batch, {
        onConflict: 'video_id',          // video_id 충돌 시
        ignoreDuplicates: false          // 중복 시 업데이트 실행
      })
      .select('video_id, created_at');
    
    if (error) {
      throw new Error(`DB 저장 실패: ${error.message}`);
    }
    
    return data;
  }

  // =============================================================================
  // 🔧 헬퍼 함수들
  // =============================================================================

  /**
   * ✅ 영상 데이터 검증
   * 
   * @param {Array} videos - 검증할 영상 배열
   * @returns {Array} 검증된 영상 배열
   */
  validateVideos(videos) {
    const validVideos = videos.filter(video => {
      // 필수 필드 확인
      if (!video.video_id || !video.url || !video.title) {
        console.warn(`⚠️ 필수 필드 누락: ${video.video_id || 'unknown'}`);
        return false;
      }
      
      // video_id 길이 확인 (YouTube는 11자)
      if (video.video_id.length !== 11) {
        console.warn(`⚠️ 잘못된 video_id 길이: ${video.video_id}`);
        return false;
      }
      
      return true;
    });
    
    const validCount = validVideos.length;
    const totalCount = videos.length;
    const invalidCount = totalCount - validCount;
    
    if (invalidCount > 0) {
      console.log(`⚠️ 검증 결과: ${validCount}개 유효, ${invalidCount}개 무효`);
    }
    
    return validVideos;
  }

  /**
   * 🔪 배치 단위로 분할
   * 
   * @param {Array} videos - 분할할 영상 배열
   * @returns {Array} 배치 배열
   */
  splitIntoBatches(videos) {
    const batches = [];
    for (let i = 0; i < videos.length; i += this.batchSize) {
      batches.push(videos.slice(i, i + this.batchSize));
    }
    return batches;
  }

  /**
   * 📊 저장 결과 통계 계산
   * 
   * @param {Array} results - 배치 저장 결과
   * @returns {Object} 통계 객체
   */
  calculateStats(results) {
    const stats = {
      total: 0,
      saved: 0,
      updated: 0,
      failed: 0,
      successRate: 0
    };
    
    results.forEach(result => {
      stats.total += result.count;
      
      if (result.success) {
        stats.saved += result.count;
      } else {
        stats.failed += result.count;
      }
    });
    
    // 성공률 계산
    stats.successRate = stats.total > 0 
      ? Math.round((stats.saved / stats.total) * 100) 
      : 0;
    
    // 상세 통계 로깅
    this.logDetailedStats(stats, results);
    
    return stats;
  }

  /**
   * 📊 상세 통계 로깅
   * 
   * @param {Object} stats - 기본 통계
   * @param {Array} results - 배치 결과
   */
  logDetailedStats(stats, results) {
    console.log('\n💾 ===== 저장 결과 통계 =====');
    console.log(`총 처리: ${stats.total}개`);
    console.log(`성공: ${stats.saved}개`);
    console.log(`실패: ${stats.failed}개`);
    console.log(`성공률: ${stats.successRate}%`);
    
    // 실패한 배치 상세 정보
    const failedBatches = results.filter(r => !r.success);
    if (failedBatches.length > 0) {
      console.log('\n❌ 실패한 배치:');
      failedBatches.forEach((batch, index) => {
        console.log(`  배치 ${index + 1}: ${batch.count}개 - ${batch.error}`);
      });
    }
    
    console.log('==============================\n');
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
   * 📋 저장된 영상 수 확인
   * 
   * @returns {Promise<number>} 총 저장된 영상 수
   */
  async getTotalVideoCount() {
    try {
      const { count, error } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('영상 수 조회 실패:', error.message);
      return 0;
    }
  }

  /**
   * 🧹 만료된 캐시 정리
   * 
   * @returns {Promise<number>} 정리된 영상 수
   */
  async cleanupExpiredCache() {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('video_id');
      
      if (error) throw error;
      
      const cleanedCount = data?.length || 0;
      console.log(`🧹 만료된 캐시 정리 완료: ${cleanedCount}개`);
      
      return cleanedCount;
    } catch (error) {
      console.error('캐시 정리 실패:', error.message);
      return 0;
    }
  }
}

// ES Modules 내보내기
export default VideoCacheService; 