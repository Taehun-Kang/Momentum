# 🚀 Momentum YouTube AI 큐레이션 서비스 - 최종 구현 가이드

## Part 3: 데이터베이스 스키마 - 트렌드/추천/시스템 도메인

> **Version**: 4.0 FINAL  
> **Last Updated**: 2025-01-13  
> **Dependencies**: Part 1, Part 2

---

## 📋 목차

1. [트렌드 도메인 스키마](#1-트렌드-도메인-스키마)
2. [추천 도메인 스키마](#2-추천-도메인-스키마)
3. [시스템 도메인 스키마](#3-시스템-도메인-스키마)
4. [도메인 간 관계 및 통합](#4-도메인-간-관계-및-통합)

---

## 1. 트렌드 도메인 스키마

### 1.1 trend_keywords 테이블

```sql
-- ============================================
-- 트렌드 키워드 테이블
-- Google Trends + 뉴스 기반 실시간 트렌드
-- ============================================
CREATE TABLE IF NOT EXISTS trend_keywords (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 키워드 정보
  keyword VARCHAR(255) NOT NULL,
  refined_keyword VARCHAR(255), -- 뉴스 분석으로 정제된 키워드
  original_keyword VARCHAR(255), -- 원본 키워드 (변환 전)

  -- 카테고리 및 분류
  category VARCHAR(100), -- '엔터테인먼트', '스포츠', '정치', '기술' 등
  subcategory VARCHAR(100), -- 세부 카테고리
  category_confidence DECIMAL(3,2) DEFAULT 0.50,

  -- 트렌드 점수 및 지표
  trend_score DECIMAL(5,2) DEFAULT 0.0 CHECK (trend_score >= 0), -- Google Trends 점수
  normalized_score DECIMAL(3,2) DEFAULT 0.0, -- 0-1로 정규화된 점수
  search_volume INTEGER DEFAULT 0, -- 예상 검색량
  search_volume_change INTEGER, -- 검색량 변화 (전일 대비)
  growth_rate DECIMAL(5,2) DEFAULT 0.0, -- 성장률 (%)

  -- 트렌드 속성
  trend_type VARCHAR(50) DEFAULT 'organic' CHECK (
    trend_type IN ('organic', 'seasonal', 'event', 'viral', 'news')
  ),
  trend_momentum VARCHAR(20) DEFAULT 'stable' CHECK (
    trend_momentum IN ('explosive', 'rising', 'stable', 'declining', 'fading')
  ),

  -- 데이터 소스 정보
  data_source VARCHAR(50) NOT NULL CHECK (
    data_source IN ('google_trends', 'news_api', 'social_media', 'manual', 'combined')
  ),
  source_metadata JSONB DEFAULT '{}', -- 소스별 추가 정보
  region_code VARCHAR(5) DEFAULT 'KR',
  language_code VARCHAR(5) DEFAULT 'ko',

  -- 연관 정보
  related_keywords TEXT[] DEFAULT '{}', -- 관련 키워드들
  related_topics TEXT[] DEFAULT '{}', -- 관련 주제들
  related_news_count INTEGER DEFAULT 0, -- 관련 뉴스 개수
  context_keywords TEXT[] DEFAULT '{}', -- 맥락 키워드 (뉴스에서 추출)

  -- 뉴스 분석 정보
  news_headlines TEXT[] DEFAULT '{}', -- 주요 뉴스 헤드라인
  news_sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral', 'mixed'
  news_impact_score DECIMAL(3,2) DEFAULT 0.0, -- 뉴스 영향력 점수

  -- 시간 정보
  detected_at TIMESTAMPTZ DEFAULT NOW(), -- 트렌드 감지 시각
  peak_time TIMESTAMPTZ, -- 피크 시간
  expected_duration INTERVAL, -- 예상 지속 시간

  -- 생명 주기 관리
  is_active BOOLEAN DEFAULT true,
  activation_count INTEGER DEFAULT 1, -- 활성화된 횟수
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),

  -- 품질 및 신뢰도
  confidence_score DECIMAL(3,2) DEFAULT 0.50, -- 트렌드 신뢰도
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (
    verification_status IN ('pending', 'verified', 'rejected', 'expired')
  ),

  -- 추천 관련
  recommendation_priority INTEGER DEFAULT 5 CHECK (recommendation_priority BETWEEN 1 AND 10),
  target_demographics JSONB DEFAULT '{}', -- 타겟 인구통계

  -- 메타데이터
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_trend_keywords_keyword ON trend_keywords(keyword);
CREATE INDEX idx_trend_keywords_refined ON trend_keywords(refined_keyword) WHERE refined_keyword IS NOT NULL;
CREATE INDEX idx_trend_keywords_active ON trend_keywords(is_active) WHERE is_active = true;
CREATE INDEX idx_trend_keywords_score ON trend_keywords(trend_score DESC);
CREATE INDEX idx_trend_keywords_expires ON trend_keywords(expires_at);
CREATE INDEX idx_trend_keywords_category ON trend_keywords(category);
CREATE INDEX idx_trend_keywords_type ON trend_keywords(trend_type);
CREATE INDEX idx_trend_keywords_momentum ON trend_keywords(trend_momentum);
CREATE INDEX idx_trend_keywords_created ON trend_keywords(created_at DESC);

-- 복합 인덱스
CREATE INDEX idx_trend_keywords_active_score
  ON trend_keywords(is_active, trend_score DESC)
  WHERE is_active = true;

CREATE INDEX idx_trend_keywords_active_priority
  ON trend_keywords(is_active, recommendation_priority DESC, trend_score DESC)
  WHERE is_active = true;

-- 트리거
CREATE TRIGGER update_trend_keywords_updated_at
  BEFORE UPDATE ON trend_keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 트렌드 점수 정규화 함수
CREATE OR REPLACE FUNCTION normalize_trend_score()
RETURNS TRIGGER AS $$
BEGIN
  -- 0-100 점수를 0-1로 정규화
  NEW.normalized_score := NEW.trend_score / 100.0;

  -- 모멘텀 자동 설정
  IF NEW.growth_rate > 100 THEN
    NEW.trend_momentum := 'explosive';
  ELSIF NEW.growth_rate > 50 THEN
    NEW.trend_momentum := 'rising';
  ELSIF NEW.growth_rate < -50 THEN
    NEW.trend_momentum := 'fading';
  ELSIF NEW.growth_rate < -20 THEN
    NEW.trend_momentum := 'declining';
  ELSE
    NEW.trend_momentum := 'stable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_trend_data
  BEFORE INSERT OR UPDATE ON trend_keywords
  FOR EACH ROW EXECUTE FUNCTION normalize_trend_score();
```

### 1.2 trend_video_mappings 테이블

```sql
-- ============================================
-- 트렌드-영상 매핑 테이블
-- 트렌드 키워드와 관련 영상 연결
-- ============================================
CREATE TABLE IF NOT EXISTS trend_video_mappings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계
  trend_keyword_id UUID REFERENCES trend_keywords(id) ON DELETE CASCADE,
  video_id VARCHAR(20) REFERENCES videos(video_id) ON DELETE CASCADE,

  -- 관련성 점수
  relevance_score DECIMAL(3,2) DEFAULT 0.50 CHECK (
    relevance_score >= 0 AND relevance_score <= 1
  ),
  confidence_score DECIMAL(3,2) DEFAULT 0.50,

  -- 순위 정보
  trend_rank INTEGER, -- 트렌드 내 순위
  collection_rank INTEGER, -- 수집 시 순위

  -- 채널 품질 검증 (4단계 필터링)
  channel_quality_passed BOOLEAN DEFAULT false,
  channel_quality_score DECIMAL(3,2),
  channel_subscriber_count INTEGER,
  channel_quality_grade VARCHAR(2),
  quality_check_details JSONB DEFAULT '{}',

  -- 수집 정보
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  collection_source VARCHAR(50) DEFAULT 'trend_service',
  collection_method VARCHAR(50), -- 'realtime', 'scheduled', 'manual'

  -- 성과 지표
  click_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  engagement_score DECIMAL(3,2) DEFAULT 0.0,

  -- 추천 관련
  recommended_count INTEGER DEFAULT 0,
  recommendation_success_rate DECIMAL(3,2),

  -- 상태
  is_active BOOLEAN DEFAULT true,
  deactivation_reason VARCHAR(100),

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  UNIQUE(trend_keyword_id, video_id)
);

-- 인덱스
CREATE INDEX idx_trend_video_mappings_trend ON trend_video_mappings(trend_keyword_id);
CREATE INDEX idx_trend_video_mappings_video ON trend_video_mappings(video_id);
CREATE INDEX idx_trend_video_mappings_relevance ON trend_video_mappings(relevance_score DESC);
CREATE INDEX idx_trend_video_mappings_quality ON trend_video_mappings(channel_quality_passed)
  WHERE channel_quality_passed = true;
CREATE INDEX idx_trend_video_mappings_active ON trend_video_mappings(is_active)
  WHERE is_active = true;

-- 복합 인덱스
CREATE INDEX idx_trend_video_mappings_trend_quality
  ON trend_video_mappings(trend_keyword_id, channel_quality_passed, relevance_score DESC)
  WHERE is_active = true;
```

---

## 2. 추천 도메인 스키마

### 2.1 emotion_keyword_preferences 테이블

```sql
-- ============================================
-- 감정별 키워드 선호도 테이블
-- 집단 데이터 기반 감정-키워드 매핑
-- ============================================
CREATE TABLE IF NOT EXISTS emotion_keyword_preferences (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 감정 분류
  emotion VARCHAR(50) NOT NULL CHECK (
    emotion IN (
      'happy',     -- 기쁨
      'sad',       -- 슬픔
      'excited',   -- 흥분
      'calm',      -- 차분함
      'stressed',  -- 스트레스
      'anxious',   -- 불안
      'angry',     -- 화남
      'bored',     -- 지루함
      'inspired',  -- 영감
      'nostalgic'  -- 향수
    )
  ),
  emotion_intensity VARCHAR(20) DEFAULT 'medium' CHECK (
    emotion_intensity IN ('low', 'medium', 'high')
  ),

  -- 선호 키워드 (집단 데이터)
  preferred_keywords TEXT[] NOT NULL,
  keyword_scores JSONB DEFAULT '{}', -- {"힐링": 0.9, "자연": 0.8}

  -- 통계 (집단 기반)
  total_selections INTEGER DEFAULT 0, -- 총 선택 횟수
  unique_users INTEGER DEFAULT 0, -- 유니크 사용자 수
  user_count INTEGER DEFAULT 0, -- 전체 사용자 수

  -- 성과 지표
  success_rate DECIMAL(3,2) DEFAULT 0.50, -- 추천 성공률
  avg_watch_duration INTEGER DEFAULT 0, -- 평균 시청 시간
  avg_completion_rate DECIMAL(3,2) DEFAULT 0.00,
  satisfaction_score DECIMAL(3,2) DEFAULT 0.50,

  -- 시간대별 선호도
  time_preferences JSONB DEFAULT '{}', -- {"morning": 0.8, "evening": 0.6}
  peak_hours INTEGER[] DEFAULT '{}', -- [20, 21, 22] (저녁 8-10시)

  -- 연령대별 선호도
  age_group_preferences JSONB DEFAULT '{}', -- {"teens": 0.7, "20s": 0.9}
  gender_preferences JSONB DEFAULT '{}', -- {"male": 0.6, "female": 0.8}

  -- 분석 정보
  analysis_date DATE DEFAULT CURRENT_DATE,
  analysis_period INTERVAL DEFAULT '30 days',
  data_source VARCHAR(50) DEFAULT 'user_behavior',
  sample_size INTEGER DEFAULT 0,

  -- 신뢰도 및 품질
  confidence_score DECIMAL(3,2) DEFAULT 0.50,
  data_quality VARCHAR(20) DEFAULT 'medium' CHECK (
    data_quality IN ('low', 'medium', 'high', 'verified')
  ),

  -- 추가 컨텍스트
  related_emotions TEXT[] DEFAULT '{}',
  opposite_emotions TEXT[] DEFAULT '{}',
  transition_keywords JSONB DEFAULT '{}', -- 감정 전환용 키워드

  -- 콘텐츠 유형 선호도
  preferred_content_types TEXT[] DEFAULT '{}', -- ['asmr', 'meditation', 'nature']
  avoided_content_types TEXT[] DEFAULT '{}',

  -- 메타데이터
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  UNIQUE(emotion, emotion_intensity)
);

-- 인덱스
CREATE INDEX idx_emotion_keyword_preferences_emotion ON emotion_keyword_preferences(emotion);
CREATE INDEX idx_emotion_keyword_preferences_intensity ON emotion_keyword_preferences(emotion_intensity);
CREATE INDEX idx_emotion_keyword_preferences_success ON emotion_keyword_preferences(success_rate DESC);
CREATE INDEX idx_emotion_keyword_preferences_confidence ON emotion_keyword_preferences(confidence_score DESC);

-- 복합 인덱스
CREATE INDEX idx_emotion_keyword_preferences_emotion_full
  ON emotion_keyword_preferences(emotion, emotion_intensity);

-- GIN 인덱스
CREATE INDEX idx_emotion_keyword_preferences_keywords
  ON emotion_keyword_preferences USING GIN(preferred_keywords);

-- 트리거
CREATE TRIGGER update_emotion_keyword_preferences_updated_at
  BEFORE UPDATE ON emotion_keyword_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 recommendation_logs 테이블

```sql
-- ============================================
-- 추천 로그 테이블
-- 모든 추천 활동 추적 및 분석
-- ============================================
CREATE TABLE IF NOT EXISTS recommendation_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 정보
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_tier VARCHAR(20),
  session_id VARCHAR(100),

  -- 추천 정보
  recommendation_type VARCHAR(50) NOT NULL CHECK (
    recommendation_type IN (
      'personalized',    -- 개인화 추천
      'trending',        -- 트렌드 기반
      'emotion_based',   -- 감정 기반
      'similar',         -- 유사 영상
      'collaborative',   -- 협업 필터링
      'hybrid'          -- 하이브리드
    )
  ),
  recommendation_algorithm VARCHAR(50), -- 사용된 알고리즘
  algorithm_version VARCHAR(20),

  -- 추천 컨텍스트
  recommendation_context JSONB DEFAULT '{}', -- 추천 시점의 컨텍스트
  input_parameters JSONB DEFAULT '{}', -- 입력 파라미터

  -- 추천 결과
  videos_recommended TEXT[] NOT NULL, -- 추천된 영상 ID 목록
  recommendation_scores JSONB DEFAULT '{}', -- {"video_id": score}
  recommendation_reasons JSONB DEFAULT '{}', -- {"video_id": "reason"}

  -- 사용자 반응
  videos_clicked TEXT[] DEFAULT '{}', -- 클릭한 영상
  videos_watched TEXT[] DEFAULT '{}', -- 시청한 영상
  videos_completed TEXT[] DEFAULT '{}', -- 완주한 영상
  videos_liked TEXT[] DEFAULT '{}', -- 좋아요한 영상
  videos_disliked TEXT[] DEFAULT '{}', -- 싫어요한 영상

  -- 성과 지표
  click_through_rate DECIMAL(3,2) GENERATED ALWAYS AS (
    CASE WHEN array_length(videos_recommended, 1) > 0
    THEN CAST(array_length(videos_clicked, 1) AS DECIMAL) / array_length(videos_recommended, 1)
    ELSE 0 END
  ) STORED,
  watch_rate DECIMAL(3,2) GENERATED ALWAYS AS (
    CASE WHEN array_length(videos_clicked, 1) > 0
    THEN CAST(array_length(videos_watched, 1) AS DECIMAL) / array_length(videos_clicked, 1)
    ELSE 0 END
  ) STORED,
  completion_rate DECIMAL(3,2) GENERATED ALWAYS AS (
    CASE WHEN array_length(videos_watched, 1) > 0
    THEN CAST(array_length(videos_completed, 1) AS DECIMAL) / array_length(videos_watched, 1)
    ELSE 0 END
  ) STORED,

  -- 추가 메트릭
  average_watch_time INTEGER, -- 평균 시청 시간
  total_watch_time INTEGER, -- 총 시청 시간
  engagement_score DECIMAL(3,2), -- 종합 참여도 점수
  diversity_score DECIMAL(3,2), -- 추천 다양성 점수
  novelty_score DECIMAL(3,2), -- 새로움 점수

  -- 피드백
  user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
  feedback_text TEXT,
  feedback_tags TEXT[] DEFAULT '{}',

  -- A/B 테스트
  experiment_id VARCHAR(50),
  experiment_group VARCHAR(20), -- 'control', 'variant_a', 'variant_b'

  -- 성능 정보
  processing_time INTEGER, -- 밀리초
  cache_hit BOOLEAN DEFAULT false,

  -- 디바이스 정보
  device_type VARCHAR(20),
  platform VARCHAR(50),
  app_version VARCHAR(20),

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 인덱스 힌트
  CHECK (array_length(videos_recommended, 1) > 0)
);

-- 인덱스
CREATE INDEX idx_recommendation_logs_user ON recommendation_logs(user_id, created_at DESC);
CREATE INDEX idx_recommendation_logs_type ON recommendation_logs(recommendation_type);
CREATE INDEX idx_recommendation_logs_algorithm ON recommendation_logs(recommendation_algorithm);
CREATE INDEX idx_recommendation_logs_session ON recommendation_logs(session_id);
CREATE INDEX idx_recommendation_logs_created ON recommendation_logs(created_at DESC);
CREATE INDEX idx_recommendation_logs_experiment ON recommendation_logs(experiment_id)
  WHERE experiment_id IS NOT NULL;

-- 성과 인덱스
CREATE INDEX idx_recommendation_logs_ctr ON recommendation_logs(click_through_rate DESC);
CREATE INDEX idx_recommendation_logs_engagement ON recommendation_logs(engagement_score DESC)
  WHERE engagement_score IS NOT NULL;

-- 파티션 (월별)
ALTER TABLE recommendation_logs PARTITION BY RANGE (created_at);

CREATE TABLE recommendation_logs_2025_01 PARTITION OF recommendation_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

## 3. 시스템 도메인 스키마

### 3.1 search_sessions 테이블

```sql
-- ============================================
-- 검색 세션 테이블
-- 모든 검색 활동 추적
-- ============================================
CREATE TABLE IF NOT EXISTS search_sessions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 정보
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100) NOT NULL,

  -- 검색 정보
  search_query TEXT,
  search_type VARCHAR(20) DEFAULT 'keyword' CHECK (
    search_type IN ('keyword', 'ai_chat', 'trending', 'emotion', 'voice', 'image')
  ),

  -- 검색 파라미터
  keywords_used TEXT[] DEFAULT '{}',
  filters_applied JSONB DEFAULT '{}', -- 적용된 필터
  sort_order VARCHAR(50), -- 'relevance', 'date', 'viewCount'

  -- 검색 결과
  results_count INTEGER DEFAULT 0,
  results_returned INTEGER DEFAULT 0,
  results_clicked INTEGER DEFAULT 0,

  -- AI 처리 정보
  ai_enabled BOOLEAN DEFAULT false,
  ai_method VARCHAR(50), -- 'claude_api', 'pattern_matching', 'hybrid'
  ai_confidence DECIMAL(3,2),
  ai_processing_time INTEGER, -- 밀리초
  ai_tokens_used INTEGER,

  -- 검색 개선
  spell_corrected BOOLEAN DEFAULT false,
  original_query TEXT,
  suggested_keywords TEXT[] DEFAULT '{}',
  did_you_mean TEXT,

  -- 성능 메트릭
  response_time INTEGER, -- 전체 응답 시간 (밀리초)
  cache_hit BOOLEAN DEFAULT false,

  -- 검색 소스
  search_source VARCHAR(50) DEFAULT 'user_input', -- 'user_input', 'suggestion', 'autocomplete'
  referrer_url TEXT,

  -- 디바이스 정보
  user_agent TEXT,
  ip_address INET,
  geo_location JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',

  -- 결과 품질
  result_quality_score DECIMAL(3,2),
  user_satisfaction BOOLEAN,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_search_sessions_user ON search_sessions(user_id, created_at DESC);
CREATE INDEX idx_search_sessions_session ON search_sessions(session_id);
CREATE INDEX idx_search_sessions_type ON search_sessions(search_type);
CREATE INDEX idx_search_sessions_created ON search_sessions(created_at DESC);
CREATE INDEX idx_search_sessions_ai ON search_sessions(ai_enabled) WHERE ai_enabled = true;

-- 전문 검색 인덱스
CREATE INDEX idx_search_sessions_query ON search_sessions USING gin(to_tsvector('simple', search_query));

-- 파티션 (월별)
ALTER TABLE search_sessions PARTITION BY RANGE (created_at);

CREATE TABLE search_sessions_2025_01 PARTITION OF search_sessions
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 3.2 api_usage_logs 테이블

```sql
-- ============================================
-- API 사용량 로그 테이블
-- 외부 API 사용량 추적 및 비용 관리
-- ============================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- API 정보
  api_name VARCHAR(50) NOT NULL CHECK (
    api_name IN ('youtube', 'claude', 'google_trends', 'news_api', 'translate')
  ),
  api_version VARCHAR(20),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) DEFAULT 'GET',

  -- 사용량 정보
  units_consumed INTEGER DEFAULT 0,
  quota_category VARCHAR(50), -- 'search', 'video_details', 'classification'
  quota_multiplier DECIMAL(3,1) DEFAULT 1.0,

  -- 비용 정보
  cost_per_unit DECIMAL(10,6),
  total_cost DECIMAL(10,4) GENERATED ALWAYS AS (
    units_consumed * COALESCE(cost_per_unit, 0)
  ) STORED,
  currency VARCHAR(3) DEFAULT 'USD',

  -- 요청/응답 정보
  request_params JSONB DEFAULT '{}',
  request_headers JSONB DEFAULT '{}',
  response_status INTEGER,
  response_headers JSONB DEFAULT '{}',
  response_size INTEGER, -- bytes

  -- 성능 정보
  response_time INTEGER, -- 밀리초
  timeout_occurred BOOLEAN DEFAULT false,
  retry_count INTEGER DEFAULT 0,

  -- 에러 정보
  error_occurred BOOLEAN DEFAULT false,
  error_code VARCHAR(50),
  error_message TEXT,
  error_details JSONB DEFAULT '{}',

  -- 컨텍스트
  user_id UUID,
  session_id VARCHAR(100),
  request_purpose VARCHAR(100), -- 'daily_update', 'real_time_search', 'trend_analysis'

  -- 할당량 관리
  daily_quota_before INTEGER,
  daily_quota_after INTEGER,
  quota_reset_time TIMESTAMPTZ,

  -- 메타데이터
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_api_usage_logs_api ON api_usage_logs(api_name, created_at DESC);
CREATE INDEX idx_api_usage_logs_category ON api_usage_logs(quota_category);
CREATE INDEX idx_api_usage_logs_created ON api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_logs_error ON api_usage_logs(error_occurred) WHERE error_occurred = true;
CREATE INDEX idx_api_usage_logs_cost ON api_usage_logs(total_cost DESC);

-- 파티션 (월별)
ALTER TABLE api_usage_logs PARTITION BY RANGE (created_at);

CREATE TABLE api_usage_logs_2025_01 PARTITION OF api_usage_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 3.3 scheduled_tasks 테이블

```sql
-- ============================================
-- 스케줄 작업 테이블
-- 정기 작업 관리 및 실행 추적
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 작업 정보
  task_name VARCHAR(100) UNIQUE NOT NULL,
  task_type VARCHAR(50) NOT NULL CHECK (
    task_type IN (
      'keyword_update',     -- 키워드 업데이트
      'trend_update',       -- 트렌드 수집
      'quality_check',      -- 품질 검사
      'cleanup',           -- 데이터 정리
      'analytics',         -- 분석 작업
      'notification',      -- 알림 발송
      'backup'            -- 백업
    )
  ),
  description TEXT,

  -- 스케줄 정보
  cron_expression VARCHAR(100) NOT NULL, -- '0 2 * * *' (매일 새벽 2시)
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',

  -- 실행 제어
  is_active BOOLEAN DEFAULT true,
  is_running BOOLEAN DEFAULT false,
  max_execution_time INTERVAL DEFAULT '1 hour',

  -- 실행 정보
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20) CHECK (
    last_run_status IN ('success', 'failure', 'partial', 'timeout', 'skipped')
  ),
  last_run_duration INTEGER, -- 초
  last_run_error TEXT,
  last_run_result JSONB DEFAULT '{}',

  -- 다음 실행
  next_run_at TIMESTAMPTZ,

  -- 실행 통계
  run_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  average_duration INTEGER, -- 평균 실행 시간 (초)

  -- 재시도 정책
  retry_policy JSONB DEFAULT '{
    "max_retries": 3,
    "retry_delay": 60,
    "backoff_multiplier": 2
  }'::jsonb,

  -- 알림 설정
  notify_on_failure BOOLEAN DEFAULT true,
  notify_on_success BOOLEAN DEFAULT false,
  notification_emails TEXT[] DEFAULT '{}',

  -- 작업 설정
  config JSONB DEFAULT '{}',

  -- 의존성
  depends_on TEXT[] DEFAULT '{}', -- 다른 task_name 목록

  -- 메타데이터
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_scheduled_tasks_active ON scheduled_tasks(is_active) WHERE is_active = true;
CREATE INDEX idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at) WHERE is_active = true;
CREATE INDEX idx_scheduled_tasks_type ON scheduled_tasks(task_type);
CREATE INDEX idx_scheduled_tasks_running ON scheduled_tasks(is_running) WHERE is_running = true;

-- 트리거
CREATE TRIGGER update_scheduled_tasks_updated_at
  BEFORE UPDATE ON scheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 다음 실행 시간 계산 함수
CREATE OR REPLACE FUNCTION calculate_next_run_at(
  p_cron_expression VARCHAR,
  p_timezone VARCHAR DEFAULT 'Asia/Seoul'
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- 실제 구현은 cron 라이브러리 사용
  -- 여기서는 간단한 예시
  RETURN NOW() + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
```

### 3.4 system_notifications 테이블

```sql
-- ============================================
-- 시스템 알림 테이블
-- 사용자 및 관리자 알림 관리
-- ============================================
CREATE TABLE IF NOT EXISTS system_notifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 대상
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false, -- 전체 공지

  -- 알림 정보
  notification_type VARCHAR(50) NOT NULL CHECK (
    notification_type IN (
      'info',           -- 정보
      'warning',        -- 경고
      'error',          -- 오류
      'success',        -- 성공
      'promotion',      -- 프로모션
      'update',         -- 업데이트
      'maintenance',    -- 점검
      'trend_alert',    -- 트렌드 알림
      'recommendation'  -- 추천
    )
  ),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  ),

  -- 내용
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  detail_message TEXT,

  -- 액션
  action_type VARCHAR(50), -- 'link', 'button', 'dismiss'
  action_url TEXT,
  action_label VARCHAR(100),

  -- 미디어
  icon_url TEXT,
  image_url TEXT,

  -- 표시 설정
  display_type VARCHAR(20) DEFAULT 'toast' CHECK (
    display_type IN ('toast', 'modal', 'banner', 'push')
  ),
  position VARCHAR(20) DEFAULT 'top-right',
  duration INTEGER, -- 표시 시간 (초)

  -- 스케줄
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- 상태
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  is_clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,

  -- 타겟팅
  target_user_tier VARCHAR(20),
  target_segments TEXT[] DEFAULT '{}',
  target_conditions JSONB DEFAULT '{}',

  -- 추적
  sent_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  dismiss_count INTEGER DEFAULT 0,

  -- 메타데이터
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_system_notifications_user ON system_notifications(user_id, created_at DESC);
CREATE INDEX idx_system_notifications_unread ON system_notifications(user_id, is_read)
  WHERE is_read = false;
CREATE INDEX idx_system_notifications_global ON system_notifications(is_global)
  WHERE is_global = true;
CREATE INDEX idx_system_notifications_type ON system_notifications(notification_type);
CREATE INDEX idx_system_notifications_scheduled ON system_notifications(scheduled_at)
  WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_system_notifications_expires ON system_notifications(expires_at)
  WHERE expires_at IS NOT NULL;
```

### 3.5 analytics_events 테이블

```sql
-- ============================================
-- 분석 이벤트 테이블
-- 사용자 행동 및 시스템 이벤트 추적
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 정보
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),

  -- 이벤트 정보
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL CHECK (
    event_category IN (
      'user_action',     -- 사용자 액션
      'system_event',    -- 시스템 이벤트
      'api_call',        -- API 호출
      'error',           -- 에러
      'performance',     -- 성능
      'conversion',      -- 전환
      'engagement'       -- 참여도
    )
  ),
  event_action VARCHAR(50),
  event_label VARCHAR(200),
  event_value DECIMAL(10,2),

  -- 이벤트 속성
  event_properties JSONB DEFAULT '{}',

  -- 페이지 정보
  page_url TEXT,
  page_title VARCHAR(200),
  page_path VARCHAR(500),
  referrer_url TEXT,

  -- UTM 파라미터
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),

  -- 디바이스 정보
  device_type VARCHAR(20),
  device_brand VARCHAR(50),
  device_model VARCHAR(50),
  os_name VARCHAR(50),
  os_version VARCHAR(20),
  browser_name VARCHAR(50),
  browser_version VARCHAR(20),

  -- 지리 정보
  country_code VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),

  -- 앱 정보
  app_version VARCHAR(20),
  sdk_version VARCHAR(20),

  -- 성능 메트릭
  load_time INTEGER, -- 밀리초
  response_time INTEGER,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 인덱스
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);

-- 복합 인덱스
CREATE INDEX idx_analytics_events_user_category
  ON analytics_events(user_id, event_category, created_at DESC);

-- 파티션 생성 (월별)
CREATE TABLE analytics_events_2025_01 PARTITION OF analytics_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE analytics_events_2025_02 PARTITION OF analytics_events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- 자동 파티션 생성 함수
CREATE OR REPLACE FUNCTION create_monthly_partition_analytics()
RETURNS void AS $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
BEGIN
  start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
  end_date := start_date + interval '1 month';
  partition_name := 'analytics_events_' || to_char(start_date, 'YYYY_MM');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF analytics_events FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 4. 도메인 간 관계 및 통합

### 4.1 도메인 관계 맵

```sql
-- 도메인 간 주요 관계
/*
사용자 도메인 -> 영상 도메인:
  - user_video_interactions.video_id -> videos.video_id
  - user_keyword_preferences.keyword -> keyword_video_mappings.keyword

영상 도메인 -> 트렌드 도메인:
  - videos.video_id -> trend_video_mappings.video_id

트렌드 도메인 -> 추천 도메인:
  - trend_keywords.keyword -> recommendation_logs.context

추천 도메인 -> 시스템 도메인:
  - recommendation_logs.session_id -> search_sessions.session_id
  - recommendation_logs.user_id -> analytics_events.user_id
*/
```

### 4.2 통합 뷰

```sql
-- 사용자 활동 종합 뷰
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  up.user_id,
  up.display_name,
  up.user_tier,
  COUNT(DISTINCT ss.id) as total_searches,
  COUNT(DISTINCT uvi.video_id) as videos_watched,
  COUNT(DISTINCT ukp.keyword) as keywords_used,
  COUNT(DISTINCT rl.id) as recommendations_received,
  MAX(ss.created_at) as last_search_at,
  MAX(uvi.created_at) as last_video_at
FROM user_profiles up
LEFT JOIN search_sessions ss ON up.user_id = ss.user_id
LEFT JOIN user_video_interactions uvi ON up.user_id = uvi.user_id
LEFT JOIN user_keyword_preferences ukp ON up.user_id = ukp.user_id
LEFT JOIN recommendation_logs rl ON up.user_id = rl.user_id
GROUP BY up.user_id, up.display_name, up.user_tier;

-- 트렌드 영상 종합 뷰
CREATE OR REPLACE VIEW trending_videos_summary AS
SELECT
  v.video_id,
  v.title,
  v.channel_title,
  v.view_count,
  v.quality_score,
  tk.keyword as trend_keyword,
  tk.trend_score,
  tk.trend_momentum,
  tvm.relevance_score,
  tvm.channel_quality_grade
FROM videos v
JOIN trend_video_mappings tvm ON v.video_id = tvm.video_id
JOIN trend_keywords tk ON tvm.trend_keyword_id = tk.id
WHERE
  tk.is_active = true
  AND v.is_playable = true
  AND tvm.channel_quality_passed = true
ORDER BY tk.trend_score DESC, tvm.relevance_score DESC;
```

### 4.3 크로스 도메인 함수

```sql
-- 통합 추천 함수
CREATE OR REPLACE FUNCTION get_integrated_recommendations(
  p_user_id UUID,
  p_emotion VARCHAR(50) DEFAULT NULL,
  p_include_trending BOOLEAN DEFAULT true,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  video_id VARCHAR(20),
  title TEXT,
  channel_title VARCHAR(255),
  recommendation_type VARCHAR(50),
  score DECIMAL(3,2),
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH personalized AS (
    SELECT
      v.video_id,
      v.title,
      v.channel_title,
      'personalized' as recommendation_type,
      AVG(ukp.preference_score) as score,
      'Based on your preferences' as reason
    FROM videos v
    JOIN keyword_video_mappings kvm ON v.video_id = kvm.video_id
    JOIN user_keyword_preferences ukp ON kvm.keyword = ukp.keyword
    WHERE ukp.user_id = p_user_id
    GROUP BY v.video_id, v.title, v.channel_title
    ORDER BY score DESC
    LIMIT p_limit / 2
  ),
  emotion_based AS (
    SELECT
      v.video_id,
      v.title,
      v.channel_title,
      'emotion_based' as recommendation_type,
      0.8 as score,
      'Matches your mood' as reason
    FROM videos v
    JOIN video_classifications vc ON v.video_id = vc.video_id
    JOIN emotion_keyword_preferences ekp ON
      vc.mood_keywords && ekp.preferred_keywords
    WHERE
      ekp.emotion = p_emotion
      AND p_emotion IS NOT NULL
    LIMIT p_limit / 4
  ),
  trending AS (
    SELECT
      v.video_id,
      v.title,
      v.channel_title,
      'trending' as recommendation_type,
      tk.normalized_score as score,
      'Currently trending' as reason
    FROM videos v
    JOIN trend_video_mappings tvm ON v.video_id = tvm.video_id
    JOIN trend_keywords tk ON tvm.trend_keyword_id = tk.id
    WHERE
      tk.is_active = true
      AND p_include_trending = true
    ORDER BY tk.trend_score DESC
    LIMIT p_limit / 4
  )
  SELECT * FROM (
    SELECT * FROM personalized
    UNION ALL
    SELECT * FROM emotion_based
    UNION ALL
    SELECT * FROM trending
  ) combined
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## 📌 다음 단계

**Part 4: 인덱스 + RLS + 함수 + 초기 데이터**에서는:

1. **전체 인덱스 전략**

   - 성능 최적화 인덱스
   - 복합 인덱스 설계
   - 파티션 인덱스

2. **RLS (Row Level Security) 정책**

   - 테이블별 보안 정책
   - 역할 기반 접근 제어

3. **핵심 함수 구현**

   - 비즈니스 로직 함수
   - 유틸리티 함수
   - 트리거 함수

4. **초기 데이터 및 시드**
   - 기본 설정 데이터
   - 테스트 데이터
   - 감정-키워드 매핑

을 다룰 예정입니다.
