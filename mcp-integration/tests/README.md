# 🧪 MCP 서버 테스트 스크립트

Momentum의 MCP 서버들이 제대로 작동하는지 테스트하는 스크립트입니다.

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
cd test-lab/mcp-test
npm install
```

### 2. 환경 변수 설정

프로젝트 루트의 `.env` 파일에 다음 변수들이 설정되어 있는지 확인:

```env
# 필수
YOUTUBE_API_KEY=your_youtube_api_key
ANTHROPIC_API_KEY=your_claude_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# 선택사항
SERPAPI_KEY=your_serpapi_key
```

### 3. 테스트 실행

```bash
# 전체 테스트 실행
npm test

# 또는 개별 테스트
npm run test-youtube      # YouTube Curator MCP 테스트
npm run test-analytics    # User Analytics MCP 테스트
npm run test-workflow     # AI 워크플로우 테스트
```

## 📋 테스트 항목

### 🎬 YouTube Curator MCP

- ✅ 서버 연결 및 도구 목록 조회
- ✅ 키워드 확장 기능 (`expand_keyword`)
- ✅ 쿼리 최적화 기능 (`build_optimized_queries`)
- ✅ 재생가능 영상 검색 (`search_playable_shorts`)
- ✅ 비디오 메타데이터 분석 (`analyze_video_metadata`)

### 📊 User Analytics MCP

- ✅ 서버 연결 및 도구 목록 조회
- ✅ 인기 검색어 추출 (`get_popular_keywords`)
- ✅ 실시간 트렌드 분석 (`get_realtime_trends`)
- ✅ 검색 활동 로깅 (`log_search_activity`)
- ✅ 사용자 패턴 분석 (`analyze_user_patterns`)
- ✅ 카테고리별 트렌드 (`get_category_trends`)
- ✅ 트렌딩 키워드 예측 (`predict_trending_keywords`)

### 🔗 통합 MCP 클라이언트

- ✅ 모든 MCP 서버 동시 연결
- ✅ 통합 워크플로우 실행
- ✅ AI 큐레이션 파이프라인 테스트

## 🎯 예상 결과

성공적으로 실행되면 다음과 같은 결과를 볼 수 있습니다:

```
🧪 MCP 서버 테스트 시작

📋 환경 변수 확인 중...
  ✅ YOUTUBE_API_KEY: AIza***xyz9
  ✅ ANTHROPIC_API_KEY: sk-a***123
  ✅ SUPABASE_URL: https://*****.supabase.co
  ✅ SUPABASE_SERVICE_ROLE_KEY: eyJh***abc

🎬 YouTube Curator MCP 테스트 중...
  📡 YouTube Curator MCP 서버에 연결 중...
  ✅ 연결 성공!
  ✅ 4개 도구 발견
  ✅ 키워드 확장 성공: 먹방 → 먹방 리뷰, 맛집 탐방, 요리 먹방...
  ✅ 쿼리 최적화 성공: 5개 쿼리 생성
  ✅ 영상 검색 성공: 3개 영상 발견

📊 User Analytics MCP 테스트 중...
  📡 User Analytics MCP 서버에 연결 중...
  ✅ 연결 성공!
  ✅ 6개 도구 발견
  ✅ 인기 검색어 조회 성공
  ✅ 실시간 트렌드 조회 성공
  ✅ 검색 활동 로깅 성공

🔗 통합 MCP 클라이언트 테스트 중...
  ✅ 모든 MCP 서버 연결 성공!
  ✅ 통합 워크플로우 테스트 성공

🎯 전체 테스트 결과:
  🎉 모든 테스트 성공! MCP 아키텍처가 정상 작동합니다.
```

## 🐛 문제 해결

### 일반적인 오류들

#### 1. 환경 변수 누락

```
❌ YOUTUBE_API_KEY: 설정되지 않음
```

→ `.env` 파일에 해당 API 키를 추가하세요.

#### 2. MCP 서버 연결 실패

```
❌ YouTube Curator MCP 테스트 실패: spawn ENOENT
```

→ Node.js 버전이 18 이상인지 확인하고, 의존성을 다시 설치하세요.

#### 3. YouTube API 할당량 초과

```
❌ quotaExceeded
```

→ YouTube API 할당량을 확인하거나 다음날 다시 시도하세요.

#### 4. Supabase 연결 오류

```
❌ Database connection failed
```

→ Supabase URL과 서비스 키가 올바른지 확인하세요.

### 디버깅 모드

더 자세한 로그를 보려면:

```bash
DEBUG=* npm test
```

## 📞 지원

테스트 중 문제가 발생하면:

1. **GitHub Issues**에 오류 로그와 함께 리포트
2. 환경 변수 설정 재확인
3. Node.js 버전 확인 (18+ 필요)
4. 의존성 재설치: `rm -rf node_modules && npm install`

---

**Wave Team** 🌊
