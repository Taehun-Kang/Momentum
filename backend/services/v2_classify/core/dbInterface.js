// =============================================================================
// 🗄️ dbInterface.js - 데이터베이스 입출력 전담 모듈 (간결 버전)
// =============================================================================
// 
// 📋 책임: 분류 안된 영상 조회, 분류 결과 저장
// 🎯 목표: 핵심 기능만, 최대한 간결하게
// 
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// ES modules에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일 로드 (프로젝트 루트에서)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * 🗄️ 간결한 데이터베이스 인터페이스
 */
class DbInterface {
  /**
   * 🏗️ Supabase 클라이언트 초기화
   */
  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase 환경변수가 설정되지 않았습니다');
    }

    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('✅ Supabase 연결 완료');
  }

  /**
   * 🔍 분류되지 않은 영상 조회 (classified_at이 null)
   * 
   * @param {number} limit - 가져올 영상 수 (기본: 50)
   * @param {number} offset - 시작 위치 (기본: 0)
   * @returns {Array} 영상 목록 [{video_id, title, description, handle_name, tags}]
   */
  async getUnclassifiedVideos(limit = 50, offset = 0) {
    try {
      console.log(`\n🔍 분류 안된 영상 조회: ${limit}개 (offset: ${offset})`);

      const { data, error } = await this.supabase
        .from('videos_cache_v2')
        .select('video_id, title, description, handle_name, tags')
        .is('classified_at', null) // 분류 안된 영상만
        .order('created_at', { ascending: true }) // 오래된 것부터
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`DB 조회 실패: ${error.message}`);
      }

      console.log(`📊 조회 결과: ${data.length}개 영상`);
      return data;

    } catch (error) {
      console.error(`❌ 영상 조회 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🏷️ 영상 분류 결과 저장
   * 
   * @param {string} videoId - 영상 ID
   * @param {Object} classification - LLM 분류 결과
   * @param {Array} classification.topic_tags - 주제 태그 [3개]
   * @param {Array} classification.mood_tags - 감정 태그 [3개]
   * @param {Array} classification.context_tags - 상황 태그 [3개]
   * @param {Array} classification.genre_tags - 장르 태그 [3개]
   * @param {Object} metadata - 분류 메타데이터
   * @param {number} metadata.confidence - 신뢰도 (0.0-1.0)
   * @param {string} metadata.engine - 사용된 LLM ('claude-3.7-sonnet')
   * @returns {boolean} 저장 성공 여부
   */
  async saveClassification(videoId, classification, metadata = {}) {
    try {
      // 입력 검증
      if (!this._validateClassification(classification)) {
        throw new Error('잘못된 분류 결과 형식');
      }

      const updateData = {
        // 4종 태그 저장
        topic_tags: classification.topic_tags,
        mood_tags: classification.mood_tags,
        context_tags: classification.context_tags,
        genre_tags: classification.genre_tags,
        
        // 메타데이터 저장
        classification_confidence: metadata.confidence || 0.85,
        classified_by: metadata.engine || 'claude-3.7-sonnet',
        classified_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('videos_cache_v2')
        .update(updateData)
        .eq('video_id', videoId);

      if (error) {
        throw new Error(`DB 저장 실패: ${error.message}`);
      }

      console.log(`    ✅ [${videoId}] 분류 저장 완료`);
      return true;

    } catch (error) {
      console.error(`    ❌ [${videoId}] 저장 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📊 간단한 진행 상황 조회
   * 
   * @returns {Object} {total, classified, remaining, percentage}
   */
  async getProgress() {
    try {
      // 전체 영상 수
      const { count: total, error: totalError } = await this.supabase
        .from('videos_cache_v2')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        throw new Error(`전체 수 조회 실패: ${totalError.message}`);
      }

      // 분류된 영상 수
      const { count: classified, error: classifiedError } = await this.supabase
        .from('videos_cache_v2')
        .select('*', { count: 'exact', head: true })
        .not('classified_at', 'is', null);

      if (classifiedError) {
        throw new Error(`분류된 수 조회 실패: ${classifiedError.message}`);
      }

      const remaining = total - classified;
      const percentage = total > 0 ? Math.round((classified / total) * 100) : 0;

      return { total, classified, remaining, percentage };

    } catch (error) {
      console.error(`❌ 진행 상황 조회 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔌 연결 테스트
   */
  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('videos_cache_v2')
        .select('count', { count: 'exact', head: true });

      if (error) {
        throw new Error(`연결 테스트 실패: ${error.message}`);
      }

      console.log('✅ 데이터베이스 연결 정상');
      return true;

    } catch (error) {
      console.error(`❌ 데이터베이스 연결 실패: ${error.message}`);
      return false;
    }
  }

  /**
   * ✅ 분류 결과 검증 (간단 버전)
   */
  _validateClassification(classification) {
    const requiredFields = ['topic_tags', 'mood_tags', 'context_tags', 'genre_tags'];
    
    for (const field of requiredFields) {
      if (!classification[field] || 
          !Array.isArray(classification[field]) || 
          classification[field].length !== 3) {
        return false;
      }
    }
    
    return true;
  }
}

export default DbInterface; 