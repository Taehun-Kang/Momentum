-- =============================================================================
-- 02_daily_keywords_v2.sql
-- 일일 키워드 관리 시스템 (MVP 버전)
-- 
-- 기능: 3+5+2 키워드 선택 시스템 + 새 키워드 우선 처리
-- 특징: sequence_number 그룹별 자동 할당, last_used_at 기반 순환
-- =============================================================================

CREATE TABLE daily_keywords_v2 (
  -- =============================================================================
  -- 🆔 기본 식별자
  -- =============================================================================
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- =============================================================================
  -- 🔗 키워드 기본 정보
  -- =============================================================================
  keyword varchar(255) UNIQUE NOT NULL,          -- 검색 키워드 (예: "먹방", "ASMR")
  category varchar(100) NOT NULL,                -- 카테고리 ('음식', '엔터테인먼트' 등)
  
  -- =============================================================================
  -- 🎯 우선순위 시스템 (그룹별 관리)
  -- =============================================================================
  priority_tier varchar(20) NOT NULL             -- 'high', 'medium', 'low'
    CHECK (priority_tier IN ('high', 'medium', 'low')),
  sequence_number integer NOT NULL,              -- 그룹 내 순서 (각 tier별로 1,2,3,4...)
  
  -- =============================================================================
  -- 🔄 사용 관리 (새 키워드 우선 처리)
  -- =============================================================================
  is_active boolean DEFAULT true,                -- 활성화 여부
  last_used_at timestamptz DEFAULT '2020-01-01 00:00:00+00'::timestamptz, -- 새 키워드 우선!
  usage_count integer DEFAULT 0,                 -- 총 사용 횟수
  
  -- =============================================================================
  -- 📊 수집 성과 (단순화)
  -- =============================================================================
  total_videos_collected integer DEFAULT 0,      -- 총 수집된 영상 수
  last_collection_count integer DEFAULT 0,       -- 마지막 수집 시 영상 수
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- =============================================================================
  -- 🔗 유니크 제약조건
  -- =============================================================================
  CONSTRAINT unique_tier_sequence_v2 UNIQUE (priority_tier, sequence_number)
);

-- =============================================================================
-- 📊 인덱스 생성 (성능 최적화)
-- =============================================================================

-- 기본 조회 인덱스
CREATE UNIQUE INDEX idx_daily_keywords_v2_keyword ON daily_keywords_v2(keyword);
CREATE INDEX idx_daily_keywords_v2_category ON daily_keywords_v2(category);

-- 선택 로직 핵심 인덱스 (tier별 마지막 사용 시간)
CREATE INDEX idx_daily_keywords_v2_tier_last_used 
ON daily_keywords_v2(priority_tier, last_used_at, sequence_number) 
WHERE is_active = true;

-- 활성화 상태 인덱스
CREATE INDEX idx_daily_keywords_v2_active ON daily_keywords_v2(is_active) 
WHERE is_active = true;

-- tier별 sequence_number 관리용 인덱스
CREATE INDEX idx_daily_keywords_v2_tier_sequence ON daily_keywords_v2(priority_tier, sequence_number);

-- =============================================================================
-- 🔄 트리거 및 함수
-- =============================================================================

-- 1) updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_daily_keywords_v2_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_daily_keywords_v2_updated_at
  BEFORE UPDATE ON daily_keywords_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_keywords_v2_updated_at();

-- 2) sequence_number 자동 할당 함수 (핵심!)
CREATE OR REPLACE FUNCTION auto_assign_sequence_number_v2()
RETURNS trigger AS $$
BEGIN
  -- sequence_number가 NULL이면 자동 할당 (해당 tier의 다음 번호)
  IF NEW.sequence_number IS NULL THEN
    SELECT COALESCE(MAX(sequence_number), 0) + 1 
    INTO NEW.sequence_number
    FROM daily_keywords_v2 
    WHERE priority_tier = NEW.priority_tier;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_sequence_v2_insert
  BEFORE INSERT ON daily_keywords_v2
  FOR EACH ROW 
  EXECUTE FUNCTION auto_assign_sequence_number_v2();

-- =============================================================================
-- 🎯 키워드 선택 및 관리 함수들
-- =============================================================================

-- 3) 오늘의 키워드 선택 함수 (3+5+2 시스템)
CREATE OR REPLACE FUNCTION get_todays_keywords_v2()
RETURNS TABLE(
  id uuid,
  keyword varchar(255),
  category varchar(100),
  priority_tier varchar(20),
  sequence_number integer,
  days_since_last_use integer,
  is_new_keyword boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH selected_keywords AS (
    -- high 그룹에서 3개 선택 (가장 오래된 것부터)
    (SELECT 
       dk.id, dk.keyword, dk.category, dk.priority_tier, dk.sequence_number,
       COALESCE(EXTRACT(days FROM now() - dk.last_used_at)::integer, 999) as days_since_last_use,
       (dk.usage_count = 0) as is_new_keyword
     FROM daily_keywords_v2 dk
     WHERE dk.priority_tier = 'high' AND dk.is_active = true
     ORDER BY 
       dk.last_used_at ASC,           -- 우선: 가장 오래된 것 (새 키워드 = 2020-01-01 = 최우선)
       dk.sequence_number ASC         -- 보조: 동일 날짜일 때 순서
     LIMIT 3)
    
    UNION ALL
    
    -- medium 그룹에서 5개 선택
    (SELECT 
       dk.id, dk.keyword, dk.category, dk.priority_tier, dk.sequence_number,
       COALESCE(EXTRACT(days FROM now() - dk.last_used_at)::integer, 999) as days_since_last_use,
       (dk.usage_count = 0) as is_new_keyword
     FROM daily_keywords_v2 dk
     WHERE dk.priority_tier = 'medium' AND dk.is_active = true
     ORDER BY dk.last_used_at ASC, dk.sequence_number ASC
     LIMIT 5)
    
    UNION ALL
    
    -- low 그룹에서 2개 선택
    (SELECT 
       dk.id, dk.keyword, dk.category, dk.priority_tier, dk.sequence_number,
       COALESCE(EXTRACT(days FROM now() - dk.last_used_at)::integer, 999) as days_since_last_use,
       (dk.usage_count = 0) as is_new_keyword
     FROM daily_keywords_v2 dk
     WHERE dk.priority_tier = 'low' AND dk.is_active = true
     ORDER BY dk.last_used_at ASC, dk.sequence_number ASC
     LIMIT 2)
  )
  SELECT sk.id, sk.keyword, sk.category, sk.priority_tier, sk.sequence_number, sk.days_since_last_use, sk.is_new_keyword
  FROM selected_keywords sk
  ORDER BY 
    CASE sk.priority_tier 
      WHEN 'high' THEN 1 
      WHEN 'medium' THEN 2 
      WHEN 'low' THEN 3 
    END,
    sk.is_new_keyword DESC,    -- 새 키워드 우선
    sk.sequence_number ASC;    -- 같은 tier 내에서는 순서대로
END;
$$ LANGUAGE plpgsql;

-- 4) 키워드 사용 완료 후 업데이트 함수
CREATE OR REPLACE FUNCTION update_keyword_usage_v2(
  keyword_name varchar(255),
  videos_collected integer
) RETURNS void AS $$
BEGIN
  UPDATE daily_keywords_v2 
  SET 
    last_used_at = now(),           -- 현재 시간으로 업데이트 (순환 시스템 진행)
    usage_count = usage_count + 1,
    total_videos_collected = total_videos_collected + videos_collected,
    last_collection_count = videos_collected,
    updated_at = now()
  WHERE keyword = keyword_name;
END;
$$ LANGUAGE plpgsql;

-- 5) 키워드 간편 추가 함수 (keyword + priority_tier만 입력)
CREATE OR REPLACE FUNCTION add_keyword_v2(
  keyword_name varchar(255),
  keyword_category varchar(100),
  keyword_tier varchar(20)
) RETURNS uuid AS $$
DECLARE
  new_keyword_id uuid;
BEGIN
  INSERT INTO daily_keywords_v2 (keyword, category, priority_tier)
  VALUES (keyword_name, keyword_category, keyword_tier)
  RETURNING id INTO new_keyword_id;
  
  RAISE NOTICE '✅ 새 키워드 추가: % (tier: %, 순서: 자동 할당)', keyword_name, keyword_tier;
  
  RETURN new_keyword_id;
END;
$$ LANGUAGE plpgsql;

-- 6) 전체 키워드 초기화 함수 (최초 설정 시에만 사용)
CREATE OR REPLACE FUNCTION initialize_all_keywords_dates_v2()
RETURNS void AS $$
DECLARE
  total_count integer;
  base_date timestamptz := '2023-01-01'::timestamptz;
  rec RECORD;
  days_offset integer;
BEGIN
  -- 전체 키워드 수 확인 (활성화된 모든 키워드)
  SELECT COUNT(*) INTO total_count 
  FROM daily_keywords_v2 
  WHERE is_active = true;
  
  RAISE NOTICE '🔄 전체 키워드 날짜 초기화 시작: %개', total_count;
  
  -- 모든 키워드를 120일에 균등 분산
  FOR rec IN 
    SELECT 
      id, 
      keyword, 
      priority_tier,
      sequence_number,
      ROW_NUMBER() OVER (ORDER BY priority_tier, sequence_number) as global_rank
    FROM daily_keywords_v2 
    WHERE is_active = true
    ORDER BY priority_tier, sequence_number
  LOOP
    -- 전체 순서를 120일에 균등 분산
    days_offset := ((rec.global_rank - 1) * 120 / total_count)::integer;
    
    UPDATE daily_keywords_v2 
    SET last_used_at = base_date + (days_offset || ' days')::interval + (random() * 12 || ' hours')::interval
    WHERE id = rec.id;
    
    -- 진행 상황 출력 (20개마다)
    IF rec.global_rank % 20 = 0 THEN
      RAISE NOTICE '   ✅ %개 처리 완료...', rec.global_rank;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ 완료! 모든 키워드가 과거 120일에 분산 배치됨';
  RAISE NOTICE '💡 참고: 이후 추가되는 새 키워드는 자동으로 2020-01-01로 설정되어 우선 선택됩니다';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 📊 편의 뷰 (빠른 조회용)
-- =============================================================================

-- 키워드 현황 대시보드 뷰
CREATE VIEW keywords_dashboard_v2 AS
SELECT 
  dk.priority_tier,
  dk.sequence_number,
  dk.keyword,
  dk.category,
  dk.is_active,
  dk.usage_count,
  dk.total_videos_collected,
  dk.last_collection_count,
  EXTRACT(days FROM now() - dk.last_used_at)::integer as days_since_last_use,
  (dk.usage_count = 0) as is_new_keyword,
  dk.last_used_at,
  dk.created_at
FROM daily_keywords_v2 dk
ORDER BY dk.priority_tier, dk.sequence_number;

-- 활성 키워드만 보는 뷰
CREATE VIEW active_keywords_v2 AS
SELECT *
FROM keywords_dashboard_v2
WHERE is_active = true;

-- =============================================================================
-- 📋 테이블 코멘트
-- =============================================================================

COMMENT ON TABLE daily_keywords_v2 IS 'YouTube Shorts 일일 키워드 관리 테이블 (MVP 버전) - 3+5+2 선택 시스템';
COMMENT ON COLUMN daily_keywords_v2.keyword IS '검색 키워드 (예: "먹방", "ASMR")';
COMMENT ON COLUMN daily_keywords_v2.priority_tier IS '우선순위 그룹 (high/medium/low)';
COMMENT ON COLUMN daily_keywords_v2.sequence_number IS '그룹 내 순서 번호 (각 tier별로 1,2,3,4... 자동 할당)';
COMMENT ON COLUMN daily_keywords_v2.last_used_at IS '마지막 사용 시간 (선택 기준, 새 키워드는 2020-01-01)';
COMMENT ON COLUMN daily_keywords_v2.usage_count IS '총 사용 횟수';
COMMENT ON COLUMN daily_keywords_v2.total_videos_collected IS '총 수집된 영상 수';

-- =============================================================================
-- ✅ 생성 완료 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ daily_keywords_v2 테이블 생성 완료!';
  RAISE NOTICE '📊 포함 기능:';
  RAISE NOTICE '   - 키워드 + priority_tier 입력 시 sequence_number 자동 할당';
  RAISE NOTICE '   - 3+5+2 키워드 선택 시스템 (get_todays_keywords_v2)';
  RAISE NOTICE '   - 새 키워드 우선 처리 (last_used_at = 2020-01-01)';
  RAISE NOTICE '   - 사용 후 자동 순환 (update_keyword_usage_v2)';
  RAISE NOTICE '   - 간편 추가 함수 (add_keyword_v2)';
  RAISE NOTICE '   - 전체 초기화 함수 (initialize_all_keywords_dates_v2)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 사용법:';
  RAISE NOTICE '   1. 키워드 추가: SELECT add_keyword_v2(''새키워드'', ''카테고리'', ''high'');';
  RAISE NOTICE '   2. 오늘 키워드: SELECT * FROM get_todays_keywords_v2();';
  RAISE NOTICE '   3. 사용 완료: SELECT update_keyword_usage_v2(''키워드'', 150);';
  RAISE NOTICE '   4. 초기화: SELECT initialize_all_keywords_dates_v2(); (최초 1회만)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 다음 단계: Supabase에서 테이블 생성 후 키워드 데이터 삽입';
END $$; 