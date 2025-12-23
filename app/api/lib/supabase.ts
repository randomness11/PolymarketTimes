import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to ensure env vars are loaded
let supabaseInstance: SupabaseClient | null = null;
let initialized = false;

export function getSupabase(): SupabaseClient | null {
  if (initialized) {
    return supabaseInstance;
  }

  initialized = true;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  console.log('Supabase init check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    urlPreview: supabaseUrl?.substring(0, 30) + '...'
  });

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not configured - check your .env.local file');
    return null;
  }

  // Debug: Check for common issues like quotes or whitespace in URL
  if (supabaseUrl.includes('"') || supabaseUrl.includes(' ') || !supabaseUrl.startsWith('http')) {
    console.error('CRITICAL: Malformed SUPABASE_URL detected:', `[${supabaseUrl}]`);
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false // Server-side usage involves no browser session
    }
  });
  console.log('Supabase client created successfully');
  return supabaseInstance;
}

// For backwards compatibility
export const supabase = null; // Will be replaced by getSupabase() calls

// Type for our market history table
export interface MarketHistoryRow {
  id: string;
  question: string;
  last_shown: string;
  last_odds: number;
  show_count: number;
  created_at: string;
  updated_at: string;
}
