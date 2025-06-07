require('dotenv').config();

const config = {
  // 서버 설정
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Supabase 설정
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // YouTube API 설정
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  YOUTUBE_QUOTA_PER_DAY: 10000, // 일일 할당량
  
  // JWT 설정
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // MCP 설정
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
  BRIGHT_DATA_API_KEY: process.env.BRIGHT_DATA_API_KEY || '',
  
  // 캐시 설정
  CACHE_TTL: 3600, // 1시간 (초)
  CACHE_MAX_SIZE: 1000, // 최대 1000개 항목
  
  // 레이트 리미팅
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15분
  RATE_LIMIT_MAX_REQUESTS: 100, // 15분당 최대 100회
  
  // CORS 설정
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3001',
  
  // API 설정
  API_PREFIX: '/api/v1',
  
  // 로그 레벨
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// 필수 환경 변수 검증
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'YOUTUBE_API_KEY'
];

function validateConfig() {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ 누락된 필수 환경 변수:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 .env 파일을 생성하고 필수 변수들을 설정해주세요.');
    
    if (config.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

module.exports = {
  config,
  validateConfig
}; 