#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🧠 지능형 쿼리 워크플로우 테스트');
console.log('🎯 자연어 입력 → 키워드 추출 → 웹 검색 → YouTube 쿼리 최적화 → 영상 검색\n');

class IntelligentQueryWorkflow {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
    });
    this.mcpClient = null;
    this.workflowResults = {};
  }

  async connectToMCP() {
    try {
      const serverPath = path.resolve(__dirname, '../../mcp-servers/youtube-curator-mcp/index.js');
      
      console.log('📡 MCP 서버 연결 중...');
      
      const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
        env: {
          ...process.env,
          YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          SERPAPI_KEY: process.env.SERPAPI_KEY
        }
      });

      this.mcpClient = new Client({
        name: "intelligent-workflow-tester",
        version: "1.0.0"
      }, {
        capabilities: {}
      });

      await this.mcpClient.connect(transport);
      console.log('✅ MCP 서버 연결 성공!\n');

    } catch (error) {
      console.error('❌ MCP 서버 연결 실패:', error);
      throw error;
    }
  }

  // 1단계: 자연어 입력에서 키워드 추출
  async extractKeywordsFromNaturalLanguage(userInput) {
    console.log('🔍 1단계: 자연어에서 키워드 추출');
    console.log('=' * 60);
    console.log(`입력: "${userInput}"`);

    try {
      const prompt = `다음 사용자 입력에서 YouTube Shorts 검색에 적합한 핵심 키워드를 추출해주세요:

사용자 입력: "${userInput}"

다음 JSON 형태로 응답해주세요:
{
  "primaryKeywords": ["주요 키워드 1-3개"],
  "secondaryKeywords": ["보조 키워드 2-5개"],
  "context": {
    "intent": "검색 의도 (예: 힐링, 정보, 엔터테인먼트)",
    "mood": "감정/분위기 (예: 피곤함, 스트레스, 흥미)",
    "timeContext": "시간 관련성 (예: 최신, 일반, 특정 시기)",
    "category": "예상 카테고리 (예: 음악, 게임, 라이프스타일)"
  },
  "searchHints": ["검색 힌트나 추가 정보"]
}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const extractedData = JSON.parse(response.content[0].text);
      
      console.log('✅ 키워드 추출 완료:');
      console.log(`   주요 키워드: ${extractedData.primaryKeywords.join(', ')}`);
      console.log(`   보조 키워드: ${extractedData.secondaryKeywords.join(', ')}`);
      console.log(`   검색 의도: ${extractedData.context.intent}`);
      console.log(`   시간 관련성: ${extractedData.context.timeContext}\n`);

      this.workflowResults.step1_extraction = extractedData;
      return extractedData;

    } catch (error) {
      console.error('❌ 키워드 추출 실패:', error);
      // 폴백: 간단한 키워드 추출
      const fallbackKeywords = userInput.replace(/[^\w\s가-힣]/g, '').split(/\s+/).filter(word => word.length > 1);
      const fallback = {
        primaryKeywords: fallbackKeywords.slice(0, 2),
        secondaryKeywords: fallbackKeywords.slice(2, 5),
        context: { intent: 'general', mood: 'neutral', timeContext: 'general', category: 'entertainment' },
        searchHints: []
      };
      
      this.workflowResults.step1_extraction = fallback;
      return fallback;
    }
  }

  // 2단계: 키워드별 확장 및 컨텍스트 수집
  async expandKeywordsWithContext(extractedData) {
    console.log('🔎 2단계: 키워드 확장 및 컨텍스트 수집');
    console.log('=' * 60);

    const expandedResults = {};

    // 주요 키워드 확장
    for (const keyword of extractedData.primaryKeywords) {
      console.log(`🔍 주요 키워드 "${keyword}" 확장 중...`);
      
      try {
        const result = await this.mcpClient.callTool({
          name: 'expand_keyword',
          arguments: {
            keyword: keyword,
            options: {
              maxKeywords: 15,
              includeChannels: true,
              includeTimeFilters: extractedData.context.timeContext !== 'general'
            }
          }
        });

        const expansionData = JSON.parse(result.content[0].text);
        expandedResults[keyword] = expansionData;

        console.log(`   ✅ 확장 완료: ${expansionData.expanded?.length || 0}개 키워드`);
        console.log(`   📊 카테고리: ${Object.keys(expansionData.categories || {}).join(', ')}`);
        
        if (expansionData.suggestions?.channels?.length > 0) {
          console.log(`   📺 추천 채널: ${expansionData.suggestions.channels.slice(0, 3).map(c => c.name).join(', ')}`);
        }

        // API 호출 간격
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ "${keyword}" 확장 실패:`, error.message);
        expandedResults[keyword] = { expanded: [keyword], categories: {}, suggestions: {} };
      }
    }

    console.log('\n📋 키워드 확장 요약:');
    Object.entries(expandedResults).forEach(([keyword, data]) => {
      console.log(`   "${keyword}": ${data.expanded?.length || 0}개 확장 키워드`);
    });

    this.workflowResults.step2_expansion = expandedResults;
    return expandedResults;
  }

  // 3단계: 최적화된 YouTube 쿼리 생성
  async buildOptimizedQueries(extractedData, expandedResults) {
    console.log('\n🔧 3단계: 최적화된 YouTube 쿼리 생성');
    console.log('=' * 60);

    const allQueries = [];

    for (const keyword of extractedData.primaryKeywords) {
      console.log(`⚙️ "${keyword}"에 대한 쿼리 최적화 중...`);
      
      try {
        const result = await this.mcpClient.callTool({
          name: 'build_optimized_queries',
          arguments: {
            keyword: keyword,
            strategy: 'auto', // auto, channel_focused, category_focused, keyword_expansion, time_sensitive
            maxResults: 15
          }
        });

        const queryData = JSON.parse(result.content[0].text);
        allQueries.push(...queryData.queries || []);

        console.log(`   ✅ 쿼리 생성 완료: ${queryData.queries?.length || 0}개`);
        console.log(`   📊 전략: ${queryData.strategy?.join(', ') || 'basic'}`);
        console.log(`   💰 예상 API 비용: ${queryData.estimatedApiUnits || 0} units`);

        // 상위 3개 쿼리 미리보기
        if (queryData.queries && queryData.queries.length > 0) {
          console.log('   🔍 생성된 쿼리 예시:');
          queryData.queries.slice(0, 3).forEach((query, index) => {
            console.log(`      ${index + 1}. "${query.query}" (${query.type}, ${query.estimatedUnits || 107} units)`);
          });
        }

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ "${keyword}" 쿼리 생성 실패:`, error.message);
        // 폴백 쿼리
        allQueries.push({
          query: keyword,
          type: 'basic_search',
          priority: 'medium',
          estimatedUnits: 107,
          maxResults: 15
        });
      }
    }

    // 쿼리 중복 제거 및 우선순위 정렬
    const uniqueQueries = this.deduplicateQueries(allQueries);
    const sortedQueries = uniqueQueries.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    });

    console.log(`\n📊 최종 쿼리 요약:`);
    console.log(`   총 생성: ${allQueries.length}개 → 최적화 후: ${sortedQueries.length}개`);
    console.log(`   총 예상 비용: ${sortedQueries.reduce((sum, q) => sum + (q.estimatedUnits || 107), 0)} API units`);

    this.workflowResults.step3_queries = sortedQueries;
    return sortedQueries;
  }

  // 4단계: 실제 YouTube 검색 실행
  async executeYouTubeSearches(queries, maxQueries = 3) {
    console.log('\n🎬 4단계: YouTube 검색 실행');
    console.log('=' * 60);

    const searchResults = [];
    const executedQueries = queries.slice(0, maxQueries); // API 할당량 고려

    for (const [index, queryObj] of executedQueries.entries()) {
      console.log(`🔍 검색 ${index + 1}/${executedQueries.length}: "${queryObj.query}"`);
      
      try {
        const result = await this.mcpClient.callTool({
          name: 'search_playable_shorts',
          arguments: {
            query: queryObj.query,
            maxResults: queryObj.maxResults || 10,
            filters: {
              order: queryObj.order || 'relevance',
              uploadDate: queryObj.timeFilter || 'any',
              channelId: queryObj.channelId || null
            }
          }
        });

        const searchData = JSON.parse(result.content[0].text);
        searchResults.push({
          query: queryObj.query,
          type: queryObj.type,
          results: searchData.results || [],
          totalFound: searchData.totalResults || 0,
          filteringSuccess: searchData.filteringSuccess || 0
        });

        console.log(`   ✅ 완료: ${searchData.totalResults || 0}개 영상 (필터링 성공률: ${searchData.filteringSuccess || 0}%)`);
        
        // 상위 3개 영상 미리보기
        if (searchData.results && searchData.results.length > 0) {
          console.log('   📺 상위 영상:');
          searchData.results.slice(0, 3).forEach((video, vidIndex) => {
            console.log(`      ${vidIndex + 1}. ${video.title} (${video.channelTitle}, ${video.viewCount?.toLocaleString()} views)`);
          });
        }

        // API 제한 고려 딜레이
        if (index < executedQueries.length - 1) {
          console.log('   ⏳ 1초 대기...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`   ❌ 검색 실패:`, error.message);
        searchResults.push({
          query: queryObj.query,
          type: queryObj.type,
          error: error.message,
          results: []
        });
      }
    }

    this.workflowResults.step4_results = searchResults;
    return searchResults;
  }

  // 최종 결과 분석 및 요약
  generateFinalReport(userInput) {
    console.log('\n📊 최종 워크플로우 결과 분석');
    console.log('=' * 80);

    const { step1_extraction, step2_expansion, step3_queries, step4_results } = this.workflowResults;

    // 전체 통계
    const totalVideosFound = step4_results?.reduce((sum, search) => sum + (search.totalFound || 0), 0) || 0;
    const successfulSearches = step4_results?.filter(search => !search.error && search.totalFound > 0).length || 0;
    const averageFilteringSuccess = step4_results?.length > 0 ? 
      Math.round(step4_results.reduce((sum, search) => sum + (search.filteringSuccess || 0), 0) / step4_results.length) : 0;

    console.log(`🎯 원본 입력: "${userInput}"`);
    console.log(`🔍 추출된 키워드: ${step1_extraction?.primaryKeywords?.length || 0}개 주요 + ${step1_extraction?.secondaryKeywords?.length || 0}개 보조`);
    console.log(`📈 확장된 키워드: ${Object.values(step2_expansion || {}).reduce((sum, data) => sum + (data.expanded?.length || 0), 0)}개`);
    console.log(`⚙️ 생성된 쿼리: ${step3_queries?.length || 0}개`);
    console.log(`🎬 검색 성공률: ${successfulSearches}/${step4_results?.length || 0} (${Math.round((successfulSearches / (step4_results?.length || 1)) * 100)}%)`);
    console.log(`📺 총 발견 영상: ${totalVideosFound}개`);
    console.log(`✅ 평균 필터링 성공률: ${averageFilteringSuccess}%`);

    // 카테고리별 결과
    if (step4_results && step4_results.length > 0) {
      console.log('\n📋 검색 결과별 요약:');
      step4_results.forEach((search, index) => {
        const status = search.error ? '❌' : search.totalFound > 0 ? '✅' : '⚠️';
        console.log(`   ${index + 1}. ${status} "${search.query}" → ${search.totalFound || 0}개 영상 (${search.type})`);
      });
    }

    // 상위 추천 영상들
    const allVideos = step4_results?.flatMap(search => search.results || []) || [];
    if (allVideos.length > 0) {
      console.log('\n🏆 최종 추천 영상 (상위 5개):');
      allVideos
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 5)
        .forEach((video, index) => {
          console.log(`   ${index + 1}. ${video.title}`);
          console.log(`      채널: ${video.channelTitle} | 조회수: ${video.viewCount?.toLocaleString()} | 길이: ${video.duration}`);
          console.log(`      URL: https://www.youtube.com/watch?v=${video.id}`);
        });
    }

    // JSON 형태로 전체 결과 반환
    const finalResult = {
      originalInput: userInput,
      workflow: {
        step1_keywordExtraction: step1_extraction,
        step2_keywordExpansion: step2_expansion,
        step3_queryOptimization: step3_queries,
        step4_youtubeSearch: step4_results
      },
      summary: {
        totalVideosFound,
        successfulSearches,
        totalSearches: step4_results?.length || 0,
        averageFilteringSuccess,
        recommendedVideos: allVideos.slice(0, 10)
      },
      timestamp: new Date().toISOString()
    };

    return finalResult;
  }

  // 쿼리 중복 제거
  deduplicateQueries(queries) {
    const seen = new Set();
    return queries.filter(query => {
      const key = query.query.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // 전체 워크플로우 실행
  async runCompleteWorkflow(userInput) {
    try {
      await this.connectToMCP();

      console.log(`🚀 전체 워크플로우 시작: "${userInput}"`);
      console.log('=' * 100);

      // 1단계: 키워드 추출
      const extractedData = await this.extractKeywordsFromNaturalLanguage(userInput);

      // 2단계: 키워드 확장
      const expandedResults = await this.expandKeywordsWithContext(extractedData);

      // 3단계: 쿼리 최적화
      const optimizedQueries = await this.buildOptimizedQueries(extractedData, expandedResults);

      // 4단계: YouTube 검색
      const searchResults = await this.executeYouTubeSearches(optimizedQueries, 3);

      // 최종 분석
      const finalReport = this.generateFinalReport(userInput);

      return finalReport;

    } catch (error) {
      console.error('❌ 워크플로우 실행 실패:', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
  }
}

// 메인 실행
async function main() {
  const workflow = new IntelligentQueryWorkflow();
  
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('❌ 사용법: node intelligent-query-workflow.js "자연어 입력"');
      console.log('예시: node intelligent-query-workflow.js "피곤해서 힐링되는 영상 보고 싶어"');
      process.exit(1);
    }

    const userInput = args.join(' ');
    const result = await workflow.runCompleteWorkflow(userInput);

    console.log('\n💾 전체 결과를 JSON 파일로 저장...');
    const fs = await import('fs');
    const filename = `workflow-result-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    console.log(`✅ 저장 완료: ${filename}`);

  } catch (error) {
    console.error('❌ 실행 실패:', error);
  } finally {
    await workflow.cleanup();
    process.exit(0);
  }
}

// 스크립트 직접 실행 시 main 함수 호출
main().catch(console.error);

export default IntelligentQueryWorkflow; 