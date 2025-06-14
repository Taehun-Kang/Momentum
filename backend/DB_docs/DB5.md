# 🚀 Momentum YouTube AI 큐레이션 서비스 - 최종 구현 가이드

## Part 5: Service Layer 구현 (5개 서비스)

> **Version**: 4.0 FINAL  
> **Last Updated**: 2025-01-13  
> **Dependencies**: Part 1-4

---

## 📋 목차

1. [Service Layer 아키텍처](#1-service-layer-아키텍처)
2. [VideoService 구현](#2-videoservice-구현)
3. [UserService 구현](#3-userservice-구현)
4. [TrendService 구현](#4-trendservice-구현)
5. [RecommendationService 구현](#5-recommendationservice-구현)
6. [AnalyticsService 구현](#6-analyticsservice-구현)

---

## 1. Service Layer 아키텍처

### 1.1 기본 구조

```typescript
// services/base/BaseService.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import winston from "winston";

export abstract class BaseService {
  protected supabase: SupabaseClient<Database>;
  protected logger: winston.Logger;

  constructor(supabase: SupabaseClient<Database>, logger?: winston.Logger) {
    this.supabase = supabase;
    this.logger = logger || this.createDefaultLogger();
  }

  private createDefaultLogger(): winston.Logger {
    return winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "app.log" }),
      ],
    });
  }

  protected async logApiUsage(
    apiName: string,
    endpoint: string,
    units: number,
    metadata?: any
  ): Promise<void> {
    try {
      await this.supabase.from("api_usage_logs").insert({
        api_name: apiName,
        endpoint,
        units_consumed: units,
        request_params: metadata,
      });
    } catch (error) {
      this.logger.error("Failed to log API usage", { error });
    }
  }

  protected handleError(error: any, context: string): void {
    this.logger.error(`Error in ${context}`, {
      error: error.message,
      stack: error.stack,
      context,
    });
  }
}
```

### 1.2 타입 정의

```typescript
// types/services.ts
export interface ServiceConfig {
  supabase: SupabaseClient<Database>;
  logger?: winston.Logger;
  cache?: Redis;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface FilterParams {
  [key: string]: any;
}

export interface SortParams {
  field: string;
  direction: "asc" | "desc";
}

export interface ServiceResponse<T> {
  data?: T;
  error?: ServiceError;
  metadata?: {
    total?: number;
    page?: number;
    hasMore?: boolean;
  };
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}
```

---

## 2. VideoService 구현

### 2.1 VideoService 클래스

```typescript
// services/VideoService.ts
import { BaseService } from "./base/BaseService";
import { youtube_v3 } from "googleapis";
import { Anthropic } from "@anthropic-ai/sdk";
import { z } from "zod";

// 스키마 정의
const VideoSchema = z.object({
  video_id: z.string().max(20),
  title: z.string(),
  description: z.string().optional(),
  channel_id: z.string().max(50),
  channel_title: z.string().max(255),
  duration: z.number(),
  view_count: z.number().default(0),
  like_count: z.number().default(0),
  quality_score: z.number().min(0).max(1).default(0.5),
  is_playable: z.boolean().default(true),
  search_keyword: z.string().optional(),
});

const ClassificationSchema = z.object({
  primary_category: z.string().max(100),
  emotion_tags: z.array(z.string()).default([]),
  content_type: z.string().max(50),
  target_audience: z.string().max(50),
  mood_keywords: z.array(z.string()).default([]),
  classification_confidence: z.number().min(0).max(1).default(0.5),
});

export class VideoService extends BaseService {
  private youtube: youtube_v3.Youtube;
  private claude: Anthropic;
  private readonly YOUTUBE_API_KEY: string;
  private readonly CLAUDE_API_KEY: string;

  constructor(config: ServiceConfig) {
    super(config.supabase, config.logger);

    this.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;
    this.CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY!;

    this.youtube = new youtube_v3.Youtube({
      auth: this.YOUTUBE_API_KEY,
    });

    this.claude = new Anthropic({
      apiKey: this.CLAUDE_API_KEY,
    });
  }

  /**
   * YouTube 영상 검색 및 저장
   */
  async searchAndSaveVideos(
    keyword: string,
    maxResults: number = 10
  ): Promise<ServiceResponse<any[]>> {
    try {
      this.logger.info("Searching videos", { keyword, maxResults });

      // 1. YouTube 검색
      const searchResponse = await this.youtube.search.list({
        q: keyword,
        part: ["snippet"],
        type: ["video"],
        videoDuration: "short", // Shorts only
        maxResults,
        regionCode: "KR",
        relevanceLanguage: "ko",
      });

      await this.logApiUsage("youtube", "search.list", 100, { keyword });

      if (
        !searchResponse.data.items ||
        searchResponse.data.items.length === 0
      ) {
        return { data: [], metadata: { total: 0 } };
      }

      // 2. 상세 정보 조회
      const videoIds = searchResponse.data.items
        .map((item) => item.id?.videoId)
        .filter(Boolean) as string[];

      const detailsResponse = await this.youtube.videos.list({
        id: videoIds,
        part: ["snippet", "statistics", "contentDetails", "status"],
      });

      await this.logApiUsage("youtube", "videos.list", videoIds.length, {
        videoIds,
      });

      // 3. 영상 저장 및 분류
      const savedVideos = [];
      for (const video of detailsResponse.data.items || []) {
        const saved = await this.saveVideo(video, keyword);
        if (saved.data) {
          savedVideos.push(saved.data);
        }
      }

      return {
        data: savedVideos,
        metadata: { total: savedVideos.length },
      };
    } catch (error) {
      this.handleError(error, "searchAndSaveVideos");
      return {
        error: {
          code: "VIDEO_SEARCH_ERROR",
          message: "Failed to search and save videos",
          details: error,
        },
      };
    }
  }

  /**
   * 단일 영상 저장
   */
  private async saveVideo(
    youtubeVideo: youtube_v3.Schema$Video,
    searchKeyword?: string
  ): Promise<ServiceResponse<any>> {
    try {
      // 데이터 변환
      const videoData = this.transformYouTubeVideo(youtubeVideo, searchKeyword);

      // 스키마 검증
      const validated = VideoSchema.parse(videoData);

      // DB 저장
      const { data: video, error } = await this.supabase
        .from("videos")
        .upsert({
          ...validated,
          cached_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // LLM 분류 (비동기)
      this.classifyVideoAsync(video.video_id, youtubeVideo);

      // 키워드 매핑
      if (searchKeyword) {
        await this.createKeywordMapping(video.video_id, searchKeyword);
      }

      return { data: video };
    } catch (error) {
      this.handleError(error, "saveVideo");
      return {
        error: {
          code: "VIDEO_SAVE_ERROR",
          message: "Failed to save video",
          details: error,
        },
      };
    }
  }

  /**
   * YouTube 데이터 변환
   */
  private transformYouTubeVideo(
    video: youtube_v3.Schema$Video,
    searchKeyword?: string
  ): any {
    const duration = this.parseDuration(
      video.contentDetails?.duration || "PT0S"
    );
    const viewCount = parseInt(video.statistics?.viewCount || "0");
    const likeCount = parseInt(video.statistics?.likeCount || "0");

    return {
      video_id: video.id,
      title: video.snippet?.title || "",
      description: video.snippet?.description || "",
      channel_id: video.snippet?.channelId || "",
      channel_title: video.snippet?.channelTitle || "",
      published_at: video.snippet?.publishedAt,
      view_count: viewCount,
      like_count: likeCount,
      comment_count: parseInt(video.statistics?.commentCount || "0"),
      duration: duration,
      definition: video.contentDetails?.definition || "sd",
      caption: video.contentDetails?.caption === "true",
      is_embeddable: video.status?.embeddable !== false,
      is_playable: video.status?.uploadStatus === "processed",
      privacy_status: video.status?.privacyStatus || "public",
      thumbnails: {
        default: video.snippet?.thumbnails?.default?.url,
        medium: video.snippet?.thumbnails?.medium?.url,
        high: video.snippet?.thumbnails?.high?.url,
        maxres: video.snippet?.thumbnails?.maxres?.url,
      },
      tags: video.snippet?.tags || [],
      category_id: video.snippet?.categoryId,
      default_language: video.snippet?.defaultLanguage,
      quality_score: this.calculateQualityScore(viewCount, likeCount, duration),
      search_keyword: searchKeyword,
    };
  }

  /**
   * LLM 영상 분류 (비동기)
   */
  private async classifyVideoAsync(
    videoId: string,
    videoData: youtube_v3.Schema$Video
  ): Promise<void> {
    try {
      const classification = await this.classifyWithClaude(videoData);

      if (classification) {
        await this.supabase.from("video_classifications").upsert({
          video_id: videoId,
          ...classification,
          classified_by: "claude_api",
          model_version: "claude-3-sonnet-20240229",
        });
      }
    } catch (error) {
      this.logger.error("Failed to classify video", { videoId, error });
    }
  }

  /**
   * Claude API를 이용한 영상 분류
   */
  private async classifyWithClaude(
    video: youtube_v3.Schema$Video
  ): Promise<any> {
    try {
      const prompt = this.buildClassificationPrompt(video);

      const response = await this.claude.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      await this.logApiUsage("claude", "messages.create", 1, {
        model: "claude-3-sonnet-20240229",
        tokens: response.usage?.total_tokens,
      });

      // 응답 파싱
      const content =
        response.content[0].type === "text" ? response.content[0].text : "";

      return this.parseClassificationResponse(content);
    } catch (error) {
      this.logger.error("Claude API error", { error });
      return this.getFallbackClassification(video);
    }
  }

  /**
   * 분류 프롬프트 생성
   */
  private buildClassificationPrompt(video: youtube_v3.Schema$Video): string {
    return `
YouTube Shorts 영상을 분석하여 다음 5가지 항목으로 분류해주세요:

제목: ${video.snippet?.title}
설명: ${video.snippet?.description?.substring(0, 500)}
태그: ${video.snippet?.tags?.join(", ")}
카테고리: ${video.snippet?.categoryId}

다음 형식의 JSON으로 응답해주세요:
{
  "primary_category": "주요 카테고리 (예: 음악, 코미디, 교육, 게임 등)",
  "emotion_tags": ["감정1", "감정2", "감정3"],
  "content_type": "콘텐츠 유형 (예: dance, cooking, vlog, tutorial, asmr)",
  "target_audience": "타겟 연령대 (kids, teens, adults, all)",
  "mood_keywords": ["무드1", "무드2", "무드3"]
}

주의사항:
- emotion_tags는 happy, sad, excited, calm, stressed, anxious, angry, bored, inspired, nostalgic 중에서 선택
- mood_keywords는 한국어로 작성 (예: 신나는, 감동적인, 편안한, 재미있는)
- 정확하고 구체적으로 분류해주세요
`;
  }

  /**
   * Claude 응답 파싱
   */
  private parseClassificationResponse(response: string): any {
    try {
      // JSON 추출
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return ClassificationSchema.parse({
        ...parsed,
        classification_confidence: 0.85, // Claude 사용 시 기본 신뢰도
      });
    } catch (error) {
      this.logger.error("Failed to parse Claude response", { error, response });
      return null;
    }
  }

  /**
   * 폴백 분류 (LLM 실패 시)
   */
  private getFallbackClassification(video: youtube_v3.Schema$Video): any {
    const title = video.snippet?.title?.toLowerCase() || "";
    const description = video.snippet?.description?.toLowerCase() || "";
    const tags = video.snippet?.tags || [];

    // 간단한 규칙 기반 분류
    let category = "기타";
    let contentType = "general";
    let emotions = ["neutral"];
    let moods = ["일반적인"];

    // 카테고리 추론
    if (title.includes("게임") || tags.includes("gaming")) {
      category = "게임";
      contentType = "gaming";
      emotions = ["excited", "competitive"];
      moods = ["신나는", "경쟁적인"];
    } else if (title.includes("요리") || title.includes("레시피")) {
      category = "요리";
      contentType = "cooking";
      emotions = ["happy", "satisfied"];
      moods = ["맛있는", "실용적인"];
    } else if (title.includes("asmr")) {
      category = "힐링";
      contentType = "asmr";
      emotions = ["calm", "relaxed"];
      moods = ["편안한", "조용한"];
    }

    return {
      primary_category: category,
      emotion_tags: emotions,
      content_type: contentType,
      target_audience: "all",
      mood_keywords: moods,
      classification_confidence: 0.5,
      used_fallback: true,
    };
  }

  /**
   * 키워드-영상 매핑 생성
   */
  private async createKeywordMapping(
    videoId: string,
    keyword: string,
    relevanceScore: number = 0.7
  ): Promise<void> {
    try {
      await this.supabase.from("keyword_video_mappings").upsert({
        keyword,
        video_id: videoId,
        relevance_score: relevanceScore,
      });
    } catch (error) {
      this.logger.error("Failed to create keyword mapping", { error });
    }
  }

  /**
   * 품질 점수 계산
   */
  private calculateQualityScore(
    viewCount: number,
    likeCount: number,
    duration: number
  ): number {
    // 기본 점수
    let score = 0.5;

    // 조회수 기반 (0.3)
    if (viewCount > 1000000) score += 0.3;
    else if (viewCount > 100000) score += 0.25;
    else if (viewCount > 10000) score += 0.2;
    else if (viewCount > 1000) score += 0.1;

    // 참여율 기반 (0.2)
    const engagementRate = viewCount > 0 ? likeCount / viewCount : 0;
    score += Math.min(0.2, engagementRate * 10);

    // Shorts 길이 최적화 (0.1)
    if (duration >= 15 && duration <= 60) score += 0.1;

    return Math.min(1.0, Math.max(0.1, score));
  }

  /**
   * 영상 duration 파싱 (ISO 8601)
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || "0");
    const minutes = parseInt(match[2] || "0");
    const seconds = parseInt(match[3] || "0");

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * 영상 정보 업데이트
   */
  async updateVideoInfo(videoId: string): Promise<ServiceResponse<any>> {
    try {
      // YouTube API로 최신 정보 조회
      const response = await this.youtube.videos.list({
        id: [videoId],
        part: ["statistics", "status"],
      });

      if (!response.data.items || response.data.items.length === 0) {
        return {
          error: {
            code: "VIDEO_NOT_FOUND",
            message: "Video not found on YouTube",
          },
        };
      }

      const video = response.data.items[0];

      // DB 업데이트
      const { data, error } = await this.supabase
        .from("videos")
        .update({
          view_count: parseInt(video.statistics?.viewCount || "0"),
          like_count: parseInt(video.statistics?.likeCount || "0"),
          comment_count: parseInt(video.statistics?.commentCount || "0"),
          is_playable: video.status?.uploadStatus === "processed",
          privacy_status: video.status?.privacyStatus || "public",
          updated_at: new Date().toISOString(),
        })
        .eq("video_id", videoId)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error) {
      this.handleError(error, "updateVideoInfo");
      return {
        error: {
          code: "VIDEO_UPDATE_ERROR",
          message: "Failed to update video info",
          details: error,
        },
      };
    }
  }

  /**
   * 채널 정보 업데이트
   */
  async updateChannelInfo(channelId: string): Promise<ServiceResponse<any>> {
    try {
      // YouTube API로 채널 정보 조회
      const response = await this.youtube.channels.list({
        id: [channelId],
        part: ["snippet", "statistics", "brandingSettings"],
      });

      await this.logApiUsage("youtube", "channels.list", 1, { channelId });

      if (!response.data.items || response.data.items.length === 0) {
        return {
          error: {
            code: "CHANNEL_NOT_FOUND",
            message: "Channel not found",
          },
        };
      }

      const channel = response.data.items[0];

      // 채널 데이터 준비
      const channelData = {
        channel_id: channelId,
        channel_title: channel.snippet?.title || "",
        description: channel.snippet?.description || "",
        custom_url: channel.snippet?.customUrl,
        country: channel.snippet?.country,
        subscriber_count: parseInt(channel.statistics?.subscriberCount || "0"),
        video_count: parseInt(channel.statistics?.videoCount || "0"),
        view_count: parseInt(channel.statistics?.viewCount || "0"),
        channel_icon_url: channel.snippet?.thumbnails?.default?.url,
        channel_banner_url: channel.brandingSettings?.image?.bannerExternalUrl,
        last_updated: new Date().toISOString(),
      };

      // DB 저장/업데이트
      const { data, error } = await this.supabase
        .from("channel_profiles")
        .upsert(channelData)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error) {
      this.handleError(error, "updateChannelInfo");
      return {
        error: {
          code: "CHANNEL_UPDATE_ERROR",
          message: "Failed to update channel info",
          details: error,
        },
      };
    }
  }
}
```

---

## 3. UserService 구현

### 3.1 UserService 클래스

```typescript
// services/UserService.ts
import { BaseService } from "./base/BaseService";
import { z } from "zod";

// 스키마 정의
const UserProfileSchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string().max(100).optional(),
  avatar_url: z.string().url().optional(),
  user_tier: z.enum(["free", "premium", "pro", "enterprise"]).default("free"),
  preferences: z.record(z.any()).default({}),
});

const KeywordPreferenceSchema = z.object({
  user_id: z.string().uuid(),
  keyword: z.string().max(255),
  selection_count: z.number().min(0).default(1),
  preference_score: z.number().min(0).max(1).default(0.5),
});

const VideoInteractionSchema = z.object({
  user_id: z.string().uuid(),
  video_id: z.string().max(20),
  interaction_type: z.enum([
    "view",
    "like",
    "dislike",
    "share",
    "save",
    "skip",
    "report",
    "comment",
  ]),
  watch_duration: z.number().optional(),
  search_keyword: z.string().optional(),
  user_emotion: z.string().optional(),
});

export class UserService extends BaseService {
  /**
   * 사용자 프로필 조회
   */
  async getUserProfile(userId: string): Promise<ServiceResponse<any>> {
    try {
      const { data, error } = await this.supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // 프로필이 없는 경우 생성
          return this.createUserProfile(userId);
        }
        throw error;
      }

      return { data };
    } catch (error) {
      this.handleError(error, "getUserProfile");
      return {
        error: {
          code: "USER_PROFILE_ERROR",
          message: "Failed to get user profile",
          details: error,
        },
      };
    }
  }

  /**
   * 사용자 프로필 생성
   */
  async createUserProfile(
    userId: string,
    profileData?: Partial<any>
  ): Promise<ServiceResponse<any>> {
    try {
      const validated = UserProfileSchema.parse({
        user_id: userId,
        ...profileData,
      });

      const { data, error } = await this.supabase
        .from("user_profiles")
        .insert(validated)
        .select()
        .single();

      if (error) throw error;

      this.logger.info("User profile created", { userId });

      return { data };
    } catch (error) {
      this.handleError(error, "createUserProfile");
      return {
        error: {
          code: "PROFILE_CREATE_ERROR",
          message: "Failed to create user profile",
          details: error,
        },
      };
    }
  }

  /**
   * 사용자 프로필 업데이트
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<any>
  ): Promise<ServiceResponse<any>> {
    try {
      const { data, error } = await this.supabase
        .from("user_profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error) {
      this.handleError(error, "updateUserProfile");
      return {
        error: {
          code: "PROFILE_UPDATE_ERROR",
          message: "Failed to update user profile",
          details: error,
        },
      };
    }
  }

  /**
   * 키워드 선호도 업데이트
   */
  async updateKeywordPreference(
    userId: string,
    keyword: string,
    interaction?: {
      watchDuration?: number;
      interactionType?: string;
      emotion?: string;
    }
  ): Promise<ServiceResponse<any>> {
    try {
      // 기존 선호도 조회
      const { data: existing } = await this.supabase
        .from("user_keyword_preferences")
        .select("*")
        .eq("user_id", userId)
        .eq("keyword", keyword)
        .single();

      if (existing) {
        // 업데이트
        const updates: any = {
          selection_count: existing.selection_count + 1,
          last_selected_at: new Date().toISOString(),
        };

        // 시청 시간 업데이트
        if (interaction?.watchDuration) {
          const newTotal =
            existing.total_watch_time + interaction.watchDuration;
          const newCount = existing.total_watch_count + 1;

          updates.total_watch_time = newTotal;
          updates.total_watch_count = newCount;
          updates.avg_watch_duration = Math.round(newTotal / newCount);
        }

        // 감정 연관성 업데이트
        if (
          interaction?.emotion &&
          !existing.associated_emotions.includes(interaction.emotion)
        ) {
          updates.associated_emotions = [
            ...existing.associated_emotions,
            interaction.emotion,
          ];
        }

        // 상호작용 점수 업데이트
        if (interaction?.interactionType) {
          if (["like", "share", "save"].includes(interaction.interactionType)) {
            updates.positive_interactions = existing.positive_interactions + 1;
          } else if (
            ["dislike", "skip"].includes(interaction.interactionType)
          ) {
            updates.negative_interactions = existing.negative_interactions + 1;
          }
        }

        const { data, error } = await this.supabase
          .from("user_keyword_preferences")
          .update(updates)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;

        return { data };
      } else {
        // 새로 생성
        const newPreference = KeywordPreferenceSchema.parse({
          user_id: userId,
          keyword,
          associated_emotions: interaction?.emotion
            ? [interaction.emotion]
            : [],
        });

        const { data, error } = await this.supabase
          .from("user_keyword_preferences")
          .insert(newPreference)
          .select()
          .single();

        if (error) throw error;

        return { data };
      }
    } catch (error) {
      this.handleError(error, "updateKeywordPreference");
      return {
        error: {
          code: "PREFERENCE_UPDATE_ERROR",
          message: "Failed to update keyword preference",
          details: error,
        },
      };
    }
  }

  /**
   * 영상 상호작용 기록
   */
  async recordVideoInteraction(
    interactionData: any
  ): Promise<ServiceResponse<any>> {
    try {
      const validated = VideoInteractionSchema.parse(interactionData);

      // 상호작용 저장
      const { data, error } = await this.supabase
        .from("user_video_interactions")
        .insert(validated)
        .select()
        .single();

      if (error) throw error;

      // 키워드 선호도 업데이트 (비동기)
      if (validated.search_keyword && validated.interaction_type === "view") {
        this.updateKeywordPreference(
          validated.user_id,
          validated.search_keyword,
          {
            watchDuration: validated.watch_duration,
            interactionType: validated.interaction_type,
            emotion: validated.user_emotion,
          }
        );
      }

      // 사용자 통계 업데이트 (비동기)
      this.updateUserStats(validated.user_id, validated);

      return { data };
    } catch (error) {
      this.handleError(error, "recordVideoInteraction");
      return {
        error: {
          code: "INTERACTION_RECORD_ERROR",
          message: "Failed to record video interaction",
          details: error,
        },
      };
    }
  }

  /**
   * 사용자 통계 업데이트
   */
  private async updateUserStats(
    userId: string,
    interaction: any
  ): Promise<void> {
    try {
      const updates: any = {};

      if (interaction.interaction_type === "view") {
        updates.total_videos_watched = this.supabase
          .sql`total_videos_watched + 1`;

        if (interaction.watch_duration) {
          updates.total_watch_time = this.supabase
            .sql`total_watch_time + ${interaction.watch_duration}`;
        }
      }

      updates.last_active_at = new Date().toISOString();

      if (interaction.interaction_type === "view") {
        updates.last_video_watched_at = new Date().toISOString();
      }

      await this.supabase
        .from("user_profiles")
        .update(updates)
        .eq("user_id", userId);
    } catch (error) {
      this.logger.error("Failed to update user stats", { error, userId });
    }
  }

  /**
   * 사용자 선호도 분석
   */
  async analyzeUserPreferences(userId: string): Promise<ServiceResponse<any>> {
    try {
      // 상위 키워드 선호도
      const { data: topKeywords } = await this.supabase
        .from("user_keyword_preferences")
        .select(
          "keyword, preference_score, selection_count, associated_emotions"
        )
        .eq("user_id", userId)
        .order("preference_score", { ascending: false })
        .limit(20);

      // 최근 시청 패턴
      const { data: recentViews } = await this.supabase
        .from("user_video_interactions")
        .select(
          `
          video_id,
          interaction_type,
          watch_duration,
          completion_rate,
          user_emotion,
          created_at,
          videos!inner(
            title,
            channel_title,
            video_classifications(
              primary_category,
              emotion_tags,
              content_type
            )
          )
        `
        )
        .eq("user_id", userId)
        .eq("interaction_type", "view")
        .order("created_at", { ascending: false })
        .limit(50);

      // 감정 분포 분석
      const emotionDistribution = this.analyzeEmotionDistribution(recentViews);

      // 카테고리 선호도
      const categoryPreferences = this.analyzeCategoryPreferences(recentViews);

      // 시청 시간대 분석
      const watchTimePatterns = this.analyzeWatchTimePatterns(recentViews);

      return {
        data: {
          topKeywords,
          emotionDistribution,
          categoryPreferences,
          watchTimePatterns,
          totalVideosAnalyzed: recentViews?.length || 0,
        },
      };
    } catch (error) {
      this.handleError(error, "analyzeUserPreferences");
      return {
        error: {
          code: "PREFERENCE_ANALYSIS_ERROR",
          message: "Failed to analyze user preferences",
          details: error,
        },
      };
    }
  }

  /**
   * 감정 분포 분석
   */
  private analyzeEmotionDistribution(
    interactions: any[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    interactions?.forEach((interaction) => {
      // 사용자가 기록한 감정
      if (interaction.user_emotion) {
        distribution[interaction.user_emotion] =
          (distribution[interaction.user_emotion] || 0) + 1;
      }

      // 영상의 감정 태그
      const emotionTags =
        interaction.videos?.video_classifications?.emotion_tags || [];
      emotionTags.forEach((emotion: string) => {
        distribution[emotion] = (distribution[emotion] || 0) + 0.5; // 간접 가중치
      });
    });

    return distribution;
  }

  /**
   * 카테고리 선호도 분석
   */
  private analyzeCategoryPreferences(
    interactions: any[]
  ): Record<string, number> {
    const preferences: Record<string, number> = {};

    interactions?.forEach((interaction) => {
      const category =
        interaction.videos?.video_classifications?.primary_category;
      if (category) {
        preferences[category] = (preferences[category] || 0) + 1;
      }
    });

    return preferences;
  }

  /**
   * 시청 시간대 패턴 분석
   */
  private analyzeWatchTimePatterns(
    interactions: any[]
  ): Record<number, number> {
    const patterns: Record<number, number> = {};

    interactions?.forEach((interaction) => {
      const hour = new Date(interaction.created_at).getHours();
      patterns[hour] = (patterns[hour] || 0) + 1;
    });

    return patterns;
  }

  /**
   * 사용자 티어 업그레이드 체크
   */
  async checkTierUpgrade(userId: string): Promise<ServiceResponse<any>> {
    try {
      const { data: result } = await this.supabase.rpc(
        "check_user_tier_upgrade",
        { p_user_id: userId }
      );

      return { data: result };
    } catch (error) {
      this.handleError(error, "checkTierUpgrade");
      return {
        error: {
          code: "TIER_CHECK_ERROR",
          message: "Failed to check tier upgrade",
          details: error,
        },
      };
    }
  }

  /**
   * 검색 세션 기록
   */
  async recordSearchSession(sessionData: {
    user_id?: string;
    session_id: string;
    search_query?: string;
    search_type?: string;
    keywords_used?: string[];
    ai_enabled?: boolean;
    results_count?: number;
    device_info?: any;
  }): Promise<ServiceResponse<any>> {
    try {
      const { data, error } = await this.supabase
        .from("search_sessions")
        .insert({
          ...sessionData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // AI 검색인 경우 사용량 업데이트
      if (sessionData.user_id && sessionData.ai_enabled) {
        await this.supabase
          .from("user_profiles")
          .update({
            ai_searches_used: this.supabase.sql`ai_searches_used + 1`,
            total_searches: this.supabase.sql`total_searches + 1`,
            last_search_at: new Date().toISOString(),
          })
          .eq("user_id", sessionData.user_id);
      }

      return { data };
    } catch (error) {
      this.handleError(error, "recordSearchSession");
      return {
        error: {
          code: "SEARCH_SESSION_ERROR",
          message: "Failed to record search session",
          details: error,
        },
      };
    }
  }
}
```

---

## 4. TrendService 구현

### 4.1 TrendService 클래스

```typescript
// services/TrendService.ts
import { BaseService } from "./base/BaseService";
import axios from "axios";
import { z } from "zod";

// 스키마 정의
const TrendKeywordSchema = z.object({
  keyword: z.string().max(255),
  refined_keyword: z.string().optional(),
  category: z.string().optional(),
  trend_score: z.number().min(0).default(0),
  search_volume: z.number().default(0),
  growth_rate: z.number().default(0),
  data_source: z.string(),
  related_keywords: z.array(z.string()).default([]),
  related_news_count: z.number().default(0),
});

interface GoogleTrendsResponse {
  trendingSearches: {
    title: string;
    formattedTraffic: string;
    relatedQueries: string[];
    articles: Array<{
      title: string;
      timeAgo: string;
      source: string;
    }>;
  }[];
}

export class TrendService extends BaseService {
  private readonly GOOGLE_TRENDS_API =
    "https://trends.google.com/trends/api/dailytrends";
  private readonly NEWS_API_KEY: string;

  constructor(config: ServiceConfig) {
    super(config.supabase, config.logger);
    this.NEWS_API_KEY = process.env.NEWS_API_KEY!;
  }

  /**
   * 실시간 트렌드 수집
   */
  async collectRealtimeTrends(
    region: string = "KR"
  ): Promise<ServiceResponse<any[]>> {
    try {
      this.logger.info("Collecting realtime trends", { region });

      // 1. Google Trends 데이터 수집
      const trendsData = await this.fetchGoogleTrends(region);

      // 2. 각 트렌드 처리
      const processedTrends = [];
      for (const trend of trendsData) {
        const processed = await this.processTrendKeyword(trend);
        if (processed.data) {
          processedTrends.push(processed.data);
        }
      }

      // 3. 트렌드별 영상 수집 (비동기)
      processedTrends.forEach((trend) => {
        this.collectTrendVideosAsync(
          trend.id,
          trend.refined_keyword || trend.keyword
        );
      });

      return {
        data: processedTrends,
        metadata: { total: processedTrends.length },
      };
    } catch (error) {
      this.handleError(error, "collectRealtimeTrends");
      return {
        error: {
          code: "TREND_COLLECTION_ERROR",
          message: "Failed to collect realtime trends",
          details: error,
        },
      };
    }
  }

  /**
   * Google Trends API 호출
   */
  private async fetchGoogleTrends(region: string): Promise<any[]> {
    try {
      const response = await axios.get(this.GOOGLE_TRENDS_API, {
        params: {
          hl: "ko",
          tz: -540, // KST
          geo: region,
          ns: 15,
        },
      });

      // Google Trends API 응답 파싱
      const jsonStr = response.data.substring(5); // ")]}',\n" 제거
      const data = JSON.parse(jsonStr);

      const trends =
        data.default?.trendingSearchesDays?.[0]?.trendingSearches || [];

      return trends.map((trend: any) => ({
        keyword: trend.title.query,
        traffic: this.parseTraffic(trend.formattedTraffic),
        relatedQueries: trend.relatedQueries?.map((q: any) => q.query) || [],
        articles: trend.articles || [],
      }));
    } catch (error) {
      this.logger.error("Failed to fetch Google Trends", { error });
      return [];
    }
  }

  /**
   * 트렌드 키워드 처리
   */
  private async processTrendKeyword(
    trendData: any
  ): Promise<ServiceResponse<any>> {
    try {
      // 1. 뉴스 기반 키워드 정제
      const refinedData = await this.refineWithNews(trendData.keyword);

      // 2. 카테고리 분류
      const category = this.categorizeTrend(trendData, refinedData);

      // 3. 트렌드 점수 계산
      const trendScore = this.calculateTrendScore(trendData, refinedData);

      // 4. DB 저장
      const keywordData = TrendKeywordSchema.parse({
        keyword: trendData.keyword,
        refined_keyword: refinedData.refinedKeyword,
        category,
        trend_score: trendScore,
        search_volume: trendData.traffic,
        growth_rate: this.calculateGrowthRate(trendData),
        data_source: "google_trends",
        related_keywords: [
          ...trendData.relatedQueries,
          ...refinedData.contextKeywords,
        ],
        related_news_count: refinedData.newsCount,
        context_keywords: refinedData.contextKeywords,
        news_headlines: refinedData.headlines,
        news_sentiment: refinedData.sentiment,
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const { data, error } = await this.supabase
        .from("trend_keywords")
        .insert(keywordData)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error) {
      this.handleError(error, "processTrendKeyword");
      return {
        error: {
          code: "TREND_PROCESS_ERROR",
          message: "Failed to process trend keyword",
          details: error,
        },
      };
    }
  }

  /**
   * 뉴스 API를 통한 키워드 정제
   */
  private async refineWithNews(keyword: string): Promise<any> {
    try {
      const response = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q: keyword,
          language: "ko",
          sortBy: "popularity",
          pageSize: 10,
          apiKey: this.NEWS_API_KEY,
        },
      });

      const articles = response.data.articles || [];

      // 컨텍스트 키워드 추출
      const contextKeywords = this.extractContextKeywords(articles);

      // 감정 분석
      const sentiment = this.analyzeNewsSentiment(articles);

      // 정제된 키워드 생성
      const refinedKeyword = this.generateRefinedKeyword(
        keyword,
        contextKeywords
      );

      return {
        refinedKeyword,
        contextKeywords: contextKeywords.slice(0, 10),
        newsCount: articles.length,
        headlines: articles.slice(0, 5).map((a: any) => a.title),
        sentiment,
      };
    } catch (error) {
      this.logger.error("Failed to refine with news", { error });
      return {
        refinedKeyword: keyword,
        contextKeywords: [],
        newsCount: 0,
        headlines: [],
        sentiment: "neutral",
      };
    }
  }

  /**
   * 컨텍스트 키워드 추출
   */
  private extractContextKeywords(articles: any[]): string[] {
    const wordFreq: Record<string, number> = {};

    articles.forEach((article) => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      const words = text.match(/[가-힣]+/g) || [];

      words.forEach((word) => {
        if (word.length >= 2) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
    });

    // 빈도순 정렬
    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * 뉴스 감정 분석
   */
  private analyzeNewsSentiment(articles: any[]): string {
    // 간단한 규칙 기반 감정 분석
    const positiveWords = ["성공", "상승", "호평", "인기", "달성", "기록"];
    const negativeWords = ["실패", "하락", "비판", "우려", "논란", "사고"];

    let positiveCount = 0;
    let negativeCount = 0;

    articles.forEach((article) => {
      const text = `${article.title} ${article.description}`.toLowerCase();

      positiveWords.forEach((word) => {
        if (text.includes(word)) positiveCount++;
      });

      negativeWords.forEach((word) => {
        if (text.includes(word)) negativeCount++;
      });
    });

    if (positiveCount > negativeCount * 1.5) return "positive";
    if (negativeCount > positiveCount * 1.5) return "negative";
    return "neutral";
  }

  /**
   * 정제된 키워드 생성
   */
  private generateRefinedKeyword(
    original: string,
    contextKeywords: string[]
  ): string {
    // 가장 관련성 높은 컨텍스트 키워드 결합
    const relevant = contextKeywords
      .filter((kw) => kw !== original && kw.length <= 5)
      .slice(0, 2);

    if (relevant.length > 0) {
      return `${original} ${relevant[0]}`;
    }

    return original;
  }

  /**
   * 트렌드 카테고리 분류
   */
  private categorizeTrend(trendData: any, refinedData: any): string {
    const keyword = trendData.keyword.toLowerCase();
    const context = refinedData.contextKeywords.join(" ").toLowerCase();

    // 카테고리 매핑
    const categoryMappings = {
      엔터테인먼트: ["연예", "아이돌", "드라마", "영화", "음악", "콘서트"],
      스포츠: ["축구", "야구", "농구", "올림픽", "월드컵", "선수"],
      정치: ["대통령", "국회", "선거", "정당", "정책", "법안"],
      경제: ["주식", "코인", "부동산", "금리", "환율", "투자"],
      기술: ["AI", "스마트폰", "앱", "게임", "메타버스", "IT"],
      사회: ["사건", "사고", "날씨", "교육", "복지", "환경"],
      문화: ["전시", "공연", "축제", "관광", "맛집", "여행"],
    };

    for (const [category, keywords] of Object.entries(categoryMappings)) {
      if (keywords.some((kw) => keyword.includes(kw) || context.includes(kw))) {
        return category;
      }
    }

    return "일반";
  }

  /**
   * 트렌드 점수 계산
   */
  private calculateTrendScore(trendData: any, refinedData: any): number {
    let score = 50; // 기본 점수

    // 트래픽 기반 (최대 30점)
    if (trendData.traffic > 100000) score += 30;
    else if (trendData.traffic > 50000) score += 25;
    else if (trendData.traffic > 10000) score += 20;
    else if (trendData.traffic > 5000) score += 15;
    else score += 10;

    // 관련 쿼리 수 (최대 10점)
    score += Math.min(10, trendData.relatedQueries.length * 2);

    // 뉴스 수 (최대 10점)
    score += Math.min(10, refinedData.newsCount);

    return Math.min(100, score);
  }

  /**
   * 성장률 계산
   */
  private calculateGrowthRate(trendData: any): number {
    // 실제로는 이전 데이터와 비교해야 하지만,
    // 여기서는 트래픽 기반 추정
    if (trendData.traffic > 100000) return 100;
    if (trendData.traffic > 50000) return 75;
    if (trendData.traffic > 10000) return 50;
    return 25;
  }

  /**
   * 트래픽 문자열 파싱
   */
  private parseTraffic(formattedTraffic: string): number {
    // "100K+", "1M+" 형식을 숫자로 변환
    const num = parseFloat(formattedTraffic.replace(/[^0-9.]/g, ""));
    if (formattedTraffic.includes("M")) return num * 1000000;
    if (formattedTraffic.includes("K")) return num * 1000;
    return num;
  }

  /**
   * 트렌드 관련 영상 수집 (비동기)
   */
  private async collectTrendVideosAsync(
    trendKeywordId: string,
    keyword: string
  ): Promise<void> {
    try {
      // VideoService를 통한 영상 수집
      const videoService = new VideoService({
        supabase: this.supabase,
        logger: this.logger,
      });

      const { data: videos } = await videoService.searchAndSaveVideos(
        keyword,
        20
      );

      if (!videos || videos.length === 0) return;

      // 채널 품질 체크 및 매핑 생성
      for (const video of videos) {
        const qualityCheck = await this.checkChannelQuality(video.channel_id);

        if (qualityCheck.passed) {
          await this.createTrendVideoMapping(
            trendKeywordId,
            video.video_id,
            qualityCheck
          );
        }
      }
    } catch (error) {
      this.logger.error("Failed to collect trend videos", { error, keyword });
    }
  }

  /**
   * 채널 품질 체크
   */
  private async checkChannelQuality(channelId: string): Promise<any> {
    try {
      const { data: channel } = await this.supabase
        .from("channel_profiles")
        .select("*")
        .eq("channel_id", channelId)
        .single();

      if (!channel) {
        // 채널 정보 업데이트 필요
        return {
          passed: false,
          reason: "Channel info not found",
        };
      }

      // 품질 기준 체크
      const passed =
        channel.quality_score >= 0.6 &&
        channel.subscriber_count >= 1000 &&
        !channel.is_blocked;

      return {
        passed,
        quality_score: channel.quality_score,
        quality_grade: channel.quality_grade,
        subscriber_count: channel.subscriber_count,
        reason: passed ? "Quality check passed" : "Below quality threshold",
      };
    } catch (error) {
      this.logger.error("Failed to check channel quality", { error });
      return {
        passed: false,
        reason: "Quality check error",
      };
    }
  }

  /**
   * 트렌드-영상 매핑 생성
   */
  private async createTrendVideoMapping(
    trendKeywordId: string,
    videoId: string,
    qualityCheck: any
  ): Promise<void> {
    try {
      await this.supabase.from("trend_video_mappings").insert({
        trend_keyword_id: trendKeywordId,
        video_id: videoId,
        channel_quality_passed: qualityCheck.passed,
        channel_quality_score: qualityCheck.quality_score,
        channel_subscriber_count: qualityCheck.subscriber_count,
        channel_quality_grade: qualityCheck.quality_grade,
        relevance_score: 0.8, // 기본 관련성 점수
        collected_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to create trend video mapping", { error });
    }
  }

  /**
   * 활성 트렌드 조회
   */
  async getActiveTrends(
    limit: number = 10,
    category?: string
  ): Promise<ServiceResponse<any[]>> {
    try {
      let query = this.supabase
        .from("trend_keywords")
        .select("*")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("trend_score", { ascending: false })
        .limit(limit);

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [] };
    } catch (error) {
      this.handleError(error, "getActiveTrends");
      return {
        error: {
          code: "TREND_FETCH_ERROR",
          message: "Failed to get active trends",
          details: error,
        },
      };
    }
  }

  /**
   * 트렌드 영상 조회
   */
  async getTrendVideos(
    trendKeywordId?: string,
    limit: number = 30
  ): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await this.supabase.rpc("get_trending_videos", {
        p_limit: limit,
      });

      if (error) throw error;

      return { data: data || [] };
    } catch (error) {
      this.handleError(error, "getTrendVideos");
      return {
        error: {
          code: "TREND_VIDEO_ERROR",
          message: "Failed to get trend videos",
          details: error,
        },
      };
    }
  }
}
```

---

## 5. RecommendationService 구현

### 5.1 RecommendationService 클래스

```typescript
// services/RecommendationService.ts
import { BaseService } from "./base/BaseService";
import { Redis } from "ioredis";

interface RecommendationRequest {
  userId: string;
  type: "personalized" | "trending" | "emotion" | "similar" | "hybrid";
  emotion?: string;
  limit?: number;
  offset?: number;
  filters?: {
    minQuality?: number;
    categories?: string[];
    excludeWatched?: boolean;
  };
}

interface RecommendationResult {
  videos: any[];
  algorithm: string;
  confidence: number;
  reasons: Record<string, string>;
}

export class RecommendationService extends BaseService {
  private redis?: Redis;
  private readonly CACHE_TTL = 3600; // 1시간

  constructor(config: ServiceConfig) {
    super(config.supabase, config.logger);
    this.redis = config.cache;
  }

  /**
   * 통합 추천 엔진
   */
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<ServiceResponse<RecommendationResult>> {
    try {
      this.logger.info("Getting recommendations", { request });

      // 캐시 체크
      const cacheKey = this.buildCacheKey(request);
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return { data: cached };
      }

      // 추천 생성
      let result: RecommendationResult;

      switch (request.type) {
        case "personalized":
          result = await this.getPersonalizedRecommendations(request);
          break;

        case "trending":
          result = await this.getTrendingRecommendations(request);
          break;

        case "emotion":
          result = await this.getEmotionBasedRecommendations(request);
          break;

        case "similar":
          result = await this.getSimilarRecommendations(request);
          break;

        case "hybrid":
          result = await this.getHybridRecommendations(request);
          break;

        default:
          throw new Error("Invalid recommendation type");
      }

      // 캐시 저장
      await this.saveToCache(cacheKey, result);

      // 추천 로그 기록
      await this.logRecommendation(request, result);

      return { data: result };
    } catch (error) {
      this.handleError(error, "getRecommendations");
      return {
        error: {
          code: "RECOMMENDATION_ERROR",
          message: "Failed to get recommendations",
          details: error,
        },
      };
    }
  }

  /**
   * 개인화 추천
   */
  private async getPersonalizedRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult> {
    const { data: videos, error } = await this.supabase.rpc(
      "get_personalized_videos",
      {
        p_user_id: request.userId,
        p_limit: request.limit || 20,
        p_offset: request.offset || 0,
        p_min_quality: request.filters?.minQuality || 0.5,
      }
    );

    if (error) throw error;

    return {
      videos: videos || [],
      algorithm: "collaborative_filtering_v2",
      confidence: 0.85,
      reasons: this.generatePersonalizedReasons(videos),
    };
  }

  /**
   * 트렌드 기반 추천
   */
  private async getTrendingRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult> {
    const { data: videos, error } = await this.supabase.rpc(
      "get_trending_videos",
      {
        p_limit: request.limit || 30,
        p_min_quality: request.filters?.minQuality || 0.6,
      }
    );

    if (error) throw error;

    return {
      videos: videos || [],
      algorithm: "trending_boost_v1",
      confidence: 0.9,
      reasons: this.generateTrendingReasons(videos),
    };
  }

  /**
   * 감정 기반 추천
   */
  private async getEmotionBasedRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult> {
    if (!request.emotion) {
      throw new Error("Emotion is required for emotion-based recommendations");
    }

    const { data: videos, error } = await this.supabase.rpc(
      "get_emotion_based_videos",
      {
        p_emotion: request.emotion,
        p_intensity: "medium",
        p_limit: request.limit || 15,
        p_user_id: request.userId,
      }
    );

    if (error) throw error;

    return {
      videos: videos || [],
      algorithm: "emotion_mapping_v1",
      confidence: 0.8,
      reasons: this.generateEmotionReasons(videos, request.emotion),
    };
  }

  /**
   * 유사 영상 추천
   */
  private async getSimilarRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult> {
    // 최근 시청 영상 기반
    const { data: recentVideo } = await this.supabase
      .from("user_video_interactions")
      .select("video_id")
      .eq("user_id", request.userId)
      .eq("interaction_type", "view")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!recentVideo) {
      return {
        videos: [],
        algorithm: "content_similarity_v1",
        confidence: 0,
        reasons: {},
      };
    }

    const { data: videos, error } = await this.supabase.rpc(
      "get_similar_videos",
      {
        p_video_id: recentVideo.video_id,
        p_limit: request.limit || 10,
      }
    );

    if (error) throw error;

    return {
      videos: videos || [],
      algorithm: "content_similarity_v1",
      confidence: 0.75,
      reasons: this.generateSimilarityReasons(videos),
    };
  }

  /**
   * 하이브리드 추천 (여러 알고리즘 결합)
   */
  private async getHybridRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult> {
    // 병렬로 여러 추천 가져오기
    const [personalized, trending, emotion] = await Promise.all([
      this.getPersonalizedRecommendations({ ...request, limit: 10 }),
      this.getTrendingRecommendations({ ...request, limit: 10 }),
      request.emotion
        ? this.getEmotionBasedRecommendations({ ...request, limit: 10 })
        : Promise.resolve({
            videos: [],
            algorithm: "",
            confidence: 0,
            reasons: {},
          }),
    ]);

    // 결과 병합 및 중복 제거
    const videoMap = new Map<string, any>();
    const sources: Record<string, string[]> = {};

    // 가중치 적용하여 병합
    const addVideos = (videos: any[], weight: number, source: string) => {
      videos.forEach((video) => {
        const existing = videoMap.get(video.video_id);
        if (existing) {
          existing.hybrid_score = (existing.hybrid_score || 0) + weight;
          sources[video.video_id].push(source);
        } else {
          videoMap.set(video.video_id, {
            ...video,
            hybrid_score: weight,
          });
          sources[video.video_id] = [source];
        }
      });
    };

    addVideos(personalized.videos, 0.5, "personalized");
    addVideos(trending.videos, 0.3, "trending");
    addVideos(emotion.videos, 0.2, "emotion");

    // 점수순 정렬
    const sortedVideos = Array.from(videoMap.values())
      .sort((a, b) => b.hybrid_score - a.hybrid_score)
      .slice(0, request.limit || 20);

    return {
      videos: sortedVideos,
      algorithm: "hybrid_ensemble_v1",
      confidence: 0.88,
      reasons: this.generateHybridReasons(sortedVideos, sources),
    };
  }

  /**
   * 개인화 추천 이유 생성
   */
  private generatePersonalizedReasons(videos: any[]): Record<string, string> {
    const reasons: Record<string, string> = {};

    videos.forEach((video) => {
      if (video.recommendation_reason) {
        reasons[video.video_id] = video.recommendation_reason;
      } else if (video.relevance_score >= 0.8) {
        reasons[video.video_id] = "선호도가 높은 키워드와 일치";
      } else {
        reasons[video.video_id] = "관심사 기반 추천";
      }
    });

    return reasons;
  }

  /**
   * 트렌드 추천 이유 생성
   */
  private generateTrendingReasons(videos: any[]): Record<string, string> {
    const reasons: Record<string, string> = {};

    videos.forEach((video) => {
      if (video.trend_momentum === "explosive") {
        reasons[video.video_id] = "🔥 지금 가장 핫한 트렌드";
      } else if (video.view_count > 1000000) {
        reasons[video.video_id] = "👁️ 백만뷰 돌파 영상";
      } else {
        reasons[video.video_id] =
          video.recommendation_reason || "현재 인기 급상승";
      }
    });

    return reasons;
  }

  /**
   * 감정 추천 이유 생성
   */
  private generateEmotionReasons(
    videos: any[],
    emotion: string
  ): Record<string, string> {
    const reasons: Record<string, string> = {};
    const emotionDescriptions: Record<string, string> = {
      happy: "기분을 더욱 즐겁게",
      sad: "위로와 공감을",
      calm: "마음의 평화를",
      excited: "더욱 신나는 에너지를",
      stressed: "스트레스 해소를",
      anxious: "불안감 완화를",
    };

    const baseReason = emotionDescriptions[emotion] || "현재 기분에 맞는";

    videos.forEach((video) => {
      reasons[video.video_id] = `${baseReason} 도와줄 영상`;
    });

    return reasons;
  }

  /**
   * 유사성 추천 이유 생성
   */
  private generateSimilarityReasons(videos: any[]): Record<string, string> {
    const reasons: Record<string, string> = {};

    videos.forEach((video) => {
      const similarityReasons = video.similarity_reasons || [];
      if (similarityReasons.length > 0) {
        reasons[video.video_id] = similarityReasons.join(", ");
      } else {
        reasons[video.video_id] = "최근 시청 영상과 유사";
      }
    });

    return reasons;
  }

  /**
   * 하이브리드 추천 이유 생성
   */
  private generateHybridReasons(
    videos: any[],
    sources: Record<string, string[]>
  ): Record<string, string> {
    const reasons: Record<string, string> = {};

    videos.forEach((video) => {
      const videoSources = sources[video.video_id] || [];
      if (videoSources.length > 1) {
        reasons[video.video_id] = "여러 기준에서 높은 점수";
      } else if (videoSources.includes("personalized")) {
        reasons[video.video_id] = "개인 맞춤 추천";
      } else if (videoSources.includes("trending")) {
        reasons[video.video_id] = "현재 트렌드";
      } else {
        reasons[video.video_id] = "추천";
      }
    });

    return reasons;
  }

  /**
   * 추천 로그 기록
   */
  private async logRecommendation(
    request: RecommendationRequest,
    result: RecommendationResult
  ): Promise<void> {
    try {
      await this.supabase.from("recommendation_logs").insert({
        user_id: request.userId,
        recommendation_type: request.type,
        recommendation_algorithm: result.algorithm,
        recommendation_context: {
          emotion: request.emotion,
          filters: request.filters,
          limit: request.limit,
        },
        videos_recommended: result.videos.map((v) => v.video_id),
        recommendation_reasons: result.reasons,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to log recommendation", { error });
    }
  }

  /**
   * 추천 성과 추적
   */
  async trackRecommendationPerformance(
    recommendationLogId: string,
    interaction: {
      videoId: string;
      interactionType: "click" | "watch" | "complete" | "like" | "dislike";
      watchDuration?: number;
    }
  ): Promise<ServiceResponse<void>> {
    try {
      // 현재 로그 조회
      const { data: log, error: fetchError } = await this.supabase
        .from("recommendation_logs")
        .select("*")
        .eq("id", recommendationLogId)
        .single();

      if (fetchError) throw fetchError;

      // 상호작용 업데이트
      const updates: any = {};

      if (interaction.interactionType === "click") {
        updates.videos_clicked = [
          ...(log.videos_clicked || []),
          interaction.videoId,
        ];
      } else if (interaction.interactionType === "watch") {
        updates.videos_watched = [
          ...(log.videos_watched || []),
          interaction.videoId,
        ];
      } else if (interaction.interactionType === "complete") {
        updates.videos_completed = [
          ...(log.videos_completed || []),
          interaction.videoId,
        ];
      } else if (interaction.interactionType === "like") {
        updates.videos_liked = [
          ...(log.videos_liked || []),
          interaction.videoId,
        ];
      } else if (interaction.interactionType === "dislike") {
        updates.videos_disliked = [
          ...(log.videos_disliked || []),
          interaction.videoId,
        ];
      }

      // 평균 시청 시간 업데이트
      if (interaction.watchDuration) {
        const currentTotal =
          (log.average_watch_time || 0) * (log.videos_watched?.length || 0);
        const newTotal = currentTotal + interaction.watchDuration;
        const newCount = (log.videos_watched?.length || 0) + 1;
        updates.average_watch_time = Math.round(newTotal / newCount);
      }

      // 참여도 점수 계산
      updates.engagement_score = this.calculateEngagementScore(log, updates);

      // DB 업데이트
      const { error: updateError } = await this.supabase
        .from("recommendation_logs")
        .update(updates)
        .eq("id", recommendationLogId);

      if (updateError) throw updateError;

      return { data: undefined };
    } catch (error) {
      this.handleError(error, "trackRecommendationPerformance");
      return {
        error: {
          code: "TRACKING_ERROR",
          message: "Failed to track recommendation performance",
          details: error,
        },
      };
    }
  }

  /**
   * 참여도 점수 계산
   */
  private calculateEngagementScore(log: any, updates: any): number {
    const totalRecommended = log.videos_recommended?.length || 1;
    const clicked = (updates.videos_clicked || log.videos_clicked || []).length;
    const watched = (updates.videos_watched || log.videos_watched || []).length;
    const completed = (updates.videos_completed || log.videos_completed || [])
      .length;
    const liked = (updates.videos_liked || log.videos_liked || []).length;

    // 가중치 적용
    const score =
      (clicked / totalRecommended) * 0.2 + // 클릭률 20%
      (watched / totalRecommended) * 0.3 + // 시청률 30%
      (completed / totalRecommended) * 0.3 + // 완주율 30%
      (liked / totalRecommended) * 0.2; // 좋아요율 20%

    return Math.min(1.0, score);
  }

  /**
   * 캐시 키 생성
   */
  private buildCacheKey(request: RecommendationRequest): string {
    return `rec:${request.userId}:${request.type}:${
      request.emotion || "none"
    }:${request.limit}:${request.offset}`;
  }

  /**
   * 캐시에서 가져오기
   */
  private async getFromCache(
    key: string
  ): Promise<RecommendationResult | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error("Cache get error", { error });
      return null;
    }
  }

  /**
   * 캐시에 저장
   */
  private async saveToCache(
    key: string,
    data: RecommendationResult
  ): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      this.logger.error("Cache set error", { error });
    }
  }

  /**
   * A/B 테스트 지원
   */
  async getExperimentalRecommendations(
    request: RecommendationRequest & { experimentId: string }
  ): Promise<ServiceResponse<RecommendationResult>> {
    try {
      // 실험 그룹 할당
      const experimentGroup = this.assignExperimentGroup(
        request.userId,
        request.experimentId
      );

      // 그룹별 다른 알고리즘 적용
      let result: RecommendationResult;

      if (experimentGroup === "control") {
        result = await this.getPersonalizedRecommendations(request);
      } else if (experimentGroup === "variant_a") {
        // 새로운 알고리즘 테스트
        result = await this.getHybridRecommendations(request);
        result.algorithm = "experimental_v1";
      } else {
        // 다른 변형
        result = await this.getTrendingRecommendations(request);
        result.algorithm = "experimental_v2";
      }

      // 실험 로그 기록
      await this.logExperiment(request, result, experimentGroup);

      return { data: result };
    } catch (error) {
      this.handleError(error, "getExperimentalRecommendations");
      return {
        error: {
          code: "EXPERIMENT_ERROR",
          message: "Failed to get experimental recommendations",
          details: error,
        },
      };
    }
  }

  /**
   * 실험 그룹 할당
   */
  private assignExperimentGroup(userId: string, experimentId: string): string {
    // 간단한 해시 기반 할당
    const hash = this.simpleHash(`${userId}:${experimentId}`);
    const groupIndex = hash % 3;

    if (groupIndex === 0) return "control";
    if (groupIndex === 1) return "variant_a";
    return "variant_b";
  }

  /**
   * 간단한 해시 함수
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * 실험 로그 기록
   */
  private async logExperiment(
    request: any,
    result: RecommendationResult,
    experimentGroup: string
  ): Promise<void> {
    try {
      await this.supabase.from("recommendation_logs").insert({
        user_id: request.userId,
        recommendation_type: request.type,
        recommendation_algorithm: result.algorithm,
        experiment_id: request.experimentId,
        experiment_group: experimentGroup,
        videos_recommended: result.videos.map((v) => v.video_id),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to log experiment", { error });
    }
  }
}
```

---

## 6. AnalyticsService 구현

### 6.1 AnalyticsService 클래스

```typescript
// services/AnalyticsService.ts
import { BaseService } from "./base/BaseService";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

interface AnalyticsQuery {
  startDate: Date;
  endDate: Date;
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
}

interface DashboardMetrics {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalVideos: number;
    totalViews: number;
  };
  trends: {
    userGrowth: any[];
    viewGrowth: any[];
    popularKeywords: any[];
  };
  performance: {
    recommendationCTR: number;
    avgWatchTime: number;
    completionRate: number;
  };
}

export class AnalyticsService extends BaseService {
  /**
   * 대시보드 메트릭 조회
   */
  async getDashboardMetrics(
    dateRange: { start: Date; end: Date } = {
      start: subDays(new Date(), 30),
      end: new Date(),
    }
  ): Promise<ServiceResponse<DashboardMetrics>> {
    try {
      const [overview, trends, performance] = await Promise.all([
        this.getOverviewMetrics(dateRange),
        this.getTrendMetrics(dateRange),
        this.getPerformanceMetrics(dateRange),
      ]);

      return {
        data: {
          overview: overview.data,
          trends: trends.data,
          performance: performance.data,
        },
      };
    } catch (error) {
      this.handleError(error, "getDashboardMetrics");
      return {
        error: {
          code: "ANALYTICS_ERROR",
          message: "Failed to get dashboard metrics",
          details: error,
        },
      };
    }
  }

  /**
   * 개요 메트릭
   */
  private async getOverviewMetrics(dateRange: {
    start: Date;
    end: Date;
  }): Promise<ServiceResponse<any>> {
    try {
      // 총 사용자 수
      const { count: totalUsers } = await this.supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true });

      // 활성 사용자 수
      const { count: activeUsers } = await this.supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_active_at", dateRange.start.toISOString());

      // 총 영상 수
      const { count: totalVideos } = await this.supabase
        .from("videos")
        .select("*", { count: "exact", head: true })
        .eq("is_playable", true);

      // 총 조회수
      const { data: viewData } = await this.supabase
        .from("user_video_interactions")
        .select("id")
        .eq("interaction_type", "view")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      return {
        data: {
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          totalVideos: totalVideos || 0,
          totalViews: viewData?.length || 0,
        },
      };
    } catch (error) {
      this.handleError(error, "getOverviewMetrics");
      return {
        error: {
          code: "OVERVIEW_ERROR",
          message: "Failed to get overview metrics",
        },
      };
    }
  }

  /**
   * 트렌드 메트릭
   */
  private async getTrendMetrics(dateRange: {
    start: Date;
    end: Date;
  }): Promise<ServiceResponse<any>> {
    try {
      // 사용자 증가 추이
      const userGrowth = await this.getUserGrowthTrend(dateRange);

      // 조회수 증가 추이
      const viewGrowth = await this.getViewGrowthTrend(dateRange);

      // 인기 키워드
      const popularKeywords = await this.getPopularKeywords(dateRange);

      return {
        data: {
          userGrowth,
          viewGrowth,
          popularKeywords,
        },
      };
    } catch (error) {
      this.handleError(error, "getTrendMetrics");
      return {
        error: { code: "TREND_ERROR", message: "Failed to get trend metrics" },
      };
    }
  }

  /**
   * 성과 메트릭
   */
  private async getPerformanceMetrics(dateRange: {
    start: Date;
    end: Date;
  }): Promise<ServiceResponse<any>> {
    try {
      // 추천 CTR
      const { data: recLogs } = await this.supabase
        .from("recommendation_logs")
        .select("click_through_rate, watch_rate, completion_rate")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      const avgCTR = this.calculateAverage(
        recLogs?.map((r) => r.click_through_rate) || []
      );
      const avgWatchRate = this.calculateAverage(
        recLogs?.map((r) => r.watch_rate) || []
      );
      const avgCompletionRate = this.calculateAverage(
        recLogs?.map((r) => r.completion_rate) || []
      );

      // 평균 시청 시간
      const { data: interactions } = await this.supabase
        .from("user_video_interactions")
        .select("watch_duration")
        .eq("interaction_type", "view")
        .not("watch_duration", "is", null)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      const avgWatchTime = this.calculateAverage(
        interactions?.map((i) => i.watch_duration) || []
      );

      return {
        data: {
          recommendationCTR: avgCTR,
          avgWatchTime: Math.round(avgWatchTime),
          completionRate: avgCompletionRate,
        },
      };
    } catch (error) {
      this.handleError(error, "getPerformanceMetrics");
      return {
        error: {
          code: "PERFORMANCE_ERROR",
          message: "Failed to get performance metrics",
        },
      };
    }
  }

  /**
   * 사용자 증가 추이
   */
  private async getUserGrowthTrend(dateRange: {
    start: Date;
    end: Date;
  }): Promise<any[]> {
    const days = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const trend = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);

      const { count } = await this.supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .lte("created_at", endOfDay(date).toISOString());

      trend.push({
        date: format(date, "yyyy-MM-dd"),
        users: count || 0,
      });
    }

    return trend;
  }

  /**
   * 조회수 증가 추이
   */
  private async getViewGrowthTrend(dateRange: {
    start: Date;
    end: Date;
  }): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("user_video_interactions")
      .select("created_at")
      .eq("interaction_type", "view")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    if (error) return [];

    // 날짜별 집계
    const viewsByDate: Record<string, number> = {};

    data?.forEach((interaction) => {
      const date = format(new Date(interaction.created_at), "yyyy-MM-dd");
      viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });

    return Object.entries(viewsByDate)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 인기 키워드
   */
  private async getPopularKeywords(dateRange: {
    start: Date;
    end: Date;
  }): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("user_keyword_preferences")
      .select("keyword, selection_count")
      .gte("last_selected_at", dateRange.start.toISOString())
      .lte("last_selected_at", dateRange.end.toISOString())
      .order("selection_count", { ascending: false })
      .limit(10);

    if (error) return [];

    return data || [];
  }

  /**
   * 사용자 행동 분석
   */
  async analyzeUserBehavior(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<ServiceResponse<any>> {
    try {
      const range = dateRange || {
        start: subDays(new Date(), 30),
        end: new Date(),
      };

      // 시청 패턴
      const watchPatterns = await this.analyzeWatchPatterns(userId, range);

      // 상호작용 분포
      const interactionDistribution = await this.analyzeInteractionDistribution(
        userId,
        range
      );

      // 선호 카테고리 변화
      const categoryTrends = await this.analyzeCategoryTrends(userId, range);

      // 감정 패턴
      const emotionPatterns = await this.analyzeEmotionPatterns(userId, range);

      return {
        data: {
          watchPatterns,
          interactionDistribution,
          categoryTrends,
          emotionPatterns,
        },
      };
    } catch (error) {
      this.handleError(error, "analyzeUserBehavior");
      return {
        error: {
          code: "BEHAVIOR_ANALYSIS_ERROR",
          message: "Failed to analyze user behavior",
          details: error,
        },
      };
    }
  }

  /**
   * 시청 패턴 분석
   */
  private async analyzeWatchPatterns(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<any> {
    const { data } = await this.supabase
      .from("user_video_interactions")
      .select("created_at, watch_duration")
      .eq("user_id", userId)
      .eq("interaction_type", "view")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    // 시간대별 분석
    const hourlyPattern: Record<number, number> = {};
    const dailyPattern: Record<string, number> = {};

    data?.forEach((interaction) => {
      const date = new Date(interaction.created_at);
      const hour = date.getHours();
      const day = format(date, "EEEE"); // 요일

      hourlyPattern[hour] = (hourlyPattern[hour] || 0) + 1;
      dailyPattern[day] = (dailyPattern[day] || 0) + 1;
    });

    return {
      hourly: hourlyPattern,
      daily: dailyPattern,
      totalViews: data?.length || 0,
      avgWatchDuration: this.calculateAverage(
        data?.map((d) => d.watch_duration).filter(Boolean) || []
      ),
    };
  }

  /**
   * 상호작용 분포 분석
   */
  private async analyzeInteractionDistribution(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<any> {
    const { data } = await this.supabase
      .from("user_video_interactions")
      .select("interaction_type")
      .eq("user_id", userId)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const distribution: Record<string, number> = {};

    data?.forEach((interaction) => {
      distribution[interaction.interaction_type] =
        (distribution[interaction.interaction_type] || 0) + 1;
    });

    return distribution;
  }

  /**
   * 카테고리 트렌드 분석
   */
  private async analyzeCategoryTrends(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<any> {
    const { data } = await this.supabase
      .from("user_video_interactions")
      .select(
        `
        created_at,
        videos!inner(
          video_classifications!inner(
            primary_category
          )
        )
      `
      )
      .eq("user_id", userId)
      .eq("interaction_type", "view")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    // 주간 카테고리 분포
    const weeklyTrends: Record<string, Record<string, number>> = {};

    data?.forEach((interaction) => {
      const week = format(new Date(interaction.created_at), "yyyy-ww");
      const category =
        interaction.videos?.video_classifications?.primary_category;

      if (category) {
        if (!weeklyTrends[week]) weeklyTrends[week] = {};
        weeklyTrends[week][category] = (weeklyTrends[week][category] || 0) + 1;
      }
    });

    return weeklyTrends;
  }

  /**
   * 감정 패턴 분석
   */
  private async analyzeEmotionPatterns(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<any> {
    const { data } = await this.supabase
      .from("user_video_interactions")
      .select("user_emotion, created_at")
      .eq("user_id", userId)
      .not("user_emotion", "is", null)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    // 감정별 시간대 분포
    const emotionTimeDistribution: Record<string, Record<number, number>> = {};

    data?.forEach((interaction) => {
      const emotion = interaction.user_emotion;
      const hour = new Date(interaction.created_at).getHours();

      if (!emotionTimeDistribution[emotion]) {
        emotionTimeDistribution[emotion] = {};
      }

      emotionTimeDistribution[emotion][hour] =
        (emotionTimeDistribution[emotion][hour] || 0) + 1;
    });

    return emotionTimeDistribution;
  }

  /**
   * 추천 성과 분석
   */
  async analyzeRecommendationPerformance(dateRange?: {
    start: Date;
    end: Date;
  }): Promise<ServiceResponse<any>> {
    try {
      const range = dateRange || {
        start: subDays(new Date(), 7),
        end: new Date(),
      };

      const { data, error } = await this.supabase.rpc(
        "analyze_recommendation_performance",
        {
          p_start_date: format(range.start, "yyyy-MM-dd"),
          p_end_date: format(range.end, "yyyy-MM-dd"),
        }
      );

      if (error) throw error;

      return { data };
    } catch (error) {
      this.handleError(error, "analyzeRecommendationPerformance");
      return {
        error: {
          code: "RECOMMENDATION_ANALYSIS_ERROR",
          message: "Failed to analyze recommendation performance",
          details: error,
        },
      };
    }
  }

  /**
   * 일일 통계 생성
   */
  async generateDailyReport(
    date: Date = new Date()
  ): Promise<ServiceResponse<any>> {
    try {
      const reportDate = format(date, "yyyy-MM-dd");

      const { data, error } = await this.supabase.rpc(
        "calculate_daily_statistics",
        {
          p_date: reportDate,
        }
      );

      if (error) throw error;

      // 리포트 포맷팅
      const report = this.formatDailyReport(data, reportDate);

      // 리포트 저장
      await this.saveDailyReport(report);

      return { data: report };
    } catch (error) {
      this.handleError(error, "generateDailyReport");
      return {
        error: {
          code: "REPORT_GENERATION_ERROR",
          message: "Failed to generate daily report",
          details: error,
        },
      };
    }
  }

  /**
   * 일일 리포트 포맷팅
   */
  private formatDailyReport(statistics: any[], date: string): any {
    const stats: Record<string, any> = {};

    statistics.forEach((stat) => {
      stats[stat.stat_name] = {
        value: stat.stat_value,
        details: stat.stat_detail,
      };
    });

    return {
      reportDate: date,
      summary: {
        activeUsers: stats.daily_active_users?.value || 0,
        videoViews: stats.daily_video_views?.value || 0,
        searches: stats.daily_searches?.value || 0,
        apiUsage: stats.daily_api_usage?.value || 0,
      },
      details: stats,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 일일 리포트 저장
   */
  private async saveDailyReport(report: any): Promise<void> {
    try {
      // 여기서는 파일 시스템이나 별도 저장소에 저장
      // 예: S3, Google Cloud Storage 등
      this.logger.info("Daily report saved", { date: report.reportDate });
    } catch (error) {
      this.logger.error("Failed to save daily report", { error });
    }
  }

  /**
   * 평균 계산 헬퍼
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
  }

  /**
   * 이벤트 추적
   */
  async trackEvent(eventData: {
    userId?: string;
    sessionId?: string;
    eventName: string;
    eventCategory: string;
    eventAction?: string;
    eventLabel?: string;
    eventValue?: number;
    eventProperties?: Record<string, any>;
  }): Promise<ServiceResponse<void>> {
    try {
      await this.supabase.from("analytics_events").insert({
        user_id: eventData.userId,
        session_id: eventData.sessionId,
        event_name: eventData.eventName,
        event_category: eventData.eventCategory,
        event_action: eventData.eventAction,
        event_label: eventData.eventLabel,
        event_value: eventData.eventValue,
        event_properties: eventData.eventProperties || {},
        created_at: new Date().toISOString(),
      });

      return { data: undefined };
    } catch (error) {
      this.handleError(error, "trackEvent");
      return {
        error: {
          code: "EVENT_TRACKING_ERROR",
          message: "Failed to track event",
          details: error,
        },
      };
    }
  }

  /**
   * 커스텀 쿼리 실행
   */
  async executeCustomQuery(
    query: AnalyticsQuery
  ): Promise<ServiceResponse<any>> {
    try {
      // 쿼리 검증
      if (!this.validateQuery(query)) {
        throw new Error("Invalid query parameters");
      }

      // 동적 쿼리 생성 및 실행
      const result = await this.buildAndExecuteQuery(query);

      return { data: result };
    } catch (error) {
      this.handleError(error, "executeCustomQuery");
      return {
        error: {
          code: "CUSTOM_QUERY_ERROR",
          message: "Failed to execute custom query",
          details: error,
        },
      };
    }
  }

  /**
   * 쿼리 검증
   */
  private validateQuery(query: AnalyticsQuery): boolean {
    // 날짜 범위 검증
    if (query.startDate > query.endDate) return false;

    // 메트릭 검증
    const allowedMetrics = ["views", "users", "engagement", "duration"];
    if (!query.metrics.every((m) => allowedMetrics.includes(m))) return false;

    return true;
  }

  /**
   * 동적 쿼리 생성 및 실행
   */
  private async buildAndExecuteQuery(query: AnalyticsQuery): Promise<any> {
    // 실제 구현에서는 안전한 쿼리 빌더 사용
    // 여기서는 간단한 예시
    let dbQuery = this.supabase
      .from("analytics_events")
      .select("*")
      .gte("created_at", query.startDate.toISOString())
      .lte("created_at", query.endDate.toISOString());

    // 필터 적용
    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        dbQuery = dbQuery.eq(key, value);
      });
    }

    const { data, error } = await dbQuery;

    if (error) throw error;

    // 메트릭 계산
    return this.calculateMetrics(data || [], query.metrics);
  }

  /**
   * 메트릭 계산
   */
  private calculateMetrics(
    data: any[],
    metrics: string[]
  ): Record<string, any> {
    const results: Record<string, any> = {};

    metrics.forEach((metric) => {
      switch (metric) {
        case "views":
          results.views = data.filter(
            (d) => d.event_name === "video_view"
          ).length;
          break;
        case "users":
          results.users = new Set(data.map((d) => d.user_id)).size;
          break;
        case "engagement":
          const engagementEvents = data.filter((d) =>
            ["like", "share", "comment"].includes(d.event_action || "")
          );
          results.engagement = engagementEvents.length / data.length;
          break;
        default:
          results[metric] = 0;
      }
    });

    return results;
  }
}
```

---

## 📌 완료 사항

### ✅ Part 5 구현 완료

1. **Service Layer 아키텍처**

   - BaseService 추상 클래스
   - 공통 에러 처리 및 로깅
   - 타입 정의 및 스키마 검증

2. **VideoService**

   - YouTube API 통합
   - Claude API 영상 분류
   - 품질 평가 시스템
   - 채널 정보 관리

3. **UserService**

   - 사용자 프로필 관리
   - 키워드 선호도 추적
   - 영상 상호작용 기록
   - 행동 패턴 분석

4. **TrendService**

   - Google Trends 수집
   - 뉴스 기반 키워드 정제
   - 트렌드 영상 매핑
   - 채널 품질 필터링

5. **RecommendationService**

   - 개인화/트렌드/감정 추천
   - 하이브리드 알고리즘
   - 성과 추적 시스템
   - A/B 테스트 지원

6. **AnalyticsService**
   - 대시보드 메트릭
   - 사용자 행동 분석
   - 추천 성과 분석
   - 커스텀 쿼리 지원

## 📌 다음 단계

**Part 6: API 설계 + 실제 구현 예시**에서는:

1. **RESTful API 설계**

   - 엔드포인트 구조
   - 인증/인가
   - Rate Limiting

2. **GraphQL API (선택)**

   - 스키마 정의
   - Resolver 구현

3. **실제 구현 예시**

   - Express.js 라우터
   - 미들웨어
   - 에러 처리

4. **API 문서화**
   - OpenAPI/Swagger
   - 사용 예시

을 다룰 예정입니다.
