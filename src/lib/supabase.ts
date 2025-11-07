import { createClient } from '@supabase/supabase-js';

// Use Vite environment variables (since you're using VITE_ prefix)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback to React env vars if Vite vars aren't available
const finalSupabaseUrl = supabaseUrl || import.meta.env.REACT_APP_SUPABASE_URL;
const finalSupabaseKey = supabaseKey || import.meta.env.REACT_APP_SUPABASE_ANON_KEY;

if (!finalSupabaseUrl || !finalSupabaseKey) {
  console.error('Missing Supabase environment variables!');
}

export const supabase = createClient(finalSupabaseUrl, finalSupabaseKey);