# YouTube Data API v3 매개변수 완전 가이드

> YouTube Shorts 큐레이션 프로젝트를 위한 API 매개변수 상세 문서

## 📊 API 할당량 정보

| 엔드포인트 | 할당량 비용 | 일일 할당량 기준 최대 호출 |
|----------|-----------|-------------------|
| search.list | 100 units | 100회 |
| videos.list | 1 unit | 10,000회 |

**일일 할당량**: 10,000 units

## 1. search.list API

> 검색 쿼리와 일치하는 YouTube 리소스를 찾습니다.

### 🔗 엔드포인트
```
GET https://www.googleapis.com/youtube/v3/search
```

### ✅ 필수 매개변수

| 매개변수 | 타입 | 설명 | 예시 |
|---------|------|------|------|
| **part** | string | API 응답에 포함할 리소스 속성 | `snippet` |
| **key** | string | API 키 | `YOUR_API_KEY` |

### 🔍 검색 필터 (최소 1개 필수)

| 매개변수 | 타입 | 설명 | 예시 |
|---------|------|------|------|
| **q** | string | 검색어 | `운동 루틴` |
| **channelId** | string | 특정 채널의 리소스만 검색 | `UCxxxxxx` |
| **channelType** | string | 채널 유형 필터 | `any`, `show` |
| **eventType** | string | 이벤트 유형 필터 | `completed`, `live`, `upcoming` |
| **location** | string | 지리적 위치 (lat,lng) | `37.5665,126.9780` |
| **locationRadius** | string | 위치 반경 | `10km`, `5mi` |
| **maxResults** | integer | 반환할 최대 결과 수 (0-50) | `25` |
| **order** | string | 정렬 기준 | `date`, `rating`, `relevance`, `title`, `videoCount`, `viewCount` |
| **pageToken** | string | 다음/이전 페이지 토큰 | `CAUQAA` |
| **publishedAfter** | datetime | 이후 게시된 리소스 | `2024-01-01T00:00:00Z` |
| **publishedBefore** | datetime | 이전 게시된 리소스 | `2024-12-31T23:59:59Z` |
| **regionCode** | string | 지역 코드 (ISO 3166-1 alpha-2) | `KR` |
| **relevanceLanguage** | string | 관련성 언어 (ISO 639-1) | `ko` |
| **safeSearch** | string | 제한된 콘텐츠 필터링 | `moderate`, `none`, `strict` |
| **type** | string | 리소스 유형 | `video`, `channel`, `playlist` |
| **videoCaption** | string | 자막 여부 | `any`, `closedCaption`, `none` |
| **videoCategoryId** | string | 동영상 카테고리 ID | `10` (음악) |
| **videoDefinition** | string | 동영상 화질 | `any`, `high`, `standard` |
| **videoDimension** | string | 2D/3D 동영상 | `2d`, `3d`, `any` |
| **videoDuration** | string | 동영상 길이 | `short` (<4분), `medium` (4-20분), `long` (>20분) |
| **videoEmbeddable** | string | 임베드 가능 여부 | `any`, `true` |
| **videoLicense** | string | 라이선스 유형 | `any`, `creativeCommon`, `youtube` |
| **videoSyndicated** | string | 외부 재생 가능 | `any`, `true` |
| **videoType** | string | 동영상 유형 | `any`, `episode`, `movie` |

### 💡 YouTube Shorts 검색을 위한 최적 설정

```javascript
const searchParams = {
  part: 'snippet',
  q: '검색어',
  type: 'video',
  videoDuration: 'short',        // 4분 미만 영상
  maxResults: 50,                // 최대값 활용
  order: 'viewCount',            // 인기순 정렬
  publishedAfter: new Date(Date.now() - 30*24*60*60*1000).toISOString(), // 최근 30일
  regionCode: 'KR',
  relevanceLanguage: 'ko',
  safeSearch: 'moderate'
};
```

### 📋 응답 구조

```json
{
  "kind": "youtube#searchListResponse",
  "etag": "etag",
  "nextPageToken": "CAUQAA",
  "prevPageToken": "CBQQAQ",
  "regionCode": "KR",
  "pageInfo": {
    "totalResults": 1000000,
    "resultsPerPage": 50
  },
  "items": [
    {
      "kind": "youtube#searchResult",
      "etag": "etag",
      "id": {
        "kind": "youtube#video",
        "videoId": "dQw4w9WgXcQ"
      },
      "snippet": {
        "publishedAt": "2024-01-01T00:00:00Z",
        "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
        "title": "영상 제목",
        "description": "영상 설명",
        "thumbnails": {
          "default": { "url": "https://...", "width": 120, "height": 90 },
          "medium": { "url": "https://...", "width": 320, "height": 180 },
          "high": { "url": "https://...", "width": 480, "height": 360 }
        },
        "channelTitle": "채널명",
        "liveBroadcastContent": "none"
      }
    }
  ]
}
```

## 2. videos.list API

> 동영상의 상세 정보를 가져옵니다.

### 🔗 엔드포인트
```
GET https://www.googleapis.com/youtube/v3/videos
```

### ✅ 필수 매개변수

| 매개변수 | 타입 | 설명 | 예시 |
|---------|------|------|------|
| **part** | string | 포함할 리소스 속성 (쉼표 구분) | `snippet,contentDetails,statistics` |
| **key** | string | API 키 | `YOUR_API_KEY` |

### 🔍 필터 (최소 1개 필수)

| 매개변수 | 타입 | 설명 | 예시 |
|---------|------|------|------|
| **id** | string | 동영상 ID (쉼표로 여러 개) | `dQw4w9WgXcQ,oHg5SJYRHA0` |
| **chart** | string | 차트 기준 | `mostPopular` |
| **myRating** | string | 내 평가 기준 | `like`, `dislike` |

### 📊 선택적 매개변수

| 매개변수 | 타입 | 설명 | 예시 |
|---------|------|------|------|
| **hl** | string | 텍스트 값의 언어 | `ko` |
| **maxHeight** | integer | 플레이어 최대 높이 | `720` |
| **maxResults** | integer | 최대 결과 수 (0-50) | `50` |
| **maxWidth** | integer | 플레이어 최대 너비 | `1280` |
| **onBehalfOfContentOwner** | string | 콘텐츠 소유자 ID | - |
| **pageToken** | string | 페이지 토큰 | `CAUQAA` |
| **regionCode** | string | 지역 코드 | `KR` |
| **videoCategoryId** | string | 카테고리 ID (chart=mostPopular 시) | `10` |

### 🧩 Part 매개변수 상세

| Part | 설명 | 할당량 비용 |
|------|------|-----------|
| **snippet** | 제목, 설명, 태그, 썸네일 등 | +2 |
| **contentDetails** | 길이, 화질, 자막 등 | +2 |
| **fileDetails** | 파일 정보 (소유자만) | +1 |
| **id** | 동영상 ID | 0 |
| **liveStreamingDetails** | 라이브 스트림 정보 | +2 |
| **localizations** | 현지화 정보 | +2 |
| **player** | 임베드 플레이어 | 0 |
| **processingDetails** | 처리 상태 | +1 |
| **recordingDetails** | 녹화 위치/시간 | +2 |
| **statistics** | 조회수, 좋아요 등 | +2 |
| **status** | 공개 상태, 임베드 가능 여부 | +2 |
| **suggestions** | 개선 제안 (소유자만) | +1 |
| **topicDetails** | 주제 정보 | +2 |

### 💡 YouTube Shorts 확인을 위한 최적 설정

```javascript
const videoParams = {
  part: 'snippet,contentDetails,statistics,status',
  id: videoIds.join(','),  // 최대 50개
  hl: 'ko',
  regionCode: 'KR'
};

// Shorts 판별 로직
function isShorts(video) {
  const duration = video.contentDetails.duration;
  // ISO 8601 duration을 초로 변환
  const seconds = parseDuration(duration);
  return seconds <= 60;
}
```

### 📋 응답 구조

```json
{
  "kind": "youtube#videoListResponse",
  "etag": "etag",
  "nextPageToken": "CAUQAA",
  "prevPageToken": "CBQQAQ",
  "pageInfo": {
    "totalResults": 50,
    "resultsPerPage": 50
  },
  "items": [
    {
      "kind": "youtube#video",
      "etag": "etag",
      "id": "dQw4w9WgXcQ",
      "snippet": {
        "publishedAt": "2024-01-01T00:00:00Z",
        "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
        "title": "영상 제목",
        "description": "영상 설명",
        "thumbnails": { /* ... */ },
        "channelTitle": "채널명",
        "tags": ["태그1", "태그2"],
        "categoryId": "22",
        "liveBroadcastContent": "none",
        "defaultLanguage": "ko",
        "localized": {
          "title": "현지화된 제목",
          "description": "현지화된 설명"
        }
      },
      "contentDetails": {
        "duration": "PT59S",  // ISO 8601 (59초)
        "dimension": "2d",
        "definition": "hd",
        "caption": "true",
        "licensedContent": true,
        "regionRestriction": {
          "allowed": ["KR", "US"],
          "blocked": ["CN"]
        },
        "contentRating": {},
        "projection": "rectangular"
      },
      "status": {
        "uploadStatus": "processed",
        "privacyStatus": "public",
        "license": "youtube",
        "embeddable": true,
        "publicStatsViewable": true,
        "madeForKids": false
      },
      "statistics": {
        "viewCount": "1234567",
        "likeCount": "12345",
        "dislikeCount": "123",
        "favoriteCount": "0",
        "commentCount": "1234"
      }
    }
  ]
}
```

## 3. 프로젝트 활용 전략

### 🎯 YouTube Shorts 필터링 워크플로우

```javascript
// 1단계: search.list로 후보 영상 검색
async function searchShortsCandidates(keyword) {
  const searchResponse = await youtube.search.list({
    part: 'snippet',
    q: keyword,
    type: 'video',
    videoDuration: 'short',  // 4분 미만
    maxResults: 50,
    order: 'viewCount',
    publishedAfter: getDateBefore(30), // 최근 30일
    regionCode: 'KR'
  });
  
  return searchResponse.data.items.map(item => item.id.videoId);
}

// 2단계: videos.list로 정확한 길이 확인
async function filterTrueShorts(videoIds) {
  const videosResponse = await youtube.videos.list({
    part: 'contentDetails,statistics,status',
    id: videoIds.join(',')
  });
  
  return videosResponse.data.items.filter(video => {
    const duration = parseDuration(video.contentDetails.duration);
    const isEmbeddable = video.status.embeddable;
    const viewCount = parseInt(video.statistics.viewCount);
    
    return duration <= 60 && isEmbeddable && viewCount >= 10000;
  });
}

// 3단계: 캐싱 전략
const CACHE_STRATEGY = {
  popular: {
    minViews: 1000000,
    ttl: 30 * 24 * 60 * 60  // 30일
  },
  trending: {
    minViews: 100000,
    ttl: 7 * 24 * 60 * 60   // 7일
  },
  regular: {
    minViews: 10000,
    ttl: 24 * 60 * 60       // 1일
  }
};
```

### 📊 API 할당량 최적화

```javascript
// 배치 처리로 할당량 절약
class YouTubeAPIOptimizer {
  constructor() {
    this.searchQuota = 100;  // search.list 비용
    this.videoQuota = 1;     // videos.list 비용
    this.dailyQuota = 10000;
  }
  
  // 최적 배치 크기 계산
  getOptimalBatchSize() {
    // search.list 1회 = 100 units = videos.list 100회
    // 따라서 search 결과 50개를 모두 videos.list로 확인 가능
    return {
      search: 50,      // 최대값 사용
      videos: 50,      // 한 번에 50개씩 처리
      dailySearches: Math.floor(this.dailyQuota / (this.searchQuota + 50))  // ~66회
    };
  }
  
  // 스마트 캐싱으로 할당량 절약
  async getVideos(keyword) {
    // 1. 캐시 확인
    const cached = await cache.get(keyword);
    if (cached && !isExpired(cached)) {
      return cached.videos;
    }
    
    // 2. 인기 키워드는 더 오래 캐싱
    const isPopular = await this.isPopularKeyword(keyword);
    const ttl = isPopular ? 7 * 24 * 60 * 60 : 4 * 60 * 60;
    
    // 3. API 호출
    const videos = await this.fetchVideos(keyword);
    await cache.set(keyword, videos, ttl);
    
    return videos;
  }
}
```

## 4. 에러 처리

### 🚨 search.list 에러

| 에러 코드 | 에러 타입 | 설명 | 해결 방법 |
|----------|----------|------|----------|
| 400 | invalidChannelId | 잘못된 채널 ID | 채널 ID 형식 확인 |
| 400 | invalidLocation | 잘못된 위치 형식 | lat,lng 형식 확인 |
| 400 | invalidRelevanceLanguage | 잘못된 언어 코드 | ISO 639-1 코드 사용 |
| 400 | invalidSearchFilter | 잘못된 필터 조합 | type=video 설정 필요 |
| 403 | quotaExceeded | 할당량 초과 | 캐싱 활용, 다음날 재시도 |

### 🚨 videos.list 에러

| 에러 코드 | 에러 타입 | 설명 | 해결 방법 |
|----------|----------|------|----------|
| 400 | invalidVideoId | 잘못된 동영상 ID | ID 형식 확인 |
| 403 | forbidden | 접근 권한 없음 | 공개 영상만 접근 |
| 404 | videoNotFound | 영상을 찾을 수 없음 | 삭제된 영상 처리 |

### 💡 에러 처리 구현

```javascript
async function apiCallWithRetry(apiFunction, params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiFunction(params);
    } catch (error) {
      const errorCode = error.response?.data?.error?.code;
      
      // 재시도 불가능한 에러
      if (errorCode === 400 || errorCode === 404) {
        throw error;
      }
      
      // 할당량 초과
      if (errorCode === 403 && error.response?.data?.error?.errors?.[0]?.reason === 'quotaExceeded') {
        console.error('API 할당량 초과');
        // 캐시된 데이터 반환 또는 대체 로직
        return getCachedData(params);
      }
      
      // 재시도 가능한 에러 (네트워크 등)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      
      throw error;
    }
  }
}
```

## 5. 카테고리 ID 참조

| ID | 카테고리 | Shorts 관련도 |
|----|---------|-------------|
| 1 | Film & Animation | ⭐⭐⭐ |
| 2 | Autos & Vehicles | ⭐⭐ |
| 10 | Music | ⭐⭐⭐⭐⭐ |
| 15 | Pets & Animals | ⭐⭐⭐⭐ |
| 17 | Sports | ⭐⭐⭐⭐ |
| 19 | Travel & Events | ⭐⭐⭐ |
| 20 | Gaming | ⭐⭐⭐⭐⭐ |
| 22 | People & Blogs | ⭐⭐⭐⭐⭐ |
| 23 | Comedy | ⭐⭐⭐⭐⭐ |
| 24 | Entertainment | ⭐⭐⭐⭐⭐ |
| 25 | News & Politics | ⭐⭐ |
| 26 | Howto & Style | ⭐⭐⭐⭐ |
| 27 | Education | ⭐⭐⭐ |
| 28 | Science & Technology | ⭐⭐⭐ |

## 6. ISO 8601 Duration 파싱

```javascript
// YouTube API의 duration 형식 파싱
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// 예시
parseDuration('PT59S');    // 59 (59초)
parseDuration('PT1M');     // 60 (1분)
parseDuration('PT1M30S');  // 90 (1분 30초)
parseDuration('PT1H2M3S'); // 3723 (1시간 2분 3초)
```

## 7. 실전 구현 예시

```javascript
// YouTube Shorts 큐레이션 서비스 구현
class YouTubeShortsService {
  constructor(apiKey) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });
    this.cache = new CacheManager();
  }
  
  // 트렌딩 Shorts 가져오기
  async getTrendingShorts(category = null) {
    const cacheKey = `trending_${category || 'all'}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached) return cached;
    
    // 1. 인기 동영상 검색
    const searchParams = {
      part: 'snippet',
      type: 'video',
      videoDuration: 'short',
      order: 'viewCount',
      publishedAfter: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
      maxResults: 50,
      regionCode: 'KR',
      relevanceLanguage: 'ko'
    };
    
    if (category) {
      searchParams.videoCategoryId = category;
    }
    
    const searchResponse = await this.youtube.search.list(searchParams);
    const videoIds = searchResponse.data.items.map(item => item.id.videoId);
    
    // 2. 상세 정보로 Shorts 필터링
    const videosResponse = await this.youtube.videos.list({
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(','),
      hl: 'ko'
    });
    
    const shorts = videosResponse.data.items
      .filter(video => {
        const duration = parseDuration(video.contentDetails.duration);
        return duration <= 60;
      })
      .map(video => ({
        id: video.id,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.high.url,
        channelTitle: video.snippet.channelTitle,
        viewCount: parseInt(video.statistics.viewCount),
        likeCount: parseInt(video.statistics.likeCount),
        duration: parseDuration(video.contentDetails.duration),
        publishedAt: video.snippet.publishedAt
      }))
      .sort((a, b) => b.viewCount - a.viewCount);
    
    // 3. 캐싱 (4시간)
    await this.cache.set(cacheKey, shorts, 4 * 60 * 60);
    
    return shorts;
  }
  
  // 키워드 기반 Shorts 검색
  async searchShorts(keyword, options = {}) {
    const {
      maxResults = 25,
      order = 'relevance',
      safeSearch = 'moderate'
    } = options;
    
    // 캐시 확인
    const cacheKey = `search_${keyword}_${order}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      // API 호출
      const results = await this.searchAndFilter(keyword, {
        maxResults,
        order,
        safeSearch
      });
      
      // 캐싱 (1시간)
      await this.cache.set(cacheKey, results, 60 * 60);
      
      return results;
    } catch (error) {
      // 할당량 초과 시 캐시된 데이터 반환
      if (error.code === 403) {
        return this.cache.getAny(keyword) || [];
      }
      throw error;
    }
  }
}
```

---

이 문서는 YouTube Data API v3의 search.list와 videos.list 엔드포인트의 모든 매개변수와 YouTube Shorts 큐레이션 프로젝트에서의 활용 방법을 담고 있습니다. API 할당량 최적화와 에러 처리 전략도 포함되어 있어 실제 구현 시 참고할 수 있습니다. 