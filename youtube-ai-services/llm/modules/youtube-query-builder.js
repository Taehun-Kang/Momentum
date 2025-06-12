/**
 * 🎯 YouTube Shorts 지능형 쿼리 빌더 (LLM 기반)
 * 하이브리드 키워드와 맥락을 분석하여 최적의 YouTube API 쿼리 생성
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../../../.env') });

class IntelligentYouTubeQueryBuilder {
  constructor() {
    this.anthropic = null;
    this.initializeAPI();
    
    this.stats = {
      totalQueries: 0,
      intelligentQueries: 0,
      fallbackQueries: 0,
      avgProcessingTime: 0
    };

    // 고정 파라미터 (고품질 영상 우선)
    this.fixedParams = {
      part: 'snippet',         // 기본 정보 포함
      videoDuration: 'short',  // 4분 미만 (Shorts)
      maxResults: 50,          // 최대 결과 수
      type: 'video',           // 비디오만
      regionCode: 'KR',        // 한국 지역
      relevanceLanguage: 'ko', // 한국어 관련성
      safeSearch: 'moderate',  // 균형잡힌 안전 검색
      videoEmbeddable: 'true', // 임베드 가능한 영상만
      videoLicense: 'any',     // 모든 라이선스 (YouTube, Creative Commons)
      videoSyndicated: 'true', // 외부 재생 보장 (필수)
      videoDefinition: 'high'  // HD 화질만 (고품질)
    };

    // 🚫 카테고리 매핑은 advanced-query-builder.js로 이동됨
  }

  initializeAPI() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      console.log('🤖 YouTube 쿼리 빌더 Claude API 초기화 완료');
    } else {
      console.warn('⚠️ ANTHROPIC_API_KEY 없음 - 기본 쿼리 생성만 가능');
    }
  }

  /**
   * 🎯 메인 함수: YouTube 쿼리 생성
   */
  async buildQueries(directSearchKeywords, options = {}) {
    const { 
      maxQueries = 3,
      originalInput = null
    } = options;

    console.log('🎯 YouTube 쿼리 생성 시작');
    console.log(`입력 키워드: [${directSearchKeywords?.join(', ') || 'none'}]`);

    const startTime = Date.now();

    try {
      const queries = [];

      if (!directSearchKeywords?.length) {
        throw new Error('직접 검색 키워드가 필요합니다');
      }

      // 1. 키워드 선택 (성능 최적화 모드)
      let selectedKeywords;
      
      // 🚀 성능 최적화: 4개 이하면 LLM 생략
      if (directSearchKeywords.length <= 4) {
        selectedKeywords = directSearchKeywords;
        console.log(`키워드 수 적음 - LLM 생략: [${selectedKeywords.join(', ')}]`);
      } else {
        // 많은 키워드일 때만 LLM으로 선택
        selectedKeywords = await this.selectBestKeywords(directSearchKeywords, 4, originalInput);
        console.log(`LLM 선택된 키워드: [${selectedKeywords.join(', ')}]`);
      }

      // 2. OR 연산 기본 쿼리 생성 (항상)
      const basicOrQuery = this.createDirectOrQuery(selectedKeywords);
      queries.push(basicOrQuery);
      console.log('✅ 기본 OR 쿼리 생성 완료');

      // 🚫 고급 쿼리 기능 주석처리 (성능 최적화)
      // const advancedAnalysis = await this.analyzeAdvancedQueryNeeds(originalInput, selectedKeywords);
      
      // if (advancedAnalysis.needsAdvanced && this.anthropic && maxQueries > 1) {
      //   console.log('🧠 고급 최적화 쿼리 생성 중...');
      //   console.log(`   필요 요소: ${advancedAnalysis.requiredElements.join(', ')}`);
      //   
      //   const advancedQueries = this.generateAdvancedQueries(selectedKeywords, advancedAnalysis, maxQueries - 1);
      //   queries.push(...advancedQueries);
      //   console.log(`✅ ${advancedQueries.length}개 고급 쿼리 추가`);
      // } else {
      //   console.log('📝 기본 쿼리만 사용 (고급 쿼리 불필요)');
      // }

      // ✅ 성능 최적화: 기본 OR 쿼리만 사용
      console.log('📝 기본 OR 쿼리만 사용 (고급 쿼리 비활성화)');
      const advancedAnalysis = {
        needsAdvanced: false,
        requiredElements: [],
        category: null,
        needsTimeFilter: false,
        timeFilter: null,
        preferredOrder: 'relevance',
        reasoning: '성능 최적화를 위해 기본 쿼리만 사용'
      };

      const processingTime = Date.now() - startTime;
      this.updateStats(queries.length, processingTime);

      console.log(`✅ 총 ${queries.length}개 쿼리 생성 완료 (${processingTime}ms)`);

      return {
        success: true,
        queries: queries,
        totalQueries: queries.length,
        estimatedApiCost: queries.length * 100,
        selectedKeywords: selectedKeywords,
        usedAdvancedQueries: advancedAnalysis.needsAdvanced,
        advancedAnalysis: advancedAnalysis,
        metadata: {
          inputKeywordCount: directSearchKeywords.length,
          selectedKeywordCount: selectedKeywords.length,
          advancedQueriesUsed: advancedAnalysis.needsAdvanced,
          processingTime,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ 쿼리 생성 실패:', error);
      return {
        success: false,
        error: error.message,
        fallbackQueries: this.generateFallbackQueries(directSearchKeywords)
      };
    }
  }

  /**
   * 🎯 LLM 최적 키워드 선택
   */
  async selectBestKeywords(keywords, maxCount = 4, originalInput = null) {
    if (keywords.length <= maxCount) {
      return keywords;
    }

    if (!this.anthropic) {
      return keywords.slice(0, maxCount);
    }

    const prompt = `사용자 의도를 고려하여 YouTube Shorts 검색에 가장 효과적인 ${maxCount}개 키워드를 선택해주세요.

사용자 원본 입력: "${originalInput || '입력 없음'}"
추출된 키워드 목록:
${keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}

선택 기준:
1. 사용자의 원본 의도를 가장 잘 반영하는 키워드들
2. 검색 결과의 다양성을 확보할 수 있는 키워드들
3. 서로 겹치지 않고 보완적인 키워드들  
4. YouTube Shorts에서 실제로 인기 있을 만한 키워드들
5. 너무 구체적이지도 너무 일반적이지도 않은 적절한 수준

JSON 배열로 선택된 키워드들만 응답:
["선택된키워드1", "선택된키워드2", "선택된키워드3", "선택된키워드4"]`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      
      if (jsonMatch) {
        const selected = JSON.parse(jsonMatch[0]);
        const validSelected = selected.filter(k => keywords.includes(k));
        
        if (validSelected.length >= 2) {
          return validSelected.slice(0, maxCount);
        }
      }
    } catch (error) {
      console.error('키워드 선택 실패:', error.message);
    }

    return keywords.slice(0, maxCount);
  }

  // 🚫 고급 쿼리 분석 함수는 advanced-query-builder.js로 이동됨
  // 향후 필요시 아래와 같이 import 하여 사용:
  // import { analyzeQueryNeeds } from './advanced-query-builder.js';

  /**
   * 🎯 OR 통합 쿼리 직접 생성
   */
  createDirectOrQuery(keywords) {
    // "shorts" 중복 방지
    const shortsKeywords = keywords.map(k => {
      const keyword = k.trim();
      return keyword.toLowerCase().includes('shorts') ? keyword : `${keyword} shorts`;
    });
    
    const orQuery = shortsKeywords.join(' | ');
    
    return {
      apiParams: {
        ...this.fixedParams,
        q: orQuery,
        order: 'relevance'
      },
      strategyName: 'OR_직접통합',
      keyword: keywords.join(' | '),
      optimizedQuery: orQuery,
      priority: 1,
      reasoning: `${keywords.length}개 키워드를 OR로 직접 통합 - 안정적 기본 쿼리`,
      type: 'direct_or',
      llmGenerated: false
    };
  }

  // 🚫 고급 쿼리 생성 함수들은 advanced-query-builder.js로 이동됨
  // 향후 필요시 아래와 같이 import 하여 사용:
  // import { generateAdvanced, createCategoryQuery, createTimeFilterQuery, createSortedQuery } from './advanced-query-builder.js';

  /**
   * 🔄 폴백 쿼리 생성
   */
  generateFallbackQueries(keywords) {
    const firstKeyword = Array.isArray(keywords) ? keywords[0] : keywords;
    
    return [{
      apiParams: {
        ...this.fixedParams,
        q: `${firstKeyword} shorts`,
        order: 'relevance'
      },
      strategyName: '폴백_기본',
      keyword: firstKeyword,
      optimizedQuery: `${firstKeyword} shorts`,
      priority: 99,
      reasoning: '비상 폴백 쿼리',
      type: 'fallback',
      llmGenerated: false
    }];
  }

  /**
   * 📊 통계 업데이트
   */
  updateStats(queriesCount, processingTime) {
    this.stats.totalQueries += queriesCount;
    this.stats.avgProcessingTime = 
      (this.stats.avgProcessingTime * (this.stats.totalQueries - queriesCount) + processingTime) / 
      this.stats.totalQueries;
  }

  /**
   * 📊 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      intelligentRatio: this.stats.totalQueries > 0 ? 
        ((this.stats.intelligentQueries / this.stats.totalQueries) * 100).toFixed(1) + '%' : '0%',
      fallbackRatio: this.stats.totalQueries > 0 ? 
        ((this.stats.fallbackQueries / this.stats.totalQueries) * 100).toFixed(1) + '%' : '0%'
    };
  }
}

// 전역 인스턴스
const intelligentQueryBuilder = new IntelligentYouTubeQueryBuilder();

/**
 * 🎯 편의 함수들
 */

// 직접 검색 키워드 → YouTube 쿼리 (메인 함수)
export async function buildYouTubeQueries(directSearchKeywords, options = {}) {
  return await intelligentQueryBuilder.buildQueries(directSearchKeywords, options);
}

// 키워드 추출 결과 → YouTube 쿼리 (통합 함수)
export async function buildFromExtractorResult(extractorResult, options = {}) {
  const mergedOptions = {
    ...options,
    originalInput: extractorResult.originalInput
  };
  
  return await intelligentQueryBuilder.buildQueries(
    extractorResult.directSearch || extractorResult.keywords,
    mergedOptions
  );
}

// 빠른 쿼리 생성 (단일 키워드)
export async function quickBuildQuery(keyword, originalInput = null, maxQueries = 1) {
  const result = await intelligentQueryBuilder.buildQueries([keyword], { 
    maxQueries,
    originalInput 
  });
  return result.success ? result.queries[0] : null;
}

// 통계 조회
export function getQueryBuilderStats() {
  return intelligentQueryBuilder.getStats();
}

export default intelligentQueryBuilder; 