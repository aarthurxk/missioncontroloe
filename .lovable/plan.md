

## Problem

The `schedules` table is missing a DELETE RLS policy. Current policies only cover INSERT, SELECT, and UPDATE — so any attempt to delete a schedule (from mobile or desktop) fails silently.

## Fix

Add a single permissive DELETE policy for the `schedules` table, matching the pattern of the existing policies (open to `public` role):

```sql
CREATE POLICY "allow_all_delete" ON schedules FOR DELETE USING (true);
```

No code changes needed — the frontend already has delete logic in the SchedulerPage component.

