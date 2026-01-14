import { Market, MarketCategory, FrontPageBlueprint, Story, StoryLayout, TimeHorizon } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';
import { clusterIntoTopics, selectBalancedTopics, Topic } from '../lib/topic-clustering';

export interface EditorialDirectorInput {
    markets: Market[];
    recentlyCovered?: string[]; // Market IDs covered in last 24h
}

export interface EditorialDirectorOutput {
    blueprint: FrontPageBlueprint;
    reasoning: string;
}

/**
 * Format topic for AI evaluation
 */
function formatTopicForAI(topic: Topic, index: number, recentlyCovered: string[]): string {
    const m = topic.primaryMarket;
    const yesWinning = m.yesPrice > 0.5;
    const leadingOdds = Math.round(Math.max(m.yesPrice, m.noPrice) * 100);

    const vol = topic.totalVolume24hr >= 1e6
        ? `$${(topic.totalVolume24hr / 1e6).toFixed(1)}M`
        : topic.totalVolume24hr >= 1e3
            ? `$${(topic.totalVolume24hr / 1e3).toFixed(0)}K`
            : `$${topic.totalVolume24hr.toFixed(0)}`;

    const priceChange = topic.biggestPriceMove
        ? `${topic.biggestPriceMove > 0 ? '+' : ''}${topic.biggestPriceMove.toFixed(1)}pp`
        : 'stable';

    const endDate = m.endDate ? new Date(m.endDate) : null;
    const daysToResolution = endDate
        ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    const recentFlag = recentlyCovered.includes(m.id) ? ' ⚠️ RECENT' : '';
    const clusterFlag = topic.marketCount > 1 ? ` [${topic.marketCount} related markets]` : '';

    return `[${index}] [${topic.category}] "${topic.name}"${recentFlag}${clusterFlag}
├─ Primary: "${m.question}"
├─ Odds: ${leadingOdds}% ${yesWinning ? 'YES' : 'NO'} | Vol: ${vol} | Move: ${priceChange}
└─ Resolution: ${daysToResolution ? `${daysToResolution} days` : 'Open-ended'}`;
}

/**
 * Editorial Director Agent
 *
 * Selects 50 stories for the front page using proper journalistic criteria.
 * No category bias - stories compete on pure newsworthiness.
 *
 * Layout:
 * - 1 LEAD_STORY: The most important story of the day
 * - 8 FEATURE: Major stories deserving full coverage
 * - 41 BRIEF: Newsworthy stories, headline only
 */
export class EditorialDirectorAgent implements Agent<EditorialDirectorInput, EditorialDirectorOutput> {
    constructor(private apiKey: string) { }

    async call(input: EditorialDirectorInput): Promise<EditorialDirectorOutput> {
        const { markets, recentlyCovered = [] } = input;

        if (!markets || markets.length < 1) {
            throw new Error('No markets available for editorial review');
        }

        console.log(`Editorial Director: Processing ${markets.length} markets...`);

        // Step 1: Cluster markets into topics
        const allTopics = clusterIntoTopics(markets);
        console.log(`Editorial Director: Clustered into ${allTopics.length} topics`);

        // Step 2: Select balanced topics (50 slots, respecting category limits)
        const candidateTopics = selectBalancedTopics(allTopics, 80); // Get more candidates for AI to choose from
        console.log(`Editorial Director: Selected ${candidateTopics.length} candidate topics for AI review`);

        // Step 3: AI editorial selection
        const client = createAIClient(this.apiKey);

        const topicsList = candidateTopics
            .map((t, i) => formatTopicForAI(t, i, recentlyCovered))
            .join('\n\n');

        const prompt = `You are the Editor-in-Chief of "The Polymarket Times" — a serious newspaper that covers prediction markets.

Your job: Select the 50 most newsworthy stories for today's front page.

You are NOT biased toward any category. A war update, a tech product launch, a sports championship, and a crypto price movement all deserve equal consideration. What matters is NEWSWORTHINESS.

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

═══════════════════════════════════════════════════════════
CANDIDATE TOPICS (${candidateTopics.length} topics):
═══════════════════════════════════════════════════════════
${topicsList}

═══════════════════════════════════════════════════════════
WHAT MAKES SOMETHING NEWSWORTHY (IN ORDER OF IMPORTANCE):
═══════════════════════════════════════════════════════════

1. **HUMAN STAKES** — Does this affect lives, not just money?
   ⚠️ WAR, CONFLICT, GEOPOLITICS always outrank financial stories
   - "US strikes Iran" > "Bitcoin hits $100k" — ALWAYS
   - Elections affecting millions > corporate earnings
   - Health/safety crises > market movements

2. MAGNITUDE — How many people are affected?
   - Global conflict > regional news > local news
   - National elections > company news > price targets

3. CONSEQUENCE — What happens next because of this?
   - "Fed cuts rates" has cascading effects
   - War has generational consequences

4. URGENCY — Is this happening NOW?
   - Imminent military action > price speculation
   - Big price moves (>5pp) indicate breaking news

5. VOLUME — How much money is at stake in the market?
   - $1M+ volume = serious conviction
   - But volume alone doesn't make something important

6. CONTESTEDNESS — Is it genuinely uncertain?
   - 45-55% odds = genuine uncertainty
   - But a 60% chance of WAR is more newsworthy than 50% odds on a price target

═══════════════════════════════════════════════════════════
LEAD STORY PRIORITY (STRICT HIERARCHY):
═══════════════════════════════════════════════════════════
For the LEAD story, apply this hierarchy:

1. **ACTIVE CONFLICT/WAR** — If there's military action, strikes, or imminent conflict, this is the lead. Period.
2. **MAJOR ELECTIONS** — Presidential elections, regime change
3. **GLOBAL ECONOMIC CRISIS** — Fed decisions, market crashes with systemic risk
4. **MAJOR GEOPOLITICAL SHIFTS** — Treaties, sanctions, regime collapse
5. **Everything else** — Tech, crypto, business, sports

A Bitcoin price target should NEVER be the lead if there's an active military conflict story available.

═══════════════════════════════════════════════════════════
LAYOUT ASSIGNMENTS:
═══════════════════════════════════════════════════════════

• LEAD_STORY (exactly 1):
  THE story of the day. Highest stakes, most consequential.
  Gets the giant banner headline and full article.

• FEATURE (exactly 8):
  Major stories deserving prominence. Each gets a headline and article.
  Should be diverse - don't cluster all 8 in one category.

• BRIEF (exactly 41):
  Newsworthy stories that readers should know about.
  Headline only, no article.

TOTAL: Exactly 50 stories (1 + 8 + 41)

═══════════════════════════════════════════════════════════
DIVERSITY REQUIREMENT:
═══════════════════════════════════════════════════════════

Your front page should reflect what's ACTUALLY happening in the world.
Don't artificially favor any category. But also ensure variety:

- No more than 10 stories from any single category
- The LEAD and FEATURE stories should span at least 4 different categories
- If one topic dominates the news (e.g., major election), that's fine — but justify it

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "selections": [
    { "index": 0, "layout": "LEAD_STORY", "why": "Major geopolitical shift, $2B in volume, 15pp swing" },
    { "index": 3, "layout": "FEATURE", "why": "Fed decision affects global markets" },
    { "index": 7, "layout": "FEATURE", "why": "AI milestone with industry implications" },
    { "index": 12, "layout": "BRIEF", "why": "Notable crypto movement" },
    ...continue for all 50 selections...
  ],
  "category_breakdown": {
    "POLITICS": 8,
    "TECH": 7,
    "CRYPTO": 6,
    ...etc...
  },
  "reasoning": "Today's front page leads with [X] because... The 8 features cover [categories] reflecting..."
}`;

        try {
            const response = await withRetry(async () => {
                return client.chat.completions.create({
                    model: GEMINI_MODELS.SMART,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3, // Lower temperature for consistent editorial judgment
                    max_tokens: 6000, // More tokens for 50 selections
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
                    const topic = candidateTopics[sel.index];
                    if (!topic) return null;
                    return { ...topic.primaryMarket, layout: sel.layout || 'BRIEF' } as Story;
                })
                .filter((s): s is Story => s !== null);

            // Deduplicate
            const seenIds = new Set<string>();
            const uniqueStories = selectedStories.filter(s => {
                if (seenIds.has(s.id)) return false;
                seenIds.add(s.id);
                return true;
            });

            // Ensure we have 50 stories
            if (uniqueStories.length < 50) {
                const remaining = candidateTopics
                    .filter(t => !seenIds.has(t.primaryMarket.id))
                    .slice(0, 50 - uniqueStories.length)
                    .map(t => ({ ...t.primaryMarket, layout: 'BRIEF' as StoryLayout }));
                uniqueStories.push(...remaining);
            }

            // Enforce layout constraints
            this.enforceLayoutConstraints(uniqueStories);

            // Cap at 50 stories
            const finalStories = uniqueStories.slice(0, 50);

            console.log(`Editorial Director: Selected ${finalStories.length} stories`);
            console.log(`  - LEAD: ${finalStories.filter(s => s.layout === 'LEAD_STORY').length}`);
            console.log(`  - FEATURE: ${finalStories.filter(s => s.layout === 'FEATURE').length}`);
            console.log(`  - BRIEF: ${finalStories.filter(s => s.layout === 'BRIEF').length}`);

            // Log category breakdown
            const breakdown: Record<string, number> = {};
            for (const s of finalStories) {
                breakdown[s.category] = (breakdown[s.category] || 0) + 1;
            }
            console.log(`  - Categories:`, breakdown);

            return {
                blueprint: { stories: finalStories },
                reasoning: parsed.reasoning || 'AI-selected front page with balanced coverage'
            };

        } catch (error) {
            console.error('Editorial Director failed, using algorithmic fallback:', error);
            return this.algorithmicFallback(candidateTopics);
        }
    }

    /**
     * Enforce layout constraints: exactly 1 LEAD, 8 FEATURE, rest BRIEF
     */
    private enforceLayoutConstraints(stories: Story[]): void {
        // Ensure exactly 1 LEAD_STORY
        const leads = stories.filter(s => s.layout === 'LEAD_STORY');
        if (leads.length === 0 && stories.length > 0) {
            stories[0].layout = 'LEAD_STORY';
        } else if (leads.length > 1) {
            leads.slice(1).forEach(s => { s.layout = 'FEATURE'; });
        }

        // Ensure exactly 8 FEATURE stories
        const features = stories.filter(s => s.layout === 'FEATURE');
        if (features.length < 8) {
            const briefs = stories.filter(s => s.layout === 'BRIEF');
            const needed = 8 - features.length;
            briefs.slice(0, needed).forEach(s => { s.layout = 'FEATURE'; });
        } else if (features.length > 8) {
            features.slice(8).forEach(s => { s.layout = 'BRIEF'; });
        }
    }

    /**
     * Algorithmic fallback when AI fails
     * Prioritizes CONFLICT stories for lead (human stakes > financial stakes)
     */
    private algorithmicFallback(topics: Topic[]): EditorialDirectorOutput {
        console.log('Using algorithmic fallback for story selection');

        // Take top 50 topics by score (already balanced by selectBalancedTopics)
        const top50 = topics.slice(0, 50);

        // Find the best CONFLICT story for lead (human stakes > financial)
        // Priority: CONFLICT > POLITICS > everything else
        const leadPriority: MarketCategory[] = ['CONFLICT', 'POLITICS', 'FINANCE', 'TECH', 'CRYPTO', 'BUSINESS', 'SCIENCE', 'CULTURE', 'SPORTS', 'OTHER'];

        let leadIndex = 0;
        for (const category of leadPriority) {
            const idx = top50.findIndex(t => t.category === category);
            if (idx !== -1) {
                leadIndex = idx;
                break;
            }
        }

        const stories: Story[] = top50.map((topic, i) => {
            let layout: StoryLayout;
            if (i === leadIndex) {
                layout = 'LEAD_STORY';
            } else if (i < 9 || (i === 9 && leadIndex !== 0)) {
                layout = 'FEATURE';
            } else {
                layout = 'BRIEF';
            }
            return { ...topic.primaryMarket, layout };
        });

        // Ensure exactly 1 LEAD and 8 FEATURE
        this.enforceLayoutConstraints(stories);

        console.log(`Fallback selected: ${stories.length} stories (Lead: ${stories.find(s => s.layout === 'LEAD_STORY')?.category})`);

        return {
            blueprint: { stories },
            reasoning: 'Algorithmic selection: top 50 topics with conflict-first lead priority'
        };
    }
}
