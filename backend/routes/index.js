import express from 'express';

// Import route modules
import authRoutes from './authRoutes.js';
import searchRoutes from './searchRoutes.js';
import llmRoutes from './llmRoutes.js';
import trendRoutes from './trendRoutes.js';

// Import v2 route modules
import v2EmotionRoutes from './v2/emotionRoutes.js';
import v2SearchRoutes from './v2/searchRoutes.js';

// Import database route modules
import userDbRoutes from './database/userRoutes.js';
import videoDbRoutes from './database/videoRoutes.js';
import searchDbRoutes from './database/searchRoutes.js';
import trendDbRoutes from './database/trendRoutes.js';
import systemDbRoutes from './database/systemRoutes.js';
import keywordDbRoutes from './database/keywordRoutes.js';
import emotionDbRoutes from './database/emotionRoutes.js';

// TODO: 🔒 보안 미들웨어 임포트 (테스트 후 구현)
// import { verifyToken, verifyDbAccess, verifyOwnership, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

/*
===============================================
🔒 3단계 보안 미들웨어 적용 계획
===============================================

📋 현재 상태: 175개 Database API 엔드포인트가 완전히 무보안 상태
⚠️  심각한 보안 취약점: 누구나 모든 사용자 데이터 접근/조작 가능

🎯 3단계 보안 전략:
┌─────────────────────────────────────────────────────────────────┐
│ 1단계: 고위험 API 즉시 보안 적용 (🔴 Critical)                    │
│ 2단계: 중위험 API 보안 적용 (🟡 High)                           │  
│ 3단계: 저위험 API 보안 적용 (🟢 Medium)                         │
└─────────────────────────────────────────────────────────────────┘

📊 보안 레벨별 미들웨어 적용 방법:

🔴 1단계 - Critical (즉시 적용 필요):
router.use('/users_db', verifyDbAccess, verifyOwnership, userDbRoutes);
router.use('/system_db', verifyDbAccess, verifyAdmin, systemDbRoutes);

🟡 2단계 - High (개발 완료 후 적용):
router.use('/search_db', verifyDbAccess, searchDbRoutes);
router.use('/emotions_db', verifyDbAccess, verifyOwnership, emotionDbRoutes);

🟢 3단계 - Medium (배포 전 적용):
router.use('/videos_db', verifyDbAccess, videoDbRoutes);
router.use('/trends_db', verifyDbAccess, trendDbRoutes);
router.use('/keywords_db', verifyDbAccess, keywordDbRoutes);

===============================================
🛡️ 미들웨어 종류별 설명
===============================================

1️⃣ verifyDbAccess (Database 접근 기본 인증)
   - JWT 토큰 검증
   - 로그인한 사용자만 Database API 접근 가능
   - 모든 Database Routes에 기본 적용

2️⃣ verifyOwnership (본인 데이터만 접근)
   - URL의 userId가 현재 사용자와 일치하는지 확인
   - 예: GET /users_db/:userId/profile → 본인 프로필만 조회 가능
   - users_db, emotions_db에 적용

3️⃣ verifyAdmin (관리자 권한 필요)
   - 시스템 관리 기능 접근 제한
   - 환경변수 ADMIN_EMAILS로 관리자 지정
   - system_db에 적용

===============================================
📋 라우트별 세부 보안 계획
===============================================

🔵 인증 관련 Routes (이미 보안 적용됨):
✅ /auth → authRoutes (4개 보안 엔드포인트)

🟦 비즈니스 로직 Routes (현재 무보안, 추후 선택적 적용):
📊 /search → searchRoutes (10개 엔드포인트)
🤖 /llm → llmRoutes (7개 엔드포인트)  
📈 /trends → trendRoutes (8개 엔드포인트)

🔴 Database Routes (현재 175개 모두 무보안!):

┌─ users_db (32개) - 🔴 Critical
│  ├─ 개인정보: 프로필, 설정, 활동기록
│  ├─ 보안: verifyDbAccess + verifyOwnership
│  └─ 위험도: 매우 높음 (개인정보 유출)

├─ system_db (26개) - 🔴 Critical  
│  ├─ 시스템 관리: 설정, 로그, 통계
│  ├─ 보안: verifyDbAccess + verifyAdmin
│  └─ 위험도: 매우 높음 (시스템 조작)

├─ emotions_db (24개) - 🟡 High
│  ├─ 감정 데이터: 개인 감정 분석 결과
│  ├─ 보안: verifyDbAccess + verifyOwnership  
│  └─ 위험도: 높음 (개인 감정 정보)

├─ search_db (30개) - 🟡 High
│  ├─ 검색 기록: 개인 검색 패턴
│  ├─ 보안: verifyDbAccess
│  └─ 위험도: 높음 (사용자 행동 분석)

├─ videos_db (21개) - 🟢 Medium
│  ├─ 영상 메타데이터: 공개 정보 위주
│  ├─ 보안: verifyDbAccess
│  └─ 위험도: 중간 (대부분 공개 정보)

├─ trends_db (22개) - 🟢 Medium
│  ├─ 트렌드 정보: 공개 트렌드 데이터
│  ├─ 보안: verifyDbAccess
│  └─ 위험도: 중간 (공개 정보)

└─ keywords_db (24개) - 🟢 Medium
   ├─ 키워드 정보: 공개 키워드 데이터
   ├─ 보안: verifyDbAccess
   └─ 위험도: 중간 (공개 정보)

===============================================
🧪 개발/테스트 모드 고려사항
===============================================

🔧 개발 모드 우회 설정:
환경변수: BYPASS_DB_AUTH=true (개발 시에만 사용)
- verifyDbAccess에서 자동으로 인증 우회
- 테스트 완료 후 반드시 false로 변경

⚠️ 주의사항:
1. 프로덕션에서는 절대 BYPASS_DB_AUTH=true 사용 금지
2. 테스트 데이터만 사용하여 실제 사용자 데이터 보호
3. API 키와 민감한 정보는 환경변수로 관리

===============================================
*/

// ============================================
// 현재 라우트 설정 (무보안 상태 - 테스트용)
// ============================================

// API Routes (기존 비즈니스 로직)
router.use('/auth', authRoutes);               // ✅ 이미 보안 적용됨
router.use('/search', searchRoutes);           // 📊 10개 엔드포인트 (무보안)
router.use('/llm', llmRoutes);                 // 🤖 7개 엔드포인트 (무보안)  
router.use('/trends', trendRoutes);            // �� 8개 엔드포인트 (무보안)

// v2 API Routes (새로운 버전)
router.use('/v2/emotion', v2EmotionRoutes);    // 🎭 감정 기반 키워드 추천 API
router.use('/v2/search', v2SearchRoutes);      // 🔍 VQS 기반 영상 검색 API

// Database API Routes (전체 175개 엔드포인트 - 현재 무보안!)
router.use('/users_db', userDbRoutes);         // 🔴 32개 - Critical (개인정보)
router.use('/videos_db', videoDbRoutes);       // 🟢 21개 - Medium (영상 메타데이터)
router.use('/search_db', searchDbRoutes);      // 🟡 30개 - High (검색 기록)
router.use('/trends_db', trendDbRoutes);       // 🟢 22개 - Medium (트렌드 정보)
router.use('/system_db', systemDbRoutes);      // 🔴 26개 - Critical (시스템 관리)
router.use('/keywords_db', keywordDbRoutes);   // 🟢 24개 - Medium (키워드 정보)
router.use('/emotions_db', emotionDbRoutes);   // 🟡 24개 - High (개인 감정 데이터)

// ============================================
// TODO: 보안 적용 후 최종 형태 (주석 처리)
// ============================================

/*
// 🔴 1단계: Critical - 즉시 보안 적용 필요
router.use('/users_db', verifyDbAccess, verifyOwnership, userDbRoutes);
router.use('/system_db', verifyDbAccess, verifyAdmin, systemDbRoutes);

// 🟡 2단계: High - 개발 완료 후 보안 적용  
router.use('/search_db', verifyDbAccess, searchDbRoutes);
router.use('/emotions_db', verifyDbAccess, verifyOwnership, emotionDbRoutes);

// 🟢 3단계: Medium - 배포 전 보안 적용
router.use('/videos_db', verifyDbAccess, videoDbRoutes);
router.use('/trends_db', verifyDbAccess, trendDbRoutes);
router.use('/keywords_db', verifyDbAccess, keywordDbRoutes);

// 기존 API Routes (선택적 보안 적용)
router.use('/auth', authRoutes);
router.use('/search', optionalAuth, searchRoutes);    // 선택적 인증 (개인화)
router.use('/llm', optionalAuth, llmRoutes);          // 선택적 인증 (개인화)
router.use('/trends', trendRoutes);                   // 공개 접근
*/

export default router; 