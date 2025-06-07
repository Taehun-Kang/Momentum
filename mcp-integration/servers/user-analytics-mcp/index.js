#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * User Analytics MCP Server
 * 사용자 분석, 검색 패턴, 인기 키워드 추출을 위한 MCP 서버
 * Wave Team
 */
class UserAnalyticsMCP {
  constructor() {
    this.server = new Server(
      {
        name: "user-analytics",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Supabase 클라이언트 초기화
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // 캐시 설정
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10분 캐시

    console.log('📊 User Analytics MCP Server 초기화 완료');
    
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Tools 리스트 정의
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_popular_keywords",
            description: "인기 검색어를 추출하고 트렌드 점수를 계산합니다",
            inputSchema: {
              type: "object",
              properties: {
                timeRange: {
                  type: "string",
                  enum: ["1h", "6h", "24h", "7d", "30d"],
                  description: "분석 시간 범위",
                  default: "24h"
                },
                limit: {
                  type: "number",
                  description: "반환할 키워드 수",
                  default: 20
                },
                userTier: {
                  type: "string",
                  enum: ["all", "free", "premium"],
                  description: "사용자 티어 필터",
                  default: "all"
                },
                excludeCommon: {
                  type: "boolean",
                  description: "일반적인 키워드 제외 여부",
                  default: true
                },
                category: {
                  type: "string",
                  description: "특정 카테고리로 필터링 (선택사항)"
                }
              }
            }
          },
          {
            name: "analyze_user_patterns",
            description: "특정 사용자의 검색 패턴을 분석합니다",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "분석할 사용자 ID"
                },
                timeRange: {
                  type: "string",
                  enum: ["7d", "30d", "90d"],
                  description: "분석 기간",
                  default: "30d"
                },
                includeRecommendations: {
                  type: "boolean",
                  description: "개인화 추천 포함 여부",
                  default: true
                }
              },
              required: ["userId"]
            }
          },
          {
            name: "get_realtime_trends",
            description: "실시간 검색 트렌드를 분석합니다 (최근 1-6시간)",
            inputSchema: {
              type: "object",
              properties: {
                timeWindow: {
                  type: "number",
                  description: "분석 시간 윈도우 (시간)",
                  default: 1
                },
                detectSurging: {
                  type: "boolean",
                  description: "급상승 키워드 탐지 여부",
                  default: true
                },
                groupByTimeSlots: {
                  type: "boolean",
                  description: "시간대별 그룹화 여부",
                  default: true
                }
              }
            }
          },
          {
            name: "log_search_activity",
            description: "검색 활동을 기록합니다",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "사용자 ID (null 가능)"
                },
                searchQuery: {
                  type: "string",
                  description: "검색 쿼리"
                },
                metadata: {
                  type: "object",
                  properties: {
                    searchType: {
                      type: "string",
                      description: "검색 유형 (basic, smart, ai 등)"
                    },
                    resultsCount: {
                      type: "number",
                      description: "결과 수"
                    },
                    responseTime: {
                      type: "number",
                      description: "응답 시간 (ms)"
                    },
                    userTier: {
                      type: "string",
                      description: "사용자 티어"
                    },
                    ipAddress: {
                      type: "string",
                      description: "IP 주소"
                    },
                    userAgent: {
                      type: "string",
                      description: "User Agent"
                    }
                  }
                }
              },
              required: ["searchQuery"]
            }
          },
          {
            name: "get_category_trends",
            description: "카테고리별 검색 트렌드를 분석합니다",
            inputSchema: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "분석할 카테고리 목록 (빈 배열시 전체)"
                },
                timeRange: {
                  type: "string",
                  enum: ["6h", "24h", "7d", "30d"],
                  description: "분석 시간 범위",
                  default: "24h"
                },
                includeGrowthRate: {
                  type: "boolean",
                  description: "성장률 계산 포함 여부",
                  default: true
                }
              }
            }
          },
          {
            name: "predict_trending_keywords",
            description: "향후 트렌딩할 가능성이 높은 키워드를 예측합니다",
            inputSchema: {
              type: "object",
              properties: {
                predictionWindow: {
                  type: "string",
                  enum: ["1h", "6h", "24h"],
                  description: "예측 시간 윈도우",
                  default: "6h"
                },
                limit: {
                  type: "number",
                  description: "예측 키워드 수",
                  default: 10
                },
                confidenceThreshold: {
                  type: "number",
                  description: "신뢰도 임계값 (0-1)",
                  default: 0.7
                },
                includeReasons: {
                  type: "boolean",
                  description: "예측 근거 포함 여부",
                  default: true
                }
              }
            }
          }
        ]
      };
    });

    // Tool 실행 핸들러
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_popular_keywords":
            return await this.getPopularKeywords(args);
          
          case "analyze_user_patterns":
            return await this.analyzeUserPatterns(args);
          
          case "get_realtime_trends":
            return await this.getRealtimeTrends(args);
          
          case "log_search_activity":
            return await this.logSearchActivity(args);
          
          case "get_category_trends":
            return await this.getCategoryTrends(args);
          
          case "predict_trending_keywords":
            return await this.predictTrendingKeywords(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`Tool ${name} 실행 오류:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  /**
   * 인기 검색어 추출 도구
   */
  async getPopularKeywords(args) {
    const {
      timeRange = '24h',
      limit = 20,
      userTier = 'all',
      excludeCommon = true,
      category
    } = args;

    const cacheKey = `popular_${timeRange}_${userTier}_${limit}_${category || 'all'}`;
    
    // 캐시 확인
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...cached.data,
                fromCache: true
              }, null, 2)
            }
          ]
        };
      }
    }

    try {
      // 시간 필터 설정
      const timeFilter = this.getTimeFilter(timeRange);
      
      // 기본 쿼리 구성
      let query = this.supabase
        .from('search_logs')
        .select('search_query, user_tier, created_at')
        .gte('created_at', timeFilter)
        .not('search_query', 'is', null)
        .not('search_query', 'eq', '');

      // 사용자 티어 필터링
      if (userTier !== 'all') {
        query = query.eq('user_tier', userTier);
      }

      const { data: searchLogs, error } = await query;

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      console.log(`📊 ${searchLogs.length}개 검색 로그 분석 중...`);

      // 키워드 빈도 및 트렌드 점수 계산
      const keywordFrequency = this.calculateKeywordFrequency(searchLogs);
      const trendScores = this.calculateTrendScores(searchLogs, timeRange);
      
      // 최종 점수 계산 및 정렬
      const rankedKeywords = this.rankKeywords(keywordFrequency, trendScores);
      
      // 일반적인 키워드 필터링
      let filteredKeywords = excludeCommon ? 
        this.filterCommonKeywords(rankedKeywords) : rankedKeywords;
      
      // 카테고리 필터링
      if (category) {
        filteredKeywords = filteredKeywords.filter(item => 
          this.categorizeKeyword(item.keyword) === category
        );
      }
      
      // 상위 키워드 선택 및 메타데이터 추가
      const topKeywords = filteredKeywords.slice(0, limit);
      const enrichedKeywords = this.enrichKeywordData(topKeywords, timeRange);

      const result = {
        timeRange,
        userTier,
        category: category || 'all',
        keywords: enrichedKeywords,
        totalAnalyzed: searchLogs.length,
        totalUniqueKeywords: Object.keys(keywordFrequency).length,
        filteringApplied: {
          excludeCommon,
          categoryFilter: !!category
        },
        timestamp: new Date().toISOString()
      };

      // 캐시 저장
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('인기 검색어 추출 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "인기 검색어 추출 실패",
              message: error.message,
              fallback: this.getFallbackPopularKeywords()
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * 사용자 패턴 분석 도구
   */
  async analyzeUserPatterns(args) {
    const { userId, timeRange = '30d', includeRecommendations = true } = args;

    try {
      // 시간 범위 설정
      const daysAgo = this.getDaysFromTimeRange(timeRange);
      const timeFilter = new Date();
      timeFilter.setDate(timeFilter.getDate() - daysAgo);

      const { data: userLogs, error } = await this.supabase
        .from('search_logs')
        .select('search_query, search_type, results_count, created_at')
        .eq('user_id', userId)
        .gte('created_at', timeFilter.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`User logs query failed: ${error.message}`);
      }

      const patterns = this.analyzePatterns(userLogs);
      
      // 추천 생성
      let recommendations = [];
      if (includeRecommendations && userLogs.length > 0) {
        recommendations = await this.generatePersonalizedRecommendations(patterns);
      }

      const result = {
        userId,
        timeRange,
        analysisDate: new Date().toISOString(),
        patterns: {
          totalSearches: userLogs.length,
          avgSearchesPerDay: Math.round((userLogs.length / daysAgo) * 10) / 10,
          favoriteCategories: this.extractFavoriteCategories(userLogs),
          searchTimes: this.analyzeSearchTimes(userLogs),
          searchTypes: this.analyzeSearchTypes(userLogs),
          recentKeywords: userLogs.slice(0, 10).map(log => log.search_query),
          peakSearchHours: this.identifyPeakSearchHours(userLogs),
          categoryEvolution: this.analyzeCategoryEvolution(userLogs),
          searchComplexity: this.analyzeSearchComplexity(userLogs)
        },
        insights: {
          mostActiveDay: this.findMostActiveDay(userLogs),
          preferredSearchType: this.findPreferredSearchType(userLogs),
          diversityScore: this.calculateDiversityScore(userLogs),
          loyaltyScore: this.calculateLoyaltyScore(userLogs)
        },
        recommendations: recommendations
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('사용자 패턴 분석 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "사용자 패턴 분석 실패",
              message: error.message,
              userId,
              fallback: this.getDefaultUserPattern()
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * 실시간 트렌드 분석 도구
   */
  async getRealtimeTrends(args) {
    const { timeWindow = 1, detectSurging = true, groupByTimeSlots = true } = args;

    try {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - timeWindow);

      const { data: recentLogs, error } = await this.supabase
        .from('search_logs')
        .select('search_query, created_at')
        .gte('created_at', hoursAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Realtime trends query failed: ${error.message}`);
      }

      let timeSlots = [];
      let surgingKeywords = [];

      if (groupByTimeSlots) {
        // 10분 단위로 그룹화
        timeSlots = this.groupByTimeSlots(recentLogs, 10);
      }

      if (detectSurging) {
        // 급상승 키워드 탐지
        surgingKeywords = this.detectSurgingKeywords(recentLogs, timeWindow);
      }

      // 최근 키워드 빈도 분석
      const keywordFrequency = this.calculateKeywordFrequency(recentLogs);
      const topRecentKeywords = Object.entries(keywordFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }));

      const result = {
        timeWindow: `${timeWindow}h`,
        totalSearches: recentLogs.length,
        searchesPerHour: Math.round(recentLogs.length / timeWindow),
        topKeywords: topRecentKeywords,
        timeSlots: groupByTimeSlots ? timeSlots : null,
        surgingKeywords: detectSurging ? surgingKeywords : null,
        trendingCategories: this.identifyTrendingCategories(recentLogs),
        activityLevel: this.calculateActivityLevel(recentLogs.length, timeWindow),
        lastUpdate: new Date().toISOString()
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('실시간 트렌드 분석 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "실시간 트렌드 분석 실패",
              message: error.message,
              fallback: {
                totalSearches: 0,
                timeSlots: [],
                surgingKeywords: []
              }
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * 검색 활동 로깅 도구
   */
  async logSearchActivity(args) {
    const { userId, searchQuery, metadata = {} } = args;

    try {
      const searchLog = {
        user_id: userId || null,
        search_query: searchQuery,
        search_type: metadata.searchType || 'basic',
        results_count: metadata.resultsCount || 0,
        response_time: metadata.responseTime || 0,
        user_tier: metadata.userTier || 'free',
        ip_address: metadata.ipAddress || '0.0.0.0',
        user_agent: metadata.userAgent || '',
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('search_logs')
        .insert([searchLog]);

      if (error) {
        throw new Error(`Log insertion failed: ${error.message}`);
      }

      // 캐시 무효화
      this.invalidateRelatedCaches(searchQuery);

      const result = {
        success: true,
        message: '검색 활동이 기록되었습니다',
        logData: {
          searchQuery,
          userId: userId || 'anonymous',
          searchType: searchLog.search_type,
          timestamp: searchLog.created_at
        }
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('검색 활동 로깅 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "검색 활동 로깅 실패",
              message: error.message,
              searchQuery
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * 카테고리별 트렌드 분석 도구
   */
  async getCategoryTrends(args) {
    const { categories = [], timeRange = '24h', includeGrowthRate = true } = args;

    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const { data: searchLogs, error } = await this.supabase
        .from('search_logs')
        .select('search_query, created_at')
        .gte('created_at', timeFilter)
        .not('search_query', 'is', null);

      if (error) {
        throw new Error(`Category trends query failed: ${error.message}`);
      }

      // 각 검색어를 카테고리별로 분류
      const categoryData = this.categorizeLogs(searchLogs);
      
      // 특정 카테고리만 필터링 (요청된 경우)
      const targetCategories = categories.length > 0 ? categories : Object.keys(categoryData);
      
      const categoryTrends = {};
      
      for (const category of targetCategories) {
        if (categoryData[category]) {
          const categoryLogs = categoryData[category];
          
          categoryTrends[category] = {
            totalSearches: categoryLogs.length,
            uniqueKeywords: new Set(categoryLogs.map(log => log.search_query)).size,
            topKeywords: this.getTopKeywordsInCategory(categoryLogs),
            searchVolume: this.calculateSearchVolume(categoryLogs, timeRange),
            growthRate: includeGrowthRate ? await this.calculateCategoryGrowthRate(category, timeRange) : null,
            peakHours: this.identifyPeakHours(categoryLogs),
            averageSearchLength: this.calculateAverageSearchLength(categoryLogs)
          };
        }
      }

      // 카테고리별 상대적 인기도 계산
      const totalSearches = Object.values(categoryTrends).reduce((sum, data) => sum + data.totalSearches, 0);
      
      Object.keys(categoryTrends).forEach(category => {
        categoryTrends[category].marketShare = totalSearches > 0 ? 
          Math.round((categoryTrends[category].totalSearches / totalSearches) * 100) : 0;
      });

      const result = {
        timeRange,
        categoriesAnalyzed: targetCategories,
        totalSearches,
        categoryTrends,
        topCategories: Object.entries(categoryTrends)
          .sort(([,a], [,b]) => b.totalSearches - a.totalSearches)
          .slice(0, 5)
          .map(([category, data]) => ({ category, searches: data.totalSearches })),
        timestamp: new Date().toISOString()
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('카테고리별 트렌드 분석 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "카테고리별 트렌드 분석 실패",
              message: error.message,
              fallback: { categoryTrends: {} }
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * 트렌딩 키워드 예측 도구
   */
  async predictTrendingKeywords(args) {
    const { 
      predictionWindow = '6h', 
      limit = 10, 
      confidenceThreshold = 0.7,
      includeReasons = true 
    } = args;

    try {
      // 예측을 위한 다양한 시간 범위 데이터 수집
      const currentHour = this.getTimeFilter('1h');
      const lastSixHours = this.getTimeFilter('6h');
      const lastDay = this.getTimeFilter('24h');

      const [currentData, sixHourData, dayData] = await Promise.all([
        this.getSearchData(currentHour),
        this.getSearchData(lastSixHours),
        this.getSearchData(lastDay)
      ]);

      // 키워드별 성장률 계산
      const keywordGrowthRates = this.calculateKeywordGrowthRates(currentData, sixHourData, dayData);
      
      // 예측 알고리즘 적용
      const predictions = this.generatePredictions(keywordGrowthRates, predictionWindow);
      
      // 신뢰도 필터링
      const filteredPredictions = predictions.filter(p => p.confidence >= confidenceThreshold);
      
      // 상위 예측 키워드 선택
      const topPredictions = filteredPredictions
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);

      const result = {
        predictionWindow,
        confidenceThreshold,
        totalPredictions: predictions.length,
        qualifiedPredictions: filteredPredictions.length,
        predictions: topPredictions.map(p => ({
          keyword: p.keyword,
          trendingScore: Math.round(p.trendingScore * 100) / 100,
          confidence: Math.round(p.confidence * 100) / 100,
          category: this.categorizeKeyword(p.keyword),
          growthRate: p.growthRate,
          currentSearchVolume: p.currentVolume,
          predictedSearchVolume: p.predictedVolume,
          reasons: includeReasons ? p.reasons : undefined
        })),
        algorithm: {
          name: "Momentum Trend Prediction v1.0",
          factors: ["growth_rate", "search_volume", "category_momentum", "time_patterns"],
          dataPoints: currentData.length + sixHourData.length + dayData.length
        },
        timestamp: new Date().toISOString()
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('트렌딩 키워드 예측 실패:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "트렌딩 키워드 예측 실패",
              message: error.message,
              fallback: {
                predictions: [],
                algorithm: "fallback"
              }
            }, null, 2)
          }
        ]
      };
    }
  }

  // ==================== 헬퍼 메서드들 ====================

  getTimeFilter(timeRange) {
    const now = new Date();
    
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '6h':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  getDaysFromTimeRange(timeRange) {
    switch (timeRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 30;
    }
  }

  calculateKeywordFrequency(searchLogs) {
    const frequency = new Map();
    
    searchLogs.forEach(log => {
      const keyword = log.search_query.toLowerCase().trim();
      if (keyword.length > 0) {
        frequency.set(keyword, (frequency.get(keyword) || 0) + 1);
      }
    });
    
    return Object.fromEntries(frequency);
  }

  calculateTrendScores(searchLogs, timeRange) {
    const scores = new Map();
    const now = Date.now();
    const timeWindow = this.getTimeWindowMs(timeRange);
    
    searchLogs.forEach(log => {
      const keyword = log.search_query.toLowerCase().trim();
      const logTime = new Date(log.created_at).getTime();
      const timeElapsed = now - logTime;
      
      // 최근일수록 높은 가중치
      const timeWeight = Math.exp(-timeElapsed / (timeWindow * 0.3));
      
      scores.set(keyword, (scores.get(keyword) || 0) + timeWeight);
    });
    
    return Object.fromEntries(scores);
  }

  getTimeWindowMs(timeRange) {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  rankKeywords(frequency, trendScores) {
    const keywords = new Set([...Object.keys(frequency), ...Object.keys(trendScores)]);
    
    return Array.from(keywords)
      .map(keyword => ({
        keyword,
        frequency: frequency[keyword] || 0,
        trendScore: trendScores[keyword] || 0,
        totalScore: (frequency[keyword] || 0) * 0.7 + (trendScores[keyword] || 0) * 0.3
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  filterCommonKeywords(rankedKeywords) {
    const commonKeywords = new Set([
      '영상', '비디오', '쇼츠', 'shorts', '유튜브', 'youtube',
      '검색', '찾기', '보기', '재생', '추천', '인기'
    ]);
    
    return rankedKeywords.filter(item => 
      !commonKeywords.has(item.keyword) && 
      item.keyword.length > 1 &&
      !/^[0-9]+$/.test(item.keyword)
    );
  }

  categorizeKeyword(keyword) {
    const categories = {
      gaming: ['게임', '롤', '배그', '피파', '포트나이트', '마인크래프트'],
      food: ['먹방', '요리', '맛집', '음식', '레시피', '카페'],
      music: ['음악', '노래', 'kpop', '댄스', 'mv', '뮤직'],
      lifestyle: ['브이로그', '일상', '루틴', '데이트', '여행'],
      sports: ['축구', '야구', '농구', '운동', '헬스', '다이어트'],
      entertainment: ['예능', '드라마', '영화', '웃긴', '재미']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(cat => keyword.includes(cat))) {
        return category;
      }
    }
    
    return 'general';
  }

  enrichKeywordData(topKeywords, timeRange) {
    return topKeywords.map((item, index) => ({
      rank: index + 1,
      keyword: item.keyword,
      searchCount: item.frequency,
      trendScore: Math.round(item.trendScore * 100) / 100,
      totalScore: Math.round(item.totalScore * 100) / 100,
      category: this.categorizeKeyword(item.keyword),
      estimatedPopularity: this.estimatePopularity(item.frequency, timeRange)
    }));
  }

  estimatePopularity(frequency, timeRange) {
    // 시간 범위별 기준 값
    const thresholds = {
      '1h': { high: 10, medium: 3 },
      '6h': { high: 30, medium: 10 },
      '24h': { high: 100, medium: 30 },
      '7d': { high: 500, medium: 150 },
      '30d': { high: 2000, medium: 600 }
    };

    const threshold = thresholds[timeRange] || thresholds['24h'];
    
    if (frequency >= threshold.high) return 'high';
    if (frequency >= threshold.medium) return 'medium';
    return 'low';
  }

  analyzePatterns(userLogs) {
    return {
      totalSearches: userLogs.length,
      favoriteCategories: this.extractFavoriteCategories(userLogs),
      searchTimes: this.analyzeSearchTimes(userLogs),
      searchTypes: this.analyzeSearchTypes(userLogs)
    };
  }

  extractFavoriteCategories(userLogs) {
    const categoryCount = {};
    
    userLogs.forEach(log => {
      const category = this.categorizeKeyword(log.search_query);
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));
  }

  analyzeSearchTimes(userLogs) {
    const hourCounts = {};
    
    userLogs.forEach(log => {
      const hour = new Date(log.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return hourCounts;
  }

  analyzeSearchTypes(userLogs) {
    const typeCounts = {};
    
    userLogs.forEach(log => {
      const type = log.search_type || 'basic';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    return typeCounts;
  }

  async generatePersonalizedRecommendations(patterns) {
    // 간단한 추천 로직
    const recommendations = [];
    
    // 선호 카테고리 기반 추천
    if (patterns.favoriteCategories.length > 0) {
      const topCategory = patterns.favoriteCategories[0].category;
      recommendations.push({
        type: 'category_based',
        suggestion: `${topCategory} 카테고리의 새로운 트렌드 탐색`,
        reason: `가장 많이 검색한 카테고리입니다`
      });
    }
    
    return recommendations;
  }

  getFallbackPopularKeywords() {
    return [
      { rank: 1, keyword: '먹방', category: 'food', estimatedPopularity: 'high' },
      { rank: 2, keyword: '브이로그', category: 'lifestyle', estimatedPopularity: 'high' },
      { rank: 3, keyword: '게임', category: 'gaming', estimatedPopularity: 'medium' }
    ];
  }

  getDefaultUserPattern() {
    return {
      totalSearches: 0,
      favoriteCategories: [],
      searchTimes: {},
      searchTypes: {}
    };
  }

  invalidateRelatedCaches(searchQuery) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes('popular') || key.includes('trends')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // 추가 분석 메서드들...
  groupByTimeSlots(logs, minuteWindow) {
    // 시간대별 그룹화 로직
    return [];
  }

  detectSurgingKeywords(logs, timeWindow) {
    // 급상승 키워드 탐지 로직
    return [];
  }

  identifyTrendingCategories(logs) {
    // 트렌딩 카테고리 식별 로직
    return {};
  }

  calculateActivityLevel(searchCount, timeWindow) {
    // 활동 수준 계산
    const searchesPerHour = searchCount / timeWindow;
    if (searchesPerHour > 100) return 'very_high';
    if (searchesPerHour > 50) return 'high';
    if (searchesPerHour > 20) return 'medium';
    if (searchesPerHour > 5) return 'low';
    return 'very_low';
  }

  async getSearchData(timeFilter) {
    const { data, error } = await this.supabase
      .from('search_logs')
      .select('search_query, created_at')
      .gte('created_at', timeFilter);
    
    return error ? [] : data;
  }

  calculateKeywordGrowthRates(current, sixHour, day) {
    // 성장률 계산 로직
    return {};
  }

  generatePredictions(growthRates, window) {
    // 예측 생성 로직
    return [];
  }

  // 더 많은 분석 메서드들...
  identifyPeakSearchHours(logs) { return []; }
  analyzeCategoryEvolution(logs) { return {}; }
  analyzeSearchComplexity(logs) { return 0; }
  findMostActiveDay(logs) { return null; }
  findPreferredSearchType(logs) { return null; }
  calculateDiversityScore(logs) { return 0; }
  calculateLoyaltyScore(logs) { return 0; }
  categorizeLogs(logs) { return {}; }
  getTopKeywordsInCategory(logs) { return []; }
  calculateSearchVolume(logs, range) { return 0; }
  async calculateCategoryGrowthRate(category, range) { return 0; }
  identifyPeakHours(logs) { return []; }
  calculateAverageSearchLength(logs) { return 0; }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🚀 User Analytics MCP 서버 시작됨');
  }
}

// 서버 시작
const server = new UserAnalyticsMCP();
server.start().catch(error => {
  console.error('서버 시작 실패:', error);
  process.exit(1);
}); 