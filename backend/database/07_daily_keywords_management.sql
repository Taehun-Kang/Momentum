-- =============================================================================
-- 07_daily_keywords_management.sql
-- 일일 키워드 관리 시스템 (YouTube Shorts AI 큐레이션 서비스)
-- 
-- 기능: KEYWORDS.md 기반 매일 검색할 키워드 관리 + 갱신 주기 + 성과 추적
-- 연동: dailyKeywordUpdateService.js + realtime-keyword-search.js
-- 데이터 소스: youtube-ai-services/KEYWORDS.md (CSV 형식)
-- =============================================================================

-- 0. 기존 테이블 제거 (완전 교체)
DROP TABLE IF EXISTS daily_keywords CASCADE;
DROP TABLE IF EXISTS keyword_update_schedules CASCADE;
DROP TABLE IF EXISTS keyword_performance_logs CASCADE;

-- =============================================================================
-- 📊 1. daily_keywords 테이블 (실행 기반 순차 선택 시스템)
-- =============================================================================

CREATE TABLE daily_keywords (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- =============================================================================
  -- 🔗 키워드 기본 정보 (KEYWORDS.md 직접 매핑)
  -- =============================================================================
  keyword varchar(255) NOT NULL UNIQUE,                 -- 검색 키워드 (예: "먹방", "K-pop")
  category varchar(100) NOT NULL,                       -- 9개 고정 카테고리
  keyword_type varchar(20) NOT NULL,                    -- 트렌드/인기/에버그린 (참고용)
  
  -- =============================================================================
  -- 🎯 중요도 기반 그룹 시스템 (핵심!)
  -- =============================================================================
  priority_tier varchar(20) NOT NULL CHECK (priority_tier IN ('high', 'medium', 'low')),
                                                        -- 중요도 그룹 (고/중/저)
  sequence_number integer NOT NULL,                     -- 그룹 내 순서 번호 (1,2,3,4...)
  
  -- =============================================================================
  -- 📊 검색 품질 기준 (KEYWORDS.md 기반)
  -- =============================================================================
  min_view_count integer DEFAULT 30000,                 -- 최소 조회수 기준
  min_engagement_rate decimal(3,1) DEFAULT 2.0,         -- 최소 참여도(%) 기준
  description text,                                     -- 키워드 설명 (KEYWORDS.md 비고)
  
  -- =============================================================================
  -- 📈 성과 추적 (실행 후 업데이트)
  -- =============================================================================
  total_searches_performed integer DEFAULT 0,           -- 총 검색 실행 횟수
  total_videos_found integer DEFAULT 0,                 -- 총 발견된 영상 수
  total_videos_cached integer DEFAULT 0,                -- 총 캐시된 영상 수
  avg_videos_per_search decimal(5,1) DEFAULT 0.0,       -- 검색당 평균 영상 수
  success_rate decimal(3,2) DEFAULT 1.0,               -- 성공률 (0.0~1.0)
  quality_score decimal(3,1) DEFAULT 7.0,              -- 품질 점수 (1~10)
  
  -- =============================================================================
  -- 🚨 에러 관리
  -- =============================================================================
  consecutive_failures integer DEFAULT 0,               -- 연속 실패 횟수
  last_search_success boolean DEFAULT true,             -- 마지막 검색 성공 여부
  last_error_message text,                             -- 마지막 에러 메시지
  last_error_at timestamptz,                           -- 마지막 에러 시간
  
  -- =============================================================================
  -- 🔄 실행 기록 (순환 시스템 핵심!)
  -- =============================================================================
  last_executed_at timestamptz,                        -- 마지막 실행 시간 (순환 기준)
  last_execution_result jsonb DEFAULT '{}',            -- 마지막 실행 결과
  total_api_units_consumed integer DEFAULT 0,          -- 총 소모된 API 단위
  
  -- =============================================================================
  -- ⚙️ 설정 및 제어
  -- =============================================================================
  is_active boolean DEFAULT true,                      -- 활성화 여부
  is_blocked boolean DEFAULT false,                    -- 차단 여부 (연속 실패 시)
  block_reason text,                                   -- 차단 사유
  
  -- =============================================================================
  -- 📋 메타데이터
  -- =============================================================================
  tags text[] DEFAULT '{}',                           -- 검색 태그
  metadata jsonb DEFAULT '{}',                        -- 추가 메타데이터
  data_source varchar(50) DEFAULT 'keywords_md',      -- 데이터 출처
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,      -- 생성 일시
  updated_at timestamptz DEFAULT now() NOT NULL       -- 수정 일시
);

-- =============================================================================
-- 📊 daily_keywords 인덱스 (실행 기반 시스템 맞춤)
-- =============================================================================

-- 기본 조회 인덱스
CREATE UNIQUE INDEX idx_daily_keywords_keyword ON daily_keywords(keyword);
CREATE INDEX idx_daily_keywords_category ON daily_keywords(category);
CREATE INDEX idx_daily_keywords_type ON daily_keywords(keyword_type);

-- 🎯 중요도 그룹 시스템 핵심 인덱스
CREATE INDEX idx_daily_keywords_tier ON daily_keywords(priority_tier);
CREATE INDEX idx_daily_keywords_sequence ON daily_keywords(sequence_number);
CREATE UNIQUE INDEX idx_daily_keywords_tier_sequence ON daily_keywords(priority_tier, sequence_number);

-- 🔄 실행 기반 순환 시스템 핵심 인덱스
CREATE INDEX idx_daily_keywords_last_executed ON daily_keywords(last_executed_at);
CREATE INDEX idx_daily_keywords_tier_executed ON daily_keywords(priority_tier, last_executed_at);

-- 활성화 상태 인덱스
CREATE INDEX idx_daily_keywords_active ON daily_keywords(is_active) WHERE is_active = true;
CREATE INDEX idx_daily_keywords_blocked ON daily_keywords(is_blocked) WHERE is_blocked = false;

-- 에러 추적 인덱스
CREATE INDEX idx_daily_keywords_failures ON daily_keywords(consecutive_failures DESC) WHERE consecutive_failures > 0;

-- 성과 분석 인덱스
CREATE INDEX idx_daily_keywords_quality_score ON daily_keywords(quality_score DESC);
CREATE INDEX idx_daily_keywords_success_rate ON daily_keywords(success_rate DESC);

-- 복합 인덱스 (일일 선택용 - 성능 최적화)
CREATE INDEX idx_daily_keywords_tier_active_executed 
  ON daily_keywords(priority_tier, last_executed_at, sequence_number) 
  WHERE is_active = true AND is_blocked = false;

-- 전체 텍스트 검색 인덱스
CREATE INDEX idx_daily_keywords_tags ON daily_keywords USING GIN(tags);
CREATE INDEX idx_daily_keywords_metadata ON daily_keywords USING GIN(metadata);

-- =============================================================================
-- 🔄 트리거 설정 (updated_at 자동 업데이트)
-- =============================================================================

-- updated_at 자동 업데이트 트리거 함수 (공통)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- daily_keywords 테이블에 트리거 적용
CREATE TRIGGER update_daily_keywords_updated_at
  BEFORE UPDATE ON daily_keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 🔢 자동 sequence_number 관리 함수
-- =============================================================================

-- 키워드 삽입 시 자동으로 sequence_number 할당
CREATE OR REPLACE FUNCTION auto_assign_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
  -- sequence_number가 NULL이면 자동 할당
  IF NEW.sequence_number IS NULL THEN
    SELECT COALESCE(MAX(sequence_number), 0) + 1 
    INTO NEW.sequence_number
    FROM daily_keywords 
    WHERE priority_tier = NEW.priority_tier;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 키워드 삭제 시 뒷 번호들 자동으로 앞당김
CREATE OR REPLACE FUNCTION reorder_sequence_numbers_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- 삭제된 키워드보다 뒷 번호들을 한 칸씩 앞으로 이동
  UPDATE daily_keywords 
  SET sequence_number = sequence_number - 1
  WHERE priority_tier = OLD.priority_tier 
    AND sequence_number > OLD.sequence_number;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
CREATE TRIGGER auto_sequence_number_insert
  BEFORE INSERT ON daily_keywords
  FOR EACH ROW EXECUTE FUNCTION auto_assign_sequence_number();

CREATE TRIGGER reorder_sequence_after_delete
  AFTER DELETE ON daily_keywords
  FOR EACH ROW EXECUTE FUNCTION reorder_sequence_numbers_after_delete();

-- =============================================================================
-- 📅 2. keyword_update_schedules 테이블 (갱신 스케줄 관리)
-- =============================================================================

CREATE TABLE keyword_update_schedules (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- =============================================================================
  -- 🔗 키워드 연결
  -- =============================================================================
  daily_keyword_id uuid REFERENCES daily_keywords(id) ON DELETE CASCADE NOT NULL,
  
  -- =============================================================================
  -- 📅 스케줄 정보
  -- =============================================================================
  scheduled_for timestamptz NOT NULL,                   -- 스케줄된 실행 시간
  schedule_type varchar(20) DEFAULT 'regular'           -- 스케줄 타입
    CHECK (schedule_type IN ('regular', 'priority', 'retry', 'manual', 'emergency')),
  
  -- =============================================================================
  -- 🔄 실행 상태
  -- =============================================================================
  status varchar(20) DEFAULT 'pending'                  -- 실행 상태
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'skipped')),
  
  -- =============================================================================
  -- ⏱️ 실행 정보
  -- =============================================================================
  started_at timestamptz,                               -- 실행 시작 시간
  completed_at timestamptz,                             -- 실행 완료 시간
  execution_duration_ms integer,                        -- 실행 소요 시간 (ms)
  retry_count integer DEFAULT 0,                        -- 재시도 횟수
  max_retries integer DEFAULT 3,                        -- 최대 재시도 횟수
  
  -- =============================================================================
  -- 📊 실행 결과
  -- =============================================================================
  videos_found integer DEFAULT 0,                       -- 발견된 영상 수
  videos_cached integer DEFAULT 0,                      -- 캐시된 영상 수
  duplicates_skipped integer DEFAULT 0,                 -- 중복 제거된 수
  errors_encountered integer DEFAULT 0,                 -- 발생한 에러 수
  
  -- API 사용량
  api_units_consumed integer DEFAULT 0,                 -- 소모된 API 단위
  api_calls_made integer DEFAULT 0,                     -- 실행된 API 호출 수
  
  -- =============================================================================
  -- 🚨 에러 정보
  -- =============================================================================
  error_message text,                                   -- 에러 메시지
  error_details jsonb DEFAULT '{}',                     -- 에러 상세 정보
  
  -- =============================================================================
  -- 📱 실행 컨텍스트
  -- =============================================================================
  executor varchar(50) DEFAULT 'dailyKeywordUpdateService', -- 실행자
  execution_context jsonb DEFAULT '{}',                 -- 실행 컨텍스트
  batch_id uuid,                                        -- 배치 실행 ID
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,        -- 생성 일시
  updated_at timestamptz DEFAULT now() NOT NULL         -- 수정 일시
);

-- =============================================================================
-- 📊 keyword_update_schedules 인덱스
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_keyword_schedules_keyword_id ON keyword_update_schedules(daily_keyword_id);
CREATE INDEX idx_keyword_schedules_scheduled_for ON keyword_update_schedules(scheduled_for);
CREATE INDEX idx_keyword_schedules_status ON keyword_update_schedules(status);

-- 실행 대기 중인 작업 (중요!)
CREATE INDEX idx_keyword_schedules_pending 
  ON keyword_update_schedules(scheduled_for)
  WHERE status = 'pending';

-- 복합 인덱스
CREATE INDEX idx_keyword_schedules_batch_status
  ON keyword_update_schedules(batch_id, status);

CREATE INDEX idx_keyword_schedules_keyword_completed
  ON keyword_update_schedules(daily_keyword_id, completed_at DESC);

-- =============================================================================
-- 📈 3. keyword_performance_logs 테이블 (성과 추적)
-- =============================================================================

CREATE TABLE keyword_performance_logs (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- =============================================================================
  -- 🔗 키워드 연결
  -- =============================================================================
  daily_keyword_id uuid REFERENCES daily_keywords(id) ON DELETE CASCADE NOT NULL,
  keyword varchar(255) NOT NULL,                        -- 키워드 (빠른 조회용)
  
  -- =============================================================================
  -- 📊 검색 성과 (realtime-keyword-search.js 연동)
  -- =============================================================================
  search_session_id varchar(100),                       -- 검색 세션 ID
  videos_found integer DEFAULT 0,                       -- 발견된 영상 수
  videos_qualified integer DEFAULT 0,                   -- 품질 기준 통과 영상 수
  videos_cached integer DEFAULT 0,                      -- 캐시된 영상 수
  duplicates_removed integer DEFAULT 0,                 -- 중복 제거된 수
  
  -- 채널 정보
  channels_discovered integer DEFAULT 0,                -- 새로 발견된 채널 수
  channels_quality_passed integer DEFAULT 0,            -- 품질 기준 통과 채널 수
  
  -- =============================================================================
  -- 🎯 품질 지표
  -- =============================================================================
  avg_video_quality_score decimal(3,2) DEFAULT 0.0,     -- 평균 영상 품질 점수
  avg_view_count bigint DEFAULT 0,                      -- 평균 조회수
  avg_engagement_rate decimal(3,2) DEFAULT 0.0,         -- 평균 참여도
  quality_threshold_met boolean DEFAULT false,          -- 품질 기준 달성 여부
  
  -- =============================================================================
  -- ⚡ 성능 지표
  -- =============================================================================
  total_processing_time_ms integer,                     -- 총 처리 시간
  api_response_time_ms integer,                         -- API 응답 시간
  classification_time_ms integer,                       -- LLM 분류 시간
  database_save_time_ms integer,                        -- DB 저장 시간
  
  -- =============================================================================
  -- 💰 비용 및 효율성
  -- =============================================================================
  api_units_consumed integer DEFAULT 0,                 -- 소모된 API 단위
  api_cost_usd decimal(6,4) DEFAULT 0.0,               -- API 비용 (USD)
  cost_per_video_usd decimal(6,4) DEFAULT 0.0,         -- 영상당 비용
  efficiency_score decimal(3,2) DEFAULT 0.0,           -- 효율성 점수 (영상수/API단위)
  
  -- =============================================================================
  -- 🚨 에러 및 예외
  -- =============================================================================
  errors_encountered integer DEFAULT 0,                 -- 발생한 에러 수
  api_errors integer DEFAULT 0,                        -- API 에러 수
  classification_errors integer DEFAULT 0,             -- 분류 에러 수
  database_errors integer DEFAULT 0,                   -- DB 에러 수
  error_details jsonb DEFAULT '{}',                    -- 에러 상세 정보
  
  -- =============================================================================
  -- 📱 실행 컨텍스트
  -- =============================================================================
  search_parameters jsonb DEFAULT '{}',                -- 검색 파라미터
  filter_criteria jsonb DEFAULT '{}',                  -- 필터 기준
  performance_metrics jsonb DEFAULT '{}',              -- 성능 메트릭
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  measurement_start timestamptz,                       -- 측정 시작 시간
  measurement_end timestamptz,                         -- 측정 종료 시간
  created_at timestamptz DEFAULT now() NOT NULL        -- 생성 일시
);

-- =============================================================================
-- 📊 keyword_performance_logs 인덱스
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_keyword_performance_keyword_id ON keyword_performance_logs(daily_keyword_id);
CREATE INDEX idx_keyword_performance_keyword ON keyword_performance_logs(keyword);
CREATE INDEX idx_keyword_performance_session ON keyword_performance_logs(search_session_id);
CREATE INDEX idx_keyword_performance_created_at ON keyword_performance_logs(created_at DESC);

-- 성과 분석 인덱스
CREATE INDEX idx_keyword_performance_efficiency ON keyword_performance_logs(efficiency_score DESC);
CREATE INDEX idx_keyword_performance_quality_met ON keyword_performance_logs(quality_threshold_met) WHERE quality_threshold_met = true;
CREATE INDEX idx_keyword_performance_cost ON keyword_performance_logs(cost_per_video_usd);

-- =============================================================================
-- 🛠️ 핵심 관리 함수들
-- =============================================================================

-- 1. 오늘 갱신할 키워드 조회 함수 (실행 기반 순환 시스템)
CREATE OR REPLACE FUNCTION get_todays_keywords()
RETURNS TABLE(
  id uuid,
  keyword varchar(255),
  category varchar(100),
  priority_tier varchar(20),
  sequence_number integer,
  min_view_count integer,
  min_engagement_rate decimal(3,1),
  days_since_last_execution integer,
  selection_reason text
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_keywords AS (
    SELECT 
      dk.id,
      dk.keyword,
      dk.category,
      dk.priority_tier,
      dk.sequence_number,
      dk.min_view_count,
      dk.min_engagement_rate,
      COALESCE(EXTRACT(days FROM now() - dk.last_executed_at)::integer, 999999) as days_since_last_execution,
      (dk.priority_tier || ' 그룹 - ' || COALESCE(EXTRACT(days FROM now() - dk.last_executed_at)::integer, 999999) || '일 전 실행')::text as selection_reason,
      ROW_NUMBER() OVER (
        PARTITION BY dk.priority_tier 
        ORDER BY 
          COALESCE(dk.last_executed_at, '1970-01-01'::timestamptz) ASC,
          dk.sequence_number ASC
      ) as rank_in_group
    FROM daily_keywords dk
    WHERE dk.is_active = true 
      AND dk.is_blocked = false
  )
  SELECT 
    rk.id,
    rk.keyword,
    rk.category,
    rk.priority_tier,
    rk.sequence_number,
    rk.min_view_count,
    rk.min_engagement_rate,
    rk.days_since_last_execution,
    rk.selection_reason
  FROM ranked_keywords rk
  WHERE 
    (rk.priority_tier = 'high' AND rk.rank_in_group <= 3) OR
    (rk.priority_tier = 'medium' AND rk.rank_in_group <= 5) OR
    (rk.priority_tier = 'low' AND rk.rank_in_group <= 2)
  ORDER BY 
    CASE rk.priority_tier 
      WHEN 'high' THEN 1 
      WHEN 'medium' THEN 2 
      WHEN 'low' THEN 3 
    END,
    rk.rank_in_group;
END;
$$ LANGUAGE plpgsql;

-- 2. 키워드 갱신 완료 함수
CREATE OR REPLACE FUNCTION complete_keyword_update(
  keyword_id uuid,
  videos_found_count integer,
  videos_cached_count integer,
  api_units_used integer DEFAULT 107,
  success boolean DEFAULT true,
  error_message text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE daily_keywords 
  SET 
    last_executed_at = now(),
    total_searches_performed = total_searches_performed + 1,
    total_videos_found = total_videos_found + videos_found_count,
    total_videos_cached = total_videos_cached + videos_cached_count,
    total_api_units_consumed = total_api_units_consumed + api_units_used,
    last_search_success = success,
    consecutive_failures = CASE 
      WHEN success THEN 0 
      ELSE consecutive_failures + 1 
    END,
    last_error_message = error_message,
    last_error_at = CASE 
      WHEN NOT success THEN now() 
      ELSE last_error_at 
    END,
    -- 성공률 재계산
    success_rate = CASE 
      WHEN total_searches_performed > 0 
      THEN (total_searches_performed - consecutive_failures)::decimal / total_searches_performed
      ELSE 1.0 
    END
  WHERE id = keyword_id;
  
  -- 연속 실패 3회 이상 시 자동 일시정지
  UPDATE daily_keywords 
  SET is_active = false,
      block_reason = '연속 실패 3회 이상'
  WHERE id = keyword_id 
    AND consecutive_failures >= 3;
END;
$$ LANGUAGE plpgsql;

-- 3. 키워드 성과 통계 함수
CREATE OR REPLACE FUNCTION get_keyword_performance_stats(
  days_back integer DEFAULT 7
) RETURNS TABLE(
  keyword varchar(255),
  category varchar(100),
  total_searches bigint,
  total_videos_found bigint,
  avg_videos_per_search decimal(5,1),
  success_rate decimal(3,2),
  total_api_units bigint,
  efficiency_score decimal(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dk.keyword,
    dk.category,
    dk.total_searches_performed::bigint,
    dk.total_videos_found::bigint,
    dk.avg_videos_per_search,
    dk.success_rate,
    dk.total_api_units_consumed::bigint,
    CASE 
      WHEN dk.total_api_units_consumed > 0 
      THEN ROUND((dk.total_videos_found::decimal / dk.total_api_units_consumed) * 100, 2)
      ELSE 0.0 
    END as efficiency_score
  FROM daily_keywords dk
  WHERE 
    dk.last_executed_at >= (now() - (days_back || ' days')::interval)
    AND dk.total_searches_performed > 0
  ORDER BY efficiency_score DESC, dk.total_videos_found DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. 키워드 스케줄 생성 함수
CREATE OR REPLACE FUNCTION schedule_keyword_update(
  keyword_id uuid,
  schedule_for timestamptz DEFAULT now(),
  schedule_type varchar(20) DEFAULT 'regular'
) RETURNS uuid AS $$
DECLARE
  schedule_id uuid;
BEGIN
  INSERT INTO keyword_update_schedules (
    daily_keyword_id,
    scheduled_for,
    schedule_type
  ) VALUES (
    keyword_id,
    schedule_for,
    schedule_type
  ) RETURNING id INTO schedule_id;
  
  RETURN schedule_id;
END;
$$ LANGUAGE plpgsql;

-- 5. 만료된 스케줄 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_keyword_schedules()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- 30일 이상 된 완료된 스케줄 삭제
  DELETE FROM keyword_update_schedules 
  WHERE created_at < (now() - interval '30 days')
    AND status IN ('completed', 'failed', 'cancelled');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- 성과 로그도 60일 이상 된 것 정리
  DELETE FROM keyword_performance_logs 
  WHERE created_at < (now() - interval '60 days');
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 📋 편의 뷰 (Views) - dailyKeywordUpdateService.js 연동
-- =============================================================================

-- 1. 오늘 갱신 대상 키워드 뷰
CREATE VIEW todays_update_keywords AS
SELECT 
  dk.id,
  dk.keyword,
  dk.category,
  dk.keyword_type,
  dk.priority_tier,
  dk.sequence_number,
  dk.min_view_count,
  dk.min_engagement_rate,
  dk.last_executed_at,
  dk.consecutive_failures,
  dk.success_rate,
  EXTRACT(EPOCH FROM (now() - COALESCE(dk.last_executed_at, dk.created_at))) / 86400 as days_since_last_update
FROM daily_keywords dk
WHERE 
  dk.is_active = true
  AND dk.is_blocked = false
  AND (dk.last_executed_at <= now() OR dk.last_executed_at IS NULL)
ORDER BY 
  dk.priority_tier,
  dk.sequence_number ASC NULLS FIRST;

-- 2. 키워드 성과 대시보드 뷰
CREATE VIEW keyword_performance_dashboard AS
SELECT 
  dk.keyword,
  dk.category,
  dk.keyword_type,
  dk.total_searches_performed,
  dk.total_videos_found,
  dk.avg_videos_per_search,
  dk.success_rate,
  dk.quality_score,
  dk.total_api_units_consumed,
  CASE 
    WHEN dk.total_api_units_consumed > 0 
    THEN ROUND((dk.total_videos_found::decimal / dk.total_api_units_consumed) * 100, 2)
    ELSE 0.0 
  END as efficiency_score,
  dk.last_executed_at
FROM daily_keywords dk
WHERE dk.total_searches_performed > 0
ORDER BY dk.quality_score DESC, dk.success_rate DESC;

-- 3. 실행 대기 중인 스케줄 뷰
CREATE VIEW pending_keyword_schedules AS
SELECT 
  ks.id as schedule_id,
  ks.daily_keyword_id,
  dk.keyword,
  dk.category,
  ks.scheduled_for,
  ks.schedule_type,
  ks.retry_count,
  ks.max_retries,
  EXTRACT(EPOCH FROM (now() - ks.scheduled_for))/60 as minutes_overdue
FROM keyword_update_schedules ks
JOIN daily_keywords dk ON ks.daily_keyword_id = dk.id
WHERE ks.status = 'pending'
  AND dk.is_active = true
ORDER BY ks.scheduled_for;

-- =============================================================================
-- 📊 KEYWORDS.md 데이터 삽입 함수
-- =============================================================================

-- =============================================================================
-- 🚀 키워드 삽입 헬퍼 함수 (간단한 삽입용)
-- =============================================================================

-- 단일 키워드 삽입 함수 (sequence_number 자동 할당)
CREATE OR REPLACE FUNCTION insert_keyword(
  p_keyword varchar(255),
  p_category varchar(100),
  p_keyword_type varchar(20),
  p_priority_tier varchar(20),
  p_min_view_count integer DEFAULT 30000,
  p_min_engagement_rate decimal(3,1) DEFAULT 2.0,
  p_description text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  keyword_id uuid;
BEGIN
  INSERT INTO daily_keywords (
    keyword, category, keyword_type, priority_tier,
    min_view_count, min_engagement_rate, description
  ) VALUES (
    p_keyword, p_category, p_keyword_type, p_priority_tier,
    p_min_view_count, p_min_engagement_rate, p_description
  ) RETURNING id INTO keyword_id;
  
  RETURN keyword_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 🔄 초기화 함수 (초기 세팅 시 가상 실행 날짜 분산)
-- =============================================================================

-- 초기 키워드 실행 날짜 가상 분산 함수
CREATE OR REPLACE FUNCTION initialize_keyword_execution_dates()
RETURNS void AS $$
DECLARE
  high_count integer;
  medium_count integer; 
  low_count integer;
  high_cycle integer; -- 3개씩 선택하므로 전체/3 = 순환일수
  medium_cycle integer; -- 5개씩 선택하므로 전체/5 = 순환일수
  low_cycle integer; -- 2개씩 선택하므로 전체/2 = 순환일수
  rec RECORD;
  virtual_date timestamptz;
BEGIN
  -- 각 그룹의 키워드 수 계산
  SELECT COUNT(*) INTO high_count FROM daily_keywords WHERE priority_tier = 'high' AND is_active = true;
  SELECT COUNT(*) INTO medium_count FROM daily_keywords WHERE priority_tier = 'medium' AND is_active = true;
  SELECT COUNT(*) INTO low_count FROM daily_keywords WHERE priority_tier = 'low' AND is_active = true;
  
  -- 순환 주기 계산
  high_cycle := CEIL(high_count::decimal / 3.0)::integer;    -- 3개씩 선택
  medium_cycle := CEIL(medium_count::decimal / 5.0)::integer; -- 5개씩 선택
  low_cycle := CEIL(low_count::decimal / 2.0)::integer;      -- 2개씩 선택
  
  RAISE NOTICE '📊 초기화 시작:';
  RAISE NOTICE '   high 그룹: %개 키워드, %일 순환', high_count, high_cycle;
  RAISE NOTICE '   medium 그룹: %개 키워드, %일 순환', medium_count, medium_cycle;
  RAISE NOTICE '   low 그룹: %개 키워드, %일 순환', low_count, low_cycle;
  
  -- high 그룹 가상 날짜 설정
  FOR rec IN 
    SELECT id, sequence_number FROM daily_keywords 
    WHERE priority_tier = 'high' AND is_active = true 
    ORDER BY sequence_number
  LOOP
    -- 각 키워드가 마지막으로 실행된 가상 날짜 계산
    -- sequence_number를 3으로 나눈 몫에 따라 날짜 분산
    virtual_date := now() - (high_cycle - ((rec.sequence_number - 1) / 3)) * interval '1 day' 
                          - (random() * 12) * interval '1 hour'; -- 0-12시간 랜덤 분산
    
    UPDATE daily_keywords 
    SET last_executed_at = virtual_date
    WHERE id = rec.id;
  END LOOP;
  
  -- medium 그룹 가상 날짜 설정
  FOR rec IN 
    SELECT id, sequence_number FROM daily_keywords 
    WHERE priority_tier = 'medium' AND is_active = true 
    ORDER BY sequence_number
  LOOP
    virtual_date := now() - (medium_cycle - ((rec.sequence_number - 1) / 5)) * interval '1 day' 
                          - (random() * 12) * interval '1 hour';
    
    UPDATE daily_keywords 
    SET last_executed_at = virtual_date
    WHERE id = rec.id;
  END LOOP;
  
  -- low 그룹 가상 날짜 설정
  FOR rec IN 
    SELECT id, sequence_number FROM daily_keywords 
    WHERE priority_tier = 'low' AND is_active = true 
    ORDER BY sequence_number
  LOOP
    virtual_date := now() - (low_cycle - ((rec.sequence_number - 1) / 2)) * interval '1 day' 
                          - (random() * 12) * interval '1 hour';
    
    UPDATE daily_keywords 
    SET last_executed_at = virtual_date
    WHERE id = rec.id;
  END LOOP;
  
  RAISE NOTICE '✅ 초기화 완료! 모든 키워드에 가상 실행 날짜 설정됨';
  RAISE NOTICE '📅 이제 get_todays_keywords()가 자연스럽게 순환됩니다';
END;
$$ LANGUAGE plpgsql;



-- =============================================================================
-- 📊 테이블 코멘트
-- =============================================================================

COMMENT ON TABLE daily_keywords IS 'KEYWORDS.md 기반 일일 키워드 관리 테이블 - dailyKeywordUpdateService.js 연동';
COMMENT ON COLUMN daily_keywords.keyword IS '검색 키워드 (예: "먹방", "K-pop")';
COMMENT ON COLUMN daily_keywords.category IS '9개 고정 카테고리 중 하나';
COMMENT ON COLUMN daily_keywords.priority_tier IS '중요도 그룹 (고/중/저)';
COMMENT ON COLUMN daily_keywords.sequence_number IS '그룹 내 순서 번호 (1,2,3,4...)';
COMMENT ON COLUMN daily_keywords.total_api_units_consumed IS '총 소모된 YouTube API 단위수';

COMMENT ON TABLE keyword_update_schedules IS '키워드 갱신 스케줄 관리 - 배치 작업 추적';
COMMENT ON TABLE keyword_performance_logs IS '키워드별 성과 추적 - realtime-keyword-search.js 연동';

-- =============================================================================
-- ✅ 생성 완료 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 ===== 07_daily_keywords_management.sql 완료! =====';
  RAISE NOTICE '🔄 실행 기반 순환 시스템 (high/medium/low)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 핵심 구성:';
  RAISE NOTICE '   1. daily_keywords 테이블 (실행 기반 순환 시스템)';
  RAISE NOTICE '   2. keyword_update_schedules 테이블 (스케줄 관리)';
  RAISE NOTICE '   3. keyword_performance_logs 테이블 (성과 추적)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 일일 선택 로직 (실행 기반):';
  RAISE NOTICE '   - high 그룹: 매일 3개 선택 (가장 오래된 것부터)';
  RAISE NOTICE '   - medium 그룹: 매일 5개 선택 (가장 오래된 것부터)';
  RAISE NOTICE '   - low 그룹: 매일 2개 선택 (가장 오래된 것부터)';
  RAISE NOTICE '   총 10개/일 선택, last_executed_at 기준 자동 순환';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 자동 기능:';
  RAISE NOTICE '   - sequence_number 자동 할당';
  RAISE NOTICE '   - 삭제 시 자동 순서 재정렬';
  RAISE NOTICE '   - 실행 기반 자동 순환 (안전!)';
  RAISE NOTICE '   - 초기화 시 가상 날짜 분산';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 핵심 함수:';
  RAISE NOTICE '   - get_todays_keywords(): 오늘 실행할 10개 키워드';
  RAISE NOTICE '   - initialize_keyword_execution_dates(): 초기 날짜 분산';
  RAISE NOTICE '   - complete_keyword_update(): 실행 완료 기록';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 다음 단계:';
  RAISE NOTICE '   1. Supabase SQL Editor에서 실행';
  RAISE NOTICE '   2. 별도 키워드 삽입 SQL 파일 생성 (241개)';
  RAISE NOTICE '   3. initialize_keyword_execution_dates() 실행';
  RAISE NOTICE '   4. get_todays_keywords() 함수 테스트';
  RAISE NOTICE '   5. dailyKeywordUpdateService.js 연동 테스트';
END $$; 