/**
 * 🌟 ZUM 트렌드 수집기 (ZUM Trends Collector)
 * 
 * ZUM 검색 페이지에서 실시간 이슈 키워드 수집
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

class ZumTrendsCollector {
  constructor() {
    this.url = 'https://search.zum.com/search.zum?method=uni&option=accu&qm=f_typing&rd=1&query=%EC%8B%A4%EC%8B%9C%EA%B0%84+%EA%B2%80%EC%83%89%EC%96%B4';
    this.selector = '.issue-keyword-wrapper span.txt';
  }

  /**
   * 🌟 ZUM 트렌드 수집
   */
  async collectZumTrends(options = {}) {
    const { maxKeywords = 50 } = options;
    
    console.log('🌟 ZUM 트렌드 수집 시작...');
    
    try {
      // HTML 가져오기
      const response = await axios({
        method: 'GET',
        url: this.url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      // 파싱
      const $ = cheerio.load(response.data);
      const trends = [];
      const seen = new Set();
      
      $(this.selector).each((index, element) => {
        if (trends.length >= maxKeywords) return false;
        
        const keyword = $(element).text().trim();
        if (keyword && keyword.length > 1 && !seen.has(keyword)) {
          seen.add(keyword);
          trends.push({
            keyword,
            rank: trends.length + 1,
            source: 'zum',
            category: 'news',
            timestamp: new Date().toISOString()
          });
        }
      });

      console.log(`✅ ZUM 트렌드 ${trends.length}개 수집 완료`);
      
      // ZUM 트렌드 출력
      this.displayZumTrends(trends);
      
      return { trends };

    } catch (error) {
      console.error(`❌ ZUM 트렌드 수집 실패: ${error.message}`);
      return { trends: [] };
    }
  }

  /**
   * 📰 ZUM 트렌드 출력
   */
  displayZumTrends(trends) {
    if (trends?.length > 0) {
      console.log('\n📋 ===== 📰 ZUM 실시간 이슈 =====');
      console.log(`총 ${trends.length}개의 ZUM 트렌드:`);
      
      trends.forEach((trend, index) => {
        console.log(`${String(index + 1).padStart(3, ' ')}. ${trend.keyword}`);
      });
      
      console.log('===== ZUM 트렌드 끝 =====\n');
    }
  }
}

/**
 * 🌟 ZUM 트렌드 수집 (외부 API)
 */
export async function collectZumTrends(options = {}) {
  const collector = new ZumTrendsCollector();
  return await collector.collectZumTrends(options);
} 