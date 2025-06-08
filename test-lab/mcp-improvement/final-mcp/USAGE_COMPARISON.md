# 🔄 MCP 시스템 사용 방식 비교

## 🎯 두 가지 접근 방식

### 1️⃣ **Cursor/Claude Desktop 방식**

```
Cursor/Claude → mcp.json → Local MCP Server (stdio)
```

#### 장점

- ✅ 로컬 실행으로 빠름
- ✅ AI 도구와 직접 연동
- ✅ 개인용으로 최적화

#### 단점

- ❌ 설치/설정 복잡
- ❌ 단일 사용자만 가능
- ❌ API 키 로컬 노출

#### 사용법

```json
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "youtube-shorts-ai": {
      "command": "node",
      "args": ["/path/to/correct-mcp-server.js"],
      "env": {
        "YOUTUBE_API_KEY": "your-key",
        "ANTHROPIC_API_KEY": "your-key"
      }
    }
  }
}
```

**사용 예시:**

```
사용자: @youtube-shorts-ai "재미있는 먹방 영상 찾아줘"
Claude: YouTube에서 먹방 관련 Shorts를 검색해드리겠습니다...
```

### 2️⃣ **Railway 웹 서비스 방식**

```
Frontend → HTTP API → Railway MCP Host → MCP Server
```

#### 장점

- ✅ 다중 사용자 지원
- ✅ 웹/모바일 앱 연동
- ✅ 클라우드 확장성
- ✅ API 키 서버 보호

#### 단점

- ❌ 네트워크 지연
- ❌ 서버 운영 비용
- ❌ 복잡한 아키텍처

#### 사용법

```javascript
// 프론트엔드에서 HTTP API 호출
const response = await fetch("https://your-app.railway.app/api/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "재미있는 먹방 영상",
    options: { maxResults: 10 },
  }),
});

const data = await response.json();
console.log(data.results.videos);
```

**사용 예시:**

```javascript
// React 컴포넌트
function VideoSearch() {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState([]);

  const handleSearch = async () => {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    setVideos(data.results.videos);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="영상 검색..."
      />
      <button onClick={handleSearch}>검색</button>

      {videos.map((video) => (
        <div key={video.id}>
          <h3>{video.title}</h3>
          <p>{video.channel}</p>
          <a href={video.url}>영상 보기</a>
        </div>
      ))}
    </div>
  );
}
```

## 🎯 **언제 어떤 방식을 선택할까?**

### Cursor/Claude Desktop 방식 추천

- 🎯 **개인 개발자**
- 🎯 **프로토타입 제작**
- 🎯 **AI 도구 내 사용**
- 🎯 **로컬 환경 선호**

### Railway 웹 서비스 방식 추천

- 🎯 **상용 서비스 개발**
- 🎯 **다중 사용자 지원**
- 🎯 **웹/모바일 앱**
- 🎯 **클라우드 배포**

## 🧪 **실제 테스트 방법**

### 1. Cursor 방식 테스트

```bash
# 1. API 키 설정
export YOUTUBE_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"

# 2. MCP 서버 실행
cd /path/to/final-mcp
node correct-mcp-server.js

# 3. Cursor에서 @youtube-shorts-ai 사용
```

### 2. Railway 방식 테스트

```bash
# 1. 시스템 실행
npm run dev

# 2. API 테스트
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "먹방"}'

# 3. 대화형 검색 테스트
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "오늘 우울한데 기분 좋아지는 영상 추천해줘"}'
```

## 🔧 **문제 해결**

### 공통 문제

- **API 키 미설정**: 환경 변수 확인
- **포트 충돌**: 다른 포트 사용
- **의존성 오류**: `npm install` 재실행

### Cursor 방식 문제

- **mcp.json 위치**: `~/.cursor/mcp.json` 확인
- **절대 경로**: 파일 경로 정확히 입력
- **Cursor 재시작**: 설정 변경 후 재시작 필요

### Railway 방식 문제

- **서버 연결 실패**: MCP Transport 복잡성
- **HTTP 426 오류**: Streamable HTTP 구현 이슈
- **환경 변수**: Railway 대시보드에서 설정

## 💡 **추천 구현 순서**

### 개발 단계

1. **로컬 테스트**: Cursor 방식으로 MCP 서버 검증
2. **API 설계**: REST API 엔드포인트 설계
3. **프론트엔드**: React/Vue로 UI 구현
4. **배포**: Railway에 클라우드 배포

### 실제 적용

```
Phase 1: Cursor MCP (개발/테스트)
         ↓
Phase 2: Railway API (프로덕션)
         ↓
Phase 3: 모바일 앱 (확장)
```

## 🎉 **결론**

두 방식 모두 장단점이 있으며, 목적에 따라 선택하면 됩니다:

- **개인/팀 내부**: Cursor MCP 방식
- **상용 서비스**: Railway API 방식

우리가 만든 시스템은 **두 방식 모두 지원**하므로, 상황에 맞게 활용하시면 됩니다! 🚀
