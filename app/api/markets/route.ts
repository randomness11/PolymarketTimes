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
  eventTitle?: string; // Parent event title for grouping
}

// Configuration for full market fetching
const FETCH_CONFIG = {
  BATCH_SIZE: 500,        // Max per API request
  MAX_EVENTS: 6500,       // Approximate total events on Polymarket
  CONCURRENCY: 5,         // Parallel requests
  MIN_VOLUME_24H: 100,    // Stage 1 filter: minimum 24h volume
  MIN_TOTAL_VOLUME: 1000, // Stage 1 filter: minimum total volume
  TOP_N_FOR_SCORING: 1000, // Only score top N after stage 1
  TOP_N_FOR_PRICE_HISTORY: 500, // Only fetch price history for top N
};

/**
 * Retry fetch with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry on 4xx client errors (permanent failures)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Retry on 5xx server errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Fetch attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Fetch a single batch of events from Polymarket
 */
async function fetchEventBatch(offset: number, limit: number): Promise<any[]> {
  try {
    const response = await fetchWithRetry(
      `https://gamma-api.polymarket.com/events?limit=${limit}&closed=false&offset=${offset}`,
      { cache: 'no-store' },
      2,
      500
    );
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.warn(`Failed to fetch batch at offset ${offset}:`, error);
    return [];
  }
}

/**
 * Fetch ALL events from Polymarket using parallel pagination
 */
async function fetchAllEvents(): Promise<any[]> {
  const allEvents: any[] = [];
  const offsets: number[] = [];

  // Generate all offsets we need to fetch
  for (let offset = 0; offset < FETCH_CONFIG.MAX_EVENTS; offset += FETCH_CONFIG.BATCH_SIZE) {
    offsets.push(offset);
  }

  console.log(`Fetching ${offsets.length} batches of events in parallel...`);

  // Fetch in parallel batches (respecting concurrency limit)
  for (let i = 0; i < offsets.length; i += FETCH_CONFIG.CONCURRENCY) {
    const batch = offsets.slice(i, i + FETCH_CONFIG.CONCURRENCY);
    const results = await Promise.all(
      batch.map(offset => fetchEventBatch(offset, FETCH_CONFIG.BATCH_SIZE))
    );

    for (const events of results) {
      if (events.length > 0) {
        allEvents.push(...events);
      }
    }

    // If we got an empty batch, we've reached the end
    if (results.some(r => r.length === 0)) {
      console.log(`Reached end of events at offset ~${i * FETCH_CONFIG.BATCH_SIZE}`);
      break;
    }
  }

  console.log(`Fetched ${allEvents.length} total events from Polymarket`);
  return allEvents;
}

/**
 * Extract ALL markets from events (not just the first one)
 */
function extractAllMarkets(events: any[]): PolymarketMarket[] {
  const markets: PolymarketMarket[] = [];

  for (const event of events) {
    if (!event.markets || event.markets.length === 0) continue;

    // Extract ALL markets from this event, not just markets[0]
    for (const m of event.markets) {
      if (!m.conditionId) continue;

      markets.push({
        conditionId: m.conditionId,
        question: m.question,
        outcomePrices: m.outcomePrices,
        volume: String(m.volume || 0),
        volume24hr: String(m.volume24hr || 0),
        outcomes: m.outcomes,
        description: m.description || event.description || '',
        endDate: m.endDate,
        liquidity: String(m.liquidity || 0),
        image: event.image || m.image,
        slug: event.slug,
        eventTitle: event.title || event.question || m.question,
      });
    }
  }

  return markets;
}

/**
 * Stage 1: Fast algorithmic pre-filter (no API calls, no AI)
 * Reduces ~20,000 markets to ~2,000 candidates
 */
function stage1FastFilter(markets: PolymarketMarket[]): PolymarketMarket[] {
  // COMPREHENSIVE SPORTS BLOCKLIST
  const SPORTS_LEAGUES = [
    'nfl', 'nba', 'mlb', 'nhl', 'mls', 'wnba', 'xfl', 'usfl', 'cfl',
    'premier league', 'la liga', 'serie a', 'bundesliga', 'ligue 1',
    'champions league', 'europa league', 'conference league', 'ucl',
    'world cup', 'euros', 'copa america', 'afcon', 'euro 2024', 'euro 2028',
    'olympics', 'paralympics',
    'ncaa', 'march madness', 'college football', 'college basketball', 'cfp',
    'atp', 'wta', 'pga', 'lpga', 'liv golf',
    'f1', 'formula 1', 'formula one', 'nascar', 'indycar', 'motogp',
    'ufc', 'bellator', 'pfl', 'one championship',
    'wwe', 'aew',
  ];

  const SPORTS_TEAMS = [
    // NFL
    'patriots', 'bills', 'dolphins', 'jets', 'ravens', 'bengals', 'browns', 'steelers',
    'texans', 'colts', 'jaguars', 'titans', 'broncos', 'chiefs', 'raiders', 'chargers',
    'cowboys', 'eagles', 'giants', 'commanders', 'bears', 'lions', 'packers', 'vikings',
    'falcons', 'panthers', 'saints', 'buccaneers', 'cardinals', '49ers', 'seahawks', 'rams',
    // NBA
    'celtics', 'nets', 'knicks', '76ers', 'raptors', 'bulls', 'cavaliers', 'pistons',
    'pacers', 'bucks', 'hawks', 'hornets', 'heat', 'magic', 'wizards', 'nuggets',
    'timberwolves', 'thunder', 'blazers', 'jazz', 'warriors', 'clippers', 'lakers',
    'suns', 'kings', 'spurs', 'mavericks', 'rockets', 'grizzlies', 'pelicans',
    // MLB
    'yankees', 'red sox', 'blue jays', 'orioles', 'rays', 'white sox', 'guardians',
    'tigers', 'royals', 'twins', 'astros', 'angels', 'athletics', 'mariners', 'rangers',
    'braves', 'marlins', 'mets', 'phillies', 'nationals', 'cubs', 'reds', 'brewers',
    'pirates', 'cardinals', 'diamondbacks', 'rockies', 'dodgers', 'padres', 'giants',
    // Soccer - Premier League
    'arsenal', 'aston villa', 'bournemouth', 'brentford', 'brighton', 'chelsea',
    'crystal palace', 'everton', 'fulham', 'ipswich', 'leicester', 'liverpool',
    'manchester united', 'manchester city', 'man utd', 'man city', 'newcastle',
    'nottingham forest', 'southampton', 'tottenham', 'spurs', 'west ham', 'wolves',
    // Soccer - Other major clubs
    'real madrid', 'barcelona', 'atletico madrid', 'sevilla', 'valencia',
    'bayern munich', 'borussia dortmund', 'dortmund', 'rb leipzig', 'leverkusen',
    'juventus', 'inter milan', 'ac milan', 'napoli', 'roma', 'lazio',
    'psg', 'paris saint-germain', 'marseille', 'lyon', 'monaco',
    'ajax', 'psv', 'feyenoord', 'benfica', 'porto', 'sporting',
    'galatasaray', 'fenerbahce', 'besiktas',
    // NHL
    'bruins', 'sabres', 'red wings', 'panthers', 'canadiens', 'senators', 'lightning',
    'maple leafs', 'hurricanes', 'blue jackets', 'devils', 'islanders', 'rangers',
    'flyers', 'penguins', 'capitals', 'blackhawks', 'avalanche', 'stars', 'wild',
    'predators', 'blues', 'jets', 'flames', 'oilers', 'canucks', 'kraken', 'sharks', 'golden knights',
  ];

  const SPORTS_TERMS = [
    // Betting terms
    'spread:', 'spread -', 'spread +', 'o/u ', 'over/under', 'moneyline',
    'point spread', 'handicap', 'parlay', 'prop bet',
    // Game/match terms
    'touchdown', 'field goal', 'home run', 'three-pointer', '3-pointer',
    'goal scorer', 'first scorer', 'last scorer', 'hat trick', 'clean sheet',
    'win game', 'win match', 'beat the', ' vs ', ' vs.', ' v ',
    'playoff', 'postseason', 'regular season', 'preseason',
    'super bowl', 'world series', 'stanley cup', 'nba finals', 'mlb playoffs',
    'grand slam', 'wimbledon', 'us open', 'australian open', 'french open', 'roland garros',
    'the masters', 'pga championship', 'the open', 'ryder cup',
    'ballon d\'or', 'ballon dor', 'golden boot', 'golden glove',
    // Fight terms
    'boxing', 'mma', 'fight night', 'knockout', 'ko\'d', 'tko',
    'title fight', 'heavyweight', 'lightweight', 'middleweight', 'welterweight',
    // Racing
    'pole position', 'fastest lap', 'podium finish', 'race winner',
    'daytona', 'monaco grand prix', 'silverstone', 'spa',
    // Draft/player movement
    'draft pick', 'first overall', 'nfl draft', 'nba draft',
    'free agent', 'trade deadline', 'transfer window', 'loan deal',
    // Specific patterns
    'win on 2026-', 'win on 2025-', 'win on 2024-', // Daily game bets
    'advance to', 'eliminated', 'clinch', 'seeding',
    'mvp', 'rookie of the year', 'dpoy', 'cy young', 'heisman',
  ];

  // Additional patterns to catch
  const SPORTS_PATTERNS = [
    /\bfc\s+\w+/i,          // FC Bayern, FC Barcelona
    /\b\w+\s+fc\b/i,        // Liverpool FC
    /\bvs\.?\s/i,           // vs or vs.
    /\(-?\d+\.?\d*\)/,      // Spread notation like (-7.5) or (+3)
    /o\/u\s*\d+/i,          // O/U 48.5
    /\bwin\s+on\s+\d{4}-\d{2}-\d{2}/i, // "win on 2026-01-14" (daily bets)
  ];

  return markets.filter(market => {
    const volume24hr = parseFloat(market.volume24hr || '0');
    const totalVolume = parseFloat(market.volume || '0');

    // Must have meaningful volume
    if (volume24hr < FETCH_CONFIG.MIN_VOLUME_24H && totalVolume < FETCH_CONFIG.MIN_TOTAL_VOLUME) {
      return false;
    }

    const q = market.question.toLowerCase();
    const text = `${market.question} ${market.description || ''}`.toLowerCase();

    // Check leagues
    if (SPORTS_LEAGUES.some(league => text.includes(league))) {
      return false;
    }

    // Check teams
    if (SPORTS_TEAMS.some(team => q.includes(team))) {
      return false;
    }

    // Check sports terms
    if (SPORTS_TERMS.some(term => text.includes(term))) {
      return false;
    }

    // Check patterns
    if (SPORTS_PATTERNS.some(pattern => pattern.test(market.question))) {
      return false;
    }

    return true;
  });
}

/**
 * Stage 2: Quick scoring - PURE NEWSWORTHINESS
 *
 * No category bias. No entity boosts. Stories compete on merit.
 *
 * What makes something newsworthy:
 * 1. MAGNITUDE - How much money is at stake? (volume/liquidity)
 * 2. DRAMA - Is it contested? (40-60% odds)
 * 3. MOVEMENT - Is something happening? (price changes)
 * 4. STAKES - How much total money committed? (total volume)
 */
function stage2QuickScore(markets: PolymarketMarket[], maxVolume: number): Array<{market: PolymarketMarket, quickScore: number, category: MarketCategory}> {
  const maxLiquidity = Math.max(...markets.map(m => parseFloat(m.liquidity || '0')));
  const maxTotalVolume = Math.max(...markets.map(m => parseFloat(m.volume || '0')));

  return markets.map(market => {
    const volume24hr = parseFloat(market.volume24hr || '0');
    const totalVolume = parseFloat(market.volume || '0');
    const liquidity = parseFloat(market.liquidity || '0');

    let outcomePricesArray: string[];
    try {
      outcomePricesArray = JSON.parse(market.outcomePrices || '[]');
    } catch {
      outcomePricesArray = [];
    }

    const yesPrice = parseFloat(outcomePricesArray[0] || '0');
    const category = categorizeMarket(market.question, market.description || '');

    // 1. MAGNITUDE: Recent trading activity (log-scaled)
    const recentActivity = maxVolume > 0 ? Math.log10(volume24hr + 1) / Math.log10(maxVolume + 1) : 0;

    // 2. DRAMA: Contested odds are more interesting than decided ones
    // Peak at 50%, drops off towards 0% or 100%
    const distanceFrom50 = Math.abs(yesPrice - 0.5);
    const drama = Math.max(0.1, 1 - (distanceFrom50 * 2));

    // 3. CREDIBILITY: Markets with more liquidity have more reliable signals
    const credibility = maxLiquidity > 0 ? Math.log10(liquidity + 1) / Math.log10(maxLiquidity + 1) : 0;

    // 4. STAKES: Total money committed shows importance
    const stakes = maxTotalVolume > 0 ? Math.log10(totalVolume + 1) / Math.log10(maxTotalVolume + 1) : 0;

    // PURE NEWSWORTHINESS SCORE - no category bias
    const quickScore = (
      recentActivity * 0.30 +  // What's trading now
      drama * 0.30 +           // Contested = interesting
      credibility * 0.20 +     // Reliable signal
      stakes * 0.20            // Total importance
    );

    return { market, quickScore, category };
  }).sort((a, b) => b.quickScore - a.quickScore);
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
  const CACHE_KEY = 'market_cache_latest_v2'; // New cache key for new format
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

  // ============================================
  // NEW: Full market fetching pipeline
  // ============================================

  console.log('Starting full Polymarket fetch...');
  const startTime = Date.now();

  // Step 1: Fetch ALL events from Polymarket (paginated)
  const allEvents = await fetchAllEvents();
  console.log(`Step 1: Fetched ${allEvents.length} events in ${Date.now() - startTime}ms`);

  // Step 2: Extract ALL markets from events (not just first one)
  const allMarkets = extractAllMarkets(allEvents);
  console.log(`Step 2: Extracted ${allMarkets.length} total markets`);

  // Step 3: Stage 1 fast filter (no API calls) - remove low volume + sports
  const stage1Markets = stage1FastFilter(allMarkets);
  console.log(`Step 3: Stage 1 filter: ${allMarkets.length} → ${stage1Markets.length} markets`);

  // Step 4: Quick scoring for ranking (no price history yet)
  const maxVolume = Math.max(...stage1Markets.map(m => parseFloat(m.volume24hr || '0')));
  const quickScored = stage2QuickScore(stage1Markets, maxVolume);

  // Step 5: Take top N for full processing (price history is expensive)
  const topCandidates = quickScored.slice(0, FETCH_CONFIG.TOP_N_FOR_SCORING);
  console.log(`Step 4-5: Quick scored and selected top ${topCandidates.length} candidates`);

  // Step 6: Fetch price history ONLY for top candidates (in parallel batches)
  const marketsForPriceHistory = topCandidates.slice(0, FETCH_CONFIG.TOP_N_FOR_PRICE_HISTORY);
  console.log(`Step 6: Fetching price history for top ${marketsForPriceHistory.length} markets...`);

  const priceHistoryStart = Date.now();
  const priceChanges = await Promise.all(
    marketsForPriceHistory.map(({ market }) => fetchPriceHistory(market.conditionId))
  );
  console.log(`Price history fetched in ${Date.now() - priceHistoryStart}ms`);

  // Create a map for quick price history lookup
  const priceChangeMap = new Map<string, number | null>();
  marketsForPriceHistory.forEach(({ market }, index) => {
    priceChangeMap.set(market.conditionId, priceChanges[index]);
  });

  // Step 7: Full scoring with all data
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

  for (const { market, category } of topCandidates) {
    if (!market.outcomePrices || !market.outcomes) continue;

    let outcomePricesArray: string[];
    let outcomesArray: string[];

    try {
      outcomePricesArray = JSON.parse(market.outcomePrices);
      outcomesArray = JSON.parse(market.outcomes);
    } catch (e) {
      continue;
    }

    const yesPrice = parseFloat(outcomePricesArray[0] || '0');
    const noPrice = parseFloat(outcomePricesArray[1] || '0');
    const volume24hr = parseFloat(market.volume24hr || '0');
    const totalVolume = parseFloat(market.volume || '0');
    const liquidity = parseFloat(market.liquidity || '0');

    // Skip sports that slipped through
    if (isShortTermSportsBet(market.question, category)) {
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

  // Step 8: Complete scoring with price history
  // PURE NEWSWORTHINESS - no category bias, no entity boosts
  const maxLiquidity = Math.max(...preProcessed.map(m => m.liquidity));
  const maxTotalVolume = Math.max(...preProcessed.map(m => m.totalVolume));

  const processedMarkets: Market[] = preProcessed.map((market) => {
    const priceChange24h = priceChangeMap.get(market.raw.conditionId) ?? null;

    // Core metrics (kept for backward compat)
    const money = normalizeVolume(market.volume24hr, maxVolume);
    const certainty = calculateCertainty(market.yesPrice);
    const speed = calculateSpeed(priceChange24h);
    const interest = 1.0; // No category bias

    const timeHorizon = classifyTimeHorizon(market.raw.endDate || null);
    const marketStatus = determineMarketStatus(market.yesPrice, priceChange24h);

    // NEWSWORTHINESS COMPONENTS:
    // 1. Activity - what's trading now
    const activity = money;

    // 2. Drama - contested odds are more interesting
    const distanceFrom50 = Math.abs(market.yesPrice - 0.5);
    const drama = Math.max(0.1, 1 - (distanceFrom50 * 2));

    // 3. Movement - price changes indicate news
    const movement = speed;

    // 4. Credibility - liquidity = reliable signal
    const credibility = maxLiquidity > 0 ? Math.log10(market.liquidity + 1) / Math.log10(maxLiquidity + 1) : 0;

    // 5. Stakes - total volume = importance
    const stakes = maxTotalVolume > 0 ? Math.log10(market.totalVolume + 1) / Math.log10(maxTotalVolume + 1) : 0;

    // FINAL SCORE: Pure newsworthiness, no bias
    const total = (
      activity * 0.20 +    // Recent trading
      drama * 0.25 +       // Contested odds
      movement * 0.25 +    // Price movement (news signal)
      credibility * 0.15 + // Reliable signal
      stakes * 0.15        // Total importance
    );

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

  // Step 9: Sort by final score
  processedMarkets.sort((a, b) => b.scores.total - a.scores.total);

  // Step 10: Market grouping
  const groups = groupMarkets(processedMarkets);

  const totalTime = Date.now() - startTime;
  console.log(`\n=== FULL PIPELINE COMPLETE ===`);
  console.log(`Total events: ${allEvents.length}`);
  console.log(`Total markets extracted: ${allMarkets.length}`);
  console.log(`After stage 1 filter: ${stage1Markets.length}`);
  console.log(`Final processed: ${processedMarkets.length}`);
  console.log(`Groups: ${groups.length}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`==============================\n`);

  const result: MarketsResult = {
    markets: processedMarkets,
    groups: groups,
    timestamp: new Date().toISOString(),
    stats: {
      totalFetched: allMarkets.length,
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
