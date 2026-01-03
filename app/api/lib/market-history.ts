import { getSupabase } from './supabase';

const EDITION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

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

  const oneIntervalAgo = new Date(Date.now() - EDITION_DURATION_MS).toISOString();

  const { error } = await supabase
    .from('market_history')
    .delete()
    .lt('last_shown', oneIntervalAgo);

  if (error) {
    console.error('Error clearing old history:', error);
  }
}

/**
 * Get the current edition's timestamp (rounded to the 4-hour block)
 */
function getCurrentEditionTime(): Date {
  const now = new Date();
  const currentHour = now.getHours();
  // Round down to nearest 4-hour block (0, 4, 8, 12, 16, 20)
  const startHour = Math.floor(currentHour / 4) * 4;

  now.setHours(startHour, 0, 0, 0);
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
 * Record multiple markets shown in this edition (Batch optimized)
 */
export async function recordMarketsShown(
  markets: { id: string; question: string; currentOdds: number }[]
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  // Clear old data if we're in a new hour (check once)
  if (await isNewEdition()) {
    console.log('New edition detected - clearing old history');
    await clearOldHistory();
  }

  const payload = markets.map(m => ({
    id: m.id,
    question: m.question,
    last_shown: new Date().toISOString(),
    last_odds: m.currentOdds,
    show_count: 1,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('market_history')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Error batch recording markets:', error);
  }
}

/**
 * Record that a market was shown in this edition
 */
export async function recordMarketShown(
  marketId: string,
  question: string,
  currentOdds: number
): Promise<void> {
  return recordMarketsShown([{ id: marketId, question, currentOdds: currentOdds }]);
}

/**
 * Get all markets shown in the current edition
 */
export async function getCurrentEditionMarkets(): Promise<MarketHistoryEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const oneIntervalAgo = new Date(Date.now() - EDITION_DURATION_MS).toISOString();

  const { data, error } = await supabase
    .from('market_history')
    .select('*')
    .gte('last_shown', oneIntervalAgo);

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
