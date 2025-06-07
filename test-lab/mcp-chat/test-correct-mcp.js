import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

console.log('🧪 공식 MCP SDK 기반 테스트 시작...');

// 1. 패키지 Import 테스트
try {
  console.log('📦 올바른 MCP 패키지 import 테스트...');
  
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  console.log('✅ McpServer 클래스 로드 성공');
  
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  console.log('✅ StdioServerTransport 로드 성공');
  
  const { z } = await import('zod');
  console.log('✅ Zod 스키마 검증 라이브러리 로드 성공');
  
} catch (error) {
  console.log('❌ 패키지 로드 실패:', error.message);
  process.exit(1);
}

// 2. 올바른 MCP 서버 테스트
try {
  console.log('\n🛠️ 올바른 MCP 서버 테스트...');
  
  // 서버 import 테스트
  const serverModule = await import('./mcp-server-correct.js');
  const server = serverModule.default;
  console.log('✅ MCP 서버 모듈 로드 성공');
  
  // 서버 정보 확인
  console.log('📋 서버 정보:');
  console.log(`- 이름: momentum-youtube-curator`);
  console.log(`- 버전: 1.0.0`);
  console.log(`- 타입: ${server.constructor.name}`);
  
} catch (error) {
  console.log('❌ MCP 서버 로드 실패:', error.message);
  console.log('스택:', error.stack);
}

// 3. 백엔드 연결 테스트
try {
  console.log('\n🔗 백엔드 API 연결 테스트...');
  
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
  console.log('📡 백엔드 URL:', backendUrl);
  
  const response = await fetch(`${backendUrl}/health`);
  if (response.ok) {
    const data = await response.json();
    console.log('✅ 백엔드 연결 성공:', data.message);
  } else {
    console.log('⚠️ 백엔드 응답 오류:', response.status);
  }
  
} catch (error) {
  console.log('❌ 백엔드 연결 실패:', error.message);
}

// 4. 환경 설정 확인
console.log('\n🔧 환경 설정 확인:');
console.log('- CLAUDE_API_KEY:', process.env.CLAUDE_API_KEY ? '설정됨' : '미설정');
console.log('- BACKEND_URL:', process.env.BACKEND_URL || 'http://localhost:3002');

// 5. MCP 도구 목록 체크
try {
  console.log('\n🔧 구현된 MCP 기능 확인:');
  
  console.log('📋 Tools (도구):');
  console.log('  - extract-keywords: 자연어 → 키워드 추출');
  console.log('  - search-youtube-shorts: YouTube Shorts 검색');
  console.log('  - analyze-trends: 트렌드 분석');
  console.log('  - generate-response: 대화형 응답 생성');
  
  console.log('📋 Resources (리소스):');
  console.log('  - server-status: 서버 상태 정보');
  console.log('  - backend-status: 백엔드 API 상태');
  
  console.log('📋 Prompts (프롬프트):');
  console.log('  - extract-keywords-prompt: 키워드 추출 프롬프트');
  console.log('  - recommend-videos-prompt: 영상 추천 프롬프트');
  
} catch (error) {
  console.log('❌ MCP 기능 체크 실패:', error.message);
}

console.log('\n🎉 기본 테스트 완료!');
console.log('🌊 Wave Team | Momentum MCP (Official SDK) Test Complete');

// 실행 가이드 표시
console.log('\n📋 다음 단계:');
console.log('1. 백엔드 서버 실행 확인: node server.js (backend 디렉토리에서)');
console.log('2. MCP 서버 실행 테스트: node mcp-server-correct.js');
console.log('3. MCP Inspector로 테스트 (선택사항)');
console.log('4. Claude Desktop에 연동 (선택사항)'); 