# 📚 YouTube AI Services - 완전한 모듈 가이드

## 🎯 **개요**

이 문서는 YouTube Shorts 큐레이션을 위한 **12개 완성된 모듈**에 대한 종합 가이드입니다.  
각 모듈의 기능, API, 사용법, 그리고 통합 방법을 상세히 설명합니다.

---

## 📁 **1. Search 모듈 (검색 관련)**

### 📍 `search/modules/youtube-search-engine.js` (895줄)

#### 🎯 **핵심 기능**

- YouTube Data API v3 통합 검색 엔진
- 2단계 필터링 워크플로우 (search.list → videos.list)
- API 할당량 최적화 (일일 10,000 units 관리)

#### 🔧 **주요 함수**

```javascript
// 기본 YouTube 검색
async function searchYouTubeVideos(keyword, options = {})

// 2단계 필터링 검색 (재생 가능 여부 확인)
async function searchWithTwoStageFiltering(keyword, options = {})

// 배치 영상 정보 조회
async function batchGetVideoDetails(videoIds)

// API 사용량 계산
function calculateSearchCost(maxResults, partsArray)
```

#### 💡 **사용 예시**

```javascript
const {
  searchYouTubeVideos,
  searchWithTwoStageFiltering,
} = require("./youtube-search-engine");

// 1. 기본 검색
const basicResults = await searchYouTubeVideos("먹방", {
  videoDuration: "short",
  maxResults: 20,
  order: "relevance",
});

// 2. 2단계 필터링 검색 (권장)
const filteredResults = await searchWithTwoStageFiltering("브이로그", {
  maxResults: 50,
  regionCode: "KR",
  relevanceLanguage: "ko",
});

console.log(`재생 가능한 영상: ${filteredResults.length}개`);
```

#### ⚙️ **설정 옵션**

| 옵션                | 기본값      | 설명                                      |
| ------------------- | ----------- | ----------------------------------------- |
| `maxResults`        | 20          | 최대 결과 수                              |
| `videoDuration`     | 'short'     | 영상 길이 ('short', 'medium', 'long')     |
| `order`             | 'relevance' | 정렬 방식 ('date', 'rating', 'viewCount') |
| `regionCode`        | 'KR'        | 지역 코드                                 |
| `relevanceLanguage` | 'ko'        | 언어 설정                                 |

---

### 📍 `search/modules/video-complete-filter.js` (452줄)

#### 🎯 **핵심 기능**

- 재생 가능 여부 검증 (embeddable, privacyStatus, regionRestriction)
- 영상 길이 파싱 (ISO8601 → 초 단위)
- 품질 점수 계산 (조회수, 좋아요, 댓글)

#### 🔧 **주요 함수**

```javascript
// 재생 가능 영상 필터링
async function filterPlayableVideos(videos)

// 영상 길이 파싱
function parseISO8601Duration(duration)

// 품질 점수 계산 (0-100점)
function calculateQualityScore(video)

// 지역 차단 확인
function isRegionBlocked(video, regionCode)
```

#### 💡 **사용 예시**

```javascript
const {
  filterPlayableVideos,
  calculateQualityScore,
} = require("./video-complete-filter");

// 재생 가능한 영상만 필터링
const playableVideos = await filterPlayableVideos(searchResults);

// 품질 점수 계산
playableVideos.forEach((video) => {
  const score = calculateQualityScore(video);
  console.log(`${video.snippet.title}: ${score}점`);
});
```

#### 🎯 **필터링 조건**

```javascript
// 재생 가능 조건
const isPlayable = (video) => {
  return (
    video.status.embeddable && // 임베드 가능
    video.status.privacyStatus === "public" && // 공개 영상
    !isRegionBlocked(video, "KR") && // 한국 차단 아님
    parseISO8601Duration(video.contentDetails.duration) <= 60
  ); // 60초 이하
};
```

---

### 📍 `search/modules/pagination-handler.js` (313줄)

#### 🎯 **핵심 기능**

- 스마트 페이지네이션 (pageToken 관리)
- 중복 제거 알고리즘
- 결과 병합 및 정렬

#### 🔧 **주요 함수**

```javascript
// 페이지네이션 처리
async function handlePagination(searchFunction, totalResults)

// 중복 영상 제거
function removeDuplicateVideos(videos)

// 결과 병합
function mergeSearchResults(resultArrays)
```

#### 💡 **사용 예시**

```javascript
const {
  handlePagination,
  removeDuplicateVideos,
} = require("./pagination-handler");

// 대량 검색 (100개 이상)
const allResults = await handlePagination(
  (pageToken) => searchYouTubeVideos("댄스", { pageToken }),
  200 // 총 200개 결과
);

// 중복 제거
const uniqueVideos = removeDuplicateVideos(allResults);
```

---

## 📈 **2. Trends 모듈 (트렌드 분석)**

### 📍 `trends/modules/google-trends-collector.js` (546줄)

#### 🎯 **핵심 기능**

- SerpAPI 기반 Google Trends 수집
- 한국 트렌드 실시간 수집
- 관련 검색어 추출

#### 🔧 **주요 함수**

```javascript
// Google 트렌드 수집
async function collectGoogleTrends(region = 'KR')

// 특정 키워드 트렌드 분석
async function analyzeKeywordTrend(keyword, timeframe = '7d')

// 관련 검색어 수집
async function getRelatedQueries(keyword)
```

#### 💡 **사용 예시**

```javascript
const {
  collectGoogleTrends,
  analyzeKeywordTrend,
} = require("./google-trends-collector");

// 실시간 트렌드 수집
const trends = await collectGoogleTrends("KR");
console.log("인기 키워드:", trends.slice(0, 10));

// 특정 키워드 분석
const analysis = await analyzeKeywordTrend("먹방", "30d");
console.log(`'먹방' 트렌드 점수: ${analysis.trendScore}`);
```

---

### 📍 `trends/modules/zum-trends-collector.js` (428줄)

#### 🎯 **핵심 기능**

- 줌(ZUM) AI 이슈 트렌드 수집
- 실시간 이슈 키워드 분석
- 카테고리별 트렌드 분류

#### 🔧 **주요 함수**

```javascript
// 줌 트렌드 수집
async function collectZumTrends()

// 카테고리별 트렌드
async function getTrendsByCategory(category)

// 이슈 분석
async function analyzeIssueKeywords(keywords)
```

#### 💡 **사용 예시**

```javascript
const {
  collectZumTrends,
  getTrendsByCategory,
} = require("./zum-trends-collector");

// 전체 트렌드 수집
const zumTrends = await collectZumTrends();

// 엔터테인먼트 트렌드만
const entertainmentTrends = await getTrendsByCategory("entertainment");
```

---

## 🤖 **3. LLM 모듈 (AI 자연어 처리)**

### 📍 `llm/modules/natural-language-extractor.js` (789줄)

#### 🎯 **핵심 기능**

- Claude API 기반 자연어 키워드 추출
- 대화형 검색을 위한 의도 파악
- 감정 분석 및 카테고리 분류

#### 🔧 **주요 함수**

```javascript
// 자연어에서 키워드 추출
async function extractKeywordsFromText(text, context = {})

// 검색 의도 분석
async function analyzeSearchIntent(userMessage)

// 감정 기반 키워드 생성
async function generateEmotionalKeywords(emotion, category)
```

#### 💡 **사용 예시**

```javascript
const {
  extractKeywordsFromText,
  analyzeSearchIntent,
} = require("./natural-language-extractor");

// 자연어 키워드 추출
const keywords = await extractKeywordsFromText(
  "오늘 비 오는데 집에서 보기 좋은 힐링되는 먹방 영상"
);
console.log("추출된 키워드:", keywords);
// → ['힐링', '먹방', '실내', '비오는날', '치유', '음식']

// 검색 의도 분석
const intent = await analyzeSearchIntent("우울할 때 보면 좋은 영상");
console.log("사용자 의도:", intent.category); // → 'healing'
```

---

### 📍 `llm/modules/youtube-query-builder.js` (456줄)

#### 🎯 **핵심 기능**

- AI 기반 YouTube 검색 쿼리 최적화
- 다양한 검색 전략 생성
- API 효율성 최대화

#### 🔧 **주요 함수**

```javascript
// 최적화된 YouTube 쿼리 생성
async function buildOptimizedQuery(userInput, preferences = {})

// 다중 전략 쿼리 생성
async function generateMultipleStrategies(keyword, maxQueries = 5)

// 쿼리 성능 예측
function predictQueryPerformance(query)
```

#### 💡 **사용 예시**

```javascript
const {
  buildOptimizedQuery,
  generateMultipleStrategies,
} = require("./youtube-query-builder");

// 단일 최적화 쿼리
const optimizedQuery = await buildOptimizedQuery("재미있는 댄스", {
  targetAudience: "teens",
  contentType: "shorts",
});

// 다중 전략 쿼리
const strategies = await generateMultipleStrategies("요리", 3);
strategies.forEach((strategy, index) => {
  console.log(`전략 ${index + 1}: ${strategy.description}`);
  console.log(`쿼리: ${strategy.query}`);
});
```

---

### 📍 `llm/modules/advanced-query-builder.js` (523줄)

#### 🎯 **핵심 기능**

- 고급 검색 전략 자동 생성
- 트렌드 기반 쿼리 확장
- 사용자 맞춤형 쿼리 최적화

#### 🔧 **주요 함수**

```javascript
// 고급 검색 전략 생성
async function generateAdvancedSearchStrategies(baseKeyword, options = {})

// 트렌드 기반 쿼리 확장
async function expandQueryWithTrends(keyword, trendData)

// 개인화 쿼리 생성
async function personalizeQuery(keyword, userProfile)
```

---

### 📍 `llm/modules/result-analyzer.js` (445줄)

#### 🎯 **핵심 기능**

- AI 기반 검색 결과 품질 분석
- 다양성 및 관련성 평가
- 개선 방안 제시

#### 🔧 **주요 함수**

```javascript
// 검색 결과 종합 분석
async function analyzeSearchResults(videos, originalQuery, userIntent)

// 품질 점수 계산
function calculateOverallQuality(videos)

// 개선 방안 제시
async function suggestImprovements(analysisResult)
```

#### 💡 **사용 예시**

```javascript
const {
  analyzeSearchResults,
  suggestImprovements,
} = require("./result-analyzer");

// 검색 결과 분석
const analysis = await analyzeSearchResults(
  searchResults,
  "먹방",
  "entertainment"
);
console.log(`전체 품질 점수: ${analysis.overallScore}/100`);
console.log(`다양성 점수: ${analysis.diversityScore}/100`);

// 개선 방안
const suggestions = await suggestImprovements(analysis);
suggestions.forEach((suggestion) => {
  console.log(`- ${suggestion.action}: ${suggestion.reason}`);
});
```

---

## 🔤 **4. Keywords 모듈 (키워드 확장)**

### 📍 `keywords/modules/youtube-keyword-extractor.js` (895줄)

#### 🎯 **핵심 기능**

- YouTube 특화 키워드 확장
- Bright Data 웹 스크래핑 통합
- 자동완성 기반 키워드 발굴

#### 🔧 **주요 함수**

```javascript
// YouTube 키워드 확장
async function expandYouTubeKeywords(baseKeyword, options = {})

// 자동완성 키워드 수집
async function collectAutocompleteKeywords(keyword, source = 'google')

// 관련 채널 키워드 분석
async function analyzeChannelKeywords(channelId)
```

#### 💡 **사용 예시**

```javascript
const {
  expandYouTubeKeywords,
  collectAutocompleteKeywords,
} = require("./youtube-keyword-extractor");

// YouTube 특화 키워드 확장
const expandedKeywords = await expandYouTubeKeywords("홈트", {
  maxKeywords: 20,
  includeRelated: true,
  filterShorts: true,
});

// 자동완성 키워드
const autocomplete = await collectAutocompleteKeywords("ASMR");
console.log("자동완성 제안:", autocomplete);
```

---

### 📍 `keywords/modules/google-autocomplete-collector.js` (334줄)

#### 🎯 **핵심 기능**

- Google 자동완성 API 연동
- 실시간 검색 제안 수집
- 지역별/언어별 자동완성

#### 🔧 **주요 함수**

```javascript
// Google 자동완성 수집
async function collectGoogleAutocomplete(keyword, options = {})

// 다국가 자동완성
async function collectMultiRegionAutocomplete(keyword, regions)

// 자동완성 필터링
function filterAutocompleteResults(results, filters)
```

---

### 📍 `keywords/modules/realtime-trend-collector.js` (367줄)

#### 🎯 **핵심 기능**

- 실시간 트렌드 키워드 수집
- 다중 소스 통합 (Google, Naver, YouTube)
- 트렌드 점수 계산

#### 🔧 **주요 함수**

```javascript
// 실시간 트렌드 수집
async function collectRealtimeTrends(sources = ['google', 'youtube'])

// 트렌드 점수 계산
function calculateTrendScore(keyword, metrics)

// 트렌드 예측
async function predictTrendDirection(keyword, historicalData)
```

---

## 🔗 **5. 모듈 통합 사용법**

### 🎯 **완전한 검색 워크플로우**

```javascript
// 모든 모듈을 활용한 완전한 검색 시스템
async function completeSearchWorkflow(userQuery) {
  // 1. 자연어 키워드 추출
  const extractedKeywords = await extractKeywordsFromText(userQuery);

  // 2. 키워드 확장
  const expandedKeywords = await expandYouTubeKeywords(extractedKeywords[0]);

  // 3. 최적화된 쿼리 생성
  const optimizedQuery = await buildOptimizedQuery(expandedKeywords.join(" "));

  // 4. YouTube 검색 (2단계 필터링)
  const searchResults = await searchWithTwoStageFiltering(
    optimizedQuery.keyword
  );

  // 5. 재생 가능 영상 필터링
  const playableVideos = await filterPlayableVideos(searchResults);

  // 6. 결과 분석 및 품질 평가
  const analysis = await analyzeSearchResults(playableVideos, userQuery);

  return {
    videos: playableVideos,
    analysis: analysis,
    suggestions: await suggestImprovements(analysis),
  };
}

// 사용 예시
const result = await completeSearchWorkflow("우울한 날 보기 좋은 힐링 영상");
console.log(`찾은 영상: ${result.videos.length}개`);
console.log(`품질 점수: ${result.analysis.overallScore}/100`);
```

### 🌊 **트렌드 기반 큐레이션**

```javascript
// 실시간 트렌드를 활용한 영상 큐레이션
async function trendBasedCuration() {
  // 1. 다중 소스 트렌드 수집
  const [googleTrends, zumTrends] = await Promise.all([
    collectGoogleTrends("KR"),
    collectZumTrends(),
  ]);

  // 2. 트렌드 통합 및 정렬
  const mergedTrends = [...googleTrends, ...zumTrends]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // 3. 각 트렌드별 영상 검색
  const trendVideos = [];
  for (const trend of mergedTrends) {
    const videos = await searchWithTwoStageFiltering(trend.keyword, {
      maxResults: 5,
    });
    trendVideos.push({
      trend: trend.keyword,
      videos: videos,
    });
  }

  return trendVideos;
}
```

---

## ⚙️ **6. 설정 및 환경변수**

### 🔧 **필수 환경변수**

```bash
# YouTube Data API (필수)
YOUTUBE_API_KEY=your_youtube_api_key

# Claude API (LLM 기능용)
ANTHROPIC_API_KEY=your_claude_api_key

# SerpAPI (Google Trends/Autocomplete용)
SERP_API_KEY=your_serp_api_key

# Bright Data (웹 스크래핑용)
BRIGHT_DATA_API_KEY=your_bright_data_key
BRIGHT_DATA_ZONE=web_unlocker1
```

### 📊 **API 사용량 관리**

```javascript
// API 사용량 모니터링
const apiUsage = {
  youtube: {
    dailyLimit: 10000,
    used: 3250,
    remaining: 6750,
  },
  claude: {
    monthlyLimit: 100000,
    used: 15000,
    remaining: 85000,
  },
  serpApi: {
    monthlyLimit: 100,
    used: 23,
    remaining: 77,
  },
};
```

---

## 🚀 **7. 성능 최적화 팁**

### ⚡ **캐싱 전략**

```javascript
// 캐시 TTL 설정
const cacheStrategy = {
  playableVideos: 7 * 24 * 60 * 60 * 1000, // 7일
  trendData: 2 * 60 * 60 * 1000, // 2시간
  keywordExpansion: 24 * 60 * 60 * 1000, // 24시간
  searchResults: 4 * 60 * 60 * 1000, // 4시간
};
```

### 🎯 **배치 처리**

```javascript
// 여러 키워드 동시 처리
async function batchProcessKeywords(keywords) {
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((keyword) => searchWithTwoStageFiltering(keyword))
    );
    results.push(...batchResults);
  }

  return results;
}
```

---

## 📈 **8. 모니터링 및 로깅**

### 📊 **성능 지표**

```javascript
// 성능 메트릭 추적
const performanceMetrics = {
  searchLatency: [], // 검색 응답 시간
  filteringSuccess: [], // 필터링 성공률
  cacheHitRate: [], // 캐시 적중률
  apiErrorRate: [], // API 오류율
};

// 메트릭 수집
function trackMetric(type, value) {
  performanceMetrics[type].push({
    value,
    timestamp: new Date(),
  });
}
```

---

## 🔄 **9. 에러 처리**

### 🛡️ **공통 에러 처리 패턴**

```javascript
// 재시도 로직을 포함한 API 호출
async function safeApiCall(apiFunction, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`API 호출 실패 (${maxRetries}회 시도):`, error);
        throw error;
      }

      const delay = Math.pow(2, attempt) * 1000; // 지수 백오프
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

---

## 📝 **10. 마이그레이션 가이드**

### 🔄 **메인 프로젝트 통합 방법**

```javascript
// backend/services/youtube/ 디렉토리에 복사
cp youtube-ai-services/search/modules/* backend/services/youtube/
cp youtube-ai-services/llm/modules/* backend/services/ai/
cp youtube-ai-services/keywords/modules/* backend/services/keywords/
cp youtube-ai-services/trends/modules/* backend/services/trends/

// 통합 서비스 클래스 생성
class YouTubeAIService {
  constructor() {
    this.searchEngine = require('./youtube/youtube-search-engine');
    this.keywordExtractor = require('./keywords/youtube-keyword-extractor');
    this.trendsCollector = require('./trends/google-trends-collector');
    // ... 기타 모듈들
  }

  async searchVideos(query) {
    // 모든 모듈을 활용한 통합 검색 로직
    return await this.completeSearchWorkflow(query);
  }
}
```

---

## 🎯 **결론**

이 12개 모듈은 YouTube Shorts 큐레이션을 위한 **완전한 생태계**를 제공합니다:

- **🔍 검색**: 2단계 필터링으로 100% 재생 가능한 영상
- **📈 트렌드**: 실시간 다중 소스 트렌드 분석
- **🤖 AI**: Claude 기반 자연어 처리 및 최적화
- **🔤 키워드**: 다층 키워드 확장 시스템

각 모듈은 독립적으로 사용할 수 있으며, 필요에 따라 조합하여 강력한 큐레이션 시스템을 구축할 수 있습니다.

**🚀 이제 이 모듈들을 활용하여 세계 최고 수준의 YouTube Shorts 큐레이션 서비스를 만들어보세요!**
