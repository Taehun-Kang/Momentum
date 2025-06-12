/**
 * 🎯 YouTube AI Services 기본 사용법 예제
 * 
 * 실행 방법:
 * 1. .env 파일에 API 키 설정
 * 2. npm install
 * 3. node examples/basic-usage.js
 */

require('dotenv').config();
const YouTubeAIServices = require('../index');

async function main() {
  try {
    console.log('🎬 YouTube AI Services 기본 사용법 예제');
    console.log('='.repeat(50));

    // 1. 서비스 초기화
    console.log('\n📡 서비스 초기화 중...');
    const youtubeAI = new YouTubeAIServices();

    // 사용법 가이드 출력
    youtubeAI.printUsageGuide();

    // 2. 설정 상태 확인
    console.log('\n⚙️ 설정 상태 확인...');
    const configStatus = youtubeAI.getConfigStatus();
    console.log('설정 검증:', configStatus.validation.isValid ? '✅ 성공' : '❌ 실패');
    
    if (configStatus.recommendations.length > 0) {
      console.log('권장사항:');
      configStatus.recommendations.forEach(rec => {
        const icon = {
          'critical': '🚨',
          'warning': '⚠️',
          'info': 'ℹ️',
          'success': '✅'
        }[rec.type] || 'ℹ️';
        
        console.log(`  ${icon} ${rec.message}`);
      });
    }

    // 3. 헬스 체크
    console.log('\n🏥 헬스 체크 실행...');
    const health = await youtubeAI.healthCheck();
    console.log(`서비스 상태: ${health.status}`);
    
    Object.entries(health.services).forEach(([service, status]) => {
      const icon = {
        'healthy': '✅',
        'configured': '🔧',
        'not_configured': '❌',
        'unhealthy': '🚨'
      }[status] || '❓';
      
      console.log(`  ${icon} ${service}: ${status}`);
    });

    // API 키가 없으면 여기서 중단
    if (!configStatus.features.youtubeSearch) {
      console.log('\n❌ YouTube API 키가 없어서 실제 검색을 수행할 수 없습니다.');
      console.log('💡 .env 파일에 YOUTUBE_API_KEY를 설정해주세요.');
      return;
    }

    // 4. 기본 키워드 검색
    console.log('\n🔍 기본 키워드 검색 테스트...');
    try {
      const searchResults = await youtubeAI.searchVideos('먹방', { maxResults: 5 });
      
      console.log(`✅ 검색 완료: ${searchResults.totalVideos}개 영상 발견`);
      console.log('📊 검색 통계:', {
        키워드: searchResults.searchKeywords,
        총영상수: searchResults.totalVideos,
        API사용량: searchResults.statistics?.totalApiUnitsUsed || 0
      });

      // 상위 3개 영상 정보 출력
      console.log('\n🎥 상위 3개 영상:');
      searchResults.videos.slice(0, 3).forEach((video, index) => {
        console.log(`  ${index + 1}. ${video.title}`);
        console.log(`     채널: ${video.channelTitle}`);
        console.log(`     조회수: ${parseInt(video.viewCount || 0).toLocaleString()}`);
        console.log(`     링크: https://youtube.com/watch?v=${video.videoId}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ 검색 실패:', error.message);
    }

    // 5. 트렌딩 키워드 수집 (API 키가 있는 경우)
    if (configStatus.features.googleTrends || configStatus.features.webScraping) {
      console.log('\n📈 트렌딩 키워드 수집 테스트...');
      try {
        const trendingKeywords = await youtubeAI.getTrendingKeywords({ limit: 5 });
        
        console.log('✅ 트렌딩 키워드:', trendingKeywords.join(', '));

      } catch (error) {
        console.error('❌ 트렌드 수집 실패:', error.message);
      }
    }

    // 6. 프리셋 기능 테스트
    console.log('\n🎮 프리셋 기능 테스트...');
    try {
      const mukbangVideos = await youtubeAI.getMukbangVideos();
      console.log(`🍜 먹방 영상: ${mukbangVideos.totalVideos}개 발견`);

    } catch (error) {
      console.error('❌ 프리셋 테스트 실패:', error.message);
    }

    // 7. 사용 통계 출력
    console.log('\n📊 최종 사용 통계');
    const stats = youtubeAI.getUsageStats();
    console.log('사용 통계:', {
      총검색횟수: stats.totalSearches,
      총영상수: stats.totalVideosFound,
      API사용량: stats.totalApiUnitsUsed,
      평균영상수: stats.averageVideosPerSearch,
      실행시간: stats.runtime
    });

    // 8. 캐시 통계
    const cacheStats = youtubeAI.getCacheStats();
    console.log('캐시 통계:', {
      총캐시수: cacheStats.totalCached,
      유효캐시: cacheStats.validEntries,
      만료캐시: cacheStats.expiredEntries,
      적중률: cacheStats.hitRate + '%'
    });

    console.log('\n✅ 모든 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류 발생:', error.message);
    console.error(error.stack);
  }
}

// 실행
if (require.main === module) {
  main().then(() => {
    console.log('\n👋 테스트 종료');
    process.exit(0);
  }).catch(error => {
    console.error('❌ 치명적 오류:', error.message);
    process.exit(1);
  });
}

module.exports = main; 