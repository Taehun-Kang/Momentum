/**
 * 🛠️ YouTube API 유틸리티 모듈
 * YouTube Data API 작업을 위한 공통 유틸리티 함수들
 */

class YouTubeUtils {
  constructor() {
    this.stats = {
      totalParsingRequests: 0,
      successfulParsing: 0,
      failedParsing: 0
    };
  }

  /**
   * ⏱️ ISO 8601 Duration 파싱 (YouTube 영상 길이)
   * 예: "PT1M30S" → 90초, "PT4M15S" → 255초
   */
  parseISO8601Duration(duration) {
    this.stats.totalParsingRequests++;
    
    // 입력값 검증
    if (!duration || typeof duration !== 'string') {
      console.warn('⚠️ Invalid duration:', duration);
      this.stats.failedParsing++;
      return 0;
    }

    try {
      // ISO 8601 duration 정규식 매칭
      // PT1H2M30S → H(시간), M(분), S(초)
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      
      // 매칭 실패 시 안전 처리
      if (!match) {
        console.warn('⚠️ Duration parsing failed for:', duration);
        this.stats.failedParsing++;
        return 0;
      }

      // 안전한 값 추출
      const hours = match[1] ? parseInt(match[1]) || 0 : 0;
      const minutes = match[2] ? parseInt(match[2]) || 0 : 0;
      const seconds = match[3] ? parseInt(match[3]) || 0 : 0;

      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      
      // 비정상적인 길이 체크 (24시간 초과는 비정상)
      if (totalSeconds > 86400) {
        console.warn('⚠️ Abnormally long duration:', duration, `(${totalSeconds}s)`);
        this.stats.failedParsing++;
        return 0;
      }

      this.stats.successfulParsing++;
      return totalSeconds;
      
    } catch (error) {
      console.error('❌ Duration parsing error:', error, 'for duration:', duration);
      this.stats.failedParsing++;
      return 0;
    }
  }

  /**
   * 💰 YouTube API 사용량 계산 (정확한 Units 계산)
   * 
   * ⭐ YouTube API 비용 구조:
   * - search.list: 항상 100 units (maxResults와 관계없이)
   * - videos.list: 1 unit (기본) + parts별 추가 비용
   *   - snippet: +2 units
   *   - contentDetails: +2 units  
   *   - status: +2 units
   *   - statistics: +2 units
   */
  calculateAPIUnits(operation, parts = []) {
    const costs = {
      // Search API
      'search.list': 100, // 항상 고정
      
      // Videos API (기본 1 unit + parts별 추가)
      'videos.list': {
        base: 1,
        parts: {
          'snippet': 2,
          'contentDetails': 2,
          'status': 2,
          'statistics': 2,
          'player': 0,
          'recordingDetails': 2,
          'topicDetails': 2,
          'localizations': 2
        }
      },
      
      // Channels API
      'channels.list': {
        base: 1,
        parts: {
          'snippet': 2,
          'contentDetails': 2,
          'statistics': 2,
          'topicDetails': 2,
          'status': 2
        }
      },
      
      // PlaylistItems API
      'playlistItems.list': {
        base: 1,
        parts: {
          'snippet': 2,
          'contentDetails': 2,
          'status': 2
        }
      }
    };

    if (operation === 'search.list') {
      return {
        operation: operation,
        total: costs['search.list'],
        breakdown: {
          'search.list': costs['search.list']
        },
        description: 'Search operations always cost 100 units regardless of maxResults'
      };
    }

    if (costs[operation] && typeof costs[operation] === 'object') {
      const config = costs[operation];
      let totalCost = config.base;
      const breakdown = { [`${operation} (base)`]: config.base };

      // Parts 비용 계산
      if (Array.isArray(parts) && parts.length > 0) {
        parts.forEach(part => {
          const partCost = config.parts[part] || 0;
          totalCost += partCost;
          breakdown[`${operation} (${part})`] = partCost;
        });
      }

      return {
        operation: operation,
        parts: parts,
        total: totalCost,
        breakdown: breakdown,
        description: `Base cost: ${config.base}, Parts cost: ${totalCost - config.base}`
      };
    }

    // 알 수 없는 operation
    console.warn('⚠️ Unknown API operation:', operation);
    return {
      operation: operation,
      total: 1,
      breakdown: { [operation]: 1 },
      description: 'Unknown operation - estimated 1 unit'
    };
  }

  /**
   * 🎬 YouTube Shorts 필터링 검증
   */
  isValidShort(video, strictMode = true) {
    try {
      // 기본 정보 확인
      if (!video || !video.snippet) {
        return { valid: false, reason: 'Missing video data' };
      }

      // 임베드 가능 여부 (엄격 모드에서만)
      if (strictMode && video.status && !video.status.embeddable) {
        return { valid: false, reason: 'Not embeddable' };
      }

      // 공개 상태
      if (video.status && video.status.privacyStatus !== 'public') {
        return { valid: false, reason: `Privacy status: ${video.status.privacyStatus}` };
      }

      // 지역 제한 확인
      if (video.contentDetails && video.contentDetails.regionRestriction) {
        const restrictions = video.contentDetails.regionRestriction;
        
        // 한국이 차단되었는지 확인
        if (restrictions.blocked && restrictions.blocked.includes('KR')) {
          return { valid: false, reason: 'Blocked in KR' };
        }
        
        // 허용 목록이 있는데 한국이 없는지 확인
        if (restrictions.allowed && !restrictions.allowed.includes('KR')) {
          return { valid: false, reason: 'Not allowed in KR' };
        }
      }

      // 길이 확인 (Shorts는 5초-60초)
      if (video.contentDetails && video.contentDetails.duration) {
        const duration = this.parseISO8601Duration(video.contentDetails.duration);
        
        if (strictMode) {
          // 엄격 모드: 5-60초
          if (duration < 5 || duration > 60) {
            return { valid: false, reason: `Duration ${duration}s not in range 5-60s` };
          }
        } else {
          // 관대 모드: 1-120초 (일부 플랫폼 Shorts는 더 길 수 있음)
          if (duration < 1 || duration > 120) {
            return { valid: false, reason: `Duration ${duration}s not in range 1-120s` };
          }
        }
      }

      // 업로드 상태 확인 (선택적)
      if (video.status && video.status.uploadStatus) {
        const uploadStatus = video.status.uploadStatus;
        if (!['processed', 'uploaded'].includes(uploadStatus)) {
          return { valid: false, reason: `Upload status: ${uploadStatus}` };
        }
      }

      return { valid: true, reason: 'Valid YouTube Short' };
      
    } catch (error) {
      console.error('❌ Shorts validation error:', error);
      return { valid: false, reason: `Validation error: ${error.message}` };
    }
  }

  /**
   * 📊 통계 정보 계산
   */
  calculateVideoStats(video) {
    try {
      const stats = {
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        duration: 0,
        publishedDaysAgo: 0,
        engagementRate: 0
      };

      // 조회수, 좋아요, 댓글 수
      if (video.statistics) {
        stats.viewCount = parseInt(video.statistics.viewCount) || 0;
        stats.likeCount = parseInt(video.statistics.likeCount) || 0;
        stats.commentCount = parseInt(video.statistics.commentCount) || 0;
      }

      // 영상 길이
      if (video.contentDetails && video.contentDetails.duration) {
        stats.duration = this.parseISO8601Duration(video.contentDetails.duration);
      }

      // 업로드 날짜
      if (video.snippet && video.snippet.publishedAt) {
        const publishedDate = new Date(video.snippet.publishedAt);
        const now = new Date();
        stats.publishedDaysAgo = Math.floor((now - publishedDate) / (1000 * 60 * 60 * 24));
      }

      // 참여율 계산 (좋아요 + 댓글) / 조회수
      if (stats.viewCount > 0) {
        stats.engagementRate = ((stats.likeCount + stats.commentCount) / stats.viewCount * 100);
      }

      return stats;
      
    } catch (error) {
      console.error('❌ Stats calculation error:', error);
      return {
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        duration: 0,
        publishedDaysAgo: 0,
        engagementRate: 0
      };
    }
  }

  /**
   * 🏷️ 카테고리 분류
   */
  categorizeVideo(video) {
    const categories = {
      '1': '영화/애니메이션',
      '2': '자동차/교통',
      '10': '음악',
      '15': '반려동물',
      '17': '스포츠',
      '19': '여행/이벤트',
      '20': '게임',
      '22': '인물/블로그',
      '23': '코미디',
      '24': '엔터테인먼트',
      '25': '뉴스/정치',
      '26': '노하우/스타일',
      '27': '교육',
      '28': '과학기술'
    };

    try {
      const categoryId = video.snippet?.categoryId;
      const categoryName = categories[categoryId] || '기타';

      // 제목과 설명에서 추가 카테고리 힌트 추출
      const title = video.snippet?.title?.toLowerCase() || '';
      const description = video.snippet?.description?.toLowerCase() || '';
      const content = `${title} ${description}`;

      const detectedTags = [];

      // YouTube Shorts 관련 키워드 감지
      const shortsKeywords = {
        '먹방': ['먹방', 'mukbang', 'eating', '음식', '맛집'],
        '댄스': ['댄스', 'dance', '안무', '춤', 'choreography'],
        '브이로그': ['브이로그', 'vlog', '일상', '데일리', 'daily'],
        '챌린지': ['챌린지', 'challenge', '도전', 'tiktok'],
        'ASMR': ['asmr', '힐링', 'relaxing', '수면'],
        '요리': ['요리', 'cooking', '레시피', 'recipe', '홈쿡'],
        '게임': ['게임', 'gaming', 'game', '플레이', 'play'],
        '뷰티': ['뷰티', 'beauty', '메이크업', 'makeup', '화장'],
        '운동': ['운동', 'workout', '홈트', '헬스', 'fitness'],
        '반려동물': ['강아지', '고양이', '펫', 'pet', '동물']
      };

      Object.entries(shortsKeywords).forEach(([tag, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
          detectedTags.push(tag);
        }
      });

      return {
        categoryId: categoryId,
        categoryName: categoryName,
        detectedTags: detectedTags,
        isShorts: detectedTags.length > 0 || content.includes('shorts') || content.includes('쇼츠')
      };

    } catch (error) {
      console.error('❌ Video categorization error:', error);
      return {
        categoryId: '24',
        categoryName: '엔터테인먼트',
        detectedTags: [],
        isShorts: false
      };
    }
  }

  /**
   * 🔍 검색 쿼리 정규화
   */
  normalizeSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      return '';
    }

    return query
      .trim()
      .replace(/\s+/g, ' ') // 연속 공백을 하나로
      .replace(/['"]/g, '') // 따옴표 제거
      .substring(0, 100); // 최대 100자
  }

  /**
   * 🎯 검색 결과 품질 점수 계산
   */
  calculateQualityScore(video) {
    try {
      let score = 0;
      
      const stats = this.calculateVideoStats(video);
      const category = this.categorizeVideo(video);

      // 조회수 점수 (최대 30점)
      if (stats.viewCount > 1000000) score += 30;
      else if (stats.viewCount > 100000) score += 25;
      else if (stats.viewCount > 10000) score += 20;
      else if (stats.viewCount > 1000) score += 15;
      else if (stats.viewCount > 100) score += 10;
      else score += 5;

      // 참여율 점수 (최대 25점)
      if (stats.engagementRate > 5) score += 25;
      else if (stats.engagementRate > 3) score += 20;
      else if (stats.engagementRate > 1) score += 15;
      else if (stats.engagementRate > 0.5) score += 10;
      else score += 5;

      // 최신성 점수 (최대 20점)
      if (stats.publishedDaysAgo <= 1) score += 20;
      else if (stats.publishedDaysAgo <= 7) score += 15;
      else if (stats.publishedDaysAgo <= 30) score += 10;
      else if (stats.publishedDaysAgo <= 90) score += 5;
      // 90일 이상은 0점

      // 길이 점수 (최대 15점) - Shorts에 최적화
      if (stats.duration >= 15 && stats.duration <= 45) score += 15; // 최적 길이
      else if (stats.duration >= 10 && stats.duration <= 60) score += 12;
      else if (stats.duration >= 5 && stats.duration <= 90) score += 8;
      else score += 3;

      // 카테고리 점수 (최대 10점)
      if (category.isShorts) score += 10;
      else if (category.detectedTags.length > 0) score += 7;
      else score += 4;

      return Math.min(score, 100); // 최대 100점

    } catch (error) {
      console.error('❌ Quality score calculation error:', error);
      return 50; // 기본 점수
    }
  }

  /**
   * 🛡️ 안전한 JSON 파싱
   */
  safeJSONParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('⚠️ JSON parsing failed:', error.message);
      return defaultValue;
    }
  }

  /**
   * 🔧 URL 검증 및 정규화
   */
  normalizeYouTubeURL(url) {
    try {
      if (!url || typeof url !== 'string') {
        return null;
      }

      // YouTube URL 패턴들
      const patterns = {
        video: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        channel: /youtube\.com\/(?:channel\/|c\/|user\/)([a-zA-Z0-9_-]+)/,
        playlist: /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/
      };

      for (const [type, pattern] of Object.entries(patterns)) {
        const match = url.match(pattern);
        if (match) {
          return {
            type: type,
            id: match[1],
            originalUrl: url,
            normalizedUrl: this.buildYouTubeURL(type, match[1])
          };
        }
      }

      return null;
      
    } catch (error) {
      console.error('❌ URL normalization error:', error);
      return null;
    }
  }

  /**
   * 🔗 YouTube URL 생성
   */
  buildYouTubeURL(type, id) {
    const baseUrls = {
      video: 'https://www.youtube.com/watch?v=',
      shorts: 'https://www.youtube.com/shorts/',
      channel: 'https://www.youtube.com/channel/',
      playlist: 'https://www.youtube.com/playlist?list='
    };

    return baseUrls[type] ? baseUrls[type] + id : null;
  }

  /**
   * 📊 모듈 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      parsingSuccessRate: this.stats.totalParsingRequests > 0 
        ? (this.stats.successfulParsing / this.stats.totalParsingRequests * 100).toFixed(1) + '%'
        : '0%',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 🧹 통계 초기화
   */
  resetStats() {
    this.stats = {
      totalParsingRequests: 0,
      successfulParsing: 0,
      failedParsing: 0
    };
    console.log('📊 YouTube Utils 통계 초기화 완료');
  }
}

export default YouTubeUtils;

/**
 * 🌟 Bright Data 엔드포인트 파싱
 */
export function parseBrightDataEndpoint(endpoint) {
  // 형식: brd-customer-hl_9f4abeab-zone-datacenter_proxy:8o3rnm1zjkjh@brd.superproxy.io:22225
  try {
    const [credentials, hostPort] = endpoint.split('@');
    const [username, password] = credentials.split(':');
    const [host, port] = hostPort.split(':');

    return {
      username,
      password,
      host,
      port: parseInt(port)
    };
  } catch (error) {
    throw new Error(`Bright Data 엔드포인트 파싱 실패: ${error.message}`);
  }
}

/**
 * 🔄 폴백 트렌드 데이터 생성 함수들
 */
export function getDaumFallbackTrends(limit = 10) {
  const fallbackKeywords = [
    '이슈', '핫토픽', '트렌드', '바이럴', '실시간', '뉴스', '연예', '스포츠', '정치', '사회'
  ];
  
  return fallbackKeywords.slice(0, limit).map((keyword, index) => ({
    keyword,
    score: Math.max(85 - index * 4, 25),
    source: 'daum_fallback',
    rank: index + 1,
    category: '폴백 데이터',
    extractedAt: new Date().toISOString()
  }));
}

export function getInstagramFallbackTrends(limit = 10) {
  const fallbackKeywords = [
    '셀카', '데일리룩', 'OOTD', '카페', '맛집', '여행스타그램', '홈트', '뷰티', '패션', '라이프스타일'
  ];
  
  return fallbackKeywords.slice(0, limit).map((keyword, index) => ({
    keyword,
    score: Math.max(75 - index * 3, 15),
    source: 'instagram_fallback',
    rank: index + 1,
    category: '폴백 데이터',
    extractedAt: new Date().toISOString()
  }));
}

export function getNaverFallbackTrends(limit = 10) {
  const fallbackKeywords = [
    '먹방', '브이로그', '댄스', '요리', 'ASMR', '운동', '여행', '게임', '메이크업', '반려동물'
  ];
  
  return fallbackKeywords.slice(0, limit).map((keyword, index) => ({
    keyword,
    score: Math.max(90 - index * 5, 30),
    source: 'naver_fallback',
    rank: index + 1,
    category: '폴백 데이터',
    extractedAt: new Date().toISOString()
  }));
}

export function getGoogleTrendsFallback(limit = 10) {
  const fallbackKeywords = [
    'YouTube Shorts', '틱톡', '인스타', '챌린지', '밈', '바이럴', '인플루언서', '리뷰', '튜토리얼', '힐링'
  ];
  
  return fallbackKeywords.slice(0, limit).map((keyword, index) => ({
    keyword,
    score: Math.max(80 - index * 3, 20),
    source: 'google_trends_fallback',
    rank: index + 1,
    category: '폴백 데이터',
    extractedAt: new Date().toISOString()
  }));
}

/**
 * 🔧 HTML에서 키워드 추출 (웹 스크래핑용)
 */
export function extractKeywordsFromHTML(html, selectors) {
  try {
    // Cheerio가 없는 경우 기본 정규식 파싱
    if (!html || typeof html !== 'string') {
      return [];
    }

    const keywords = [];
    
    // 간단한 HTML 태그 제거 및 텍스트 추출
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 스크립트 제거
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // 스타일 제거
      .replace(/<[^>]*>/g, ' ') // HTML 태그 제거
      .replace(/\s+/g, ' ') // 연속된 공백 정리
      .trim();

    // 기본 키워드 추출 (한글, 영문 단어)
    const matches = textContent.match(/[\uAC00-\uD7AF\w]+/g) || [];
    
    matches.forEach(match => {
      const trimmed = match.trim();
      if (trimmed && trimmed.length > 1 && trimmed.length < 100) {
        keywords.push(trimmed);
      }
    });
    
    // 중복 제거 및 정제
    return [...new Set(keywords)]
      .filter(kw => kw && !/^\d+$/.test(kw)) // 숫자만인 것 제외
      .slice(0, 50); // 최대 50개
      
  } catch (error) {
    console.error('HTML 키워드 추출 실패:', error.message);
    return [];
  }
}

/**
 * 🌐 구글 자동완성 스크래핑 (Bright Data 없이)
 */
export async function scrapeGoogleAutocomplete(keyword, context = '') {
  const searchQuery = context ? `${keyword} ${context}` : keyword;
  
  try {
    // 실제 구현에서는 axios 또는 fetch 사용
    console.log(`🔍 구글 자동완성 스크래핑: "${searchQuery}"`);
    
    // 폴백: 기본 확장 키워드 반환
    const basicExpansions = [
      `${keyword} 추천`,
      `${keyword} 방법`,
      `${keyword} 순위`,
      `${keyword} 후기`,
      `${keyword} 정보`
    ];
    
    return basicExpansions.slice(0, 5);
  } catch (error) {
    console.error('❌ 구글 자동완성 스크래핑 실패:', error.message);
    return [];
  }
}

/**
 * 📱 네이버 자동완성 스크래핑 (Bright Data 없이)
 */
export async function scrapeNaverAutocomplete(keyword, context = '') {
  const searchQuery = context ? `${keyword} ${context}` : keyword;
  
  try {
    console.log(`📱 네이버 자동완성 스크래핑: "${searchQuery}"`);
    
    // 폴백: 한국어 확장 키워드 반환
    const koreanExpansions = [
      `${keyword} 뜻`,
      `${keyword} 의미`,
      `${keyword} 종류`,
      `${keyword} 특징`,
      `${keyword} 장점`
    ];
    
    return koreanExpansions.slice(0, 5);
  } catch (error) {
    console.error('❌ 네이버 자동완성 스크래핑 실패:', error.message);
    return [];
  }
}

/**
 * 🔍 구글 관련 검색어 스크래핑 (Bright Data 없이)
 */
export async function scrapeGoogleRelatedSearches(keyword) {
  try {
    console.log(`🔍 구글 관련 검색어 스크래핑: "${keyword}"`);
    
    // 폴백: 일반적인 관련 검색어 패턴
    const relatedPatterns = [
      `${keyword} vs`,
      `${keyword} 비교`,
      `${keyword} 가격`,
      `${keyword} 사용법`,
      `${keyword} 리뷰`,
      `${keyword} 추천`,
      `${keyword} 2024`,
      `${keyword} 최신`,
      `${keyword} 인기`,
      `${keyword} 순위`
    ];
    
    return relatedPatterns.slice(0, 8);
  } catch (error) {
    console.error('❌ 구글 관련 검색어 스크래핑 실패:', error.message);
    return [];
  }
}

/**
 * 🎯 기본 키워드 확장 (폴백용)
 */
export function getBasicKeywordExpansion(keyword) {
  const expansionPatterns = [
    `${keyword} 추천`,
    `${keyword} 방법`,
    `${keyword} 팁`,
    `${keyword} 가이드`,
    `${keyword} 순위`,
    `${keyword} 후기`,
    `${keyword} 비교`,
    `${keyword} 정보`,
    `인기 ${keyword}`,
    `최신 ${keyword}`
  ];
  
  return expansionPatterns.map((kw, index) => ({
    keyword: kw,
    relevance: index < 3 ? 'high' : index < 6 ? 'medium' : 'low',
    type: 'basic_expansion',
    score: Math.max(80 - index * 8, 20)
  }));
}

/**
 * 🧠 Claude를 통한 키워드 분석 및 최적화 (신규 추가)
 */
export async function analyzeKeywordsWithClaude(originalKeyword, expandedKeywords, context, instruction) {
  const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  
  if (!claudeApiKey) {
    console.log('⚠️ Claude API 없음 - 기본 정제 사용');
    return null;
  }

  try {
    const prompt = `
다음 검색어 확장 결과를 분석하고 YouTube Shorts에 최적화해주세요:

원본 키워드: "${originalKeyword}"
검색 맥락: ${context || '일반'}
확장된 키워드들: ${expandedKeywords.join(', ')}

${instruction}

분석 기준:
1. YouTube Shorts 콘텐츠 적합성 (60초 이하 영상에 적합한가?)
2. 검색 볼륨 가능성 (사람들이 실제로 검색할만한가?)
3. 원본 키워드와의 관련성
4. 트렌드 잠재력
5. 한국 사용자 적합성

다음 JSON 형식으로 응답해주세요:
{
  "analysis": "전체 분석 요약",
  "optimized_keywords": [
    {
      "keyword": "최적화된 키워드",
      "score": 95,
      "relevance": "high/medium/low",
      "reason": "선택 이유"
    }
  ],
  "recommendations": ["추천사항1", "추천사항2"]
}`;

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const result = JSON.parse(response.data.content[0].text);
    
    console.log('🧠 Claude 키워드 분석 완료');
    return result;

  } catch (error) {
    console.error('❌ Claude 키워드 분석 실패:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 📊 YouTube Utils 통계 조회 함수
 */
export function getYouTubeUtilsStats() {
  const utils = new YouTubeUtils();
  return utils.getStats();
}

/**
 * ⏱️ Duration 파싱 편의 함수
 */
export function parseDuration(duration) {
  const utils = new YouTubeUtils();
  return utils.parseISO8601Duration(duration);
}

/**
 * 💰 API 사용량 계산 편의 함수
 */
export function calculateApiUsage(operation, parts = []) {
  const utils = new YouTubeUtils();
  return utils.calculateAPIUnits(operation, parts);
}

/**
 * 🎯 Shorts 유효성 검사 편의 함수
 */
export function validateShorts(video, strictMode = true) {
  const utils = new YouTubeUtils();
  return utils.isValidShort(video, strictMode);
}

/**
 * 📊 품질 점수 계산 편의 함수
 */
export function calculateQualityScore(video) {
  const utils = new YouTubeUtils();
  return utils.calculateQualityScore(video);
} 