// =============================================================================
// 🔍 data-validator.js - 수집된 데이터 품질 검증 도구
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 환경 변수 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * 🔍 DataValidator - 수집된 데이터 품질 검증 클래스
 */
class DataValidator {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * 📊 전체 데이터 검증 실행
   */
  async validateCollectedData() {
    console.log('🔍 ===== 수집된 데이터 품질 검증 시작 =====\n');

    try {
      // 1. 기본 통계
      const basicStats = await this.getBasicStats();
      this.displayBasicStats(basicStats);

      // 2. 키워드별 분포
      const keywordDistribution = await this.getKeywordDistribution();
      this.displayKeywordDistribution(keywordDistribution);

      // 3. 데이터 품질 검사
      const qualityCheck = await this.checkDataQuality();
      this.displayQualityCheck(qualityCheck);

      // 4. 최신 데이터 샘플 확인
      const recentSamples = await this.getRecentSamples(10);
      this.displayRecentSamples(recentSamples);

      // 5. 중복 데이터 확인
      const duplicateCheck = await this.checkDuplicates();
      this.displayDuplicateCheck(duplicateCheck);

      console.log('\n✅ 데이터 검증 완료!');

    } catch (error) {
      console.error('❌ 데이터 검증 실패:', error.message);
    }
  }

  /**
   * 📈 기본 통계 조회
   */
  async getBasicStats() {
    const { data, error } = await this.supabase
      .from('videos_cache_v2')
      .select('*');

    if (error) throw error;

    const total = data.length;
    const today = new Date().toISOString().split('T')[0];
    const todayVideos = data.filter(video => 
      video.created_at?.startsWith(today)
    ).length;

    return {
      total,
      todayVideos,
      avgViews: total > 0 ? Math.round(data.reduce((sum, v) => sum + (v.views || 0), 0) / total) : 0,
      avgLikes: total > 0 ? Math.round(data.reduce((sum, v) => sum + (v.likes || 0), 0) / total) : 0,
      avgLength: total > 0 ? Math.round(data.reduce((sum, v) => sum + (v.video_length || 0), 0) / total) : 0
    };
  }

  /**
   * 🏷️ 키워드별 분포 조회
   */
  async getKeywordDistribution() {
    const { data, error } = await this.supabase
      .from('videos_cache_v2')
      .select('collection_keyword');

    if (error) throw error;

    const distribution = {};
    data.forEach(video => {
      const keyword = video.collection_keyword || 'unknown';
      distribution[keyword] = (distribution[keyword] || 0) + 1;
    });

    return Object.entries(distribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15); // 상위 15개
  }

  /**
   * ✅ 데이터 품질 검사
   */
  async checkDataQuality() {
    const { data, error } = await this.supabase
      .from('videos_cache_v2')
      .select('*');

    if (error) throw error;

    let validVideos = 0;
    let shortVideos = 0;
    let koreanVideos = 0;
    let hasViews = 0;
    let hasLikes = 0;
    let missingFields = 0;

    data.forEach(video => {
      // 필수 필드 확인
      if (video.video_id && video.url && video.title) {
        validVideos++;
      } else {
        missingFields++;
      }

      // Shorts 길이 확인 (60초 이하)
      if (video.video_length && video.video_length <= 60) {
        shortVideos++;
      }

      // 한국 콘텐츠 확인
      if (video.is_korean_content) {
        koreanVideos++;
      }

      // 메트릭 확인
      if (video.views && video.views > 0) {
        hasViews++;
      }
      if (video.likes && video.likes > 0) {
        hasLikes++;
      }
    });

    const total = data.length;
    return {
      total,
      validVideos,
      shortVideos,
      koreanVideos,
      hasViews,
      hasLikes,
      missingFields,
      qualityScore: total > 0 ? Math.round((validVideos / total) * 100) : 0
    };
  }

  /**
   * 📋 최신 데이터 샘플 조회
   */
  async getRecentSamples(limit = 5) {
    const { data, error } = await this.supabase
      .from('videos_cache_v2')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * 🔄 중복 데이터 확인
   */
  async checkDuplicates() {
    const { data, error } = await this.supabase
      .from('videos_cache_v2')
      .select('video_id, url');

    if (error) throw error;

    const videoIds = new Set();
    const urls = new Set();
    let duplicateVideoIds = 0;
    let duplicateUrls = 0;

    data.forEach(video => {
      if (videoIds.has(video.video_id)) {
        duplicateVideoIds++;
      } else {
        videoIds.add(video.video_id);
      }

      if (urls.has(video.url)) {
        duplicateUrls++;
      } else {
        urls.add(video.url);
      }
    });

    return {
      total: data.length,
      uniqueVideoIds: videoIds.size,
      uniqueUrls: urls.size,
      duplicateVideoIds,
      duplicateUrls
    };
  }

  /**
   * 📊 기본 통계 출력
   */
  displayBasicStats(stats) {
    console.log('📊 ===== 기본 통계 =====');
    console.log(`총 영상 수: ${stats.total.toLocaleString()}개`);
    console.log(`오늘 수집: ${stats.todayVideos.toLocaleString()}개`);
    console.log(`평균 조회수: ${stats.avgViews.toLocaleString()}회`);
    console.log(`평균 좋아요: ${stats.avgLikes.toLocaleString()}개`);
    console.log(`평균 길이: ${stats.avgLength}초`);
    console.log('');
  }

  /**
   * 🏷️ 키워드 분포 출력
   */
  displayKeywordDistribution(distribution) {
    console.log('🏷️ ===== 키워드별 수집 현황 =====');
    distribution.forEach(([keyword, count], index) => {
      console.log(`${String(index + 1).padStart(2)}. ${keyword}: ${count}개`);
    });
    console.log('');
  }

  /**
   * ✅ 품질 검사 결과 출력
   */
  displayQualityCheck(quality) {
    console.log('✅ ===== 데이터 품질 검사 =====');
    console.log(`품질 점수: ${quality.qualityScore}% (${quality.validVideos}/${quality.total})`);
    console.log(`Shorts 영상: ${quality.shortVideos}개 (${Math.round((quality.shortVideos/quality.total)*100)}%)`);
    console.log(`한국 콘텐츠: ${quality.koreanVideos}개 (${Math.round((quality.koreanVideos/quality.total)*100)}%)`);
    console.log(`조회수 있음: ${quality.hasViews}개 (${Math.round((quality.hasViews/quality.total)*100)}%)`);
    console.log(`좋아요 있음: ${quality.hasLikes}개 (${Math.round((quality.hasLikes/quality.total)*100)}%)`);
    
    if (quality.missingFields > 0) {
      console.log(`⚠️ 필수 필드 누락: ${quality.missingFields}개`);
    }
    console.log('');
  }

  /**
   * 📋 최신 샘플 출력
   */
  displayRecentSamples(samples) {
    console.log('📋 ===== 최신 수집 영상 샘플 =====');
    samples.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title || 'No Title'}`);
      console.log(`   📹 ${video.youtuber || 'Unknown'} | 👀 ${(video.views || 0).toLocaleString()}회`);
      console.log(`   🏷️ ${video.collection_keyword} | ⏱️ ${video.video_length || 0}초`);
      console.log(`   🔗 ${video.url}`);
      console.log('');
    });
  }

  /**
   * 🔄 중복 검사 결과 출력
   */
  displayDuplicateCheck(duplicate) {
    console.log('🔄 ===== 중복 데이터 검사 =====');
    console.log(`총 레코드: ${duplicate.total}개`);
    console.log(`고유 Video ID: ${duplicate.uniqueVideoIds}개`);
    console.log(`고유 URL: ${duplicate.uniqueUrls}개`);
    
    if (duplicate.duplicateVideoIds > 0) {
      console.log(`⚠️ 중복 Video ID: ${duplicate.duplicateVideoIds}개`);
    }
    if (duplicate.duplicateUrls > 0) {
      console.log(`⚠️ 중복 URL: ${duplicate.duplicateUrls}개`);
    }
    
    if (duplicate.duplicateVideoIds === 0 && duplicate.duplicateUrls === 0) {
      console.log('✅ 중복 데이터 없음');
    }
    console.log('');
  }

  /**
   * 🎯 특정 키워드 데이터 상세 확인
   */
  async validateKeywordData(keyword) {
    console.log(`🔍 "${keyword}" 키워드 데이터 상세 검증...\n`);

    const { data, error } = await this.supabase
      .from('videos_cache_v2')
      .select('*')
      .eq('collection_keyword', keyword)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`📊 총 ${data.length}개 영상 수집됨`);
    
    if (data.length > 0) {
      const sample = data[0];
      console.log('\n📋 샘플 데이터:');
      console.log(`제목: ${sample.title}`);
      console.log(`채널: ${sample.youtuber}`);
      console.log(`조회수: ${(sample.views || 0).toLocaleString()}회`);
      console.log(`길이: ${sample.video_length}초`);
      console.log(`URL: ${sample.url}`);
    }

    return data;
  }
}

// =============================================================================
// 🚀 실행 함수들
// =============================================================================

/**
 * 전체 데이터 검증 실행
 */
export async function validateAllData() {
  const validator = new DataValidator();
  await validator.validateCollectedData();
}

/**
 * 특정 키워드 데이터 검증
 */
export async function validateKeywordData(keyword) {
  const validator = new DataValidator();
  return await validator.validateKeywordData(keyword);
}

// CLI 실행 지원
const currentFilePath = fileURLToPath(import.meta.url);
const isMainScript = process.argv[1] && (currentFilePath === process.argv[1]);

if (isMainScript) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // 특정 키워드 검증
    const keyword = args[0];
    validateKeywordData(keyword);
  } else {
    // 전체 데이터 검증
    validateAllData();
  }
}

export default DataValidator; 