# 🔗 **Momentum 정확한 DB 연동 분석 가이드**

**(Database API 100% 테스트 완료 기반 - 2025.01.15)**

## 🎯 **핵심 발견사항**

이전 분석에서 놓쳤던 **복잡한 연쇄적 DB 업데이트 구조**를 정확히 파악했습니다:

- ❌ **이전 분석**: 단순한 1:1 DB 연결 (dailyKeywordUpdateService.js의 7개 TODO만)
- ✅ **실제 구조**: 하나의 작업이 **5-7개 DB를 연쇄적으로 업데이트**하는 복잡한 워크플로우

---

## 📊 **3개 서비스별 정확한 DB 연동 맵**

### **1. dailyKeywordUpdateService.js (Search 서비스) - 25개 DB 연동 포인트**

#### **🔍 입력 단계 (5개 DB 조회)**

```javascript
// 1-1. 오늘 갱신할 키워드 조회
await keywordService.getTodaysKeywords();
// → Keywords DB: GET /api/v1/keywords_db/daily/today

// 1-2. 중복 영상 확인
await videoService.checkDuplicateVideos(videoIds, keyword);
// → Videos DB: POST /api/v1/videos_db/cache/batch

// 1-3. 기존 채널 정보 조회
await videoService.getExistingChannels(channelIds);
// → Videos DB: GET /api/v1/videos_db/channels/bulk

// 1-4. 사용자 선호도 컨텍스트 (개인화용)
await userService.getGlobalPreferences();
// → Users DB: GET /api/v1/users_db/keyword-preferences/popular

// 1-5. 최근 검색 트렌드 확인
await searchService.getRecentSearchPatterns();
// → Search DB: GET /api/v1/search_db/trending-patterns
```

#### **💾 결과 저장 단계 (12개 DB 업데이트)**

```javascript
// 2-1. 영상 데이터 저장 (LLM 분류 포함)
await videoService.cacheVideoData({
  video_id,
  title,
  description,
  channel_id,
  llm_classification: { topic_tags, mood_tags, confidence },
  quality_score,
  is_playable,
});
// → Videos DB: POST /api/v1/videos_db/cache

// 2-2. 채널 정보 저장/업데이트
await videoService.saveChannelInfo({
  channel_id,
  channel_title,
  subscriber_count,
  quality_grade,
  collected_at,
});
// → Videos DB: POST /api/v1/videos_db/channels

// 2-3. 키워드 성과 기록
await keywordService.logKeywordPerformance({
  keyword_id,
  videos_found,
  quality_videos,
  processing_time,
  efficiency_score,
});
// → Keywords DB: POST /api/v1/keywords_db/performance/log

// 2-4. 검색 실행 기록
await searchService.logSearchExecution({
  search_type: "daily_update",
  keyword,
  results_count,
  processing_time,
  api_units_used,
  success_rate,
});
// → Search DB: POST /api/v1/search_db/executions

// 2-5. LLM 분류 처리 로그
await systemService.logLLMProcessing({
  session_id,
  model_name: "claude_api",
  processing_type: "video_classification",
  input_tokens,
  output_tokens,
  processing_time,
  success_count,
  failure_count,
});
// → System DB: POST /api/v1/system_db/llm-processing

// 2-6. API 사용량 추적
await systemService.logApiUsage({
  api_provider: "youtube_v3",
  api_endpoint: "search.list",
  api_units_used: 100,
  response_time,
  success: true,
});
// → System DB: POST /api/v1/system_db/api-usage

// 2-7. 일일 갱신 완료 리포트
await systemService.logExecutionReport({
  service_name: "daily_keyword_update",
  processed_keywords,
  new_videos_added,
  total_processing_time,
  api_costs_breakdown,
  success_rate,
  efficiency_metrics,
});
// → System DB: POST /api/v1/system_db/execution-reports

// 2-8. 트렌드 영향 분석 (영상 분류 결과 → 트렌드)
await trendsService.updateKeywordTrendScores({
  keyword,
  new_videos_count,
  avg_quality_score,
  engagement_metrics,
  classification_results,
});
// → Trends DB: PUT /api/v1/trends_db/keywords/trend-scores

// 2-9. 글로벌 감정 트렌드 업데이트
await emotionsService.updateGlobalEmotionTrends({
  collected_emotions: extracted_mood_tags,
  video_count,
  processing_date,
  confidence_scores,
});
// → Emotions DB: POST /api/v1/emotions_db/global-trends

// 2-10. 채널 품질 재계산
await videoService.updateChannelQualityMetrics(channelIds);
// → Videos DB: PUT /api/v1/videos_db/channels/quality-update

// 2-11. 키워드 실행 완료 마킹
await keywordService.markKeywordCompleted(keyword_id, {
  execution_time,
  videos_added,
  success: true,
});
// → Keywords DB: POST /api/v1/keywords_db/daily/complete-update

// 2-12. 캐시 성능 로깅
await systemService.logCachePerformance({
  cache_type: "video_details",
  hit_count,
  miss_count,
  cache_efficiency,
  data_size_bytes,
});
// → System DB: POST /api/v1/system_db/cache-performance
```

#### **🔄 연쇄 영향 단계 (8개 DB 업데이트)**

```javascript
// 3-1. 사용자 개인화 점수 재계산 (새 영상이 사용자 선호도에 미치는 영향)
await userService.recalculatePersonalizationScores({
  affected_keywords: processed_keywords,
  new_content_signals: classification_results,
});
// → Users DB: POST /api/v1/users_db/batch-personalization-update

// 3-2. 감정 분석 모델 학습 데이터 추가
await emotionsService.addTrainingData({
  video_metadata: classified_videos,
  emotion_labels: extracted_mood_tags,
  confidence_scores,
});
// → Emotions DB: POST /api/v1/emotions_db/training-data

// 3-3. 검색 추천 알고리즘 가중치 업데이트
await searchService.updateRecommendationWeights({
  successful_keywords,
  quality_distribution,
  user_engagement_predictions,
});
// → Search DB: PUT /api/v1/search_db/recommendation-weights

// 3-4. 트렌드 예측 모델 데이터 추가
await trendsService.addPredictionData({
  keyword_performance: performance_metrics,
  temporal_patterns,
  quality_correlations,
});
// → Trends DB: POST /api/v1/trends_db/prediction-data

// 3-5. 시스템 성능 메트릭 업데이트
await systemService.updateSystemMetrics({
  metric_type: "daily_update_performance",
  processing_efficiency,
  resource_utilization,
  bottleneck_analysis,
});
// → System DB: POST /api/v1/system_db/system-performance

// 3-6. 자동화 작업 결과 기록
await systemService.logAutomatedJob({
  job_type: "daily_keyword_update",
  start_time,
  end_time,
  status: "completed",
  resources_consumed,
  output_summary,
});
// → System DB: POST /api/v1/system_db/automated-jobs

// 3-7. 키워드 스케줄 업데이트 (다음 실행 계획)
await keywordService.updateExecutionSchedule({
  completed_keywords,
  next_execution_times,
  priority_adjustments,
  cycle_optimizations,
});
// → Keywords DB: PUT /api/v1/keywords_db/schedule/bulk-update

// 3-8. 전체 시스템 상태 업데이트
await systemService.updateSystemHealth({
  component: "daily_keyword_service",
  status: "healthy",
  last_execution: timestamp,
  performance_indicators,
  resource_usage,
});
// → System DB: PUT /api/v1/system_db/health-status
```

### **2. personalizedCurationService.js (LLM 서비스) - 18개 DB 연동 포인트**

#### **🔍 분석 준비 단계 (6개 DB 조회)**

```javascript
// 1-1. 사용자 개인화 데이터 조회
await userService.getUserProfile(userId);
// → Users DB: GET /api/v1/users_db/profile/${userId}

// 1-2. 사용자 키워드 선호도 조회
await userService.getUserKeywordPreferences(userId);
// → Users DB: GET /api/v1/users_db/${userId}/keyword-preferences

// 1-3. 사용자 감정 히스토리 조회
await emotionsService.getUserEmotionHistory(userId, { days: 30 });
// → Emotions DB: GET /api/v1/emotions_db/users/${userId}/emotion-history

// 1-4. 유사 사용자 패턴 조회
await userService.findSimilarUsers(userId, {
  similarity_threshold: 0.8,
  limit: 10,
});
// → Users DB: GET /api/v1/users_db/${userId}/similar-users

// 1-5. 글로벌 감정 트렌드 조회
await emotionsService.getCurrentEmotionTrends();
// → Emotions DB: GET /api/v1/emotions_db/current-trends

// 1-6. 인기 키워드 컨텍스트 조회
await keywordService.getPopularKeywordContext();
// → Keywords DB: GET /api/v1/keywords_db/context/popular
```

#### **💾 분석 결과 저장 (7개 DB 업데이트)**

```javascript
// 2-1. 감정 분석 결과 저장
await emotionsService.saveEmotionAnalysis(userId, {
  analyzed_text: userInput,
  detected_emotions,
  confidence_scores,
  context_factors,
  analysis_engine: "claude_api",
});
// → Emotions DB: POST /api/v1/emotions_db/analysis-results

// 2-2. 사용자 활동 기록
await userService.logUserActivity(userId, {
  activity_type: "llm_analysis",
  input_text_length: userInput.length,
  processing_time,
  personalization_score,
});
// → Users DB: POST /api/v1/users_db/${userId}/activity

// 2-3. LLM 처리 성능 로그
await systemService.logLLMProcessing({
  user_id: userId,
  model_name: "claude-3-sonnet",
  processing_type: "emotion_analysis",
  input_tokens,
  output_tokens,
  processing_time,
  success: true,
});
// → System DB: POST /api/v1/system_db/llm-processing

// 2-4. 개인화 점수 계산 및 업데이트
await userService.updatePersonalizationScore(userId, {
  new_score: personalizationScore,
  contributing_factors,
  calculation_method: "v3.2",
});
// → Users DB: POST /api/v1/users_db/${userId}/personalization-score

// 2-5. 감성 문장 큐레이션 저장 (클릭 추적용)
await emotionsService.saveCurationSentences(userId, {
  curations: optimizedCuration,
  analysis_context,
  generation_method: "v3.2",
});
// → Emotions DB: POST /api/v1/emotions_db/curations

// 2-6. 키워드 추출 결과 저장
await searchService.logKeywordExtraction({
  user_id: userId,
  source_text: userInput,
  extracted_keywords,
  extraction_confidence,
  method: "llm_enhanced",
});
// → Search DB: POST /api/v1/search_db/keyword-extractions

// 2-7. API 사용량 기록
await systemService.logApiUsage({
  api_provider: "claude_api",
  api_endpoint: "messages",
  user_id: userId,
  input_tokens,
  output_tokens,
  response_time,
});
// → System DB: POST /api/v1/system_db/api-usage
```

#### **🔄 클릭 추적 및 연쇄 업데이트 (5개 DB 업데이트)**

```javascript
// 3-1. 감성 문장 클릭 추적
await emotionsService.trackCurationClick(curationId, userId, {
  click_timestamp,
  selected_keywords,
  click_context,
  user_session_id,
});
// → Emotions DB: POST /api/v1/emotions_db/curation-clicks

// 3-2. 사용자 상호작용 기록
await userService.recordVideoInteraction(userId, {
  interaction_type: "curation_click",
  curation_id: curationId,
  keywords: selectedKeywords,
});
// → Users DB: POST /api/v1/users_db/${userId}/video-interactions

// 3-3. 키워드 선호도 업데이트 (클릭한 키워드들의 가중치 증가)
await userService.updateKeywordPreferences(userId, {
  keywords: selectedKeywords,
  preference_adjustment: +0.1,
  interaction_type: "curation_click",
});
// → Users DB: POST /api/v1/users_db/${userId}/keyword-preferences/bulk-update

// 3-4. 검색 실행 기록 (클릭으로 인한 검색)
await searchService.logSearchExecution({
  user_id: userId,
  search_type: "curation_triggered",
  keywords: selectedKeywords,
  trigger_id: curationId,
});
// → Search DB: POST /api/v1/search_db/executions

// 3-5. 감정 학습 데이터 업데이트 (클릭 = 감정 선택의 정확성 검증)
await emotionsService.addLearningFeedback({
  user_id: userId,
  original_analysis: emotionAnalysis,
  user_selection: clickedCuration,
  feedback_type: "implicit_positive",
});
// → Emotions DB: POST /api/v1/emotions_db/learning-feedback
```

### **3. trendVideoService.js (Video 서비스) - 22개 DB 연동 포인트**

#### **🔍 트렌드 수집 단계 (4개 DB 조회 + 저장)**

```javascript
// 1-1. 기존 트렌드 키워드 조회 (중복 방지)
await trendsService.getRecentTrendKeywords({ hours: 24 });
// → Trends DB: GET /api/v1/trends_db/keywords/recent

// 1-2. 캐시된 검색 결과 확인
await searchService.getCachedSearchResults(keywords);
// → Search DB: GET /api/v1/search_db/cached-results

// 1-3. 트렌드 키워드 저장
await trendsService.saveTrendKeywords({
  keywords: collectedKeywords,
  source: "google_trends",
  trend_scores,
  collection_timestamp,
});
// → Trends DB: POST /api/v1/trends_db/keywords

// 1-4. 트렌드 분석 결과 저장
await trendsService.saveTrendAnalysis({
  original_keywords: rawKeywords,
  refined_keywords: refinedKeywords,
  refinement_method: "news_based",
  analysis_metadata,
});
// → Trends DB: POST /api/v1/trends_db/analysis-results
```

#### **💾 영상 수집 및 저장 (8개 DB 업데이트)**

```javascript
// 2-1. 수집된 영상 대량 저장
await videoService.batchCacheVideos({
  videos: searchResults.allVideos,
  search_context: "trend_based",
  collection_timestamp,
});
// → Videos DB: POST /api/v1/videos_db/cache/batch

// 2-2. 채널 정보 대량 저장/업데이트
await videoService.batchSaveChannels({
  channels: channelInfoResults,
  quality_filter_applied: true,
  min_subscribers: 50000,
});
// → Videos DB: POST /api/v1/videos_db/channels/batch

// 2-3. 검색 실행 기록 (키워드별)
for (const keyword of keywords) {
  await searchService.logSearchExecution({
    search_type: "trend_video_collection",
    keyword,
    results_count: keywordResults[keyword].videoCount,
    api_units_used: 107,
    processing_time,
  });
}
// → Search DB: POST /api/v1/search_db/executions (multiple)

// 2-4. 트렌드 키워드 성과 업데이트
await trendsService.updateKeywordPerformance({
  keyword_results: keywordResults,
  success_metrics,
  quality_metrics,
  temporal_performance,
});
// → Trends DB: PUT /api/v1/trends_db/keywords/performance

// 2-5. 영상 품질 분석 결과 저장
await videoService.saveQualityAnalysis({
  videos: qualityVideos,
  filter_criteria: channelFilterConfig,
  quality_distribution,
  filtering_effectiveness,
});
// → Videos DB: POST /api/v1/videos_db/quality-analysis

// 2-6. API 비용 추적 (상세 분해)
await systemService.logApiUsage({
  api_provider: "youtube_v3",
  api_breakdown: {
    search_calls: searchApiCost,
    channel_info_calls: channelApiCost,
  },
  total_cost: summary.performance.apiCosts.total,
});
// → System DB: POST /api/v1/system_db/api-usage

// 2-7. 캐시 성능 메트릭
await systemService.logCachePerformance({
  cache_type: "trend_video_results",
  cache_efficiency,
  hit_miss_ratio,
  data_freshness_metrics,
});
// → System DB: POST /api/v1/system_db/cache-performance

// 2-8. 트렌드 예측 데이터 추가
await trendsService.addPredictionTrainingData({
  keyword_trend_correlation: trendCorrelationData,
  video_performance_patterns,
  temporal_trend_shifts,
});
// → Trends DB: POST /api/v1/trends_db/prediction-training
```

#### **🔄 품질 분석 및 연쇄 업데이트 (10개 DB 업데이트)**

```javascript
// 3-1. 채널 품질 재평가
await videoService.updateChannelQualityGrades({
  channel_ids: qualityChannelIds,
  new_video_data: qualityVideos,
  performance_indicators,
});
// → Videos DB: PUT /api/v1/videos_db/channels/quality-grades

// 3-2. 트렌드 영향력 분석
await trendsService.analyzeTrendImpact({
  trend_keywords: refinedKeywords,
  video_engagement_predictions,
  market_penetration_analysis,
});
// → Trends DB: POST /api/v1/trends_db/impact-analysis

// 3-3. 사용자 추천 가중치 업데이트 (새로운 트렌드 영상)
await userService.updateGlobalRecommendationWeights({
  trending_content: qualityVideos,
  trend_strength_indicators,
  demographic_preferences,
});
// → Users DB: POST /api/v1/users_db/recommendation-weights

// 3-4. 감정 트렌드 연관성 분석
await emotionsService.analyzeEmotionTrendCorrelation({
  trend_keywords: refinedKeywords,
  collected_video_moods,
  temporal_emotion_shifts,
});
// → Emotions DB: POST /api/v1/emotions_db/trend-correlations

// 3-5. 검색 알고리즘 최적화 데이터
await searchService.updateAlgorithmTrainingData({
  successful_trend_searches: keywordResults,
  quality_correlation_patterns,
  user_engagement_predictions,
});
// → Search DB: POST /api/v1/search_db/algorithm-training

// 3-6. 시스템 성능 벤치마크
await systemService.updatePerformanceBenchmarks({
  service_name: "trend_video_service",
  processing_metrics: performanceMetrics,
  efficiency_comparisons,
  resource_optimization_suggestions,
});
// → System DB: POST /api/v1/system_db/performance-benchmarks

// 3-7. 자동화 작업 성과 기록
await systemService.logAutomatedJobResults({
  job_type: "trend_video_collection",
  execution_summary: completionSummary,
  success_metrics,
  optimization_opportunities,
});
// → System DB: POST /api/v1/system_db/automated-job-results

// 3-8. 키워드 트렌드 스코어 업데이트
await keywordService.updateTrendBasedScores({
  keywords: refinedKeywords,
  trend_performance_data,
  video_quality_correlation,
});
// → Keywords DB: PUT /api/v1/keywords_db/trend-scores

// 3-9. 전체 시스템 상태 업데이트
await systemService.updateComponentHealth({
  component: "trend_video_service",
  health_indicators: serviceHealthMetrics,
  dependencies_status,
  performance_alerts,
});
// → System DB: PUT /api/v1/system_db/component-health

// 3-10. 트렌드 시각화 데이터 준비
await trendsService.generateVisualizationData({
  trend_timeline: temporalTrendData,
  keyword_network_analysis,
  quality_distribution_charts,
});
// → Trends DB: POST /api/v1/trends_db/visualization-data
```

---

## 🔗 **API 엔드포인트 매핑 요약**

### **필요한 API 총계: 65개 엔드포인트**

| 서비스                      | DB          | 필요 엔드포인트 수 | 핵심 API들                                           |
| --------------------------- | ----------- | ------------------ | ---------------------------------------------------- |
| dailyKeywordUpdateService   | Keywords DB | 8개                | getTodaysKeywords, markCompleted, updatePerformance  |
|                             | Videos DB   | 6개                | cacheVideoData, saveChannelInfo, batchOperations     |
|                             | Search DB   | 4개                | logExecution, updateWeights, getPatterns             |
|                             | System DB   | 5개                | logLLM, logAPI, logExecution, updateMetrics          |
|                             | Users DB    | 2개                | getPreferences, updatePersonalization                |
| personalizedCurationService | Users DB    | 8개                | getProfile, getPreferences, logActivity, updateScore |
|                             | Emotions DB | 7개                | saveAnalysis, trackClicks, getHistory, updateTrends  |
|                             | System DB   | 2개                | logLLM, logAPI                                       |
|                             | Search DB   | 1개                | logKeywordExtraction                                 |
| trendVideoService           | Trends DB   | 8개                | saveKeywords, saveAnalysis, updatePerformance        |
|                             | Videos DB   | 6개                | batchCache, batchChannels, updateQuality             |
|                             | Search DB   | 3개                | logExecution, updateAlgorithm, getCached             |
|                             | System DB   | 5개                | logAPI, logCache, updateBenchmarks                   |

---

## 🚨 **중요 발견사항**

### **1. 복잡도 급상승**

- **이전 예상**: 7개 TODO 처리 (1-2시간)
- **실제 필요**: **65개 API 연동 + 연쇄 업데이트 로직** (8-12시간)

### **2. 연쇄 업데이트 패턴**

- **하나의 영상 분류** → 5개 DB 업데이트
- **하나의 사용자 클릭** → 4개 DB 업데이트
- **하나의 트렌드 수집** → 7개 DB 업데이트

### **3. 성능 고려사항**

- **트랜잭션 관리**: 연쇄 업데이트 중 실패 시 롤백 전략 필요
- **비동기 처리**: 일부 업데이트는 백그라운드에서 처리 가능
- **배치 처리**: 대량 연산은 배치 API 활용 필요

### **4. 우선순위 재조정 필요**

- **1순위**: 핵심 비즈니스 로직 (영상 저장, 사용자 상호작용)
- **2순위**: 성능 메트릭 (시스템 로그, API 사용량)
- **3순위**: 고급 분석 (트렌드 예측, ML 학습 데이터)

---

## 📋 **다음 단계 실행 계획**

### **Phase 1: 핵심 비즈니스 로직 (4시간)**

1. **영상 & 채널 저장**: Videos DB 연동 (6개 API)
2. **사용자 상호작용**: Users DB 연동 (5개 API)
3. **감정 분석 저장**: Emotions DB 연동 (4개 API)

### **Phase 2: 검색 & 키워드 로직 (3시간)**

1. **키워드 관리**: Keywords DB 연동 (6개 API)
2. **검색 기록**: Search DB 연동 (4개 API)
3. **트렌드 분석**: Trends DB 연동 (5개 API)

### **Phase 3: 시스템 모니터링 (2시간)**

1. **성능 로깅**: System DB 연동 (8개 API)
2. **에러 처리 및 폴백**: 실패 시나리오 대응
3. **배치 처리 최적화**: 대량 연산 효율화

### **Phase 4: 고급 기능 (3시간)**

1. **ML 학습 데이터**: 예측 모델 훈련용 데이터 수집
2. **실시간 분석**: 라이브 트렌드 추적
3. **개인화 최적화**: 사용자별 맞춤 알고리즘

**총 예상 시간: 12시간** (기존 2시간 → 6배 증가)

하지만 **단계별 점진적 구현**으로 중간 결과물도 의미있게 활용 가능합니다.
