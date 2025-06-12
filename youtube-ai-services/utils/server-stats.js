/**
 * 📊 서버 통계 및 모니터링 시스템 (2025년 버전)
 * 
 * 2025년 현재 기준으로 최적화된 성능 모니터링:
 * - AI/LLM API 사용량 추적
 * - 실시간 트렌드 분석 성능
 * - YouTube Shorts 필터링 효율성
 * - 메모리 및 CPU 사용량
 * - API 응답 시간 및 성공률
 */

import fs from 'fs/promises';
import path from 'path';

class ServerStatsManager {
  constructor() {
    this.startTime = new Date();
    this.apiUsage = {
      youtube: { total: 0, today: 0, quota: 10000 },
      claude: { total: 0, today: 0 },
      brightData: { total: 0, today: 0 }
    };
    this.cache = {
      hits: 0,
      misses: 0,
      entries: 0,
      memory_usage: 0
    };
    this.operationStats = {};
    this.errors = [];
    this.lastResetDate = new Date().toDateString();
  }

  /**
   * 📈 종합 서버 상태 조회
   */
  async getServerStatus() {
    try {
      const uptime = Date.now() - this.startTime.getTime();
      const memUsage = process.memoryUsage();

      // API 사용률 계산
      const youtubeUsagePercent = (this.apiUsage.youtube.today / this.apiUsage.youtube.quota * 100).toFixed(1);
      
      // 캐시 효율성
      const totalCacheRequests = this.cache.hits + this.cache.misses;
      const cacheHitRate = totalCacheRequests > 0 
        ? (this.cache.hits / totalCacheRequests * 100).toFixed(1) 
        : '0';

      // 성능 지표
      const performanceMetrics = this.calculatePerformanceMetrics();

      return {
        status: 'running',
        uptime: {
          milliseconds: uptime,
          human: this.formatUptime(uptime)
        },
        api_usage: {
          youtube: {
            today: this.apiUsage.youtube.today,
            quota: this.apiUsage.youtube.quota,
            usage_percent: youtubeUsagePercent + '%',
            remaining: this.apiUsage.youtube.quota - this.apiUsage.youtube.today,
            status: youtubeUsagePercent > 90 ? 'critical' : 
                   youtubeUsagePercent > 80 ? 'warning' : 'healthy'
          },
          claude: {
            today: this.apiUsage.claude.today,
            total: this.apiUsage.claude.total
          },
          bright_data: {
            today: this.apiUsage.brightData.today,
            total: this.apiUsage.brightData.total
          }
        },
        cache_performance: {
          hit_rate: cacheHitRate + '%',
          total_hits: this.cache.hits,
          total_misses: this.cache.misses,
          total_entries: this.cache.entries,
          memory_usage_mb: (this.cache.memory_usage / 1024 / 1024).toFixed(2),
          efficiency: cacheHitRate > 85 ? 'excellent' : 
                     cacheHitRate > 70 ? 'good' : 
                     cacheHitRate > 50 ? 'fair' : 'poor'
        },
        system_resources: {
          memory: {
            used_mb: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
            total_mb: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
            external_mb: (memUsage.external / 1024 / 1024).toFixed(2)
          },
          cpu_usage: await this.getCPUUsage()
        },
        performance_metrics: performanceMetrics,
        error_summary: {
          total_errors: this.errors.length,
          recent_errors: this.errors.slice(-5),
          error_rate: this.calculateErrorRate()
        },
        last_reset: this.lastResetDate,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 서버 상태 조회 실패:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🔍 캐시 상태 검색
   */
  async searchCacheStatus(searchQuery = '') {
    try {
      // 메모리 캐시 상태 (실제 구현에서는 Redis 등 사용)
      const cacheData = await this.getCacheEntries();
      
      let filteredEntries = cacheData;
      
      // 검색어가 있으면 필터링
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredEntries = cacheData.filter(entry => 
          entry.key.toLowerCase().includes(query) ||
          JSON.stringify(entry.value).toLowerCase().includes(query)
        );
      }

      return {
        search_query: searchQuery,
        total_entries: cacheData.length,
        filtered_entries: filteredEntries.length,
        cache_entries: filteredEntries.slice(0, 100), // 최대 100개
        cache_stats: {
          hit_rate: this.cache.hits > 0 ? 
            (this.cache.hits / (this.cache.hits + this.cache.misses) * 100).toFixed(1) + '%' : '0%',
          memory_usage: this.cache.memory_usage,
          oldest_entry: await this.getOldestCacheEntry(),
          newest_entry: await this.getNewestCacheEntry()
        },
        recommendations: this.getCacheRecommendations(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 캐시 검색 실패:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 📊 트렌드 데이터 종합 리포트
   */
  async getTrendDataReport(timeframe = '24h') {
    try {
      const trendSources = ['google', 'nate', 'zum', 'brightdata'];
      const report = {
        timeframe: timeframe,
        sources: {},
        combined_trends: [],
        quality_metrics: {},
        recommendations: []
      };

      // 각 소스별 트렌드 데이터 수집
      for (const source of trendSources) {
        try {
          const sourceData = await this.getTrendsBySource(source, timeframe);
          report.sources[source] = {
            total_keywords: sourceData.keywords?.length || 0,
            last_update: sourceData.lastUpdate,
            quality_score: sourceData.qualityScore || 0,
            sample_keywords: sourceData.keywords?.slice(0, 5) || []
          };
        } catch (sourceError) {
          report.sources[source] = {
            error: sourceError.message,
            status: 'failed'
          };
        }
      }

      // 통합 트렌드 생성
      report.combined_trends = await this.generateCombinedTrends(timeframe);

      // 품질 메트릭 계산
      report.quality_metrics = {
        data_freshness: this.calculateDataFreshness(report.sources),
        coverage_score: this.calculateCoverageScore(report.sources),
        reliability_score: this.calculateReliabilityScore(report.sources)
      };

      // 개선 제안
      report.recommendations = this.generateTrendRecommendations(report);

      return report;

    } catch (error) {
      console.error('❌ 트렌드 리포트 생성 실패:', error);
      return {
        error: error.message,
        timeframe: timeframe,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 💰 API 사용량 리포트
   */
  async getAPIUsageReport(period = 'today') {
    try {
      const report = {
        period: period,
        generated_at: new Date().toISOString(),
        api_services: {},
        cost_analysis: {},
        usage_patterns: {},
        optimization_suggestions: []
      };

      // YouTube API 분석
      report.api_services.youtube = {
        quota_used: this.apiUsage.youtube.today,
        quota_total: this.apiUsage.youtube.quota,
        usage_percentage: (this.apiUsage.youtube.today / this.apiUsage.youtube.quota * 100).toFixed(1),
        operations: await this.getYouTubeOperationBreakdown(),
        cost_estimate: this.calculateYouTubeCosts(),
        efficiency_score: this.calculateAPIEfficiency('youtube')
      };

      // Claude API 분석
      report.api_services.claude = {
        requests_today: this.apiUsage.claude.today,
        requests_total: this.apiUsage.claude.total,
        operations: await this.getClaudeOperationBreakdown(),
        cost_estimate: this.calculateClaudeCosts(),
        efficiency_score: this.calculateAPIEfficiency('claude')
      };

      // Bright Data 분석
      report.api_services.bright_data = {
        requests_today: this.apiUsage.brightData.today,
        requests_total: this.apiUsage.brightData.total,
        operations: await this.getBrightDataOperationBreakdown(),
        cost_estimate: this.calculateBrightDataCosts(),
        efficiency_score: this.calculateAPIEfficiency('brightData')
      };

      // 비용 분석
      report.cost_analysis = {
        total_daily_cost: this.calculateTotalDailyCost(),
        projected_monthly_cost: this.calculateProjectedMonthlyCost(),
        cost_breakdown: this.getCostBreakdown(),
        savings_opportunities: this.identifySavingsOpportunities()
      };

      // 사용 패턴 분석
      report.usage_patterns = {
        peak_hours: this.identifyPeakHours(),
        operation_frequency: this.getOperationFrequency(),
        error_patterns: this.analyzeErrorPatterns()
      };

      // 최적화 제안
      report.optimization_suggestions = this.generateOptimizationSuggestions(report);

      return report;

    } catch (error) {
      console.error('❌ API 사용량 리포트 생성 실패:', error);
      return {
        error: error.message,
        period: period,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 📈 작업 통계 추적
   */
  trackOperation(operationType, duration, success = true, details = {}) {
    try {
      if (!this.operationStats[operationType]) {
        this.operationStats[operationType] = {
          total: 0,
          successful: 0,
          failed: 0,
          totalDuration: 0,
          averageDuration: 0,
          lastExecuted: null
        };
      }

      const stats = this.operationStats[operationType];
      stats.total++;
      stats.totalDuration += duration;
      stats.averageDuration = stats.totalDuration / stats.total;
      stats.lastExecuted = new Date().toISOString();

      if (success) {
        stats.successful++;
      } else {
        stats.failed++;
        this.logError(operationType, details);
      }

      // 오늘 날짜가 바뀌었으면 일일 통계 리셋
      this.checkAndResetDailyStats();

    } catch (error) {
      console.error('❌ 작업 통계 추적 실패:', error);
    }
  }

  /**
   * 📊 API 사용량 추적
   */
  trackAPIUsage(service, operation, units = 1) {
    try {
      if (this.apiUsage[service]) {
        this.apiUsage[service].total += units;
        this.apiUsage[service].today += units;
      }

      // 작업별 세부 추적
      const operationKey = `${service}_${operation}`;
      this.trackOperation(operationKey, 0, true, { units });

      // 할당량 초과 경고
      if (service === 'youtube' && this.apiUsage.youtube.today > this.apiUsage.youtube.quota * 0.9) {
        console.warn('⚠️ YouTube API 할당량 90% 초과!', {
          used: this.apiUsage.youtube.today,
          quota: this.apiUsage.youtube.quota
        });
      }

    } catch (error) {
      console.error('❌ API 사용량 추적 실패:', error);
    }
  }

  /**
   * 💾 캐시 사용량 추적
   */
  trackCacheUsage(operation, hit = true, size = 0) {
    try {
      if (hit) {
        this.cache.hits++;
      } else {
        this.cache.misses++;
      }

      if (operation === 'set') {
        this.cache.entries++;
        this.cache.memory_usage += size;
      } else if (operation === 'delete') {
        this.cache.entries = Math.max(0, this.cache.entries - 1);
        this.cache.memory_usage = Math.max(0, this.cache.memory_usage - size);
      }

    } catch (error) {
      console.error('❌ 캐시 사용량 추적 실패:', error);
    }
  }

  /**
   * 🚨 에러 로깅
   */
  logError(operation, details) {
    try {
      const errorEntry = {
        timestamp: new Date().toISOString(),
        operation: operation,
        details: details,
        stack: new Error().stack
      };

      this.errors.push(errorEntry);

      // 최대 1000개 에러만 보관
      if (this.errors.length > 1000) {
        this.errors = this.errors.slice(-1000);
      }

    } catch (error) {
      console.error('❌ 에러 로깅 실패:', error);
    }
  }

  /**
   * 🔄 일일 통계 리셋
   */
  checkAndResetDailyStats() {
    const today = new Date().toDateString();
    
    if (this.lastResetDate !== today) {
      console.log('📅 일일 통계 리셋:', today);
      
      // API 사용량 리셋
      Object.keys(this.apiUsage).forEach(service => {
        this.apiUsage[service].today = 0;
      });

      // 캐시 통계 부분 리셋 (hits/misses만)
      this.cache.hits = 0;
      this.cache.misses = 0;

      this.lastResetDate = today;
    }
  }

  /**
   * 🔧 헬퍼 메서드들
   */

  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 ${hours % 24}시간 ${minutes % 60}분`;
    if (hours > 0) return `${hours}시간 ${minutes % 60}분`;
    if (minutes > 0) return `${minutes}분 ${seconds % 60}초`;
    return `${seconds}초`;
  }

  calculatePerformanceMetrics() {
    const totalOps = Object.values(this.operationStats).reduce((sum, stat) => sum + stat.total, 0);
    const successfulOps = Object.values(this.operationStats).reduce((sum, stat) => sum + stat.successful, 0);
    const avgDuration = Object.values(this.operationStats).reduce((sum, stat) => sum + stat.averageDuration, 0) / Object.keys(this.operationStats).length || 0;

    return {
      total_operations: totalOps,
      success_rate: totalOps > 0 ? (successfulOps / totalOps * 100).toFixed(1) + '%' : '0%',
      average_response_time: avgDuration.toFixed(2) + 'ms',
      operations_per_minute: this.calculateOpsPerMinute()
    };
  }

  calculateErrorRate() {
    const totalOps = Object.values(this.operationStats).reduce((sum, stat) => sum + stat.total, 0);
    return totalOps > 0 ? (this.errors.length / totalOps * 100).toFixed(2) + '%' : '0%';
  }

  calculateOpsPerMinute() {
    const uptimeMinutes = (Date.now() - this.startTime.getTime()) / (1000 * 60);
    const totalOps = Object.values(this.operationStats).reduce((sum, stat) => sum + stat.total, 0);
    return uptimeMinutes > 0 ? (totalOps / uptimeMinutes).toFixed(2) : '0';
  }

  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        resolve((totalUsage / 1000000 * 100).toFixed(2) + '%'); // 마이크로초를 퍼센트로
      }, 100);
    });
  }

  // 캐시 관련 헬퍼 메서드들 (실제 구현에서는 Redis 등과 연동)
  async getCacheEntries() {
    // 메모리 캐시 시뮬레이션
    return [
      { key: 'search:먹방', value: { results: [], cached_at: new Date() }, ttl: 3600 },
      { key: 'trends:google', value: { keywords: [], cached_at: new Date() }, ttl: 7200 }
    ];
  }

  async getOldestCacheEntry() {
    const entries = await this.getCacheEntries();
    return entries.length > 0 ? entries[0].key : null;
  }

  async getNewestCacheEntry() {
    const entries = await this.getCacheEntries();
    return entries.length > 0 ? entries[entries.length - 1].key : null;
  }

  getCacheRecommendations() {
    const hitRate = this.cache.hits / (this.cache.hits + this.cache.misses) * 100;
    const recommendations = [];

    if (hitRate < 70) {
      recommendations.push('캐시 적중률이 낮습니다. TTL을 늘리거나 캐시 키 전략을 개선하세요.');
    }

    if (this.cache.memory_usage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('캐시 메모리 사용량이 높습니다. 정리 정책을 검토하세요.');
    }

    return recommendations;
  }

  // API 관련 헬퍼 메서드들 (실제 구현에서는 DB 조회)
  async getTrendsBySource(source, timeframe) {
    // 시뮬레이션 데이터
    return {
      keywords: ['먹방', '브이로그', '챌린지'],
      lastUpdate: new Date().toISOString(),
      qualityScore: 85
    };
  }

  async generateCombinedTrends(timeframe) {
    return [
      { keyword: '먹방', score: 95, sources: ['google', 'nate'] },
      { keyword: '브이로그', score: 88, sources: ['zum', 'brightdata'] }
    ];
  }

  calculateDataFreshness(sources) {
    return 90; // 90% 신선도
  }

  calculateCoverageScore(sources) {
    const workingSources = Object.values(sources).filter(s => !s.error).length;
    return (workingSources / Object.keys(sources).length * 100).toFixed(1);
  }

  calculateReliabilityScore(sources) {
    return 85; // 85% 신뢰도
  }

  generateTrendRecommendations(report) {
    return [
      'Google Trends 데이터를 더 자주 업데이트하세요.',
      'Bright Data 연동을 통해 실시간성을 개선하세요.'
    ];
  }

  // API 비용 계산 메서드들
  async getYouTubeOperationBreakdown() {
    return {
      'search.list': 45,
      'videos.list': 23,
      'channels.list': 12
    };
  }

  async getClaudeOperationBreakdown() {
    return {
      'query_optimization': 15,
      'result_analysis': 12,
      'keyword_extraction': 8
    };
  }

  async getBrightDataOperationBreakdown() {
    return {
      'trend_scraping': 25,
      'keyword_expansion': 18
    };
  }

  calculateYouTubeCosts() {
    return (this.apiUsage.youtube.today / 10000 * 0).toFixed(2); // 무료 할당량
  }

  calculateClaudeCosts() {
    return (this.apiUsage.claude.today * 0.008).toFixed(2); // 예상 비용
  }

  calculateBrightDataCosts() {
    return (this.apiUsage.brightData.today * 0.001).toFixed(2); // 예상 비용
  }

  calculateAPIEfficiency(service) {
    const stats = this.operationStats[`${service}_total`];
    if (!stats) return 'N/A';
    
    const successRate = stats.successful / stats.total * 100;
    return successRate.toFixed(1) + '%';
  }

  calculateTotalDailyCost() {
    return (
      parseFloat(this.calculateYouTubeCosts()) +
      parseFloat(this.calculateClaudeCosts()) +
      parseFloat(this.calculateBrightDataCosts())
    ).toFixed(2);
  }

  calculateProjectedMonthlyCost() {
    return (parseFloat(this.calculateTotalDailyCost()) * 30).toFixed(2);
  }

  getCostBreakdown() {
    return {
      youtube: this.calculateYouTubeCosts(),
      claude: this.calculateClaudeCosts(),
      bright_data: this.calculateBrightDataCosts()
    };
  }

  identifySavingsOpportunities() {
    const opportunities = [];
    
    if (this.apiUsage.youtube.today > this.apiUsage.youtube.quota * 0.8) {
      opportunities.push('캐싱을 강화하여 YouTube API 사용량을 줄이세요.');
    }
    
    if (this.cache.hits / (this.cache.hits + this.cache.misses) < 0.8) {
      opportunities.push('캐시 효율성을 개선하여 API 호출을 줄이세요.');
    }

    return opportunities;
  }

  identifyPeakHours() {
    return ['09:00-11:00', '14:00-16:00', '19:00-21:00']; // 시뮬레이션
  }

  getOperationFrequency() {
    return Object.entries(this.operationStats)
      .map(([operation, stats]) => ({
        operation,
        frequency: stats.total,
        success_rate: (stats.successful / stats.total * 100).toFixed(1) + '%'
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  analyzeErrorPatterns() {
    const errorsByType = {};
    this.errors.forEach(error => {
      const type = error.operation;
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    return Object.entries(errorsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  generateOptimizationSuggestions(report) {
    const suggestions = [];

    // YouTube API 최적화
    if (report.api_services.youtube.usage_percentage > 80) {
      suggestions.push({
        priority: 'high',
        category: 'api_usage',
        suggestion: 'YouTube API 사용량이 높습니다. 캐싱 전략을 강화하세요.',
        impact: 'API 비용 20-30% 절감 예상'
      });
    }

    // 캐시 최적화
    const cacheHitRate = parseFloat(report.cache_performance?.hit_rate) || 0;
    if (cacheHitRate < 80) {
      suggestions.push({
        priority: 'medium',
        category: 'cache',
        suggestion: '캐시 적중률을 개선하여 성능을 향상시키세요.',
        impact: '응답 속도 15-25% 개선 예상'
      });
    }

    return suggestions;
  }
}

// 전역 인스턴스
const serverStats = new ServerStatsManager();

// 주요 함수 익스포트
export async function getServerStatus() {
  return await serverStats.getServerStatus();
}

export async function searchCacheStatus(query) {
  return await serverStats.searchCacheStatus(query);
}

export async function getTrendDataReport(timeframe) {
  return await serverStats.getTrendDataReport(timeframe);
}

export async function getAPIUsageReport(period) {
  return await serverStats.getAPIUsageReport(period);
}

export function trackOperation(operationType, duration, success, details) {
  return serverStats.trackOperation(operationType, duration, success, details);
}

export function trackAPIUsage(service, operation, units) {
  return serverStats.trackAPIUsage(service, operation, units);
}

export function trackCacheUsage(operation, hit, size) {
  return serverStats.trackCacheUsage(operation, hit, size);
}

export function logError(operation, details) {
  return serverStats.logError(operation, details);
}

export function getStatsManager() {
  return serverStats;
}

export default serverStats; 