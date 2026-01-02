import { NextResponse } from 'next/server';
import { groupMarkets } from '../lib/market-grouping';
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
  // Fetch FEATURED events
  const response = await fetch(
    'https://gamma-api.polymarket.com/events?limit=300&closed=false',
    { next: { revalidate: 3600 } }
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

    const category = categorizeMarket(market.question, market.description || '');

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

  // Phase 3: Complete scoring with fetched data
  const processedMarkets: Market[] = preProcessed.map((market, index) => {
    const priceChange24h = priceChanges[index];

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

  processedMarkets.sort((a, b) => b.scores.total - a.scores.total);

  // Group related markets
  const groups = groupMarkets(processedMarkets);

  console.log(`Markets API: Fetched ${rawMarkets.length} raw, ${processedMarkets.length} after filter.`);

  return {
    markets: processedMarkets,
    groups: groups.map(g => ({
      topic: g.topic,
      primaryMarketId: g.primaryMarket.id,
      relatedMarketIds: g.relatedMarkets.map(m => m.id),
      allOutcomes: g.allOutcomes,
      combinedVolume: g.combinedVolume,
      isMultiOutcome: g.isMultiOutcome,
    })),
    timestamp: new Date().toISOString(),
    stats: {
      totalFetched: rawMarkets.length,
      afterFiltering: processedMarkets.length,
      groupCount: groups.length,
    },
  };
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
