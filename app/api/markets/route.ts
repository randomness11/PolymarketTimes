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
  isShortTermSportsBet
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

export async function getMarkets(): Promise<MarketsResult> {
  const supabase = getSupabase();
  const CACHE_KEY = 'market_cache_latest';
  const CACHE_DURATION_MS = 3600 * 1000; // 1 hour

  // 1. Try to get from Supabase Cache
  if (supabase) {
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

  // Phase 3A: AI-POWERED CATEGORIZATION (AGENTIC) - Replace keyword matching
  const useAICategorization = process.env.USE_AI_CATEGORIZATION === 'true';

  if (useAICategorization && process.env.GEMINI_API_KEY) {
    try {
      console.log('Using AI-powered category classification...');
      const { CategoryClassificationAgent } = await import('../editorial/category-agent');
      const categoryAgent = new CategoryClassificationAgent(process.env.GEMINI_API_KEY);

      const marketsForCategorization = preProcessed.map(m => ({
        id: m.raw.conditionId,
        question: m.raw.question,
        description: m.raw.description || ''
      }));

      const { categories } = await categoryAgent.call({ markets: marketsForCategorization });

      // Update categories in preprocessed data
      for (const market of preProcessed) {
        const aiCategory = categories.get(market.raw.conditionId);
        if (aiCategory) {
          market.category = aiCategory;
        } else {
          // Fallback to keyword-based
          market.category = categorizeMarket(market.raw.question, market.raw.description || '');
        }
      }

      console.log('AI categorization complete.');
    } catch (error) {
      console.error('AI categorization failed, using keyword fallback:', error);
      // Fallback to keyword-based for all
      for (const market of preProcessed) {
        market.category = categorizeMarket(market.raw.question, market.raw.description || '');
      }
    }
  } else {
    // Use keyword-based categorization
    for (const market of preProcessed) {
      market.category = categorizeMarket(market.raw.question, market.raw.description || '');
    }
  }

  // Phase 3B: Complete scoring with fetched data (ALGORITHMIC FALLBACK)
  const processedMarkets: Market[] = preProcessed.map((market, index) => {
    const priceChange24h = priceChanges[index];

    // Fallback algorithmic scoring (used if AI scoring is disabled or fails)
    const money = normalizeVolume(market.volume24hr, maxVolume);
    const certainty = calculateCertainty(market.yesPrice);
    const speed = calculateSpeed(priceChange24h);
    const interest = CATEGORY_INTEREST[market.category];

    const total = (money * 0.35 + certainty * 0.35 + speed * 0.30) * interest;

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
      marketStatus,
    };
  });

  // Phase 4: AI-POWERED SCORING (AGENTIC) - Optionally override algorithmic scores
  const useAIScoring = process.env.USE_AI_SCORING === 'true';

  if (useAIScoring && process.env.GEMINI_API_KEY) {
    try {
      console.log('Using AI-powered market scoring...');
      const { MarketScoringAgent } = await import('../editorial/market-scoring-agent');
      const scoringAgent = new MarketScoringAgent(process.env.GEMINI_API_KEY);
      const { scores } = await scoringAgent.call({ markets: processedMarkets });

      // Override scores with AI evaluation
      for (const market of processedMarkets) {
        const aiScore = scores.get(market.id);
        if (aiScore) {
          market.scores = {
            money: aiScore.newsworthiness,
            certainty: aiScore.urgency,
            speed: aiScore.impact,
            interest: 1.0, // AI already factors this in
            total: aiScore.total,
          };
        }
      }

      console.log('AI scoring complete. Markets re-ranked.');
    } catch (error) {
      console.error('AI scoring failed, using algorithmic fallback:', error);
    }
  }

  processedMarkets.sort((a, b) => b.scores.total - a.scores.total);

  // Phase 5: AI-POWERED MARKET GROUPING (AGENTIC) - Replace regex-based grouping
  const useAIGrouping = process.env.USE_AI_GROUPING === 'true';
  let groups: any[] = [];

  if (useAIGrouping && process.env.GEMINI_API_KEY) {
    try {
      console.log('Using AI-powered market grouping...');
      const { MarketGroupingAgent } = await import('../editorial/grouping-agent');
      const groupingAgent = new MarketGroupingAgent(process.env.GEMINI_API_KEY);

      const { groups: aiGroups } = await groupingAgent.call({ markets: processedMarkets });
      groups = aiGroups;

      console.log(`AI grouping complete: ${groups.length} groups created.`);
    } catch (error) {
      console.error('AI grouping failed, using algorithmic fallback:', error);
      groups = groupMarkets(processedMarkets);
    }
  } else {
    // Use algorithmic grouping
    groups = groupMarkets(processedMarkets);
  }

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

export async function GET() {
  try {
    const data = await getMarkets();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in markets API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
