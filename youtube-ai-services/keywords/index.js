/**
 * 🎯 YouTube Shorts AI 키워드 추출 시스템 (통합 모듈)
 * 
 * 완성된 3개 모듈 통합:
 * 1. youtube-keyword-extractor.js (메인 고품질)
 * 2. google-autocomplete-collector.js (자동완성)  
 * 3. realtime-trend-collector.js (실시간 트렌드)
 */

import { EnhancedKeywordExtractorV2 } from './modules/youtube-keyword-extractor.js';
import { collectGoogleAutocomplete } from './modules/google-autocomplete-collector.js';
import { analyzeRealtimeTrend } from './modules/realtime-trend-collector.js';

// 모듈 인스턴스 초기화
const youtubeExtractor = new EnhancedKeywordExtractorV2();

/**
 * 🚀 빠른 키워드 추출 (일반 검색용)
 * 고품질 메인 + 자동완성 조합 (24초, 39개 키워드)
 */
export async function extractKeywordsFast(keyword, options = {}) {
  const {
    includeMetadata = true,
    relevanceThreshold = 0.6
  } = options;

  console.log(`🚀 "${keyword}" 빠른 키워드 추출 시작 (2개 모듈)`);
  
  const startTime = Date.now();

  try {
    // 병렬 처리로 속도 최적화
    const [mainResult, autocompleteResult] = await Promise.all([
      youtubeExtractor.extractKeywords(keyword, {
        includeMetadata,
        relevanceThreshold
      }),
      collectGoogleAutocomplete(keyword, { maxResults: 10 })
    ]);

    const processingTime = Date.now() - startTime;

    if (mainResult.success && autocompleteResult.success) {
      // 결과 통합
      const combinedKeywords = [
        ...mainResult.extractedKeywords,
        ...autocompleteResult.keywords.map(k => ({
          keyword: k.keyword,
          source: 'google_autocomplete',
          relevance: k.relevance || 500,
          rank: k.rank,
          collectedAt: k.collectedAt
        }))
      ];

      // 중복 제거 및 relevance 순 정렬
      const uniqueKeywords = removeDuplicateKeywords(combinedKeywords);

      console.log(`✅ 빠른 추출 완료: ${uniqueKeywords.length}개 키워드 (${(processingTime/1000).toFixed(1)}초)`);

      return {
        success: true,
        mode: 'fast',
        keyword,
        totalKeywords: uniqueKeywords.length,
        keywords: uniqueKeywords,
        sources: {
          main: mainResult.extractedKeywords.length,
          autocomplete: autocompleteResult.keywords.length
        },
        metadata: {
          processingTime,
          averageRelevance: calculateAverageRelevance(uniqueKeywords),
          mainQuality: mainResult.metadata?.averageRelevance,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      throw new Error('하나 이상의 모듈에서 실패');
    }

  } catch (error) {
    console.error(`❌ 빠른 키워드 추출 실패:`, error.message);
    
    return {
      success: false,
      mode: 'fast',
      keyword,
      error: error.message,
      fallback: true
    };
  }
}

/**
 * 📈 트렌드 키워드 확장 (트렌드 키워드용)
 * 실시간 트렌드 특화 (15초, 5개 키워드)
 */
export async function extractTrendKeywords(trendKeyword, options = {}) {
  console.log(`📈 "${trendKeyword}" 트렌드 키워드 확장 시작`);
  
  const startTime = Date.now();

  try {
    const trendResult = await analyzeRealtimeTrend(trendKeyword);
    const processingTime = Date.now() - startTime;

    console.log(`✅ 트렌드 추출 완료: ${trendResult.finalKeywords?.length || 0}개 키워드 (${(processingTime/1000).toFixed(1)}초)`);

    return {
      success: true,
      mode: 'trend',
      keyword: trendKeyword,
      trendKeywords: trendResult.finalKeywords || [],
      trendAnalysis: trendResult.trendAnalysis,
      newsCount: trendResult.newsCount,
      metadata: {
        processingTime,
        timestamp: trendResult.timestamp
      }
    };

  } catch (error) {
    console.error(`❌ 트렌드 키워드 추출 실패:`, error.message);
    
    return {
      success: false,
      mode: 'trend',
      keyword: trendKeyword,
      error: error.message
    };
  }
}

/**
 * 🔄 중복 키워드 제거 (대소문자 무시)
 */
function removeDuplicateKeywords(keywords) {
  const seen = new Set();
  const unique = [];

  keywords.forEach(item => {
    const key = item.keyword.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  });

  // relevance 순으로 정렬
  return unique.sort((a, b) => b.relevance - a.relevance);
}

/**
 * 📊 평균 관련성 계산
 */
function calculateAverageRelevance(keywords) {
  if (keywords.length === 0) return 0;
  
  const sum = keywords.reduce((acc, k) => acc + (k.relevance || 0), 0);
  return (sum / keywords.length / 1000).toFixed(2); // 1000으로 나누어 0-1 범위로
}

/**
 * 🎯 스마트 키워드 추출 (자동 판단)
 * 키워드 특성에 따라 최적 방법 선택
 */
export async function extractKeywordsSmart(keyword, options = {}) {
  const { 
    forceMode = null,  // 'fast', 'trend' 또는 null (자동)
    ...otherOptions 
  } = options;

  // 강제 모드가 있으면 해당 모드 사용
  if (forceMode === 'fast') {
    return await extractKeywordsFast(keyword, otherOptions);
  } else if (forceMode === 'trend') {
    return await extractTrendKeywords(keyword, otherOptions);
  }

  // 자동 판단 로직 (키워드 특성 분석)
  const isTrendKeyword = await checkIfTrendKeyword(keyword);
  
  if (isTrendKeyword) {
    console.log(`🎯 "${keyword}"는 트렌드 키워드로 판단 → 트렌드 모드 사용`);
    return await extractTrendKeywords(keyword, otherOptions);
  } else {
    console.log(`🎯 "${keyword}"는 일반 키워드로 판단 → 빠른 모드 사용`);
    return await extractKeywordsFast(keyword, otherOptions);
  }
}

/**
 * 🔍 트렌드 키워드 여부 간단 판단
 */
async function checkIfTrendKeyword(keyword) {
  // 간단한 휴리스틱 판단
  const trendIndicators = [
    '사건', '사고', '논란', '화재', '사망', '결혼', '이혼', '발표', 
    '출시', '공개', '확진', '체포', '사임', '경질', '파문'
  ];
  
  const keywordLower = keyword.toLowerCase();
  return trendIndicators.some(indicator => keywordLower.includes(indicator));
}

/**
 * 📊 통합 통계 조회
 */
export function getKeywordStats() {
  return {
    extractorReady: !!youtubeExtractor,
    availableMethods: [
      'extractKeywordsFast',
      'extractTrendKeywords', 
      'extractKeywordsSmart'
    ],
    modules: {
      main: 'youtube-keyword-extractor',
      autocomplete: 'google-autocomplete-collector',
      trend: 'realtime-trend-collector'
    }
  };
}

// 개별 모듈 직접 접근 (고급 사용자용)
export {
  EnhancedKeywordExtractorV2,
  collectGoogleAutocomplete,
  analyzeRealtimeTrend
};

// 기본 export (가장 많이 사용될 빠른 모드)
export default extractKeywordsFast; 