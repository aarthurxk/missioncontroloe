CREATE POLICY "openclaw_insert_schedules"
ON public.schedules
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "openclaw_insert_executions"
ON public.executions
FOR INSERT
TO anon
WITH CHECK (true);