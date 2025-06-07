import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

console.log('🧪 간단한 MCP 테스트 시작...');

// 1. 기본 imports 테스트
try {
  console.log('📦 패키지 import 테스트...');
  
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  console.log('✅ MCP SDK 로드 성공');
  
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  console.log('✅ Anthropic SDK 로드 성공');
  
} catch (error) {
  console.log('❌ 패키지 로드 실패:', error.message);
  process.exit(1);
}

// 2. MCP 서버 기본 클래스 테스트
try {
  console.log('\n🛠️ MCP 서버 클래스 테스트...');
  
  const YouTubeCuratorMCP = (await import('./mcp-server.js')).default;
  console.log('✅ MCP 서버 클래스 로드 성공');
  
  // 인스턴스 생성 테스트
  const mcpServer = new YouTubeCuratorMCP();
  console.log('✅ MCP 서버 인스턴스 생성 성공');
  
  // 기본 메서드 테스트
  const timeContext = mcpServer.getTimeContext();
  console.log('✅ 시간 컨텍스트:', JSON.stringify(timeContext, null, 2));
  
  const quickKeywords = mcpServer.quickExtraction('피곤해서 힐링되는 영상 보고 싶어');
  console.log('✅ 빠른 키워드 추출:', quickKeywords.join(', '));
  
} catch (error) {
  console.log('❌ MCP 서버 테스트 실패:', error.message);
  console.log('스택:', error.stack);
  process.exit(1);
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

// 4. 환경 변수 확인
console.log('\n🔧 환경 설정 확인:');
console.log('- CLAUDE_API_KEY:', process.env.CLAUDE_API_KEY ? '설정됨' : '미설정');
console.log('- BACKEND_URL:', process.env.BACKEND_URL || 'http://localhost:3002');

console.log('\n🎉 기본 테스트 완료!');
console.log('🌊 Wave Team | Momentum MCP Basic Test'); 