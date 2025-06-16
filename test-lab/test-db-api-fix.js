/**
 * 🧪 DB API 수정 검증 테스트
 * 
 * 문제: callDatabaseAPI 함수에서 HTTP method가 잘못 설정됨
 * 수정: method와 data 처리 개선
 * 
 * 이 테스트는 YouTube API를 사용하지 않고 DB API만 테스트합니다.
 */

// 샘플 데이터 (실제 API 호출 없이 테스트용)
const sampleChannels = [
  {
    channel_id: 'UC_test_channel_1',
    channel_title: '테스트 채널 1',
    subscriber_count: 100000,
    video_count: 50,
    channel_description: '테스트용 채널입니다',
    channel_icon: 'https://example.com/icon1.jpg',
    quality_grade: 'B',
    collected_at: new Date().toISOString(),
    custom_url: '@testchannel1',
    published_at: '2020-01-01T00:00:00Z',
    country: 'KR',
    total_view_count: 5000000
  },
  {
    channel_id: 'UC_test_channel_2',
    channel_title: '테스트 채널 2',
    subscriber_count: 50000,
    video_count: 30,
    channel_description: '또 다른 테스트 채널',
    channel_icon: 'https://example.com/icon2.jpg',
    quality_grade: 'C',
    collected_at: new Date().toISOString(),
    custom_url: '@testchannel2',
    published_at: '2021-01-01T00:00:00Z',
    country: 'KR',
    total_view_count: 2000000
  }
];

const sampleVideos = [
  {
    video_id: 'test_video_1',
    title: '테스트 영상 1',
    description: '테스트용 영상 설명입니다',
    channel_id: 'UC_test_channel_1',
    channel_title: '테스트 채널 1',
    published_at: new Date().toISOString(),
    view_count: 10000,
    like_count: 500,
    comment_count: 50,
    duration: 45,
    thumbnail_url: 'https://example.com/thumb1.jpg',
    search_keyword: '테스트',
    category: '테스트 카테고리',
          llm_classification: {
        topic_tags: ['테스트', '샘플'],
        mood_tags: ['재미있는'],
        context_tags: ['테스트할때'],
        genre_tags: ['테스트'],
        confidence: 0.9,
        engine: 'claude_api',
        processed_at: new Date().toISOString()
      },
    quality_score: 0.75,
    engagement_score: 0.05,
    is_playable: true,
    processed_at: new Date().toISOString(),
    collection_context: {
      search_keyword: '테스트',
      collection_method: 'test',
      api_cost: 0,
      filter_applied: true
    }
  }
];

// callDatabaseAPI 함수 (수정된 버전)
async function callDatabaseAPI(endpoint, options = {}) {
  try {
    const baseURL = 'http://localhost:3002';
    const url = `${baseURL}${endpoint}`;
    
    console.log(`🔗 [DB API 호출] ${options.method || 'GET'} ${endpoint}`);
    
    const requestConfig = {
      method: options.method || 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'DB-API-Test/1.0',
        ...options.headers
      }
    };

    // data가 있으면 body로 변환
    if (options.data) {
      requestConfig.body = JSON.stringify(options.data);
      console.log(`📤 전송 데이터:`, JSON.stringify(options.data, null, 2));
    }

    const response = await fetch(url, requestConfig);
    
    console.log(`📡 응답 상태: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ 에러 응답:`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }
    
    const result = await response.json();
    
    console.log(`✅ [DB API 성공] ${endpoint} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
    return result;
    
  } catch (error) {
    console.error(`❌ [DB API 실패] ${endpoint}:`, error.message);
    throw error;
  }
}

async function testDBAPI() {
  console.log('🧪 DB API 수정 검증 테스트 시작\n');

  try {
    // 테스트 1: 채널 배치 저장
    console.log('📋 테스트 1: 채널 배치 저장');
    console.log('=' .repeat(50));
    
    const channelResult = await callDatabaseAPI('/api/v1/videos_db/channels/batch-save', {
      method: 'POST',
      data: { channels: sampleChannels }
    });
    
    console.log('✅ 채널 배치 저장 성공:', channelResult);
    console.log('');

    // 테스트 2: 영상 배치 저장  
    console.log('📋 테스트 2: 영상 배치 저장');
    console.log('=' .repeat(50));
    
    const videoResult = await callDatabaseAPI('/api/v1/videos_db/cache/batch-save', {
      method: 'POST', 
      data: { videos: sampleVideos }
    });
    
    console.log('✅ 영상 배치 저장 성공:', videoResult);
    console.log('');

    // 테스트 3: 배치 체크
    console.log('📋 테스트 3: 배치 체크');
    console.log('=' .repeat(50));
    
    const checkResult = await callDatabaseAPI('/api/v1/videos_db/cache/batch-check', {
      method: 'POST',
      data: { video_ids: ['test_video_1'] }
    });
    
    console.log('✅ 배치 체크 성공:', checkResult);

    console.log('\n🎉 모든 DB API 테스트 성공!');
    
  } catch (error) {
    console.error('\n❌ DB API 테스트 실패:', error.message);
    process.exit(1);
  }
}

// 테스트 실행
testDBAPI(); 