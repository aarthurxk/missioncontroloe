DROP POLICY IF EXISTS "Allow all access to executions" ON public.executions;
DROP POLICY IF EXISTS "Allow all access to robots" ON public.robots;

CREATE POLICY "Allow all access to executions"
  ON public.executions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to robots"
  ON public.robots FOR ALL USING (true) WITH CHECK (true);