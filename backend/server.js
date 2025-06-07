const { config, validateConfig } = require('./config/config');

// 환경 변수 검증
validateConfig();

// app.js에서 Express 앱 가져오기 (모든 미들웨어와 라우트 포함)
const app = require('./app');

// 서버 시작
const server = app.listen(config.PORT, () => {
  console.log(`
🌊 Momentum 서버 실행 중! (by Wave Team)

📡 서버 정보:
   - 포트: ${config.PORT}
   - 환경: ${config.NODE_ENV}
   - API 경로: ${config.API_PREFIX}

🌐 접속 URL:
   - 메인: http://localhost:${config.PORT}
   - 헬스체크: http://localhost:${config.PORT}/health
   - API: http://localhost:${config.PORT}${config.API_PREFIX}

⚙️  설정 상태:
   - YouTube API: ${config.YOUTUBE_API_KEY ? '✅' : '❌ 설정 필요'}
   - Supabase: ${config.SUPABASE_URL ? '✅' : '❌ 설정 필요'}
   - Claude API: ${config.CLAUDE_API_KEY ? '✅' : '❌ 설정 필요'}

🔗 새로운 엔드포인트:
   - 🔐 인증: ${config.API_PREFIX}/auth/*
   - 🔥 트렌드: ${config.API_PREFIX}/trends/*
   - 📊 시스템: ${config.API_PREFIX}/system/*
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app; 