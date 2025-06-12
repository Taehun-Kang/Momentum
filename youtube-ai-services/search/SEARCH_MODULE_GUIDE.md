# 🔍 YouTube 검색 및 데이터 수집 시스템 (Search Collection System)

YouTube Shorts AI 큐레이션을 위한 **데이터 수집 및 정제 시스템**입니다.  
쿼리를 받아 YouTube API를 통해 영상을 수집하고, 2단계 필터링으로 재생 가능한 고품질 Shorts만 엄선합니다.

## 🎯 핵심 역할

### **NOT 쿼리 생성** ❌

- 쿼리 생성은 `llm/modules/youtube-query-builder.js`에서 담당
- 이미 생성된 쿼리를 받아서 실행하는 역할

### **YES 데이터 수집 & 정제** ✅

- YouTube API 호출 및 데이터 수집
- 2단계 필터링으로 재생 가능한 Shorts 선별
- 페이지네이션을 통한 충분한 결과 확보 (40개 목표)
- 최종 영상 리스트 정제 및 반환

## 📁 새로운 모듈 구조

```
search/
├── SEARCH_MODULE_GUIDE.md           📋 이 문서
├── index.js                         🎯 통합 인터페이스 (390줄)
└── modules/
    ├── youtube-search-engine.js     🎬 YouTube API 호출 엔진 (470줄)
    ├── video-complete-filter.js     📊 통합 필터링 시스템 (360줄)
    └── pagination-handler.js        📄 스마트 페이지네이션 (330줄)
```

## 🎬 모듈별 상세 기능

### **1. youtube-search-engine.js** (검색 엔진)

```javascript
import YouTubeSearchEngine from "./modules/youtube-search-engine.js";

const engine = new YouTubeSearchEngine(API_KEY);

// 기본 검색
const result = await engine.searchVideos("먹방", {
  maxResults: 50,
  order: "relevance",
});

// 다중 페이지 검색
const multiResult = await engine.searchMultiplePages("먹방", {
  maxPages: 3,
  targetVideoCount: 40,
});

// 고급 검색 (여러 쿼리)
const advancedResult = await engine.advancedSearch(
  ["먹방", "음식 리뷰", "맛집"],
  { maxResultsPerQuery: 20 }
);
```

**핵심 기능**:

- ✅ **2단계 필터링의 1단계**: search.list API 호출
- ✅ **스마트 페이지네이션**: 30개 미만 시 자동 다음 페이지
- ✅ **정확한 API 사용량 계산**: search.list = 100 units
- ✅ **고급 쿼리 생성**: OR 연산자 활용
- ✅ **에러 처리**: 할당량 초과, 네트워크 오류 대응

### **2. video-complete-filter.js** (통합 필터링)

```javascript
import VideoCompleteFilter from "./modules/video-complete-filter.js";

const filter = new VideoCompleteFilter(API_KEY);

// 통합 필터링 (재생가능성 + 품질)
const result = await filter.filterAndAnalyzeVideos(videoIds, {
  minDuration: 5, // 최소 5초
  maxDuration: 60, // 최대 60초 (Shorts)
  minViewCount: 1000, // 최소 조회수
  minLikeCount: 10, // 최소 좋아요
  minEngagementRate: 0.01, // 최소 참여도 1%
  sortBy: "engagement", // 참여도순 정렬
  maxResults: 40, // 최대 결과 수
});
```

**핵심 기능**:

- ✅ **2단계 필터링의 2단계**: videos.list API 호출 (9 units per 50 videos)
- ✅ **재생 가능성 확인**: embeddable, privacy, region blocking
- ✅ **품질 기반 필터링**: 조회수, 좋아요, 참여도
- ✅ **배치 처리**: 50개씩 API 최적화
- ✅ **중복 제거 및 정렬**: 여러 정렬 기준 지원

### **3. pagination-handler.js** (페이지네이션)

```javascript
import PaginationHandler from "./modules/pagination-handler.js";

const handler = new PaginationHandler(searchEngine, videoFilter);

// 스마트 페이지네이션 (40개 목표)
const result = await handler.executeSmartPagination("먹방", {
  targetResults: 40, // 목표 결과 수
  maxPages: 5, // 최대 페이지 수
  minSuccessRate: 0.3, // 최소 성공률 30%
  maxAPIUnits: 500, // 최대 API 사용량
  earlyStopThreshold: 0.8, // 조기 중단 80%
});

// 적응형 페이지네이션 (성공률 기반 전략 조정)
const adaptiveResult = await handler.executeAdaptivePagination("먹방", {
  targetResults: 40,
});
```

**핵심 기능**:

- ✅ **40개 목표 달성**: 효율적인 API 사용
- ✅ **조기 중단 조건**: 목표 달성, 성공률 저조, API 한도 등
- ✅ **적응형 전략**: 첫 페이지 성공률 기반 전략 조정
- ✅ **동적 기준 완화**: 낮은 성공률 시 필터링 기준 자동 완화

## 🎯 통합 인터페이스 (index.js)

### **간단한 사용법**

```javascript
import {
  searchYouTubeShorts,
  quickSearch,
  highQualitySearch,
} from "./search/index.js";

// 🎯 메인 검색 (모든 기능 통합)
const result = await searchYouTubeShorts("먹방", {
  targetResults: 40,
  useAdaptivePagination: true,
  useCache: true,
});

// 🔍 빠른 검색 (간단한 옵션)
const quickResult = await quickSearch("먹방", 20);

// 📊 고품질 검색 (엄격한 기준)
const qualityResult = await highQualitySearch("먹방", 40);
```

### **고급 사용법**

```javascript
import {
  bulkSearch,
  getSystemStats,
  validateSearchSystem,
} from "./search/index.js";

// ⚡ 대량 검색 (여러 키워드)
const bulkResult = await bulkSearch(["먹방", "브이로그", "댄스"], {
  targetResults: 20,
  maxConcurrent: 3,
});

// 📊 시스템 통계 조회
const stats = getSystemStats();
console.log(`캐시 적중률: ${stats.cacheHitRate}`);
console.log(`효율성: ${stats.efficiency}`);

// 🛠️ 시스템 검증
const validation = await validateSearchSystem();
console.log(validation.message);
```

## 📊 API 사용량 및 성능

### **정확한 API 비용 계산**

```javascript
// 1회 완전한 검색 비용 (40개 목표)
const apiCosts = {
  search: {
    pages: 3, // 평균 3페이지
    unitsPerPage: 100, // search.list
    totalSearchUnits: 300, // 3 × 100
  },

  videos: {
    videosFound: 150, // 3페이지에서 발견된 총 영상
    batchSize: 50, // 배치 크기
    batches: 3, // 150 ÷ 50 = 3 배치
    unitsPerBatch: 9, // 1 + (4 parts × 2)
    totalVideoUnits: 27, // 3 × 9
  },

  total: 327, // 300 + 27
  efficiency: "40 videos / 327 units = 12.2 videos per 100 units",
};
```

### **성능 목표**

- **목표 달성률**: > 90% (40개 중 36개 이상)
- **필터링 성공률**: > 70% (수집된 영상 중 통과률)
- **캐시 적중률**: > 85% (동일 쿼리 재검색 시)
- **응답 시간**: < 3초 (캐시 미스 시)
- **API 효율성**: > 10 videos per 100 units

## 🔄 워크플로우

### **1. 표준 검색 워크플로우**

```
1. 쿼리 수신 → "먹방"
2. 캐시 확인 → 미스 발생
3. search.list 호출 → 50개 영상 ID 수집 (100 units)
4. videos.list 호출 → 상세 정보 조회 (9 units)
5. 재생가능성 확인 → 35개 통과
6. 품질 필터링 → 28개 통과
7. 결과 부족 판단 → 다음 페이지 진행
8. 2페이지 반복 → 총 45개 수집
9. 상위 40개 선택 → 참여도순 정렬
10. 캐시 저장 → 4시간 TTL
11. 결과 반환 → 40개 영상
```

### **2. 적응형 페이지네이션 워크플로우**

```
1. 쿼리 수신 → "먹방"
2. 1페이지 테스트 → 성공률 측정
3. 성공률 35% → 중간 수준
4. 표준 전략 적용 → maxPages: 4
5. 목표 달성 시 → 조기 중단
6. 성공률 20% 미만 → 기준 완화
7. minViewCount: 1000 → 700
8. minEngagementRate: 0.01 → 0.007
```

## 🚨 주의사항 및 제한

### **절대 하지 말것** ❌

- search.list만으로 재생가능성 판단
- 50개 초과 배치 처리 (YouTube API 제한)
- 캐시 없이 동일 쿼리 반복 호출
- API 할당량 추적 없이 대량 검색

### **반드시 할것** ✅

- 2단계 필터링 완전 적용
- 재생가능성 확인 후 필터링
- 페이지네이션으로 40개 목표 달성
- 캐시 활용으로 중복 호출 방지

## 📈 모니터링 지표

### **실시간 추적**

```javascript
// 모듈별 통계
const stats = getSystemStats();

console.log("🎬 검색 엔진:", stats.searchEngine);
// - 총 요청 수, 성공률, 평균 응답 시간

console.log("📊 필터링:", stats.videoFilter);
// - 재생가능률, 품질통과율, 전체 성공률

console.log("📄 페이지네이션:", stats.paginationHandler);
// - 평균 페이지 수, 목표 달성률, 효율성

console.log("🏠 전체 시스템:", stats);
// - 캐시 적중률, API 사용량, 전체 효율성
```

### **일일 체크리스트**

- [ ] API 사용량 < 8,000 units (80% 이하)
- [ ] 캐시 적중률 > 85%
- [ ] 필터링 성공률 > 70%
- [ ] 평균 응답 시간 < 3초
- [ ] 목표 달성률 > 90%

## 🔧 문제 해결

### **일반적인 문제들**

1. **"재생할 수 없는 영상"** → 2단계 필터링 확인
2. **"결과 수 부족"** → 페이지네이션 설정 조정
3. **"응답 시간 지연"** → 캐시 활용 및 배치 크기 최적화
4. **"API 할당량 초과"** → 캐시 적중률 향상 및 필터링 기준 조정

### **성능 최적화 팁**

1. **캐시 우선 사용**: `useCache: true` (기본값)
2. **적응형 페이지네이션**: `useAdaptivePagination: true`
3. **적절한 배치 크기**: 50개 유지 (YouTube API 최대값)
4. **조기 중단 활용**: `earlyStopThreshold: 0.8`

## 📚 추가 참조

- [YouTube API 파라미터](../docs/development/youtube-api-parameters.md)
- [API 최적화 전략](../docs/basic/7.Youtube%20API%20활용%20전략.md)
- [개발 가이드](../docs/development/youtube-shorts-filtering-guide.md)

---

**마지막 업데이트**: 2024년 1월  
**버전**: 2.0 (모듈화 완료)  
**상태**: ✅ 프로덕션 준비 완료
