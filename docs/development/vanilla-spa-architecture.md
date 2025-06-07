# Vanilla JS SPA 아키텍처 가이드

## 개요
YouTube Shorts AI 큐레이션 서비스를 위한 Vanilla JavaScript 기반 Single Page Application 아키텍처입니다.

## 핵심 구성 요소

### 1. Component 클래스
모든 UI 요소의 기본이 되는 클래스입니다.

```javascript
// core/core.js
export class Component {
  constructor(payload = {}) {
    const {
      tagName = 'div',      // 기본 HTML 태그
      props = {},           // 부모로부터 받는 데이터
      state = {}           // 컴포넌트 내부 상태
    } = payload
    
    this.el = document.createElement(tagName)
    this.props = props
    this.state = state
    this.render()
  }
  
  render() {
    // 하위 클래스에서 구현
  }
}
```

### 2. Router 시스템
해시 기반 라우팅을 관리합니다.

```javascript
// core/core.js
export function createRouter(routes) {
  return function () {
    window.addEventListener('popstate', () => {
      routeRender(routes)
    })
    routeRender(routes)  // 최초 렌더링
  }
}

function routeRender(routes) {
  // 해시가 없으면 기본 경로로
  if (!location.hash) {
    history.replaceState(null, '', '/#/')
  }
  
  const routerView = document.querySelector('router-view')
  const [hash, queryString = ''] = location.hash.split('?')
  
  // 쿼리스트링을 객체로 변환
  const query = queryString
    .split('&')
    .reduce((acc, cur) => {
      const [key, value] = cur.split('=')
      acc[key] = value
      return acc
    }, {})
  
  history.replaceState(query, '')
  
  // 현재 경로에 맞는 컴포넌트 찾기
  const currentRoute = routes.find(route => 
    new RegExp(`${route.path}/?$`).test(hash)
  )
  
  routerView.innerHTML = ''
  routerView.append(new currentRoute.component().el)
  
  // 스크롤 초기화
  window.scrollTo(0, 0)
}
```

### 3. Store (상태 관리)
전역 상태 관리를 위한 Store 패턴입니다.

```javascript
// core/core.js
export class Store {
  constructor(state) {
    this.state = {}
    this.observers = {}
    
    for (const key in state) {
      Object.defineProperty(this.state, key, {
        get: () => state[key],
        set: (val) => {
          state[key] = val
          // 구독자들에게 알림
          if (Array.isArray(this.observers[key])) {
            this.observers[key].forEach(observer => observer(val))
          }
        }
      })
    }
  }
  
  // 상태 변경 구독
  subscribe(key, cb) {
    Array.isArray(this.observers[key])
      ? this.observers[key].push(cb)
      : this.observers[key] = [cb]
  }
}
```

## 프로젝트 구조

```
src/
├── core/
│   └── core.js           # Component, Router, Store 클래스
├── components/           # 재사용 가능한 UI 컴포넌트
│   ├── SearchBar.js
│   ├── VideoCard.js
│   ├── VideoList.js
│   └── TheHeader.js
├── routes/              # 페이지 컴포넌트
│   ├── index.js         # 라우터 설정
│   ├── Home.js
│   ├── Search.js
│   └── Video.js
├── store/               # 상태 관리
│   ├── youtube.js       # YouTube 관련 상태
│   └── user.js          # 사용자 관련 상태
├── services/            # API 및 비즈니스 로직
│   ├── api.js
│   └── mcp-client.js
├── App.js               # 루트 컴포넌트
└── main.js              # 진입점
```

## 컴포넌트 작성 패턴

### 1. 기본 컴포넌트
```javascript
// components/SearchBar.js
import { Component } from '../core/core'
import youtubeStore from '../store/youtube'

export default class SearchBar extends Component {
  constructor() {
    super({
      tagName: 'form',
      state: {
        query: ''
      }
    })
  }
  
  render() {
    this.el.classList.add('search-bar')
    this.el.innerHTML = /* html */ `
      <input 
        type="text" 
        placeholder="검색어를 입력하세요"
        value="${this.state.query}"
      />
      <button type="submit">검색</button>
    `
    
    // 이벤트 리스너
    const inputEl = this.el.querySelector('input')
    inputEl.addEventListener('input', (e) => {
      this.state.query = e.target.value
    })
    
    this.el.addEventListener('submit', (e) => {
      e.preventDefault()
      youtubeStore.state.searchQuery = this.state.query
    })
  }
}
```

### 2. Props를 받는 컴포넌트
```javascript
// components/VideoCard.js
import { Component } from '../core/core'

export default class VideoCard extends Component {
  constructor(props) {
    super({
      props,
      tagName: 'article'
    })
  }
  
  render() {
    const { video } = this.props
    
    this.el.classList.add('video-card')
    this.el.innerHTML = /* html */ `
      <a href="#/video?id=${video.id}">
        <img src="${video.thumbnail}" alt="${video.title}" />
        <h3>${video.title}</h3>
        <p>${video.channel}</p>
        <span>${video.duration}</span>
      </a>
    `
  }
}
```

### 3. Store 구독 컴포넌트
```javascript
// components/VideoList.js
import { Component } from '../core/core'
import youtubeStore from '../store/youtube'
import VideoCard from './VideoCard'

export default class VideoList extends Component {
  constructor() {
    super()
    // Store 변경 감지
    youtubeStore.subscribe('videos', () => {
      this.render()
    })
  }
  
  render() {
    this.el.classList.add('video-list')
    this.el.innerHTML = /* html */ `
      <div class="videos"></div>
    `
    
    const videosEl = this.el.querySelector('.videos')
    videosEl.append(
      ...youtubeStore.state.videos.map(video => 
        new VideoCard({ video }).el
      )
    )
  }
}
```

## Store 사용 예시

### 1. Store 정의
```javascript
// store/youtube.js
import { Store } from '../core/core'

const store = new Store({
  searchQuery: '',
  videos: [],
  loading: false,
  error: null,
  pageToken: null
})

export default store

// API 호출 함수
export const searchVideos = async (query) => {
  store.state.loading = true
  store.state.error = null
  
  try {
    const res = await fetch('/api/youtube/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    
    const data = await res.json()
    store.state.videos = data.items
    store.state.pageToken = data.nextPageToken
  } catch (error) {
    store.state.error = error.message
  } finally {
    store.state.loading = false
  }
}
```

### 2. Store 구독
```javascript
// 컴포넌트에서 Store 구독
constructor() {
  super()
  youtubeStore.subscribe('loading', (isLoading) => {
    if (isLoading) {
      this.showLoader()
    } else {
      this.hideLoader()
    }
  })
}
```

## 라우터 설정

```javascript
// routes/index.js
import { createRouter } from '../core/core'
import Home from './Home'
import Search from './Search'
import Video from './Video'
import NotFound from './NotFound'

export default createRouter([
  { path: '#/', component: Home },
  { path: '#/search', component: Search },
  { path: '#/video', component: Video },
  { path: '.*', component: NotFound }
])
```

## 앱 초기화

```javascript
// App.js
import { Component } from './core/core'
import TheHeader from './components/TheHeader'
import TheFooter from './components/TheFooter'

export default class App extends Component {
  render() {
    const theHeader = new TheHeader().el
    const routerView = document.createElement('router-view')
    const theFooter = new TheFooter().el
    
    this.el.append(
      theHeader,
      routerView,
      theFooter
    )
  }
}
```

```javascript
// main.js
import App from './App'
import router from './routes'

const root = document.querySelector('#root')
root.append(new App().el)

router()
```

## 스타일 관리

### 1. CSS 변수 활용
```css
/* main.css */
:root {
  --color-primary: #FF0000;
  --color-background: #0F0F0F;
  --color-surface: #272727;
  --color-text: #FFFFFF;
}
```

### 2. 컴포넌트별 스타일
```css
/* 컴포넌트 클래스명 활용 */
.search-bar { ... }
.video-card { ... }
.video-list { ... }
```

## 개발 시 주의사항

### 1. 메모리 누수 방지
- 컴포넌트 제거 시 이벤트 리스너 정리
- Store 구독 해제 메커니즘 구현 필요

### 2. 성능 최적화
- 불필요한 렌더링 방지
- 이미지 레이지 로딩
- 무한 스크롤 구현

### 3. 에러 처리
- API 호출 실패 처리
- 로딩 상태 관리
- 사용자 친화적 에러 메시지

## test-lab 활용

```
test-lab/
├── component-test/      # 개별 컴포넌트 테스트
├── router-test/         # 라우터 동작 테스트
├── store-test/          # Store 패턴 테스트
└── api-test/           # API 연동 테스트
```

각 기능을 test-lab에서 먼저 구현하고 검증한 후 메인 프로젝트에 통합합니다. 