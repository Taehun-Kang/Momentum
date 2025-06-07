#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('📹 간단한 YouTube 영상 리스트 생성기');
console.log('🎯 MCP 도구로 직접 검색 → JSON 리스트 반환\n');

class SimpleVideoListGenerator {
  constructor() {
    this.mcpClient = null;
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
        name: "simple-list-generator",
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

  // 단순 영상 검색 및 JSON 리스트 생성
  async generateVideoList(userQuery) {
    console.log(`🎯 검색 요청: "${userQuery}"`);
    console.log('='.repeat(60));

    try {
      // 직접 YouTube 검색 실행
      const searchResult = await this.mcpClient.callTool({
        name: 'search_playable_shorts',
        arguments: {
          query: userQuery,
          maxResults: 10,
          filters: { order: 'relevance' }
        }
      });

      const searchData = JSON.parse(searchResult.content[0].text);
      
      console.log(`📺 검색 완료: ${searchData.results?.length || 0}개 영상 발견\n`);

      if (!searchData.results || searchData.results.length === 0) {
        return {
          query: userQuery,
          videos: [],
          totalFound: 0,
          message: "검색 결과가 없습니다"
        };
      }

      // 사용자 친화적 JSON 형태로 변환
      const videoList = {
        query: userQuery,
        videos: searchData.results.map(video => ({
          id: video.id,
          title: video.title,
          channel: video.channelTitle,
          viewCount: video.viewCount,
          publishedAt: video.publishedAt,
          duration: video.duration,
          url: `https://www.youtube.com/watch?v=${video.id}`,
          thumbnail: video.thumbnails?.high?.url || video.thumbnails?.medium?.url,
          description: video.description?.substring(0, 100) + '...' || ''
        })),
        totalFound: searchData.results.length,
        filteringSuccess: searchData.filteringSuccess,
        timestamp: new Date().toISOString()
      };

      return videoList;

    } catch (error) {
      console.error('❌ 검색 실패:', error);
      return {
        query: userQuery,
        error: error.message,
        videos: []
      };
    }
  }

  // 다양한 키워드로 영상 리스트 생성
  async generateMultipleVideoLists(queries) {
    const results = {};

    for (const query of queries) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔍 처리 중: "${query}"`);
      console.log(`${'='.repeat(80)}`);

      const videoList = await this.generateVideoList(query);
      results[query] = videoList;

      // 성공/실패 요약
      if (videoList.error) {
        console.log(`❌ 실패: ${videoList.error}`);
      } else {
        console.log(`✅ 성공: ${videoList.totalFound}개 영상`);
        
        // 상위 3개 영상 미리보기
        if (videoList.videos.length > 0) {
          console.log('\n📹 상위 영상들:');
          videoList.videos.slice(0, 3).forEach((video, index) => {
            console.log(`   ${index + 1}. ${video.title}`);
            console.log(`      채널: ${video.channel} | 조회수: ${video.viewCount?.toLocaleString()}`);
          });
        }
      }

      // API 제한 고려 딜레이
      if (query !== queries[queries.length - 1]) {
        console.log('\n⏳ 1초 대기...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // 결과를 파일로 저장
  async saveToFile(results, filename = 'video-search-results.json') {
    try {
      const fs = await import('fs');
      const outputPath = path.resolve(__dirname, filename);
      
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
      console.log(`\n💾 결과 저장 완료: ${outputPath}`);
      
      return outputPath;
    } catch (error) {
      console.error('❌ 파일 저장 실패:', error);
      return null;
    }
  }

  // 결과 요약 출력
  printSummary(results) {
    console.log('\n' + '='.repeat(100));
    console.log('📊 전체 검색 결과 요약');
    console.log('='.repeat(100));

    const queries = Object.keys(results);
    const totalVideos = Object.values(results).reduce((sum, result) => sum + (result.totalFound || 0), 0);
    const successfulQueries = Object.values(results).filter(result => !result.error).length;

    console.log(`🎯 검색 성공률: ${((successfulQueries / queries.length) * 100).toFixed(1)}% (${successfulQueries}/${queries.length})`);
    console.log(`📺 총 발견 영상: ${totalVideos}개`);
    console.log(`⏱️ 검색 시간: ${new Date().toLocaleTimeString()}`);

    console.log('\n📋 쿼리별 결과:');
    queries.forEach((query, index) => {
      const result = results[query];
      const status = result.error ? '❌' : '✅';
      const count = result.totalFound || 0;
      console.log(`   ${index + 1}. ${status} "${query}" (${count}개)`);
    });
  }

  async cleanup() {
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
  }
}

// 메인 실행
async function main() {
  const generator = new SimpleVideoListGenerator();
  
  try {
    await generator.connectToMCP();
    
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      if (args[0] === '--multiple') {
        // 다양한 키워드로 배치 검색
        const queries = [
          '피곤해',
          '먹방 ASMR',
          '댄스 커버', 
          '공부 브이로그',
          '힐링 음악'
        ];
        
        console.log('🚀 배치 검색 시작!');
        const results = await generator.generateMultipleVideoLists(queries);
        
        generator.printSummary(results);
        
        // JSON 파일로 저장
        await generator.saveToFile(results, 'multiple-video-search.json');
        
        // 전체 결과를 보기 좋게 출력
        console.log('\n📄 전체 JSON 결과:');
        console.log(JSON.stringify(results, null, 2));
        
      } else {
        // 단일 쿼리 검색
        const userQuery = args.join(' ');
        const result = await generator.generateVideoList(userQuery);
        
        console.log('\n📄 JSON 결과:');
        console.log(JSON.stringify(result, null, 2));
        
        // 파일 저장
        await generator.saveToFile({ [userQuery]: result }, 'single-video-search.json');
      }
    } else {
      // 기본: "피곤해" 검색
      console.log('기본 검색: "피곤해"\n');
      
      const result = await generator.generateVideoList('피곤해');
      
      console.log('\n📄 JSON 결과:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ 실행 실패:', error);
  } finally {
    await generator.cleanup();
    process.exit(0);
  }
}

process.on('SIGINT', async () => {
  console.log('\n\n⏹️ 검색 중단됨...');
  process.exit(0);
});

main().catch(console.error); 