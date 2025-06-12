/**
 * ⚙️ API 설정 관리
 */
class APIConfig {
  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 환경변수에서 설정 로드
   */
  loadConfig() {
    return {
      // YouTube Data API v3
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
      
      // SerpAPI (Google Trends, Autocomplete)
      serpApiKey: process.env.SERP_API_KEY,
      
      // Bright Data (웹 스크래핑)
      brightData: {
        apiKey: process.env.BRIGHT_DATA_API_KEY,
        endpoint: process.env.BRIGHT_DATA_ENDPOINT || 'https://api.bright-data.com/scrape'
      },
      
      // Claude AI
      claudeApiKey: process.env.ANTHROPIC_API_KEY,
      
      // API 할당량 설정
      quotaLimits: {
        youtube: {
          dailyLimit: 10000,
          warningThreshold: 8000,
          emergencyThreshold: 9000
        },
        serpApi: {
          monthlyLimit: 1000,
          warningThreshold: 800
        },
        brightData: {
          monthlyRequests: 5000,
          concurrentRequests: 10
        },
        claude: {
          dailyRequests: 2000,
          tokensPerRequest: 4000
        }
      },
      
      // 캐시 설정
      cache: {
        ttl: {
          searchResults: 4 * 60 * 60 * 1000,    // 4시간
          trendData: 2 * 60 * 60 * 1000,        // 2시간
          videoDetails: 24 * 60 * 60 * 1000,    // 24시간
          userPreferences: 7 * 24 * 60 * 60 * 1000 // 7일
        },
        maxSize: 1000, // 최대 캐시 항목 수
        cleanupInterval: 60 * 60 * 1000 // 1시간마다 정리
      },
      
      // 기본 검색 설정
      defaults: {
        maxResults: 20,
        regionCode: 'KR',
        language: 'ko',
        videoDuration: 'short',
        safeSearch: 'moderate'
      }
    };
  }

  /**
   * 설정 검증
   */
  validateConfig() {
    const required = [
      'youtubeApiKey'
    ];

    const optional = [
      'serpApiKey',
      'brightData.apiKey',
      'claudeApiKey'
    ];

    const missing = [];
    const warnings = [];

    // 필수 설정 확인
    for (const key of required) {
      if (!this.getNestedValue(key)) {
        missing.push(key);
      }
    }

    // 선택적 설정 확인
    for (const key of optional) {
      if (!this.getNestedValue(key)) {
        warnings.push(key);
      }
    }

    return {
      isValid: missing.length === 0,
      missing,
      warnings,
      availableFeatures: this.getAvailableFeatures()
    };
  }

  /**
   * 중첩된 키 값 가져오기
   */
  getNestedValue(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this.config);
  }

  /**
   * 사용 가능한 기능 확인
   */
  getAvailableFeatures() {
    const features = {
      youtubeSearch: !!this.config.youtubeApiKey,
      videoFiltering: !!this.config.youtubeApiKey,
      googleTrends: !!this.config.serpApiKey,
      webScraping: !!(this.config.brightData.apiKey && this.config.brightData.endpoint),
      aiOptimization: !!this.config.claudeApiKey
    };

    return features;
  }

  /**
   * 기능별 설정 가져오기
   */
  getYouTubeConfig() {
    return {
      apiKey: this.config.youtubeApiKey,
      quotaLimit: this.config.quotaLimits.youtube,
      defaults: this.config.defaults
    };
  }

  getSerpConfig() {
    return {
      apiKey: this.config.serpApiKey,
      quotaLimit: this.config.quotaLimits.serpApi
    };
  }

  getBrightDataConfig() {
    return {
      apiKey: this.config.brightData.apiKey,
      endpoint: this.config.brightData.endpoint,
      quotaLimit: this.config.quotaLimits.brightData
    };
  }

  getClaudeConfig() {
    return {
      apiKey: this.config.claudeApiKey,
      quotaLimit: this.config.quotaLimits.claude
    };
  }

  getCacheConfig() {
    return this.config.cache;
  }

  /**
   * 설정 업데이트
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
  }

  /**
   * 환경별 설정
   */
  static createDevelopmentConfig() {
    return {
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
      serpApiKey: process.env.SERP_API_KEY,
      brightData: {
        apiKey: process.env.BRIGHT_DATA_API_KEY,
        endpoint: 'https://api.bright-data.com/scrape'
      },
      claudeApiKey: process.env.ANTHROPIC_API_KEY,
      quotaLimits: {
        youtube: { dailyLimit: 1000, warningThreshold: 800 }, // 개발환경 제한
        serpApi: { monthlyLimit: 100, warningThreshold: 80 },
        brightData: { monthlyRequests: 500, concurrentRequests: 5 },
        claude: { dailyRequests: 200, tokensPerRequest: 4000 }
      }
    };
  }

  static createProductionConfig() {
    return {
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
      serpApiKey: process.env.SERP_API_KEY,
      brightData: {
        apiKey: process.env.BRIGHT_DATA_API_KEY,
        endpoint: process.env.BRIGHT_DATA_ENDPOINT
      },
      claudeApiKey: process.env.ANTHROPIC_API_KEY,
      quotaLimits: {
        youtube: { dailyLimit: 10000, warningThreshold: 8000 },
        serpApi: { monthlyLimit: 1000, warningThreshold: 800 },
        brightData: { monthlyRequests: 5000, concurrentRequests: 10 },
        claude: { dailyRequests: 2000, tokensPerRequest: 4000 }
      }
    };
  }

  /**
   * 설정 상태 리포트
   */
  generateReport() {
    const validation = this.validateConfig();
    const features = this.getAvailableFeatures();
    
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      validation,
      features,
      quotaLimits: this.config.quotaLimits,
      recommendations: this.generateRecommendations(validation, features)
    };
  }

  /**
   * 설정 추천사항 생성
   */
  generateRecommendations(validation, features) {
    const recommendations = [];

    if (!features.youtubeSearch) {
      recommendations.push({
        type: 'critical',
        message: 'YouTube API 키가 없습니다. 핵심 기능을 사용할 수 없습니다.'
      });
    }

    if (!features.googleTrends) {
      recommendations.push({
        type: 'warning',
        message: 'SerpAPI 키가 없습니다. 구글 트렌드 기능이 제한됩니다.'
      });
    }

    if (!features.webScraping) {
      recommendations.push({
        type: 'info',
        message: 'Bright Data 설정이 없습니다. 웹 스크래핑 기능이 제한됩니다.'
      });
    }

    if (!features.aiOptimization) {
      recommendations.push({
        type: 'info',
        message: 'Claude API 키가 없습니다. AI 최적화 기능이 제한됩니다.'
      });
    }

    if (validation.isValid && Object.values(features).every(f => f)) {
      recommendations.push({
        type: 'success',
        message: '모든 API가 구성되었습니다. 전체 기능을 사용할 수 있습니다.'
      });
    }

    return recommendations;
  }
}

module.exports = APIConfig; 