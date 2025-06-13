/**
 * 📰 뉴스 기반 트렌드 정제기 (News-Based Trend Refiner)
 * 
 * 🎯 목적: 활성 트렌드 키워드들을 뉴스 분석을 통해 정제
 * 📊 입력: getActiveKoreanTrends()에서 받은 활성 키워드 배열
 * 🎨 출력: 중복 제거 + 뉴스 맥락 + "키워드 + 한 단어" 형태의 10개 이하 키워드
 * 
 * 🔄 처리 흐름:
 * 1. 활성 키워드 전체 수집
 * 2. 배치 뉴스 검색 (병렬 처리)
 * 3. Claude AI 종합 분석 (중복 제거 + 맥락 추가)
 * 4. 최대 10개 정제된 키워드 반환
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../../../.env') });

class NewsBasedTrendRefiner {
  constructor() {
    this.serpApiKey = process.env.SERP_API_KEY;
    this.claudeApiKey = process.env.ANTHROPIC_API_KEY;
    
    // 캐시 설정
    this.newsCache = new Map();
    this.analysisCache = new Map();
    this.cacheTimeout = 3600000; // 1시간
    
    // Claude AI 초기화
    this.anthropic = this.claudeApiKey ? new Anthropic({
      apiKey: this.claudeApiKey
    }) : null;
    
    console.log('📰 뉴스 기반 트렌드 정제기 초기화');
    console.log(`🔑 SerpAPI: ${this.serpApiKey ? '✅' : '❌'}`);
    console.log(`🤖 Claude AI: ${this.anthropic ? '✅' : '❌'}`);
  }

  /**
   * 🎯 메인 함수: 활성 키워드들을 뉴스 기반으로 정제
   */
  async refineActiveKeywords(activeKeywords, options = {}) {
    const {
      maxFinalKeywords = 10,
      newsPerKeyword = 3,
      removeDuplicates = true,
      addContext = true,
      timeout = 30000
    } = options;

    console.log(`\n🎯 ===== 뉴스 기반 키워드 정제 시작 =====`);
    console.log(`📊 입력 키워드: ${activeKeywords.length}개`);
    console.log(`🎨 목표 키워드: 최대 ${maxFinalKeywords}개`);

    const startTime = Date.now();

    try {
      // 1단계: 배치 뉴스 수집
      console.log(`\n📰 1단계: 배치 뉴스 수집 중...`);
      const newsContext = await this.gatherBatchNews(activeKeywords, {
        newsPerKeyword,
        timeout: timeout / 2
      });

      if (newsContext.totalArticles === 0) {
        console.warn('⚠️ 뉴스 데이터 없음, 기본 정제만 실행');
        return this.basicRefine(activeKeywords, maxFinalKeywords);
      }

      // 2단계: Claude AI 종합 분석
      console.log(`\n🤖 2단계: Claude AI 종합 분석 중...`);
      const refinedResult = await this.analyzeWithClaude(
        activeKeywords, 
        newsContext, 
        {
          maxFinalKeywords,
          removeDuplicates,
          addContext
        }
      );

      const processingTime = Date.now() - startTime;

      console.log(`\n✅ 정제 완료! ${processingTime}ms`);
      console.log(`📊 결과: ${activeKeywords.length}개 → ${refinedResult.keywords.length}개`);

      return {
        success: true,
        originalKeywords: activeKeywords,
        refinedKeywords: refinedResult.keywords,
        analysis: refinedResult.analysis,
        newsContext: newsContext.summary,
        statistics: {
          originalCount: activeKeywords.length,
          finalCount: refinedResult.keywords.length,
          duplicatesRemoved: refinedResult.duplicatesRemoved,
          newsArticlesUsed: newsContext.totalArticles,
          processingTime
        }
      };

    } catch (error) {
      console.error('❌ 키워드 정제 실패:', error.message);
      
      // 폴백: 기본 정제
      console.log('🔄 기본 정제로 폴백...');
      const fallbackResult = await this.basicRefine(activeKeywords, maxFinalKeywords);
      
      return {
        success: false,
        error: error.message,
        fallbackResult,
        originalKeywords: activeKeywords,
        refinedKeywords: fallbackResult
      };
    }
  }

  /**
   * 📰 배치 뉴스 수집 (병렬 처리)
   */
  async gatherBatchNews(keywords, options = {}) {
    const { newsPerKeyword = 3, timeout = 15000 } = options;
    
    console.log(`📊 키워드별 뉴스 ${newsPerKeyword}개씩 수집...`);
    
    const newsResults = {};
    let totalArticles = 0;
    let failedKeywords = [];

    // 병렬 뉴스 검색 (5개씩 배치로 처리하여 API 부하 방지)
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < keywords.length; i += batchSize) {
      batches.push(keywords.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (keyword) => {
        try {
          const news = await this.searchNewsForKeyword(keyword, newsPerKeyword);
          return { keyword, news, success: true };
        } catch (error) {
          console.warn(`⚠️ "${keyword}" 뉴스 검색 실패: ${error.message}`);
          failedKeywords.push(keyword);
          return { keyword, news: [], success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ keyword, news, success }) => {
        if (success && news.length > 0) {
          newsResults[keyword] = news;
          totalArticles += news.length;
          console.log(`   ✅ "${keyword}": ${news.length}개 뉴스`);
        }
      });

      // API 호출 간격 (Rate Limiting 방지)
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(1000);
      }
    }

    console.log(`📊 뉴스 수집 완료: ${Object.keys(newsResults).length}/${keywords.length}개 키워드`);
    console.log(`📰 총 수집 기사: ${totalArticles}개`);

    return {
      keywordNews: newsResults,
      totalArticles,
      failedKeywords,
      summary: {
        successfulKeywords: Object.keys(newsResults).length,
        totalKeywords: keywords.length,
        totalArticles,
        failedCount: failedKeywords.length
      }
    };
  }

  /**
   * 🌐 개별 키워드 뉴스 검색
   */
  async searchNewsForKeyword(keyword, maxResults = 3) {
    // 캐시 확인
    const cacheKey = `news:${keyword}:${maxResults}`;
    if (this.newsCache.has(cacheKey)) {
      return this.newsCache.get(cacheKey);
    }

    if (!this.serpApiKey) {
      throw new Error('SerpAPI 키가 설정되지 않음');
    }

    try {
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google_news',
          q: keyword,
          hl: 'ko',
          gl: 'kr',
          num: maxResults,
          api_key: this.serpApiKey
        },
        timeout: 8000
      });

      const articles = response.data.news_results?.slice(0, maxResults) || [];
      
      const newsData = articles.map(article => ({
        title: article.title,
        snippet: article.snippet || '',
        source: article.source,
        date: article.date,
        link: article.link
      }));

      // 캐시 저장
      this.newsCache.set(cacheKey, newsData);
      setTimeout(() => this.newsCache.delete(cacheKey), this.cacheTimeout);

      return newsData;

    } catch (error) {
      throw new Error(`뉴스 검색 실패: ${error.message}`);
    }
  }

  /**
   * 🤖 Claude AI 종합 분석
   */
  async analyzeWithClaude(keywords, newsContext, options = {}) {
    const { maxFinalKeywords = 10, removeDuplicates = true, addContext = true } = options;

    if (!this.anthropic) {
      throw new Error('Claude AI가 설정되지 않음');
    }

    console.log(`🤖 Claude AI 분석: ${keywords.length}개 키워드 + ${newsContext.totalArticles}개 뉴스`);

    // 프롬프트 생성
    const prompt = this.buildAnalysisPrompt(keywords, newsContext, {
      maxFinalKeywords,
      removeDuplicates,
      addContext
    });

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].text;
      console.log('✅ Claude AI 분석 완료');

      // 응답 파싱
      const analysisResult = this.parseClaudeResponse(responseText);
      
      console.log(`\n🎯 정제 결과:`);
      analysisResult.keywords.forEach((keyword, index) => {
        console.log(`   ${index + 1}. "${keyword}"`);
      });

      return analysisResult;

    } catch (error) {
      throw new Error(`Claude AI 분석 실패: ${error.message}`);
    }
  }

  /**
   * 📝 Claude AI 분석 프롬프트 생성
   */
  buildAnalysisPrompt(keywords, newsContext, options) {
    const { maxFinalKeywords, removeDuplicates, addContext } = options;

    // 뉴스 요약 생성
    const newsContextText = Object.entries(newsContext.keywordNews)
      .map(([keyword, news]) => {
        const newsItems = news.slice(0, 2).map(n => `- ${n.title}`).join('\n');
        return `"${keyword}":\n${newsItems}`;
      })
      .join('\n\n');

    return `# 트렌드 키워드 정제 분석

## 원본 활성 키워드 (${keywords.length}개)
${keywords.map((k, i) => `${i+1}. "${k}"`).join('\n')}

## 뉴스 컨텍스트 (총 ${newsContext.totalArticles}개 기사)
${newsContextText}

## 요청사항

다음 조건에 따라 키워드를 정제해주세요:

### 1. 중복 제거 ${removeDuplicates ? '✅' : '❌'}
- 같은 이슈/사건을 다루는 키워드들을 하나로 통합
- ⚠️ 중요: 중복 제거 시 **원본 순서가 앞선 키워드를 우선 선택**
- 예: "이스라엘 이란"(1위) + "israel iran"(8위) → "이스라엘 이란 갈등" (1위 유지)

### 2. 맥락 추가 ${addContext ? '✅' : '❌'}  
- 뉴스 내용을 바탕으로 "원본키워드 + 정확히 한 단어" 형태로 구체화
- ⚠️ 중요: 원본 키워드에 정확히 한 단어만 추가 (두 단어 이상 금지)
- 예시:
  * "에어인디아" → "에어인디아 사고" ✅
  * "조은석" → "조은석 특검" ✅  
  * "이스라엘 이란" → "이스라엘 이란 갈등" ✅
  * "이스라엘 이란" → "이스라엘 이란 전쟁 위기" ❌ (두 단어 추가)

### 3. YouTube 최적화
- 한국 사용자가 YouTube에서 검색하기 좋은 형태
- 감정적으로 매력적이고 구체적인 키워드
- Shorts 영상 검색에 적합한 키워드

### 4. 트렌드 순서 유지 🔥 (필수!)
- **원본 키워드 순서를 절대 변경하지 말 것**
- 중복 제거 후에도 원본 순서에 따라 최종 결과 정렬
- 트렌드 순서 = 트렌드 강도 반영이므로 매우 중요

### 5. 최대 ${maxFinalKeywords}개 선별
- 우선순위와 검색 가능성을 고려하여 선별
- 트렌드 강도와 뉴스 맥락을 반영
- **순서는 원본 트렌드 순서 유지**

## 응답 형식 (JSON만)

\`\`\`json
{
  "analysis": {
         "duplicateGroups": [
       {
         "theme": "중동_갈등",
         "originalKeywords": ["이스라엘 이란", "israel iran", "전쟁"],
         "refinedKeyword": "이스라엘 이란 갈등",
         "originalOrder": 1,
         "finalOrder": 1,
         "newsContext": "중동 지역 군사적 갈등 상황",
         "youtubeOptimization": "국제 뉴스 관심 높음"
       }
     ],
     "totalThemes": 6,
     "processingLogic": "중복 제거 → 맥락 추가 → 원본 순서 유지 → 최종 선별"
  },
     "keywords": [
     "이스라엘 이란 갈등",
     "에어인디아 사고", 
     "조은석 특검",
     "윤딴딴 이혼",
     "텐센트 인수"
   ],
  "duplicatesRemoved": 8,
  "contextAdded": true
}
\`\`\`

 **🔥 순서 유지 필수 사항 🔥**
원본 키워드 리스트의 순서는 트렌드 강도를 나타냅니다.
1번이 가장 핫한 트렌드, 20번이 상대적으로 약한 트렌드입니다.
따라서 최종 결과에서도 이 순서를 절대 바꾸지 마세요.

예시:
- 원본: ["이스라엘 이란"(1위), "에어인디아"(2위), "조은석"(3위), ...]
- 최종: ["이스라엘 이란 갈등"(1위), "에어인디아 사고"(2위), "조은석 특검"(3위), ...]

JSON 형식으로만 응답해주세요.`;
  }

  /**
   * 🔍 Claude 응답 파싱
   */
  parseClaudeResponse(responseText) {
    try {
      console.log('🔍 Claude 응답 분석 중...');
      console.log('📄 응답 길이:', responseText.length);
      
      // 여러 패턴으로 JSON 추출 시도
      let jsonText = null;
      
      // 패턴 1: ```json ... ```
      let jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
        console.log('✅ 패턴 1으로 JSON 추출 성공');
      }
      
      // 패턴 2: ``` ... ``` (json 태그 없이)
      if (!jsonText) {
        jsonMatch = responseText.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
          console.log('✅ 패턴 2로 JSON 추출 성공');
        }
      }
      
      // 패턴 3: { ... } 형태 직접 추출
      if (!jsonText) {
        jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
          console.log('✅ 패턴 3으로 JSON 추출 성공');
        }
      }
      
      if (!jsonText) {
        console.log('❌ JSON 형식을 찾을 수 없음');
        console.log('📄 응답 미리보기:', responseText.substring(0, 500) + '...');
        throw new Error('JSON 형식을 찾을 수 없음');
      }

      console.log('📋 추출된 JSON 길이:', jsonText.length);
      
      const parsed = JSON.parse(jsonText);

      // 유효성 검증
      if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
        console.log('❌ 키워드 배열이 없음');
        console.log('📋 파싱된 객체:', JSON.stringify(parsed, null, 2));
        throw new Error('키워드 배열이 없음');
      }

      console.log(`✅ 파싱 성공: ${parsed.keywords.length}개 키워드`);

      return {
        keywords: parsed.keywords.slice(0, 10), // 최대 10개 보장
        analysis: parsed.analysis || {},
        duplicatesRemoved: parsed.duplicatesRemoved || 0
      };

    } catch (error) {
      console.error('❌ Claude 응답 파싱 실패:', error.message);
      console.log('📄 원본 응답:', responseText.substring(0, 1000) + '...');
      throw new Error(`Claude 응답 파싱 실패: ${error.message}`);
    }
  }

  /**
   * 🔄 기본 정제 (폴백용)
   */
  async basicRefine(keywords, maxResults = 10) {
    console.log('🔄 기본 정제 실행...');
    
    // 간단한 중복 제거 (대소문자, 공백 기준)
    const uniqueKeywords = [];
    const seen = new Set();
    
    for (const keyword of keywords) {
      const normalized = keyword.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueKeywords.push(keyword);
      }
    }
    
    return uniqueKeywords.slice(0, maxResults);
  }

  /**
   * 🔧 유틸리티
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 🎯 편의 함수 - 메인 사용법
 */
export async function refineKoreanTrends(activeKeywords, options = {}) {
  const refiner = new NewsBasedTrendRefiner();
  return await refiner.refineActiveKeywords(activeKeywords, options);
}

/**
 * 📊 통계 조회
 */
export function getRefinementStats() {
  return {
    lastRefined: new Date().toISOString(),
    cacheSize: 0 // 실제로는 캐시 크기 반환
  };
}

export default NewsBasedTrendRefiner; 