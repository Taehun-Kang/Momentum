# 🌟 트렌드 수집 시스템 (Trends Collection System)

YouTube Shorts AI 큐레이션을 위한 **Raw 트렌드 데이터 수집 시스템**입니다.  
Google Trends와 ZUM 실시간 이슈를 통합하여 **가공되지 않은 원본 데이터**를 지역별로 분리하여 수집합니다.

## 📁 파일 구조

```
trends/
├── trends-collector.js              ⭐ 통합 수집기 (메인 인터페이스)
├── modules/
│   ├── google-trends-collector.js   📊 Google Trends 수집기
│   └── zum-trends-collector.js      📰 ZUM 트렌드 수집기
└── TRENDS_MODULE_GUIDE.md                        📋 이 문서
```

## 🚀 사용법

### 기본 사용

```javascript
import { collectAllTrends } from "./trends/trends-collector.js";

// 모든 트렌드 수집 (Raw 데이터)
const trends = await collectAllTrends();

// 결과 접근
const koreanTrends = trends.google.trends.KR; // 한국 Google Trends 50개
const usTrends = trends.google.trends.US; // 미국 Google Trends 50개
const zumTrends = trends.zum.trends; // ZUM 실시간 이슈 10개
```

### 옵션 설정

```javascript
// 특정 소스만 수집
const onlyGoogle = await collectAllTrends({
  includeGoogle: true,
  includeZum: false,
});

const onlyZum = await collectAllTrends({
  includeGoogle: false,
  includeZum: true,
});
```

## 📊 데이터 구조

### 응답 형태

```javascript
{
  google: {
    trends: {
      KR: [        // 한국 Google Trends (최대 50개)
        {
          keyword: "ios26",
          rank: 1,
          source: "google_trending_now",
          region: "KR",
          searchVolume: 5000,
          increasePercentage: 1000,
          categories: [...],
          relatedTerms: [...],
          isActive: true,
          timestamp: "2024-01-10T12:00:00.000Z"
        }
      ],
      US: [        // 미국 Google Trends (최대 50개)
        {
          keyword: "sly stone",
          rank: 1,
          source: "google_trending_now",
          region: "US",
          searchVolume: 200000,
          increasePercentage: 1000,
          categories: [...],
          relatedTerms: [...],
          isActive: true,
          timestamp: "2024-01-10T12:00:00.000Z"
        }
      ]
    }
  },
  zum: {
    trends: [      // ZUM 실시간 이슈 (10개 내외)
      {
        keyword: "조계사 화재",
        rank: 1,
        source: "zum",
        category: "news",
        timestamp: "2024-01-10T12:00:00.000Z"
      }
    ]
  }
}
```

## 🔥 핵심 특징

### ✅ Raw 데이터 중심

- **점수 계산 없음**: 복잡한 가중치나 점수 계산 로직 완전 제거
- **순위 매기기 없음**: Google과 ZUM의 원본 순서 그대로 유지
- **가공 최소화**: 수집된 데이터를 최대한 원본 상태로 제공

### 📍 지역별 분리

- **한국**: Google Trends KR 지역 상위 50개
- **미국**: Google Trends US 지역 상위 50개
- **ZUM**: 한국 실시간 이슈 키워드 10개 내외

### 🏗️ 모듈별 책임 분리

- **trends-collector.js**: 순수 통합 기능만 담당
- **google-trends-collector.js**: Google 데이터 수집 + 출력
- **zum-trends-collector.js**: ZUM 데이터 수집 + 출력

## 📋 출력 예시

```
🌟 통합 트렌드 수집 시작 (Raw 데이터)...
📊 Google Trends 수집 중...
✅ Google: KR 50개, US 50개 수집

📋 ===== 🇰🇷 한국 Google Trends =====
총 50개의 한국 트렌드:
  1. ios26
  2. 뷔
  3. 국민추천제
  ...
===== 한국 트렌드 끝 =====

📋 ===== 🇺🇸 미국 Google Trends =====
총 50개의 미국 트렌드:
  1. sly stone
  2. ios 26 release date
  3. jaire alexander
  ...
===== 미국 트렌드 끝 =====

📰 ZUM Trends 수집 중...
✅ ZUM: 10개 수집

📋 ===== 📰 ZUM 실시간 이슈 =====
총 10개의 ZUM 트렌드:
  1. 조계사 화재
  2. 우상호 정무수석 협치
  3. 공직자 국민 추천제
  ...
===== ZUM 트렌드 끝 =====

🔄 Raw 데이터 수집 완료
```

## ⚙️ 개별 모듈 설명

### 📊 Google Trends 수집기

**파일**: `modules/google-trends-collector.js`

- **API**: SerpAPI (Google Trends Trending Now)
- **지역**: KR (한국), US (미국)
- **수량**: 각 지역당 최대 50개
- **캐시**: 1시간 캐시 사용 (성능 최적화)
- **데이터**: 검색량, 증가율, 카테고리, 관련 검색어 포함

**주요 함수**:

```javascript
collectAllGoogleTrends(options); // 메인 수집 함수
processRawTrends(allTrends); // 지역별 분리 처리
displayTrendsByRegion(trends); // 지역별 출력
```

### 📰 ZUM 트렌드 수집기

**파일**: `modules/zum-trends-collector.js`

- **소스**: ZUM 검색 페이지 (실시간 검색어)
- **방식**: 직접 HTTP 스크래핑
- **수량**: 10개 내외
- **선택자**: `.issue-keyword-wrapper span.txt`
- **데이터**: 한국 실시간 뉴스 이슈

**주요 함수**:

```javascript
collectZumTrends(options); // 메인 수집 함수
displayZumTrends(trends); // ZUM 출력
```

## 🎯 설계 원칙

### 1. **단일 책임 원칙**

- 각 모듈이 자신의 기능에만 집중
- 통합 로직과 수집 로직 분리
- 출력 로직도 각 모듈에서 담당

### 2. **Raw 데이터 우선**

- 복잡한 가공 로직 최소화
- 원본 데이터의 순서와 형태 최대한 유지
- 후처리는 상위 레벨에서 담당

### 3. **확장 가능한 구조**

- 새로운 트렌드 소스 추가 용이
- 모듈 독립성으로 개별 수정 가능
- 인터페이스 일관성 유지

## 📈 성능 특징

### API 사용량 최적화

- **Google Trends**: SerpAPI 1시간 캐시 활용
- **ZUM**: 직접 스크래핑으로 API 비용 없음
- **응답 시간**: 평균 2-3초 (캐시 모드)

### 캐시 전략

- **Google**: 1시간 캐시로 안정성과 성능 균형
- **ZUM**: 실시간 수집으로 최신 이슈 반영
- **적중률**: 85% 이상 목표

## 🔧 개발 가이드

### 새로운 트렌드 소스 추가

1. `modules/` 폴더에 새 수집기 생성
2. 기본 인터페이스 구현:
   ```javascript
   async collectXxxTrends(options)
   displayXxxTrends(trends)
   ```
3. `trends-collector.js`에 통합

### 출력 형식 수정

- 각 모듈의 `display*` 함수만 수정
- 통합 수집기는 변경 불필요

### 데이터 구조 확장

- 각 수집기의 데이터 객체 구조 수정
- 상위 호출자는 자동으로 새 구조 사용

## 🚨 주의사항

1. **API 키 필수**: Google Trends 수집에 SerpAPI 키 필요
2. **네트워크 의존**: 실시간 데이터 수집으로 네트워크 안정성 중요
3. **선택자 변경**: ZUM 사이트 구조 변경 시 선택자 업데이트 필요
4. **Rate Limiting**: 과도한 호출 시 API 제한 가능성

## 📝 사용 예시

### YouTube 키워드 분석

```javascript
const trends = await collectAllTrends();

// 한국 트렌드로 YouTube 검색
const koreanKeywords = trends.google.trends.KR.map((t) => t.keyword);
for (const keyword of koreanKeywords) {
  const youtubeResults = await searchYouTubeShorts(keyword);
  // 분석 로직...
}

// ZUM 이슈로 실시간 컨텐츠 발굴
const hotIssues = trends.zum.trends.map((t) => t.keyword);
// 이슈 기반 컨텐츠 추천...
```

### 트렌드 분석 대시보드

```javascript
const trends = await collectAllTrends();

const analysis = {
  totalTrends:
    trends.google.trends.KR.length +
    trends.google.trends.US.length +
    trends.zum.trends.length,

  koreanTech: trends.google.trends.KR.filter((t) =>
    t.categories?.some((c) => c.name === "Technology")
  ),

  globalCommon: findCommonTrends(
    trends.google.trends.KR,
    trends.google.trends.US
  ),

  hotIssues: trends.zum.trends.slice(0, 5),
};
```

---

**📅 마지막 업데이트**: 2025년 6월 10일  
**🔧 개발자**: YouTube Shorts AI 큐레이션 팀
