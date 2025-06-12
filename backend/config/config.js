require('dotenv').config();

/**
 * 🔧 YouTube AI 서비스 통합 설정 파일
 * 
 * 이 파일은 YouTube Shorts 큐레이션 서비스의 모든 설정을 관리합니다.
 * API 키, 할당량 관리, 캐시 설정, 기본값 등을 포함합니다.
 * 
 * 📋 설정해야 할 환경변수들:
 * - 필수: SUPABASE_URL, SUPABASE_ANON_KEY, YOUTUBE_API_KEY
 * - 선택: CLAUDE_API_KEY, BRIGHT_DATA_API_KEY, SERP_API_KEY
 */

const config = {
  // =============================================================================
  // 🌐 서버 기본 설정
  // =============================================================================
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // =============================================================================
  // 🗄️ Supabase 데이터베이스 설정 (필수)
  // =============================================================================
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // =============================================================================
  // 🎬 YouTube API 설정 (필수)
  // 프로젝트의 핵심 기능인 영상 검색과 필터링에 필요
  // =============================================================================
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  
  // =============================================================================
  // 🔐 JWT 인증 설정
  // 사용자 로그인 세션 관리용
  // =============================================================================
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // =============================================================================
  // 🤖 AI 및 외부 서비스 API 설정 (선택적)
  // Claude: AI 대화형 검색, Bright Data: 웹 스크래핑, SERP: 구글 트렌드
  // =============================================================================
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',        // TODO: Claude Console에서 발급
  BRIGHT_DATA_API_KEY: process.env.BRIGHT_DATA_API_KEY || '', // TODO: brightdata.com에서 발급
  SERP_API_KEY: process.env.SERP_API_KEY || '',            // TODO: serpapi.com에서 발급
  
  // =============================================================================
  // 📊 API 할당량 관리 시스템
  // 각 API 서비스의 사용량을 모니터링하고 제한하여 비용 절약
  // =============================================================================
  quotaLimits: {
    // YouTube API 할당량 (매우 중요!)
    youtube: {
      dailyLimit: 10000,          // 일일 최대 10,000 units (Google 기본 할당량)
      warningThreshold: 8000,     // 8,000 units 도달시 경고 (80%)
      emergencyThreshold: 9000    // 9,000 units 도달시 캐시 전용 모드 (90%)
      // 💡 왜 필요한가? YouTube API는 매우 비싸고 할당량이 제한적
      // 💡 search.list = 100 units, videos.list = 1+부분당2 units
      // 💡 하루에 약 50-100회 검색만 가능하므로 캐싱이 필수
    },
    
    // SerpAPI 할당량 (구글 트렌드용)
    serpApi: {
      monthlyLimit: 1000,         // 월 1,000회 (무료 플랜 기준)
      warningThreshold: 800       // 800회 도달시 경고
      // 💡 왜 필요한가? 실시간 트렌드 키워드 수집용
      // 💡 무료 플랜은 100회/월, 유료는 1000회/월부터 시작
    },
    
    // Bright Data 할당량 (웹 스크래핑용)
    brightData: {
      monthlyRequests: 5000,      // 월 5,000회 요청
      concurrentRequests: 10      // 동시 최대 10개 요청
      // 💡 왜 필요한가? 네이버, 다음 등 한국 사이트 트렌드 수집
      // 💡 무료 플랜은 제한적이므로 효율적 사용 필요
    },
    
    // Claude API 할당량 (AI 대화형 검색용)
    claude: {
      dailyRequests: 2000,        // 일일 2,000회 요청
      tokensPerRequest: 4000      // 요청당 평균 4,000 토큰
      // 💡 왜 필요한가? 자연어 질문을 키워드로 변환
      // 💡 프리미엄 기능이므로 무료 사용자는 제한적으로 제공
    }
  },
  
  // =============================================================================
  // ⏰ 세분화된 캐시 설정 시스템
  // 각 데이터 타입별로 다른 TTL을 적용하여 API 사용량 최적화
  // =============================================================================
  cache: {
    ttl: {
      // 검색 결과 캐싱 (4시간)
      searchResults: 4 * 60 * 60 * 1000,
      // 💡 이유: 검색 결과는 자주 바뀌지 않지만 너무 오래 캐시하면 최신성 떨어짐
      
      // 트렌드 데이터 캐싱 (2시간)
      trendData: 2 * 60 * 60 * 1000,
      // 💡 이유: 트렌드는 빠르게 변하므로 짧은 캐시
      
      // 영상 상세 정보 캐싱 (24시간)
      videoDetails: 24 * 60 * 60 * 1000,
      // 💡 이유: 영상 제목, 설명 등은 잘 바뀌지 않음
      
      // 사용자 선호도 캐싱 (7일)
      userPreferences: 7 * 24 * 60 * 60 * 1000,
      // 💡 이유: 사용자 취향은 천천히 변하므로 긴 캐시
      
      // 재생 가능 영상 캐싱 (7일) - 중요!
      playableVideos: 7 * 24 * 60 * 60 * 1000,
      // 💡 이유: 재생 가능한 영상은 상태가 잘 바뀌지 않음
      
      // 재생 불가 영상 캐싱 (1일) - 중요!
      unplayableVideos: 24 * 60 * 60 * 1000
      // 💡 이유: 재생 불가 영상을 다시 확인하는 것을 방지하여 API 절약
    },
    maxSize: 1000,                    // 최대 1000개 항목 캐시
    cleanupInterval: 60 * 60 * 1000   // 1시간마다 만료된 캐시 정리
  },
  
  // =============================================================================
  // 🎯 YouTube 검색 기본 설정 (한국 최적화)
  // 모든 검색에 기본적으로 적용되는 설정들
  // =============================================================================
  defaults: {
    maxResults: 20,           // 기본 검색 결과 수
    regionCode: 'KR',         // 한국 지역 설정 (한국 사용자 맞춤)
    language: 'ko',           // 한국어 우선
    videoDuration: 'short',   // Shorts만 검색 (4분 미만)
    safeSearch: 'moderate'    // 중간 수준 안전 검색
    // 💡 이유: 한국 사용자를 위한 YouTube Shorts 서비스이므로
  },
  
  // =============================================================================
  // 🛡️ 보안 및 제한 설정
  // =============================================================================
  
  // 레이트 리미팅 (API 남용 방지)
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15분 윈도우
  RATE_LIMIT_MAX_REQUESTS: 100,         // 15분당 최대 100회 요청
  
  // CORS 설정 (프론트엔드 연결)
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3001',
  
  // API 버전 관리
  API_PREFIX: '/api/v1',
  
  // 로그 레벨
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// =============================================================================
// 🔍 환경 변수 검증 시스템
// =============================================================================

// 필수 환경 변수 (없으면 서비스 실행 불가)
const requiredEnvVars = [
  'SUPABASE_URL',        // 사용자 데이터, 캐시 저장용
  'SUPABASE_ANON_KEY',   // Supabase 접근용
  'YOUTUBE_API_KEY'      // 핵심 기능인 영상 검색용
];

// 선택적 환경 변수 (없어도 되지만 기능 제한)
const optionalEnvVars = [
  'CLAUDE_API_KEY',      // AI 대화형 검색 (프리미엄 기능)
  'BRIGHT_DATA_API_KEY', // 웹 스크래핑 (트렌드 수집)
  'SERP_API_KEY'         // 구글 트렌드 (실시간 트렌드)
];

/**
 * 🔍 설정 검증 함수
 * 필수 환경 변수가 설정되었는지 확인하고, 누락된 것이 있으면 오류 출력
 */
function validateConfig() {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);
  
  // 필수 변수 누락 시
  if (missingVars.length > 0) {
    console.error('❌ 누락된 필수 환경 변수:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 .env 파일을 생성하고 필수 변수들을 설정해주세요.');
    console.error('\n📋 설정 방법:');
    console.error('   1. .env 파일 생성');
    console.error('   2. YOUTUBE_API_KEY=your_api_key_here');
    console.error('   3. SUPABASE_URL=your_supabase_url');
    console.error('   4. SUPABASE_ANON_KEY=your_anon_key');
    
    if (config.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
  
  // 선택적 변수 누락 시 (경고만)
  if (missingOptional.length > 0) {
    console.warn('⚠️ 누락된 선택적 환경 변수 (일부 기능 제한됨):');
    missingOptional.forEach(varName => {
      const description = getEnvVarDescription(varName);
      console.warn(`   - ${varName}: ${description}`);
    });
    console.warn('\n💡 이 변수들이 없어도 기본 기능은 동작하지만, 고급 기능이 제한됩니다.');
  }
}

/**
 * 🔍 환경 변수 설명 반환
 */
function getEnvVarDescription(varName) {
  const descriptions = {
    'CLAUDE_API_KEY': 'AI 대화형 검색 기능 (프리미엄)',
    'BRIGHT_DATA_API_KEY': '웹 스크래핑을 통한 트렌드 수집',
    'SERP_API_KEY': '구글 트렌드 실시간 수집'
  };
  return descriptions[varName] || '알 수 없는 기능';
}

/**
 * 🎯 사용 가능한 기능 확인
 * 설정된 API 키에 따라 어떤 기능들이 사용 가능한지 반환
 */
function getAvailableFeatures() {
  const features = {
    youtubeSearch: !!config.YOUTUBE_API_KEY,     // YouTube 검색 (필수)
    videoFiltering: !!config.YOUTUBE_API_KEY,    // 영상 필터링 (필수)
    googleTrends: !!config.SERP_API_KEY,         // 구글 트렌드 (선택)
    webScraping: !!config.BRIGHT_DATA_API_KEY,   // 웹 스크래핑 (선택)
    aiOptimization: !!config.CLAUDE_API_KEY      // AI 최적화 (선택)
  };
  
  // 사용 가능한 기능 로그 출력
  console.log('\n🎯 사용 가능한 기능:');
  Object.entries(features).forEach(([feature, available]) => {
    const status = available ? '✅' : '❌';
    const description = getFeatureDescription(feature);
    console.log(`   ${status} ${feature}: ${description}`);
  });
  
  return features;
}

/**
 * 🔍 기능 설명 반환
 */
function getFeatureDescription(feature) {
  const descriptions = {
    'youtubeSearch': 'YouTube 영상 검색',
    'videoFiltering': '재생 가능 영상 필터링', 
    'googleTrends': '구글 트렌드 키워드 수집',
    'webScraping': '네이버/다음 트렌드 수집',
    'aiOptimization': 'AI 대화형 검색 및 최적화'
  };
  return descriptions[feature] || '알 수 없는 기능';
}

/**
 * 📋 TODO: 나중에 설정해야 할 항목들
 * 
 * 1. 🔑 API 키 발급 및 설정:
 *    - CLAUDE_API_KEY: console.anthropic.com에서 발급
 *    - BRIGHT_DATA_API_KEY: brightdata.com에서 발급  
 *    - SERP_API_KEY: serpapi.com에서 발급
 * 
 * 2. 📊 할당량 모니터링 시스템 구현:
 *    - API 사용량 실시간 추적
 *    - 임계치 도달시 알림 시스템
 *    - 자동 캐시 전용 모드 전환
 * 
 * 3. 🗄️ 캐시 저장소 선택:
 *    - 개발: 메모리 캐시 (현재)
 *    - 운영: Redis 또는 Supabase 테이블
 * 
 * 4. 🔧 동적 설정 관리:
 *    - 관리자 대시보드에서 할당량 조정
 *    - 캐시 TTL 동적 변경
 *    - 기능별 ON/OFF 토글
 */

module.exports = {
  config,
  validateConfig,
  getAvailableFeatures
}; 