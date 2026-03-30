-- Create robots table
CREATE TABLE public.robots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Pessoal',
  icon TEXT DEFAULT '🤖',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create executions table
CREATE TABLE public.executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  robot_id UUID NOT NULL REFERENCES public.robots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  log_output TEXT,
  error_message TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'manual'
);

-- Enable RLS (public app, no auth - allow all)
ALTER TABLE public.robots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth needed - personal app)
CREATE POLICY "Allow all access to robots" ON public.robots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to executions" ON public.executions FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_executions_robot_id ON public.executions(robot_id);
CREATE INDEX idx_executions_status ON public.executions(status);
CREATE INDEX idx_executions_started_at ON public.executions(started_at);

-- Enable realtime for executions and robots
ALTER PUBLICATION supabase_realtime ADD TABLE public.executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.robots;