#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

// 생성할 디렉토리 구조
const directories = [
  'backend/src/api',
  'backend/src/services',
  'backend/src/mcp',
  'backend/src/middleware',
  'backend/src/utils',
  'backend/tests',
  'frontend/src/js',
  'frontend/src/css',
  'frontend/src/components',
  'frontend/src/assets',
  'frontend/public',
  'shared/types',
  'scripts',
  '.github/workflows'
];

// 생성할 파일들
const files = {
  // 루트 파일들
  '.gitignore': `# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Testing
coverage/
.nyc_output/

# Misc
*.pem
.cache/
`,

  '.env.example': `# Environment
NODE_ENV=development

# API Keys
YOUTUBE_API_KEY=your_youtube_api_key
CLAUDE_API_KEY=your_claude_api_key
BRIGHT_DATA_API_KEY=your_bright_data_api_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT
JWT_SECRET=your_jwt_secret

# URLs
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
`,

  'package.json': `{
  "name": "youtube-shorts-curator",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "backend",
    "frontend"
  ],
  "scripts": {
    "dev": "concurrently \\"npm run dev:backend\\" \\"npm run dev:frontend\\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd backend && npm test",
    "test:frontend": "cd frontend && npm test",
    "setup": "npm install && node scripts/setup.js"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
`,

  'railway.json': `{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "services": {
    "backend": {
      "source": {
        "directory": "backend"
      },
      "build": {
        "buildCommand": "npm install && npm run build"
      },
      "deploy": {
        "startCommand": "npm start",
        "healthcheckPath": "/api/health",
        "restartPolicyType": "ON_FAILURE"
      }
    },
    "frontend": {
      "source": {
        "directory": "frontend"
      },
      "build": {
        "buildCommand": "npm install && npm run build"
      },
      "deploy": {
        "startCommand": "npx serve -s dist -l $PORT"
      }
    }
  }
}
`,

  // Backend 파일들
  'backend/package.json': `{
  "name": "youtube-shorts-curator-backend",
  "version": "1.0.0",
  "main": "src/app.js",
  "scripts": {
    "dev": "nodemon src/app.js",
    "start": "node src/app.js",
    "build": "echo 'No build step for backend'",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.1",
    "@supabase/supabase-js": "^2.38.0",
    "googleapis": "^128.0.0",
    "jsonwebtoken": "^9.0.2",
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
`,

  'backend/.env.example': `# Backend specific
PORT=3001

# Copy from root .env
YOUTUBE_API_KEY=
CLAUDE_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
`,

  'backend/src/app.js': `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'youtube-shorts-curator-backend'
  });
});

// Routes will be added here
// app.use('/api/auth', require('./api/auth'));
// app.use('/api/search', require('./api/search'));
// app.use('/api/videos', require('./api/videos'));
// app.use('/api/trends', require('./api/trends'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

app.listen(PORT, () => {
  console.log(\`Backend server running on port \${PORT}\`);
});

module.exports = app;
`,

  // Frontend 파일들
  'frontend/package.json': `{
  "name": "youtube-shorts-curator-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "webpack serve --mode development",
    "build": "webpack --mode production",
    "test": "jest"
  },
  "devDependencies": {
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^4.15.1",
    "html-webpack-plugin": "^5.5.3",
    "css-loader": "^6.8.1",
    "style-loader": "^3.3.3",
    "file-loader": "^6.2.0",
    "jest": "^29.7.0"
  }
}
`,

  'frontend/.env.example': `# Frontend specific
API_URL=http://localhost:3001/api
`,

  'frontend/webpack.config.js': `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/js/app.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\\.(png|svg|jpg|jpeg|gif|webp)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name].[hash][ext]'
          }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        minify: isProduction
      })
    ],
    devServer: {
      static: './dist',
      hot: true,
      port: 3000,
      historyApiFallback: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    }
  };
};
`,

  'frontend/public/index.html': `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="AI가 추천하는 나만의 YouTube Shorts">
  <title>YouTube Shorts 큐레이터</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#FF0000">
</head>
<body>
  <div id="app">
    <div class="loading">로딩 중...</div>
  </div>
</body>
</html>
`,

  'frontend/public/manifest.json': `{
  "name": "YouTube Shorts 큐레이터",
  "short_name": "Shorts AI",
  "description": "AI가 추천하는 나만의 YouTube Shorts",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#FF0000",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
`,

  'frontend/src/js/app.js': `console.log('YouTube Shorts Curator - Frontend Starting...');

// 앱 초기화
class App {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Initializing app...');
    
    // API 헬스체크
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      console.log('Backend status:', data);
    } catch (error) {
      console.error('Backend connection failed:', error);
    }

    // 기본 UI 렌더링
    document.getElementById('app').innerHTML = \`
      <header>
        <h1>YouTube Shorts 큐레이터</h1>
      </header>
      <main>
        <p>AI가 추천하는 나만의 YouTube Shorts</p>
      </main>
    \`;
  }
}

// DOM 로드 후 앱 시작
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
`,

  'frontend/src/css/main.css': `:root {
  --primary-color: #FF0000;
  --background: #ffffff;
  --text-primary: #0f0f0f;
  --text-secondary: #606060;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--background);
  color: var(--text-primary);
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.2rem;
  color: var(--text-secondary);
}
`,

  // Shared 파일들
  'shared/constants.js': `// API 엔드포인트
exports.API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh'
  },
  SEARCH: {
    KEYWORDS: '/search/keywords',
    CHAT: '/search/chat',
    TRENDING: '/search/trending'
  },
  VIDEOS: {
    DETAIL: '/videos/:id',
    RELATED: '/videos/:id/related',
    INTERACTION: '/videos/:id/interactions'
  },
  TRENDS: {
    REALTIME: '/trends/realtime',
    HOURLY: '/trends/hourly',
    CATEGORIES: '/trends/categories'
  }
};

// YouTube API 할당량
exports.YOUTUBE_QUOTA = {
  DAILY_LIMIT: 10000,
  SEARCH_COST: 100,
  VIDEO_LIST_COST: 1  // 기본 비용, part별 추가 비용 있음
};

// 캐시 TTL (초)
exports.CACHE_TTL = {
  POPULAR: 30 * 24 * 60 * 60,  // 30일
  TRENDING: 4 * 60 * 60,        // 4시간
  USER: 24 * 60 * 60,           // 24시간
  DEFAULT: 60 * 60              // 1시간
};
`,

  // Scripts
  'scripts/setup.js': `#!/usr/bin/env node
console.log('🚀 YouTube Shorts 큐레이터 - 프로젝트 설정 시작');

const fs = require('fs');
const path = require('path');

// 환경변수 파일 생성
function createEnvFiles() {
  const envFiles = [
    { src: '.env.example', dest: '.env' },
    { src: 'backend/.env.example', dest: 'backend/.env' },
    { src: 'frontend/.env.example', dest: 'frontend/.env' }
  ];

  envFiles.forEach(({ src, dest }) => {
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(\`✅ \${dest} 파일 생성됨\`);
    }
  });
}

// Supabase 테이블 생성 SQL 출력
function printDatabaseSetup() {
  console.log('\\n📝 Supabase에서 다음 SQL을 실행하세요:\\n');
  console.log(\`
-- Users table (Supabase Auth가 자동 생성)

-- User profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  user_tier TEXT DEFAULT 'free',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);
  \`);
}

// 실행
createEnvFiles();
printDatabaseSetup();

console.log('\\n✨ 설정 완료! 다음 단계:');
console.log('1. .env 파일들에 실제 API 키 입력');
console.log('2. Supabase에서 위 SQL 실행');
console.log('3. npm run dev로 개발 시작');
`
};

// 파일 생성 함수
function createFile(filePath, content) {
  const dir = path.dirname(filePath);
  
  // 디렉토리가 없으면 생성
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 파일 생성
  fs.writeFileSync(filePath, content);
  console.log(`${colors.green}✓${colors.reset} Created: ${filePath}`);
}

// 메인 실행 함수
function init() {
  console.log(`${colors.blue}🚀 YouTube Shorts 큐레이터 프로젝트 구조 생성 시작${colors.reset}\n`);

  // 디렉토리 생성
  console.log(`${colors.yellow}📁 디렉토리 생성 중...${colors.reset}`);
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`${colors.green}✓${colors.reset} Created directory: ${dir}`);
    }
  });

  // 파일 생성
  console.log(`\n${colors.yellow}📄 파일 생성 중...${colors.reset}`);
  Object.entries(files).forEach(([filePath, content]) => {
    createFile(filePath, content);
  });

  console.log(`\n${colors.green}✨ 프로젝트 구조 생성 완료!${colors.reset}`);
  console.log(`\n${colors.blue}다음 단계:${colors.reset}`);
  console.log('1. npm install - 의존성 설치');
  console.log('2. npm run setup - 환경 설정');
  console.log('3. API 키 설정 (.env 파일들)');
  console.log('4. npm run dev - 개발 시작');
}

// 스크립트 실행
init(); 