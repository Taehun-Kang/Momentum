/**
 * YouTube Shorts 필터링 테스트
 * Momentum by Wave Team
 * 
 * 이 파일은 YouTube Shorts 전용 필터링 로직을 테스트합니다.
 * 2단계 필터링: search.list → videos.list → 재생가능 여부 확인
 */

const { google } = require('googleapis');
require('dotenv').config({ path: '../../backend/.env' });

// YouTube API 클라이언트 초기화
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

/**
 * Shorts 영상 여부 확인 함수
 * @param {Object} video - videos.list API 응답의 video 객체
 * @returns {boolean} - Shorts 영상 여부
 */
function isShortsVideo(video) {
  const { contentDetails, status } = video;
  
  if (!contentDetails || !status) return false;

  // 1. 재생 시간 체크 (60초 이하)
  const duration = contentDetails.duration; // PT1M30S 형식
  const durationInSeconds = parseDuration(duration);
  
  if (durationInSeconds > 60) return false;

  // 2. 공개 상태 확인
  if (status.privacyStatus !== 'public') return false;

  // 3. 임베드 가능 여부 (선택적)
  if (status.embeddable === false) return false;

  // 4. 업로드 제한 확인
  if (status.uploadStatus !== 'processed') return false;

  return true;
}

/**
 * YouTube duration 형식을 초로 변환
 * @param {string} duration - PT1M30S 형식
 * @returns {number} - 초 단위 시간
 */
function parseDuration(duration) {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 2단계 필터링 워크플로우
 * 1단계: search.list로 기본 검색
 * 2단계: videos.list로 상세 정보 확인 및 Shorts 필터링
 */
async function twoStageFiltering(query, maxResults = 10) {
  try {
    console.log(`🔍 2단계 필터링 시작: "${query}"\n`);

    // 1단계: 기본 검색 (100 units 사용)
    console.log('1️⃣ 1단계: 기본 영상 검색...');
    const searchResponse = await youtube.search.list({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults * 3, // Shorts 비율을 고려해 3배로 검색
      order: 'relevance',
      publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 최근 1주일
    });

    const videoIds = searchResponse.data.items.map(item => item.id.videoId);
    console.log(`   📊 ${videoIds.length}개 영상 발견`);

    if (videoIds.length === 0) {
      console.log('❌ 검색 결과가 없습니다.');
      return [];
    }

    // 2단계: 상세 정보 확인 (1 unit per video 사용)
    console.log('\n2️⃣ 2단계: Shorts 필터링...');
    const videosResponse = await youtube.videos.list({
      part: 'contentDetails,status,snippet,statistics',
      id: videoIds.join(',')
    });

    // Shorts 필터링
    const shortsVideos = [];
    const filteredOut = {
      tooLong: 0,
      notPublic: 0,
      notEmbeddable: 0,
      notProcessed: 0
    };

    videosResponse.data.items.forEach(video => {
      const duration = parseDuration(video.contentDetails.duration);
      
      // 필터링 이유 분석
      if (duration > 60) {
        filteredOut.tooLong++;
        return;
      }
      if (video.status.privacyStatus !== 'public') {
        filteredOut.notPublic++;
        return;
      }
      if (video.status.embeddable === false) {
        filteredOut.notEmbeddable++;
        return;
      }
      if (video.status.uploadStatus !== 'processed') {
        filteredOut.notProcessed++;
        return;
      }

      // Shorts 조건을 만족하는 영상
      shortsVideos.push({
        id: video.id,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        duration: duration,
        publishedAt: video.snippet.publishedAt,
        viewCount: video.statistics.viewCount,
        likeCount: video.statistics.likeCount
      });
    });

    // 결과 출력
    console.log(`   ✅ Shorts 영상: ${shortsVideos.length}개`);
    console.log(`   ❌ 필터링된 영상: ${videoIds.length - shortsVideos.length}개`);
    console.log(`      - 60초 초과: ${filteredOut.tooLong}개`);
    console.log(`      - 비공개: ${filteredOut.notPublic}개`);
    console.log(`      - 임베드 불가: ${filteredOut.notEmbeddable}개`);
    console.log(`      - 처리 중: ${filteredOut.notProcessed}개`);

    // 상위 결과만 반환
    return shortsVideos.slice(0, maxResults);

  } catch (error) {
    console.error('❌ 2단계 필터링 실패:', error.message);
    throw error;
  }
}

/**
 * 인기 Shorts 검색 (트렌딩 기능)
 */
async function getTrendingShorts() {
  try {
    console.log('🔥 인기 Shorts 검색 중...\n');

    // 인기 검색어들
    const trendingQueries = [
      'funny shorts',
      'viral shorts',
      'trending shorts',
      'comedy shorts',
      'dance shorts'
    ];

    const allShorts = [];

    for (const query of trendingQueries.slice(0, 2)) { // API 할당량 절약을 위해 2개만
      console.log(`🔍 검색: "${query}"`);
      const shorts = await twoStageFiltering(query, 3);
      allShorts.push(...shorts);
    }

    // 조회수 기준 정렬
    allShorts.sort((a, b) => parseInt(b.viewCount) - parseInt(a.viewCount));

    console.log(`\n🏆 상위 인기 Shorts (총 ${allShorts.length}개):`);
    allShorts.slice(0, 5).forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`);
      console.log(`   📺 ${video.channel}`);
      console.log(`   👀 조회수: ${parseInt(video.viewCount).toLocaleString()}`);
      console.log(`   ⏱️  길이: ${video.duration}초\n`);
    });

    return allShorts;

  } catch (error) {
    console.error('❌ 인기 Shorts 검색 실패:', error.message);
    throw error;
  }
}

/**
 * API 할당량 계산기
 */
function calculateQuotaUsage(searchCount, videoCount) {
  const searchCost = searchCount * 100; // search.list = 100 units
  const videoCost = Math.ceil(videoCount / 50) * 1; // videos.list = 1 unit per 50 videos
  const total = searchCost + videoCost;

  console.log('\n📊 API 할당량 사용량:');
  console.log(`   🔍 검색 API: ${searchCount}회 × 100 = ${searchCost} units`);
  console.log(`   📹 비디오 API: ${videoCount}개 ÷ 50 = ${videoCost} units`);
  console.log(`   🎯 총 사용량: ${total} units`);
  console.log(`   📈 남은 할당량: ${10000 - total} units (일일 10,000 기준)\n`);

  return total;
}

// 테스트 실행 함수
async function runShortsFilteringTests() {
  console.log('🌊 Momentum Shorts 필터링 테스트 시작 (by Wave Team)\n');
  console.log('=' .repeat(60));

  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  YouTube API 키가 설정되지 않았습니다.');
    console.log('💡 실제 API 호출 대신 필터링 로직 구조를 보여드립니다.\n');
    
    // 샘플 데이터로 로직 테스트
    console.log('🧪 필터링 로직 테스트 (샘플 데이터):');
    
    const sampleVideo = {
      id: 'sample123',
      contentDetails: { duration: 'PT45S' }, // 45초
      status: { 
        privacyStatus: 'public',
        embeddable: true,
        uploadStatus: 'processed'
      },
      snippet: {
        title: '샘플 Shorts 영상',
        channelTitle: '테스트 채널'
      },
      statistics: {
        viewCount: '150000',
        likeCount: '5000'
      }
    };

    const isShorts = isShortsVideo(sampleVideo);
    const duration = parseDuration(sampleVideo.contentDetails.duration);
    
    console.log(`   ✅ 샘플 영상 분석:`);
    console.log(`      제목: ${sampleVideo.snippet.title}`);
    console.log(`      길이: ${duration}초`);
    console.log(`      Shorts 여부: ${isShorts ? '✅ 맞음' : '❌ 아님'}`);
    
    // 할당량 계산 예시
    console.log('\n📊 할당량 계산 예시:');
    calculateQuotaUsage(5, 150); // 5번 검색, 150개 영상 확인
    
    return;
  }

  try {
    // API 키가 있으면 실제 테스트 실행
    console.log('🔥 실제 YouTube API 테스트 시작...\n');
    
    // 1. 기본 Shorts 검색
    const shorts = await twoStageFiltering('funny shorts', 5);
    
    // 2. 인기 Shorts 검색
    // await getTrendingShorts();
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }

  console.log('=' .repeat(60));
  console.log('🎉 Shorts 필터링 테스트 완료!\n');
}

// 테스트 실행
if (require.main === module) {
  runShortsFilteringTests().catch(console.error);
}

module.exports = {
  isShortsVideo,
  parseDuration,
  twoStageFiltering,
  getTrendingShorts,
  calculateQuotaUsage
}; 