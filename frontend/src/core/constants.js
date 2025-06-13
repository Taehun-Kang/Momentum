/**
 * 🔧 Constants - 전역 상수 정의
 */

// 앱 설정
export const APP_CONFIG = {
  NAME: 'Momentum',
  VERSION: '1.0.0',
  DESCRIPTION: 'YouTube Shorts AI Curation Service',
  
  // 화면 크기
  VIEWPORT: {
    WIDTH: 430,
    HEIGHT: 932,
    MAX_WIDTH: '430px'
  },
  
  // 테마
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
  }
}

// 라우트 경로
export const ROUTES = {
  HOME: '#/',
  LOGIN: '#/login',
  TOPIC_SELECT: '#/topic-select',
  MOOD_SELECT: '#/mood-select',
  KEYWORD_RECOMMEND: '#/keyword-recommend',
  VIDEO_CONFIRM: '#/video-confirm',
  TRENDING: '#/trending',
  MY_PAGE: '#/my-page',
  CHAT_SUPPORT: '#/chat-support',
  SUPPORT_CENTER: '#/support-center',
  VIDEO_PLAYER: '#/video-player'
}

// 애니메이션 상수
export const ANIMATIONS = {
  DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  },
  
  EASING: {
    EASE_OUT: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    SPRING: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
}

// 색상 상수
export const COLORS = {
  // 메인 색상 (보라색 그라디언트용)
  PRIMARY: '#9a78db',
  SECONDARY: '#c4a7ff', // 밝은 보라색으로 수정 (기존 노란색 대신)
  
  // 글래스모피즘 (기존 variables.css와 동일하게)
  GLASS_BG: 'rgba(255, 255, 255, 0.7)',
  GLASS_BG_STRONG: 'rgba(255, 255, 255, 0.85)',
  GLASS_BG_CARD: 'rgba(255, 255, 255, 0.95)',
  GLASS_BORDER: 'rgba(255, 255, 255, 0.3)',
  GLASS_BORDER_DARK: 'rgba(0, 0, 0, 0.1)',
  
  // 텍스트 색상 (기존 variables.css와 동일하게)
  TEXT_PRIMARY: '#2d3748',
  TEXT_SECONDARY: '#718096',
  TEXT_LIGHT: '#ffffff',
  TEXT_ACCENT: '#667eea',
  TEXT_MUTED: 'rgba(45, 55, 72, 0.7)',
  
  // 그라디언트
  GRADIENT_PURPLE: 'linear-gradient(135deg, #9a78db 0%, #c4a7ff 100%)',
  GRADIENT_TRENDING: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  
  // 기분별 그라디언트 (기존 variables.css에서 가져옴)
  HAPPY_GRADIENT: 'linear-gradient(135deg, #FFB800 0%, #FFD600 100%)',
  TIRED_GRADIENT: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  EXCITED_GRADIENT: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  CALM_GRADIENT: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  
  // 주제별 그라디언트 (기존 variables.css에서 가져옴)
  TRAVEL_GRADIENT: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  COOKING_GRADIENT: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  DAILY_GRADIENT: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  MUSIC_GRADIENT: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  
  // 그림자
  SHADOW_SM: '0 2px 4px rgba(0, 0, 0, 0.06)',
  SHADOW_MD: '0 4px 12px rgba(0, 0, 0, 0.15)',
  SHADOW_LG: '0 10px 30px rgba(0, 0, 0, 0.15)',
  SHADOW_PURPLE: '0 8px 25px rgba(154, 120, 219, 0.4)',
  
  // 상태별 색상
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#3b82f6'
}

// 크기 상수
export const SIZES = {
  // 터치 타겟
  TOUCH_TARGET_MIN: 44,
  
  // 간격
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48
  },
  
  // 보더 반지름
  BORDER_RADIUS: {
    SM: 8,
    MD: 12,
    LG: 16,
    XL: 20,
    XXL: 24
  },
  
  // 폰트 크기
  FONT_SIZE: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
    TITLE: 28,
    HEADING: 32
  }
}

// 이벤트 상수
export const EVENTS = {
  // 앱 이벤트
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
  
  // 사용자 이벤트
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  
  // 라우터 이벤트
  ROUTE_CHANGE: 'route:change',
  ROUTE_ERROR: 'route:error',
  
  // 비디오 이벤트
  VIDEO_PLAY: 'video:play',
  VIDEO_PAUSE: 'video:pause',
  VIDEO_END: 'video:end',
  
  // 테마 이벤트
  THEME_CHANGE: 'theme:change'
}

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  USER: 'momentum_user',
  THEME: 'momentum_theme',
  SETTINGS: 'momentum_settings',
  VIDEO_HISTORY: 'momentum_video_history',
  MOOD_HISTORY: 'momentum_mood_history'
}

// API 상수
export const API = {
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  BASE_URL: process.env.API_BASE_URL || 'https://api.momentum.app',
  
  ENDPOINTS: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    USER: '/user',
    VIDEOS: '/videos',
    RECOMMENDATIONS: '/recommendations'
  }
}

// YouTube 설정
export const YOUTUBE = {
  PLAYER_VARS: {
    autoplay: 0,
    controls: 0,
    disablekb: 1,
    fs: 0,
    iv_load_policy: 3,
    modestbranding: 1,
    playsinline: 1,
    rel: 0,
    showinfo: 0,
    mute: 1,
    loop: 1
  },
  
  VIDEO_QUALITY: 'hd720',
  DEFAULT_VOLUME: 50
}

// 에러 메시지
export const ERROR_MESSAGES = {
  NETWORK: '네트워크 연결을 확인해주세요',
  LOGIN_FAILED: '로그인에 실패했습니다',
  INVALID_EMAIL: '올바른 이메일 주소를 입력해주세요',
  INVALID_PASSWORD: '비밀번호를 확인해주세요',
  VIDEO_LOAD_FAILED: '비디오를 로드할 수 없습니다',
  UNKNOWN: '알 수 없는 오류가 발생했습니다'
}

// 성공 메시지
export const SUCCESS_MESSAGES = {
  LOGIN: '로그인되었습니다',
  LOGOUT: '로그아웃되었습니다',
  SIGNUP: '회원가입이 완료되었습니다',
  SAVE: '저장되었습니다'
}

// 정규식 패턴
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  YOUTUBE_VIDEO_ID: /^[a-zA-Z0-9_-]{11}$/,
  HASH_ROUTE: /^#\/[a-zA-Z0-9\-\/]*(\?.*)?$/
}

// 디바이스 브레이크포인트
export const BREAKPOINTS = {
  XS: 320,
  SM: 375,
  MD: 430,
  LG: 768,
  XL: 1024
}

// 기본 설정
export const DEFAULT_SETTINGS = {
  theme: APP_CONFIG.THEMES.AUTO,
  language: 'ko',
  autoplay: true,
  notifications: true,
  dataUsage: 'wifi-only'
}

export default {
  APP_CONFIG,
  ROUTES,
  ANIMATIONS,
  COLORS,
  SIZES,
  EVENTS,
  STORAGE_KEYS,
  API,
  YOUTUBE,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  REGEX_PATTERNS,
  BREAKPOINTS,
  DEFAULT_SETTINGS
} 