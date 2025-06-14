# 🚀 Momentum YouTube AI 큐레이션 서비스 - 최종 구현 가이드

## Part 2: 데이터베이스 스키마 - 사용자/영상 도메인

> **Version**: 4.0 FINAL  
> **Last Updated**: 2025-01-13  
> **Dependencies**: Part 1 (프로젝트 개요)

---

## 📋 목차

1. [Extensions 및 기본 설정](#1-extensions-및-기본-설정)
2. [사용자 도메인 스키마](#2-사용자-도메인-스키마)
3. [영상 도메인 스키마](#3-영상-도메인-스키마)
4. [실제 데이터 예시](#4-실제-데이터-예시)

---

## 1. Extensions 및 기본 설정

### 1.1 필수 Extensions

```sql
-- UUID 생성 지원
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 향후 벡터 검색을 위한 준비 (선택사항)
-- CREATE EXTENSION IF NOT EXISTS "pgvector";

-- 암호화 지원
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 전문 검색 지원 (한국어)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 1.2 기본 함수

```sql
-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 배열 중복 제거 함수
CREATE OR REPLACE FUNCTION array_unique(arr text[])
RETURNS text[] AS $$
BEGIN
  RETURN ARRAY(SELECT DISTINCT unnest(arr));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- JSON 병합 함수
CREATE OR REPLACE FUNCTION jsonb_merge(a jsonb, b jsonb)
RETURNS jsonb AS $$
BEGIN
  RETURN a || b;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## 2. 사용자 도메인 스키마

### 2.1 user_profiles 테이블

```sql
-- ============================================
-- 사용자 프로필 테이블
-- Supabase Auth와 1:1 매핑
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Supabase Auth 연결
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 기본 정보
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,

  -- 티어 시스템
  user_tier VARCHAR(20) DEFAULT 'free'
    CHECK (user_tier IN ('free', 'premium', 'pro', 'enterprise')),
  tier_expires_at TIMESTAMPTZ,

  -- 서비스 통계
  total_searches INTEGER DEFAULT 0,
  ai_searches_used INTEGER DEFAULT 0,
  ai_searches_limit INTEGER DEFAULT 10, -- 티어별 다름
  total_watch_time INTEGER DEFAULT 0, -- 총 시청 시간 (초)
  total_videos_watched INTEGER DEFAULT 0,

  -- 선호 설정 (JSONB for flexibility)
  preferences JSONB DEFAULT '{
    "language": "ko",
    "region": "KR",
    "notifications": {
      "push": true,
      "email": true,
      "sms": false
    },
    "display": {
      "theme": "light",
      "autoplay": true,
      "quality": "auto",
      "shorts_only": true
    },
    "privacy": {
      "history_enabled": true,
      "recommendations_enabled": true,
      "analytics_enabled": true
    }
  }'::jsonb,

  -- 추가 설정
  blocked_channels TEXT[] DEFAULT '{}',
  blocked_keywords TEXT[] DEFAULT '{}',
  favorite_categories TEXT[] DEFAULT '{}',

  -- 활동 추적
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  last_search_at TIMESTAMPTZ,
  last_video_watched_at TIMESTAMPTZ,

  -- 메타데이터
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_data JSONB DEFAULT '{}',
  referral_code VARCHAR(20),
  referred_by UUID REFERENCES user_profiles(id),

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  UNIQUE(user_id),
  UNIQUE(referral_code)
);

-- 인덱스
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_tier ON user_profiles(user_tier);
CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active_at DESC);
CREATE INDEX idx_user_profiles_referral ON user_profiles(referral_code) WHERE referral_code IS NOT NULL;

-- 트리거
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE user_profiles IS '사용자 프로필 정보';
COMMENT ON COLUMN user_profiles.user_tier IS '사용자 등급: free(무료), premium(프리미엄), pro(프로), enterprise(기업)';
COMMENT ON COLUMN user_profiles.preferences IS '사용자 설정 JSON (언어, 지역, 알림, 디스플레이, 프라이버시)';
```

### 2.2 user_keyword_preferences 테이블

```sql
-- ============================================
-- 사용자 키워드 선호도 테이블
-- 핵심: selection_count 기반 선호도 계산
-- ============================================
CREATE TABLE IF NOT EXISTS user_keyword_preferences (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 연결
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 키워드 정보
  keyword VARCHAR(255) NOT NULL,
  keyword_type VARCHAR(50) DEFAULT 'general'
    CHECK (keyword_type IN ('general', 'trend', 'custom', 'suggested')),

  -- 선호도 계산 핵심 데이터
  selection_count INTEGER DEFAULT 1, -- 선택 횟수 (가장 중요!)
  preference_score DECIMAL(3,2) DEFAULT 0.50 CHECK (preference_score >= 0 AND preference_score <= 1),

  -- 상호작용 통계
  total_watch_count INTEGER DEFAULT 0, -- 해당 키워드로 본 영상 수
  total_watch_time INTEGER DEFAULT 0, -- 총 시청 시간 (초)
  avg_watch_duration INTEGER GENERATED ALWAYS AS (
    CASE WHEN total_watch_count > 0
    THEN total_watch_time / total_watch_count
    ELSE 0 END
  ) STORED, -- 평균 시청 시간
  avg_completion_rate DECIMAL(3,2) DEFAULT 0.00,

  -- 감정 연관성
  associated_emotions TEXT[] DEFAULT '{}',
  emotion_scores JSONB DEFAULT '{}', -- {"happy": 0.8, "calm": 0.6}

  -- 피드백 데이터
  positive_interactions INTEGER DEFAULT 0, -- like, share, save
  negative_interactions INTEGER DEFAULT 0, -- dislike, skip
  interaction_score DECIMAL(3,2) GENERATED ALWAYS AS (
    CASE WHEN (positive_interactions + negative_interactions) > 0
    THEN CAST(positive_interactions AS DECIMAL) / (positive_interactions + negative_interactions)
    ELSE 0.5 END
  ) STORED,

  -- 시간 정보
  first_selected_at TIMESTAMPTZ DEFAULT NOW(),
  last_selected_at TIMESTAMPTZ DEFAULT NOW(),
  last_positive_at TIMESTAMPTZ,
  last_negative_at TIMESTAMPTZ,

  -- 추천 관련
  boost_factor DECIMAL(2,1) DEFAULT 1.0 CHECK (boost_factor >= 0.1 AND boost_factor <= 2.0),
  is_blocked BOOLEAN DEFAULT false,
  block_reason VARCHAR(100),

  -- 메타데이터
  source VARCHAR(50) DEFAULT 'user_selection', -- 'user_selection', 'ai_suggestion', 'trending'
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  UNIQUE(user_id, keyword),
  CHECK (selection_count >= 0),
  CHECK (total_watch_count >= 0),
  CHECK (total_watch_time >= 0)
);

-- 인덱스
CREATE INDEX idx_user_keyword_preferences_user_id ON user_keyword_preferences(user_id);
CREATE INDEX idx_user_keyword_preferences_keyword ON user_keyword_preferences(keyword);
CREATE INDEX idx_user_keyword_preferences_score ON user_keyword_preferences(preference_score DESC);
CREATE INDEX idx_user_keyword_preferences_selection ON user_keyword_preferences(selection_count DESC);
CREATE INDEX idx_user_keyword_preferences_type ON user_keyword_preferences(keyword_type);
CREATE INDEX idx_user_keyword_preferences_active ON user_keyword_preferences(is_blocked) WHERE is_blocked = false;

-- 복합 인덱스
CREATE INDEX idx_user_keyword_preferences_user_score
  ON user_keyword_preferences(user_id, preference_score DESC)
  WHERE is_blocked = false;

-- 트리거
CREATE TRIGGER update_user_keyword_preferences_updated_at
  BEFORE UPDATE ON user_keyword_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 선호도 점수 자동 계산 트리거
CREATE OR REPLACE FUNCTION update_preference_score()
RETURNS TRIGGER AS $$
DECLARE
  days_since_first INTEGER;
  base_score DECIMAL;
  time_decay DECIMAL;
  interaction_bonus DECIMAL;
BEGIN
  -- 첫 선택 이후 경과 일수
  days_since_first := EXTRACT(DAY FROM (NOW() - NEW.first_selected_at));

  -- 기본 점수 (선택 횟수 기반)
  base_score := LEAST(0.5, NEW.selection_count * 0.05);

  -- 시간 감쇠 (오래될수록 점수 감소)
  time_decay := 1.0 / (1.0 + days_since_first * 0.005);

  -- 상호작용 보너스
  interaction_bonus := NEW.interaction_score * 0.3;

  -- 최종 점수 계산
  NEW.preference_score := LEAST(1.0, GREATEST(0.1,
    (base_score + interaction_bonus) * time_decay * NEW.boost_factor
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_preference_score
  BEFORE INSERT OR UPDATE ON user_keyword_preferences
  FOR EACH ROW EXECUTE FUNCTION update_preference_score();
```

### 2.3 user_video_interactions 테이블

```sql
-- ============================================
-- 사용자 영상 상호작용 테이블
-- 모든 사용자-영상 상호작용 추적
-- ============================================
CREATE TABLE IF NOT EXISTS user_video_interactions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id VARCHAR(20) NOT NULL, -- YouTube video ID

  -- 상호작용 타입
  interaction_type VARCHAR(20) NOT NULL CHECK (
    interaction_type IN (
      'view',      -- 시청
      'like',      -- 좋아요
      'dislike',   -- 싫어요
      'share',     -- 공유
      'save',      -- 저장
      'skip',      -- 건너뛰기
      'report',    -- 신고
      'comment'    -- 댓글
    )
  ),

  -- 시청 정보 (view 타입일 때)
  watch_duration INTEGER, -- 시청 시간 (초)
  video_duration INTEGER, -- 영상 전체 길이 (초)
  completion_rate DECIMAL(3,2) GENERATED ALWAYS AS (
    CASE WHEN video_duration > 0 AND watch_duration IS NOT NULL
    THEN LEAST(1.0, CAST(watch_duration AS DECIMAL) / video_duration)
    ELSE NULL END
  ) STORED,

  -- 상호작용 상세
  interaction_value TEXT, -- like/dislike의 경우 null, share의 경우 플랫폼, comment의 경우 내용
  interaction_metadata JSONB DEFAULT '{}', -- 추가 메타데이터

  -- 컨텍스트 정보
  search_keyword VARCHAR(255), -- 검색 키워드
  recommendation_type VARCHAR(50), -- 'search', 'personalized', 'trending', 'emotion', 'similar'
  user_emotion VARCHAR(50), -- 사용자 감정 상태

  -- 세션 정보
  session_id VARCHAR(100),
  device_type VARCHAR(20) DEFAULT 'unknown' CHECK (
    device_type IN ('mobile', 'desktop', 'tablet', 'tv', 'unknown')
  ),
  device_info JSONB DEFAULT '{}',

  -- 품질 피드백
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  quality_feedback TEXT,
  feedback_tags TEXT[] DEFAULT '{}',

  -- 플랫폼 정보
  source_platform VARCHAR(50) DEFAULT 'web', -- 'web', 'ios', 'android'
  app_version VARCHAR(20),

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  CHECK (
    (interaction_type = 'view' AND watch_duration IS NOT NULL) OR
    (interaction_type != 'view')
  )
);

-- 인덱스
CREATE INDEX idx_user_video_interactions_user_id ON user_video_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_video_interactions_video_id ON user_video_interactions(video_id);
CREATE INDEX idx_user_video_interactions_type ON user_video_interactions(interaction_type);
CREATE INDEX idx_user_video_interactions_keyword ON user_video_interactions(search_keyword) WHERE search_keyword IS NOT NULL;
CREATE INDEX idx_user_video_interactions_emotion ON user_video_interactions(user_emotion) WHERE user_emotion IS NOT NULL;
CREATE INDEX idx_user_video_interactions_session ON user_video_interactions(session_id);

-- 파티션 (월별)
-- 대용량 데이터 대비
ALTER TABLE user_video_interactions PARTITION BY RANGE (created_at);

-- 첫 파티션 생성 예시
CREATE TABLE user_video_interactions_2025_01 PARTITION OF user_video_interactions
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

## 3. 영상 도메인 스키마

### 3.1 videos 테이블

```sql
-- ============================================
-- YouTube 영상 정보 테이블
-- search.list + videos.list 완전 통합
-- ============================================
CREATE TABLE IF NOT EXISTS videos (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- YouTube 식별자
  video_id VARCHAR(20) UNIQUE NOT NULL,

  -- 기본 정보 (snippet)
  title TEXT NOT NULL,
  description TEXT,
  channel_id VARCHAR(50) NOT NULL,
  channel_title VARCHAR(255),
  published_at TIMESTAMPTZ,

  -- 통계 (statistics)
  view_count BIGINT DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0, -- API에서 제공 중단되었지만 유지
  comment_count INTEGER DEFAULT 0,

  -- 컨텐츠 상세 (contentDetails)
  duration INTEGER NOT NULL, -- 초 단위
  definition VARCHAR(10) DEFAULT 'sd' CHECK (definition IN ('hd', 'sd', '4k', '8k')),
  caption BOOLEAN DEFAULT false,
  licensed_content BOOLEAN DEFAULT false,
  projection VARCHAR(20) DEFAULT 'rectangular',

  -- 상태 (status)
  upload_status VARCHAR(20) DEFAULT 'processed',
  privacy_status VARCHAR(20) DEFAULT 'public' CHECK (
    privacy_status IN ('public', 'unlisted', 'private')
  ),
  license VARCHAR(50) DEFAULT 'youtube',
  is_embeddable BOOLEAN DEFAULT true,
  is_playable BOOLEAN DEFAULT true, -- 한국에서 재생 가능 여부
  made_for_kids BOOLEAN DEFAULT false,

  -- 미디어 정보
  thumbnails JSONB DEFAULT '{}', -- 다양한 해상도 썸네일
  thumbnail_url TEXT GENERATED ALWAYS AS (
    thumbnails->>'maxres' ??
    thumbnails->>'high' ??
    thumbnails->>'medium' ??
    thumbnails->>'default'
  ) STORED, -- 최고 품질 썸네일

  -- 메타데이터
  tags TEXT[] DEFAULT '{}',
  category_id VARCHAR(10),
  category_name VARCHAR(100),
  default_language VARCHAR(10),
  default_audio_language VARCHAR(10),

  -- 지역 정보
  available_countries TEXT[] DEFAULT '{}',
  blocked_countries TEXT[] DEFAULT '{}',
  is_available_in_kr BOOLEAN GENERATED ALWAYS AS (
    CASE
      WHEN 'KR' = ANY(blocked_countries) THEN false
      WHEN array_length(available_countries, 1) > 0 AND NOT ('KR' = ANY(available_countries)) THEN false
      ELSE true
    END
  ) STORED,

  -- 품질 평가
  quality_score DECIMAL(3,2) DEFAULT 0.50 CHECK (quality_score >= 0 AND quality_score <= 1),
  engagement_rate DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN view_count > 0
    THEN CAST(like_count + comment_count AS DECIMAL) / view_count
    ELSE 0 END
  ) STORED,
  quality_grade VARCHAR(2) DEFAULT 'C' CHECK (
    quality_grade IN ('S', 'A', 'B', 'C', 'D', 'F')
  ),
  quality_factors JSONB DEFAULT '{}', -- 품질 평가 세부 요소

  -- 수집 정보
  search_keyword VARCHAR(255), -- 검색에 사용된 키워드
  search_rank INTEGER, -- 검색 결과 순위
  collected_by VARCHAR(50) DEFAULT 'daily_update', -- 'daily_update', 'trend_service', 'manual'
  collection_metadata JSONB DEFAULT '{}',

  -- 캐시 관리
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  cache_priority INTEGER DEFAULT 5, -- 1-10, 높을수록 우선순위 높음

  -- 추가 분석 데이터
  topics TEXT[] DEFAULT '{}', -- YouTube API의 topicDetails
  relevant_topic_ids TEXT[] DEFAULT '{}',
  has_custom_thumbnail BOOLEAN DEFAULT true,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  CHECK (duration > 0 AND duration <= 65), -- Shorts는 최대 60초 + 여유
  CHECK (view_count >= 0),
  CHECK (like_count >= 0),
  CHECK (comment_count >= 0)
);

-- 인덱스
CREATE INDEX idx_videos_video_id ON videos(video_id);
CREATE INDEX idx_videos_channel_id ON videos(channel_id);
CREATE INDEX idx_videos_search_keyword ON videos(search_keyword);
CREATE INDEX idx_videos_quality_score ON videos(quality_score DESC);
CREATE INDEX idx_videos_playable ON videos(is_playable) WHERE is_playable = true;
CREATE INDEX idx_videos_expires_at ON videos(expires_at);
CREATE INDEX idx_videos_duration_shorts ON videos(duration) WHERE duration <= 60;
CREATE INDEX idx_videos_published_at ON videos(published_at DESC);
CREATE INDEX idx_videos_view_count ON videos(view_count DESC);
CREATE INDEX idx_videos_available_kr ON videos(is_available_in_kr) WHERE is_available_in_kr = true;

-- 복합 인덱스
CREATE INDEX idx_videos_playable_quality
  ON videos(is_playable, quality_score DESC)
  WHERE is_playable = true AND is_available_in_kr = true;

CREATE INDEX idx_videos_keyword_quality
  ON videos(search_keyword, quality_score DESC)
  WHERE is_playable = true;

-- 전문 검색 인덱스
CREATE INDEX idx_videos_title_trgm ON videos USING gin(title gin_trgm_ops);

-- 트리거
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 접근 카운트 업데이트 트리거
CREATE OR REPLACE FUNCTION update_video_access()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE videos
  SET
    last_accessed_at = NOW(),
    access_count = access_count + 1
  WHERE video_id = NEW.video_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3.2 video_classifications 테이블

```sql
-- ============================================
-- LLM 영상 분류 결과 테이블
-- Claude API 5가지 핵심 분류 필드
-- ============================================
CREATE TABLE IF NOT EXISTS video_classifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 영상 연결
  video_id VARCHAR(20) REFERENCES videos(video_id) ON DELETE CASCADE,

  -- ⭐ LLM 분류 핵심 5가지 필드
  -- 1. 주요 카테고리
  primary_category VARCHAR(100) NOT NULL, -- '음악', '코미디', '교육', '게임' 등
  category_confidence DECIMAL(3,2) DEFAULT 0.50,

  -- 2. 감정 태그
  emotion_tags TEXT[] DEFAULT '{}' NOT NULL, -- ['happy', 'excited', 'calm', 'inspiring']
  emotion_scores JSONB DEFAULT '{}', -- {"happy": 0.8, "excited": 0.6}

  -- 3. 콘텐츠 유형
  content_type VARCHAR(50) NOT NULL, -- 'dance', 'cooking', 'vlog', 'tutorial', 'asmr'
  content_subtype VARCHAR(50), -- 더 구체적인 하위 유형

  -- 4. 타겟 연령대
  target_audience VARCHAR(50) NOT NULL, -- 'kids', 'teens', 'adults', 'all'
  age_range VARCHAR(20), -- '13-17', '18-24', '25-34' 등

  -- 5. 무드 키워드
  mood_keywords TEXT[] DEFAULT '{}' NOT NULL, -- ['신나는', '감동적인', '편안한', '재미있는']
  mood_intensity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'

  -- 분류 메타데이터
  classification_confidence DECIMAL(3,2) DEFAULT 0.50 CHECK (
    classification_confidence >= 0 AND classification_confidence <= 1
  ),
  classified_by VARCHAR(50) DEFAULT 'claude_api', -- 'claude_api', 'gpt4', 'fallback', 'manual'
  model_version VARCHAR(50), -- 'claude-3-sonnet-20240229'

  -- 프롬프트 정보
  classification_prompt TEXT, -- 사용된 프롬프트
  prompt_tokens INTEGER,
  completion_tokens INTEGER,

  -- 추가 분석 (선택적)
  topics TEXT[] DEFAULT '{}', -- 구체적인 주제들
  visual_elements TEXT[] DEFAULT '{}', -- ['밝은색상', '빠른전환', '텍스트오버레이']
  audio_features TEXT[] DEFAULT '{}', -- ['배경음악', '나레이션', 'ASMR소리']

  -- 언어 분석
  detected_language VARCHAR(10), -- 'ko', 'en', 'ja' 등
  has_subtitles BOOLEAN DEFAULT false,
  subtitle_languages TEXT[] DEFAULT '{}',

  -- 브랜드/상업성
  is_sponsored BOOLEAN DEFAULT false,
  brand_mentions TEXT[] DEFAULT '{}',
  commercial_intent VARCHAR(20), -- 'none', 'low', 'medium', 'high'

  -- 콘텐츠 적합성
  content_rating VARCHAR(20) DEFAULT 'G', -- 'G', 'PG', 'PG-13', 'R'
  sensitive_topics TEXT[] DEFAULT '{}',
  safety_score DECIMAL(3,2) DEFAULT 1.00,

  -- 폴백 데이터
  used_fallback BOOLEAN DEFAULT false,
  fallback_reason VARCHAR(100),
  fallback_tags TEXT[] DEFAULT '{}',

  -- Raw 응답 저장 (디버깅용)
  raw_response JSONB,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  UNIQUE(video_id)
);

-- 인덱스
CREATE INDEX idx_video_classifications_video_id ON video_classifications(video_id);
CREATE INDEX idx_video_classifications_category ON video_classifications(primary_category);
CREATE INDEX idx_video_classifications_content_type ON video_classifications(content_type);
CREATE INDEX idx_video_classifications_audience ON video_classifications(target_audience);
CREATE INDEX idx_video_classifications_confidence ON video_classifications(classification_confidence DESC);

-- GIN 인덱스 (배열 검색)
CREATE INDEX idx_video_classifications_emotion_tags ON video_classifications USING GIN(emotion_tags);
CREATE INDEX idx_video_classifications_mood_keywords ON video_classifications USING GIN(mood_keywords);
CREATE INDEX idx_video_classifications_topics ON video_classifications USING GIN(topics);

-- 트리거
CREATE TRIGGER update_video_classifications_updated_at
  BEFORE UPDATE ON video_classifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.3 keyword_video_mappings 테이블

```sql
-- ============================================
-- 키워드-영상 매핑 테이블
-- 키워드와 영상 간의 관계 및 관련성
-- ============================================
CREATE TABLE IF NOT EXISTS keyword_video_mappings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계
  keyword VARCHAR(255) NOT NULL,
  video_id VARCHAR(20) REFERENCES videos(video_id) ON DELETE CASCADE,

  -- 관련성 점수
  relevance_score DECIMAL(3,2) DEFAULT 0.50 CHECK (
    relevance_score >= 0 AND relevance_score <= 1
  ),

  -- 검색 정보
  search_rank INTEGER, -- 검색 결과에서의 순위
  search_page INTEGER DEFAULT 1, -- 검색 결과 페이지
  total_results INTEGER, -- 해당 키워드의 전체 결과 수

  -- 매핑 소스
  mapping_source VARCHAR(50) DEFAULT 'search', -- 'search', 'classification', 'manual', 'trending'

  -- 품질 지표
  click_through_rate DECIMAL(3,2),
  average_watch_time INTEGER,

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  UNIQUE(keyword, video_id)
);

-- 인덱스
CREATE INDEX idx_keyword_video_mappings_keyword ON keyword_video_mappings(keyword);
CREATE INDEX idx_keyword_video_mappings_video_id ON keyword_video_mappings(video_id);
CREATE INDEX idx_keyword_video_mappings_relevance ON keyword_video_mappings(keyword, relevance_score DESC);
CREATE INDEX idx_keyword_video_mappings_source ON keyword_video_mappings(mapping_source);

-- 복합 인덱스
CREATE INDEX idx_keyword_video_mappings_keyword_rank
  ON keyword_video_mappings(keyword, search_rank)
  WHERE search_rank IS NOT NULL;
```

### 3.4 channel_profiles 테이블

```sql
-- ============================================
-- YouTube 채널 프로필 테이블
-- 채널 품질 평가 및 필터링용
-- ============================================
CREATE TABLE IF NOT EXISTS channel_profiles (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- YouTube 식별자
  channel_id VARCHAR(50) UNIQUE NOT NULL,

  -- 기본 정보
  channel_title VARCHAR(255) NOT NULL,
  description TEXT,
  custom_url VARCHAR(100),
  country VARCHAR(2),

  -- 통계
  subscriber_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  view_count BIGINT DEFAULT 0,

  -- 채널 상태
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_video_at TIMESTAMPTZ,

  -- 품질 평가
  quality_score DECIMAL(3,2) DEFAULT 0.50 CHECK (quality_score >= 0 AND quality_score <= 1),
  quality_grade VARCHAR(2) DEFAULT 'C' CHECK (
    quality_grade IN ('S', 'A', 'B', 'C', 'D', 'F')
  ),
  content_consistency DECIMAL(3,2) DEFAULT 0.50, -- 콘텐츠 일관성
  upload_frequency DECIMAL(3,1), -- 월 평균 업로드 수

  -- 콘텐츠 분석
  primary_content_type VARCHAR(50), -- 주요 콘텐츠 유형
  content_categories TEXT[] DEFAULT '{}', -- 다루는 카테고리들
  average_video_quality DECIMAL(3,2),
  shorts_ratio DECIMAL(3,2), -- Shorts 비율

  -- 참여도 지표
  average_views_per_video BIGINT GENERATED ALWAYS AS (
    CASE WHEN video_count > 0
    THEN view_count / video_count
    ELSE 0 END
  ) STORED,
  engagement_rate DECIMAL(5,4),

  -- 채널 메타데이터
  channel_banner_url TEXT,
  channel_icon_url TEXT,
  channel_keywords TEXT[] DEFAULT '{}',
  featured_channels TEXT[] DEFAULT '{}',

  -- 필터링 정보
  is_blocked BOOLEAN DEFAULT false,
  block_reason VARCHAR(100),
  content_warnings TEXT[] DEFAULT '{}',

  -- 캐시 관리
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  update_priority INTEGER DEFAULT 5,

  -- 추가 데이터
  monetization_enabled BOOLEAN,
  has_membership BOOLEAN DEFAULT false,
  branding_settings JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  CHECK (subscriber_count >= 0),
  CHECK (video_count >= 0),
  CHECK (view_count >= 0)
);

-- 인덱스
CREATE INDEX idx_channel_profiles_channel_id ON channel_profiles(channel_id);
CREATE INDEX idx_channel_profiles_quality ON channel_profiles(quality_score DESC);
CREATE INDEX idx_channel_profiles_verified ON channel_profiles(is_verified) WHERE is_verified = true;
CREATE INDEX idx_channel_profiles_active ON channel_profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_channel_profiles_subscribers ON channel_profiles(subscriber_count DESC);
CREATE INDEX idx_channel_profiles_blocked ON channel_profiles(is_blocked) WHERE is_blocked = false;

-- 트리거
CREATE TRIGGER update_channel_profiles_updated_at
  BEFORE UPDATE ON channel_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 채널 품질 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_channel_quality_score()
RETURNS TRIGGER AS $$
DECLARE
  subscriber_score DECIMAL;
  consistency_score DECIMAL;
  engagement_score DECIMAL;
  frequency_score DECIMAL;
BEGIN
  -- 구독자 점수 (로그 스케일)
  subscriber_score := CASE
    WHEN NEW.subscriber_count >= 1000000 THEN 1.0
    WHEN NEW.subscriber_count >= 100000 THEN 0.8
    WHEN NEW.subscriber_count >= 10000 THEN 0.6
    WHEN NEW.subscriber_count >= 1000 THEN 0.4
    ELSE 0.2
  END;

  -- 일관성 점수
  consistency_score := NEW.content_consistency;

  -- 참여도 점수
  engagement_score := LEAST(1.0, COALESCE(NEW.engagement_rate, 0) * 100);

  -- 업로드 빈도 점수
  frequency_score := CASE
    WHEN NEW.upload_frequency >= 30 THEN 1.0
    WHEN NEW.upload_frequency >= 15 THEN 0.8
    WHEN NEW.upload_frequency >= 7 THEN 0.6
    WHEN NEW.upload_frequency >= 3 THEN 0.4
    ELSE 0.2
  END;

  -- 종합 점수 계산 (가중 평균)
  NEW.quality_score := (
    subscriber_score * 0.3 +
    consistency_score * 0.3 +
    engagement_score * 0.2 +
    frequency_score * 0.2
  );

  -- 등급 부여
  NEW.quality_grade := CASE
    WHEN NEW.quality_score >= 0.9 THEN 'S'
    WHEN NEW.quality_score >= 0.8 THEN 'A'
    WHEN NEW.quality_score >= 0.7 THEN 'B'
    WHEN NEW.quality_score >= 0.6 THEN 'C'
    WHEN NEW.quality_score >= 0.5 THEN 'D'
    ELSE 'F'
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_channel_quality
  BEFORE INSERT OR UPDATE ON channel_profiles
  FOR EACH ROW EXECUTE FUNCTION calculate_channel_quality_score();
```

---

## 4. 실제 데이터 예시

### 4.1 user_profiles 예시

```sql
-- 무료 사용자 예시
INSERT INTO user_profiles (user_id, display_name, user_tier, preferences) VALUES
('550e8400-e29b-41d4-a716-446655440001', '김민수', 'free',
'{
  "language": "ko",
  "region": "KR",
  "display": {
    "theme": "dark",
    "autoplay": true,
    "quality": "1080p"
  }
}'::jsonb);

-- 프리미엄 사용자 예시
INSERT INTO user_profiles (user_id, display_name, user_tier, ai_searches_limit, preferences) VALUES
('550e8400-e29b-41d4-a716-446655440002', '이서연', 'premium', 50,
'{
  "language": "ko",
  "region": "KR",
  "notifications": {
    "push": true,
    "email": false,
    "trending": true
  }
}'::jsonb);
```

### 4.2 user_keyword_preferences 예시

```sql
-- 사용자 키워드 선호도
INSERT INTO user_keyword_preferences
(user_id, keyword, selection_count, total_watch_count, total_watch_time, associated_emotions)
VALUES
('550e8400-e29b-41d4-a716-446655440001', '먹방', 15, 45, 2700, ARRAY['happy', 'excited']),
('550e8400-e29b-41d4-a716-446655440001', 'ASMR', 8, 20, 1800, ARRAY['calm', 'relaxed']),
('550e8400-e29b-41d4-a716-446655440001', '게임', 25, 80, 4000, ARRAY['excited', 'competitive']);
```

### 4.3 videos 예시

```sql
-- YouTube Shorts 영상 예시
INSERT INTO videos (
  video_id, title, description, channel_id, channel_title,
  duration, view_count, like_count, quality_score,
  search_keyword, thumbnails
) VALUES
('dQw4w9WgXcQ',
 '초간단 김치볶음밥 레시피 #shorts',
 '1분만에 만드는 초간단 김치볶음밥! 자취생 필수 레시피',
 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
 '쿠킹하루',
 58,
 1250000,
 85000,
 0.85,
 '요리',
 '{
   "default": "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
   "medium": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
   "high": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
   "maxres": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
 }'::jsonb);
```

### 4.4 video_classifications 예시

```sql
-- LLM 분류 결과 예시
INSERT INTO video_classifications (
  video_id,
  primary_category,
  emotion_tags,
  content_type,
  target_audience,
  mood_keywords,
  classification_confidence,
  emotion_scores
) VALUES
('dQw4w9WgXcQ',
 '요리/음식',
 ARRAY['happy', 'satisfied', 'hungry'],
 'cooking_tutorial',
 'all',
 ARRAY['실용적인', '간단한', '맛있는'],
 0.92,
 '{"happy": 0.8, "satisfied": 0.7, "hungry": 0.9}'::jsonb);
```

---

## 📌 다음 단계

**Part 3: 데이터베이스 스키마 - 트렌드/추천/시스템 도메인**에서는:

1. **트렌드 도메인**

   - trend_keywords
   - trend_video_mappings

2. **추천 도메인**

   - emotion_keyword_preferences
   - recommendation_logs

3. **시스템 도메인**
   - search_sessions
   - api_usage_logs
   - scheduled_tasks
   - system_notifications
   - analytics_events

각 테이블의 상세 구조와 실제 사용 예시를 다룰 예정입니다.
