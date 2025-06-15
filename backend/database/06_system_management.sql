-- ================================================================
-- 📊 06_system_management.sql - 시스템 관리 & 모니터링
-- ================================================================
-- 
-- 📋 포함 테이블:
-- 1. api_usage_logs          - API 사용량 추적 (YouTube, Claude, SerpAPI)
-- 2. cache_performance_logs  - 캐시 성능 추적 
-- 3. llm_processing_logs     - LLM 처리 로깅 (토큰, 비용, 성능)
-- 4. system_performance_logs - 시스템 성능 지표
-- 5. automated_job_logs      - 자동화 작업 관리
--
-- 🔗 연동 모듈들:
-- - youtube-search-engine.js
-- - video-tagger.js  
-- - result-analyzer.js
-- - google-trends-collector.js
-- - channel-info-collector.js
-- - realtime-keyword-search.js
-- ================================================================

-- ================================================================
-- 1️⃣ API 사용량 추적 테이블
-- ================================================================

CREATE TABLE api_usage_logs (
    -- 기본 정보
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id varchar(50),
    
    -- API 정보  
    api_provider varchar(30) NOT NULL CHECK (api_provider IN (
        'youtube_data_api', 'claude_api', 'serp_api', 'google_trends'
    )),
    api_endpoint varchar(100) NOT NULL, -- 'search.list', 'videos.list', 'channels.list', 'messages'
    api_method varchar(20) DEFAULT 'GET',
    
    -- YouTube API 전용 필드
    youtube_api_parts text[], -- ['snippet', 'statistics', 'contentDetails']
    youtube_quota_units integer DEFAULT 0, -- 실제 사용된 YouTube API units
    youtube_video_count integer DEFAULT 0, -- 처리된 영상 수
    youtube_page_token varchar(50), -- 페이지네이션 토큰
    
    -- Claude API 전용 필드
    claude_model varchar(50), -- 'claude-3-5-sonnet-20241022'
    claude_input_tokens integer DEFAULT 0,
    claude_output_tokens integer DEFAULT 0,
    claude_total_tokens integer GENERATED ALWAYS AS (claude_input_tokens + claude_output_tokens) STORED,
    claude_cost_usd decimal(10,6) DEFAULT 0.0, -- 실제 비용 (달러)
    
    -- SerpAPI 전용 필드
    serp_search_type varchar(30), -- 'google_news', 'google_trends', 'google_autocomplete'
    serp_query varchar(255),
    serp_results_count integer DEFAULT 0,
    
    -- 공통 성능 지표
    request_size_bytes integer DEFAULT 0,
    response_size_bytes integer DEFAULT 0,
    response_time_ms integer NOT NULL,
    
    -- 상태 및 결과
    success boolean NOT NULL DEFAULT true,
    http_status_code integer,
    error_message text,
    error_type varchar(50), -- 'quota_exceeded', 'rate_limit', 'network_error', 'auth_error'
    
    -- 컨텍스트 정보
    user_id uuid REFERENCES auth.users(id),
    search_keyword varchar(255),
    operation_type varchar(50), -- 'video_search', 'batch_classification', 'trend_collection'
    module_name varchar(50) NOT NULL, -- 'youtube-search-engine', 'video-tagger'
    
    -- 시간 정보
    created_at timestamptz DEFAULT now() NOT NULL,
    processed_at timestamptz DEFAULT now()
);

-- ================================================================
-- 2️⃣ 캐시 성능 추적 테이블  
-- ================================================================

CREATE TABLE cache_performance_logs (
    -- 기본 정보
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 캐시 정보
    cache_type varchar(30) NOT NULL CHECK (cache_type IN (
        'news_cache', 'analysis_cache', 'search_results', 'video_details',
        'channel_info', 'trend_data', 'user_preferences', 'autocomplete'
    )),
    cache_key varchar(255) NOT NULL,
    cache_operation varchar(20) NOT NULL CHECK (cache_operation IN (
        'hit', 'miss', 'set', 'delete', 'expire', 'evict'
    )),
    
    -- 성능 지표
    hit_count integer DEFAULT 0,
    miss_count integer DEFAULT 0,
    hit_rate decimal(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN (hit_count + miss_count) > 0 
            THEN ROUND((hit_count::decimal / (hit_count + miss_count)) * 100, 2)
            ELSE 0 
        END
    ) STORED,
    
    -- 캐시 데이터 정보
    data_size_bytes integer DEFAULT 0,
    ttl_seconds integer, -- 설정된 TTL
    actual_lifetime_seconds integer, -- 실제 생존 시간
    access_count integer DEFAULT 1,
    
    -- 비용 절약 효과 (YouTube API units 절약)
    api_units_saved integer DEFAULT 0,
    cost_saved_usd decimal(8,4) DEFAULT 0.0,
    
    -- 컨텍스트
    module_name varchar(50), -- 'news-based-trend-refiner', 'channel-info-collector'
    search_keyword varchar(255),
    user_id uuid REFERENCES auth.users(id),
    
    -- 시간 정보
    created_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz,
    last_accessed_at timestamptz DEFAULT now()
);

-- ================================================================
-- 3️⃣ LLM 처리 로깅 테이블
-- ================================================================

CREATE TABLE llm_processing_logs (
    -- 기본 정보
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id varchar(50),
    
    -- LLM 작업 정보
    llm_provider varchar(20) NOT NULL DEFAULT 'claude',
    model_name varchar(50) NOT NULL, -- 'claude-3-5-sonnet-20241022'
    processing_type varchar(50) NOT NULL CHECK (processing_type IN (
        'video_classification', 'batch_tagging', 'search_analysis', 
        'trend_analysis', 'keyword_extraction', 'query_building',
        'result_analysis', 'natural_language_extraction'
    )),
    
    -- 입력 데이터 정보
    input_videos_count integer DEFAULT 0,
    input_text_length integer DEFAULT 0,
    input_data_type varchar(30), -- 'video_metadata', 'search_results', 'news_articles'
    
    -- 토큰 사용량
    input_tokens integer NOT NULL DEFAULT 0,
    output_tokens integer NOT NULL DEFAULT 0,
    total_tokens integer GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    
    -- 비용 정보
    cost_per_input_token decimal(10,8) DEFAULT 0.000003, -- $3/1M tokens
    cost_per_output_token decimal(10,8) DEFAULT 0.000015, -- $15/1M tokens
    total_cost_usd decimal(10,6) GENERATED ALWAYS AS (
        (input_tokens * cost_per_input_token) + (output_tokens * cost_per_output_token)
    ) STORED,
    
    -- 처리 결과
    success boolean NOT NULL DEFAULT true,
    processing_time_ms integer NOT NULL,
    confidence_score decimal(3,2), -- 0.00-1.00
    
    -- 결과 통계 (video-tagger.js 기반)
    classification_results jsonb DEFAULT '{}', -- 4가지 카테고리 태그 결과
    quality_metrics jsonb DEFAULT '{}', -- result-analyzer.js 품질 지표
    extraction_results jsonb DEFAULT '{}', -- 추출된 키워드 및 분석 결과
    
    -- 에러 정보
    error_message text,
    error_type varchar(50), -- 'rate_limit', 'context_length', 'parsing_error', 'api_error'
    retry_count integer DEFAULT 0,
    
    -- 컨텍스트
    module_name varchar(50) NOT NULL, -- 'video-tagger', 'result-analyzer'
    operation_context jsonb DEFAULT '{}', -- 추가 컨텍스트 정보
    user_id uuid REFERENCES auth.users(id),
    
    -- 시간 정보
    created_at timestamptz DEFAULT now() NOT NULL,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz DEFAULT now()
);

-- ================================================================
-- 4️⃣ 시스템 성능 지표 테이블
-- ================================================================

CREATE TABLE system_performance_logs (
    -- 기본 정보
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 성능 지표 타입
    metric_type varchar(30) NOT NULL CHECK (metric_type IN (
        'search_performance', 'classification_performance', 'api_efficiency',
        'cache_efficiency', 'database_performance', 'user_experience'
    )),
    
    -- 검색 성능 지표 (youtube-search-engine.js, pagination-handler.js)
    search_keyword varchar(255),
    search_results_count integer DEFAULT 0,
    pages_searched integer DEFAULT 0,
    api_units_used integer DEFAULT 0,
    efficiency_videos_per_100units decimal(6,2), -- 25.5 videos/100units
    target_achievement_rate decimal(5,2), -- 125.0% (목표 40개 → 50개 달성)
    
    -- 분류 성능 지표 (video-tagger.js, result-analyzer.js)
    classification_batch_size integer DEFAULT 0,
    successful_classifications integer DEFAULT 0,
    failed_classifications integer DEFAULT 0,
    classification_success_rate decimal(5,2), -- 95.5%
    average_confidence_score decimal(3,2), -- 0.85
    
    -- API 효율성 지표
    total_api_calls integer DEFAULT 0,
    successful_api_calls integer DEFAULT 0,
    api_success_rate decimal(5,2),
    average_response_time_ms integer DEFAULT 0,
    quota_usage_percentage decimal(5,2), -- 85.5% (8,550/10,000 units)
    
    -- 캐시 효율성
    cache_hit_rate decimal(5,2), -- 87.3%
    cache_miss_rate decimal(5,2), -- 12.7%
    api_units_saved_by_cache integer DEFAULT 0,
    
    -- 데이터베이스 성능
    db_query_count integer DEFAULT 0,
    db_average_query_time_ms integer DEFAULT 0,
    db_connection_pool_usage decimal(5,2),
    
    -- 사용자 경험 지표
    user_satisfaction_score decimal(3,2), -- 4.2/5.0
    average_user_session_duration integer, -- 초 단위
    bounce_rate decimal(5,2), -- 15.5%
    
    -- 시스템 리소스
    cpu_usage_percentage decimal(5,2),
    memory_usage_percentage decimal(5,2),
    disk_usage_percentage decimal(5,2),
    network_bandwidth_mbps decimal(8,2),
    
    -- 컨텍스트
    module_name varchar(50),
    operation_type varchar(50),
    user_id uuid REFERENCES auth.users(id),
    
    -- 시간 정보 (1시간 단위 집계)
    measurement_timestamp timestamptz DEFAULT now() NOT NULL,
    aggregation_period varchar(20) DEFAULT 'hourly' CHECK (aggregation_period IN (
        'realtime', 'hourly', 'daily', 'weekly'
    )),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ================================================================
-- 5️⃣ 자동화 작업 로그 테이블
-- ================================================================

CREATE TABLE automated_job_logs (
    -- 기본 정보
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 작업 정보
    job_name varchar(100) NOT NULL, -- 'trend_collection_morning', 'daily_keyword_caching'
    job_type varchar(30) NOT NULL CHECK (job_type IN (
        'trend_collection', 'keyword_caching', 'cache_cleanup', 
        'statistics_generation', 'database_maintenance', 'backup'
    )),
    job_schedule varchar(50), -- '0 10 * * *' (cron format)
    
    -- 실행 상태
    status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'
    )),
    
    -- 실행 시간
    scheduled_at timestamptz NOT NULL,
    started_at timestamptz,
    completed_at timestamptz,
    execution_duration_ms integer,
    timeout_ms integer DEFAULT 300000, -- 5분 기본 타임아웃
    
    -- 처리 결과 (realtime-keyword-search.js 세션 리포트 기반)
    items_processed integer DEFAULT 0, -- 처리된 아이템 수
    items_successful integer DEFAULT 0, -- 성공한 아이템 수
    items_failed integer DEFAULT 0, -- 실패한 아이템 수
    
    -- 트렌드 수집 전용 필드
    trend_keywords_collected integer DEFAULT 0,
    trend_regions text[], -- ['KR', 'US', 'JP']
    
    -- 키워드 캐싱 전용 필드
    keywords_cached integer DEFAULT 0,
    videos_added integer DEFAULT 0,
    duplicates_skipped integer DEFAULT 0,
    
    -- API 사용량
    api_calls_made integer DEFAULT 0,
    api_units_consumed integer DEFAULT 0,
    api_cost_usd decimal(8,4) DEFAULT 0.0,
    
    -- 정리 작업 전용 필드
    cache_entries_cleaned integer DEFAULT 0,
    old_logs_deleted integer DEFAULT 0,
    disk_space_freed_mb integer DEFAULT 0,
    
    -- 결과 데이터
    execution_log text, -- 실행 상세 로그
    error_message text,
    error_stack text,
    warnings text[],
    
    -- 성능 지표
    efficiency_score decimal(5,2), -- 효율성 점수 (items_successful / api_units_consumed * 100)
    success_rate decimal(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN items_processed > 0 
            THEN ROUND((items_successful::decimal / items_processed) * 100, 2)
            ELSE 0 
        END
    ) STORED,
    
    -- 메타데이터
    job_config jsonb DEFAULT '{}', -- 작업 설정
    environment varchar(20) DEFAULT 'production',
    server_instance varchar(50),
    
    -- 시간 정보
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ================================================================
-- 📊 인덱스 생성 (성능 최적화)
-- ================================================================

-- API 사용량 로그 인덱스
CREATE INDEX idx_api_usage_provider_endpoint ON api_usage_logs(api_provider, api_endpoint);
CREATE INDEX idx_api_usage_created_at ON api_usage_logs(created_at);
CREATE INDEX idx_api_usage_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_session_id ON api_usage_logs(session_id);
CREATE INDEX idx_api_usage_youtube_units ON api_usage_logs(youtube_quota_units) WHERE youtube_quota_units > 0;
CREATE INDEX idx_api_usage_claude_cost ON api_usage_logs(claude_cost_usd) WHERE claude_cost_usd > 0;
CREATE INDEX idx_api_usage_success_status ON api_usage_logs(success, http_status_code);
CREATE INDEX idx_api_usage_error_type ON api_usage_logs(error_type) WHERE error_type IS NOT NULL;
CREATE INDEX idx_api_usage_module_operation ON api_usage_logs(module_name, operation_type);

-- 캐시 성능 로그 인덱스  
CREATE INDEX idx_cache_performance_type_operation ON cache_performance_logs(cache_type, cache_operation);
CREATE INDEX idx_cache_performance_key ON cache_performance_logs(cache_key);
CREATE INDEX idx_cache_performance_created_at ON cache_performance_logs(created_at);
CREATE INDEX idx_cache_performance_hit_rate ON cache_performance_logs(hit_rate);
CREATE INDEX idx_cache_performance_expires_at ON cache_performance_logs(expires_at);
CREATE INDEX idx_cache_performance_module ON cache_performance_logs(module_name);
CREATE INDEX idx_cache_performance_keyword ON cache_performance_logs(search_keyword);
CREATE INDEX idx_cache_performance_savings ON cache_performance_logs(api_units_saved) WHERE api_units_saved > 0;

-- LLM 처리 로그 인덱스
CREATE INDEX idx_llm_processing_type_model ON llm_processing_logs(processing_type, model_name);
CREATE INDEX idx_llm_processing_created_at ON llm_processing_logs(created_at);
CREATE INDEX idx_llm_processing_success ON llm_processing_logs(success);
CREATE INDEX idx_llm_processing_cost ON llm_processing_logs(total_cost_usd);
CREATE INDEX idx_llm_processing_tokens ON llm_processing_logs(total_tokens);
CREATE INDEX idx_llm_processing_module ON llm_processing_logs(module_name);
CREATE INDEX idx_llm_processing_session ON llm_processing_logs(session_id);
CREATE INDEX idx_llm_processing_confidence ON llm_processing_logs(confidence_score);
CREATE INDEX idx_llm_processing_time ON llm_processing_logs(processing_time_ms);

-- 시스템 성능 로그 인덱스
CREATE INDEX idx_system_performance_metric_type ON system_performance_logs(metric_type);
CREATE INDEX idx_system_performance_timestamp ON system_performance_logs(measurement_timestamp);
CREATE INDEX idx_system_performance_aggregation ON system_performance_logs(aggregation_period);
CREATE INDEX idx_system_performance_keyword ON system_performance_logs(search_keyword);
CREATE INDEX idx_system_performance_efficiency ON system_performance_logs(efficiency_videos_per_100units);
CREATE INDEX idx_system_performance_success_rate ON system_performance_logs(classification_success_rate);
CREATE INDEX idx_system_performance_cache_hit ON system_performance_logs(cache_hit_rate);
CREATE INDEX idx_system_performance_module ON system_performance_logs(module_name);

-- 자동화 작업 로그 인덱스
CREATE INDEX idx_automated_job_name_type ON automated_job_logs(job_name, job_type);
CREATE INDEX idx_automated_job_status ON automated_job_logs(status);
CREATE INDEX idx_automated_job_scheduled_at ON automated_job_logs(scheduled_at);
CREATE INDEX idx_automated_job_created_at ON automated_job_logs(created_at);
CREATE INDEX idx_automated_job_success_rate ON automated_job_logs(success_rate);
CREATE INDEX idx_automated_job_efficiency ON automated_job_logs(efficiency_score);
CREATE INDEX idx_automated_job_api_units ON automated_job_logs(api_units_consumed);
CREATE INDEX idx_automated_job_environment ON automated_job_logs(environment);

-- ================================================================
-- 🛠️ 시스템 관리 함수들
-- ================================================================

-- 1. API 사용량 일일 집계 함수
CREATE OR REPLACE FUNCTION get_daily_api_usage(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
    provider varchar(30),
    total_calls bigint,
    successful_calls bigint,
    total_quota_units bigint,
    total_cost_usd numeric,
    avg_response_time_ms numeric,
    success_rate numeric
) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aul.api_provider as provider,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE aul.success = true) as successful_calls,
        COALESCE(SUM(aul.youtube_quota_units), 0) as total_quota_units,
        COALESCE(SUM(aul.claude_cost_usd), 0) as total_cost_usd,
        ROUND(AVG(aul.response_time_ms), 2) as avg_response_time_ms,
        ROUND(
            COUNT(*) FILTER (WHERE aul.success = true) * 100.0 / COUNT(*), 
            2
        ) as success_rate
    FROM api_usage_logs aul
    WHERE DATE(aul.created_at) = target_date
    GROUP BY aul.api_provider
    ORDER BY total_quota_units DESC, total_cost_usd DESC;
END;
$$;

-- 2. 캐시 효율성 분석 함수
CREATE OR REPLACE FUNCTION get_cache_efficiency_report(days_back integer DEFAULT 7)
RETURNS TABLE (
    cache_type varchar(30),
    total_operations bigint,
    hit_count bigint,
    miss_count bigint,
    hit_rate_percentage numeric,
    api_units_saved bigint,
    avg_data_size_kb numeric
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cpl.cache_type,
        COUNT(*) as total_operations,
        SUM(cpl.hit_count) as hit_count,
        SUM(cpl.miss_count) as miss_count,
        CASE 
            WHEN SUM(cpl.hit_count + cpl.miss_count) > 0 
            THEN ROUND(SUM(cpl.hit_count) * 100.0 / SUM(cpl.hit_count + cpl.miss_count), 2)
            ELSE 0 
        END as hit_rate_percentage,
        SUM(cpl.api_units_saved) as api_units_saved,
        ROUND(AVG(cpl.data_size_bytes / 1024.0), 2) as avg_data_size_kb
    FROM cache_performance_logs cpl
    WHERE cpl.created_at >= CURRENT_DATE - INTERVAL '%s days' % days_back
    GROUP BY cpl.cache_type
    ORDER BY hit_rate_percentage DESC, api_units_saved DESC;
END;
$$;

-- 3. LLM 비용 분석 함수
CREATE OR REPLACE FUNCTION get_llm_cost_analysis(start_date date DEFAULT CURRENT_DATE - 30)
RETURNS TABLE (
    processing_type varchar(50),
    total_operations bigint,
    total_tokens bigint,
    total_cost_usd numeric,
    avg_confidence numeric,
    success_rate numeric,
    avg_processing_time_ms numeric
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lpl.processing_type,
        COUNT(*) as total_operations,
        SUM(lpl.total_tokens) as total_tokens,
        SUM(lpl.total_cost_usd) as total_cost_usd,
        ROUND(AVG(lpl.confidence_score), 3) as avg_confidence,
        ROUND(COUNT(*) FILTER (WHERE lpl.success = true) * 100.0 / COUNT(*), 2) as success_rate,
        ROUND(AVG(lpl.processing_time_ms), 2) as avg_processing_time_ms
    FROM llm_processing_logs lpl
    WHERE DATE(lpl.created_at) >= start_date
    GROUP BY lpl.processing_type
    ORDER BY total_cost_usd DESC, total_operations DESC;
END;
$$;

-- 4. 시스템 성능 대시보드 함수
CREATE OR REPLACE FUNCTION get_system_performance_dashboard(hours_back integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    result jsonb;
BEGIN
    WITH performance_metrics AS (
        SELECT 
            metric_type,
            AVG(efficiency_videos_per_100units) as avg_efficiency,
            AVG(classification_success_rate) as avg_classification_rate,
            AVG(api_success_rate) as avg_api_success_rate,
            AVG(cache_hit_rate) as avg_cache_hit_rate,
            AVG(quota_usage_percentage) as avg_quota_usage,
            AVG(average_response_time_ms) as avg_response_time
        FROM system_performance_logs
        WHERE measurement_timestamp >= NOW() - INTERVAL '%s hours' % hours_back
        GROUP BY metric_type
    )
    SELECT jsonb_build_object(
        'search_performance', jsonb_build_object(
            'efficiency_videos_per_100units', COALESCE((SELECT avg_efficiency FROM performance_metrics WHERE metric_type = 'search_performance'), 0),
            'api_success_rate', COALESCE((SELECT avg_api_success_rate FROM performance_metrics WHERE metric_type = 'search_performance'), 0),
            'average_response_time_ms', COALESCE((SELECT avg_response_time FROM performance_metrics WHERE metric_type = 'search_performance'), 0)
        ),
        'classification_performance', jsonb_build_object(
            'success_rate', COALESCE((SELECT avg_classification_rate FROM performance_metrics WHERE metric_type = 'classification_performance'), 0),
            'average_response_time_ms', COALESCE((SELECT avg_response_time FROM performance_metrics WHERE metric_type = 'classification_performance'), 0)
        ),
        'cache_efficiency', jsonb_build_object(
            'hit_rate', COALESCE((SELECT avg_cache_hit_rate FROM performance_metrics WHERE metric_type = 'cache_efficiency'), 0)
        ),
        'api_efficiency', jsonb_build_object(
            'quota_usage_percentage', COALESCE((SELECT avg_quota_usage FROM performance_metrics WHERE metric_type = 'api_efficiency'), 0),
            'success_rate', COALESCE((SELECT avg_api_success_rate FROM performance_metrics WHERE metric_type = 'api_efficiency'), 0)
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 5. 자동화 작업 상태 확인 함수
CREATE OR REPLACE FUNCTION get_job_status_summary(days_back integer DEFAULT 7)
RETURNS TABLE (
    job_type varchar(30),
    total_runs bigint,
    successful_runs bigint,
    failed_runs bigint,
    success_rate numeric,
    avg_execution_time_seconds numeric,
    total_api_units_consumed bigint,
    total_items_processed bigint
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ajl.job_type,
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE ajl.status = 'completed') as successful_runs,
        COUNT(*) FILTER (WHERE ajl.status = 'failed') as failed_runs,
        ROUND(
            COUNT(*) FILTER (WHERE ajl.status = 'completed') * 100.0 / COUNT(*), 
            2
        ) as success_rate,
        ROUND(AVG(ajl.execution_duration_ms / 1000.0), 2) as avg_execution_time_seconds,
        SUM(ajl.api_units_consumed) as total_api_units_consumed,
        SUM(ajl.items_successful) as total_items_processed
    FROM automated_job_logs ajl
    WHERE ajl.created_at >= CURRENT_DATE - INTERVAL '%s days' % days_back
    GROUP BY ajl.job_type
    ORDER BY success_rate DESC, total_runs DESC;
END;
$$;

-- ================================================================
-- 🧹 자동 정리 함수들
-- ================================================================

-- 1. 오래된 로그 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    api_deleted integer;
    cache_deleted integer;
    llm_deleted integer;
    performance_deleted integer;
    job_deleted integer;
BEGIN
    -- 90일 이상 된 API 로그 삭제
    DELETE FROM api_usage_logs WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS api_deleted = ROW_COUNT;
    
    -- 60일 이상 된 캐시 로그 삭제
    DELETE FROM cache_performance_logs WHERE created_at < NOW() - INTERVAL '60 days';
    GET DIAGNOSTICS cache_deleted = ROW_COUNT;
    
    -- 30일 이상 된 LLM 로그 삭제 (비용 데이터 보존을 위해 짧게)
    DELETE FROM llm_processing_logs WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS llm_deleted = ROW_COUNT;
    
    -- 7일 이상 된 실시간 성능 로그 삭제 (hourly/daily만 보존)
    DELETE FROM system_performance_logs 
    WHERE created_at < NOW() - INTERVAL '7 days' 
    AND aggregation_period = 'realtime';
    GET DIAGNOSTICS performance_deleted = ROW_COUNT;
    
    -- 180일 이상 된 자동화 작업 로그 삭제
    DELETE FROM automated_job_logs WHERE created_at < NOW() - INTERVAL '180 days';
    GET DIAGNOSTICS job_deleted = ROW_COUNT;
    
    -- 정리 결과 로깅
    INSERT INTO automated_job_logs (
        job_name, job_type, status,
        scheduled_at, started_at, completed_at,
        execution_log,
        old_logs_deleted
    ) VALUES (
        'cleanup_old_logs_auto', 'database_maintenance', 'completed',
        NOW(), NOW(), NOW(),
        format('정리 완료 - API: %s, Cache: %s, LLM: %s, Performance: %s, Jobs: %s', 
               api_deleted, cache_deleted, llm_deleted, performance_deleted, job_deleted),
        api_deleted + cache_deleted + llm_deleted + performance_deleted + job_deleted
    );
    
    RAISE NOTICE '로그 정리 완료: API(%), Cache(%), LLM(%), Performance(%), Jobs(%)', 
                 api_deleted, cache_deleted, llm_deleted, performance_deleted, job_deleted;
END;
$$;

-- 2. 성능 통계 집계 함수
CREATE OR REPLACE FUNCTION aggregate_performance_metrics()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    -- 지난 1시간의 실시간 데이터를 시간별로 집계
    INSERT INTO system_performance_logs (
        metric_type, 
        search_results_count, pages_searched, api_units_used,
        efficiency_videos_per_100units, classification_success_rate,
        api_success_rate, cache_hit_rate, quota_usage_percentage,
        measurement_timestamp, aggregation_period
    )
    SELECT 
        'hourly_aggregate',
        SUM(search_results_count),
        SUM(pages_searched),
        SUM(api_units_used),
        AVG(efficiency_videos_per_100units),
        AVG(classification_success_rate),
        AVG(api_success_rate),
        AVG(cache_hit_rate),
        AVG(quota_usage_percentage),
        DATE_TRUNC('hour', measurement_timestamp),
        'hourly'
    FROM system_performance_logs
    WHERE aggregation_period = 'realtime'
    AND measurement_timestamp >= NOW() - INTERVAL '2 hours'
    AND measurement_timestamp < NOW() - INTERVAL '1 hour'
    GROUP BY DATE_TRUNC('hour', measurement_timestamp);
    
    RAISE NOTICE '성능 통계 시간별 집계 완료';
END;
$$;

-- ================================================================
-- 📊 뷰 생성 (대시보드용)
-- ================================================================

-- 1. 실시간 API 사용량 뷰
CREATE VIEW current_api_usage AS
SELECT 
    api_provider,
    COUNT(*) as calls_today,
    SUM(youtube_quota_units) as quota_used_today,
    SUM(claude_cost_usd) as cost_today,
    ROUND(AVG(response_time_ms), 2) as avg_response_time,
    ROUND(COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2) as success_rate
FROM api_usage_logs
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY api_provider;

-- 2. 캐시 효율성 뷰
CREATE VIEW current_cache_efficiency AS
SELECT 
    cache_type,
    SUM(hit_count) as total_hits,
    SUM(miss_count) as total_misses,
    CASE 
        WHEN SUM(hit_count + miss_count) > 0 
        THEN ROUND(SUM(hit_count) * 100.0 / SUM(hit_count + miss_count), 2)
        ELSE 0 
    END as hit_rate_percentage,
    SUM(api_units_saved) as units_saved_today
FROM cache_performance_logs
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY cache_type;

-- 3. LLM 처리 현황 뷰
CREATE VIEW current_llm_processing AS
SELECT 
    processing_type,
    COUNT(*) as operations_today,
    SUM(total_tokens) as tokens_used_today,
    SUM(total_cost_usd) as cost_today,
    ROUND(AVG(confidence_score), 3) as avg_confidence,
    ROUND(COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2) as success_rate
FROM llm_processing_logs
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY processing_type;

-- 4. 자동화 작업 현황 뷰
CREATE VIEW recent_job_status AS
SELECT 
    job_name,
    job_type,
    status,
    scheduled_at,
    completed_at,
    execution_duration_ms / 1000 as execution_seconds,
    success_rate,
    api_units_consumed,
    items_successful,
    ROW_NUMBER() OVER (PARTITION BY job_type ORDER BY scheduled_at DESC) as rn
FROM automated_job_logs
WHERE scheduled_at >= CURRENT_DATE - INTERVAL '7 days';

-- ================================================================
-- 🔧 데이터베이스 설정 최적화
-- ================================================================

-- 자동 통계 수집 활성화
ALTER TABLE api_usage_logs SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE cache_performance_logs SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE llm_processing_logs SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE system_performance_logs SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE automated_job_logs SET (autovacuum_analyze_scale_factor = 0.05);

-- ================================================================
-- ✅ 시스템 관리 테이블 생성 완료!
-- ================================================================

-- 📊 요약:
-- - 5개 핵심 테이블: API 사용량, 캐시 성능, LLM 처리, 시스템 성능, 자동화 작업
-- - 40+ 인덱스: 검색 및 분석 최적화
-- - 5개 관리 함수: 일일 리포트, 비용 분석, 성능 대시보드
-- - 2개 정리 함수: 자동 로그 정리, 통계 집계
-- - 4개 실시간 뷰: 대시보드 및 모니터링용
-- 
-- 🎯 실제 서비스 모듈과 완벽 연동:
-- - youtube-search-engine.js → api_usage_logs
-- - video-tagger.js → llm_processing_logs  
-- - result-analyzer.js → system_performance_logs
-- - google-trends-collector.js → automated_job_logs
-- - channel-info-collector.js → cache_performance_logs
-- - realtime-keyword-search.js → 모든 테이블 통합

-- ================================================================
-- 📊 추가 시스템 관리 기능 (Non-MCP)
-- ================================================================

-- ================================================================
-- 6️⃣ 사용자 행동 패턴 분석 테이블
-- ================================================================

CREATE TABLE user_behavior_analytics (
    -- 기본 정보
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    
    -- 행동 패턴 정보
    behavior_type varchar(30) NOT NULL CHECK (behavior_type IN (
        'search_pattern', 'viewing_pattern', 'interaction_pattern', 
        'personalization_response', 'ab_test_interaction'
    )),
    
    -- 검색 패턴 (search_pattern)
    search_frequency_daily decimal(5,2), -- 일일 평균 검색 횟수
    avg_search_keyword_length integer,
    preferred_search_time_hours integer[], -- [10, 14, 20] (오전 10시, 오후 2시, 밤 8시)
    search_diversity_score decimal(3,2), -- 검색 키워드 다양성 (0.0-1.0)
    
    -- 시청 패턴 (viewing_pattern)
    avg_video_completion_rate decimal(3,2), -- 평균 영상 완료율
    preferred_video_duration_range varchar(20), -- '30-60s', '60-90s'
    skip_rate decimal(3,2), -- 건너뛰기 비율
    replay_rate decimal(3,2), -- 다시보기 비율
    
    -- 상호작용 패턴 (interaction_pattern)
    engagement_score decimal(3,2), -- 전체 참여도 점수
    like_to_view_ratio decimal(4,3), -- 좋아요/시청 비율
    share_to_view_ratio decimal(4,3), -- 공유/시청 비율
    comment_frequency decimal(3,2), -- 댓글 작성 빈도
    
    -- 개인화 반응 (personalization_response)
    personalized_content_preference decimal(3,2), -- 개인화 콘텐츠 선호도
    recommendation_acceptance_rate decimal(3,2), -- 추천 수용률
    mood_detection_accuracy decimal(3,2), -- 감정 인식 정확도
    keyword_suggestion_usage_rate decimal(3,2), -- 키워드 제안 사용률
    
    -- A/B 테스트 상호작용 (ab_test_interaction)
    ab_test_id varchar(50),
    test_group varchar(20), -- 'control', 'variant_a', 'variant_b'
    test_conversion_rate decimal(3,2), -- 테스트 전환율
    test_engagement_improvement decimal(3,2), -- 참여도 개선율
    
    -- 메타데이터
    measurement_period_start timestamptz NOT NULL,
    measurement_period_end timestamptz NOT NULL,
    data_points_count integer DEFAULT 0, -- 분석에 사용된 데이터 포인트 수
    confidence_level decimal(3,2) DEFAULT 0.95, -- 통계적 신뢰도
    
    -- 시간 정보
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- ================================================================
-- 7️⃣ 실시간 알림 시스템 테이블
-- ================================================================

CREATE TABLE system_alerts (
    -- 기본 정보
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 알림 정보
    alert_type varchar(30) NOT NULL CHECK (alert_type IN (
        'api_quota_warning', 'api_quota_critical', 'performance_degradation',
        'cache_miss_spike', 'error_rate_high', 'cost_threshold_exceeded',
        'user_activity_anomaly', 'service_unavailable'
    )),
    severity varchar(20) NOT NULL CHECK (severity IN (
        'info', 'warning', 'error', 'critical'
    )),
    
    -- 알림 내용
    title varchar(200) NOT NULL,
    message text NOT NULL,
    details jsonb DEFAULT '{}',
    
    -- 임계값 정보
    threshold_value decimal(10,2),
    current_value decimal(10,2),
    threshold_type varchar(50), -- 'percentage', 'absolute', 'rate'
    
    -- 대상 및 액션
    affected_service varchar(50), -- 'youtube_api', 'claude_api', 'cache_system'
    recommended_action text,
    auto_resolution_possible boolean DEFAULT false,
    
    -- 알림 상태
    status varchar(20) DEFAULT 'active' CHECK (status IN (
        'active', 'acknowledged', 'resolved', 'suppressed'
    )),
    acknowledged_by uuid REFERENCES auth.users(id),
    acknowledged_at timestamptz,
    resolved_at timestamptz,
    resolution_notes text,
    
    -- 알림 규칙
    rule_id varchar(50), -- 알림을 발생시킨 규칙 ID
    cooldown_period_minutes integer DEFAULT 60, -- 동일 알림 재발생 방지 시간
    
    -- 시간 정보
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- ================================================================
-- 8️⃣ 비즈니스 지표 테이블
-- ================================================================

CREATE TABLE business_metrics (
    -- 기본 정보
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 지표 정보
    metric_category varchar(30) NOT NULL CHECK (metric_category IN (
        'revenue', 'cost', 'user_acquisition', 'user_retention', 'engagement'
    )),
    metric_name varchar(100) NOT NULL,
    
    -- 수익 지표 (revenue)
    revenue_total_usd decimal(10,2) DEFAULT 0,
    revenue_per_user_usd decimal(8,4) DEFAULT 0,
    subscription_conversion_rate decimal(5,2), -- 프리미엄 전환율
    premium_user_retention_rate decimal(5,2), -- 프리미엄 사용자 유지율
    
    -- 비용 지표 (cost) 
    api_cost_total_usd decimal(8,4) DEFAULT 0,
    api_cost_per_user_usd decimal(6,4) DEFAULT 0,
    infrastructure_cost_usd decimal(8,2) DEFAULT 0,
    cost_per_acquisition_usd decimal(6,2), -- 사용자 획득 비용
    
    -- 사용자 획득 지표 (user_acquisition)
    new_users_count integer DEFAULT 0,
    organic_signup_rate decimal(5,2), -- 자연 가입률
    referral_signup_rate decimal(5,2), -- 추천 가입률
    acquisition_channel varchar(50), -- 'organic', 'referral', 'ads', 'social'
    
    -- 사용자 유지 지표 (user_retention)
    day1_retention_rate decimal(5,2), -- 1일 후 재방문률
    day7_retention_rate decimal(5,2), -- 7일 후 재방문률
    day30_retention_rate decimal(5,2), -- 30일 후 재방문률
    churn_rate decimal(5,2), -- 이탈률
    
    -- 참여도 지표 (engagement)
    daily_active_users integer DEFAULT 0,
    weekly_active_users integer DEFAULT 0,
    monthly_active_users integer DEFAULT 0,
    avg_session_duration_minutes decimal(6,2),
    avg_videos_per_session decimal(4,1),
    
    -- 시간 범위
    measurement_date date NOT NULL,
    measurement_period varchar(20) DEFAULT 'daily' CHECK (measurement_period IN (
        'daily', 'weekly', 'monthly', 'quarterly'
    )),
    
    -- 시간 정보
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ================================================================
-- 📊 추가 인덱스 생성
-- ================================================================

-- 사용자 행동 분석 인덱스
CREATE INDEX idx_user_behavior_user_type ON user_behavior_analytics(user_id, behavior_type);
CREATE INDEX idx_user_behavior_created_at ON user_behavior_analytics(created_at);
CREATE INDEX idx_user_behavior_ab_test ON user_behavior_analytics(ab_test_id) WHERE ab_test_id IS NOT NULL;
CREATE INDEX idx_user_behavior_engagement ON user_behavior_analytics(engagement_score DESC) WHERE engagement_score IS NOT NULL;
CREATE INDEX idx_user_behavior_personalization ON user_behavior_analytics(personalized_content_preference DESC);

-- 시스템 알림 인덱스
CREATE INDEX idx_system_alerts_type_severity ON system_alerts(alert_type, severity);
CREATE INDEX idx_system_alerts_status ON system_alerts(status);
CREATE INDEX idx_system_alerts_created_at ON system_alerts(created_at DESC);
CREATE INDEX idx_system_alerts_service ON system_alerts(affected_service);
CREATE INDEX idx_system_alerts_active ON system_alerts(status, created_at DESC) WHERE status = 'active';

-- 비즈니스 지표 인덱스
CREATE INDEX idx_business_metrics_category_name ON business_metrics(metric_category, metric_name);
CREATE INDEX idx_business_metrics_date ON business_metrics(measurement_date DESC);
CREATE INDEX idx_business_metrics_period ON business_metrics(measurement_period);
CREATE INDEX idx_business_metrics_revenue ON business_metrics(revenue_total_usd DESC) WHERE revenue_total_usd > 0;
CREATE INDEX idx_business_metrics_dau ON business_metrics(daily_active_users DESC) WHERE daily_active_users > 0;

-- ================================================================
-- 🛠️ 추가 분석 함수들
-- ================================================================

-- 사용자 행동 패턴 요약 함수
CREATE OR REPLACE FUNCTION get_user_behavior_summary(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    result jsonb;
BEGIN
    WITH user_patterns AS (
        SELECT 
            behavior_type,
            engagement_score,
            avg_video_completion_rate,
            personalized_content_preference,
            recommendation_acceptance_rate
        FROM user_behavior_analytics
        WHERE user_id = target_user_id
        ORDER BY created_at DESC
        LIMIT 10
    )
    SELECT jsonb_build_object(
        'engagement', jsonb_build_object(
            'avg_score', COALESCE(AVG(engagement_score), 0),
            'completion_rate', COALESCE(AVG(avg_video_completion_rate), 0)
        ),
        'personalization', jsonb_build_object(
            'content_preference', COALESCE(AVG(personalized_content_preference), 0),
            'recommendation_acceptance', COALESCE(AVG(recommendation_acceptance_rate), 0)
        ),
        'data_points', COUNT(*)
    ) INTO result
    FROM user_patterns;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 실시간 알림 생성 함수
CREATE OR REPLACE FUNCTION create_system_alert(
    p_alert_type varchar(30),
    p_severity varchar(20),
    p_title varchar(200),
    p_message text,
    p_affected_service varchar(50) DEFAULT NULL,
    p_current_value decimal(10,2) DEFAULT NULL,
    p_threshold_value decimal(10,2) DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
    alert_id uuid;
    cooldown_check integer;
BEGIN
    -- 동일한 알림이 쿨다운 기간 내에 있는지 확인
    SELECT COUNT(*) INTO cooldown_check
    FROM system_alerts
    WHERE alert_type = p_alert_type
    AND affected_service = p_affected_service
    AND status = 'active'
    AND created_at >= NOW() - INTERVAL '1 hour';
    
    -- 쿨다운 기간 내에 동일 알림이 없으면 생성
    IF cooldown_check = 0 THEN
        INSERT INTO system_alerts (
            alert_type, severity, title, message, 
            affected_service, current_value, threshold_value
        ) VALUES (
            p_alert_type, p_severity, p_title, p_message,
            p_affected_service, p_current_value, p_threshold_value
        ) RETURNING id INTO alert_id;
    END IF;
    
    RETURN alert_id;
END;
$$;

-- 비즈니스 지표 일일 집계 함수
CREATE OR REPLACE FUNCTION aggregate_daily_business_metrics(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    -- 일일 활성 사용자 수 집계
    INSERT INTO business_metrics (metric_category, metric_name, daily_active_users, measurement_date)
    SELECT 
        'engagement',
        'daily_active_users',
        COUNT(DISTINCT user_id),
        target_date
    FROM user_video_interactions
    WHERE DATE(created_at) = target_date
    ON CONFLICT DO NOTHING;
    
    -- 일일 API 비용 집계
    INSERT INTO business_metrics (metric_category, metric_name, api_cost_total_usd, measurement_date)
    SELECT 
        'cost',
        'api_cost_total',
        SUM(COALESCE(claude_cost_usd, 0)),
        target_date
    FROM api_usage_logs
    WHERE DATE(created_at) = target_date
    ON CONFLICT DO NOTHING;
    
    -- 신규 사용자 수 집계
    INSERT INTO business_metrics (metric_category, metric_name, new_users_count, measurement_date)
    SELECT 
        'user_acquisition',
        'new_users',
        COUNT(*),
        target_date
    FROM user_profiles
    WHERE DATE(created_at) = target_date
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '일일 비즈니스 지표 집계 완료: %', target_date;
END;
$$;

-- ================================================================
-- 📊 추가 뷰 생성
-- ================================================================

-- 활성 알림 뷰
CREATE VIEW active_system_alerts AS
SELECT 
    alert_type,
    severity,
    title,
    message,
    affected_service,
    current_value,
    threshold_value,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_since_created
FROM system_alerts
WHERE status = 'active'
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'error' THEN 2 
        WHEN 'warning' THEN 3 
        ELSE 4 
    END,
    created_at DESC;

-- 일일 비즈니스 KPI 대시보드 뷰
CREATE VIEW daily_business_kpis AS
SELECT 
    measurement_date,
    SUM(CASE WHEN metric_name = 'daily_active_users' THEN daily_active_users ELSE 0 END) as dau,
    SUM(CASE WHEN metric_name = 'new_users' THEN new_users_count ELSE 0 END) as new_users,
    SUM(CASE WHEN metric_name = 'api_cost_total' THEN api_cost_total_usd ELSE 0 END) as total_api_cost,
    AVG(CASE WHEN metric_name = 'avg_session_duration' THEN avg_session_duration_minutes ELSE NULL END) as avg_session_duration
FROM business_metrics
WHERE measurement_period = 'daily'
GROUP BY measurement_date
ORDER BY measurement_date DESC;

-- ================================================================
-- ✅ 완전한 시스템 관리 생태계 완성!
-- ================================================================

-- 📊 최종 요약:
-- - 8개 핵심 테이블: 모든 시스템 관리 기능 포함
-- - 50+ 인덱스: 최고 성능 최적화
-- - 8개 분석 함수: 완벽한 리포트 및 대시보드
-- - 6개 실시간 뷰: 모니터링 및 알림
-- 
-- 🎯 Non-MCP 구조로 완벽 통합:
-- ✅ YouTube API 직접 연동
-- ✅ Claude API 직접 연동  
-- ✅ Vanilla JS + Express.js + Supabase
-- ✅ 실시간 모니터링 및 알림
-- ✅ 비즈니스 인텔리전스 대시보드 