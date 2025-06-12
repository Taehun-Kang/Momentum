/**
 * 🌟 통합 트렌드 수집기 (Unified Trends Collector)
 * 
 * Google Trends와 ZUM Trends를 통합하여 사용할 수 있는 메인 인터페이스
 */

import { collectAllGoogleTrends } from './modules/google-trends-collector.js';
import { collectZumTrends } from './modules/zum-trends-collector.js';

/**
 * 🌟 모든 트렌드 수집 (Google + ZUM) - Raw 데이터
 */
export async function collectAllTrends(options = {}) {
  const { 
    includeGoogle = true,
    includeZum = true
  } = options;

  console.log('🌟 통합 트렌드 수집 시작 (Raw 데이터)...');
  
  const results = {
    google: { trends: { KR: [], US: [] } },
    zum: { trends: [] }
  };

  // Google Trends 수집 (KR 50개, US 50개)
  if (includeGoogle) {
    try {
      console.log('📊 Google Trends 수집 중...');
      results.google = await collectAllGoogleTrends({ 
        includeRegions: ['KR', 'US']
      });
      console.log(`✅ Google: KR ${results.google.trends.KR.length}개, US ${results.google.trends.US.length}개 수집`);
    } catch (error) {
      console.error(`❌ Google Trends 수집 실패: ${error.message}`);
    }
  }

  // ZUM Trends 수집
  if (includeZum) {
    try {
      console.log('📰 ZUM Trends 수집 중...');
      results.zum = await collectZumTrends({ maxKeywords: 50 });
      console.log(`✅ ZUM: ${results.zum.trends.length}개 수집`);
    } catch (error) {
      console.error(`❌ ZUM Trends 수집 실패: ${error.message}`);
    }
  }

  console.log('🔄 Raw 데이터 수집 완료');

  return results;
} 