# 🚄 Railway 배포 가이드 (백엔드 전용)

## 🎯 배포 아키텍처

### 분리 배포 전략 (권장) ✅

```
🔥 Railway → 백엔드 API 서버만
📱 Vercel/Netlify → 프론트엔드만
```

**장점:**

- 각 서비스에 최적화된 플랫폼 사용
- 독립적인 배포 및 확장
- 비용 효율적 (프론트엔드 무료 호스팅)
- CDN 자동 적용 (프론트엔드)

## 📋 배포 전 준비사항

### 필수 환경 변수 설정

Railway 대시보드에서 다음 환경 변수들을 설정해야 합니다:

```bash
# 🔑 API 키들
YOUTUBE_API_KEY=your_youtube_api_key_here
ANTHROPIC_API_KEY=your_claude_api_key_here
SERPAPI_KEY=your_serpapi_key_here

# 🗄️ 데이터베이스 (Supabase)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ⚙️ 서버 설정
NODE_ENV=production
PORT=3002
API_PREFIX=/api/v1

# 🔐 보안
JWT_SECRET=your_super_secure_jwt_secret_at_least_32_characters
SESSION_SECRET=your_super_secure_session_secret

# 🌐 CORS 설정 (프론트엔드 도메인들)
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### 설정 확인 체크리스트

- [ ] YouTube Data API v3 키 발급 완료
- [ ] Claude API (Anthropic) 키 발급 완료
- [ ] SerpAPI 키 발급 완료
- [ ] Supabase 프로젝트 생성 및 키 확보
- [ ] 안전한 JWT_SECRET 생성 (32글자 이상)

## 🚀 백엔드 배포 단계

### 1. GitHub Repository 구조 확인

```
Youtube/
├── backend/          ← Railway에서 이 폴더만 배포
│   ├── package.json
│   ├── server.js
│   ├── railway.json
│   └── ...
├── frontend/         ← Vercel/Netlify에서 별도 배포
│   └── ...
└── ...
```

### 2. Railway 프로젝트 생성 및 설정

#### A. 웹 대시보드 방식 (추천)

1. [railway.app](https://railway.app) 접속
2. **"New Project"** 클릭
3. **"Deploy from GitHub repo"** 선택
4. 저장소 선택 후 **중요!** ⚠️
   ```
   Root Directory: backend
   ```
   반드시 `backend` 폴더를 root로 설정!

#### B. CLI 방식

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 프로젝트 루트에서 (not backend 폴더)
cd ~/Desktop/큐레이팅/Youtube

# 로그인
railway login

# 프로젝트 생성 (backend 폴더 지정)
railway init --rootDir backend
```

### 3. 환경 변수 설정

Railway 대시보드 > **Variables** 탭에서 위의 모든 환경 변수 입력

### 4. 배포 실행

- **자동 배포**: GitHub 푸시 시 `backend/` 폴더 변경사항만 감지하여 배포
- **수동 배포**: Railway 대시보드에서 "Deploy" 버튼

## 🌐 프론트엔드 배포 가이드

### 권장 플랫폼

#### Vercel (추천) 🟢

```bash
# Vercel CLI 설치
npm i -g vercel

# 프론트엔드 폴더에서
cd frontend
vercel

# 환경 변수 설정
vercel env add VITE_API_URL production
# 값: https://your-backend-name.railway.app
```

#### Netlify 🟡

```bash
# Netlify CLI 설치
npm i -g netlify-cli

# 프론트엔드 폴더에서
cd frontend
netlify deploy --prod
```

#### GitHub Pages 🟠

- 무료이지만 PWA 제약 있음
- 커스텀 도메인 필요 시 추천

### 프론트엔드 환경 변수

```bash
# .env.production (프론트엔드)
VITE_API_URL=https://momentum-backend-production.railway.app
VITE_APP_NAME=Momentum
```

## 🔗 CORS 설정 연동

### 배포 후 할 일

1. **프론트엔드 URL 확인**

   ```
   예시: https://momentum-frontend.vercel.app
   ```

2. **Railway 환경 변수 업데이트**

   ```bash
   FRONTEND_URL=https://momentum-frontend.vercel.app
   ```

3. **다중 도메인 지원** (필요시)
   ```bash
   FRONTEND_URL=https://momentum-frontend.vercel.app,https://momentum.yourdomain.com
   ```

## 🔍 배포 후 확인사항

### 1. 백엔드 헬스체크

```bash
curl https://your-backend-name.railway.app/health
```

### 2. 프론트엔드 → 백엔드 연결 확인

```bash
# 프론트엔드에서 API 호출 테스트
curl https://your-frontend-name.vercel.app

# 개발자 도구에서 네트워크 탭 확인
# API 요청이 Railway 백엔드로 정상 전송되는지 확인
```

### 3. CORS 정상 동작 확인

- 브라우저 콘솔에서 CORS 에러 없는지 확인
- API 요청이 정상적으로 응답받는지 확인

## 🛠️ 설정 파일들

### railway.json (백엔드)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### vercel.json (프론트엔드, 필요시)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## 💰 비용 최적화

### Railway (백엔드)

- **Hobby Plan**: $5/월
- 512MB RAM, 1GB 저장공간
- 충분한 성능 제공

### Vercel (프론트엔드)

- **무료 플랜**으로 충분
- 100GB 대역폭
- 자동 CDN

### 총 예상 비용: **$5/월** 💰

## 🚨 문제해결

### 백엔드 관련

**1. Root Directory 설정 누락**

- 증상: "No package.json found" 에러
- 해결: Railway 설정에서 Root Directory를 `backend`로 설정

**2. 환경 변수 누락**

- 증상: API 호출 시 "missing configuration" 에러
- 해결: Railway Variables에서 모든 필수 환경 변수 확인

### 프론트엔드 관련

**3. CORS 에러**

- 증상: "CORS policy" 에러
- 해결: 백엔드의 `FRONTEND_URL` 환경 변수 확인

**4. API URL 설정 오류**

- 증상: 네트워크 요청 실패
- 해결: 프론트엔드의 `VITE_API_URL` 확인

---

## 🎯 배포 체크리스트

### 백엔드 (Railway) ✅

- [ ] GitHub 연결 시 `backend` 폴더를 Root Directory로 설정
- [ ] 모든 환경 변수 설정 완료
- [ ] 헬스체크 `/health` 정상 응답 확인
- [ ] API 엔드포인트 테스트 통과

### 프론트엔드 (Vercel/Netlify) 📱

- [ ] 프론트엔드 플랫폼 선택 및 배포
- [ ] `VITE_API_URL` 환경 변수 설정
- [ ] PWA 매니페스트 정상 동작 확인
- [ ] 모바일 브라우저 테스트 완료

### 연동 확인 🔗

- [ ] 백엔드 `FRONTEND_URL`에 프론트엔드 도메인 설정
- [ ] CORS 에러 없이 API 호출 성공
- [ ] 인증 시스템 정상 동작
- [ ] 실시간 트렌드 데이터 표시 확인

---

**🚀 분리 배포 준비 완료!**

**예상 URL:**

- 🔥 백엔드: `https://momentum-backend-production.railway.app`
- 📱 프론트엔드: `https://momentum-frontend.vercel.app`

**배포 순서:**

1. 백엔드 Railway 배포 (지금 가능)
2. 프론트엔드 개발 완료 후 Vercel 배포
3. CORS 설정 연동

## 🔗 유용한 링크

- [Railway 문서](https://docs.railway.app/)
- [Node.js 배포 가이드](https://docs.railway.app/deploy/deployments)
- [환경 변수 설정](https://docs.railway.app/develop/variables)
- [도메인 연결](https://docs.railway.app/deploy/exposing-your-app)

---

**준비 완료! 🎉**

이제 Railway에서 새 프로젝트를 생성하고 위의 환경 변수들을 설정한 후 배포하면 됩니다.

**다음 단계**:

1. Railway 계정 생성/로그인
2. 새 프로젝트 생성
3. GitHub 연결
4. 환경 변수 설정
5. 배포 실행
