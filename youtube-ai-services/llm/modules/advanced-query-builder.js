/**
 * 🧠 고급 YouTube 쿼리 빌더 (향후 사용 예정)
 * 
 * ⚠️ 현재 성능 최적화를 위해 비활성화됨
 * 
 * 향후 다음과 같은 경우에 재활성화 예정:
 * 1. 사전 캐싱 시스템 완료 후
 * 2. 기본 쿼리 품질 검증 후  
 * 3. 프리미엄 사용자 고급 기능 필요 시
 * 4. A/B 테스트로 효과 입증 시
 * 
 * 기능:
 * - LLM 기반 쿼리 필요성 분석
 * - 카테고리 필터링
 * - 시간 범위 필터링
 * - 인기순/관련성 정렬
 * - 복합 조건 쿼리 생성
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../../../.env') });

class AdvancedQueryBuilder {
  constructor() {
    this.anthropic = null;
    this.initializeAPI();
    
    // 카테고리 ID 매핑
    this.categories = {
      '영화및애니메이션': '1',
      '자동차및차량': '2',
      '음악': '10',
      '반려동물': '15',
      '스포츠': '17',
      '여행': '19',
      '게임': '20',
      '사람및블로그': '22',
      '코미디': '23',
      '엔터테인먼트': '24',
      '뉴스및정치': '25',
      '노하우및스타일': '26',
      '교육': '27',
      '과학기술': '28'
    };
  }

  initializeAPI() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      console.log('🤖 고급 쿼리 빌더 Claude API 초기화 완료');
    } else {
      console.warn('⚠️ ANTHROPIC_API_KEY 없음 - 고급 쿼리 기능 제한');
    }
  }

  /**
   * 🧠 LLM 기반 고급 쿼리 필요성 분석
   */
  async analyzeAdvancedQueryNeeds(originalInput, keywords) {
    const defaultResult = {
      needsAdvanced: false,
      requiredElements: [],
      category: null,
      needsTimeFilter: false,
      timeFilter: null,
      preferredOrder: 'relevance',
      reasoning: '기본 OR 쿼리로 충분'
    };

    if (!this.anthropic || !originalInput) {
      return defaultResult;
    }

    const prompt = `YouTube Shorts 검색을 위한 고급 쿼리 필요성을 엄격히 분석해주세요.

사용자 원본 입력: "${originalInput}"
추출된 키워드: [${keywords.join(', ')}]

**매우 엄격한 판단 기준**:
1. **시간 필터**: 사용자가 구체적인 연도나 시기를 명시한 경우만 (예: "2023년 LCK", "2021년 발매된 아이유")
2. **카테고리 필터**: 키워드만으로 부족하고 카테고리가 명확히 필요한 경우만
3. **정렬 방식**: 인기순이 명확히 필요한 경우만 (최신순은 제외)

대부분의 경우 기본 OR 쿼리로 충분합니다:
- "LCK 영상 보고 싶어" → 기본 쿼리로 충분
- "먹방 영상" → 기본 쿼리로 충분  
- "운동 루틴" → 기본 쿼리로 충분

고급 쿼리가 필요한 드문 경우:
- "2023년 LCK 경기 영상" → 시간 필터 필요
- "2021년 발매된 아이유 노래" → 시간 필터 필요

사용 가능한 카테고리: 영화및애니메이션, 자동차및차량, 음악, 반려동물, 스포츠, 여행, 게임, 사람및블로그, 코미디, 엔터테인먼트, 뉴스및정치, 노하우및스타일, 교육, 과학기술

JSON으로 응답:
{
  "needsAdvanced": true/false,
  "requiredElements": ["카테고리", "시간필터", "정렬방식"] (필요한 요소들만),
  "category": "카테고리명 또는 null",
  "needsTimeFilter": true/false,
  "timeFilter": "최근7일|최근30일|최근1년 또는 null",
  "preferredOrder": "relevance|viewCount",
  "reasoning": "판단 근거"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // 카테고리 검증
        if (analysis.category && !this.categories[analysis.category]) {
          analysis.category = null;
          analysis.requiredElements = analysis.requiredElements.filter(e => e !== '카테고리');
        }
        
        return {
          needsAdvanced: !!analysis.needsAdvanced,
          requiredElements: analysis.requiredElements || [],
          category: analysis.category,
          needsTimeFilter: !!analysis.needsTimeFilter,
          timeFilter: analysis.timeFilter,
          preferredOrder: analysis.preferredOrder || 'relevance',
          reasoning: analysis.reasoning || 'LLM 분석 완료'
        };
      }
    } catch (error) {
      console.error('고급 쿼리 분석 실패:', error.message);
    }

    return defaultResult;
  }

  /**
   * 🎯 분석 결과 기반 고급 쿼리 생성
   */
  generateAdvancedQueries(keywords, analysis, maxQueries, fixedParams) {
    const queries = [];
    
    // 분석 결과에 따라 필요한 쿼리들만 생성
    if (analysis.requiredElements.includes('카테고리') && analysis.category) {
      const categoryQuery = this.createCategoryQuery(keywords, analysis, fixedParams);
      if (categoryQuery) queries.push(categoryQuery);
    }
    
    if (analysis.requiredElements.includes('시간필터') && analysis.needsTimeFilter) {
      const timeQuery = this.createTimeFilterQuery(keywords, analysis, fixedParams);
      if (timeQuery) queries.push(timeQuery);
    }
    
    if (analysis.requiredElements.includes('정렬방식') && analysis.preferredOrder !== 'relevance') {
      const sortQuery = this.createSortedQuery(keywords, analysis, fixedParams);
      if (sortQuery) queries.push(sortQuery);
    }
    
    return queries.slice(0, maxQueries);
  }

  /**
   * 🏷️ 카테고리 기반 쿼리 생성
   */
  createCategoryQuery(keywords, analysis, fixedParams) {
    const categoryId = this.categories[analysis.category];
    if (!categoryId) return null;
    
    const query = keywords.slice(0, 2).join(' | ');
    
    return {
      apiParams: {
        ...fixedParams,
        q: `${query} shorts`,
        order: analysis.preferredOrder,
        videoCategoryId: categoryId
      },
      strategyName: `카테고리_${analysis.category}`,
      keyword: query,
      optimizedQuery: `${query} shorts`,
      priority: 2,
      reasoning: `${analysis.category} 카테고리에서 검색하여 관련성 높은 결과 확보`,
      type: 'category_filtered',
      llmGenerated: true,
      categoryName: analysis.category,
      categoryId: categoryId
    };
  }

  /**
   * ⏰ 시간 필터 기반 쿼리 생성
   */
  createTimeFilterQuery(keywords, analysis, fixedParams) {
    if (!analysis.timeFilter) return null;
    
    let publishedAfter = null;
    const now = new Date();
    
    if (analysis.timeFilter === '최근7일') {
      publishedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (analysis.timeFilter === '최근30일') {
      publishedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (analysis.timeFilter === '최근1년') {
      publishedAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    if (!publishedAfter) return null;
    
    const query = keywords.slice(0, 2).join(' | ');
    
    return {
      apiParams: {
        ...fixedParams,
        q: `${query} shorts`,
        order: 'relevance', // 시간 필터 사용 시에도 관련성 우선
        publishedAfter: publishedAfter
      },
      strategyName: `시간필터_${analysis.timeFilter}`,
      keyword: query,
      optimizedQuery: `${query} shorts`,
      priority: 3,
      reasoning: `${analysis.timeFilter} 필터로 시기별 콘텐츠 확보`,
      type: 'time_filtered',
      llmGenerated: true,
      timeFilter: analysis.timeFilter
    };
  }

  /**
   * 📊 정렬 방식 기반 쿼리 생성
   */
  createSortedQuery(keywords, analysis, fixedParams) {
    if (analysis.preferredOrder !== 'viewCount') {
      return null; // viewCount가 아니면 고급 쿼리 불필요
    }
    
    const query = keywords.slice(0, 3).join(' | ');
    
    return {
      apiParams: {
        ...fixedParams,
        q: `${query} shorts`,
        order: 'viewCount'
      },
      strategyName: '인기순_정렬',
      keyword: query,
      optimizedQuery: `${query} shorts`,
      priority: 4,
      reasoning: '조회수 기준으로 검증된 인기 콘텐츠 우선 노출',
      type: 'sort_optimized',
      llmGenerated: true,
      sortOrder: 'viewCount'
    };
  }
}

// 전역 인스턴스
const advancedQueryBuilder = new AdvancedQueryBuilder();

/**
 * 🎯 고급 쿼리 편의 함수들 (향후 사용 예정)
 */

// 고급 쿼리 필요성 분석
export async function analyzeQueryNeeds(originalInput, keywords) {
  return await advancedQueryBuilder.analyzeAdvancedQueryNeeds(originalInput, keywords);
}

// 고급 쿼리 생성
export function generateAdvanced(keywords, analysis, maxQueries, fixedParams) {
  return advancedQueryBuilder.generateAdvancedQueries(keywords, analysis, maxQueries, fixedParams);
}

// 카테고리 쿼리 생성
export function createCategoryQuery(keywords, analysis, fixedParams) {
  return advancedQueryBuilder.createCategoryQuery(keywords, analysis, fixedParams);
}

// 시간 필터 쿼리 생성  
export function createTimeFilterQuery(keywords, analysis, fixedParams) {
  return advancedQueryBuilder.createTimeFilterQuery(keywords, analysis, fixedParams);
}

// 정렬 쿼리 생성
export function createSortedQuery(keywords, analysis, fixedParams) {
  return advancedQueryBuilder.createSortedQuery(keywords, analysis, fixedParams);
}

export default advancedQueryBuilder; 