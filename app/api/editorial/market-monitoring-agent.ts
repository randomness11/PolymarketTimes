import { Market } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface MarketMonitorInput {
    markets: Market[];
    priorSnapshot?: Map<string, number>; // marketId → previous price
}

export interface MarketMonitorOutput {
    alerts: MarketAlert[];
    snapshot: Map<string, number>; // Current prices for next comparison
    reasoning: string;
}

export interface MarketAlert {
    marketId: string;
    market: Market;
    alertType: 'MAJOR_SWING' | 'BREAKING_NEWS' | 'VOLATILITY_SPIKE' | 'CONSENSUS_SHIFT';
    priceChange: number; // Absolute change in price (0-1)
    oldPrice: number;
    newPrice: number;
    urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    headline: string; // AI-generated breaking news headline
    reasoning: string;
}

/**
 * Market Monitoring Agent - Real-time detection of significant market movements
 *
 * FULLY AGENTIC - Uses AI to evaluate if price changes warrant breaking news alerts.
 * Monitors markets for major swings, volatility spikes, and consensus shifts.
 */
export class MarketMonitoringAgent implements Agent<MarketMonitorInput, MarketMonitorOutput> {
    constructor(private apiKey: string) { }

    async call(input: MarketMonitorInput): Promise<MarketMonitorOutput> {
        const { markets, priorSnapshot } = input;

        // Build current snapshot
        const currentSnapshot = new Map<string, number>();
        markets.forEach(m => currentSnapshot.set(m.id, m.yesPrice));

        // If no prior snapshot, this is the first run - no alerts
        if (!priorSnapshot || priorSnapshot.size === 0) {
            console.log('Market Monitor: First run, establishing baseline...');
            return {
                alerts: [],
                snapshot: currentSnapshot,
                reasoning: 'Baseline snapshot established. No alerts on first run.'
            };
        }

        // Detect significant changes
        const candidates: Array<{ market: Market; oldPrice: number; newPrice: number; change: number }> = [];

        for (const market of markets) {
            const oldPrice = priorSnapshot.get(market.id);
            if (oldPrice === undefined) continue; // New market, skip

            const newPrice = market.yesPrice;
            const change = Math.abs(newPrice - oldPrice);

            // Significant threshold: >10% price movement
            if (change >= 0.10) {
                candidates.push({ market, oldPrice, newPrice, change });
            }
        }

        // If no significant changes, return early
        if (candidates.length === 0) {
            console.log('Market Monitor: No significant price movements detected.');
            return {
                alerts: [],
                snapshot: currentSnapshot,
                reasoning: 'All markets stable. No alerts generated.'
            };
        }

        console.log(`Market Monitor: ${candidates.length} significant movements detected. Analyzing...`);

        // Use AI to evaluate which movements warrant breaking news alerts
        const client = createAIClient(this.apiKey);

        const candidatesInput = candidates.map((c, idx) => {
            const direction = c.newPrice > c.oldPrice ? 'UP' : 'DOWN';
            const magnitude = Math.round(c.change * 100);
            return `[${idx}] "${c.market.question}"
OLD PRICE: ${Math.round(c.oldPrice * 100)}%
NEW PRICE: ${Math.round(c.newPrice * 100)}%
CHANGE: ${direction} ${magnitude} percentage points
CATEGORY: ${c.market.category}
VOLUME_24H: $${(c.market.volume24hr / 1e6).toFixed(2)}M`;
        }).join('\n\n');

        const prompt = `You are the Breaking News Editor at "The Polymarket Times".

Markets have experienced significant price movements. Your job is to evaluate which movements warrant BREAKING NEWS alerts to readers.

═══════════════════════════════════════════════════════════
DETECTED PRICE MOVEMENTS:
═══════════════════════════════════════════════════════════
${candidatesInput}

═══════════════════════════════════════════════════════════
EVALUATION CRITERIA:
═══════════════════════════════════════════════════════════
1. **NEWSWORTHINESS**: Does this movement signal important real-world developments?
   - Politics/Conflict/Business → Higher priority
   - Sports → Lower priority unless championship/major event

2. **MAGNITUDE**: How dramatic is the swing?
   - >20 points → CRITICAL urgency
   - 15-20 points → HIGH urgency
   - 10-15 points → MEDIUM urgency

3. **CONSENSUS SHIFT**: Did this cross a major threshold?
   - Crossing 50% (from underdog to favorite) → Breaking news
   - Moving into >80% territory (near certainty) → Breaking news
   - Becoming highly contested (near 50/50) → Breaking news

4. **VOLUME**: High-volume markets signal institutional/informed trading
   - >$5M volume → More newsworthy
   - <$1M volume → Less newsworthy unless extreme swing

═══════════════════════════════════════════════════════════
TASK:
═══════════════════════════════════════════════════════════
For each movement above, decide:
- Should we issue a BREAKING NEWS alert? (yes/no)
- Alert type: MAJOR_SWING | BREAKING_NEWS | VOLATILITY_SPIKE | CONSENSUS_SHIFT
- Urgency: CRITICAL | HIGH | MEDIUM
- Write a DRAMATIC breaking news headline (6 words max, ALL CAPS)
- Brief reasoning (1 sentence)

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "alerts": [
    {
      "index": 0,
      "shouldAlert": true,
      "alertType": "CONSENSUS_SHIFT",
      "urgency": "CRITICAL",
      "headline": "TRUMP ODDS SURGE TO 75%",
      "reasoning": "Major swing crosses key threshold, high volume indicates informed trading."
    },
    {
      "index": 1,
      "shouldAlert": false,
      "reasoning": "Sports market, low newsworthiness despite magnitude."
    }
  ],
  "overallReasoning": "2 of 5 movements warrant breaking news alerts due to..."
}`;

        try {
            const response = await withRetry(async () => {
                return client.chat.completions.create({
                    model: GEMINI_MODELS.SMART, // Use smart model for nuanced evaluation
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.4, // Moderate creativity for headlines, but conservative evaluation
                    max_tokens: 2000,
                });
            }, 2, 500);

            const contentText = response.choices[0]?.message?.content || "";
            const parsed = extractJSON<{
                alerts: Array<{
                    index: number;
                    shouldAlert: boolean;
                    alertType?: string;
                    urgency?: string;
                    headline?: string;
                    reasoning: string;
                }>;
                overallReasoning: string;
            }>(contentText);

            // Build final alerts array
            const finalAlerts: MarketAlert[] = [];

            for (const alert of parsed.alerts) {
                if (!alert.shouldAlert) continue;

                const candidate = candidates[alert.index];
                if (!candidate) continue;

                finalAlerts.push({
                    marketId: candidate.market.id,
                    market: candidate.market,
                    alertType: (alert.alertType as any) || 'MAJOR_SWING',
                    priceChange: candidate.change,
                    oldPrice: candidate.oldPrice,
                    newPrice: candidate.newPrice,
                    urgency: (alert.urgency as any) || 'MEDIUM',
                    headline: alert.headline || 'BREAKING: MARKET MOVES',
                    reasoning: alert.reasoning
                });
            }

            console.log(`Market Monitor: ${finalAlerts.length} breaking news alerts generated.`);

            return {
                alerts: finalAlerts,
                snapshot: currentSnapshot,
                reasoning: parsed.overallReasoning
            };

        } catch (error) {
            console.error('Market Monitor Agent failed:', error);
            // Fallback: Generate simple alerts for very large movements (>15%)
            const fallbackAlerts: MarketAlert[] = candidates
                .filter(c => c.change >= 0.15)
                .map(c => ({
                    marketId: c.market.id,
                    market: c.market,
                    alertType: 'MAJOR_SWING' as const,
                    priceChange: c.change,
                    oldPrice: c.oldPrice,
                    newPrice: c.newPrice,
                    urgency: 'HIGH' as const,
                    headline: `BREAKING: ${c.market.question.slice(0, 40).toUpperCase()}`,
                    reasoning: `Major ${Math.round(c.change * 100)}pp swing detected.`
                }));

            return {
                alerts: fallbackAlerts,
                snapshot: currentSnapshot,
                reasoning: 'AI analysis failed. Fallback to algorithmic detection (>15% threshold).'
            };
        }
    }
}
