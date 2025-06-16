/**
 * 🧪 UPSERT 방식 batch-check API 테스트
 * 
 * 목적: 새로 추가한 /api/v1/videos_db/cache/batch-check API 테스트
 * - 기존 영상 ID 확인 기능
 * - UPSERT 방식 데이터 처리용
 */

console.log('🧪 UPSERT 방식 batch-check API 테스트 시작\n');

// 테스트 데이터 (실제 YouTube 영상 ID)
const testVideoIds = [
  'dQw4w9WgXcQ',  // Never Gonna Give You Up
  'jNQXAC9IVRw',  // Me at the zoo (first YouTube video)
  '9bZkp7q19f0',  // PSY - GANGNAM STYLE
  'kJQP7kiw5Fk',  // Despacito
  'fJ9rUzIMcZQ',  // Bohemian Rhapsody
  'test_video_1', // 존재하지 않는 가상 ID
  'test_video_2', // 존재하지 않는 가상 ID
  'test_video_3'  // 존재하지 않는 가상 ID
];

async function testBatchCheckAPI() {
  try {
    console.log(`📤 batch-check API 호출: ${testVideoIds.length}개 영상 ID`);
    console.log('영상 ID 목록:', testVideoIds);
    
    const response = await fetch('http://localhost:3002/api/v1/videos_db/cache/batch-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_ids: testVideoIds
      })
    });

    console.log(`📥 응답 상태: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log('\n📊 API 응답 결과:');
    console.log('성공 여부:', result.success);
    console.log('메시지:', result.message);
    
    if (result.success && result.data) {
      console.log('\n📈 상세 통계:');
      console.log(`- 요청 영상 수: ${result.data.requested_count}개`);
      console.log(`- 기존 영상 수: ${result.data.existing_count}개`);
      console.log(`- 새 영상 수: ${result.data.new_count}개`);
      
      console.log('\n🔍 기존 영상 ID 목록:');
      if (result.data.existing_videos.length > 0) {
        result.data.existing_videos.forEach((videoId, index) => {
          console.log(`  ${index + 1}. ${videoId}`);
        });
      } else {
        console.log('  (기존 영상 없음)');
      }
      
      // UPSERT 시뮬레이션 로직
      console.log('\n🔄 UPSERT 처리 시뮬레이션:');
      const existingVideoIds = new Set(result.data.existing_videos);
      
      const updateVideos = testVideoIds.filter(id => existingVideoIds.has(id));
      const insertVideos = testVideoIds.filter(id => !existingVideoIds.has(id));
      
      console.log(`📝 업데이트 대상 (${updateVideos.length}개):`, updateVideos);
      console.log(`✨ 신규 삽입 대상 (${insertVideos.length}개):`, insertVideos);
      
      console.log('\n✅ batch-check API 테스트 성공!');
      
      return {
        success: true,
        total: result.data.requested_count,
        existing: result.data.existing_count,
        new: result.data.new_count,
        updateVideos,
        insertVideos
      };
    } else {
      throw new Error('API 응답에서 데이터를 찾을 수 없음');
    }

  } catch (error) {
    console.error('\n❌ batch-check API 테스트 실패:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 테스트 실행
testBatchCheckAPI().then(result => {
  console.log('\n📋 최종 테스트 결과:');
  console.log('성공:', result.success);
  
  if (result.success) {
    console.log(`📊 통계: 총 ${result.total}개 (기존 ${result.existing}개, 신규 ${result.new}개)`);
    console.log('🎉 UPSERT 방식 구현 준비 완료!');
  } else {
    console.log('오류:', result.error);
    console.log('🔧 API 수정 필요');
  }
}); 