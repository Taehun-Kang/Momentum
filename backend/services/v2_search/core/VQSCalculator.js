/**
 * 📊 VQSCalculator - Video Quality Score Calculator (Universal Edition)
 * 
 * 핵심 기능:
 * - 보편적 적용 가능한 VQS 계산 (모든 키워드/장르)
 * - 로그 변환을 통한 극값 완화
 * - 채널 크기별 상대 평가
 * - 개선된 스케일링 및 가중치
 */

class VQSCalculator {
  constructor() {
    // 보편적 VQS 가중치 설정 (합계: 1.0)
    this.weights = {
      engagement: 0.35,   // 참여도 (조정됨)
      velocity: 0.25,     // 성장 속도 (조정됨)
      authority: 0.25,    // 채널 권위 (상향됨)
      quality: 0.15       // 영상 품질 (상향됨)
    }
  }

  /**
   * 키워드별 배치 VQS 계산 - 메인 기능 (개선된 버전)
   * @param {Array} videos - 영상 배열
   * @param {string} keyword - 키워드 (로깅용)
   * @returns {Array} VQS 점수가 추가된 영상 배열
   */
  async calculateBatch(videos, keyword) {
    if (!videos || videos.length === 0) {
      console.log(`⚠️  "${keyword}": 영상이 없습니다`)
      return []
    }

    console.log(`📊 VQS 계산 시작: "${keyword}" (${videos.length}개 영상)`)

    // 1. 각 영상의 Raw 메트릭 계산 (개선된 공식)
    const videosWithRawScores = videos.map(video => ({
      ...video,
      raw_engagement: this.calculateEngagementV2(video),
      raw_velocity: this.calculateVelocityV2(video),
      raw_authority: this.calculateAuthorityV2(video),
      raw_quality: this.calculateQualityV2(video)
    }))

    // 2. 키워드 내 정규화 (개선된 방식)
    const normalizedVideos = this.normalizeScoresV2(videosWithRawScores)

    // 3. 최종 VQS 점수 계산 (개선된 스케일링)
    const finalVideos = normalizedVideos.map(video => ({
      ...video,
      vqs_score: this.calculateFinalVQSV2(video)
    }))

    // 4. VQS 점수순 정렬
    finalVideos.sort((a, b) => b.vqs_score - a.vqs_score)

    console.log(`✅ VQS 계산 완료: "${keyword}" (최고점수: ${finalVideos[0]?.vqs_score})`)

    return finalVideos
  }

  /**
   * 참여도 점수 계산 V2 (개선된 버전)
   * @param {Object} video - 영상 객체
   * @returns {number} 참여도 점수
   */
  calculateEngagementV2(video) {
    const views = video.views || 1
    const likes = video.likes || 0
    const comments = video.num_comments || 0
    const subscribers = video.subscribers || 1

    // 채널 크기별 기대 참여도 조정
    const channelMultiplier = this.getChannelSizeMultiplier(subscribers)
    
    // 로그 변환으로 극값 완화 + 비율 정규화
    const likeRate = Math.log10(1 + (likes / views * 10000)) / 4  // 0-1 범위
    const commentRate = Math.log10(1 + (comments / views * 10000)) / 4
    
    // 통합 참여도 (좋아요에 더 큰 가중치)
    const baseEngagement = (likeRate * 0.75) + (commentRate * 0.25)
    
    return Math.min(1.0, baseEngagement * channelMultiplier)
  }

  /**
   * 채널 크기별 참여도 보정 계수
   * @param {number} subscribers - 구독자 수
   * @returns {number} 보정 계수
   */
  getChannelSizeMultiplier(subscribers) {
    if (subscribers < 1000) return 1.5        // 초소형 채널 대폭 보정
    if (subscribers < 10000) return 1.3       // 소형 채널 보정
    if (subscribers < 100000) return 1.1      // 중소형 채널 소폭 보정
    if (subscribers < 1000000) return 1.0     // 중형 채널 기준점
    if (subscribers < 10000000) return 0.9    // 대형 채널 높은 기준
    return 0.8  // 메가 채널 매우 높은 기준
  }

  /**
   * 성장 속도 점수 계산 V2 (시간 가중치 적용)
   * @param {Object} video - 영상 객체
   * @returns {number} 성장 속도 점수
   */
  calculateVelocityV2(video) {
    const views = video.views || 0
    const uploadDate = new Date(video.date_posted)
    const now = new Date()
    const hoursOld = Math.max(1, (now - uploadDate) / (1000 * 60 * 60))
    
    // 시간대별 가중치 (최신성 우대)
    let timeWeight = 1.0
    if (hoursOld <= 24) {
      timeWeight = 2.0      // 24시간 이내 대폭 가산
    } else if (hoursOld <= 168) {
      timeWeight = 1.5      // 1주일 이내 가산
    } else if (hoursOld <= 720) {
      timeWeight = 1.2      // 1개월 이내 소폭 가산
    } else if (hoursOld <= 8760) {
      timeWeight = 0.8      // 1년 이내 감산
    } else {
      timeWeight = 0.5      // 1년 이상 큰 감산
    }
    
    const viewsPerHour = views / hoursOld
    
    // 로그 변환 + 시간 가중치 + 정규화
    const velocityScore = Math.log10(1 + viewsPerHour) / 6  // 0-1 범위 조정
    
    return Math.min(1.0, velocityScore * timeWeight)
  }

  /**
   * 채널 권위 점수 계산 V2 (개선된 로그 스케일)
   * @param {Object} video - 영상 객체
   * @returns {number} 채널 권위 점수
   */
  calculateAuthorityV2(video) {
    const subscribers = Math.max(1, video.subscribers || 1)
    const isVerified = video.verified || false

    // 개선된 로그 스케일 (0-1 범위)
    const logSubscribers = Math.log10(subscribers)
    const maxLog = 8  // 1억 구독자 기준
    const subscriberScore = Math.min(1.0, logSubscribers / maxLog)
    
    // 인증 채널 보너스
    const verifiedBonus = isVerified ? 1.2 : 1.0
    
    return Math.min(1.0, subscriberScore * verifiedBonus)
  }

  /**
   * 영상 품질 점수 계산 V2 (향상된 품질 지표)
   * @param {Object} video - 영상 객체
   * @returns {number} 영상 품질 점수
   */
  calculateQualityV2(video) {
    const length = video.video_length || 0
    const confidence = video.classification_confidence || 0.5

    // Shorts 최적 길이 점수 (개선된 곡선)
    let lengthScore = 0.3 // 기본 점수
    if (length >= 15 && length <= 45) {
      lengthScore = 1.0   // 황금 구간
    } else if (length >= 10 && length <= 60) {
      lengthScore = 0.8   // 양호 구간
    } else if (length >= 5 && length <= 10) {
      lengthScore = 0.6   // 너무 짧음
    } else if (length > 60) {
      // 60초 초과 시 점진적 감소
      lengthScore = Math.max(0.2, 0.8 - (length - 60) * 0.01)
    }

    // 분류 신뢰도 (기본값 향상)
    const confidenceScore = Math.min(1.0, confidence + 0.2)

    return (lengthScore * 0.6) + (confidenceScore * 0.4)
  }

  /**
   * 키워드 내 점수 정규화 V2 (개선된 정규화)
   * @param {Array} videos - Raw 점수가 있는 영상 배열
   * @returns {Array} 정규화된 점수가 있는 영상 배열
   */
  normalizeScoresV2(videos) {
    const metrics = ['raw_engagement', 'raw_velocity', 'raw_authority', 'raw_quality']
    
    // 각 메트릭별 통계 계산
    const stats = {}
    metrics.forEach(metric => {
      const values = videos.map(v => v[metric]).filter(v => !isNaN(v))
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length)
      
      stats[metric] = {
        min: Math.min(...values),
        max: Math.max(...values),
        mean,
        std
      }
    })

    // Z-Score + Min-Max 혼합 정규화
    return videos.map(video => {
      const normalized = { ...video }
      
      metrics.forEach(metric => {
        const normalizedMetric = metric.replace('raw_', 'norm_')
        const stat = stats[metric]
        const value = video[metric]
        
        if (stat.max === stat.min) {
          normalized[normalizedMetric] = 0.5
        } else {
          // Min-Max 정규화 (0-1)
          normalized[normalizedMetric] = (value - stat.min) / (stat.max - stat.min)
        }
      })

      return normalized
    })
  }

  /**
   * 최종 VQS 점수 계산 V2 (개선된 스케일링)
   * @param {Object} video - 정규화된 점수가 있는 영상 객체
   * @returns {number} 최종 VQS 점수 (0-100)
   */
  calculateFinalVQSV2(video) {
    const rawScore = 
      (video.norm_engagement * this.weights.engagement) +
      (video.norm_velocity * this.weights.velocity) +
      (video.norm_authority * this.weights.authority) +
      (video.norm_quality * this.weights.quality)

    // 개선된 스케일링 (더 넓은 점수 분포)
    // S자 곡선을 사용하여 중간값들을 확장
    const sigmoid = (x) => 1 / (1 + Math.exp(-12 * (x - 0.5)))
    const scaledScore = sigmoid(rawScore)
    
    // 0-100 점수로 변환 (더 관대한 스케일)
    return Math.round(scaledScore * 100)
  }

  /**
   * 상위 N개 영상 선별
   * @param {Array} videos - VQS 점수가 계산된 영상 배열
   * @param {number} limit - 선별할 영상 수 (기본: 100)
   * @returns {Array} 상위 N개 영상
   */
  getTopVideos(videos, limit = 100) {
    return videos
      .sort((a, b) => b.vqs_score - a.vqs_score)
      .slice(0, limit)
      .map((video, index) => ({
        ...video,
        rank: index + 1
      }))
  }

  /**
   * VQS 계산 통계 정보
   * @param {Array} videos - VQS 점수가 계산된 영상 배열
   * @returns {Object} 통계 정보
   */
  getVQSStats(videos) {
    if (!videos || videos.length === 0) return {}

    const scores = videos.map(v => v.vqs_score).filter(s => !isNaN(s))
    
    return {
      total_videos: videos.length,
      average_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highest_score: Math.max(...scores),
      lowest_score: Math.min(...scores),
      median_score: this.getMedian(scores),
      score_distribution: {
        excellent: scores.filter(s => s >= 80).length,    // 80점 이상
        good: scores.filter(s => s >= 60 && s < 80).length, // 60-79점  
        average: scores.filter(s => s >= 40 && s < 60).length, // 40-59점
        poor: scores.filter(s => s < 40).length           // 40점 미만
      }
    }
  }

  /**
   * 배열의 중앙값 계산
   * @param {Array} arr - 숫자 배열
   * @returns {number} 중앙값
   */
  getMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid]
  }
}

export default VQSCalculator 