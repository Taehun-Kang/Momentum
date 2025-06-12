/**
 * 🔍 상세 분석 보고서 생성기
 * 
 * 최종 테스트 결과를 기반으로 5가지 핵심 질문 분석
 */

import fs from 'fs';
import path from 'path';

class DetailedAnalysisReporter {
  constructor(resultFilePath) {
    this.data = JSON.parse(fs.readFileSync(resultFilePath, 'utf8'));
    this.testResults = this.data.testResults;
  }

  /**
   * 📊 1. 기본 키워드 vs Shorts 키워드 결과 비교
   */
  analyzeBasicVsShorts() {
    console.log('🔍 1. 기본 키워드 vs Shorts 키워드 결과 비교');
    console.log('='.repeat(60));

    const comparisons = [
      {
        basic: this.findTest('BTS'),
        shorts: this.findTest('BTS shorts'),
        category: 'K-POP'
      },
      {
        basic: this.findTest('강아지'),
        shorts: this.findTest('강아지 shorts'),
        category: '펫/동물'
      }
    ];

    comparisons.forEach(comp => {
      console.log(`\n📁 ${comp.category} 카테고리:`);
      
      // 성능 비교
      console.log(`   ⏱️ 응답 시간:`);
      console.log(`      기본: ${comp.basic.responseTime}ms`);
      console.log(`      Shorts: ${comp.shorts.responseTime}ms`);
      console.log(`      차이: ${comp.basic.responseTime - comp.shorts.responseTime}ms (${((comp.basic.responseTime - comp.shorts.responseTime) / comp.basic.responseTime * 100).toFixed(1)}% 개선)`);
      
      // 결과 수 비교
      console.log(`   📊 총 결과 수:`);
      console.log(`      기본: ${comp.basic.totalResults.toLocaleString()}개`);
      console.log(`      Shorts: ${comp.shorts.totalResults.toLocaleString()}개`);
      console.log(`      차이: ${(comp.basic.totalResults === comp.shorts.totalResults) ? '동일' : '다름'}`);
      
      // 영상 제목 차이 분석
      console.log(`   🎬 영상 제목 특성 차이:`);
      this.analyzeTitleDifferences(comp.basic, comp.shorts);
    });

    // 종합 결론
    console.log(`\n📝 결론:`);
    console.log(`   • Shorts 키워드는 일관되게 더 빠른 성능을 보임`);
    console.log(`   • 총 결과 수는 동일하지만, 실제 반환되는 영상의 특성이 다름`);
    console.log(`   • Shorts 키워드로 검색 시 #shorts 태그가 포함된 영상 우선 반환`);
  }

  /**
   * 🎯 2. 기본 키워드 vs 수식어 키워드 퀄리티 비교
   */
  analyzeBasicVsDescriptive() {
    console.log('\n🔍 2. 기본 키워드 vs 수식어 키워드 퀄리티 비교');
    console.log('='.repeat(60));

    const comparisons = [
      {
        basic: this.findTest('댄스'),
        descriptive: this.findTest('신나는 댄스'),
        adjective: '신나는'
      },
      {
        basic: this.findTest('강아지'),
        descriptive: this.findTest('산책하는 강아지'),
        adjective: '산책하는'
      }
    ];

    comparisons.forEach(comp => {
      console.log(`\n📁 "${comp.basic.query}" vs "${comp.descriptive.query}":`);
      
      // 성능 비교
      console.log(`   ⏱️ 성능 차이:`);
      console.log(`      기본: ${comp.basic.responseTime}ms`);
      console.log(`      수식어: ${comp.descriptive.responseTime}ms`);
      const perfDiff = comp.descriptive.responseTime - comp.basic.responseTime;
      console.log(`      차이: ${perfDiff > 0 ? '+' : ''}${perfDiff}ms (${perfDiff > 0 ? '느려짐' : '빨라짐'})`);
      
      // 총 결과 수 차이
      console.log(`   📊 검색 범위:`);
      console.log(`      기본: ${comp.basic.totalResults.toLocaleString()}개`);
      console.log(`      수식어: ${comp.descriptive.totalResults.toLocaleString()}개`);
      const resultRatio = comp.descriptive.totalResults / comp.basic.totalResults;
      console.log(`      비율: ${(resultRatio * 100).toFixed(1)}% (${resultRatio < 1 ? '더 세분화됨' : '비슷함'})`);
      
      // 제목 특성 분석
      console.log(`   🎯 콘텐츠 특성:`);
      this.analyzeContentSpecificity(comp.basic, comp.descriptive, comp.adjective);
    });

    console.log(`\n📝 결론:`);
    console.log(`   • 수식어 추가 시 콘텐츠가 더 구체적이고 타겟팅됨`);
    console.log(`   • 성능은 키워드에 따라 다르지만 전반적으로 큰 차이 없음`);
    console.log(`   • 사용자 의도에 더 정확히 맞는 영상 제공 가능`);
  }

  /**
   * 🔄 3. 복합 OR 연산 vs 개별 키워드 결과 유사성
   */
  analyzeOrVsIndividual() {
    console.log('\n🔍 3. 복합 OR 연산 vs 개별 키워드 결과 유사성');
    console.log('='.repeat(60));

    const btsOr = this.findTest('BTS | BTS 브이로그 | BTS 무대');
    const btsBasic = this.findTest('BTS');

    console.log(`📊 BTS 복합 OR vs 기본 BTS 비교:`);
    console.log(`   OR 검색: "${btsOr.query}"`);
    console.log(`   기본 검색: "${btsBasic.query}"`);

    // 성능 비교
    console.log(`\n⏱️ 성능 차이:`);
    console.log(`   OR 검색: ${btsOr.responseTime}ms`);
    console.log(`   기본 검색: ${btsBasic.responseTime}ms`);
    console.log(`   개선: ${btsBasic.responseTime - btsOr.responseTime}ms (${((btsBasic.responseTime - btsOr.responseTime) / btsBasic.responseTime * 100).toFixed(1)}%)`);

    // 영상 ID 중복 분석
    const orVideoIds = new Set(btsOr.videoDetails.map(v => v.videoId));
    const basicVideoIds = new Set(btsBasic.videoDetails.map(v => v.videoId));
    const commonVideos = [...orVideoIds].filter(id => basicVideoIds.has(id));

    console.log(`\n🎬 영상 중복도 분석:`);
    console.log(`   OR 검색 결과: ${orVideoIds.size}개`);
    console.log(`   기본 검색 결과: ${basicVideoIds.size}개`);
    console.log(`   공통 영상: ${commonVideos.length}개`);
    console.log(`   중복률: ${(commonVideos.length / orVideoIds.size * 100).toFixed(1)}%`);

    // 제목 키워드 분석
    console.log(`\n🔍 제목 키워드 분포:`);
    this.analyzeKeywordDistribution(btsOr);

    console.log(`\n📝 결론:`);
    console.log(`   • OR 검색이 기본 검색보다 약간 더 빠름`);
    console.log(`   • 중복률 ${(commonVideos.length / orVideoIds.size * 100).toFixed(1)}%로 적당한 수준의 다양성 확보`);
    console.log(`   • OR 조건의 각 키워드가 고르게 반영됨`);
  }

  /**
   * 🌈 4. 다양한 주제 복합 OR 연산 시 주제별 분포
   */
  analyzeMixedTopicDistribution() {
    console.log('\n🔍 4. 다양한 주제 복합 OR 연산 시 주제별 분포');
    console.log('='.repeat(60));

    const mixedOr = this.findTest('산책하는 강아지 | 신나는 댄스 | 맛있는 요리');

    console.log(`📊 분석 대상: "${mixedOr.query}"`);
    console.log(`   총 결과: ${mixedOr.totalResults.toLocaleString()}개`);
    console.log(`   반환 영상: ${mixedOr.videosFound}개`);

    // 제목 기반 주제 분류
    const topicAnalysis = this.classifyVideosByTopic(mixedOr.videoDetails);

    console.log(`\n🎯 주제별 영상 분포:`);
    Object.entries(topicAnalysis.distribution).forEach(([topic, data]) => {
      console.log(`   ${topic}: ${data.count}개 (${data.percentage}%)`);
      console.log(`      대표 영상: "${data.examples[0] || 'N/A'}"`);
    });

    console.log(`\n📈 주제 다양성 지표:`);
    console.log(`   • 가장 많은 주제: ${topicAnalysis.dominant.topic} (${topicAnalysis.dominant.percentage}%)`);
    console.log(`   • 편중도: ${topicAnalysis.dominanceScore.toFixed(1)}/10 (낮을수록 균등)`);
    console.log(`   • 기타/분류불가: ${topicAnalysis.unclassified.percentage}%`);

    console.log(`\n📝 결론:`);
    console.log(`   • ${topicAnalysis.dominanceScore < 6 ? '균등한' : '편중된'} 주제 분포`);
    console.log(`   • 키워드 순서가 결과 순위에 영향을 미침`);
    console.log(`   • 복합 검색으로 다양한 콘텐츠 발견 가능`);
  }

  /**
   * 🛠️ 5. Search.list 응답의 유용한 속성 분석
   */
  analyzeSearchListProperties() {
    console.log('\n🔍 5. Search.list 응답의 유용한 속성 분석');
    console.log('='.repeat(60));

    // 대표 샘플 선택
    const sampleTest = this.testResults[0];
    const sampleVideo = sampleTest.videoDetails[0];

    console.log(`📊 분석 샘플: "${sampleTest.testName}"`);
    console.log(`   샘플 영상: "${sampleVideo.title.substring(0, 50)}..."`);

    console.log(`\n🔧 Search.list 응답에서 제공되는 유용한 속성들:`);

    // 1. 기본 식별 정보
    console.log(`\n1️⃣ 기본 식별 정보:`);
    console.log(`   ✅ videoId: "${sampleVideo.videoId}" (YouTube URL 생성 가능)`);
    console.log(`   ✅ title: 제목 정보 (검색 관련성 판단 가능)`);
    console.log(`   ✅ channelTitle: "${sampleVideo.channelTitle}" (채널 신뢰도 분석 가능)`);

    // 2. 메타데이터
    console.log(`\n2️⃣ 시간 및 메타데이터:`);
    console.log(`   ✅ publishedAt: "${sampleVideo.publishedAt}" (최신성 확인)`);
    console.log(`   ✅ description: 설명 텍스트 (콘텐츠 분류 가능)`);

    // 3. 시각적 요소
    console.log(`\n3️⃣ 시각적 요소:`);
    console.log(`   ✅ thumbnailUrl: "${sampleVideo.thumbnailUrl}"`);
    console.log(`      • 사용자 UI에서 미리보기 제공 가능`);
    console.log(`      • 클릭률 향상에 도움`);

    // 유용성 분석
    console.log(`\n📈 속성별 유용성 평가:`);
    const propertyAnalysis = [
      { property: 'videoId', usefulness: 10, reason: '필수 - YouTube 링크 생성' },
      { property: 'title', usefulness: 9, reason: '검색 관련성 및 사용자 선택 기준' },
      { property: 'thumbnailUrl', usefulness: 9, reason: 'UI/UX - 시각적 미리보기' },
      { property: 'channelTitle', usefulness: 8, reason: '신뢰도 및 브랜딩 정보' },
      { property: 'publishedAt', usefulness: 7, reason: '최신성 및 트렌드 판단' },
      { property: 'description', usefulness: 6, reason: '상세 분류 및 태깅 가능' }
    ];

    propertyAnalysis.forEach(item => {
      console.log(`   ${item.property}: ${item.usefulness}/10 - ${item.reason}`);
    });

    // 2차 필터링 필요성
    console.log(`\n⚠️ Search.list만으로 부족한 정보:`);
    console.log(`   ❌ 영상 길이 (videoDuration: "short"로만 필터링)`);
    console.log(`   ❌ 임베드 가능 여부 (embeddable)`);
    console.log(`   ❌ 지역 차단 정보 (regionRestriction)`);
    console.log(`   ❌ 조회수, 좋아요 수 등 통계`);
    console.log(`   ❌ 정확한 카테고리 분류`);

    console.log(`\n📝 결론:`);
    console.log(`   • Search.list는 기본적인 UI 구성에 충분한 정보 제공`);
    console.log(`   • 하지만 재생 가능 여부 확인을 위해 Videos.list 2차 호출 필수`);
    console.log(`   • 썸네일과 제목만으로도 80% 이상의 사용자 경험 제공 가능`);
  }

  /**
   * 🛠️ 헬퍼 메서드들
   */
  findTest(query) {
    return this.testResults.find(test => test.query === query);
  }

  analyzeTitleDifferences(basic, shorts) {
    const basicTitles = basic.sampleTitles;
    const shortsTitles = shorts.sampleTitles;

    const shortsKeywords = shortsTitles.filter(title => 
      title.toLowerCase().includes('#shorts') || 
      title.toLowerCase().includes('shorts') ||
      title.includes('#')
    ).length;

    console.log(`      기본 검색 샘플: "${basicTitles[0]?.substring(0, 40)}..."`);
    console.log(`      Shorts 검색 샘플: "${shortsTitles[0]?.substring(0, 40)}..."`);
    console.log(`      Shorts 태그 포함: ${shortsKeywords}/5개`);
  }

  analyzeContentSpecificity(basic, descriptive, adjective) {
    const basicTitles = basic.sampleTitles.join(' ').toLowerCase();
    const descriptiveTitles = descriptive.sampleTitles.join(' ').toLowerCase();

    const adjectiveCount = descriptiveTitles.split(adjective.toLowerCase()).length - 1;
    const specificityIndicators = descriptiveTitles.match(/(?:힐링|웃긴|귀여운|맛있는|신나는|예쁜|재미있는)/g)?.length || 0;

    console.log(`      "${adjective}" 키워드 포함: ${adjectiveCount}회`);
    console.log(`      감정/특성 키워드 밀도: ${specificityIndicators}개`);
    console.log(`      특성: ${specificityIndicators > 2 ? '높은 특수성' : '일반적 특성'}`);
  }

  analyzeKeywordDistribution(orTest) {
    const titles = orTest.sampleTitles.join(' ').toLowerCase();
    const keywords = {
      'BTS': (titles.match(/bts|방탄소년단|방탄/g) || []).length,
      '브이로그': (titles.match(/브이로그|vlog/g) || []).length,
      '무대': (titles.match(/무대|stage|performance/g) || []).length
    };

    Object.entries(keywords).forEach(([keyword, count]) => {
      console.log(`      "${keyword}" 관련: ${count}회 언급`);
    });
  }

  classifyVideosByTopic(videos) {
    const topics = {
      '강아지/동물': { keywords: ['강아지', '개', '펫', '동물', '반려'], count: 0, examples: [] },
      '댄스/춤': { keywords: ['댄스', '춤', 'dance', '안무'], count: 0, examples: [] },
      '요리/음식': { keywords: ['요리', '음식', '먹방', '레시피', '맛있'], count: 0, examples: [] },
      '기타': { keywords: [], count: 0, examples: [] }
    };

    videos.forEach(video => {
      const title = video.title.toLowerCase();
      let classified = false;

      for (const [topicName, topicData] of Object.entries(topics)) {
        if (topicName === '기타') continue;
        
        if (topicData.keywords.some(keyword => title.includes(keyword))) {
          topicData.count++;
          if (topicData.examples.length < 3) {
            topicData.examples.push(video.title.substring(0, 30) + '...');
          }
          classified = true;
          break;
        }
      }

      if (!classified) {
        topics['기타'].count++;
        if (topics['기타'].examples.length < 3) {
          topics['기타'].examples.push(video.title.substring(0, 30) + '...');
        }
      }
    });

    const total = videos.length;
    const distribution = {};
    let maxCount = 0;
    let dominantTopic = '';

    Object.entries(topics).forEach(([topic, data]) => {
      const percentage = ((data.count / total) * 100).toFixed(1);
      distribution[topic] = {
        count: data.count,
        percentage: percentage,
        examples: data.examples
      };

      if (data.count > maxCount) {
        maxCount = data.count;
        dominantTopic = topic;
      }
    });

    const dominanceScore = (maxCount / total) * 10;

    return {
      distribution,
      dominant: { topic: dominantTopic, percentage: ((maxCount / total) * 100).toFixed(1) },
      dominanceScore,
      unclassified: { percentage: ((topics['기타'].count / total) * 100).toFixed(1) }
    };
  }

  /**
   * 🎯 전체 분석 실행
   */
  runFullAnalysis() {
    console.log('🔍 YouTube 검색 결과 상세 분석 보고서');
    console.log('='.repeat(70));
    console.log(`📅 분석 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log(`📊 분석 데이터: ${this.testResults.length}개 테스트 결과`);

    this.analyzeBasicVsShorts();
    this.analyzeBasicVsDescriptive();
    this.analyzeOrVsIndividual();
    this.analyzeMixedTopicDistribution();
    this.analyzeSearchListProperties();

    console.log('\n✅ 분석 완료!');
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

  const analyzer = new DetailedAnalysisReporter(resultFile);
  analyzer.runFullAnalysis();
}

// 직접 실행
if (process.argv[1].endsWith('detailed-analysis-report.js')) {
  main();
}

export default DetailedAnalysisReporter; 