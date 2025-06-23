// =============================================================================
// 🤖 index.js - YouTube 영상 LLM 분류 시스템 (메인)
// =============================================================================
// 
// 📋 책임: 전체 워크플로우 관리 및 실행
// 🎯 목표: 간단하고 직관적한 분류 프로세스
// 
// =============================================================================

import ClaudeApiManager from './core/claudeApiManager.js';
import DbInterface from './core/dbInterface.js';

/**
 * 🤖 YouTube 영상 분류기 메인 클래스
 */
class VideoClassifier {
  /**
   * 🏗️ 분류기 초기화
   */
  constructor() {
    this.claudeApi = new ClaudeApiManager();
    this.dbInterface = new DbInterface();
    this.batchSize = 1000; // 🚀 500개 본격 처리
  }

  /**
   * 🚀 단일 배치 분류 프로세스 (500개만)
   */
  async classifyAllVideos() {
    console.log('\n🚀 YouTube 영상 LLM 분류 시작! (500개 배치)');
    console.log('═'.repeat(60));

    try {
      // 연결 테스트
      await this.dbInterface.testConnection();
      
      // 초기 진행 상황
      const initialProgress = await this.dbInterface.getProgress();
      console.log(`📊 초기 상태: ${initialProgress.classified}/${initialProgress.total} (${initialProgress.percentage}%) 완료`);
      console.log(`🎯 남은 영상: ${initialProgress.remaining.toLocaleString()}개`);
      console.log(`📦 이번 배치: ${this.batchSize}개 처리 후 종료`);

      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalFailed = 0;
      let isFirstVideo = true; // Prompt Caching용

      console.log(`\n${'='.repeat(20)} 배치 처리 (${this.batchSize}개) ${'='.repeat(20)}`);
      
      // 🎯 500개 영상 가져오기 (classified_at IS NULL 자동 필터링)
      const videos = await this.dbInterface.getUnclassifiedVideos(this.batchSize, 0);
      
      if (videos.length === 0) {
        console.log('❌ 분류할 영상이 없습니다!');
        return;
      }

      console.log(`📦 처리할 영상: ${videos.length}개`);

      // 각 영상 순차 처리
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        
        try {
          // 진행률 표시 (50개마다)
          if (i % 50 === 0 || i === videos.length - 1) {
            console.log(`\n📍 [${i + 1}/${videos.length}] ${video.title?.slice(0, 40)}...`);
            console.log(`    📺 채널: ${video.handle_name || 'Unknown'}`);
          }
          
          // Claude API 분류
          const result = await this.claudeApi.classifyVideo(video);
          
          if (result.success) {
            // DB에 바로 저장
            try {
              await this.dbInterface.saveClassification(
                video.video_id, 
                result.classification,
                { confidence: 0.85, engine: 'claude-3.7-sonnet' }
              );
              
              console.log(`    ✅ [${video.video_id}] 분류 저장 완료`);
              totalSuccess++;
              
              // 분류 결과 미리보기 (첫 5개와 마지막 5개)
              if (i < 5 || i >= videos.length - 5) {
                console.log(`    🏷️ 주제: ${result.classification.topic_tags.join(', ')}`);
                console.log(`    😊 감정: ${result.classification.mood_tags.join(', ')}`);
                console.log(`    📍 상황: ${result.classification.context_tags.join(', ')}`);
                console.log(`    🎬 장르: ${result.classification.genre_tags.join(', ')}`);
              }
              
            } catch (dbError) {
              console.error(`    ❌ DB 저장 실패 [${video.video_id}]:`, dbError.message);
              totalFailed++;
            }
          } else {
            console.error(`    ❌ 분류 실패 [${video.video_id}]:`, result.error);
            totalFailed++;
          }

        } catch (error) {
          console.error(`    ❌ 처리 실패 [${video.video_id}]: ${error.message}`);
          totalFailed++;
        }

        totalProcessed++;
        
        // 진행률 표시 (100개마다)
        if (totalProcessed % 100 === 0) {
          console.log(`    📊 진행률: ${totalProcessed}/${videos.length} | 성공: ${totalSuccess} | 실패: ${totalFailed}`);
        }
      }

      // 배치 완료 결과
      await this.printBatchResults(totalProcessed, totalSuccess, totalFailed);

    } catch (error) {
      console.error(`\n💥 배치 프로세스 실패: ${error.message}`);
      console.log(`📊 중단 시점 통계: 처리 ${totalProcessed}개 | 성공 ${totalSuccess}개 | 실패 ${totalFailed}개`);
      throw error;
    }
  }

  /**
   * 📊 현재 진행 상황 확인
   */
  async checkProgress() {
    try {
      const progress = await this.dbInterface.getProgress();
      
      console.log('\n📊 === 분류 진행 상황 ===');
      console.log(`📹 전체 영상: ${progress.total.toLocaleString()}개`);
      console.log(`✅ 분류 완료: ${progress.classified.toLocaleString()}개`);
      console.log(`⏳ 남은 영상: ${progress.remaining.toLocaleString()}개`);
      console.log(`📈 진행률: ${progress.percentage}%`);
      
      if (progress.remaining > 0) {
        const estimatedBatches = Math.ceil(progress.remaining / this.batchSize);
        console.log(`🔮 예상 배치 수: ${estimatedBatches}개 (${this.batchSize}개씩)`);
        
        // 예상 시간 계산 (영상당 1.5초 기준)
        const estimatedMinutes = Math.round((this.batchSize * 1.5) / 60 * 10) / 10;
        console.log(`⏰ 다음 배치 예상시간: 약 ${estimatedMinutes}분`);
      }

      return progress;

    } catch (error) {
      console.error(`❌ 진행 상황 확인 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📋 배치 결과 출력
   */
  async printBatchResults(processed, success, failed) {
    const finalProgress = await this.dbInterface.getProgress();
    
    console.log('\n✅ === 배치 완료! ===');
    console.log(`📊 이번 배치 처리: ${processed.toLocaleString()}개`);
    console.log(`✅ 성공: ${success.toLocaleString()}개`);
    console.log(`❌ 실패: ${failed.toLocaleString()}개`);
    console.log(`📈 성공률: ${Math.round((success / processed) * 100)}%`);
    console.log(`\n📊 전체 현황:`);
    console.log(`📹 전체 영상: ${finalProgress.total.toLocaleString()}개`);
    console.log(`✅ 분류 완료: ${finalProgress.classified.toLocaleString()}개`);
    console.log(`📈 전체 진행률: ${finalProgress.percentage}%`);
    
    if (finalProgress.remaining === 0) {
      console.log(`\n🎊 축하합니다! 모든 영상 분류가 완료되었습니다!`);
    } else {
      console.log(`\n🔄 다음 배치를 실행하려면: node index.js full`);
      console.log(`⏳ 남은 영상: ${finalProgress.remaining.toLocaleString()}개`);
      const remainingBatches = Math.ceil(finalProgress.remaining / this.batchSize);
      console.log(`📦 남은 배치: 약 ${remainingBatches}번`);
    }
  }
}

// =============================================================================
// 🚀 실행 함수들
// =============================================================================

/**
 * 단일 배치 분류 실행 (500개만)
 */
export async function runFullClassification() {
  const classifier = new VideoClassifier();
  await classifier.classifyAllVideos();
}

/**
 * 진행 상황만 확인
 */
export async function checkProgress() {
  const classifier = new VideoClassifier();
  return await classifier.checkProgress();
}

// =============================================================================
// 🎯 직접 실행용 (node index.js)
// =============================================================================

async function main() {
  console.log('🚀 main 함수 실행됨!');
  
  const args = process.argv.slice(2);
  const command = args[0] || 'progress';

  console.log(`📋 명령어: ${command}`);

  try {
    switch (command) {
      case 'full':
        console.log('🚀 단일 배치 분류 시작... (500개)');
        await runFullClassification();
        break;
        
      case 'progress':
      default:
        await checkProgress();
        break;
    }
  } catch (error) {
    console.error(`\n💥 실행 실패: ${error.message}`);
    process.exit(1);
  }
}

// 🔧 더 간단한 실행 감지
const isMainModule = process.argv[1].endsWith('index.js');
if (isMainModule) {
  main();
} 