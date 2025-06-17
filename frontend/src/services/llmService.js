/**
 * 🎯 LLM Service - 개인화 감성 분석 서비스
 * 
 * 백엔드의 personalizedCurationService와 연결
 */

import { apiClient } from './apiClient.js'

export class LLMService {
  constructor() {
    this.baseEndpoint = '/api/v1/llm'
    console.log('🎯 LLMService 초기화 완료')
  }

  /**
   * 🌟 감성 문장 분석 (메인 기능)
   * @param {string} userInput - 사용자 입력 텍스트
   * @param {Object} options - 분석 옵션
   * @returns {Promise<Object>} 감성 분석 결과
   */
  async analyzeEmotionalCuration(userInput, options = {}) {
    console.log('🌟 감성 분석 요청:', { userInput, options })

    try {
      const response = await apiClient.post(`${this.baseEndpoint}/analyze`, {
        userInput,
        options: {
          userId: options.userId || null,
          inputType: options.inputType || 'emotion', // 'emotion' | 'topic'
          maxKeywords: options.maxKeywords || 8,
          responseFormat: options.responseFormat || 'full' // 'full' | 'quick' | 'keywords-only'
        }
      })

      if (response.success) {
        console.log('✅ 감성 분석 성공:', {
          curationsCount: response.data.curations?.length || 0,
          keywordsCount: Object.keys(response.data.personalizedKeywords || {}).length,
          personalizationScore: response.data.personalizationScore
        })

        return {
          success: true,
          data: response.data,
          userAnalysis: response.userAnalysis,
          nextSteps: response.nextSteps,
          meta: response.meta
        }
      } else {
        throw new Error(response.message || '감성 분석 실패')
      }

    } catch (error) {
      console.error('❌ 감성 분석 실패:', error.message)
      
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackCurations(userInput)
      }
    }
  }

  /**
   * 🎯 감성 문장 클릭 추적
   * @param {string} curationId - 큐레이션 ID
   * @param {string} userId - 사용자 ID (선택사항)
   * @param {Object} clickData - 클릭 데이터
   * @returns {Promise<Object>} 클릭 추적 결과
   */
  async trackCurationClick(curationId, userId = null, clickData = {}) {
    console.log('🎯 클릭 추적 요청:', { curationId, userId, clickData })

    try {
      const response = await apiClient.post(`${this.baseEndpoint}/track-click`, {
        curationId,
        userId,
        clickData
      })

      if (response.success) {
        console.log('✅ 클릭 추적 성공:', response.message)

        return {
          success: true,
          message: response.message,
          data: response.data,
          meta: response.meta
        }
      } else {
        throw new Error(response.message || '클릭 추적 실패')
      }

    } catch (error) {
      console.error('❌ 클릭 추적 실패:', error.message)
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 🛡️ 폴백 감성 문장 생성
   * @param {string} userInput - 사용자 입력
   * @returns {Object} 폴백 큐레이션 데이터
   */
  getFallbackCurations(userInput) {
    const fallbackCurations = [
      {
        curationId: `fallback_${Date.now()}_1`,
        sentence: "지금 이 순간에 딱 맞는 영상을 찾아보세요",
        enhanced_sentence: "지금 이 순간에 딱 맞는 영상을 찾아보세요",
        keywords: this.extractSimpleKeywords(userInput),
        confidence: 0.5,
        fallback: true,
        clickData: {
          originalSentence: "지금 이 순간에 딱 맞는 영상을 찾아보세요",
          keywords: this.extractSimpleKeywords(userInput),
          basedOn: 'fallback'
        }
      },
      {
        curationId: `fallback_${Date.now()}_2`,
        sentence: "오늘 하루를 특별하게 만들어줄 영상은 어떨까요",
        enhanced_sentence: "오늘 하루를 특별하게 만들어줄 영상은 어떨까요",
        keywords: ['일상', '힐링'],
        confidence: 0.5,
        fallback: true,
        clickData: {
          originalSentence: "오늘 하루를 특별하게 만들어줄 영상은 어떨까요",
          keywords: ['일상', '힐링'],
          basedOn: 'fallback'
        }
      }
    ]

    return {
      curations: fallbackCurations,
      keywords: this.getFallbackKeywords(userInput),
      personalizationScore: 0.3
    }
  }

  /**
   * 🔧 간단한 키워드 추출 (폴백용)
   * @param {string} text - 텍스트
   * @returns {Array} 키워드 배열
   */
  extractSimpleKeywords(text) {
    if (!text || typeof text !== 'string') return ['영상']

    return text
      .replace(/[^\w\s가-힣]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .slice(0, 3)
      .concat(['영상']) // 기본 키워드 추가
  }

  /**
   * 🛡️ 폴백 키워드 생성
   * @param {string} userInput - 사용자 입력
   * @returns {Object} 폴백 키워드 데이터
   */
  getFallbackKeywords(userInput) {
    const simpleKeywords = this.extractSimpleKeywords(userInput)
    
    const keywordObj = {}
    simpleKeywords.forEach((keyword, index) => {
      keywordObj[keyword] = Math.max(0.3, 0.8 - (index * 0.1))
    })

    return {
      keywords: keywordObj,
      searchTerms: simpleKeywords,
      personalization: { score: 0.3 }
    }
  }

  /**
   * 🎨 감성 분석 결과를 ChatFlow 카드 데이터로 변환
   * @param {Object} analysisResult - 감성 분석 결과
   * @returns {Array} 카드 데이터 배열
   */
  transformToCardData(analysisResult) {
    if (!analysisResult.success || !analysisResult.data.curations) {
      return this.getFallbackCardData()
    }

    return analysisResult.data.curations.map((curation, index) => ({
      icon: this.getEmotionIcon(curation.keywords?.[0] || '일반'),
      title: curation.enhanced_sentence || curation.sentence,
      description: `추천 키워드: ${curation.keywords?.slice(0, 2).join(', ') || '일반'}`,
      value: curation.sentence,
      curationId: curation.curationId,
      keywords: curation.keywords || [],
      confidence: curation.confidence || 0.5,
      clickData: curation.clickData
    }))
  }

  /**
   * 🎨 키워드에 따른 이모지 선택
   * @param {string} keyword - 키워드
   * @returns {string} 이모지
   */
  getEmotionIcon(keyword) {
    const iconMap = {
      '힐링': '🌿',
      'ASMR': '🎧',
      '먹방': '🍽️',
      '브이로그': '📱',
      '여행': '✈️',
      '요리': '👩‍🍳',
      '운동': '💪',
      '음악': '🎵',
      '게임': '🎮',
      '댄스': '💃',
      '공부': '📚',
      '일상': '☀️'
    }

    for (const [key, icon] of Object.entries(iconMap)) {
      if (keyword?.includes(key)) return icon
    }

    return '✨' // 기본 아이콘
  }

  /**
   * 🛡️ 폴백 카드 데이터
   * @returns {Array} 폴백 카드 데이터
   */
  getFallbackCardData() {
    return [
      {
        icon: '✨',
        title: '지금 이 순간에 딱 맞는 영상을 찾아보세요',
        description: '추천 키워드: 일반, 영상',
        value: '지금 이 순간에 딱 맞는 영상을 찾아보세요',
        curationId: `fallback_${Date.now()}_1`,
        keywords: ['일반', '영상'],
        confidence: 0.5,
        fallback: true
      },
      {
        icon: '🌟',
        title: '오늘 하루를 특별하게 만들어줄 영상은 어떨까요',
        description: '추천 키워드: 일상, 힐링',
        value: '오늘 하루를 특별하게 만들어줄 영상은 어떨까요',
        curationId: `fallback_${Date.now()}_2`,
        keywords: ['일상', '힐링'],
        confidence: 0.5,
        fallback: true
      }
    ]
  }
}

// 싱글톤 인스턴스
export const llmService = new LLMService()
 