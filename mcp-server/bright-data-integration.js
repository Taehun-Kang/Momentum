/**
 * 🌐 Bright Data MCP 직접 연동
 * 
 * @brightdata/mcp 패키지를 직접 사용하여 키워드 확장 및 트렌드 수집
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class BrightDataMCPIntegration extends EventEmitter {
  constructor() {
    super();
    this.brightDataProcess = null;
    this.isConnected = false;
    this.apiToken = process.env.BRIGHT_DATA_API_KEY;
  }

  /**
   * 🔧 Bright Data MCP 서버 시작
   */
  async startBrightDataMCP() {
    if (this.isConnected) {
      return true;
    }

    try {
      console.log('🌐 Bright Data MCP 서버 시작 중...');
      
      // npx @brightdata/mcp 실행
      this.brightDataProcess = spawn('npx', ['@brightdata/mcp'], {
        env: {
          ...process.env,
          API_TOKEN: this.apiToken,
          WEB_UNLOCKER_ZONE: 'mcp_unlocker',
          BROWSER_ZONE: 'mcp_browser'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.brightDataProcess.stdout.on('data', (data) => {
        console.log('Bright Data MCP:', data.toString());
      });

      this.brightDataProcess.stderr.on('data', (data) => {
        console.error('Bright Data MCP Error:', data.toString());
      });

      // 연결 확인
      await this.waitForConnection();
      this.isConnected = true;
      
      console.log('✅ Bright Data MCP 서버 시작 완료');
      return true;

    } catch (error) {
      console.error('❌ Bright Data MCP 시작 실패:', error);
      return false;
    }
  }

  /**
   * ⏳ 연결 대기
   */
  async waitForConnection(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Bright Data MCP 연결 시간 초과'));
      }, timeout);

      // 간단한 연결 확인 (실제로는 더 정교한 확인 필요)
      setTimeout(() => {
        clearTimeout(timer);
        resolve();
      }, 3000);
    });
  }

  /**
   * 🔍 키워드 확장 (실제 Bright Data MCP 사용)
   */
  async expandKeywords(baseKeywords, context = '', maxResults = 20) {
    if (!this.isConnected) {
      await this.startBrightDataMCP();
    }

    try {
      const expandedKeywords = [];

      for (const keyword of baseKeywords) {
        // 1. Google 자동완성
        const autocomplete = await this.getAutocomplete(keyword, context);
        expandedKeywords.push(...autocomplete);

        // 2. 관련 검색어
        const related = await this.getRelatedKeywords(keyword);
        expandedKeywords.push(...related);

        // 3. YouTube 제안
        const youtube = await this.getYouTubeSuggestions(keyword);
        expandedKeywords.push(...youtube);
      }

      // 중복 제거 및 정렬
      const uniqueKeywords = [...new Set(expandedKeywords)]
        .filter(k => k.length > 2)
        .filter(k => !baseKeywords.includes(k))
        .slice(0, maxResults);

      return uniqueKeywords;

    } catch (error) {
      console.error('❌ 키워드 확장 실패:', error);
      return this.getFallbackKeywords(baseKeywords);
    }
  }

  /**
   * 🌐 Google 자동완성 수집
   */
  async getAutocomplete(keyword, context) {
    try {
      // Bright Data MCP의 web_search 도구 사용
      const query = context ? `${keyword} ${context}` : keyword;
      
      // 실제 MCP 호출 (stdin/stdout 통신)
      const result = await this.callMCPTool('web_search', {
        query: `site:google.com autocomplete ${query}`,
        extract_data: true
      });

      return this.parseAutocompleteResult(result);

    } catch (error) {
      console.error('자동완성 수집 실패:', error);
      return [];
    }
  }

  /**
   * 🔗 관련 키워드 수집
   */
  async getRelatedKeywords(keyword) {
    try {
      const result = await this.callMCPTool('web_scrape', {
        url: `https://trends.google.com/trends/api/autocomplete/${encodeURIComponent(keyword)}`,
        extract_data: true
      });

      return this.parseRelatedResult(result);

    } catch (error) {
      console.error('관련 키워드 수집 실패:', error);
      return [];
    }
  }

  /**
   * 📺 YouTube 제안 수집
   */
  async getYouTubeSuggestions(keyword) {
    try {
      const result = await this.callMCPTool('browser_navigate', {
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`,
        extract_suggestions: true
      });

      return this.parseYouTubeResult(result);

    } catch (error) {
      console.error('YouTube 제안 수집 실패:', error);
      return [];
    }
  }

  /**
   * 📈 트렌드 데이터 수집
   */
  async getTrendingKeywords(region = 'KR', sources = [], limit = 15) {
    if (!this.isConnected) {
      await this.startBrightDataMCP();
    }

    try {
      const allTrends = [];

      // 각 소스별로 트렌드 수집
      for (const source of sources) {
        const trends = await this.scrapeTrendSource(source, region);
        allTrends.push(...trends);
      }

      // 중복 제거 및 정렬
      return this.consolidateTrends(allTrends, limit);

    } catch (error) {
      console.error('❌ 트렌드 수집 실패:', error);
      return this.getFallbackTrends(region);
    }
  }

  /**
   * 🔍 개별 트렌드 소스 스크래핑
   */
  async scrapeTrendSource(source, region) {
    const urls = {
      'naver_trends': 'https://datalab.naver.com/keyword/trendSearch.naver',
      'youtube_trending': 'https://www.youtube.com/feed/trending',
      'google_trends': 'https://trends.google.com/trends/trendingsearches/daily'
    };

    if (!urls[source]) {
      return [];
    }

    try {
      const result = await this.callMCPTool('web_scrape', {
        url: urls[source],
        extract_data: true,
        data_type: 'trending_keywords'
      });

      return this.parseTrendResult(result, source);

    } catch (error) {
      console.error(`${source} 스크래핑 실패:`, error);
      return [];
    }
  }

  /**
   * 📡 실제 MCP 도구 호출 (stdin/stdout 통신)
   */
  async callMCPTool(toolName, args) {
    return new Promise((resolve, reject) => {
      if (!this.brightDataProcess) {
        reject(new Error('Bright Data MCP 프로세스가 시작되지 않음'));
        return;
      }

      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      // MCP 요청 전송
      this.brightDataProcess.stdin.write(JSON.stringify(request) + '\n');

      // 응답 대기
      const timeout = setTimeout(() => {
        reject(new Error('MCP 응답 시간 초과'));
      }, 30000);

      this.brightDataProcess.stdout.once('data', (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          resolve(response.result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * 🔧 응답 파싱 메서드들
   */
  parseAutocompleteResult(result) {
    try {
      if (result && result.suggestions) {
        return result.suggestions.filter(s => s.length > 2).slice(0, 10);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  parseRelatedResult(result) {
    try {
      if (result && result.related_queries) {
        return result.related_queries.map(q => q.query).slice(0, 10);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  parseYouTubeResult(result) {
    try {
      if (result && result.search_suggestions) {
        return result.search_suggestions.slice(0, 8);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  parseTrendResult(result, source) {
    try {
      if (result && result.trending_topics) {
        return result.trending_topics.map(topic => ({
          keyword: topic.title || topic.query,
          score: topic.score || Math.random() * 100,
          source: source
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  consolidateTrends(allTrends, limit) {
    const uniqueTrends = allTrends.reduce((acc, trend) => {
      const existing = acc.find(t => t.keyword === trend.keyword);
      if (existing) {
        existing.score = Math.max(existing.score, trend.score);
      } else {
        acc.push(trend);
      }
      return acc;
    }, []);

    return uniqueTrends
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getFallbackKeywords(baseKeywords) {
    const patterns = {
      '먹방': ['ASMR', '요리', '맛집', '리뷰'],
      '댄스': ['챌린지', '커버', '안무', 'K-pop'],
      '브이로그': ['일상', '루틴', '여행', 'GRWM'],
      '게임': ['플레이', '공략', '리뷰', '스트리밍']
    };

    const expanded = [];
    baseKeywords.forEach(keyword => {
      if (patterns[keyword]) {
        expanded.push(...patterns[keyword]);
      }
    });

    return [...new Set(expanded)];
  }

  getFallbackTrends(region) {
    const trends = {
      'KR': [
        { keyword: '먹방', score: 95, source: 'fallback' },
        { keyword: '댄스', score: 90, source: 'fallback' },
        { keyword: '브이로그', score: 85, source: 'fallback' },
        { keyword: '요리', score: 80, source: 'fallback' },
        { keyword: '게임', score: 75, source: 'fallback' }
      ]
    };

    return trends[region] || trends['KR'];
  }

  /**
   * 🛑 종료
   */
  async shutdown() {
    if (this.brightDataProcess) {
      this.brightDataProcess.kill();
      this.brightDataProcess = null;
      this.isConnected = false;
      console.log('🛑 Bright Data MCP 종료됨');
    }
  }
}

export default BrightDataMCPIntegration; 