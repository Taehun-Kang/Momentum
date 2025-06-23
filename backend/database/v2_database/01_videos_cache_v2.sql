-- =============================================================================
-- 01_videos_cache_v2.sql
-- YouTube Shorts 영상 캐시 테이블 (MVP 버전)
-- 
-- 기능: Bright Data API 응답 데이터 + LLM 분류 시스템 통합
-- 용도: YouTube Shorts 영상 정보 캐싱 및 관리
-- =============================================================================

CREATE TABLE videos_cache_v2 (
  -- =============================================================================
  -- 🆔 기본 식별자
  -- =============================================================================
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id varchar(20) UNIQUE NOT NULL,           -- YouTube 영상 ID
  
  -- =============================================================================
  -- 📹 YouTube 기본 정보 (Bright Data 응답 기반)
  -- =============================================================================
  url text NOT NULL,                              -- 영상 URL
  title text NOT NULL,                            -- 영상 제목
  description text,                               -- 영상 설명
  youtuber varchar(255),                          -- 채널명
  youtuber_id varchar(50),                        -- 채널 ID
  channel_url text,                               -- 채널 URL
  handle_name varchar(100),                       -- @채널핸들
  avatar_img_channel text,                        -- 채널 아바타
  
  -- =============================================================================
  -- 📊 영상 메트릭 (Bright Data 직접 제공)
  -- =============================================================================
  views bigint DEFAULT 0,                         -- 조회수
  likes bigint DEFAULT 0,                         -- 좋아요
  num_comments integer DEFAULT 0,                 -- 댓글 수
  subscribers bigint DEFAULT 0,                   -- 채널 구독자 수
  video_length integer,                           -- 재생 시간 (초)
  
  -- =============================================================================
  -- 🎬 메타데이터 (Bright Data 제공)
  -- =============================================================================
  date_posted timestamptz,                        -- 업로드 날짜
  preview_image text,                             -- 썸네일 URL
  quality_label varchar(20),                      -- 화질 ('HD', '4K' 등)
  post_type varchar(20),                          -- 게시물 타입
  verified boolean DEFAULT false,                 -- 채널 인증 여부
  
  -- =============================================================================
  -- 🏷️ LLM 분류 시스템 (4개 분야)
  -- =============================================================================
  tags jsonb DEFAULT '[]'::jsonb,                 -- YouTube 원본 태그
  
  -- LLM 4개 분야 태그
  topic_tags text[] DEFAULT '{}',                 -- 주제 태그 ['먹방', '요리', '레시피']
  mood_tags text[] DEFAULT '{}',                  -- 분위기 태그 ['신나는', '재미있는', '힐링되는']
  context_tags text[] DEFAULT '{}',               -- 상황 태그 ['퇴근길에', '운동할때', '휴식할때']
  genre_tags text[] DEFAULT '{}',                 -- 장르 태그 ['브이로그', '튜토리얼', 'ASMR']

  -- LLM 분류 메타데이터 (분류 완료 후에만 채워짐)
  -- classification_confidence: 0.0-1.0 (예: 0.85, 0.92)
  -- classified_by: 'claude_api', 'gpt4', 'gemini' 등
  classification_confidence decimal(3,2),         -- 분류 신뢰도 (null이면 미분류)
  classified_by text,                             -- 분류 엔진 (null이면 미분류)
  classified_at timestamptz,                      -- 분류 시간 (null이면 미분류)
  
  -- =============================================================================
  -- 🔍 데이터 수집 관리 (Bright Data 워크플로우)
  -- =============================================================================
  data_source varchar(20) DEFAULT 'bright_data',  -- 데이터 소스
  collection_keyword varchar(255),                -- 수집 키워드
  collection_batch_id varchar(50),                -- Bright Data snapshot_id
  
  -- 수집 필터 조건 (JSON 형태)
  -- 키워드 검색 방식: {"keyword_search":"ASMR", "duration":"Under 4 minutes", "country":"KR", "upload_date":"Today", "type":"Video", "features":""}
  -- - keyword_search: 검색 키워드
  -- - duration: "Under 4 minutes", "4-20 minutes", "Over 20 minutes"
  -- - country: 국가 코드 (예: "KR", "US")
  -- - upload_date: "Last hour", "Today", "This week", "This month", "This year"
  -- - type: "Video", "Channel", "Playlist", "Movie"
  -- - features: 특수 기능 (거의 사용하지 않음)
  -- 
  -- URL 기반 수집 방식: {"url":"https://www.youtube.com/@channelname/videos", "num_of_posts":14, "start_date":"2024-01-01", "end_date":"2024-01-28", "order_by":"Latest", "time_period":"1 year ago", "country":""}
  -- - url: 채널 URL (videos, shorts, streams 등)
  -- - num_of_posts: 수집할 포스트 수 (0이면 전체)
  -- - start_date, end_date: 날짜 범위 (YYYY-MM-DD 형식)
  -- - order_by: 정렬 방식 ("Latest", "Popular", "Oldest")
  -- - time_period: 시간 기간 ("1 year ago", "1 month ago", "6 days ago" 등)
  -- - country: 국가 코드
  collection_filters jsonb DEFAULT '{}',          -- 수집 필터 조건
  
  -- =============================================================================
  -- ⚠️ 에러 및 경고 (Bright Data 제공)
  -- =============================================================================
  error text,                                     -- 에러 메시지
  error_code varchar(50),                         -- 에러 코드
  warning text,                                   -- 경고 메시지
  warning_code varchar(50),                       -- 경고 코드
  
  -- =============================================================================
  -- 🎯 기본 필터링
  -- =============================================================================
  is_playable boolean DEFAULT true,               -- 재생 가능 여부
  is_shorts boolean DEFAULT true,                 -- Shorts 여부 (≤60초)
  is_korean_content boolean DEFAULT true,         -- 한국어 콘텐츠
  
  -- =============================================================================
  -- 💾 캐시 및 성능 관리
  -- =============================================================================
  cached_at timestamptz DEFAULT now() NOT NULL,  -- 캐시 시간
  expires_at timestamptz DEFAULT (now() + interval '30 days'), -- 만료 시간 (마지막 접근 후 30일)
  cache_hit_count integer DEFAULT 0,              -- 조회 횟수
  last_accessed_at timestamptz DEFAULT now(),     -- 마지막 접근
  
  -- =============================================================================
  -- 🕐 타임스탬프
  -- =============================================================================
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 📊 인덱스 생성 (성능 최적화)
-- =============================================================================

-- 1) 기본 조회 인덱스 (필수 중의 필수)
CREATE INDEX idx_videos_cache_v2_video_id ON videos_cache_v2(video_id);
CREATE INDEX idx_videos_cache_v2_collection_batch ON videos_cache_v2(collection_batch_id);

-- 2) 상태 관리 인덱스 (배치 처리 필수)
CREATE INDEX idx_videos_cache_v2_expires_at ON videos_cache_v2(expires_at);

-- 3) LLM 태그 검색용 GIN 인덱스 (검색 기능 핵심)
CREATE INDEX idx_videos_cache_v2_topic_tags ON videos_cache_v2 USING GIN(topic_tags);
CREATE INDEX idx_videos_cache_v2_mood_tags ON videos_cache_v2 USING GIN(mood_tags);
CREATE INDEX idx_videos_cache_v2_context_tags ON videos_cache_v2 USING GIN(context_tags);
CREATE INDEX idx_videos_cache_v2_genre_tags ON videos_cache_v2 USING GIN(genre_tags);

-- =============================================================================
-- 🔄 트리거 및 함수
-- =============================================================================

-- 1) updated_at 자동 업데이트 함수 및 트리거
CREATE OR REPLACE FUNCTION update_videos_cache_v2_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_videos_cache_v2_updated_at
  BEFORE UPDATE ON videos_cache_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_videos_cache_v2_updated_at();

-- 2) 캐시 히트 증가 함수
CREATE OR REPLACE FUNCTION increment_video_cache_hit_v2(video_id_param text)
RETURNS void AS $$
BEGIN
  UPDATE videos_cache_v2 
  SET 
    cache_hit_count = cache_hit_count + 1,
    last_accessed_at = now(),
    expires_at = now() + interval '30 days'  -- 접근 시마다 만료 시간 연장
  WHERE video_id = video_id_param;
END;
$$ LANGUAGE plpgsql;

-- 3) 만료된 캐시 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_videos_v2()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM videos_cache_v2 WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ✅ 테이블 생성 완료 메시지
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ videos_cache_v2 테이블 생성 완료!';
  RAISE NOTICE '📊 포함 기능:';
  RAISE NOTICE '   - Bright Data API 응답 데이터 저장 (키워드 검색 + URL 기반 수집)';
  RAISE NOTICE '   - LLM 4개 분야 태그 시스템';
  RAISE NOTICE '   - 배치 처리 및 상태 관리';
  RAISE NOTICE '   - 8개 성능 인덱스 (기본 조회 + 상태 관리 + LLM 태그 GIN)';
  RAISE NOTICE '   - 3개 관리 함수 + updated_at 자동 트리거';
  RAISE NOTICE '   - 캐시 30일 관리 (마지막 접근 기준)';
  RAISE NOTICE '🎯 다음 단계: Supabase에서 테이블 생성 실행';
END $$; 