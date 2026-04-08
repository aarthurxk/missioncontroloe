
-- Enable pg_net extension for HTTP calls from the database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create trigger function that calls the edge function
CREATE OR REPLACE FUNCTION public.notify_execution_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
  _function_url text;
  _payload jsonb;
BEGIN
  -- Only fire when status changes to a terminal state
  IF NEW.status NOT IN ('success', 'error', 'cancelled') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Build the webhook payload (matches Supabase webhook format)
  _payload := jsonb_build_object(
    'type', 'UPDATE',
    'record', row_to_json(NEW)::jsonb,
    'old_record', row_to_json(OLD)::jsonb
  );

  -- Get Supabase URL from app_settings or use env
  _supabase_url := current_setting('app.settings.supabase_url', true);
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    _supabase_url := 'https://yzlvbarddjsrsbaffssm.supabase.co';
  END IF;

  _service_role_key := current_setting('app.settings.service_role_key', true);
  IF _service_role_key IS NULL OR _service_role_key = '' THEN
    -- Use the supabase_admin role's service_role_key from vault if available
    SELECT decrypted_secret INTO _service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;
  END IF;

  _function_url := _supabase_url || '/functions/v1/notify-execution-complete';

  -- Fire-and-forget HTTP POST via pg_net
  PERFORM net.http_post(
    url := _function_url,
    body := _payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger on executions table
DROP TRIGGER IF EXISTS trg_notify_execution_complete ON public.executions;
CREATE TRIGGER trg_notify_execution_complete
  AFTER UPDATE ON public.executions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_execution_complete();
