# 🔑 API 키 설정 가이드 - Momentum by Wave Team

## 📋 필수 API 키 설정

### 1. 🎬 YouTube Data API v3 키 발급

#### Google Cloud Console 설정:

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **새 프로젝트 생성** 또는 기존 프로젝트 선택
3. **API 및 서비스 > 라이브러리** 이동
4. **"YouTube Data API v3"** 검색 후 **사용 설정**
5. **API 및 서비스 > 사용자 인증 정보** 이동
6. **+ 사용자 인증 정보 만들기 > API 키** 선택
7. 생성된 API 키를 복사

#### .env 파일에 추가:

```bash
YOUTUBE_API_KEY=AIzaSyD_your_actual_api_key_here
```

#### 💡 중요 사항:

- **일일 할당량**: 10,000 units (무료)
- **할당량 모니터링**: [API Console](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas)에서 확인
- **키 보안**: API 키는 절대 공개하지 마세요

### 2. 🗄️ Supabase 프로젝트 설정

#### Supabase 프로젝트 생성:

1. [Supabase](https://supabase.com/) 접속 및 회원가입
2. **New project** 클릭
3. 프로젝트 이름: `momentum-youtube-curator`
4. 데이터베이스 비밀번호 설정
5. 리전 선택 (Seoul - 아시아 태평양 동북쪽 권장)

#### API 키 확인:

1. 프로젝트 생성 완료 후 **Settings > API** 이동
2. **Project URL**과 **anon public** 키 복사

#### .env 파일에 추가:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ⚙️ 선택적 API 키 설정

### 3. 🤖 Claude API (MCP 연동용)

#### Anthropic API 키 발급:

1. [Anthropic Console](https://console.anthropic.com/) 접속
2. **Create Key** 클릭
3. API 키 복사

#### .env 파일에 추가:

```bash
CLAUDE_API_KEY=sk-ant-api03-your_claude_key_here
```

### 4. 🌐 Bright Data API (웹 스크래핑용)

#### Bright Data 설정:

1. [Bright Data](https://brightdata.com/) 가입
2. API 키 발급
3. .env 파일에 추가

---

## 🚀 설정 완료 후 테스트

### 1. 서버 재시작:

```bash
# backend 디렉토리에서
npm run dev
```

### 2. 테스트 페이지 확인:

- 브라우저에서 `test-page.html` 열기
- **"YouTube 서비스 상태"** 버튼 클릭
- `apiKeyConfigured: true` 확인

### 3. 기능 테스트:

- **Shorts 검색**: "funny" 검색해보기
- **카테고리별 검색**: "음악" 버튼 클릭
- **인기 영상**: 트렌딩 영상 가져오기

---

## 📊 API 할당량 관리

### YouTube API 할당량:

- **일일 한도**: 10,000 units
- **검색 1회**: 100 units
- **영상 상세 정보**: 1 unit (50개당)

### 할당량 최적화:

- **캐시 활용**: 1시간 TTL로 중복 요청 방지
- **효율적 검색**: 3배수 검색으로 Shorts 비율 최적화
- **할당량 모니터링**: 실시간 사용량 추적

---

## 🔒 보안 주의사항

### API 키 보안:

1. **.env 파일**은 절대 Git에 커밋하지 마세요
2. **프로덕션 환경**에서는 환경 변수로 설정
3. **API 키 노출 시** 즉시 재발급

### .gitignore 확인:

```gitignore
# Environment variables
.env
.env.local
.env.production
```

---

## 🆘 문제 해결

### YouTube API 오류:

- **403 Forbidden**: API 키 확인 및 YouTube API 활성화 여부
- **429 Quota Exceeded**: 일일 할당량 초과, 내일 다시 시도
- **400 Bad Request**: 검색 매개변수 확인

### Supabase 연결 오류:

- **URL 형식**: `https://your-project.supabase.co` 형식인지 확인
- **키 유효성**: anon key가 올바른지 확인

### 서버 실행 오류:

- **.env 파일 위치**: backend/ 디렉토리에 있는지 확인
- **필수 변수**: YOUTUBE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY 설정 여부

---

## 📞 지원

설정 중 문제가 발생하면:

1. **테스트 페이지**에서 오류 메시지 확인
2. **서버 로그** 확인 (`npm run dev` 출력)
3. **API 키 형식** 재확인

---

**🌊 Wave Team | ⚡ Momentum Project**
