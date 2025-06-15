# ⚡ **Momentum 빠른 완성 가이드 (2시간 완료)**

**(업데이트: 정확한 구현 범위 확정)**

## 🎯 **완성을 위한 정확한 작업 목록**

### ✅ **완성된 부분 (95%)**

- **searchService.js** ✅ 완성 (933줄)
- **youtube-ai-services** ✅ 독립 작동 (DB 연결 불필요)
- **Database services** ✅ 7개 모두 완성
- **Frontend UI** ✅ 완전한 SPA 구조
- **Backend server** ✅ 182개 엔드포인트

### 🔄 **남은 작업 (5% - 2시간)**

#### **Step 1: 서비스 DB 연결 (1.5시간)**

```
🎯 정확한 수정 대상:
├── personalizedCurationService.js (2개 메서드)
├── dailyKeywordUpdateService.js (3개 메서드)
└── trendVideoService.js (1개 메서드 추가)
```

#### **Step 2: Frontend API 연결 (30분)**

```
🔌 연결 포인트:
├── api.js 클라이언트 생성
├── AuthFlow.js 로그인 연결
├── ChatFlow.js LLM 연결
└── Home.js 검색 연결
```

---

## 🚀 **30분 단위 실행 계획**

### **[1-30분] personalizedCurationService.js**

#### 1️⃣ **import 추가** (2분)

```javascript
// 📍 파일 상단에 추가
import {
  getUserPreferences,
  createVideoInteraction,
} from "../database/userService.js";
```

#### 2️⃣ **getUserPreferences() 수정** (15분)

```javascript
// 📍 기존 하드코딩 → DB 연결로 변경
async getUserPreferences(userId = null) {
  if (!userId) {
    return { categories: ['일반'], keywords: ['힐링'], emotions: ['편안함'] };
  }

  try {
    const result = await getUserPreferences({ userId });
    if (result.success && result.data) {
      return {
        categories: result.data.preferred_categories || [],
        keywords: result.data.preferred_keywords || [],
        emotions: result.data.preferred_emotions || []
      };
    }
    return { categories: ['음악 & 엔터테인먼트'], keywords: ['힐링'], emotions: ['기쁨'] };
  } catch (error) {
    console.error('사용자 선호도 조회 실패:', error);
    return { categories: ['일반'], keywords: ['힐링'], emotions: ['편안함'] };
  }
}
```

#### 3️⃣ **trackCurationClick() 수정** (13분)

```javascript
// 📍 기존 주석 → 실제 DB 저장으로 변경
async trackCurationClick(curationId, userId = null) {
  try {
    this.stats.curationClicks++;

    if (userId) {
      await createVideoInteraction({
        user_id: userId,
        video_id: null,
        interaction_type: 'curation_click',
        recommendation_type: 'ai_curation',
        interaction_metadata: { curationId, clickedAt: new Date().toISOString() },
        device_type: 'web'
      });
    }

    return {
      success: true,
      message: '클릭이 추적되었습니다.',
      curationId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### **[31-75분] dailyKeywordUpdateService.js**

#### 1️⃣ **import 추가** (2분)

```javascript
// 📍 파일 상단에 추가
import { getTodaysKeywords } from "../database/keywordService.js";
import { cacheVideoData, saveChannelInfo } from "../database/videoService.js";
```

#### 2️⃣ **getTodaysKeywords() 구현** (15분)

```javascript
// 📍 TODO 주석 → 실제 구현으로 변경
async getTodaysKeywords() {
  try {
    const result = await getTodaysKeywords({
      limit: 50,
      isActive: true,
      sortBy: 'priority_tier'
    });

    if (result.success && result.data) {
      return result.data.map(item => ({
        keyword: item.keyword,
        category: item.category,
        priority: item.priority_tier,
        lastExecuted: item.last_executed_at
      }));
    }

    // 폴백
    return [
      { keyword: '힐링', category: 'ASMR & 힐링', priority: 'high' },
      { keyword: '먹방', category: '먹방 & 요리', priority: 'high' }
    ];
  } catch (error) {
    console.error('오늘의 키워드 조회 오류:', error);
    return [];
  }
}
```

#### 3️⃣ **saveVideoToDB() 활성화** (13분)

```javascript
// 📍 주석 처리된 코드 → 활성화
async saveVideoToDB(videoData) {
  try {
    const result = await cacheVideoData({
      video_id: videoData.id,
      title: videoData.title,
      description: videoData.description,
      channel_id: videoData.channelId,
      channel_title: videoData.channelTitle,
      search_keyword: videoData.searchKeyword,
      llm_classification: {
        topic_tags: videoData.tags || [],
        confidence: videoData.classification_confidence || 0.8,
        engine: 'claude_api'
      },
      is_playable: videoData.isPlayable !== false,
      processed_at: new Date().toISOString()
    });

    return result.success;
  } catch (error) {
    console.error('영상 DB 저장 오류:', error);
    return false;
  }
}
```

#### 4️⃣ **saveChannelToDB() 활성화** (13분)

```javascript
// 📍 주석 처리된 코드 → 활성화
async saveChannelToDB(channelData) {
  try {
    const result = await saveChannelInfo({
      channel_id: channelData.channelId,
      channel_title: channelData.channelTitle,
      subscriber_count: channelData.subscriberCount || 0,
      quality_grade: channelData.qualityGrade || 'C',
      collected_at: new Date().toISOString()
    });

    return result.success;
  } catch (error) {
    console.error('채널 DB 저장 오류:', error);
    return false;
  }
}
```

### **[76-90분] trendVideoService.js**

#### 1️⃣ **import 및 saveTrendData() 추가** (15분)

```javascript
// 📍 파일 상단에 추가
import { logTrendKeyword } from '../database/trendService.js';

// 📍 클래스 내부에 메서드 추가
async saveTrendData(trendData, videos = []) {
  try {
    console.log('📊 트렌드 데이터 DB 저장 시작...');

    // 트렌드 키워드 저장
    for (const keyword of trendData.keywords) {
      await logTrendKeyword({
        keyword: keyword,
        keyword_type: 'trend',
        source: 'google_trends',
        region: 'KR',
        detected_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return {
      success: true,
      savedKeywords: trendData.keywords.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 📍 generateTrendVideos() 메서드 끝부분에 추가
// DB 저장 호출
const saveResult = await this.saveTrendData(
  { keywords: refinedResult.refinedKeywords },
  finalResult.qualityVideos
);
```

### **[91-120분] Frontend API 연결**

#### 1️⃣ **api.js 클라이언트 생성** (10분)

```javascript
// 📍 새 파일: frontend/src/core/api.js
class APIClient {
  constructor() {
    this.baseURL = window.location.origin;
    this.defaultHeaders = { "Content-Type": "application/json" };
  }

  async request(method, endpoint, data = null) {
    const config = { method, headers: this.defaultHeaders };
    if (data) config.body = JSON.stringify(data);

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    return response.json();
  }

  async searchVideos(keyword) {
    return this.request("POST", "/api/search/videos", { keyword });
  }

  async analyzeChatMessage(message, userId = null) {
    return this.request("POST", "/api/llm/analyze", { message, userId });
  }

  async login(email, password) {
    return this.request("POST", "/api/auth/login", { email, password });
  }
}

const api = new APIClient();
export default api;
```

#### 2️⃣ **AuthFlow.js 연결** (5분)

```javascript
// 📍 import 추가
import api from '../../core/api.js';

// 📍 handleLogin 메서드 수정
async handleLogin(email, password) {
  try {
    const result = await api.login(email, password);
    if (result.success) {
      localStorage.setItem('authToken', result.token);
      window.location.hash = '#/home';
    }
  } catch (error) {
    this.showError('로그인 실패: ' + error.message);
  }
}
```

#### 3️⃣ **ChatFlow.js 연결** (5분)

```javascript
// 📍 import 추가
import api from '../../../core/api.js';

// 📍 handleSendMessage 메서드 수정
async handleSendMessage() {
  const message = this.messageInput.value.trim();
  try {
    const result = await api.analyzeChatMessage(message);
    if (result.success) {
      this.displayCurations(result.emotionalAnalysis.curations);
    }
  } catch (error) {
    this.addMessage('분석 실패: ' + error.message, 'assistant');
  }
}
```

#### 4️⃣ **Home.js 연결** (10분)

```javascript
// 📍 import 추가
import api from '../../core/api.js';

// 📍 handleSearch 메서드 수정
async handleSearch(keyword) {
  try {
    const result = await api.searchVideos(keyword);
    if (result.success) {
      this.displaySearchResults(result.data);
    }
  } catch (error) {
    this.showError('검색 실패: ' + error.message);
  }
}
```

---

## ✅ **완료 체크리스트**

### **Backend (90분)**

- [ ] personalizedCurationService.js - import 추가
- [ ] personalizedCurationService.js - getUserPreferences() 수정
- [ ] personalizedCurationService.js - trackCurationClick() 수정
- [ ] dailyKeywordUpdateService.js - import 추가
- [ ] dailyKeywordUpdateService.js - getTodaysKeywords() 구현
- [ ] dailyKeywordUpdateService.js - saveVideoToDB() 활성화
- [ ] dailyKeywordUpdateService.js - saveChannelToDB() 활성화
- [ ] trendVideoService.js - saveTrendData() 추가

### **Frontend (30분)**

- [ ] api.js 클라이언트 생성
- [ ] AuthFlow.js API 연결
- [ ] ChatFlow.js API 연결
- [ ] Home.js API 연결

---

## 🎉 **완성 후 테스트**

### **기본 기능 테스트**

1. **로그인/회원가입** - AuthFlow에서 API 연결 확인
2. **LLM 대화** - ChatFlow에서 감성 분석 확인
3. **영상 검색** - Home에서 검색 결과 확인
4. **트렌드 표시** - 트렌드 키워드/영상 표시 확인

### **성공 기준**

- ✅ 모든 페이지 로딩 성공
- ✅ API 호출 성공 (응답 시간 < 3초)
- ✅ DB 저장 성공 (에러 없음)
- ✅ 프론트엔드-백엔드 연동 성공

---

## 🚨 **중요 주의사항**

### **❌ 수정하지 말 것**

- `searchService.js` - 이미 완성됨
- `youtube-ai-services/` - 독립적으로 작동
- `database/` 서비스들 - 모두 완성됨

### **✅ 정확히 이것만 수정**

- 위에 명시된 3개 서비스의 특정 메서드만
- Frontend의 4개 파일만

### **🔧 실행 순서**

1. Backend 서비스 수정 (90분)
2. Frontend API 연결 (30분)
3. 전체 테스트 (15분)

**이 가이드대로 하면 2시간 내에 완전한 Momentum 서비스 완성!** 🎯
