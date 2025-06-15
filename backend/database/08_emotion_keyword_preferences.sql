-- =============================================================================
-- 08_emotion_keyword_preferences.sql
-- 감정별 키워드 선호도 관리 시스템 (natural-language-extractor.js 연동)
-- 
-- 기능: 유사 감정 사용자들의 키워드 선호도 분석 및 개인화 추천
-- 연동: natural-language-extractor.js → getSimilarEmotionPreferences()
-- 목적: Claude API 개인화 큐레이션을 위한 감정-키워드 매칭 데이터
-- =============================================================================

-- 기존 테이블 제거 (완전 교체)
DROP TABLE IF EXISTS emotion_keyword_stats CASCADE;
DROP TABLE IF EXISTS emotion_keyword_preferences CASCADE;
DROP TABLE IF EXISTS user_emotion_logs CASCADE;

-- =============================================================================
-- 👤 1. user_emotion_logs 테이블 (사용자 감정 상태 기록)
-- =============================================================================

CREATE TABLE user_emotion_logs (
  -- 기본 식별자
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 사용자 연결
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- =============================================================================
  -- 😊 감정 분석 결과 (natural-language-extractor.js 분석 결과)
  -- =============================================================================
  emotion_state varchar(50) NOT NULL,              -- "피곤함", "스트레스", "기쁨", "우울함" 등
  emotion_intensity integer CHECK (emotion_intensity BETWEEN 1 AND 10), -- 감정 강도 1-10
  emotional_need varchar(100),                     -- "휴식", "즐거움", "위로", "자극" 등
  context_description text,                        -- "퇴근 후", "주말 오후", "스트레스 상황" 등
  
  -- =============================================================================
  -- 📝 원본 데이터
  -- =============================================================================
  input_text text NOT NULL,                        -- 사용자 원본 입력 ("퇴근하고 와서 피곤해")
  input_type varchar(20) NOT NULL                  -- 'emotion', 'topic'
    CHECK (input_type IN ('emotion', 'topic')),
  
  -- =============================================================================
  -- 🤖 AI 분석 메타데이터
  -- =============================================================================
  detected_by varchar(30) DEFAULT 'claude_api'     -- 'claude_api', 'keyword_match', 'manual'
    CHECK (detected_by IN ('claude_api', 'keyword_match', 'manual', 'fallback')),
  confidence_score decimal(3,2) DEFAULT 0.8        -- 0.0-1.0 AI 분석 신뢰도
    CHECK (confidence_score BETWEEN 0.0 AND 1.0),
  
  -- AI 응답 원본 (디버깅용)
  ai_response_raw jsonb DEFAULT '{}',               -- Claude 원본 응답
  analysis_metadata jsonb DEFAULT '{}',            -- 추가 분석 정보
  
  -- =============================================================================
  -- 📱 세션 및 컨텍스트
  -- =============================================================================
  session_id varchar(100),                         -- 세션 ID (동일 세션 내 연관성 추적)
  extraction_version varchar(10) DEFAULT '3.2',    -- extractor 버전
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 📊 user_emotion_logs 인덱스
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_emotion_logs_user_id ON user_emotion_logs(user_id);
CREATE INDEX idx_emotion_logs_emotion_state ON user_emotion_logs(emotion_state);
CREATE INDEX idx_emotion_logs_created_at ON user_emotion_logs(created_at DESC);

-- 감정별 분석 인덱스
CREATE INDEX idx_emotion_logs_state_confidence 
  ON user_emotion_logs(emotion_state, confidence_score DESC) 
  WHERE confidence_score >= 0.7;

-- 세션 추적 인덱스
CREATE INDEX idx_emotion_logs_session ON user_emotion_logs(session_id) WHERE session_id IS NOT NULL;

-- 사용자별 최근 감정 분석
CREATE INDEX idx_emotion_logs_user_recent 
  ON user_emotion_logs(user_id, created_at DESC);

-- 입력 타입별 인덱스
CREATE INDEX idx_emotion_logs_input_type ON user_emotion_logs(input_type);

-- =============================================================================
-- 🏷️ 2. emotion_keyword_preferences 테이블 (감정별 키워드 선택 기록)
-- =============================================================================

CREATE TABLE emotion_keyword_preferences (
  -- 기본 식별자
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 관련 테이블 연결
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  emotion_log_id uuid REFERENCES user_emotion_logs(id) ON DELETE CASCADE NOT NULL,
  
  -- =============================================================================
  -- 🔑 키워드 선택 정보 (natural-language-extractor.js 결과)
  -- =============================================================================
  selected_keyword varchar(255) NOT NULL,          -- 사용자가 선택한 키워드 ("힐링", "ASMR" 등)
  search_term varchar(255),                        -- 실제 검색한 복합어 ("잔잔한 로파이", "우중 캠핑")
  curation_sentence text,                          -- 선택한 감성 문장 ("하루의 피로를 자연스럽게...")
  
  -- =============================================================================
  -- 📊 사용자 피드백 (만족도 추적)
  -- =============================================================================
  interaction_type varchar(20) DEFAULT 'selected'  -- 'selected', 'searched', 'liked', 'shared'
    CHECK (interaction_type IN ('selected', 'searched', 'liked', 'shared', 'skipped', 'disliked')),
  satisfaction_score integer                       -- 1-5 만족도 (선택적)
    CHECK (satisfaction_score IS NULL OR satisfaction_score BETWEEN 1 AND 5),
  
  -- 사용자 행동 추적
  time_spent_seconds integer,                      -- 키워드 선택까지 소요 시간
  video_watched_count integer DEFAULT 0,           -- 해당 키워드로 시청한 영상 수
  session_duration_minutes integer,                -- 해당 세션 총 지속 시간
  
  -- =============================================================================
  -- 🎯 개인화 점수 (학습용)
  -- =============================================================================
  emotion_match_score decimal(3,2),                -- 감정 매칭 점수 (0.0-1.0)
  keyword_relevance_score decimal(3,2),            -- 키워드 관련성 점수 (0.0-1.0)
  personalization_score decimal(3,2),              -- 개인화 적합도 (0.0-1.0)
  
  -- =============================================================================
  -- 📱 선택 컨텍스트
  -- =============================================================================
  selection_context jsonb DEFAULT '{}',            -- 선택 당시 컨텍스트 (시간대, 기기 등)
  extractor_version varchar(10) DEFAULT '3.2',     -- 추출기 버전
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 📊 emotion_keyword_preferences 인덱스
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_emotion_prefs_user_id ON emotion_keyword_preferences(user_id);
CREATE INDEX idx_emotion_prefs_emotion_log ON emotion_keyword_preferences(emotion_log_id);
CREATE INDEX idx_emotion_prefs_keyword ON emotion_keyword_preferences(selected_keyword);

-- 감정-키워드 매칭 분석 (핵심!)
CREATE INDEX idx_emotion_prefs_emotion_keyword 
  ON emotion_keyword_preferences(emotion_log_id, selected_keyword);

-- 만족도 높은 선택 조회
CREATE INDEX idx_emotion_prefs_satisfaction 
  ON emotion_keyword_preferences(satisfaction_score DESC, created_at DESC) 
  WHERE satisfaction_score IS NOT NULL AND satisfaction_score >= 4;

-- 상호작용 타입별 분석
CREATE INDEX idx_emotion_prefs_interaction 
  ON emotion_keyword_preferences(interaction_type, created_at DESC);

-- 개인화 점수별 조회
CREATE INDEX idx_emotion_prefs_personalization 
  ON emotion_keyword_preferences(personalization_score DESC) 
  WHERE personalization_score IS NOT NULL;

-- =============================================================================
-- 📈 3. emotion_keyword_stats 테이블 (감정별 키워드 통계 - 집계 테이블)
-- =============================================================================

CREATE TABLE emotion_keyword_stats (
  -- 기본 식별자
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- =============================================================================
  -- 🔑 감정-키워드 조합 (고유 키)
  -- =============================================================================
  emotion_state varchar(50) NOT NULL,              -- "피곤함", "스트레스", "기쁨" 등
  keyword varchar(255) NOT NULL,                   -- "힐링", "ASMR", "피아노" 등
  
  -- =============================================================================
  -- 📊 통계 지표 (natural-language-extractor.js에서 사용)
  -- =============================================================================
  selection_count integer DEFAULT 0,               -- 총 선택된 횟수
  unique_users_count integer DEFAULT 0,            -- 선택한 고유 사용자 수
  
  -- 만족도 통계
  avg_satisfaction decimal(3,2),                   -- 평균 만족도 (1.0-5.0)
  high_satisfaction_count integer DEFAULT 0,       -- 4점 이상 만족도 개수
  
  -- 개인화 효과성
  avg_personalization_score decimal(3,2),          -- 평균 개인화 점수
  avg_emotion_match_score decimal(3,2),            -- 평균 감정 매칭 점수
  
  -- =============================================================================
  -- 🎯 인기도 및 추천 점수 (핵심 지표!)
  -- =============================================================================
  popularity_score decimal(5,2) DEFAULT 0.0,       -- 종합 인기도 점수 (0-100)
  recommendation_weight decimal(3,2) DEFAULT 0.5,  -- 추천 가중치 (0.0-1.0)
  confidence_level decimal(3,2) DEFAULT 0.5,       -- 통계 신뢰도 (표본 수 기반)
  
  -- =============================================================================
  -- 📅 기간별 통계
  -- =============================================================================
  last_7days_count integer DEFAULT 0,              -- 최근 7일 선택 횟수
  last_30days_count integer DEFAULT 0,             -- 최근 30일 선택 횟수
  
  -- =============================================================================
  -- 🔄 업데이트 관리
  -- =============================================================================
  last_calculated_at timestamptz DEFAULT now(),    -- 마지막 계산 시간
  next_update_due timestamptz,                     -- 다음 업데이트 예정 시간
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- 고유 제약 조건
  UNIQUE(emotion_state, keyword)
);

-- =============================================================================
-- 📊 emotion_keyword_stats 인덱스
-- =============================================================================

-- 고유 키 (이미 UNIQUE 제약조건으로 생성됨)
-- CREATE UNIQUE INDEX idx_emotion_stats_unique ON emotion_keyword_stats(emotion_state, keyword);

-- 인기도 랭킹 조회 (가장 중요!)
CREATE INDEX idx_emotion_stats_popularity 
  ON emotion_keyword_stats(emotion_state, popularity_score DESC, recommendation_weight DESC);

-- 신뢰도 높은 통계만 조회
CREATE INDEX idx_emotion_stats_confidence 
  ON emotion_keyword_stats(confidence_level DESC, selection_count DESC) 
  WHERE selection_count >= 3;

-- 최근 업데이트된 통계
CREATE INDEX idx_emotion_stats_recent 
  ON emotion_keyword_stats(last_calculated_at DESC);

-- 업데이트가 필요한 통계
CREATE INDEX idx_emotion_stats_update_due 
  ON emotion_keyword_stats(next_update_due);

-- =============================================================================
-- 🔄 자동 업데이트 트리거
-- =============================================================================

-- updated_at 자동 업데이트 함수 (기존 함수 재사용)
CREATE TRIGGER update_emotion_logs_updated_at
  BEFORE UPDATE ON user_emotion_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emotion_stats_updated_at
  BEFORE UPDATE ON emotion_keyword_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 📊 핵심 뷰 (Views) - natural-language-extractor.js 직접 사용
-- =============================================================================

-- 1. 감정별 인기 키워드 TOP 랭킹 뷰 (핵심!)
CREATE VIEW emotion_top_keywords AS
SELECT 
  emotion_state,
  keyword,
  popularity_score,
  selection_count,
  unique_users_count,
  avg_satisfaction,
  confidence_level,
  recommendation_weight,
  -- natural-language-extractor.js 호환 점수
  ROUND(recommendation_weight * 100, 0) as extractor_score
FROM emotion_keyword_stats 
WHERE 
  selection_count >= 3                    -- 최소 3번 이상 선택
  AND confidence_level >= 0.6             -- 신뢰도 60% 이상
  AND popularity_score > 0                -- 인기도 점수 존재
ORDER BY 
  emotion_state, 
  popularity_score DESC, 
  recommendation_weight DESC;

-- 2. 실시간 감정-키워드 매칭 뷰
CREATE VIEW realtime_emotion_preferences AS
SELECT 
  el.emotion_state,
  ekp.selected_keyword,
  COUNT(*) as recent_selections,
  AVG(ekp.satisfaction_score) as avg_satisfaction,
  AVG(ekp.personalization_score) as avg_personalization,
  MAX(ekp.created_at) as last_selected_at
FROM user_emotion_logs el
JOIN emotion_keyword_preferences ekp ON el.id = ekp.emotion_log_id
WHERE 
  el.created_at >= (now() - interval '7 days')   -- 최근 7일
  AND el.confidence_score >= 0.7                 -- 신뢰도 높은 감정 분석만
GROUP BY el.emotion_state, ekp.selected_keyword
HAVING COUNT(*) >= 2                            -- 최소 2회 이상 선택
ORDER BY el.emotion_state, recent_selections DESC;

-- 3. 사용자별 감정 히스토리 뷰
CREATE VIEW user_emotion_history AS
SELECT 
  el.user_id,
  el.emotion_state,
  COUNT(*) as emotion_frequency,
  AVG(el.confidence_score) as avg_confidence,
  array_agg(DISTINCT ekp.selected_keyword) as preferred_keywords,
  MAX(el.created_at) as last_emotion_at
FROM user_emotion_logs el
LEFT JOIN emotion_keyword_preferences ekp ON el.id = ekp.emotion_log_id
WHERE el.created_at >= (now() - interval '30 days')  -- 최근 30일
GROUP BY el.user_id, el.emotion_state
ORDER BY el.user_id, emotion_frequency DESC;

-- =============================================================================
-- 🛠️ 핵심 관리 함수들 (natural-language-extractor.js 연동)
-- =============================================================================

-- 1. 감정별 인기 키워드 조회 함수 (getSimilarEmotionPreferences 구현!)
CREATE OR REPLACE FUNCTION get_emotion_keywords(
  target_emotion varchar(50),
  limit_count integer DEFAULT 10
) RETURNS TABLE(
  keyword varchar(255),
  score decimal(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eks.keyword,
    eks.recommendation_weight as score
  FROM emotion_keyword_stats eks
  WHERE 
    eks.emotion_state = target_emotion
    AND eks.selection_count >= 3
    AND eks.confidence_level >= 0.6
  ORDER BY 
    eks.popularity_score DESC,
    eks.recommendation_weight DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 2. 감정 로그 기록 함수 (extractor에서 호출)
CREATE OR REPLACE FUNCTION log_user_emotion(
  p_user_id uuid,
  p_emotion_state varchar(50),
  p_input_text text,
  p_input_type varchar(20),
  p_confidence_score decimal(3,2) DEFAULT 0.8,
  p_emotional_need varchar(100) DEFAULT NULL,
  p_context_description text DEFAULT NULL,
  p_session_id varchar(100) DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  emotion_log_id uuid;
BEGIN
  INSERT INTO user_emotion_logs (
    user_id, emotion_state, input_text, input_type,
    confidence_score, emotional_need, context_description, session_id
  ) VALUES (
    p_user_id, p_emotion_state, p_input_text, p_input_type,
    p_confidence_score, p_emotional_need, p_context_description, p_session_id
  ) RETURNING id INTO emotion_log_id;
  
  RETURN emotion_log_id;
END;
$$ LANGUAGE plpgsql;

-- 3. 키워드 선택 기록 함수
CREATE OR REPLACE FUNCTION record_keyword_selection(
  p_user_id uuid,
  p_emotion_log_id uuid,
  p_selected_keyword varchar(255),
  p_search_term varchar(255) DEFAULT NULL,
  p_satisfaction_score integer DEFAULT NULL,
  p_interaction_type varchar(20) DEFAULT 'selected'
) RETURNS uuid AS $$
DECLARE
  preference_id uuid;
BEGIN
  -- 선택 기록 저장
  INSERT INTO emotion_keyword_preferences (
    user_id, emotion_log_id, selected_keyword, search_term,
    satisfaction_score, interaction_type
  ) VALUES (
    p_user_id, p_emotion_log_id, p_selected_keyword, p_search_term,
    p_satisfaction_score, p_interaction_type
  ) RETURNING id INTO preference_id;
  
  -- 통계 테이블 업데이트 (비동기 처리 권장)
  PERFORM update_emotion_keyword_stats(
    (SELECT emotion_state FROM user_emotion_logs WHERE id = p_emotion_log_id),
    p_selected_keyword
  );
  
  RETURN preference_id;
END;
$$ LANGUAGE plpgsql;

-- 4. 감정-키워드 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_emotion_keyword_stats(
  p_emotion_state varchar(50),
  p_keyword varchar(255)
) RETURNS void AS $$
DECLARE
  current_stats RECORD;
  new_popularity_score decimal(5,2);
  new_confidence decimal(3,2);
BEGIN
  -- 현재 통계 계산
  SELECT 
    COUNT(*) as total_selections,
    COUNT(DISTINCT ekp.user_id) as unique_users,
    AVG(ekp.satisfaction_score) as avg_satisfaction,
    AVG(ekp.personalization_score) as avg_personalization,
    COUNT(*) FILTER (WHERE ekp.created_at >= now() - interval '7 days') as recent_7d,
    COUNT(*) FILTER (WHERE ekp.created_at >= now() - interval '30 days') as recent_30d
  INTO current_stats
  FROM emotion_keyword_preferences ekp
  JOIN user_emotion_logs el ON ekp.emotion_log_id = el.id
  WHERE el.emotion_state = p_emotion_state 
    AND ekp.selected_keyword = p_keyword;
  
  -- 인기도 점수 계산 (0-100)
  new_popularity_score := LEAST(100, 
    (current_stats.total_selections * 10) + 
    (current_stats.unique_users * 20) + 
    (COALESCE(current_stats.avg_satisfaction, 3) * 10) +
    (current_stats.recent_7d * 5)
  );
  
  -- 신뢰도 계산 (표본 수 기반)
  new_confidence := LEAST(1.0, 
    GREATEST(0.1, current_stats.total_selections / 10.0)
  );
  
  -- UPSERT 처리
  INSERT INTO emotion_keyword_stats (
    emotion_state, keyword, selection_count, unique_users_count,
    avg_satisfaction, avg_personalization_score,
    popularity_score, confidence_level,
    last_7days_count, last_30days_count,
    recommendation_weight, last_calculated_at, next_update_due
  ) VALUES (
    p_emotion_state, p_keyword, current_stats.total_selections, current_stats.unique_users,
    current_stats.avg_satisfaction, current_stats.avg_personalization,
    new_popularity_score, new_confidence,
    current_stats.recent_7d, current_stats.recent_30d,
    LEAST(1.0, new_popularity_score / 100.0), now(), now() + interval '1 hour'
  )
  ON CONFLICT (emotion_state, keyword) 
  DO UPDATE SET
    selection_count = current_stats.total_selections,
    unique_users_count = current_stats.unique_users,
    avg_satisfaction = current_stats.avg_satisfaction,
    avg_personalization_score = current_stats.avg_personalization,
    popularity_score = new_popularity_score,
    confidence_level = new_confidence,
    last_7days_count = current_stats.recent_7d,
    last_30days_count = current_stats.recent_30d,
    recommendation_weight = LEAST(1.0, new_popularity_score / 100.0),
    last_calculated_at = now(),
    next_update_due = now() + interval '1 hour',
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- 5. 모든 통계 재계산 함수 (관리자용)
CREATE OR REPLACE FUNCTION recalculate_all_emotion_stats()
RETURNS integer AS $$
DECLARE
  stats_record RECORD;
  updated_count integer := 0;
BEGIN
  -- 모든 감정-키워드 조합에 대해 통계 재계산
  FOR stats_record IN
    SELECT DISTINCT el.emotion_state, ekp.selected_keyword
    FROM user_emotion_logs el
    JOIN emotion_keyword_preferences ekp ON el.id = ekp.emotion_log_id
  LOOP
    PERFORM update_emotion_keyword_stats(
      stats_record.emotion_state, 
      stats_record.selected_keyword
    );
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 🧹 정리 및 유지보수 함수들
-- =============================================================================

-- 오래된 로그 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_emotion_logs()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- 6개월 이상 된 감정 로그 삭제 (연관된 preferences도 CASCADE로 삭제됨)
  DELETE FROM user_emotion_logs 
  WHERE created_at < (now() - interval '6 months');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- 통계 테이블에서 데이터가 없는 항목 정리
  DELETE FROM emotion_keyword_stats
  WHERE selection_count = 0 OR last_calculated_at < (now() - interval '7 days');
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 📊 테이블 코멘트
-- =============================================================================

COMMENT ON TABLE user_emotion_logs IS 'natural-language-extractor.js 감정 분석 결과 저장';
COMMENT ON COLUMN user_emotion_logs.emotion_state IS '감정 상태 (피곤함, 스트레스, 기쁨 등)';
COMMENT ON COLUMN user_emotion_logs.confidence_score IS 'AI 분석 신뢰도 (0.0-1.0)';

COMMENT ON TABLE emotion_keyword_preferences IS '감정별 키워드 선택 기록 - 개인화 학습용';
COMMENT ON COLUMN emotion_keyword_preferences.selected_keyword IS '사용자가 선택한 키워드';

COMMENT ON TABLE emotion_keyword_stats IS 'getSimilarEmotionPreferences() 함수용 집계 테이블';
COMMENT ON COLUMN emotion_keyword_stats.popularity_score IS '종합 인기도 점수 (0-100)';
COMMENT ON COLUMN emotion_keyword_stats.recommendation_weight IS 'extractor.js용 추천 가중치 (0.0-1.0)';

-- =============================================================================
-- ✅ 생성 완료 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 ===== 08_emotion_keyword_preferences.sql 완료! =====';
  RAISE NOTICE '🤖 natural-language-extractor.js 연동 준비 완료';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 핵심 구성:';
  RAISE NOTICE '   1. user_emotion_logs 테이블 (감정 분석 결과 저장)';
  RAISE NOTICE '   2. emotion_keyword_preferences 테이블 (키워드 선택 기록)';
  RAISE NOTICE '   3. emotion_keyword_stats 테이블 (감정별 키워드 통계)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 주요 함수:';
  RAISE NOTICE '   - get_emotion_keywords(): getSimilarEmotionPreferences 구현';
  RAISE NOTICE '   - log_user_emotion(): 감정 분석 결과 기록';
  RAISE NOTICE '   - record_keyword_selection(): 키워드 선택 기록';
  RAISE NOTICE '   - update_emotion_keyword_stats(): 통계 자동 업데이트';
  RAISE NOTICE '';
  RAISE NOTICE '📊 주요 뷰:';
  RAISE NOTICE '   - emotion_top_keywords: 감정별 인기 키워드 랭킹';
  RAISE NOTICE '   - realtime_emotion_preferences: 실시간 선호도';
  RAISE NOTICE '   - user_emotion_history: 사용자별 감정 히스토리';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 다음 단계:';
  RAISE NOTICE '   1. Supabase SQL Editor에서 실행';
  RAISE NOTICE '   2. emotionService.js 모듈 생성';
  RAISE NOTICE '   3. natural-language-extractor.js Mock 데이터 교체';
  RAISE NOTICE '   4. 초기 데이터 삽입 및 테스트';
  RAISE NOTICE '';
  RAISE NOTICE '🎨 getSimilarEmotionPreferences 사용 예시:';
  RAISE NOTICE '   SELECT * FROM get_emotion_keywords(''피곤함'', 5);';
  RAISE NOTICE '   → [{"keyword":"힐링","score":0.95}, {"keyword":"ASMR","score":0.89}, ...]';
END $$; 