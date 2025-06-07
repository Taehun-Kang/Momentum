# 🌊 Momentum - YouTube Shorts AI 큐레이션 서비스

## 📊 프로젝트 진행 상황 (2024년 1월 기준)

### ✅ 백엔드 완료 (95%)

#### 🎬 YouTube API 서비스 ✅

- **2단계 필터링 시스템** - 재생 가능한 Shorts만 검색
- **할당량 최적화** - 일일 10,000 units 효율적 관리
- **캐싱 시스템** - 85% 적중률 목표, 4시간 TTL
- **API 엔드포인트**: 검색, 트렌딩, 카테고리별

#### 📊 Google Trends 서비스 ✅

- **SerpAPI 연동** - Google Trends 데이터만 수집
- **30분 캐싱** - 신뢰할 수 있는 트렌드 데이터
- **품질 분석** - 한국어 비율, 검색량 분석

#### 🔐 인증 시스템 ✅

- **Supabase Auth** - 이메일/비밀번호 인증
- **JWT 토큰 관리** - 보안 미들웨어 적용
- **사용자 프로필** - 선호도 관리

#### 🤖 MCP 통합 ✅

- **Claude API 연동** - 자연어 이해
- **AI 대화형 검색** - 키워드 추출 및 응답 생성
- **프리미엄 기능** - 개인화 추천

#### 🗄️ 데이터베이스 ✅

- **Supabase PostgreSQL** - 완전 설정
- **RLS 정책** - 사용자별 데이터 보안
- **캐시 테이블** - 영상 및 검색 결과 캐싱

### 🔄 현재 아키텍처

```
📱 Frontend (예정)
    ↓ REST API
🔥 Backend (Express.js) ✅
    ↓
📺 YouTube Data API v3 ✅
📊 Google Trends (SerpAPI) ✅
💾 Supabase (Database) ✅
🤖 Claude API (MCP) ✅
```

### 🎯 API 엔드포인트 (완료)

```bash
# 영상 검색
GET  /api/v1/videos/search?q=키워드
GET  /api/v1/videos/trending?regionCode=KR
GET  /api/v1/videos/categories/comedy
POST /api/v1/videos/ai-search

# 트렌드
GET  /api/v1/trends/realtime?region=KR
GET  /api/v1/trends/stats

# 인증
POST /api/v1/auth/signup
POST /api/v1/auth/signin

# 개인화
POST /api/v1/videos/personalized
```

### ❌ 제거된 기능들

- **SerpAPI YouTube 서비스** - 불안정하여 제거
- **n8n 워크플로우** - 복잡성으로 제거
- **다중 소스 트렌드** - Google Trends 단독 사용

### 🚧 남은 작업 (MVP 완성까지)

#### 1. 프론트엔드 개발 (5일 예상)

- [ ] **Vanilla JS SPA 구조** - Component 기반
- [ ] **라우팅 시스템** - Hash 기반
- [ ] **영상 카드 UI** - 썸네일, 제목, 채널
- [ ] **무한 스크롤** - 검색 결과 표시
- [ ] **AI 채팅 인터페이스** - 자연어 검색
- [ ] **반응형 디자인** - 모바일 최적화

#### 2. PWA 기능 (1일 예상)

- [ ] **Service Worker** - 오프라인 캐시
- [ ] **App Manifest** - 설치 가능한 앱
- [ ] **Push Notifications** - 트렌드 알림

#### 3. 배포 및 최적화 (2일 예상)

- [ ] **Railway 배포** - 백엔드 + 프론트엔드
- [ ] **도메인 연결** - HTTPS 설정
- [ ] **성능 최적화** - 번들 사이즈, 응답 시간
- [ ] **Google Play Store** - PWA 앱 등록

### 📈 성능 지표 (현재 달성)

- ✅ **YouTube API 할당량**: < 8,000 units/day 사용
- ✅ **캐시 적중률**: 85% 목표 달성
- ✅ **API 응답 시간**: < 500ms
- ✅ **재생 가능 영상 비율**: > 70%

### 🛠️ 기술 스택 (확정)

**백엔드**

- Node.js + Express.js
- Supabase (PostgreSQL)
- YouTube Data API v3
- SerpAPI (Google Trends만)
- Claude API (MCP)

**프론트엔드** (예정)

- Vanilla JavaScript (SPA)
- CSS Variables + 모듈화
- Webpack (번들링)
- Service Worker (PWA)

**배포**

- Railway (호스팅)
- Google Play Store (PWA)

### 🎯 MVP 완성 목표

**총 소요 기간**: 8일 (프론트엔드 5일 + PWA 1일 + 배포 2일)

**핵심 기능**:

1. YouTube Shorts 검색 및 표시
2. AI 기반 자연어 검색
3. 실시간 트렌드 키워드
4. 사용자 인증 및 개인화
5. PWA로 앱 설치 가능

### 📞 다음 단계

1. **프론트엔드 개발 시작** - Vanilla JS SPA 구조 설계
2. **컴포넌트 설계** - VideoCard, SearchBar, TrendingList
3. **상태 관리** - Store 패턴 구현
4. **UI/UX 디자인** - 모바일 퍼스트

---

## 🏗️ 개발 가이드

### 설치 및 실행

```bash
# 백엔드 실행
cd backend
npm install
npm start

# 프론트엔드 개발 서버 (예정)
cd frontend
npm install
npm run dev
```

### 환경 변수

```bash
# backend/.env
YOUTUBE_API_KEY=your_youtube_api_key
SERPAPI_KEY=your_serpapi_key
ANTHROPIC_API_KEY=your_claude_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 테스트

현재 `test-page.html`에서 모든 백엔드 API 테스트 가능

- 서버 상태 확인
- 영상 검색 (기본, 트렌딩, 카테고리)
- AI 자연어 검색
- 인증 시스템
- 실시간 트렌드

---

**Wave Team | Momentum Project | 2024**
