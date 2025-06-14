# 🚀 Momentum YouTube AI 큐레이션 서비스 - 최종 구현 가이드

## Part 4: 인덱스 + RLS + 함수 + 초기 데이터

> **Version**: 4.0 FINAL  
> **Last Updated**: 2025-01-13  
> **Dependencies**: Part 1, Part 2, Part 3

---

## 📋 목차

1. [인덱스 전략](#1-인덱스-전략)
2. [Row Level Security (RLS) 정책](#2-row-level-security-rls-정책)
3. [핵심 함수 구현](#3-핵심-함수-구현)
4. [초기 데이터 및 시드](#4-초기-데이터-및-시드)

---

## 1. 인덱스 전략

### 1.1 인덱스 설계 원칙

```sql
-- ============================================
-- 인덱스 설계 원칙
-- ============================================
/*
1. WHERE 절에 자주 사용되는 컬럼
2. JOIN 조건에 사용되는 컬럼
3. ORDER BY, GROUP BY에 사용되는 컬럼
4. 선택도(Selectivity)가 높은 컬럼 우선
5. 복합 인덱스는 가장 선택적인 컬럼을 앞에
6. 쓰기 성능 vs 읽기 성능 균형 고려
7. 부분 인덱스로 저장 공간 최적화
*/
```

### 1.2 사용자 도메인 인덱스

```sql
-- ============================================
-- user_profiles 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_tier ON user_profiles(user_tier);
CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active_at DESC);

-- 추천/분석용
CREATE INDEX idx_user_profiles_active_premium
  ON user_profiles(user_tier, last_active_at DESC)
  WHERE user_tier IN ('premium', 'pro');

-- 통계용
CREATE INDEX idx_user_profiles_searches ON user_profiles(total_searches DESC);

-- ============================================
-- user_keyword_preferences 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_user_keyword_preferences_user_id ON user_keyword_preferences(user_id);
CREATE INDEX idx_user_keyword_preferences_keyword ON user_keyword_preferences(keyword);

-- 선호도 기반 정렬
CREATE INDEX idx_user_keyword_preferences_score ON user_keyword_preferences(preference_score DESC);
CREATE INDEX idx_user_keyword_preferences_selection ON user_keyword_preferences(selection_count DESC);

-- 복합 인덱스 (핵심 쿼리 최적화)
CREATE INDEX idx_user_keyword_preferences_user_score
  ON user_keyword_preferences(user_id, preference_score DESC)
  WHERE is_blocked = false;

CREATE INDEX idx_user_keyword_preferences_user_keyword
  ON user_keyword_preferences(user_id, keyword, preference_score DESC);

-- 감정 분석용
CREATE INDEX idx_user_keyword_preferences_emotions
  ON user_keyword_preferences USING GIN(associated_emotions);

-- ============================================
-- user_video_interactions 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_user_video_interactions_user_id ON user_video_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_video_interactions_video_id ON user_video_interactions(video_id);

-- 상호작용 분석
CREATE INDEX idx_user_video_interactions_type ON user_video_interactions(interaction_type);
CREATE INDEX idx_user_video_interactions_type_date
  ON user_video_interactions(interaction_type, created_at DESC);

-- 추천 개선용
CREATE INDEX idx_user_video_interactions_positive
  ON user_video_interactions(user_id, created_at DESC)
  WHERE interaction_type IN ('like', 'share', 'save');

-- 컨텍스트 분석
CREATE INDEX idx_user_video_interactions_keyword
  ON user_video_interactions(search_keyword)
  WHERE search_keyword IS NOT NULL;

CREATE INDEX idx_user_video_interactions_emotion
  ON user_video_interactions(user_emotion)
  WHERE user_emotion IS NOT NULL;

-- 세션 분석
CREATE INDEX idx_user_video_interactions_session ON user_video_interactions(session_id);
```

### 1.3 영상 도메인 인덱스

```sql
-- ============================================
-- videos 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_videos_video_id ON videos(video_id);
CREATE INDEX idx_videos_channel_id ON videos(channel_id);

-- 검색 최적화
CREATE INDEX idx_videos_search_keyword ON videos(search_keyword);
CREATE INDEX idx_videos_search_keyword_quality
  ON videos(search_keyword, quality_score DESC)
  WHERE is_playable = true;

-- 품질 기반 정렬
CREATE INDEX idx_videos_quality_score ON videos(quality_score DESC);
CREATE INDEX idx_videos_view_count ON videos(view_count DESC);
CREATE INDEX idx_videos_engagement ON videos(engagement_rate DESC);

-- 필터링 최적화
CREATE INDEX idx_videos_playable ON videos(is_playable) WHERE is_playable = true;
CREATE INDEX idx_videos_duration_shorts ON videos(duration) WHERE duration <= 60;
CREATE INDEX idx_videos_available_kr ON videos(is_available_in_kr) WHERE is_available_in_kr = true;

-- 캐시 관리
CREATE INDEX idx_videos_expires_at ON videos(expires_at);
CREATE INDEX idx_videos_cache_priority ON videos(cache_priority DESC, expires_at);

-- 시간 기반 조회
CREATE INDEX idx_videos_published_recent
  ON videos(published_at DESC)
  WHERE published_at > NOW() - INTERVAL '7 days';

-- 복합 인덱스 (자주 사용되는 쿼리)
CREATE INDEX idx_videos_playable_quality_shorts
  ON videos(is_playable, quality_score DESC, duration)
  WHERE is_playable = true AND is_available_in_kr = true AND duration <= 60;

-- 전문 검색
CREATE INDEX idx_videos_title_trgm ON videos USING gin(title gin_trgm_ops);
CREATE INDEX idx_videos_tags_gin ON videos USING gin(tags);

-- ============================================
-- video_classifications 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_video_classifications_video_id ON video_classifications(video_id);

-- 분류 기반 조회
CREATE INDEX idx_video_classifications_category ON video_classifications(primary_category);
CREATE INDEX idx_video_classifications_content_type ON video_classifications(content_type);
CREATE INDEX idx_video_classifications_audience ON video_classifications(target_audience);

-- 감정/무드 검색 (GIN)
CREATE INDEX idx_video_classifications_emotion_tags ON video_classifications USING GIN(emotion_tags);
CREATE INDEX idx_video_classifications_mood_keywords ON video_classifications USING GIN(mood_keywords);
CREATE INDEX idx_video_classifications_topics ON video_classifications USING GIN(topics);

-- 신뢰도 기반
CREATE INDEX idx_video_classifications_confidence ON video_classifications(classification_confidence DESC);

-- 복합 인덱스
CREATE INDEX idx_video_classifications_category_type
  ON video_classifications(primary_category, content_type);

-- ============================================
-- keyword_video_mappings 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_keyword_video_mappings_keyword ON keyword_video_mappings(keyword);
CREATE INDEX idx_keyword_video_mappings_video_id ON keyword_video_mappings(video_id);

-- 관련성 기반 정렬
CREATE INDEX idx_keyword_video_mappings_relevance
  ON keyword_video_mappings(keyword, relevance_score DESC);

-- 검색 순위
CREATE INDEX idx_keyword_video_mappings_rank
  ON keyword_video_mappings(keyword, search_rank)
  WHERE search_rank IS NOT NULL;

-- ============================================
-- channel_profiles 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_channel_profiles_channel_id ON channel_profiles(channel_id);

-- 품질 기반 필터링
CREATE INDEX idx_channel_profiles_quality ON channel_profiles(quality_score DESC);
CREATE INDEX idx_channel_profiles_grade ON channel_profiles(quality_grade);
CREATE INDEX idx_channel_profiles_verified ON channel_profiles(is_verified) WHERE is_verified = true;

-- 활성 채널
CREATE INDEX idx_channel_profiles_active_quality
  ON channel_profiles(is_active, quality_score DESC)
  WHERE is_active = true AND is_blocked = false;

-- 구독자 기반
CREATE INDEX idx_channel_profiles_subscribers ON channel_profiles(subscriber_count DESC);
```

### 1.4 트렌드 도메인 인덱스

```sql
-- ============================================
-- trend_keywords 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_trend_keywords_keyword ON trend_keywords(keyword);
CREATE INDEX idx_trend_keywords_refined ON trend_keywords(refined_keyword) WHERE refined_keyword IS NOT NULL;

-- 활성 트렌드
CREATE INDEX idx_trend_keywords_active ON trend_keywords(is_active) WHERE is_active = true;
CREATE INDEX idx_trend_keywords_active_score
  ON trend_keywords(is_active, trend_score DESC)
  WHERE is_active = true;

-- 트렌드 분석
CREATE INDEX idx_trend_keywords_score ON trend_keywords(trend_score DESC);
CREATE INDEX idx_trend_keywords_momentum ON trend_keywords(trend_momentum);
CREATE INDEX idx_trend_keywords_category ON trend_keywords(category);

-- 시간 기반
CREATE INDEX idx_trend_keywords_expires ON trend_keywords(expires_at);
CREATE INDEX idx_trend_keywords_detected ON trend_keywords(detected_at DESC);

-- 추천 우선순위
CREATE INDEX idx_trend_keywords_priority
  ON trend_keywords(recommendation_priority DESC, trend_score DESC)
  WHERE is_active = true;

-- ============================================
-- trend_video_mappings 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_trend_video_mappings_trend ON trend_video_mappings(trend_keyword_id);
CREATE INDEX idx_trend_video_mappings_video ON trend_video_mappings(video_id);

-- 품질 필터링
CREATE INDEX idx_trend_video_mappings_quality
  ON trend_video_mappings(channel_quality_passed)
  WHERE channel_quality_passed = true;

-- 복합 인덱스
CREATE INDEX idx_trend_video_mappings_trend_relevance
  ON trend_video_mappings(trend_keyword_id, relevance_score DESC)
  WHERE channel_quality_passed = true AND is_active = true;
```

### 1.5 추천 도메인 인덱스

```sql
-- ============================================
-- emotion_keyword_preferences 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_emotion_keyword_preferences_emotion ON emotion_keyword_preferences(emotion);
CREATE INDEX idx_emotion_keyword_preferences_full
  ON emotion_keyword_preferences(emotion, emotion_intensity);

-- 성과 기반
CREATE INDEX idx_emotion_keyword_preferences_success ON emotion_keyword_preferences(success_rate DESC);
CREATE INDEX idx_emotion_keyword_preferences_confidence ON emotion_keyword_preferences(confidence_score DESC);

-- 키워드 검색
CREATE INDEX idx_emotion_keyword_preferences_keywords
  ON emotion_keyword_preferences USING GIN(preferred_keywords);

-- ============================================
-- recommendation_logs 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_recommendation_logs_user ON recommendation_logs(user_id, created_at DESC);
CREATE INDEX idx_recommendation_logs_session ON recommendation_logs(session_id);

-- 분석용
CREATE INDEX idx_recommendation_logs_type ON recommendation_logs(recommendation_type);
CREATE INDEX idx_recommendation_logs_algorithm ON recommendation_logs(recommendation_algorithm);

-- 성과 분석
CREATE INDEX idx_recommendation_logs_ctr ON recommendation_logs(click_through_rate DESC);
CREATE INDEX idx_recommendation_logs_engagement
  ON recommendation_logs(engagement_score DESC)
  WHERE engagement_score IS NOT NULL;

-- A/B 테스트
CREATE INDEX idx_recommendation_logs_experiment
  ON recommendation_logs(experiment_id, experiment_group)
  WHERE experiment_id IS NOT NULL;
```

### 1.6 시스템 도메인 인덱스

```sql
-- ============================================
-- search_sessions 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_search_sessions_user ON search_sessions(user_id, created_at DESC);
CREATE INDEX idx_search_sessions_session ON search_sessions(session_id);

-- 검색 분석
CREATE INDEX idx_search_sessions_type ON search_sessions(search_type);
CREATE INDEX idx_search_sessions_ai ON search_sessions(ai_enabled) WHERE ai_enabled = true;

-- 전문 검색
CREATE INDEX idx_search_sessions_query_trgm
  ON search_sessions USING gin(to_tsvector('simple', search_query));

-- ============================================
-- api_usage_logs 인덱스
-- ============================================
-- 기본 조회
CREATE INDEX idx_api_usage_logs_api ON api_usage_logs(api_name, created_at DESC);
CREATE INDEX idx_api_usage_logs_category ON api_usage_logs(quota_category);

-- 비용 분석
CREATE INDEX idx_api_usage_logs_cost ON api_usage_logs(total_cost DESC);

-- 에러 추적
CREATE INDEX idx_api_usage_logs_error
  ON api_usage_logs(error_occurred, api_name)
  WHERE error_occurred = true;

-- ============================================
-- scheduled_tasks 인덱스
-- ============================================
CREATE INDEX idx_scheduled_tasks_active ON scheduled_tasks(is_active) WHERE is_active = true;
CREATE INDEX idx_scheduled_tasks_next_run
  ON scheduled_tasks(next_run_at)
  WHERE is_active = true AND is_running = false;
CREATE INDEX idx_scheduled_tasks_type ON scheduled_tasks(task_type);

-- ============================================
-- system_notifications 인덱스
-- ============================================
CREATE INDEX idx_system_notifications_user_unread
  ON system_notifications(user_id, created_at DESC)
  WHERE is_read = false;
CREATE INDEX idx_system_notifications_global
  ON system_notifications(is_global, created_at DESC)
  WHERE is_global = true;
CREATE INDEX idx_system_notifications_scheduled
  ON system_notifications(scheduled_at)
  WHERE scheduled_at > NOW();

-- ============================================
-- analytics_events 인덱스
-- ============================================
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_events_user_action
  ON analytics_events(user_id, event_category, event_name)
  WHERE event_category = 'user_action';
```

---

## 2. Row Level Security (RLS) 정책

### 2.1 RLS 활성화

```sql
-- ============================================
-- RLS 활성화
-- ============================================
-- 사용자 관련 테이블
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keyword_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_video_interactions ENABLE ROW LEVEL SECURITY;

-- 검색/추천 관련 테이블
ALTER TABLE search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_logs ENABLE ROW LEVEL SECURITY;

-- 알림 테이블
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- 분석 테이블
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
```

### 2.2 사용자 프로필 정책

```sql
-- ============================================
-- user_profiles RLS 정책
-- ============================================
-- 자신의 프로필 조회
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- 자신의 프로필 업데이트
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 프로필 생성 (회원가입 시)
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 프로필 조회 가능
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_tier = 'admin'
    )
  );
```

### 2.3 키워드 선호도 정책

```sql
-- ============================================
-- user_keyword_preferences RLS 정책
-- ============================================
-- 자신의 선호도만 관리
CREATE POLICY "Users can manage own preferences"
  ON user_keyword_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 익명 통계를 위한 집계 뷰 (개인정보 제외)
CREATE OR REPLACE VIEW public_keyword_stats AS
SELECT
  keyword,
  COUNT(DISTINCT user_id) as user_count,
  AVG(preference_score) as avg_score,
  SUM(selection_count) as total_selections
FROM user_keyword_preferences
GROUP BY keyword;
```

### 2.4 영상 상호작용 정책

```sql
-- ============================================
-- user_video_interactions RLS 정책
-- ============================================
-- 자신의 상호작용 조회
CREATE POLICY "Users can view own interactions"
  ON user_video_interactions FOR SELECT
  USING (auth.uid() = user_id);

-- 상호작용 기록
CREATE POLICY "Users can insert own interactions"
  ON user_video_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 수정 불가 (이력 보존)
-- UPDATE, DELETE 정책 없음
```

### 2.5 검색 세션 정책

```sql
-- ============================================
-- search_sessions RLS 정책
-- ============================================
-- 자신의 검색 기록 조회
CREATE POLICY "Users can view own searches"
  ON search_sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- 검색 기록 생성
CREATE POLICY "Users can create search sessions"
  ON search_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 익명 검색 허용
CREATE POLICY "Anonymous search allowed"
  ON search_sessions FOR INSERT
  WITH CHECK (user_id IS NULL);
```

### 2.6 추천 로그 정책

```sql
-- ============================================
-- recommendation_logs RLS 정책
-- ============================================
-- 자신의 추천 기록만 조회
CREATE POLICY "Users can view own recommendations"
  ON recommendation_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 시스템만 추천 로그 생성 가능
CREATE POLICY "System can insert recommendations"
  ON recommendation_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_tier IN ('system', 'admin')
    )
  );
```

### 2.7 시스템 알림 정책

```sql
-- ============================================
-- system_notifications RLS 정책
-- ============================================
-- 자신의 알림 조회
CREATE POLICY "Users can view own notifications"
  ON system_notifications FOR SELECT
  USING (
    auth.uid() = user_id
    OR (is_global = true AND (
      target_user_tier IS NULL
      OR target_user_tier = (
        SELECT user_tier FROM user_profiles
        WHERE user_id = auth.uid()
      )
    ))
  );

-- 알림 읽음 처리
CREATE POLICY "Users can update own notifications"
  ON system_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 2.8 분석 이벤트 정책

```sql
-- ============================================
-- analytics_events RLS 정책
-- ============================================
-- 이벤트 생성만 허용 (조회 불가)
CREATE POLICY "Users can insert events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 관리자만 조회 가능
CREATE POLICY "Admins can view all events"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_tier = 'admin'
    )
  );
```

### 2.9 서비스 계정 정책

```sql
-- ============================================
-- 서비스 계정을 위한 정책
-- ============================================
-- 서비스 역할 생성
CREATE ROLE service_role;

-- 영상 테이블 접근 권한
GRANT SELECT, INSERT, UPDATE ON videos TO service_role;
GRANT SELECT, INSERT, UPDATE ON video_classifications TO service_role;
GRANT SELECT, INSERT, UPDATE ON keyword_video_mappings TO service_role;
GRANT SELECT, INSERT, UPDATE ON channel_profiles TO service_role;

-- 트렌드 테이블 접근 권한
GRANT SELECT, INSERT, UPDATE ON trend_keywords TO service_role;
GRANT SELECT, INSERT, UPDATE ON trend_video_mappings TO service_role;

-- API 로그 접근 권한
GRANT INSERT ON api_usage_logs TO service_role;
GRANT INSERT ON analytics_events TO service_role;

-- 스케줄 작업 접근 권한
GRANT ALL ON scheduled_tasks TO service_role;
```

---

## 3. 핵심 함수 구현

### 3.1 사용자 관련 함수

```sql
-- ============================================
-- 사용자 활동 업데이트 함수
-- ============================================
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- user_profiles의 last_active_at 업데이트
  UPDATE user_profiles
  SET
    last_active_at = NOW(),
    total_videos_watched = total_videos_watched +
      CASE WHEN NEW.interaction_type = 'view' THEN 1 ELSE 0 END,
    total_watch_time = total_watch_time +
      COALESCE(NEW.watch_duration, 0)
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_activity
  AFTER INSERT ON user_video_interactions
  FOR EACH ROW EXECUTE FUNCTION update_user_activity();

-- ============================================
-- 사용자 티어 업그레이드 함수
-- ============================================
CREATE OR REPLACE FUNCTION check_user_tier_upgrade(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_profile RECORD;
  v_new_tier VARCHAR(20);
BEGIN
  SELECT * INTO v_profile FROM user_profiles WHERE user_id = p_user_id;

  -- 자동 업그레이드 로직 (예시)
  v_new_tier := CASE
    WHEN v_profile.total_videos_watched > 1000
      AND v_profile.total_searches > 500 THEN 'premium'
    WHEN v_profile.total_videos_watched > 100 THEN 'verified'
    ELSE v_profile.user_tier
  END;

  IF v_new_tier != v_profile.user_tier THEN
    UPDATE user_profiles
    SET user_tier = v_new_tier
    WHERE user_id = p_user_id;

    -- 업그레이드 알림 생성
    INSERT INTO system_notifications (
      user_id, notification_type, priority,
      title, message
    ) VALUES (
      p_user_id, 'promotion', 'high',
      '축하합니다! 티어가 업그레이드되었습니다',
      format('회원님의 등급이 %s로 업그레이드되었습니다!', v_new_tier)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 3.2 영상 추천 함수

```sql
-- ============================================
-- 개인화 영상 추천 함수 (핵심)
-- ============================================
CREATE OR REPLACE FUNCTION get_personalized_videos(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_min_quality DECIMAL DEFAULT 0.5
)
RETURNS TABLE(
  video_id VARCHAR(20),
  title TEXT,
  channel_title VARCHAR(255),
  thumbnail_url TEXT,
  duration INTEGER,
  view_count BIGINT,
  quality_score DECIMAL(3,2),
  relevance_score DECIMAL(3,2),
  primary_category VARCHAR(100),
  emotion_tags TEXT[],
  mood_keywords TEXT[],
  recommendation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- 사용자 선호 키워드
  user_preferences AS (
    SELECT
      ukp.keyword,
      ukp.preference_score,
      ukp.associated_emotions,
      ukp.selection_count
    FROM user_keyword_preferences ukp
    WHERE ukp.user_id = p_user_id
      AND ukp.is_blocked = false
    ORDER BY ukp.preference_score DESC
    LIMIT 20
  ),
  -- 최근 시청 영상 (중복 방지)
  recent_watched AS (
    SELECT DISTINCT video_id
    FROM user_video_interactions
    WHERE user_id = p_user_id
      AND interaction_type = 'view'
      AND created_at > NOW() - INTERVAL '7 days'
  ),
  -- 후보 영상 선정
  candidate_videos AS (
    SELECT DISTINCT
      v.video_id,
      v.title,
      v.channel_title,
      v.thumbnail_url,
      v.duration,
      v.view_count,
      v.quality_score,
      AVG(up.preference_score * kvm.relevance_score) as relevance_score,
      vc.primary_category,
      vc.emotion_tags,
      vc.mood_keywords,
      COUNT(DISTINCT up.keyword) as matching_keywords,
      MAX(up.selection_count) as max_selection_count
    FROM videos v
    JOIN keyword_video_mappings kvm ON v.video_id = kvm.video_id
    JOIN user_preferences up ON kvm.keyword = up.keyword
    LEFT JOIN video_classifications vc ON v.video_id = vc.video_id
    LEFT JOIN recent_watched rw ON v.video_id = rw.video_id
    WHERE
      v.is_playable = true
      AND v.is_available_in_kr = true
      AND v.expires_at > NOW()
      AND v.quality_score >= p_min_quality
      AND v.duration <= 60  -- Shorts only
      AND rw.video_id IS NULL  -- 최근 시청 제외
    GROUP BY
      v.video_id, v.title, v.channel_title, v.thumbnail_url,
      v.duration, v.view_count, v.quality_score,
      vc.primary_category, vc.emotion_tags, vc.mood_keywords
  ),
  -- 다양성을 위한 채널별 제한
  ranked_videos AS (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY SUBSTRING(video_id FROM 1 FOR 3)  -- 채널별 그룹핑
        ORDER BY relevance_score DESC, quality_score DESC
      ) as channel_rank
    FROM candidate_videos
  )
  SELECT
    video_id,
    title,
    channel_title,
    thumbnail_url,
    duration,
    view_count,
    quality_score,
    relevance_score,
    primary_category,
    emotion_tags,
    mood_keywords,
    CASE
      WHEN matching_keywords >= 3 THEN '여러 관심사와 일치'
      WHEN max_selection_count >= 10 THEN '자주 선택하신 키워드'
      WHEN relevance_score >= 0.8 THEN '높은 관련성'
      ELSE '추천'
    END as recommendation_reason
  FROM ranked_videos
  WHERE channel_rank <= 3  -- 채널당 최대 3개
  ORDER BY relevance_score DESC, quality_score DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 감정 기반 영상 추천 함수
-- ============================================
CREATE OR REPLACE FUNCTION get_emotion_based_videos(
  p_emotion VARCHAR(50),
  p_intensity VARCHAR(20) DEFAULT 'medium',
  p_limit INTEGER DEFAULT 15,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  video_id VARCHAR(20),
  title TEXT,
  channel_title VARCHAR(255),
  thumbnail_url TEXT,
  duration INTEGER,
  emotion_match_score DECIMAL(3,2),
  mood_keywords TEXT[],
  recommendation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- 감정별 선호 키워드
  emotion_keywords AS (
    SELECT
      unnest(preferred_keywords) as keyword,
      keyword_scores
    FROM emotion_keyword_preferences
    WHERE emotion = p_emotion
      AND emotion_intensity = p_intensity
  ),
  -- 사용자 시청 이력 (있는 경우)
  user_watched AS (
    SELECT video_id
    FROM user_video_interactions
    WHERE user_id = p_user_id
      AND interaction_type = 'view'
      AND created_at > NOW() - INTERVAL '30 days'
  )
  SELECT DISTINCT
    v.video_id,
    v.title,
    v.channel_title,
    v.thumbnail_url,
    v.duration,
    CASE
      WHEN p_emotion = ANY(vc.emotion_tags) THEN 1.0
      WHEN array_length(vc.mood_keywords && ARRAY(SELECT keyword FROM emotion_keywords), 1) > 0 THEN 0.8
      ELSE 0.6
    END as emotion_match_score,
    vc.mood_keywords,
    CASE
      WHEN p_emotion = ANY(vc.emotion_tags) THEN format('%s 감정과 완벽히 일치', p_emotion)
      WHEN array_length(vc.mood_keywords && ARRAY(SELECT keyword FROM emotion_keywords), 1) > 2 THEN '분위기가 잘 맞음'
      ELSE format('%s 감정에 도움이 될 수 있음', p_emotion)
    END as recommendation_reason
  FROM videos v
  JOIN video_classifications vc ON v.video_id = vc.video_id
  JOIN keyword_video_mappings kvm ON v.video_id = kvm.video_id
  JOIN emotion_keywords ek ON kvm.keyword = ek.keyword
  LEFT JOIN user_watched uw ON v.video_id = uw.video_id
  WHERE
    v.is_playable = true
    AND v.is_available_in_kr = true
    AND v.expires_at > NOW()
    AND v.quality_score >= 0.5
    AND (p_user_id IS NULL OR uw.video_id IS NULL)  -- 시청 이력 제외
  ORDER BY emotion_match_score DESC, v.quality_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 트렌드 영상 추천 함수
-- ============================================
CREATE OR REPLACE FUNCTION get_trending_videos(
  p_limit INTEGER DEFAULT 30,
  p_category VARCHAR DEFAULT NULL,
  p_min_quality DECIMAL DEFAULT 0.6
)
RETURNS TABLE(
  video_id VARCHAR(20),
  title TEXT,
  channel_title VARCHAR(255),
  thumbnail_url TEXT,
  duration INTEGER,
  view_count BIGINT,
  trend_keyword VARCHAR(255),
  trend_score DECIMAL(5,2),
  trend_momentum VARCHAR(20),
  combined_score DECIMAL(5,2),
  recommendation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.video_id,
    v.title,
    v.channel_title,
    v.thumbnail_url,
    v.duration,
    v.view_count,
    tk.keyword as trend_keyword,
    tk.trend_score,
    tk.trend_momentum,
    -- 복합 점수: 트렌드 점수 60% + 품질 점수 40%
    (tk.normalized_score * 0.6 + v.quality_score * 0.4) * 100 as combined_score,
    CASE
      WHEN tk.trend_momentum = 'explosive' THEN '🔥 폭발적인 인기'
      WHEN tk.trend_momentum = 'rising' THEN '📈 급상승 중'
      WHEN tk.related_news_count > 5 THEN '📰 화제의 뉴스'
      WHEN v.view_count > 1000000 THEN '👁️ 백만뷰 돌파'
      ELSE '🔥 현재 트렌드'
    END as recommendation_reason
  FROM videos v
  JOIN trend_video_mappings tvm ON v.video_id = tvm.video_id
  JOIN trend_keywords tk ON tvm.trend_keyword_id = tk.id
  WHERE
    tk.is_active = true
    AND tk.expires_at > NOW()
    AND v.is_playable = true
    AND v.is_available_in_kr = true
    AND v.quality_score >= p_min_quality
    AND tvm.channel_quality_passed = true
    AND (p_category IS NULL OR tk.category = p_category)
  ORDER BY combined_score DESC, v.view_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 유사 영상 추천 함수
-- ============================================
CREATE OR REPLACE FUNCTION get_similar_videos(
  p_video_id VARCHAR(20),
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  video_id VARCHAR(20),
  title TEXT,
  channel_title VARCHAR(255),
  thumbnail_url TEXT,
  similarity_score DECIMAL(3,2),
  similarity_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- 원본 영상 정보
  source_video AS (
    SELECT
      v.channel_id,
      vc.primary_category,
      vc.emotion_tags,
      vc.content_type,
      vc.mood_keywords,
      vc.target_audience,
      v.tags
    FROM videos v
    LEFT JOIN video_classifications vc ON v.video_id = vc.video_id
    WHERE v.video_id = p_video_id
  ),
  -- 유사도 계산
  similarity_calc AS (
    SELECT
      v.video_id,
      v.title,
      v.channel_title,
      v.thumbnail_url,
      -- 유사도 점수 계산 (각 요소별 가중치)
      (
        CASE WHEN v.channel_id = sv.channel_id THEN 0.2 ELSE 0 END +  -- 같은 채널
        CASE WHEN vc.primary_category = sv.primary_category THEN 0.25 ELSE 0 END +  -- 같은 카테고리
        CASE WHEN vc.content_type = sv.content_type THEN 0.2 ELSE 0 END +  -- 같은 콘텐츠 유형
        CASE WHEN vc.target_audience = sv.target_audience THEN 0.1 ELSE 0 END +  -- 같은 타겟
        CASE WHEN vc.emotion_tags && sv.emotion_tags THEN 0.15 ELSE 0 END +  -- 감정 겹침
        CASE WHEN vc.mood_keywords && sv.mood_keywords THEN 0.1 ELSE 0 END  -- 무드 겹침
      ) as similarity_score,
      -- 유사한 이유들
      ARRAY_REMOVE(ARRAY[
        CASE WHEN v.channel_id = sv.channel_id THEN '같은 채널' END,
        CASE WHEN vc.primary_category = sv.primary_category THEN format('같은 카테고리: %s', vc.primary_category) END,
        CASE WHEN vc.content_type = sv.content_type THEN format('같은 유형: %s', vc.content_type) END,
        CASE WHEN vc.emotion_tags && sv.emotion_tags THEN '비슷한 감정' END,
        CASE WHEN vc.mood_keywords && sv.mood_keywords THEN '비슷한 분위기' END
      ], NULL) as similarity_reasons
    FROM videos v
    LEFT JOIN video_classifications vc ON v.video_id = vc.video_id
    CROSS JOIN source_video sv
    WHERE
      v.video_id != p_video_id
      AND v.is_playable = true
      AND v.is_available_in_kr = true
      AND v.expires_at > NOW()
      AND v.quality_score >= 0.5
  )
  SELECT
    video_id,
    title,
    channel_title,
    thumbnail_url,
    similarity_score,
    similarity_reasons
  FROM similarity_calc
  WHERE similarity_score > 0.2  -- 최소 유사도
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 데이터 관리 함수

```sql
-- ============================================
-- 만료 데이터 정리 함수
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE(
  table_name TEXT,
  rows_deleted INTEGER,
  execution_time INTERVAL
) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  v_count INTEGER;
BEGIN
  -- 전체 시작 시간
  start_time := clock_timestamp();

  -- 1. 만료된 영상 캐시
  DELETE FROM videos
  WHERE expires_at < NOW()
    AND access_count < 5;  -- 접근 횟수가 적은 것만
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY
  SELECT 'videos'::TEXT, v_count, clock_timestamp() - start_time;

  -- 2. 만료된 트렌드
  DELETE FROM trend_keywords
  WHERE expires_at < NOW()
    AND is_active = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY
  SELECT 'trend_keywords'::TEXT, v_count, clock_timestamp() - start_time;

  -- 3. 오래된 검색 세션 (30일)
  DELETE FROM search_sessions
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY
  SELECT 'search_sessions'::TEXT, v_count, clock_timestamp() - start_time;

  -- 4. 오래된 API 로그 (90일)
  DELETE FROM api_usage_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY
  SELECT 'api_usage_logs'::TEXT, v_count, clock_timestamp() - start_time;

  -- 5. 읽은 알림 (7일)
  DELETE FROM system_notifications
  WHERE is_read = true
    AND read_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY
  SELECT 'system_notifications'::TEXT, v_count, clock_timestamp() - start_time;

  -- 6. 만료된 알림
  DELETE FROM system_notifications
  WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY
  SELECT 'system_notifications_expired'::TEXT, v_count, clock_timestamp() - start_time;

  -- 7. VACUUM 실행
  -- VACUUM ANALYZE;  -- 실제 운영에서는 별도 스케줄로 실행

  end_time := clock_timestamp();

  -- 정리 완료 로그
  INSERT INTO scheduled_tasks (
    task_name, task_type, last_run_at,
    last_run_status, last_run_duration
  ) VALUES (
    'cleanup_expired_data', 'cleanup', NOW(),
    'success', EXTRACT(EPOCH FROM (end_time - start_time))
  )
  ON CONFLICT (task_name) DO UPDATE SET
    last_run_at = NOW(),
    last_run_status = 'success',
    last_run_duration = EXCLUDED.last_run_duration,
    run_count = scheduled_tasks.run_count + 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 선호도 점수 재계산 함수
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_preference_scores(
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE user_keyword_preferences ukp
  SET preference_score = calc.new_score
  FROM (
    SELECT
      id,
      -- 복합 점수 계산
      LEAST(1.0, GREATEST(0.1,
        -- 선택 횟수 (40%)
        (LEAST(1.0, selection_count * 0.02) * 0.4) +
        -- 상호작용 점수 (30%)
        (interaction_score * 0.3) +
        -- 시간 감쇠 (20%)
        ((1.0 / (1.0 + EXTRACT(DAY FROM (NOW() - first_selected_at)) * 0.005)) * 0.2) +
        -- 평균 시청 시간 (10%)
        (CASE
          WHEN avg_watch_duration > 45 THEN 0.1
          WHEN avg_watch_duration > 30 THEN 0.07
          WHEN avg_watch_duration > 15 THEN 0.04
          ELSE 0.01
        END)
      )) as new_score
    FROM user_keyword_preferences
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
      AND is_blocked = false
  ) calc
  WHERE ukp.id = calc.id
    AND ABS(ukp.preference_score - calc.new_score) > 0.01;  -- 의미있는 변화만

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 채널 품질 점수 업데이트 함수
-- ============================================
CREATE OR REPLACE FUNCTION update_channel_quality_scores()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH channel_stats AS (
    SELECT
      c.channel_id,
      COUNT(DISTINCT v.video_id) as video_count,
      AVG(v.quality_score) as avg_video_quality,
      AVG(v.engagement_rate) as avg_engagement,
      STDDEV(v.view_count) as view_consistency,
      MAX(v.published_at) as last_video_date
    FROM channel_profiles c
    JOIN videos v ON c.channel_id = v.channel_id
    WHERE v.published_at > NOW() - INTERVAL '90 days'
    GROUP BY c.channel_id
  )
  UPDATE channel_profiles cp
  SET
    quality_score = LEAST(1.0, GREATEST(0.1,
      -- 평균 영상 품질 (40%)
      (COALESCE(cs.avg_video_quality, 0.5) * 0.4) +
      -- 참여율 (30%)
      (LEAST(1.0, COALESCE(cs.avg_engagement, 0) * 100) * 0.3) +
      -- 일관성 (20%)
      (CASE
        WHEN cs.view_consistency IS NULL THEN 0.1
        WHEN cs.view_consistency < 100000 THEN 0.2
        WHEN cs.view_consistency < 500000 THEN 0.15
        ELSE 0.1
      END) +
      -- 활동성 (10%)
      (CASE
        WHEN cs.last_video_date > NOW() - INTERVAL '7 days' THEN 0.1
        WHEN cs.last_video_date > NOW() - INTERVAL '30 days' THEN 0.07
        ELSE 0.03
      END)
    )),
    content_consistency = CASE
      WHEN cs.view_consistency IS NULL THEN 0.5
      WHEN cs.view_consistency < 100000 THEN 0.9
      WHEN cs.view_consistency < 500000 THEN 0.7
      ELSE 0.5
    END,
    last_updated = NOW()
  FROM channel_stats cs
  WHERE cp.channel_id = cs.channel_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

### 3.4 분석 및 통계 함수

```sql
-- ============================================
-- 일일 통계 집계 함수
-- ============================================
CREATE OR REPLACE FUNCTION calculate_daily_statistics(
  p_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS TABLE(
  stat_name VARCHAR(100),
  stat_value BIGINT,
  stat_detail JSONB
) AS $$
BEGIN
  -- 일일 활성 사용자
  RETURN QUERY
  SELECT
    'daily_active_users'::VARCHAR(100),
    COUNT(DISTINCT user_id)::BIGINT,
    jsonb_build_object(
      'new_users', COUNT(DISTINCT user_id) FILTER (WHERE DATE(created_at) = p_date),
      'returning_users', COUNT(DISTINCT user_id) FILTER (WHERE DATE(created_at) < p_date)
    )
  FROM user_video_interactions
  WHERE DATE(created_at) = p_date;

  -- 일일 영상 시청
  RETURN QUERY
  SELECT
    'daily_video_views'::VARCHAR(100),
    COUNT(*)::BIGINT,
    jsonb_build_object(
      'unique_videos', COUNT(DISTINCT video_id),
      'avg_watch_time', AVG(watch_duration),
      'completion_rate', AVG(completion_rate)
    )
  FROM user_video_interactions
  WHERE DATE(created_at) = p_date
    AND interaction_type = 'view';

  -- 일일 검색
  RETURN QUERY
  SELECT
    'daily_searches'::VARCHAR(100),
    COUNT(*)::BIGINT,
    jsonb_build_object(
      'ai_searches', COUNT(*) FILTER (WHERE ai_enabled = true),
      'avg_results', AVG(results_count),
      'avg_response_time', AVG(response_time)
    )
  FROM search_sessions
  WHERE DATE(created_at) = p_date;

  -- API 사용량
  RETURN QUERY
  SELECT
    'daily_api_usage'::VARCHAR(100),
    SUM(units_consumed)::BIGINT,
    jsonb_object_agg(api_name, total_units)
  FROM (
    SELECT api_name, SUM(units_consumed) as total_units
    FROM api_usage_logs
    WHERE DATE(created_at) = p_date
    GROUP BY api_name
  ) api_stats;

  -- 인기 키워드
  RETURN QUERY
  SELECT
    'daily_top_keywords'::VARCHAR(100),
    COUNT(DISTINCT keyword)::BIGINT,
    jsonb_agg(
      jsonb_build_object('keyword', keyword, 'count', count)
      ORDER BY count DESC
    )
  FROM (
    SELECT keyword, COUNT(*) as count
    FROM user_keyword_preferences
    WHERE DATE(last_selected_at) = p_date
    GROUP BY keyword
    ORDER BY count DESC
    LIMIT 10
  ) top_keywords;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 추천 성과 분석 함수
-- ============================================
CREATE OR REPLACE FUNCTION analyze_recommendation_performance(
  p_start_date DATE DEFAULT CURRENT_DATE - 7,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  recommendation_type VARCHAR(50),
  total_recommendations BIGINT,
  avg_ctr DECIMAL(3,2),
  avg_watch_rate DECIMAL(3,2),
  avg_completion_rate DECIMAL(3,2),
  avg_engagement_score DECIMAL(3,2),
  best_algorithm VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.recommendation_type,
    COUNT(*)::BIGINT as total_recommendations,
    AVG(rl.click_through_rate) as avg_ctr,
    AVG(rl.watch_rate) as avg_watch_rate,
    AVG(rl.completion_rate) as avg_completion_rate,
    AVG(rl.engagement_score) as avg_engagement_score,
    MODE() WITHIN GROUP (ORDER BY rl.recommendation_algorithm) as best_algorithm
  FROM recommendation_logs rl
  WHERE DATE(rl.created_at) BETWEEN p_start_date AND p_end_date
  GROUP BY rl.recommendation_type
  ORDER BY avg_engagement_score DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. 초기 데이터 및 시드

### 4.1 감정-키워드 매핑 데이터

```sql
-- ============================================
-- 감정별 키워드 초기 데이터
-- ============================================
INSERT INTO emotion_keyword_preferences (
  emotion, emotion_intensity, preferred_keywords, keyword_scores,
  confidence_score, data_quality
) VALUES
-- 기쁨/행복 (Happy)
('happy', 'high',
 ARRAY['댄스', '웃긴', '신나는', '파티', '축하', '즐거운', '유쾌한', '코미디'],
 '{"댄스": 0.9, "웃긴": 0.85, "신나는": 0.9, "파티": 0.75, "축하": 0.8, "즐거운": 0.85, "유쾌한": 0.8, "코미디": 0.85}'::jsonb,
 0.90, 'verified'),

('happy', 'medium',
 ARRAY['브이로그', '일상', '맛있는', '친구', '재미있는', '귀여운', '여행'],
 '{"브이로그": 0.7, "일상": 0.65, "맛있는": 0.8, "친구": 0.7, "재미있는": 0.75, "귀여운": 0.7, "여행": 0.75}'::jsonb,
 0.85, 'verified'),

('happy', 'low',
 ARRAY['평화로운', '따뜻한', '미소', '행복', '감사', '소소한'],
 '{"평화로운": 0.65, "따뜻한": 0.7, "미소": 0.65, "행복": 0.7, "감사": 0.68, "소소한": 0.6}'::jsonb,
 0.80, 'high'),

-- 평온/차분 (Calm)
('calm', 'high',
 ARRAY['ASMR', '명상', '자연', '빗소리', '조용한', '수면', '백색소음', '요가'],
 '{"ASMR": 0.95, "명상": 0.9, "자연": 0.85, "빗소리": 0.88, "조용한": 0.82, "수면": 0.9, "백색소음": 0.87, "요가": 0.83}'::jsonb,
 0.92, 'verified'),

('calm', 'medium',
 ARRAY['힐링', '풍경', '음악', '여유', '편안한', '카페', '독서'],
 '{"힐링": 0.8, "풍경": 0.75, "음악": 0.7, "여유": 0.72, "편안한": 0.78, "카페": 0.68, "독서": 0.65}'::jsonb,
 0.88, 'verified'),

-- 흥분/신남 (Excited)
('excited', 'high',
 ARRAY['챌린지', '스포츠', '모험', '익스트림', '경기', '승부', '스릴', '액션'],
 '{"챌린지": 0.9, "스포츠": 0.85, "모험": 0.88, "익스트림": 0.92, "경기": 0.83, "승부": 0.8, "스릴": 0.9, "액션": 0.87}'::jsonb,
 0.90, 'verified'),

('excited', 'medium',
 ARRAY['게임', '대결', '신기한', '놀라운', '도전', '성공', '대박'],
 '{"게임": 0.8, "대결": 0.75, "신기한": 0.78, "놀라운": 0.77, "도전": 0.8, "성공": 0.75, "대박": 0.73}'::jsonb,
 0.85, 'high'),

-- 슬픔/우울 (Sad)
('sad', 'high',
 ARRAY['위로', '희망', '감동', '치유', '따뜻한', '격려', '극복', '응원'],
 '{"위로": 0.9, "희망": 0.85, "감동": 0.88, "치유": 0.87, "따뜻한": 0.82, "격려": 0.83, "극복": 0.8, "응원": 0.85}'::jsonb,
 0.88, 'verified'),

('sad', 'medium',
 ARRAY['음악', '이야기', '추억', '감성', '위안', '공감', '힐링'],
 '{"음악": 0.75, "이야기": 0.8, "추억": 0.77, "감성": 0.79, "위안": 0.82, "공감": 0.8, "힐링": 0.78}'::jsonb,
 0.85, 'high'),

-- 스트레스 (Stressed)
('stressed', 'high',
 ARRAY['ASMR', '명상', '요가', '휴식', '자연', '스트레칭', '심호흡', '마사지'],
 '{"ASMR": 0.95, "명상": 0.92, "요가": 0.88, "휴식": 0.9, "자연": 0.85, "스트레칭": 0.83, "심호흡": 0.85, "마사지": 0.87}'::jsonb,
 0.91, 'verified'),

('stressed', 'medium',
 ARRAY['힐링', '음악', '산책', '평온', '티타임', '반려동물', '취미'],
 '{"힐링": 0.82, "음악": 0.78, "산책": 0.8, "평온": 0.83, "티타임": 0.75, "반려동물": 0.8, "취미": 0.77}'::jsonb,
 0.87, 'high'),

-- 불안 (Anxious)
('anxious', 'high',
 ARRAY['안정', 'ASMR', '명상', '심호흡', '요가', '루틴', '정리', '안심'],
 '{"안정": 0.92, "ASMR": 0.9, "명상": 0.88, "심호흡": 0.85, "요가": 0.87, "루틴": 0.8, "정리": 0.78, "안심": 0.83}'::jsonb,
 0.89, 'verified'),

('anxious', 'medium',
 ARRAY['편안한', '차분한', '조용한', '평화', '일상', '루틴', '정돈'],
 '{"편안한": 0.8, "차분한": 0.82, "조용한": 0.78, "평화": 0.79, "일상": 0.75, "루틴": 0.77, "정돈": 0.73}'::jsonb,
 0.86, 'high'),

-- 화남 (Angry)
('angry', 'high',
 ARRAY['운동', '격렬한', '펀치', '스포츠', '해소', '에너지', '파워', '강렬한'],
 '{"운동": 0.88, "격렬한": 0.85, "펀치": 0.82, "스포츠": 0.86, "해소": 0.83, "에너지": 0.8, "파워": 0.82, "강렬한": 0.84}'::jsonb,
 0.85, 'high'),

('angry', 'medium',
 ARRAY['음악', '댄스', '운동', '게임', '도전', '집중', '몰입'],
 '{"음악": 0.75, "댄스": 0.78, "운동": 0.8, "게임": 0.77, "도전": 0.75, "집중": 0.73, "몰입": 0.72}'::jsonb,
 0.82, 'medium'),

-- 지루함 (Bored)
('bored', 'high',
 ARRAY['신기한', '흥미로운', '새로운', '도전', '모험', '탐험', '발견', '실험'],
 '{"신기한": 0.9, "흥미로운": 0.88, "새로운": 0.85, "도전": 0.82, "모험": 0.83, "탐험": 0.8, "발견": 0.82, "실험": 0.78}'::jsonb,
 0.86, 'high'),

('bored', 'medium',
 ARRAY['재미있는', '웃긴', '게임', '챌린지', '브이로그', '리뷰', 'TMI'],
 '{"재미있는": 0.8, "웃긴": 0.82, "게임": 0.78, "챌린지": 0.8, "브이로그": 0.75, "리뷰": 0.73, "TMI": 0.7}'::jsonb,
 0.83, 'medium'),

-- 영감 (Inspired)
('inspired', 'high',
 ARRAY['동기부여', '성공', '도전', '열정', '꿈', '목표', '성장', '변화'],
 '{"동기부여": 0.92, "성공": 0.88, "도전": 0.85, "열정": 0.87, "꿈": 0.83, "목표": 0.85, "성장": 0.86, "변화": 0.82}'::jsonb,
 0.88, 'verified'),

('inspired', 'medium',
 ARRAY['이야기', '인터뷰', '다큐', '강연', '조언', '경험', '인생'],
 '{"이야기": 0.78, "인터뷰": 0.8, "다큐": 0.82, "강연": 0.85, "조언": 0.77, "경험": 0.79, "인생": 0.8}'::jsonb,
 0.85, 'high'),

-- 향수 (Nostalgic)
('nostalgic', 'high',
 ARRAY['추억', '옛날', '레트로', '90년대', '2000년대', '어린시절', '학창시절', '고전'],
 '{"추억": 0.92, "옛날": 0.88, "레트로": 0.85, "90년대": 0.83, "2000년대": 0.82, "어린시절": 0.87, "학창시절": 0.85, "고전": 0.8}'::jsonb,
 0.87, 'high'),

('nostalgic', 'medium',
 ARRAY['음악', '영화', '게임', '만화', '드라마', '사진', '이야기'],
 '{"음악": 0.8, "영화": 0.78, "게임": 0.75, "만화": 0.77, "드라마": 0.76, "사진": 0.73, "이야기": 0.78}'::jsonb,
 0.84, 'medium')

ON CONFLICT (emotion, emotion_intensity) DO UPDATE SET
  preferred_keywords = EXCLUDED.preferred_keywords,
  keyword_scores = EXCLUDED.keyword_scores,
  confidence_score = EXCLUDED.confidence_score,
  data_quality = EXCLUDED.data_quality,
  updated_at = NOW();
```

### 4.2 기본 스케줄 작업 데이터

```sql
-- ============================================
-- 스케줄 작업 초기 데이터
-- ============================================
INSERT INTO scheduled_tasks (
  task_name, task_type, description,
  cron_expression, timezone, is_active,
  config, retry_policy
) VALUES
-- 일일 키워드 업데이트
('daily_keyword_update', 'keyword_update',
 '인기 키워드 기반 YouTube 영상 수집 및 LLM 분류',
 '0 2 * * *', 'Asia/Seoul', true,
 '{
   "keywords_limit": 100,
   "videos_per_keyword": 10,
   "quality_threshold": 0.5,
   "use_llm": true
 }'::jsonb,
 '{
   "max_retries": 3,
   "retry_delay": 300,
   "backoff_multiplier": 2
 }'::jsonb),

-- 실시간 트렌드 수집
('realtime_trend_collection', 'trend_update',
 'Google Trends 및 뉴스 기반 실시간 트렌드 수집',
 '0 */4 * * *', 'Asia/Seoul', true,
 '{
   "regions": ["KR"],
   "categories": ["all"],
   "news_sources": ["naver", "daum"],
   "min_trend_score": 70
 }'::jsonb,
 '{
   "max_retries": 2,
   "retry_delay": 600
 }'::jsonb),

-- 채널 품질 업데이트
('channel_quality_update', 'quality_check',
 '채널 품질 점수 및 등급 재계산',
 '0 5 * * *', 'Asia/Seoul', true,
 '{
   "batch_size": 1000,
   "update_threshold": 0.01,
   "include_inactive": false
 }'::jsonb,
 '{
   "max_retries": 1,
   "retry_delay": 1800
 }'::jsonb),

-- 데이터 정리
('cleanup_expired_data', 'cleanup',
 '만료된 캐시 및 오래된 로그 데이터 정리',
 '0 3 * * *', 'Asia/Seoul', true,
 '{
   "video_cache_days": 7,
   "search_log_days": 30,
   "api_log_days": 90,
   "notification_days": 7
 }'::jsonb,
 '{
   "max_retries": 1,
   "retry_delay": 3600
 }'::jsonb),

-- 추천 성과 분석
('recommendation_performance_analysis', 'analytics',
 '추천 알고리즘 성과 분석 및 최적화',
 '0 6 * * *', 'Asia/Seoul', true,
 '{
   "analysis_period": 7,
   "min_sample_size": 100,
   "export_report": true
 }'::jsonb,
 '{
   "max_retries": 2,
   "retry_delay": 900
 }'::jsonb),

-- 사용자 선호도 재계산
('user_preference_recalculation', 'analytics',
 '사용자 키워드 선호도 점수 재계산',
 '0 4 * * 0', 'Asia/Seoul', true,  -- 매주 일요일
 '{
   "batch_size": 10000,
   "recalc_threshold": 0.01,
   "include_inactive_users": false
 }'::jsonb,
 '{
   "max_retries": 2,
   "retry_delay": 1200
 }'::jsonb),

-- API 쿼터 리셋 알림
('api_quota_reset_notification', 'notification',
 'YouTube API 일일 쿼터 리셋 알림',
 '0 9 * * *', 'Asia/Seoul', true,  -- 한국 시간 오전 9시 (PST 자정)
 '{
   "notification_channels": ["email", "slack"],
   "include_usage_summary": true
 }'::jsonb,
 '{
   "max_retries": 1,
   "retry_delay": 300
 }'::jsonb),

-- 주간 백업
('weekly_backup', 'backup',
 '주요 테이블 주간 백업',
 '0 1 * * 0', 'Asia/Seoul', true,  -- 매주 일요일 새벽 1시
 '{
   "tables": ["user_profiles", "user_keyword_preferences", "videos", "video_classifications"],
   "storage": "s3",
   "retention_days": 30
 }'::jsonb,
 '{
   "max_retries": 3,
   "retry_delay": 1800,
   "backoff_multiplier": 2
 }'::jsonb)

ON CONFLICT (task_name) DO UPDATE SET
  description = EXCLUDED.description,
  cron_expression = EXCLUDED.cron_expression,
  config = EXCLUDED.config,
  updated_at = NOW();
```

### 4.3 시스템 초기 설정

```sql
-- ============================================
-- 시스템 초기 설정
-- ============================================
-- 기본 카테고리 매핑
CREATE TABLE IF NOT EXISTS category_mappings (
  youtube_category_id VARCHAR(10) PRIMARY KEY,
  category_name VARCHAR(100),
  internal_category VARCHAR(100),
  is_active BOOLEAN DEFAULT true
);

INSERT INTO category_mappings (youtube_category_id, category_name, internal_category) VALUES
('1', 'Film & Animation', '영화/애니메이션'),
('2', 'Autos & Vehicles', '자동차'),
('10', 'Music', '음악'),
('15', 'Pets & Animals', '동물'),
('17', 'Sports', '스포츠'),
('19', 'Travel & Events', '여행'),
('20', 'Gaming', '게임'),
('22', 'People & Blogs', '일상/브이로그'),
('23', 'Comedy', '코미디'),
('24', 'Entertainment', '엔터테인먼트'),
('25', 'News & Politics', '뉴스/정치'),
('26', 'Howto & Style', '하우투/스타일'),
('27', 'Education', '교육'),
('28', 'Science & Technology', '과학/기술');

-- 기본 품질 등급 기준
CREATE TABLE IF NOT EXISTS quality_grade_criteria (
  grade VARCHAR(2) PRIMARY KEY,
  min_score DECIMAL(3,2),
  description TEXT
);

INSERT INTO quality_grade_criteria (grade, min_score, description) VALUES
('S', 0.90, '최상위 품질 - 매우 높은 참여도와 품질'),
('A', 0.80, '우수 품질 - 높은 참여도와 좋은 콘텐츠'),
('B', 0.70, '양호 품질 - 평균 이상의 콘텐츠'),
('C', 0.60, '보통 품질 - 기본 기준 충족'),
('D', 0.50, '낮은 품질 - 개선 필요'),
('F', 0.00, '매우 낮은 품질 - 필터링 대상');
```

### 4.4 테스트 데이터 (개발 환경용)

```sql
-- ============================================
-- 테스트 데이터 (개발 환경에서만 실행)
-- ============================================
-- 테스트 사용자 생성
DO $$
BEGIN
  IF current_database() LIKE '%dev%' OR current_database() LIKE '%test%' THEN
    -- 테스트 사용자
    INSERT INTO user_profiles (
      user_id, display_name, user_tier,
      total_searches, ai_searches_used, ai_searches_limit
    ) VALUES
    ('11111111-1111-1111-1111-111111111111', '테스트유저1', 'free', 50, 5, 10),
    ('22222222-2222-2222-2222-222222222222', '프리미엄테스터', 'premium', 200, 45, 50),
    ('33333333-3333-3333-3333-333333333333', '프로테스터', 'pro', 500, 95, 100);

    -- 테스트 키워드 선호도
    INSERT INTO user_keyword_preferences (
      user_id, keyword, selection_count, preference_score
    ) VALUES
    ('11111111-1111-1111-1111-111111111111', '게임', 25, 0.85),
    ('11111111-1111-1111-1111-111111111111', '요리', 15, 0.72),
    ('11111111-1111-1111-1111-111111111111', 'ASMR', 10, 0.65);

    -- 테스트 영상
    INSERT INTO videos (
      video_id, title, channel_id, channel_title,
      duration, view_count, quality_score
    ) VALUES
    ('TEST_VIDEO_001', '테스트 게임 영상', 'TEST_CHANNEL_01', '테스트 게임 채널', 45, 50000, 0.82),
    ('TEST_VIDEO_002', '테스트 요리 영상', 'TEST_CHANNEL_02', '테스트 요리 채널', 58, 30000, 0.75),
    ('TEST_VIDEO_003', '테스트 ASMR 영상', 'TEST_CHANNEL_03', '테스트 ASMR 채널', 55, 80000, 0.88);

    RAISE NOTICE '테스트 데이터 생성 완료';
  END IF;
END $$;
```

### 4.5 파티션 자동 생성 설정

```sql
-- ============================================
-- 파티션 자동 생성 함수 및 스케줄
-- ============================================
-- 월별 파티션 자동 생성 함수
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
  table_name text;
BEGIN
  -- 다음 달 파티션 미리 생성
  start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
  end_date := start_date + interval '1 month';

  -- analytics_events 파티션
  partition_name := 'analytics_events_' || to_char(start_date, 'YYYY_MM');
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF analytics_events FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;

  -- recommendation_logs 파티션
  partition_name := 'recommendation_logs_' || to_char(start_date, 'YYYY_MM');
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF recommendation_logs FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;

  -- user_video_interactions 파티션
  partition_name := 'user_video_interactions_' || to_char(start_date, 'YYYY_MM');
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF user_video_interactions FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;

  -- search_sessions 파티션
  partition_name := 'search_sessions_' || to_char(start_date, 'YYYY_MM');
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF search_sessions FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;

  -- api_usage_logs 파티션
  partition_name := 'api_usage_logs_' || to_char(start_date, 'YYYY_MM');
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF api_usage_logs FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 파티션 생성 스케줄 작업 추가
INSERT INTO scheduled_tasks (
  task_name, task_type, description,
  cron_expression, is_active, config
) VALUES (
  'create_monthly_partitions', 'maintenance',
  '다음 달 파티션 테이블 자동 생성',
  '0 0 25 * *', true,  -- 매월 25일
  '{"tables": ["analytics_events", "recommendation_logs", "user_video_interactions", "search_sessions", "api_usage_logs"]}'::jsonb
) ON CONFLICT (task_name) DO NOTHING;

-- 즉시 실행하여 다음 달 파티션 생성
SELECT create_monthly_partitions();
```

---

## 📌 완료 사항

### ✅ Part 4 구현 완료

1. **인덱스 전략**

   - 도메인별 최적화된 인덱스 생성
   - 복합 인덱스 및 부분 인덱스 활용
   - GIN 인덱스로 배열/JSONB 검색 최적화

2. **RLS 정책**

   - 사용자 데이터 보안 정책 구현
   - 역할별 접근 권한 분리
   - 서비스 계정 권한 설정

3. **핵심 함수**

   - 개인화 추천 함수
   - 감정 기반 추천 함수
   - 트렌드 추천 함수
   - 데이터 관리 및 분석 함수

4. **초기 데이터**
   - 감정-키워드 매핑 (15개 감정, 각 2단계)
   - 스케줄 작업 설정 (8개)
   - 시스템 초기 설정
   - 파티션 자동 생성

## 📌 다음 단계

**Part 5: Service Layer 구현**에서는:

1. **VideoService**

   - 영상 수집 및 저장
   - LLM 분류 처리
   - 품질 평가

2. **UserService**

   - 사용자 프로필 관리
   - 선호도 추적
   - 활동 기록

3. **TrendService**

   - 트렌드 수집
   - 키워드 정제
   - 영상 매핑

4. **RecommendationService**

   - 추천 알고리즘
   - 성과 추적
   - A/B 테스트

5. **AnalyticsService**
   - 통계 집계
   - 리포트 생성
   - 인사이트 도출

을 다룰 예정입니다.
