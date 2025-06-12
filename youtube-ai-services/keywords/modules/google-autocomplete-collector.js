/**
 * 🔍 Google Autocomplete 키워드 수집기 (SerpAPI Google Autocomplete)
 * 
 * 기능:
 * - 검색어 입력 시 Google에서 추천 검색어 수집
 * - relevance 기반 고품질 자동완성 기능
 * - keyword-expander 호환성 지원
 * - 폴백 시스템 포함
 * 
 * 참조: https://serpapi.com/google-autocomplete
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드 (프로젝트 루트의 .env 파일)
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * 🎯 Google Autocomplete 수집기 클래스
 */
class GoogleAutocompleteCollector {
  constructor() {
    this.apiKey = process.env.SERP_API_KEY;
    this.baseUrl = 'https://serpapi.com/search.json';  // .json 추가!
    
    // 간단한 통계
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      keywordsCollected: 0,
      startTime: Date.now()
    };
    
    console.log('🔍 Google Autocomplete Collector 초기화');
    console.log(`🔑 SerpAPI 키 상태: ${this.apiKey ? '✅ 설정됨' : '❌ 없음'}`);
  }

  /**
   * 🔍 키워드 자동완성 수집 (메인 함수)
   */
  async collectAutocomplete(keyword, options = {}) {
    const {
      language = 'ko',      // 언어 설정 (ko, en, ja 등)
      maxResults = 10       // 최대 결과 수
    } = options;

    console.log(`🚀 "${keyword}" 자동완성 수집 시작`);
    
    const startTime = Date.now();

    // API 키 확인 (실시간으로 다시 체크)
    const currentApiKey = process.env.SERP_API_KEY || this.apiKey;
    if (!currentApiKey) {
      console.warn('⚠️ SerpAPI 키가 없어 폴백 키워드 반환');
      return this.generateFallbackKeywords(keyword, maxResults);
    }
    
    this.apiKey = currentApiKey; // 업데이트

          try {
        // SerpAPI 요청
        const response = await axios.get(this.baseUrl, {
          params: {
            engine: 'google_autocomplete',
            q: keyword,
            gl: 'kr',              // 한국 지역 설정
            hl: language,
            api_key: this.apiKey
          },
          timeout: 10000
        });

        console.log(`📊 API 응답: ${response.status} (${response.data.suggestions?.length || 0}개 suggestions)`)

        const suggestions = this.parseResponse(response.data, keyword);
        const limitedSuggestions = suggestions.slice(0, maxResults);
        
        const processingTime = Date.now() - startTime;
        this.updateStats(limitedSuggestions.length, true);

        console.log(`✅ "${keyword}" 자동완성 완료: ${limitedSuggestions.length}개 (${processingTime}ms)`);

        return {
          success: true,                    // keyword-expander 호환성
          baseKeyword: keyword,
          keywords: limitedSuggestions,
          metadata: {
            totalCollected: suggestions.length,
            finalCount: limitedSuggestions.length,
            processingTime,
            fallback: false,
            timestamp: new Date().toISOString(),
            apiResponse: {
              status: response.status,
              hasData: !!response.data.suggestions,
              verbatimRelevance: response.data.verbatim_relevance
            }
          }
        };

      } catch (error) {
        console.error(`❌ "${keyword}" 자동완성 수집 실패:`, error.message);
        this.updateStats(0, false);
        
        // 실패 시 폴백 키워드 반환
        console.log('🔄 API 실패로 폴백 키워드 생성 중...');
        return this.generateFallbackKeywords(keyword, maxResults);
      }
  }

  /**
   * 📊 SerpAPI 응답 파싱 (Google Autocomplete 새 구조)
   */
  parseResponse(data, baseKeyword) {
    const suggestions = [];

    try {
      if (!data.suggestions || !Array.isArray(data.suggestions)) {
        console.warn('⚠️ 응답에 suggestions 배열이 없음');
        return [];
      }

      // relevance 순으로 정렬하여 처리
      const sortedSuggestions = data.suggestions
        .filter(suggestion => suggestion.value && suggestion.value.trim() !== baseKeyword.trim())
        .sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      sortedSuggestions.forEach((suggestion, index) => {
        const keyword = suggestion.value.trim();
        
        if (keyword && keyword !== baseKeyword.trim()) {
          suggestions.push({
            keyword: keyword,
            rank: index + 1,
            relevance: suggestion.relevance || 0,
            type: suggestion.type || 'QUERY',
            // 원본 데이터 보존 (필요시 사용)
            original: {
              value: suggestion.value,
              relevance: suggestion.relevance,
              type: suggestion.type,
              serpapi_link: suggestion.serpapi_link
            },
            collectedAt: new Date().toISOString()
          });
        }
      });

      console.log(`   📊 파싱 완료: ${suggestions.length}개 키워드 (relevance 순 정렬)`);
      
    } catch (error) {
      console.error('❌ 응답 파싱 오류:', error.message);
      console.error('파싱 오류 스택:', error.stack);
    }

    return suggestions;
  }

  /**
   * 🔄 폴백 키워드 생성 (API 실패 시)
   */
  generateFallbackKeywords(baseKeyword, maxResults = 10) {
    const patterns = [
      `${baseKeyword} 시세`,           // 가격 정보
      `${baseKeyword} 뉴스`,           // 최신 소식  
      `${baseKeyword} 전망`,           // 미래 예측
      `${baseKeyword} 차트`,           // 데이터 분석
      `${baseKeyword} 리뷰`,           // 사용 후기
      `${baseKeyword} 추천`,           // 추천 정보
      `${baseKeyword} 순위`,           // 순위 정보
      `${baseKeyword} 방법`,           // 사용 방법
      `${baseKeyword} 가이드`,         // 가이드
      `${baseKeyword} 꿀팁`,           // 팁과 노하우
      `최신 ${baseKeyword}`,           // 최신 정보
      `인기 ${baseKeyword}`,           // 인기 콘텐츠
      `${baseKeyword} 분석`,           // 분석 정보
      `${baseKeyword} 정보`,           // 기본 정보
      `${baseKeyword} 브이로그`        // 개인 경험담
    ];

    const keywords = patterns.slice(0, maxResults).map((keyword, index) => ({
      keyword,
      rank: index + 1,
      relevance: 1000 - (index * 10),    // 순서대로 relevance 감소
      type: 'fallback',
      original: null,
      collectedAt: new Date().toISOString()
    }));

    console.log(`🔄 폴백 키워드 생성 완료: ${keywords.length}개 (relevance 가중치 적용)`);

    return {
      success: true,                        // keyword-expander 호환성  
      baseKeyword,
      keywords,
      metadata: {
        totalCollected: keywords.length,
        finalCount: keywords.length,
        processingTime: 0,
        fallback: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 📊 통계 업데이트
   */
  updateStats(keywordCount, success) {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
      this.stats.keywordsCollected += keywordCount;
    } else {
      this.stats.failedRequests++;
    }
  }

  /**
   * 📊 통계 조회
   */
  getStats() {
    const runtime = Date.now() - this.stats.startTime;
    
    return {
      performance: {
        totalRequests: this.stats.totalRequests,
        successfulRequests: this.stats.successfulRequests,
        failedRequests: this.stats.failedRequests,
        successRate: this.stats.totalRequests > 0 
          ? `${((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(1)}%`
          : '0%',
        averageResponseTime: this.stats.successfulRequests > 0 
          ? `${Math.round(runtime / this.stats.successfulRequests)}ms`
          : '0ms'
      },
      keywords: {
        totalCollected: this.stats.keywordsCollected,
        averagePerRequest: this.stats.successfulRequests > 0 
          ? (this.stats.keywordsCollected / this.stats.successfulRequests).toFixed(1)
          : '0'
      },
      system: {
        apiKeyAvailable: !!this.apiKey,
        runtime: `${(runtime / 1000).toFixed(1)}s`,
        startTime: new Date(this.stats.startTime).toISOString()
      }
    };
  }
}

// 전역 인스턴스
const googleAutocompleteCollector = new GoogleAutocompleteCollector();

/**
 * 🚀 외부 사용을 위한 편의 함수들
 */

/**
 * 🔍 단일 키워드 자동완성 수집
 * 
 * @param {string} keyword - 검색할 키워드
 * @param {object} options - 옵션 설정
 * @param {string} options.language - 언어 설정 (ko, en, ja 등)
 * @param {number} options.maxResults - 최대 결과 수
 * @returns {Promise<object>} 자동완성 결과
 */
export async function collectGoogleAutocomplete(keyword, options = {}) {
  return await googleAutocompleteCollector.collectAutocomplete(keyword, options);
}

/**
 * 📊 Google Autocomplete 통계 조회
 */
export function getGoogleAutocompleteStats() {
  return googleAutocompleteCollector.getStats();
}

export default googleAutocompleteCollector; 