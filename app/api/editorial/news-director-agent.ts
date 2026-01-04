import { Market } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface NewsDirectorInput {
    markets: Market[];
    recentlyCovered?: string[]; // Market IDs covered in last 24h
}

export interface NewsDirectorOutput {
    selectedMarkets: Market[];
    reasoning: string;
}

/**
 * News Director Agent - Elite story selection with editorial judgment
 *
 * REPLACEMENT for volume-based filtering. Makes real editorial calls about
 * what matters to readers, not just what's trading the most.
 *
 * Inspired by NYT/Economist front page meetings - editors pitch stories
 * based on importance, impact, urgency, and novelty.
 */
export class NewsDirectorAgent implements Agent<NewsDirectorInput, NewsDirectorOutput> {
    constructor(private apiKey: string) { }

    async call(input: NewsDirectorInput): Promise<NewsDirectorOutput> {
        const { markets, recentlyCovered = [] } = input;

        console.log(`News Director: Evaluating ${markets.length} markets for newsworthiness...`);

        // Process in batches of 25 (manageable for AI to evaluate)
        const BATCH_SIZE = 25;
        const batches: Market[][] = [];
        for (let i = 0; i < markets.length; i += BATCH_SIZE) {
            batches.push(markets.slice(i, i + BATCH_SIZE));
        }

        const client = createAIClient(this.apiKey);
        const selectedMarketIds = new Set<string>();
        let overallReasoning = '';

        // Process batches in parallel with staggered delays
        await Promise.all(batches.map(async (batch, batchIdx) => {
            await new Promise(resolve => setTimeout(resolve, batchIdx * 100));

            // Format markets for editorial evaluation
            const marketsInput = batch.map((m, idx) => {
                const yesPercent = Math.round(m.yesPrice * 100);
                const volume = m.volume24hr >= 1e6
                    ? `$${(m.volume24hr / 1e6).toFixed(1)}M`
                    : m.volume24hr >= 1e3
                        ? `$${(m.volume24hr / 1e3).toFixed(0)}K`
                        : `$${m.volume24hr.toFixed(0)}`;

                const priceChange = m.priceChange24h
                    ? `${m.priceChange24h > 0 ? '+' : ''}${m.priceChange24h.toFixed(1)}pp`
                    : 'N/A';

                const endDate = m.endDate ? new Date(m.endDate) : null;
                const daysToResolution = endDate
                    ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;

                const recentlyCoveredFlag = recentlyCovered.includes(m.id) ? ' [RECENTLY COVERED]' : '';

                return `[${idx}] "${m.question}"${recentlyCoveredFlag}
CATEGORY: ${m.category}
ODDS: ${yesPercent}% YES
VOLUME_24H: ${volume}
PRICE_CHANGE_24H: ${priceChange}
DAYS_TO_RESOLUTION: ${daysToResolution ?? 'Open-ended'}
DESCRIPTION: ${(m.description || 'N/A').substring(0, 150)}`;
            }).join('\n\n');

            const prompt = `You are the News Director at "The Polymarket Times", a prestigious publication covering prediction markets.

Your job is to select which markets deserve editorial coverage based on NEWSWORTHINESS, not trading volume.

═══════════════════════════════════════════════════════════
MARKETS TO EVALUATE:
═══════════════════════════════════════════════════════════
${marketsInput}

═══════════════════════════════════════════════════════════
EDITORIAL CRITERIA (Prioritize stories that meet 2+ criteria):
═══════════════════════════════════════════════════════════

1. **BREAKING NEWS** 🔥
   - Large price swings (>10pp in 24h)
   - Rapidly evolving situations
   - "Something just happened"

2. **URGENT** ⏰
   - Approaching resolution (<7 days)
   - Time-sensitive outcomes
   - "Decision coming soon"

3. **HIGH IMPACT** 🌍
   - Real-world consequences for millions
   - Elections, wars, economic policy
   - Tech breakthroughs, scientific milestones
   - "Matters beyond prediction markets"

4. **CONTESTED** ⚖️
   - Close odds (40-60% range)
   - High volume + uncertainty = drama
   - "Too close to call"

5. **CULTURALLY SIGNIFICANT** 🎭
   - Oscars, Super Bowl, major events
   - Pop culture moments
   - "Everyone's talking about it"

6. **NOVELTY** ✨
   - NOT recently covered (avoid [RECENTLY COVERED] markers)
   - Fresh angles, new developments
   - "We haven't written about this yet"

═══════════════════════════════════════════════════════════
WHAT TO AVOID:
═══════════════════════════════════════════════════════════
❌ Individual sports games (unless playoff/championship)
❌ Low-stakes entertainment ("Will X tweet today?")
❌ Redundant questions (we don't need 5 different "Will X win?" markets)
❌ Markets with no movement (boring, stale)
❌ Very far-out resolutions (>90 days, too speculative)
❌ Markets we just covered yesterday [RECENTLY COVERED]

═══════════════════════════════════════════════════════════
TASK:
═══════════════════════════════════════════════════════════
Select 12-18 markets from this batch that warrant coverage.
Explain WHY each market is newsworthy (1 sentence).

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "selectedIndices": [0, 3, 7, 12, ...],
  "reasoning": {
    "0": "Breaking: 15pp swing suggests major development in Ukraine conflict.",
    "3": "Urgent: Fed decision in 3 days, 50/50 odds, $10M volume.",
    "7": "High impact: Presidential election outcome affects global markets.",
    ...
  },
  "overallReasoning": "Selected 15 markets: 3 breaking, 5 urgent, 7 high-impact."
}`;

            try {
                const response = await withRetry(async () => {
                    return client.chat.completions.create({
                        model: GEMINI_MODELS.SMART, // Smart model for nuanced editorial judgment
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.4, // Moderate creativity for editorial decisions
                        max_tokens: 2000,
                    });
                }, 2, 500);

                const contentText = response.choices[0]?.message?.content || "";
                const parsed = extractJSON<{
                    selectedIndices: number[];
                    reasoning: Record<string, string>;
                    overallReasoning: string;
                }>(contentText);

                // Add selected markets to the set
                for (const idx of parsed.selectedIndices) {
                    if (idx < batch.length) {
                        selectedMarketIds.add(batch[idx].id);
                    }
                }

                if (batchIdx === 0) {
                    overallReasoning = parsed.overallReasoning;
                }

                console.log(`News Director Batch ${batchIdx}: Selected ${parsed.selectedIndices.length}/${batch.length} markets`);

            } catch (error) {
                console.error(`News Director Batch ${batchIdx} failed:`, error);
                // Fallback: select top markets by volume from this batch
                const topByVolume = batch
                    .sort((a, b) => b.volume24hr - a.volume24hr)
                    .slice(0, Math.min(15, batch.length));

                topByVolume.forEach(m => selectedMarketIds.add(m.id));
            }
        }));

        // Filter original markets to only selected ones (preserves order)
        const selectedMarkets = markets.filter(m => selectedMarketIds.has(m.id));

        // Sort selected markets by priority:
        // 1. Largest price change (breaking)
        // 2. Closest to resolution (urgent)
        // 3. Highest volume (important)
        selectedMarkets.sort((a, b) => {
            const aChange = Math.abs(a.priceChange24h || 0);
            const bChange = Math.abs(b.priceChange24h || 0);

            const aEndDate = a.endDate ? new Date(a.endDate) : null;
            const bEndDate = b.endDate ? new Date(b.endDate) : null;
            const aDays = aEndDate ? Math.ceil((aEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999;
            const bDays = bEndDate ? Math.ceil((bEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999;

            // Breaking news first (>15pp change)
            if (aChange >= 15 && bChange < 15) return -1;
            if (bChange >= 15 && aChange < 15) return 1;

            // Then urgent (resolving soon)
            if (aDays <= 7 && bDays > 7) return -1;
            if (bDays <= 7 && aDays > 7) return 1;

            // Finally by volume
            return b.volume24hr - a.volume24hr;
        });

        console.log(`News Director: Selected ${selectedMarkets.length}/${markets.length} markets for editorial consideration`);

        return {
            selectedMarkets,
            reasoning: overallReasoning || `Selected ${selectedMarkets.length} markets based on newsworthiness criteria.`
        };
    }
}
