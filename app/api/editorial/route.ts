import { NextResponse } from 'next/server';
import { recordMarketsShown } from '../lib/market-history';
import { EditorialDirectorAgent } from './editorial-director-agent';
import { HeadlineWriterAgent } from './headline-agent';
import { ArticleWriterAgent, generateDateline } from './article-agent';
import { ContrarianAgent } from './contrarian-agent';
import { IntelligenceAgent, identifyMovingMarkets } from './intelligence-agent';
import { getSupabase, EditionInsert } from '../lib/supabase';
import { EditorialData, Market, MarketGroup, Datelines, FrontPageBlueprint } from '../../types';

export const revalidate = 0; // Disable Vercel cache since we manage it via Supabase

export async function getEditorial(markets: Market[], groups: MarketGroup[] = [], forceRefresh = false): Promise<EditorialData | { error: string }> {
  if (!markets || markets.length < 1) {
    return { error: 'No markets available' };
  }

  // 1. CHECK CACHE (Supabase "Editions")
  const supabase = getSupabase();
  const today = new Date();

  // Cache Keys: 1-Hour Block (YYYY-MM-DDTHH) and Daily baseline
  // Every hour gets a fresh edition for maximum freshness
  const currentHour = today.getHours();
  const blockDate = new Date(today);
  blockDate.setHours(currentHour, 0, 0, 0);

  // Format: YYYY-MM-DDTHH (e.g., 2025-01-14T08)
  const editionKey = blockDate.toISOString().slice(0, 13);
  const dailyKey = today.toISOString().slice(0, 10);  // e.g., "2025-12-22"

  const isDev = process.env.NODE_ENV === 'development';

  if (supabase && !forceRefresh && !isDev) {
    // Try hourly edition first (most fresh)
    const { data: hourlyEdition } = await supabase
      .from('editions')
      .select('data')
      .eq('date_str', editionKey)
      .single();

    if (hourlyEdition?.data) {
      console.log(`CACHE HIT (hourly): Returning edition for ${editionKey}`);
      return hourlyEdition.data as EditorialData;
    }

    // Fallback to daily baseline
    const { data: dailyEdition } = await supabase
      .from('editions')
      .select('data')
      .eq('date_str', dailyKey)
      .single();

    if (dailyEdition?.data) {
      console.log(`CACHE HIT (daily baseline): Returning edition for ${dailyKey}`);
      // Note: We'll still generate a fresh hourly edition below and save it
      // But we return the daily baseline immediately for fast UX
      // The hourly edition will be saved for subsequent users
    }

    console.log(`CACHE MISS: Generating fresh edition for ${editionKey}`);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  const apiKey = process.env.GEMINI_API_KEY;

  console.log(`Editorial: received ${markets.length} markets`);

  // Create lookup for group info by market ID
  const groupByMarketId = new Map<string, MarketGroup>();
  for (const group of groups) {
    groupByMarketId.set(group.primaryMarketId, group);
    for (const relatedId of group.relatedMarketIds) {
      groupByMarketId.set(relatedId, group);
    }
  }

  // === MULTI-AGENT ORCHESTRATION (Parallel Execution) ===

  // Helper: Generate all datelines (deterministic, instant)
  function generateAllDatelines(blueprint: FrontPageBlueprint): Datelines {
    const datelines: Datelines = {};
    for (const story of blueprint.stories) {
      datelines[story.id] = generateDateline(story);
    }
    return datelines;
  }

  // Prepare moving markets BEFORE Phase 2 (needed for Intelligence agent)
  const priceHistory = markets.reduce((acc, m) => {
    const oldPrice = m.yesPrice - (m.priceChange24h || 0) / 100;
    acc[m.id] = oldPrice;
    return acc;
  }, {} as Record<string, number>);
  const movingMarkets = identifyMovingMarkets(markets, priceHistory, 5);

  // PHASE 1: Editorial Director (must run first to produce blueprint)
  console.log('=== PHASE 1: EDITORIAL DIRECTOR AGENT ===');
  console.time('Phase 1: Editorial Director');
  const editorialDirectorAgent = new EditorialDirectorAgent(apiKey);
  const { blueprint, reasoning } = await editorialDirectorAgent.call({ markets });
  console.timeEnd('Phase 1: Editorial Director');
  console.log(`Editorial Director reasoning: ${reasoning}`);

  // PHASE 2: Run in parallel (all depend only on blueprint or original markets)
  console.log('=== PHASE 2: DATELINES + HEADLINES + INTELLIGENCE (parallel) ===');
  console.time('Phase 2: Parallel agents');
  const [
    datelines,
    { headlines },
    { briefs: intelligenceBriefs }
  ] = await Promise.all([
    // Datelines (instant, deterministic)
    Promise.resolve(generateAllDatelines(blueprint)),
    // Headlines (depends on blueprint)
    new HeadlineWriterAgent(apiKey).call({ blueprint }),
    // Intelligence (uses original markets, not blueprint)
    new IntelligenceAgent(apiKey).call({ movingMarkets })
  ]);
  console.timeEnd('Phase 2: Parallel agents');
  console.log(`Intelligence Agent: Generated ${Object.keys(intelligenceBriefs).length} intelligence briefs`);

  // PHASE 3: Run in parallel (both need headlines from Phase 2)
  console.log('=== PHASE 3: ARTICLES + CONTRARIAN (parallel) ===');
  console.time('Phase 3: Parallel agents');
  const [
    { content, editorialNote },
    { takes: contrarianTakes }
  ] = await Promise.all([
    // Articles (needs blueprint, headlines, datelines)
    new ArticleWriterAgent(apiKey).call({
      blueprint,
      headlines,
      datelines,
      groupByMarketId,
    }),
    // Contrarian (needs blueprint, headlines)
    new ContrarianAgent(apiKey).call({
      blueprint,
      headlines,
      featuredOnly: true
    })
  ]);
  console.timeEnd('Phase 3: Parallel agents');
  console.log(`Contrarian Agent: Generated ${Object.keys(contrarianTakes).length} alpha signals`);

  // Construct final response
  const response: EditorialData = {
    blueprint,
    content,
    headlines,
    datelines,
    contrarianTakes,
    intelligenceBriefs,
    curatorReasoning: reasoning,
    editorNotes: editorialNote || '',
    timestamp: new Date().toISOString(),
  };

  // 5. SAVE TO DB (Cache) - Skip in development to avoid stale data
  if (supabase && !isDev) {
    const insertData = {
      date_str: editionKey,
      data: response,
      created_at: new Date().toISOString()
    } satisfies EditionInsert;

    const { error } = await supabase
      .from('editions')
      .upsert(insertData, { onConflict: 'date_str' }); // Ensure we just update if it raced

    if (error) {
      console.error('Failed to save edition to DB:', error);
    } else {
      console.log(`Successfully saved hourly edition for ${editionKey}`);
    }
  } else if (isDev) {
    console.log('DEV MODE: Skipping cache save');
  }

  // Record shown history (background)
  // Use batched recording to prevent connection timeouts/stack overflows
  const shownMarkets = blueprint.stories.map(m => ({
    id: m.id,
    question: m.question,
    currentOdds: m.yesPrice
  }));

  // Fire and forget, but catch errors
  recordMarketsShown(shownMarkets)
    .catch(err => console.error('History record error:', err));

  return response;
}

export async function POST(request: Request) {
  try {
    const { markets, groups = [] } = await request.json() as {
      markets: Market[];
      groups?: MarketGroup[];
    };

    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('force') === 'true';

    const result = await getEditorial(markets, groups, forceRefresh);

    if ('error' in result) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error generating editorial:', error);
    return NextResponse.json({ error: 'Failed to generate editorial' }, { status: 500 });
  }
}
