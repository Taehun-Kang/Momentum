-- =============================================================================
-- 03_video_channels.sql
-- YouTube 채널 정보 테이블 (YouTube Shorts AI 큐레이션 서비스)
-- 
-- 기능: channel-info-collector.js에서 수집하는 모든 채널 데이터 저장
-- 통합: channels.list API 결과 + 품질 분석 + 캐시 관리
-- =============================================================================

-- 1. video_channels 테이블 생성
CREATE TABLE video_channels (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- YouTube 채널 고유 ID (필수, 중복 불가)
  channel_id text UNIQUE NOT NULL,
  
  -- =============================================================================
  -- 📺 YouTube API 기본 정보 (channels.list snippet)
  -- =============================================================================
  channel_title text NOT NULL,                    -- 채널명
  channel_description text,                       -- 채널 설명
  custom_url text,                                -- 커스텀 URL (@channelname)
  country text,                                   -- 국가 코드 (KR, US 등)
  default_language text DEFAULT 'ko',             -- 기본 언어
  
  -- 게시 정보
  published_at timestamptz,                       -- 채널 생성일
  created_year integer,                           -- 생성 연도
  
  -- =============================================================================
  -- 🖼️ 채널 아이콘 및 썸네일 (다양한 해상도)
  -- =============================================================================
  channel_icon_url text,                          -- 고해상도 아이콘 URL
  channel_thumbnails jsonb DEFAULT '{}',          -- 모든 해상도 썸네일
  
  -- 썸네일 해상도별 URL
  thumbnail_default text,                         -- 88x88
  thumbnail_medium text,                          -- 240x240  
  thumbnail_high text,                            -- 800x800
  thumbnail_maxres text,                          -- 최대 해상도
  
  -- =============================================================================
  -- 📊 YouTube API 통계 정보 (channels.list statistics)
  -- =============================================================================
  subscriber_count bigint DEFAULT 0,              -- 구독자 수
  subscriber_count_formatted text,                -- 포맷된 구독자 수 (1.2만명)
  hidden_subscriber_count boolean DEFAULT false,  -- 구독자 수 숨김 여부
  total_view_count bigint DEFAULT 0,              -- 총 조회수
  video_count integer DEFAULT 0,                  -- 영상 수
  
  -- =============================================================================
  -- 🎨 브랜딩 정보 (channels.list brandingSettings) - 선택적
  -- =============================================================================
  branding_keywords text,                         -- 브랜딩 키워드
  unsubscribed_trailer text,                      -- 미구독자용 트레일러 ID
  branding_country text,                          -- 브랜딩 국가
  
  -- =============================================================================
  -- 🏷️ 주제 정보 (channels.list topicDetails) - 선택적  
  -- =============================================================================
  topic_ids text[] DEFAULT '{}',                  -- 주제 ID 배열
  topic_categories text[] DEFAULT '{}',           -- 주제 카테고리 배열
  
  -- =============================================================================
  -- 🔗 URL 정보
  -- =============================================================================
  channel_url text,                               -- 기본 채널 URL
  custom_channel_url text,                        -- 커스텀 채널 URL
  
  -- =============================================================================
  -- 📊 분석 및 참여도 지표
  -- =============================================================================
  
  -- 참여도 분석
  videos_per_subscriber decimal(10,4) DEFAULT 0,  -- 구독자당 영상 수
  avg_views_per_video bigint DEFAULT 0,           -- 영상당 평균 조회수
  
  -- 채널 활동성
  upload_frequency decimal(5,2),                  -- 월평균 업로드 수 (추정)
  last_upload_date timestamptz,                   -- 마지막 업로드 날짜
  activity_score decimal(3,2) DEFAULT 0.5,       -- 활동성 점수 (0.0-1.0)
  
  -- =============================================================================
  -- 🏆 채널 품질 평가 시스템
  -- =============================================================================
  quality_grade text DEFAULT 'C'                  -- 품질 등급 (S,A,B,C,D)
    CHECK (quality_grade IN ('S', 'A', 'B', 'C', 'D')),
  quality_score decimal(3,2) DEFAULT 0.5,        -- 종합 품질 점수 (0.0-1.0)
  
  -- 세부 품질 지표
  content_consistency_score decimal(3,2),         -- 콘텐츠 일관성 점수
  engagement_quality_score decimal(3,2),          -- 참여도 품질 점수
  channel_authority_score decimal(3,2),           -- 채널 권위성 점수
  
  -- =============================================================================
  -- 🎯 콘텐츠 분석
  -- =============================================================================
  primary_content_type text,                      -- 주요 콘텐츠 유형
  content_categories text[] DEFAULT '{}',         -- 다루는 카테고리들
  target_audience text,                           -- 타겟 연령대
  
  -- Shorts 비율 분석
  shorts_ratio decimal(3,2),                      -- Shorts 비율 (0.0-1.0)
  avg_shorts_quality decimal(3,2),                -- Shorts 평균 품질
  
  -- =============================================================================
  -- 🚫 필터링 및 블랙리스트
  -- =============================================================================
  is_blocked boolean DEFAULT false,               -- 블랙리스트 여부
  block_reason text,                              -- 블랙리스트 사유
  content_warnings text[] DEFAULT '{}',           -- 콘텐츠 경고
  safety_rating text DEFAULT 'safe',              -- 안전성 등급
  
  -- 채널 상태
  is_verified boolean DEFAULT false,              -- 인증 채널 여부
  is_active boolean DEFAULT true,                 -- 활성 채널 여부
  is_monetized boolean DEFAULT false,             -- 수익화 여부
  has_membership boolean DEFAULT false,           -- 멤버십 기능 여부
  
  -- =============================================================================
  -- 💾 캐시 및 업데이트 관리
  -- =============================================================================
  collected_at timestamptz DEFAULT now(),         -- 수집 시간
  last_updated timestamptz DEFAULT now(),         -- 마지막 업데이트
  expires_at timestamptz DEFAULT (now() + interval '30 days'), -- 만료 시간
  update_priority integer DEFAULT 5,              -- 업데이트 우선순위 (1-10)
  
  -- API 비용 추적
  api_units_consumed integer DEFAULT 5,           -- 소모된 API 단위 (channels.list 기본 5 units)
  
  -- 수집 옵션 추적
  collection_options jsonb DEFAULT '{}',          -- 수집 시 사용된 옵션
  included_branding boolean DEFAULT false,        -- 브랜딩 정보 포함 여부
  included_topics boolean DEFAULT false,          -- 주제 정보 포함 여부
  
  -- =============================================================================
  -- 🔍 검색 및 추천 최적화
  -- =============================================================================
  search_boost_score decimal(3,2) DEFAULT 1.0,   -- 검색 부스트 점수
  recommendation_weight decimal(3,2) DEFAULT 1.0, -- 추천 가중치
  popularity_trend text DEFAULT 'stable',         -- 인기 트렌드 (rising, stable, declining)
  
  -- 지역 및 언어 타겟팅
  target_regions text[] DEFAULT '{"KR"}',         -- 타겟 지역들
  supported_languages text[] DEFAULT '{"ko"}',   -- 지원 언어들
  
  -- =============================================================================
  -- 📊 추가 메타데이터  
  -- =============================================================================
  
  -- 채널 태그 (자동 생성)
  auto_generated_tags text[] DEFAULT '{}',        -- 자동 생성된 태그
  manual_tags text[] DEFAULT '{}',                -- 수동 추가된 태그
  
  -- 경쟁사 분석
  similar_channels text[] DEFAULT '{}',           -- 유사 채널 ID들
  competitive_score decimal(3,2),                 -- 경쟁력 점수
  
  -- Raw 데이터 저장 (디버깅/분석용)
  raw_youtube_data jsonb DEFAULT '{}',           -- YouTube API 원본 응답
  debug_info jsonb DEFAULT '{}',                 -- 디버깅 정보
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 📊 인덱스 생성 (성능 최적화)
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_video_channels_channel_id ON video_channels(channel_id);
CREATE INDEX idx_video_channels_channel_title ON video_channels(channel_title);
CREATE INDEX idx_video_channels_created_at ON video_channels(created_at DESC);
CREATE INDEX idx_video_channels_updated_at ON video_channels(updated_at DESC);

-- 통계 기반 인덱스
CREATE INDEX idx_video_channels_subscriber_count ON video_channels(subscriber_count DESC);
CREATE INDEX idx_video_channels_video_count ON video_channels(video_count DESC);
CREATE INDEX idx_video_channels_total_view_count ON video_channels(total_view_count DESC);

-- 품질 및 필터링 인덱스
CREATE INDEX idx_video_channels_quality_grade ON video_channels(quality_grade);
CREATE INDEX idx_video_channels_quality_score ON video_channels(quality_score DESC);
CREATE INDEX idx_video_channels_is_blocked ON video_channels(is_blocked) WHERE is_blocked = false;
CREATE INDEX idx_video_channels_is_active ON video_channels(is_active) WHERE is_active = true;

-- 콘텐츠 분석 인덱스
CREATE INDEX idx_video_channels_content_type ON video_channels(primary_content_type);
CREATE INDEX idx_video_channels_target_audience ON video_channels(target_audience);
CREATE INDEX idx_video_channels_shorts_ratio ON video_channels(shorts_ratio DESC);

-- 캐시 관리 인덱스
CREATE INDEX idx_video_channels_expires_at ON video_channels(expires_at);
CREATE INDEX idx_video_channels_update_priority ON video_channels(update_priority DESC);
CREATE INDEX idx_video_channels_last_updated ON video_channels(last_updated);

-- 지역 및 언어 인덱스
CREATE INDEX idx_video_channels_country ON video_channels(country);
CREATE INDEX idx_video_channels_default_language ON video_channels(default_language);

-- 복합 인덱스 (고성능 쿼리용)
CREATE INDEX idx_video_channels_quality_active_grade 
ON video_channels(is_active, quality_grade, quality_score DESC) 
WHERE is_active = true AND is_blocked = false;

CREATE INDEX idx_video_channels_content_quality_subscribers 
ON video_channels(primary_content_type, quality_score DESC, subscriber_count DESC);

-- GIN 인덱스 (배열 검색용)
CREATE INDEX idx_video_channels_content_categories ON video_channels USING GIN(content_categories);
CREATE INDEX idx_video_channels_topic_categories ON video_channels USING GIN(topic_categories);
CREATE INDEX idx_video_channels_auto_tags ON video_channels USING GIN(auto_generated_tags);
CREATE INDEX idx_video_channels_manual_tags ON video_channels USING GIN(manual_tags);
CREATE INDEX idx_video_channels_target_regions ON video_channels USING GIN(target_regions);

-- JSON 인덱스 (JSONB 검색용)
CREATE INDEX idx_video_channels_thumbnails ON video_channels USING GIN(channel_thumbnails);
CREATE INDEX idx_video_channels_collection_options ON video_channels USING GIN(collection_options);

-- =============================================================================
-- 🔄 트리거 및 함수
-- =============================================================================

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_video_channels_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_video_channels_updated_at
  BEFORE UPDATE ON video_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_video_channels_updated_at();

-- 품질 등급 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_channel_quality_grade(
  subscriber_count_param bigint,
  video_count_param integer,
  total_view_count_param bigint,
  avg_views_per_video_param bigint
) RETURNS text AS $$
BEGIN
  -- S급: 구독자 100만+ & 영상 100개+ & 영상당 평균 조회수 10만+
  IF subscriber_count_param >= 1000000 
     AND video_count_param >= 100 
     AND avg_views_per_video_param >= 100000 THEN
    RETURN 'S';
  END IF;
  
  -- A급: 구독자 10만+ & 영상 50개+ & 영상당 평균 조회수 5만+
  IF subscriber_count_param >= 100000 
     AND video_count_param >= 50 
     AND avg_views_per_video_param >= 50000 THEN
    RETURN 'A';
  END IF;
  
  -- B급: 구독자 1만+ & 영상 20개+ & 영상당 평균 조회수 1만+
  IF subscriber_count_param >= 10000 
     AND video_count_param >= 20 
     AND avg_views_per_video_param >= 10000 THEN
    RETURN 'B';
  END IF;
  
  -- C급: 구독자 1천+ & 영상 10개+ & 영상당 평균 조회수 1천+
  IF subscriber_count_param >= 1000 
     AND video_count_param >= 10 
     AND avg_views_per_video_param >= 1000 THEN
    RETURN 'C';
  END IF;
  
  -- D급: 그 외
  RETURN 'D';
END;
$$ LANGUAGE plpgsql;

-- 구독자 수 포맷팅 함수
CREATE OR REPLACE FUNCTION format_subscriber_count(count_param bigint)
RETURNS text AS $$
BEGIN
  IF count_param >= 100000000 THEN  -- 1억+
    RETURN ROUND(count_param / 100000000.0, 1) || '억명';
  ELSIF count_param >= 10000 THEN   -- 1만+
    RETURN ROUND(count_param / 10000.0, 1) || '만명';
  ELSIF count_param >= 1000 THEN    -- 1천+
    RETURN ROUND(count_param / 1000.0, 1) || '천명';
  ELSE
    RETURN count_param || '명';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 만료된 채널 캐시 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_channel_cache()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- 만료된 채널 정보 삭제 (단, 블랙리스트는 유지)
  DELETE FROM video_channels 
  WHERE expires_at < now() AND is_blocked = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 채널 품질 점수 업데이트 함수
CREATE OR REPLACE FUNCTION update_channel_quality_scores()
RETURNS integer AS $$
DECLARE
  updated_count integer := 0;
  channel_record RECORD;
BEGIN
  FOR channel_record IN 
    SELECT 
      channel_id,
      subscriber_count,
      video_count,
      total_view_count,
      CASE WHEN video_count > 0 
           THEN total_view_count / video_count 
           ELSE 0 END as avg_views_per_video
    FROM video_channels 
    WHERE is_active = true AND is_blocked = false
  LOOP
    -- 품질 등급 계산 및 업데이트
    UPDATE video_channels 
    SET 
      avg_views_per_video = channel_record.avg_views_per_video,
      quality_grade = calculate_channel_quality_grade(
        channel_record.subscriber_count,
        channel_record.video_count,
        channel_record.total_view_count,
        channel_record.avg_views_per_video
      ),
      subscriber_count_formatted = format_subscriber_count(channel_record.subscriber_count),
      last_updated = now()
    WHERE channel_id = channel_record.channel_id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 📋 편의 뷰 (Views)
-- =============================================================================

-- 고품질 채널 뷰
CREATE VIEW high_quality_channels AS
SELECT 
  channel_id,
  channel_title,
  channel_icon_url,
  subscriber_count,
  subscriber_count_formatted,
  video_count,
  quality_grade,
  quality_score,
  primary_content_type,
  shorts_ratio,
  last_updated
FROM video_channels
WHERE 
  is_active = true 
  AND is_blocked = false 
  AND quality_grade IN ('S', 'A', 'B')
  AND expires_at > now()
ORDER BY quality_score DESC, subscriber_count DESC;

-- 활성 Shorts 채널 뷰
CREATE VIEW active_shorts_channels AS
SELECT 
  channel_id,
  channel_title,
  channel_icon_url,
  subscriber_count_formatted,
  shorts_ratio,
  avg_shorts_quality,
  quality_grade,
  last_upload_date,
  activity_score
FROM video_channels
WHERE 
  is_active = true 
  AND is_blocked = false
  AND shorts_ratio >= 0.3  -- Shorts 비율 30% 이상
  AND expires_at > now()
ORDER BY shorts_ratio DESC, quality_score DESC;

-- 채널 통계 요약 뷰
CREATE VIEW channel_stats_summary AS
SELECT 
  COUNT(*) as total_channels,
  COUNT(*) FILTER (WHERE is_active = true) as active_channels,
  COUNT(*) FILTER (WHERE is_blocked = true) as blocked_channels,
  COUNT(*) FILTER (WHERE quality_grade = 'S') as s_grade_channels,
  COUNT(*) FILTER (WHERE quality_grade = 'A') as a_grade_channels,
  COUNT(*) FILTER (WHERE quality_grade = 'B') as b_grade_channels,
  COUNT(*) FILTER (WHERE quality_grade = 'C') as c_grade_channels,
  COUNT(*) FILTER (WHERE quality_grade = 'D') as d_grade_channels,
  AVG(subscriber_count) as avg_subscriber_count,
  AVG(video_count) as avg_video_count,
  AVG(quality_score) as avg_quality_score
FROM video_channels
WHERE expires_at > now();

-- =============================================================================
-- 📊 테이블 코멘트
-- =============================================================================

COMMENT ON TABLE video_channels IS 'YouTube 채널 정보 테이블 - channel-info-collector.js 수집 데이터';

COMMENT ON COLUMN video_channels.channel_id IS 'YouTube 채널 고유 ID (예: UCxxxxxx)';
COMMENT ON COLUMN video_channels.quality_grade IS '채널 품질 등급 (S:최고, A:높음, B:보통, C:낮음, D:최하)';
COMMENT ON COLUMN video_channels.videos_per_subscriber IS '구독자 1명당 영상 수 (일관성 지표)';
COMMENT ON COLUMN video_channels.shorts_ratio IS 'Shorts 영상 비율 (0.0-1.0)';
COMMENT ON COLUMN video_channels.api_units_consumed IS '채널 수집에 소모된 YouTube API 단위수';

-- =============================================================================
-- ✅ 생성 완료 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ video_channels 테이블 생성 완료!';
  RAISE NOTICE '📊 포함 기능:';
  RAISE NOTICE '   - YouTube channels.list API 전체 데이터';
  RAISE NOTICE '   - channel-info-collector.js 모든 수집 정보';
  RAISE NOTICE '   - 채널 품질 평가 시스템 (S~D 등급)';
  RAISE NOTICE '   - 17개 기본 인덱스 + 5개 GIN 인덱스';
  RAISE NOTICE '   - 5개 관리 함수 + 3개 편의 뷰';
  RAISE NOTICE '   - 캐시 관리 및 자동 만료';
  RAISE NOTICE '🎯 다음 단계: DEVELOPMENT_ROADMAP.md 업데이트';
END $$; 