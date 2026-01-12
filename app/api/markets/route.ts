import { NextResponse } from 'next/server';
import { groupMarkets } from '../lib/market-grouping';
import { getSupabase, EditionInsert } from '../lib/supabase';
import {
  categorizeMarket,
  calculateCertainty,
  calculateSpeed,
  normalizeVolume,
  determineMarketStatus,
  CATEGORY_INTEREST,
  isShortTermSportsBet,
  calculateAudienceBoost,
  classifyTimeHorizon,
  TimeHorizon
} from '../../lib/market-processing';
import { Market, MarketCategory, MarketGroup } from '../../types';

interface PolymarketMarket {
  conditionId: string;
  question: string;
  outcomePrices: string; // JSON string
  volume: string;
  volume24hr: string;
  outcomes: string; // JSON string
  description: string;
  endDate?: string;
  liquidity?: string;
  image?: string;
  slug: string;
}

// Result type for getMarkets
export interface MarketsResult {
  markets: Market[];
  groups: any[]; // Using specific type for groups if available, or simplified
  timestamp: string;
  stats: {
    totalFetched: number;
    afterFiltering: number;
    groupCount: number;
  };
}

async function fetchPriceHistory(conditionId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://clob.polymarket.com/prices-history?market=${conditionId}&interval=1d&fidelity=60`,
      { next: { revalidate: 14400 } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.history || data.history.length < 2) return null;

    const oldPrice = parseFloat(data.history[0].p);
    const currentPrice = parseFloat(data.history[data.history.length - 1].p);

    return (currentPrice - oldPrice) * 100;
  } catch (error) {
    console.error('Error fetching price history:', error);
    return null;
  }
}

export async function getMarkets(forceRefresh = false): Promise<MarketsResult> {
  const supabase = getSupabase();
  const CACHE_KEY = 'market_cache_latest';
  const CACHE_DURATION_MS = 3600 * 1000; // 1 hour
  const isDev = process.env.NODE_ENV === 'development';

  // 1. Try to get from Supabase Cache (skip in dev or if force refresh)
  if (supabase && !forceRefresh && !isDev) {
    const { data: cached } = await supabase
      .from('editions')
      .select('data, created_at')
      .eq('date_str', CACHE_KEY)
      .single();

    if (cached && cached.data) {
      const age = new Date().getTime() - new Date(cached.created_at).getTime();
      if (age < CACHE_DURATION_MS) {
        console.log('Serving markets from Supabase cache');
        return cached.data as MarketsResult;
      } else {
        console.log('Supabase cache stale, refreshing...');
      }
    }
  } else if (isDev) {
    console.log('DEV MODE: Skipping market cache, fetching fresh data');
  }

  // 2. Fetch fresh data (No Next.js Cache)
  // Fetch FEATURED events
  const response = await fetch(
    'https://gamma-api.polymarket.com/events?limit=300&closed=false',
    { cache: 'no-store' } // DONT use Next.js Data Cache (limit 2MB)
  );

  if (!response.ok) {
    throw new Error('Failed to fetch markets from Polymarket');
  }

  const events: any[] = await response.json();

  const rawMarkets: PolymarketMarket[] = events
    .filter(e => e.markets && e.markets.length > 0)
    .map(e => {
      const m = e.markets[0];
      return {
        conditionId: m.conditionId,
        question: m.question,
        outcomePrices: m.outcomePrices,
        volume: String(m.volume || 0),
        volume24hr: String(m.volume24hr || 0),
        outcomes: m.outcomes,
        description: m.description || e.description || '',
        endDate: m.endDate,
        liquidity: String(m.liquidity || 0),
        image: e.image || m.image,
        slug: e.slug,
      };
    });

  const maxVolume = Math.max(...rawMarkets.map(m => parseFloat(m.volume24hr || '0')));

  // Phase 1: Pre-filter and parse markets (synchronous)
  interface PreProcessedMarket {
    raw: PolymarketMarket;
    yesPrice: number;
    noPrice: number;
    volume24hr: number;
    totalVolume: number;
    liquidity: number;
    category: MarketCategory;
    outcomesArray: string[];
  }

  const preProcessed: PreProcessedMarket[] = [];

  for (const market of rawMarkets) {
    if (!market.outcomePrices || !market.outcomes) continue;

    let outcomePricesArray: string[];
    let outcomesArray: string[];

    try {
      outcomePricesArray = JSON.parse(market.outcomePrices);
      outcomesArray = JSON.parse(market.outcomes);
    } catch (e) {
      console.warn('Failed to parse market JSON', market.question);
      continue;
    }

    const yesPrice = parseFloat(outcomePricesArray[0] || '0');
    const noPrice = parseFloat(outcomePricesArray[1] || '0');
    const volume24hr = parseFloat(market.volume24hr || '0');
    const totalVolume = parseFloat(market.volume || '0');
    const liquidity = parseFloat(market.liquidity || '0');

    // Temporarily store for AI categorization later
    const category: MarketCategory = 'OTHER'; // Will be set by AI agent if enabled

    if (isShortTermSportsBet(market.question, category)) {
      continue;
    }

    // RELAXED FILTER: Allow much smaller markets
    if (volume24hr < 10 && totalVolume < 100) {
      continue;
    }

    preProcessed.push({
      raw: market,
      yesPrice,
      noPrice,
      volume24hr,
      totalVolume,
      liquidity,
      category,
      outcomesArray,
    });
  }

  // Phase 2: Fetch all price histories in PARALLEL (major performance improvement)
  const priceChanges = await Promise.all(
    preProcessed.map(m => fetchPriceHistory(m.raw.conditionId))
  );

  // Phase 3A: CATEGORIZATION (deterministic keyword-based)
  for (const market of preProcessed) {
    market.category = categorizeMarket(market.raw.question, market.raw.description || '');
  }

  // Phase 3B: Complete scoring with fetched data (ALGORITHMIC FALLBACK)
  const processedMarkets: Market[] = preProcessed.map((market, index) => {
    const priceChange24h = priceChanges[index];

    // Fallback algorithmic scoring (used if AI scoring is disabled or fails)
    const money = normalizeVolume(market.volume24hr, maxVolume);
    const certainty = calculateCertainty(market.yesPrice);
    const speed = calculateSpeed(priceChange24h);
    const interest = CATEGORY_INTEREST[market.category];

    // NEW: Apply audience boost (future markets + tech entities)
    const audienceBoost = calculateAudienceBoost(
      market.raw.question,
      market.raw.description || '',
      market.category,
      market.raw.endDate || null
    );
    const timeHorizon = classifyTimeHorizon(market.raw.endDate || null);

    const total = (money * 0.35 + certainty * 0.35 + speed * 0.30) * interest * audienceBoost;

    const marketStatus = determineMarketStatus(market.yesPrice, priceChange24h);

    return {
      id: market.raw.conditionId,
      question: market.raw.question,
      slug: market.raw.slug,
      description: market.raw.description || '',
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      volume24hr: market.volume24hr,
      totalVolume: market.totalVolume,
      liquidity: market.liquidity,
      priceChange24h,
      outcomes: market.outcomesArray,
      endDate: market.raw.endDate || null,
      image: market.raw.image || null,
      scores: { money, certainty, speed, interest, total },
      category: market.category,
      timeHorizon,
      marketStatus,
    };
  });

  // Phase 4: Sort by score (deterministic)
  processedMarkets.sort((a, b) => b.scores.total - a.scores.total);

  // Phase 5: Market grouping (deterministic)
  const groups = groupMarkets(processedMarkets);

  console.log(`Markets API: Fetched ${rawMarkets.length} raw, ${processedMarkets.length} after filter.`);

  const result: MarketsResult = {
    markets: processedMarkets,
    groups: groups, // Already in correct format from agents
    timestamp: new Date().toISOString(),
    stats: {
      totalFetched: rawMarkets.length,
      afterFiltering: processedMarkets.length,
      groupCount: groups.length,
    },
  };

  // Save to Supabase Cache
  if (supabase) {
    const { error } = await supabase
      .from('editions')
      .upsert({
        date_str: CACHE_KEY,
        data: result,
        created_at: new Date().toISOString()
      }, { onConflict: 'date_str' });

    if (error) console.error('Failed to save market cache:', error);
    else console.log('Saved fresh markets to Supabase cache');
  }

  return result;
}

export const revalidate = 3600;

// CORS headers for decentralized frontend (IPFS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('force') === 'true';
    const data = await getMarkets(forceRefresh);
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in markets API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500, headers: corsHeaders }
    );
  }
}
