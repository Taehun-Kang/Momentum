# 🏗️ Backend 아키텍처 가이드

> **YouTube Shorts AI 큐레이션 서비스 백엔드 구조 완전 가이드**

## 📁 백엔드 폴더 구조

```
backend/
├── server.js               # 🚀 서버 진입점 (여기서 시작!)
├── config/
│   └── config.js           # ⚙️ 설정 관리 (API 키, DB 연결 등)
├── routes/                 # 🛣️ API 엔드포인트 정의
│   ├── videoRoutes.js      # 영상 검색 API
│   ├── authRoutes.js       # 로그인/회원가입 API
│   ├── trendRoutes.js      # 트렌드 키워드 API
│   ├── analyticsRoutes.js  # 사용자 분석 API
│   └── systemRoutes.js     # 시스템 관리 API
├── middleware/             # 🔐 요청 전처리
│   └── authMiddleware.js   # 인증 확인
├── services/               # 🧠 비즈니스 로직
│   ├── supabaseService.js  # DB 연결/조작
│   └── userAnalyticsService.js # 사용자 분석
├── youtube-ai-services/    # 🤖 AI 모듈들 (우리가 만든!)
│   ├── search/            # 검색 엔진
│   ├── keywords/          # 키워드 처리
│   ├── trends/            # 트렌드 분석
│   └── llm/               # AI 언어모델
└── database/               # 💾 DB 스키마
```

## 🔄 백엔드 작동 흐름 (요청 → 응답)

### 전체 요청 처리 흐름

```
👤 프론트엔드 요청
    ↓
🚀 server.js (진입점)
    ↓
🔐 middleware (보안/인증)
    ↓
🛣️ routes (엔드포인트 매칭)
    ↓
🤖 youtube-ai-services (AI 처리)
    ↓
🧠 services (DB 연결)
    ↓
💾 Supabase Database
    ↓
📤 JSON 응답 반환
```

### 실제 요청 예시: "먹방" 검색

```javascript
// 1. 프론트엔드 요청
fetch('http://localhost:3000/api/v1/videos/search?q=먹방')

// 2. server.js 진입
서버 시작 → 미들웨어 실행 → 라우터 찾기

// 3. videoRoutes.js 실행
'/search' 엔드포인트 매칭 → 핸들러 함수 실행

// 4. youtube-ai-services 모듈들 실행
keywords/extractor.js → "먹방" 키워드 분석
search/engine.js → YouTube API 호출
search/filter.js → 재생 가능 영상만 필터링
llm/optimizer.js → AI로 결과 개선

// 5. services/supabaseService.js
검색 결과를 DB에 저장 (캐싱)
사용자 검색 기록 저장

// 6. 응답 반환
{
  "success": true,
  "data": {
    "videos": [...재생 가능한 먹방 영상들],
    "total": 50,
    "keywords": ["먹방", "ASMR 먹방", "도전 먹방"],
    "cached": false
  }
}
```

## 🧩 각 컴포넌트의 역할

### 1. **server.js** - 🚀 지휘탑

```javascript
// 역할: 서버의 진입점, 모든 설정과 라우트 연결
const app = express();

// ✅ 보안 설정
app.use(helmet()); // 보안 헤더
app.use(cors()); // 도메인 간 요청 허용
app.use(rateLimit()); // 요청 횟수 제한

// ✅ 미들웨어 연결
app.use(express.json()); // JSON 파싱

// ✅ 라우트 연결
app.use("/api/v1/videos", videoRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/trends", trendRoutes);

// ✅ 에러 처리
app.use(globalErrorHandler);

// ✅ 서버 시작
app.listen(3000);
```

### 2. **routes/** - 🛣️ 교통 정리소

```javascript
// 역할: URL 경로별로 요청을 적절한 핸들러에 전달

// videoRoutes.js - 영상 관련 API
GET    /api/v1/videos/search        → 영상 검색
GET    /api/v1/videos/trending      → 트렌드 영상
POST   /api/v1/videos/chat-search   → AI 대화형 검색 (새로 만들 예정!)
POST   /api/v1/videos/favorite      → 즐겨찾기 추가

// authRoutes.js - 인증 관련 API
POST   /api/v1/auth/login           → 로그인
POST   /api/v1/auth/register        → 회원가입
GET    /api/v1/auth/profile         → 프로필 조회
PUT    /api/v1/auth/profile         → 프로필 수정

// trendRoutes.js - 트렌드 관련 API
GET    /api/v1/trends/keywords      → 트렌드 키워드 조회
GET    /api/v1/trends/categories    → 카테고리별 트렌드
```

### 3. **middleware/** - 🔐 보안관

```javascript
// 역할: 요청을 처리하기 전에 검증/변환

// authMiddleware.js
const authMiddleware = {
  verifyToken: (req, res, next) => {
    // JWT 토큰 검증
    // 사용자 권한 확인
    // 요청 로깅
    next(); // 다음 단계로 진행
  },

  requirePremium: (req, res, next) => {
    // 프리미엄 유저만 접근 가능
    if (req.user.tier !== "premium") {
      return res.status(403).json({ error: "Premium required" });
    }
    next();
  },
};

// 사용법
router.get(
  "/premium-search",
  authMiddleware.verifyToken, // 먼저 로그인 확인
  authMiddleware.requirePremium, // 그다음 프리미엄 확인
  (req, res) => {
    // 실제 처리 로직
  }
);
```

### 4. **services/** - 🧠 두뇌

```javascript
// 역할: 실제 비즈니스 로직 처리

// supabaseService.js → 데이터베이스와 대화
class SupabaseService {
  async saveUser(userData) {
    // 사용자 데이터를 DB에 저장
  }

  async getVideos(query) {
    // 캐시된 영상 조회
  }

  async saveSearchResult(query, results) {
    // 검색 결과 캐싱
  }
}

// userAnalyticsService.js → 사용자 분석
class UserAnalyticsService {
  async analyzeUserBehavior(userId) {
    // 사용자 행동 패턴 분석
  }

  async getPersonalizedRecommendations(userId) {
    // 개인화 추천 생성
  }
}
```

### 5. **youtube-ai-services/** - 🤖 우리의 핵심!

```javascript
// 역할: YouTube AI 큐레이션의 핵심 로직

// search/ 모듈
- youtube-search-engine.js     → YouTube API 검색
- video-complete-filter.js     → 재생 가능 영상 필터링
- trend-specialized-filter.js  → 트렌드 특화 필터

// keywords/ 모듈
- natural-language-extractor.js → 자연어 감정 분석 (새로 만들 예정!)
- news-based-trend-refiner.js  → 트렌드 키워드 정제

// trends/ 모듈
- google-trends-collector.js   → Google 트렌드 수집

// llm/ 모듈
- claude-integration.js        → Claude AI 연동

// 이 모듈들을 조합해서 최종 결과 생성!
```

## 💾 데이터베이스 접근 방식

### **Supabase 연결 구조**

```javascript
// config/config.js에서 설정
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// services/supabaseService.js에서 사용
class SupabaseService {
  constructor() {
    this.supabase = supabase;
  }

  // 영상 데이터 저장
  async insertVideo(videoData) {
    const { data, error } = await this.supabase
      .from("videos") // 테이블명
      .insert(videoData) // 데이터 삽입
      .select(); // 결과 반환

    if (error) throw error;
    return data;
  }

  // 캐시된 검색 결과 조회
  async getCachedSearch(query) {
    const { data } = await this.supabase
      .from("search_cache")
      .select("*")
      .eq("query", query) // WHERE query = ?
      .gt("expires_at", new Date()) // WHERE expires_at > now()
      .order("created_at", { ascending: false })
      .limit(1);

    return data[0]; // 최신 캐시 결과
  }

  // 사용자 선호도 저장
  async saveUserPreference(userId, preferences) {
    const { data, error } = await this.supabase
      .from("user_preferences")
      .upsert({
        // 있으면 업데이트, 없으면 삽입
        user_id: userId,
        preferences: preferences,
        updated_at: new Date(),
      });

    return data;
  }
}
```

### **데이터베이스 테이블 구조**

```sql
-- 영상 캐시 테이블
videos (
  id uuid PRIMARY KEY,
  video_id varchar(20) UNIQUE,
  title text,
  channel_name varchar(255),
  thumbnail_url text,
  is_playable boolean,
  cached_at timestamp,
  expires_at timestamp
);

-- 검색 캐시 테이블
search_cache (
  id uuid PRIMARY KEY,
  query varchar(255),
  results jsonb,
  cached_at timestamp,
  expires_at timestamp
);

-- 사용자 선호도 테이블
user_preferences (
  user_id uuid PRIMARY KEY,
  preferences jsonb,
  created_at timestamp,
  updated_at timestamp
);

-- 사용자 감정 분석 기록
user_emotion_history (
  id uuid PRIMARY KEY,
  user_id uuid,
  detected_emotion varchar(50),
  input_text text,
  created_at timestamp
);
```

## 🎯 API 엔드포인트 완전 목록

### **현재 구현된 엔드포인트**

```javascript
// 영상 관련
GET  /api/v1/videos/search?q=키워드     → 기본 검색
GET  /api/v1/videos/trending           → 트렌드 영상

// 인증 관련
POST /api/v1/auth/login               → 로그인
POST /api/v1/auth/register            → 회원가입

// 시스템
GET  /health                          → 서버 상태 확인
```

### **새로 만들 엔드포인트**

```javascript
// AI 대화형 검색 (핵심!)
POST /api/v1/videos/chat-search       → 자연어 감정 분석 검색

// 개인화
GET  /api/v1/videos/recommendations   → 개인화 추천
POST /api/v1/videos/feedback          → 사용자 피드백

// 트렌드 확장
GET  /api/v1/trends/refined-keywords  → 정제된 트렌드 키워드
GET  /api/v1/trends/emotional-stats   → 감정별 통계

// 프리미엄 기능
POST /api/v1/premium/advanced-search  → 고급 검색
GET  /api/v1/premium/analytics        → 상세 분석
```

## 🚀 다음 단계 구현 순서

### **Phase 1: 핵심 AI 모듈 완성** (1-2주)

1. `natural-language-extractor.js` 구현
2. 기존 검색 모듈과 통합
3. 테스트 및 최적화

### **Phase 2: 새로운 API 엔드포인트** (1주)

1. `/api/v1/videos/chat-search` 구현
2. `/api/v1/videos/recommendations` 구현
3. 프리미엄 기능 엔드포인트 추가

### **Phase 3: 데이터베이스 확장** (1주)

1. 새로운 테이블 생성
2. 캐싱 로직 구현
3. 사용자 분석 데이터 수집

### **Phase 4: 통합 테스트 및 최적화** (1주)

1. 전체 시스템 통합 테스트
2. 성능 최적화
3. 에러 처리 강화

---

> **작성일**: 2024년 12월 13일  
> **다음 업데이트**: Phase 1 완료 후
