/**
 * YouTube API 기본 테스트
 * Momentum by Wave Team
 * 
 * 이 파일은 YouTube Data API v3의 기본 기능을 테스트합니다.
 */

const { google } = require('googleapis');
require('dotenv').config({ path: '../../backend/.env' });

// YouTube API 클라이언트 초기화
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

// 기본 검색 테스트
async function testBasicSearch() {
  try {
    console.log('🔍 YouTube API 기본 검색 테스트 시작...\n');

    const response = await youtube.search.list({
      part: 'snippet',
      q: 'shorts',
      type: 'video',
      maxResults: 5,
      order: 'relevance'
    });

    console.log('✅ 검색 성공!');
    console.log(`📊 총 ${response.data.items.length}개 영상 발견\n`);

    response.data.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.snippet.title}`);
      console.log(`   📺 채널: ${item.snippet.channelTitle}`);
      console.log(`   📅 게시일: ${item.snippet.publishedAt}`);
      console.log(`   🔗 ID: ${item.id.videoId}\n`);
    });

  } catch (error) {
    console.error('❌ YouTube API 테스트 실패:');
    console.error('오류 내용:', error.message);
    
    if (error.code === 403) {
      console.error('\n💡 해결방법:');
      console.error('1. YouTube Data API v3 활성화 확인');
      console.error('2. API 키 할당량 확인');
      console.error('3. API 키가 올바른지 확인');
    }
  }
}

// 할당량 체크 함수
async function checkQuotaUsage() {
  try {
    console.log('📊 YouTube API 할당량 사용량 체크...\n');
    
    // 간단한 검색으로 할당량 사용량 테스트 (약 100 units 사용)
    const response = await youtube.search.list({
      part: 'snippet',
      q: 'test',
      type: 'video',
      maxResults: 1
    });

    console.log('✅ API 호출 성공!');
    console.log('💡 현재 할당량: 정상 사용 가능');
    console.log('📈 이 테스트로 약 100 units 사용됨');
    console.log('📊 일일 한도: 10,000 units\n');

  } catch (error) {
    if (error.code === 403 && error.message.includes('quota')) {
      console.error('❌ 할당량 초과!');
      console.error('📊 일일 할당량 10,000 units를 모두 사용했습니다.');
      console.error('⏰ 내일 다시 시도해주세요.\n');
    } else {
      console.error('❌ API 호출 실패:', error.message);
    }
  }
}

// API 키 유효성 검사
function validateApiKey() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ YouTube API 키가 설정되지 않았습니다!');
    console.error('💡 backend/.env 파일에 YOUTUBE_API_KEY를 설정해주세요.');
    return false;
  }

  if (apiKey.length < 20) {
    console.error('❌ YouTube API 키가 올바르지 않은 것 같습니다.');
    console.error('💡 Google Cloud Console에서 발급받은 정확한 키를 확인해주세요.');
    return false;
  }

  console.log('✅ YouTube API 키 형식 확인 완료');
  return true;
}

// 메인 테스트 함수
async function runTests() {
  console.log('🌊 Momentum YouTube API 테스트 시작 (by Wave Team)\n');
  console.log('=' .repeat(50));

  // 1. API 키 검증
  if (!validateApiKey()) {
    process.exit(1);
  }

  // 2. 할당량 체크
  await checkQuotaUsage();

  // 3. 기본 검색 테스트
  await testBasicSearch();

  console.log('=' .repeat(50));
  console.log('🎉 YouTube API 테스트 완료!\n');
}

// 테스트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testBasicSearch,
  checkQuotaUsage,
  validateApiKey
}; 