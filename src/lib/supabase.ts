// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Use Vite environment variables (since you're using VITE_ prefix)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Fallback to React env vars if Vite vars aren't available
const finalSupabaseUrl = supabaseUrl || import.meta.env.REACT_APP_SUPABASE_URL;
const finalSupabaseAnonKey = supabaseAnonKey || import.meta.env.REACT_APP_SUPABASE_ANON_KEY;
const finalSupabaseServiceKey = supabaseServiceKey || import.meta.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!finalSupabaseUrl || !finalSupabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

if (!finalSupabaseServiceKey) {
  console.warn('Supabase Service Role Key not found - server-side operations may fail');
}

// Regular client for client-side operations (respects RLS)
export const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey);

// Service role client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(finalSupabaseUrl, finalSupabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});