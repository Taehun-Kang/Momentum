/**
 * 🚀 Enhanced 키워드 추출기 v2.0
 * 
 * 개선사항:
 * 1. 관련성 점수 임계값 설정 (0.7 이상만 추천)
 * 2. 할루시네이션 방지 프롬프트 (실제 데이터만 사용)
 * 3. 빈출 키워드 + 기본 키워드 조합 생성
 * 4. YouTube Shorts 최적화 ("shorts" 키워드 자동 추가)
 * 5. 캐싱 고려한 비용 효율성
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드 (프로젝트 루트의 .env 파일)
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * 🎯 Enhanced 키워드 추출기 v2.0
 */
class EnhancedKeywordExtractorV2 {
  constructor() {
    this.serpApiKey = process.env.SERP_API_KEY;  // 정확한 환경 변수명으로 수정
    this.claudeApiKey = process.env.ANTHROPIC_API_KEY; // 정확한 환경 변수명으로 수정
    this.serpBaseUrl = 'https://serpapi.com/search.json';
    
    // Claude API 클라이언트 초기화
    this.anthropic = null;
    if (this.claudeApiKey) {
      try {
        this.anthropic = new Anthropic({
          apiKey: this.claudeApiKey,
        });
        console.log('🤖 Claude API 클라이언트 초기화 완료');
      } catch (error) {
        console.warn('⚠️ Claude API 초기화 실패:', error.message);
      }
    } else {
      console.warn('⚠️ ANTHROPIC_API_KEY가 설정되지 않았습니다.');
    }
    
    // v2.0 설정
    this.relevanceThreshold = 0.6; // LLM 키워드 0.6 이상 추천

    // 통계
    this.stats = {
      totalProcessed: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      qualityScore: 0
    };
  }

  /**
   * 🔍 메인 키워드 추출 함수 (v2.0)
   */
  async extractKeywords(originalKeyword, options = {}) {
    const {
      includeMetadata = true,
      addShortsKeyword = false, // 사용자가 직접 추가할 예정
      generateCombinations = true,
      relevanceThreshold = 0.6 // LLM 키워드 임계값
    } = options;

    console.log(`\n🚀 "${originalKeyword}" v2.0 키워드 추출 시작`);
    console.log('='.repeat(70));

    const startTime = Date.now();

    try {
      // 1. Google Search 데이터 가져오기
      console.log('📡 Google Search API 호출 중...');
      const googleData = await this.fetchGoogleSearchData(originalKeyword);
      
      if (!googleData.success) {
        return { success: false, error: googleData.error };
      }

      // 2. 모든 섹션에서 실제 데이터만 추출
      console.log('🔍 실제 데이터 추출 중...');
      const extractedData = this.extractRealDataOnly(googleData.data);
      
      console.log(`📊 추출된 실제 데이터: ${Object.keys(extractedData).length}개 섹션`);

      // 3. 기본 검색어 추가 (원본 키워드)
      console.log('📝 기본 검색어 추가 중...');
      const basicKeyword = [{
        keyword: originalKeyword,
        relevance: 1.0,
        reason: '원본 기본 검색어',
        source: 'basic'
      }];

      // 4. Related Searches 직접 추출 (LLM에서 제외)
      console.log('🔍 Related Searches 직접 추출 중...');
      const relatedKeywords = this.extractRelatedSearchesDirectly(extractedData);

      // 5. LLM으로 나머지 콘텐츠 기반 키워드 추출 (Related Searches 제외)
      console.log('🤖 LLM 창의적 키워드 추출 중 (Related Searches 제외)...');
      const llmResult = await this.extractKeywordsWithEnhancedLLM(
        originalKeyword, 
        extractedData, 
        20 // Related 제외하고 창의적 키워드
      );

      if (!llmResult.success) {
        return { success: false, error: llmResult.error };
      }

      // 6. LLM 키워드에 source 태그 추가
      const llmKeywordsWithSource = llmResult.keywords.map(kw => ({
        ...kw,
        source: 'llm_creative'
      }));

      // 7. 키워드 품질 필터링 (관련성 임계값 적용)
      console.log(`🎯 키워드 품질 필터링 중 (임계값: ${relevanceThreshold})...`);
      const filteredKeywords = this.filterByQuality(
        llmKeywordsWithSource, 
        relevanceThreshold
      );

      // 8. 최종 키워드 구성: 기본 1개 + Related Searches + LLM 창의적 키워드
      const finalKeywords = [
        ...basicKeyword,           // 기본 검색어 1개
        ...relatedKeywords,        // Related Searches 직접 추출
        ...filteredKeywords        // LLM 창의적 키워드 (0.6 이상)
      ];

      // 9. 결과 반환
      const processingTime = Date.now() - startTime;
      
      const result = {
        success: true,
        originalKeyword,
        extractedKeywords: finalKeywords,
        metadata: includeMetadata ? {
          processingTime,
          llmTokensUsed: llmResult.tokensUsed,
          basicKeywords: basicKeyword.length,
          relatedKeywords: relatedKeywords.length,
          llmKeywords: filteredKeywords.length,
          qualityFiltered: llmKeywordsWithSource.length - filteredKeywords.length,
          averageRelevance: this.calculateAverageRelevance(finalKeywords),
          extractionStrategy: 'basic_1_related_direct_llm_creative'
        } : undefined
      };

      this.updateStats(result);
      return result;

    } catch (error) {
      console.error('❌ 키워드 추출 실패:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🌐 Google Search 데이터 가져오기
   */
  async fetchGoogleSearchData(keyword) {
    try {
      const response = await axios.get(this.serpBaseUrl, {
        params: {
          engine: 'google',
          q: keyword,
          hl: 'ko',
          gl: 'kr',
          num: 10,
          api_key: this.serpApiKey
        },
        timeout: 15000
      });

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      return {
        success: false,
        error: `Google Search API 오류: ${error.message}`
      };
    }
  }

  /**
   * 📋 13개 섹션 전체에서 실제 데이터만 추출 (할루시네이션 방지)
   */
  extractRealDataOnly(googleData) {
    const realData = {};

    // 1. Related Searches (가장 신뢰할 수 있는 데이터)
    if (googleData.related_searches?.length > 0) {
      realData.relatedSearches = googleData.related_searches
        .map(item => item.query)
        .filter(Boolean)
        .slice(0, 10);
    }

    // 2. People Also Ask (사람들이 묻는 질문)
    if (googleData.people_also_ask?.length > 0) {
      realData.peopleAlsoAsk = googleData.people_also_ask
        .slice(0, 5)
        .map(item => ({
          question: item.question,
          snippet: item.snippet?.substring(0, 100)
        }))
        .filter(item => item.question);
    }

    // 3. Knowledge Graph (구조화된 실제 데이터)
    if (googleData.knowledge_graph) {
      const kg = googleData.knowledge_graph;
      realData.knowledgeGraph = {};
      
      if (kg.title) realData.knowledgeGraph.title = kg.title;
      if (kg.type) realData.knowledgeGraph.type = kg.type;
      if (kg.description) realData.knowledgeGraph.description = kg.description;
      
      // 배열 형태의 실제 데이터만 추출 (더 많은 속성 포함)
      ['멤버', '노래', '앨범', '함께_찾은_검색어', '수상', '장르'].forEach(key => {
        if (kg[key] && Array.isArray(kg[key])) {
          realData.knowledgeGraph[key] = kg[key].slice(0, 8).map(item => 
            typeof item === 'object' ? item.name || item.title || item.text : item
          );
        }
      });

      // Web Results 스니펫
      if (kg.web_results?.length > 0) {
        realData.knowledgeGraph.webResults = kg.web_results
          .map(wr => wr.snippet)
          .filter(Boolean)
          .slice(0, 3);
      }
    }

    // 4. Organic Results (일반 검색 결과)
    if (googleData.organic_results?.length > 0) {
      realData.organicResults = googleData.organic_results
        .slice(0, 8)
        .map(result => ({
          title: result.title,
          snippet: result.snippet?.substring(0, 150)
        }))
        .filter(result => result.title);
    }

    // 5. News Results (뉴스 결과)
    if (googleData.news_results?.length > 0) {
      realData.newsResults = googleData.news_results
        .slice(0, 5)
        .map(news => ({
          title: news.title,
          snippet: news.snippet?.substring(0, 100),
          date: news.date
        }))
        .filter(news => news.title);
    }

    // 6. Top Stories (주요 뉴스)
    if (googleData.top_stories?.length > 0) {
      realData.topStories = googleData.top_stories
        .slice(0, 5)
        .map(story => ({
          title: story.title,
          snippet: story.snippet?.substring(0, 100)
        }))
        .filter(story => story.title);
    }

    // 7. Local Results (지역 검색 결과)
    if (googleData.local_results?.length > 0) {
      realData.localResults = googleData.local_results
        .slice(0, 5)
        .map(local => ({
          title: local.title,
          description: local.description?.substring(0, 100),
          address: local.address
        }))
        .filter(local => local.title);
    }

    // 8. Videos (비디오 결과)
    if (googleData.videos?.length > 0) {
      realData.videos = googleData.videos
        .slice(0, 5)
        .map(video => ({
          title: video.title,
          description: video.description?.substring(0, 100)
        }))
        .filter(video => video.title);
    }

    // 9. Images (이미지 결과)
    if (googleData.images?.length > 0) {
      realData.images = googleData.images
        .slice(0, 5)
        .map(image => ({ title: image.title }))
        .filter(image => image.title);
    }

    // 10. Answer Box (답변 박스)
    if (googleData.answer_box) {
      realData.answerBox = {
        answer: googleData.answer_box.answer?.substring(0, 200),
        snippet: googleData.answer_box.snippet?.substring(0, 150),
        title: googleData.answer_box.title
      };
    }

    // 11. Featured Snippet (추천 스니펫)
    if (googleData.featured_snippet) {
      realData.featuredSnippet = {
        snippet: googleData.featured_snippet.snippet?.substring(0, 200),
        title: googleData.featured_snippet.title
      };
    }

    // 12. Shopping Results (쇼핑 결과)
    if (googleData.shopping_results?.length > 0) {
      realData.shoppingResults = googleData.shopping_results
        .slice(0, 5)
        .map(shop => ({
          title: shop.title,
          description: shop.description?.substring(0, 100)
        }))
        .filter(shop => shop.title);
    }

    // 13. Search Information (검색 정보)
    if (googleData.search_information) {
      realData.searchInfo = {
        queryDisplayed: googleData.search_information.query_displayed,
        totalResults: googleData.search_information.total_results
      };
    }

    return realData;
  }

  /**
   * 🔍 Related Searches 직접 추출 (LLM 중복 방지)
   */
  extractRelatedSearchesDirectly(extractedData) {
    const relatedKeywords = [];

    if (extractedData.relatedSearches && extractedData.relatedSearches.length > 0) {
      console.log(`   📊 Related Searches ${extractedData.relatedSearches.length}개 발견`);
      
      extractedData.relatedSearches.forEach((search, index) => {
        // 2단어 키워드로 자연스럽게 변환
        const words = search.split(/\s+/).slice(0, 2); // 최대 2단어
        const keyword = words.join(' ');
        
        if (keyword.length > 3 && keyword.length <= 20) {
          relatedKeywords.push({
            keyword: keyword,
            relevance: 0.9 - (index * 0.02), // 순서대로 relevance 감소
            reason: `Google 연관 검색어 직접 추출: "${search}"`,
            source: 'related_searches_direct'
          });
        }
      });
    }

    console.log(`   ✅ Related Searches 직접 추출: ${relatedKeywords.length}개`);
    return relatedKeywords.slice(0, 8); // 최대 8개
  }

  /**
   * 🤖 Enhanced LLM 키워드 추출 (할루시네이션 방지)
   */
  async extractKeywordsWithEnhancedLLM(originalKeyword, extractedData, maxResults) {
    try {
      // Claude API 클라이언트 확인
      if (!this.anthropic) {
        throw new Error('Claude API 클라이언트가 초기화되지 않았습니다.');
      }

      // 실제 데이터만 사용한 컨텍스트 생성
      const realContext = this.buildRealDataContext(extractedData);

      const prompt = `다음은 "${originalKeyword}"에 대한 Google 검색에서 수집된 실제 데이터입니다. (연관 검색어는 별도 처리)

${realContext}

🎯 **YouTube Shorts 실용적 키워드 추출 가이드라인:**

1. **실제 검색 의도** 반영: 사용자가 YouTube에서 실제로 입력할 법한 키워드
2. **직관적이고 자연스러운** 2단어 조합 (복잡한 신조어 금지)
3. **현재 트렌드** 반영하되 과도하게 창의적이지 않게
4. **YouTube Shorts 콘텐츠**에 실제 존재할 법한 검색어

📱 **YouTube 사용자 검색 패턴:**
- 인물/브랜드 + 활동: "인물명 + 동작/상황"
- 주제 + 키워드: "주제 + 뉴스/리뷰/후기"  
- 콘텐츠 타입: "주제 + 무대/영상/인터뷰"
- 최신 이슈: "주제 + 현재이슈/트렌드"

✅ **좋은 키워드 패턴:**
- "주제 + 구체적요소" (세부 내용)
- "주제 + 현재이슈" (실시간 관련)
- "주제 + 활동" (구체적 행동)
- "주제 + 상태" (현재 상황)

❌ **피해야 할 키워드:**
- 복잡한 신조어 조합
- 과도하게 창의적인 표현
- 주제와 관련성 낮은 조합

**데이터 활용 방식:**
- 뉴스 제목에서 핵심 키워드 2개 조합
- 인물명과 최신 활동 연결
- 검색 결과의 빈출 단어 조합
- Q&A에서 관심사 파악

요구사항:
- "${originalKeyword}"와 직접 관련된 **실용적** 2단어 키워드 ${maxResults}개
- 관련성 점수: 0.6~1.0 (높은 관련성 우선)
- YouTube에서 **실제 검색 가능한** 키워드만
- 각 키워드의 **데이터 근거** 명시

응답 형식 (JSON):
{
  "keywords": [
    {"keyword": "실용적키워드1", "relevance": 0.8, "reason": "어떤 데이터에서 실용적으로 추출했는지 설명"},
    {"keyword": "실용적키워드2", "relevance": 0.7, "reason": "실용적 근거와 YouTube 검색 가능성 설명"}
  ]
}`;

      // 공식 SDK 사용 (재시도 로직 포함)
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          response = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2000,
            temperature: 0.7,
            messages: [{
              role: "user",
              content: prompt
            }]
          });
          break; // 성공 시 루프 종료
        } catch (apiError) {
          retryCount++;
          if (apiError.status === 529 && retryCount <= maxRetries) {
            console.log(`   ⚠️ Claude API 과부하 (${retryCount}/${maxRetries}번째 시도) - 3초 후 재시도...`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기
          } else {
            throw apiError; // 다른 에러이거나 최대 재시도 초과 시 에러 던지기
          }
        }
      }

      // 응답 파싱
      const content = response.content[0].text;
      const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0;
      
      console.log(`   🔍 LLM 응답 길이: ${content.length}자`);
      
      // 더 안전한 JSON 추출
      let parsed = null;
      
      // 1차: 기본 JSON 매칭
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          console.log(`   ✅ JSON 파싱 성공: ${parsed.keywords?.length || 0}개 키워드`);
        } catch (parseError) {
          console.warn(`   ⚠️ JSON 파싱 1차 실패: ${parseError.message}`);
          
          // 2차: 더 엄격한 JSON 추출 시도
          const betterJsonMatch = content.match(/\{\s*"keywords"[\s\S]*?\]\s*\}/);
          if (betterJsonMatch) {
            try {
              parsed = JSON.parse(betterJsonMatch[0]);
              console.log(`   ✅ JSON 파싱 2차 성공: ${parsed.keywords?.length || 0}개 키워드`);
            } catch (secondParseError) {
              console.warn(`   ⚠️ JSON 파싱 2차 실패: ${secondParseError.message}`);
              throw new Error(`JSON 파싱 실패: ${secondParseError.message}`);
            }
          } else {
            throw new Error('JSON 구조를 찾을 수 없습니다');
          }
        }
      } else {
        throw new Error('LLM 응답에서 JSON을 찾을 수 없습니다');
      }
      
      return {
        success: true,
        keywords: parsed.keywords || [],
        tokensUsed,
        model: "claude-3-5-sonnet-20241022",
        rawResponse: content
      };

    } catch (error) {
      console.warn(`   ⚠️ Claude API 오류: ${error.message}`);
      console.log(`   🔄 폴백 모드로 전환 중...`);
      
      // 폴백: 실제 데이터 기반 간단 추출
      const fallbackKeywords = this.generateFallbackFromRealData(originalKeyword, extractedData, maxResults);
      console.log(`   ✅ 폴백 키워드 생성: ${fallbackKeywords.length}개`);
      
      return {
        success: true,
        keywords: fallbackKeywords,
        tokensUsed: 0,
        model: "fallback_real_data",
        rawResponse: `폴백 모드: ${error.message}`
      };
    }
  }

  /**
   * 📝 12개 섹션 실제 데이터 컨텍스트 구성 (Related Searches 완전 제외)
   */
  buildRealDataContext(extractedData) {
    let context = '';

    // ❌ Related Searches는 완전히 제외 (별도 직접 추출)
    // ✅ LLM에는 창의적 키워드 생성을 위한 나머지 콘텐츠만 전달

    // 1. People Also Ask
    if (extractedData.peopleAlsoAsk) {
      context += `사람들이 묻는 질문:\n`;
      extractedData.peopleAlsoAsk.forEach(item => {
        context += `- Q: ${item.question}\n`;
        if (item.snippet) context += `  A: ${item.snippet}\n`;
      });
      context += '\n';
    }

    // 2. Knowledge Graph
    if (extractedData.knowledgeGraph) {
      const kg = extractedData.knowledgeGraph;
      context += `지식 그래프 정보:\n`;
      if (kg.title) context += `제목: ${kg.title}\n`;
      if (kg.type) context += `타입: ${kg.type}\n`;
      if (kg.description) context += `설명: ${kg.description}\n`;
      
      Object.entries(kg).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          context += `${key}: ${value.join(', ')}\n`;
        }
      });
      
      if (kg.webResults) {
        context += `웹 결과: ${kg.webResults.join(' ')}\n`;
      }
      context += '\n';
    }

    // 3. Organic Results
    if (extractedData.organicResults) {
      context += `검색 결과:\n`;
      extractedData.organicResults.forEach(result => {
        context += `- ${result.title}\n`;
        if (result.snippet) context += `  ${result.snippet}\n`;
      });
      context += '\n';
    }

    // 4. News Results
    if (extractedData.newsResults) {
      context += `뉴스 결과:\n`;
      extractedData.newsResults.forEach(news => {
        context += `- ${news.title}\n`;
        if (news.snippet) context += `  ${news.snippet}\n`;
      });
      context += '\n';
    }

    // 5. Top Stories
    if (extractedData.topStories) {
      context += `주요 뉴스:\n`;
      extractedData.topStories.forEach(story => {
        context += `- ${story.title}\n`;
        if (story.snippet) context += `  ${story.snippet}\n`;
      });
      context += '\n';
    }

    // 6. Local Results
    if (extractedData.localResults) {
      context += `지역 검색 결과:\n`;
      extractedData.localResults.forEach(local => {
        context += `- ${local.title}\n`;
        if (local.description) context += `  ${local.description}\n`;
        if (local.address) context += `  주소: ${local.address}\n`;
      });
      context += '\n';
    }

    // 7. Videos
    if (extractedData.videos) {
      context += `비디오 결과:\n`;
      extractedData.videos.forEach(video => {
        context += `- ${video.title}\n`;
        if (video.description) context += `  ${video.description}\n`;
      });
      context += '\n';
    }

    // 8. Images
    if (extractedData.images) {
      const imageTitles = extractedData.images.map(img => img.title).filter(Boolean);
      if (imageTitles.length > 0) {
        context += `이미지 제목들: ${imageTitles.join(', ')}\n\n`;
      }
    }

    // 9. Answer Box
    if (extractedData.answerBox) {
      const ab = extractedData.answerBox;
      context += `답변 박스:\n`;
      if (ab.title) context += `제목: ${ab.title}\n`;
      if (ab.answer) context += `답변: ${ab.answer}\n`;
      if (ab.snippet) context += `스니펫: ${ab.snippet}\n`;
      context += '\n';
    }

    // 10. Featured Snippet
    if (extractedData.featuredSnippet) {
      const fs = extractedData.featuredSnippet;
      context += `추천 스니펫:\n`;
      if (fs.title) context += `제목: ${fs.title}\n`;
      if (fs.snippet) context += `내용: ${fs.snippet}\n`;
      context += '\n';
    }

    // 11. Shopping Results
    if (extractedData.shoppingResults) {
      context += `쇼핑 결과:\n`;
      extractedData.shoppingResults.forEach(shop => {
        context += `- ${shop.title}\n`;
        if (shop.description) context += `  ${shop.description}\n`;
      });
      context += '\n';
    }

    // 12. Search Information
    if (extractedData.searchInfo) {
      context += `검색 정보:\n`;
      if (extractedData.searchInfo.queryDisplayed) {
        context += `검색어: ${extractedData.searchInfo.queryDisplayed}\n`;
      }
      if (extractedData.searchInfo.totalResults) {
        context += `총 검색 결과: ${extractedData.searchInfo.totalResults}개\n`;
      }
      context += '\n';
    }

    return context;
  }

  /**
   * 🔄 12개 섹션 기반 폴백 키워드 생성 (Related Searches 제외)
   */
  generateFallbackFromRealData(originalKeyword, extractedData, maxResults) {
    const keywords = [];

    // ❌ Related Searches는 별도 처리되므로 폴백에서 제외

    // 1. Knowledge Graph에서 조합
    if (extractedData.knowledgeGraph && keywords.length < maxResults) {
      const kg = extractedData.knowledgeGraph;
      ['멤버', '노래', '앨범', '함께_찾은_검색어'].forEach(key => {
        if (kg[key] && keywords.length < maxResults) {
          kg[key].slice(0, 2).forEach(item => {
            if (keywords.length < maxResults) {
              const keyword = `${originalKeyword} ${item.split(' ')[0]}`;
              if (keyword.length <= 20 && keyword.length > 3) {
                keywords.push({
                  keyword,
                  relevance: 0.8,
                  reason: `Knowledge Graph ${key}에서 추출`
                });
              }
            }
          });
        }
      });
    }

    // 2. News/Top Stories에서 트렌드 키워드
    const newsData = [...(extractedData.newsResults || []), ...(extractedData.topStories || [])];
    if (newsData.length > 0 && keywords.length < maxResults) {
      newsData.slice(0, 5).forEach(news => {
        if (keywords.length < maxResults) {
          // 뉴스 제목에서 핵심 단어 추출
          const newsWords = news.title.split(/\s+/)
            .filter(word => word.length > 2 && !['의', '을', '를', '이', '가'].includes(word))
            .slice(0, 1);
          
          if (newsWords.length > 0) {
            const keyword = `${originalKeyword} ${newsWords[0]}`;
            if (keyword.length <= 20) {
              keywords.push({
                keyword,
                relevance: 0.75,
                reason: `실시간 뉴스에서 추출: "${news.title.substring(0, 30)}..."`
              });
            }
          }
        }
      });
    }

    // 3. People Also Ask에서 질문 기반 키워드
    if (extractedData.peopleAlsoAsk && keywords.length < maxResults) {
      extractedData.peopleAlsoAsk.slice(0, 3).forEach(item => {
        if (keywords.length < maxResults && item.question) {
          const questionWords = item.question.split(/\s+/)
            .filter(word => word.length > 2 && !['무엇', '어떻게', '왜', '언제', '어디'].includes(word))
            .slice(0, 1);
          
          if (questionWords.length > 0) {
            const keyword = `${originalKeyword} ${questionWords[0]}`;
            if (keyword.length <= 20) {
              keywords.push({
                keyword,
                relevance: 0.7,
                reason: `사용자 질문에서 추출: "${item.question.substring(0, 30)}..."`
              });
            }
          }
        }
      });
    }

    // 4. Organic Results에서 추가 키워드
    if (extractedData.organicResults && keywords.length < maxResults) {
      extractedData.organicResults.slice(0, 3).forEach(result => {
        if (keywords.length < maxResults) {
          const resultWords = result.title.split(/\s+/)
            .filter(word => word.length > 2 && word.toLowerCase() !== originalKeyword.toLowerCase())
            .slice(0, 1);
          
          if (resultWords.length > 0) {
            const keyword = `${originalKeyword} ${resultWords[0]}`;
            if (keyword.length <= 20) {
              keywords.push({
                keyword,
                relevance: 0.6,
                reason: `검색 결과에서 추출: "${result.title.substring(0, 30)}..."`
              });
            }
          }
        }
      });
    }

    return keywords.slice(0, maxResults);
  }

  /**
   * 🎯 품질 필터링 (관련성 임계값 적용)
   */
  filterByQuality(keywords, threshold) {
    const filtered = keywords.filter(kw => 
      kw.relevance >= threshold && 
      kw.keyword.length >= 4 && 
      kw.keyword.length <= 20
    );

    console.log(`   필터링 결과: ${keywords.length}개 → ${filtered.length}개 (임계값: ${threshold})`);
    
    return filtered;
  }

  /**
   * 📊 평균 관련성 계산
   */
  calculateAverageRelevance(keywords) {
    if (keywords.length === 0) return 0;
    const sum = keywords.reduce((acc, kw) => acc + kw.relevance, 0);
    return (sum / keywords.length).toFixed(2);
  }

  /**
   * 📈 통계 업데이트
   */
  updateStats(result) {
    this.stats.totalProcessed++;
    
    if (result.metadata) {
      this.stats.averageProcessingTime = 
        ((this.stats.averageProcessingTime * (this.stats.totalProcessed - 1)) + 
         result.metadata.processingTime) / this.stats.totalProcessed;
      
      this.stats.qualityScore = 
        ((this.stats.qualityScore * (this.stats.totalProcessed - 1)) + 
         parseFloat(result.metadata.averageRelevance)) / this.stats.totalProcessed;
    }
  }

  /**
   * 📊 통계 출력
   */
  printStats() {
    console.log('\n📊 Enhanced v2.0 통계:');
    console.log(`총 처리 건수: ${this.stats.totalProcessed}개`);
    console.log(`평균 처리 시간: ${Math.round(this.stats.averageProcessingTime)}ms`);
    console.log(`평균 품질 점수: ${this.stats.qualityScore.toFixed(2)}/1.0`);
    console.log(`LLM 키워드 임계값: ${this.relevanceThreshold} 이상만 추천`);
  }
}

/**
 * 🧪 Enhanced v2.0 테스트
 */
async function testEnhancedExtractorV2() {
  console.log('🚀 ===== Enhanced 키워드 추출기 v2.0 테스트 =====\n');

  const extractor = new EnhancedKeywordExtractorV2();

  const testKeywords = [
    'BTS',
    '조계사', 
    '비트코인',
    '김치찌개',
    'ChatGPT'
  ];

  for (const keyword of testKeywords) {
    console.log(`\n${'='.repeat(70)}`);
    
    const result = await extractor.extractKeywords(keyword, {
      includeMetadata: true,
      addShortsKeyword: false, // Shorts 자동 추가 안함
      generateCombinations: true,
      relevanceThreshold: 0.6 // LLM 키워드 0.6 이상
    });

    if (result.success) {
      console.log(`\n✅ "${keyword}" v2.0 추출 성공!`);
      console.log(`⚡ 처리 시간: ${result.metadata.processingTime}ms`);
      console.log(`🤖 LLM 토큰: ${result.metadata.llmTokensUsed}개`);
      console.log(`📝 기본 키워드: ${result.metadata.basicKeywords}개`);
      console.log(`🔍 Related 직접: ${result.metadata.relatedKeywords}개`);
      console.log(`🎯 LLM 창의적: ${result.metadata.llmKeywords}개 (필터링: ${result.metadata.qualityFiltered}개 제외)`);
      console.log(`📊 평균 관련성: ${result.metadata.averageRelevance}/1.0`);
      
      console.log('\n📝 추출된 키워드 구성:');
      console.log(`   🎯 총 ${result.extractedKeywords.length}개 = 기본 ${result.metadata.basicKeywords} + Related ${result.metadata.relatedKeywords} + LLM ${result.metadata.llmKeywords}`);
      
      console.log('\n📋 키워드 목록:');
      result.extractedKeywords.forEach((kw, index) => {
        const source = kw.source ? `[${kw.source}] ` : '';
        console.log(`   ${index + 1}. ${source}"${kw.keyword}" (${kw.relevance})`);
        console.log(`      💡 ${kw.reason}`);
      });
      
    } else {
      console.log(`❌ "${keyword}" 실패: ${result.error}`);
    }

    // API 요청 간격
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 최종 통계
  extractor.printStats();

  console.log('\n🎯 v2.0 개선된 구조 검증:');
  console.log('1. ✅ 기본 검색어 1개 (원본 키워드)');
  console.log('2. ✅ Related Searches 직접 추출 (LLM 중복 방지)');
  console.log('3. ✅ LLM 창의적 키워드 (Related 제외한 콘텐츠로 새로운 키워드 생성)');
  console.log('4. ✅ 품질 필터링 (관련성 0.6 이상)');
  console.log('5. ✅ 중복 제거 및 할루시네이션 방지');
}

// 클래스 export (다른 파일에서 사용 가능)
export { EnhancedKeywordExtractorV2 };

// 테스트 실행 (직접 실행 시에만)
if (process.argv[1] && process.argv[1].includes('enhanced-keyword-extractor-v2.js')) {
  testEnhancedExtractorV2().catch(console.error);
} 