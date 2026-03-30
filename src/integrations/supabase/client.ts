import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Chaves públicas (anon key) — seguro commitar
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://yzlvbarddjsrsbaffssm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHZiYXJkZGpzcnNiYWZmc3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjYyNTQsImV4cCI6MjA4ODY0MjI1NH0.mAP51Qsiy78GJYtjWfq851ZN_KmdrdYjmQBaDfB5rzA";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
