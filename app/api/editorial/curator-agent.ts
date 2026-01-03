import { Market, MarketCategory, MarketGroup, FrontPageBlueprint, Story, StoryLayout } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface CuratorInput {
    markets: Market[];
    groups?: MarketGroup[];
}

export interface CuratorOutput {
    blueprint: FrontPageBlueprint;
    reasoning: string;
}

function formatMarketForAI(market: Market, index: number): string {
    const yesWinning = market.yesPrice > 0.5;
    const leadingOdds = Math.round(Math.max(market.yesPrice, market.noPrice) * 100);
    const vol = market.volume24hr >= 1e6
        ? `$${(market.volume24hr / 1e6).toFixed(1)}M`
        : `$${(market.volume24hr / 1e3).toFixed(0)}K`;

    return `[${index}] [${market.category}] ${market.question}
├─ Odds: ${leadingOdds}% ${yesWinning ? 'YES' : 'NO'}
└─ Vol: ${vol} | 24h Change: ${market.priceChange24h?.toFixed(1) || '0'}%`;
}

/**
 * Strategy: Select diverse candidates before asking AI to pick
 */
function getStratifiedCandidates(markets: Market[]): Market[] {
    const activeMarkets = markets.filter(m => m.marketStatus !== 'dead_on_arrival');

    // Helper to get top N by score for a category
    const getTop = (cat: MarketCategory, count: number) =>
        activeMarkets
            .filter(m => m.category === cat)
            .sort((a, b) => b.scores.total - a.scores.total)
            .slice(0, count);

    // Helper to get top N by speed (absolute price change)
    const getMovers = (count: number) =>
        activeMarkets
            .sort((a, b) => (Math.abs(b.priceChange24h || 0) - Math.abs(a.priceChange24h || 0)))
            .slice(0, count);

    const politics = getTop('POLITICS', 6);
    const tech = getTop('TECH', 5);
    const crypto = getTop('CRYPTO', 4);
    const culture = getTop('CULTURE', 4);
    const conflict = getTop('CONFLICT', 4);

    // DIVERSE SPORTS: Pick from different leagues, not just NFL
    const getDiverseSports = (): Market[] => {
        const sportsMarkets = activeMarkets
            .filter(m => m.category === 'SPORTS')
            .sort((a, b) => b.scores.total - a.scores.total);

        const leagues = ['nfl', 'nba', 'mlb', 'nhl', 'soccer', 'f1', 'ufc', 'tennis', 'golf', 'premier league', 'champions league'];
        const picked: Market[] = [];
        const usedLeagues = new Set<string>();

        for (const market of sportsMarkets) {
            const q = market.question.toLowerCase();
            // Find which league this market belongs to
            const league = leagues.find(l => q.includes(l)) || 'other';

            // Only pick if we haven't used this league yet
            if (!usedLeagues.has(league)) {
                usedLeagues.add(league);
                picked.push(market);
            }

            // Max 2 diverse sports
            if (picked.length >= 2) break;
        }
        return picked;
    };
    const sports = getDiverseSports();
    const science = getTop('SCIENCE', 4); // Increased
    const business = getTop('BUSINESS', 4); // Increased
    const other = getTop('OTHER', 5);

    // Get high velocity movers (exclude sports to prevent NFL domination)
    const movers = getMovers(10).filter(m => m.category !== 'SPORTS');

    // Get general top scoring (safety net) - also exclude sports
    const generalTop = activeMarkets
        .filter(m => m.category !== 'SPORTS')
        .sort((a, b) => b.scores.total - a.scores.total)
        .slice(0, 20);

    // Combine and deduplicate
    const combined = [
        ...politics, ...tech, ...crypto, ...culture, ...conflict, ...sports, ...science, ...business, ...other,
        ...movers, ...generalTop
    ];

    const seen = new Set<string>();
    const unique: Market[] = [];
    let sportsCount = 0;
    const MAX_SPORTS = 2; // HARD CAP - Max 2 sports stories ever

    for (const m of combined) {
        if (!seen.has(m.id)) {
            // Hard cap on sports
            if (m.category === 'SPORTS') {
                if (sportsCount >= MAX_SPORTS) continue; // Skip excess sports
                sportsCount++;
            }
            seen.add(m.id);
            unique.push(m);
        }
    }

    // Sort final list by total score
    return unique.sort((a, b) => b.scores.total - a.scores.total);
}

export class CuratorAgent implements Agent<CuratorInput, CuratorOutput> {
    constructor(private apiKey: string) { }

    async call(input: CuratorInput): Promise<CuratorOutput> {
        const { markets } = input;

        if (!markets || markets.length < 1) {
            throw new Error('No markets available for curation');
        }

        console.log(`AI Curator: received ${markets.length} markets. Running stratified sampling...`);

        // 1. Stratified Sampling
        const candidateMarkets = getStratifiedCandidates(markets);
        console.log(`AI Curator: shortlisted ${candidateMarkets.length} diverse candidates.`);

        try {
            const client = createAIClient(this.apiKey);

            const marketsList = candidateMarkets
                .map((m, i) => formatMarketForAI(m, i + 1))
                .join('\n\n');

            // 2. AI Selection
            const curatorPrompt = `You are the Editor-in-Chief of "The Polymarket Times".
Your goal is to curate a PACKED front page of newsworthy stories.

CANDIDATES:
${marketsList}

INSTRUCTIONS:
1. Select ALL stories that are newsworthy. Aim for 20-25. If fewer are available, that's OK.
2. PRIORITIZE:
   - HIGH VOLUME: Money on the line = people care
   - BIG SWINGS: Drama! Stories with significant price changes
   - REAL-WORLD IMPACT: Elections, wars, tech breakthroughs, major policy decisions
3. MANDATORY DIVERSITY:
   - 1 "LEAD STORY" (Biggest global news with highest stakes)
   - 5-6 "POLITICS" (elections, government, policy)
   - 4-5 "TECH/CRYPTO" (AI, blockchain, companies)
   - 2-3 "BUSINESS/FINANCE" (markets, economy)
   - 2-3 "SCIENCE/CONFLICT" (research, geopolitics)
   - MAX 2 "SPORTS" - NO MORE! Avoid having multiple stories from the same league (e.g., don't pick 5 NFL stories)
   - 2-3 "CULTURE" (entertainment, media)
4. If it's MOVING (big 24h change), PRINT IT.
5. VARIETY IS KEY: Avoid picking multiple similar stories (e.g., 5 different NFL division races).

RESPONSE FORMAT (JSON ONLY):
{
  "selectedIndices": [
     { "index": 1, "layout": "LEAD_STORY" },
     { "index": 5, "layout": "FEATURE" },
     { "index": 12, "layout": "BRIEF" }
  ],
  "reasoning": "Brief explanation."
}`;

            const response = await withRetry(async () => {
                return client.chat.completions.create({
                    model: GEMINI_MODELS.SMART, // Gemini 3 Flash
                    messages: [{ role: 'user', content: curatorPrompt }],
                    temperature: 0.5,
                    max_tokens: 1000,
                });
            }, 2, 500);

            const content = response.choices[0]?.message?.content || '';
            const parsed = extractJSON<{
                selectedIndices: { index: number; layout: StoryLayout }[];
                reasoning: string;
            }>(content);

            const selectedItems = parsed.selectedIndices || [];

            // Map back to markets and assign layout
            let selectedStories: Story[] = selectedItems
                .map(item => {
                    const market = candidateMarkets[item.index - 1];
                    if (!market) return null;
                    return {
                        ...market,
                        layout: item.layout || 'BRIEF'
                    } as Story;
                })
                .filter((s): s is Story => s !== null);

            // Deduplicate (Critical Step)
            const seenIds = new Set<string>();
            const uniqueSelected: Story[] = [];

            // Prioritize what AI selected, but drop duplicates
            for (const s of selectedStories) {
                if (!seenIds.has(s.id)) {
                    seenIds.add(s.id);
                    uniqueSelected.push(s);
                }
            }
            selectedStories = uniqueSelected;

            // Fallback: fill to 35 if AI under-selected (deduplicated)
            if (selectedStories.length < 35) {
                const remaining = candidateMarkets
                    .filter(m => !seenIds.has(m.id))
                    .map(m => ({ ...m, layout: 'BRIEF' as StoryLayout })); // Default to BRIEF for fallback

                // Fill up to 35 if possible
                selectedStories = [...selectedStories, ...remaining].slice(0, 35);
            }

            // Cap at 40 max just in case
            selectedStories = selectedStories.slice(0, 40);

            console.log(`AI Curator selected ${selectedStories.length} stories. Reasoning: ${parsed.reasoning}`);

            return {
                blueprint: { stories: selectedStories },
                reasoning: parsed.reasoning || 'AI selection'
            };

        } catch (error) {
            console.error('AI Curator failed, using fallback', error);
            // Fallback logic
            const fallbackStories = candidateMarkets.slice(0, 35).map((m, i) => ({
                ...m,
                layout: i === 0 ? 'LEAD_STORY' : (i < 6 ? 'FEATURE' : 'BRIEF')
            } as Story));

            return {
                blueprint: { stories: fallbackStories },
                reasoning: 'Fallback: Top stratified candidates'
            };
        }
    }
}
