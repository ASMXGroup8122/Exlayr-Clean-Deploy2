// Campaign Types

export type CampaignGoal = 'raise' | 'volume' | 'announcement' | 'post_raise' | 'partnership' | 'press_release';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type ContentType = 'video' | 'image' | 'text' | 'social_post' | 'email' | 'webinar';
export type ContentStatus = 'draft' | 'published' | 'scheduled';
export type Platform = 'linkedin' | 'twitter' | 'instagram' | 'email' | 'website' | 'youtube' | 'telegram';
export type TargetType = 'country' | 'demographic' | 'interest' | 'industry';

export interface Campaign {
  id: string;
  sponsor_id: string;
  title: string;
  description?: string;
  goal: CampaignGoal;
  target_amount?: number;
  status: CampaignStatus;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  template_id?: string;
}

export interface CampaignContent {
  id: string;
  campaign_id: string;
  content_type: ContentType;
  title?: string;
  content?: string;
  media_url?: string;
  scheduled_date?: string;
  status: ContentStatus;
  platform?: Platform;
  created_at: string;
  updated_at: string;
}

export interface CampaignMetrics {
  id: string;
  campaign_id: string;
  metric_date: string;
  views: number;
  clicks: number;
  conversions: number;
  spend: number;
  leads_generated: number;
  custom_metrics?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CampaignTarget {
  id: string;
  campaign_id: string;
  target_type: TargetType;
  target_value: string;
  created_at: string;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description?: string;
  goal: CampaignGoal;
  duration_days: number;
  default_content?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ClientCampaign {
  id: string;
  campaign_id: string;
  client_id: string;
  created_at: string;
} 