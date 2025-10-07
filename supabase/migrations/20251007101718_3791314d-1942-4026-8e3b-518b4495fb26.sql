-- Create audit readiness scoring tables

-- Country-specific profile settings (weights and overrides)
CREATE TABLE IF NOT EXISTS public.country_profile_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL CHECK (country IN ('Wales', 'England', 'Scotland')),
  overrides_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(country)
);

-- Practice-specific targets
CREATE TABLE IF NOT EXISTS public.practice_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  section_key TEXT, -- NULL means Overall target
  target_score INTEGER NOT NULL CHECK (target_score >= 0 AND target_score <= 100),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Current scores (denormalized for fast dashboard access)
CREATE TABLE IF NOT EXISTS public.score_current (
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL, -- 'Overall' for overall score
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  gates_json JSONB DEFAULT '{}',
  contributors_json JSONB DEFAULT '{}', -- stores E, C, S, R, Q, X, N values
  PRIMARY KEY (practice_id, section_key)
);

-- Historical snapshots for trends
CREATE TABLE IF NOT EXISTS public.score_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  section_key TEXT, -- NULL means Overall
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  contributors_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_practice_targets_practice ON public.practice_targets(practice_id);
CREATE INDEX IF NOT EXISTS idx_score_snapshot_practice_date ON public.score_snapshot(practice_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_score_snapshot_section ON public.score_snapshot(practice_id, section_key, snapshot_date DESC);

-- Triggers for updated_at (using DROP IF EXISTS to avoid conflicts)
DROP TRIGGER IF EXISTS update_country_profile_settings_updated_at ON public.country_profile_settings;
CREATE TRIGGER update_country_profile_settings_updated_at
  BEFORE UPDATE ON public.country_profile_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_practice_targets_updated_at ON public.practice_targets;
CREATE TRIGGER update_practice_targets_updated_at
  BEFORE UPDATE ON public.practice_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.country_profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_snapshot ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view country settings" ON public.country_profile_settings;
DROP POLICY IF EXISTS "Users can view targets in their practice" ON public.practice_targets;
DROP POLICY IF EXISTS "Practice managers can manage targets" ON public.practice_targets;
DROP POLICY IF EXISTS "Users can view current scores in their practice" ON public.score_current;
DROP POLICY IF EXISTS "System can manage scores" ON public.score_current;
DROP POLICY IF EXISTS "Users can view score snapshots in their practice" ON public.score_snapshot;
DROP POLICY IF EXISTS "System can insert snapshots" ON public.score_snapshot;

-- Country settings are read-only for all authenticated users
CREATE POLICY "Anyone can view country settings"
  ON public.country_profile_settings FOR SELECT
  TO authenticated
  USING (true);

-- Practice targets
CREATE POLICY "Users can view targets in their practice"
  ON public.practice_targets FOR SELECT
  TO authenticated
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Practice managers can manage targets"
  ON public.practice_targets FOR ALL
  TO authenticated
  USING (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  );

-- Current scores
CREATE POLICY "Users can view current scores in their practice"
  ON public.score_current FOR SELECT
  TO authenticated
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "System can manage scores"
  ON public.score_current FOR ALL
  TO authenticated
  USING (practice_id = get_current_user_practice_id());

-- Score snapshots (read-only for users, write for system)
CREATE POLICY "Users can view score snapshots in their practice"
  ON public.score_snapshot FOR SELECT
  TO authenticated
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "System can insert snapshots"
  ON public.score_snapshot FOR INSERT
  TO authenticated
  WITH CHECK (practice_id = get_current_user_practice_id());

-- Seed default country profile settings
INSERT INTO public.country_profile_settings (country, overrides_json)
VALUES 
  ('Wales', '{"W_raw": {"FridgeTemps": 1.10, "InfectionControlAudit": 1.00, "FireRisk": 0.90, "HSToolkit": 0.90, "Complaints": 1.00, "HR_Training": 0.80, "HR_Appraisals": 0.60, "HR_Hiring": 0.70, "DailyCleaning": 0.70, "Policies": 0.60, "Incidents": 0.80, "MonthEndScripts": 0.50, "EnhancedClaims": 0.50, "InsuranceMedicals": 0.50}, "within_section": {"Complaints": {"wS": 0.10, "wE": 0.05, "wR": 0.05, "wQ": -0.10}}}'),
  ('England', '{"W_raw": {"FridgeTemps": 1.00, "InfectionControlAudit": 0.95, "FireRisk": 0.90, "HSToolkit": 0.90, "Complaints": 0.90, "HR_Training": 0.90, "HR_Appraisals": 0.70, "HR_Hiring": 0.80, "DailyCleaning": 0.70, "Policies": 0.80, "Incidents": 0.70, "MonthEndScripts": 0.50, "EnhancedClaims": 0.50, "InsuranceMedicals": 0.50}, "within_section": {"Policies": {"wE": 0.05, "wR": 0.05, "wX": -0.10}, "HR_Training": {"wC": 0.05, "wN": 0.05, "wQ": -0.10}}}'),
  ('Scotland', '{"W_raw": {"FridgeTemps": 1.00, "InfectionControlAudit": 1.10, "FireRisk": 0.95, "HSToolkit": 0.90, "Complaints": 0.85, "HR_Training": 0.80, "HR_Appraisals": 0.60, "HR_Hiring": 0.70, "DailyCleaning": 0.80, "Policies": 0.60, "Incidents": 0.80, "MonthEndScripts": 0.50, "EnhancedClaims": 0.50, "InsuranceMedicals": 0.50}, "within_section": {"InfectionControlAudit": {"wE": 0.05, "wC": 0.05, "wQ": -0.05, "wX": -0.05}}}')
ON CONFLICT (country) DO NOTHING;