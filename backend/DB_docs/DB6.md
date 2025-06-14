# 🚀 Momentum YouTube AI 큐레이션 서비스 - 최종 구현 가이드

## Part 6: API 설계 + 실제 구현 예시

> **Version**: 4.0 FINAL  
> **Last Updated**: 2025-01-13  
> **Dependencies**: Part 1-5

---

## 📋 목차

1. [API 아키텍처 개요](#1-api-아키텍처-개요)
2. [RESTful API 설계](#2-restful-api-설계)
3. [미들웨어 구현](#3-미들웨어-구현)
4. [API 라우터 구현](#4-api-라우터-구현)
5. [실제 구현 예시](#5-실제-구현-예시)
6. [API 문서화](#6-api-문서화)

---

## 1. API 아키텍처 개요

### 1.1 기술 스택

```typescript
// package.json
{
  "name": "momentum-api",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.38.4",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "compression": "^1.7.4",
    "swagger-ui-express": "^5.0.0",
    "redis": "^4.6.11",
    "bull": "^4.11.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11"
  }
}
```

### 1.2 프로젝트 구조

```
momentum-api/
├── src/
│   ├── app.ts                 # Express 앱 설정
│   ├── server.ts              # 서버 시작점
│   ├── config/
│   │   ├── database.ts        # DB 연결
│   │   ├── redis.ts           # Redis 연결
│   │   └── constants.ts       # 상수 정의
│   ├── middleware/
│   │   ├── auth.ts            # 인증 미들웨어
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   ├── validator.ts       # 입력 검증
│   │   ├── errorHandler.ts    # 에러 처리
│   │   └── logger.ts          # 로깅
│   ├── routes/
│   │   ├── index.ts           # 라우터 통합
│   │   ├── auth.routes.ts     # 인증 라우트
│   │   ├── user.routes.ts     # 사용자 라우트
│   │   ├── video.routes.ts    # 영상 라우트
│   │   ├── trend.routes.ts    # 트렌드 라우트
│   │   ├── recommendation.routes.ts  # 추천 라우트
│   │   └── analytics.routes.ts      # 분석 라우트
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── video.controller.ts
│   │   ├── trend.controller.ts
│   │   ├── recommendation.controller.ts
│   │   └── analytics.controller.ts
│   ├── services/              # Part 5에서 구현한 서비스
│   ├── types/
│   │   ├── express.d.ts       # Express 타입 확장
│   │   └── api.types.ts       # API 타입 정의
│   ├── utils/
│   │   ├── response.ts        # 응답 포맷터
│   │   └── helpers.ts         # 헬퍼 함수
│   └── docs/
│       └── swagger.yaml       # API 문서
├── tests/
├── .env.example
├── tsconfig.json
└── package.json
```

### 1.3 환경 설정

```env
# .env.example
NODE_ENV=production
PORT=3000

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key

# Redis
REDIS_URL=redis://localhost:6379

# External APIs
YOUTUBE_API_KEY=your-youtube-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
NEWS_API_KEY=your-news-api-key

# Security
JWT_SECRET=your-jwt-secret
API_KEY_SECRET=your-api-key-secret

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=app.log
```

---

## 2. RESTful API 설계

### 2.1 API 엔드포인트 구조

```yaml
# API 버전: v1
base_url: https://api.momentum.app/v1

# 인증 엔드포인트
/auth:
  POST   /signup         # 회원가입
  POST   /login          # 로그인
  POST   /logout         # 로그아웃
  POST   /refresh        # 토큰 갱신
  GET    /me             # 현재 사용자 정보

# 사용자 엔드포인트
/users:
  GET    /profile        # 프로필 조회
  PATCH  /profile        # 프로필 수정
  GET    /preferences    # 선호도 조회
  POST   /preferences    # 선호도 업데이트
  GET    /history        # 시청 기록
  DELETE /history        # 시청 기록 삭제

# 영상 엔드포인트
/videos:
  GET    /              # 영상 목록
  GET    /:id           # 영상 상세
  POST   /search        # 영상 검색
  POST   /:id/interact  # 상호작용 기록
  GET    /:id/similar   # 유사 영상

# 추천 엔드포인트
/recommendations:
  GET    /              # 개인화 추천
  GET    /trending      # 트렌드 추천
  POST   /emotion       # 감정 기반 추천
  POST   /feedback      # 추천 피드백

# 트렌드 엔드포인트
/trends:
  GET    /              # 현재 트렌드
  GET    /keywords      # 트렌드 키워드
  GET    /videos        # 트렌드 영상

# 분석 엔드포인트
/analytics:
  GET    /dashboard     # 대시보드 통계
  POST   /events        # 이벤트 추적
  GET    /reports       # 리포트 조회
```

### 2.2 API 응답 형식

```typescript
// utils/response.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
  timestamp: string;
}

export class ResponseBuilder {
  static success<T>(data: T, meta?: any): ApiResponse<T> {
    return {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  static error(code: string, message: string, details?: any): ApiResponse {
    return {
      success: false,
      error: { code, message, details },
      timestamp: new Date().toISOString(),
    };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): ApiResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 2.3 HTTP 상태 코드 규칙

```typescript
// utils/httpStatus.ts
export const HttpStatus = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;
```

---

## 3. 미들웨어 구현

### 3.1 인증 미들웨어

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { ResponseBuilder } from "../utils/response";
import { HttpStatus } from "../utils/httpStatus";

// Express Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tier: string;
      };
      supabase?: ReturnType<typeof createClient>;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(
          ResponseBuilder.error("MISSING_TOKEN", "인증 토큰이 필요합니다.")
        );
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // 사용자 정보 확인
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(
          ResponseBuilder.error("INVALID_TOKEN", "유효하지 않은 토큰입니다.")
        );
    }

    // 사용자 프로필 조회
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("user_tier")
      .eq("user_id", user.id)
      .single();

    // Request에 사용자 정보 추가
    req.user = {
      id: user.id,
      email: user.email!,
      tier: profile?.user_tier || "free",
    };
    req.supabase = supabase;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        ResponseBuilder.error("AUTH_ERROR", "인증 처리 중 오류가 발생했습니다.")
      );
  }
};

// 선택적 인증 (로그인하지 않아도 접근 가능)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    return authMiddleware(req, res, next);
  }

  // 익명 사용자용 Supabase 클라이언트
  req.supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  next();
};

// 티어별 접근 제한
export const requireTier = (minTier: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const tierLevels = {
      free: 0,
      premium: 1,
      pro: 2,
      enterprise: 3,
    };

    const userTierLevel =
      tierLevels[req.user?.tier as keyof typeof tierLevels] || 0;
    const requiredLevel = tierLevels[minTier as keyof typeof tierLevels] || 0;

    if (userTierLevel < requiredLevel) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json(
          ResponseBuilder.error(
            "INSUFFICIENT_TIER",
            `이 기능은 ${minTier} 이상 등급에서 사용 가능합니다.`
          )
        );
    }

    next();
  };
};
```

### 3.2 Rate Limiting 미들웨어

```typescript
// middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Redis } from "ioredis";
import { ResponseBuilder } from "../utils/response";

const redis = new Redis(process.env.REDIS_URL!);

// 기본 rate limiter
export const defaultRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:default:",
  }),
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100개 요청
  message: ResponseBuilder.error(
    "TOO_MANY_REQUESTS",
    "너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요."
  ),
  standardHeaders: true,
  legacyHeaders: false,
});

// API 키 기반 rate limiter
export const apiKeyRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:api:",
  }),
  windowMs: 60 * 60 * 1000, // 1시간
  max: 1000, // 최대 1000개 요청
  keyGenerator: (req) => {
    return (req.headers["x-api-key"] as string) || req.ip;
  },
  skip: (req) => {
    // Premium 사용자는 제한 없음
    return req.user?.tier === "premium" || req.user?.tier === "pro";
  },
});

// 검색 API rate limiter
export const searchRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:search:",
  }),
  windowMs: 60 * 1000, // 1분
  max: 10, // 분당 10회 검색
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

// AI 검색 rate limiter (더 엄격한 제한)
export const aiSearchRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:ai:",
  }),
  windowMs: 24 * 60 * 60 * 1000, // 24시간
  max: async (req) => {
    // 티어별 다른 제한
    const limits = {
      free: 10,
      premium: 50,
      pro: 100,
      enterprise: 1000,
    };
    return limits[req.user?.tier as keyof typeof limits] || 10;
  },
  message: ResponseBuilder.error(
    "AI_QUOTA_EXCEEDED",
    "AI 검색 일일 한도를 초과했습니다."
  ),
});

// 동적 rate limiting (부하에 따라 조절)
export const dynamicRateLimiter = (options: {
  baseLimit: number;
  window: number;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Redis에서 현재 시스템 부하 확인
      const systemLoad = (await redis.get("system:load")) || "0";
      const load = parseFloat(systemLoad);

      // 부하에 따라 제한 조정
      const adjustedLimit = Math.floor(options.baseLimit * (1 - load));

      const limiter = rateLimit({
        windowMs: options.window,
        max: adjustedLimit,
        store: new RedisStore({
          client: redis,
          prefix: "rl:dynamic:",
        }),
      });

      limiter(req, res, next);
    } catch (error) {
      console.error("Dynamic rate limiter error:", error);
      next();
    }
  };
};
```

### 3.3 입력 검증 미들웨어

```typescript
// middleware/validator.ts
import { body, param, query, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { ResponseBuilder } from "../utils/response";
import { HttpStatus } from "../utils/httpStatus";

// 검증 결과 확인
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json(
        ResponseBuilder.error(
          "VALIDATION_ERROR",
          "입력값이 올바르지 않습니다.",
          errors.array()
        )
      );
  }

  next();
};

// 공통 검증 규칙
export const validators = {
  // ID 검증
  id: param("id").isUUID().withMessage("유효한 ID 형식이 아닙니다."),

  // 페이지네이션
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("페이지는 1 이상의 정수여야 합니다."),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("한 페이지당 항목 수는 1-100 사이여야 합니다."),
  ],

  // 검색
  search: [
    body("query")
      .trim()
      .notEmpty()
      .withMessage("검색어를 입력해주세요.")
      .isLength({ min: 2, max: 100 })
      .withMessage("검색어는 2-100자 사이여야 합니다."),
    body("type")
      .optional()
      .isIn(["keyword", "ai_chat", "trending", "emotion"])
      .withMessage("올바른 검색 타입이 아닙니다."),
  ],

  // 영상 상호작용
  videoInteraction: [
    param("id")
      .matches(/^[a-zA-Z0-9_-]{11}$/)
      .withMessage("올바른 YouTube 영상 ID가 아닙니다."),
    body("type")
      .isIn(["view", "like", "dislike", "share", "save", "skip", "report"])
      .withMessage("올바른 상호작용 타입이 아닙니다."),
    body("watchDuration")
      .optional()
      .isInt({ min: 0, max: 3600 })
      .withMessage("시청 시간은 0-3600초 사이여야 합니다."),
  ],

  // 감정 기반 추천
  emotionRecommendation: [
    body("emotion")
      .isIn([
        "happy",
        "sad",
        "excited",
        "calm",
        "stressed",
        "anxious",
        "angry",
        "bored",
        "inspired",
        "nostalgic",
      ])
      .withMessage("올바른 감정 타입이 아닙니다."),
    body("intensity")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("감정 강도는 low, medium, high 중 하나여야 합니다."),
  ],

  // 사용자 프로필
  userProfile: [
    body("displayName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("닉네임은 2-50자 사이여야 합니다."),
    body("avatarUrl")
      .optional()
      .isURL()
      .withMessage("올바른 URL 형식이 아닙니다."),
    body("preferences")
      .optional()
      .isObject()
      .withMessage("설정은 객체 형태여야 합니다."),
  ],
};

// 커스텀 검증 규칙
export const customValidators = {
  // YouTube 영상 ID 검증
  isYouTubeVideoId: (value: string) => {
    const regex = /^[a-zA-Z0-9_-]{11}$/;
    if (!regex.test(value)) {
      throw new Error("올바른 YouTube 영상 ID가 아닙니다.");
    }
    return true;
  },

  // 키워드 배열 검증
  isKeywordArray: (value: string[]) => {
    if (!Array.isArray(value)) {
      throw new Error("키워드는 배열이어야 합니다.");
    }
    if (value.length > 20) {
      throw new Error("키워드는 최대 20개까지 가능합니다.");
    }
    if (value.some((keyword) => keyword.length > 50)) {
      throw new Error("각 키워드는 50자를 초과할 수 없습니다.");
    }
    return true;
  },
};
```

### 3.4 에러 처리 미들웨어

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { ResponseBuilder } from "../utils/response";
import { HttpStatus } from "../utils/httpStatus";
import winston from "winston";

const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log" }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// 커스텀 에러 클래스
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// 비동기 핸들러 래퍼
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 핸들러
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new ApiError(
    HttpStatus.NOT_FOUND,
    "ENDPOINT_NOT_FOUND",
    `엔드포인트를 찾을 수 없습니다: ${req.method} ${req.path}`
  );
  next(error);
};

// 전역 에러 핸들러
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 로깅
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.id,
  });

  // ApiError 처리
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json(ResponseBuilder.error(err.code, err.message, err.details));
  }

  // Supabase 에러 처리
  if (err.message?.includes("PGRST")) {
    const supabaseErrors: Record<string, { status: number; message: string }> =
      {
        PGRST116: { status: 404, message: "리소스를 찾을 수 없습니다." },
        PGRST204: { status: 409, message: "중복된 데이터입니다." },
        PGRST301: { status: 401, message: "인증이 필요합니다." },
      };

    const errorCode = err.message.match(/PGRST\d+/)?.[0];
    if (errorCode && supabaseErrors[errorCode]) {
      const { status, message } = supabaseErrors[errorCode];
      return res.status(status).json(ResponseBuilder.error(errorCode, message));
    }
  }

  // 기본 에러 응답
  const isDev = process.env.NODE_ENV === "development";
  res
    .status(HttpStatus.INTERNAL_SERVER_ERROR)
    .json(
      ResponseBuilder.error(
        "INTERNAL_ERROR",
        isDev ? err.message : "서버 오류가 발생했습니다.",
        isDev ? err.stack : undefined
      )
    );
};
```

### 3.5 로깅 미들웨어

```typescript
// middleware/logger.ts
import winston from "winston";
import expressWinston from "express-winston";
import { Request } from "express";

// Winston 로거 설정
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "momentum-api" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// HTTP 요청 로거
export const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
  requestWhitelist: ["url", "method", "httpVersion", "originalUrl", "query"],
  responseWhitelist: ["statusCode", "responseTime"],
  dynamicMeta: (req: Request) => {
    return {
      userId: req.user?.id,
      userTier: req.user?.tier,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };
  },
});

// 에러 로거
export const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
  meta: true,
});

// 성능 모니터링
export const performanceLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (duration > 1000) {
      // 1초 이상 걸린 요청 로깅
      logger.warn("Slow request detected", {
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode,
      });
    }
  });

  next();
};

export { logger };
```

---

## 4. API 라우터 구현

### 4.1 메인 라우터

```typescript
// routes/index.ts
import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import videoRoutes from "./video.routes";
import trendRoutes from "./trend.routes";
import recommendationRoutes from "./recommendation.routes";
import analyticsRoutes from "./analytics.routes";

const router = Router();

// 헬스 체크
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API 버전 정보
router.get("/version", (req, res) => {
  res.json({
    version: "1.0.0",
    apiVersion: "v1",
    lastUpdated: "2025-01-13",
  });
});

// 라우트 등록
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/videos", videoRoutes);
router.use("/trends", trendRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
```

### 4.2 인증 라우터

```typescript
// routes/auth.routes.ts
import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validators, validate } from "../middleware/validator";
import { defaultRateLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

// Rate limiting 적용
router.use(defaultRateLimiter);

// 회원가입
router.post(
  "/signup",
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("비밀번호는 8자 이상이어야 합니다."),
    body("displayName").optional().trim().isLength({ min: 2, max: 50 }),
    validate,
  ],
  asyncHandler(authController.signup)
);

// 로그인
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
    validate,
  ],
  asyncHandler(authController.login)
);

// 로그아웃
router.post("/logout", authMiddleware, asyncHandler(authController.logout));

// 토큰 갱신
router.post(
  "/refresh",
  [body("refreshToken").notEmpty(), validate],
  asyncHandler(authController.refresh)
);

// 현재 사용자 정보
router.get("/me", authMiddleware, asyncHandler(authController.getCurrentUser));

export default router;
```

### 4.3 영상 라우터

```typescript
// routes/video.routes.ts
import { Router } from "express";
import { videoController } from "../controllers/video.controller";
import { authMiddleware, optionalAuth } from "../middleware/auth";
import { validators, validate } from "../middleware/validator";
import {
  searchRateLimiter,
  aiSearchRateLimiter,
} from "../middleware/rateLimiter";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

// 영상 목록 (인증 선택적)
router.get(
  "/",
  optionalAuth,
  validators.pagination,
  validate,
  asyncHandler(videoController.getVideos)
);

// 영상 검색
router.post(
  "/search",
  optionalAuth,
  searchRateLimiter,
  validators.search,
  validate,
  asyncHandler(videoController.searchVideos)
);

// AI 검색 (인증 필수, 더 엄격한 rate limit)
router.post(
  "/search/ai",
  authMiddleware,
  aiSearchRateLimiter,
  [
    body("query").trim().notEmpty().isLength({ min: 5, max: 200 }),
    body("emotion").optional().isIn(["happy", "sad", "excited", "calm"]),
    validate,
  ],
  asyncHandler(videoController.aiSearch)
);

// 영상 상세 정보
router.get(
  "/:id",
  optionalAuth,
  [param("id").custom(customValidators.isYouTubeVideoId), validate],
  asyncHandler(videoController.getVideoDetail)
);

// 영상 상호작용 기록
router.post(
  "/:id/interact",
  authMiddleware,
  validators.videoInteraction,
  validate,
  asyncHandler(videoController.recordInteraction)
);

// 유사 영상 추천
router.get(
  "/:id/similar",
  optionalAuth,
  [
    param("id").custom(customValidators.isYouTubeVideoId),
    query("limit").optional().isInt({ min: 1, max: 20 }),
    validate,
  ],
  asyncHandler(videoController.getSimilarVideos)
);

export default router;
```

### 4.4 추천 라우터

```typescript
// routes/recommendation.routes.ts
import { Router } from "express";
import { recommendationController } from "../controllers/recommendation.controller";
import { authMiddleware, requireTier } from "../middleware/auth";
import { validators, validate } from "../middleware/validator";
import { asyncHandler } from "../middleware/errorHandler";
import { cache } from "../middleware/cache";

const router = Router();

// 개인화 추천 (인증 필수)
router.get(
  "/",
  authMiddleware,
  [
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("offset").optional().isInt({ min: 0 }),
    validate,
  ],
  cache("5m"), // 5분 캐시
  asyncHandler(recommendationController.getPersonalized)
);

// 트렌드 추천 (공개)
router.get(
  "/trending",
  [
    query("category").optional().isString(),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    validate,
  ],
  cache("15m"), // 15분 캐시
  asyncHandler(recommendationController.getTrending)
);

// 감정 기반 추천
router.post(
  "/emotion",
  authMiddleware,
  validators.emotionRecommendation,
  validate,
  asyncHandler(recommendationController.getEmotionBased)
);

// 하이브리드 추천 (Premium 이상)
router.get(
  "/hybrid",
  authMiddleware,
  requireTier("premium"),
  asyncHandler(recommendationController.getHybrid)
);

// 추천 피드백
router.post(
  "/feedback",
  authMiddleware,
  [
    body("recommendationId").isUUID(),
    body("videoId").custom(customValidators.isYouTubeVideoId),
    body("action").isIn(["click", "watch", "complete", "like", "dislike"]),
    body("watchDuration").optional().isInt({ min: 0 }),
    validate,
  ],
  asyncHandler(recommendationController.submitFeedback)
);

// A/B 테스트 추천
router.get(
  "/experiment/:experimentId",
  authMiddleware,
  [param("experimentId").isString(), validate],
  asyncHandler(recommendationController.getExperimental)
);

export default router;
```

---

## 5. 실제 구현 예시

### 5.1 Express 앱 설정

```typescript
// app.ts
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import {
  requestLogger,
  errorLogger,
  performanceLogger,
} from "./middleware/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import routes from "./routes";

export const createApp = (): Application => {
  const app = express();

  // 기본 미들웨어
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    })
  );

  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    })
  );

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // 요청 로깅
  app.use(requestLogger);
  app.use(performanceLogger);

  // API 라우트
  app.use("/api/v1", routes);

  // 404 핸들러
  app.use(notFoundHandler);

  // 에러 핸들링
  app.use(errorLogger);
  app.use(errorHandler);

  return app;
};
```

### 5.2 서버 시작

```typescript
// server.ts
import { createApp } from "./app";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "ioredis";
import { logger } from "./middleware/logger";

// 환경 변수 로드
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = createApp();

// 데이터베이스 연결 확인
const checkDatabaseConnection = async () => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { error } = await supabase
      .from("user_profiles")
      .select("count")
      .single();
    if (error && error.code !== "PGRST116") throw error;

    logger.info("Database connection established");
  } catch (error) {
    logger.error("Database connection failed", error);
    process.exit(1);
  }
};

// Redis 연결 확인
const checkRedisConnection = async () => {
  try {
    const redis = new Redis(process.env.REDIS_URL!);
    await redis.ping();
    logger.info("Redis connection established");
  } catch (error) {
    logger.error("Redis connection failed", error);
    // Redis는 선택적이므로 종료하지 않음
  }
};

// 서버 시작
const startServer = async () => {
  try {
    // 연결 확인
    await checkDatabaseConnection();
    await checkRedisConnection();

    // 서버 시작
    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info("Received shutdown signal");

      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });

      // 강제 종료 타이머
      setTimeout(() => {
        logger.error("Forced shutdown");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
```

### 5.3 컨트롤러 예시

```typescript
// controllers/video.controller.ts
import { Request, Response } from "express";
import { VideoService } from "../services/VideoService";
import { ResponseBuilder } from "../utils/response";
import { HttpStatus } from "../utils/httpStatus";
import { ApiError } from "../middleware/errorHandler";

class VideoController {
  private videoService: VideoService;

  constructor() {
    this.videoService = new VideoService({
      supabase: createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      ),
    });
  }

  /**
   * 영상 목록 조회
   */
  async getVideos(req: Request, res: Response) {
    const { page = 1, limit = 20, category, quality } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // 쿼리 빌드
    let query = req
      .supabase!.from("videos")
      .select("*, video_classifications(*)", { count: "exact" })
      .eq("is_playable", true)
      .order("quality_score", { ascending: false });

    // 필터 적용
    if (category) {
      query = query.eq("video_classifications.primary_category", category);
    }

    if (quality) {
      query = query.gte("quality_score", Number(quality));
    }

    // 페이지네이션
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json(
      ResponseBuilder.paginated(
        data || [],
        Number(page),
        Number(limit),
        count || 0
      )
    );
  }

  /**
   * 영상 검색
   */
  async searchVideos(req: Request, res: Response) {
    const { query: searchQuery, type = "keyword" } = req.body;

    // 검색 세션 기록
    await req.supabase!.from("search_sessions").insert({
      user_id: req.user?.id,
      session_id: req.headers["x-session-id"],
      search_query: searchQuery,
      search_type: type,
      keywords_used: [searchQuery],
      user_agent: req.headers["user-agent"],
    });

    // YouTube 검색 및 저장
    const result = await this.videoService.searchAndSaveVideos(searchQuery, 20);

    if (result.error) {
      throw new ApiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        result.error.code,
        result.error.message
      );
    }

    res.json(ResponseBuilder.success(result.data));
  }

  /**
   * AI 검색
   */
  async aiSearch(req: Request, res: Response) {
    const { query, emotion } = req.body;

    // AI 검색 쿼터 확인
    const { data: profile } = await req
      .supabase!.from("user_profiles")
      .select("ai_searches_used, ai_searches_limit")
      .eq("user_id", req.user!.id)
      .single();

    if (profile && profile.ai_searches_used >= profile.ai_searches_limit) {
      throw new ApiError(
        HttpStatus.TOO_MANY_REQUESTS,
        "AI_QUOTA_EXCEEDED",
        "AI 검색 한도를 초과했습니다."
      );
    }

    // Claude API를 사용한 쿼리 분석
    // ... AI 검색 로직 구현 ...

    // 사용량 업데이트
    await req
      .supabase!.from("user_profiles")
      .update({ ai_searches_used: profile!.ai_searches_used + 1 })
      .eq("user_id", req.user!.id);

    res.json(
      ResponseBuilder.success({
        message: "AI 검색 구현 예정",
      })
    );
  }

  /**
   * 영상 상세 정보
   */
  async getVideoDetail(req: Request, res: Response) {
    const { id } = req.params;

    const { data, error } = await req
      .supabase!.from("videos")
      .select(
        `
        *,
        video_classifications(*),
        channel_profiles(*)
      `
      )
      .eq("video_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ApiError(
          HttpStatus.NOT_FOUND,
          "VIDEO_NOT_FOUND",
          "영상을 찾을 수 없습니다."
        );
      }
      throw error;
    }

    // 접근 카운트 증가
    await req
      .supabase!.from("videos")
      .update({
        access_count: data.access_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("video_id", id);

    res.json(ResponseBuilder.success(data));
  }

  /**
   * 상호작용 기록
   */
  async recordInteraction(req: Request, res: Response) {
    const { id } = req.params;
    const { type, watchDuration, emotion } = req.body;

    // UserService를 통한 상호작용 기록
    const userService = new UserService({
      supabase: req.supabase!,
    });

    const result = await userService.recordVideoInteraction({
      user_id: req.user!.id,
      video_id: id,
      interaction_type: type,
      watch_duration: watchDuration,
      user_emotion: emotion,
      search_keyword: req.headers["x-search-keyword"] as string,
      device_type: this.detectDeviceType(req),
      session_id: req.headers["x-session-id"] as string,
    });

    if (result.error) {
      throw new ApiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        result.error.code,
        result.error.message
      );
    }

    res.status(HttpStatus.CREATED).json(
      ResponseBuilder.success({
        message: "상호작용이 기록되었습니다.",
      })
    );
  }

  /**
   * 유사 영상 추천
   */
  async getSimilarVideos(req: Request, res: Response) {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    const { data, error } = await req.supabase!.rpc("get_similar_videos", {
      p_video_id: id,
      p_limit: Number(limit),
    });

    if (error) throw error;

    res.json(ResponseBuilder.success(data));
  }

  /**
   * 디바이스 타입 감지
   */
  private detectDeviceType(req: Request): string {
    const userAgent = req.headers["user-agent"]?.toLowerCase() || "";

    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return "mobile";
    } else if (/tablet|ipad/i.test(userAgent)) {
      return "tablet";
    }

    return "desktop";
  }
}

export const videoController = new VideoController();
```

---

## 6. API 문서화

### 6.1 OpenAPI/Swagger 정의

```yaml
# docs/swagger.yaml
openapi: 3.0.0
info:
  title: Momentum API
  description: YouTube Shorts AI 큐레이션 서비스 API
  version: 1.0.0
  contact:
    name: Wave Team
    email: support@momentum.app

servers:
  - url: https://api.momentum.app/v1
    description: Production server
  - url: http://localhost:3000/api/v1
    description: Development server

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

    apiKey:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    Error:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              example: "VALIDATION_ERROR"
            message:
              type: string
              example: "입력값이 올바르지 않습니다."
            details:
              type: object
        timestamp:
          type: string
          format: date-time

    Video:
      type: object
      properties:
        video_id:
          type: string
          example: "dQw4w9WgXcQ"
        title:
          type: string
          example: "초간단 김치볶음밥 레시피"
        channel_title:
          type: string
          example: "쿠킹하루"
        thumbnail_url:
          type: string
          format: uri
        duration:
          type: integer
          example: 58
        view_count:
          type: integer
          example: 1250000
        quality_score:
          type: number
          format: float
          example: 0.85

    VideoClassification:
      type: object
      properties:
        primary_category:
          type: string
          example: "요리/음식"
        emotion_tags:
          type: array
          items:
            type: string
          example: ["happy", "satisfied"]
        content_type:
          type: string
          example: "cooking_tutorial"
        target_audience:
          type: string
          example: "all"
        mood_keywords:
          type: array
          items:
            type: string
          example: ["실용적인", "간단한"]

    PaginationMeta:
      type: object
      properties:
        page:
          type: integer
          example: 1
        limit:
          type: integer
          example: 20
        total:
          type: integer
          example: 100
        hasMore:
          type: boolean
          example: true

paths:
  /auth/signup:
    post:
      tags: [Authentication]
      summary: 회원가입
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                displayName:
                  type: string
                  minLength: 2
                  maxLength: 50
      responses:
        201:
          description: 회원가입 성공
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      user:
                        type: object
                      accessToken:
                        type: string
                      refreshToken:
                        type: string
        400:
          $ref: "#/components/responses/BadRequest"

  /videos:
    get:
      tags: [Videos]
      summary: 영상 목록 조회
      security:
        - bearerAuth: []
        - {}
      parameters:
        - in: query
          name: page
          schema:
            type: integer
            minimum: 1
            default: 1
        - in: query
          name: limit
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - in: query
          name: category
          schema:
            type: string
        - in: query
          name: quality
          schema:
            type: number
            format: float
            minimum: 0
            maximum: 1
      responses:
        200:
          description: 영상 목록
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Video"
                  meta:
                    $ref: "#/components/schemas/PaginationMeta"

  /videos/search:
    post:
      tags: [Videos]
      summary: 영상 검색
      security:
        - bearerAuth: []
        - {}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - query
              properties:
                query:
                  type: string
                  minLength: 2
                  maxLength: 100
                type:
                  type: string
                  enum: [keyword, ai_chat, trending, emotion]
                  default: keyword
      responses:
        200:
          description: 검색 결과
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Video"

  /recommendations:
    get:
      tags: [Recommendations]
      summary: 개인화 추천
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: limit
          schema:
            type: integer
            default: 20
      responses:
        200:
          description: 추천 영상 목록
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      videos:
                        type: array
                        items:
                          $ref: "#/components/schemas/Video"
                      algorithm:
                        type: string
                        example: "collaborative_filtering_v2"
                      confidence:
                        type: number
                        format: float
                        example: 0.85
```

### 6.2 Swagger UI 설정

```typescript
// middleware/swagger.ts
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";

const swaggerDocument = YAML.load(path.join(__dirname, "../docs/swagger.yaml"));

export const swaggerMiddleware = [
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Momentum API Documentation",
    customfavIcon: "/favicon.ico",
  }),
];

// app.ts에 추가
app.use("/api-docs", swaggerMiddleware);
```

### 6.3 API 사용 예시

```typescript
// examples/api-usage.ts

// 1. 인증
const login = async () => {
  const response = await fetch("https://api.momentum.app/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "user@example.com",
      password: "password123",
    }),
  });

  const data = await response.json();
  return data.data.accessToken;
};

// 2. 영상 검색
const searchVideos = async (token: string, query: string) => {
  const response = await fetch("https://api.momentum.app/v1/videos/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: query,
      type: "keyword",
    }),
  });

  return response.json();
};

// 3. 개인화 추천 받기
const getRecommendations = async (token: string) => {
  const response = await fetch("https://api.momentum.app/v1/recommendations", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};

// 4. 영상 상호작용 기록
const recordInteraction = async (
  token: string,
  videoId: string,
  type: string,
  duration?: number
) => {
  const response = await fetch(
    `https://api.momentum.app/v1/videos/${videoId}/interact`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: type,
        watchDuration: duration,
      }),
    }
  );

  return response.json();
};

// 5. 감정 기반 추천
const getEmotionRecommendations = async (token: string, emotion: string) => {
  const response = await fetch(
    "https://api.momentum.app/v1/recommendations/emotion",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        emotion: emotion,
        intensity: "medium",
      }),
    }
  );

  return response.json();
};

// 사용 예시
const main = async () => {
  try {
    // 로그인
    const token = await login();
    console.log("Logged in successfully");

    // 검색
    const searchResults = await searchVideos(token, "요리");
    console.log(`Found ${searchResults.data.length} videos`);

    // 추천 받기
    const recommendations = await getRecommendations(token);
    console.log(`Got ${recommendations.data.videos.length} recommendations`);

    // 영상 시청 기록
    if (recommendations.data.videos.length > 0) {
      const video = recommendations.data.videos[0];
      await recordInteraction(token, video.video_id, "view", 45);
      console.log("Interaction recorded");
    }

    // 감정 기반 추천
    const emotionRecs = await getEmotionRecommendations(token, "happy");
    console.log(`Got ${emotionRecs.data.videos.length} happy videos`);
  } catch (error) {
    console.error("API usage error:", error);
  }
};

main();
```

### 6.4 Postman Collection

```json
{
  "info": {
    "name": "Momentum API",
    "description": "YouTube Shorts AI 큐레이션 서비스 API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{access_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://api.momentum.app/v1"
    },
    {
      "key": "access_token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "const response = pm.response.json();",
                  "if (response.success) {",
                  "    pm.environment.set('access_token', response.data.accessToken);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n    \"email\": \"user@example.com\",\n    \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/auth/login",
              "host": ["{{base_url}}"],
              "path": ["auth", "login"]
            }
          }
        }
      ]
    },
    {
      "name": "Videos",
      "item": [
        {
          "name": "Search Videos",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n    \"query\": \"요리\",\n    \"type\": \"keyword\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/videos/search",
              "host": ["{{base_url}}"],
              "path": ["videos", "search"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## 📌 완료 사항

### ✅ Part 6 구현 완료

1. **API 아키텍처**

   - RESTful API 설계
   - 프로젝트 구조 정의
   - 환경 설정

2. **미들웨어 구현**

   - 인증/인가 (JWT + Supabase)
   - Rate Limiting (Redis 기반)
   - 입력 검증 (express-validator)
   - 에러 처리
   - 로깅 (Winston)

3. **API 라우터**

   - 인증 라우터
   - 영상 라우터
   - 추천 라우터
   - 트렌드 라우터

4. **실제 구현 예시**

   - Express 앱 설정
   - 서버 시작 로직
   - 컨트롤러 구현

5. **API 문서화**
   - OpenAPI/Swagger 정의
   - 사용 예시 코드
   - Postman Collection

## 📌 다음 단계

**Part 7: 배포/모니터링/보안/트러블슈팅/FAQ**에서는:

1. **배포 전략**

   - Docker 컨테이너화
   - CI/CD 파이프라인
   - 환경별 설정

2. **모니터링**

   - 로그 수집
   - 메트릭 모니터링
   - 알림 설정

3. **보안**

   - 보안 모범 사례
   - 취약점 대응
   - 데이터 보호

4. **트러블슈팅**

   - 일반적인 문제 해결
   - 성능 최적화
   - 디버깅 가이드

5. **FAQ**
   - 자주 묻는 질문
   - 베스트 프랙티스

을 다룰 예정입니다.
