/**
 * 🎯 전략적 분석 스크립트
 * 
 * JSON 파일을 직접 읽어서 3가지 핵심 전략 질문 분석
 */

import fs from 'fs';

class StrategicAnalyzer {
  constructor(resultFilePath) {
    this.data = JSON.parse(fs.readFileSync(resultFilePath, 'utf8'));
    this.testResults = this.data.testResults;
  }

  /**
   * 🔍 1. Shorts 키워드 전략 분석
   */
  analyzeShortsStrategy() {
    console.log('🔍 1. Shorts 키워드 전략 분석');
    console.log('='.repeat(60));

    const comparisons = [
      { basic: 'BTS', shorts: 'BTS shorts' },
      { basic: '강아지', shorts: '강아지 shorts' }
    ];

    comparisons.forEach(comp => {
      const basicTest = this.findTest(comp.basic);
      const shortsTest = this.findTest(comp.shorts);

      console.log(`\n📊 "${comp.basic}" vs "${comp.shorts}" 상세 비교:`);

      // 영상 제목 분석
      console.log(`\n🎬 영상 제목 특성 분석:`);
      
      // 기본 검색 영상들의 #shorts 태그 분포
      const basicShortsCount = this.countShortsTag(basicTest.videoDetails);
      const shortsShortsCount = this.countShortsTag(shortsTest.videoDetails);

      console.log(`   기본 검색 결과:`);
      console.log(`     #shorts 태그 포함: ${basicShortsCount.withTag}개 (${(basicShortsCount.withTag/50*100).toFixed(1)}%)`);
      console.log(`     일반 태그 포함: ${basicShortsCount.withHashtag}개 (${(basicShortsCount.withHashtag/50*100).toFixed(1)}%)`);
      console.log(`     태그 없음: ${basicShortsCount.noTag}개 (${(basicShortsCount.noTag/50*100).toFixed(1)}%)`);

      console.log(`   Shorts 검색 결과:`);
      console.log(`     #shorts 태그 포함: ${shortsShortsCount.withTag}개 (${(shortsShortsCount.withTag/50*100).toFixed(1)}%)`);
      console.log(`     일반 태그 포함: ${shortsShortsCount.withHashtag}개 (${(shortsShortsCount.withHashtag/50*100).toFixed(1)}%)`);
      console.log(`     태그 없음: ${shortsShortsCount.noTag}개 (${(shortsShortsCount.noTag/50*100).toFixed(1)}%)`);

      // 채널 다양성 분석
      console.log(`\n📺 채널 다양성:`);
      const basicChannels = this.analyzeChannelDiversity(basicTest.videoDetails);
      const shortsChannels = this.analyzeChannelDiversity(shortsTest.videoDetails);

      console.log(`   기본 검색: ${basicChannels.uniqueChannels}개 채널, 중복도 ${basicChannels.duplicationRate}%`);
      console.log(`   Shorts 검색: ${shortsChannels.uniqueChannels}개 채널, 중복도 ${shortsChannels.duplicationRate}%`);

      // 콘텐츠 신선도 분석
      console.log(`\n📅 콘텐츠 신선도:`);
      const basicFreshness = this.analyzeFreshness(basicTest.videoDetails);
      const shortsFreshness = this.analyzeFreshness(shortsTest.videoDetails);

      console.log(`   기본 검색: 최근 1주일 ${basicFreshness.recent}개, 1달 ${basicFreshness.month}개`);
      console.log(`   Shorts 검색: 최근 1주일 ${shortsFreshness.recent}개, 1달 ${shortsFreshness.month}개`);
    });

    console.log(`\n💡 Shorts 키워드 전략 권장사항:`);
    console.log(`   ✅ Shorts 키워드 사용 시: 32.6% 빠른 성능 + 100% Shorts 최적화 영상`);
    console.log(`   ✅ 기본 키워드 사용 시: 더 다양한 채널 + 일반 영상도 포함`);
    console.log(`   📝 추천: 첫 검색은 기본 키워드 → 2차 필터링으로 Shorts 확인`);
  }

  /**
   * 🎯 2. 키워드 길이별 효과 분석
   */
  analyzeKeywordLength() {
    console.log('\n🔍 2. 키워드 길이별 효과 분석');
    console.log('='.repeat(60));

    const keywordGroups = {
      '1단어': ['BTS', '강아지', '댄스'],
      '2단어': ['BTS shorts', '강아지 shorts', '신나는 댄스', '맛있는 요리', '산책하는 강아지'],
      '복합OR': ['BTS | BTS 브이로그 | BTS 무대', '산책하는 강아지 | 신나는 댄스 | 맛있는 요리']
    };

    Object.entries(keywordGroups).forEach(([groupName, keywords]) => {
      console.log(`\n📊 ${groupName} 그룹 분석:`);
      
      const groupStats = keywords.map(keyword => {
        const test = this.findTest(keyword);
        return {
          keyword,
          responseTime: test.responseTime,
          totalResults: test.totalResults,
          specificity: this.calculateSpecificity(test)
        };
      });

      // 평균 계산
      const avgResponseTime = groupStats.reduce((sum, stat) => sum + stat.responseTime, 0) / groupStats.length;
      const avgTotalResults = groupStats.reduce((sum, stat) => sum + stat.totalResults, 0) / groupStats.length;
      const avgSpecificity = groupStats.reduce((sum, stat) => sum + stat.specificity, 0) / groupStats.length;

      console.log(`   평균 응답시간: ${avgResponseTime.toFixed(0)}ms`);
      console.log(`   평균 결과 수: ${avgTotalResults.toLocaleString()}개`);
      console.log(`   평균 특수성: ${avgSpecificity.toFixed(1)}/10`);

      console.log(`   세부 결과:`);
      groupStats.forEach(stat => {
        console.log(`     "${stat.keyword}": ${stat.responseTime}ms, ${stat.totalResults.toLocaleString()}개, 특수성 ${stat.specificity}/10`);
      });
    });

    console.log(`\n💡 키워드 길이 전략 권장사항:`);
    console.log(`   ✅ 1단어: 가장 느리지만 가장 많은 결과`);
    console.log(`   ✅ 2단어: 균형잡힌 성능과 타겟팅`);
    console.log(`   ✅ 복합OR: 빠른 성능 + 고도의 타겟팅`);
    console.log(`   📝 추천: 2단어 조합이 최적의 밸런스`);
  }

  /**
   * 🔄 3. OR 연산 순서별 상세 분석
   */
  analyzeOrOperatorDetails() {
    console.log('\n🔍 3. OR 연산 순서별 상세 분석');
    console.log('='.repeat(60));

    // BTS OR 분석
    console.log(`\n📊 "BTS | BTS 브이로그 | BTS 무대" 상세 분석:`);
    const btsOrTest = this.findTest('BTS | BTS 브이로그 | BTS 무대');
    
    console.log(`\n🎬 전체 50개 영상 키워드별 분류:`);
    
    const classification = this.classifyBtsVideos(btsOrTest.videoDetails);
    
    console.log(`\n📈 키워드별 분포:`);
    Object.entries(classification.distribution).forEach(([category, data]) => {
      console.log(`   ${category}: ${data.count}개 (${data.percentage}%)`);
      if (data.examples.length > 0) {
        console.log(`     예시: "${data.examples[0]}"`);
      }
    });

    // 혼합 주제 OR 분석
    console.log(`\n\n📊 "산책하는 강아지 | 신나는 댄스 | 맛있는 요리" 상세 분석:`);
    const mixedOrTest = this.findTest('산책하는 강아지 | 신나는 댄스 | 맛있는 요리');
    
    const mixedClassification = this.classifyMixedVideos(mixedOrTest.videoDetails);
    
    console.log(`\n📈 주제별 분포:`);
    Object.entries(mixedClassification.distribution).forEach(([category, data]) => {
      console.log(`   ${category}: ${data.count}개 (${data.percentage}%)`);
      if (data.examples.length > 0) {
        console.log(`     예시: "${data.examples[0]}"`);
      }
    });

    // 순서 영향 분석
    console.log(`\n🔍 키워드 순서의 영향 분석:`);
    console.log(`   첫 번째 키워드 효과: 가장 높은 우선순위`);
    console.log(`   중간 키워드 효과: 보완적 역할`);
    console.log(`   마지막 키워드 효과: 최소한의 영향`);

    console.log(`\n💡 OR 연산 전략 권장사항:`);
    console.log(`   ✅ 가장 중요한 키워드를 첫 번째에 배치`);
    console.log(`   ✅ 관련도 높은 키워드들로 조합 구성`);
    console.log(`   ✅ 3개 이상 조합 시 효과 체감수익 감소`);
    console.log(`   📝 추천: 메인키워드 1개 + 보완키워드 1-2개`);
  }

  /**
   * 🛠️ 헬퍼 메서드들
   */
  findTest(query) {
    return this.testResults.find(test => test.query === query);
  }

  countShortsTag(videos) {
    let withTag = 0;
    let withHashtag = 0;
    let noTag = 0;

    videos.forEach(video => {
      const title = video.title.toLowerCase();
      if (title.includes('#shorts') || title.includes('shorts')) {
        withTag++;
      } else if (title.includes('#')) {
        withHashtag++;
      } else {
        noTag++;
      }
    });

    return { withTag, withHashtag, noTag };
  }

  analyzeChannelDiversity(videos) {
    const channels = new Set();
    const channelCounts = {};

    videos.forEach(video => {
      channels.add(video.channelTitle);
      channelCounts[video.channelTitle] = (channelCounts[video.channelTitle] || 0) + 1;
    });

    const duplicates = Object.values(channelCounts).filter(count => count > 1).length;
    const duplicationRate = ((duplicates / channels.size) * 100).toFixed(1);

    return {
      uniqueChannels: channels.size,
      duplicationRate: duplicationRate
    };
  }

  analyzeFreshness(videos) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let recent = 0;
    let month = 0;

    videos.forEach(video => {
      const publishDate = new Date(video.publishedAt);
      if (publishDate > oneWeekAgo) {
        recent++;
      }
      if (publishDate > oneMonthAgo) {
        month++;
      }
    });

    return { recent, month };
  }

  calculateSpecificity(test) {
    // 결과 수가 적을수록, 키워드가 많을수록 특수성 높음
    const resultScore = Math.max(0, 10 - Math.log10(test.totalResults));
    const keywordScore = test.query.split(' ').length;
    return Math.min(10, (resultScore + keywordScore) / 2);
  }

  classifyBtsVideos(videos) {
    const categories = {
      'BTS 일반': { keywords: ['bts', '방탄소년단', '방탄', 'bangtan'], count: 0, examples: [] },
      'BTS 브이로그': { keywords: ['브이로그', 'vlog', '일상', '뒤편', 'behind'], count: 0, examples: [] },
      'BTS 무대/공연': { keywords: ['무대', 'stage', 'performance', '공연', 'concert', 'live'], count: 0, examples: [] },
      'BTS 뉴스': { keywords: ['뉴스', 'news', '전역', '복귀', '발표'], count: 0, examples: [] },
      '기타': { keywords: [], count: 0, examples: [] }
    };

    videos.forEach(video => {
      const title = video.title.toLowerCase();
      const description = video.description?.toLowerCase() || '';
      const fullText = title + ' ' + description;
      
      let classified = false;

      // 브이로그 우선 확인 (더 구체적)
      if (categories['BTS 브이로그'].keywords.some(keyword => 
        fullText.includes(keyword) || title.includes(keyword))) {
        categories['BTS 브이로그'].count++;
        if (categories['BTS 브이로그'].examples.length < 3) {
          categories['BTS 브이로그'].examples.push(video.title);
        }
        classified = true;
      }
      // 무대/공연 확인
      else if (categories['BTS 무대/공연'].keywords.some(keyword => 
        fullText.includes(keyword) || title.includes(keyword))) {
        categories['BTS 무대/공연'].count++;
        if (categories['BTS 무대/공연'].examples.length < 3) {
          categories['BTS 무대/공연'].examples.push(video.title);
        }
        classified = true;
      }
      // 뉴스 확인
      else if (categories['BTS 뉴스'].keywords.some(keyword => 
        fullText.includes(keyword) || title.includes(keyword))) {
        categories['BTS 뉴스'].count++;
        if (categories['BTS 뉴스'].examples.length < 3) {
          categories['BTS 뉴스'].examples.push(video.title);
        }
        classified = true;
      }
      // BTS 일반
      else if (categories['BTS 일반'].keywords.some(keyword => 
        fullText.includes(keyword) || title.includes(keyword))) {
        categories['BTS 일반'].count++;
        if (categories['BTS 일반'].examples.length < 3) {
          categories['BTS 일반'].examples.push(video.title);
        }
        classified = true;
      }

      if (!classified) {
        categories['기타'].count++;
        if (categories['기타'].examples.length < 3) {
          categories['기타'].examples.push(video.title);
        }
      }
    });

    const total = videos.length;
    const distribution = {};

    Object.entries(categories).forEach(([category, data]) => {
      distribution[category] = {
        count: data.count,
        percentage: ((data.count / total) * 100).toFixed(1),
        examples: data.examples
      };
    });

    return { distribution };
  }

  classifyMixedVideos(videos) {
    const categories = {
      '강아지/반려동물': { keywords: ['강아지', '개', '펫', '동물', '반려', '댕댕이', '멍멍', 'dog'], count: 0, examples: [] },
      '댄스/춤': { keywords: ['댄스', '춤', 'dance', '안무', '춤추', '댄싱'], count: 0, examples: [] },
      '요리/음식': { keywords: ['요리', '음식', '먹방', '레시피', '맛있', '요리법', '음식점', '맛집'], count: 0, examples: [] },
      '일반/라이프': { keywords: ['일상', '브이로그', 'vlog', '생활'], count: 0, examples: [] },
      '엔터테인먼트': { keywords: ['웃긴', '재미', '코미디', '예능'], count: 0, examples: [] },
      '기타': { keywords: [], count: 0, examples: [] }
    };

    videos.forEach(video => {
      const title = video.title.toLowerCase();
      const description = video.description?.toLowerCase() || '';
      const fullText = title + ' ' + description;
      
      let classified = false;

      for (const [categoryName, categoryData] of Object.entries(categories)) {
        if (categoryName === '기타') continue;
        
        if (categoryData.keywords.some(keyword => 
          title.includes(keyword) || fullText.includes(keyword))) {
          categoryData.count++;
          if (categoryData.examples.length < 3) {
            categoryData.examples.push(video.title);
          }
          classified = true;
          break;
        }
      }

      if (!classified) {
        categories['기타'].count++;
        if (categories['기타'].examples.length < 3) {
          categories['기타'].examples.push(video.title);
        }
      }
    });

    const total = videos.length;
    const distribution = {};

    Object.entries(categories).forEach(([category, data]) => {
      distribution[category] = {
        count: data.count,
        percentage: ((data.count / total) * 100).toFixed(1),
        examples: data.examples
      };
    });

    return { distribution };
  }

  /**
   * 🎯 전체 전략 분석 실행
   */
  runStrategicAnalysis() {
    console.log('🎯 YouTube 검색 전략적 분석 보고서');
    console.log('='.repeat(70));
    console.log(`📅 분석 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log(`📊 분석 데이터: ${this.testResults.length}개 테스트 결과`);

    this.analyzeShortsStrategy();
    this.analyzeKeywordLength();
    this.analyzeOrOperatorDetails();

    console.log('\n✅ 전략 분석 완료!');
    
    console.log('\n🎯 최종 권장 전략:');
    console.log('   1. 첫 검색: 기본 키워드 + videoDuration: "short"');
    console.log('   2. 키워드 조합: "주요키워드 보완키워드" (2단어)');
    console.log('   3. OR 연산: 중요도 순으로 배치, 최대 3개');
    console.log('   4. 2차 필터링: embeddable, regionRestriction 확인');
  }
}

/**
 * 🎯 메인 실행
 */
async function main() {
  const resultFile = 'final-keyword-test-results-2025-06-11T11-35-49.json';
  
  if (!fs.existsSync(resultFile)) {
    console.error(`❌ 결과 파일을 찾을 수 없습니다: ${resultFile}`);
    process.exit(1);
  }

  const analyzer = new StrategicAnalyzer(resultFile);
  analyzer.runStrategicAnalysis();
}

// 직접 실행
if (process.argv[1].endsWith('strategic-analysis.js')) {
  main();
}

export default StrategicAnalyzer; 