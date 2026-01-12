import { Market } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface MarketScoringInput {
    markets: Market[];
}

export interface MarketScore {
    marketId: string;
    newsworthiness: number; // 0-1 scale
    urgency: number; // 0-1 scale (time sensitivity)
    impact: number; // 0-1 scale (real-world consequences)
    total: number; // Combined score
    reasoning: string; // AI's explanation
}

export interface MarketScoringOutput {
    scores: Map<string, MarketScore>; // marketId → score
    overallReasoning: string;
}

/**
 * Market Scoring Agent - AI-powered evaluation of market newsworthiness
 *
 * FULLY AGENTIC REPLACEMENT for hardcoded scoring formulas (money * certainty * speed * interest).
 * Uses AI to evaluate markets based on context, not just raw numbers.
 */
export class MarketScoringAgent implements Agent<MarketScoringInput, MarketScoringOutput> {
    constructor(private apiKey: string) { }

    async call(input: MarketScoringInput): Promise<MarketScoringOutput> {
        const { markets } = input;

        // Process in batches to avoid token limits
        const BATCH_SIZE = 15;
        const batches: Market[][] = [];
        for (let i = 0; i < markets.length; i += BATCH_SIZE) {
            batches.push(markets.slice(i, i + BATCH_SIZE));
        }

        console.log(`Market Scoring Agent: Evaluating ${markets.length} markets in ${batches.length} batches...`);

        const client = createAIClient(this.apiKey);
        const finalScores = new Map<string, MarketScore>();
        let overallReasoning = '';

        await Promise.all(batches.map(async (batch, batchIdx) => {
            // Stagger to avoid rate limits (reduced for faster execution)
            await new Promise(resolve => setTimeout(resolve, batchIdx * 100));

            // Format markets for AI evaluation
            const marketsInput = batch.map((m, idx) => {
                const yesPercent = Math.round(m.yesPrice * 100);
                const noPercent = Math.round(m.noPrice * 100);
                const volume = m.volume24hr >= 1e6
                    ? `$${(m.volume24hr / 1e6).toFixed(1)}M`
                    : `$${(m.volume24hr / 1e3).toFixed(0)}K`;
                const priceChange = m.priceChange24h
                    ? `${m.priceChange24h > 0 ? '+' : ''}${m.priceChange24h.toFixed(1)}pp`
                    : 'N/A';

                return `[${idx}] "${m.question}"
CATEGORY: ${m.category}
ODDS: YES ${yesPercent}% / NO ${noPercent}%
VOLUME_24H: ${volume}
PRICE_CHANGE_24H: ${priceChange}
DESCRIPTION: ${(m.description || 'N/A').substring(0, 150)}`;
            }).join('\n\n');

            const prompt = `You are the News Director at "The Polymarket Times", responsible for evaluating which prediction markets warrant front-page coverage.

Your job is to SCORE each market's newsworthiness on three dimensions:

═══════════════════════════════════════════════════════════
MARKETS TO EVALUATE:
═══════════════════════════════════════════════════════════
${marketsInput}

═══════════════════════════════════════════════════════════
SCORING DIMENSIONS (each 0.0 to 1.0):
═══════════════════════════════════════════════════════════

1. **NEWSWORTHINESS** (0.0 - 1.0)
   How inherently interesting/important is this story?

   HIGH NEWSWORTHINESS (0.8-1.0):
   - Major elections, wars, economic crises
   - Breakthrough tech announcements (AGI, fusion, etc.)
   - Significant cultural moments (Oscars, Super Bowl)
   - High-stakes business decisions (major IPOs, CEO changes)

   MEDIUM NEWSWORTHINESS (0.4-0.7):
   - Secondary political races
   - Industry developments
   - Niche sports championships
   - Moderate scientific breakthroughs

   LOW NEWSWORTHINESS (0.0-0.3):
   - Individual game outcomes
   - Minor celebrity gossip
   - Obscure financial instruments
   - Hyper-specific tech questions

2. **URGENCY** (0.0 - 1.0)
   How time-sensitive is this? Is it breaking news?

   HIGH URGENCY (0.8-1.0):
   - Large price swings (>15pp in 24h)
   - Events happening soon (<7 days)
   - Rapidly evolving situations

   MEDIUM URGENCY (0.4-0.7):
   - Moderate price movement (5-15pp)
   - Events within 30 days
   - Ongoing but stable

   LOW URGENCY (0.0-0.3):
   - Stable markets (<5pp change)
   - Long-term predictions (>90 days)
   - Slowly developing trends

3. **IMPACT** (0.0 - 1.0)
   What are the real-world consequences if this resolves YES?

   HIGH IMPACT (0.8-1.0):
   - Affects millions of people
   - Global geopolitical implications
   - Major economic shifts
   - Paradigm-changing tech

   MEDIUM IMPACT (0.4-0.7):
   - Regional effects
   - Industry-specific changes
   - Cultural shifts

   LOW IMPACT (0.0-0.3):
   - Entertainment outcomes
   - Individual achievements
   - Minor policy adjustments

═══════════════════════════════════════════════════════════
VOLUME & ODDS CONTEXT:
═══════════════════════════════════════════════════════════
- High volume ($5M+) → Institutional/informed traders → Higher credibility
- Price swings → Breaking developments → Higher urgency
- Extreme odds (>90% or <10%) → Near-certain outcomes → Could be newsworthy OR boring
- 50/50 markets → Contested/uncertain → Often newsworthy drama

═══════════════════════════════════════════════════════════
TASK:
═══════════════════════════════════════════════════════════
For EACH market, assign scores (0.0-1.0) and brief reasoning.

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "scores": [
    {
      "index": 0,
      "newsworthiness": 0.95,
      "urgency": 0.8,
      "impact": 0.9,
      "reasoning": "Presidential election with major global implications, high volume signals informed trading."
    },
    {
      "index": 1,
      "newsworthiness": 0.3,
      "urgency": 0.2,
      "impact": 0.1,
      "reasoning": "Individual sports game, low real-world impact despite volume."
    }
  ],
  "overallReasoning": "Batch contains 2 high-priority stories (politics, tech) and several low-priority sports markets."
}`;

            try {
                const response = await withRetry(async () => {
                    return client.chat.completions.create({
                        model: GEMINI_MODELS.SMART, // Use smart model for nuanced evaluation
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.3, // Low temperature for consistent, professional scoring
                        max_tokens: 3000,
                    });
                }, 2, 500);

                const contentText = response.choices[0]?.message?.content || "";
                const parsed = extractJSON<{
                    scores: Array<{
                        index: number;
                        newsworthiness: number;
                        urgency: number;
                        impact: number;
                        reasoning: string;
                    }>;
                    overallReasoning: string;
                }>(contentText);

                // Map results back to market IDs
                batch.forEach((market, localIdx) => {
                    const scoreData = parsed.scores.find(s => s.index === localIdx);
                    if (scoreData) {
                        // Calculate total as weighted average
                        const total = (
                            scoreData.newsworthiness * 0.4 +
                            scoreData.urgency * 0.3 +
                            scoreData.impact * 0.3
                        );

                        finalScores.set(market.id, {
                            marketId: market.id,
                            newsworthiness: scoreData.newsworthiness,
                            urgency: scoreData.urgency,
                            impact: scoreData.impact,
                            total,
                            reasoning: scoreData.reasoning
                        });
                    } else {
                        // Fallback to algorithmic scoring if AI skips this market
                        const total = calculateFallbackScore(market);
                        finalScores.set(market.id, {
                            marketId: market.id,
                            newsworthiness: total,
                            urgency: 0.5,
                            impact: 0.5,
                            total,
                            reasoning: 'Fallback: AI did not provide score'
                        });
                    }
                });

                if (batchIdx === 0) {
                    overallReasoning = parsed.overallReasoning;
                }

            } catch (error) {
                console.error(`Market Scoring Batch ${batchIdx} failed:`, error);
                // Fallback for entire batch
                batch.forEach(market => {
                    const total = calculateFallbackScore(market);
                    finalScores.set(market.id, {
                        marketId: market.id,
                        newsworthiness: total,
                        urgency: 0.5,
                        impact: 0.5,
                        total,
                        reasoning: 'Fallback: AI scoring failed'
                    });
                });
            }
        }));

        console.log(`Market Scoring Agent: Evaluated ${finalScores.size} markets`);

        return {
            scores: finalScores,
            overallReasoning: overallReasoning || 'Scoring complete.'
        };
    }
}

/**
 * Fallback algorithmic scoring (simplified version of original)
 * Used only when AI fails
 */
function calculateFallbackScore(market: Market): number {
    const money = Math.log10(market.volume24hr + 1) / 7; // Normalize to ~0-1
    const certainty = Math.abs(market.yesPrice - 0.5) * 2; // 0 at 50%, 1 at 0/100%
    const speed = Math.min(Math.abs(market.priceChange24h || 0) / 25, 1); // 0-1 scale

    // TECH TWITTER FOCUS: Match market-processing.ts weights
    const categoryWeights: Record<string, number> = {
        TECH: 1.8,       // Core audience
        CRYPTO: 1.6,     // Polymarket native
        BUSINESS: 1.4,   // Startups, funding
        SCIENCE: 1.3,    // Space, biotech
        POLITICS: 1.2,   // Only tech-relevant
        CONFLICT: 1.0,   // When market-moving
        FINANCE: 1.0,    // Fed, rates
        CULTURE: 0.6,    // Minimal
        SPORTS: 0.4,     // Minimal
        OTHER: 0.7,
    };

    const interest = categoryWeights[market.category] || 1.0;

    return Math.min((money * 0.35 + certainty * 0.35 + speed * 0.30) * interest, 1.0);
}
