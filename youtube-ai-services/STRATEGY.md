# 🎯 YouTube Shorts AI 큐레이션 전략 문서

> 테스트 결과 기반 최적화된 검색 및 캐싱 전략

## 📊 핵심 발견사항 요약

### 1. OR 연산의 심각한 문제점 ⚠️

```javascript
// 의도한 결과 vs 실제 결과
"BTS | BTS 브이로그 | BTS 무대";
// 의도: 33% + 33% + 33%
// 실제: 36% + 4% + 60% (첫 번째 키워드 압도적 우세)

"산책하는 강아지 | 신나는 댄스 | 맛있는 요리";
// 의도: 33% + 33% + 33%
// 실제: 20% + 0% + 10% + 70%(무관)
```

**결론**: YouTube 알고리즘이 검색 인기도 기반으로 키워드 선택 → OR 연산 비추천

### 2. 단독 키워드 검색의 우수성 ✅

- **"BTS 댄스"**: 1,000,000개 결과, 95% 키워드 매칭률
- **"BTS 브이로그"**: 1,000,000개 결과, 85% 키워드 매칭률
- **속도**: OR 연산 대비 2-3배 빠름
- **품질**: 키워드 관련성 훨씬 높음

### 3. 2단계 필터링의 필수성 🎬

```javascript
// 1단계: search.list (100 units)
const searchResults = await youtube.search.list({
  q: keyword,
  type: "video",
  videoDuration: "short",
});

// 2단계: videos.list (7 units for 50 videos)
const detailedVideos = await youtube.videos.list({
  part: "snippet,contentDetails,status",
  id: videoIds.join(","),
});

// 3단계: 재생 가능 영상만 필터링
const playableVideos = detailedVideos.filter(
  (video) =>
    video.status.embeddable &&
    video.status.privacyStatus === "public" &&
    !isRegionBlocked(video, "KR") &&
    getDuration(video) <= 60
);
```

## 🚀 최종 검색 전략

### 핵심 전략: **주제 검색 + AI 감정 태깅**

#### 1. API 검색 방식

```javascript
// ✅ 추천: 주제별 단독 검색
const topics = ["재즈", "로파이", "댄스", "요리", "운동"];

for (const topic of topics) {
  const videos = await searchYouTubeShorts(topic); // 107 units
  await analyzeAndTagEmotions(videos); // AI 감정 분석
}
```

#### 2. 감정 태깅 시스템

```javascript
// 검색된 영상에 AI 기반 감정 태그 부여
const videoTags = {
  "Lofi Hip Hop Mix - Chill Study Beats": ["힐링", "집중", "편안함"],
  "Energetic Jazz for Morning": ["활력", "에너지", "상쾌함"],
  "Romantic Jazz Piano": ["로맨틱", "감성", "따뜻함"],
};
```

## 💰 API 할당량 최적화 (일일 10,000 units)

### 사용량 배분 전략

```javascript
const dailyQuotaDistribution = {
  // 실시간 트렌드 (17%)
  realtimeTrends: {
    frequency: "2회/일 (오전/오후)",
    keywords: "8개/회 = 16개/일",
    cost: "16 × 107 = 1,712 units",
  },

  // 캐싱 키워드 갱신 (54%)
  cachedKeywords: {
    frequency: "30일 순환 (1,500개 키워드)",
    dailyAverage: "50개/일",
    cost: "50 × 107 = 5,350 units",
  },

  // 프리미엄 사용자 (19%)
  premiumUsers: {
    dailySearches: "17회",
    cost: "17 × 107 = 1,819 units",
  },

  // 예비 할당량 (10%)
  emergency: {
    reserve: "1,119 units",
    purpose: "캐시 미스, 피크 시간 대응",
  },
};
```

### API 비용 계산

```javascript
const apiCosts = {
  searchList: 100, // search.list
  videosList: 1 + parts.length * 2, // videos.list
  // 예: part='snippet,contentDetails,status' = 7 units
  total: 107, // per keyword search
};
```

## 🏗️ 데이터베이스 구조

### 1. 주제 테이블 (110개 핵심 주제)

```sql
CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,     -- "재즈", "댄스", "요리"
  category varchar(50),           -- "music", "activity", "food"
  priority integer,               -- 검색 우선순위 (1-5)
  api_cost integer DEFAULT 107,   -- 검색 비용
  last_searched timestamptz,
  video_count integer DEFAULT 0,
  avg_quality_score float DEFAULT 0,
  cache_duration interval DEFAULT '30 days'
);
```

### 2. 영상 캐시 테이블

```sql
CREATE TABLE video_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id varchar(20) UNIQUE NOT NULL,
  topic_id uuid REFERENCES topics(id),
  title text,
  channel_name varchar(255),
  channel_id varchar(50),
  duration integer,
  view_count bigint,
  like_count integer,
  engagement_rate float,
  quality_score float,
  thumbnail_url text,
  is_playable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '30 days',

  -- 인덱스
  INDEX idx_video_topic (topic_id),
  INDEX idx_video_quality (quality_score DESC),
  INDEX idx_video_expires (expires_at)
);
```

### 3. 감정 태그 테이블

```sql
CREATE TABLE emotion_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL,      -- "힐링", "활력", "집중"
  category varchar(30),           -- "mood", "energy", "time"
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE video_emotion_tags (
  video_id uuid REFERENCES video_cache(id),
  emotion_id uuid REFERENCES emotion_tags(id),
  confidence_score float,         -- AI 태깅 신뢰도
  created_at timestamptz DEFAULT now(),

  PRIMARY KEY (video_id, emotion_id)
);
```

## 🎭 110개 핵심 주제 선정

### 음악 (30개)

```javascript
const musicTopics = [
  // 장르별 (20개)
  "재즈",
  "로파이",
  "클래식",
  "팝",
  "힙합",
  "록",
  "일렉트로닉",
  "R&B",
  "어쿠스틱",
  "피아노",
  "기타",
  "바이올린",
  "재즈피아노",
  "뉴에이지",
  "앰비언트",
  "칠아웃",
  "보사노바",
  "블루스",
  "펑크",
  "레게",

  // 상황별 (10개)
  "집중음악",
  "수면음악",
  "운동음악",
  "카페음악",
  "공부음악",
  "명상음악",
  "출근길음악",
  "요가음악",
  "독서음악",
  "힐링음악",
];
```

### 라이프스타일 (25개)

```javascript
const lifestyleTopics = [
  // 요리 (8개)
  "요리",
  "베이킹",
  "디저트",
  "음료",
  "샐러드",
  "간단요리",
  "건강식",
  "비건",

  // 운동/건강 (8개)
  "운동",
  "요가",
  "스트레칭",
  "홈트",
  "헬스",
  "러닝",
  "명상",
  "필라테스",

  // 일상 (9개)
  "정리정돈",
  "청소",
  "인테리어",
  "식물",
  "반려동물",
  "독서",
  "공부",
  "플래너",
  "미니멀",
];
```

### 엔터테인먼트 (20개)

```javascript
const entertainmentTopics = [
  // 댄스/퍼포먼스 (8개)
  "댄스",
  "K-pop댄스",
  "방송댄스",
  "라인댄스",
  "커버댄스",
  "안무",
  "스트릿댄스",
  "발레",

  // 창작/예술 (7개)
  "그림",
  "캘리그라피",
  "만들기",
  "DIY",
  "수공예",
  "도자기",
  "꽃꽂이",

  // 게임/기술 (5개)
  "게임",
  "모바일게임",
  "리뷰",
  "언박싱",
  "기술소개",
];
```

### 자연/힐링 (15개)

```javascript
const natureTopics = [
  // 자연 (8개)
  "자연",
  "바다",
  "산",
  "숲",
  "비",
  "눈",
  "일출",
  "일몰",

  // ASMR/힐링 (7개)
  "ASMR",
  "백색소음",
  "빗소리",
  "파도소리",
  "새소리",
  "바람소리",
  "캠프파이어",
];
```

### 여행/문화 (20개)

```javascript
const travelTopics = [
  // 국내여행 (10개)
  "서울",
  "부산",
  "제주도",
  "강릉",
  "경주",
  "전주",
  "속초",
  "여수",
  "춘천",
  "가평",

  // 해외여행 (5개)
  "일본",
  "유럽",
  "동남아",
  "미국",
  "중국",

  // 문화 (5개)
  "카페",
  "맛집",
  "축제",
  "전통",
  "건축",
];
```

## 🔄 운영 워크플로우

### 일일 작업 (자동화)

```javascript
// 오전 8시 - 실시간 트렌드 수집
await collectRealtimeTrends(); // 8개 키워드, 856 units

// 오후 3시 - 실시간 트렌드 수집
await collectRealtimeTrends(); // 8개 키워드, 856 units

// 자동 순환 - 캐싱 키워드 갱신
await updateCachedKeywords(50); // 50개 키워드, 5,350 units
```

### 주간 작업

```javascript
// 일요일 - 주제 우선순위 재계산
await recalculateTopicPriorities();

// 수요일 - 품질 점수 재평가
await updateQualityScores();
```

### 월간 작업

```javascript
// 매월 1일 - 새로운 주제 발굴
await discoverNewTopics();

// 매월 15일 - 사용량 분석 및 최적화
await optimizeQuotaUsage();
```

## 🎯 감정 분석 최적화

### 비용 효율적인 방법

```javascript
// 1. 제목 기반 키워드 매칭 (무료)
const titleBasedEmotion = {
  힐링: ["힐링", "편안", "릴렉스", "치유", "안정"],
  활력: ["신나는", "에너지", "활기", "파워", "업"],
  집중: ["집중", "공부", "포커스", "몰입", "차분"],
};

// 2. 배치 처리로 AI 비용 절약
const batchEmotionAnalysis = async (videos) => {
  // 100개씩 배치로 처리하여 API 호출 최소화
  const batches = chunk(videos, 100);
  for (const batch of batches) {
    await analyzeEmotionsBatch(batch); // 1회 API 호출
  }
};

// 3. 캐싱으로 중복 분석 방지
const emotionCache = new Map();
if (emotionCache.has(videoId)) {
  return emotionCache.get(videoId);
}
```

## 📈 성능 지표 및 모니터링

### 목표 KPI

```javascript
const targetKPIs = {
  apiQuotaUsage: "< 8,000 units/day (80%)",
  cacheHitRate: "> 85%",
  filteringSuccessRate: "> 70%",
  responseTime: "< 500ms",
  videoQualityScore: "> 7.0/10",
  emotionTaggingAccuracy: "> 80%",
};
```

### 일일 모니터링

```javascript
// 매일 체크할 항목
const dailyChecks = [
  "API 사용량 확인",
  "캐시 적중률 확인",
  "필터링 성공률 확인",
  "새로운 에러 로그 확인",
  "사용자 피드백 확인",
];
```

## 🚨 비상 계획

### API 할당량 초과 시

```javascript
if (quotaUsagePercent > 90) {
  // 캐시 전용 모드 활성화
  enableCacheOnlyMode();

  // 긴급 알림 발송
  sendEmergencyAlert();

  // 프리미엄 검색 일시 중단
  disablePremiumSearch();
}
```

### 품질 저하 시

```javascript
if (avgQualityScore < 6.0) {
  // 필터링 기준 강화
  tightenFilteringCriteria();

  // 주제 우선순위 재조정
  adjustTopicPriorities();
}
```

## 🎉 예상 효과

### 사용자 경험

- **검색 품질 향상**: 95% 키워드 관련성
- **다양성 확보**: 110개 주제 × 다양한 감정 조합
- **반응 속도**: 85% 캐시 적중으로 빠른 응답

### 운영 효율성

- **API 비용 절약**: OR 연산 대비 3배 효율
- **확장 가능성**: 주제별 독립 캐싱으로 무한 확장
- **유지보수성**: 모듈화된 구조로 쉬운 관리

---

> **최종 업데이트**: 2024년 6월 12일  
> **다음 리뷰**: 2024년 7월 12일 (1개월 운영 후 성과 분석)
