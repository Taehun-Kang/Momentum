/**
 * Backend MCP System - 통합 클라이언트
 * YouTube Shorts AI 큐레이션을 위한 통합 MCP 시스템
 * CommonJS 버전 - Railway 배포 호환
 * Wave Team
 */

const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

/**
 * 통합 MCP 클라이언트 클래스 (CommonJS)
 * MCP 서버들과의 통신을 담당하는 통합 클라이언트
 */
class MomentumMCPClient {
  constructor() {
    this.servers = {
      youtubeCurator: null,
      userAnalytics: null
    };
    
    this.connected = {
      youtubeCurator: false,
      userAnalytics: false
    };

    this.available = true;
    
    console.log('🚀 Backend MCP 시스템 초기화 중...');
  }

  /**
   * 모든 MCP 서버에 연결
   */
  async connectAll() {
    try {
      console.log('📡 MCP 서버들에 연결 중...');
      
      // 현재 Railway 환경에서는 실제 MCP 서버 연결 대신 목(Mock) 구현 사용
      // 실제 환경에서는 아래 주석을 해제하고 사용
      /*
      await this.connectYouTubeCurator();
      await this.connectUserAnalytics();
      */
      
      // 목 연결 (개발/배포 환경 호환성)
      this.connected.youtubeCurator = true;
      this.connected.userAnalytics = true;
      
      console.log('✅ Backend MCP 시스템 연결 완료 (목 모드)');
      
      return {
        success: true,
        connectedServers: Object.keys(this.connected).filter(key => this.connected[key]),
        mode: 'mock' // 실제 연결 시 'live'로 변경
      };

    } catch (error) {
      console.error('❌ MCP 서버 연결 실패:', error);
      return {
        success: false,
        error: error.message,
        mode: 'fallback'
      };
    }
  }

  /**
   * 연결 상태 확인
   */
  getConnectionStatus() {
    return {
      allConnected: this.connected.youtubeCurator && this.connected.userAnalytics,
      youtubeCurator: this.connected.youtubeCurator,
      userAnalytics: this.connected.userAnalytics,
      available: this.available
    };
  }

  // ==================== AI 자연어 처리 ====================

  /**
   * 자연어를 분석해서 검색 키워드로 변환
   * @param {string} naturalLanguage - 자연어 입력
   * @param {Object} options - 분석 옵션
   * @returns {Object} 분석 결과
   */
  async processNaturalLanguage(naturalLanguage, options = {}) {
    try {
      console.log(`🧠 자연어 분석: "${naturalLanguage}"`);
      
      // Claude AI 기반 자연어 분석 구현
      // 현재는 키워드 추출 시뮬레이션
      const keywords = this.extractKeywordsFromText(naturalLanguage);
      const intent = this.detectIntent(naturalLanguage);
      const mood = this.detectMood(naturalLanguage);
      
      return {
        originalText: naturalLanguage,
        keywords: keywords,
        intent: intent,
        mood: mood,
        confidence: 0.85,
        suggestions: this.generateSuggestions(keywords, mood),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('자연어 분석 실패:', error);
      throw error;
    }
  }

  /**
   * 텍스트에서 키워드 추출 (간단한 구현)
   */
  extractKeywordsFromText(text) {
    const keywords = [];
    
    // 감정/상태 키워드
    const moodMap = {
      '피곤': ['힐링', 'ASMR', '수면'],
      '스트레스': ['힐링', '명상', '자연'],
      '우울': ['기분전환', '웃긴', '재미있는'],
      '행복': ['즐거운', '신나는', '축하'],
      '지루': ['재미있는', '흥미진진', '놀라운']
    };
    
    // 활동 키워드
    const activityMap = {
      '운동': ['홈트', '요가', '스트레칭'],
      '요리': ['레시피', '먹방', '쿠킹'],
      '여행': ['브이로그', '여행지', '풍경'],
      '공부': ['집중', '모티베이션', '꿀팁']
    };
    
    // 시간대 키워드
    const timeMap = {
      '아침': ['모닝루틴', '아침운동'],
      '점심': ['점심메뉴', '오후'],
      '저녁': ['저녁루틴', '퇴근'],
      '밤': ['ASMR', '수면', '야식']
    };
    
    // 매핑 적용
    [moodMap, activityMap, timeMap].forEach(map => {
      Object.keys(map).forEach(key => {
        if (text.includes(key)) {
          keywords.push(...map[key]);
        }
      });
    });
    
    // 기본 키워드 추출
    const words = text.replace(/[^\w\s가-힣]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 1);
    
    keywords.push(...words.slice(0, 3));
    
    return [...new Set(keywords)].slice(0, 8); // 중복 제거 후 최대 8개
  }

  /**
   * 의도 감지
   */
  detectIntent(text) {
    if (text.includes('보고 싶어') || text.includes('추천')) return 'recommendation';
    if (text.includes('찾아') || text.includes('검색')) return 'search';
    if (text.includes('어떤') || text.includes('뭐')) return 'discovery';
    return 'general';
  }

  /**
   * 감정/기분 감지
   */
  detectMood(text) {
    if (text.includes('피곤') || text.includes('힘들')) return 'tired';
    if (text.includes('스트레스') || text.includes('답답')) return 'stressed';
    if (text.includes('우울') || text.includes('슬프')) return 'sad';
    if (text.includes('행복') || text.includes('기분좋')) return 'happy';
    if (text.includes('지루') || text.includes('심심')) return 'bored';
    return 'neutral';
  }

  /**
   * 제안 생성
   */
  generateSuggestions(keywords, mood) {
    const suggestions = [];
    
    if (mood === 'tired') {
      suggestions.push('힐링되는 자연 영상', 'ASMR 수면 도움', '차분한 음악');
    } else if (mood === 'bored') {
      suggestions.push('재미있는 챌린지', '웃긴 동물 영상', '신기한 라이프핵');
    } else if (mood === 'stressed') {
      suggestions.push('명상 가이드', '요가 스트레칭', '힐링 브이로그');
    }
    
    return suggestions.slice(0, 5);
  }

  // ==================== YouTube 큐레이션 기능 ====================

  /**
   * 키워드 확장
   */
  async expandKeyword(keyword, options = {}) {
    try {
      console.log(`🔍 키워드 확장: "${keyword}"`);
      
      const { maxKeywords = 15, includeChannels = true, includeTimeFilters = true } = options;
      
      // 키워드 확장 로직
      const expandedKeywords = [];
      
      // 기본 확장
      const baseExpansions = {
        '힐링': ['치유', 'ASMR', '명상', '자연', '차분한'],
        '먹방': ['음식', '요리', '레시피', '맛집', '푸드'],
        '운동': ['홈트', '요가', '헬스', '다이어트', '스트레칭'],
        '여행': ['브이로그', '풍경', '관광', '맛집투어', '여행지'],
        '댄스': ['춤', '안무', '커버댄스', 'K-POP', '댄스챌린지']
      };
      
      // 관련 키워드 추가
      if (baseExpansions[keyword]) {
        expandedKeywords.push(...baseExpansions[keyword]);
      }
      
      // 시간대별 키워드
      if (includeTimeFilters) {
        const hour = new Date().getHours();
        if (hour < 9) expandedKeywords.push('모닝', '아침');
        else if (hour < 18) expandedKeywords.push('오후', '점심');
        else expandedKeywords.push('저녁', '밤');
      }
      
      // 인기 채널 키워드
      if (includeChannels) {
        expandedKeywords.push('인기', '바이럴', '트렌드');
      }
      
      // 일반적인 확장
      expandedKeywords.push(
        keyword + ' 추천',
        keyword + ' 브이로그',
        '짧은 ' + keyword,
        keyword + ' 꿀팁'
      );
      
      return {
        original: keyword,
        expanded: [...new Set(expandedKeywords)].slice(0, maxKeywords),
        suggestions: this.generateRelatedSuggestions(keyword),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('키워드 확장 실패:', error);
      throw error;
    }
  }

  /**
   * 관련 제안 생성
   */
  generateRelatedSuggestions(keyword) {
    const suggestions = [
      `${keyword} 초보자 가이드`,
      `${keyword} 꿀팁 모음`,
      `${keyword} 브이로그`,
      `재미있는 ${keyword}`,
      `${keyword} 챌린지`
    ];
    
    return suggestions.slice(0, 5);
  }

  /**
   * 최적화된 검색 쿼리 생성
   */
  async buildOptimizedQueries(keyword, strategy = 'auto', maxResults = 15) {
    try {
      console.log(`⚙️ 쿼리 최적화: "${keyword}" (${strategy})`);
      
      const queries = [];
      
      // 기본 쿼리
      queries.push({
        query: keyword,
        type: 'exact',
        priority: 'high'
      });
      
      // 확장 쿼리들
      const expansion = await this.expandKeyword(keyword);
      
      expansion.expanded.slice(0, 5).forEach(expandedKeyword => {
        queries.push({
          query: `${keyword} ${expandedKeyword}`,
          type: 'expanded',
          priority: 'medium'
        });
      });
      
      // 전략별 쿼리
      if (strategy === 'channel_focused') {
        queries.push({
          query: `${keyword} 인기 채널`,
          type: 'channel',
          priority: 'medium'
        });
      } else if (strategy === 'time_sensitive') {
        queries.push({
          query: `${keyword} 최신`,
          type: 'recent',
          priority: 'high'
        });
      }
      
      return {
        queries: queries.slice(0, maxResults),
        strategy: strategy,
        totalQueries: queries.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('쿼리 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 재생 가능한 Shorts 검색 (목 구현)
   */
  async searchPlayableShorts(query, maxResults = 20, filters = {}) {
    try {
      console.log(`🎬 Shorts 검색: "${query}"`);
      
      // 실제 구현에서는 YouTube API 호출
      // 현재는 목 데이터 반환
      const mockResults = this.generateMockVideoResults(query, maxResults);
      
      return {
        query: query,
        results: mockResults,
        totalResults: mockResults.length,
        filteringSuccess: 0.75, // 75% 성공률
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('영상 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 목 비디오 결과 생성
   */
  generateMockVideoResults(query, maxResults) {
    const mockVideos = [];
    
    for (let i = 0; i < Math.min(maxResults, 10); i++) {
      mockVideos.push({
        id: `mock_video_${i}_${Date.now()}`,
        title: `${query} 관련 영상 ${i + 1}`,
        channelName: `채널 ${i + 1}`,
        duration: Math.floor(Math.random() * 60) + 15, // 15-75초
        viewCount: Math.floor(Math.random() * 1000000) + 1000,
        thumbnailUrl: `https://img.youtube.com/vi/mock_${i}/hqdefault.jpg`,
        publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        isPlayable: true,
        tags: [query, '쇼츠', 'Shorts']
      });
    }
    
    return mockVideos;
  }

  /**
   * 비디오 메타데이터 분석
   */
  async analyzeVideoMetadata(videoIds, criteria = {}) {
    try {
      console.log(`📊 비디오 분석: ${videoIds.length}개`);
      
      // 목 분석 결과
      const analysis = {
        videos: videoIds.map(id => ({
          id: id,
          score: Math.random() * 100,
          tags: ['인기', '추천'],
          engagement: Math.random() * 0.1,
          suitability: Math.random() > 0.3 ? 'good' : 'fair'
        })),
        summary: {
          totalAnalyzed: videoIds.length,
          averageScore: 75.5,
          recommendedCount: Math.floor(videoIds.length * 0.7)
        },
        timestamp: new Date().toISOString()
      };
      
      return analysis;

    } catch (error) {
      console.error('비디오 분석 실패:', error);
      throw error;
    }
  }

  // ==================== 통합 워크플로우 ====================

  /**
   * 완전한 AI 큐레이션 워크플로우
   */
  async aiCurationWorkflow(keyword, userId = null) {
    try {
      console.log(`🤖 AI 큐레이션 워크플로우: "${keyword}"`);
      
      const startTime = Date.now();
      
      // 1. 키워드 확장
      const expansion = await this.expandKeyword(keyword, {
        includeChannels: true,
        includeTimeFilters: true,
        maxKeywords: 15
      });

      // 2. 최적화된 쿼리 생성
      const queries = await this.buildOptimizedQueries(keyword, 'auto', 8);

      // 3. 다중 검색 실행
      const searchPromises = queries.queries.slice(0, 3).map(queryObj => 
        this.searchPlayableShorts(queryObj.query, 10, {})
      );
      const searchResults = await Promise.all(searchPromises);

      // 4. 결과 병합 및 중복 제거
      const allVideos = searchResults
        .flatMap(result => result.results || [])
        .filter((video, index, self) => 
          self.findIndex(v => v.id === video.id) === index
        )
        .slice(0, 30);

      // 5. 메타데이터 분석
      const videoIds = allVideos.map(v => v.id);
      const analysis = videoIds.length > 0 ? 
        await this.analyzeVideoMetadata(videoIds, {
          minViewCount: 1000,
          maxDuration: 60
        }) : { videos: [], summary: {} };

      // 6. 최종 결과 조합
      const finalResults = allVideos
        .map(video => {
          const videoAnalysis = analysis.videos?.find(a => a.id === video.id);
          return {
            ...video,
            score: videoAnalysis?.score || 50,
            suitability: videoAnalysis?.suitability || 'fair'
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

      const performance = {
        totalTime: Date.now() - startTime,
        stepsCompleted: 5,
        videosAnalyzed: allVideos.length,
        finalRecommendations: finalResults.length
      };

      console.log(`✅ AI 큐레이션 완료: ${finalResults.length}개 추천 (${performance.totalTime}ms)`);

      return {
        steps: {
          expansion,
          queries,
          searches: searchResults,
          analysis,
          personalization: userId ? { userId, applied: true } : null
        },
        finalResults,
        performance,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('AI 큐레이션 워크플로우 실패:', error);
      throw error;
    }
  }

  // ==================== 사용자 분석 기능 ====================

  /**
   * 인기 키워드 조회
   */
  async getPopularKeywords(options = {}) {
    console.log('📈 인기 키워드 조회');
    
    // 목 인기 키워드 데이터
    return {
      keywords: [
        { keyword: '힐링', score: 95, trend: 'up' },
        { keyword: '먹방', score: 90, trend: 'stable' },
        { keyword: '댄스', score: 85, trend: 'up' },
        { keyword: '브이로그', score: 80, trend: 'down' },
        { keyword: 'ASMR', score: 75, trend: 'up' }
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 사용자 패턴 분석
   */
  async analyzeUserPatterns(userId, timeRange = '30d', includeRecommendations = true) {
    console.log(`👤 사용자 패턴 분석: ${userId}`);
    
    // 목 사용자 패턴 데이터
    return {
      userId,
      patterns: {
        preferredCategories: ['힐링', 'ASMR', '브이로그'],
        activeHours: [19, 20, 21, 22], // 저녁 시간대 활성
        averageWatchTime: 45, // 초
        engagementRate: 0.65
      },
      recommendations: includeRecommendations ? [
        '저녁 시간 힐링 영상',
        'ASMR 수면 도움',
        '차분한 브이로그'
      ] : [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 실시간 트렌드 조회
   */
  async getRealtimeTrends(timeWindow = 1, detectSurging = true, groupByTimeSlots = true) {
    console.log('⚡ 실시간 트렌드 조회');
    
    // 목 트렌드 데이터
    return {
      trends: [
        { keyword: '신년 계획', score: 98, change: '+15%' },
        { keyword: '홈트', score: 92, change: '+8%' },
        { keyword: '다이어트', score: 88, change: '+12%' },
        { keyword: '새해 다짐', score: 85, change: '+20%' }
      ],
      surging: detectSurging ? ['신년 계획', '새해 다짐'] : [],
      timeSlots: groupByTimeSlots ? {
        morning: ['모닝루틴', '홈트'],
        afternoon: ['다이어트', '요리'],
        evening: ['힐링', 'ASMR']
      } : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 트렌딩 키워드 예측
   */
  async predictTrendingKeywords(predictionWindow = '6h', limit = 10, confidenceThreshold = 0.7, includeReasons = true) {
    console.log('🔮 트렌딩 키워드 예측');
    
    // 목 예측 데이터
    return {
      predictions: [
        { keyword: '신년 챌린지', confidence: 0.85, expectedGrowth: '+25%' },
        { keyword: '홈트 루틴', confidence: 0.78, expectedGrowth: '+18%' },
        { keyword: '건강 식단', confidence: 0.72, expectedGrowth: '+15%' }
      ].filter(p => p.confidence >= confidenceThreshold).slice(0, limit),
      reasons: includeReasons ? [
        '신년 시즌 효과',
        '건강 관심 증가',
        '집에서 운동 트렌드'
      ] : [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 연결 해제
   */
  async disconnectAll() {
    try {
      console.log('🔌 MCP 연결 해제 중...');
      
      this.connected.youtubeCurator = false;
      this.connected.userAnalytics = false;
      
      console.log('✅ MCP 연결 해제 완료');
      
      return { success: true };

    } catch (error) {
      console.error('❌ MCP 연결 해제 실패:', error);
      return { success: false, error: error.message };
    }
  }
}

// CommonJS 내보내기
module.exports = MomentumMCPClient; 