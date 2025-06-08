# 📚 Model Context Protocol (MCP) 2025 기술 문서

**작성일**: 2025년 6월 8일  
**기준 사양**: MCP 2025-03-26  
**작성자**: AI Assistant

---

## 🎯 MCP 정의 및 개요

### Model Context Protocol (MCP)란?

**Model Context Protocol (MCP)**는 Anthropic이 2024년 11월 25일에 오픈소스로 공개한 표준 프로토콜입니다. LLM 애플리케이션과 외부 데이터 소스 및 도구 간의 연결을 표준화하는 것이 목적입니다.

### 핵심 특징

- **"AI의 USB-C"**: 다양한 AI 시스템과 도구 간의 표준화된 연결 인터페이스
- **JSON-RPC 2.0 기반**: 표준 메시지 프로토콜 사용
- **클라이언트-서버 아키텍처**: 명확한 역할 분리
- **언어 서버 프로토콜(LSP) 영감**: 개발 도구 생태계 표준화 모델 적용

---

## 🏗️ MCP 아키텍처

### 핵심 구성 요소

```
┌─────────────────┐ JSON-RPC 2.0 ┌─────────────────┐
│ MCP Host        │◄──────────────►│ MCP Server      │
│ (LLM 애플리케이션) │               │ (도구 제공자)    │
│                 │               │                 │
│ ┌─────────────┐ │               │ ┌─────────────┐ │
│ │ MCP Client  │ │               │ │ Tools       │ │
│ │ (커넥터)     │ │               │ │ Resources   │ │
│ │             │ │               │ │ Prompts     │ │
│ └─────────────┘ │               │ └─────────────┘ │
└─────────────────┘               └─────────────────┘
```

### 1. **MCP Host**

- **정의**: 연결을 시작하는 LLM 애플리케이션
- **예시**: Claude Desktop, VS Code, ChatGPT Desktop
- **역할**: 전체 상호작용 흐름 관리

### 2. **MCP Client**

- **정의**: Host 내부의 커넥터 컴포넌트
- **역할**:
  - 프로토콜 협상
  - JSON-RPC 요청 포맷팅
  - 서버 응답 파싱
  - 하나 이상의 MCP 서버와 통신 관리

### 3. **MCP Server**

- **정의**: 특정 기능을 제공하는 서비스 (로컬 또는 원격)
- **역할**: 실제 데이터 소스나 기능에 대한 추상화 계층 제공

---

## 📡 통신 프로토콜

### JSON-RPC 2.0 메시지 형식

#### 1. **요청 (Requests)**

```json
{
  "jsonrpc": "2.0",
  "id": "string | number",
  "method": "string",
  "params": {
    "[key: string]": "unknown"
  }
}
```

#### 2. **응답 (Responses)**

```json
{
  "jsonrpc": "2.0",
  "id": "string | number",
  "result": {
    "[key: string]": "unknown"
  },
  "error": {
    "code": "number",
    "message": "string",
    "data": "unknown"
  }
}
```

#### 3. **알림 (Notifications)**

```json
{
  "jsonrpc": "2.0",
  "method": "string",
  "params": {
    "[key: string]": "unknown"
  }
}
```

### 트랜스포트 계층

| 트랜스포트          | 사용 사례                       | 상태                     | 특징                       |
| ------------------- | ------------------------------- | ------------------------ | -------------------------- |
| **stdio**           | 로컬 개발, Claude Desktop       | 활성                     | 낮은 지연시간, 간단한 배포 |
| **HTTP + SSE**      | 원격 서버 (레거시)              | 2025-03-26부터 사용 중단 | 실시간 스트리밍            |
| **Streamable HTTP** | 엔터프라이즈, 클라우드 네이티브 | 권장                     | 프록시 친화적, 효율적 배칭 |

---

## 🛠️ MCP 서버 기능

### 1. **Resources (리소스)**

- **정의**: LLM이 읽을 수 있는 파일형 데이터
- **용도**: API 응답, 문서 내용, 데이터베이스 레코드
- **특징**: 컨텍스트 제공, 부작용 없음

```json
{
  "uri": "file:///example.txt",
  "name": "예시 리소스",
  "description": "예시 텍스트 파일",
  "mimeType": "text/plain"
}
```

### 2. **Tools (도구)**

- **정의**: LLM이 호출할 수 있는 함수
- **용도**: 특정 작업이나 계산 수행
- **특징**: 환경과 상호작용, 부작용 있음

```json
{
  "name": "calculate",
  "description": "수학 계산 수행",
  "inputSchema": {
    "type": "object",
    "properties": {
      "expression": {
        "type": "string",
        "description": "계산할 수식"
      }
    },
    "required": ["expression"]
  }
}
```

### 3. **Prompts (프롬프트)**

- **정의**: 특정 작업을 위한 재사용 가능한 템플릿
- **용도**: LLM 상호작용 가이드
- **특징**: 템플릿화된 메시지, 워크플로우 정의

```json
{
  "name": "code-review",
  "description": "코드 리뷰 프롬프트",
  "arguments": [
    {
      "name": "code",
      "description": "리뷰할 코드",
      "required": true
    }
  ]
}
```

---

## 👥 MCP 클라이언트 기능

### **Sampling (샘플링)**

- **정의**: 서버가 시작하는 에이전틱 행동과 재귀적 LLM 상호작용
- **용도**: 서버가 LLM에게 추가 추론이나 생성을 요청
- **보안**: 사용자 명시적 승인 필요

---

## 🔧 SDK 및 구현

### 공식 SDK 목록

| 언어           | 패키지명                  | 상태    | 주요 기능      |
| -------------- | ------------------------- | ------- | -------------- |
| **TypeScript** | @modelcontextprotocol/sdk | 활성    | 완전 기능      |
| **Python**     | mcp                       | 활성    | FastMCP 포함   |
| **C#**         | ModelContextProtocol      | 활성    | .NET 통합      |
| **Java**       | spring-ai                 | 활성    | Spring 통합    |
| **Kotlin**     | -                         | 개발 중 | Android 지원   |
| **Ruby**       | -                         | 개발 중 | Rails 통합     |
| **Swift**      | -                         | 개발 중 | iOS/macOS 지원 |

### TypeScript 서버 구현 예시

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// MCP 서버 생성
const server = new McpServer({
  name: "Example Server",
  version: "1.0.0",
});

// 도구 추가
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }],
}));

// 리소스 추가
server.resource("config", "config://app/settings", async (uri) => ({
  contents: [
    {
      uri: uri.href,
      text: "앱 설정 데이터",
    },
  ],
}));

// stdio 트랜스포트로 연결
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Python 서버 구현 예시

```python
from mcp.server.fastmcp import FastMCP

# MCP 서버 생성
mcp = FastMCP("Example Server")

@mcp.tool()
def add_numbers(a: int, b: int) -> dict:
    """두 숫자를 더합니다."""
    result = a + b
    return {
        "content": [{"type": "text", "text": str(result)}]
    }

@mcp.resource("config://app/settings")
def get_config() -> dict:
    """앱 설정을 반환합니다."""
    return {
        "contents": [{
            "uri": "config://app/settings",
            "text": "앱 설정 데이터"
        }]
    }

if __name__ == "__main__":
    mcp.run()
```

---

## 🔐 보안 및 신뢰 프레임워크

### 핵심 보안 원칙

#### 1. **사용자 동의 및 제어**

- 모든 데이터 접근 및 작업에 대한 명시적 사용자 동의 필요
- 데이터 공유 및 작업 수행에 대한 사용자 제어권 유지
- 활동 검토 및 승인을 위한 명확한 UI 제공

#### 2. **데이터 프라이버시**

- 사용자 데이터를 서버에 노출하기 전 명시적 동의 획득
- 사용자 동의 없이 리소스 데이터를 다른 곳에 전송 금지
- 적절한 접근 제어로 사용자 데이터 보호

#### 3. **도구 안전성**

- 도구는 임의 코드 실행을 나타내므로 적절한 주의 필요
- 모든 도구 호출 전 명시적 사용자 동의 획득
- 사용자는 승인 전 각 도구의 기능 이해 필요

#### 4. **LLM 샘플링 제어**

- 모든 LLM 샘플링 요청에 대한 사용자 명시적 승인
- 샘플링 발생 여부, 전송될 프롬프트, 서버가 볼 수 있는 결과에 대한 사용자 제어
- 프로토콜은 의도적으로 서버의 프롬프트 가시성 제한

### 주요 보안 위험

| 위험                | 설명                          | 완화 방법                     |
| ------------------- | ----------------------------- | ----------------------------- |
| **도구 중독**       | 악의적 도구 설명으로 LLM 조작 | 스키마 검증, 콘텐츠 보안 정책 |
| **프롬프트 인젝션** | 악의적 입력으로 LLM 조작      | 입력 살균, 컨텍스트 격리      |
| **자격 증명 노출**  | API 키나 토큰 유출            | OAuth 2.1, 토큰 스코핑        |
| **데이터 유출**     | 무단 데이터 추출              | 최소 권한 원칙, 감사 로깅     |

---

## 📈 생태계 현황 (2025년 6월)

### 주요 기술 공급업체 채택

#### **Microsoft**

- Windows 11 네이티브 MCP 지원 (2025년 5월 발표)
- Copilot Studio GA
- Azure AI Foundry 통합
- 공식 C# SDK 개발

#### **OpenAI**

- ChatGPT Desktop 및 Agents SDK에 MCP 채택 (2025년 3월)
- 경쟁사 표준 채택으로 생태계 통합 신호

#### **Google**

- Vertex AI Agent Development Kit (ADK)
- MCP Toolbox for Databases
- 보안 서비스용 MCP 서버 제공

#### **Amazon Web Services**

- Lambda, ECS, EKS용 MCP 서버
- Bedrock Agents와 MCP 통합 가이드

### 커뮤니티 통계 (2025년 5월)

| 지표                       | 수치    | 출처                         |
| -------------------------- | ------- | ---------------------------- |
| **GitHub Stars** (servers) | 50,000+ | modelcontextprotocol/servers |
| **PyPI 주간 다운로드**     | 2.1M+   | mcp 패키지                   |
| **npm 주간 다운로드**      | 3.4M+   | @modelcontextprotocol/sdk    |
| **커뮤니티 서버**          | 1,000+  | 다양한 레지스트리            |

---

## 🚀 실제 사용 사례

### 1. **소프트웨어 개발**

- **GitHub Copilot**: MCP를 통한 외부 도구 접근
- **Cursor, Replit**: 실시간 코드 컨텍스트 연결
- **VS Code**: MCP 확장을 통한 AI 도구 통합

### 2. **엔터프라이즈 통합**

- **Microsoft Dynamics 365**: ERP 시스템 AI 통합
- **Atlassian**: Jira/Confluence MCP 서버
- **Salesforce**: Agentforce 플랫폼 연동

### 3. **데이터베이스 접근**

- **PostgreSQL, MySQL, MongoDB**: 자연어 쿼리 인터페이스
- **Vector Databases**: RAG 시스템 강화
- **Google Cloud Databases**: 통합 툴박스

### 4. **클라우드 관리**

- **AWS Cost Explorer**: AI 기반 비용 분석
- **Azure Functions**: 서버리스 MCP 서버 호스팅
- **Cloudflare Workers**: 엣지 MCP 배포

---

## 🔮 미래 로드맵

### 단기 목표 (2025-2026)

- **MCP 1.0 사양 완성**: 안정적인 프로토콜 버전
- **중앙 집중식 레지스트리**: 보안 검증 및 인증 프로그램
- **OAuth 2.1 완성**: 엔터프라이즈급 인증
- **OpenTelemetry 통합**: 표준화된 모니터링

### 장기 비전 (2026-2030)

- **범용 AI 인프라**: HTTP와 같은 AI 상호작용 표준
- **멀티 에이전트 생태계**: 전문 AI 워커 조정
- **물리적 세계 통합**: IoT 기기 및 로보틱스 제어
- **규제 준수**: AI 감사 추적 및 컴플라이언스 리포팅

---

## 📋 MCP vs 기존 접근 방식

### 기존 방식의 문제점

```javascript
// ❌ 기존: N×M 통합 문제
각 AI 모델 × 각 도구 = 맞춤형 커넥터 개발
- GPT-4 ↔ Slack 커넥터
- Claude ↔ Slack 커넥터
- GPT-4 ↔ GitHub 커넥터
- Claude ↔ GitHub 커넥터
...
```

### MCP 방식의 해결책

```javascript
// ✅ MCP: M+N 문제로 단순화
각 AI 모델이 MCP 구현 + 각 도구가 MCP 서버 구현
- 모든 AI 모델 ↔ MCP 프로토콜 ↔ 모든 도구
```

### 개발 생산성 비교

| 측면           | 기존 방식      | MCP 방식           | 개선율      |
| -------------- | -------------- | ------------------ | ----------- |
| **개발 시간**  | N×M 개발 필요  | M+N 개발로 충분    | 60-80% 절약 |
| **유지보수**   | 각 통합별 관리 | 표준 프로토콜 관리 | 70% 절약    |
| **확장성**     | 제한적         | 높음               | 무제한      |
| **상호운용성** | 낮음           | 높음               | 크게 개선   |

---

## 📖 추가 리소스

### 공식 문서

- **MCP 사양**: https://modelcontextprotocol.io/specification/2025-03-26
- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Python SDK**: https://github.com/modelcontextprotocol/python-sdk
- **서버 레지스트리**: https://github.com/modelcontextprotocol/servers

### 커뮤니티

- **GitHub Discussions**: https://github.com/modelcontextprotocol/discussions
- **Discord**: MCP 커뮤니티 채널
- **문서 기여**: https://github.com/modelcontextprotocol/docs

### 기업 리소스

- **Microsoft Build 2025**: MCP Windows 통합 발표
- **Anthropic 블로그**: MCP 소개 및 업데이트
- **OpenAI 개발자 문서**: MCP 통합 가이드

---

**이 문서는 2025년 6월 8일 기준 최신 정보를 바탕으로 작성되었으며, MCP 생태계의 빠른 발전에 따라 지속적으로 업데이트될 예정입니다.**
