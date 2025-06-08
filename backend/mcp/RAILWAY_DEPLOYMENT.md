# 🚀 Railway MCP 시스템 배포 가이드

**YouTube Shorts AI 큐레이션 MCP 시스템을 Railway에 배포하는 완전한 가이드**

---

## 🎯 시스템 아키텍처

```
프론트엔드 (React/Vue/Vanilla JS)
         ↓ HTTP API
Railway Backend (MCP Host + Claude API)
         ↓ MCP Protocol (HTTP)
MCP Server (YouTube API + LLM)
         ↓ REST API
YouTube Data API v3, Anthropic Claude API
```

### 핵심 컴포넌트

- **Railway MCP Host**: Express.js 서버 + MCP Client + Claude API
- **MCP Server**: YouTube API 연동 + 2단계 필터링
- **통합 시스템**: 두 서버가 하나의 Railway 인스턴스에서 실행

---

## 🔧 Railway 배포 설정

### 1단계: Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 새 프로젝트 생성
railway create youtube-shorts-ai-mcp

# Git 저장소 연결
git remote add railway [RAILWAY_GIT_URL]
```

### 2단계: 환경 변수 설정

Railway 대시보드에서 다음 환경 변수들을 설정하세요:

#### 필수 환경 변수

```bash
# YouTube Data API v3 (필수)
YOUTUBE_API_KEY=AIzaYour-YouTube-API-Key-Here

# Anthropic Claude API (필수)
ANTHROPIC_API_KEY=sk-ant-your-claude-api-key

# Railway 포트 설정
PORT=3000
MCP_SERVER_PORT=3001

# MCP 서버 URL (자동 설정됨)
YOUTUBE_SHORTS_MCP_URL=http://localhost:3001/mcp
```

#### 선택사항 환경 변수

```bash
# Bright Data API (트렌드 기능용)
BRIGHT_DATA_API_KEY=your-bright-data-api-key
BRIGHT_DATA_PROXY_ENDPOINT=https://your-proxy-endpoint.com/api

# 추가 설정
NODE_ENV=production
LOG_LEVEL=info
```

### 3단계: package.json 스크립트 수정

Railway용 시작 스크립트를 추가하세요:

```json
{
  "scripts": {
    "start": "node railway-deployment-guide.md",
    "start:production": "node railway-deployment-guide.md",
    "start:host": "node railway-mcp-host.js",
    "start:server": "node correct-mcp-server-http.js",
    "dev": "node --watch railway-deployment-guide.md"
  }
}
```

### 4단계: Railway 배포

```bash
# 코드 푸시
git add .
git commit -m "🚀 Railway MCP 시스템 배포"
git push railway main

# 배포 상태 확인
railway status

# 로그 확인
railway logs
```

---

## 🌐 API 사용법

배포 완료 후 다음 URL로 API에 접근할 수 있습니다:
`https://your-railway-app.railway.app`

### 📊 상태 확인

```bash
GET /health
```

**응답 예시:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-08T10:30:00.000Z",
  "connectedServers": ["youtube-shorts-ai"],
  "availableTools": [
    "youtube-shorts-ai.search_videos",
    "youtube-shorts-ai.get_trending_keywords"
  ]
}
```

### 🔍 기본 영상 검색

```bash
POST /api/search
Content-Type: application/json

{
  "query": "재미있는 먹방 영상",
  "options": {
    "includeAnalysis": true
  }
}
```

**응답 예시:**

```json
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
        "thumbnailUrl": "https://img.youtube.com/vi/abc123xyz/mqdefault.jpg",
        "url": "https://www.youtube.com/shorts/abc123xyz",
        "duration": 45,
        "viewCount": 1200000
      }
    ],
    "apiUnitsUsed": 107
  }
}
```

### 💬 대화형 AI 검색 (프리미엄)

```bash
POST /api/chat
Content-Type: application/json

{
  "message": "오늘 비 오는데 카페에서 혼자 보기 좋은 따뜻한 영상 추천해줘",
  "conversationHistory": []
}
```

**응답 예시:**

```json
{
  "success": true,
  "response": {
    "message": "비 오는 날 카페에서 혼자 보기 좋은 따뜻한 영상들을 찾아드렸어요! ☔☕\n\n1. 빗소리와 함께하는 ASMR 카페 - 조회수 500K\n2. 혼자만의 시간, 따뜻한 차 한 잔 - 조회수 320K\n\n이런 영상들이 마음을 따뜻하게 해드릴 거예요. 편안한 시간 보내세요! 😊",
    "hasVideoResults": true,
    "searchResults": {
      "totalResults": 5,
      "videos": [...]
    }
  }
}
```

### 📈 트렌드 키워드 조회

```bash
GET /api/trends?region=KR&category=entertainment
```

**응답 예시:**

```json
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

## 🔧 MCP 서버 직접 관리

### MCP 서버 연결

```bash
POST /mcp/connect
Content-Type: application/json

{
  "serverName": "youtube-shorts-ai",
  "url": "http://localhost:3001/mcp",
  "transport": "streamable-http"
}
```

### 사용 가능한 도구 확인

```bash
GET /mcp/tools
```

---

## 🚨 문제 해결

### 배포 실패 시

1. **환경 변수 확인**: Railway 대시보드에서 모든 필수 환경 변수가 설정되었는지 확인
2. **로그 확인**: `railway logs`로 오류 메시지 확인
3. **포트 설정**: Railway는 `PORT` 환경 변수를 자동 설정합니다

### API 키 오류

```bash
# YouTube API 키 테스트
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=YOUR_API_KEY"

# Claude API 키 테스트 (Postman 등 사용)
POST https://api.anthropic.com/v1/messages
Authorization: x-api-key YOUR_CLAUDE_KEY
```

### MCP 연결 실패

1. **서버 시작 순서**: MCP Server가 먼저 시작되는지 확인
2. **포트 충돌**: 3000, 3001 포트가 사용 가능한지 확인
3. **방화벽**: Railway 내부 통신이 차단되지 않았는지 확인

---

## 📊 성능 모니터링

### 헬스 체크 엔드포인트

```bash
# 시스템 전체 상태
GET /health

# MCP 서버 상태
GET http://localhost:3001/health
```

### API 사용량 모니터링

```bash
# MCP를 통한 서버 통계
POST /api/search
{
  "query": "server stats",
  "options": { "toolName": "get_server_stats" }
}
```

### Railway 메트릭

- **메모리 사용량**: Railway 대시보드에서 확인
- **CPU 사용률**: 대시보드 메트릭 탭
- **네트워크 트래픽**: 요청/응답 통계

---

## 🔮 고급 기능

### 1. 다중 MCP 서버 연결

```javascript
// 추가 MCP 서버들
const additionalServers = [
  {
    name: "trend-analyzer",
    url: "https://trend-server.railway.app/mcp",
  },
  {
    name: "content-filter",
    url: "https://filter-server.railway.app/mcp",
  },
];
```

### 2. 웹훅 연동

```javascript
// 트렌드 변화 알림
app.post("/webhook/trends", (req, res) => {
  // 새로운 트렌드 키워드 감지 시 처리
});
```

### 3. 캐싱 최적화

```javascript
// Redis 연동 (선택사항)
const redis = new Redis(process.env.REDIS_URL);
```

---

## 🎉 완료!

축하합니다! 이제 Railway에서 완전한 MCP 시스템이 실행 중입니다:

✅ **MCP Host**: Express.js + Claude API + MCP Client  
✅ **MCP Server**: YouTube API + 2단계 필터링  
✅ **REST API**: 프론트엔드 연동 가능  
✅ **대화형 AI**: 자연어 영상 검색  
✅ **실시간 트렌드**: 키워드 분석

### 다음 단계

1. **프론트엔드 연동**: React/Vue.js 앱에서 API 호출
2. **사용자 인증**: JWT 토큰 기반 인증 추가
3. **프리미엄 기능**: 구독 모델 구현
4. **모니터링**: Sentry, DataDog 등 연동

**Railway URL**: https://your-app.railway.app  
**API 문서**: https://your-app.railway.app/health  
**MCP 엔드포인트**: https://your-app.railway.app/mcp
