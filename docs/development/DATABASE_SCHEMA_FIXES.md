# 🚨 데이터베이스 스키마 수정 필요사항

> **긴급 수정 필요**: `schema-final.sql`과 실제 코드 간 불일치 발견  
> **분석일**: 2025년 1월 3일  
> **분석자**: Wave Team

---

## 📋 발견된 문제점들

### 🔴 **1. 테이블명 불일치 (Critical)**

#### 문제: `search_logs` vs `search_sessions`

```javascript
// ❌ 문제: userAnalyticsService.js (4곳에서 사용)
.from('search_logs')        // Line 39, 86, 152, 177

// ✅ 실제 스키마: schema-final.sql
CREATE TABLE search_sessions (...)  // 'search_logs' 테이블은 존재하지 않음
```

**영향받는 파일:**

- `backend/services/userAnalyticsService.js` (4개 쿼리)

**해결방법:**

```javascript
// userAnalyticsService.js 수정
- .from('search_logs')
+ .from('search_sessions')
```

---

### 🔴 **2. 컬럼 누락 (Critical)**

#### 문제: `search_sessions` 테이블에 `user_tier` 컬럼 없음

```sql
-- ❌ 현재 스키마: search_sessions 테이블
CREATE TABLE search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100) NOT NULL,
  search_query TEXT,
  search_type VARCHAR(20) DEFAULT 'keyword',
  keywords_used TEXT[],
  results_count INTEGER DEFAULT 0,
  ai_method VARCHAR(50),
  response_time INTEGER,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- user_tier 컬럼이 없음! ❌
);
```

```javascript
// ❌ 하지만 코드에서는 user_tier를 사용
.select('search_query, user_tier, created_at')  // userAnalyticsService.js:87
.eq('user_tier', userTier)                      // userAnalyticsService.js:94

// ❌ 로그 저장 시에도 user_tier 시도
user_tier: metadata.userTier || 'free'          // userAnalyticsService.js:32
```

**해결방법 옵션:**

#### 🎯 **권장 해결방법 A: JOIN 사용 (정규화 유지)**

```javascript
// userAnalyticsService.js 수정 - user_profiles와 JOIN
let query = supabaseService.client
  .from("search_sessions")
  .select(
    `
    search_query, 
    created_at,
    user_profiles!inner(user_tier)
  `
  )
  .gte("created_at", timeFilter)
  .not("search_query", "is", null)
  .not("search_query", "eq", "");

// 사용자 티어 필터링
if (userTier !== "all") {
  query = query.eq("user_profiles.user_tier", userTier);
}
```

#### 🔧 **대안 해결방법 B: 컬럼 추가 (비정규화)**

```sql
-- schema-final.sql에 user_tier 컬럼 추가
ALTER TABLE search_sessions
ADD COLUMN user_tier VARCHAR(20) DEFAULT 'free'
CHECK (user_tier IN ('free', 'premium', 'pro'));

-- 인덱스 추가
CREATE INDEX idx_search_sessions_user_tier ON search_sessions(user_tier);
```

---

### 🟡 **3. 기타 확인된 불일치 (검토 필요)**

#### A. 컬럼명 확인 필요

```javascript
// authRoutes.js에서 사용
.from('search_sessions')
.select('id', { count: 'exact' })      // ✅ 존재
.eq('user_id', req.user.id)            // ✅ 존재
.gte('created_at', `${today}T00:00:00.000Z`)  // ✅ 존재
```

#### B. 모든 테이블 검증 결과

| 테이블명                 | 스키마 존재 | 코드 사용 | 상태                            |
| ------------------------ | ----------- | --------- | ------------------------------- |
| `user_profiles`          | ✅          | ✅        | 정상                            |
| `user_search_patterns`   | ✅          | ✅        | 정상                            |
| `cached_videos`          | ✅          | ✅        | 정상                            |
| `keyword_video_mappings` | ✅          | ✅        | 정상                            |
| `trending_keywords`      | ✅          | ✅        | 정상                            |
| `video_interactions`     | ✅          | ✅        | 정상                            |
| `search_sessions`        | ✅          | ❌        | **코드에서는 search_logs 사용** |
| `api_usage_logs`         | ✅          | ✅        | 정상                            |
| `search_logs`            | ❌          | ✅        | **스키마에 없음**               |

---

## 🛠️ 수정 작업 우선순위

### 🔥 **긴급 (즉시 수정)**

#### 1. userAnalyticsService.js 테이블명 수정

```bash
# 파일: backend/services/userAnalyticsService.js
# 변경: search_logs → search_sessions (4곳)
```

#### 2. user_tier 문제 해결

- **권장**: JOIN 방식으로 user_profiles와 연결
- **대안**: search_sessions에 user_tier 컬럼 추가

### 🟡 **중요 (이번 주 내)**

#### 3. 데이터베이스 마이그레이션 스크립트 작성

```sql
-- migration_fix_search_sessions.sql
-- 필요시 user_tier 컬럼 추가
ALTER TABLE search_sessions
ADD COLUMN user_tier VARCHAR(20) DEFAULT 'free';

-- 기존 데이터에 user_tier 업데이트 (JOIN으로)
UPDATE search_sessions
SET user_tier = up.user_tier
FROM user_profiles up
WHERE search_sessions.user_id = up.user_id;
```

#### 4. 검증 쿼리 실행

```sql
-- 모든 테이블 존재 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- search_sessions 테이블 구조 확인
\d search_sessions;

-- 데이터 샘플 확인
SELECT * FROM search_sessions LIMIT 5;
```

---

## 🔧 구체적 수정 방법

### 📝 **Step 1: userAnalyticsService.js 수정**

#### A. 테이블명 수정 (4곳)

```javascript
// Line 39, 86, 152, 177
- .from('search_logs')
+ .from('search_sessions')
```

#### B. user_tier 쿼리 수정 (JOIN 방식)

```javascript
// 기존 코드 (Line 85-95)
let query = supabaseService.client
  .from("search_logs") // ❌
  .select("search_query, user_tier, created_at") // ❌ user_tier 없음
  .gte("created_at", timeFilter)
  .not("search_query", "is", null)
  .not("search_query", "eq", "");

if (userTier !== "all") {
  query = query.eq("user_tier", userTier); // ❌
}

// 수정된 코드
let query = supabaseService.client
  .from("search_sessions") // ✅
  .select(
    `
    search_query, 
    created_at,
    user_profiles!inner(user_tier)
  `
  ) // ✅ JOIN으로 user_tier 조회
  .gte("created_at", timeFilter)
  .not("search_query", "is", null)
  .not("search_query", "eq", "");

if (userTier !== "all") {
  query = query.eq("user_profiles.user_tier", userTier); // ✅
}
```

#### C. 로그 저장 시 수정

```javascript
// logSearch 메서드 수정 (Line 30-40)
const searchLog = {
  user_id: userId,
  search_query: keyword,
  search_type: metadata.searchType || "basic",
  results_count: metadata.resultsCount || 0,
  response_time: metadata.responseTime || 0,
  // user_tier 제거 (user_profiles에서 JOIN으로 조회)
  session_id: `session_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`,
  user_agent: metadata.userAgent || "",
  ip_address: metadata.ipAddress || "0.0.0.0",
  created_at: new Date().toISOString(),
};

const { error } = await supabaseService.client
  .from("search_sessions") // ✅ 수정된 테이블명
  .insert([searchLog]);
```

---

### 📝 **Step 2: 스키마 업데이트 (선택사항)**

#### 만약 user_tier 컬럼을 추가하려면:

```sql
-- schema-final.sql에 추가
ALTER TABLE search_sessions
ADD COLUMN user_tier VARCHAR(20) DEFAULT 'free'
CHECK (user_tier IN ('free', 'premium', 'pro'));

-- 성능 인덱스 추가
CREATE INDEX idx_search_sessions_user_tier
ON search_sessions(user_tier, created_at DESC);

-- 복합 인덱스 추가
CREATE INDEX idx_search_sessions_user_analysis
ON search_sessions(user_tier, search_type, created_at DESC);
```

---

## 📊 수정 후 검증 체크리스트

### ✅ **코드 레벨 검증**

- [ ] userAnalyticsService.js의 모든 쿼리가 올바른 테이블명 사용
- [ ] user_tier 관련 쿼리가 올바르게 JOIN 또는 직접 컬럼 사용
- [ ] 모든 SELECT 쿼리가 존재하는 컬럼만 참조
- [ ] INSERT/UPDATE 쿼리가 올바른 컬럼명 사용

### ✅ **데이터베이스 레벨 검증**

- [ ] `search_sessions` 테이블이 존재함
- [ ] 모든 필요한 컬럼이 존재함
- [ ] 인덱스가 적절히 생성됨
- [ ] RLS 정책이 올바르게 적용됨

### ✅ **기능 레벨 검증**

- [ ] 인기 검색어 API가 정상 작동
- [ ] 사용자별 검색 패턴 분석이 정상 작동
- [ ] 실시간 트렌드 분석이 정상 작동
- [ ] 검색 로그 기록이 정상 작동

---

## 🚀 권장 수정 순서

### 1️⃣ **즉시 수정 (30분)**

```bash
# userAnalyticsService.js 수정
sed -i 's/search_logs/search_sessions/g' backend/services/userAnalyticsService.js
```

### 2️⃣ **user_tier 쿼리 수정 (1시간)**

- JOIN 방식으로 user_profiles와 연결
- 기존 로직 유지하면서 쿼리만 수정

### 3️⃣ **테스트 및 검증 (30분)**

- API 엔드포인트 테스트
- 데이터베이스 쿼리 실행 테스트
- 에러 로그 확인

### 4️⃣ **문서 업데이트 (15분)**

- DATABASE_IMPLEMENTATION_ANALYSIS.md 업데이트
- 수정 사항 기록

---

**🎯 결론**: 주요 문제는 `search_logs` → `search_sessions` 테이블명 불일치와 `user_tier` 컬럼 접근 방식입니다. JOIN 방식으로 해결하면 정규화를 유지하면서 모든 기능을 정상 작동시킬 수 있습니다.
