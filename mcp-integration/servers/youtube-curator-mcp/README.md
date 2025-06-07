# YouTube Shorts Curator MCP Server

AI 큐레이션을 위한 YouTube Shorts 관련 도구들을 제공하는 MCP 서버입니다.

## ✨ 기능

### 🔍 **키워드 확장** (`expand_keyword`)

- 원본 키워드를 확장하여 관련 검색어 생성
- SerpAPI 연동으로 실시간 관련 검색어 수집
- 컨텍스트 기반 카테고리별 키워드 생성
- 채널, 해시태그, 시간 필터 추천

### 🎯 **최적화된 쿼리 생성** (`build_optimized_queries`)

- 다양한 검색 전략 기반 쿼리 생성
- 채널 중심, 카테고리 중심, 키워드 확장, 시간 기반 전략
- OR 연산자 활용한 복합 검색 쿼리
- API 할당량 최적화

### 🎬 **재생 가능한 Shorts 검색** (`search_playable_shorts`)

- 2단계 필터링으로 재생 가능한 영상만 선별
- 지역 제한, 프라이버시 설정, 길이 제한 확인
- 풍부한 메타데이터 제공 (조회수, 좋아요, 댓글 등)
- 고급 필터링 옵션 지원

### 📊 **비디오 메타데이터 분석** (`analyze_video_metadata`)

- 큐레이션 점수 자동 계산
- 조회수, 참여도, 길이, 최신성 기반 평가
- 카테고리 자동 분류
- 배치 처리 지원 (최대 50개씩)

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
cd mcp-servers/youtube-curator-mcp
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# 필수
YOUTUBE_API_KEY=your_youtube_api_key_here

# 선택사항 (키워드 확장 기능 향상)
SERPAPI_KEY=your_serpapi_key_here
```

### 3. MCP 서버 실행

```bash
npm start
```

## 📋 MCP 클라이언트 설정

### Claude Desktop 설정 예시

`claude_desktop_config.json`에 다음을 추가:

```json
{
  "mcpServers": {
    "youtube-curator": {
      "command": "node",
      "args": ["/path/to/mcp-servers/youtube-curator-mcp/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "your_youtube_api_key",
        "SERPAPI_KEY": "your_serpapi_key"
      }
    }
  }
}
```

### 프로그래밍 방식 사용

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["./index.js"],
});

const client = new Client({
  name: "youtube-curator-client",
  version: "1.0.0",
});

await client.connect(transport);

// 키워드 확장 사용 예시
const result = await client.callTool({
  name: "expand_keyword",
  arguments: {
    keyword: "롤드컵",
    options: {
      includeChannels: true,
      maxKeywords: 10,
    },
  },
});
```

## 🔧 도구 사용법

### 1. 키워드 확장

```javascript
await client.callTool({
  name: "expand_keyword",
  arguments: {
    keyword: "먹방",
    options: {
      includeChannels: true,
      includeTimeFilters: true,
      maxKeywords: 15,
    },
  },
});
```

**응답 예시:**

```json
{
  "original": "먹방",
  "expanded": ["먹방 리뷰", "맛집 탐방", "요리 먹방", "ASMR 먹방"],
  "categories": {
    "food": ["맛집", "요리", "레시피"],
    "entertainment": ["리뷰", "브이로그"]
  },
  "suggestions": {
    "channels": ["쯔양", "야식이", "밴쯔"],
    "hashtags": ["#먹방", "#맛집", "#요리"],
    "timeFilters": ["month", "year"]
  }
}
```

### 2. 최적화된 쿼리 생성

```javascript
await client.callTool({
  name: "build_optimized_queries",
  arguments: {
    keyword: "게임",
    strategy: "auto",
    maxResults: 20,
  },
});
```

### 3. 재생 가능한 Shorts 검색

```javascript
await client.callTool({
  name: "search_playable_shorts",
  arguments: {
    query: "브이로그 | 일상 | 루틴",
    maxResults: 10,
    filters: {
      uploadDate: "week",
      order: "viewCount",
    },
  },
});
```

### 4. 비디오 메타데이터 분석

```javascript
await client.callTool({
  name: "analyze_video_metadata",
  arguments: {
    videoIds: ["dQw4w9WgXcQ", "jNQXAC9IVRw"],
    criteria: {
      minViewCount: 10000,
      maxDuration: 60,
      preferredCategories: ["gaming", "music"],
    },
  },
});
```

## 🎯 사용 사례

### AI 에이전트 큐레이션

```javascript
// 1. 키워드 확장
const expansion = await expandKeyword("여행");

// 2. 최적화된 쿼리 생성
const queries = await buildOptimizedQueries("여행", "auto");

// 3. 다중 검색 실행
const searchPromises = queries.queries.map((query) =>
  searchPlayableShorts(query.query, 5)
);
const results = await Promise.all(searchPromises);

// 4. 결과 분석 및 큐레이션
const allVideoIds = results.flatMap((r) => r.results.map((v) => v.id));
const analysis = await analyzeVideoMetadata(allVideoIds);

// 5. 상위 추천 영상 선별
const recommended = analysis.videos.filter((v) => v.isRecommended).slice(0, 10);
```

### 실시간 트렌드 분석

```javascript
// 트렌딩 키워드로 자동 큐레이션
const trendingKeywords = ["롤드컵", "먹방", "브이로그"];

for (const keyword of trendingKeywords) {
  const expansion = await expandKeyword(keyword);
  const videos = await searchPlayableShorts(keyword, 20);
  const analysis = await analyzeVideoMetadata(videos.results.map((v) => v.id));

  console.log(`${keyword}: ${analysis.recommendedCount}개 추천 영상`);
}
```

## 📊 성능 및 제한사항

### API 할당량 관리

- **YouTube API**: 검색당 100-107 유닛 소모
- **SerpAPI**: 키워드 확장당 1 크레딧 소모
- **캐시**: 24시간 키워드 확장 결과 캐싱

### 필터링 성공률

- **재생 가능 필터링**: 평균 70-85% 성공률
- **Shorts 길이 필터링**: 60초 이하만 허용
- **지역 제한**: 한국 기준 필터링

### 처리 속도

- **키워드 확장**: 평균 1-3초
- **쿼리 생성**: 평균 0.5초
- **영상 검색**: 평균 2-5초 (결과 수에 따라)
- **메타데이터 분석**: 50개당 1-2초

## 🔧 설정 옵션

### 캐시 설정

```javascript
// 캐시 타임아웃 변경 (기본 24시간)
this.cacheTimeout = 12 * 60 * 60 * 1000; // 12시간
```

### 검색 최적화

```javascript
// 최대 쿼리 수 변경 (기본 8개)
const optimizedQueries = this.optimizeQueries(queries).slice(0, 5);
```

## 🐛 문제 해결

### 일반적인 오류

#### YouTube API 키 오류

```
Error: YouTube API 키가 설정되지 않았습니다
```

→ `.env` 파일에 `YOUTUBE_API_KEY` 설정 확인

#### 할당량 초과

```
Error: quotaExceeded
```

→ YouTube API 할당량 확인 (일일 10,000 유닛)

#### SerpAPI 연결 오류

```
Warning: SerpAPI 키가 없습니다. 기본 키워드 확장을 사용합니다.
```

→ 선택사항이므로 기본 기능은 정상 작동

### 디버깅 모드

```bash
DEBUG=* npm start
```

## 📄 라이선스

MIT License - Wave Team

## 🤝 기여

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 지원

- **GitHub Issues**: 버그 리포트 및 기능 요청
- **Documentation**: 추가 예제 및 가이드
- **Community**: 사용자 경험 공유
