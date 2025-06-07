-- Momentum YouTube Shorts AI 큐레이션 서비스
-- Supabase 데이터베이스 스키마 (최종 수정 버전)
-- Created by Wave Team

-- ============================================
-- 1. 사용자 관련 테이블
-- ============================================

-- 사용자 프로필 확장 (Supabase Auth와 연동)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  user_tier VARCHAR(20) DEFAULT 'free' CHECK (user_tier IN ('free', 'premium', 'pro')),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 사용자 검색 패턴 분석 (VECTOR 컬럼 제거)
CREATE TABLE IF NOT EXISTS user_search_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  search_keywords TEXT[],
  search_time_patterns JSONB, -- 시간대별 검색 패턴
  preferred_categories TEXT[],
  -- interaction_vector VECTOR(384) 제거 (향후 pgvector 확장 시 추가)
  last_analyzed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 영상 캐시 관련 테이블
-- ============================================

-- 캐시된 YouTube 영상 정보
CREATE TABLE IF NOT EXISTS cached_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR(20) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  channel_name VARCHAR(255),
  channel_id VARCHAR(50),
  duration INTEGER, -- 초 단위
  view_count BIGINT,
  like_count INTEGER,
  comment_count INTEGER,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  description TEXT,
  tags TEXT[],
  category_id VARCHAR(10),
  is_playable BOOLEAN DEFAULT true,
  quality_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 ~ 1.0
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 키워드-영상 매핑 테이블
CREATE TABLE IF NOT EXISTS keyword_video_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(255) NOT NULL,
  video_id VARCHAR(20) REFERENCES cached_videos(video_id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 ~ 1.0
  search_rank INTEGER, -- 검색 결과에서의 순위
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 트렌드 분석 테이블
-- ============================================

-- 트렌딩 키워드
CREATE TABLE IF NOT EXISTS trending_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  trend_score DECIMAL(5,2) DEFAULT 0.0,
  search_volume INTEGER DEFAULT 0,
  growth_rate DECIMAL(5,2) DEFAULT 0.0, -- 성장률 (%)
  data_source VARCHAR(50), -- 'bright_data', 'serp_api', 'internal'
  region_code VARCHAR(5) DEFAULT 'KR',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. 사용자 상호작용 테이블
-- ============================================

-- 영상 상호작용 기록
CREATE TABLE IF NOT EXISTS video_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id VARCHAR(20) REFERENCES cached_videos(video_id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('view', 'like', 'dislike', 'share', 'save')),
  watch_duration INTEGER, -- 시청 시간 (초)
  interaction_context JSONB, -- 추가 컨텍스트 정보
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 검색 세션 추적
CREATE TABLE IF NOT EXISTS search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100) NOT NULL,
  search_query TEXT,
  search_type VARCHAR(20) DEFAULT 'keyword' CHECK (search_type IN ('keyword', 'ai_chat', 'trending')),
  keywords_used TEXT[],
  results_count INTEGER DEFAULT 0,
  ai_method VARCHAR(50), -- 'claude_api', 'pattern_matching', 'fallback'
  response_time INTEGER, -- 밀리초
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. API 사용량 추적 테이블
-- ============================================

-- YouTube API 사용량 로그
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  units_consumed INTEGER DEFAULT 0,
  quota_category VARCHAR(50), -- 'popular_keywords', 'realtime_trends', 'premium_users', 'emergency_reserve'
  response_time INTEGER,
  status_code INTEGER,
  error_message TEXT,
  request_params JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. 인덱스 생성 (수정됨)
-- ============================================

-- 사용자 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(user_tier);

-- 영상 캐시 인덱스
CREATE INDEX IF NOT EXISTS idx_cached_videos_video_id ON cached_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_cached_videos_playable ON cached_videos(is_playable);
CREATE INDEX IF NOT EXISTS idx_cached_videos_expires ON cached_videos(expires_at);
CREATE INDEX IF NOT EXISTS idx_cached_videos_quality ON cached_videos(quality_score DESC);

-- 키워드-영상 매핑 인덱스 (중요!)
CREATE INDEX IF NOT EXISTS idx_keyword_mappings_keyword ON keyword_video_mappings(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_mappings_relevance ON keyword_video_mappings(keyword, relevance_score DESC);

-- 트렌드 인덱스
CREATE INDEX IF NOT EXISTS idx_trending_keywords_score ON trending_keywords(trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_keywords_category ON trending_keywords(category);
CREATE INDEX IF NOT EXISTS idx_trending_keywords_expires ON trending_keywords(expires_at);

-- 상호작용 인덱스
CREATE INDEX IF NOT EXISTS idx_video_interactions_user ON video_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_interactions_video ON video_interactions(video_id);
CREATE INDEX IF NOT EXISTS idx_search_sessions_user ON search_sessions(user_id, created_at DESC);

-- API 사용량 인덱스 (수정됨 - DATE() 함수 제거)
CREATE INDEX IF NOT EXISTS idx_api_usage_category ON api_usage_logs(quota_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage_logs(created_at DESC, api_name);

-- ============================================
-- 7. RLS (Row Level Security) 정책
-- ============================================

-- user_profiles 테이블 RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로필만 조회/수정 가능
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_search_patterns 테이블 RLS
ALTER TABLE user_search_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search patterns" ON user_search_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own search patterns" ON user_search_patterns
  FOR ALL USING (auth.uid() = user_id);

-- video_interactions 테이블 RLS
ALTER TABLE video_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions" ON video_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON video_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- search_sessions 테이블 RLS
ALTER TABLE search_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search sessions" ON search_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert search sessions" ON search_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- 8. 트리거 함수 (updated_at 자동 업데이트)
-- ============================================

-- updated_at 컬럼 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_search_patterns_updated_at
  BEFORE UPDATE ON user_search_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cached_videos_updated_at
  BEFORE UPDATE ON cached_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. 초기 데이터 삽입 (선택사항)
-- ============================================

-- 기본 트렌드 카테고리
INSERT INTO trending_keywords (keyword, category, trend_score, data_source) VALUES
('먹방', 'food', 85.5, 'internal'),
('브이로그', 'lifestyle', 82.3, 'internal'),
('ASMR', 'entertainment', 78.9, 'internal'),
('게임', 'gaming', 88.2, 'internal'),
('댄스', 'music', 91.7, 'internal'),
('요리', 'food', 76.4, 'internal'),
('운동', 'fitness', 73.8, 'internal'),
('여행', 'travel', 69.5, 'internal')
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. 함수 및 프로시저
-- ============================================

-- 만료된 캐시 데이터 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- 만료된 영상 캐시 삭제
  DELETE FROM cached_videos WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- 만료된 트렌드 키워드 삭제
  DELETE FROM trending_keywords WHERE expires_at < NOW();
  
  -- 오래된 검색 세션 삭제 (30일 이상)
  DELETE FROM search_sessions WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- 오래된 API 로그 삭제 (90일 이상)
  DELETE FROM api_usage_logs WHERE created_at < NOW() - INTERVAL '90 days';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 사용자 추천 영상 생성 함수 (기본 버전)
CREATE OR REPLACE FUNCTION get_user_recommendations(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE(
  video_id VARCHAR(20),
  title TEXT,
  channel_name VARCHAR(255),
  relevance_score DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cv.video_id,
    cv.title,
    cv.channel_name,
    AVG(kvm.relevance_score) as relevance_score
  FROM cached_videos cv
  JOIN keyword_video_mappings kvm ON cv.video_id = kvm.video_id
  JOIN user_search_patterns usp ON usp.user_id = p_user_id
  WHERE kvm.keyword = ANY(usp.search_keywords)
    AND cv.is_playable = true
    AND cv.expires_at > NOW()
  GROUP BY cv.video_id, cv.title, cv.channel_name
  ORDER BY relevance_score DESC, cv.view_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 완료 메시지
-- ============================================

-- 스키마 생성 완료 확인
DO $$
BEGIN
  RAISE NOTICE 'Momentum YouTube Shorts AI 큐레이션 서비스 데이터베이스 스키마 생성 완료!';
  RAISE NOTICE '- 사용자 프로필 및 검색 패턴 테이블 생성됨 (VECTOR 타입 제외)';
  RAISE NOTICE '- 영상 캐시 및 키워드 매핑 테이블 생성됨';
  RAISE NOTICE '- 트렌드 분석 테이블 생성됨';
  RAISE NOTICE '- 사용자 상호작용 추적 테이블 생성됨';
  RAISE NOTICE '- RLS 정책 및 인덱스 적용됨 (IMMUTABLE 함수 문제 해결)';
  RAISE NOTICE '- 정리 함수 및 추천 함수 생성됨';
  RAISE NOTICE 'Wave Team - Momentum 프로젝트';
END $$; 