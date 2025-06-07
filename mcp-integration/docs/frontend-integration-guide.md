# 🌐 프론트엔드 통합 가이드

> 백엔드 API를 활용한 YouTube Shorts 큐레이션 프론트엔드 구현

## 🎯 **API 엔드포인트 개요**

### ✅ **사용 가능한 API들**

1. **`POST /api/v1/videos/intelligent-search`** - 🧠 AI 자연어 검색 (신규)
2. **`POST /api/v1/videos/workflow-search`** - 🎯 4단계 워크플로우 (프리미엄)
3. **`GET /api/v1/videos/mcp-status`** - 🔧 MCP 시스템 상태 확인 (신규)
4. **`POST /api/v1/videos/ai-search`** - 🤖 기존 AI 검색
5. **`GET /api/v1/videos/search`** - 🔍 기본 검색
6. **`GET /api/v1/videos/trending`** - 🔥 인기 영상

## 🧠 **1. AI 자연어 검색 구현**

### JavaScript (Vanilla/React/Vue 공통)

```javascript
/**
 * 🧠 Claude AI 기반 지능형 자연어 검색
 * "피곤해서 힐링되는 영상 보고 싶어" 같은 자연어 입력 처리
 */
async function intelligentSearch(userQuery, userTier = "free") {
  const startTime = Date.now();

  try {
    console.log(`🧠 지능형 검색: "${userQuery}"`);

    const response = await fetch("/api/v1/videos/intelligent-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`, // JWT 토큰
      },
      body: JSON.stringify({
        query: userQuery,
        userTier: userTier, // 'free' | 'premium'
        maxResults: 20,
        allowWorkflowSteps: true,
      }),
    });

    const result = await response.json();
    const responseTime = Date.now() - startTime;

    if (result.success) {
      console.log(
        `✅ 검색 완료 (${responseTime}ms):`,
        result.data.videos.length,
        "개 영상"
      );

      return {
        success: true,
        videos: result.data.videos,
        searchType: result.searchType,
        insights: result.data.aiInsights || result.data.analysis,
        performance: result.data.performance,
      };
    } else {
      throw new Error(result.message || "검색 실패");
    }
  } catch (error) {
    console.error("지능형 검색 실패:", error);
    return {
      success: false,
      error: error.message,
      fallback: true,
    };
  }
}

// 사용 예시
const searchResult = await intelligentSearch(
  "피곤해서 힐링되는 영상 보고 싶어",
  "premium"
);

if (searchResult.success) {
  // 영상 목록 렌더링
  renderVideoList(searchResult.videos);

  // AI 인사이트 표시
  if (searchResult.insights) {
    showAIInsights(searchResult.insights);
  }
} else {
  // 에러 처리 또는 폴백
  showErrorMessage(searchResult.error);
}
```

### React 컴포넌트 예시

```jsx
import React, { useState, useEffect } from "react";

const IntelligentSearchComponent = ({ userTier = "free" }) => {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [mcpStatus, setMcpStatus] = useState(null);

  // MCP 상태 확인
  useEffect(() => {
    checkMCPStatus();
  }, []);

  const checkMCPStatus = async () => {
    try {
      const response = await fetch("/api/v1/videos/mcp-status");
      const result = await response.json();
      setMcpStatus(result.data);
    } catch (error) {
      console.error("MCP 상태 확인 실패:", error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);

    try {
      const searchResult = await intelligentSearch(query, userTier);

      if (searchResult.success) {
        setVideos(searchResult.videos);
        setInsights(searchResult.insights);
      } else {
        alert("검색 실패: " + searchResult.error);
      }
    } catch (error) {
      alert("검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="intelligent-search">
      {/* MCP 상태 표시 */}
      {mcpStatus && (
        <div
          className={`mcp-status ${
            mcpStatus.connected ? "connected" : "disconnected"
          }`}
        >
          🤖 AI 시스템: {mcpStatus.connected ? "연결됨" : "연결 중..."}
          {mcpStatus.connected && userTier === "premium" && (
            <span className="premium-badge">🎯 4단계 워크플로우 사용 가능</span>
          )}
        </div>
      )}

      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="자연어로 원하는 영상을 말해보세요... (예: 피곤해서 힐링되는 영상)"
            className="search-input"
            disabled={loading || !mcpStatus?.connected}
          />
          <button
            type="submit"
            disabled={loading || !query.trim() || !mcpStatus?.connected}
            className="search-button"
          >
            {loading ? "🔍 검색 중..." : "🧠 AI 검색"}
          </button>
        </div>

        {userTier === "free" && (
          <p className="upgrade-hint">
            💡 프리미엄 업그레이드 시 4단계 지능형 워크플로우 이용 가능
          </p>
        )}
      </form>

      {/* AI 인사이트 */}
      {insights && (
        <div className="ai-insights">
          <h3>🧠 AI 분석 결과</h3>
          <div className="insights-content">
            <div className="extracted-keywords">
              <strong>추출된 키워드:</strong>
              {insights.extractedKeywords?.map((keyword, index) => (
                <span key={index} className="keyword-tag">
                  {keyword}
                </span>
              ))}
            </div>
            {insights.originalIntent && (
              <div className="search-intent">
                <strong>검색 의도:</strong> {insights.originalIntent}
              </div>
            )}
            {insights.searchStrategies && (
              <div className="search-strategies">
                <strong>검색 전략:</strong> {insights.searchStrategies.length}개
                활용
              </div>
            )}
          </div>
        </div>
      )}

      {/* 영상 목록 */}
      <div className="video-list">
        {loading ? (
          <div className="loading">🔄 AI가 영상을 분석하고 있습니다...</div>
        ) : (
          videos.map((video, index) => (
            <VideoCard key={video.id} video={video} index={index} />
          ))
        )}
      </div>
    </div>
  );
};

const VideoCard = ({ video, index }) => (
  <div className="video-card">
    <div className="video-thumbnail">
      <img src={video.thumbnail} alt={video.title} />
      <div className="video-duration">{video.duration}</div>
    </div>
    <div className="video-info">
      <h3 className="video-title">{video.title}</h3>
      <p className="video-channel">{video.channelTitle}</p>
      <div className="video-stats">
        <span className="view-count">
          👁 {video.viewCount?.toLocaleString()}
        </span>
        <span className="published-at">📅 {video.publishedAt}</span>
      </div>
      <a
        href={`https://youtube.com/watch?v=${video.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="watch-button"
      >
        ▶️ 시청하기
      </a>
    </div>
  </div>
);
```

## 🎯 **2. 프리미엄 워크플로우 구현**

```javascript
/**
 * 🎯 4단계 워크플로우 (프리미엄 전용)
 * 키워드 확장 → 쿼리 최적화 → 영상 검색 → 메타데이터 분석
 */
async function workflowSearch(keyword, userTier = "premium") {
  if (userTier !== "premium") {
    throw new Error("프리미엄 기능입니다. 업그레이드가 필요합니다.");
  }

  try {
    console.log(`🎯 4단계 워크플로우 실행: "${keyword}"`);

    const response = await fetch("/api/v1/videos/workflow-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        keyword: keyword,
        userTier: "premium",
        maxResults: 30,
        includeAnalytics: true,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log("✅ 4단계 워크플로우 완료");
      console.log("📊 워크플로우 단계:", result.data.workflow);

      return {
        success: true,
        videos: result.data.videos,
        workflow: result.data.workflow,
        performance: result.data.performance,
        analytics: result.data.analytics,
      };
    } else {
      throw new Error(result.message || "워크플로우 실행 실패");
    }
  } catch (error) {
    console.error("워크플로우 실패:", error);
    throw error;
  }
}

// 워크플로우 진행 상황 표시 컴포넌트
const WorkflowProgress = ({ workflow }) => (
  <div className="workflow-progress">
    <h3>🎯 AI 워크플로우 진행 상황</h3>
    <div className="workflow-steps">
      {Object.entries(workflow || {}).map(([stepKey, step], index) => (
        <div key={stepKey} className="workflow-step">
          <div className="step-number">{index + 1}</div>
          <div className="step-content">
            <h4>{step.name}</h4>
            <p className="step-result">{step.result}</p>
            {step.expandedKeywords && (
              <div className="step-details">
                확장 키워드: {step.expandedKeywords.slice(0, 5).join(", ")}
              </div>
            )}
            {step.optimizedQueries && (
              <div className="step-details">
                최적화된 쿼리: {step.optimizedQueries.length}개 생성
              </div>
            )}
          </div>
          <div className="step-status">✅</div>
        </div>
      ))}
    </div>
  </div>
);
```

## 🔍 **3. 기본 검색 및 폴백 처리**

```javascript
/**
 * 통합 검색 함수 (AI → 기본 검색 폴백)
 */
async function universalSearch(userInput, userTier = "free") {
  try {
    // 1차 시도: AI 지능형 검색
    const aiResult = await intelligentSearch(userInput, userTier);

    if (aiResult.success && aiResult.videos.length > 0) {
      return {
        ...aiResult,
        searchMethod: "ai_intelligent",
      };
    }

    console.log("⚠️ AI 검색 결과 부족, 기본 검색으로 폴백");

    // 2차 시도: 기본 검색
    const basicResult = await basicSearch(userInput);

    return {
      ...basicResult,
      searchMethod: "basic_fallback",
      message: "AI 검색이 일시적으로 사용할 수 없어 기본 검색을 사용했습니다.",
    };
  } catch (error) {
    console.error("통합 검색 실패:", error);

    // 최종 폴백: 트렌딩 영상
    const trendingResult = await getTrendingVideos();

    return {
      ...trendingResult,
      searchMethod: "trending_fallback",
      message: "검색에 문제가 발생해 인기 영상을 표시합니다.",
    };
  }
}

async function basicSearch(query) {
  const response = await fetch(
    `/api/v1/videos/search?q=${encodeURIComponent(query)}&maxResults=20`
  );
  const result = await response.json();

  return {
    success: result.success,
    videos: result.data?.videos || [],
    searchMethod: "basic",
  };
}

async function getTrendingVideos() {
  const response = await fetch("/api/v1/videos/trending?maxResults=20");
  const result = await response.json();

  return {
    success: result.success,
    videos: result.data?.videos || [],
    searchMethod: "trending",
  };
}
```

## 🎨 **4. CSS 스타일 예시**

```css
/* AI 검색 컴포넌트 스타일 */
.intelligent-search {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.mcp-status {
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: 500;
}

.mcp-status.connected {
  background: #e8f5e8;
  color: #2d5a2d;
  border: 1px solid #4caf50;
}

.mcp-status.disconnected {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
}

.premium-badge {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  margin-left: 10px;
}

.search-form {
  margin-bottom: 30px;
}

.search-input-container {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.search-input {
  flex: 1;
  padding: 15px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 25px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: #4ecdc4;
}

.search-button {
  padding: 15px 30px;
  background: linear-gradient(45deg, #4ecdc4, #44a08d);
  color: white;
  border: none;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.search-button:hover {
  transform: translateY(-2px);
}

.search-button:disabled {
  opacity: 0.6;
  transform: none;
  cursor: not-allowed;
}

.ai-insights {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border-left: 4px solid #4ecdc4;
}

.keyword-tag {
  display: inline-block;
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 10px;
  border-radius: 15px;
  margin: 2px 5px 2px 0;
  font-size: 0.9em;
}

.video-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.video-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.video-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.video-thumbnail {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 비율 */
  overflow: hidden;
}

.video-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
}

.video-info {
  padding: 15px;
}

.video-title {
  font-size: 1.1em;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-channel {
  color: #666;
  margin-bottom: 10px;
}

.video-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
  color: #888;
  margin-bottom: 15px;
}

.watch-button {
  display: inline-block;
  background: #ff6b6b;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s;
}

.watch-button:hover {
  background: #ff5252;
}

.workflow-progress {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.workflow-steps {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: 15px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.step-number {
  background: #4ecdc4;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.step-content {
  flex: 1;
}

.step-content h4 {
  margin: 0 0 5px 0;
  color: #333;
}

.step-result {
  color: #666;
  margin: 0;
}

.step-details {
  color: #888;
  font-size: 0.9em;
  margin-top: 5px;
}

.step-status {
  font-size: 1.2em;
}

/* 로딩 애니메이션 */
.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 1.1em;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .search-input-container {
    flex-direction: column;
  }

  .video-list {
    grid-template-columns: 1fr;
  }

  .workflow-step {
    flex-direction: column;
    text-align: center;
  }
}
```

## 🚀 **5. 완전한 사용 예시**

```javascript
// App.js 또는 main.js
document.addEventListener("DOMContentLoaded", async () => {
  const app = new YouTubeShortsApp();
  await app.initialize();
});

class YouTubeShortsApp {
  constructor() {
    this.userTier = localStorage.getItem("userTier") || "free";
    this.searchHistory = JSON.parse(
      localStorage.getItem("searchHistory") || "[]"
    );
  }

  async initialize() {
    // MCP 상태 확인
    await this.checkMCPStatus();

    // 이벤트 리스너 설정
    this.setupEventListeners();

    // 초기 트렌딩 영상 로드
    await this.loadTrendingVideos();
  }

  async checkMCPStatus() {
    try {
      const response = await fetch("/api/v1/videos/mcp-status");
      const result = await response.json();

      this.mcpStatus = result.data;
      this.updateMCPStatusUI();
    } catch (error) {
      console.error("MCP 상태 확인 실패:", error);
    }
  }

  setupEventListeners() {
    // 검색 폼
    document
      .getElementById("search-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const query = document.getElementById("search-input").value.trim();
        if (query) {
          await this.performSearch(query);
        }
      });

    // 프리미엄 업그레이드 버튼
    document.getElementById("upgrade-btn")?.addEventListener("click", () => {
      this.showUpgradeModal();
    });
  }

  async performSearch(query) {
    this.showLoading(true);

    try {
      // 검색 이력 저장
      this.addToSearchHistory(query);

      // 통합 검색 실행
      const result = await universalSearch(query, this.userTier);

      if (result.success) {
        this.renderSearchResults(result);
      } else {
        this.showError("검색 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("검색 실패:", error);
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  renderSearchResults(result) {
    const container = document.getElementById("video-list");
    container.innerHTML = "";

    // 검색 방법 표시
    this.showSearchMethod(result.searchMethod, result.message);

    // AI 인사이트 표시 (있는 경우)
    if (result.insights) {
      this.renderAIInsights(result.insights);
    }

    // 워크플로우 진행 상황 표시 (프리미엄)
    if (result.workflow) {
      this.renderWorkflowProgress(result.workflow);
    }

    // 영상 목록 렌더링
    result.videos.forEach((video, index) => {
      const videoElement = this.createVideoCard(video, index);
      container.appendChild(videoElement);
    });
  }

  addToSearchHistory(query) {
    this.searchHistory.unshift({
      query,
      timestamp: new Date().toISOString(),
    });

    // 최대 50개까지만 저장
    this.searchHistory = this.searchHistory.slice(0, 50);
    localStorage.setItem("searchHistory", JSON.stringify(this.searchHistory));
  }
}
```

## 🎉 **완성!**

이제 프론트엔드에서 백엔드의 MCP 시스템을 완전히 활용할 수 있습니다:

### ✅ **구현된 기능들:**

1. **🧠 AI 자연어 검색** - "피곤해서 힐링영상" → 실제 추천
2. **🎯 4단계 워크플로우** - 프리미엄 사용자 전용 고급 기능
3. **🔄 자동 폴백** - AI 실패 시 기본 검색으로 자동 전환
4. **📊 실시간 상태** - MCP 연결 상태 모니터링
5. **🎨 완전한 UI** - 반응형 디자인 포함

### 🚀 **다음 단계:**

1. **환경 변수 설정** (`mcp-integration/install.sh` 실행)
2. **백엔드 서버 시작** (`npm start`)
3. **프론트엔드 연결** (위 코드 활용)
4. **실제 테스트** (내일 API 할당량 리셋 후)
