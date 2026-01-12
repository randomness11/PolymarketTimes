import { Market } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface IntelligenceInput {
    /** Markets with significant price movements */
    movingMarkets: Array<{
        market: Market;
        priceChange: number; // percentage points change
        oldPrice: number;
        newPrice: number;
    }>;
    /** Optional: Recent news context from web search */
    newsContext?: Record<string, string>;
}

export interface IntelligenceBrief {
    marketId: string;
    catalyst: string;        // What news event likely caused this
    credibility: 'HIGH' | 'MEDIUM' | 'LOW'; // Is the move justified?
    analysis: string;        // 100-word intelligence brief
    nextMove: string;        // What would cause this to move further
    tradingImplication: string; // One-line actionable insight
    // NEW: Future-focused fields
    pathToResolution?: string;  // What needs to happen for YES/NO to win
    keyMilestones?: string;     // Upcoming events/dates to watch
    timeHorizon?: 'IMMINENT' | 'NEAR_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
}

export interface IntelligenceOutput {
    briefs: Record<string, IntelligenceBrief>;
    summary: string;
}

/**
 * Intelligence Agent - "Why Is This Moving?"
 *
 * THE KILLER FEATURE. This agent:
 * - Identifies catalysts for significant price movements
 * - Assesses whether moves are justified or overreactions
 * - Provides actionable intelligence briefs
 * - Predicts what would cause further movement
 *
 * This transforms Polymarket Times from "RSS feed" to "intelligence platform"
 */
export class IntelligenceAgent implements Agent<IntelligenceInput, IntelligenceOutput> {
    constructor(private apiKey: string) { }

    async call(input: IntelligenceInput): Promise<IntelligenceOutput> {
        const { movingMarkets, newsContext = {} } = input;

        if (movingMarkets.length === 0) {
            return {
                briefs: {},
                summary: 'No significant market movements detected.'
            };
        }

        console.log(`Intelligence Agent: Analyzing ${movingMarkets.length} moving markets...`);

        const client = createAIClient(this.apiKey);
        const BATCH_SIZE = 5;
        const batches: typeof movingMarkets[] = [];

        for (let i = 0; i < movingMarkets.length; i += BATCH_SIZE) {
            batches.push(movingMarkets.slice(i, i + BATCH_SIZE));
        }

        const allBriefs: Record<string, IntelligenceBrief> = {};

        await Promise.all(batches.map(async (batch, batchIdx) => {
            await new Promise(resolve => setTimeout(resolve, batchIdx * 150));

            const marketsInput = batch.map((item, idx) => {
                const { market, priceChange, oldPrice, newPrice } = item;
                const direction = priceChange > 0 ? 'UP' : 'DOWN';
                const magnitude = Math.abs(priceChange);

                const vol = market.volume24hr >= 1e6
                    ? `$${(market.volume24hr / 1e6).toFixed(1)}M`
                    : `$${(market.volume24hr / 1e3).toFixed(0)}K`;

                const newsHint = newsContext[market.id]
                    ? `\nRECENT NEWS: ${newsContext[market.id].substring(0, 500)}`
                    : '';

                return `═══════════════════════════════════════════════════════════
[${idx}] MARKET: "${market.question}"
ID: ${market.id}
CATEGORY: ${market.category}
MOVEMENT: ${direction} ${magnitude.toFixed(1)}pp (${(oldPrice * 100).toFixed(0)}% → ${(newPrice * 100).toFixed(0)}%)
VOLUME: ${vol}
DESCRIPTION: ${(market.description || '').substring(0, 300)}${newsHint}
═══════════════════════════════════════════════════════════`;
            }).join('\n\n');

            const prompt = `You are an intelligence analyst at "The Polymarket Times" — serving tech Twitter and Polymarket traders.

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

Your job: Explain WHY these prediction markets are moving AND what needs to happen next.

This is the most valuable analysis you can provide. Traders see the WHAT (price change).
You explain the WHY (catalyst) and the PATH FORWARD (what needs to happen for resolution).

For future markets (30+ days out), focus heavily on the PATH TO RESOLUTION — what milestones, announcements, or events would move these markets.

═══════════════════════════════════════════════════════════
MARKETS WITH SIGNIFICANT MOVEMENT:
═══════════════════════════════════════════════════════════
${marketsInput}

═══════════════════════════════════════════════════════════
FOR EACH MARKET, PROVIDE:
═══════════════════════════════════════════════════════════

1. **CATALYST** (1 sentence)
   What news event, announcement, or development likely caused this move?
   - Be specific: names, dates, events
   - If uncertain, state your best hypothesis
   - Example: "OpenAI's GPT-5 preview demo at DevDay shifted expectations."

2. **CREDIBILITY** (HIGH / MEDIUM / LOW)
   Is this move justified by fundamentals, or an overreaction?
   - HIGH: Clear catalyst, justified magnitude
   - MEDIUM: Reasonable but possibly exaggerated
   - LOW: Likely noise, no clear catalyst, possible manipulation

3. **ANALYSIS** (100 words max)
   Intelligence brief explaining:
   - What happened and why it matters
   - Who the key players are
   - What's at stake
   - Tone: Matt Levine meets intelligence briefing. Sharp, informed, slightly wry.

4. **PATH_TO_RESOLUTION** (2-3 sentences) — CRITICAL FOR FUTURE MARKETS
   What specifically needs to happen for YES to win? For NO to win?
   - Example: "YES requires: (1) GPT-5 announcement by June, (2) public API access within 30 days. NO wins if: OpenAI pivots to enterprise-only or faces regulatory delay."
   - Be concrete about milestones, not vague

5. **KEY_MILESTONES** (comma-separated dates/events to watch)
   - Example: "OpenAI DevDay (Nov), Anthropic Claude 4 launch (Q1), Google I/O (May)"
   - Focus on upcoming catalysts that would move this market

6. **NEXT MOVE** (1 sentence)
   What would cause this market to move significantly again?

7. **TRADING IMPLICATION** (1 sentence)
   Actionable insight for a sophisticated trader.

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "briefs": {
    "0": {
      "catalyst": "What caused the move",
      "credibility": "HIGH",
      "analysis": "The intelligence brief...",
      "pathToResolution": "What needs to happen for YES/NO",
      "keyMilestones": "Event 1 (Date), Event 2 (Date)",
      "nextMove": "What to watch for",
      "tradingImplication": "Actionable insight"
    },
    ...
  }
}`;

            try {
                const response = await withRetry(async () => {
                    return client.chat.completions.create({
                        model: GEMINI_MODELS.SMART,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.5, // Balanced: informed analysis, not too creative
                        max_tokens: 3000,
                    });
                }, 2, 500);

                const content = response.choices[0]?.message?.content || '';
                const parsed = extractJSON<{
                    briefs: Record<string, {
                        catalyst: string;
                        credibility: 'HIGH' | 'MEDIUM' | 'LOW';
                        analysis: string;
                        pathToResolution?: string;
                        keyMilestones?: string;
                        nextMove: string;
                        tradingImplication: string;
                    }>;
                }>(content);

                // Map batch indices back to market IDs
                batch.forEach((item, localIdx) => {
                    const brief = parsed.briefs?.[String(localIdx)];
                    if (brief) {
                        // Calculate time horizon from market data
                        const endDate = item.market.endDate ? new Date(item.market.endDate) : null;
                        const daysOut = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 365;
                        const timeHorizon: 'IMMINENT' | 'NEAR_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' =
                            daysOut < 7 ? 'IMMINENT' : daysOut < 30 ? 'NEAR_TERM' : daysOut < 180 ? 'MEDIUM_TERM' : 'LONG_TERM';

                        allBriefs[item.market.id] = {
                            marketId: item.market.id,
                            catalyst: brief.catalyst || 'Catalyst unknown',
                            credibility: brief.credibility || 'MEDIUM',
                            analysis: brief.analysis || 'Analysis pending.',
                            pathToResolution: brief.pathToResolution || undefined,
                            keyMilestones: brief.keyMilestones || undefined,
                            timeHorizon,
                            nextMove: brief.nextMove || 'Monitoring for developments.',
                            tradingImplication: brief.tradingImplication || 'Exercise caution.'
                        };
                    }
                });

                console.log(`Intelligence Batch ${batchIdx}: Analyzed ${Object.keys(parsed.briefs || {}).length} markets`);

            } catch (error) {
                console.error(`Intelligence Batch ${batchIdx} failed:`, error);
                // Fallback: generic analysis
                batch.forEach(item => {
                    const direction = item.priceChange > 0 ? 'rose' : 'fell';
                    allBriefs[item.market.id] = {
                        marketId: item.market.id,
                        catalyst: 'Catalyst under investigation',
                        credibility: 'MEDIUM',
                        analysis: `Markets ${direction} ${Math.abs(item.priceChange).toFixed(1)}pp. Our analysts are investigating the catalyst.`,
                        nextMove: 'Monitoring for further developments.',
                        tradingImplication: 'Exercise caution until catalyst is confirmed.'
                    };
                });
            }
        }));

        // Generate summary
        const highCredibility = Object.values(allBriefs).filter(b => b.credibility === 'HIGH').length;
        const totalBriefs = Object.keys(allBriefs).length;

        const summary = totalBriefs > 0
            ? `Analyzed ${totalBriefs} significant moves. ${highCredibility} have high-credibility catalysts.`
            : 'No significant market movements to analyze.';

        console.log(`Intelligence Agent: ${summary}`);

        return { briefs: allBriefs, summary };
    }
}

/**
 * Helper: Identify markets with significant movements
 */
export function identifyMovingMarkets(
    currentMarkets: Market[],
    priorPrices: Record<string, number>,
    thresholdPp: number = 5 // 5 percentage points
): IntelligenceInput['movingMarkets'] {
    const moving: IntelligenceInput['movingMarkets'] = [];

    for (const market of currentMarkets) {
        const oldPrice = priorPrices[market.id];
        if (oldPrice === undefined) continue;

        const newPrice = market.yesPrice;
        const changepp = (newPrice - oldPrice) * 100; // Convert to percentage points

        if (Math.abs(changepp) >= thresholdPp) {
            moving.push({
                market,
                priceChange: changepp,
                oldPrice,
                newPrice
            });
        }
    }

    // Sort by magnitude of change (largest first)
    moving.sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange));

    return moving;
}
