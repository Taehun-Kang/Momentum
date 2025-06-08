import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

console.log('=== 환경변수 테스트 ===');
console.log('YouTube API Key:', process.env.YOUTUBE_API_KEY ? '✅ 설정됨' : '❌ 없음');
console.log('Anthropic API Key:', process.env.ANTHROPIC_API_KEY ? '✅ 설정됨' : '❌ 없음');
console.log('Claude API Key:', process.env.CLAUDE_API_KEY ? '✅ 설정됨' : '❌ 없음');

// YouTube API 간단 테스트
if (process.env.YOUTUBE_API_KEY) {
  console.log('\n=== YouTube API 테스트 ===');
  const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=${process.env.YOUTUBE_API_KEY}&maxResults=1`;
  
  try {
    const response = await fetch(testUrl);
    console.log('YouTube API 응답 상태:', response.status, response.status === 200 ? '✅' : '❌');
  } catch (error) {
    console.log('YouTube API 테스트 실패:', error.message);
  }
}

console.log('\n=== 완료 ==='); 