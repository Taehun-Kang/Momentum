import { apiClient } from './apiClient.js'

// 트렌드 관련 API 서비스
class TrendsService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5분 캐시
  }

  // 🔥 트렌딩 키워드 조회 (홈페이지용)
  async getTrendingKeywords(limit = 6) {
    try {
      console.log('🔍 트렌딩 키워드 조회 시작:', { limit })
      
      // 캐시 확인
      const cacheKey = `trending_keywords_${limit}`
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('💾 캐시된 데이터 사용')
          return cached.data
        }
      }

      // 🎯 새로 추가한 전체 키워드 분석 API 호출
      console.log('🌐 API 호출 시작:', `/api/v1/trends_db/keyword-analysis?limit=20&minQualityScore=0.0&includeExpired=true`)
      const response = await apiClient.get(
        `/api/v1/trends_db/keyword-analysis?limit=20&minQualityScore=0.0&includeExpired=true`
      )

      console.log('📥 API 응답 받음:', {
        success: response.success,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
        responseKeys: Object.keys(response)
      })

      if (response.success && response.data && response.data.length > 0) {
        console.log('✅ 응답 데이터 확인됨:', {
          totalKeywords: response.data.length,
          firstKeyword: response.data[0]?.keyword,
          lastKeyword: response.data[response.data.length - 1]?.keyword
        })

        // 🔄 순서 뒤집기: 첼시 승리가 위로, 발로란트 토론토가 아래로
        const reversedData = [...response.data].reverse()
        console.log('🔄 순서 뒤집기 완료:', {
          newFirstKeyword: reversedData[0]?.keyword,
          newLastKeyword: reversedData[reversedData.length - 1]?.keyword
        })
        
        // 📊 상위 6개만 선택
        const topKeywords = reversedData.slice(0, limit)
        console.log('📊 상위 키워드 선택:', {
          selectedCount: topKeywords.length,
          keywords: topKeywords.map(k => k.keyword)
        })
        
        // 데이터 가공
        const keywords = this.transformKeywordAnalysisData(topKeywords)
        console.log('🔧 데이터 변환 완료:', {
          transformedCount: keywords.length,
          sampleKeyword: keywords[0]
        })
        
        // 캐시 저장
        this.cache.set(cacheKey, {
          data: { success: true, keywords },
          timestamp: Date.now()
        })
        
        console.log(`✅ 트렌딩 키워드 ${keywords.length}개 조회 성공 (순서 뒤집기 완료)`)
        return { success: true, keywords }
      }

      console.log('❌ 응답 데이터 조건 불만족:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length
      })
      throw new Error(response.error || '키워드 분석 데이터가 없습니다')

    } catch (error) {
      console.error('❌ 트렌딩 키워드 조회 실패:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n')[0]
      })
      
      // 폴백: 고품질 키워드 분석 (기존 로직)
      try {
        console.log('🔄 폴백 API 시도:', `/api/v1/trends_db/keyword-analysis/high-quality?limit=${limit}&minScore=0.5&includeExpired=true`)
        const fallbackResponse = await apiClient.get(
          `/api/v1/trends_db/keyword-analysis/high-quality?limit=${limit}&minScore=0.5&includeExpired=true`
        )
        
        console.log('📥 폴백 응답:', {
          success: fallbackResponse.success,
          hasData: !!fallbackResponse.data
        })
        
        if (fallbackResponse.success) {
          const keywords = this.transformKeywordData(fallbackResponse.data.analyses || fallbackResponse.data)
          console.log('🔄 폴백 API 사용: 고품질 키워드 분석')
          return { success: true, keywords, fallback: true }
        }
      } catch (fallbackError) {
        console.error('❌ 폴백 API도 실패:', fallbackError.message)
      }
      
      // 최종 폴백: 기본 데이터
      console.log('🛡️ 최종 폴백: 기본 키워드 사용')
      const fallbackKeywords = this.getFallbackKeywords()
      return { 
        success: false, 
        error: error.message,
        keywords: fallbackKeywords
      }
    }
  }

  // 📊 오늘의 트렌드 요약
  async getTodaysSummary() {
    try {
      const response = await apiClient.get('/api/v1/trends_db/today/summary')
      
      if (response.success) {
        return { success: true, summary: response.data }
      }

      throw new Error(response.error || '오늘의 트렌드 요약 조회 실패')

    } catch (error) {
      console.error('오늘의 트렌드 요약 조회 실패:', error.message)
      return { 
        success: false, 
        error: error.message 
      }
    }
  }

  // 🎯 데이터 변환 (API 응답 → UI 형식)
  transformKeywordData(rawData) {
    if (!Array.isArray(rawData)) {
      return []
    }

    return rawData.slice(0, 10).map((item, index) => {
      // 다양한 API 응답 형식 지원
      const keyword = item.keyword || item.refined_keyword || item.title || item.name || '키워드 없음'
      const score = item.trend_score || item.score || item.quality_score || Math.random() * 100
      const category = item.category || item.trend_category || '일반'
      
      return {
        id: item.id || `trend_${index}`,
        keyword: keyword,
        rank: index + 1,
        score: Math.round(score),
        category: category,
        trend: score > 70 ? 'up' : score > 40 ? 'stable' : 'down',
        change: item.score_change || (Math.random() - 0.5) * 20,
        updatedAt: item.created_at || item.updated_at || new Date().toISOString()
      }
    })
  }

  // 🛡️ 폴백 키워드 데이터
  getFallbackKeywords() {
    return [
      { id: 'fallback_1', keyword: '먹방', rank: 1, score: 85, category: '엔터테인먼트', trend: 'up', change: 5.2 },
      { id: 'fallback_2', keyword: '브이로그', rank: 2, score: 78, category: '라이프스타일', trend: 'up', change: 3.1 },
      { id: 'fallback_3', keyword: '챌린지', rank: 3, score: 72, category: '엔터테인먼트', trend: 'stable', change: 1.8 },
      { id: 'fallback_4', keyword: 'ASMR', rank: 4, score: 69, category: '힐링', trend: 'up', change: 2.5 },
      { id: 'fallback_5', keyword: '운동', rank: 5, score: 65, category: '건강', trend: 'stable', change: 0.3 },
      { id: 'fallback_6', keyword: '요리', rank: 6, score: 62, category: '라이프스타일', trend: 'down', change: -1.2 }
    ]
  }

  // 🧹 캐시 정리
  clearCache() {
    this.cache.clear()
  }

  // 🎯 키워드 분석 데이터 변환 (새로 추가)
  transformKeywordAnalysisData(rawData) {
    if (!Array.isArray(rawData)) {
      return []
    }

    return rawData.map((item, index) => {
      // trends_keyword_analysis 테이블 구조에 맞춤
      const keyword = item.keyword || '키워드 없음'
      const qualityScore = (item.analysis_quality_score || 0.5) * 100 // 0-1 범위를 0-100으로 변환
      const category = this.inferCategoryFromKeyword(keyword)
      
      return {
        id: item.id || `trend_${index}`,
        keyword: keyword,
        rank: index + 1,
        score: Math.round(qualityScore),
        category: category,
        updatedAt: item.created_at || new Date().toISOString(),
        // 추가 정보
        trendStatus: item.trend_status,
        newsContext: item.news_context,
        youtubeKeywords: item.youtube_keywords || []
      }
    })
  }

  // 🔍 키워드로부터 카테고리 추론 (새로 추가)
  inferCategoryFromKeyword(keyword) {
    const categoryMap = {
      '게임': ['발로란트', '카트라이더', '게임'],
      '스포츠': ['첼시', '축구', '승리'],
      '정치': ['하메네이', '송언석', '원내대표'],
      '엔터테인먼트': ['올데이프로젝트', '데뷔', '왁제이맥스', '논란'],
      '사회': ['최여진', '결혼', '민생지원금', '지급'],
      '기술': ['티머니', '애플페이', 'IT']
    }

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(k => keyword.includes(k))) {
        return category
      }
    }

    return '일반'
  }
}

// 싱글톤 인스턴스 생성
export const trendsService = new TrendsService() 