DROP POLICY IF EXISTS "allow_anon_insert_schedules" ON schedules;
DROP POLICY IF EXISTS "openclaw_insert_schedules" ON schedules;

CREATE POLICY "allow_anon_insert_schedules"
ON schedules
AS PERMISSIVE
FOR INSERT
TO anon
WITH CHECK (true);