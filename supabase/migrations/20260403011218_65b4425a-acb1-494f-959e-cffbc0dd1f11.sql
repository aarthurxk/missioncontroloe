
-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Service role / anon can read all (for edge function to send notifications)
CREATE POLICY "Anon can read all push subscriptions"
ON public.push_subscriptions FOR SELECT
TO anon
USING (true);

-- Anon can delete expired subscriptions (410 cleanup)
CREATE POLICY "Anon can delete push subscriptions"
ON public.push_subscriptions FOR DELETE
TO anon
USING (true);
