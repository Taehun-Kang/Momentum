/**
 * 🎬 YouTube Shorts 영상 태그 분류기 v1.1
 * 
 * 핵심 기능: 영상 분류 및 태그 생성
 * - 4가지 카테고리: 주제, 분위기/감정, 상황/맥락, 장르/형식
 * - 배치 처리 지원 (최대 20개 영상 동시 처리)
 * - 실용적이고 유용한 태그 생성에 집중
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../../../.env') });

class VideoTagger {
  constructor() {
    this.anthropic = null;
    this.initializeAPI();
    
    // 필수 통계만 유지
    this.stats = {
      totalVideosProcessed: 0,
      successfulClassifications: 0,
      averageProcessingTime: 0,
      apiCallCount: 0
    };
  }

  initializeAPI() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      console.log('🤖 Video Tagger Claude API 초기화 완료');
    } else {
      console.warn('⚠️ ANTHROPIC_API_KEY 없음 - 태그 분류 기능 제한');
    }
  }

  /**
   * 🎬 단일 영상 태그 분류
   */
  async classifyVideo(videoData) {
    console.log(`🎬 영상 태그 분류: ${videoData.videoId}`);

    try {
      if (!this.anthropic) {
        return this.generateFallbackTags(videoData);
      }

      const result = await this.performLLMClassification([videoData]);
      
      if (result.success && result.classifications.length > 0) {
        const classification = result.classifications[0];
        this.updateStats(1, true, result.processingTime);
        
        return {
          success: true,
          videoId: videoData.videoId,
          tags: classification.tags,
          confidence: classification.confidence || 0.8,
          processingTime: result.processingTime,
          generatedAt: new Date().toISOString()
        };
      } else {
        throw new Error('LLM 분류 실패');
      }

    } catch (error) {
      console.error(`❌ 영상 ${videoData.videoId} 분류 실패:`, error.message);
      this.updateStats(1, false, 0);
      
      return {
        success: false,
        videoId: videoData.videoId,
        error: error.message,
        fallbackTags: this.generateFallbackTags(videoData)
      };
    }
  }

  /**
   * 📦 배치 영상 태그 분류
   */
  async classifyVideoBatch(videosData, batchSize = 10) {
    console.log(`📦 배치 영상 분류: ${videosData.length}개 영상 (배치 크기: ${batchSize})`);
    
    const startTime = Date.now();
    const results = [];
    
    // 배치 단위로 나누기
    for (let i = 0; i < videosData.length; i += batchSize) {
      const batch = videosData.slice(i, i + batchSize);
      console.log(`   📦 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(videosData.length/batchSize)}: ${batch.length}개 영상`);
      
      try {
        const batchResult = await this.performLLMClassification(batch);
        
        if (batchResult.success) {
          // 각 영상별로 결과 처리
          batchResult.classifications.forEach((classification, index) => {
            const videoData = batch[index];
            
            results.push({
              success: true,
              videoId: videoData.videoId,
              searchKeyword: videoData.searchKeyword,
              category: videoData.category,
              tags: classification.tags,
              confidence: classification.confidence || 0.8,
              originalData: {
                title: videoData.title,
                description: videoData.description
              }
            });
          });
          
          this.updateStats(batch.length, true, batchResult.processingTime);
        } else {
          // 배치 실패 시 개별 폴백 처리
          batch.forEach(videoData => {
            results.push({
              success: false,
              videoId: videoData.videoId,
              error: 'LLM 배치 분류 실패',
              fallbackTags: this.generateFallbackTags(videoData)
            });
          });
          
          this.updateStats(batch.length, false, 0);
        }

      } catch (error) {
        console.error(`❌ 배치 ${Math.floor(i/batchSize) + 1} 처리 실패:`, error.message);
        
        // 배치 전체 실패 시 폴백
        batch.forEach(videoData => {
          results.push({
            success: false,
            videoId: videoData.videoId,
            error: error.message,
            fallbackTags: this.generateFallbackTags(videoData)
          });
        });
        
        this.updateStats(batch.length, false, 0);
      }

      // API 부하 방지를 위한 대기 (배치간 1초)
      if (i + batchSize < videosData.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const totalTime = Date.now() - startTime;

    console.log(`✅ 배치 분류 완료: ${results.length}개 처리 (${totalTime}ms)`);

    return {
      success: true,
      totalProcessed: results.length,
      successfulClassifications: results.filter(r => r.success).length,
      failedClassifications: results.filter(r => !r.success).length,
      results: results,
      processingTime: totalTime
    };
  }

  /**
   * 🧠 LLM 기반 분류 수행
   */
  async performLLMClassification(videosData) {
    console.log(`🧠 LLM 분류 수행: ${videosData.length}개 영상`);

    // 프롬프트용 영상 데이터 구성
    const videoPrompts = videosData.map((video, index) => {
      return `
**영상 ${index + 1}:**
- ID: ${video.videoId}
- 제목: "${video.title}"
- 설명: "${(video.description || '').substring(0, 300)}"
- 검색 키워드: "${video.searchKeyword}"
- 카테고리: "${video.category}"`;
    }).join('\n');

    const prompt = `🎬 YouTube Shorts 영상 태그 분류

다음 ${videosData.length}개 영상에 대해 **실용적이고 유용한** 태그를 생성해주세요.

${videoPrompts}

**분류 기준:**

1. **주제 (Topic)**: 영상의 구체적인 소재와 내용
   - 예시: 먹방, 요리, 운동, 게임, 메이크업, 여행, 음악, 댄스, 리뷰

2. **분위기/감정 (Mood)**: 영상이 주는 느낌 (일반적인 표현 사용)
   - 예시: 신나는, 차분한, 힐링되는, 재미있는, 감성적인, 따뜻한, 시원한, 긴장감있는

3. **상황/맥락 (Context)**: 영상을 시청하기 좋은 상황
   - 예시: 퇴근길에, 운동할때, 공부할때, 잠들기전에, 아침에, 휴식할때, 스트레스받을때

4. **장르/형식 (Genre)**: 영상의 포맷과 스타일
   - 예시: 브이로그, 튜토리얼, 리뷰, 먹방, ASMR, 플레이리스트, 챌린지, 하이라이트

**중요 지침:**
- 각 카테고리당 2-4개 태그 생성
- 일반적이고 이해하기 쉬운 표현 사용
- 영상 내용과 잘 어울리는 적절한 태그만 선택
- 과도하게 특이하거나 어색한 표현 피하기
- 실제 사용자가 검색할 만한 키워드 중심

**JSON 응답 형식:**
{
  "classifications": [
    {
      "videoId": "영상ID1",
      "tags": {
        "topics": ["주제1", "주제2", "주제3"],
        "moods": ["감정1", "감정2", "감정3"],
        "contexts": ["상황1", "상황2", "상황3"],
        "genres": ["장르1", "장르2"]
      },
      "confidence": 0.9
    }
  ]
}`;

    try {
      this.stats.apiCallCount++;
      const startTime = Date.now();

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      });

      const processingTime = Date.now() - startTime;
      const content = response.content[0].text;
      
      // JSON 추출
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 응답 검증
        if (parsed.classifications && Array.isArray(parsed.classifications)) {
          console.log(`✅ LLM 분류 성공: ${parsed.classifications.length}개 영상`);
          
          return {
            success: true,
            classifications: parsed.classifications,
            processingTime,
            rawResponse: content
          };
        } else {
          throw new Error('잘못된 JSON 구조');
        }
      } else {
        throw new Error('JSON 응답을 찾을 수 없음');
      }

    } catch (error) {
      console.error('❌ LLM 분류 실패:', error.message);
      return {
        success: false,
        error: error.message,
        classifications: []
      };
    }
  }

  /**
   * 🔄 폴백 태그 생성 (LLM 실패 시)
   */
  generateFallbackTags(videoData) {
    console.log(`🔄 폴백 태그 생성: ${videoData.videoId}`);

    const title = videoData.title || '';
    const description = videoData.description || '';
    const searchKeyword = videoData.searchKeyword || '';
    const category = videoData.category || '';

    // 기본 태그 추출 (간단한 키워드 매칭)
    const allText = `${title} ${description} ${searchKeyword} ${category}`.toLowerCase();

    const fallbackTags = {
      topics: [searchKeyword || '일반'].filter(Boolean),
      moods: [],
      contexts: [],
      genres: [category || '일반'].filter(Boolean)
    };

    // 감정 키워드 매칭
    const emotionMap = {
      '힐링': ['힐링되는', '차분한'],
      '신나는': ['신나는', '재미있는'],
      '재미': ['재미있는', '유쾌한'],
      '감성': ['감성적인', '따뜻한'],
      '스트레스': ['시원한', '속시원한'],
      '운동': ['활기찬', '건강한'],
      '음악': ['감성적인', '편안한']
    };

    Object.entries(emotionMap).forEach(([keyword, moods]) => {
      if (allText.includes(keyword)) {
        fallbackTags.moods.push(...moods);
      }
    });

    // 상황 키워드 매칭
    const contextMap = {
      '퇴근': ['퇴근길에'],
      '공부': ['공부할때'],
      '운동': ['운동할때'],
      '잠': ['잠들기전에'],
      '아침': ['아침에'],
      '휴식': ['휴식할때'],
      '스트레스': ['스트레스받을때']
    };

    Object.entries(contextMap).forEach(([keyword, contexts]) => {
      if (allText.includes(keyword)) {
        fallbackTags.contexts.push(...contexts);
      }
    });

    // 기본값 설정
    if (fallbackTags.moods.length === 0) {
      fallbackTags.moods.push('일반적인');
    }
    if (fallbackTags.contexts.length === 0) {
      fallbackTags.contexts.push('언제든지');
    }

    return fallbackTags;
  }

  /**
   * 📊 통계 업데이트
   */
  updateStats(videoCount, success, processingTime) {
    this.stats.totalVideosProcessed += videoCount;
    if (success) {
      this.stats.successfulClassifications += videoCount;
    }
    
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalVideosProcessed - videoCount) + processingTime) / 
      this.stats.totalVideosProcessed;
  }

  /**
   * 📊 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalVideosProcessed > 0 
        ? ((this.stats.successfulClassifications / this.stats.totalVideosProcessed) * 100).toFixed(1) + '%'
        : '0%',
      claudeAvailable: !!this.anthropic
    };
  }
}

// 전역 인스턴스
const videoTagger = new VideoTagger();

/**
 * 🎬 주요 함수들
 */

// 단일 영상 분류
export async function classifyVideo(videoData) {
  return await videoTagger.classifyVideo(videoData);
}

// 배치 영상 분류
export async function classifyVideoBatch(videosData, batchSize = 10) {
  return await videoTagger.classifyVideoBatch(videosData, batchSize);
}

// 통계 조회
export function getVideoTaggerStats() {
  return videoTagger.getStats();
}

export default videoTagger;

/**
 * 🎯 사용 예시
 * 
 * // 단일 영상 분류
 * const videoData = {
 *   videoId: "dQw4w9WgXcQ",
 *   title: "[플레이리스트] 퇴근 후 지친 나를 위로하는 감성 재즈 피아노",
 *   description: "오늘 하루도 수고한 당신을 위한 선물. 따뜻한 커피 한 잔과 함께 힐링하세요.",
 *   searchKeyword: "힐링 피아노",
 *   category: "음악"
 * };
 * 
 * const result = await classifyVideo(videoData);
 * // 예상 결과:
 * // {
 * //   "topics": ["피아노", "재즈", "플레이리스트"],
 * //   "moods": ["차분한", "힐링되는", "감성적인"],
 * //   "contexts": ["퇴근길에", "휴식할때", "잠들기전에"],
 * //   "genres": ["플레이리스트", "음악"]
 * // }
 * 
 * // 배치 영상 분류
 * const batchResult = await classifyVideoBatch(videosArray, 15);
 */ 