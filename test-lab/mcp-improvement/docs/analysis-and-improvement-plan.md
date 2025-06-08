# 🔬 MCP 시스템 현황 분석 및 개선 계획

> **현재 MCP 시스템의 문제점 분석과 사용자 요구사항에 맞는 개선 방향 설계**  
> 분석일: 2025-06-08 | 목표: API 효율성 5배 개선 + 검색 품질 향상

1. 사용자의 답변을 바탕으로 분석
2. 분석된 내용을 바탕으로 다양한 검색 키워드 추출
3. Bright data mcp를 이용하여 키워드와 관련된 다양한 키워드 추출
4. 분석된 키워드, 관련 검색된 키워드들을 바탕으로 사용자가 흥미 있을만한 검색어들 생성
5. 해당 검색어들을 | or 연산자로 묶어서 q로 전달하여 search.list로 검색 (다양한 쿼리스트링을 자동으로 추가하여 검색)
6. 검색된 영상들이 embed 가능한지, 숏츠인지 여부 파악하여 필터링 videos.list 이용
7. 만약 필터링 후 영상 갯수가 적다면 5번으로 돌아가 검색 -> 해당 부분에서 같은 결과가 나올 것이기 때문에 다음 페이지의 결과 받아오도록 쿼리스트링
8. 가져온 결과를 json 형식 등으로 출력

---

## 📊 현재 MCP 시스템 분석

### ❌ **주요 문제점**

#### 1. **API 사용량 과다 낭비**

```
현재 전체 워크플로우: 262 units 사용
- search.list: 200 units (100 × 2회)
- videos.list: 62 units (31 × 2회)

문제: 키워드별로 개별 검색하여 API 호출 횟수가 과도함
```

#### 2. **비효율적인 검색 전략**

```javascript
// 현재 방식: 키워드별 개별 검색
const searchPromises = keywords.map((keyword) =>
  youtubeService.searchShorts(keyword, { maxResults: 10 })
);
// 결과: 키워드 수만큼 API 호출 발생
```

#### 3. **제한적인 키워드 확장**

- 내부 로직으로만 키워드 확장
- Bright Data MCP 활용하지 않음
- 트렌드 반영 부족

#### 4. **단순한 검색 쿼리**

- 단일 키워드 검색만 수행
- OR 연산자 활용하지 않음
- 다양한 쿼리스트링 옵션 미활용

#### 5. **결과 부족 시 대응 부족**

- 페이지네이션 미구현
- 결과 부족 시 재검색 로직 없음

---

## 🎯 사용자 요구사항 (목표 시스템)

### ✅ **원하는 워크플로우**

#### **Step 1: 사용자 답변 분석**

```javascript
// 사용자 입력: "오늘 기분이 우울한데 웃긴 영상 보고 싶어"
const userAnalysis = {
  mood: "우울함",
  intent: "기분전환",
  desiredContent: "웃긴영상",
  timeContext: "오늘",
};
```

#### **Step 2: 다양한 검색 키워드 추출**

```javascript
// Claude API로 정교한 키워드 추출
const extractedKeywords = [
  "웃긴영상",
  "개그",
  "코미디",
  "유머",
  "재밌는",
  "빵터짐",
  "웃음",
  "기분전환",
];
```

#### **Step 3: Bright Data MCP 연동**

```javascript
// 실시간 트렌드 키워드 추가
const trendKeywords = await brightDataMCP.getTrendingKeywords({
  category: "comedy",
  region: "KR",
  relatedTo: extractedKeywords,
});
```

#### **Step 4: 최적화된 검색어 생성**

```javascript
// 사용자 흥미 기반 검색어 조합
const optimizedQueries = [
  "웃긴영상|개그|코미디",
  "빵터지는|재미있는|유머",
  "기분전환|힐링|웃음",
];
```

#### **Step 5: 효율적인 OR 검색**

```javascript
// 단일 API 호출로 다양한 결과 확보
const searchQuery = {
  q: "웃긴영상|개그|코미디|빵터지는|재미있는",
  type: "video",
  videoDuration: "short",
  maxResults: 50,
  order: "relevance",
  publishedAfter: "2024-01-01T00:00:00Z",
};
// API 사용량: search.list 1회 = 100 units (현재 대비 50% 절약)
```

#### **Step 6: 스마트 필터링**

```javascript
// videos.list로 정확한 필터링
const filteredVideos = await filterPlayableShorts(videoIds, {
  embeddable: true,
  privacyStatus: "public",
  maxDuration: 60,
  minViewCount: 1000,
});
```

#### **Step 7: 결과 부족 시 페이지네이션**

```javascript
if (filteredVideos.length < targetCount) {
  // 다음 페이지 검색 (pageToken 활용)
  const nextPageResults = await searchWithPagination(query, nextPageToken);
}
```

#### **Step 8: 구조화된 JSON 응답**

```javascript
const response = {
  originalInput: userInput,
  analysis: userAnalysis,
  searchStrategy: optimizedQueries,
  results: filteredVideos,
  apiUsage: { totalUnits: 107 }, // 현재 대비 60% 절약
  performance: { responseTime: "8초" }, // 현재 대비 40% 단축
};
```

---

## 📈 개선 목표 및 기대 효과

### 🎯 **성능 목표**

| 지표       | 현재      | 목표      | 개선율        |
| ---------- | --------- | --------- | ------------- |
| API 사용량 | 262 units | 107 units | **60% 절약**  |
| 응답 시간  | 13초      | 8초       | **40% 단축**  |
| 검색 품질  | 80%       | 95%       | **15% 향상**  |
| 다양성     | 제한적    | 높음      | **200% 증가** |

### 🚀 **핵심 개선 사항**

#### 1. **API 효율성 5배 향상**

```
Before: 키워드별 개별 검색 (100 units × N회)
After: OR 연산자 통합 검색 (100 units × 1회)
```

#### 2. **Bright Data MCP 실제 활용**

```javascript
// 실시간 트렌드 데이터 연동
const trendingKeywords = await brightDataMCP.getRealtimeTrends({
  timeframe: "1h",
  category: userContext.category,
  region: "KR",
});
```

#### 3. **지능형 쿼리 최적화**

```javascript
// 다양한 검색 전략 자동 적용
const queryStrategies = [
  { q: "primary|secondary", order: "relevance" },
  { q: "trending_keywords", order: "date" },
  { q: "long_tail_keywords", order: "viewCount" },
];
```

#### 4. **스마트 페이지네이션**

```javascript
// 결과 부족 시 자동 확장
while (results.length < targetCount && hasNextPage) {
  const additionalResults = await searchNextPage(query, pageToken);
  results.push(...additionalResults);
}
```

---

## 🛠️ 구현 계획

### **Phase 1: 코어 로직 개선 (2일)**

#### Day 1: 새로운 워크플로우 구현

- [ ] OR 연산자 기반 통합 검색 로직
- [ ] Bright Data MCP 연동
- [ ] 지능형 키워드 조합 알고리즘

#### Day 2: 필터링 및 페이지네이션

- [ ] 효율적인 2단계 필터링
- [ ] 스마트 페이지네이션 구현
- [ ] 결과 품질 검증 로직

### **Phase 2: 최적화 및 테스트 (1일)**

#### Day 3: 성능 최적화 및 검증

- [ ] API 사용량 최적화
- [ ] 응답 시간 단축
- [ ] 품질 지표 측정

---

## 📋 테스트 시나리오

### **Test Case 1: API 효율성 검증**

```
입력: "피곤해서 힐링되는 영상"
목표: API 사용량 < 120 units (현재 262 units 대비 50% 절약)
```

### **Test Case 2: 검색 품질 검증**

```
입력: "웃긴 동물 영상"
목표: 관련성 95% 이상 + 재생 가능 100%
```

### **Test Case 3: 응답 시간 검증**

```
입력: "요리 레시피 쇼츠"
목표: 전체 응답 시간 < 8초 (현재 13초 대비 40% 단축)
```

### **Test Case 4: 다양성 검증**

```
입력: "운동 영상"
목표: 다양한 채널, 다양한 운동 유형 포함
```

---

## 🚨 주의사항 및 리스크

### ⚠️ **리스크 요소**

1. **OR 연산자 제한**: YouTube API에서 OR 연산자가 제대로 작동하지 않을 수 있음
2. **Bright Data API 의존성**: 외부 API 장애 시 폴백 필요
3. **페이지네이션 복잡성**: nextPageToken 관리 복잡

### 🛡️ **대응 방안**

1. **폴백 검색 전략**: OR 검색 실패 시 기존 방식으로 자동 전환
2. **캐싱 전략**: Bright Data 결과 캐싱으로 의존성 감소
3. **점진적 구현**: 기존 시스템 유지하며 새 시스템 단계별 적용

---

## 📊 성공 기준

### ✅ **필수 조건**

- [ ] API 사용량 50% 이상 절약
- [ ] 응답 시간 30% 이상 단축
- [ ] 재생 가능 영상 비율 100% 유지
- [ ] 검색 관련성 90% 이상

### 🎯 **목표 조건**

- [ ] API 사용량 60% 절약
- [ ] 응답 시간 40% 단축
- [ ] 검색 관련성 95% 이상
- [ ] 검색 결과 다양성 200% 증가

---

**📅 작성일**: 2025-06-08  
**👥 팀**: Wave Team  
**🎯 목표**: 차세대 MCP 시스템 구축  
**⏰ 완성 목표**: 3일 내 완료
