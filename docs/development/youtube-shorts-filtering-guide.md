# YouTube Shorts 재생 가능 영상 필터링 가이드

> 재생 불가 문제를 완벽하게 해결하는 2단계 필터링 워크플로우

## 🎯 핵심 문제와 해결책

### 문제점
- search.list는 기본 정보만 제공 (embeddable, status 정보 없음)
- 일부 영상은 임베드 불가, 지역 제한, 비공개 등의 이유로 재생 불가
- Shorts 여부도 정확한 duration 없이는 확인 불가

### 해결책: 2단계 필터링
1. **search.list**: 후보 영상 검색 (videoDuration: 'short')
2. **videos.list**: 상세 정보로 재생 가능 여부 확인

## 📋 2단계 필터링 워크플로우

```javascript
class YouTubeShortsService {
  constructor(apiKey) {
    this.youtube = google.youtube({ version: 'v3', auth: apiKey });
    this.videoFilter = new VideoFilter();
  }

  // 메인 검색 함수
  async searchPlayableShorts(keyword, options = {}) {
    try {
      // 1단계: search.list로 후보 검색
      console.log(`[Step 1] Searching for: ${keyword}`);
      const searchResults = await this.performSearch(keyword, options);
      
      if (!searchResults.items || searchResults.items.length === 0) {
        console.log('No search results found');
        return [];
      }
      
      // 2단계: 2단계 필터링 수행
      console.log(`[Step 2] Filtering ${searchResults.items.length} videos`);
      const playableShorts = await this.videoFilter.performTwoStepFiltering(searchResults);
      
      console.log(`[Result] Found ${playableShorts.length} playable shorts`);
      return playableShorts;
      
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
  
  // search.list 수행
  async performSearch(keyword, options) {
    const searchParams = {
      part: 'snippet',
      q: keyword,
      type: 'video',
      videoDuration: 'short',      // 4분 미만
      maxResults: options.maxResults || 50,
      order: options.order || 'viewCount',
      publishedAfter: options.publishedAfter || new Date(Date.now() - 30*24*60*60*1000).toISOString(),
      regionCode: options.regionCode || 'KR',
      relevanceLanguage: options.relevanceLanguage || 'ko',
      safeSearch: options.safeSearch || 'moderate'
    };
    
    const response = await this.youtube.search.list(searchParams);
    return response.data;
  }
}
```

## 🔍 필터링 상세 체크리스트

### 재생 가능 여부 확인 (filterPlayableVideos)

```javascript
filterPlayableVideos(videos) {
  return videos.filter(video => {
    // 1. 임베드 가능 여부 (가장 중요!)
    if (!video.status.embeddable) {
      console.log(`❌ Not embeddable: ${video.id}`);
      return false;
    }
    
    // 2. 공개 상태
    if (video.status.privacyStatus !== 'public') {
      console.log(`❌ Not public: ${video.id} (${video.status.privacyStatus})`);
      return false;
    }
    
    // 3. 업로드 상태
    if (video.status.uploadStatus !== 'processed') {
      console.log(`❌ Not processed: ${video.id}`);
      return false;
    }
    
    // 4. 지역 제한
    const restrictions = video.contentDetails.regionRestriction;
    if (restrictions) {
      // 차단 국가 목록에 한국이 있는 경우
      if (restrictions.blocked && restrictions.blocked.includes('KR')) {
        console.log(`❌ Blocked in KR: ${video.id}`);
        return false;
      }
      // 허용 국가 목록이 있는데 한국이 없는 경우
      if (restrictions.allowed && !restrictions.allowed.includes('KR')) {
        console.log(`❌ Not allowed in KR: ${video.id}`);
        return false;
      }
    }
    
    // 5. 콘텐츠 등급
    const contentRating = video.contentDetails.contentRating;
    if (contentRating && contentRating.ytRating === 'ytAgeRestricted') {
      console.log(`❌ Age restricted: ${video.id}`);
      return false;
    }
    
    // 6. Shorts 길이 확인 (60초 이하)
    const duration = parseDuration(video.contentDetails.duration);
    if (duration > 60) {
      console.log(`❌ Too long for Shorts: ${video.id} (${duration}s)`);
      return false;
    }
    
    // 7. 라이선스 제한
    if (video.status.license !== 'youtube' && 
        video.contentDetails.licensedContent) {
      console.log(`⚠️ Licensed content: ${video.id}`);
      // 경고만, 필터링하지는 않음
    }
    
    console.log(`✅ Playable: ${video.id}`);
    return true;
  });
}
```

## 💰 API 할당량 최적화

### 비용 계산
```javascript
// 검색당 API 비용
const costPerSearch = {
  searchList: 100,  // search.list
  videosList: 7,    // videos.list with status,contentDetails,snippet,statistics
  total: 107        // 총 비용
};

// 일일 가능 검색 횟수
const dailySearches = Math.floor(10000 / costPerSearch.total); // ~93회
```

### 최적화 전략
1. **배치 처리**: videos.list는 최대 50개 ID를 한번에 처리
2. **캐싱 활용**: 재생 가능한 영상은 장기 캐싱
3. **실패 기록**: 재생 불가 영상 ID는 별도 저장하여 재검사 방지

## 📊 캐싱 전략

```javascript
class PlayableVideoCache {
  constructor() {
    this.cache = new CacheManager();
    this.ttl = {
      playable: 7 * 24 * 60 * 60,      // 7일 - 재생 가능 영상
      notPlayable: 24 * 60 * 60,       // 1일 - 재생 불가 영상
      searchResults: 4 * 60 * 60       // 4시간 - 검색 결과
    };
  }
  
  async cacheFilteredResults(keyword, videos) {
    // 재생 가능한 영상 캐싱
    const playableIds = videos.map(v => v.id);
    await this.cache.set(
      `playable:${keyword}`,
      { ids: playableIds, videos },
      this.ttl.playable
    );
    
    // 개별 영상 정보도 캐싱
    for (const video of videos) {
      await this.cache.set(
        `video:${video.id}`,
        video,
        this.ttl.playable
      );
    }
  }
  
  async getCachedResults(keyword) {
    const cached = await this.cache.get(`playable:${keyword}`);
    if (cached) {
      console.log(`Cache hit for: ${keyword}`);
      return cached.videos;
    }
    return null;
  }
}
```

## 🚨 에러 처리

```javascript
async function handleVideoErrors(video, error) {
  const errorHandlers = {
    // 임베드 불가
    'Video is not embeddable': {
      action: 'skip',
      log: true,
      cache: true,
      ttl: 7 * 24 * 60 * 60  // 7일간 재확인 안함
    },
    
    // 지역 제한
    'Video is blocked in your region': {
      action: 'skip',
      log: true,
      cache: true,
      ttl: 30 * 24 * 60 * 60  // 30일간 재확인 안함
    },
    
    // 삭제된 영상
    'Video not found': {
      action: 'remove',
      log: true,
      cache: true,
      ttl: Infinity  // 영구 차단
    },
    
    // API 할당량 초과
    'Quota exceeded': {
      action: 'fallback',
      log: true,
      cache: false,
      fallback: 'use_cached_data'
    }
  };
  
  const handler = errorHandlers[error.message] || {
    action: 'skip',
    log: true,
    cache: false
  };
  
  if (handler.log) {
    console.error(`Error for video ${video.id}: ${error.message}`);
  }
  
  if (handler.cache) {
    await cacheError(video.id, error.message, handler.ttl);
  }
  
  return handler;
}
```

## 📈 모니터링 및 통계

```javascript
class FilteringStats {
  constructor() {
    this.stats = {
      searches: 0,
      totalVideos: 0,
      playableVideos: 0,
      reasons: {
        notEmbeddable: 0,
        notPublic: 0,
        regionBlocked: 0,
        tooLong: 0,
        ageRestricted: 0,
        other: 0
      }
    };
  }
  
  logFiltering(total, playable, reasons) {
    this.stats.searches++;
    this.stats.totalVideos += total;
    this.stats.playableVideos += playable;
    
    // 필터링 이유별 통계
    Object.entries(reasons).forEach(([reason, count]) => {
      this.stats.reasons[reason] += count;
    });
    
    // 성공률 계산
    const successRate = (playable / total * 100).toFixed(2);
    console.log(`Filtering success rate: ${successRate}%`);
    
    // 주요 필터링 원인 분석
    if (successRate < 70) {
      this.analyzeFilteringIssues();
    }
  }
  
  analyzeFilteringIssues() {
    const topReasons = Object.entries(this.stats.reasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
      
    console.warn('Low success rate detected. Top filtering reasons:');
    topReasons.forEach(([reason, count]) => {
      const percentage = (count / this.stats.totalVideos * 100).toFixed(2);
      console.warn(`- ${reason}: ${count} (${percentage}%)`);
    });
  }
}
```

## 🔧 구현 예시

```javascript
// 실제 사용 예시
async function main() {
  const shortsService = new YouTubeShortsService(API_KEY);
  const keyword = '운동 루틴';
  
  try {
    // 캐시 확인
    const cached = await playableCache.getCachedResults(keyword);
    if (cached) {
      return cached;
    }
    
    // 새로 검색 및 필터링
    const playableShorts = await shortsService.searchPlayableShorts(keyword, {
      maxResults: 50,
      order: 'viewCount',
      publishedAfter: new Date(Date.now() - 7*24*60*60*1000).toISOString()
    });
    
    // 결과 캐싱
    await playableCache.cacheFilteredResults(keyword, playableShorts);
    
    // 통계 기록
    filteringStats.logFiltering(50, playableShorts.length, {
      /* filtering reasons */
    });
    
    return playableShorts;
    
  } catch (error) {
    console.error('Search failed:', error);
    
    // 에러 처리
    const errorHandler = await handleVideoErrors(null, error);
    if (errorHandler.action === 'fallback') {
      return await getFallbackData(keyword);
    }
    
    throw error;
  }
}
```

## ✅ 체크리스트

### 개발 시
- [ ] search.list 후 반드시 videos.list 호출
- [ ] status.embeddable 확인 필수
- [ ] 지역 제한 확인 (KR)
- [ ] duration 60초 이하 확인
- [ ] 에러 영상 ID 캐싱

### 운영 시
- [ ] 필터링 성공률 모니터링 (목표: 70% 이상)
- [ ] API 할당량 사용률 확인
- [ ] 캐시 히트율 확인 (목표: 85% 이상)
- [ ] 재생 불가 원인 분석 및 개선

---

이 가이드를 따르면 YouTube Shorts 재생 불가 문제를 최소화하고 사용자에게 항상 재생 가능한 영상만 제공할 수 있습니다. 