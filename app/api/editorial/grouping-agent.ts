import { Market, MarketGroup } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface GroupingAgentInput {
    markets: Market[];
}

export interface GroupingAgentOutput {
    groups: MarketGroup[];
    reasoning: string;
}

/**
 * Market Grouping Agent - AI-powered intelligent grouping of related markets
 *
 * FULLY AGENTIC REPLACEMENT for regex-based topic extraction and string similarity.
 * Uses AI to understand semantic relationships and group markets intelligently.
 */
export class MarketGroupingAgent implements Agent<GroupingAgentInput, GroupingAgentOutput> {
    constructor(private apiKey: string) { }

    async call(input: GroupingAgentInput): Promise<GroupingAgentOutput> {
        const { markets } = input;

        console.log(`Grouping Agent: Analyzing ${markets.length} markets for relationships...`);

        const client = createAIClient(this.apiKey);

        // Format markets for AI analysis
        const marketsInput = markets.slice(0, 50).map((m, idx) => {
            const volume = m.volume24hr >= 1e6
                ? `$${(m.volume24hr / 1e6).toFixed(1)}M`
                : `$${(m.volume24hr / 1e3).toFixed(0)}K`;

            return `[${idx}] "${m.question}" (${volume}, ${Math.round(m.yesPrice * 100)}% YES)`;
        }).join('\n');

        const prompt = `You are a news clustering specialist at "The Polymarket Times".

Your task is to identify GROUPS of related prediction markets that cover the same underlying topic/event.

═══════════════════════════════════════════════════════════
MARKETS TO ANALYZE:
═══════════════════════════════════════════════════════════
${marketsInput}

═══════════════════════════════════════════════════════════
GROUPING GUIDELINES:
═══════════════════════════════════════════════════════════

**WHAT TO GROUP:**
1. **Same Event, Different Candidates**
   - "Will Trump win 2024 election?" + "Will Harris win 2024 election?"
   - Group as: "2024 Presidential Election"

2. **Same Asset, Different Price Targets**
   - "Will Bitcoin reach $100K?" + "Will Bitcoin reach $150K?"
   - Group as: "Bitcoin Price Targets"

3. **Same Championship, Different Teams**
   - "Will Lakers win NBA Finals?" + "Will Celtics win NBA Finals?"
   - Group as: "NBA Finals 2024"

4. **Same Issue, Different Outcomes**
   - "Will Ukraine win the war?" + "Will Russia withdraw from Ukraine?"
   - Group as: "Ukraine-Russia Conflict"

**WHAT NOT TO GROUP:**
- Different events (Super Bowl vs World Series)
- Different time periods (2024 election vs 2028 election)
- Different topics entirely

**OUTPUT FORMAT:**
- Identify 5-15 major groups from the markets
- Each group should have 2+ related markets
- Use a clear, concise topic name
- List market indices that belong to each group

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "groups": [
    {
      "topic": "2024 Presidential Election",
      "marketIndices": [0, 5, 12],
      "reasoning": "All markets about the same presidential race."
    },
    {
      "topic": "Bitcoin $100K",
      "marketIndices": [3, 8],
      "reasoning": "Both markets about Bitcoin price milestones."
    }
  ],
  "overallReasoning": "Found 15 groups covering elections, crypto targets, and sports championships."
}`;

        try {
            const response = await withRetry(async () => {
                return client.chat.completions.create({
                    model: GEMINI_MODELS.SMART, // Smart model for nuanced grouping
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3, // Moderate temperature for consistent but flexible grouping
                    max_tokens: 3000,
                });
            }, 2, 500);

            const contentText = response.choices[0]?.message?.content || "";
            const parsed = extractJSON<{
                groups: Array<{
                    topic: string;
                    marketIndices: number[];
                    reasoning: string;
                }>;
                overallReasoning: string;
            }>(contentText);

            // Build final MarketGroup objects
            const finalGroups: MarketGroup[] = [];

            for (const aiGroup of parsed.groups) {
                // Get markets from indices
                const groupedMarkets = aiGroup.marketIndices
                    .filter(idx => idx < markets.length)
                    .map(idx => markets[idx])
                    .filter(m => m !== undefined);

                if (groupedMarkets.length < 2) continue; // Need at least 2 to be a group

                // Sort by volume
                const sortedByVolume = groupedMarkets.sort((a, b) => b.volume24hr - a.volume24hr);

                const primary = sortedByVolume[0];
                const others = sortedByVolume.slice(1);

                // Build all outcomes list
                const allOutcomes: MarketGroup['allOutcomes'] = sortedByVolume.map(m => {
                    // Extract candidate/option from question
                    let label = m.question
                        .replace(/^will\s+/i, '')
                        .replace(/\?$/, '')
                        .split(/\s+(win|be|become|reach|hit)\s+/i)[0]
                        .trim();

                    // If label is too long, use first outcome
                    if (label.length > 50) {
                        label = m.outcomes[0] || 'Yes';
                    }

                    return {
                        label,
                        probability: m.yesPrice,
                        volume: m.volume24hr,
                    };
                });

                // Sort outcomes by probability
                allOutcomes.sort((a, b) => b.probability - a.probability);

                finalGroups.push({
                    topic: aiGroup.topic,
                    primaryMarketId: primary.id,
                    relatedMarketIds: others.map(m => m.id),
                    allOutcomes,
                    combinedVolume: sortedByVolume.reduce((sum, m) => sum + m.volume24hr, 0),
                    isMultiOutcome: sortedByVolume.length > 1,
                });
            }

            // Sort groups by combined volume
            finalGroups.sort((a, b) => b.combinedVolume - a.combinedVolume);

            console.log(`Grouping Agent: Created ${finalGroups.length} market groups`);

            return {
                groups: finalGroups,
                reasoning: parsed.overallReasoning
            };

        } catch (error) {
            console.error('Grouping Agent failed:', error);
            // Fallback to algorithmic grouping
            return {
                groups: fallbackGrouping(markets),
                reasoning: 'AI grouping failed, using fallback algorithm.'
            };
        }
    }
}

/**
 * Fallback algorithmic grouping (simplified)
 * Used only when AI fails
 */
function fallbackGrouping(markets: Market[]): MarketGroup[] {
    // Simple topic extraction
    const extractTopic = (question: string): string => {
        const q = question.toLowerCase()
            .replace(/^will\s+/i, '')
            .replace(/\?$/, '')
            .split(/\s+(win|be|become|reach|hit)\s+/i)
            .slice(1)
            .join(' ')
            .trim();

        return q.split(/\s+/).slice(0, 5).join(' ');
    };

    const topicMap = new Map<string, Market[]>();

    for (const market of markets) {
        const topic = extractTopic(market.question);
        if (!topicMap.has(topic)) {
            topicMap.set(topic, []);
        }
        topicMap.get(topic)!.push(market);
    }

    const groups: MarketGroup[] = [];

    for (const [topic, groupedMarkets] of topicMap) {
        if (groupedMarkets.length < 2) continue;

        const sortedByVolume = groupedMarkets.sort((a, b) => b.volume24hr - a.volume24hr);
        const primary = sortedByVolume[0];
        const others = sortedByVolume.slice(1);

        const allOutcomes = sortedByVolume.map(m => ({
            label: m.outcomes[0] || 'Yes',
            probability: m.yesPrice,
            volume: m.volume24hr,
        }));

        allOutcomes.sort((a, b) => b.probability - a.probability);

        groups.push({
            topic,
            primaryMarketId: primary.id,
            relatedMarketIds: others.map(m => m.id),
            allOutcomes,
            combinedVolume: sortedByVolume.reduce((sum, m) => sum + m.volume24hr, 0),
            isMultiOutcome: true,
        });
    }

    groups.sort((a, b) => b.combinedVolume - a.combinedVolume);

    return groups;
}
