# YouTube iframe API 완벽 가이드

> 출처: [YouTube iframe API Reference](https://developers.google.com/youtube/iframe_api_reference)  
> 출처: [YouTube Player Parameters](https://developers.google.com/youtube/player_parameters)

## 📋 목차

1. [API 요구사항](#api-요구사항)
2. [기본 설정](#기본-설정)
3. [YT.Player 생성자](#ytplayer-생성자)
4. [Player Parameters](#player-parameters)
5. [이벤트 처리](#이벤트-처리)
6. [메소드 목록](#메소드-목록)
7. [오류 처리](#오류-처리)
8. [베스트 프랙티스](#베스트-프랙티스)

---

## API 요구사항

### 필수 조건

- **postMessage 지원**: 모든 모던 브라우저에서 지원
- **최소 크기**: 200px × 200px (컨트롤 표시 시 더 커야 함)
- **권장 크기**: 16:9 비율 기준 최소 480px × 270px
- **필수 함수**: `onYouTubeIframeAPIReady()` 전역 함수 구현 필요

### 브라우저 호환성

- Chrome, Firefox, Safari, Edge 지원
- 모바일 브라우저 지원 (iOS, Android)

---

## 기본 설정

### 1. API 스크립트 로드

```javascript
// 비동기 API 로드 (권장 방식)
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
```

### 2. 전역 콜백 함수

```javascript
function onYouTubeIframeAPIReady() {
  // API 로드 완료 후 플레이어 생성
  console.log("YouTube API 로드 완료");
}
```

---

## YT.Player 생성자

### 기본 구조

```javascript
var player = new YT.Player("player-element-id", {
  height: "390",
  width: "640",
  videoId: "VIDEO_ID",
  playerVars: {
    // 플레이어 파라미터들
  },
  events: {
    onReady: onPlayerReady,
    onStateChange: onPlayerStateChange,
    onError: onPlayerError,
  },
});
```

### 생성자 파라미터

- **첫 번째 인수**: DOM 요소 ID 또는 DOM 요소 객체
- **두 번째 인수**: 설정 객체
  - `width` (number): 플레이어 너비 (기본값: 640)
  - `height` (number): 플레이어 높이 (기본값: 390)
  - `videoId` (string): YouTube 비디오 ID
  - `playerVars` (object): 플레이어 파라미터들
  - `events` (object): 이벤트 리스너들

---

## Player Parameters

### 🎯 2025년 기준 유효한 파라미터들

#### 필수/추천 파라미터

```javascript
playerVars: {
  // 🔧 컨트롤 및 UI
  controls: 0,              // 0=숨김, 1=표시(기본값)
  disablekb: 1,            // 1=키보드 컨트롤 비활성화
  fs: 0,                   // 0=전체화면 버튼 숨김

  // 🎬 재생 설정
  autoplay: 0,             // 0=수동재생(기본값), 1=자동재생
  loop: 1,                 // 1=반복재생
  playlist: 'VIDEO_ID',    // loop=1과 함께 사용 필요
  mute: 1,                 // 1=음소거 시작 (자동재생 시 필요)

  // 📱 모바일 최적화
  playsinline: 1,          // 1=인라인 재생 (iOS)

  // 🔗 관련 동영상
  rel: 0,                  // 0=같은 채널 관련 동영상만

  // 🎨 UI 요소
  iv_load_policy: 3,       // 3=주석 숨김
  cc_load_policy: 0,       // 0=자막 숨김

  // 🔒 보안
  enablejsapi: 1,          // 1=JavaScript API 활성화
  origin: window.location.origin,

  // 🌍 지역화
  hl: 'ko',               // 인터페이스 언어
  cc_lang_pref: 'ko',     // 자막 언어

  // 🎨 스타일링
  color: 'white'          // 진행바 색상 (red/white)
}
```

#### ❌ Deprecated된 파라미터들 (2025년 기준)

```javascript
// 🚫 더 이상 작동하지 않음
modestbranding: 1,  // 2023년 8월 deprecated
showinfo: 0,        // 2018년 deprecated
autohide: 1,        // HTML5에서 deprecated
theme: 'dark'       // HTML5에서 deprecated
```

### 시간 관련 파라미터

```javascript
start: 30,          // 30초부터 시작
end: 120           // 120초에서 종료
```

---

## 이벤트 처리

### 주요 이벤트들

```javascript
events: {
  'onReady': onPlayerReady,                    // 플레이어 준비 완료
  'onStateChange': onPlayerStateChange,        // 재생 상태 변경
  'onError': onPlayerError,                    // 오류 발생
  'onPlaybackQualityChange': onQualityChange,  // 화질 변경
  'onPlaybackRateChange': onRateChange,        // 재생 속도 변경
  'onApiChange': onApiChange                   // API 모듈 로드
}
```

### 플레이어 상태 값들

```javascript
YT.PlayerState.UNSTARTED = -1; // 시작되지 않음
YT.PlayerState.ENDED = 0; // 종료됨
YT.PlayerState.PLAYING = 1; // 재생 중
YT.PlayerState.PAUSED = 2; // 일시정지
YT.PlayerState.BUFFERING = 3; // 버퍼링 중
YT.PlayerState.CUED = 5; // 동영상 준비됨
```

### 오류 코드들

```javascript
2:   잘못된 비디오 ID
5:   HTML5 플레이어 오류
100: 비디오를 찾을 수 없음
101: 임베드 불허 (비공개)
150: 임베드 불허 (제한)
```

---

## 메소드 목록

### 재생 제어

```javascript
player.playVideo(); // 재생
player.pauseVideo(); // 일시정지
player.stopVideo(); // 정지
player.seekTo(seconds); // 특정 시간으로 이동
player.clearVideo(); // 비디오 지우기 (deprecated)
```

### 볼륨 제어

```javascript
player.mute(); // 음소거
player.unMute(); // 음소거 해제
player.isMuted(); // 음소거 상태 확인
player.setVolume(volume); // 볼륨 설정 (0-100)
player.getVolume(); // 볼륨 가져오기
```

### 정보 가져오기

```javascript
player.getDuration(); // 총 길이 (초)
player.getCurrentTime(); // 현재 재생 시간 (초)
player.getVideoLoadedFraction(); // 로드된 비율 (0-1)
player.getPlayerState(); // 현재 상태
player.getVideoUrl(); // 비디오 URL
player.getVideoEmbedCode(); // 임베드 코드
```

### 재생 품질

```javascript
player.getPlaybackQuality(); // 현재 화질
player.setPlaybackQuality(quality); // 화질 설정
player.getAvailableQualityLevels(); // 사용 가능한 화질들
```

### 재생 속도

```javascript
player.getPlaybackRate(); // 현재 재생 속도
player.setPlaybackRate(rate); // 재생 속도 설정
player.getAvailablePlaybackRates(); // 사용 가능한 속도들
```

### 플레이어 조작

```javascript
player.setSize(width, height); // 크기 조정
player.destroy(); // 플레이어 제거
player.getIframe(); // iframe 요소 가져오기
```

---

## 오류 처리

### 안전한 메소드 호출

```javascript
function safeCall(method, ...args) {
  try {
    if (player && typeof player[method] === "function") {
      return player[method](...args);
    }
  } catch (error) {
    console.warn(`YouTube API 호출 실패: ${method}`, error);
    return null;
  }
}

// 사용 예
const duration = safeCall("getDuration") || 30;
```

### 플레이어 상태 확인

```javascript
function isPlayerReady() {
  return (
    player &&
    typeof player.getPlayerState === "function" &&
    player.getPlayerState() !== undefined
  );
}
```

---

## 베스트 프랙티스

### 1. API 로딩 최적화

```javascript
// 중복 로딩 방지
if (!window.YT) {
  loadYouTubeAPI();
} else if (window.YT.Player) {
  createPlayer();
} else {
  // API는 로드됐지만 Player 클래스 대기 중
  window.onYouTubeIframeAPIReady = createPlayer;
}
```

### 2. 반응형 플레이어

```javascript
function createResponsivePlayer() {
  const container = document.getElementById("player-container");
  const width = container.offsetWidth;
  const height = Math.round((width * 9) / 16); // 16:9 비율

  return new YT.Player("player", {
    width: width,
    height: height,
    // ... 기타 설정
  });
}
```

### 3. 메모리 누수 방지

```javascript
function destroyPlayer() {
  if (player && typeof player.destroy === "function") {
    player.destroy();
    player = null;
  }
}

// 페이지 언로드 시 정리
window.addEventListener("beforeunload", destroyPlayer);
```

### 4. 모바일 최적화

```javascript
// iOS에서 인라인 재생 활성화
playerVars: {
  playsinline: 1,
  // 모바일에서 자동재생은 음소거와 함께
  mute: 1,
  autoplay: isMobile ? 0 : 1
}
```

### 5. 보안 고려사항

```javascript
playerVars: {
  // CORS 보안
  origin: window.location.origin,
  enablejsapi: 1,

  // 외부 링크 최소화
  rel: 0,
  fs: 0
}
```

---

## 우리 프로젝트 적용 포인트

### 현재 문제점들

1. ❌ deprecated 파라미터 사용 (`modestbranding`, `showinfo` 등)
2. ❌ 불안전한 API 메소드 호출
3. ❌ 중복 API 로딩 가능성
4. ❌ 메모리 누수 위험

### 개선 방향

1. ✅ 2025년 기준 유효한 파라미터만 사용
2. ✅ 안전한 메소드 호출 패턴 적용
3. ✅ 에러 처리 강화
4. ✅ 메모리 관리 개선
5. ✅ 모바일 최적화 강화

---

## 참고 링크

- [YouTube iframe API Reference](https://developers.google.com/youtube/iframe_api_reference)
- [YouTube Player Parameters](https://developers.google.com/youtube/player_parameters)
- [YouTube API Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service)
- [YouTube Branding Guidelines](https://developers.google.com/youtube/terms/branding-guidelines)

---

_최종 업데이트: 2025년 1월_

## 📺 YouTube Data API v3로 채널 아이콘 가져오기

### ✅ **채널 아이콘은 100% 가져올 수 있습니다**

YouTube Data API v3의 `channels.list` method를 사용하여 채널 정보와 함께 썸네일(프로필 이미지)을 가져올 수 있습니다.

### 🔧 **API 호출 방법**

```javascript
// 채널 ID로 채널 정보 가져오기
async function getChannelInfo(channelId, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const channel = data.items[0];
      return {
        channelId: channel.id,
        channelName: channel.snippet.title,
        description: channel.snippet.description,
        thumbnails: channel.snippet.thumbnails,
        // 채널 아이콘 URL들
        avatarUrls: {
          default: channel.snippet.thumbnails.default?.url, // 88x88px
          medium: channel.snippet.thumbnails.medium?.url, // 240x240px
          high: channel.snippet.thumbnails.high?.url, // 800x800px
        },
      };
    }
    return null;
  } catch (error) {
    console.error("채널 정보 가져오기 실패:", error);
    return null;
  }
}

// 사용 예시
const channelInfo = await getChannelInfo("UC_CHANNEL_ID", "YOUR_API_KEY");
console.log("채널 아이콘 URL:", channelInfo.avatarUrls.medium);
```

### 📐 **채널 썸네일 크기별 정보**

| 크기      | 해상도    | 용도                 |
| --------- | --------- | -------------------- |
| `default` | 88x88px   | 작은 아이콘, 댓글 등 |
| `medium`  | 240x240px | 일반적인 프로필 사진 |
| `high`    | 800x800px | 고해상도 프로필 사진 |

### 🔍 **채널 핸들(@handle)로 검색하기**

```javascript
// 채널 핸들로 채널 정보 가져오기 (YouTube Data API v3 최신 기능)
async function getChannelByHandle(handle, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${handle}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  return data.items?.[0] || null;
}

// 사용 예시
const channelInfo = await getChannelByHandle("@올렌즈", "YOUR_API_KEY");
```

### 💡 **백엔드 개발 시 활용 팁**

```javascript
// 비디오 정보와 채널 정보를 함께 가져오기
async function getVideoWithChannelInfo(videoId, apiKey) {
  // 1. 비디오 정보 가져오기
  const videoResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
  );
  const videoData = await videoResponse.json();

  if (!videoData.items?.length) return null;

  const video = videoData.items[0];
  const channelId = video.snippet.channelId;

  // 2. 채널 정보 (아이콘 포함) 가져오기
  const channelInfo = await getChannelInfo(channelId, apiKey);

  return {
    video: {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
    },
    channel: channelInfo,
  };
}
```

---

## 🇰🇷 한국 YouTube Shorts embed 가이드

### ❌ **Shorts 전용 embed API는 존재하지 않습니다**

**중요한 발견:**

- YouTube Shorts와 일반 영상은 **동일한 iframe embed API**를 사용
- Shorts URL: `/shorts/VIDEO_ID` → Embed: `/embed/VIDEO_ID` (동일)
- **별도의 Shorts 전용 UI나 파라미터 없음**

### ✅ **한국 Shorts 영상 embed 하기**

```javascript
// 한국 인기 Shorts 영상 ID 예시
const koreanShortsVideos = [
  { id: "P_9XDrMCjjM", title: "여름 메이크업 꿀팁", channel: "@올렌즈" },
  { id: "ZoJ2z3oEz2E", title: "홈카페 만들기", channel: "@데일리카페" },
  { id: "X7OR3OYHROw", title: "요리 레시피 쇼츠", channel: "@요리팁" },
  { id: "cQcLK8nMCuk", title: "패션 코디 팁", channel: "@패션데일리" },
  { id: "9AQyPu8KVMc", title: "운동 루틴", channel: "@헬스쇼츠" },
];

// Shorts 최적화 embed 파라미터
const shortsOptimizedParams = {
  autoplay: 1, // 쇼츠는 자동재생이 기본
  mute: 1, // 자동재생을 위해 음소거 시작
  controls: 0, // 깔끔한 UI를 위해 컨트롤 숨김
  playsinline: 1, // 모바일 인라인 재생
  rel: 0, // 관련 동영상 최소화
  iv_load_policy: 3, // 주석 숨김
  cc_load_policy: 0, // 자막 숨김
  enablejsapi: 1, // JavaScript API 활성화
  origin: window.location.origin,
};
```

### 📱 **Shorts 스타일 플레이어 설정**

```css
/* 9:16 종횡비 (Shorts 표준) */
.shorts-player {
  width: 100%;
  max-width: 430px; /* 모바일 최적화 */
  aspect-ratio: 9/16; /* Shorts 비율 */
  border-radius: 12px;
  overflow: hidden;
}

/* 전체화면 Shorts 플레이어 */
.shorts-fullscreen {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
}
```

### 🎯 **한국 Shorts 큐레이션 팁**

```javascript
// 한국 트렌드 카테고리별 Shorts
const koreanTrendCategories = {
  beauty: ["#뷰티", "#메이크업", "#스킨케어"],
  food: ["#먹방", "#쿡방", "#레시피"],
  daily: ["#일상", "#브이로그", "#데일리룩"],
  dance: ["#댄스", "#챌린지", "#커버댄스"],
  travel: ["#여행", "#국내여행", "#맛집투어"],
};

// 트렌드별 Shorts 큐레이션
function getCuratedKoreanShorts(category) {
  return koreanShortsVideos.filter((video) =>
    koreanTrendCategories[category]?.some((tag) => video.tags?.includes(tag))
  );
}
```

---

## 🚀 **실제 프로젝트 적용 예시**

### 완전한 한국 Shorts 플레이어 구현:

```javascript
class KoreanShortsPlayer {
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.shortsIds = options.shortsIds || [];
    this.currentIndex = 0;
  }

  async loadShortsData() {
    const shortsData = await Promise.all(
      this.shortsIds.map(async (videoId) => {
        const videoInfo = await this.getVideoWithChannelInfo(videoId);
        return {
          ...videoInfo,
          embedUrl: `https://www.youtube.com/embed/${videoId}?${this.getShortsParams()}`,
        };
      })
    );

    return shortsData;
  }

  getShortsParams() {
    return new URLSearchParams({
      autoplay: 1,
      mute: 1,
      controls: 0,
      playsinline: 1,
      rel: 0,
      iv_load_policy: 3,
      cc_load_policy: 0,
      enablejsapi: 1,
      origin: window.location.origin,
    }).toString();
  }

  async getVideoWithChannelInfo(videoId) {
    // 위에서 정의한 함수 사용
    return await getVideoWithChannelInfo(videoId, this.apiKey);
  }
}
```

이제 **한국 YouTube Shorts를 완벽하게 큐레이션**할 수 있습니다! 🎉

---

## ⚠️ **주의사항**

1. **API 키 보안**: 프론트엔드에서 YouTube Data API 키 노출 주의
2. **임베드 허용**: 일부 Shorts는 임베드가 제한될 수 있음
3. **저작권**: 타인의 콘텐츠 사용 시 저작권 주의
4. **할당량 관리**: YouTube Data API 할당량 초과 주의

---

📚 **추가 자료:**

- [YouTube Data API v3 공식 문서](https://developers.google.com/youtube/v3/docs)
- [YouTube iframe API 공식 문서](https://developers.google.com/youtube/iframe_api_reference)
- [YouTube 개발자 정책](https://developers.google.com/youtube/terms/developer-policies)
