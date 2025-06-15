-- =============================================================================
-- 01_user_profiles.sql
-- 사용자 프로필 완전 시스템 (YouTube Shorts AI 큐레이션 서비스)
-- 
-- 기능: 완전한 개인화 시스템 (DB2.md 설계 기반)
-- 포함: user_profiles + user_keyword_preferences + user_video_interactions
-- 연동: Supabase Auth + PersonalizedKeywords + natural-language-extractor.js
-- =============================================================================

-- 0. 기존 테이블 제거 (완전 교체)
DROP TABLE IF EXISTS user_profiles CASCADE;

-- 1. updated_at 자동 업데이트 함수 생성 (공통 사용)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 📋 1. user_profiles 메인 테이블 (완전 개인화 시스템)
-- =============================================================================

CREATE TABLE user_profiles (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- =============================================================================
  -- 👤 Supabase Auth 연결
  -- =============================================================================
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- =============================================================================
  -- 🎯 사용자 기본 정보
  -- =============================================================================
  display_name varchar(100),                              -- 표시 이름
  avatar_url text,                                        -- 프로필 이미지 URL
  bio text,                                               -- 자기소개

  -- =============================================================================
  -- 🏆 티어 시스템 (확장된 구조)
  -- =============================================================================
  user_tier varchar(20) DEFAULT 'free'                   -- 사용자 등급
    CHECK (user_tier IN ('free', 'premium', 'pro', 'enterprise')),
  tier_expires_at timestamptz,                           -- 유료 등급 만료일

  -- =============================================================================
  -- 📊 서비스 사용 통계
  -- =============================================================================
  total_searches integer DEFAULT 0,                      -- 총 검색 횟수
  ai_searches_used integer DEFAULT 0,                    -- AI 검색 사용 횟수
  ai_searches_limit integer DEFAULT 10,                  -- AI 검색 일일 한도 (티어별)
  total_watch_time integer DEFAULT 0,                    -- 총 시청 시간 (초)
  total_videos_watched integer DEFAULT 0,                -- 총 시청 영상 수

  -- =============================================================================
  -- ⚙️ 사용자 설정 (JSONB - 유연한 구조)
  -- =============================================================================
  preferences jsonb DEFAULT '{
    "language": "ko",
    "region": "KR",
    "notifications": {
      "push": true,
      "email": true,
      "sms": false,
      "trending_keywords": true,
      "personalized_recommendations": true
    },
    "display": {
      "theme": "light",
      "autoplay": true,
      "quality": "auto",
      "shorts_only": true,
      "show_captions": false
    },
    "privacy": {
      "history_enabled": true,
      "recommendations_enabled": true,
      "analytics_enabled": true,
      "share_watch_data": false
    },
    "ai": {
      "enable_chat_search": true,
      "personalization_level": "medium",
      "mood_detection": true,
      "auto_categorization": true
    }
  }'::jsonb,

  -- =============================================================================
  -- 🏷️ 사용자 선호도 배열 (빠른 접근)
  -- =============================================================================
  blocked_channels text[] DEFAULT '{}',                  -- 차단된 채널 ID
  blocked_keywords text[] DEFAULT '{}',                  -- 차단된 키워드
  favorite_categories text[] DEFAULT '{}',               -- 선호 카테고리
  preferred_emotions text[] DEFAULT '{}',                -- 선호 감정 태그

  -- =============================================================================
  -- 📈 활동 추적
  -- =============================================================================
  last_active_at timestamptz DEFAULT now(),              -- 마지막 활동 시간
  last_search_at timestamptz,                            -- 마지막 검색 시간
  last_video_watched_at timestamptz,                     -- 마지막 영상 시청 시간
  login_count integer DEFAULT 0,                         -- 총 로그인 횟수
  streak_days integer DEFAULT 0,                         -- 연속 접속 일수

  -- =============================================================================
  -- 🎯 개인화 메타데이터
  -- =============================================================================
  onboarding_completed boolean DEFAULT false,            -- 온보딩 완료 여부
  onboarding_data jsonb DEFAULT '{}',                    -- 온보딩 데이터
  personalization_score decimal(3,2) DEFAULT 0.50,      -- 개인화 점수 (0.0-1.0)
  recommendation_accuracy decimal(3,2) DEFAULT 0.50,    -- 추천 정확도

  -- =============================================================================
  -- 🔗 추천 시스템
  -- =============================================================================
  referral_code varchar(20),                             -- 추천 코드
  referred_by uuid REFERENCES user_profiles(id),         -- 추천인
  referral_rewards_earned integer DEFAULT 0,             -- 추천 보상

  -- =============================================================================
  -- 📱 디바이스 및 사용 패턴
  -- =============================================================================
  primary_device varchar(20) DEFAULT 'unknown'           -- 주 사용 디바이스
    CHECK (primary_device IN ('mobile', 'desktop', 'tablet', 'tv', 'unknown')),
  usage_patterns jsonb DEFAULT '{}',                     -- 사용 패턴 분석 데이터
  peak_hours integer[] DEFAULT '{}',                     -- 주 사용 시간대

  -- =============================================================================
  -- 🚀 실험 및 A/B 테스트
  -- =============================================================================
  ab_test_groups jsonb DEFAULT '{}',                     -- A/B 테스트 그룹
  feature_flags jsonb DEFAULT '{}',                      -- 기능 플래그
  beta_features text[] DEFAULT '{}',                     -- 베타 기능 참여

  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,         -- 생성 일시
  updated_at timestamptz DEFAULT now() NOT NULL,         -- 수정 일시

  -- =============================================================================
  -- 🔍 제약조건
  -- =============================================================================
  UNIQUE(user_id),
  UNIQUE(referral_code),
  CHECK (total_searches >= 0),
  CHECK (ai_searches_used >= 0),
  CHECK (ai_searches_used <= ai_searches_limit),
  CHECK (total_watch_time >= 0),
  CHECK (total_videos_watched >= 0),
  CHECK (personalization_score >= 0 AND personalization_score <= 1),
  CHECK (recommendation_accuracy >= 0 AND recommendation_accuracy <= 1)
);

-- =============================================================================
-- 📊 user_profiles 인덱스 (성능 최적화)
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_id ON user_profiles(id);

-- 티어 및 활동 인덱스
CREATE INDEX idx_user_profiles_tier ON user_profiles(user_tier);
CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active_at DESC);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- 개인화 인덱스
CREATE INDEX idx_user_profiles_personalization_score ON user_profiles(personalization_score DESC);
CREATE INDEX idx_user_profiles_recommendation_accuracy ON user_profiles(recommendation_accuracy DESC);

-- 추천 시스템 인덱스
CREATE INDEX idx_user_profiles_referral_code ON user_profiles(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX idx_user_profiles_referred_by ON user_profiles(referred_by) WHERE referred_by IS NOT NULL;

-- 사용 통계 인덱스
CREATE INDEX idx_user_profiles_total_searches ON user_profiles(total_searches DESC);
CREATE INDEX idx_user_profiles_watch_time ON user_profiles(total_watch_time DESC);

-- 디바이스 및 패턴 인덱스
CREATE INDEX idx_user_profiles_primary_device ON user_profiles(primary_device);
CREATE INDEX idx_user_profiles_onboarding ON user_profiles(onboarding_completed);

-- GIN 인덱스 (배열 및 JSON 검색용)
CREATE INDEX idx_user_profiles_preferences ON user_profiles USING GIN(preferences);
CREATE INDEX idx_user_profiles_favorite_categories ON user_profiles USING GIN(favorite_categories);
CREATE INDEX idx_user_profiles_preferred_emotions ON user_profiles USING GIN(preferred_emotions);
CREATE INDEX idx_user_profiles_usage_patterns ON user_profiles USING GIN(usage_patterns);
CREATE INDEX idx_user_profiles_ab_test_groups ON user_profiles USING GIN(ab_test_groups);

-- =============================================================================
-- 📋 2. user_keyword_preferences 테이블 (키워드 선호도 상세 관리)
-- =============================================================================

CREATE TABLE user_keyword_preferences (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- =============================================================================
  -- 🔗 사용자 연결
  -- =============================================================================
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- =============================================================================
  -- 🏷️ 키워드 정보
  -- =============================================================================
  keyword varchar(255) NOT NULL,                         -- 키워드
  keyword_type varchar(50) DEFAULT 'general'             -- 키워드 타입
    CHECK (keyword_type IN ('general', 'trend', 'custom', 'suggested', 'ai_generated')),

  -- =============================================================================
  -- 📊 선호도 계산 핵심 데이터
  -- =============================================================================
  selection_count integer DEFAULT 1,                     -- 선택 횟수 (가장 중요!)
  preference_score decimal(3,2) DEFAULT 0.50             -- 선호도 점수 (0.0-1.0)
    CHECK (preference_score >= 0 AND preference_score <= 1),

  -- =============================================================================
  -- 🎬 상호작용 통계
  -- =============================================================================
  total_watch_count integer DEFAULT 0,                   -- 해당 키워드로 본 영상 수
  total_watch_time integer DEFAULT 0,                    -- 총 시청 시간 (초)
  avg_watch_duration integer GENERATED ALWAYS AS (       -- 평균 시청 시간
    CASE WHEN total_watch_count > 0
    THEN total_watch_time / total_watch_count
    ELSE 0 END
  ) STORED,
  avg_completion_rate decimal(3,2) DEFAULT 0.00,         -- 평균 완료율

  -- =============================================================================
  -- 😊 감정 연관성 (PersonalizedKeywords 연동)
  -- =============================================================================
  associated_emotions text[] DEFAULT '{}',               -- 연관 감정 태그
  emotion_scores jsonb DEFAULT '{}',                     -- 감정별 점수 {"happy": 0.8, "calm": 0.6}

  -- =============================================================================
  -- 👍 피드백 데이터
  -- =============================================================================
  positive_interactions integer DEFAULT 0,               -- 좋아요, 공유, 저장
  negative_interactions integer DEFAULT 0,               -- 싫어요, 건너뛰기
  interaction_score decimal(3,2) GENERATED ALWAYS AS (   -- 상호작용 점수
    CASE WHEN (positive_interactions + negative_interactions) > 0
    THEN CAST(positive_interactions AS decimal) / (positive_interactions + negative_interactions)
    ELSE 0.5 END
  ) STORED,

  -- =============================================================================
  -- 🕐 시간 정보
  -- =============================================================================
  first_selected_at timestamptz DEFAULT now(),           -- 첫 선택 시간
  last_selected_at timestamptz DEFAULT now(),            -- 마지막 선택 시간
  last_positive_at timestamptz,                          -- 마지막 긍정 반응 시간
  last_negative_at timestamptz,                          -- 마지막 부정 반응 시간

  -- =============================================================================
  -- 🎯 추천 관련
  -- =============================================================================
  boost_factor decimal(2,1) DEFAULT 1.0                  -- 추천 가중치 (0.1-2.0)
    CHECK (boost_factor >= 0.1 AND boost_factor <= 2.0),
  is_blocked boolean DEFAULT false,                      -- 차단 여부
  block_reason varchar(100),                             -- 차단 사유

  -- =============================================================================
  -- 📊 메타데이터
  -- =============================================================================
  source varchar(50) DEFAULT 'user_selection'            -- 출처
    CHECK (source IN ('user_selection', 'ai_suggestion', 'trending', 'autocomplete')),
  metadata jsonb DEFAULT '{}',                           -- 추가 메타데이터

  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,         -- 생성 일시
  updated_at timestamptz DEFAULT now() NOT NULL,         -- 수정 일시

  -- =============================================================================
  -- 🔍 제약조건
  -- =============================================================================
  UNIQUE(user_id, keyword),
  CHECK (selection_count >= 0),
  CHECK (total_watch_count >= 0),
  CHECK (total_watch_time >= 0),
  CHECK (positive_interactions >= 0),
  CHECK (negative_interactions >= 0)
);

-- =============================================================================
-- 📊 user_keyword_preferences 인덱스
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_user_keyword_preferences_user_id ON user_keyword_preferences(user_id);
CREATE INDEX idx_user_keyword_preferences_keyword ON user_keyword_preferences(keyword);

-- 선호도 및 점수 인덱스
CREATE INDEX idx_user_keyword_preferences_score ON user_keyword_preferences(preference_score DESC);
CREATE INDEX idx_user_keyword_preferences_selection ON user_keyword_preferences(selection_count DESC);
CREATE INDEX idx_user_keyword_preferences_type ON user_keyword_preferences(keyword_type);

-- 활성 키워드 인덱스
CREATE INDEX idx_user_keyword_preferences_active ON user_keyword_preferences(is_blocked) WHERE is_blocked = false;

-- 복합 인덱스 (고성능 개인화 쿼리용)
CREATE INDEX idx_user_keyword_preferences_user_score
  ON user_keyword_preferences(user_id, preference_score DESC)
  WHERE is_blocked = false;

CREATE INDEX idx_user_keyword_preferences_user_selection
  ON user_keyword_preferences(user_id, selection_count DESC, last_selected_at DESC)
  WHERE is_blocked = false;

-- GIN 인덱스 (배열 및 JSON 검색용)
CREATE INDEX idx_user_keyword_preferences_emotions ON user_keyword_preferences USING GIN(associated_emotions);
CREATE INDEX idx_user_keyword_preferences_emotion_scores ON user_keyword_preferences USING GIN(emotion_scores);

-- =============================================================================
-- 📋 3. user_video_interactions 테이블 (사용자 행동 추적)
-- =============================================================================

CREATE TABLE user_video_interactions (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- =============================================================================
  -- 🔗 관계
  -- =============================================================================
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id varchar(20) NOT NULL,                         -- YouTube video ID

  -- =============================================================================
  -- 🎬 상호작용 타입
  -- =============================================================================
  interaction_type varchar(20) NOT NULL CHECK (
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

  -- =============================================================================
  -- 📺 시청 정보 (view 타입일 때)
  -- =============================================================================
  watch_duration integer,                                -- 시청 시간 (초)
  video_duration integer,                                -- 영상 전체 길이 (초)
  completion_rate decimal(3,2) GENERATED ALWAYS AS (     -- 완료율
    CASE WHEN video_duration > 0 AND watch_duration IS NOT NULL
    THEN LEAST(1.0, CAST(watch_duration AS decimal) / video_duration)
    ELSE NULL END
  ) STORED,

  -- =============================================================================
  -- 🔍 상호작용 상세
  -- =============================================================================
  interaction_value text,                                -- 상호작용 값 (댓글 내용, 공유 플랫폼 등)
  interaction_metadata jsonb DEFAULT '{}',               -- 추가 메타데이터

  -- =============================================================================
  -- 🎯 컨텍스트 정보 (natural-language-extractor.js 연동)
  -- =============================================================================
  search_keyword varchar(255),                           -- 검색 키워드
  recommendation_type varchar(50)                        -- 추천 타입
    CHECK (recommendation_type IN ('search', 'personalized', 'trending', 'emotion', 'similar')),
  user_emotion varchar(50),                              -- 사용자 감정 상태
  user_intent varchar(50),                               -- 사용자 의도

  -- =============================================================================
  -- 📱 세션 정보
  -- =============================================================================
  session_id varchar(100),                               -- 세션 ID
  device_type varchar(20) DEFAULT 'unknown' CHECK (
    device_type IN ('mobile', 'desktop', 'tablet', 'tv', 'unknown')
  ),
  device_info jsonb DEFAULT '{}',                        -- 디바이스 상세 정보

  -- =============================================================================
  -- ⭐ 품질 피드백
  -- =============================================================================
  quality_rating integer                                 -- 품질 평가 (1-5)
    CHECK (quality_rating >= 1 AND quality_rating <= 5),
  quality_feedback text,                                 -- 품질 피드백 내용
  feedback_tags text[] DEFAULT '{}',                     -- 피드백 태그

  -- =============================================================================
  -- 📱 플랫폼 정보
  -- =============================================================================
  source_platform varchar(50) DEFAULT 'web'             -- 소스 플랫폼
    CHECK (source_platform IN ('web', 'ios', 'android', 'desktop_app')),
  app_version varchar(20),                               -- 앱 버전

  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,         -- 생성 일시

  -- =============================================================================
  -- 🔍 제약조건
  -- =============================================================================
  CHECK (
    (interaction_type = 'view' AND watch_duration IS NOT NULL) OR
    (interaction_type != 'view')
  ),
  CHECK (watch_duration >= 0),
  CHECK (video_duration > 0 OR video_duration IS NULL)
);

-- =============================================================================
-- 📊 user_video_interactions 인덱스
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_user_video_interactions_user_id ON user_video_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_video_interactions_video_id ON user_video_interactions(video_id);
CREATE INDEX idx_user_video_interactions_type ON user_video_interactions(interaction_type);

-- 검색 및 추천 인덱스
CREATE INDEX idx_user_video_interactions_keyword ON user_video_interactions(search_keyword) WHERE search_keyword IS NOT NULL;
CREATE INDEX idx_user_video_interactions_emotion ON user_video_interactions(user_emotion) WHERE user_emotion IS NOT NULL;
CREATE INDEX idx_user_video_interactions_recommendation ON user_video_interactions(recommendation_type);

-- 세션 및 디바이스 인덱스
CREATE INDEX idx_user_video_interactions_session ON user_video_interactions(session_id);
CREATE INDEX idx_user_video_interactions_device ON user_video_interactions(device_type);
CREATE INDEX idx_user_video_interactions_platform ON user_video_interactions(source_platform);

-- 시청 분석 인덱스
CREATE INDEX idx_user_video_interactions_completion ON user_video_interactions(completion_rate DESC) WHERE completion_rate IS NOT NULL;
CREATE INDEX idx_user_video_interactions_quality ON user_video_interactions(quality_rating DESC) WHERE quality_rating IS NOT NULL;

-- 복합 인덱스 (사용자 행동 분석용)
CREATE INDEX idx_user_video_interactions_user_type_time
  ON user_video_interactions(user_id, interaction_type, created_at DESC);

CREATE INDEX idx_user_video_interactions_video_user_type
  ON user_video_interactions(video_id, user_id, interaction_type);

-- GIN 인덱스 (배열 및 JSON 검색용)
CREATE INDEX idx_user_video_interactions_feedback_tags ON user_video_interactions USING GIN(feedback_tags);
CREATE INDEX idx_user_video_interactions_metadata ON user_video_interactions USING GIN(interaction_metadata);
CREATE INDEX idx_user_video_interactions_device_info ON user_video_interactions USING GIN(device_info);

-- =============================================================================
-- 🔄 트리거 및 자동화 함수
-- =============================================================================

-- 1. updated_at 자동 업데이트 트리거들 (기존 트리거 제거 후 재생성)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_keyword_preferences_updated_at ON user_keyword_preferences;
CREATE TRIGGER update_user_keyword_preferences_updated_at
  BEFORE UPDATE ON user_keyword_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. 사용자 등록 시 자동 프로필 생성 함수 (에러 방지 개선)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 안전한 프로필 생성 (에러 발생 시 무시)
  BEGIN
    INSERT INTO user_profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.email, 'Unknown User'));
  EXCEPTION
    WHEN OTHERS THEN
      -- 에러 로그 (선택사항)
      RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
      -- 사용자 생성은 계속 진행
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. auth.users 테이블에 트리거 적용 (기존 트리거 제거 후 재생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. 선호도 점수 자동 계산 함수
CREATE OR REPLACE FUNCTION update_preference_score()
RETURNS TRIGGER AS $$
DECLARE
  days_since_first integer;
  base_score decimal;
  time_decay decimal;
  interaction_bonus decimal;
BEGIN
  -- 첫 선택 이후 경과 일수
  days_since_first := EXTRACT(DAY FROM (now() - NEW.first_selected_at));

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

DROP TRIGGER IF EXISTS calculate_preference_score ON user_keyword_preferences;
CREATE TRIGGER calculate_preference_score
  BEFORE INSERT OR UPDATE ON user_keyword_preferences
  FOR EACH ROW EXECUTE FUNCTION update_preference_score();

-- 5. 사용자 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 검색 횟수 업데이트 (search_logs와 연동)
  UPDATE user_profiles 
  SET 
    total_searches = total_searches + 1,
    last_search_at = now(),
    last_active_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 시청 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_watch_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 시청 기록일 때만 통계 업데이트
  IF NEW.interaction_type = 'view' AND NEW.watch_duration IS NOT NULL THEN
    UPDATE user_profiles 
    SET 
      total_videos_watched = total_videos_watched + 1,
      total_watch_time = total_watch_time + NEW.watch_duration,
      last_video_watched_at = now(),
      last_active_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_watch_stats ON user_video_interactions;
CREATE TRIGGER update_user_watch_stats
  AFTER INSERT ON user_video_interactions
  FOR EACH ROW EXECUTE FUNCTION update_watch_stats();

-- =============================================================================
-- 🔧 사용자 프로필 관리 함수들 (natural-language-extractor.js 연동)
-- =============================================================================

-- 1. 사용자 선호 키워드 조회 함수 (getUserPreferences 연동)
CREATE OR REPLACE FUNCTION get_user_preferences_detailed(
  target_user_id uuid,
  limit_count integer DEFAULT 10
) RETURNS TABLE(
  keyword varchar(255),
  preference_score decimal(3,2),
  selection_count integer,
  associated_emotions text[],
  last_selected_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ukp.keyword,
    ukp.preference_score,
    ukp.selection_count,
    ukp.associated_emotions,
    ukp.last_selected_at
  FROM user_keyword_preferences ukp
  WHERE 
    ukp.user_id = target_user_id
    AND ukp.is_blocked = false
    AND ukp.preference_score > 0.3
  ORDER BY ukp.preference_score DESC, ukp.selection_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 2. 개인화 점수 계산 함수
CREATE OR REPLACE FUNCTION calculate_user_personalization_score(
  target_user_id uuid
) RETURNS decimal(3,2) AS $$
DECLARE
  keyword_count integer;
  interaction_count integer;
  watch_time_hours decimal;
  base_score decimal := 0.3;
BEGIN
  -- 키워드 선호도 데이터
  SELECT COUNT(*) INTO keyword_count
  FROM user_keyword_preferences 
  WHERE user_id = target_user_id AND is_blocked = false;
  
  -- 상호작용 데이터
  SELECT COUNT(*) INTO interaction_count
  FROM user_video_interactions 
  WHERE user_id = target_user_id;
  
  -- 시청 시간 (시간 단위)
  SELECT COALESCE(total_watch_time, 0) / 3600.0 INTO watch_time_hours
  FROM user_profiles 
  WHERE user_id = target_user_id;
  
  -- 개인화 점수 계산
  base_score := base_score + 
    LEAST(0.3, keyword_count * 0.02) +      -- 키워드 다양성
    LEAST(0.2, interaction_count * 0.001) + -- 상호작용 빈도
    LEAST(0.2, watch_time_hours * 0.01);    -- 시청 경험
  
  RETURN LEAST(1.0, base_score);
END;
$$ LANGUAGE plpgsql;

-- 3. 사용자 프로필 요약 조회 함수
CREATE OR REPLACE FUNCTION get_user_profile_summary(
  target_user_id uuid
) RETURNS TABLE(
  user_id uuid,
  display_name varchar(100),
  user_tier varchar(20),
  personalization_score decimal(3,2),
  total_searches integer,
  total_watch_time integer,
  favorite_keywords text[],
  preferred_emotions text[],
  last_active_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.display_name,
    up.user_tier,
    up.personalization_score,
    up.total_searches,
    up.total_watch_time,
    ARRAY(
      SELECT ukp.keyword 
      FROM user_keyword_preferences ukp 
      WHERE ukp.user_id = target_user_id 
        AND ukp.is_blocked = false 
      ORDER BY ukp.preference_score DESC 
      LIMIT 5
    ) as favorite_keywords,
    up.preferred_emotions,
    up.last_active_at
  FROM user_profiles up
  WHERE up.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- 4. 키워드 선호도 업데이트 함수 (PersonalizedKeywords 컴포넌트 연동)
CREATE OR REPLACE FUNCTION upsert_keyword_preference(
  target_user_id uuid,
  target_keyword varchar(255),
  increment_selection boolean DEFAULT true
) RETURNS void AS $$
BEGIN
  INSERT INTO user_keyword_preferences (user_id, keyword, selection_count, last_selected_at)
  VALUES (target_user_id, target_keyword, 1, now())
  ON CONFLICT (user_id, keyword)
  DO UPDATE SET
    selection_count = CASE 
      WHEN increment_selection THEN user_keyword_preferences.selection_count + 1
      ELSE user_keyword_preferences.selection_count
    END,
    last_selected_at = now();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 🔐 RLS (Row Level Security) 정책
-- =============================================================================

-- user_profiles RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- user_profiles RLS 정책
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_keyword_preferences RLS 활성화
ALTER TABLE user_keyword_preferences ENABLE ROW LEVEL SECURITY;

-- user_keyword_preferences RLS 정책
CREATE POLICY "Users can manage own keyword preferences" ON user_keyword_preferences
  FOR ALL USING (auth.uid() = user_id);

-- user_video_interactions RLS 활성화
ALTER TABLE user_video_interactions ENABLE ROW LEVEL SECURITY;

-- user_video_interactions RLS 정책
CREATE POLICY "Users can manage own video interactions" ON user_video_interactions
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- 📋 편의 뷰 (Views) - 빠른 데이터 접근용
-- =============================================================================

-- 1. 활성 사용자 프로필 뷰 (기존 뷰 제거 후 재생성)
DROP VIEW IF EXISTS active_user_profiles;
CREATE VIEW active_user_profiles AS
SELECT 
  up.user_id,
  up.display_name,
  up.user_tier,
  up.personalization_score,
  up.total_searches,
  up.total_watch_time,
  up.last_active_at,
  COUNT(ukp.id) as keyword_count,
  COUNT(uvi.id) as interaction_count
FROM user_profiles up
LEFT JOIN user_keyword_preferences ukp ON up.user_id = ukp.user_id AND ukp.is_blocked = false
LEFT JOIN user_video_interactions uvi ON up.user_id = uvi.user_id
WHERE up.last_active_at > (now() - interval '30 days')
GROUP BY up.user_id, up.display_name, up.user_tier, up.personalization_score, 
         up.total_searches, up.total_watch_time, up.last_active_at
ORDER BY up.last_active_at DESC;

-- 2. 인기 키워드 선호도 뷰 (기존 뷰 제거 후 재생성)
DROP VIEW IF EXISTS popular_keyword_preferences;
CREATE VIEW popular_keyword_preferences AS
SELECT 
  ukp.keyword,
  COUNT(DISTINCT ukp.user_id) as user_count,
  AVG(ukp.preference_score) as avg_preference_score,
  SUM(ukp.selection_count) as total_selections,
  MAX(ukp.last_selected_at) as last_selected_at
FROM user_keyword_preferences ukp
WHERE 
  ukp.is_blocked = false
  AND ukp.preference_score > 0.3
  AND ukp.last_selected_at > (now() - interval '7 days')
GROUP BY ukp.keyword
HAVING COUNT(DISTINCT ukp.user_id) >= 3
ORDER BY user_count DESC, avg_preference_score DESC;

-- 3. 사용자 행동 요약 뷰 (기존 뷰 제거 후 재생성)
DROP VIEW IF EXISTS user_behavior_summary;
CREATE VIEW user_behavior_summary AS
SELECT 
  uvi.user_id,
  COUNT(*) as total_interactions,
  COUNT(*) FILTER (WHERE uvi.interaction_type = 'view') as view_count,
  COUNT(*) FILTER (WHERE uvi.interaction_type = 'like') as like_count,
  COUNT(*) FILTER (WHERE uvi.interaction_type = 'share') as share_count,
  AVG(uvi.completion_rate) FILTER (WHERE uvi.completion_rate IS NOT NULL) as avg_completion_rate,
  COUNT(DISTINCT uvi.video_id) as unique_videos_watched,
  COUNT(DISTINCT uvi.search_keyword) as unique_search_keywords,
  MAX(uvi.created_at) as last_interaction_at
FROM user_video_interactions uvi
WHERE uvi.created_at > (now() - interval '30 days')
GROUP BY uvi.user_id
ORDER BY total_interactions DESC;

-- =============================================================================
-- 💾 테이블 생성 완료!
-- 
-- 📊 완성된 구성요소:
-- 1. user_profiles (38개 컬럼) - 완전한 개인화 시스템
-- 2. user_keyword_preferences (20개 컬럼) - 키워드 선호도 상세 관리
-- 3. user_video_interactions (22개 컬럼) - 사용자 행동 추적
-- 4. 20개+ 인덱스 (성능 최적화)
-- 5. 8개 관리 함수 (자동화 및 API 연동)
-- 6. 3개 편의 뷰 (빠른 데이터 접근)
-- 7. 완전한 RLS 보안 정책
-- 
-- 🔗 연동 대상:
-- - PersonalizedKeywords 컴포넌트
-- - UserPreferenceKeywords 컴포넌트  
-- - natural-language-extractor.js
-- - personalizedCurationService.js
-- - search_logs 테이블 (4단계 필터링 워크플로우)
-- 
-- 🚀 다음 단계:
-- 1. Supabase SQL Editor에서 이 파일 실행
-- 2. 테이블 생성 확인 및 샘플 데이터 입력
-- 3. 프론트엔드 컴포넌트와 API 연동 테스트
-- ============================================================================= 