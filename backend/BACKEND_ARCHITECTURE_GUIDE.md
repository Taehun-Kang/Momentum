# 🏗️ Backend 아키텍처 가이드

> **YouTube Shorts AI 큐레이션 서비스 백엔드 구조 완전 가이드**  
> **초보자도 이해할 수 있는 백엔드 작동 원리 설명**

## 🎯 백엔드란? (간단 설명)

백엔드는 **식당의 주방**과 같습니다:

- **프론트엔드**: 고객이 앉아서 메뉴를 보는 홀
- **백엔드**: 요리사가 음식을 만드는 주방
- **데이터베이스**: 재료를 보관하는 창고

```
고객(사용자) → 주문(요청) → 주방(백엔드) → 요리(처리) → 음식(응답) → 고객
```

## 🔄 백엔드 작동 흐름 (단계별 상세 설명)

### 1️⃣ **사용자가 버튼을 클릭한다**

```javascript
// 프론트엔드에서 검색 버튼 클릭
사용자: "먹방 영상 보여줘!" 버튼 클릭
```

### 2️⃣ **프론트엔드가 백엔드에게 요청한다**

```javascript
// HTTP 요청 전송
fetch("http://localhost:3002/api/v1/search/realtime", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // 로그인한 경우만
  },
  body: JSON.stringify({
    keyword: "먹방",
    category: "먹방 & 요리",
  }),
});
```

### 3️⃣ **server.js가 요청을 받는다 (대문 역할)**

```javascript
// server.js - 모든 요청이 여기로 들어옴
app.listen(3002, () => {
  console.log('🚀 서버가 3002번 포트에서 시작됨');
});

// 요청이 들어오면...
1. helmet() → 보안 헤더 추가 (모자 쓰기)
2. cors() → 다른 도메인 접근 허용 (출입 허가)
3. rateLimit() → 너무 많은 요청 차단 (줄 서기)
4. express.json() → JSON 데이터 읽기 (번역기)
```

### 4️⃣ **라우터가 길을 찾는다 (교통 정리)**

```javascript
// routes/index.js - 어디로 갈지 결정
app.use('/api/v1/search', searchRoutes);  // 검색 관련은 searchRoutes로
app.use('/api/v1/auth', authRoutes);      // 로그인 관련은 authRoutes로
app.use('/api/v1/llm', llmRoutes);        // AI 관련은 llmRoutes로

// URL 분석
'/api/v1/search/realtime' → searchRoutes.js로 이동!
```

### 5️⃣ **미들웨어가 검문한다 (보안 검색대)**

```javascript
// 인증이 필요한 경우
router.post('/realtime', verifyToken, async (req, res) => {
  // verifyToken이 먼저 실행됨:

  1. 토큰 확인: "이 사람이 로그인했나?"
  2. 사용자 정보 추출: "이 사람 정보는?"
  3. req.user에 사용자 정보 저장
  4. next() 호출로 다음 단계 진행
});

// 인증이 필요없는 경우
router.get('/health', async (req, res) => {
  // 바로 실행됨 (미들웨어 없음)
});
```

### 6️⃣ **실제 일꾼들이 일한다 (핵심 로직)**

```javascript
// searchRoutes.js - "먹방" 검색 처리
router.post("/realtime", async (req, res) => {
  console.log("🔍 실시간 검색 시작:", req.body.keyword);

  // 1. youtube-ai-services 모듈들이 차례로 실행
  const keyword = req.body.keyword; // '먹방'

  // 2. YouTube API로 영상 검색
  const rawVideos = await youtube.search("먹방");

  // 3. 재생 불가능한 영상 필터링
  const playableVideos = await filterPlayableVideos(rawVideos);

  // 4. AI로 카테고리 분류
  const categorizedVideos = await classifyWithAI(playableVideos);

  // 5. 결과 반환
  res.json({
    success: true,
    data: categorizedVideos,
  });
});
```

### 7️⃣ **데이터베이스와 대화한다 (창고 관리)**

```javascript
// 실제로는 이런 일들이 일어남:

// 1. 캐시 확인
"혹시 '먹방' 검색 결과가 이미 있나?"
→ 있으면 바로 반환 (빠름!)
→ 없으면 새로 검색

// 2. 새 결과 저장
"이번에 찾은 '먹방' 영상들을 저장해두자"
→ 다음에 더 빨리 응답 가능

// 3. 사용자 로그 저장
"홍길동님이 '먹방'을 검색했다"
→ 나중에 개인화 추천에 활용
```

### 8️⃣ **응답을 만들어서 보낸다**

```javascript
// 최종 응답 생성
res.json({
  success: true,
  message: "먹방 영상 검색 완료",
  data: {
    videos: [
      {
        videoId: "abc123",
        title: "대왕 먹방 도전!",
        channelName: "먹방왕",
        thumbnailUrl: "https://...",
        category: "먹방 & 요리",
      },
      // ... 더 많은 영상들
    ],
    total: 25,
    cached: false,
  },
  timestamp: "2024-12-13T12:30:45.000Z",
});
```

### 9️⃣ **프론트엔드가 받아서 화면에 표시**

```javascript
// 프론트엔드에서 응답 처리
fetch("/api/v1/search/realtime")
  .then((response) => response.json())
  .then((data) => {
    if (data.success) {
      // 화면에 영상들 표시
      data.data.videos.forEach((video) => {
        displayVideo(video);
      });
    }
  });
```

## 🔐 인증 시스템 적용 전략

### **현재 상황 분석**

| 라우트           | 현재 상태          | 인증 필요 여부     | 이유                                 |
| ---------------- | ------------------ | ------------------ | ------------------------------------ |
| **authRoutes**   | ✅ **인증 적용됨** | 필수               | 로그인/회원가입/프로필               |
| **searchRoutes** | ❌ **공개 API**    | **부분 적용 필요** | 기본 검색은 공개, 고급 기능은 인증   |
| **llmRoutes**    | ❌ **공개 API**    | **인증 필요**      | AI 분석은 비용이 많이 듦             |
| **trendRoutes**  | ❌ **공개 API**    | **선택적**         | 기본 트렌드는 공개, 상세 분석은 인증 |

### **인증 적용 계획**

#### 1️⃣ **searchRoutes 개선**

```javascript
// routes/searchRoutes.js

// ✅ 공개 API (로그인 없이도 사용 가능)
router.get("/health", async (req, res) => {
  // 서버 상태 체크 - 누구나 접근 가능
});

// ✅ 선택적 인증 (로그인하면 더 좋음)
router.post("/realtime", optionalAuth, async (req, res) => {
  if (req.user) {
    // 로그인한 유저: 개인화된 결과 + 검색 기록 저장
    console.log(`👤 ${req.user.email}님의 검색:`, req.body.keyword);

    // 사용자 선호도 반영
    const personalizedResults = await addPersonalization(results, req.user.id);

    // 검색 기록 저장
    await saveSearchHistory(req.user.id, req.body.keyword);

    return res.json({ data: personalizedResults, personalized: true });
  } else {
    // 비로그인 유저: 기본 검색 결과만
    console.log(`🕵️ 익명 사용자 검색:`, req.body.keyword);

    return res.json({ data: basicResults, personalized: false });
  }
});

// ❌ 로그인 필수 (프리미엄 기능)
router.post("/batch-keywords", verifyToken, async (req, res) => {
  // 여러 키워드 동시 처리 - 로그인 필수
  if (req.user.tier !== "premium") {
    return res.status(403).json({
      error: "프리미엄 회원만 사용 가능한 기능입니다",
    });
  }

  // 배치 처리 로직...
});
```

#### 2️⃣ **llmRoutes 인증 추가**

```javascript
// routes/llmRoutes.js

// ❌ 로그인 필수 (AI 분석은 비용이 많이 듦)
router.post("/analyze-sentiment", verifyToken, async (req, res) => {
  // Claude AI 감정 분석 - 로그인 필수
  console.log(`🤖 ${req.user.email}님의 AI 분석 요청`);

  // API 사용량 체크
  const usageCount = await checkUserAPIUsage(req.user.id);
  if (usageCount > 100) {
    // 일일 100회 제한
    return res.status(429).json({
      error: "일일 AI 분석 한도를 초과했습니다",
    });
  }

  // AI 분석 실행...
});

// ✅ 공개 API (단순 정보 조회)
router.get("/categories", async (req, res) => {
  // 9개 고정 카테고리 조회 - 누구나 접근 가능
});
```

#### 3️⃣ **trendRoutes 선택적 적용**

```javascript
// routes/trendRoutes.js

// ✅ 공개 API (기본 트렌드)
router.get("/keywords", async (req, res) => {
  // 인기 키워드 TOP 10 - 누구나 접근 가능
});

// ❌ 로그인 필요 (상세 분석)
router.get("/detailed-analysis", verifyToken, async (req, res) => {
  // 상세 트렌드 분석 - 로그인 필수
});
```

### **인증 레벨 정의**

```javascript
// 인증 레벨 구분
const AuthLevel = {
  PUBLIC: "공개", // 누구나 접근 가능
  OPTIONAL: "선택적", // 로그인하면 더 좋음
  REQUIRED: "필수", // 반드시 로그인
  PREMIUM: "프리미엄", // 유료 사용자만
  ADMIN: "관리자", // 관리자만
};

// 실제 적용
router.post(
  "/search",
  optionalAuth, // 선택적 인증
  rateLimitByUser, // 사용자별 요청 제한
  async (req, res) => {
    // 로직...
  }
);

router.post(
  "/premium-search",
  verifyToken, // 로그인 확인
  requirePremium, // 프리미엄 확인
  async (req, res) => {
    // 프리미엄 전용 로직...
  }
);
```

## 📊 실제 요청 처리 예시

### **시나리오 1: 비로그인 사용자 검색**

```
1. 사용자: "먹방" 검색 버튼 클릭
2. 프론트엔드: Authorization 헤더 없이 요청
3. server.js: 기본 보안 처리
4. searchRoutes: optionalAuth → req.user = null
5. 검색 로직: 기본 결과만 반환
6. 응답: { personalized: false, data: [...] }
```

### **시나리오 2: 로그인 사용자 검색**

```
1. 사용자: "먹방" 검색 버튼 클릭
2. 프론트엔드: Authorization 헤더 포함하여 요청
3. server.js: 기본 보안 처리
4. searchRoutes: optionalAuth → req.user = { id, email, ... }
5. 검색 로직: 개인화 + 기록 저장
6. 응답: { personalized: true, data: [...] }
```

### **시나리오 3: 프리미엄 기능 접근**

```
1. 사용자: "배치 검색" 버튼 클릭
2. 프론트엔드: Authorization 헤더 포함하여 요청
3. server.js: 기본 보안 처리
4. searchRoutes: verifyToken → 로그인 확인
5. requirePremium → 프리미엄 회원 확인
6. 검색 로직: 고급 기능 실행
7. 응답: { premium: true, data: [...] }
```

## 🚀 다음 단계 구현 계획

### **Phase 1: 현재 라우트 인증 적용** (3-4일)

1. ✅ authRoutes 완료됨
2. 🔄 searchRoutes에 optionalAuth 추가
3. 🔄 llmRoutes에 verifyToken 추가
4. 🔄 trendRoutes 선택적 적용

### **Phase 2: 프리미엄 기능 구현** (1주)

1. requirePremium 미들웨어 추가
2. 사용량 제한 로직 구현
3. 개인화 기능 강화

### **Phase 3: 모니터링 및 최적화** (1주)

1. API 사용량 추적
2. 성능 모니터링
3. 보안 강화

## 📁 백엔드 폴더 구조

```
backend/
├── server.js               # 🚀 서버 진입점 (모든 요청이 시작되는 곳)
├── config/                 # ⚙️ 설정 파일들
├── routes/                 # 🛣️ API 엔드포인트 정의
│   ├── index.js           #     라우트 통합 관리
│   ├── searchRoutes.js    #     검색 관련 API (optionalAuth 적용 예정)
│   ├── authRoutes.js      #     인증 관련 API (✅ 완료)
│   ├── llmRoutes.js       #     AI 분석 API (verifyToken 적용 예정)
│   └── trendRoutes.js     #     트렌드 API (선택적 적용 예정)
├── middleware/             # 🔐 요청 전처리
│   └── authMiddleware.js  #     인증 확인 (verifyToken, optionalAuth)
├── services/               # 🧠 비즈니스 로직 (현재 없음)
└── youtube-ai-services/    # 🤖 핵심 AI 모듈들
    ├── search/            #     영상 검색 엔진
    ├── keywords/          #     키워드 처리
    ├── trends/            #     트렌드 분석
    └── llm/               #     AI 언어모델
```

---

> **작성일**: 2024년 12월 13일  
> **업데이트**: Phase 1 인증 적용 계획 추가  
> **다음 업데이트**: 인증 시스템 적용 완료 후
