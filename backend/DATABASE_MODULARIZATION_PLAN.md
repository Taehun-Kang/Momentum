# 🗄️ 데이터베이스 모듈화 계획서

## 🎯 목표

- 6개 도메인별 독립적인 DB 서비스 모듈 생성
- REST API 기반의 깔끔한 인터페이스 제공
- 기존 서비스들과의 원활한 통합

## 📋 도메인별 매핑

### 1. User Domain

**파일**: `01_user_profiles.sql`

- **서비스**: `services/database/userService.js`
- **라우트**: `routes/database/userRoutes.js`
- **기능**: 사용자 프로필, 선호도, 인증 관리

### 2. Video Domain

**파일**: `02_video_cache_extended.sql`, `03_video_channels.sql`

- **서비스**: `services/database/videoService.js`
- **라우트**: `routes/database/videoRoutes.js`
- **기능**: 영상 캐시, 채널 정보, 재생 가능 여부 관리

### 3. Search Domain

**파일**: `04_search_logs.sql`

- **서비스**: `services/database/searchService.js`
- **라우트**: `routes/database/searchRoutes.js`
- **기능**: 검색 로그, 성능 추적, 사용자 검색 패턴 분석

### 4. Trend Domain

**파일**: `05_trend_analysis.sql`

- **서비스**: `services/database/trendService.js`
- **라우트**: `routes/database/trendRoutes.js`
- **기능**: 트렌드 분석, 인기 키워드, 시계열 데이터 관리

### 5. System Domain

**파일**: `06_system_management.sql`

- **서비스**: `services/database/systemService.js`
- **라우트**: `routes/database/systemRoutes.js`
- **기능**: 시스템 로그, 알림, 메트릭, 모니터링

### 6. Keyword Domain

**파일**: `07_daily_keywords_management.sql`, `08_insert_keywords_data.sql`

- **서비스**: `services/database/keywordService.js`
- **라우트**: `routes/database/keywordRoutes.js`
- **기능**: 일일 키워드 관리, 실행 기반 로테이션, 236개 키워드 데이터

## 🔄 통합 전략

### 기존 서비스들의 DB 모듈 활용

```javascript
// personalizedCurationService.js
const userService = require("../database/userService");
const videoService = require("../database/videoService");

// dailyKeywordUpdateService.js
const keywordService = require("../database/keywordService");
const videoService = require("../database/videoService");

// trendVideoService.js
const trendService = require("../database/trendService");
const videoService = require("../database/videoService");
```

### YouTube AI 서비스들의 API 호출

```javascript
// youtube-ai-services에서 DB API 호출
const axios = require("axios");

// 검색 결과 저장
await axios.post("/api/database/search/log", searchData);

// 영상 정보 캐싱
await axios.post("/api/database/video/cache", videoData);
```

## 📊 개발 우선순위

### Phase 1: 핵심 서비스 (1일)

1. **keywordService.js** - 일일 키워드 관리 (가장 중요)
2. **videoService.js** - 영상 캐시 관리

### Phase 2: 분석 서비스 (1일)

3. **trendService.js** - 트렌드 분석
4. **searchService.js** - 검색 로그 관리

### Phase 3: 관리 서비스 (1일)

5. **userService.js** - 사용자 관리
6. **systemService.js** - 시스템 모니터링

## 🛠️ 구현 패턴

### 서비스 클래스 패턴

```javascript
class KeywordService {
  constructor() {
    this.supabase = createClient(url, key);
  }

  // 일일 키워드 조회
  async getDailyKeywords(date, tier) {
    return await this.supabase.rpc("get_daily_keywords", {
      target_date: date,
      keyword_tier: tier,
    });
  }

  // 키워드 실행 기록
  async recordKeywordExecution(keywordId) {
    return await this.supabase.rpc("record_keyword_execution", {
      keyword_id: keywordId,
    });
  }
}
```

### REST API 패턴

```javascript
// keywordRoutes.js
router.get("/daily/:date/:tier", async (req, res) => {
  try {
    const result = await keywordService.getDailyKeywords(
      req.params.date,
      req.params.tier
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 📈 예상 효과

### 개발 속도

- **단기**: 약간 느림 (모듈 생성 시간)
- **중장기**: 훨씬 빠름 (재사용성, 테스트 용이성)

### 코드 품질

- **가독성**: 크게 향상 (도메인별 분리)
- **유지보수성**: 크게 향상 (독립적 수정 가능)
- **테스트**: 크게 향상 (단위 테스트 가능)

### 확장성

- **기능 추가**: 쉬움 (새 API 엔드포인트만 추가)
- **성능 최적화**: 쉬움 (도메인별 독립 최적화)
- **마이크로서비스**: 쉬움 (이미 API로 분리됨)

## 🚀 다음 단계

1. **keywordService.js 구현** (가장 높은 우선순위)
2. **keywordRoutes.js 구현**
3. **기존 dailyKeywordUpdateService.js와 통합**
4. **테스트 및 검증**
5. **나머지 도메인 순차적 구현**
