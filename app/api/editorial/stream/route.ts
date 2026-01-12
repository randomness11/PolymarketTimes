import { NextRequest } from 'next/server';
import { EditorialDirectorAgent } from '../editorial-director-agent';
import { HeadlineWriterAgent } from '../headline-agent';
import { ArticleWriterAgent, generateDateline } from '../article-agent';
import { ContrarianAgent } from '../contrarian-agent';
import { Market, MarketGroup, Story, Headlines, Datelines, ArticleContent } from '../../../types';

export const runtime = 'edge'; // Use edge runtime for streaming
export const dynamic = 'force-dynamic';

/**
 * Streaming Editorial Endpoint (Simplified 3-Agent Architecture)
 *
 * Returns a Server-Sent Events stream that progressively delivers:
 * 1. Blueprint (story selection + layouts + datelines)
 * 2. Headlines (as batches complete)
 * 3. Articles (as batches complete)
 *
 * UX: Front page skeleton loads immediately, stories fade in as generated.
 *
 * Removed agents: DatelineAgent (use keyword-based), ContrarianAgent,
 * ChiefEditorAgent, IntelligenceAgent
 */
export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: unknown) => {
                const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            const sendError = (error: string) => {
                sendEvent('error', { error });
            };

            try {
                const { markets, groups = [] } = await request.json() as {
                    markets: Market[];
                    groups?: MarketGroup[];
                };

                if (!markets || markets.length < 1) {
                    sendError('No markets available');
                    controller.close();
                    return;
                }

                const apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) {
                    sendError('GEMINI_API_KEY not configured');
                    controller.close();
                    return;
                }

                // Send initial status
                sendEvent('status', { phase: 'starting', message: 'Starting editorial generation...' });

                // 1. EDITORIAL DIRECTOR: Get blueprint (must complete first)
                sendEvent('status', { phase: 'selection', message: 'Editorial Director selecting stories...' });
                const editorialDirector = new EditorialDirectorAgent(apiKey);
                const { blueprint, reasoning } = await editorialDirector.call({
                    markets,
                    recentlyCovered: []
                });

                // Send blueprint immediately so UI can render skeleton
                sendEvent('blueprint', {
                    stories: blueprint.stories.map(s => ({
                        id: s.id,
                        question: s.question,
                        layout: s.layout,
                        category: s.category,
                        yesPrice: s.yesPrice,
                        noPrice: s.noPrice,
                        volume24hr: s.volume24hr,
                        priceChange24h: s.priceChange24h,
                        image: s.image,
                    })),
                    reasoning
                });

                // 2. GENERATE DATELINES (deterministic, instant)
                const datelines: Datelines = {};
                for (const story of blueprint.stories) {
                    datelines[story.id] = generateDateline(story);
                }

                // 3. PARALLEL GENERATION: Headlines + Articles
                sendEvent('status', { phase: 'generation', message: 'Generating headlines and articles...' });

                const headlines: Headlines = {};
                const content: ArticleContent = {};

                // Create agents
                const headlineAgent = new HeadlineWriterAgent(apiKey);
                const articleAgent = new ArticleWriterAgent(apiKey);

                // Run headline generation (articles will run after)
                const headlineResult = await headlineAgent.call({ blueprint });
                Object.entries(headlineResult.headlines).forEach(([id, headline]) => {
                    headlines[id] = headline;
                });
                sendEvent('headlines', { headlines: headlineResult.headlines });

                // Now generate articles (needs headlines and datelines)
                sendEvent('status', { phase: 'articles', message: 'Writing articles...' });

                // Build group lookup
                const groupByMarketId = new Map<string, MarketGroup>();
                for (const group of groups) {
                    groupByMarketId.set(group.primaryMarketId, group);
                    for (const relatedId of group.relatedMarketIds) {
                        groupByMarketId.set(relatedId, group);
                    }
                }

                const articleResult = await articleAgent.call({
                    blueprint,
                    headlines,
                    datelines,
                    groupByMarketId,
                });

                // Stream articles
                Object.entries(articleResult.content).forEach(([id, article]) => {
                    content[id] = article;
                });
                sendEvent('articles', { content: articleResult.content });

                // 4. CONTRARIAN AGENT (Alpha Signals)
                sendEvent('status', { phase: 'alpha', message: 'Generating alpha signals...' });
                const contrarianAgent = new ContrarianAgent(apiKey);
                const { takes: contrarianTakes } = await contrarianAgent.call({
                    blueprint,
                    headlines,
                    featuredOnly: true
                });
                sendEvent('contrarian', { takes: contrarianTakes });

                // 5. COMPLETE
                sendEvent('complete', {
                    timestamp: new Date().toISOString(),
                    stats: {
                        totalStories: blueprint.stories.length,
                        headlines: Object.keys(headlines).length,
                        articles: Object.keys(content).length,
                        alphaSignals: Object.keys(contrarianTakes).length,
                    }
                });

                controller.close();

            } catch (error) {
                console.error('Streaming editorial error:', error);
                sendError(error instanceof Error ? error.message : 'Unknown error');
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

/**
 * GET endpoint for testing/health check
 */
export async function GET() {
    return new Response(JSON.stringify({
        status: 'ok',
        endpoint: 'editorial/stream',
        description: 'POST with { markets, groups } to start streaming editorial generation',
        events: ['status', 'blueprint', 'headlines', 'articles', 'contrarian', 'complete', 'error'],
        architecture: '4-agent system: EditorialDirector → HeadlineWriter → ArticleWriter → Contrarian (Alpha)'
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
