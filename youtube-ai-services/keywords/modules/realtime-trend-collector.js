/**
 * 📰 실시간 트렌드 뉴스 분석기
 * 상위 20개 뉴스에서 빈출 키워드 추출 및 Claude AI 분석
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Claude AI 클라이언트 초기화
let anthropic = null;
function initClaudeAPI() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ Claude API 키가 설정되지 않았습니다. 기본 분석만 실행됩니다.');
    return null;
  }
  
  try {
    anthropic = new Anthropic({
      apiKey: apiKey,
    });
    console.log('🤖 Claude API 초기화 완료');
    return anthropic;
  } catch (error) {
    console.error('❌ Claude API 초기화 실패:', error.message);
    return null;
  }
}

/**
 * 🌐 Google News API로 뉴스 수집
 */
async function collectNewsData(keyword) {
  const apiKey = process.env.SERP_API_KEY;
  
  if (!apiKey) {
    throw new Error('SERP_API_KEY가 설정되지 않았습니다.');
  }

  try {
    console.log('🌐 뉴스 API 요청 중...');
    
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_news',
        q: keyword,
        hl: 'ko',
        gl: 'kr',
        num: 20,
        api_key: apiKey
      },
      timeout: 10000
    });

    console.log(`✅ API 응답 완료: ${response.status}`);
    
    if (!response.data.news_results || response.data.news_results.length === 0) {
      throw new Error('뉴스 결과가 없습니다.');
    }

    return response.data.news_results.slice(0, 20);

  } catch (error) {
    console.error('❌ 뉴스 API 요청 실패:', error.message);
    throw error;
  }
}

/**
 * 🔍 빈출 키워드 분석
 */
function analyzeFrequentKeywords(newsData) {
  console.log('\n🔍 ===== 빈출 키워드 분석 =====');
  
  const keywordCount = new Map();
  const stopWords = new Set([
    '있다', '있는', '있을', '있어', '있고', '있었다', '있습니다',
    '하다', '하는', '하고', '했다', '합니다', '한다', '할', '해',
    '되다', '되는', '된', '됐다', '됩니다', '될', '되어',
    '이다', '인', '이', '가', '을', '를', '에', '의', '와', '과', '도',
    '그', '이', '저', '것', '수', '등', '때', '곳', '말', '일',
    '오늘', '어제', '내일', '이번', '다음', '지난', '현재', '당시',
    '오전', '오후', '새벽', '밤', '낮', '아침', '저녁',
    '월', '화', '수', '목', '금', '토', '일', '요일',
    '1일', '2일', '3일', '4일', '5일', '6일', '7일', '8일', '9일', '10일',
    '속보', '뉴스', '기사', '보도', '취재', '사진', '영상', '포토'
  ]);

  // 모든 뉴스 제목에서 키워드 추출
  newsData.forEach(news => {
    const title = news.title || '';
    const words = title
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.has(word))
      .map(word => word.toLowerCase());
      
    words.forEach(word => {
      keywordCount.set(word, (keywordCount.get(word) || 0) + 1);
    });
  });

  // 빈도순 정렬 및 상위 10개 선택
  const sortedKeywords = Array.from(keywordCount.entries())
    .filter(([word, count]) => count >= 2) // 2회 이상 출현
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  console.log('📊 빈출 키워드 (상위 10개):');
  sortedKeywords.forEach((keyword, index) => {
    console.log(`   ${index + 1}. "${keyword.word}" (${keyword.count}회)`);
  });

  return sortedKeywords;
}

/**
 * 🤖 Claude AI로 실시간 트렌드 분석
 */
async function analyzeWithClaudeAI(keyword, newsData, frequentKeywords) {
  if (!anthropic) {
    console.log('⚠️ Claude API를 사용할 수 없습니다. 기본 분석 결과를 반환합니다.');
    return null;
  }
  
  console.log('\n🤖 ===== Claude AI 실시간 트렌드 분석 =====');
  
  try {
    const newsText = newsData.slice(0, 10)
      .map((news, index) => `${index + 1}. ${news.title} (${news.source || '출처 불명'})`)
      .join('\n');
    
    const keywordsText = frequentKeywords.slice(0, 10)
      .map((kw, index) => `${index + 1}. "${kw.word}" (${kw.count}회)`)
      .join('\n');
    
    const prompt = `실시간 트렌드 분석 요청:

키워드: "${keyword}"

상위 뉴스 (${newsData.length}개 중 10개):
${newsText}

빈출 키워드 (상위 10개):
${keywordsText}

위 데이터를 분석해서 다음을 생성해 주세요:

1. **트렌드 핵심 분석**
   - 이 키워드의 현재 트렌드 상황은?
   - 뉴스의 주요 맥락과 흐름은?
   - 대중의 관심도와 감정은?

2. **YouTube Shorts 맞춤형 키워드 10개** (한국어)
   - **반드시 "${keyword}"를 포함하여 정확히 3단어로 구성** (예: "${keyword} 화재 현장", "${keyword} 문화재 보호")
   - 검색량이 높을 만한 간결한 키워드
   - 감정적으로 매력적인 키워드
   - 트렌드를 반영한 키워드
   - 실시간 검색에 적합한 키워드

응답은 JSON 형식으로 해주세요:
{
  "trendAnalysis": {
    "currentStatus": "현재 트렌드 상황",
    "newsContext": "뉴스 주요 맥락",
    "publicInterest": "대중 관심도"
  },
  "youtubeKeywords": [
    "키워드1",
    "키워드2",
    "키워드3",
    "키워드4",
    "키워드5",
    "키워드6",
    "키워드7",
    "키워드8",
    "키워드9",
    "키워드10"
  ]
}`;

    console.log('🤖 Claude AI 트렌드 분석 요청 중...');
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1200,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    const responseText = message.content[0].text;
    console.log('✅ Claude AI 분석 완료');
    
    try {
      const claudeAnalysis = JSON.parse(responseText);
      
      console.log('\n📊 트렌드 분석 결과:');
      console.log(`   🎯 현재 상황: ${claudeAnalysis.trendAnalysis.currentStatus}`);
      console.log(`   📰 뉴스 맥락: ${claudeAnalysis.trendAnalysis.newsContext}`);
      console.log(`   👥 대중 관심: ${claudeAnalysis.trendAnalysis.publicInterest}`);
      
      console.log('\n🤖 Claude AI 추천 키워드 (전체):');
      claudeAnalysis.youtubeKeywords.forEach((keyword, index) => {
        console.log(`   ${index + 1}. "${keyword}"`);
      });
      
      // 상위 2개만 선택
      const top2Keywords = claudeAnalysis.youtubeKeywords.slice(0, 2);
      console.log('\n🔥 선택된 상위 2개 키워드:');
      top2Keywords.forEach((keyword, index) => {
        console.log(`   ${index + 1}. "${keyword}" ⭐`);
      });
      
      return {
        trendAnalysis: claudeAnalysis.trendAnalysis,
        allKeywords: claudeAnalysis.youtubeKeywords,
        selectedKeywords: top2Keywords
      };
      
    } catch (parseError) {
      console.error('❌ Claude 응답 JSON 파싱 실패:', parseError.message);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Claude AI 분석 실패:', error.message);
    return null;
  }
}

/**
 * 🌟 최종 키워드 통합 (5개)
 */
function generateFinalKeywords(keyword, frequentKeywords, claudeAnalysis) {
  console.log('\n🌟 ===== 최종 추천 키워드 통합 =====');
  
  const finalKeywords = [];
  
  // 1. 기본 검색어 1개
  finalKeywords.push({
    keyword: keyword,
    type: '기본',
    source: '기본 검색어',
    confidence: 'high'
  });
  
  // 2. 빈출 키워드 조합 2개
  if (frequentKeywords.length >= 2) {
    // 첫 번째 빈출 조합
    finalKeywords.push({
      keyword: `${keyword} ${frequentKeywords[1].word}`,
      type: '빈출',
      source: `빈출 조합 (${frequentKeywords[1].count}회)`,
      confidence: 'medium'
    });
    
    // 두 번째 빈출 조합 (3번째 키워드 사용)
    if (frequentKeywords.length >= 3) {
      finalKeywords.push({
        keyword: `${keyword} ${frequentKeywords[2].word}`,
        type: '빈출',
        source: `빈출 조합 (${frequentKeywords[2].count}회)`,
        confidence: 'medium'
      });
    }
  }
  
  // 3. AI 추천 키워드 2개
  if (claudeAnalysis && claudeAnalysis.selectedKeywords) {
    claudeAnalysis.selectedKeywords.forEach(kw => {
      finalKeywords.push({
        keyword: kw,
        type: 'AI',
        source: 'Claude AI 추천',
        confidence: 'high'
      });
    });
  }
  
  // 5개로 맞추기 (부족한 경우 폴백)
  while (finalKeywords.length < 5) {
    finalKeywords.push({
      keyword: `${keyword} 현장`,
      type: '폴백',
      source: '폴백 키워드',
      confidence: 'low'
    });
  }
  
  console.log('🎯 최종 키워드 구성:');
  finalKeywords.slice(0, 5).forEach((item, index) => {
    const typeIcon = {
      '기본': '🔷',
      '빈출': '📊', 
      'AI': '🤖',
      '폴백': '⚡'
    }[item.type] || '❓';
    
    console.log(`   ${index + 1}. "${item.keyword}" ${typeIcon} (${item.source})`);
  });
  
  return finalKeywords.slice(0, 5);
}

/**
 * 🎯 실시간 트렌드 분석 (메인 함수)
 */
export async function analyzeRealtimeTrend(keyword) {
  try {
    console.log(`🎯 ===== "${keyword}" 실시간 트렌드 분석 =====`);
    
    // Claude API 초기화
    initClaudeAPI();
    
    // 1. 뉴스 데이터 수집
    const newsData = await collectNewsData(keyword);
    console.log(`📊 수집된 뉴스: ${newsData.length}개`);
    
    // 2. 빈출 키워드 분석
    const frequentKeywords = analyzeFrequentKeywords(newsData);
    
    // 3. Claude AI 분석
    const claudeAnalysis = await analyzeWithClaudeAI(keyword, newsData, frequentKeywords);
    
    // 4. 최종 키워드 생성
    const finalKeywords = generateFinalKeywords(keyword, frequentKeywords, claudeAnalysis);
    
    // 5. 결과 반환
    const result = {
      keyword,
      timestamp: new Date().toISOString(),
      newsCount: newsData.length,
      finalKeywords: finalKeywords.map(item => ({
        keyword: item.keyword,
        type: item.type,
        confidence: item.confidence
      })),
      trendAnalysis: claudeAnalysis?.trendAnalysis || null
    };
    
    console.log(`\n💾 실시간 트렌드 분석 완료`);
    return result;
    
  } catch (error) {
    console.error('❌ 실시간 트렌드 분석 실패:', error.message);
    throw error;
  }
}

export default { analyzeRealtimeTrend }; 