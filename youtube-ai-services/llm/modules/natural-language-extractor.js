/**
 * 🗣️ 자연어 키워드 추출기
 * 사용자의 자연어 입력에서 YouTube Shorts 검색용 키워드를 추출하고,
 * 각 키워드별 confidence 값을 제공합니다.
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../../.env') });

class NaturalLanguageExtractor {
  constructor() {
    this.anthropic = null;
    this.initializeAPI();
    
    // 통계
    this.stats = {
      totalExtractions: 0,
      successfulExtractions: 0,
      averageProcessingTime: 0
    };
  }

  initializeAPI() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      console.log('🤖 Claude API 초기화 완료');
    } else {
      console.warn('⚠️ ANTHROPIC_API_KEY 없음');
    }
  }

  async extractKeywords(userInput, inputType, maxKeywords = 5) {
    console.log(`🗣️ 키워드 추출: "${userInput}" (타입: ${inputType})`);
    const startTime = Date.now();

    try {
      this.stats.totalExtractions++;

      // 타입 검증
      if (!['emotion', 'topic'].includes(inputType)) {
        throw new Error(`지원하지 않는 입력 타입: ${inputType}`);
      }

      console.log(`   🎯 선택된 타입: ${inputType}`);

      // 타입별 키워드 추출 전략
      let result = null;
      if (this.anthropic) {
        result = await this.claudeExtractWithType(userInput, inputType, maxKeywords);
      }

      // 폴백 처리 (Claude 실패 시)
      if (!result) {
        result = this.simpleFallback(userInput, maxKeywords);
      }

      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);

      return {
        success: true,
        inputType: inputType,
        originalInput: userInput, // 🎯 사용자 원본 입력 추가
        
        // 새로운 하이브리드 구조
        directSearch: result.directSearch,
        expansionTerms: result.expansionTerms,
        
        // 기존 호환성
        keywords: result.keywords,
        
        analysis: result.analysis,
        confidence: result.confidence || 0.8,
        processingTime
      };

    } catch (error) {
      console.error('❌ 키워드 추출 실패:', error.message);
      this.updateStats(false, Date.now() - startTime);
      
      return {
        success: false,
        error: error.message,
        fallbackKeywords: this.emergencyFallback(userInput)
      };
    }
  }

  /**
   * 🤖 타입별 Claude API 호출
   */
  async claudeExtractWithType(input, inputType, maxKeywords) {
    let prompt = '';

    if (inputType === 'emotion') {
      prompt = `사용자의 감정 상태를 분석하여 YouTube Shorts 검색용 키워드를 생성해주세요:

사용자 입력: "${input}"

감정 분석 후 2가지 타입의 키워드를 JSON으로 제공:
1. direct_search: 바로 검색할 적당히 구체적인 키워드 (3-4개)
2. expansion_terms: 관련 추천용 간단한 키워드 (2-3개)

키워드는 적당히 구체적으로 (너무 세세하지 않게):
❌ "2023년 가을 비오는날 카페 재즈 피아노 연주"
✅ "비오는 날 카페 음악", "힐링 재즈"

{
  "emotion": "감정 상태 (tired/sad/stressed/bored/lonely/happy)",
  "direct_search": ["힐링 피아노", "ASMR 영상", "차분한 음악"],
  "expansion_terms": ["힐링", "ASMR", "음악"],
  "overall_confidence": 0.89
}`;
    } else if (inputType === 'topic') {
      prompt = `주제 키워드를 추출하고 YouTube Shorts 검색용 키워드를 생성해주세요:

사용자 입력: "${input}"

주제 분석 후 2가지 타입의 키워드를 JSON으로 제공:
1. direct_search: 바로 검색할 적당히 구체적인 키워드 (3-4개)
2. expansion_terms: 관련 추천용 간단한 키워드 (2-3개)

키워드는 적당히 구체적으로 (너무 세세하지 않게):
❌ "2023 LCK Summer 결승전 T1 vs GenG 하이라이트"
✅ "LCK 하이라이트", "롤드컵 명경기"

{
  "topic": "주제 분야 (game/food/exercise/study/travel/music)",
  "direct_search": ["LCK 하이라이트", "롤드컵 명경기", "게임 베스트"],
  "expansion_terms": ["게임", "하이라이트", "롤"],
  "overall_confidence": 0.91
}`;
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 하이브리드 키워드 파싱
        const directSearch = Array.isArray(parsed.direct_search) ? parsed.direct_search : [];
        const expansionTerms = Array.isArray(parsed.expansion_terms) ? parsed.expansion_terms : [];
        
        // 호환성을 위해 기존 형식도 지원
        const allKeywords = [...directSearch, ...expansionTerms];
        
        return {
          // 새로운 하이브리드 구조
          directSearch: directSearch,
          expansionTerms: expansionTerms,
          
          // 기존 호환성
          keywords: allKeywords,
          
          analysis: {
            emotion: parsed.emotion || null,
            topic: parsed.topic || null,
            confidence: parsed.overall_confidence || 0.8
          },
          confidence: parsed.overall_confidence || 0.8
        };
      }
    } catch (error) {
      console.error('Claude 추출 실패:', error.message);
    }
    
    return null;
  }

  /**
   * 🔄 간단한 폴백 처리
   */
  simpleFallback(input, maxKeywords) {
    console.log(`   🔄 간단 폴백 처리`);
    
    // 입력에서 기본 키워드 추출
    const words = input
      .replace(/[^\w\s가-힣]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1);

    // 절반은 직접 검색용, 절반은 확장용으로 분할
    const mid = Math.ceil(words.length / 2);
    const directSearch = words.slice(0, mid).slice(0, 3);
    const expansionTerms = words.slice(mid).slice(0, 3);

    return {
      directSearch: directSearch,
      expansionTerms: expansionTerms,
      keywords: [...directSearch, ...expansionTerms], // 호환성
      analysis: {
        emotion: null,
        topic: null,
        confidence: 0.6
      }
    };
  }

  /**
   * 🚨 비상 폴백
   */
  emergencyFallback(input) {
    // 매우 간단한 비상 폴백
    const words = input.split(/\s+/).filter(w => w.length > 1).slice(0, 3);
    return words.length > 0 ? words : ['추천', '영상']; // 기본 키워드
  }

  updateStats(success, time) {
    if (success) this.stats.successfulExtractions++;
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalExtractions - 1) + time) / 
      this.stats.totalExtractions;
  }

  getStats() {
    return {
      ...this.stats,
      successRate: ((this.stats.successfulExtractions / this.stats.totalExtractions) * 100).toFixed(1) + '%',
      claudeAvailable: !!this.anthropic
    };
  }
}

// 전역 인스턴스
const extractor = new NaturalLanguageExtractor();

// 편의 함수들
export async function extractKeywordsFromText(userInput, inputType, maxKeywords = 5) {
  return await extractor.extractKeywords(userInput, inputType, maxKeywords);
}

export async function quickExtract(userInput, inputType) {
  const result = await extractor.extractKeywords(userInput, inputType, 3);
  return result.success ? {
    directSearch: result.directSearch,
    expansionTerms: result.expansionTerms
  } : { directSearch: [], expansionTerms: [] };
}

export function getStats() {
  return extractor.getStats();
}

export default extractor; 