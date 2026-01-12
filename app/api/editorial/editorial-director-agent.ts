import { Market, MarketCategory, FrontPageBlueprint, Story, StoryLayout, TimeHorizon } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface EditorialDirectorInput {
    markets: Market[];
    recentlyCovered?: string[]; // Market IDs covered in last 24h
}

export interface EditorialDirectorOutput {
    blueprint: FrontPageBlueprint;
    reasoning: string;
}

/**
 * Format market data for AI evaluation
 */
function formatMarketForAI(market: Market, index: number, recentlyCovered: string[]): string {
    const yesWinning = market.yesPrice > 0.5;
    const leadingOdds = Math.round(Math.max(market.yesPrice, market.noPrice) * 100);
    const vol = market.volume24hr >= 1e6
        ? `$${(market.volume24hr / 1e6).toFixed(1)}M`
        : market.volume24hr >= 1e3
            ? `$${(market.volume24hr / 1e3).toFixed(0)}K`
            : `$${market.volume24hr.toFixed(0)}`;

    const priceChange = market.priceChange24h
        ? `${market.priceChange24h > 0 ? '+' : ''}${market.priceChange24h.toFixed(1)}pp`
        : '0pp';

    const endDate = market.endDate ? new Date(market.endDate) : null;
    const daysToResolution = endDate
        ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    // Time horizon label for future-focused selection
    const horizonLabel = market.timeHorizon || (daysToResolution
        ? (daysToResolution < 7 ? 'IMMINENT' : daysToResolution < 30 ? 'NEAR_TERM' : daysToResolution < 180 ? 'MEDIUM_TERM' : 'LONG_TERM')
        : 'LONG_TERM');

    const futureTag = horizonLabel === 'MEDIUM_TERM' || horizonLabel === 'LONG_TERM' ? ' 🔮 FUTURE' : '';

    const recentFlag = recentlyCovered.includes(market.id) ? ' ⚠️ RECENTLY_COVERED' : '';

    return `[${index}] [${market.category}] [${horizonLabel}]${futureTag} "${market.question}"${recentFlag}
├─ Odds: ${leadingOdds}% ${yesWinning ? 'YES' : 'NO'} | Vol: ${vol} | 24h: ${priceChange}
└─ Resolution: ${daysToResolution ? `${daysToResolution} days` : 'Open-ended'}`;
}

/**
 * Pre-filter to get diverse candidates before AI selection
 * This reduces cognitive load on the LLM while ensuring diversity
 */
function getStratifiedCandidates(markets: Market[]): Market[] {
    const activeMarkets = markets.filter(m => m.marketStatus !== 'dead_on_arrival');

    const getTop = (cat: MarketCategory, count: number) =>
        activeMarkets
            .filter(m => m.category === cat)
            .sort((a, b) => b.scores.total - a.scores.total)
            .slice(0, count);

    // Get high velocity movers (biggest price changes)
    const getMovers = (count: number) =>
        activeMarkets
            .sort((a, b) => Math.abs(b.priceChange24h || 0) - Math.abs(a.priceChange24h || 0))
            .slice(0, count);

    // Diverse sports: max 1 per league
    const getDiverseSports = (): Market[] => {
        const sportsMarkets = activeMarkets
            .filter(m => m.category === 'SPORTS')
            .sort((a, b) => b.scores.total - a.scores.total);

        const leagues = ['nfl', 'nba', 'mlb', 'nhl', 'soccer', 'f1', 'ufc', 'tennis', 'golf', 'premier league', 'champions league'];
        const picked: Market[] = [];
        const usedLeagues = new Set<string>();

        for (const market of sportsMarkets) {
            const q = market.question.toLowerCase();
            const league = leagues.find(l => q.includes(l)) || 'other';
            if (!usedLeagues.has(league)) {
                usedLeagues.add(league);
                picked.push(market);
            }
            if (picked.length >= 2) break;
        }
        return picked;
    };

    // Stratified selection by category — TECH TWITTER FIRST
    // Prioritize tech, crypto, and future-focused markets
    const candidates = [
        ...getTop('TECH', 20),         // Tech/AI is THE core — most slots
        ...getTop('CRYPTO', 12),       // Crypto is Polymarket native
        ...getTop('BUSINESS', 8),      // Startups, funding, M&A
        ...getTop('SCIENCE', 6),       // Space, biotech, breakthroughs
        ...getTop('POLITICS', 6),      // Only tech-relevant policy
        ...getTop('FINANCE', 4),       // Fed, rates when market-moving
        ...getTop('CONFLICT', 3),      // Only if affecting markets
        ...getTop('OTHER', 3),
        // BIG MOVERS - prioritize tech/crypto movers
        ...getMovers(25).filter(m => m.category !== 'SPORTS' && m.category !== 'CULTURE'),
        // MINIMAL entertainment (max 1 each, only if high-scoring)
        ...getTop('CULTURE', 1),
        ...getDiverseSports().slice(0, 1),
    ];

    // Deduplicate while preserving order
    const seen = new Set<string>();
    const unique: Market[] = [];
    let sportsCount = 0;

    for (const m of candidates) {
        if (!seen.has(m.id)) {
            if (m.category === 'SPORTS') {
                if (sportsCount >= 2) continue; // Hard cap: 2 sports max
                sportsCount++;
            }
            seen.add(m.id);
            unique.push(m);
        }
    }

    return unique.sort((a, b) => b.scores.total - a.scores.total);
}

/**
 * Editorial Director Agent - Unified story selection and layout assignment
 *
 * REPLACES: NewsDirectorAgent + CuratorAgent
 *
 * Single-pass editorial judgment: selects newsworthy stories AND assigns layouts.
 * Eliminates redundant filtering and reduces total API calls.
 */
export class EditorialDirectorAgent implements Agent<EditorialDirectorInput, EditorialDirectorOutput> {
    constructor(private apiKey: string) { }

    async call(input: EditorialDirectorInput): Promise<EditorialDirectorOutput> {
        const { markets, recentlyCovered = [] } = input;

        if (!markets || markets.length < 1) {
            throw new Error('No markets available for editorial review');
        }

        console.log(`Editorial Director: Evaluating ${markets.length} markets...`);

        // 1. Stratified pre-selection (algorithmic diversity)
        const candidates = getStratifiedCandidates(markets);
        console.log(`Editorial Director: Pre-selected ${candidates.length} diverse candidates`);

        // 2. AI editorial selection with layout assignment
        const client = createAIClient(this.apiKey);

        const marketsList = candidates
            .map((m, i) => formatMarketForAI(m, i, recentlyCovered))
            .join('\n\n');

        const prompt = `You are the Editorial Director of "The Polymarket Times" — the front page for tech Twitter and the Polymarket community.

Your audience: Builders, founders, traders, and tech-obsessed readers who want to know what's COMING, not just what's happening.

Your job: Select the day's front page AND assign each story's prominence.

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

═══════════════════════════════════════════════════════════
CANDIDATES (${candidates.length} markets):
═══════════════════════════════════════════════════════════
${marketsList}

═══════════════════════════════════════════════════════════
SELECTION CRITERIA (stories must meet 2+ to qualify):
═══════════════════════════════════════════════════════════

1. 🔮 FUTURE-DEFINING — Markets about what's COMING (3-12 months out). AI milestones, product launches, funding rounds. Tech Twitter wants to know the future.
2. 🔥 BREAKING — Large swings (>10pp in 24h), evolving situations
3. 🤖 TECH/AI — OpenAI, Anthropic, Google AI, Apple, Tesla, SpaceX, semiconductors. These get priority.
4. 💰 CRYPTO MOVES — BTC, ETH, SOL, major DeFi, protocol upgrades, regulatory clarity
5. ⚖️ CONTESTED — Close odds (40-60%) + high volume = drama and alpha
6. 🚀 FOUNDER/VC — Markets about Elon, Altman, a16z, YC companies, major raises
7. ✨ NOVELTY — Fresh angle, not recently covered
8. 🎲 CONTRARIAN SIGNAL — Odds moving against volume (smart money divergence)

═══════════════════════════════════════════════════════════
WHAT TO AVOID — BE RUTHLESS:
═══════════════════════════════════════════════════════════
❌ ENTERTAINMENT BETTING: Oscar predictions, Grammy picks, award show outcomes
   → These are GAMBLING, not ALPHA.

❌ SPORTS GAMES: Individual matchups, weekly games
   → Unless it's a major championship with cultural crossover

❌ NEAR-TERM ONLY MARKETS: Prefer markets 30+ days out
   → Exception: Breaking news with >10pp swings

❌ NO-CATALYST NOISE: Markets with no movement AND no clear resolution path

❌ Markets marked ⚠️ RECENTLY_COVERED (unless major update)

THE FRONT PAGE TEST: Would tech Twitter care about this?
- "Will GPT-5 ship by Q3?" YES — future-defining
- "OpenAI $300B valuation?" YES — founder/VC signal
- "BTC ETF approval?" YES — crypto native
- "Will Lakers beat Celtics tonight?" NO — wrong audience

═══════════════════════════════════════════════════════════
LAYOUT ASSIGNMENTS:
═══════════════════════════════════════════════════════════
• LEAD_STORY (1 only): Biggest global story. Highest stakes. Gets the banner headline.
• FEATURE (5-7): Important stories deserving prominence and analysis.
• BRIEF (15-20): Quick-hit stories. Newsworthy but don't need deep coverage.

═══════════════════════════════════════════════════════════
DIVERSITY REQUIREMENTS — TECH TWITTER FIRST:
═══════════════════════════════════════════════════════════
Your front page MUST prioritize:
- 8-10 TECH (AI labs, products, breakthroughs, major companies) — THIS IS THE CORE
- 4-6 CRYPTO (BTC, ETH, DeFi, protocol news, regulatory) — POLYMARKET NATIVE
- 3-4 BUSINESS (startups, IPOs, M&A, funding rounds, founder moves)
- 2-3 SCIENCE (space, biotech, breakthroughs)
- 2-3 POLITICS (only if tech/crypto relevant: regulation, antitrust, trade)
- 1-2 FINANCE (Fed, rates — but only when market-moving)
- MAX 1 CONFLICT — unless directly affecting tech/markets
- MAX 1 CULTURE/SPORTS — only if genuinely viral on tech Twitter

FUTURE FOCUS: At least 30% of stories should resolve 30+ days from now.

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "selections": [
    { "index": 0, "layout": "LEAD_STORY", "why": "15pp swing on Ukraine ceasefire talks" },
    { "index": 3, "layout": "FEATURE", "why": "Fed decision in 3 days, 50/50 odds" },
    { "index": 7, "layout": "BRIEF", "why": "Bitcoin crossing $100K threshold" },
    ...
  ],
  "reasoning": "Selected 25 stories: 1 lead (Ukraine), 6 features (politics, tech), 18 briefs..."
}`;

        try {
            const response = await withRetry(async () => {
                return client.chat.completions.create({
                    model: GEMINI_MODELS.SMART,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.4, // Conservative editorial judgment
                    max_tokens: 3000,
                });
            }, 2, 500);

            const contentText = response.choices[0]?.message?.content || '';
            const parsed = extractJSON<{
                selections: Array<{ index: number; layout: StoryLayout; why?: string }>;
                reasoning: string;
            }>(contentText);

            // Map selections back to stories
            const selections = parsed.selections || [];
            const selectedStories: Story[] = selections
                .map(sel => {
                    const market = candidates[sel.index];
                    if (!market) return null;
                    return { ...market, layout: sel.layout || 'BRIEF' } as Story;
                })
                .filter((s): s is Story => s !== null);

            // Deduplicate
            const seenIds = new Set<string>();
            const uniqueStories = selectedStories.filter(s => {
                if (seenIds.has(s.id)) return false;
                seenIds.add(s.id);
                return true;
            });

            // Ensure we have enough stories (fallback fill)
            if (uniqueStories.length < 20) {
                const remaining = candidates
                    .filter(m => !seenIds.has(m.id))
                    .slice(0, 35 - uniqueStories.length)
                    .map(m => ({ ...m, layout: 'BRIEF' as StoryLayout }));
                uniqueStories.push(...remaining);
            }

            // Ensure exactly 1 LEAD_STORY
            const hasLead = uniqueStories.some(s => s.layout === 'LEAD_STORY');
            if (!hasLead && uniqueStories.length > 0) {
                uniqueStories[0].layout = 'LEAD_STORY';
            }

            // Cap at 40 stories
            const finalStories = uniqueStories.slice(0, 40);

            console.log(`Editorial Director: Selected ${finalStories.length} stories`);
            console.log(`  - LEAD: ${finalStories.filter(s => s.layout === 'LEAD_STORY').length}`);
            console.log(`  - FEATURE: ${finalStories.filter(s => s.layout === 'FEATURE').length}`);
            console.log(`  - BRIEF: ${finalStories.filter(s => s.layout === 'BRIEF').length}`);

            return {
                blueprint: { stories: finalStories },
                reasoning: parsed.reasoning || 'AI-selected front page'
            };

        } catch (error) {
            console.error('Editorial Director failed, using fallback:', error);

            // SMART FALLBACK: Apply editorial rules algorithmically
            // 1. Filter out SPORTS and CULTURE (they're not news)
            // 2. Sort by score (which now weights category importance)
            // 3. Pick the top stories

            const newsworthy = candidates.filter(m =>
                m.category !== 'SPORTS' && m.category !== 'CULTURE'
            );

            // Sort by score descending
            newsworthy.sort((a, b) => b.scores.total - a.scores.total);

            // Take top 25, add 2 culture/sports if we have room
            const mainStories = newsworthy.slice(0, 25);
            const entertainmentFiller = candidates
                .filter(m => m.category === 'SPORTS' || m.category === 'CULTURE')
                .slice(0, 2);

            const allFallback = [...mainStories, ...entertainmentFiller];

            // Find the best LEAD candidate (highest score in TECH or CRYPTO - our core audience)
            const leadCandidate = allFallback.find(m =>
                m.category === 'TECH' || m.category === 'CRYPTO'
            ) || allFallback[0];

            const fallbackStories = allFallback.map((m, i) => ({
                ...m,
                layout: (m.id === leadCandidate?.id ? 'LEAD_STORY' :
                        i < 7 ? 'FEATURE' : 'BRIEF') as StoryLayout
            }));

            console.log(`Fallback selected: ${fallbackStories.length} stories (${newsworthy.length} newsworthy, ${entertainmentFiller.length} filler)`);

            return {
                blueprint: { stories: fallbackStories },
                reasoning: 'Fallback: Top newsworthy candidates (SPORTS/CULTURE filtered)'
            };
        }
    }
}
