
CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  video_name TEXT NOT NULL DEFAULT 'Untitled',
  motion_type TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  tracking_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  theoretical_points JSONB,
  error_percent DOUBLE PRECISION,
  ai_description TEXT NOT NULL DEFAULT '',
  thumbnail TEXT
);

ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analysis history"
  ON public.analysis_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert analysis history"
  ON public.analysis_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can delete analysis history"
  ON public.analysis_history FOR DELETE
  TO anon, authenticated
  USING (true);
