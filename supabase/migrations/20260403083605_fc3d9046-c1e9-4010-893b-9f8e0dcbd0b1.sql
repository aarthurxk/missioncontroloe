-- Remove anon policies from push_subscriptions (insecure)
DROP POLICY IF EXISTS "Anon can delete push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anon can read all push subscriptions" ON public.push_subscriptions;