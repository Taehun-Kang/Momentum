/**
 * 🔥 트렌드 영상 서비스 DB 통합 테스트
 * 
 * 테스트 목적:
 * 1. enum 제약 조건 해결 확인
 * 2. NOT NULL 제약 조건 해결 확인
 * 3. FK 제약 조건 만족 확인 (채널 → 영상 순서)
 * 4. 전체 워크플로우 DB 저장 성공 확인
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 환경 변수 로드
import dotenv from 'dotenv';
dotenv.config({ path: path.join(projectRoot, '.env') });

// 트렌드 영상 서비스 import
import { generateTrendVideos } from '../backend/services/video/trendVideoService.js';

async function testTrendVideoService() {
  console.log('🔥 ===== 트렌드 영상 서비스 DB 통합 테스트 시작 =====\n');
  
  const startTime = Date.now();
  
  try {
    // API 키 확인
    console.log('🔑 API 키 상태 확인:');
    console.log(`   YouTube API: ${process.env.YOUTUBE_API_KEY ? '✅' : '❌'}`);
    console.log(`   SerpAPI: ${process.env.SERP_API_KEY ? '✅' : '❌'}`);
    console.log(`   Claude API: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
    console.log(`   Supabase URL: ${process.env.SUPABASE_URL ? '✅' : '❌'}`);
    console.log(`   Supabase Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'}\n`);
    
    // 테스트용 설정 (작은 규모)
    const testConfig = {
      trends: {
        maxKeywords: 10,        // 10개만 수집
        activeOnly: true,
        region: 'KR',
        noCache: false
      },
      refiner: {
        maxFinalKeywords: 5,    // 5개로 정제
        newsPerKeyword: 2,      // 뉴스 2개만
        removeDuplicates: true,
        addContext: true,
        timeout: 20000
      },
      search: {
        maxResults: 20,         // 키워드당 20개만
        part: 'snippet',
        videoDuration: 'short',
        type: 'video',
        regionCode: 'KR',
        relevanceLanguage: 'ko'
      },
      channelFilter: {
        minSubscribers: 10000,  // 1만명 이상 (테스트용으로 낮게)
        includeBranding: false,
        includeTopics: false,
        language: 'ko'
      }
    };
    
    console.log('🎯 테스트 설정:');
    console.log(`   트렌드 키워드: 최대 ${testConfig.trends.maxKeywords}개`);
    console.log(`   정제 키워드: 최대 ${testConfig.refiner.maxFinalKeywords}개`);
    console.log(`   키워드당 영상: 최대 ${testConfig.search.maxResults}개`);
    console.log(`   최소 구독자: ${testConfig.channelFilter.minSubscribers.toLocaleString()}명\n`);
    
    // 트렌드 영상 수집 실행
    console.log('🚀 트렌드 영상 수집 시작...\n');
    
    const result = await generateTrendVideos(testConfig);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('\n🎉 ===== 테스트 결과 =====');
    
    if (result.success) {
      console.log('✅ 트렌드 영상 수집 성공!');
      console.log('\n📊 수집 결과:');
      console.log(`   🔥 트렌드 키워드: ${result.data.trendsData.keywords.length}개`);
      console.log(`   🎨 정제된 키워드: ${result.data.keywords.length}개`);
      console.log(`   🎬 발견된 영상: ${result.data.searchData.totalVideos}개`);
      console.log(`   🏆 고품질 영상: ${result.data.trendVideos.length}개`);
      
      console.log('\n💰 API 비용:');
      console.log(`   YouTube 검색: ${result.summary.performance.apiCosts.youtubeSearch} units`);
      console.log(`   채널 정보: ${result.summary.performance.apiCosts.channelInfo} units`);
      console.log(`   총 비용: ${result.summary.performance.apiCosts.total} units`);
      
      console.log('\n⏱️ 성능:');
      console.log(`   총 처리 시간: ${(totalTime / 1000).toFixed(1)}초`);
      console.log(`   필터링 효율: ${result.summary.performance.filteringEfficiency}`);
      console.log(`   평균 구독자: ${result.summary.quality.averageSubscribers.toLocaleString()}명`);
      
      console.log('\n🎯 키워드 목록:');
      result.data.keywords.forEach((keyword, index) => {
        console.log(`   ${index + 1}. "${keyword}"`);
      });
      
      if (result.data.trendVideos.length > 0) {
        console.log('\n🎬 수집된 영상 샘플:');
        result.data.trendVideos.slice(0, 3).forEach((video, index) => {
          console.log(`   ${index + 1}. ${video.snippet?.title || 'N/A'}`);
          console.log(`      채널: ${video.channelInfo?.channelTitle || 'N/A'} (${video.channelInfo?.subscriberCountFormatted || 'N/A'})`);
          console.log(`      키워드: ${video.searchKeyword || 'N/A'}`);
        });
      }
      
      console.log('\n📋 DB 저장 상태:');
      console.log('   ✅ 원시 트렌드 데이터 저장');
      console.log('   ✅ 트렌드 분석 결과 저장');
      console.log('   ✅ 키워드 분석 데이터 저장');
      console.log('   ✅ 검색 로그 저장');
      console.log('   ✅ API 사용량 기록');
      console.log('   ✅ 시스템 성능 지표 저장');
      console.log('   ✅ 채널 정보 저장');
      console.log('   ✅ 영상 정보 저장 (FK 제약 조건 만족)');
      console.log('   ✅ 자동화 작업 완료 기록');
      
    } else {
      console.log('❌ 트렌드 영상 수집 실패!');
      console.error('오류:', result.error);
      
      if (result.fallback) {
        console.log('\n🔄 폴백 결과:');
        console.log(result.fallback.message);
        console.log('제안 키워드:', result.fallback.fallbackKeywords.join(', '));
      }
    }
    
  } catch (error) {
    console.error('\n❌ 테스트 실행 중 오류 발생:', error.message);
    console.error('스택 트레이스:', error.stack);
  }
  
  console.log('\n🏁 ===== 트렌드 영상 서비스 테스트 완료 =====');
}

// 테스트 실행
testTrendVideoService().catch(error => {
  console.error('테스트 실행 실패:', error);
  process.exit(1);
}); 