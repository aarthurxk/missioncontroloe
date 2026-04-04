DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'schedules' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON schedules';
  END LOOP;
END $$;

CREATE POLICY "allow_all_insert" ON schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_select" ON schedules FOR SELECT USING (true);
CREATE POLICY "allow_all_update" ON schedules FOR UPDATE USING (true) WITH CHECK (true);