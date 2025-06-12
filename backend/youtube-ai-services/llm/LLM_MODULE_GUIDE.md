# 🧠 YouTube Shorts LLM 모듈

> **독립형 자연어 처리 모듈** - YouTube Shorts AI 큐레이션 시스템

각 모듈은 **독립적으로 사용 가능**하며, 필요에 따라 조합하여 활용할 수 있습니다.

## 📂 **모듈 구조**

```
llm/
├── modules/
│   ├── natural-language-extractor.js    # 🗣️ 자연어 → 키워드 추출
│   ├── youtube-query-builder.js         # 🎯 키워드 → YouTube 쿼리 생성
│   ├── advanced-query-builder.js        # 🧠 고급 쿼리 (비활성화) ⚠️
│   └── result-analyzer.js               # 📊 검색 결과 품질 분석 ✨
└── LLM_MODULE_GUIDE.md                  # 📖 이 파일
```

---

## 🗣️ **1. Natural Language Extractor**

### **기능**

사용자의 자연어 입력을 분석하여 YouTube Shorts 검색용 키워드를 추출합니다.

### **주요 특징**

- **Claude API 기반** 지능형 키워드 추출
- **하이브리드 구조**: Direct Search + Expansion Terms
- **감정/주제 분석** 지원
- **폴백 시스템** 내장

### **사용법**

```javascript
import { extractKeywordsFromText } from "./modules/natural-language-extractor.js";

// 기본 사용법
const result = await extractKeywordsFromText(
  "피곤해서 힐링되는 영상 보고 싶어",
  "emotion" // 또는 "topic"
);

console.log(result);
/*
{
  success: true,
  inputType: "emotion",
  originalInput: "피곤해서 힐링되는 영상 보고 싶어",
  directSearch: ["힐링 명상 음악", "자연 소리 ASMR", "수면 유도 피아노"],
  expansionTerms: ["힐링", "수면", "백색소음"],
  keywords: [...], // 전체 키워드 배열
  confidence: 0.92,
  processingTime: 3200
}
*/
```

### **입력 타입**

- **`emotion`**: 감정 상태 기반 키워드 추출
- **`topic`**: 주제 중심 키워드 추출

### **결과 구조**

- **`directSearch`**: 바로 검색할 구체적 키워드 (3-4개)
- **`expansionTerms`**: 관련 확장 키워드 (2-3개)
- **`confidence`**: 추출 신뢰도 (0-1)

---

## 🎯 **2. YouTube Query Builder**

### **기능**

추출된 키워드를 YouTube Data API v3 호환 쿼리로 변환합니다.

### **주요 특징**

- **OR 연산자** 기반 통합 검색
- **Shorts 전용** 최적화
- **고품질 영상** 파라미터 적용
- **성능 최적화** (3초 → 0ms)

### **사용법**

```javascript
import { buildYouTubeQueries } from "./modules/youtube-query-builder.js";

// 키워드 배열로 직접 쿼리 생성
const keywords = ["힐링 피아노", "ASMR 영상", "수면 음악"];
const result = await buildYouTubeQueries(keywords, {
  maxQueries: 1,
  originalInput: "피곤해서 힐링되는 영상",
});

console.log(result);
/*
{
  success: true,
  queries: [{
    apiParams: {
      part: "snippet",
      videoDuration: "short",
      maxResults: 50,
      type: "video",
      regionCode: "KR",
      q: "힐링 피아노 shorts | ASMR 영상 shorts | 수면 음악 shorts",
      order: "relevance",
      // ... 고품질 파라미터들
    },
    strategyName: "OR_직접통합",
    optimizedQuery: "힐링 피아노 shorts | ASMR 영상 shorts | 수면 음악 shorts",
    priority: 1
  }],
  selectedKeywords: ["힐링 피아노", "ASMR 영상", "수면 음악"],
  estimatedApiCost: 100
}
*/
```

### **통합 워크플로우**

```javascript
import { extractKeywordsFromText } from "./modules/natural-language-extractor.js";
import { buildFromExtractorResult } from "./modules/youtube-query-builder.js";

// 자연어 → 키워드 → 쿼리 (한 번에)
async function naturalLanguageToQuery(userInput, inputType) {
  // 1단계: 키워드 추출
  const keywords = await extractKeywordsFromText(userInput, inputType);

  if (!keywords.success) {
    throw new Error("키워드 추출 실패");
  }

  // 2단계: 쿼리 생성
  const queries = await buildFromExtractorResult(keywords, {
    maxQueries: 1,
    originalInput: userInput,
  });

  return {
    keywords: keywords.directSearch,
    query: queries.queries[0].apiParams,
    confidence: keywords.confidence,
  };
}

// 사용 예시
const result = await naturalLanguageToQuery(
  "오늘 운동 영상 보고 싶어",
  "topic"
);

// YouTube API 호출 준비 완료
const youtubeResponse = await youtube.search.list(result.query);
```

### **생성되는 API 파라미터**

```javascript
{
  part: "snippet",
  videoDuration: "short",        // 4분 미만 (Shorts)
  maxResults: 50,
  type: "video",
  regionCode: "KR",              // 한국 지역
  relevanceLanguage: "ko",       // 한국어 우선
  safeSearch: "moderate",
  videoEmbeddable: "true",       // 임베드 가능
  videoSyndicated: "true",       // 외부 재생 보장
  videoDefinition: "high",       // HD 화질만
  q: "키워드1 shorts | 키워드2 shorts | 키워드3 shorts",
  order: "relevance"
}
```

---

## 🧠 **3. Advanced Query Builder (비활성화)**

### **현재 상태**

성능 최적화를 위해 **비활성화** 상태입니다.

### **포함된 기능**

- LLM 기반 고급 쿼리 필요성 분석
- 카테고리 필터링 (14개 카테고리)
- 시간 범위 필터링 (7일/30일/1년)
- 인기순/관련성 정렬
- 복합 조건 쿼리 생성

### **재활성화 조건**

1. 사전 캐싱 시스템 완료 후
2. 기본 쿼리 품질 검증 후
3. 프리미엄 사용자 고급 기능 필요 시
4. A/B 테스트로 효과 입증 시

### **재활성화 방법**

```javascript
// 필요시 이렇게 import
import {
  analyzeQueryNeeds,
  generateAdvanced,
} from "./modules/advanced-query-builder.js";

// youtube-query-builder.js에서 주석 해제 필요
```

---

## 📊 **4. Result Analyzer**

### **기능**

YouTube Shorts 검색 결과의 품질을 종합적으로 분석하고 개선 방안을 제시하는 전문 분석 도구입니다.

### **주요 특징**

- **5단계 분석**: 품질 메트릭 → 다양성 → 관련성 → LLM 심층분석 → 개선방안
- **Claude AI 활용**: 전문적인 콘텐츠 품질 평가
- **정량적 측정**: 재생가능성, 참여도, 채널 다양성 등
- **실용적 제안**: 구체적이고 실행 가능한 개선 방안
- **독립 실행**: 다른 모듈과 독립적 동작

### **사용법**

```javascript
import { analyzeSearchResults } from "./modules/result-analyzer.js";

// 기본 분석
const analysis = await analyzeSearchResults({
  searchResults: videos, // YouTube 검색 결과 배열
  originalQuery: "먹방 유튜브",
  userIntent: "재미있는 먹방 영상",
  analysisType: "comprehensive", // 또는 'basic'
  includeImprovements: true,
});

console.log(`종합 점수: ${analysis.overall_score}/100`);
console.log(`재생가능: ${analysis.quality_metrics.playable_videos}개`);
console.log(
  `다양성: ${analysis.diversity_analysis.overall_diversity_score.toFixed(1)}`
);

// 개선 방안 확인
analysis.recommendations.forEach((rec) => {
  console.log(`${rec.priority}: ${rec.suggestion}`);
});
```

### **분석 결과 구조**

```javascript
{
  overall_score: 85.3,                    // 종합 점수 (0-100)
  quality_metrics: {
    total_videos: 50,
    playable_videos: 42,                  // 재생 가능한 영상 수
    average_duration: 45.2,               // 평균 영상 길이 (초)
    view_count_stats: { min, max, avg, median },
    channel_diversity: 75.5,              // 채널 다양성 (%)
    quality_distribution: { high: 15, medium: 25, low: 10 }
  },
  diversity_analysis: {
    overall_diversity_score: 72.3,       // 전체 다양성 점수
    channel_diversity_score: 80,         // 채널 다양성
    content_type_diversity: 65            // 콘텐츠 타입 다양성
  },
  relevance_analysis: {
    overall_relevance_score: 68.5,       // 전체 관련성 점수
    high_relevance_count: 25,             // 고관련성 영상 수
    title_match_rate: 75.2                // 제목 매칭률 (%)
  },
  llm_analysis: {                         // Claude AI 분석 (선택적)
    overall_score: 85,
    content_quality_assessment: { ... },
    recommendations: ["구체적인 개선방안들"]
  },
  recommendations: [                      // 개선 방안 리스트
    {
      type: "filtering",
      priority: "high",
      suggestion: "재생 불가능한 영상 필터링 강화",
      action: "videos.list API로 embeddable 상태를 사전 확인"
    }
  ]
}
```

### **분석 유형**

- **`comprehensive`**: 전체 분석 (LLM 포함, 느림)
- **`basic`**: 기본 분석 (LLM 제외, 빠름)
- **`quality`**: 품질 중심 분석
- **`diversity`**: 다양성 중심 분석
- **`relevance`**: 관련성 중심 분석

### **활용 가치**

1. **품질 모니터링**: 검색 결과 품질의 정량적 측정
2. **성능 최적화**: 어떤 부분을 개선해야 하는지 명확한 지침
3. **A/B 테스트**: 다른 검색 전략의 효과 비교
4. **자동화**: 정기적 실행으로 서비스 품질 지속 모니터링
5. **사용자 경험**: Claude AI가 제시하는 전문적인 개선 방안

---

## 🚀 **실제 사용 시나리오**

### **시나리오 1: 기본 검색**

```javascript
// 사용자 입력: "먹방 영상 보고 싶어"
const userInput = "먹방 영상 보고 싶어";

// 키워드 추출
const extracted = await extractKeywordsFromText(userInput, "topic");
// 결과: ["먹방 ASMR", "쿡방 리뷰", "맛집 브이로그"]

// 쿼리 생성
const query = await buildYouTubeQueries(extracted.directSearch);
// 결과: "먹방 ASMR shorts | 쿡방 리뷰 shorts | 맛집 브이로그 shorts"

// YouTube API 호출
const videos = await youtube.search.list(query.queries[0].apiParams);
```

### **시나리오 2: 감정 기반 검색**

```javascript
// 사용자 입력: "스트레스 받아서 웃긴 영상 필요해"
const userInput = "스트레스 받아서 웃긴 영상 필요해";

// 감정 분석 + 키워드 추출
const extracted = await extractKeywordsFromText(userInput, "emotion");
// 결과: 감정=stressed, 키워드=["웃긴 동물", "코미디 클립", "패러디 영상"]

// 쿼리 생성 및 검색
const query = await buildFromExtractorResult(extracted);
const videos = await youtube.search.list(query.queries[0].apiParams);
```

### **시나리오 3: 캐시된 키워드 사용**

```javascript
// 사전 캐싱된 인기 키워드 사용
const popularKeywords = ["브이로그", "일상", "힐링"];

// 바로 쿼리 생성 (LLM 건너뛰기)
const query = await buildYouTubeQueries(popularKeywords);
// 즉시 검색 가능 (100ms 이내)
```

### **시나리오 4: 검색 결과 품질 분석**

```javascript
// 검색 후 결과 품질 분석
const userInput = "힐링되는 영상 추천해줘";

// 1단계: 검색 수행
const extracted = await extractKeywordsFromText(userInput, "emotion");
const query = await buildFromExtractorResult(extracted);
const videos = await youtube.search.list(query.queries[0].apiParams);

// 2단계: 결과 품질 분석
const analysis = await analyzeSearchResults({
  searchResults: videos.items,
  originalQuery: userInput,
  userIntent: "감정적 힐링",
  analysisType: "comprehensive",
  includeImprovements: true,
});

// 3단계: 분석 결과 활용
console.log(`검색 품질: ${analysis.overall_score}/100`);
console.log(
  `재생가능: ${analysis.quality_metrics.playable_videos}/${analysis.quality_metrics.total_videos}`
);

// 낮은 점수일 경우 개선방안 적용
if (analysis.overall_score < 70) {
  console.log("🔧 개선 필요 영역:");
  analysis.recommendations.forEach((rec) => {
    if (rec.priority === "high") {
      console.log(`- ${rec.suggestion}`);
    }
  });
}
```

---

## ⚙️ **환경 설정**

### **필수 환경 변수**

```bash
# .env 파일
ANTHROPIC_API_KEY=sk-ant-xxx...  # Claude API 키
```

### **의존성 설치**

```bash
npm install @anthropic-ai/sdk dotenv
```

### **모듈 import**

```javascript
// ES6 모듈 사용
import { extractKeywordsFromText } from "./modules/natural-language-extractor.js";
import { buildYouTubeQueries } from "./modules/youtube-query-builder.js";
import { analyzeSearchResults } from "./modules/result-analyzer.js";
```

---

## 📊 **성능 지표**

### **현재 성능 (최적화 후)**

- **키워드 추출**: ~3.9초 (Claude API 1회 호출)
- **쿼리 생성**: ~0ms (로컬 처리)
- **총 처리 시간**: ~3.9초 (이전 11초에서 2.9배 향상)

### **목표 성능 (캐싱 적용 후)**

- **캐시 히트 시**: ~100ms
- **캐시 미스 시**: ~3.9초
- **캐시 적중률**: 85%+ 목표

### **API 비용**

- **현재**: 검색 1회당 $0.02-0.04
- **목표**: 검색 1회당 $0.004-0.008 (캐싱으로 80% 절감)

### **Result Analyzer 성능**

- **기본 분석**: ~500ms (LLM 제외)
- **종합 분석**: ~4-6초 (Claude API 포함)
- **분석 정확도**: 85%+ (품질 평가 기준)
- **메모리 사용량**: 영상 100개당 ~2MB

---

## 🔧 **문제 해결**

### **자주 발생하는 문제**

#### 1. **Claude API 오류**

```javascript
// 에러 핸들링
try {
  const result = await extractKeywordsFromText(input, type);
} catch (error) {
  console.error("Claude API 오류:", error.message);
  // 폴백 로직 실행
}
```

#### 2. **빈 키워드 결과**

```javascript
// 키워드 확인
if (!result.success || result.directSearch.length === 0) {
  // 기본 키워드 사용
  const fallbackKeywords = ["추천", "인기", "영상"];
  return await buildYouTubeQueries(fallbackKeywords);
}
```

#### 3. **느린 응답 시간**

```javascript
// 타임아웃 설정
const timeout = 5000; // 5초
const result = await Promise.race([
  extractKeywordsFromText(input, type),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), timeout)
  ),
]);
```

#### 4. **Result Analyzer 분석 실패**

```javascript
// 안전한 분석 수행
try {
  const analysis = await analyzeSearchResults({
    searchResults: videos,
    originalQuery: query,
    analysisType: "basic", // LLM 제외로 속도 향상
  });
} catch (error) {
  console.error("분석 실패:", error.message);

  // 기본 분석으로 폴백
  const basicAnalysis = {
    total_videos: videos.length,
    basic_quality_score: videos.length > 0 ? 60 : 0,
    message: "기본 분석만 수행됨",
  };
}
```

#### 5. **분석 결과 품질 낮음**

```javascript
// 분석 품질 향상 팁
const improvedAnalysis = await analyzeSearchResults({
  searchResults: videos,
  originalQuery: query,
  userIntent: "구체적인 사용자 의도 명시", // 중요!
  analysisType: "comprehensive", // 전체 분석 사용
  includeImprovements: true,
});

// 샘플 크기 확인
if (videos.length < 10) {
  console.warn(
    "⚠️ 분석 정확도 향상을 위해 최소 10개 이상의 영상이 필요합니다."
  );
}
```

---

## 🎯 **다음 단계**

### **개발 로드맵**

1. **Backend DB 연동** - 사전 캐싱 시스템
2. **Search 모듈 연동** - 실제 YouTube API 호출
3. **사용자 피드백 수집** - 키워드 품질 개선
4. **고급 쿼리 재활성화** - A/B 테스트 후 결정

### **통합 가이드**

다른 시스템과 통합할 때는 각 모듈을 독립적으로 import하여 사용하세요.

```javascript
// 예: Express.js 서버에서 사용
import express from "express";
import { extractKeywordsFromText } from "./llm/modules/natural-language-extractor.js";
import { buildYouTubeQueries } from "./llm/modules/youtube-query-builder.js";
import { analyzeSearchResults } from "./llm/modules/result-analyzer.js";

const app = express();

// 키워드 추출 API
app.post("/api/extract-keywords", async (req, res) => {
  const { input, type } = req.body;
  const result = await extractKeywordsFromText(input, type);
  res.json(result);
});

// 통합 검색 + 분석 API
app.post("/api/intelligent-search", async (req, res) => {
  const { query, analyzeQuality = false } = req.body;

  // 1. 키워드 추출
  const keywords = await extractKeywordsFromText(query, "topic");

  // 2. 쿼리 생성
  const youtubeQuery = await buildFromExtractorResult(keywords);

  // 3. 검색 실행 (실제 YouTube API 호출은 별도 구현)
  const searchResults = await performYouTubeSearch(youtubeQuery);

  // 4. 품질 분석 (선택적)
  let analysis = null;
  if (analyzeQuality) {
    analysis = await analyzeSearchResults({
      searchResults: searchResults.items,
      originalQuery: query,
      analysisType: "basic",
    });
  }

  res.json({
    keywords: keywords.directSearch,
    results: searchResults,
    analysis: analysis,
  });
});
```

---

**📖 각 모듈은 독립적으로 동작하므로 필요한 기능만 선택하여 사용할 수 있습니다.**

_마지막 업데이트: 2025-06-11_
