# ⚙️ **Core System**

애플리케이션의 핵심 시스템과 기반 클래스들을 관리하는 폴더입니다.

## 📁 **파일 구조**

```
core/
├── Component.js         # 기본 컴포넌트 클래스
├── Router.js           # SPA 라우터 시스템
├── EventEmitter.js     # 이벤트 관리 시스템
├── Store.js            # 간단한 상태 관리
├── Validator.js        # 데이터 검증
├── Logger.js           # 로깅 시스템
└── constants.js        # 전역 상수
```

## 🧩 **Component 클래스**

모든 컴포넌트의 기본이 되는 베이스 클래스

### **기능**

- ✅ DOM 요소 관리
- ✅ 이벤트 리스너 관리
- ✅ 라이프사이클 메서드
- ✅ Props/State 관리
- ✅ 자동 정리 (destroy)

### **API**

```javascript
class Component {
  constructor(props = {})
  render()                    // HTML 생성
  bindEvents()               // 이벤트 연결
  destroy()                  // 정리 작업

  // 유틸리티 메서드
  find(selector)             // 요소 찾기
  findAll(selector)          // 여러 요소 찾기
  emit(event, data)          // 이벤트 발생
  on(event, handler)         // 이벤트 리스너
  off(event, handler)        // 이벤트 제거
}
```

## 🛤️ **Router 시스템**

Hash 기반 SPA 라우팅 시스템

### **기능**

- ✅ Hash 기반 라우팅 (#/home, #/login)
- ✅ 동적 라우트 (/user/:id)
- ✅ 쿼리 파라미터 지원
- ✅ 네비게이션 가드
- ✅ 히스토리 관리

### **API**

```javascript
const router = new Router([
  { path: "#/", component: Home },
  { path: "#/login", component: Login },
  { path: "#/user/:id", component: UserProfile },
]);

// 네비게이션
router.push("#/home");
router.back();
router.forward();

// 라우트 정보
router.getCurrentRoute();
router.getParams();
router.getQuery();
```

## 📡 **EventEmitter**

컴포넌트 간 통신을 위한 이벤트 시스템

### **기능**

- ✅ 이벤트 발생/구독
- ✅ 한 번만 실행 (once)
- ✅ 이벤트 제거
- ✅ 와일드카드 지원

### **API**

```javascript
const emitter = new EventEmitter();

emitter.on("user:login", (user) => {
  /* 처리 */
});
emitter.emit("user:login", userData);
emitter.off("user:login", handler);
emitter.once("user:logout", handler);
```

## 📦 **Store**

간단한 전역 상태 관리

### **기능**

- ✅ 전역 상태 관리
- ✅ 상태 변화 감지
- ✅ localStorage 연동
- ✅ 리액티브 업데이트

### **API**

```javascript
const store = new Store({
  user: null,
  theme: "light",
  videos: [],
});

// 상태 변경
store.set("user", userData);
store.get("user");

// 상태 감지
store.watch("user", (newUser, oldUser) => {
  // 사용자 변경 시 처리
});
```

## ✅ **Validator**

데이터 검증 유틸리티

### **기능**

- ✅ 타입 검증
- ✅ 이메일/URL 검증
- ✅ 길이/범위 검증
- ✅ 커스텀 규칙

### **API**

```javascript
const validator = new Validator({
  email: ["required", "email"],
  password: ["required", "minLength:8"],
  age: ["required", "number", "min:18"],
});

const result = validator.validate({
  email: "test@example.com",
  password: "password123",
  age: 25,
});
```

## 📝 **Logger**

개발/운영 환경 로깅 시스템

### **기능**

- ✅ 로그 레벨 (debug, info, warn, error)
- ✅ 환경별 로그 필터링
- ✅ 로그 포맷팅
- ✅ 원격 로그 전송

### **API**

```javascript
Logger.debug("Debug message");
Logger.info("Info message");
Logger.warn("Warning message");
Logger.error("Error message", error);
```

## 🔧 **개발 가이드**

### **1. 새 컴포넌트 생성**

```javascript
import { Component } from "../core/Component.js";

export default class MyComponent extends Component {
  constructor(props = {}) {
    super(props);
    // 초기화
  }

  render() {
    this.el.innerHTML = `<div>My Component</div>`;
  }
}
```

### **2. 라우트 추가**

```javascript
import { router } from "../core/Router.js";

router.addRoute({
  path: "#/new-page",
  component: NewPageComponent,
  guard: (to, from) => {
    // 네비게이션 가드
    return user.isAuthenticated;
  },
});
```

### **3. 전역 상태 사용**

```javascript
import { store } from "../core/Store.js";

// 상태 변경
store.set("currentUser", user);

// 상태 감지
store.watch("currentUser", (user) => {
  this.updateUserUI(user);
});
```

## 📋 **개발 우선순위**

### **Phase 1**

1. ✅ Component 클래스 개선
2. ✅ Router 시스템 구축
3. ✅ EventEmitter 구현
4. ✅ 기본 상수 정의

### **Phase 2**

1. ✅ Store 상태 관리
2. ✅ Validator 검증 시스템
3. ✅ Logger 시스템
4. ✅ 에러 처리 개선
