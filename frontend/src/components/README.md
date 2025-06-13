# 🧩 **Components**

재사용 가능한 UI 컴포넌트들을 관리하는 폴더입니다.

## 📁 **폴더 구조**

```
components/
├── ui/          # 기본 UI 컴포넌트
├── layout/      # 레이아웃 컴포넌트
└── feature/     # 기능별 컴포넌트
```

## 🎯 **컴포넌트 분류 기준**

### **UI 컴포넌트 (ui/)**

**순수한 UI 컴포넌트**, 비즈니스 로직 없음

- ✅ Button, Input, Card, Modal 등
- ✅ Props로 커스터마이징 가능
- ✅ 재사용성이 높음
- ✅ 단위 테스트 가능

### **레이아웃 컴포넌트 (layout/)**

**페이지 구조를 담당**하는 컴포넌트

- ✅ Navbar, Header, Footer 등
- ✅ 페이지 레이아웃 관리
- ✅ Safe Area, 반응형 처리

### **기능 컴포넌트 (feature/)**

**특정 기능을 담당**하는 복합 컴포넌트

- ✅ VideoPlayer, ChatBot 등
- ✅ 비즈니스 로직 포함
- ✅ 여러 UI 컴포넌트 조합

## 🔧 **컴포넌트 개발 가이드**

### **1. 컴포넌트 구조**

```javascript
ComponentName/
├── index.js          // 메인 컴포넌트 파일
├── component.css     // 컴포넌트 스타일
├── README.md         // 컴포넌트 문서
└── examples.md       // 사용 예시
```

### **2. 기본 템플릿**

```javascript
import { Component } from "../../core/Component.js";

export default class ComponentName extends Component {
  static defaultProps = {
    // 기본 props 정의
  };

  constructor(props = {}) {
    super();
    this.props = { ...ComponentName.defaultProps, ...props };
    this.state = {};
  }

  render() {
    // 렌더링 로직
  }

  bindEvents() {
    // 이벤트 처리
  }

  destroy() {
    // 정리 작업
  }
}
```

### **3. Props 설계 원칙**

- **명확한 타입**: props의 타입을 명확히 정의
- **기본값 제공**: defaultProps로 기본값 설정
- **검증 로직**: props 유효성 검사
- **문서화**: README에 props 목록 작성

### **4. 스타일 가이드**

- **BEM 방법론**: `.component-name__element--modifier`
- **CSS 변수 활용**: `var(--color-primary)` 등
- **반응형 고려**: 모바일 퍼스트
- **테마 지원**: 다크모드, 글래스모피즘

## 📋 **우선순위 컴포넌트**

### **Phase 1 - 기본 UI**

1. Button (primary, secondary, ghost)
2. Card (glassmorphism)
3. Input (text, password, search)
4. Modal (alert, confirm, custom)

### **Phase 2 - 레이아웃**

1. Navbar (하단 네비게이션)
2. Header (페이지 헤더)
3. BackButton (뒤로가기)
4. PageContainer (페이지 래퍼)

### **Phase 3 - 기능**

1. VideoPlayer (YouTube iframe)
2. ChatBot (채팅 인터페이스)
3. MoodSelector (기분 선택)
4. TopicSelector (주제 선택)
