#!/bin/bash

# 🤖 YouTube Shorts MCP 통합 시스템 설치 스크립트

echo "🚀 YouTube Shorts MCP 시스템 설치를 시작합니다..."

# 1. 메인 큐레이션 서버 설치
echo "📦 YouTube Curator MCP Server 설치 중..."
cd servers/youtube-curator-mcp
npm install
echo "✅ YouTube Curator MCP Server 설치 완료"

# 2. 사용자 분석 서버 설치  
echo "📦 User Analytics MCP Server 설치 중..."
cd ../user-analytics-mcp
npm install
echo "✅ User Analytics MCP Server 설치 완료"

# 3. MCP 클라이언트 설치
echo "📦 MCP Client 설치 중..."
cd ../../clients/mcp-client
npm install
echo "✅ MCP Client 설치 완료"

# 4. 테스트 환경 설치
echo "📦 Test Environment 설치 중..."
cd ../../tests
npm install
echo "✅ Test Environment 설치 완료"

# 5. 환경 변수 템플릿 생성
echo "📝 환경 변수 템플릿 생성 중..."
cd ../servers/youtube-curator-mcp

cat > .env.template << EOF
# YouTube API (필수)
YOUTUBE_API_KEY=your_youtube_api_key_here

# SerpAPI (선택사항 - 키워드 확장 개선)
SERPAPI_KEY=your_serpapi_key_here

# Claude API (필수 - 자연어 분석)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# 기타 설정
NODE_ENV=development
MCP_PORT=3001
EOF

echo "✅ 환경 변수 템플릿 생성 완료"

# 6. 완료 메시지
echo ""
echo "🎉 MCP 시스템 설치가 완료되었습니다!"
echo ""
echo "📋 다음 단계:"
echo "1. servers/youtube-curator-mcp/.env.template을 .env로 복사"
echo "2. .env 파일에 실제 API 키 입력"
echo "3. npm start로 MCP 서버 실행"
echo "4. tests/ 폴더에서 테스트 실행"
echo ""
echo "🔧 빠른 시작:"
echo "  cd servers/youtube-curator-mcp"
echo "  cp .env.template .env"
echo "  # .env 파일 편집 후"
echo "  npm start"
echo ""
echo "🧪 테스트 실행:"
echo "  cd tests"
echo "  node test-new-tools.js" 