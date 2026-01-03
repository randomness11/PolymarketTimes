import { NextResponse } from 'next/server';
import { recordMarketsShown } from '../lib/market-history';
import { CuratorAgent } from './curator-agent';
import { HeadlineWriterAgent } from './headline-agent';
import { ArticleWriterAgent, generateDateline } from './article-agent';
import { ChiefEditorAgent } from './chief-editor-agent';
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

  // Cache Keys: 4-Hour Block (YYYY-MM-DDTHH) and Daily baseline
  // Calculate 4-hour block timestamp for the cache key
  const currentHour = today.getHours();
  const blockStartHour = Math.floor(currentHour / 4) * 4;
  const blockDate = new Date(today);
  blockDate.setHours(blockStartHour, 0, 0, 0);

  // Format: YYYY-MM-DDTHH (where HH is 00, 04, 08, 12, 16, 20)
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

  // === MULTI-AGENT ORCHESTRATION ===

  // 1. CURATOR AGENT: Select 25 stories
  console.log('=== CURATOR AGENT ===');
  const curatorAgent = new CuratorAgent(apiKey);
  const { blueprint, reasoning } = await curatorAgent.call({ markets, groups });
  console.log(`Curator reasoning: ${reasoning}`);

  // 2. Generate datelines (algorithmic, location-based)
  const datelines: Datelines = {};
  for (const story of blueprint.stories) {
    datelines[story.id] = generateDateline(story);
  }

  // 3. HEADLINE WRITER AGENT: Generate punchy headlines
  const headlineAgent = new HeadlineWriterAgent(apiKey);
  const { headlines } = await headlineAgent.call({ blueprint });

  // 4. ARTICLE WRITER AGENT: Write the articles
  const articleAgent = new ArticleWriterAgent(apiKey);
  const { content, editorialNote } = await articleAgent.call({
    blueprint,
    headlines,
    datelines,
    groupByMarketId,
  });

  // 5. EDITOR-IN-CHIEF AGENT: Review and Polish
  console.log('=== CHIEF EDITOR AGENT ===');
  const editorAgent = new ChiefEditorAgent(apiKey);
  const { reviewedContent, notes } = await editorAgent.call({
    blueprint,
    content,
  });
  const finalContent = reviewedContent;
  console.log(`Chief Editor notes: ${notes}`);

  // Construct final response
  const response: EditorialData = {
    blueprint,
    content: finalContent,
    headlines,
    datelines,
    curatorReasoning: reasoning,
    editorNotes: notes,
    timestamp: new Date().toISOString(),
  };

  // 6. SAVE TO DB (Cache) - Skip in development to avoid stale data
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
