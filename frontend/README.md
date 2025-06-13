# YouTube Shorts AI Curation Service - Frontend

YouTube Shorts AI 큐레이션 서비스의 프론트엔드 애플리케이션입니다.

## ✨ 기술 스택

- **Framework**: Vanilla JavaScript SPA
- **Bundler**: Parcel
- **Styling**: CSS with Variables (Glassmorphism Design)
- **Target**: 모바일 퍼스트 (430x932px)
- **Language**: 한국어 UI

## 🎨 디자인 시스템

- **Primary Color**: #9a78db (Purple)
- **Design Pattern**: Glassmorphism
- **Animation**: Smooth cubic-bezier transitions
- **Typography**: Apple System Fonts + Noto Sans KR
- **Theme**: Light/Dark mode support

## 🚀 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 에 접속하세요.

### 빌드

```bash
npm run build
```

### 프로덕션 서버

```bash
npm run serve
```

## 📱 기능

- **시간 기반 인사**: 시간대별 동적 메시지
- **AI 키워드 추천**: 기분/주제 기반 영상 추천
- **트렌딩 콘텐츠**: 실시간 인기 키워드
- **다크 모드**: 시스템 전체 테마 토글
- **모바일 최적화**: 터치 인터랙션, 네이티브 앱 준비

## 📁 프로젝트 구조

```
frontend/
├── src/
│   ├── main.js           # 앱 진입점
│   ├── App.js            # 메인 애플리케이션
│   ├── core/             # 핵심 시스템
│   ├── pages/            # 페이지 컴포넌트
│   ├── components/       # 재사용 컴포넌트
│   └── styles/           # 스타일 시스템
├── index.html            # HTML 진입점
└── package.json          # 프로젝트 설정
```

## 🎯 주요 페이지

- **Home**: 홈 페이지 (`src/pages/Home.js`)
- **ChatFlow**: 채팅 플로우 (`src/pages/ChatFlow.js`)
- **MyPage**: 마이 페이지 (`src/pages/MyPage.js`)
- **VideoPlayer**: 비디오 플레이어 (`src/pages/VideoPlayer/final/`)

## 🔧 개발 가이드

### 새 컴포넌트 추가

1. `src/components/` 에 컴포넌트 생성
2. Glassmorphism 디자인 적용
3. 모바일 반응형 고려
4. 터치 피드백 구현

### 스타일링 규칙

- CSS 변수 사용 (`src/styles/variables.css`)
- 모바일 퍼스트 접근
- 글래스모피즘 패턴 적용
- 터치 최적화 고려

## 📦 배포

이 프론트엔드는 독립적으로 배포 가능하며, 다음 환경에서 실행할 수 있습니다:

- **정적 호스팅**: Vercel, Netlify
- **CDN**: CloudFront, CloudFlare
- **네이티브 앱**: Capacitor로 래핑 가능

## 🛠️ 스크립트

- `npm run dev` - 개발 서버 시작
- `npm run build` - 프로덕션 빌드
- `npm run serve` - 빌드된 파일 서빙
- `npm run clean` - 캐시 및 빌드 파일 정리

## 📄 라이선스

MIT License
