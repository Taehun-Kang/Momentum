-- =============================================================================
-- 04_search_logs.sql
-- 검색 로그 테이블 (YouTube Shorts AI 큐레이션 서비스)
-- 
-- 기능: 사용자 검색 행동 추적 + API 사용량 추적 + 실시간 트렌드 분석
-- 통합: realtime-keyword-search.js + youtube-search-engine.js + 인기 키워드 분석
-- =============================================================================

-- 1. search_logs 메인 테이블 생성
CREATE TABLE search_logs (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- =============================================================================
  -- 👤 사용자 및 세션 정보
  -- =============================================================================
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- 사용자 ID (익명 허용)
  session_id varchar(100),                    -- 검색 세션 ID
  guest_fingerprint text,                     -- 익명 사용자 핑거프린트
  
  -- =============================================================================
  -- 🔍 검색 쿼리 정보
  -- =============================================================================
  search_query text NOT NULL,                 -- 검색 키워드
  original_query text,                        -- 원본 쿼리 (수정 전)
  normalized_query text,                      -- 정규화된 쿼리
  
  -- 검색 타입 (확장된 옵션)
  search_type text DEFAULT 'basic'            
    CHECK (search_type IN ('basic', 'trending', 'ai_chat', 'category', 'personalized', 'voice', 'realtime')),
  
  -- 검색 소스
  search_source text DEFAULT 'user_input'     
    CHECK (search_source IN ('user_input', 'suggestion', 'autocomplete', 'trending_click', 'ai_recommendation')),
    
  -- =============================================================================
  -- 🎯 검색 파라미터 및 필터
  -- =============================================================================
  keywords_used text[] DEFAULT '{}',          -- 사용된 키워드 배열
  filters_applied jsonb DEFAULT '{}',         -- 적용된 필터 (duration, category 등)
  sort_order varchar(50) DEFAULT 'relevance', -- 정렬 순서 (relevance, date, viewCount)
  search_options jsonb DEFAULT '{}',          -- 추가 검색 옵션
  
  -- =============================================================================
  -- 📊 검색 결과 정보
  -- =============================================================================
  results_count integer DEFAULT 0,            -- 총 검색 결과 수
  results_returned integer DEFAULT 0,         -- 실제 반환된 결과 수
  playable_results_count integer DEFAULT 0,   -- 재생 가능한 결과 수
  results_clicked integer DEFAULT 0,          -- 클릭된 결과 수
  
  -- 검색 품질 지표
  result_quality_score decimal(3,2),          -- 검색 품질 점수 (0.0-1.0)
  relevance_score decimal(3,2),               -- 관련성 점수
  diversity_score decimal(3,2),               -- 다양성 점수
  
  -- =============================================================================
  -- 🤖 AI 처리 정보 (Claude API 연동)
  -- =============================================================================
  ai_enabled boolean DEFAULT false,           -- AI 처리 사용 여부
  ai_method varchar(50),                      -- 사용된 AI 방법 (claude_api, gpt4, hybrid)
  ai_confidence decimal(3,2),                 -- AI 처리 신뢰도
  ai_processing_time integer,                 -- AI 처리 시간 (ms)
  ai_tokens_used integer DEFAULT 0,           -- AI 토큰 사용량
  ai_cost_usd decimal(8,4) DEFAULT 0,         -- AI 비용 (USD)
  
  -- AI 분류 결과
  ai_classified_category text,                -- AI가 분류한 카테고리
  ai_suggested_keywords text[] DEFAULT '{}',  -- AI 제안 키워드
  ai_intent_detected text,                    -- AI가 감지한 검색 의도
  
  -- =============================================================================
  -- ⚡ YouTube API 사용량 추적 (정확한 계산)
  -- =============================================================================
  api_units_consumed integer DEFAULT 0,       -- 총 소모된 API 단위수
  search_api_units integer DEFAULT 100,       -- search.list 비용 (고정 100)
  videos_api_units integer DEFAULT 0,         -- videos.list 비용 (동적)
  channels_api_units integer DEFAULT 0,       -- channels.list 비용 (필요시)
  
  -- API 호출 상세
  api_calls_made jsonb DEFAULT '{}',          -- 실제 API 호출 내역
  quota_category text DEFAULT 'realtime_trends' -- 할당량 카테고리
    CHECK (quota_category IN ('popular_keywords', 'realtime_trends', 'premium_users', 'emergency_reserve')),
  
  -- =============================================================================
  -- 🚀 성능 및 캐싱 정보
  -- =============================================================================
  response_time integer,                      -- 전체 응답 시간 (ms)
  search_engine_time integer,                 -- YouTube 검색 엔진 시간 (ms)
  filter_processing_time integer,             -- 필터링 처리 시간 (ms)
  classification_time integer,                -- LLM 분류 시간 (ms)
  
  -- 캐싱 관련
  cache_hit boolean DEFAULT false,            -- 캐시 적중 여부
  cache_source text,                          -- 캐시 소스 (video_cache, search_cache)
  cache_efficiency decimal(3,2),              -- 캐시 효율성 (적중률)
  
  -- =============================================================================
  -- 🔧 검색 개선 및 최적화
  -- =============================================================================
  spell_corrected boolean DEFAULT false,      -- 맞춤법 교정 여부
  did_you_mean text,                          -- "이것을 찾으셨나요?" 제안
  suggested_keywords text[] DEFAULT '{}',     -- 추천 키워드들
  auto_completed boolean DEFAULT false,       -- 자동완성 사용 여부
  
  -- 검색 실패 처리
  search_failed boolean DEFAULT false,        -- 검색 실패 여부
  failure_reason text,                        -- 실패 사유
  fallback_used boolean DEFAULT false,        -- 폴백 전략 사용 여부
  fallback_method text,                       -- 사용된 폴백 방법
  
  -- =============================================================================
  -- 🌍 지역 및 디바이스 정보
  -- =============================================================================
  ip_address inet,                            -- IP 주소
  user_agent text,                            -- User-Agent
  device_type text,                           -- 디바이스 타입 (mobile, desktop, tablet)
  browser_info jsonb DEFAULT '{}',            -- 브라우저 정보
  geo_location jsonb DEFAULT '{}',            -- 지리적 위치 (국가, 도시)
  timezone text DEFAULT 'Asia/Seoul',         -- 타임존
  
  -- =============================================================================
  -- 📈 사용자 행동 추적
  -- =============================================================================
  is_repeat_search boolean DEFAULT false,     -- 반복 검색 여부
  search_sequence_number integer DEFAULT 1,   -- 세션 내 검색 순서
  previous_search_query text,                 -- 이전 검색어
  time_since_last_search interval,            -- 이전 검색으로부터 시간
  
  -- 사용자 만족도
  user_satisfaction_rating integer            -- 사용자 만족도 (1-5)
    CHECK (user_satisfaction_rating >= 1 AND user_satisfaction_rating <= 5),
  user_feedback text,                         -- 사용자 피드백
  exit_without_click boolean DEFAULT false,   -- 클릭 없이 이탈 여부
  
  -- =============================================================================
  -- 🎯 비즈니스 인텔리전스
  -- =============================================================================
  search_intent text                          -- 검색 의도 (entertainment, education, shopping, etc.)
    CHECK (search_intent IN ('entertainment', 'education', 'shopping', 'information', 'inspiration', 'relaxation')),
  commercial_intent text DEFAULT 'none'       -- 상업적 의도 (none, low, medium, high)
    CHECK (commercial_intent IN ('none', 'low', 'medium', 'high')),
  content_preference text,                    -- 선호 콘텐츠 타입
  
  -- A/B 테스트
  ab_test_variant text,                       -- A/B 테스트 변형
  experiment_id text,                         -- 실험 ID
  
  -- =============================================================================
  -- 📱 realtime-keyword-search.js 세션 추적
  -- =============================================================================
  realtime_session_id text,                  -- 실시간 검색 세션 ID
  keyword_category text,                      -- 키워드 카테고리 (음악, 코미디, 게임 등)
  target_video_count integer DEFAULT 20,     -- 목표 영상 수
  max_pages_searched integer DEFAULT 3,      -- 최대 검색 페이지 수
  pages_actually_searched integer DEFAULT 0, -- 실제 검색된 페이지 수
  
  -- 실시간 검색 결과
  new_videos_found integer DEFAULT 0,        -- 새로 발견된 영상 수
  duplicate_videos_skipped integer DEFAULT 0, -- 중복 제거된 영상 수
  classification_errors integer DEFAULT 0,   -- 분류 실패 수
  channels_discovered integer DEFAULT 0,     -- 새로 발견된 채널 수
  
  -- =============================================================================
  -- 🚨 에러 및 예외 처리
  -- =============================================================================
  error_occurred boolean DEFAULT false,       -- 에러 발생 여부
  error_type text,                            -- 에러 타입 (api_error, timeout, quota_exceeded)
  error_message text,                         -- 에러 메시지
  error_stack jsonb DEFAULT '{}',             -- 에러 스택 (디버깅용)
  
  -- API 에러 상세
  api_error_code text,                        -- YouTube API 에러 코드
  quota_exceeded boolean DEFAULT false,       -- 할당량 초과 여부
  rate_limited boolean DEFAULT false,         -- 속도 제한 여부
  
  -- =============================================================================
  -- 📊 추가 메타데이터
  -- =============================================================================
  referrer_url text,                          -- 검색 시작 페이지
  landing_page text,                          -- 검색 결과 도착 페이지
  conversion_event text,                      -- 전환 이벤트 (video_click, channel_subscribe)
  
  -- 검색 컨텍스트
  search_context jsonb DEFAULT '{}',          -- 검색 상황 정보
  user_journey_stage text,                    -- 사용자 여정 단계 (discovery, exploration, decision)
  
  -- Raw 데이터 저장 (분석용)
  raw_search_params jsonb DEFAULT '{}',       -- 원본 검색 파라미터
  raw_api_response jsonb DEFAULT '{}',        -- 원본 API 응답 (요약본)
  debug_info jsonb DEFAULT '{}',              -- 디버깅 정보
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- 검색 시간 세분화
  search_started_at timestamptz DEFAULT now(), -- 검색 시작 시간
  search_completed_at timestamptz,            -- 검색 완료 시간
  
  -- =============================================================================
  -- 🔍 제약조건 및 검증
  -- =============================================================================
  CHECK (results_returned <= results_count),
  CHECK (playable_results_count <= results_returned),
  CHECK (results_clicked <= results_returned),
  CHECK (response_time >= 0),
  CHECK (api_units_consumed >= 0),
  CHECK (search_sequence_number > 0)
);

-- =============================================================================
-- 📊 인덱스 생성 (고성능 검색 및 분석)
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_search_logs_id ON search_logs(id);
CREATE INDEX idx_search_logs_created_at ON search_logs(created_at DESC);
CREATE INDEX idx_search_logs_user_id ON search_logs(user_id, created_at DESC);
CREATE INDEX idx_search_logs_session_id ON search_logs(session_id);

-- 검색 쿼리 인덱스
CREATE INDEX idx_search_logs_query ON search_logs(search_query);
CREATE INDEX idx_search_logs_query_lower ON search_logs(LOWER(search_query));
CREATE INDEX idx_search_logs_normalized_query ON search_logs(normalized_query);
CREATE INDEX idx_search_logs_search_type ON search_logs(search_type);

-- 성능 분석 인덱스
CREATE INDEX idx_search_logs_response_time ON search_logs(response_time) WHERE response_time IS NOT NULL;
CREATE INDEX idx_search_logs_api_units ON search_logs(api_units_consumed DESC);
CREATE INDEX idx_search_logs_cache_hit ON search_logs(cache_hit) WHERE cache_hit = true;
CREATE INDEX idx_search_logs_quota_category ON search_logs(quota_category);

-- 검색 품질 인덱스
CREATE INDEX idx_search_logs_quality_score ON search_logs(result_quality_score DESC) WHERE result_quality_score IS NOT NULL;
CREATE INDEX idx_search_logs_user_satisfaction ON search_logs(user_satisfaction_rating DESC) WHERE user_satisfaction_rating IS NOT NULL;
CREATE INDEX idx_search_logs_results_count ON search_logs(results_count DESC);

-- AI 처리 인덱스
CREATE INDEX idx_search_logs_ai_enabled ON search_logs(ai_enabled) WHERE ai_enabled = true;
CREATE INDEX idx_search_logs_ai_cost ON search_logs(ai_cost_usd DESC) WHERE ai_cost_usd > 0;
CREATE INDEX idx_search_logs_ai_tokens ON search_logs(ai_tokens_used DESC) WHERE ai_tokens_used > 0;

-- 에러 추적 인덱스
CREATE INDEX idx_search_logs_error ON search_logs(error_occurred) WHERE error_occurred = true;
CREATE INDEX idx_search_logs_quota_exceeded ON search_logs(quota_exceeded) WHERE quota_exceeded = true;
CREATE INDEX idx_search_logs_search_failed ON search_logs(search_failed) WHERE search_failed = true;

-- 실시간 검색 인덱스
CREATE INDEX idx_search_logs_realtime_session ON search_logs(realtime_session_id) WHERE realtime_session_id IS NOT NULL;
CREATE INDEX idx_search_logs_keyword_category ON search_logs(keyword_category);
CREATE INDEX idx_search_logs_new_videos ON search_logs(new_videos_found DESC);

-- 복합 인덱스 (고성능 분석 쿼리용)
CREATE INDEX idx_search_logs_user_success_time 
ON search_logs(user_id, search_failed, created_at DESC) 
WHERE search_failed = false;

-- ✅ 수정된 인덱스 (시간 조건 제거)
CREATE INDEX idx_search_logs_popular_queries
ON search_logs(search_query, created_at DESC);

CREATE INDEX idx_search_logs_api_efficiency 
ON search_logs(api_units_consumed, results_count, created_at DESC) 
WHERE api_units_consumed > 0 AND results_count > 0;

-- GIN 인덱스 (배열 및 JSON 검색용)
CREATE INDEX idx_search_logs_keywords_used ON search_logs USING GIN(keywords_used);
CREATE INDEX idx_search_logs_ai_suggested_keywords ON search_logs USING GIN(ai_suggested_keywords);
CREATE INDEX idx_search_logs_filters_applied ON search_logs USING GIN(filters_applied);
CREATE INDEX idx_search_logs_search_options ON search_logs USING GIN(search_options);
CREATE INDEX idx_search_logs_browser_info ON search_logs USING GIN(browser_info);

-- 전문 검색 인덱스 (검색어 텍스트 검색용) - pg_trgm 확장 필요시 활성화
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX idx_search_logs_query_trgm ON search_logs USING gin(search_query gin_trgm_ops);

-- =============================================================================
-- 🔄 트리거 및 함수
-- =============================================================================

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_search_logs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_search_logs_updated_at
  BEFORE UPDATE ON search_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_search_logs_updated_at();

-- 검색 완료 시간 자동 설정 함수
CREATE OR REPLACE FUNCTION set_search_completed_time()
RETURNS trigger AS $$
BEGIN
  -- response_time이 설정되면 검색 완료로 간주
  IF NEW.response_time IS NOT NULL AND OLD.response_time IS NULL THEN
    NEW.search_completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_search_completed_time
  BEFORE UPDATE ON search_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_search_completed_time();

-- 인기 키워드 조회 함수 (DB_docs 기반)
CREATE OR REPLACE FUNCTION get_popular_keywords_detailed(
  days_back integer DEFAULT 7,
  min_searches integer DEFAULT 2,
  limit_count integer DEFAULT 20
) RETURNS TABLE(
  keyword text,
  search_count bigint,
  unique_users bigint,
  avg_results_count decimal,
  avg_response_time decimal,
  success_rate decimal,
  last_searched timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.search_query as keyword,
    COUNT(*) as search_count,
    COUNT(DISTINCT sl.user_id) as unique_users,
    ROUND(AVG(sl.results_count), 2) as avg_results_count,
    ROUND(AVG(sl.response_time), 2) as avg_response_time,
    ROUND((COUNT(*) FILTER (WHERE NOT sl.search_failed)::decimal / COUNT(*)) * 100, 2) as success_rate,
    MAX(sl.created_at) as last_searched
  FROM search_logs sl
  WHERE 
    sl.created_at >= (CURRENT_TIMESTAMP - (days_back || ' days')::interval)
    AND sl.search_query IS NOT NULL
    AND LENGTH(sl.search_query) > 1
  GROUP BY sl.search_query
  HAVING COUNT(*) >= min_searches
  ORDER BY search_count DESC, unique_users DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 실시간 트렌드 분석 함수
CREATE OR REPLACE FUNCTION get_realtime_trend_keywords(
  hours_back integer DEFAULT 1
) RETURNS TABLE(
  keyword text,
  recent_searches bigint,
  trend_score decimal,
  avg_new_videos decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.search_query as keyword,
    COUNT(*) as recent_searches,
    -- 트렌드 점수: 최근 검색량 / 평균 검색량 비율
    ROUND(
      (COUNT(*)::decimal / NULLIF(
        (SELECT AVG(cnt) FROM (
          SELECT COUNT(*) as cnt 
          FROM search_logs sl2 
          WHERE sl2.search_query = sl.search_query 
            AND sl2.created_at >= (now() - interval '7 days')
          GROUP BY DATE_TRUNC('hour', sl2.created_at)
        ) hourly_counts), 0
      )) * 100, 2
    ) as trend_score,
    ROUND(AVG(sl.new_videos_found), 2) as avg_new_videos
  FROM search_logs sl
  WHERE 
    sl.created_at >= (CURRENT_TIMESTAMP - (hours_back || ' hours')::interval)
    AND sl.search_query IS NOT NULL
    AND sl.search_failed = false
  GROUP BY sl.search_query
  HAVING COUNT(*) >= 2
  ORDER BY trend_score DESC, recent_searches DESC
  LIMIT 15;
END;
$$ LANGUAGE plpgsql;

-- API 사용량 분석 함수
CREATE OR REPLACE FUNCTION analyze_api_usage(
  days_back integer DEFAULT 1
) RETURNS TABLE(
  date_hour timestamptz,
  total_units_consumed bigint,
  search_api_units bigint,
  videos_api_units bigint,
  total_searches bigint,
  successful_searches bigint,
  efficiency_score decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('hour', sl.created_at) as date_hour,
    SUM(sl.api_units_consumed) as total_units_consumed,
    SUM(sl.search_api_units) as search_api_units,
    SUM(sl.videos_api_units) as videos_api_units,
    COUNT(*) as total_searches,
    COUNT(*) FILTER (WHERE NOT sl.search_failed) as successful_searches,
    ROUND(
      CASE 
        WHEN SUM(sl.api_units_consumed) > 0 
        THEN (SUM(sl.results_count)::decimal / SUM(sl.api_units_consumed)) * 100
        ELSE 0 
      END, 2
    ) as efficiency_score
  FROM search_logs sl
  WHERE sl.created_at >= (CURRENT_TIMESTAMP - (days_back || ' days')::interval)
  GROUP BY DATE_TRUNC('hour', sl.created_at)
  ORDER BY date_hour DESC;
END;
$$ LANGUAGE plpgsql;

-- 사용자 검색 패턴 분석 함수
CREATE OR REPLACE FUNCTION analyze_user_search_patterns(
  target_user_id uuid,
  days_back integer DEFAULT 30
) RETURNS TABLE(
  total_searches bigint,
  unique_queries bigint,
  avg_response_time decimal,
  most_used_search_type text,
  favorite_categories text[],
  peak_search_hour integer,
  success_rate decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_searches,
    COUNT(DISTINCT sl.search_query) as unique_queries,
    ROUND(AVG(sl.response_time), 2) as avg_response_time,
    MODE() WITHIN GROUP (ORDER BY sl.search_type) as most_used_search_type,
    ARRAY_AGG(DISTINCT sl.keyword_category) FILTER (WHERE sl.keyword_category IS NOT NULL) as favorite_categories,
    MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM sl.created_at))::integer as peak_search_hour,
    ROUND((COUNT(*) FILTER (WHERE NOT sl.search_failed)::decimal / COUNT(*)) * 100, 2) as success_rate
  FROM search_logs sl
  WHERE 
    sl.user_id = target_user_id
    AND sl.created_at >= (CURRENT_TIMESTAMP - (days_back || ' days')::interval)
  GROUP BY sl.user_id;
END;
$$ LANGUAGE plpgsql;

-- 만료된 세션 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_search_logs()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- 90일 이상 된 검색 로그 삭제 (사용자 데이터는 보존)
  DELETE FROM search_logs 
  WHERE 
    created_at < (CURRENT_TIMESTAMP - interval '90 days')
    AND user_id IS NULL; -- 익명 사용자만 삭제
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 📋 편의 뷰 (Views)
-- =============================================================================

-- 성공적인 검색 로그 뷰
CREATE VIEW successful_searches AS
SELECT 
  sl.id,
  sl.user_id,
  sl.search_query,
  sl.search_type,
  sl.results_count,
  sl.playable_results_count,
  sl.response_time,
  sl.api_units_consumed,
  sl.cache_hit,
  sl.created_at
FROM search_logs sl
WHERE 
  sl.search_failed = false
  AND sl.results_count > 0
  AND sl.created_at > (CURRENT_TIMESTAMP - interval '7 days')
ORDER BY sl.created_at DESC;

-- 실시간 인기 검색어 뷰 (최근 기준)
CREATE VIEW trending_searches_1h AS
SELECT 
  sl.search_query,
  COUNT(*) as search_count,
  COUNT(DISTINCT sl.user_id) as unique_users,
  AVG(sl.results_count) as avg_results,
  MAX(sl.created_at) as last_searched
FROM search_logs sl
WHERE 
  sl.search_failed = false
  AND LENGTH(sl.search_query) > 1
  AND sl.created_at > (CURRENT_TIMESTAMP - interval '1 hour')
GROUP BY sl.search_query
HAVING COUNT(*) >= 2
ORDER BY search_count DESC, unique_users DESC
LIMIT 10;

-- API 사용량 대시보드 뷰
CREATE VIEW api_usage_dashboard AS
SELECT 
  DATE_TRUNC('hour', sl.created_at) as hour,
  SUM(sl.api_units_consumed) as total_units,
  COUNT(*) as total_searches,
  COUNT(*) FILTER (WHERE sl.cache_hit = true) as cache_hits,
  ROUND((COUNT(*) FILTER (WHERE sl.cache_hit = true)::decimal / COUNT(*)) * 100, 2) as cache_hit_rate,
  AVG(sl.response_time) as avg_response_time
FROM search_logs sl
WHERE sl.created_at > (CURRENT_TIMESTAMP - interval '24 hours')
GROUP BY DATE_TRUNC('hour', sl.created_at)
ORDER BY hour DESC;

-- =============================================================================
-- 📊 테이블 코멘트
-- =============================================================================

COMMENT ON TABLE search_logs IS '검색 로그 테이블 - 사용자 검색 행동 추적 + API 사용량 + 실시간 트렌드 분석';

COMMENT ON COLUMN search_logs.search_query IS '사용자가 입력한 검색 키워드';
COMMENT ON COLUMN search_logs.api_units_consumed IS '검색에 소모된 총 YouTube API 단위수';
COMMENT ON COLUMN search_logs.search_api_units IS 'search.list API 비용 (고정 100 units)';
COMMENT ON COLUMN search_logs.videos_api_units IS 'videos.list API 비용 (동적, part별 계산)';
COMMENT ON COLUMN search_logs.ai_tokens_used IS 'Claude API 사용 토큰 수';
COMMENT ON COLUMN search_logs.cache_hit IS '캐시 적중 여부 (true: 캐시 사용, false: API 호출)';
COMMENT ON COLUMN search_logs.realtime_session_id IS 'realtime-keyword-search.js 세션 ID';
COMMENT ON COLUMN search_logs.quota_category IS 'API 할당량 카테고리 (popular_keywords, realtime_trends, premium_users, emergency_reserve)';

-- =============================================================================
-- ✅ 생성 완료 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ search_logs 테이블 생성 완료!';
  RAISE NOTICE '📊 포함 기능:';
  RAISE NOTICE '   - 완전한 검색 추적 (80+ 컬럼)';
  RAISE NOTICE '   - YouTube API 사용량 정확 추적 (search.list: 100 units, videos.list: 동적)';
  RAISE NOTICE '   - Claude AI 처리 정보 (토큰, 비용, 신뢰도)';
  RAISE NOTICE '   - realtime-keyword-search.js 세션 추적';
  RAISE NOTICE '   - 20개 성능 인덱스 + 6개 GIN 인덱스';
  RAISE NOTICE '   - 6개 분석 함수 + 3개 편의 뷰';
  RAISE NOTICE '🎯 다음 단계: Supabase에서 테이블 생성 실행';
END $$; 