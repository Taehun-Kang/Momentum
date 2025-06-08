# 🎬 YouTube Shorts AI MCP 시스템

**Railway MCP Host + MCP Server 통합 시스템**  
**Model Context Protocol (MCP) 2025-03-26 사양 100% 준수**

[![MCP 2025-03-26](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io/specification/2025-03-26)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green)](https://nodejs.org/)
[![Railway](https://img.shields.io/badge/Deploy-Railway-purple)](https://railway.app)

---

## 🎯 시스템 개요

이 프로젝트는 **Railway에서 자체 MCP Host를 운영**하여 YouTube Shorts AI 큐레이션 서비스를 제공하는 완전한 MCP 시스템입니다.

### 🏗️ 아키텍처

```
프론트엔드 (React/Vue/Vanilla JS)
         ↓ HTTP REST API
Railway MCP Host (Express.js + Claude API + MCP Client)
         ↓ MCP Protocol (HTTP)
MCP Server (YouTube API + 2단계 필터링 + LLM 최적화)
         ↓ External APIs
YouTube Data API v3, Anthropic Claude API, Bright Data
```

### ✨ 핵심 특징

- **🔄 통합 시스템**: Railway에서 MCP Host + MCP Server 동시 실행
- **🤖 Claude API 통합**: 자연어 검색 쿼리를 YouTube API 파라미터로 최적화
- **🎬 2단계 필터링**: 재생 가능한 YouTube Shorts만 엄격하게 선별
- **💬 대화형 검색**: "오늘 비 오는데 카페에서 보기 좋은 영상" 같은 자연어 지원
- **📈 실시간 트렌드**: Bright Data API를 통한 다중 플랫폼 트렌드 수집
- **⚡ 프로덕션 준비**: Railway 배포 최적화 및 확장성

---

## 📂 파일 구조

```
final-mcp/
├── 🚀 Railway 시스템
│   ├── railway-startup.js          # Railway 통합 시작 스크립트
│   ├── railway-mcp-host.js         # Express.js MCP Host 서버
│   └── correct-mcp-server-http.js  # HTTP Transport MCP Server
│
├── 🧪 MCP 구현
│   ├── correct-mcp-server.js       # Stdio Transport MCP Server
│   └── correct-mcp-client.js       # MCP Client 테스트
│
├── 📚 문서
│   ├── README.md                   # 이 파일
│   ├── RAILWAY_DEPLOYMENT.md       # Railway 배포 가이드
│   ├── env-config.md               # 환경 변수 설정
│   ├── claude-desktop-config.md    # Claude Desktop 설정
│   ├── MCP_TECHNICAL_DOCUMENTATION.md
│   └── MCP_IMPLEMENTATION_ANALYSIS.md
│
└── ⚙️ 설정
    └── package.json                # 의존성 및 스크립트
```

---

## 🚀 빠른 시작

### 1단계: 의존성 설치

```bash
npm install
```

### 2단계: 환경 변수 설정

`.env` 파일을 생성하고 API 키들을 설정하세요:

```bash
# 필수
YOUTUBE_API_KEY=AIzaYour-YouTube-API-Key-Here
ANTHROPIC_API_KEY=sk-ant-your-claude-api-key

# 선택사항
BRIGHT_DATA_API_KEY=your-bright-data-api-key
```

[상세한 API 키 발급 방법 →](env-config.md)

### 3단계: 로컬 개발 실행

```bash
# 개발 모드 (Hot Reload)
npm run dev

# 또는 프로덕션 모드
npm start
```

**결과**:

- 🌐 MCP Host: http://localhost:3000
- 🔧 MCP Server: http://localhost:3001

### 4단계: API 테스트

```bash
# 헬스 체크
curl http://localhost:3000/health

# 기본 검색
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "재미있는 먹방 영상"}'

# 대화형 AI 검색
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "오늘 우울한데 기분 좋아지는 영상 추천해줘"}'
```

---

## 🌐 Railway 배포

### 자동 배포

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)

### 수동 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인 후 배포
railway login
railway create youtube-shorts-ai-mcp
git push railway main
```

**환경 변수 설정**: Railway 대시보드에서 API 키들을 설정하세요.

[자세한 배포 가이드 →](RAILWAY_DEPLOYMENT.md)

---

## 🔧 API 사용법

### 기본 영상 검색

```javascript
// POST /api/search
{
  "query": "재미있는 먹방 영상",
  "options": {
    "maxResults": 10,
    "includeAnalysis": true
  }
}
```

**응답:**

```javascript
{
  "success": true,
  "originalQuery": "재미있는 먹방 영상",
  "optimizedQuery": {
    "optimizedKeywords": "먹방 ASMR 리뷰",
    "intent": "음식 관련 엔터테인먼트 콘텐츠 검색"
  },
  "results": {
    "totalResults": 8,
    "videos": [
      {
        "id": "abc123xyz",
        "title": "ASMR 치킨 먹방 🍗",
        "channel": "먹방요정",
        "url": "https://www.youtube.com/shorts/abc123xyz",
        "duration": 45,
        "viewCount": 1200000
      }
    ],
    "apiUnitsUsed": 107
  }
}
```

### 대화형 AI 검색

```javascript
// POST /api/chat
{
  "message": "오늘 비 오는데 카페에서 혼자 보기 좋은 영상 추천해줘",
  "conversationHistory": []
}
```

**응답:**

```javascript
{
  "success": true,
  "response": {
    "message": "비 오는 날 카페에서 혼자 보기 좋은 따뜻한 영상들을 찾아드렸어요! ☔☕",
    "hasVideoResults": true,
    "searchResults": {
      "totalResults": 5,
      "videos": [...]
    }
  }
}
```

### 트렌드 키워드 조회

```javascript
// GET /api/trends?region=KR&category=entertainment
{
  "success": true,
  "trends": {
    "region": "KR",
    "category": "entertainment",
    "trends": [
      {
        "keyword": "먹방",
        "score": 85,
        "searchVolume": 50000,
        "growthRate": 15,
        "relatedTerms": ["ASMR", "리뷰"]
      }
    ]
  }
}
```

---

## 🤖 Claude Desktop 연동

[Claude Desktop 설정 가이드 →](claude-desktop-config.md)

Claude Desktop에서 이 MCP 서버를 사용하려면:

1. `claude_desktop_config.json` 파일 수정
2. 환경 변수 설정
3. Claude Desktop 재시작

```json
{
  "mcpServers": {
    "youtube-shorts-ai": {
      "command": "node",
      "args": ["/path/to/correct-mcp-server.js"],
      "env": {
        "YOUTUBE_API_KEY": "your-api-key",
        "ANTHROPIC_API_KEY": "your-claude-key"
      }
    }
  }
}
```

---

## ⚡ 성능 및 제한사항

### API 할당량 관리

- **YouTube API**: 일일 10,000 units (권장 사용량 < 8,000)
- **2단계 필터링**: search.list (100 units) + videos.list (7 units)
- **캐시 전략**: 재생 가능 영상 7일, 검색 결과 4시간
- **목표 캐시 적중률**: 85% 이상

### 필터링 성능

- **재생 가능 여부 확인**: embeddable, regionRestriction, privacyStatus
- **Shorts 길이 제한**: 5-60초
- **필터링 성공률**: 70% 이상 (재생 가능한 영상 비율)

---

## 🛠️ 개발 모드

### 개별 서버 실행

```bash
# MCP Host만 실행
npm run start:host

# MCP Server만 실행 (HTTP)
npm run start:http

# MCP Client 테스트
npm run test
```

### MCP 서버 직접 테스트

```bash
# MCP 서버 도구 호출
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_videos",
      "arguments": {
        "query": "먹방",
        "maxResults": 5
      }
    }
  }'
```

---

## 📊 모니터링

### 헬스 체크

```bash
# 시스템 전체 상태
curl http://localhost:3000/health

# MCP 서버 상태
curl http://localhost:3001/health
```

### 성능 지표

- **응답 시간**: < 500ms
- **캐시 적중률**: > 85%
- **API 사용률**: < 80% (일일 할당량 대비)
- **필터링 성공률**: > 70%

---

## 🔧 문제 해결

### 일반적인 문제

1. **MCP 연결 실패**: 포트 3001이 사용 중인지 확인
2. **YouTube API 오류**: API 키와 할당량 확인
3. **Claude API 오류**: API 키 형식과 잔액 확인
4. **Railway 배포 실패**: 환경 변수 설정 확인

### 디버깅

```bash
# 상세 로그 확인
DEBUG=* npm run dev

# MCP 서버 로그
curl http://localhost:3001/health
```

---

## 📝 라이센스

MIT License - [LICENSE](LICENSE) 파일 참조

---

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 지원

- **GitHub Issues**: [이슈 등록](https://github.com/youtube-shorts-ai/mcp-system/issues)
- **문서**: 이 저장소의 `*.md` 파일들
- **MCP 공식 문서**: [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

**구현된 기능** ✅  
✅ Railway MCP Host + MCP Server 통합 시스템  
✅ Claude API 연동 자연어 검색  
✅ YouTube API 2단계 필터링  
✅ 실시간 트렌드 분석  
✅ RESTful API 인터페이스  
✅ MCP 2025-03-26 사양 100% 준수

**다음 단계** 🚀  
🔲 프론트엔드 연동 (React/Vue)  
🔲 사용자 인증 시스템  
🔲 프리미엄 구독 모델  
🔲 소셜 공유 기능
