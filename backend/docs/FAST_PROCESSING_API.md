# 🚀 빠른 처리 API 가이드

## 📋 API 개요

### 🎯 목적

- **개별 사용자 검색**: 빠른 응답 시간으로 사용자 경험 최적화
- **실시간 검색**: 즉시 결과 표시, 백그라운드 처리
- **다중 키워드**: 첫 번째 결과 우선 표시, 나머지 점진적 추가

### ⚡ 성능 최적화 기법

1. **LLM 배치 크기 확대**: 3개 → 30개 (10배 확대)
2. **동적 배치 조정**: 컨텍스트 한도에 맞춰 자동 조정
3. **백그라운드 처리**: 사용자 응답 후 나머지 키워드 처리
4. **품질 기준 유지**: 모든 처리에서 동일한 품질 기준 적용

---

## 🎯 API 엔드포인트

### 1️⃣ POST `/api/search/realtime`

**⚡ 실시간 키워드 검색 (빠른 처리)**

#### 요청

```javascript
POST /api/search/realtime
Content-Type: application/json

{
  "keyword": "먹방",
  "category": "먹방 & 요리",      // 선택사항
  "min_view_count": 10000,       // 선택사항, 기본: 10000
  "min_engagement_rate": 1.5,    // 선택사항, 기본: 1.5
  "target_count": 20,            // 선택사항, 기본: 20
  "max_pages": 3                 // 선택사항, 기본: 3
}
```

#### 응답

```javascript
{
  "success": true,
  "message": "실시간 검색 완료: \"먹방\"",
  "keyword": "먹방",
  "mode": "realtime",
  "keywordData": { /* 키워드 설정 */ },
  "duration": 15,  // 초
  "timestamp": "2025-01-27T10:30:00.000Z",
  "note": "✅ 빠른 배치 처리 (batchSize=25) - 품질 기준 유지"
}
```

#### 특징

- **대형 배치**: LLM 배치 크기 25개로 최적화
- **품질 기준**: 기본 품질 기준 유지 (min_view_count: 10000)
- **목표 응답 시간**: < 20초

---

### 2️⃣ POST `/api/search/quick`

**⚡ 빠른 키워드 검색 (기본 설정)**

#### 요청

```javascript
POST /api/search/quick
Content-Type: application/json

{
  "keyword": "ASMR",
  "category": "힐링"    // 선택사항
}
```

#### 응답

```javascript
{
  "success": true,
  "message": "빠른 검색 완료: \"ASMR\"",
  "keyword": "ASMR",
  "mode": "quick",
  "keywordData": {
    "min_view_count": 10000,    // 기본 품질 기준 유지
    "min_engagement_rate": 1.5, // 기본 품질 기준 유지
    "target_count": 20,         // 기본 목표 유지
    "max_pages": 3              // 기본 페이지 수 유지
  },
  "duration": 10,
  "timestamp": "2025-01-27T10:30:00.000Z",
  "note": "✅ 빠른 배치 처리 (batchSize=20) - 품질 기준 유지"
}
```

#### 특징

- **초고속 배치**: `batchSize=20`
- **품질 기준**: 기본 품질 기준 유지
- **목표 응답 시간**: < 15초

---

### 3️⃣ POST `/api/search/ultra-fast`

**🏆 최고속 단일 키워드 검색**

#### 요청

```javascript
POST /api/search/ultra-fast
Content-Type: application/json

{
  "keyword": "브이로그",
  "category": "라이프스타일"  // 선택사항
}
```

#### 응답

```javascript
{
  "success": true,
  "message": "최고속 검색 완료: \"브이로그\"",
  "keyword": "브이로그",
  "mode": "ultra_fast",
  "optimizations": {
    "llmBatchSize": 30,           // 최대 배치 크기로 빠른 처리
    "qualityStandard": "maintained", // 품질 기준 유지
    "channelUpdate": "included"   // 채널 정보 업데이트 포함
  },
  "keywordData": {
    "min_view_count": 10000,      // 기본 품질 기준 유지
    "min_engagement_rate": 1.5,   // 기본 품질 기준 유지
    "target_count": 20,           // 기본 목표 유지
    "max_pages": 3                // 기본 페이지 수 유지
  },
  "duration": 8,
  "speedRank": "🏆 ULTRA FAST",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

#### 특징

- **최대 배치 크기**: `batchSize=30`
- **품질 기준**: 기본 품질 기준 유지
- **목표 응답 시간**: < 10초

---

### 4️⃣ POST `/api/search/multi-keywords`

**🚀 다중 키워드 빠른 처리**

#### 요청

```javascript
POST /api/search/multi-keywords
Content-Type: application/json

{
  "keywords": ["먹방", "ASMR", "브이로그", "댄스"],
  "options": {
    "maxConcurrent": 3,      // 선택사항, 기본: 3 (동시 처리 개수)
    "batchSize": 25,         // 선택사항, 기본: 25 (배치 크기)
    "priority": "user_experience"  // 선택사항
  }
}
```

#### 응답

```javascript
{
  "success": true,
  "message": "다중 키워드 처리 시작: \"먹방\" 완료, 3개 백그라운드 처리 중",
  "sessionId": "1738062600000",
  "immediateResult": {
    "keyword": "먹방",
    "completed": true,
    "duration": 12
  },
  "backgroundProcessing": {
    "remaining": 3,
    "keywords": ["ASMR", "브이로그", "댄스"],
    "estimatedCompletion": "30-60초 내 완료 예상"
  },
  "strategy": {
    "mode": "user_experience_optimized",
    "firstKeywordImmediate": true,      // 첫 번째 키워드 즉시 처리
    "backgroundConcurrency": 3,         // 백그라운드 동시 처리 개수
    "batchOptimization": true           // 배치 크기 최적화 적용
  },
  "duration": 12,
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

#### 처리 전략

1. **첫 번째 키워드**: 즉시 처리하여 결과 반환
2. **나머지 키워드**: 응답 후 백그라운드에서 처리
3. **동시 처리 제한**: 서버 부하 방지 (기본 3개)
4. **배치 간 간격**: 2초 대기로 API 안정성 확보

---

## 📊 성능 비교표

| API 엔드포인트    | 배치 크기 | 품질 기준 | 예상 응답 시간   | 적용 시나리오    |
| ----------------- | --------- | --------- | ---------------- | ---------------- |
| `/realtime`       | 25개      | 유지      | < 20초           | 개별 사용자 검색 |
| `/quick`          | 20개      | 유지      | < 15초           | 빠른 검색        |
| `/ultra-fast`     | 30개      | 유지      | < 10초           | 최고속 검색      |
| `/multi-keywords` | 25개      | 유지      | < 15초 (첫 번째) | 다중 키워드      |

---

## 🛠️ 개발자 가이드

### 빠른 처리 옵션 설정

```javascript
// processSingleKeyword 직접 호출 시
const options = {
  batchSize: 25, // LLM 배치 크기 (3~30 사이 조정 가능)
};

await processSingleKeyword(keywordData, options);
```

### 컨텍스트 한도 자동 조정

```javascript
// 컨텍스트 사용량 예측 및 조정
const estimatedTokens = videosForTagging.length * 300; // 영상당 평균 300 토큰
if (estimatedTokens > 35000) {
  // 컨텍스트 한도의 87.5%
  optimalBatchSize = Math.max(
    3,
    Math.floor((35000 / 300 / videosForTagging.length) * optimalBatchSize)
  );
  console.log(
    `⚠️ 컨텍스트 한도 고려하여 배치 크기 조정: ${optimalBatchSize}개`
  );
}
```

### 프론트엔드 사용 예시

```javascript
// 실시간 검색 (개별 사용자)
async function searchRealtime(keyword) {
  const response = await fetch("/api/search/realtime", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });

  const result = await response.json();
  // 즉시 결과 표시
  displayVideos(result);
}

// 다중 키워드 검색
async function searchMultipleKeywords(keywords) {
  const response = await fetch("/api/search/multi-keywords", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords }),
  });

  const result = await response.json();

  // 첫 번째 키워드 결과 즉시 표시
  displayFirstResult(result.immediateResult);

  // 백그라운드 처리 안내
  showBackgroundStatus(result.backgroundProcessing);
}
```

---

## 🚨 주의사항

### 1. API 할당량 관리

- 큰 배치 크기로 API 호출 횟수는 감소하지만 단일 호출의 응답 시간이 길어짐
- 일일 할당량 모니터링 필수
- Claude API 컨텍스트 한도 고려 필요

### 2. 배치 크기 최적화

- 배치 크기가 클수록 빠르지만 메모리 사용량 증가
- 컨텍스트 한도 초과 시 자동으로 배치 크기 조정
- 사용자 피드백으로 최적 배치 크기 조정

### 3. 서버 부하

- 다중 키워드 검색 시 동시 처리 개수 제한
- 백그라운드 처리 시 배치 간격 유지
- 피크 시간대 사용량 조절

---

## 📈 성능 최적화 팁

### 1. 배치 크기 최적화

```javascript
// 컨텍스트와 성능의 균형점 찾기
const optimalBatchSizes = {
  individual_user: 25, // 개별 사용자
  bulk_processing: 3, // 대량 처리
  emergency: 30, // 긴급 처리
};
```

### 2. 캐싱 전략

```javascript
// 빠른 검색 결과 캐싱
const fastSearchCache = new Map();
const cacheKey = `fast:${keyword}`;
const cachedResult = fastSearchCache.get(cacheKey);

if (cachedResult && Date.now() - cachedResult.timestamp < 300000) {
  // 5분
  return cachedResult.data;
}
```

### 3. 점진적 품질 향상

```javascript
// 빠른 검색 → 품질 향상 파이프라인
async function progressiveSearch(keyword) {
  // 1단계: 빠른 검색으로 즉시 결과
  const quickResult = await searchQuick(keyword);
  displayResults(quickResult);

  // 2단계: 백그라운드에서 품질 향상
  setTimeout(async () => {
    const qualityResult = await searchWithQuality(keyword);
    mergeAndUpdateResults(qualityResult);
  }, 5000);
}
```

---

## 🧪 테스트 및 벤치마킹

### 성능 테스트 실행

```bash
# 빠른 처리 성능 테스트
node test-lab/test-fast-processing.js

# 배치 크기별 성능 비교
node test-lab/test-batch-sizes.js

# 다중 키워드 처리 테스트
node test-lab/test-multi-keywords.js
```

### 벤치마크 목표

- **실시간 검색**: < 20초
- **빠른 검색**: < 15초
- **최고속 검색**: < 10초
- **다중 키워드**: 첫 번째 < 15초, 나머지 백그라운드

---

이 API들을 통해 **사용자 경험을 크게 개선**하고, **대기 시간을 최소화**하며, **다양한 검색 시나리오**에 대응할 수 있습니다! 🚀
