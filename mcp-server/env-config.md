# 🔧 환경 변수 설정 가이드

이 MCP 서버를 실행하기 위해 필요한 환경 변수들을 설정해주세요.

## 필수 환경 변수

### `.env` 파일 생성

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# YouTube Data API v3 (필수)
YOUTUBE_API_KEY=AIzaYour-YouTube-API-Key-Here

# Anthropic Claude API (필수)
ANTHROPIC_API_KEY=sk-ant-your-claude-api-key

# Bright Data API (선택사항 - 트렌드 기능용)
BRIGHT_DATA_API_KEY=your-bright-data-api-key
BRIGHT_DATA_PROXY_ENDPOINT=https://your-bright-data-proxy-endpoint.com/api

# MCP 서버 설정 (선택사항)
MCP_TRANSPORT=stdio  # 또는 http
PORT=3000           # HTTP 모드일 때만 사용
```

## API 키 발급 방법

### 1. YouTube Data API v3 키 발급

1. [Google Cloud Console](https://console.cloud.google.com/) 이동
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" > "라이브러리" 이동
4. "YouTube Data API v3" 검색 후 활성화
5. "API 및 서비스" > "사용자 인증 정보" 이동
6. "+ 사용자 인증 정보 만들기" > "API 키" 선택
7. 생성된 API 키를 `YOUTUBE_API_KEY`에 설정

**중요**: API 키 보안을 위해 IP 제한이나 API 제한을 설정하는 것을 권장합니다.

### 2. Anthropic Claude API 키 발급

1. [Anthropic Console](https://console.anthropic.com/) 이동
2. 계정 생성/로그인
3. API 키 생성
4. 생성된 키를 `ANTHROPIC_API_KEY`에 설정

**참고**: Claude API는 유료 서비스이며, 사용량에 따라 요금이 부과됩니다.

### 3. Bright Data API (선택사항)

1. [Bright Data](https://brightdata.com/) 계정 생성
2. 프록시 서비스 구독
3. API 키 및 프록시 엔드포인트 설정
4. `BRIGHT_DATA_API_KEY`와 `BRIGHT_DATA_PROXY_ENDPOINT` 설정

**참고**: Bright Data 없이도 기본 트렌드 데이터로 동작합니다.

## 환경 변수 확인

다음 명령으로 환경 변수가 올바르게 설정되었는지 확인할 수 있습니다:

```bash
node -e "
require('dotenv').config();
console.log('YouTube API:', process.env.YOUTUBE_API_KEY ? '✅ 설정됨' : '❌ 없음');
console.log('Claude API:', process.env.ANTHROPIC_API_KEY ? '✅ 설정됨' : '❌ 없음');
console.log('Bright Data:', process.env.BRIGHT_DATA_API_KEY ? '✅ 설정됨' : '❌ 없음');
"
```

## 실행 명령

환경 변수 설정 후 다음 명령으로 MCP 서버를 실행하세요:

```bash
# stdio 모드 (Claude Desktop용)
npm start

# HTTP 모드 (웹 서비스용)
npm run start:http

# 클라이언트 테스트
npm test
```

## 문제 해결

### API 키 오류

- YouTube API 키가 올바른지 확인
- Claude API 키가 `sk-ant-`로 시작하는지 확인
- API 할당량이 남아있는지 확인

### 권한 오류

- Google Cloud Console에서 YouTube Data API v3가 활성화되어 있는지 확인
- API 키에 필요한 권한이 있는지 확인

### 네트워크 오류

- 방화벽 설정 확인
- 프록시 설정 확인 (필요시)
