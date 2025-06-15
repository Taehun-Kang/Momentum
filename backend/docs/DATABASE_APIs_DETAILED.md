# 🗄️ Database APIs 상세 문서

**총 147개 엔드포인트** (Users DB 32개 + Emotions DB 24개 제외)

---

## 📺 Videos DB API (21개)

**Base URL**: `/api/v1/videos_db`  
**Purpose**: YouTube 영상 캐시 및 메타데이터 관리

### 💾 영상 캐시 관리 (6개)

| Method | Endpoint          | Description        | Frontend  | Parameters            |
| ------ | ----------------- | ------------------ | --------- | --------------------- |
| POST   | `/cache`          | 영상 캐시 저장     | ⭐ 권장   | video data object     |
| GET    | `/cache/:videoId` | 영상 캐시 조회     | ✅ 필수   | videoId (required)    |
| PUT    | `/cache/:videoId` | 영상 캐시 업데이트 | ⭐ 권장   | videoId + update data |
| DELETE | `/cache/:videoId` | 영상 캐시 삭제     | ❌ 관리자 | videoId (required)    |
| POST   | `/cache/batch`    | 영상 배치 캐싱     | ⭐ 권장   | video array           |
| DELETE | `/cache/cleanup`  | 만료된 캐시 정리   | ❌ 관리자 | query: days_old       |

### 📢 채널 정보 관리 (4개)

| Method | Endpoint               | Description        | Frontend  | Parameters              |
| ------ | ---------------------- | ------------------ | --------- | ----------------------- |
| POST   | `/channels`            | 채널 정보 저장     | ⭐ 권장   | channel data object     |
| GET    | `/channels/:channelId` | 채널 정보 조회     | ⭐ 권장   | channelId (required)    |
| PUT    | `/channels/:channelId` | 채널 정보 업데이트 | ⭐ 권장   | channelId + update data |
| DELETE | `/channels/:channelId` | 채널 정보 삭제     | ❌ 관리자 | channelId (required)    |

### 🔍 영상 검색 및 필터링 (5개)

| Method | Endpoint              | Description          | Frontend | Parameters               |
| ------ | --------------------- | -------------------- | -------- | ------------------------ |
| GET    | `/popular`            | 인기 영상 조회       | ✅ 필수  | query: limit, category   |
| GET    | `/category/:category` | 카테고리별 영상 조회 | ✅ 필수  | category + query: limit  |
| GET    | `/recent`             | 최근 영상 조회       | ✅ 필수  | query: limit, hours_back |
| POST   | `/search`             | 영상 검색            | ✅ 필수  | search criteria object   |
| GET    | `/search/:searchId`   | 검색 결과 조회       | ⭐ 권장  | searchId (required)      |

### 📊 통계 및 분석 (4개)

| Method | Endpoint                 | Description      | Frontend  | Parameters        |
| ------ | ------------------------ | ---------------- | --------- | ----------------- |
| GET    | `/analytics/performance` | 영상 성능 분석   | ❌ 관리자 | query: date_range |
| GET    | `/analytics/trends`      | 영상 트렌드 분석 | ❌ 관리자 | query: period     |
| GET    | `/stats/overview`        | 영상 통계 개요   | ❌ 관리자 | none              |
| GET    | `/stats/categories`      | 카테고리 통계    | ⭐ 권장   | query: period     |

### 🧹 유틸리티 및 관리 (2개)

| Method | Endpoint          | Description      | Frontend | Parameters      |
| ------ | ----------------- | ---------------- | -------- | --------------- |
| POST   | `/validate/batch` | 영상 유효성 검증 | ⭐ 권장  | video_ids array |
| GET    | `/health`         | 영상 서비스 상태 | ⭐ 권장  | none            |

---

## 🏷️ Keywords DB API (24개)

**Base URL**: `/api/v1/keywords_db`  
**Purpose**: 키워드 관리 및 성능 추적 (주로 관리자용)

### 📅 일일 키워드 관리 (8개)

| Method | Endpoint                   | Description             | Frontend  | Parameters              |
| ------ | -------------------------- | ----------------------- | --------- | ----------------------- |
| POST   | `/daily`                   | 일일 키워드 추가        | ❌ 관리자 | keyword data object     |
| GET    | `/daily/today`             | 오늘 실행할 키워드 조회 | ❌ 관리자 | none                    |
| POST   | `/daily/complete`          | 키워드 실행 완료 기록   | ❌ 관리자 | completion data         |
| GET    | `/daily`                   | 키워드 목록 조회        | ❌ 관리자 | query: priority, status |
| GET    | `/daily/:keywordId`        | 키워드 상세 정보 조회   | ❌ 관리자 | keywordId (required)    |
| PUT    | `/daily/:keywordId`        | 키워드 정보 업데이트    | ❌ 관리자 | keywordId + update data |
| PUT    | `/daily/:keywordId/status` | 키워드 활성화/비활성화  | ❌ 관리자 | keywordId + is_active   |
| DELETE | `/daily/:keywordId`        | 키워드 삭제             | ❌ 관리자 | keywordId (required)    |

### ⚙️ 키워드 갱신 스케줄 관리 (4개)

| Method | Endpoint                | Description             | Frontend  | Parameters           |
| ------ | ----------------------- | ----------------------- | --------- | -------------------- |
| POST   | `/schedule`             | 키워드 갱신 스케줄 생성 | ❌ 관리자 | schedule data object |
| GET    | `/schedule/pending`     | 실행 대기 스케줄 조회   | ❌ 관리자 | none                 |
| PUT    | `/schedule/:scheduleId` | 스케줄 상태 업데이트    | ❌ 관리자 | scheduleId + status  |
| DELETE | `/schedule/cleanup`     | 오래된 스케줄 정리      | ❌ 관리자 | none                 |

### 📊 키워드 성과 추적 (4개)

| Method | Endpoint                          | Description           | Frontend  | Parameters            |
| ------ | --------------------------------- | --------------------- | --------- | --------------------- |
| POST   | `/performance`                    | 키워드 성과 로그 저장 | ❌ 관리자 | performance data      |
| GET    | `/performance/stats`              | 키워드 성과 통계 조회 | ❌ 관리자 | query: days_back      |
| GET    | `/performance/dashboard`          | 키워드 성과 대시보드  | ❌ 관리자 | none                  |
| GET    | `/performance/:keywordId/history` | 키워드 성과 히스토리  | ❌ 관리자 | keywordId + days_back |

### 🔍 키워드 검색 및 필터링 (2개)

| Method | Endpoint                    | Description            | Frontend | Parameters               |
| ------ | --------------------------- | ---------------------- | -------- | ------------------------ |
| GET    | `/search`                   | 키워드 검색            | ⭐ 권장  | query: keyword, category |
| GET    | `/analytics/category-stats` | 카테고리별 키워드 통계 | ⭐ 권장  | none                     |

### 🧹 키워드 초기화 및 유틸리티 (3개)

| Method | Endpoint        | Description             | Frontend  | Parameters                  |
| ------ | --------------- | ----------------------- | --------- | --------------------------- |
| POST   | `/initialize`   | 키워드 실행 날짜 초기화 | ❌ 관리자 | none                        |
| GET    | `/update/today` | 오늘 갱신 대상 키워드   | ❌ 관리자 | none                        |
| PUT    | `/reorder`      | 키워드 순서 재정렬      | ❌ 관리자 | priority_tier + keyword_ids |

---

## ⚙️ System DB API (26개)

**Base URL**: `/api/v1/system_db`  
**Purpose**: 시스템 모니터링 및 성능 추적 (자동/관리자용)

### 🔌 API 사용량 추적 (3개)

| Method | Endpoint             | Description          | Frontend  | Parameters         |
| ------ | -------------------- | -------------------- | --------- | ------------------ |
| POST   | `/api-usage`         | API 사용량 로그 저장 | ❌ 자동   | usage data object  |
| GET    | `/api-usage/daily`   | 일일 API 사용량 조회 | ❌ 관리자 | query: target_date |
| GET    | `/api-usage/current` | 실시간 API 사용량    | ❌ 관리자 | none               |

### 💾 캐시 성능 추적 (3개)

| Method | Endpoint                    | Description         | Frontend  | Parameters       |
| ------ | --------------------------- | ------------------- | --------- | ---------------- |
| POST   | `/cache/performance`        | 캐시 성능 로그 저장 | ❌ 자동   | performance data |
| GET    | `/cache/efficiency-report`  | 캐시 효율성 리포트  | ❌ 관리자 | query: days_back |
| GET    | `/cache/current-efficiency` | 실시간 캐시 효율성  | ❌ 관리자 | none             |

### 🤖 LLM 처리 로깅 (3개)

| Method | Endpoint                  | Description          | Frontend  | Parameters        |
| ------ | ------------------------- | -------------------- | --------- | ----------------- |
| POST   | `/llm/processing`         | LLM 처리 로그 저장   | ❌ 자동   | processing data   |
| GET    | `/llm/cost-analysis`      | LLM 비용 분석        | ❌ 관리자 | query: start_date |
| GET    | `/llm/current-processing` | 실시간 LLM 처리 현황 | ❌ 관리자 | none              |

### 📊 시스템 성능 지표 (2개)

| Method | Endpoint                 | Description           | Frontend  | Parameters          |
| ------ | ------------------------ | --------------------- | --------- | ------------------- |
| POST   | `/performance`           | 시스템 성능 지표 저장 | ❌ 자동   | performance metrics |
| GET    | `/performance/dashboard` | 시스템 성능 대시보드  | ❌ 관리자 | query: hours_back   |

### 🤖 자동화 작업 관리 (3개)

| Method | Endpoint               | Description           | Frontend  | Parameters       |
| ------ | ---------------------- | --------------------- | --------- | ---------------- |
| POST   | `/jobs`                | 자동화 작업 로그 저장 | ❌ 자동   | job data object  |
| GET    | `/jobs/status-summary` | 자동화 작업 상태 요약 | ❌ 관리자 | query: days_back |
| GET    | `/jobs/recent-status`  | 최근 자동화 작업 현황 | ❌ 관리자 | none             |

### 👤 사용자 행동 분석 (2개)

| Method | Endpoint                 | Description           | Frontend | Parameters        |
| ------ | ------------------------ | --------------------- | -------- | ----------------- |
| POST   | `/user-behavior`         | 사용자 행동 분석 저장 | ❌ 자동  | behavior data     |
| GET    | `/user-behavior/:userId` | 사용자 행동 패턴 요약 | ⭐ 권장  | userId (required) |

### 🚨 실시간 알림 시스템 (3개)

| Method | Endpoint           | Description               | Frontend  | Parameters        |
| ------ | ------------------ | ------------------------- | --------- | ----------------- |
| POST   | `/alerts`          | 시스템 알림 생성          | ❌ 자동   | alert data object |
| GET    | `/alerts/active`   | 활성 시스템 알림 조회     | ❌ 관리자 | none              |
| PUT    | `/alerts/:alertId` | 시스템 알림 상태 업데이트 | ❌ 관리자 | alertId + status  |

### 💼 비즈니스 지표 관리 (3개)

| Method | Endpoint                      | Description             | Frontend  | Parameters         |
| ------ | ----------------------------- | ----------------------- | --------- | ------------------ |
| POST   | `/business-metrics`           | 비즈니스 지표 저장      | ❌ 자동   | metrics data       |
| POST   | `/business-metrics/aggregate` | 일일 비즈니스 지표 집계 | ❌ 자동   | query: target_date |
| GET    | `/business-metrics/kpis`      | 일일 비즈니스 KPI       | ❌ 관리자 | query: days_back   |

### 🧹 시스템 유틸리티 (2개)

| Method | Endpoint                 | Description      | Frontend | Parameters |
| ------ | ------------------------ | ---------------- | -------- | ---------- |
| DELETE | `/cleanup/old-logs`      | 오래된 로그 정리 | ❌ 자동  | none       |
| POST   | `/performance/aggregate` | 성능 통계 집계   | ❌ 자동  | none       |

---

## 🔍 Search DB API (18개)

**Base URL**: `/api/v1/search_db`  
**Purpose**: 검색 로깅 및 성능 분석

### 📝 사용자 검색 로깅 (5개)

| Method | Endpoint                       | Description           | Frontend | Parameters               |
| ------ | ------------------------------ | --------------------- | -------- | ------------------------ |
| POST   | `/user-search`                 | 사용자 검색 로그 저장 | ✅ 필수  | search data object       |
| GET    | `/user-search/history/:userId` | 사용자 검색 히스토리  | ✅ 필수  | userId + query: limit    |
| GET    | `/popular-terms`               | 인기 검색어 조회      | ✅ 필수  | query: days_back, limit  |
| GET    | `/recent-searches`             | 최근 검색 로그 조회   | ⭐ 권장  | query: hours_back, limit |
| PUT    | `/feedback/:searchId`          | 검색 피드백 업데이트  | ⭐ 권장  | searchId + feedback data |

### 📊 검색 분석 및 패턴 (3개)

| Method | Endpoint        | Description        | Frontend  | Parameters       |
| ------ | --------------- | ------------------ | --------- | ---------------- |
| GET    | `/patterns`     | 검색 패턴 분석     | ❌ 관리자 | query: days_back |
| GET    | `/analytics`    | 검색 분석 대시보드 | ❌ 관리자 | query filters    |
| GET    | `/trend-report` | 검색 트렌드 리포트 | ❌ 관리자 | query: days_back |

### 💾 캐시 성능 추적 (2개)

| Method | Endpoint                   | Description         | Frontend  | Parameters       |
| ------ | -------------------------- | ------------------- | --------- | ---------------- |
| POST   | `/cache/track`             | 캐시 성능 추적 저장 | ❌ 자동   | performance data |
| GET    | `/cache/efficiency-report` | 캐시 효율성 리포트  | ❌ 관리자 | query: days_back |

### 🔌 API 사용량 관리 (4개)

| Method | Endpoint              | Description            | Frontend  | Parameters         |
| ------ | --------------------- | ---------------------- | --------- | ------------------ |
| POST   | `/api-usage/track`    | API 사용량 추적 저장   | ❌ 자동   | usage data         |
| GET    | `/api-usage/stats`    | API 사용량 통계        | ❌ 관리자 | query: days_back   |
| GET    | `/api-usage/optimize` | API 사용량 최적화 제안 | ❌ 관리자 | none               |
| GET    | `/api-usage/daily`    | 일일 API 사용량        | ❌ 관리자 | query: target_date |

### 📈 데이터 집계 및 관리 (4개)

| Method | Endpoint                | Description           | Frontend  | Parameters                |
| ------ | ----------------------- | --------------------- | --------- | ------------------------- |
| POST   | `/metrics/aggregate`    | 검색 메트릭 집계      | ❌ 자동   | none                      |
| GET    | `/metrics/user/:userId` | 사용자별 검색 메트릭  | ⭐ 권장   | userId + query: days_back |
| DELETE | `/cleanup/old-logs`     | 오래된 검색 로그 정리 | ❌ 자동   | query: days_to_keep       |
| GET    | `/metrics/summary`      | 검색 메트릭 요약      | ❌ 관리자 | none                      |

---

## 📈 Trends DB API (22개)

**Base URL**: `/api/v1/trends_db`  
**Purpose**: 트렌드 데이터 관리 및 분석

### 📊 Google Trends 데이터 관리 (7개)

| Method | Endpoint                  | Description               | Frontend  | Parameters              |
| ------ | ------------------------- | ------------------------- | --------- | ----------------------- |
| POST   | `/google-trends`          | Google Trends 데이터 저장 | ❌ 자동   | trends data object      |
| GET    | `/google-trends/:keyword` | 키워드별 Google Trends    | ⭐ 권장   | keyword + query filters |
| PUT    | `/google-trends/:trendId` | Google Trends 업데이트    | ❌ 관리자 | trendId + update data   |
| DELETE | `/google-trends/:trendId` | Google Trends 삭제        | ❌ 관리자 | trendId (required)      |
| POST   | `/google-trends/bulk`     | Google Trends 일괄 저장   | ❌ 자동   | trends array            |
| GET    | `/google-trends/recent`   | 최근 Google Trends        | ⭐ 권장   | query filters           |
| GET    | `/google-trends/search`   | Google Trends 검색        | ⭐ 권장   | query filters           |

### 🔍 키워드 트렌드 분석 (6개)

| Method | Endpoint                       | Description        | Frontend | Parameters               |
| ------ | ------------------------------ | ------------------ | -------- | ------------------------ |
| GET    | `/keywords/trending`           | 트렌딩 키워드 조회 | ✅ 필수  | query filters            |
| GET    | `/keywords/rising`             | 급상승 키워드 조회 | ✅ 필수  | query filters            |
| GET    | `/keywords/category/:category` | 카테고리별 트렌드  | ✅ 필수  | category + query filters |
| POST   | `/keywords/analyze`            | 키워드 트렌드 분석 | ⭐ 권장  | analysis request         |
| GET    | `/keywords/compare`            | 키워드 트렌드 비교 | ⭐ 권장  | query: keywords          |
| GET    | `/keywords/predictions`        | 키워드 트렌드 예측 | ⭐ 권장  | query filters            |

### 📰 뉴스 기반 키워드 관리 (4개)

| Method | Endpoint                    | Description           | Frontend  | Parameters              |
| ------ | --------------------------- | --------------------- | --------- | ----------------------- |
| POST   | `/news-keywords`            | 뉴스 기반 키워드 저장 | ❌ 자동   | news keywords data      |
| GET    | `/news-keywords`            | 뉴스 기반 키워드 조회 | ⭐ 권장   | query filters           |
| PUT    | `/news-keywords/:keywordId` | 뉴스 키워드 업데이트  | ❌ 관리자 | keywordId + update data |
| POST   | `/news-keywords/refine`     | 뉴스 키워드 정제      | ❌ 자동   | refinement request      |

### 📊 트렌드 통계 및 분석 (3개)

| Method | Endpoint              | Description          | Frontend  | Parameters    |
| ------ | --------------------- | -------------------- | --------- | ------------- |
| GET    | `/analytics/stats`    | 트렌드 통계 조회     | ❌ 관리자 | query filters |
| GET    | `/analytics/patterns` | 트렌드 패턴 분석     | ❌ 관리자 | query filters |
| GET    | `/analytics/insights` | 트렌드 인사이트 생성 | ❌ 관리자 | query filters |

### 🧹 유틸리티 및 관리 (2개)

| Method | Endpoint           | Description        | Frontend  | Parameters |
| ------ | ------------------ | ------------------ | --------- | ---------- |
| DELETE | `/cleanup/expired` | 만료된 트렌드 정리 | ❌ 자동   | none       |
| GET    | `/dashboard`       | 트렌드 대시보드    | ❌ 관리자 | none       |

---

## 🚀 API 사용 우선순위 가이드

### ✅ 프론트엔드 1차 필수 (코어 기능)

#### 📺 Videos DB 필수 APIs

```javascript
// 인기 영상 조회
GET /api/v1/videos_db/popular

// 카테고리별 영상
GET /api/v1/videos_db/category/:category

// 영상 캐시 조회 (성능 향상)
GET /api/v1/videos_db/cache/:videoId
```

#### 🔍 Search DB 필수 APIs

```javascript
// 사용자 검색 로그 저장
POST /api/v1/search_db/user-search

// 검색 히스토리 조회
GET /api/v1/search_db/user-search/history/:userId

// 인기 검색어
GET /api/v1/search_db/popular-terms
```

#### 📈 Trends DB 필수 APIs

```javascript
// 트렌딩 키워드
GET /api/v1/trends_db/keywords/trending

// 급상승 키워드
GET /api/v1/trends_db/keywords/rising

// 카테고리별 트렌드
GET /api/v1/trends_db/keywords/category/:category
```

### ⭐ 프론트엔드 2차 권장 (향상된 UX)

#### 📊 Analytics APIs

```javascript
// 사용자별 검색 메트릭
GET /api/v1/search_db/metrics/user/:userId

// 사용자 행동 패턴
GET /api/v1/system_db/user-behavior/:userId

// 카테고리 통계
GET /api/v1/videos_db/stats/categories
```

### ❌ 관리자 전용 (3차 또는 불필요)

- **Keywords DB**: 대부분 관리자용
- **System DB**: 대부분 자동/관리자용
- **분석 및 통계**: 관리자 대시보드용

---

## 💡 성능 최적화 팁

### 🚀 빠른 API 우선 사용

1. **Videos Cache API**: 이미 처리된 영상 데이터
2. **Popular Terms**: 사전 집계된 인기 검색어
3. **Trending Keywords**: 캐시된 트렌드 데이터

### 💾 캐시 전략

- **영상 데이터**: 7일간 캐시
- **트렌드 데이터**: 4시간 캐시
- **인기 검색어**: 1시간 캐시

### 🔄 실시간 업데이트가 필요한 APIs

- **사용자 검색 로그**: 즉시 저장
- **감정/키워드 선택**: 즉시 기록
- **영상 상호작용**: 즉시 추적

---

**문서 버전**: 1.0.0  
**마지막 업데이트**: 2025-01-27  
**총 Database APIs**: 147개
