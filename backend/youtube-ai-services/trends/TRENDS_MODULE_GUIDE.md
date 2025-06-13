# 🎯 Trends 모듈 가이드

## 📊 모듈 개요

trends 모듈은 실시간 트렌드 수집을 담당합니다.

```
trends/
├── modules/
│   ├── google-trends-collector.js     # Google 트렌드 수집
│   └── zum-trends-collector.js        # ZUM 트렌드 수집
└── TRENDS_MODULE_GUIDE.md             # 이 파일
```

## 🛠️ 주요 기능

### google-trends-collector.js

- **getActiveKoreanTrends()**: 활성 한국 트렌드 수집
- **수집 범위**: 구글 트렌드 KR 지역
- **필터링**: isActive가 true인 키워드만
- **테스트 결과**: 77개 중 20개 활성 키워드 추출

### zum-trends-collector.js

- **collectZumTrends()**: ZUM 실시간 이슈 수집
- **수집 범위**: ZUM 검색 페이지
- **데이터**: 한국 실시간 뉴스 이슈

## 📋 사용법

### 기본 트렌드 수집

```javascript
import { getActiveKoreanTrends } from "./modules/google-trends-collector.js";

// 한국 활성 트렌드 수집
const rawTrends = await getActiveKoreanTrends();

if (rawTrends.success) {
  console.log(`✅ ${rawTrends.keywords.length}개 키워드 수집`);
  console.log("키워드:", rawTrends.keywords);
}
```

### 통합 트렌드 수집

```javascript
import { collectAllTrends } from "./trends-collector.js";

// 모든 트렌드 수집 (Google + ZUM)
const allTrends = await collectAllTrends();

console.log("한국 트렌드:", allTrends.google.trends.KR);
console.log("ZUM 이슈:", allTrends.zum.trends);
```

## 🚨 중요 설정

### 환경 변수 (필수)

```bash
# .env 파일
GOOGLE_TRENDS_API_KEY=your_key       # Google Trends 수집용
```

## 🎯 다음 단계

### 키워드 정제

수집된 원본 트렌드는 `keywords` 모듈의 `news-based-trend-refiner.js`에서 정제됩니다:

```javascript
// keywords 모듈과 연계
import { getActiveKoreanTrends } from "../trends/modules/google-trends-collector.js";
import { refineKoreanTrends } from "../keywords/modules/news-based-trend-refiner.js";

// 1. 원본 수집
const rawTrends = await getActiveKoreanTrends();

// 2. 키워드 정제 (keywords 모듈에서)
const refined = await refineKoreanTrends(rawTrends.keywords);
```

---

## 📊 현재 상태: ✅ 완전 동작

**기능**:

- Google 트렌드 수집 ✅
- ZUM 트렌드 수집 ✅
- 통합 수집 인터페이스 ✅

**다음 작업**: keywords 모듈과의 연계 강화
