# YouTube Data API v3 매개변수 완전 가이드

> YouTube Shorts 큐레이션 프로젝트를 위한 API 매개변수 상세 문서

## 📊 API 할당량 정보

| 엔드포인트  | 할당량 비용 | 일일 할당량 기준 최대 호출 |
| ----------- | ----------- | -------------------------- |
| search.list | 100 units   | 100회                      |
| videos.list | 1 unit      | 10,000회                   |

**일일 할당량**: 10,000 units

## 1. search.list API

> 검색 쿼리와 일치하는 YouTube 리소스를 찾습니다.

### 🔗 엔드포인트

```
GET https://www.googleapis.com/youtube/v3/search
```

### ✅ 필수 매개변수

| 매개변수 | 타입   | 설명                          | 예시           |
| -------- | ------ | ----------------------------- | -------------- |
| **part** | string | API 응답에 포함할 리소스 속성 | `snippet`      |
| **key**  | string | API 키                        | `YOUR_API_KEY` |

### 🔍 필터 매개변수 (다음 중 0개 또는 1개 지정)

#### 기본 검색 필터

| 매개변수             | 타입    | 설명                                 | 예시                            |
| -------------------- | ------- | ------------------------------------ | ------------------------------- |
| **q**                | string  | 검색어 (최대 500자)                  | `운동 루틴`                     |
| **channelId**        | string  | 특정 채널의 리소스만 검색            | `UCxxxxxx`                      |
| **channelType**      | string  | 채널 유형 필터                       | `any`, `show`                   |
| **eventType**        | string  | 이벤트 유형 필터 (type=video일 때만) | `completed`, `live`, `upcoming` |
| **forContentOwner**  | boolean | 콘텐츠 소유자용 검색                 | `true`                          |
| **forDeveloper**     | boolean | 개발자용 검색                        | `true`                          |
| **forMine**          | boolean | 내 콘텐츠 검색 (인증 필요)           | `true`                          |
| **location**         | string  | 지리적 위치 (lat,lng)                | `37.5665,126.9780`              |
| **locationRadius**   | string  | 위치 반경                            | `10km`, `5mi`, `1000m`          |
| **relatedToVideoId** | string  | 관련 동영상 검색 (2018년 중단)       | `dQw4w9WgXcQ`                   |

#### 동영상 관련 필터 (type=video일 때만)

| 매개변수            | 타입   | 설명               | 값                                                       |
| ------------------- | ------ | ------------------ | -------------------------------------------------------- |
| **videoCaption**    | string | 자막 여부          | `any`, `closedCaption`, `none`                           |
| **videoCategoryId** | string | 동영상 카테고리 ID | `10` (음악), `22` (블로그), `23` (코미디)                |
| **videoDefinition** | string | 동영상 화질        | `any`, `high`, `standard`                                |
| **videoDimension**  | string | 2D/3D 동영상       | `2d`, `3d`, `any`                                        |
| **videoDuration**   | string | 동영상 길이        | `short` (<4분), `medium` (4-20분), `long` (>20분), `any` |
| **videoEmbeddable** | string | 임베드 가능 여부   | `any`, `true`                                            |
| **videoLicense**    | string | 라이선스 유형      | `any`, `creativeCommon`, `youtube`                       |
| **videoSyndicated** | string | 외부 재생 가능     | `any`, `true`                                            |
| **videoType**       | string | 동영상 유형        | `any`, `episode`, `movie`                                |

### 📋 선택적 매개변수

#### 결과 제어

| 매개변수              | 타입     | 설명                           | 기본값                   | 범위/값                                                           |
| --------------------- | -------- | ------------------------------ | ------------------------ | ----------------------------------------------------------------- |
| **maxResults**        | integer  | 반환할 최대 결과 수            | 5                        | 0-50                                                              |
| **order**             | string   | 정렬 기준                      | `relevance`              | `date`, `rating`, `relevance`, `title`, `videoCount`, `viewCount` |
| **pageToken**         | string   | 다음/이전 페이지 토큰          | -                        | `CAUQAA`                                                          |
| **publishedAfter**    | datetime | 이후 게시된 리소스             | -                        | `2024-01-01T00:00:00Z`                                            |
| **publishedBefore**   | datetime | 이전 게시된 리소스             | -                        | `2024-12-31T23:59:59Z`                                            |
| **regionCode**        | string   | 지역 코드 (ISO 3166-1 alpha-2) | US                       | `KR`, `JP`, `US`                                                  |
| **relevanceLanguage** | string   | 관련성 언어 (ISO 639-1)        | -                        | `ko`, `en`, `ja`                                                  |
| **safeSearch**        | string   | 제한된 콘텐츠 필터링           | `moderate`               | `moderate`, `none`, `strict`                                      |
| **topicId**           | string   | 주제 ID (Freebase 주제)        | -                        | `/m/04rlf` (음악)                                                 |
| **type**              | string   | 리소스 유형 (쉼표 구분)        | `video,channel,playlist` | `video`, `channel`, `playlist`                                    |

#### 콘텐츠 소유자 매개변수

| 매개변수                   | 타입   | 설명             | 예시 |
| -------------------------- | ------ | ---------------- | ---- |
| **onBehalfOfContentOwner** | string | 콘텐츠 소유자 ID | -    |

### 💡 YouTube Shorts 검색을 위한 최적 설정

```javascript
const searchParams = {
  part: "snippet",
  q: "검색어",
  type: "video",
  videoDuration: "short", // 4분 미만 영상
  maxResults: 50, // 최대값 활용
  order: "viewCount", // 인기순 정렬
  publishedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 최근 30일
  regionCode: "KR",
  relevanceLanguage: "ko",
  safeSearch: "moderate",
  videoEmbeddable: "true", // 임베드 가능
  videoLicense: "any", // 모든 라이선스
};
```

### 📋 search.list 응답 구조

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
          "high": { "url": "https://...", "width": 480, "height": 360 },
          "standard": { "url": "https://...", "width": 640, "height": 480 },
          "maxres": { "url": "https://...", "width": 1280, "height": 720 }
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

| 매개변수 | 타입   | 설명                           | 예시                                |
| -------- | ------ | ------------------------------ | ----------------------------------- |
| **part** | string | 포함할 리소스 속성 (쉼표 구분) | `snippet,contentDetails,statistics` |
| **key**  | string | API 키                         | `YOUR_API_KEY`                      |

### 🔍 필터 (최소 1개 필수)

| 매개변수     | 타입   | 설명                       | 예시                      |
| ------------ | ------ | -------------------------- | ------------------------- |
| **id**       | string | 동영상 ID (쉼표로 여러 개) | `dQw4w9WgXcQ,oHg5SJYRHA0` |
| **chart**    | string | 차트 기준                  | `mostPopular`             |
| **myRating** | string | 내 평가 기준               | `like`, `dislike`         |

### 📋 선택적 매개변수

| 매개변수                   | 타입    | 설명                               | 예시     |
| -------------------------- | ------- | ---------------------------------- | -------- |
| **hl**                     | string  | 텍스트 값의 언어                   | `ko`     |
| **maxHeight**              | integer | 플레이어 최대 높이                 | `720`    |
| **maxResults**             | integer | 최대 결과 수 (0-50)                | `50`     |
| **maxWidth**               | integer | 플레이어 최대 너비                 | `1280`   |
| **onBehalfOfContentOwner** | string  | 콘텐츠 소유자 ID                   | -        |
| **pageToken**              | string  | 페이지 토큰                        | `CAUQAA` |
| **regionCode**             | string  | 지역 코드                          | `KR`     |
| **videoCategoryId**        | string  | 카테고리 ID (chart=mostPopular 시) | `10`     |

### 🧩 part 매개변수 상세

| Part                     | 설명                        | 할당량 비용 | 포함 정보                   |
| ------------------------ | --------------------------- | ----------- | --------------------------- |
| **snippet**              | 제목, 설명, 태그, 썸네일 등 | +2          | 제목, 설명, 태그, 썸네일    |
| **contentDetails**       | 길이, 화질, 자막 등         | +2          | 길이, 화질, 자막, 지역제한  |
| **fileDetails**          | 파일 정보 (소유자만)        | +1          | 파일 크기, 비트레이트       |
| **id**                   | 동영상 ID                   | 0           | videoId                     |
| **liveStreamingDetails** | 라이브 스트림 정보          | +2          | 시작/종료 시간, 동시 시청자 |
| **localizations**        | 현지화 정보                 | +2          | 다국어 제목/설명            |
| **player**               | 임베드 플레이어             | 0           | 임베드 HTML                 |
| **processingDetails**    | 처리 상태                   | +1          | 업로드 처리 상태            |
| **recordingDetails**     | 녹화 정보                   | +2          | 녹화 위치/시간              |
| **statistics**           | 통계 정보                   | +2          | 조회수, 좋아요, 댓글 수     |
| **status**               | 상태 정보                   | +2          | 공개 상태, 임베드 가능 여부 |
| **suggestions**          | 개선 제안 (소유자만)        | +1          | 품질 개선 제안              |
| **topicDetails**         | 주제 정보                   | +2          | Freebase 주제 ID            |

### 📋 videos.list 응답 구조

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
        "thumbnails": {
          "default": { "url": "https://...", "width": 120, "height": 90 },
          "medium": { "url": "https://...", "width": 320, "height": 180 },
          "high": { "url": "https://...", "width": 480, "height": 360 },
          "standard": { "url": "https://...", "width": 640, "height": 480 },
          "maxres": { "url": "https://...", "width": 1280, "height": 720 }
        },
        "channelTitle": "채널명",
        "tags": ["태그1", "태그2"],
        "categoryId": "22",
        "liveBroadcastContent": "none",
        "defaultLanguage": "ko",
        "localized": {
          "title": "현지화된 제목",
          "description": "현지화된 설명"
        },
        "defaultAudioLanguage": "ko"
      },
      "contentDetails": {
        "duration": "PT59S",
        "dimension": "2d",
        "definition": "hd",
        "caption": "true",
        "licensedContent": true,
        "regionRestriction": {
          "allowed": ["KR", "US"],
          "blocked": ["CN"]
        },
        "contentRating": {
          "ytRating": "ytAgeRestricted"
        },
        "projection": "rectangular",
        "hasCustomThumbnail": true
      },
      "status": {
        "uploadStatus": "processed",
        "privacyStatus": "public",
        "license": "youtube",
        "embeddable": true,
        "publicStatsViewable": true,
        "madeForKids": false,
        "selfDeclaredMadeForKids": false
      },
      "statistics": {
        "viewCount": "1234567",
        "likeCount": "12345",
        "favoriteCount": "0",
        "commentCount": "1234"
      },
      "player": {
        "embedHtml": "<iframe width=\"480\" height=\"270\" src=\"//www.youtube.com/embed/dQw4w9WgXcQ\" frameborder=\"0\" allowfullscreen></iframe>"
      },
      "topicDetails": {
        "topicIds": ["/m/04rlf"],
        "relevantTopicIds": ["/m/04rlf", "/m/02mscn"],
        "topicCategories": ["https://en.wikipedia.org/wiki/Music"]
      },
      "recordingDetails": {
        "recordingDate": "2024-01-01T00:00:00Z",
        "location": {
          "latitude": 37.5665,
          "longitude": 126.978,
          "altitude": 100.0
        },
        "locationDescription": "서울, 대한민국"
      },
      "fileDetails": {
        "fileName": "video.mp4",
        "fileSize": "12345678",
        "fileType": "video",
        "container": "mp4",
        "videoStreams": [
          {
            "widthPixels": 1920,
            "heightPixels": 1080,
            "frameRateFps": 30.0,
            "aspectRatio": 1.7777777777777777,
            "codec": "h264",
            "bitrateBps": "2000000",
            "rotation": "none",
            "vendor": "unknown"
          }
        ],
        "audioStreams": [
          {
            "channelCount": 2,
            "codec": "aac",
            "bitrateBps": "128000",
            "vendor": "unknown"
          }
        ],
        "durationMs": "59000",
        "bitrateBps": "2128000",
        "creationTime": "2024-01-01T00:00:00.000Z"
      },
      "processingDetails": {
        "processingStatus": "succeeded",
        "processingProgress": {
          "partsTotal": "100",
          "partsProcessed": "100",
          "timeLeftMs": "0"
        },
        "processingFailureReason": "none",
        "fileDetailsAvailability": "available",
        "processingIssuesAvailability": "available",
        "tagSuggestionsAvailability": "available",
        "editorSuggestionsAvailability": "available",
        "thumbnailsAvailability": "available"
      },
      "suggestions": {
        "processingErrors": [],
        "processingWarnings": [],
        "processingHints": [],
        "tagSuggestions": [
          {
            "tag": "music",
            "categoryRestricts": ["music"]
          }
        ],
        "editorSuggestions": ["audioQuietAudioSwap"]
      },
      "liveStreamingDetails": {
        "actualStartTime": "2024-01-01T00:00:00Z",
        "actualEndTime": "2024-01-01T01:00:00Z",
        "scheduledStartTime": "2024-01-01T00:00:00Z",
        "scheduledEndTime": "2024-01-01T01:00:00Z",
        "concurrentViewers": "1000",
        "activeLiveChatId": "live_chat_id"
      },
      "localizations": {
        "ko": {
          "title": "한국어 제목",
          "description": "한국어 설명"
        },
        "en": {
          "title": "English Title",
          "description": "English Description"
        }
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
    part: "snippet",
    q: keyword,
    type: "video",
    videoDuration: "short", // 4분 미만
    maxResults: 50,
    order: "viewCount",
    publishedAfter: getDateBefore(30), // 최근 30일
    regionCode: "KR",
    relevanceLanguage: "ko",
    safeSearch: "moderate",
    videoEmbeddable: "true",
  });

  return searchResponse.data.items.map((item) => item.id.videoId);
}

// 2단계: videos.list로 정확한 길이 확인
async function filterTrueShorts(videoIds) {
  const videosResponse = await youtube.videos.list({
    part: "contentDetails,statistics,status",
    id: videoIds.join(","),
    hl: "ko",
    regionCode: "KR",
  });

  return videosResponse.data.items.filter((video) => {
    const duration = parseDuration(video.contentDetails.duration);
    const isEmbeddable = video.status.embeddable;
    const isPublic = video.status.privacyStatus === "public";
    const viewCount = parseInt(video.statistics.viewCount);

    return duration <= 60 && isEmbeddable && isPublic && viewCount >= 1000;
  });
}
```

## 4. 에러 처리

### 🚨 search.list 에러

| 에러 코드 | 에러 타입                | 설명             | 해결 방법                           |
| --------- | ------------------------ | ---------------- | ----------------------------------- |
| 400       | invalidChannelId         | 잘못된 채널 ID   | 채널 ID 형식 확인 (UC로 시작)       |
| 400       | invalidLocation          | 잘못된 위치 형식 | lat,lng 형식 확인                   |
| 400       | invalidRelevanceLanguage | 잘못된 언어 코드 | ISO 639-1 코드 사용                 |
| 400       | invalidSearchFilter      | 잘못된 필터 조합 | type=video 설정 후 비디오 필터 사용 |
| 400       | invalidVideoId           | 잘못된 비디오 ID | 비디오 ID 형식 확인                 |
| 403       | quotaExceeded            | 할당량 초과      | 캐싱 활용, 다음날 재시도            |
| 403       | forbidden                | 접근 권한 없음   | API 키 권한 확인                    |

### 🚨 videos.list 에러

| 에러 코드 | 에러 타입         | 설명                | 해결 방법                    |
| --------- | ----------------- | ------------------- | ---------------------------- |
| 400       | invalidVideoId    | 잘못된 동영상 ID    | ID 형식 확인 (11자리 문자열) |
| 400       | processingFailure | 처리 실패           | 동영상 처리 완료 후 재시도   |
| 403       | forbidden         | 접근 권한 없음      | 공개 영상인지 확인           |
| 404       | videoNotFound     | 영상을 찾을 수 없음 | 삭제되거나 비공개 영상       |

## 5. 카테고리 ID 참조

| ID  | 카테고리           | 영어명               | Shorts 관련도 |
| --- | ------------------ | -------------------- | ------------- |
| 1   | 영화 및 애니메이션 | Film & Animation     | ⭐⭐⭐        |
| 2   | 자동차 및 차량     | Autos & Vehicles     | ⭐⭐          |
| 10  | 음악               | Music                | ⭐⭐⭐⭐⭐    |
| 15  | 반려동물 및 동물   | Pets & Animals       | ⭐⭐⭐⭐      |
| 17  | 스포츠             | Sports               | ⭐⭐⭐⭐      |
| 19  | 여행 및 이벤트     | Travel & Events      | ⭐⭐⭐        |
| 20  | 게임               | Gaming               | ⭐⭐⭐⭐⭐    |
| 22  | 사람 및 블로그     | People & Blogs       | ⭐⭐⭐⭐⭐    |
| 23  | 코미디             | Comedy               | ⭐⭐⭐⭐⭐    |
| 24  | 엔터테인먼트       | Entertainment        | ⭐⭐⭐⭐⭐    |
| 25  | 뉴스 및 정치       | News & Politics      | ⭐⭐          |
| 26  | 노하우 및 스타일   | Howto & Style        | ⭐⭐⭐⭐      |
| 27  | 교육               | Education            | ⭐⭐⭐        |
| 28  | 과학 기술          | Science & Technology | ⭐⭐⭐        |

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
parseDuration("PT59S"); // 59 (59초)
parseDuration("PT1M"); // 60 (1분)
parseDuration("PT1M30S"); // 90 (1분 30초)
parseDuration("PT1H2M3S"); // 3723 (1시간 2분 3초)
```

---

이 문서는 YouTube Data API v3의 search.list와 videos.list 엔드포인트의 **모든 매개변수**와 YouTube Shorts 큐레이션 프로젝트에서의 활용 방법을 완전히 담고 있습니다. 웹 검색 결과를 바탕으로 누락된 매개변수들을 모두 추가하였으며, API 할당량 최적화와 에러 처리 전략도 포함되어 있어 실제 구현 시 참고할 수 있습니다.
