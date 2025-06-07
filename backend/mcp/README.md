# 🤖 Backend MCP 시스템

> YouTube Shorts AI 큐레이션을 위한 **Model Context Protocol (MCP)** 통합 시스템

## 📁 **폴더 구조**

```
backend/mcp/
├── clients/              # MCP 클라이언트
│   └── mcp-client/      # 통합 MCP 클라이언트 (706라인)
├── servers/             # MCP 서버들
│   ├── youtube-curator-mcp/    # YouTube 큐레이션 서버 (1,724라인)
│   └── user-analytics-mcp/     # 사용자 분석 서버 (1,130라인)
└── tests/               # MCP 테스트 스크립트들
```

## 🛠️ **설치 및 설정**

### 자동 설치 (Railway 배포 시)

```bash
npm install    # postinstall 스크립트가 자동으로 MCP 설치
```

### 수동 설치

```bash
npm run install-mcp
```

## 🔧 **통합 방식**

### 서비스 연결

`backend/services/mcpIntegrationService.js`에서 이 MCP 시스템을 로드합니다:

```javascript
// backend/mcp 폴더에서 MCP 클라이언트 로드
const MomentumMCPClient = require("../mcp/clients/mcp-client/index.js");
```

### API 엔드포인트

- `POST /api/v1/videos/intelligent-search` - AI 자연어 검색
- `POST /api/v1/videos/workflow-search` - 4단계 워크플로우
- `GET /api/v1/videos/mcp-status` - MCP 시스템 상태

## 🎯 **핵심 기능**

### 🧠 **자연어 분석** (youtube-curator-mcp)

- `process_natural_language` - 자연어를 검색 키워드로 변환
- `expand_keyword` - AI 기반 키워드 확장 (15개씩)
- `build_optimized_queries` - 검색 쿼리 최적화 (8-12개)

### 🎬 **영상 검색** (youtube-curator-mcp)

- `search_playable_shorts` - 2단계 필터링으로 재생 가능한 Shorts만
- `analyze_video_metadata` - 영상 메타데이터 분석

### 📊 **사용자 분석** (user-analytics-mcp)

- `get_popular_keywords` - 인기 검색어 추출
- `analyze_user_patterns` - 사용자 패턴 분석
- `get_realtime_trends` - 실시간 트렌드 분석

## 🚀 **사용 예시**

### AI 자연어 검색

```javascript
// "피곤해서 힐링되는 영상 보고 싶어" → 실제 YouTube Shorts 추천
const result = await mcpIntegrationService.executeAICurationWorkflow(
  "피곤해서 힐링되는 영상 보고 싶어",
  userId
);
```

### 4단계 워크플로우

```javascript
// 1. 키워드 확장 → 2. 쿼리 최적화 → 3. 영상 검색 → 4. 메타데이터 분석
const workflow = await mcpIntegrationService.executeAICurationWorkflow(keyword);
```

## ⚡ **성능 최적화**

- **API 할당량**: 일일 10,000 units 관리
- **캐싱**: 85% 적중률 목표
- **2단계 필터링**: 재생 가능한 영상만 선별 (70-85% 성공률)

## 🔍 **디버깅**

### MCP 상태 확인

```bash
curl http://localhost:3000/api/v1/videos/mcp-status
```

### 로그 확인

```
✅ MCP 클라이언트 모듈 로드 성공 (backend/mcp)
🔧 MCP 통합 서비스 초기화 시작 (backend/mcp)...
📁 MCP 서버 경로: backend/mcp/servers/
✅ MCP 통합 서비스 초기화 완료 (backend/mcp)
```

---

**참고**: 이 MCP 시스템은 원본 `mcp-integration/` 폴더에서 복사되었으며,
Railway 배포 시 `backend/` 폴더 안에서 독립적으로 실행됩니다.
