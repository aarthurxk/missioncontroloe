DROP POLICY IF EXISTS "openclaw_insert_schedules" ON schedules;
DROP POLICY IF EXISTS "openclaw_insert_executions" ON executions;

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_anon_insert_schedules"
ON schedules FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "allow_anon_insert_executions"
ON executions FOR INSERT TO anon WITH CHECK (true);