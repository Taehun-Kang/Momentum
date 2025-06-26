# 🤖 YouTube Shorts AI 큐레이션 서비스

> **Claude AI 감정 분석** · **VQS 기반 고품질 영상 추천** · **4단계 대화형 워크플로우** · **Railway 배포**

## 🎯 **프로젝트 개요**

자연어 감정 입력("피곤해서 힐링되는 영상 보고 싶어")을 YouTube Shorts 추천으로 변환하는 AI 큐레이션 서비스입니다.

### 🚀 **핵심 기능**

- **🧠 Claude AI 감정 분석**: Anthropic Claude API 기반 자연어 감정 분석 및 키워드 추천
- **📊 VQS 품질 보장**: Video Quality Score 기반 고품질 영상 필터링
- **🎯 4단계 워크플로우**: 방식 선택 → 감정 입력 → 키워드 추천 → 영상 시청
- **🔍 2단계 필터링**: YouTube API search.list → videos.list → 재생 가능 여부 확인
- **📚 검증된 키워드 DB**: 236개 키워드와 프론트엔드 100% 매칭

## 🛠️ **기술 스택**

### 백엔드

- **Node.js + Express.js** - REST API 서버 (182개 엔드포인트)
- **Claude API** - 자연어 감정 분석
- **YouTube Data API v3** - 영상 검색 및 메타데이터
- **Supabase PostgreSQL** - 키워드 DB 및 영상 캐시
- **Railway** - 클라우드 배포

### 프론트엔드

- **Vanilla JavaScript** - 컴포넌트 기반 SPA (프레임워크 없음)
- **Hash 기반 라우터** - 클라이언트 사이드 라우팅
- **반응형 디자인** - 모바일 퍼스트

## 📁 **프로젝트 구조**

```
Youtube/
├── backend/                      # Express.js API 서버
│   ├── routes/v2/               # v2 API 엔드포인트
│   │   ├── emotionRoutes.js     # Claude AI 감정 분석
│   │   └── searchRoutes.js      # VQS 기반 검색
│   ├── services/
│   │   ├── v2_emotion/          # 감정 분석 서비스
│   │   ├── v2_search/           # VQS 검색 엔진
│   │   └── v2_cache/            # 영상 캐시 시스템
│   └── server.js
├── frontend/                     # Vanilla JS SPA
│   ├── src/
│   │   ├── pages/ChatFlow.js    # 4단계 대화형 UI
│   │   ├── pages/VideoPlayer/   # 영상 재생 시스템
│   │   └── services/v2/         # v2 API 클라이언트
│   └── index.html
└── docs/                         # 개발 문서
```

## 🚀 **배포**

### Railway 프로덕션

- **URL**: `https://momentum-production-68bb.up.railway.app`
- **상태**: 배포 완료, 24/7 운영 중

### 로컬 개발

```bash
# 환경 설정
git clone <repository-url>
cd Youtube

# 백엔드
cd backend
npm install
npm start  # PORT 3002

# 프론트엔드
cd frontend
npm install
npm start  # PORT 3000
```

### 환경 변수

```bash
# backend/.env
YOUTUBE_API_KEY=your_youtube_api_key
ANTHROPIC_API_KEY=your_claude_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
```

## 🎯 **API 엔드포인트**

### 감정 분석 API

```bash
POST /api/v2/emotion/recommend
{
  "userInput": "피곤해서 힐링되는 영상 보고 싶어",
  "inputType": "emotion"
}
```

### VQS 검색 API

```bash
POST /api/v2/search/batch
{
  "keywords": ["백색소음", "수면음악"],
  "limit": 50
}
```

## 🎨 **사용자 워크플로우**

```
1️⃣ 방식 선택     → 감정 기반 vs 주제 기반
2️⃣ 감정 입력     → 자연어로 현재 상태 표현
3️⃣ 키워드 추천   → Claude AI가 생성한 4개 감성 문장
4️⃣ 영상 시청     → VQS 필터링된 고품질 영상 재생
```

## 📊 **프로젝트 현황**

### 완료된 기능

- ✅ Railway 프로덕션 배포
- ✅ Claude AI 감정 분석 시스템
- ✅ VQS 기반 영상 품질 필터링
- ✅ 4단계 대화형 UI
- ✅ 236개 검증 키워드 DB
- ✅ Database API (146/149개 테스트 완료)
- ✅ 2단계 YouTube API 필터링

### 기술적 특징

- **VQS 점수**: 조회수, 좋아요, 댓글, 구독자 수 종합 평가
- **키워드 매칭**: 프론트엔드 컴포넌트와 DB 100% 호환
- **재생 가능**: embeddable, 지역 제한 등 사전 필터링
- **API 성공률**: 98.0% (Database API 테스트 결과)

## 🔧 **개발 가이드**

### 핵심 원칙

1. **v2 API 사용**: 새로운 기능은 v2 엔드포인트 기반
2. **키워드 배열 유지**: ChatFlow → VideoPlayer 간 배열 형태 전달
3. **2단계 필터링**: YouTube API 호출 시 재생 가능 여부 필수 확인

### 주요 컴포넌트

```javascript
// 감정 분석
import { emotionServiceV2 } from "./services/v2/emotionServiceV2.js";
const result = await emotionServiceV2.recommendKeywords(userInput);

// 영상 검색
import { searchServiceV2 } from "./services/v2/searchServiceV2.js";
const videos = await searchServiceV2.searchForVideoPlayer(keywords);
```

## 📚 **문서**

- **[백엔드 가이드](backend/BACKEND_ARCHITECTURE_GUIDE.md)** - API 구조 및 서비스
- **[프론트엔드 가이드](frontend/README.md)** - SPA 아키텍처
- **[YouTube API 가이드](docs/development/youtube-api-parameters.md)** - 필터링 전략

## 🚧 **향후 계획**

- [ ] 개인화 알고리즘 고도화
- [ ] 실시간 트렌드 키워드 시스템
- [ ] 모바일 앱 개발 (PWA → 네이티브)
- [ ] 소셜 기능 (공유, 플레이리스트)
