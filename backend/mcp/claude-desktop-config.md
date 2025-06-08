# 🤖 Claude Desktop 설정 가이드

이 가이드에 따라 Claude Desktop에서 YouTube Shorts AI 큐레이션 MCP 서버를 사용할 수 있습니다.

## Claude Desktop 설정

### 1. 설정 파일 위치

Claude Desktop의 설정 파일 `claude_desktop_config.json`을 찾으세요:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 2. 설정 파일 내용

`claude_desktop_config.json` 파일에 다음 내용을 추가하세요:

```json
{
  "mcpServers": {
    "youtube-shorts-ai": {
      "command": "node",
      "args": [
        "/절대경로/to/test-lab/mcp-improvement/final-mcp/correct-mcp-server.js"
      ],
      "env": {
        "YOUTUBE_API_KEY": "AIzaYour-YouTube-API-Key-Here",
        "ANTHROPIC_API_KEY": "sk-ant-your-claude-api-key",
        "BRIGHT_DATA_API_KEY": "your-bright-data-api-key",
        "BRIGHT_DATA_PROXY_ENDPOINT": "https://your-bright-data-proxy-endpoint.com/api"
      }
    }
  }
}
```

**중요**: `/절대경로/to/` 부분을 실제 프로젝트 경로로 변경하세요.

### 3. 경로 확인

현재 디렉토리의 절대 경로를 확인하려면:

```bash
# macOS/Linux
pwd
cd test-lab/mcp-improvement/final-mcp && pwd

# Windows
cd
cd test-lab\mcp-improvement\final-mcp && cd
```

### 4. 예시 설정 (완전한 경로)

```json
{
  "mcpServers": {
    "youtube-shorts-ai": {
      "command": "node",
      "args": [
        "/Users/username/Desktop/Youtube/test-lab/mcp-improvement/final-mcp/correct-mcp-server.js"
      ],
      "env": {
        "YOUTUBE_API_KEY": "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "ANTHROPIC_API_KEY": "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "BRIGHT_DATA_API_KEY": "optional-bright-data-key",
        "BRIGHT_DATA_PROXY_ENDPOINT": "https://brightdata-endpoint.com/api"
      }
    }
  }
}
```

## Claude Desktop에서 사용하기

Claude Desktop을 재시작한 후 다음과 같이 사용할 수 있습니다:

### 영상 검색

```
사용자: 재미있는 먹방 영상 찾아줘

Claude: YouTube Shorts에서 먹방 영상을 검색해드리겠습니다.

[search_videos 도구 실행]

현재 인기 있는 먹방 Shorts 영상 10개를 찾았습니다:

1. "ASMR 치킨 먹방 🍗" - 조회수 1.2M
   채널: 먹방요정
   URL: https://www.youtube.com/shorts/xxxxx

2. "매운 라면 챌린지 🌶️" - 조회수 850K
   채널: 매운맛킬러
   URL: https://www.youtube.com/shorts/xxxxx

...
```

### 트렌드 조회

```
사용자: 지금 트렌딩하는 키워드는 뭐야?

Claude: 현재 한국에서 트렌딩하는 키워드를 확인해드리겠습니다.

[get_trending_keywords 도구 실행]

현재 트렌딩 키워드 TOP 10:
1. 먹방 (점수: 85)
2. 댄스 챌린지 (점수: 80)
3. 브이로그 (점수: 75)
...
```

### 자연어 검색 최적화

```
사용자: 오늘 비 오는데 집에서 혼자 보기 좋은 따뜻한 영상

Claude: 비 오는 날 혼자 보기 좋은 따뜻한 영상을 찾아드리겠습니다.

[optimize_query 도구 실행]
[search_videos 도구 실행]

날씨에 맞는 힐링 영상들을 찾았습니다:
1. "빗소리와 함께하는 ASMR 카페" - 조회수 500K
2. "혼자만의 시간, 따뜻한 차 한 잔" - 조회수 320K
...
```

## 문제 해결

### MCP 서버가 연결되지 않는 경우

1. **경로 확인**: `args` 배열의 파일 경로가 정확한지 확인
2. **권한 확인**: 파일에 실행 권한이 있는지 확인
3. **Node.js 확인**: `node` 명령이 PATH에 있는지 확인
4. **API 키 확인**: 환경 변수의 API 키가 올바른지 확인

### 로그 확인

Claude Desktop의 로그를 확인하려면:

**macOS**: `~/Library/Logs/Claude/`
**Windows**: `%APPDATA%\Claude\logs\`

### 테스트 명령

MCP 서버가 독립적으로 작동하는지 확인:

```bash
cd test-lab/mcp-improvement/final-mcp
node correct-mcp-server.js
```

## 사용 가능한 기능

### Tools (도구)

- `search_videos`: YouTube Shorts 영상 검색
- `get_trending_keywords`: 실시간 트렌드 키워드 조회
- `optimize_query`: 자연어 쿼리 최적화
- `get_server_stats`: 서버 상태 및 통계

### Resources (리소스)

- `cache://searches`: 캐시된 검색 결과
- `trends://current`: 실시간 트렌드 데이터
- `reports://api-usage`: API 사용량 리포트

### Prompts (프롬프트)

- `optimize-search`: 검색 최적화 프롬프트
- `analyze-results`: 결과 분석 프롬프트
- `trend-recommendations`: 트렌드 기반 추천

Claude Desktop에서 이러한 기능들을 자연어로 요청하면 자동으로 적절한 도구가 선택되어 실행됩니다.
