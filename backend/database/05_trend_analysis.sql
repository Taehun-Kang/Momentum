-- =============================================================================
-- 05_trend_analysis.sql
-- 트렌드 분석 시스템 (YouTube Shorts AI 큐레이션 서비스)
-- 
-- 기능: Google Trends 수집 + 뉴스 정제 + 실시간 트렌드 분석
-- 연동: trends/modules + keywords/modules + llm/modules
-- 처리 흐름: Google Trends → 뉴스 정제 → YouTube 검색 → 채널 필터링
-- =============================================================================

-- 0. 기존 트렌드 테이블들 제거 (완전 교체)
DROP TABLE IF EXISTS trends_raw_data CASCADE;
DROP TABLE IF EXISTS trends_refined_keywords CASCADE;
DROP TABLE IF EXISTS trends_analysis_results CASCADE;
DROP TABLE IF EXISTS trends_keyword_analysis CASCADE;

-- =============================================================================
-- 📈 1. trends_raw_data 테이블 (Google Trends 원본 데이터)
-- 연동: google-trends-collector.js → collectAllGoogleTrends()
-- =============================================================================

CREATE TABLE trends_raw_data (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- =============================================================================
  -- 🎯 Google Trends 기본 정보
  -- =============================================================================
  keyword varchar(255) NOT NULL,                         -- 트렌드 키워드
  rank integer NOT NULL,                                 -- Google 원본 순위 (1-50)
  trend_score decimal(5,2) DEFAULT 0.0,                  -- 트렌드 점수 (0-100)
  normalized_score decimal(3,2) DEFAULT 0.0,             -- 정규화 점수 (0-1)

  -- =============================================================================
  -- 🌍 지역 및 언어 정보
  -- =============================================================================
  region_code varchar(5) NOT NULL DEFAULT 'KR',          -- 지역 코드 (KR, US, JP)
  language_code varchar(5) DEFAULT 'ko',                 -- 언어 코드 (ko, en, ja)

  -- =============================================================================
  -- 📊 Google 제공 통계 (SerpAPI 응답)
  -- =============================================================================
  search_volume integer,                                 -- 검색량
  increase_percentage integer,                           -- 증가율(%)
  
  -- 카테고리 정보 (배열)
  categories text[] DEFAULT '{}',                        -- Google 카테고리 목록
  primary_category varchar(100) DEFAULT 'general',       -- 주요 카테고리

  -- 관련 검색어 (trend_breakdown)
  related_terms text[] DEFAULT '{}',                     -- 관련 검색어들
  
  -- =============================================================================
  -- ⏰ 시간 정보
  -- =============================================================================
  start_timestamp timestamptz,                           -- 트렌드 시작 시간
  end_timestamp timestamptz,                             -- 트렌드 종료 시간
  detected_at timestamptz DEFAULT now(),                 -- 감지 시간
  
  -- =============================================================================
  -- 🔄 상태 및 품질 정보
  -- =============================================================================
  is_active boolean DEFAULT false,                       -- 활성 상태 (Google 제공)
  confidence_score decimal(3,2) DEFAULT 0.50,            -- 신뢰도 점수
  quality_grade varchar(2) DEFAULT 'B'                   -- 품질 등급 (A,B,C,D)
    CHECK (quality_grade IN ('A', 'B', 'C', 'D')),

  -- =============================================================================
  -- 📱 수집 메타데이터
  -- =============================================================================
  collection_source varchar(50) DEFAULT 'serp_api',      -- 수집 소스
  serp_api_link text,                                    -- SerpAPI 링크
  collection_batch_id uuid,                              -- 배치 수집 ID
  api_units_consumed integer DEFAULT 1,                  -- 소모된 API 단위
  
  -- Raw 데이터 저장 (원본 보존)
  raw_google_data jsonb DEFAULT '{}',                    -- Google Trends 원본 JSON

  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,         -- 생성 일시
  updated_at timestamptz DEFAULT now() NOT NULL,         -- 수정 일시

  -- =============================================================================
  -- 🔍 제약조건
  -- =============================================================================
  CHECK (rank >= 1 AND rank <= 100),
  CHECK (trend_score >= 0 AND trend_score <= 100),
  CHECK (normalized_score >= 0 AND normalized_score <= 1),
  CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- =============================================================================
-- 📊 trends_raw_data 인덱스 (성능 최적화)
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_trends_raw_data_keyword ON trends_raw_data(keyword);
CREATE INDEX idx_trends_raw_data_region ON trends_raw_data(region_code);
CREATE INDEX idx_trends_raw_data_detected_at ON trends_raw_data(detected_at DESC);

-- 키워드별 지역별 유니크 인덱스 (일일 제약조건 제거)
CREATE UNIQUE INDEX idx_trends_raw_data_keyword_region_unique 
  ON trends_raw_data(keyword, region_code, detected_at);

-- 랭킹 및 점수 인덱스
CREATE INDEX idx_trends_raw_data_rank ON trends_raw_data(rank);
CREATE INDEX idx_trends_raw_data_trend_score ON trends_raw_data(trend_score DESC);
CREATE INDEX idx_trends_raw_data_normalized_score ON trends_raw_data(normalized_score DESC);

-- 활성 트렌드 인덱스
CREATE INDEX idx_trends_raw_data_active ON trends_raw_data(is_active) WHERE is_active = true;
CREATE INDEX idx_trends_raw_data_quality ON trends_raw_data(quality_grade);

-- 복합 인덱스 (고성능 쿼리용)
CREATE INDEX idx_trends_raw_data_active_region_rank
  ON trends_raw_data(is_active, region_code, rank)
  WHERE is_active = true;

CREATE INDEX idx_trends_raw_data_region_time_rank
  ON trends_raw_data(region_code, detected_at, rank);

-- 한국 활성 트렌드 분석용
CREATE INDEX idx_trends_raw_data_kr_active
  ON trends_raw_data(detected_at, rank)
  WHERE region_code = 'KR' AND is_active = true;

-- GIN 인덱스 (배열 검색용)
CREATE INDEX idx_trends_raw_data_categories ON trends_raw_data USING GIN(categories);
CREATE INDEX idx_trends_raw_data_related_terms ON trends_raw_data USING GIN(related_terms);
CREATE INDEX idx_trends_raw_data_raw_google_data ON trends_raw_data USING GIN(raw_google_data);

-- =============================================================================
-- 🔄 trends_raw_data 트리거 및 자동화
-- =============================================================================

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_trends_raw_data_updated_at
  BEFORE UPDATE ON trends_raw_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 정규화 점수 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_trend_normalized_score()
RETURNS TRIGGER AS $$
BEGIN
  -- 트렌드 점수를 0-1로 정규화
  NEW.normalized_score := LEAST(NEW.trend_score / 100.0, 1.0);
  
  -- 품질 등급 자동 설정
  IF NEW.trend_score >= 80 AND NEW.is_active = true THEN
    NEW.quality_grade := 'A';
  ELSIF NEW.trend_score >= 60 THEN
    NEW.quality_grade := 'B';
  ELSIF NEW.trend_score >= 40 THEN
    NEW.quality_grade := 'C';
  ELSE
    NEW.quality_grade := 'D';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_trend_score
  BEFORE INSERT OR UPDATE ON trends_raw_data
  FOR EACH ROW EXECUTE FUNCTION calculate_trend_normalized_score();

-- =============================================================================
-- 📊 trends_raw_data 관리 함수들
-- =============================================================================

-- 일일 트렌드 정리 함수 (7일 이상 된 데이터 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_trend_data()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM trends_raw_data 
  WHERE detected_at < (now() - interval '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 한국 활성 트렌드 조회 함수 (getActiveKoreanTrends 연동)
CREATE OR REPLACE FUNCTION get_active_korean_trends(max_keywords integer DEFAULT 50)
RETURNS TABLE(
  keyword varchar(255),
  rank integer,
  trend_score decimal(5,2),
  categories text[],
  detected_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.keyword,
    t.rank,
    t.trend_score,
    t.categories,
    t.detected_at
  FROM trends_raw_data t
  WHERE 
    t.region_code = 'KR'
    AND t.is_active = true
    AND t.detected_at::date = CURRENT_DATE
  ORDER BY t.rank
  LIMIT max_keywords;
END;
$$ LANGUAGE plpgsql;

-- 지역별 트렌드 통계 함수 (성능 최적화)
CREATE OR REPLACE FUNCTION get_trend_stats_by_region(target_region varchar(5) DEFAULT 'KR')
RETURNS TABLE(
  total_trends integer,
  active_trends integer,
  avg_trend_score decimal(5,2),
  top_category varchar(100)
) AS $$
DECLARE
  top_cat varchar(100);
BEGIN
  -- 상위 카테고리를 별도로 조회 (성능 최적화)
  SELECT categories[1] INTO top_cat
  FROM trends_raw_data 
  WHERE region_code = target_region 
    AND array_length(categories, 1) > 0
    AND detected_at::date = CURRENT_DATE
  GROUP BY categories[1]
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_trends,
    COUNT(*) FILTER (WHERE is_active = true)::integer as active_trends,
    AVG(trend_score)::decimal(5,2) as avg_trend_score,
    top_cat as top_category
  FROM trends_raw_data
  WHERE region_code = target_region
    AND detected_at::date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 📋 trends_raw_data 테이블 코멘트
-- =============================================================================

COMMENT ON TABLE trends_raw_data IS 'Google Trends 원본 데이터 저장 테이블 - SerpAPI 통합';
COMMENT ON COLUMN trends_raw_data.keyword IS '트렌드 키워드 (Google Trends 원본)';
COMMENT ON COLUMN trends_raw_data.rank IS 'Google 원본 순위 (1-50, 트렌드 강도 순서)';
COMMENT ON COLUMN trends_raw_data.trend_score IS 'Google Trends 점수 (0-100)';
COMMENT ON COLUMN trends_raw_data.region_code IS '지역 코드 (KR=한국, US=미국, JP=일본)';
COMMENT ON COLUMN trends_raw_data.is_active IS 'Google에서 제공하는 활성 상태';
COMMENT ON COLUMN trends_raw_data.collection_batch_id IS '배치 수집 식별자 (동시 수집된 트렌드 그룹)';

-- =============================================================================
-- ✅ trends_raw_data 생성 완료 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ trends_raw_data 테이블 생성 완료!';
  RAISE NOTICE '📊 연동 서비스: google-trends-collector.js';
  RAISE NOTICE '🎯 주요 기능:';
  RAISE NOTICE '   - Google Trends 원본 데이터 저장';
  RAISE NOTICE '   - 지역별 트렌드 분석 (KR, US, JP)';
  RAISE NOTICE '   - 자동 품질 등급 시스템';
  RAISE NOTICE '   - 12개 성능 인덱스 + 자동화 함수 4개';
END $$;

-- =============================================================================
-- 📰 2. trends_refined_keywords 테이블 (뉴스 기반 정제된 키워드)
-- 연동: news-based-trend-refiner.js → refineActiveKeywords()
-- =============================================================================

CREATE TABLE trends_refined_keywords (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- =============================================================================
  -- 🔗 원본 트렌드 연결
  -- =============================================================================
  original_trend_ids uuid[] DEFAULT '{}',                -- 원본 트렌드 ID들 (중복 제거된 경우)
  
  -- =============================================================================
  -- 🎯 정제된 키워드 정보
  -- =============================================================================
  original_keyword varchar(255) NOT NULL,                -- 원본 키워드
  refined_keyword varchar(255) NOT NULL,                 -- 정제된 키워드 ("원본 + 한 단어")
  refinement_type varchar(50) DEFAULT 'news_context'     -- 정제 방식
    CHECK (refinement_type IN ('news_context', 'claude_ai', 'duplicate_merge', 'basic_refine')),

  -- =============================================================================
  -- 📰 뉴스 분석 결과
  -- =============================================================================
  news_articles_count integer DEFAULT 0,                 -- 분석된 뉴스 기사 수
  news_headlines text[] DEFAULT '{}',                    -- 주요 뉴스 헤드라인
  news_context varchar(500),                             -- 뉴스 맥락 요약
  news_sentiment varchar(20) DEFAULT 'neutral'           -- 뉴스 감정 (positive, negative, neutral, mixed)
    CHECK (news_sentiment IN ('positive', 'negative', 'neutral', 'mixed')),

  -- =============================================================================
  -- 🤖 Claude AI 분석 정보
  -- =============================================================================
  claude_analysis_used boolean DEFAULT false,            -- Claude AI 사용 여부
  duplicate_theme varchar(100),                          -- 중복 제거 시 주제 (예: "중동_갈등")
  original_order integer,                                -- 원본 트렌드 순서
  final_order integer,                                   -- 최종 정렬 순서
  youtube_optimization_notes text,                       -- YouTube 최적화 노트

  -- =============================================================================
  -- 📊 품질 및 신뢰도
  -- =============================================================================
  refinement_confidence decimal(3,2) DEFAULT 0.50,       -- 정제 신뢰도
  keyword_relevance_score decimal(3,2) DEFAULT 0.50,     -- 키워드 관련성 점수
  youtube_search_potential decimal(3,2) DEFAULT 0.50,    -- YouTube 검색 잠재력

  -- =============================================================================
  -- 🎯 상태 및 활성화
  -- =============================================================================
  is_active boolean DEFAULT true,                        -- 활성 상태
  is_selected_for_youtube boolean DEFAULT false,         -- YouTube 검색 선택 여부
  blocked_reason varchar(100),                           -- 차단 사유 (있는 경우)

  -- =============================================================================
  -- 📈 성과 추적
  -- =============================================================================
  youtube_search_count integer DEFAULT 0,                -- YouTube 검색 횟수
  video_found_count integer DEFAULT 0,                   -- 발견된 영상 수
  user_interaction_count integer DEFAULT 0,              -- 사용자 상호작용 수
  success_rate decimal(3,2) DEFAULT 0.00,                -- 성공률

  -- =============================================================================
  -- 🔄 처리 메타데이터
  -- =============================================================================
  processing_batch_id uuid,                              -- 처리 배치 ID
  processing_duration_ms integer,                        -- 처리 시간 (밀리초)
  fallback_used boolean DEFAULT false,                   -- 폴백 사용 여부
  
  -- Raw 분석 데이터 저장
  raw_claude_response jsonb DEFAULT '{}',                -- Claude AI 원본 응답
  raw_news_data jsonb DEFAULT '{}',                      -- 뉴스 분석 원본 데이터

  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  refined_at timestamptz DEFAULT now(),                  -- 정제 시간
  expires_at timestamptz DEFAULT (now() + interval '24 hours'), -- 만료 시간
  created_at timestamptz DEFAULT now() NOT NULL,         -- 생성 일시
  updated_at timestamptz DEFAULT now() NOT NULL,         -- 수정 일시

  -- =============================================================================
  -- 🔍 제약조건
  -- =============================================================================
  CHECK (refinement_confidence >= 0 AND refinement_confidence <= 1),
  CHECK (keyword_relevance_score >= 0 AND keyword_relevance_score <= 1),
  CHECK (youtube_search_potential >= 0 AND youtube_search_potential <= 1),
  CHECK (success_rate >= 0 AND success_rate <= 1),
  CHECK (news_articles_count >= 0),
  CHECK (youtube_search_count >= 0),
  CHECK (video_found_count >= 0)
);

-- =============================================================================
-- 📊 trends_refined_keywords 인덱스
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_trends_refined_keywords_original ON trends_refined_keywords(original_keyword);
CREATE INDEX idx_trends_refined_keywords_refined ON trends_refined_keywords(refined_keyword);
CREATE INDEX idx_trends_refined_keywords_refined_at ON trends_refined_keywords(refined_at DESC);

-- 정제된 키워드 유니크 인덱스 (타임스탬프 포함)
CREATE UNIQUE INDEX idx_trends_refined_keywords_unique 
  ON trends_refined_keywords(refined_keyword, refined_at);

-- 활성 키워드 인덱스
CREATE INDEX idx_trends_refined_keywords_active ON trends_refined_keywords(is_active) WHERE is_active = true;
CREATE INDEX idx_trends_refined_keywords_selected ON trends_refined_keywords(is_selected_for_youtube) 
  WHERE is_selected_for_youtube = true;

-- 품질 및 성과 인덱스
CREATE INDEX idx_trends_refined_keywords_confidence ON trends_refined_keywords(refinement_confidence DESC);
CREATE INDEX idx_trends_refined_keywords_youtube_potential ON trends_refined_keywords(youtube_search_potential DESC);
CREATE INDEX idx_trends_refined_keywords_success_rate ON trends_refined_keywords(success_rate DESC);

-- 정제 방식 및 순서 인덱스
CREATE INDEX idx_trends_refined_keywords_type ON trends_refined_keywords(refinement_type);
CREATE INDEX idx_trends_refined_keywords_order ON trends_refined_keywords(final_order);
CREATE INDEX idx_trends_refined_keywords_claude ON trends_refined_keywords(claude_analysis_used);

-- 만료 관리 인덱스
CREATE INDEX idx_trends_refined_keywords_expires ON trends_refined_keywords(expires_at);

-- 복합 인덱스 (고성능 YouTube 검색용)
CREATE INDEX idx_trends_refined_keywords_youtube_ready
  ON trends_refined_keywords(is_active, youtube_search_potential DESC, final_order)
  WHERE is_active = true AND is_selected_for_youtube = true;

-- 정제 성과 분석용
CREATE INDEX idx_trends_refined_keywords_performance
  ON trends_refined_keywords(refined_at, success_rate DESC, video_found_count DESC);

-- GIN 인덱스 (배열 및 JSON 검색용)
CREATE INDEX idx_trends_refined_keywords_headlines ON trends_refined_keywords USING GIN(news_headlines);
CREATE INDEX idx_trends_refined_keywords_original_ids ON trends_refined_keywords USING GIN(original_trend_ids);
CREATE INDEX idx_trends_refined_keywords_claude_response ON trends_refined_keywords USING GIN(raw_claude_response);

-- =============================================================================
-- 🔄 trends_refined_keywords 트리거 및 자동화
-- =============================================================================

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_trends_refined_keywords_updated_at
  BEFORE UPDATE ON trends_refined_keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 성공률 자동 계산 함수 (안전성 강화)
CREATE OR REPLACE FUNCTION calculate_keyword_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- NULL 값 안전 처리
  NEW.youtube_search_count := COALESCE(NEW.youtube_search_count, 0);
  NEW.video_found_count := COALESCE(NEW.video_found_count, 0);
  NEW.news_articles_count := COALESCE(NEW.news_articles_count, 0);
  
  -- YouTube 검색 성공률 계산 (안전한 나눗셈)
  IF NEW.youtube_search_count > 0 THEN
    NEW.success_rate := LEAST(
      CAST(NEW.video_found_count AS decimal) / NULLIF(NEW.youtube_search_count, 0), 
      1.0
    );
  ELSE
    NEW.success_rate := 0.0;
  END IF;
  
  -- YouTube 검색 잠재력 자동 조정
  IF NEW.news_articles_count >= 5 AND NEW.claude_analysis_used = true THEN
    NEW.youtube_search_potential := GREATEST(NEW.youtube_search_potential, 0.7);
  ELSIF NEW.news_articles_count >= 3 THEN
    NEW.youtube_search_potential := GREATEST(NEW.youtube_search_potential, 0.5);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_refined_keyword_success
  BEFORE INSERT OR UPDATE ON trends_refined_keywords
  FOR EACH ROW EXECUTE FUNCTION calculate_keyword_success_rate();

-- =============================================================================
-- 📊 trends_refined_keywords 관리 함수들
-- =============================================================================

-- 만료된 정제 키워드 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_refined_keywords()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM trends_refined_keywords 
  WHERE expires_at < now() OR refined_at < (now() - interval '3 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- YouTube 검색 준비된 키워드 조회 함수
CREATE OR REPLACE FUNCTION get_youtube_ready_keywords(max_keywords integer DEFAULT 10)
RETURNS TABLE(
  refined_keyword varchar(255),
  youtube_search_potential decimal(3,2),
  final_order integer,
  news_context varchar(500),
  refined_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.refined_keyword,
    t.youtube_search_potential,
    t.final_order,
    t.news_context,
    t.refined_at
  FROM trends_refined_keywords t
  WHERE 
    t.is_active = true
    AND t.is_selected_for_youtube = true
    AND t.expires_at > now()
    AND t.refined_at::date = CURRENT_DATE
  ORDER BY t.final_order, t.youtube_search_potential DESC
  LIMIT max_keywords;
END;
$$ LANGUAGE plpgsql;

-- 정제 성과 통계 함수
CREATE OR REPLACE FUNCTION get_refinement_stats(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_refined integer,
  claude_used_count integer,
  avg_success_rate decimal(3,2),
  top_performing_keyword varchar(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_refined,
    COUNT(*) FILTER (WHERE claude_analysis_used = true)::integer as claude_used_count,
    AVG(success_rate)::decimal(3,2) as avg_success_rate,
    (
      SELECT refined_keyword 
      FROM trends_refined_keywords 
      WHERE refined_at::date = target_date
        AND video_found_count > 0
      ORDER BY success_rate DESC, video_found_count DESC
      LIMIT 1
    ) as top_performing_keyword
  FROM trends_refined_keywords
  WHERE refined_at::date = target_date;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 📋 trends_refined_keywords 테이블 코멘트
-- =============================================================================

COMMENT ON TABLE trends_refined_keywords IS '뉴스 기반 정제된 트렌드 키워드 테이블 - Claude AI 분석 통합';
COMMENT ON COLUMN trends_refined_keywords.original_keyword IS '원본 Google Trends 키워드';
COMMENT ON COLUMN trends_refined_keywords.refined_keyword IS '뉴스 맥락으로 정제된 키워드 (원본 + 한 단어)';
COMMENT ON COLUMN trends_refined_keywords.claude_analysis_used IS 'Claude AI 분석 사용 여부';
COMMENT ON COLUMN trends_refined_keywords.duplicate_theme IS '중복 제거 시 통합된 주제명';
COMMENT ON COLUMN trends_refined_keywords.youtube_search_potential IS 'YouTube 검색 성공 잠재력 (0-1)';

-- =============================================================================
-- ✅ trends_refined_keywords 생성 완료 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ trends_refined_keywords 테이블 생성 완료!';
  RAISE NOTICE '📊 연동 서비스: news-based-trend-refiner.js';
  RAISE NOTICE '🎯 주요 기능:';
  RAISE NOTICE '   - 뉴스 맥락 기반 키워드 정제';
  RAISE NOTICE '   - Claude AI 중복 제거 + 맥락 추가';
  RAISE NOTICE '   - YouTube 검색 최적화';
  RAISE NOTICE '   - 14개 성능 인덱스 + 자동화 함수 4개';
END $$;

-- =============================================================================
-- 📊 3. trends_analysis_results 테이블 (일일/시간별 트렌드 분석)
-- =============================================================================

CREATE TABLE trends_analysis_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 분석 기간 정보
  analysis_date date NOT NULL,
  analysis_type varchar(20) DEFAULT 'daily' CHECK (analysis_type IN ('hourly', 'daily', 'weekly')),
  
  -- 분석 결과 요약
  total_trends_collected integer DEFAULT 0,
  active_trends_count integer DEFAULT 0,
  refined_keywords_count integer DEFAULT 0,
  youtube_searches_performed integer DEFAULT 0,
  
  -- 성과 지표
  avg_refinement_success_rate decimal(3,2) DEFAULT 0.0,
  avg_youtube_success_rate decimal(3,2) DEFAULT 0.0,
  total_videos_found integer DEFAULT 0,
  
  -- 지역별 통계
  kr_trends_count integer DEFAULT 0,
  us_trends_count integer DEFAULT 0,
  
  -- API 사용량
  serp_api_calls integer DEFAULT 0,
  claude_api_calls integer DEFAULT 0,
  youtube_api_units integer DEFAULT 0,
  
  -- 메타데이터
  top_categories text[] DEFAULT '{}',
  processing_duration_ms integer,
  
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 인덱스
CREATE INDEX idx_trends_analysis_results_date ON trends_analysis_results(analysis_date DESC);
CREATE INDEX idx_trends_analysis_results_type ON trends_analysis_results(analysis_type);

-- 분석 유형별 일일 유니크 제약
CREATE UNIQUE INDEX idx_trends_analysis_results_unique 
  ON trends_analysis_results(analysis_date, analysis_type);

-- =============================================================================
-- 📈 4. trends_keyword_analysis 테이블 (키워드별 상세 분석)
-- 연동: realtime-trend-collector.js → analyzeRealtimeTrend()
-- =============================================================================

CREATE TABLE trends_keyword_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 키워드 정보
  keyword varchar(255) NOT NULL,
  analysis_timestamp timestamptz DEFAULT now(),
  
  -- 실시간 분석 결과 (Claude AI)
  trend_status varchar(500),                             -- 현재 트렌드 상황
  news_context varchar(500),                             -- 뉴스 주요 맥락
  public_interest varchar(500),                          -- 대중 관심도
  
  -- 생성된 YouTube 키워드들 (최대 5개)
  youtube_keywords text[] DEFAULT '{}',                  -- ["키워드1", "키워드2", ...]
  keyword_types text[] DEFAULT '{}',                     -- ["기본", "빈출", "AI", ...]
  confidence_levels text[] DEFAULT '{}',                 -- ["high", "medium", "low", ...]
  
  -- 뉴스 분석 정보
  news_articles_analyzed integer DEFAULT 0,
  frequent_keywords text[] DEFAULT '{}',                 -- 빈출 키워드들
  
  -- 성과 추적
  keywords_used_for_youtube integer DEFAULT 0,
  videos_found integer DEFAULT 0,
  user_clicks integer DEFAULT 0,
  
  -- 품질 점수
  analysis_quality_score decimal(3,2) DEFAULT 0.50,
  
  -- Raw 데이터
  raw_claude_analysis jsonb DEFAULT '{}',
  raw_news_data jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '6 hours'),
  
  CHECK (analysis_quality_score >= 0 AND analysis_quality_score <= 1)
);

-- 인덱스
CREATE INDEX idx_trends_keyword_analysis_keyword ON trends_keyword_analysis(keyword);
CREATE INDEX idx_trends_keyword_analysis_timestamp ON trends_keyword_analysis(analysis_timestamp DESC);
CREATE INDEX idx_trends_keyword_analysis_quality ON trends_keyword_analysis(analysis_quality_score DESC);
CREATE INDEX idx_trends_keyword_analysis_expires ON trends_keyword_analysis(expires_at);
CREATE INDEX idx_trends_keyword_analysis_youtube_keywords ON trends_keyword_analysis USING GIN(youtube_keywords);

-- =============================================================================
-- 🔗 테이블 간 관계 및 편의 뷰
-- =============================================================================

-- 종합 트렌드 대시보드 뷰
CREATE VIEW trends_dashboard AS
SELECT 
  r.keyword as raw_keyword,
  r.rank as google_rank,
  r.trend_score,
  rf.refined_keyword,
  rf.youtube_search_potential,
  rf.success_rate,
  ka.youtube_keywords,
  r.detected_at,
  rf.refined_at
FROM trends_raw_data r
LEFT JOIN trends_refined_keywords rf ON r.keyword = rf.original_keyword
LEFT JOIN trends_keyword_analysis ka ON r.keyword = ka.keyword
WHERE r.detected_at::date = CURRENT_DATE
  AND r.region_code = 'KR'
  AND r.is_active = true
ORDER BY r.rank;

-- 오늘의 트렌드 요약 뷰
CREATE VIEW todays_trend_summary AS
SELECT 
  COUNT(*) as total_trends,
  COUNT(*) FILTER (WHERE is_active = true) as active_trends,
  AVG(trend_score) as avg_score,
  MAX(trend_score) as max_score,
  string_agg(DISTINCT primary_category, ', ') as categories
FROM trends_raw_data
WHERE detected_at::date = CURRENT_DATE
  AND region_code = 'KR';

-- =============================================================================
-- 🔄 자동화 및 정리 함수들
-- =============================================================================

-- 전체 트렌드 데이터 정리 함수
CREATE OR REPLACE FUNCTION cleanup_all_trend_data()
RETURNS TABLE(raw_deleted integer, refined_deleted integer, analysis_deleted integer) AS $$
DECLARE
  raw_count integer;
  refined_count integer;
  analysis_count integer;
BEGIN
  -- 7일 이상 된 원본 데이터 삭제
  SELECT cleanup_old_trend_data() INTO raw_count;
  
  -- 3일 이상 된 정제 키워드 삭제
  SELECT cleanup_expired_refined_keywords() INTO refined_count;
  
  -- 6시간 이상 된 키워드 분석 삭제
  DELETE FROM trends_keyword_analysis WHERE expires_at < now();
  GET DIAGNOSTICS analysis_count = ROW_COUNT;
  
  RETURN QUERY SELECT raw_count, refined_count, analysis_count;
END;
$$ LANGUAGE plpgsql;

-- 일일 트렌드 분석 요약 생성 함수
CREATE OR REPLACE FUNCTION generate_daily_trend_summary(target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO trends_analysis_results (
    analysis_date,
    analysis_type,
    total_trends_collected,
    active_trends_count,
    refined_keywords_count,
    kr_trends_count,
    avg_refinement_success_rate
  )
  SELECT 
    target_date,
    'daily',
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active = true),
    (SELECT COUNT(*) FROM trends_refined_keywords WHERE refined_at::date = target_date),
    COUNT(*) FILTER (WHERE region_code = 'KR'),
    COALESCE((SELECT AVG(success_rate) FROM trends_refined_keywords WHERE refined_at::date = target_date), 0)
  FROM trends_raw_data
  WHERE detected_at::date = target_date
  ON CONFLICT (analysis_date, analysis_type) DO UPDATE SET
    total_trends_collected = EXCLUDED.total_trends_collected,
    active_trends_count = EXCLUDED.active_trends_count,
    refined_keywords_count = EXCLUDED.refined_keywords_count,
    kr_trends_count = EXCLUDED.kr_trends_count,
    avg_refinement_success_rate = EXCLUDED.avg_refinement_success_rate;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ✅ 전체 트렌드 분석 시스템 완성 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 ===== 05_trend_analysis.sql 구현 완료! =====';
  RAISE NOTICE '📊 총 4개 테이블 + 2개 뷰 + 8개 함수 생성';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 테이블 구성:';
  RAISE NOTICE '   1. trends_raw_data (Google Trends 원본)';
  RAISE NOTICE '   2. trends_refined_keywords (뉴스 정제 키워드)';
  RAISE NOTICE '   3. trends_analysis_results (일일 분석 요약)';
  RAISE NOTICE '   4. trends_keyword_analysis (실시간 키워드 분석)';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 서비스 연동:';
  RAISE NOTICE '   - google-trends-collector.js ✅';
  RAISE NOTICE '   - news-based-trend-refiner.js ✅';
  RAISE NOTICE '   - realtime-trend-collector.js ✅';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 다음 단계: Supabase에서 실행 후 06_system_management.sql 구현';
END $$; 