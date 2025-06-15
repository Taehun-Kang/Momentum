-- =============================================================================
-- 02_video_cache_extended.sql
-- 확장된 YouTube 영상 캐시 테이블 (YouTube Shorts AI 큐레이션 서비스)
-- 
-- 기능: YouTube API 전체 데이터 + video-tagger 태그 시스템 + 채널 정보 통합
-- 통합: search, videos.list, channel.list API 결과 + LLM 분류 결과
-- =============================================================================

-- 1. 확장된 video_cache 테이블 생성
CREATE TABLE video_cache_extended (
  -- 기본 식별자 (UUID)
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- YouTube 영상 고유 ID (필수, 중복 불가)
  video_id text UNIQUE NOT NULL,
  
  -- =============================================================================
  -- 📹 YouTube API 기본 정보 (videos.list snippet)
  -- =============================================================================
  title text NOT NULL,                            -- 영상 제목
  description text,                               -- 영상 설명
  channel_id text NOT NULL,                       -- 채널 ID (FK 연결)
  channel_title text,                             -- 채널명
  published_at timestamptz,                       -- 게시 시간
  category_id text,                               -- YouTube 카테고리 ID
  default_language text,                          -- 기본 언어
  default_audio_language text,                    -- 기본 오디오 언어
  
  -- 썸네일 정보 (JSON)
  thumbnails jsonb DEFAULT '{}',                  -- 모든 해상도 썸네일
  thumbnail_url text,                             -- 기본 썸네일 URL
  
  -- YouTube 태그 (원본)
  youtube_tags text[] DEFAULT '{}',               -- YouTube 원본 태그
  
  -- =============================================================================
  -- 📊 YouTube API 통계 정보 (videos.list statistics)
  -- =============================================================================
  view_count bigint DEFAULT 0,                    -- 조회수
  like_count bigint DEFAULT 0,                    -- 좋아요 수
  dislike_count bigint DEFAULT 0,                 -- 싫어요 수 (deprecated)
  comment_count bigint DEFAULT 0,                 -- 댓글 수
  favorite_count bigint DEFAULT 0,                -- 즐겨찾기 수
  
  -- =============================================================================
  -- ⏱️ YouTube API 콘텐츠 정보 (videos.list contentDetails)
  -- =============================================================================
  duration integer NOT NULL,                      -- 재생 시간 (초 단위)
  duration_iso text,                              -- ISO 8601 형식 (PT1M30S)
  definition text DEFAULT 'hd',                   -- 화질 (hd, sd)
  caption boolean DEFAULT false,                  -- 자막 여부
  licensed_content boolean DEFAULT false,         -- 라이선스 콘텐츠 여부
  projection text DEFAULT 'rectangular',          -- 영상 투영 (rectangular, 360)
  
  -- =============================================================================
  -- 🔐 YouTube API 상태 정보 (videos.list status)
  -- =============================================================================
  upload_status text DEFAULT 'processed',         -- 업로드 상태
  privacy_status text DEFAULT 'public',           -- 공개 상태
  license text DEFAULT 'youtube',                 -- 라이선스
  embeddable boolean DEFAULT true,                -- 임베드 가능 여부
  public_stats_viewable boolean DEFAULT true,     -- 공개 통계 조회 가능
  made_for_kids boolean DEFAULT false,            -- 아동용 콘텐츠
  
  -- 지역 제한 정보 (JSON)
  region_restriction jsonb DEFAULT '{}',          -- 지역 제한 정보
  
  -- =============================================================================
  -- 🎯 video-tagger.js LLM 분류 시스템 (4개 카테고리)
  -- =============================================================================
  
  -- 1. 주제 태그 (Topics)
  topic_tags text[] DEFAULT '{}',                 -- ['먹방', '요리', '레시피']
  
  -- 2. 분위기/감정 태그 (Moods)  
  mood_tags text[] DEFAULT '{}',                  -- ['신나는', '재미있는', '힐링되는']
  
  -- 3. 상황/맥락 태그 (Contexts)
  context_tags text[] DEFAULT '{}',               -- ['퇴근길에', '운동할때', '휴식할때']
  
  -- 4. 장르/형식 태그 (Genres)
  genre_tags text[] DEFAULT '{}',                 -- ['브이로그', '튜토리얼', 'ASMR']
  
  -- LLM 분류 메타데이터
  classification_confidence decimal(3,2) DEFAULT 0.8, -- 분류 신뢰도 (0.0-1.0)
  classified_by text DEFAULT 'claude_api',       -- 분류 엔진
  classification_model text,                      -- 사용된 모델 버전
  classification_prompt_hash text,                -- 프롬프트 해시 (일관성 추적)
  classified_at timestamptz,                      -- 분류 시간
  
  -- 폴백 정보
  used_fallback boolean DEFAULT false,            -- 폴백 분류 사용 여부
  fallback_reason text,                           -- 폴백 사유
  
  -- =============================================================================
  -- 🎬 검색 및 품질 정보
  -- =============================================================================
  search_keyword text,                            -- 검색에 사용된 키워드
  search_category text,                           -- 검색 카테고리
  
  -- 재생 가능성 및 품질
  is_playable boolean DEFAULT true,               -- 재생 가능 여부
  playability_check_at timestamptz,               -- 재생 가능성 마지막 확인
  playability_reason text,                        -- 재생 불가 사유
  
  -- 품질 점수 (0.0-1.0)
  quality_score decimal(3,2) DEFAULT 0.5,        -- 종합 품질 점수
  engagement_score decimal(3,2),                  -- 참여도 점수
  freshness_score decimal(3,2),                   -- 최신성 점수
  
  -- =============================================================================
  -- 📺 채널 기본 정보 (채널 테이블 연결 후 deprecated 예정)
  -- =============================================================================
  channel_subscriber_count bigint,                -- 채널 구독자 수 (임시)
  channel_video_count integer,                    -- 채널 영상 수 (임시)
  channel_icon_url text,                          -- 채널 아이콘 (임시)
  channel_quality_grade text,                     -- 채널 품질 등급 (임시)
  
  -- =============================================================================
  -- 💾 캐시 관리
  -- =============================================================================
  cached_at timestamptz DEFAULT now() NOT NULL,  -- 캐시 저장 시간
  expires_at timestamptz DEFAULT (now() + interval '7 days') NOT NULL, -- 만료 시간
  cache_hit_count integer DEFAULT 0,              -- 캐시 조회 횟수
  last_accessed_at timestamptz DEFAULT now(),     -- 마지막 접근 시간
  cache_source text DEFAULT 'youtube_api',        -- 캐시 소스
  
  -- API 사용량 추적
  api_units_consumed integer DEFAULT 107,         -- 소모된 API 단위 (search:100 + videos:7)
  
  -- =============================================================================
  -- 🔍 검색 최적화 정보
  -- =============================================================================
  search_boost_score decimal(3,2) DEFAULT 1.0,   -- 검색 부스트 점수
  trending_score decimal(3,2) DEFAULT 0.0,       -- 트렌드 점수
  personalization_data jsonb DEFAULT '{}',       -- 개인화 데이터
  
  -- 키워드 매칭 점수
  keyword_relevance_score decimal(3,2),          -- 키워드 관련성
  semantic_similarity_score decimal(3,2),        -- 의미적 유사도
  
  -- =============================================================================
  -- 📊 추가 메타데이터
  -- =============================================================================
  
  -- 콘텐츠 안전성
  content_rating text DEFAULT 'G',               -- 콘텐츠 등급 (G,PG,PG-13,R)
  safety_score decimal(3,2) DEFAULT 1.0,         -- 안전성 점수
  content_warnings text[] DEFAULT '{}',          -- 콘텐츠 경고
  
  -- 상업성 정보
  is_sponsored boolean DEFAULT false,             -- 스폰서 영상 여부
  has_product_placement boolean DEFAULT false,    -- 간접광고 포함 여부
  commercial_intent text DEFAULT 'none',         -- 상업적 의도 (none,low,medium,high)
  
  -- 언어 및 지역
  detected_language text DEFAULT 'ko',           -- 감지된 언어
  target_region text DEFAULT 'KR',               -- 타겟 지역
  
  -- Raw 데이터 저장 (디버깅/분석용)
  raw_youtube_data jsonb DEFAULT '{}',           -- YouTube API 원본 응답
  raw_classification_data jsonb DEFAULT '{}',    -- LLM 분류 원본 응답
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- =============================================================================
  -- 🔗 외래키 제약조건
  -- =============================================================================
  CONSTRAINT fk_video_cache_channel 
    FOREIGN KEY (channel_id) 
    REFERENCES video_channels(channel_id) 
    ON DELETE SET NULL  -- 채널 삭제 시 NULL로 설정
    ON UPDATE CASCADE   -- 채널 ID 변경 시 연동 업데이트
);

-- =============================================================================
-- 📊 인덱스 생성 (성능 최적화)
-- =============================================================================

-- 기본 조회 인덱스
CREATE INDEX idx_video_cache_ext_video_id ON video_cache_extended(video_id);
CREATE INDEX idx_video_cache_ext_channel_id ON video_cache_extended(channel_id);
CREATE INDEX idx_video_cache_ext_created_at ON video_cache_extended(created_at DESC);
CREATE INDEX idx_video_cache_ext_expires_at ON video_cache_extended(expires_at);

-- 재생 가능성 및 품질 인덱스
CREATE INDEX idx_video_cache_ext_playable ON video_cache_extended(is_playable) WHERE is_playable = true;
CREATE INDEX idx_video_cache_ext_quality ON video_cache_extended(quality_score DESC) WHERE quality_score > 0.5;
CREATE INDEX idx_video_cache_ext_duration ON video_cache_extended(duration) WHERE duration <= 60; -- Shorts만

-- 검색 최적화 인덱스
CREATE INDEX idx_video_cache_ext_search_keyword ON video_cache_extended(search_keyword);
CREATE INDEX idx_video_cache_ext_search_category ON video_cache_extended(search_category);

-- 통계 기반 인덱스
CREATE INDEX idx_video_cache_ext_view_count ON video_cache_extended(view_count DESC);
CREATE INDEX idx_video_cache_ext_like_count ON video_cache_extended(like_count DESC);
CREATE INDEX idx_video_cache_ext_published_at ON video_cache_extended(published_at DESC);

-- 복합 인덱스 (고성능 쿼리용)
CREATE INDEX idx_video_cache_ext_playable_quality_duration 
ON video_cache_extended(is_playable, quality_score DESC, duration) 
WHERE is_playable = true AND duration <= 60;

CREATE INDEX idx_video_cache_ext_keyword_tags 
ON video_cache_extended(search_keyword, classification_confidence DESC);

-- GIN 인덱스 (배열 검색용)
CREATE INDEX idx_video_cache_ext_topic_tags ON video_cache_extended USING GIN(topic_tags);
CREATE INDEX idx_video_cache_ext_mood_tags ON video_cache_extended USING GIN(mood_tags);
CREATE INDEX idx_video_cache_ext_context_tags ON video_cache_extended USING GIN(context_tags);
CREATE INDEX idx_video_cache_ext_genre_tags ON video_cache_extended USING GIN(genre_tags);
CREATE INDEX idx_video_cache_ext_youtube_tags ON video_cache_extended USING GIN(youtube_tags);

-- JSON 인덱스 (JSONB 검색용)
CREATE INDEX idx_video_cache_ext_thumbnails ON video_cache_extended USING GIN(thumbnails);
CREATE INDEX idx_video_cache_ext_personalization ON video_cache_extended USING GIN(personalization_data);

-- =============================================================================
-- 🔄 트리거 및 함수
-- =============================================================================

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_video_cache_ext_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_video_cache_ext_updated_at
  BEFORE UPDATE ON video_cache_extended
  FOR EACH ROW
  EXECUTE FUNCTION update_video_cache_ext_updated_at();

-- 캐시 히트 증가 함수
CREATE OR REPLACE FUNCTION increment_video_cache_hit(video_id_param text)
RETURNS void AS $$
BEGIN
  UPDATE video_cache_extended 
  SET 
    cache_hit_count = cache_hit_count + 1,
    last_accessed_at = now()
  WHERE video_id = video_id_param;
END;
$$ LANGUAGE plpgsql;

-- 만료된 캐시 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_video_cache()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM video_cache_extended 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 품질 점수 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_video_quality_score(
  view_count_param bigint,
  like_count_param bigint,
  comment_count_param bigint,
  duration_param integer,
  channel_subscriber_count_param bigint
) RETURNS decimal(3,2) AS $$
DECLARE
  quality_score decimal(3,2) := 0.5;
  view_ratio decimal;
  engagement_ratio decimal;
  duration_factor decimal;
BEGIN
  -- 조회수 기반 점수 (0.3 가중치)
  IF channel_subscriber_count_param > 0 THEN
    view_ratio = LEAST(view_count_param::decimal / channel_subscriber_count_param, 10.0);
    quality_score = quality_score + (view_ratio * 0.03);
  END IF;
  
  -- 참여도 기반 점수 (0.4 가중치)
  IF view_count_param > 0 THEN
    engagement_ratio = (like_count_param + comment_count_param)::decimal / view_count_param;
    quality_score = quality_score + (LEAST(engagement_ratio * 100, 1.0) * 0.4);
  END IF;
  
  -- 길이 기반 점수 (Shorts 최적화, 0.3 가중치)
  IF duration_param BETWEEN 15 AND 60 THEN
    duration_factor = 1.0;
  ELSIF duration_param < 15 THEN
    duration_factor = 0.7;
  ELSE
    duration_factor = 0.5;
  END IF;
  quality_score = quality_score + (duration_factor * 0.3);
  
  -- 0.0 - 1.0 범위로 제한
  RETURN LEAST(GREATEST(quality_score, 0.0), 1.0);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 📋 편의 뷰 (Views)
-- =============================================================================

-- 재생 가능한 고품질 Shorts 뷰 (채널 정보 조인)
CREATE VIEW playable_quality_shorts AS
SELECT 
  v.video_id,
  v.title,
  v.channel_title,
  v.thumbnail_url,
  v.view_count,
  v.like_count,
  v.duration,
  v.topic_tags,
  v.mood_tags,
  v.context_tags,
  v.genre_tags,
  v.quality_score,
  v.published_at,
  c.channel_icon_url,
  c.subscriber_count_formatted,
  c.quality_grade as channel_quality_grade
FROM video_cache_extended v
LEFT JOIN video_channels c ON v.channel_id = c.channel_id
WHERE 
  v.is_playable = true 
  AND v.duration <= 60 
  AND v.quality_score >= 0.6
  AND v.expires_at > now()
ORDER BY v.quality_score DESC, v.view_count DESC;

-- 트렌딩 영상 뷰 (채널 정보 조인)
CREATE VIEW trending_shorts AS
SELECT 
  v.video_id,
  v.title,
  v.channel_title,
  v.thumbnail_url,
  v.view_count,
  v.like_count,
  v.trending_score,
  v.topic_tags,
  v.published_at,
  v.cached_at,
  c.channel_icon_url,
  c.quality_grade as channel_quality_grade
FROM video_cache_extended v
LEFT JOIN video_channels c ON v.channel_id = c.channel_id
WHERE 
  v.is_playable = true 
  AND v.duration <= 60 
  AND v.published_at > (now() - interval '7 days')
  AND v.expires_at > now()
ORDER BY v.trending_score DESC, v.published_at DESC;

-- 태그별 인기 영상 뷰
CREATE VIEW tag_based_popular_shorts AS
SELECT 
  unnest(v.topic_tags) as tag,
  'topic' as tag_type,
  v.video_id,
  v.title,
  v.channel_title,
  v.view_count,
  v.quality_score,
  c.channel_icon_url
FROM video_cache_extended v
LEFT JOIN video_channels c ON v.channel_id = c.channel_id
WHERE 
  v.is_playable = true 
  AND v.duration <= 60 
  AND array_length(v.topic_tags, 1) > 0
  AND v.expires_at > now()

UNION ALL

SELECT 
  unnest(v.mood_tags) as tag,
  'mood' as tag_type,
  v.video_id,
  v.title,
  v.channel_title,
  v.view_count,
  v.quality_score,
  c.channel_icon_url
FROM video_cache_extended v
LEFT JOIN video_channels c ON v.channel_id = c.channel_id
WHERE 
  v.is_playable = true 
  AND v.duration <= 60 
  AND array_length(v.mood_tags, 1) > 0
  AND v.expires_at > now()

ORDER BY quality_score DESC, view_count DESC;

-- =============================================================================
-- 📊 테이블 코멘트
-- =============================================================================

COMMENT ON TABLE video_cache_extended IS 'YouTube 영상 확장 캐시 테이블 - API 데이터 + LLM 분류 + 채널 정보 연결';

COMMENT ON COLUMN video_cache_extended.video_id IS 'YouTube 영상 고유 ID (예: dQw4w9WgXcQ)';
COMMENT ON COLUMN video_cache_extended.channel_id IS 'YouTube 채널 ID (video_channels 테이블과 FK 연결)';
COMMENT ON COLUMN video_cache_extended.topic_tags IS 'LLM 생성 주제 태그 배열 (예: [먹방, 요리, 레시피])';
COMMENT ON COLUMN video_cache_extended.mood_tags IS 'LLM 생성 분위기 태그 배열 (예: [신나는, 재미있는])';
COMMENT ON COLUMN video_cache_extended.context_tags IS 'LLM 생성 상황 태그 배열 (예: [퇴근길에, 휴식할때])';
COMMENT ON COLUMN video_cache_extended.genre_tags IS 'LLM 생성 장르 태그 배열 (예: [브이로그, 튜토리얼])';
COMMENT ON COLUMN video_cache_extended.quality_score IS '종합 품질 점수 (0.0-1.0, 조회수+참여도+길이 기반)';
COMMENT ON COLUMN video_cache_extended.api_units_consumed IS '영상 수집에 소모된 YouTube API 단위수';

-- =============================================================================
-- ✅ 생성 완료 메시지
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ video_cache_extended 테이블 생성 완료!';
  RAISE NOTICE '📊 포함 기능:';
  RAISE NOTICE '   - YouTube API 전체 데이터 (snippet, statistics, contentDetails, status)';
  RAISE NOTICE '   - video-tagger LLM 분류 시스템 (배열 태그)';
  RAISE NOTICE '   - video_channels 테이블과 FK 연결';
  RAISE NOTICE '   - 15개 성능 인덱스 + 5개 GIN 인덱스';
  RAISE NOTICE '   - 4개 관리 함수 + 3개 편의 뷰 (채널 조인 포함)';
  RAISE NOTICE '🎯 다음 단계: Supabase에서 테이블 생성 실행';
END $$; 