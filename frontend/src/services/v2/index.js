/**
 * 🚀 v2 서비스 통합 Export
 * Railway v2 API 서비스들
 */

// v2 API 클라이언트
export { apiClientV2 } from './apiClientV2.js'

// v2 감정 분석 서비스
export { emotionServiceV2 } from './emotionServiceV2.js'

// v2 검색 서비스
export { searchServiceV2 } from './searchServiceV2.js'

/**
 * 🎯 v2 API 통합 워크플로우 (ChatFlow용)
 * 감정 분석 → 영상 검색까지 한 번에 처리
 * @param {string} userInput - 사용자 입력
 * @param {Object} options - 처리 옵션
 * @returns {Promise<Object>} 통합 처리 결과
 */
export async function processV2Workflow(userInput, options = {}) {
  try {
    console.log('🎯 v2 통합 워크플로우 시작:', userInput)

    const { emotionServiceV2 } = await import('./emotionServiceV2.js')
    const { searchServiceV2 } = await import('./searchServiceV2.js')

    const startTime = Date.now()

    // 1단계: 감정 분석 및 키워드 추천
    console.log('🧠 1단계: 감정 분석 시작...')
    const emotionResult = await emotionServiceV2.recommendKeywords(userInput, {
      maxKeywords: options.maxKeywords || 15
    })

    if (!emotionResult.success) {
      throw new Error('감정 분석 실패: ' + emotionResult.error)
    }

    // 2단계: 대표 키워드 선택
    const selectedKeyword = emotionResult.keywords?.selected?.[0] || 
                           emotionResult.sentences?.[0]?.keywords?.[0] || 
                           '일반'

    console.log('🔍 2단계: 영상 검색 시작... 키워드:', selectedKeyword)

    // 3단계: VQS 기반 영상 검색
    const searchResult = await searchServiceV2.searchForVideoPlayer(selectedKeyword, {
      limit: options.videoLimit || 20,
      minScore: options.minVqsScore || 85
    })

    const totalTime = Date.now() - startTime

    const result = {
      success: true,
      userInput: userInput,
      emotion: emotionResult.emotion,
      keywords: emotionResult.keywords,
      sentences: emotionResult.sentences,
      selectedKeyword: selectedKeyword,
      videos: searchResult.data || [],
      videoCount: searchResult.meta?.total_found || 0,
      performance: {
        emotionTime: emotionResult.duration || 0,
        searchTime: searchResult.meta?.query_time_ms / 1000 || 0,
        totalTime: Math.round(totalTime / 1000)
      },
      meta: {
        emotionSource: 'v2_emotion_api',
        searchSource: 'v2_search_vqs'
      },
      timestamp: new Date().toISOString()
    }

    console.log('✅ v2 통합 워크플로우 완료:', {
      emotion: result.emotion?.primary,
      selectedKeyword: result.selectedKeyword,
      videoCount: result.videoCount,
      totalTime: result.performance.totalTime + 's'
    })

    return result

  } catch (error) {
    console.error('❌ v2 통합 워크플로우 실패:', error.message)
    
    return {
      success: false,
      error: error.message,
      userInput: userInput,
      timestamp: new Date().toISOString()
    }
  }
}

// 기본 export (편의용)
export default {
  apiClientV2: async () => (await import('./apiClientV2.js')).apiClientV2,
  emotionServiceV2: async () => (await import('./emotionServiceV2.js')).emotionServiceV2,
  searchServiceV2: async () => (await import('./searchServiceV2.js')).searchServiceV2,
  processWorkflow: processV2Workflow
}
