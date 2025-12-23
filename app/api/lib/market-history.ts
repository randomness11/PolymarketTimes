import { getSupabase } from './supabase';

const HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds

interface MarketHistoryEntry {
  id: string;
  question: string;
  lastShown: string;
  lastOdds: number;
  showCount: number;
}

// ============================================
// SUPABASE FUNCTIONS
// ============================================

/**
 * Clear all history older than 1 hour
 */
async function clearOldHistory(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  
  const oneHourAgo = new Date(Date.now() - HOUR_MS).toISOString();
  
  const { error } = await supabase
    .from('market_history')
    .delete()
    .lt('last_shown', oneHourAgo);
  
  if (error) {
    console.error('Error clearing old history:', error);
  }
}

/**
 * Get the current edition's timestamp (rounded to the hour)
 */
function getCurrentEditionTime(): Date {
  const now = new Date();
  now.setMinutes(0, 0, 0); // Round down to current hour
  return now;
}

/**
 * Check if we're in a new edition (new hour)
 */
async function isNewEdition(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return true;
  
  const { data, error } = await supabase
    .from('market_history')
    .select('last_shown')
    .order('last_shown', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) return true;
  
  const lastShownHour = new Date(data.last_shown);
  lastShownHour.setMinutes(0, 0, 0);
  
  const currentHour = getCurrentEditionTime();
  
  return lastShownHour.getTime() !== currentHour.getTime();
}

/**
 * Record that a market was shown in this edition
 */
export async function recordMarketShown(
  marketId: string,
  question: string,
  currentOdds: number
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('Supabase not configured - skipping history recording');
    return;
  }
  
  // Clear old data if we're in a new hour
  const newEdition = await isNewEdition();
  if (newEdition) {
    console.log('New edition detected - clearing old history');
    await clearOldHistory();
  }
  
  const { error } = await supabase
    .from('market_history')
    .upsert({
      id: marketId,
      question,
      last_shown: new Date().toISOString(),
      last_odds: currentOdds,
      show_count: 1,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });
  
  if (error) {
    console.error('Error recording market:', error);
  }
}

/**
 * Get all markets shown in the current edition
 */
export async function getCurrentEditionMarkets(): Promise<MarketHistoryEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  
  const oneHourAgo = new Date(Date.now() - HOUR_MS).toISOString();
  
  const { data, error } = await supabase
    .from('market_history')
    .select('*')
    .gte('last_shown', oneHourAgo);
  
  if (error || !data) return [];
  
  return data.map(row => ({
    id: row.id,
    question: row.question,
    lastShown: row.last_shown,
    lastOdds: row.last_odds,
    showCount: row.show_count,
  }));
}

/**
 * Clear ALL history (force refresh)
 */
export async function clearAllHistory(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  
  const { error } = await supabase
    .from('market_history')
    .delete()
    .neq('id', ''); // Delete all rows
  
  if (error) {
    console.error('Error clearing all history:', error);
  }
}
