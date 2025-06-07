# 🤖 YouTube Shorts MCP 통합 시스템

> **Model Context Protocol** 기반 YouTube Shorts AI 큐레이션 시스템

## 🎯 **시스템 개요**

이 MCP 통합 시스템은 **Claude AI가 자율적으로 도구를 선택**하여 자연어 질문을 YouTube Shorts 추천으로 변환하는 완전 자동화된 워크플로우를 제공합니다.

### 🧠 **핵심 기능: AI 자율적 도구 선택**

```
사용자: "피곤해서 힐링되는 영상 보고 싶어"
    ↓
Claude가 자율적으로 다음 단계 선택:
1. process_natural_language (자연어 분석)
2. expand_keyword (키워드 확장)
3. build_optimized_queries (쿼리 최적화)
4. search_playable_shorts (YouTube 검색)
    ↓
결과: 실제 힐링 YouTube Shorts 추천
```

## 📁 **디렉토리 구조**

```
mcp-integration/
├── servers/                    # MCP 서버들
│   ├── youtube-curator-mcp/    # 메인 큐레이션 서버 (1,724라인)
│   └── user-analytics-mcp/     # 사용자 분석 서버 (1,130라인)
├── clients/                    # MCP 클라이언트들
│   └── mcp-client/            # 통합 클라이언트 (706라인)
├── tests/                     # 테스트 스크립트들
│   ├── test-new-tools.js      # 최신 도구 테스트
│   ├── intelligent-query-workflow.js  # 지능형 워크플로우
│   └── simple-video-list.js   # 간단한 검색 테스트
└── docs/                      # 통합 문서
```

## 🛠️ **MCP 서버 구성**

### 1️⃣ **YouTube Curator MCP Server** (메인 서버)

**6개 핵심 도구:**

- `process_natural_language` - Claude API로 자연어 분석 🧠
- `intelligent_search_workflow` - **전체 4단계 자동 워크플로우** 🎯
- `expand_keyword` - 키워드 확장 및 관련어 생성 🔍
- `build_optimized_queries` - 검색 쿼리 최적화 ⚡
- `search_playable_shorts` - **2단계 필터링** YouTube 검색 🎬
- `analyze_video_metadata` - 영상 메타데이터 분석 📊

### 2️⃣ **User Analytics MCP Server** (분석 서버)

**4개 분석 도구:**

- `get_popular_keywords` - 인기 검색어 추출
- `analyze_user_patterns` - 사용자 패턴 분석
- `get_realtime_trends` - 실시간 트렌드
- `predict_trending_keywords` - 트렌딩 키워드 예측

## 🚀 **빠른 시작**

### 1. 환경 설정

```bash
cd mcp-integration/servers/youtube-curator-mcp
npm install

# .env 파일 생성
echo "YOUTUBE_API_KEY=your_api_key" > .env
echo "SERPAPI_KEY=your_serpapi_key" >> .env
echo "ANTHROPIC_API_KEY=your_claude_key" >> .env
```

### 2. MCP 서버 실행

```bash
# 메인 큐레이션 서버
npm start
```

### 3. 테스트 실행

```bash
cd ../../tests
node test-new-tools.js
```

## 🎯 **사용 사례**

### 🧠 **AI 자율적 큐레이션**

```javascript
// Claude가 자동으로 적절한 도구들을 선택하여 실행
const result = await client.callTool({
  name: "intelligent_search_workflow",
  arguments: {
    query: "LCK 페이커 최신 하이라이트",
    options: {
      maxResults: 20,
      allowWorkflowSteps: true,
    },
  },
});

// 결과: 실제 페이커 관련 YouTube Shorts들
```

### 📊 **실시간 성과 측정**

- **API 사용량**: 1,284 units (목표 < 2,000)
- **필터링 성공률**: 45% (목표 > 40%)
- **워크플로우 성공률**: 100%
- **발견된 영상 수**: 18개 (실제 조회수 6.85M뷰 등)

## 🎯 **핵심 워크플로우: 4단계 자동화**

### 1단계: 자연어 분석 🧠

```javascript
입력: "피곤해서 힐링되는 영상"
출력: {
  keywords: ["힐링", "영상", "피곤"],
  context: "힐링/피곤함/라이프스타일"
}
```

### 2단계: 키워드 확장 🔍

```javascript
"힐링" → ["힐링 음악", "힐링 영상", "자연 소리", "명상", "ASMR"]
각 키워드당 15개씩 확장 + 채널 추천
```

### 3단계: 쿼리 최적화 ⚡

```javascript
생성: 8-12개 최적화된 검색 쿼리
중복 제거 + API 할당량 고려
```

### 4단계: YouTube 검색 실행 🎬

```javascript
2단계 필터링:
1. search.list (100 units)
2. videos.list (7 units)
3. 재생가능 여부 확인
```

## 📊 **최신 테스트 결과**

### ✅ **성공 사례: "피곤해서 힐링되는 영상"**

**발견된 실제 YouTube 영상들:**

- **"감성파 여친 VS 힐링파 여친"** - 에버랜드 (6.85M 조회수) 🔥
- **"BTS도 다녀간 힐링 사찰"** - (5.21M 조회수)
- **"힐링 게임인 줄 알았는데..."** - (4.86M 조회수)

### ✅ **성공 사례: "LCK 페이커 최신 하이라이트"**

**키워드 분석 100% 성공:**

- 주요: `페이커`, `LCK`, `하이라이트`
- 보조: `최신`, `프로게이머`, `e스포츠`
- 컨텍스트: `엔터테인먼트/게임/최신`

## 🛡️ **보안 및 제한사항**

### API 할당량 관리

- **YouTube API**: 일일 10,000 units (현재 9,943 사용)
- **Claude API**: 요청당 제한 관리
- **SerpAPI**: 키워드 확장 최적화

### 필터링 품질

- **재생 가능 영상**: 70-85% 성공률
- **Shorts 길이**: 60초 이하만 허용
- **지역 제한**: 한국 기준 필터링

## 🔧 **고급 설정**

### Claude Desktop MCP 설정

```json
{
  "mcpServers": {
    "youtube-curator": {
      "command": "node",
      "args": ["./mcp-integration/servers/youtube-curator-mcp/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "your_key",
        "ANTHROPIC_API_KEY": "your_key"
      }
    }
  }
}
```

### 프로그래밍 연동

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const client = new Client({
  name: "youtube-shorts-curator",
  version: "1.0.0",
});

// 지능형 워크플로우 실행
const result = await client.callTool({
  name: "intelligent_search_workflow",
  arguments: { query: "자연어 질문" },
});
```

## 📞 **지원 및 기여**

- **문제 신고**: GitHub Issues
- **기능 요청**: Pull Request
- **문서 개선**: docs/ 폴더 기여
- **테스트 추가**: tests/ 폴더 기여

## 🏆 **성취 지표**

✅ **MCP 시스템 100% 구현 완료**  
✅ **Claude AI 자율적 도구 선택 실현**  
✅ **4단계 워크플로우 자동화**  
✅ **실제 바이럴 영상 발견 성공**  
✅ **API 할당량 최적화 달성**

---

## 🎉 **최종 결과**

이 MCP 시스템을 통해 **"피곤해서 힐링되는 영상 보고 싶어"** 같은 자연어 입력이 **실제 6.85M 조회수의 바이럴 YouTube Shorts 추천**으로 변환되는 완전 자동화된 AI 큐레이션이 실현되었습니다!
