import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { EditorialData } from '../../types';

// Type-safe row definitions for our Supabase tables
export interface EditionRow {
  date_str: string;
  data: EditorialData;
  created_at: string;
}

export interface EditionInsert {
  date_str: string;
  data: EditorialData;
  created_at?: string;
}

export interface MarketHistoryRow {
  id: string;
  question: string;
  last_shown: string;
  last_odds: number;
  show_count: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriberRow {
  email: string;
  created_at: string;
}

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
