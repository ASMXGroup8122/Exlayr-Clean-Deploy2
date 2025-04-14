-- Campaigns Schema

-- Main campaigns table
CREATE TABLE IF NOT EXISTS sponsor_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id UUID NOT NULL REFERENCES exchange_sponsor(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal VARCHAR(50) NOT NULL, -- 'raise', 'volume', 'announcement', etc.
  target_amount DECIMAL(12,2), -- For fundraising campaigns
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed', 'cancelled'
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  template_id VARCHAR(50) -- Reference to template used (if any)
);

-- Campaign content table
CREATE TABLE IF NOT EXISTS campaign_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'video', 'image', 'text', 'social_post', etc.
  title VARCHAR(255),
  content TEXT,
  media_url VARCHAR(1024), -- URL to video, image, etc.
  scheduled_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'scheduled'
  platform VARCHAR(50), -- 'linkedin', 'twitter', 'email', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign metrics table
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  custom_metrics JSONB, -- Flexible field for additional metrics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, metric_date)
);

-- Campaign targets table
CREATE TABLE IF NOT EXISTS campaign_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  target_type VARCHAR(50) NOT NULL, -- 'country', 'demographic', 'interest', etc.
  target_value TEXT NOT NULL, -- The specific target value
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, target_type, target_value)
);

-- Campaign templates table
CREATE TABLE IF NOT EXISTS campaign_templates (
  id VARCHAR(50) PRIMARY KEY, -- e.g., 'token-uae', 'volume-smallcap'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  goal VARCHAR(50) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  default_content JSONB, -- Template for content items
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client campaign assignments
CREATE TABLE IF NOT EXISTS client_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL, -- This would reference a client/issuer table
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, client_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_sponsor_id ON sponsor_campaigns(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign_id ON campaign_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_client_campaigns_client_id ON client_campaigns(client_id);

-- Initial template data
INSERT INTO campaign_templates (id, name, description, goal, duration_days, default_content)
VALUES 
  ('token-uae', 'Token Raise - UAE Focus', '30-day push for regulated token issuance targeting UAE-based investors.', 'raise', 30, '{}'),
  ('volume-smallcap', 'Volume Boost - Small Cap', 'Drive liquidity for a thinly traded listed company with social and finfluencer activation.', 'volume', 21, '{}'),
  ('post-raise-ir', 'Post-Raise Investor Confidence', 'IR and messaging playbook to boost share price momentum after a successful raise.', 'announcement', 14, '{}')
ON CONFLICT (id) DO NOTHING; 