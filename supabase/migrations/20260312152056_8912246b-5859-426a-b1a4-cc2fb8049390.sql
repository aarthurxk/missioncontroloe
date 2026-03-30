
CREATE TABLE public.roadmap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Pessoal',
  priority text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'ideia',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read roadmap"
  ON public.roadmap FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert roadmap"
  ON public.roadmap FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roadmap"
  ON public.roadmap FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roadmap"
  ON public.roadmap FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap;
