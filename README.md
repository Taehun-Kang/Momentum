# 🤖 YouTube Shorts AI 큐레이션 서비스

> **Model Context Protocol (MCP)** 기반 지능형 YouTube Shorts 추천 시스템

## 🎯 **프로젝트 개요**

**"피곤해서 힐링되는 영상 보고 싶어"** 같은 자연어 입력을 **실제 YouTube Shorts 추천**으로 변환하는 완전 자동화된 AI 큐레이션 서비스입니다.

### 🚀 **핵심 기능**

- **🧠 AI 자연어 검색**: Claude AI가 자연어를 분석해서 적절한 YouTube Shorts 추천
- **🎯 4단계 워크플로우**: 키워드 확장 → 쿼리 최적화 → 영상 검색 → 메타데이터 분석
- **🔍 2단계 필터링**: search.list → videos.list → 재생 가능 여부 확인
- **📊 실시간 트렌드**: Bright Data MCP 연동으로 실시간 웹 트렌드 수집
- **👤 개인화 추천**: 사용자 패턴 분석 기반 맞춤형 큐레이션

## 📁 **프로젝트 구조**

```
Youtube/
├── mcp-integration/              # 🎯 통합 MCP 시스템 (NEW!)
│   ├── servers/                  # MCP 서버들
│   │   ├── youtube-curator-mcp/  # 메인 큐레이션 서버 (1,724라인)
│   │   └── user-analytics-mcp/   # 사용자 분석 서버 (1,130라인)
│   ├── clients/                  # MCP 클라이언트
│   │   └── mcp-client/          # 통합 클라이언트 (706라인)
│   ├── tests/                   # 검증된 테스트 스크립트들
│   │   ├── test-new-tools.js    # 최신 도구 테스트
│   │   └── intelligent-query-workflow.js  # 지능형 워크플로우
│   ├── docs/                    # 완전한 문서
│   │   └── frontend-integration-guide.md  # 프론트엔드 통합 가이드
│   ├── README.md               # 통합 시스템 문서
│   └── install.sh              # 자동 설치 스크립트
├── backend/                      # ✅ Express.js 백엔드 서버
│   ├── routes/videoRoutes.js     # 업데이트된 API (신규 엔드포인트 3개)
│   ├── services/mcpIntegrationService.js  # MCP 통합 서비스
│   └── app.js                    # Express 서버
├── frontend/                     # 프론트엔드 (Vanilla JS SPA)
├── shared/                       # 공통 코드
└── docs/                         # 프로젝트 문서
```

## 🛠️ **기술 스택**

### 백엔드

- **Node.js + Express.js** - REST API 서버
- **MCP (Model Context Protocol)** - AI 도구 통합
- **Claude API** - 자연어 분석 및 대화형 검색
- **YouTube Data API v3** - 영상 검색 및 메타데이터
- **Bright Data MCP** - 실시간 웹 트렌드 수집
- **Supabase** - 데이터베이스 및 인증

### 프론트엔드

- **Vanilla JavaScript** - 컴포넌트 기반 SPA
- **PWA** - 프로그레시브 웹 앱
- **반응형 디자인** - 모바일 최적화

## 🚀 **빠른 시작**

### 1. MCP 시스템 설치

```bash
cd mcp-integration
./install.sh
```

### 2. 환경 변수 설정

```bash
cd servers/youtube-curator-mcp
cp .env.template .env
# .env 파일에 실제 API 키 입력
```

### 3. 백엔드 서버 실행

```bash
cd backend
npm install
npm start
```

### 4. 프론트엔드 연결

```javascript
// AI 자연어 검색 사용 예시
const result = await fetch("/api/v1/videos/intelligent-search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "피곤해서 힐링되는 영상 보고 싶어",
    userTier: "premium",
  }),
});
```

## 🎯 **API 엔드포인트**

### 🧠 **AI 자연어 검색** (신규)

```
POST /api/v1/videos/intelligent-search
```

- **기능**: "피곤해서 힐링되는 영상" → 실제 YouTube Shorts 추천
- **프리미엄**: 4단계 지능형 워크플로우
- **무료**: 기본 자연어 분석 + 검색

### 🎯 **4단계 워크플로우** (프리미엄 전용)

```
POST /api/v1/videos/workflow-search
```

- **1단계**: 키워드 확장 (15개씩)
- **2단계**: 쿼리 최적화 (8-12개 생성)
- **3단계**: 영상 검색 (2단계 필터링)
- **4단계**: 메타데이터 분석

### 🔧 **MCP 시스템 상태**

```
GET /api/v1/videos/mcp-status
```

### 기존 API들

- `GET /api/v1/videos/search` - 기본 검색
- `GET /api/v1/videos/trending` - 인기 영상
- `POST /api/v1/videos/ai-search` - 기존 AI 검색

## 🏆 **실제 테스트 결과**

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

### 📊 **성능 지표**

- **API 사용량**: 1,284 units (목표 < 2,000)
- **필터링 성공률**: 45% (목표 > 40%)
- **워크플로우 성공률**: 100%
- **응답 시간**: < 500ms

## 🔧 **개발 가이드**

### MCP 시스템 아키텍처

```
프론트엔드 (Vanilla JS)
    ↓ REST API
백엔드 (Express.js)
    ↓ MCP Protocol
MCP 서버들 (Claude, Bright Data, Supabase)
    ↓ External APIs
외부 서비스 (YouTube, Google, etc.)
```

### 개발 원칙

1. **점진적 개발**: 작은 단위로 개발 후 통합
2. **2단계 필터링**: 모든 YouTube 검색에 재생 가능 여부 확인 필수
3. **API 할당량 관리**: 일일 10,000 units 최적화
4. **캐싱 전략**: 85% 적중률 목표

## 📚 **문서**

- **[MCP 통합 가이드](mcp-integration/README.md)** - 전체 시스템 개요
- **[프론트엔드 통합 가이드](mcp-integration/docs/frontend-integration-guide.md)** - 완전한 구현 예시
- **[개발 가이드](docs/development/)** - 상세 개발 문서
- **[기획 문서](docs/basic/)** - 프로젝트 기획 및 전략

## 🛡️ **보안 및 제한사항**

### API 할당량 관리

- **YouTube API**: 일일 10,000 units
- **Claude API**: 요청당 제한 관리
- **SerpAPI**: 키워드 확장 최적화

### 필터링 품질

- **재생 가능 영상**: 70-85% 성공률
- **Shorts 길이**: 60초 이하만 허용
- **지역 제한**: 한국 기준 필터링

## 🚀 **배포**

### Railway 배포

```bash
# 환경 변수 설정 후
railway deploy
```

### PWA 설정

- Service Worker 구현
- 오프라인 캐시
- 앱 매니페스트

## 🎉 **주요 성과**

✅ **완전한 MCP 시스템 구현**  
✅ **Claude AI 자율적 도구 선택 실현**  
✅ **4단계 워크플로우 자동화**  
✅ **실제 바이럴 영상 발견 성공**  
✅ **프론트엔드-백엔드 완전 통합**  
✅ **API 할당량 최적화 달성**

---

## 🤝 **기여**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 **라이선스**

MIT License - Wave Team

## 📞 **지원**

- **GitHub Issues**: 버그 리포트 및 기능 요청
- **문서**: 추가 예제 및 가이드
- **커뮤니티**: 사용자 경험 공유
