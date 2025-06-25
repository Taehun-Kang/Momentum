/**
 * 🧠 v2 감정 분석 서비스
 * Railway v2 emotion API 전용 래퍼
 */

import { apiClientV2 } from './apiClientV2.js'

class EmotionServiceV2 {
  constructor() {
    this.apiClient = apiClientV2
    console.log('🧠 v2 Emotion Service 초기화')
  }

  /**
   * 🌟 감정 기반 키워드 추천 (메인 기능)
   * @param {string} userInput - 사용자 입력 텍스트
   * @param {Object} options - 추천 옵션
   * @returns {Promise<Object>} 감정 분석 및 키워드 추천 결과
   */
  async recommendKeywords(userInput, options = {}) {
    try {
      console.log('🌟 v2 감정 기반 키워드 추천 시작:', userInput)

      const requestData = {
        userInput: userInput.trim(),
        maxKeywords: options.maxKeywords || 15,
        format: options.format || 'full'
      }

      const response = await this.apiClient.post('/emotion/recommend', requestData)

      if (response.success) {
        console.log('✅ v2 감정 추천 성공:', {
          emotion: response.emotion?.primary,
          keywordsCount: response.keywords?.selected?.length || 0,
          sentencesCount: response.sentences?.length || 0,
          duration: response.duration
        })

        return {
          success: true,
          emotion: response.emotion,
          keywords: response.keywords,
          sentences: response.sentences,
          duration: response.duration,
          userInput: response.userInput,
          timestamp: response.timestamp
        }
      } else {
        throw new Error(response.error || 'v2 감정 추천 실패')
      }

    } catch (error) {
      console.error('❌ v2 감정 추천 실패:', error.message)
      
      // 폴백 없이 실패 반환
      return {
        success: false,
        error: error.message,
        userInput: userInput,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 🎨 v2 API 결과를 ChatFlow 카드 데이터로 변환
   * @param {Object} v2Result - v2 API 결과
   * @returns {Array} 카드 데이터 배열
   */
  transformToCardData(v2Result) {
    if (!v2Result.success || !v2Result.sentences) {
      console.warn('⚠️ v2 결과 변환 실패, 빈 배열 반환')
      return []
    }

    return v2Result.sentences.map((sentence, index) => ({
      icon: this.getEmotionIcon(sentence.keywords?.[0] || '일반'),
      title: sentence.text,
      description: `추천 키워드: ${sentence.keywords?.slice(0, 2).join(', ') || '일반'}`,
      value: sentence.text,
      curationId: `v2_${Date.now()}_${index}`,
      keywords: sentence.keywords || [],
      confidence: 0.9,
      isV2: true,
      clickData: {
        originalSentence: sentence.text,
        keywords: sentence.keywords,
        basedOn: 'v2_emotion_api'
      }
    }))
  }

  /**
   * 🎨 키워드에 따른 이모지 선택
   * @param {string} keyword - 키워드
   * @returns {string} 이모지
   */
  getEmotionIcon(keyword) {
    const iconMap = {
      '휴식': '��',
      '힐링': '🌿',
      'ASMR': '🎧',
      '편안한': '☁️',
      '즐거운': '😄',
      '신나는': '✨',
      '행복한': '🌈',
      '위로': '🕯️',
      '평온한': '🌊',
      '일상': '☀️',
      '재미있는': '🎪'
    }

    for (const [key, icon] of Object.entries(iconMap)) {
      if (keyword?.includes(key)) return icon
    }

    return '✨' // 기본 아이콘
  }
}

// 싱글톤 인스턴스 생성
export const emotionServiceV2 = new EmotionServiceV2()
