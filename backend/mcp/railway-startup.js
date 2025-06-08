/**
 * 🚀 Railway 통합 시작 스크립트
 * 
 * MCP Host와 MCP Server를 동시에 실행합니다.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 부모 폴더의 .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

// 환경 변수 설정
const HOST_PORT = process.env.PORT || 3000;
const SERVER_PORT = process.env.MCP_SERVER_PORT || 3001;

console.log('🚀 YouTube Shorts AI MCP 시스템 시작 중...');
console.log(`📡 MCP Host 포트: ${HOST_PORT}`);
console.log(`🔧 MCP Server 포트: ${SERVER_PORT}`);

// MCP Server 시작
const mcpServer = spawn('node', [
  join(__dirname, 'correct-mcp-server.js')
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MCP_TRANSPORT: 'http',
    MCP_SERVER_PORT: SERVER_PORT
  }
});

// 서버 시작 대기 (2초)
setTimeout(() => {
  console.log('🔌 MCP Server 시작됨, MCP Host 시작 중...');
  
  // MCP Host 시작
  const mcpHost = spawn('node', [
    join(__dirname, 'railway-mcp-host.js')
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: HOST_PORT,
      YOUTUBE_SHORTS_MCP_URL: `http://localhost:${SERVER_PORT}/mcp`
    }
  });

  // 에러 핸들링
  mcpHost.on('error', (error) => {
    console.error('❌ MCP Host 오류:', error);
    process.exit(1);
  });

  mcpHost.on('exit', (code) => {
    console.log(`🔌 MCP Host 종료됨 (코드: ${code})`);
    mcpServer.kill();
    process.exit(code);
  });

}, 2000);

// MCP Server 에러 핸들링
mcpServer.on('error', (error) => {
  console.error('❌ MCP Server 오류:', error);
  process.exit(1);
});

mcpServer.on('exit', (code) => {
  console.log(`🔌 MCP Server 종료됨 (코드: ${code})`);
  process.exit(code);
});

// 종료 시그널 처리
process.on('SIGTERM', () => {
  console.log('🛑 종료 신호 받음, 서버들 종료 중...');
  mcpServer.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 인터럽트 신호 받음, 서버들 종료 중...');
  mcpServer.kill();
  process.exit(0);
}); 