/**
 * 📊 검색 결과 분석 도구
 * LLM을 활용하여 YouTube Shorts 검색 결과의 품질을 분석하고 개선 방안 제시
 */

import axios from 'axios';

class ResultAnalyzer {
  constructor() {
    this.stats = {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      claudeApiCalls: 0,
      averageQualityScore: 0,
      analysisTypes: {
        diversity: 0,
        quality: 0,
        relevance: 0,
        trend_alignment: 0
      }
    };
  }

  /**
   * 📊 메인 검색 결과 분석 함수
   */
  async analyzeSearchResults({
    searchResults,
    originalQuery,
    userIntent = '',
    analysisType = 'comprehensive',
    includeImprovements = true
  }) {
    console.log(`📊 검색 결과 분석 시작: ${searchResults.length}개 영상 (분석 유형: ${analysisType})`);
    
    try {
      this.stats.totalAnalyses++;
      this.stats.analysisTypes[analysisType] = (this.stats.analysisTypes[analysisType] || 0) + 1;

      const analysisResult = {
        original_query: originalQuery,
        user_intent: userIntent,
        analysis_type: analysisType,
        total_videos: searchResults.length,
        analysis_timestamp: new Date().toISOString(),
        quality_metrics: {},
        insights: {},
        recommendations: [],
        overall_score: 0
      };

      // 1. 기본 메트릭 분석
      console.log('📈 1단계: 기본 품질 메트릭 계산');
      analysisResult.quality_metrics = await this.calculateQualityMetrics(searchResults);

      // 2. 다양성 분석
      console.log('🎨 2단계: 콘텐츠 다양성 분석');
      analysisResult.diversity_analysis = await this.analyzeDiversity(searchResults);

      // 3. 관련성 분석
      console.log('🎯 3단계: 쿼리 관련성 분석');
      analysisResult.relevance_analysis = await this.analyzeRelevance(searchResults, originalQuery);

      // 4. LLM 기반 심층 분석 (선택적)
      const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
      if (claudeApiKey && analysisType === 'comprehensive') {
        console.log('🧠 4단계: LLM 기반 심층 분석');
        analysisResult.llm_analysis = await this.performLLMAnalysis(
          searchResults, 
          originalQuery, 
          userIntent
        );
      }

      // 5. 종합 점수 계산
      analysisResult.overall_score = this.calculateOverallScore(analysisResult);

      // 6. 개선 방안 생성 (선택적)
      if (includeImprovements) {
        console.log('💡 5단계: 개선 방안 생성');
        analysisResult.recommendations = await this.generateImprovements(
          analysisResult,
          originalQuery,
          userIntent
        );
      }

      // 통계 업데이트
      this.stats.successfulAnalyses++;
      this.stats.averageQualityScore = 
        (this.stats.averageQualityScore * (this.stats.successfulAnalyses - 1) + analysisResult.overall_score) / 
        this.stats.successfulAnalyses;

      console.log(`✅ 분석 완료: 종합 점수 ${analysisResult.overall_score.toFixed(1)}/100`);

      return analysisResult;

    } catch (error) {
      console.error('❌ 검색 결과 분석 실패:', error);
      return {
        error: error.message,
        original_query: originalQuery,
        analysis_type: analysisType,
        fallback_analysis: this.generateBasicAnalysis(searchResults)
      };
    }
  }

  /**
   * 📈 기본 품질 메트릭 계산
   */
  async calculateQualityMetrics(videos) {
    console.log(`📈 품질 메트릭 계산 중... (${videos.length}개 영상)`);

    const metrics = {
      total_videos: videos.length,
      playable_videos: 0,
      average_duration: 0,
      view_count_stats: { min: 0, max: 0, avg: 0, median: 0 },
      like_count_stats: { min: 0, max: 0, avg: 0, median: 0 },
      engagement_rate_stats: { min: 0, max: 0, avg: 0 },
      channel_diversity: 0,
      upload_recency: { within_week: 0, within_month: 0, older: 0 },
      quality_distribution: { high: 0, medium: 0, low: 0 }
    };

    if (videos.length === 0) return metrics;

    // 재생 가능 영상 수
    metrics.playable_videos = videos.filter(video => 
      video.status?.embeddable && video.status?.privacyStatus === 'public'
    ).length;

    // 영상 길이 통계
    const durations = videos
      .map(video => this.parseDuration(video.contentDetails?.duration))
      .filter(d => d > 0);
    
    if (durations.length > 0) {
      metrics.average_duration = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    // 조회수 통계
    const viewCounts = videos
      .map(video => parseInt(video.statistics?.viewCount || 0))
      .filter(v => v > 0)
      .sort((a, b) => a - b);

    if (viewCounts.length > 0) {
      metrics.view_count_stats = {
        min: viewCounts[0],
        max: viewCounts[viewCounts.length - 1],
        avg: viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length,
        median: viewCounts[Math.floor(viewCounts.length / 2)]
      };
    }

    // 좋아요 수 통계
    const likeCounts = videos
      .map(video => parseInt(video.statistics?.likeCount || 0))
      .filter(l => l > 0)
      .sort((a, b) => a - b);

    if (likeCounts.length > 0) {
      metrics.like_count_stats = {
        min: likeCounts[0],
        max: likeCounts[likeCounts.length - 1],
        avg: likeCounts.reduce((a, b) => a + b, 0) / likeCounts.length,
        median: likeCounts[Math.floor(likeCounts.length / 2)]
      };
    }

    // 참여도 통계
    const engagementRates = videos
      .map(video => this.calculateEngagementRate(video))
      .filter(r => r > 0);

    if (engagementRates.length > 0) {
      metrics.engagement_rate_stats = {
        min: Math.min(...engagementRates),
        max: Math.max(...engagementRates),
        avg: engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length
      };
    }

    // 채널 다양성
    const uniqueChannels = new Set(videos.map(v => v.snippet?.channelId)).size;
    metrics.channel_diversity = videos.length > 0 ? (uniqueChannels / videos.length * 100) : 0;

    // 업로드 최신성
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    videos.forEach(video => {
      const publishDate = new Date(video.snippet?.publishedAt);
      if (publishDate > oneWeekAgo) {
        metrics.upload_recency.within_week++;
      } else if (publishDate > oneMonthAgo) {
        metrics.upload_recency.within_month++;
      } else {
        metrics.upload_recency.older++;
      }
    });

    // 품질 분포
    videos.forEach(video => {
      const qualityScore = this.assessVideoQuality(video);
      if (qualityScore >= 70) {
        metrics.quality_distribution.high++;
      } else if (qualityScore >= 40) {
        metrics.quality_distribution.medium++;
      } else {
        metrics.quality_distribution.low++;
      }
    });

    console.log(`✅ 품질 메트릭 계산 완료: 재생가능 ${metrics.playable_videos}/${metrics.total_videos}개`);

    return metrics;
  }

  /**
   * 🎨 콘텐츠 다양성 분석
   */
  async analyzeDiversity(videos) {
    console.log(`🎨 다양성 분석 중...`);

    const diversity = {
      channel_diversity_score: 0,
      content_type_diversity: 0,
      duration_diversity: 0,
      upload_time_diversity: 0,
      overall_diversity_score: 0
    };

    if (videos.length === 0) return diversity;

    // 채널 다양성
    const uniqueChannels = new Set(videos.map(v => v.snippet?.channelId)).size;
    diversity.channel_diversity_score = Math.min((uniqueChannels / videos.length) * 100, 100);

    // 콘텐츠 타입 다양성 (제목 기반 추정)
    const contentTypes = this.categorizeVideosByTitle(videos);
    const typeCount = Object.keys(contentTypes).length;
    diversity.content_type_diversity = Math.min((typeCount / 8) * 100, 100); // 최대 8개 카테고리

    // 길이 다양성
    const durations = videos.map(v => this.parseDuration(v.contentDetails?.duration)).filter(d => d > 0);
    if (durations.length > 0) {
      const durationVariance = this.calculateVariance(durations);
      diversity.duration_diversity = Math.min(durationVariance * 2, 100);
    }

    // 업로드 시간 다양성
    const uploadDates = videos.map(v => new Date(v.snippet?.publishedAt).getTime());
    if (uploadDates.length > 0) {
      const timeVariance = this.calculateVariance(uploadDates) / (1000 * 60 * 60 * 24); // 일 단위
      diversity.upload_time_diversity = Math.min(timeVariance / 30 * 100, 100); // 30일 기준
    }

    // 종합 다양성 점수
    diversity.overall_diversity_score = (
      diversity.channel_diversity_score * 0.3 +
      diversity.content_type_diversity * 0.3 +
      diversity.duration_diversity * 0.2 +
      diversity.upload_time_diversity * 0.2
    );

    console.log(`✅ 다양성 분석 완료: 종합 ${diversity.overall_diversity_score.toFixed(1)}/100`);

    return diversity;
  }

  /**
   * 🎯 쿼리 관련성 분석
   */
  async analyzeRelevance(videos, originalQuery) {
    console.log(`🎯 관련성 분석 중... (쿼리: "${originalQuery}")`);

    const relevance = {
      title_match_rate: 0,
      description_match_rate: 0,
      tag_match_rate: 0,
      overall_relevance_score: 0,
      high_relevance_count: 0,
      low_relevance_count: 0
    };

    if (videos.length === 0 || !originalQuery) return relevance;

    const queryKeywords = originalQuery.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    
    videos.forEach(video => {
      const title = (video.snippet?.title || '').toLowerCase();
      const description = (video.snippet?.description || '').toLowerCase();
      const tags = (video.snippet?.tags || []).join(' ').toLowerCase();

      // 제목 매칭
      const titleMatches = queryKeywords.filter(keyword => title.includes(keyword)).length;
      const titleMatchRate = titleMatches / queryKeywords.length;

      // 설명 매칭
      const descMatches = queryKeywords.filter(keyword => description.includes(keyword)).length;
      const descMatchRate = descMatches / queryKeywords.length;

      // 태그 매칭
      const tagMatches = queryKeywords.filter(keyword => tags.includes(keyword)).length;
      const tagMatchRate = tagMatches / queryKeywords.length;

      // 전체 관련성 점수
      const videoRelevance = (titleMatchRate * 0.6 + descMatchRate * 0.2 + tagMatchRate * 0.2) * 100;

      if (videoRelevance >= 60) {
        relevance.high_relevance_count++;
      } else if (videoRelevance < 30) {
        relevance.low_relevance_count++;
      }

      relevance.title_match_rate += titleMatchRate;
      relevance.description_match_rate += descMatchRate;
      relevance.tag_match_rate += tagMatchRate;
    });

    // 평균 계산
    const videoCount = videos.length;
    relevance.title_match_rate = (relevance.title_match_rate / videoCount) * 100;
    relevance.description_match_rate = (relevance.description_match_rate / videoCount) * 100;
    relevance.tag_match_rate = (relevance.tag_match_rate / videoCount) * 100;

    relevance.overall_relevance_score = (
      relevance.title_match_rate * 0.6 +
      relevance.description_match_rate * 0.2 +
      relevance.tag_match_rate * 0.2
    );

    console.log(`✅ 관련성 분석 완료: ${relevance.overall_relevance_score.toFixed(1)}/100 (고관련성: ${relevance.high_relevance_count}개)`);

    return relevance;
  }

  /**
   * 🧠 LLM 기반 심층 분석
   */
  async performLLMAnalysis(videos, originalQuery, userIntent) {
    const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    
    if (!claudeApiKey) {
      console.log('⚠️ Claude API 키 없음 - LLM 분석 건너뜀');
      return null;
    }

    try {
      this.stats.claudeApiCalls++;

      // 분석용 샘플 영상 (상위 10개)
      const sampleVideos = videos.slice(0, 10).map(video => ({
        title: video.snippet?.title,
        description: video.snippet?.description?.substring(0, 200),
        viewCount: video.statistics?.viewCount,
        likeCount: video.statistics?.likeCount,
        duration: video.contentDetails?.duration,
        channelTitle: video.snippet?.channelTitle
      }));

      const prompt = `
다음 YouTube Shorts 검색 결과를 전문적으로 분석해주세요:

원본 검색어: "${originalQuery}"
사용자 의도: ${userIntent || '명시되지 않음'}

검색 결과 샘플 (상위 10개):
${JSON.stringify(sampleVideos, null, 2)}

다음 기준으로 분석해주세요:
1. 콘텐츠 품질 평가 (제목, 조회수, 참여도 기준)
2. 검색어와의 관련성 및 적합성
3. YouTube Shorts에 적합한 콘텐츠인지 평가
4. 다양성 및 독창성 평가
5. 트렌드 부합성
6. 잠재적 문제점 식별

JSON 형식으로 응답:
{
  "content_quality_assessment": {
    "overall_rating": "excellent/good/fair/poor",
    "strengths": ["강점1", "강점2"],
    "weaknesses": ["약점1", "약점2"]
  },
  "relevance_assessment": {
    "query_match_quality": "high/medium/low",
    "intent_alignment": "well_aligned/partially_aligned/misaligned",
    "off_topic_count": 3
  },
  "shorts_suitability": {
    "format_compatibility": "excellent/good/fair/poor",
    "engagement_potential": "high/medium/low",
    "mobile_optimization": "optimized/partial/poor"
  },
  "diversity_evaluation": {
    "content_variety": "high/medium/low",
    "creator_diversity": "high/medium/low",
    "perspective_range": "wide/moderate/narrow"
  },
  "trend_analysis": {
    "trend_alignment": "highly_trending/moderately_trending/not_trending",
    "viral_potential": "high/medium/low",
    "seasonality": "seasonal/evergreen/outdated"
  },
  "recommendations": [
    "구체적인 개선 방안1",
    "구체적인 개선 방안2"
  ],
  "overall_score": 85,
  "summary": "전체적인 평가 요약"
}
`;

      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }, {
        headers: {
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const analysis = this.parseClaudeResponse(response.data);
      console.log(`🧠 LLM 심층 분석 완료: ${analysis.overall_score || 'N/A'}/100`);
      
      return analysis;

    } catch (error) {
      console.error('❌ LLM 심층 분석 실패:', error.message);
      return null;
    }
  }

  /**
   * 💡 개선 방안 생성
   */
  async generateImprovements(analysisResult, originalQuery, userIntent) {
    console.log(`💡 개선 방안 생성 중...`);

    const improvements = [];

    // 품질 기반 개선 방안
    if (analysisResult.quality_metrics.playable_videos < analysisResult.quality_metrics.total_videos * 0.8) {
      improvements.push({
        type: 'filtering',
        priority: 'high',
        suggestion: '재생 불가능한 영상이 많습니다. 필터링 로직을 강화하세요.',
        action: 'videos.list API로 embeddable 상태를 사전 확인'
      });
    }

    // 다양성 기반 개선 방안
    if (analysisResult.diversity_analysis?.channel_diversity_score < 50) {
      improvements.push({
        type: 'diversity',
        priority: 'medium',
        suggestion: '채널 다양성이 부족합니다. 검색 전략을 다양화하세요.',
        action: '서로 다른 검색어나 정렬 기준을 활용'
      });
    }

    // 관련성 기반 개선 방안
    if (analysisResult.relevance_analysis?.overall_relevance_score < 60) {
      improvements.push({
        type: 'relevance',
        priority: 'high',
        suggestion: '검색 관련성이 낮습니다. 키워드를 정교화하세요.',
        action: 'LLM을 활용한 쿼리 최적화 또는 동의어 확장'
      });
    }

    // LLM 분석 기반 개선 방안
    if (analysisResult.llm_analysis?.recommendations) {
      analysisResult.llm_analysis.recommendations.forEach(rec => {
        improvements.push({
          type: 'llm_suggestion',
          priority: 'medium',
          suggestion: rec,
          action: 'LLM 권장사항 적용'
        });
      });
    }

    // 기본 개선 방안 (항상 포함)
    improvements.push({
      type: 'optimization',
      priority: 'low',
      suggestion: 'API 할당량 최적화를 위해 캐싱을 활용하세요.',
      action: '인기 검색어는 4시간 캐싱, 트렌드 키워드는 2시간 캐싱'
    });

    console.log(`✅ ${improvements.length}개 개선 방안 생성 완료`);

    return improvements;
  }

  /**
   * 🔧 유틸리티 메서드들
   */

  // 종합 점수 계산
  calculateOverallScore(analysisResult) {
    const weights = {
      quality: 0.3,
      diversity: 0.25,
      relevance: 0.25,
      llm: 0.2
    };

    let totalScore = 0;
    let totalWeight = 0;

    // 품질 점수
    if (analysisResult.quality_metrics) {
      const qualityScore = this.calculateQualityScore(analysisResult.quality_metrics);
      totalScore += qualityScore * weights.quality;
      totalWeight += weights.quality;
    }

    // 다양성 점수
    if (analysisResult.diversity_analysis?.overall_diversity_score) {
      totalScore += analysisResult.diversity_analysis.overall_diversity_score * weights.diversity;
      totalWeight += weights.diversity;
    }

    // 관련성 점수
    if (analysisResult.relevance_analysis?.overall_relevance_score) {
      totalScore += analysisResult.relevance_analysis.overall_relevance_score * weights.relevance;
      totalWeight += weights.relevance;
    }

    // LLM 점수
    if (analysisResult.llm_analysis?.overall_score) {
      totalScore += analysisResult.llm_analysis.overall_score * weights.llm;
      totalWeight += weights.llm;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  // 품질 점수 계산
  calculateQualityScore(metrics) {
    const playableRatio = metrics.playable_videos / Math.max(metrics.total_videos, 1);
    const highQualityRatio = metrics.quality_distribution.high / Math.max(metrics.total_videos, 1);
    const recentRatio = (metrics.upload_recency.within_week + metrics.upload_recency.within_month) / Math.max(metrics.total_videos, 1);

    return (playableRatio * 40 + highQualityRatio * 35 + recentRatio * 25) * 100;
  }

  // 영상 품질 평가
  assessVideoQuality(video) {
    const viewCount = parseInt(video.statistics?.viewCount || 0);
    const likeCount = parseInt(video.statistics?.likeCount || 0);
    const duration = this.parseDuration(video.contentDetails?.duration);

    let score = 0;

    // 조회수 점수 (0-30점)
    if (viewCount > 1000000) score += 30;
    else if (viewCount > 100000) score += 25;
    else if (viewCount > 10000) score += 20;
    else if (viewCount > 1000) score += 15;
    else score += 10;

    // 좋아요 점수 (0-25점)
    const engagementRate = this.calculateEngagementRate(video);
    if (engagementRate > 5) score += 25;
    else if (engagementRate > 3) score += 20;
    else if (engagementRate > 1) score += 15;
    else score += 10;

    // 길이 적합성 (0-20점)
    if (duration > 5 && duration <= 60) score += 20;
    else if (duration <= 90) score += 15;
    else score += 10;

    // 최신성 (0-25점)
    const publishDate = new Date(video.snippet?.publishedAt);
    const daysAgo = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo <= 7) score += 25;
    else if (daysAgo <= 30) score += 20;
    else if (daysAgo <= 90) score += 15;
    else score += 10;

    return score;
  }

  // 참여도 계산
  calculateEngagementRate(video) {
    const viewCount = parseInt(video.statistics?.viewCount || 0);
    const likeCount = parseInt(video.statistics?.likeCount || 0);
    const commentCount = parseInt(video.statistics?.commentCount || 0);

    if (viewCount === 0) return 0;
    return ((likeCount + commentCount) / viewCount) * 100;
  }

  // 영상 길이 파싱 (ISO 8601)
  parseDuration(duration) {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
  }

  // 제목 기반 콘텐츠 분류
  categorizeVideosByTitle(videos) {
    const categories = {};
    const keywords = {
      music: ['음악', '노래', '뮤직', 'music', 'song'],
      dance: ['댄스', '춤', 'dance', '안무'],
      cooking: ['요리', '음식', '먹방', 'cooking', 'food'],
      gaming: ['게임', '게이밍', 'game', 'gaming'],
      beauty: ['메이크업', '뷰티', 'makeup', 'beauty'],
      fitness: ['운동', '헬스', '피트니스', 'workout', 'fitness'],
      travel: ['여행', 'travel', '여행지'],
      comedy: ['웃긴', '재미있는', 'funny', 'comedy']
    };

    videos.forEach(video => {
      const title = (video.snippet?.title || '').toLowerCase();
      
      for (const [category, keywordList] of Object.entries(keywords)) {
        if (keywordList.some(keyword => title.includes(keyword))) {
          categories[category] = (categories[category] || 0) + 1;
        }
      }
    });

    return categories;
  }

  // 분산 계산
  calculateVariance(numbers) {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    
    return Math.sqrt(variance);
  }

  // 기본 분석 생성 (폴백)
  generateBasicAnalysis(videos) {
    return {
      total_videos: videos.length,
      basic_quality_score: videos.length > 0 ? 50 : 0,
      message: '기본 분석: 상세 분석을 위해서는 LLM API 키가 필요합니다.'
    };
  }

  // Claude 응답 파싱
  parseClaudeResponse(response) {
    try {
      const content = response.content?.[0]?.text || '';
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || [null, content];
      return jsonMatch[1] ? JSON.parse(jsonMatch[1]) : JSON.parse(content);
    } catch (error) {
      console.error('Claude 응답 파싱 실패:', error.message);
      return {};
    }
  }

  /**
   * 📊 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      success_rate: this.stats.totalAnalyses > 0 
        ? (this.stats.successfulAnalyses / this.stats.totalAnalyses * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

// 전역 인스턴스
const resultAnalyzer = new ResultAnalyzer();

// 주요 함수 익스포트
export async function analyzeSearchResults(options) {
  return await resultAnalyzer.analyzeSearchResults(options);
}

export function getResultAnalyzerStats() {
  return resultAnalyzer.getStats();
}

export default resultAnalyzer; 