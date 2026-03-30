
CREATE TABLE public.roadmap_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_id UUID NOT NULL REFERENCES public.roadmap(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read roadmap_steps" ON public.roadmap_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roadmap_steps" ON public.roadmap_steps FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roadmap_steps" ON public.roadmap_steps FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roadmap_steps" ON public.roadmap_steps FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_steps;
