# 🚀 YouTube Shorts AI 큐레이션 서비스 개발 로드맵

## 📅 현재 상황 (2024.01.06)

✅ **Phase 1: 레거시 코드 정리 완료** → [완료 내역 보기](./COMPLETED_PHASES.md)

- 6개 파일 삭제 (2,260+ lines)
- 2개 파일 간소화 (평균 50% 감소)
- 서버 구조 개선 및 ES Module 변환
- 기본 인증 시스템 준비 완료

🎯 **다음 목표: Phase 2 - 데이터베이스 설계 및 구축**

---

## 🏗️ Phase 2: 데이터베이스 설계 및 구축 (예상 소요: 1-2일)

### Step 1: Supabase 프로젝트 설정

```bash
# 1. Supabase 대시보드에서 새 프로젝트 생성
# 2. 데이터베이스 URL과 API 키 확보
# 3. .env 파일 업데이트
```

### Step 2: 새로운 스키마 적용 (DB_docs/Part 1-3 기반)

**파일**: `backend/database/schema-mvp.sql`

```sql
-- 4개 핵심 테이블만 포함
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  display_name text,
  user_tier text DEFAULT 'free',
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE video_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text UNIQUE NOT NULL,
  title text,
  channel_name text,
  duration integer,
  thumbnail_url text,
  is_playable boolean DEFAULT true,
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  search_query text NOT NULL,
  search_type text DEFAULT 'basic',
  results_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE trending_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  category text,
  trend_score float DEFAULT 0,
  detected_at timestamptz DEFAULT now(),
  expires_at timestamptz
);
```

### Step 3: RLS 정책 설정

```sql
-- Row Level Security 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- 기본 정책들 설정
```

**체크리스트:**

- [ ] Supabase 프로젝트 생성
- [ ] schema-mvp.sql 작성 및 적용
- [ ] RLS 정책 설정
- [ ] 연결 테스트

---

## 🔧 Phase 3: 핵심 서비스 레이어 구축 (예상 소요: 2-3일)

### Step 1: 새로운 Database Service (DB_docs/Part 5 기반)

**파일**: `backend/services/databaseService.js`

```javascript
// 간소화된 데이터베이스 서비스
class DatabaseService {
  // 사용자 관리 (4개 함수)
  async getUserProfile(userId) {}
  async updateUserProfile(userId, data) {}

  // 영상 캐시 (3개 함수)
  async cacheVideo(videoData) {}
  async getCachedVideos(keyword) {}

  // 검색 로그 (2개 함수)
  async logSearch(userId, query) {}
  async getPopularKeywords() {}

  // 트렌드 관리 (2개 함수)
  async saveTrendingKeywords(keywords) {}
  async getTrendingKeywords() {}
}
```

### Step 2: YouTube API Service 개선

**파일**: `backend/services/youtubeService.js`

```javascript
// 2단계 필터링 워크플로우 구현
class YouTubeService {
  async searchPlayableShorts(keyword) {
    // 1단계: search.list (100 units)
    // 2단계: videos.list (7 units)
    // 3단계: 재생 가능 필터링
  }

  async handleQuotaManagement() {
    // 할당량 관리 로직
  }
}
```

### Step 3: LLM 분류 서비스 (기존 유지)

**파일**: `backend/services/llmService.js`

- 9개 카테고리 분류 유지
- Claude API 연동 개선

**체크리스트:**

- [ ] databaseService.js 작성
- [ ] youtubeService.js 개선
- [ ] llmService.js 연동
- [ ] test-lab에서 단위 테스트

---

## 🛣️ Phase 4: API 라우트 재구축 (예상 소요: 2일)

### Step 1: 인증 라우트 완성

**파일**: `backend/routes/authRoutes.js` (현재 400줄 → 300줄 목표)

```javascript
// 핵심 기능 완성도 향상
POST / api / v1 / auth / signup;
POST / api / v1 / auth / signin;
POST / api / v1 / auth / signout;
POST / api / v1 / auth / refresh;
GET / api / v1 / auth / me;
PUT / api / v1 / auth / profile;
```

### Step 2: 검색 라우트 개선

**파일**: `backend/routes/searchRoutes.js`

```javascript
// YouTube API 연동 개선
GET /api/v1/search/videos/:keyword
GET /api/v1/search/trending
POST /api/v1/search/advanced
```

### Step 3: 새로운 Analytics 라우트

**파일**: `backend/routes/analyticsRoutes.js` (새로 작성)

```javascript
// 간소화된 분석 기능
GET /api/v1/analytics/popular-keywords
GET /api/v1/analytics/user-stats/:userId
```

**체크리스트:**

- [ ] authRoutes.js 완성
- [ ] searchRoutes.js 개선
- [ ] analyticsRoutes.js 새로 작성
- [ ] API 테스트

---

## 🔐 Phase 5: 미들웨어 완성 (예상 소요: 1일)

### Step 1: 인증 미들웨어 완성

**파일**: `backend/middleware/authMiddleware.js` (현재 126줄 → 100줄 목표)

```javascript
// 핵심 기능 완성
- verifyToken() 완성
- optionalAuth() 완성
- 에러 처리 개선
```

### Step 2: 에러 처리 미들웨어

**파일**: `backend/middleware/errorHandler.js` (새로 작성)

```javascript
// 표준화된 에러 응답
- API 에러 통합 처리
- 클라이언트 친화적 메시지
- 로깅 통합
```

**체크리스트:**

- [ ] authMiddleware.js 완성
- [ ] errorHandler.js 작성
- [ ] 보안 헤더 설정

---

## 🎨 Phase 6: 프론트엔드 연동 (예상 소요: 3-4일)

### Step 1: Vanilla JS SPA 구조 완성

**폴더**: `frontend/src/`

- 컴포넌트 기반 구조
- Hash 라우팅
- Store 패턴 상태 관리

### Step 2: API 통신 레이어

**파일**: `frontend/src/core/apiClient.js`

```javascript
// Axios 기반 API 클라이언트
// 토큰 관리, 에러 처리
```

### Step 3: 핵심 페이지 구현

- 메인 검색 페이지
- 트렌드 키워드 페이지
- 사용자 인증 페이지

**체크리스트:**

- [ ] 컴포넌트 구조 완성
- [ ] API 통신 구현
- [ ] 핵심 페이지 구현
- [ ] 반응형 디자인

---

## 🚀 Phase 7: 배포 및 최적화 (예상 소요: 1-2일)

### Step 1: Railway 배포 준비

```bash
# 환경 변수 설정
# 빌드 스크립트 준비
# 도메인 연결
```

### Step 2: 성능 최적화

- 캐싱 전략 적용
- API 응답 시간 최적화
- 모바일 최적화

### Step 3: PWA 변환

- Service Worker
- 매니페스트 파일
- 오프라인 지원

**체크리스트:**

- [ ] Railway 배포
- [ ] 성능 최적화
- [ ] PWA 변환

---

## 🎯 최종 목표 (2주 내 완성)

**MVP 버전 기능**

1. ✅ 유튜브 숏츠 검색 및 필터링
2. ✅ LLM 기반 9개 카테고리 분류
3. ✅ 사용자 인증 및 개인화
4. ✅ 트렌드 키워드 제공
5. ✅ 반응형 웹 앱
6. ✅ PWA 지원

**성능 목표**

- API 응답 시간: < 500ms
- 캐시 적중률: > 85%
- YouTube API 사용량: < 8,000 units/day
- 모바일 호환성: 100%

---

## 📚 참고 문서

- [완료된 Phase 1](./COMPLETED_PHASES.md) - 정리 완료 내역
- [DB_docs/Part 1-7](./DB_docs/) - 데이터베이스 및 아키텍처 설계
- [백엔드 아키텍처 가이드](./BACKEND_ARCHITECTURE_GUIDE.md)
- [YouTube API 최적화 가이드](../docs/development/youtube-api-optimization.md)
- [프론트엔드 아키텍처](../frontend/README.md)

---

## ⚠️ 개발 주의사항

1. **점진적 개발**: 한 번에 하나씩, test-lab에서 검증 후 통합
2. **2단계 필터링**: 모든 YouTube 검색에 필수 적용
3. **할당량 관리**: 일일 10,000 units 엄격 관리
4. **에러 처리**: 모든 API에 적절한 fallback 구현

## 📞 막힐 때 체크사항

1. **DB_docs 재확인** - 스키마 설계 기준
2. **test-lab 단위 테스트** - 기능별 검증
3. **서버 로그 확인** - server.js 에러 추적
4. **API 응답 구조 검증** - 표준 형식 준수

---

**🚀 다음 단계: Phase 2 시작 준비!**

Git 커밋 후 DB_docs/Part 1-3을 기반으로 새로운 Supabase 스키마 설계를 시작합니다.
