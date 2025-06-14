/**
 * 🔧 Momentum 간단 설정 파일
 * config.js의 핵심 기능만 추린 버전
 */

import dotenv from 'dotenv';
dotenv.config();

// 🔍 환경변수 검증
function validateEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'YOUTUBE_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ 필수 환경변수 누락:', missing.join(', '));
    process.exit(1);
  }
  
  console.log('✅ 필수 환경변수 확인 완료');
}

// ⏰ 캐시 TTL (검증된 수치)
export const cache = {
  searchResults: 4 * 60 * 60 * 1000,     // 4시간
  videoDetails: 24 * 60 * 60 * 1000,     // 24시간
  playableVideos: 7 * 24 * 60 * 60 * 1000 // 7일
};

// 📊 YouTube API 할당량 (중요!)
export const quota = {
  dailyLimit: 10000,      // Google 기본 할당량
  warningAt: 8000,        // 80% 경고
  emergencyAt: 9000       // 90% 캐시 전용
};

// 🚀 서버 시작 시 검증 실행
validateEnv(); 