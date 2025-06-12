# 🎯 YouTube AI Services - 핵심 모듈 컬렉션

## 📋 **프로젝트 개요**

YouTube Shorts 큐레이션을 위한 **완성된 모듈들**의 컬렉션입니다.  
각 모듈은 독립적으로 동작하며, 메인 프로젝트에서 필요에 따라 사용할 수 있습니다.

## 🗂️ **모듈 구조**

### 📹 `search/modules/` - YouTube 검색 관련

- **youtube-search-engine.js** (895줄) - YouTube API 통합 검색 엔진
- **video-complete-filter.js** (452줄) - 2단계 필터링 (재생 가능 여부 확인)
- **pagination-handler.js** (313줄) - 스마트 페이지네이션 및 결과 관리

### 📈 `trends/modules/` - 트렌드 분석 관련

- **google-trends-collector.js** (546줄) - SerpAPI 기반 구글 트렌드 수집
- **zum-trends-collector.js** (428줄) - 줌 AI 이슈 트렌드 수집

### 🤖 `llm/modules/` - AI 자연어 처리 관련

- **natural-language-extractor.js** (789줄) - 자연어에서 키워드 추출
- **youtube-query-builder.js** (456줄) - 최적화된 YouTube 쿼리 생성
- **advanced-query-builder.js** (523줄) - 고급 검색 전략 생성
- **result-analyzer.js** (445줄) - AI 기반 검색 결과 분석

### 🔤 `keywords/modules/` - 키워드 확장 관련

- **youtube-keyword-extractor.js** (895줄) - YouTube 키워드 확장 및 추출
- **google-autocomplete-collector.js** (334줄) - Google 자동완성 수집
- **realtime-trend-collector.js** (367줄) - 실시간 트렌드 키워드 수집

## 💡 **모듈 사용 예시**

### YouTube 영상 검색 (2단계 필터링)

```javascript
const {
  searchYouTubeVideos,
} = require("./search/modules/youtube-search-engine");
const {
  filterPlayableVideos,
} = require("./search/modules/video-complete-filter");

// 1. 기본 검색
const searchResults = await searchYouTubeVideos("먹방", {
  videoDuration: "short",
  maxResults: 50,
});

// 2. 재생 가능 여부 필터링
const playableVideos = await filterPlayableVideos(searchResults);
```

### 자연어 키워드 추출

```javascript
const {
  extractKeywordsFromText,
} = require("./llm/modules/natural-language-extractor");

const keywords = await extractKeywordsFromText(
  "오늘 우울한데 기분 좋아지는 귀여운 동물 영상"
);
// → ['힐링', '동물', '귀여운', '치유', '펫']
```

### 실시간 트렌드 수집

```javascript
const {
  collectGoogleTrends,
} = require("./trends/modules/google-trends-collector");
const { collectZumTrends } = require("./trends/modules/zum-trends-collector");

// Google 트렌드
const googleTrends = await collectGoogleTrends("KR");

// 줌 트렌드
const zumTrends = await collectZumTrends();
```

## 🎯 **핵심 특징**

1. **완전한 모듈화**: 각 기능이 독립적으로 동작
2. **2단계 필터링**: 재생 불가능한 영상 자동 제거
3. **AI 최적화**: Claude API를 활용한 쿼리 최적화
4. **다중 트렌드 소스**: Google, 줌 등 여러 소스 지원
5. **자연어 처리**: 대화형 검색을 위한 키워드 추출

## 📊 **모듈 완성도**

- ✅ **search/modules/** - 완전 구현됨 (3개 모듈)
- ✅ **llm/modules/** - 완전 구현됨 (4개 모듈)
- ✅ **keywords/modules/** - 완전 구현됨 (3개 모듈)
- ✅ **trends/modules/** - 완전 구현됨 (2개 모듈)

**총 12개 모듈, 약 6,000줄의 완성된 코드**

## 🔧 **의존성**

주요 의존성들은 이미 메인 프로젝트에 통합되었습니다:

- `@anthropic-ai/sdk`: Claude AI 연동
- `cheerio`: HTML 파싱
- `puppeteer`: 웹 스크래핑
- `axios`: HTTP 요청

## 📝 **문서**

- [MODULES-GUIDE.md](./MODULES-GUIDE.md) - 전체 모듈 상세 가이드
- [STRATEGY.md](./STRATEGY.md) - 개발 전략 및 최적화 방안

---

**🚀 이 모듈들을 메인 프로젝트에서 활용하여 강력한 YouTube Shorts 큐레이션 서비스를 구축하세요!**
