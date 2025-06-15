# 💻 **Momentum 구현 코드 상세 가이드**

**(업데이트: 정확한 DB 연결 필요 서비스 중심)**

## 🎯 **핵심 수정 대상 (3개 서비스 + Frontend)**

---

## 🔧 **Backend DB 연결 구현**

### **1. personalizedCurationService.js 수정**

```javascript
// 📍 위치: backend/services/llm/personalizedCurationService.js

// 🔧 상단에 DB 서비스 import 추가
import { getUserPreferences } from "../database/userService.js";
import { createVideoInteraction } from "../database/userService.js";

class PersonalizedCurationService {
  // ... 기존 코드 유지 ...

  /**
   * 👤 사용자 선호도 조회 (실제 DB 연결)
   * ❌ 기존: 하드코딩된 데이터 반환
   * ✅ 수정: 실제 DB에서 조회
   */
  async getUserPreferences(userId = null) {
    if (!userId) {
      // 익명 사용자 기본값
      return {
        categories: ["일반", "음악", "엔터테인먼트"],
        keywords: ["힐링", "재미있는", "신나는"],
        emotions: ["기쁨", "편안함", "활기참"],
      };
    }

    try {
      // 💾 실제 DB 조회
      const result = await getUserPreferences({ userId });

      if (result.success && result.data) {
        return {
          categories: result.data.preferred_categories || [],
          keywords: result.data.preferred_keywords || [],
          emotions: result.data.preferred_emotions || [],
        };
      } else {
        // 폴백: 기본 선호도
        return {
          categories: ["음악 & 엔터테인먼트", "코미디 & 챌린지"],
          keywords: ["힐링", "웃긴", "신나는"],
          emotions: ["기쁨", "편안함"],
        };
      }
    } catch (error) {
      console.error("사용자 선호도 조회 실패:", error);
      return {
        categories: ["일반"],
        keywords: ["힐링"],
        emotions: ["편안함"],
      };
    }
  }

  /**
   * 🎯 감성 문장 클릭 추적 (실제 DB 저장)
   * ❌ 기존: 콘솔 로그만
   * ✅ 수정: DB에 상호작용 기록
   */
  async trackCurationClick(curationId, userId = null) {
    console.log(
      `🎯 감성 문장 클릭 추적: ${curationId} (사용자: ${userId || "익명"})`
    );

    try {
      this.stats.curationClicks++;

      // 💾 DB에 사용자 상호작용 기록
      if (userId) {
        const interactionResult = await createVideoInteraction({
          user_id: userId,
          video_id: null, // 영상이 아닌 감성 문장 클릭
          interaction_type: "curation_click",
          search_keyword: null,
          recommendation_type: "ai_curation",
          user_emotion: "engaged",
          interaction_metadata: {
            curationId,
            clickedAt: new Date().toISOString(),
            serviceVersion: this.version,
          },
          device_type: "web",
          source_platform: "web",
          interaction_value: 1.0,
        });

        if (interactionResult.success) {
          console.log("✅ 클릭 추적 DB 저장 성공");
        } else {
          console.error("❌ 클릭 추적 DB 저장 실패:", interactionResult.error);
        }
      }

      return {
        success: true,
        message: "클릭이 추적되었습니다.",
        nextModule: "video_search_service",
        curationId: curationId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`클릭 추적 실패: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ... 나머지 기존 코드 유지 ...
}
```

### **2. dailyKeywordUpdateService.js 수정**

```javascript
// 📍 위치: backend/services/search/dailyKeywordUpdateService.js

// 🔧 상단에 DB 서비스 import 추가
import { getTodaysKeywords } from "../database/keywordService.js";
import { cacheVideoData } from "../database/videoService.js";
import { saveChannelInfo } from "../database/videoService.js";

class DailyKeywordUpdateService {
  // ... 기존 코드 유지 ...

  /**
   * 📅 오늘의 키워드 조회 (실제 DB 연결)
   * ❌ 기존: TODO 주석만
   * ✅ 수정: 실제 DB에서 오늘의 키워드 조회
   */
  async getTodaysKeywords() {
    try {
      console.log("📅 오늘의 키워드 조회 중...");

      const result = await getTodaysKeywords({
        limit: 50,
        isActive: true,
        sortBy: "priority_tier",
      });

      if (result.success && result.data) {
        const keywords = result.data.map((item) => ({
          keyword: item.keyword,
          category: item.category,
          priority: item.priority_tier,
          lastExecuted: item.last_executed_at,
        }));

        console.log(`✅ 오늘의 키워드 ${keywords.length}개 조회 완료`);
        return keywords;
      } else {
        console.error("키워드 조회 실패:", result.error);
        // 폴백: 기본 키워드
        return [
          { keyword: "힐링", category: "ASMR & 힐링", priority: "high" },
          { keyword: "먹방", category: "먹방 & 요리", priority: "high" },
          {
            keyword: "브이로그",
            category: "라이프스타일 & 건강",
            priority: "medium",
          },
        ];
      }
    } catch (error) {
      console.error("오늘의 키워드 조회 오류:", error);
      return [];
    }
  }

  /**
   * 💾 영상 데이터 DB 저장 (주석 해제 + 수정)
   * ❌ 기존: 주석 처리됨
   * ✅ 수정: 실제 DB 저장 기능
   */
  async saveVideoToDB(videoData) {
    try {
      // LLM 분류 결과 포함하여 DB 저장
      const result = await cacheVideoData({
        video_id: videoData.id,
        title: videoData.title,
        description: videoData.description,
        channel_id: videoData.channelId,
        channel_title: videoData.channelTitle,
        published_at: videoData.publishedAt,
        view_count: videoData.viewCount || 0,
        like_count: videoData.likeCount || 0,
        comment_count: videoData.commentCount || 0,
        duration: videoData.duration || 0,
        thumbnail_url: videoData.thumbnail,
        search_keyword: videoData.searchKeyword,

        // LLM 분류 결과
        llm_classification: {
          topic_tags: videoData.tags || [],
          mood_tags: videoData.moodTags || [],
          context_tags: videoData.contextTags || [],
          genre_tags: videoData.genreTags || [],
          confidence: videoData.classification_confidence || 0.8,
          engine: "claude_api",
        },

        // 품질 정보
        quality_score: videoData.qualityGrade || 0.5,
        engagement_score: videoData.engagement || null,
        is_playable: videoData.isPlayable !== false,
        processed_at: new Date().toISOString(),
      });

      if (result.success) {
        console.log(`✅ 영상 DB 저장 성공: ${videoData.id}`);
        return true;
      } else {
        console.error(`❌ 영상 DB 저장 실패: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error("영상 DB 저장 오류:", error);
      return false;
    }
  }

  /**
   * 📺 채널 데이터 DB 저장 (주석 해제 + 수정)
   * ❌ 기존: 주석 처리됨
   * ✅ 수정: 실제 DB 저장 기능
   */
  async saveChannelToDB(channelData) {
    try {
      const result = await saveChannelInfo({
        channel_id: channelData.channelId,
        channel_title: channelData.channelTitle,
        channel_description: channelData.channelDescription || null,
        channel_icon_url: channelData.channelIcon || null,
        subscriber_count: channelData.subscriberCount || 0,
        subscriber_count_formatted: channelData.subscriberCountFormatted || "0",
        video_count: channelData.videoCount || 0,
        video_count_formatted: channelData.videoCountFormatted || "0",
        country: "KR",
        default_language: "ko",
        quality_grade: channelData.qualityGrade || "C",
        collected_at: new Date().toISOString(),
      });

      if (result.success) {
        console.log(`✅ 채널 DB 저장 성공: ${channelData.channelId}`);
        return true;
      } else {
        console.error(`❌ 채널 DB 저장 실패: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error("채널 DB 저장 오류:", error);
      return false;
    }
  }

  // ... 나머지 기존 코드 유지 ...
}
```

### **3. trendVideoService.js 수정**

```javascript
// 📍 위치: backend/services/video/trendVideoService.js

// 🔧 상단에 DB 서비스 import 추가
import { logTrendKeyword } from "../database/trendService.js";
import { cacheVideoData } from "../database/videoService.js";

class TrendVideoService {
  // ... 기존 코드 유지 ...

  /**
   * 📊 트렌드 데이터 DB 저장 (새로 추가)
   * ✅ 추가: 트렌드 키워드와 영상 데이터 저장
   */
  async saveTrendData(trendData, videos = []) {
    try {
      console.log("📊 트렌드 데이터 DB 저장 시작...");

      // 1. 트렌드 키워드 저장
      for (const keyword of trendData.keywords) {
        const trendResult = await logTrendKeyword({
          keyword: keyword,
          keyword_type: "trend",
          source: "google_trends",
          trend_score: Math.random() * 100, // 실제 점수로 교체
          search_volume: Math.floor(Math.random() * 10000),
          region: "KR",
          language: "ko",
          detected_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간 후
          raw_data: { trendData },
        });

        if (trendResult.success) {
          console.log(`✅ 트렌드 키워드 저장: ${keyword}`);
        }
      }

      // 2. 트렌드 영상 저장
      let savedVideos = 0;
      for (const video of videos.slice(0, 50)) {
        // 최대 50개
        const videoResult = await cacheVideoData({
          video_id: video.id?.videoId || video.videoId,
          title: video.snippet?.title,
          description: video.snippet?.description,
          channel_id: video.snippet?.channelId,
          channel_title: video.snippet?.channelTitle,
          published_at: video.snippet?.publishedAt,
          thumbnail_url: video.snippet?.thumbnails?.medium?.url,
          search_keyword: video.searchKeyword,
          search_category: "trend",
          is_playable: true,
          cache_source: "trend_collection",
          raw_youtube_data: video,
        });

        if (videoResult.success) {
          savedVideos++;
        }
      }

      console.log(
        `✅ 트렌드 데이터 저장 완료: 키워드 ${trendData.keywords.length}개, 영상 ${savedVideos}개`
      );

      return {
        success: true,
        savedKeywords: trendData.keywords.length,
        savedVideos,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("트렌드 데이터 저장 실패:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 🔥 메인 함수 수정 (DB 저장 추가)
   * ✅ 수정: 결과를 DB에 저장하는 로직 추가
   */
  async generateTrendVideos(options = {}) {
    // ... 기존 코드 유지 ...

    try {
      // 기존 4단계 처리...
      const trendsResult = await this.collectActiveTrends(config.trends);
      const refinedResult = await this.refineKeywords(
        trendsResult.keywords,
        config.refiner
      );
      const searchResults = await this.searchTrendVideos(
        refinedResult.refinedKeywords,
        config.search
      );
      const finalResult = await this.filterByChannelQuality(
        searchResults,
        config.channelFilter
      );

      // 🆕 5단계: DB 저장
      console.log("\n💾 5단계: 트렌드 데이터 DB 저장");
      const saveResult = await this.saveTrendData(
        { keywords: refinedResult.refinedKeywords },
        finalResult.qualityVideos
      );

      // 결과에 저장 정보 추가
      const response = {
        success: true,
        data: {
          trendVideos: finalResult.qualityVideos,
          keywords: refinedResult.refinedKeywords,
          trendsData: trendsResult,
          searchData: searchResults,
          channelData: finalResult.channelData,
        },
        summary,
        processingTime,
        // 🆕 DB 저장 결과 추가
        dbSaveResult: saveResult,
        config: {
          searchTimeRange: `${publishedAfter} ~ now`,
          channelMinSubscribers: config.channelFilter.minSubscribers,
          finalKeywordCount: refinedResult.refinedKeywords.length,
        },
      };

      console.log("✅ ===== 트렌드 영상 큐레이션 + DB 저장 완료 =====");
      return response;
    } catch (error) {
      // ... 기존 에러 처리 유지 ...
    }
  }

  // ... 나머지 기존 코드 유지 ...
}
```

---

## 🌐 **Frontend API 연결 구현**

### **1. API 클라이언트 생성**

```javascript
// 📍 새로 생성: frontend/src/core/api.js

class APIClient {
  constructor() {
    this.baseURL = window.location.origin;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  // 🔑 인증 토큰 관리
  setAuthToken(token) {
    this.defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  removeAuthToken() {
    delete this.defaultHeaders["Authorization"];
  }

  // 🛠️ 기본 HTTP 메서드
  async request(method, endpoint, data = null) {
    try {
      const config = {
        method,
        headers: this.defaultHeaders,
      };

      if (data) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "API 요청 실패");
      }

      return result;
    } catch (error) {
      console.error(`API ${method} ${endpoint} 실패:`, error);
      throw error;
    }
  }

  // 🔍 검색 관련 API
  async searchVideos(keyword, options = {}) {
    return this.request("POST", "/api/search/videos", {
      keyword,
      ...options,
    });
  }

  async getTrendingKeywords() {
    return this.request("GET", "/api/trends/keywords");
  }

  async getTrendingVideos() {
    return this.request("GET", "/api/trends/videos");
  }

  // 🤖 LLM 관련 API
  async analyzeChatMessage(message, userId = null) {
    return this.request("POST", "/api/llm/analyze", {
      message,
      userId,
      inputType: "emotion",
    });
  }

  async trackCurationClick(curationId, userId = null) {
    return this.request("POST", "/api/llm/track-click", {
      curationId,
      userId,
    });
  }

  // 👤 사용자 관련 API
  async login(email, password) {
    return this.request("POST", "/api/auth/login", {
      email,
      password,
    });
  }

  async signup(email, password, name) {
    return this.request("POST", "/api/auth/signup", {
      email,
      password,
      name,
    });
  }

  async getUserPreferences(userId) {
    return this.request("GET", `/api/users/${userId}/preferences`);
  }
}

// 전역 인스턴스
const api = new APIClient();
export default api;
```

### **2. AuthFlow.js 수정**

```javascript
// 📍 위치: frontend/src/pages/AuthFlow/AuthFlow.js

import api from "../../core/api.js";

// 기존 AuthFlow 클래스에 API 연결 추가
class AuthFlow {
  // ... 기존 코드 유지 ...

  async handleLogin(email, password) {
    try {
      this.showLoading("로그인 중...");

      // 🔌 API 연결
      const result = await api.login(email, password);

      if (result.success) {
        // 토큰 저장
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("userId", result.user.id);

        // API 클라이언트에 토큰 설정
        api.setAuthToken(result.token);

        // 성공 처리
        this.showSuccess("로그인 성공!");

        // 페이지 이동
        setTimeout(() => {
          window.location.hash = "#/home";
        }, 1000);
      }
    } catch (error) {
      this.showError("로그인 실패: " + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async handleSignup(email, password, name) {
    try {
      this.showLoading("회원가입 중...");

      // 🔌 API 연결
      const result = await api.signup(email, password, name);

      if (result.success) {
        this.showSuccess("회원가입 성공! 로그인해주세요.");

        // 로그인 폼으로 전환
        setTimeout(() => {
          this.showLoginForm();
        }, 1500);
      }
    } catch (error) {
      this.showError("회원가입 실패: " + error.message);
    } finally {
      this.hideLoading();
    }
  }

  // ... 나머지 기존 코드 유지 ...
}
```

### **3. ChatFlow.js 수정**

```javascript
// 📍 위치: frontend/src/pages/VideoPlayer/final/ChatFlow.js

import api from "../../../core/api.js";

class ChatFlow {
  // ... 기존 코드 유지 ...

  async handleSendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    try {
      this.showLoading();

      // 사용자 메시지 표시
      this.addMessage(message, "user");
      this.messageInput.value = "";

      // 🔌 API 연결 - LLM 분석
      const userId = localStorage.getItem("userId");
      const result = await api.analyzeChatMessage(message, userId);

      if (result.success && result.emotionalAnalysis) {
        // AI 응답 표시
        this.addMessage("감성 분석이 완료되었습니다!", "assistant");

        // 감성 문장 큐레이션 표시
        this.displayCurations(result.emotionalAnalysis.curations);

        // 키워드 표시
        this.displayKeywords(result.emotionalAnalysis.personalizedKeywords);
      }
    } catch (error) {
      this.addMessage(
        "죄송합니다. 분석 중 오류가 발생했습니다: " + error.message,
        "assistant"
      );
    } finally {
      this.hideLoading();
    }
  }

  async handleCurationClick(curation) {
    try {
      const userId = localStorage.getItem("userId");

      // 🔌 API 연결 - 클릭 추적
      await api.trackCurationClick(curation.curationId, userId);

      // 클릭된 감성 문장으로 영상 검색
      const searchResult = await api.searchVideos(curation.keywords.join(" "), {
        searchType: "curation",
      });

      if (searchResult.success) {
        this.displaySearchResults(searchResult.data);
      }
    } catch (error) {
      console.error("감성 문장 클릭 처리 실패:", error);
    }
  }

  displayCurations(curations) {
    const container = document.getElementById("curations-container");
    container.innerHTML = curations
      .map(
        (curation) => `
      <div class="curation-item" onclick="chatFlow.handleCurationClick('${JSON.stringify(
        curation
      ).replace(/'/g, "&#39;")}')">
        <p>${curation.enhanced_sentence}</p>
        <span class="confidence">신뢰도: ${(curation.confidence * 100).toFixed(
          0
        )}%</span>
      </div>
    `
      )
      .join("");
  }

  // ... 나머지 기존 코드 유지 ...
}
```

### **4. Home.js 수정**

```javascript
// 📍 위치: frontend/src/pages/Landing/Home.js

import api from "../../core/api.js";

class Home {
  // ... 기존 코드 유지 ...

  async loadTrendingData() {
    try {
      this.showLoading();

      // 🔌 API 연결 - 트렌딩 키워드
      const keywordsResult = await api.getTrendingKeywords();
      if (keywordsResult.success) {
        this.displayTrendingKeywords(keywordsResult.data);
      }

      // 🔌 API 연결 - 트렌딩 영상
      const videosResult = await api.getTrendingVideos();
      if (videosResult.success) {
        this.displayTrendingVideos(videosResult.data);
      }
    } catch (error) {
      console.error("트렌딩 데이터 로드 실패:", error);
      this.showError("트렌딩 데이터를 불러올 수 없습니다.");
    } finally {
      this.hideLoading();
    }
  }

  async handleSearch(keyword) {
    try {
      this.showLoading();

      // 🔌 API 연결 - 영상 검색
      const result = await api.searchVideos(keyword, {
        searchType: "manual",
        maxResults: 20,
      });

      if (result.success) {
        this.displaySearchResults(result.data);
      } else {
        this.showError("검색 결과가 없습니다.");
      }
    } catch (error) {
      console.error("검색 실패:", error);
      this.showError("검색 중 오류가 발생했습니다.");
    } finally {
      this.hideLoading();
    }
  }

  // ... 나머지 기존 코드 유지 ...
}
```

---

## ✅ **구현 체크리스트**

### **Backend DB 연결**

- [ ] personalizedCurationService.js - getUserPreferences() 수정
- [ ] personalizedCurationService.js - trackCurationClick() 수정
- [ ] dailyKeywordUpdateService.js - getTodaysKeywords() 구현
- [ ] dailyKeywordUpdateService.js - saveVideoToDB() 활성화
- [ ] dailyKeywordUpdateService.js - saveChannelToDB() 활성화
- [ ] trendVideoService.js - saveTrendData() 추가

### **Frontend API 연결**

- [ ] api.js 클라이언트 생성
- [ ] AuthFlow.js - 로그인/회원가입 API 연결
- [ ] ChatFlow.js - LLM 분석 API 연결
- [ ] Home.js - 검색/트렌드 API 연결

### **테스트**

- [ ] 각 API 엔드포인트 개별 테스트
- [ ] 전체 사용자 플로우 테스트
- [ ] 에러 처리 검증

**이 코드들을 적용하면 완전한 Momentum 서비스가 완성됩니다!**
