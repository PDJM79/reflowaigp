-- Create country enum
CREATE TYPE public.country_code AS ENUM ('Wales', 'England', 'Scotland');

-- Create table for country-specific scoring configuration
CREATE TABLE public.country_profile_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country country_code NOT NULL UNIQUE,
  overrides_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for practice score targets
CREATE TABLE public.practice_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  section_key TEXT,
  target_score INTEGER NOT NULL CHECK (target_score >= 0 AND target_score <= 100),
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(practice_id, section_key)
);

-- Create table for current scores (denormalized for fast dashboard queries)
CREATE TABLE public.score_current (
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  section_key TEXT,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  gates_json JSONB DEFAULT '{}'::jsonb,
  contributors_json JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (practice_id, section_key)
);

-- Create table for score snapshots (historical tracking)
CREATE TABLE public.score_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  section_key TEXT,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  contributors_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(practice_id, snapshot_date, section_key)
);

-- Create table for AI improvement recommendations
CREATE TABLE public.improvement_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  overall_score INTEGER NOT NULL,
  recommendations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  accepted_by UUID REFERENCES public.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add country column to practices table if not exists
ALTER TABLE public.practices 
ADD COLUMN IF NOT EXISTS audit_country country_code DEFAULT 'England';

-- Create indexes for performance
CREATE INDEX idx_score_current_practice ON public.score_current(practice_id);
CREATE INDEX idx_score_snapshot_practice_date ON public.score_snapshot(practice_id, snapshot_date DESC);
CREATE INDEX idx_practice_targets_practice ON public.practice_targets(practice_id);
CREATE INDEX idx_improvement_recommendations_practice ON public.improvement_recommendations(practice_id, generated_at DESC);

-- Enable RLS
ALTER TABLE public.country_profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for country_profile_settings (read-only for all authenticated users)
CREATE POLICY "Anyone can view country settings"
  ON public.country_profile_settings FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for practice_targets
CREATE POLICY "Practice managers can manage targets"
  ON public.practice_targets FOR ALL
  TO authenticated
  USING (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  );

CREATE POLICY "Users can view targets in their practice"
  ON public.practice_targets FOR SELECT
  TO authenticated
  USING (practice_id = get_current_user_practice_id());

-- RLS Policies for score_current
CREATE POLICY "Users can view current scores in their practice"
  ON public.score_current FOR SELECT
  TO authenticated
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "System can manage scores"
  ON public.score_current FOR ALL
  TO authenticated
  USING (practice_id = get_current_user_practice_id());

-- RLS Policies for score_snapshot
CREATE POLICY "Users can view score snapshots in their practice"
  ON public.score_snapshot FOR SELECT
  TO authenticated
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "System can insert snapshots"
  ON public.score_snapshot FOR INSERT
  TO authenticated
  WITH CHECK (practice_id = get_current_user_practice_id());

-- RLS Policies for improvement_recommendations
CREATE POLICY "Practice managers can view recommendations"
  ON public.improvement_recommendations FOR SELECT
  TO authenticated
  USING (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  );

CREATE POLICY "Practice managers can manage recommendations"
  ON public.improvement_recommendations FOR ALL
  TO authenticated
  USING (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  );

-- Add triggers for updated_at
CREATE TRIGGER update_country_profile_settings_updated_at
  BEFORE UPDATE ON public.country_profile_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_targets_updated_at
  BEFORE UPDATE ON public.practice_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed country profile settings with default weights
INSERT INTO public.country_profile_settings (country, overrides_json) VALUES
('Wales', '{
  "section_weights": {
    "FridgeTemps": 1.10,
    "InfectionControlAudit": 1.00,
    "FireRisk": 0.90,
    "HSToolkit": 0.90,
    "Complaints": 1.00,
    "HR_Training": 0.80,
    "HR_Appraisals": 0.60,
    "HR_Hiring": 0.70,
    "DailyCleaning": 0.70,
    "Policies": 0.60,
    "Incidents": 0.80,
    "MonthEndScripts": 0.50,
    "EnhancedClaims": 0.50,
    "InsuranceMedicals": 0.50
  },
  "component_overrides": {
    "Complaints": {"wS": 0.50, "wE": 0.25, "wR": 0.20, "wQ": 0.05}
  }
}'::jsonb),
('England', '{
  "section_weights": {
    "FridgeTemps": 1.00,
    "InfectionControlAudit": 0.95,
    "FireRisk": 0.90,
    "HSToolkit": 0.90,
    "Complaints": 0.90,
    "HR_Training": 0.90,
    "HR_Appraisals": 0.70,
    "HR_Hiring": 0.80,
    "DailyCleaning": 0.70,
    "Policies": 0.80,
    "Incidents": 0.70,
    "MonthEndScripts": 0.50,
    "EnhancedClaims": 0.50,
    "InsuranceMedicals": 0.50
  },
  "component_overrides": {
    "Policies": {"wE": 0.35, "wR": 0.15, "wX": 0.00},
    "HR_Training": {"wC": 0.40, "wN": 0.20, "wQ": 0.00}
  }
}'::jsonb),
('Scotland', '{
  "section_weights": {
    "FridgeTemps": 1.00,
    "InfectionControlAudit": 1.10,
    "FireRisk": 0.95,
    "HSToolkit": 0.90,
    "Complaints": 0.85,
    "HR_Training": 0.80,
    "HR_Appraisals": 0.60,
    "HR_Hiring": 0.70,
    "DailyCleaning": 0.80,
    "Policies": 0.60,
    "Incidents": 0.80,
    "MonthEndScripts": 0.50,
    "EnhancedClaims": 0.50,
    "InsuranceMedicals": 0.50
  },
  "component_overrides": {
    "InfectionControlAudit": {"wE": 0.35, "wC": 0.25, "wQ": 0.05, "wX": 0.00}
  }
}'::jsonb)
ON CONFLICT (country) DO NOTHING;