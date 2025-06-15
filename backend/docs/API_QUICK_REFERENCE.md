# ⚡ API 빠른 참조 가이드

**프론트엔드 개발자를 위한 핵심 API 요약**

---

## 🎯 프론트엔드 필수 API (37개)

### 🔐 인증 (5개) - **반드시 구현**

```javascript
POST / api / v1 / auth / signup; // 회원가입
POST / api / v1 / auth / signin; // 로그인
POST / api / v1 / auth / signout; // 로그아웃
GET / api / v1 / auth / me; // 사용자 정보
POST / api / v1 / auth / refresh; // 토큰 갱신
```

### 🤖 LLM 감성 분석 (3개) - **핵심 기능**

```javascript
POST / api / v1 / llm / analyze; // 감정 분석 (메인)
POST / api / v1 / llm / quick - keywords; // 빠른 키워드 추출
POST / api / v1 / llm / track - click; // 감성 문장 클릭 추적
```

### 📈 트렌드 영상 (3개) - **메인 콘텐츠**

```javascript
GET / api / v1 / trends / videos / quick; // 빠른 트렌드 영상
GET / api / v1 / trends / videos; // 전체 트렌드 영상
GET / api / v1 / trends / keywords; // 트렌드 키워드
```

### 🔍 실시간 검색 (1개) - **사용자 요청**

```javascript
POST / api / v1 / search / realtime; // 실시간 키워드 검색
```

### 👤 사용자 데이터 (10개) - **개인화**

```javascript
// 프로필 관리
GET  /api/v1/users_db/profiles/:userId     // 프로필 조회
PUT  /api/v1/users_db/profiles/:userId     // 프로필 업데이트

// 참여도 & 활동
POST /api/v1/users_db/engagement           // 참여도 업데이트
POST /api/v1/users_db/activity             // 활동 로그 기록
POST /api/v1/users_db/interactions         // 영상 상호작용 기록

// 개인화 선호도
GET  /api/v1/users_db/preferences/:userId  // 선호도 조회
POST /api/v1/users_db/preferences          // 선호도 저장
PUT  /api/v1/users_db/preferences/:userId  // 선호도 업데이트

// 개인화 추천
GET  /api/v1/users_db/recommendations/:userId // 개인화 추천
POST /api/v1/users_db/personalization/update  // 개인화 점수 업데이트
```

### 😊 감정 키워드 (6개) - **감정 기반 큐레이션**

```javascript
// 감정 기록
POST /api/v1/emotions_db/log                    // 감정 상태 기록
POST /api/v1/emotions_db/keyword-selection      // 키워드 선택 기록

// 감정별 키워드 조회
GET  /api/v1/emotions_db/keywords/:emotionState      // 감정별 인기 키워드
GET  /api/v1/emotions_db/keywords/top-ranking        // TOP 랭킹 키워드
GET  /api/v1/emotions_db/preferences/realtime       // 실시간 선호도

// 트렌딩 키워드
GET  /api/v1/trends_db/keywords/trending            // 트렌딩 키워드
GET  /api/v1/trends_db/keywords/rising              // 급상승 키워드
```

### 📺 영상 데이터 (3개) - **콘텐츠 조회**

```javascript
GET /api/v1/videos_db/popular              // 인기 영상
GET /api/v1/videos_db/category/:category   // 카테고리별 영상
GET /api/v1/videos_db/cache/:videoId       // 영상 캐시 조회
```

### 🔍 검색 데이터 (3개) - **검색 기능**

```javascript
POST /api/v1/search_db/user-search                  // 검색 로그 저장
GET  /api/v1/search_db/user-search/history/:userId  // 검색 히스토리
GET  /api/v1/search_db/popular-terms                // 인기 검색어
```

---

## 🚀 사용자 여정별 API 플로우

### 1️⃣ 회원가입/로그인

```javascript
// 회원가입
const signupResult = await fetch("/api/v1/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, name }),
});

// 로그인
const signinResult = await fetch("/api/v1/auth/signin", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

// 사용자 정보 조회
const userInfo = await fetch("/api/v1/auth/me", {
  headers: { Authorization: `Bearer ${token}` },
});
```

### 2️⃣ 감정 분석 → 키워드 선택

```javascript
// 1. 감정 분석
const emotionResult = await fetch("/api/v1/llm/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userInput: "퇴근하고 와서 피곤해",
    userId: userId,
    responseFormat: "full",
  }),
});

// 2. 감정 기록
await fetch("/api/v1/emotions_db/log", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    userId: userId,
    emotionState: "피곤함",
    emotionIntensity: 7,
    context: "퇴근 후",
  }),
});

// 3. 감성 문장 클릭 추적
await fetch("/api/v1/llm/track-click", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    curationId: emotionResult.data.curations[0].id,
    userId: userId,
  }),
});

// 4. 키워드 선택 기록
await fetch("/api/v1/emotions_db/keyword-selection", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    userId: userId,
    emotionState: "피곤함",
    selectedKeywords: ["힐링", "ASMR"],
    selectionContext: "감성 문장 클릭",
  }),
});
```

### 3️⃣ 영상 조회 → 상호작용 기록

```javascript
// 1. 트렌드 영상 조회 (빠른 버전)
const trendVideos = await fetch("/api/v1/trends/videos/quick?limit=20");

// 2. 감정별 키워드 기반 영상 조회
const emotionKeywords = await fetch(
  "/api/v1/emotions_db/keywords/피곤함?limit=10"
);

// 3. 실시간 검색 (필요시)
const realtimeSearch = await fetch("/api/v1/search/realtime", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    keyword: "힐링 ASMR",
    userId: userId,
    searchType: "emotion_based",
  }),
});

// 4. 영상 상호작용 기록
await fetch("/api/v1/users_db/interactions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    userId: userId,
    videoId: "selected_video_id",
    interactionType: "view", // view, like, share, save
    watchTime: 45,
    emotion: "피곤함",
    keywords: ["힐링", "ASMR"],
  }),
});
```

### 4️⃣ 개인화 업데이트

```javascript
// 1. 선호도 업데이트
await fetch(`/api/v1/users_db/preferences/${userId}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    preferredCategories: ["ASMR & 힐링", "음악 & 엔터테인먼트"],
    preferredKeywords: ["힐링", "ASMR", "잔잔한"],
    watchTimePreferences: { 저녁: ["힐링"], 아침: ["신남"] },
  }),
});

// 2. 참여도 업데이트
await fetch("/api/v1/users_db/engagement", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    userId: userId,
    engagementType: "video_interaction",
    videosWatched: 1,
    totalWatchTime: 45,
    sessionDuration: 300,
  }),
});

// 3. 개인화 점수 업데이트
await fetch("/api/v1/users_db/personalization/update", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    userId: userId,
    interactionData: {
      emotionAccuracy: 0.9,
      keywordRelevance: 0.8,
      engagementLevel: 0.7,
    },
  }),
});
```

---

## 📱 페이지별 필요 API

### 🏠 홈페이지

```javascript
// 트렌드 영상 (메인 콘텐츠)
GET /api/v1/trends/videos/quick?limit=10

// 인기 검색어 (상단 표시)
GET /api/v1/search_db/popular-terms?limit=5

// 사용자 맞춤 추천 (로그인 시)
GET /api/v1/users_db/recommendations/${userId}
```

### 🤖 감정 분석 페이지

```javascript
// 감정 분석
POST / api / v1 / llm / analyze;

// 감정 기록
POST / api / v1 / emotions_db / log;

// 키워드 선택 기록
POST / api / v1 / emotions_db / keyword - selection;
```

### 🔍 검색 결과 페이지

```javascript
// 실시간 검색
POST /api/v1/search/realtime

// 검색 로그 저장
POST /api/v1/search_db/user-search

// 검색 피드백 (옵션)
PUT /api/v1/search_db/feedback/${searchId}
```

### 📊 사용자 대시보드

```javascript
// 사용자 프로필
GET /api/v1/users_db/profiles/${userId}

// 검색 히스토리
GET /api/v1/search_db/user-search/history/${userId}

// 감정 히스토리
GET /api/v1/emotions_db/users/${userId}/history

// 상호작용 히스토리
GET /api/v1/users_db/interactions/${userId}
```

---

## 🛡️ 인증 처리

### JWT 토큰 관리

```javascript
// 토큰 저장
localStorage.setItem("access_token", result.data.session.access_token);
localStorage.setItem("refresh_token", result.data.session.refresh_token);

// API 호출 시 헤더 추가
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
};

// 토큰 만료 시 자동 갱신
const refreshToken = async () => {
  const response = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: localStorage.getItem("refresh_token"),
    }),
  });

  if (response.ok) {
    const result = await response.json();
    localStorage.setItem("access_token", result.data.session.access_token);
    return result.data.session.access_token;
  }

  // 리프레시 실패 시 로그아웃
  window.location.href = "/login";
};
```

### 인증이 필요한 API vs 공개 API

```javascript
// 🔐 인증 필수 APIs
- /api/v1/users_db/*     (모든 사용자 데이터)
- /api/v1/emotions_db/*  (감정/키워드 선택 기록)
- POST /api/v1/search_db/user-search

// 🌐 공개 APIs (인증 불필요)
- /api/v1/trends/*       (트렌드 영상/키워드)
- /api/v1/llm/*          (감정 분석 - 게스트도 가능)
- GET /api/v1/search_db/popular-terms
- GET /api/v1/videos_db/popular
```

---

## ⚡ 성능 최적화

### 빠른 응답 API 우선 사용

```javascript
// ✅ 1초 이내 응답
GET /api/v1/trends/videos/quick
GET /api/v1/search_db/popular-terms
GET /api/v1/videos_db/cache/:videoId

// ⚠️ 2-3초 소요 (로딩 표시 권장)
POST /api/v1/llm/analyze
POST /api/v1/search/realtime
GET /api/v1/trends/videos
```

### 캐시 전략

```javascript
// 클라이언트 캐시 (localStorage)
- 사용자 선호도: 30분
- 인기 검색어: 10분
- 트렌드 키워드: 20분

// API 호출 최적화
- 트렌드 영상: /videos/quick 우선, 필요시 /videos
- 검색: 인기 검색어 먼저 표시, 실시간 검색은 필요시만
- 개인화: 백그라운드에서 업데이트
```

---

## 📞 주요 응답 형식

### 성공 응답

```javascript
{
  "success": true,
  "message": "요청 처리 완료",
  "data": { /* 실제 데이터 */ },
  "timestamp": "2025-01-27T..."
}
```

### 에러 응답

```javascript
{
  "success": false,
  "error": "QUOTA_EXCEEDED",
  "message": "API 할당량이 초과되었습니다",
  "timestamp": "2025-01-27T..."
}
```

### 일반적인 에러 코드

```javascript
400: MISSING_FIELDS, INVALID_INPUT
401: UNAUTHORIZED, TOKEN_EXPIRED
403: FORBIDDEN, INSUFFICIENT_PERMISSIONS
429: QUOTA_EXCEEDED, RATE_LIMITED
500: INTERNAL_ERROR, SERVICE_UNAVAILABLE
```

---

**개발 우선순위**: 인증 → 감정분석 → 트렌드영상 → 개인화 → 검색기능  
**문서 버전**: 1.0.0  
**마지막 업데이트**: 2025-01-27
