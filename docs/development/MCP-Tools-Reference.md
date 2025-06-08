# 🤖 MCP 시스템 도구 종합 가이드

## 📋 **개요**

**YouTube Shorts AI 큐레이션 서비스**의 **MCP (Model Context Protocol) 시스템**에 구현된 모든 도구들과 엔드포인트를 정리한 종합 참조 문서입니다.

**업데이트**: 2025년 6월 8일  
**MCP 서버 URL**: `http://mcp-service.railway.internal:8080` (Railway Private Network)  
**백엔드 연동**: Railway Private Network를 통한 HTTP 통신

---

## 🏗️ **MCP 시스템 아키텍처**

```
Frontend (Vanilla JS SPA)
    ↓ HTTP REST API
Backend (Express.js)
    ↓ Railway Private Network
MCP Server (Express.js + Claude API)
    ↓ External APIs
Claude API + YouTube Data API v3
```

### **구성 요소**

- **MCP Server**: `mcp-server/railway-mcp-host.js` (Express.js 기반)
- **백엔드 통합**: `backend/services/mcpIntegrationService.js`
- **프론트엔드 연동**: `backend/routes/videoRoutes.js`

---

## 🛠️ **구현된 MCP 도구 목록**

### **1. 🧠 Claude AI 자연어 처리 도구**

#### `optimizeQueryWithClaude` ✅ **구현 완료**

**기능**: 사용자의 자연어 입력을 YouTube 검색에 최적화된 키워드로 변환

**입력 형식**:

```javascript
{
  "userQuery": "오늘 우울한데 기분 좋아지는 영상 보고 싶어"
}
```

**출력 형식**:

```javascript
{
  "query": "기분 전환 힐링 영상 shorts",
  "keywords": ["힐링", "기분전환", "치유", "위로"],
  "intent": "감정 치유를 위한 힐링 콘텐츠 검색",
  "analysis": "우울한 감정 상태를 개선하기 위한 긍정적 콘텐츠 추천"
}
```

**사용 예시**:

```javascript
const result = await mcpIntegrationService.optimizeQuery(
  "오늘 우울한데 기분 좋아지는 영상 보고 싶어"
);
```

---

### **2. 🎬 YouTube 영상 검색 도구**

#### `searchYouTubeDirectly` ✅ **구현 완료**

**기능**: 2단계 필터링을 통한 재생 가능한 YouTube Shorts 검색

**처리 과정**:

1. **1단계**: `search.list` API로 후보 영상 검색 (100 units)
2. **2단계**: `videos.list` API로 상세 정보 조회 (7 units)
3. **3단계**: 재생 가능 여부 필터링
   - `embeddable: true`
   - `privacyStatus: 'public'`
   - `duration ≤ 60초`
   - 지역 차단 확인

**입력 형식**:

```javascript
{
  "query": "댄스",
  "options": {
    "maxResults": 10,
    "order": "relevance",
    "regionCode": "KR"
  }
}
```

**출력 형식**:

```javascript
{
  "videos": [
    {
      "id": "videoId123",
      "title": "댄스 영상 제목",
      "channel": "채널명",
      "description": "영상 설명...",
      "thumbnailUrl": "https://...",
      "duration": 25,
      "viewCount": 50000,
      "url": "https://www.youtube.com/shorts/videoId123"
    }
  ],
  "totalResults": 8,
  "apiUnitsUsed": 107
}
```

---

### **3. 💬 대화형 AI 검색 도구**

#### `handleChatSearch` ✅ **구현 완료**

**기능**: 자연어 대화를 통한 지능형 영상 추천

**처리 과정**:

1. **대화 맥락 분석**: 검색 의도 파악
2. **검색어 추출**: 자연어에서 핵심 키워드 추출
3. **영상 검색**: 최적화된 쿼리로 영상 검색
4. **응답 생성**: 사용자 친화적 응답 메시지 생성

**입력 형식**:

```javascript
{
  "message": "피곤해서 힐링되는 영상 보고 싶어",
  "conversationHistory": []
}
```

**출력 형식**:

```javascript
{
  "message": "힐링이 필요하시군요! 편안한 자연 소리나 ASMR 영상을 찾아드릴게요 😊",
  "analysis": {
    "needsSearch": true,
    "searchQuery": "힐링 ASMR 자연소리",
    "userIntent": "피로 해소를 위한 힐링 콘텐츠 요청"
  },
  "searchResults": {
    "videos": [...],
    "totalResults": 8
  },
  "hasVideoResults": true
}
```

---

### **4. 📈 트렌드 키워드 조회 도구**

#### `getTrendingKeywords` ⚠️ **기본 구현 (Bright Data 연동 필요)**

**기능**: 지역별, 카테고리별 트렌딩 키워드 조회

**현재 상태**: Fallback 데이터 사용 중 (실제 Bright Data API 연동 필요)

**입력 형식**:

```javascript
{
  "region": "KR",
  "category": "entertainment"
}
```

**출력 형식**:

```javascript
{
  "trends": [
    { "keyword": "먹방", "score": 85, "searchVolume": 50000, "growthRate": 15 },
    { "keyword": "댄스", "score": 80, "searchVolume": 45000, "growthRate": 12 }
  ],
  "region": "KR",
  "category": "entertainment",
  "source": "fallback", // TODO: "bright_data"로 변경 필요
  "updatedAt": "2025-06-08T16:00:00.000Z"
}
```

---

## 🌐 **MCP 서버 API 엔드포인트**

### **Base URL**: `http://mcp-service.railway.internal:8080`

### **1. 헬스 체크**

```http
GET /health
```

**응답**:

```javascript
{
  "status": "ok",
  "service": "Railway MCP Host",
  "timestamp": "2025-06-08T16:00:00.000Z",
  "config": {
    "hasClaudeAPI": true,
    "hasYouTubeAPI": true,
    "hasBrightData": false // TODO: true로 변경 필요
  }
}
```

### **2. YouTube Shorts 검색**

```http
POST /api/search
Content-Type: application/json

{
  "query": "댄스",
  "options": {
    "maxResults": 10,
    "order": "relevance"
  }
}
```

### **3. AI 대화형 검색**

```http
POST /api/chat
Content-Type: application/json

{
  "message": "오늘 우울한데 기분 좋아지는 영상 보고 싶어",
  "conversationHistory": []
}
```

### **4. 트렌드 키워드 조회**

```http
GET /api/trends?region=KR&category=entertainment
```

---

## 🔧 **백엔드 통합 API**

### **Base URL**: `https://momentum-production-68bb.up.railway.app/api/v1/videos`

### **MCP 활용 엔드포인트**

#### **1. 기본 검색** (MCP 통합)

```http
GET /search?q=댄스&maxResults=10
```

#### **2. AI 대화형 검색** (MCP 통합)

```http
POST /ai-search
Content-Type: application/json

{
  "message": "오늘 우울한데 기분 좋아지는 영상 보고 싶어",
  "useAI": true
}
```

#### **3. 스마트 검색** (MCP 통합)

```http
POST /search-smart
Content-Type: application/json

{
  "keyword": "힐링",
  "userTier": "premium",
  "enableExpansion": true,
  "maxResults": 20
}
```

#### **4. 지능형 검색** (MCP 통합)

```http
POST /intelligent-search
Content-Type: application/json

{
  "query": "피곤해서 힐링되는 영상 보고 싶어",
  "userTier": "premium",
  "allowWorkflowSteps": true
}
```

#### **5. MCP 상태 확인**

```http
GET /mcp-status
```

---

## 🎯 **요청하신 4가지 기능 구현 상태**

### **1. Claude API를 이용한 키워드 추출** ✅ **완료**

**구현 위치**: `mcp-server/railway-mcp-host.js` → `optimizeQueryWithClaude()`

**기능**:

- ✅ 자연어 입력 분석
- ✅ 핵심 키워드 추출
- ✅ 검색 의도 파악
- ✅ YouTube 최적화된 쿼리 생성

**사용 예시**:

```javascript
// 입력: "오늘 우울한데 기분 좋아지는 영상 보고 싶어"
// 출력: {
//   query: "기분 전환 힐링 영상 shorts",
//   keywords: ["힐링", "기분전환", "치유"],
//   intent: "감정 치유를 위한 힐링 콘텐츠 검색"
// }
```

---

### **2. Bright Data MCP를 이용한 키워드 관련 다양한 키워드 검색** ❌ **미구현**

**현재 상태**: Fallback 데이터만 사용

**필요한 작업**:

```javascript
// TODO: Bright Data API 연동 필요
async getTrendingKeywords(region, category) {
  // ❌ 현재: 하드코딩된 fallback 데이터
  const fallbackTrends = [
    { keyword: '먹방', score: 85 },
    { keyword: '댄스', score: 80 }
  ];

  // ✅ 구현 필요: Bright Data API 호출
  const brightDataResponse = await axios.get('https://api.brightdata.com/trends', {
    params: { region, category },
    headers: { 'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_KEY}` }
  });

  return brightDataResponse.data;
}
```

**추가 구현 필요 기능**:

- [ ] 관련 키워드 확장 (Related Keywords)
- [ ] 검색 볼륨 분석
- [ ] 트렌드 성장률 분석
- [ ] 경쟁 키워드 분석

---

### **3. 키워드 기반 유동적인 YouTube API 쿼리 스트링 생성** ❌ **미구현**

**현재 상태**: 단순한 쿼리만 사용

**현재 구현**:

```javascript
// ❌ 단순한 쿼리
const searchResponse = await axios.get(
  "https://www.googleapis.com/youtube/v3/search",
  {
    params: {
      q: optimizedQuery.query, // 단일 키워드만 사용
      type: "video",
      videoDuration: "short",
    },
  }
);
```

**필요한 구현**:

```javascript
// ✅ 유동적인 쿼리 생성 함수 (구현 필요)
function buildDynamicQuery(keywords, options = {}) {
  const { useOR = true, includeNegative = true, boostRecent = true } = options;

  let query = "";

  // OR 연산자 사용
  if (useOR && keywords.length > 1) {
    query = keywords.slice(0, 3).join(" OR ");
  } else {
    query = keywords[0];
  }

  // 부정 키워드 추가
  if (includeNegative) {
    query += " -광고 -스팸";
  }

  // 최신 영상 우선
  if (boostRecent) {
    query += " after:2024-01-01";
  }

  return query;
}

// 사용 예시
const dynamicQuery = buildDynamicQuery(["댄스", "케이팝", "커버"], {
  useOR: true,
  includeNegative: true,
});
// 결과: "댄스 OR 케이팝 OR 커버 -광고 -스팸 after:2024-01-01"
```

**추가 구현 필요 기능**:

- [ ] OR 연산자를 이용한 다중 키워드 검색
- [ ] 부정 키워드 필터링 (`-광고`, `-스팸`)
- [ ] 시간 범위 필터링 (`after:2024-01-01`)
- [ ] 채널 특정 검색 (`channel:채널명`)
- [ ] 키워드 가중치 적용

---

### **4. API를 통한 영상 리스트 검색 → 필터링 → 개수 부족할 경우 다음 페이지 영상 검색** ❌ **미구현**

**현재 상태**: 단일 페이지만 검색

**현재 구현**:

```javascript
// ❌ 단일 페이지만 검색
const searchResponse = await axios.get(
  "https://www.googleapis.com/youtube/v3/search",
  {
    params: {
      maxResults: options.maxResults || 20, // 고정된 결과 수
    },
  }
);
```

**필요한 구현**:

```javascript
// ✅ 페이지네이션 검색 함수 (구현 필요)
async function searchWithPagination(query, targetCount = 10, maxPages = 3) {
  let allVideos = [];
  let nextPageToken = null;
  let currentPage = 0;

  while (allVideos.length < targetCount && currentPage < maxPages) {
    // 1단계: search.list 호출
    const searchResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          q: query,
          type: "video",
          videoDuration: "short",
          maxResults: 50, // 페이지당 최대
          pageToken: nextPageToken,
        },
      }
    );

    const searchResults = searchResponse.data.items || [];

    // 2단계: videos.list로 상세 정보 조회
    const videoIds = searchResults.map((item) => item.id.videoId);
    const detailedVideos = await getVideoDetails(videoIds);

    // 3단계: 재생 가능한 영상만 필터링
    const playableVideos = detailedVideos.filter((video) => isPlayable(video));

    allVideos.push(...playableVideos);
    nextPageToken = searchResponse.data.nextPageToken;
    currentPage++;

    // 더 이상 페이지가 없으면 중단
    if (!nextPageToken) break;

    console.log(
      `📄 페이지 ${currentPage}: ${playableVideos.length}개 발견 (총 ${allVideos.length}개)`
    );
  }

  return allVideos.slice(0, targetCount);
}
```

**추가 구현 필요 기능**:

- [ ] 페이지네이션 토큰 관리
- [ ] 동적 결과 수 조정
- [ ] 중복 영상 제거
- [ ] API 할당량 효율 관리
- [ ] 점진적 필터링 강화

---

## 🔄 **백엔드 MCP 통합 서비스**

### **mcpIntegrationService.js 주요 메서드**

#### **연결 관리**

- `testConnection()` - MCP 서버 연결 테스트
- `ensureConnection()` - 자동 재연결
- `getStatus()` - 연결 상태 확인

#### **도구 호출**

- `searchVideos(query, maxResults, nextPageToken)` - 영상 검색
- `getTrendingKeywords(region, category, limit)` - 트렌드 조회
- `optimizeQuery(userMessage, context)` - 쿼리 최적화
- `getServerStats()` - 서버 상태 조회

#### **워크플로우**

- `executeAICurationWorkflow(query, userId)` - 4단계 AI 큐레이션
- `enhancedSearch(keyword, options)` - 향상된 검색
- `extractKeywords(message, options)` - 안전한 키워드 추출

#### **유틸리티**

- `generateResponse(keywords, videoCount, originalMessage)` - 응답 생성
- `analyzeTrends(category)` - 트렌드 분석
- `getTimeContext()` - 시간 컨텍스트

---

## 📊 **성능 지표 및 모니터링**

### **API 사용량**

- **기본 검색**: 107 units (search.list: 100 + videos.list: 7)
- **대화형 검색**: 107 units + Claude API 호출
- **일일 할당량**: 10,000 units (목표 사용량: < 8,000 units)

### **응답 시간**

- **기본 검색**: ~3-5초
- **AI 대화형 검색**: ~6-8초 (Claude API 처리 포함)
- **트렌드 조회**: ~1-2초

### **성공률**

- **필터링 성공률**: 70-85%
- **재생 가능 영상 비율**: 60-80%
- **MCP 연결 안정성**: 95%+

---

## 🚧 **개발 우선순위**

### **High Priority** (즉시 구현 필요)

1. **Bright Data MCP 연동** - 실시간 트렌드 데이터
2. **유동적 쿼리 생성** - OR 연산자, 부정 키워드
3. **페이지네이션 검색** - 결과 부족 시 자동 확장

### **Medium Priority** (다음 스프린트)

4. **관련 키워드 확장** - 검색 다양성 증대
5. **검색 결과 캐싱** - 성능 최적화
6. **사용자 개인화** - 시청 기록 기반 추천

### **Low Priority** (추후 고려)

7. **실시간 트렌드 알림**
8. **다국어 지원**
9. **고급 필터링 옵션**

---

## 🔧 **개발자 가이드**

### **MCP 서버 실행**

```bash
cd mcp-server
npm start
```

### **백엔드 서버 실행**

```bash
cd backend
npm start
```

### **MCP 연결 테스트**

```bash
curl -X GET "http://mcp-service.railway.internal:8080/health"
```

### **디버깅**

- **MCP 로그**: `console.log`를 통한 상세 로깅
- **연결 상태**: `/api/v1/videos/mcp-status` 엔드포인트
- **성능 모니터링**: 각 API 호출 시간 측정

---

## 📞 **문의 및 지원**

**개발팀**: Wave Team  
**문서 버전**: 1.0.0  
**마지막 업데이트**: 2025년 6월 8일

**관련 문서**:

- [MCP 시스템 가이드](MCP-System-Guide.md)
- [YouTube API 최적화 가이드](../always_applied_workspace_rules.md)
- [백엔드 API 참조](../basic/README.md)

---

**🎯 다음 구현 목표**: Bright Data MCP 연동을 통한 실시간 트렌드 키워드 확장 검색 기능 완성
