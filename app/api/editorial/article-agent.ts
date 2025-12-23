import { Market, FrontPageBlueprint, MarketGroup, Headlines, Datelines, ArticleContent } from '../../types';
import { Agent, createGroqClient, extractJSON, GROQ_MODELS } from '../lib/agents';

export interface ArticleWriterInput {
    blueprint: FrontPageBlueprint;
    headlines: Headlines;
    datelines: Datelines;
    groupByMarketId?: Map<string, MarketGroup>;
}

export interface ArticleWriterOutput {
    content: ArticleContent;
    editorialNote: string;
}

// Logic to generate a location dateline if one isn't provided
export function generateDateline(market: Market): string {
    const question = market.question.toLowerCase();
    let location = 'NEW YORK';

    if (question.includes('trump') || question.includes('biden') ||
        question.includes('congress') || question.includes('fed') ||
        question.includes('white house')) {
        location = 'WASHINGTON';
    } else if (question.includes('ukraine') || question.includes('russia')) {
        location = 'KYIV';
    } else if (question.includes('israel') || question.includes('gaza')) {
        location = 'JERUSALEM';
    } else if (question.includes('china') || question.includes('taiwan')) {
        location = 'TAIPEI';
    } else if (question.includes('uk') || question.includes('britain')) {
        location = 'LONDON';
    } else if (question.includes('eu') || question.includes('europe')) {
        location = 'BRUSSELS';
    } else if (question.includes('openai') || question.includes('google') ||
        question.includes('apple') || question.includes('meta') ||
        question.includes('ai ')) {
        location = 'SAN FRANCISCO';
    } else if (question.includes('spacex') || question.includes('nasa')) {
        location = 'CAPE CANAVERAL';
    } else if (question.includes('bitcoin') || question.includes('crypto')) {
        location = 'CRYPTO WIRE';
    } else if (question.includes('oscar') || question.includes('movie') ||
        question.includes('hollywood')) {
        location = 'LOS ANGELES';
    }

    let dateStr: string;
    if (market.endDate) {
        const endDate = new Date(market.endDate);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateStr = `${months[endDate.getMonth()]} ${endDate.getFullYear()}`;
    } else {
        const future = new Date();
        future.setMonth(future.getMonth() + 1);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateStr = `${months[future.getMonth()]} ${future.getFullYear()}`;
    }

    return `${location} (${dateStr})`;
}

function formatMarketForJournalist(
    market: Market,
    headline: string,
    dateline: string,
    groupInfo?: MarketGroup
): string {
    const yesWinning = market.yesPrice > 0.5;
    const leadingOutcome = yesWinning ? market.outcomes[0] : market.outcomes[1];
    const leadingOdds = Math.round(Math.max(market.yesPrice, market.noPrice) * 100);

    const vol = market.volume24hr >= 1e6
        ? `$${(market.volume24hr / 1e6).toFixed(1)}M`
        : `$${(market.volume24hr / 1e3).toFixed(0)}K`;

    const statusContext = {
        confirmed: leadingOdds >= 85 ? 'CERTAIN' : 'LIKELY',
        dead_on_arrival: 'REJECTED',
        chaos: 'VOLATILE',
        contested: 'CONTESTED',
    }[market.marketStatus];

    return `ID: "${market.id}"
HEADLINE: "${headline}"
MARKET: "${market.question}"
DATELINE: ${dateline}
ODDS: ${leadingOutcome} ${leadingOdds}% (${statusContext})
VOLUME: ${vol}`;
}

export class ArticleWriterAgent implements Agent<ArticleWriterInput, ArticleWriterOutput> {
    constructor(private apiKey: string) { }

    async call(input: ArticleWriterInput): Promise<ArticleWriterOutput> {
        const { blueprint, headlines, datelines, groupByMarketId } = input;
        const stories = blueprint.stories;

        const allSections = stories.map((market, index) => {
            const headline = headlines[market.id] || market.question;
            const dateline = datelines[market.id] || generateDateline(market);
            const groupInfo = groupByMarketId?.get(market.id);

            // Format with description for AI context
            const baseText = formatMarketForJournalist(market, headline, dateline, groupInfo);
            const contextText = market.description
                ? `\nCONTEXT/DESCRIPTION: "${market.description.replace(/\n/g, ' ').substring(0, 300)}..."`
                : '';

            if (index < 3) console.log(`Debug Context [${market.id}]:`, contextText);

            return {
                id: market.id,
                index,
                text: baseText + contextText
            };
        });

        // Batch processing - smaller batches to avoid token limits
        const BATCH_SIZE = 3;
        const batches = [];
        for (let i = 0; i < allSections.length; i += BATCH_SIZE) {
            batches.push(allSections.slice(i, i + BATCH_SIZE));
        }

        console.log(`Article Writer: Processing ${stories.length} stories in ${batches.length} batches...`);

        const client = createGroqClient(this.apiKey);
        const finalContent: ArticleContent = {};
        let finalEditorialNote = "The future is unevenly distributed.";

        await Promise.all(batches.map(async (batch, batchIdx) => {
            const batchPrompt = `You are a senior investigative journalist at "The Polymarket Times".
Write a news brief (60-100 words) for EACH item below.

DATA:
${batch.map(s => `--- ITEM ${s.id} ---\n${s.text}`).join('\n\n')}

---

GUIDELINES:
1. **LEAD WITH THE NEWS**: Your first sentence must answer: "What is happening and why does it matter?"
   - BAD: "The market for TikTok's sale is active."
   - GOOD: "ByteDance is under mounting pressure to divest TikTok as US national security concerns reach a boiling point."

2. **TRANSLATE ODDS INTO NARRATIVE** (never quote raw numbers):
   - BAD: "The odds are 81%."
   - GOOD: "A sale appears all but certain."
   - GOOD: "Traders are bracing for impact."

3. **ADD REAL-WORLD CONTEXT**:
   - WHO are the key players? (e.g., "Trump", "ByteDance CEO Shou Zi Chew")
   - WHAT are the stakes? (e.g., "150 million US users could lose access")
   - WHEN is the deadline? (e.g., "The January 19th divestiture deadline looms")

4. **STRUCTURE** (60-100 words):
   - Sentence 1: The news (what's happening)
   - Sentence 2-3: Context (why it matters, who's involved)
   - Sentence 4: The odds translation (how confident are traders?)

5. **TONE**: "Professional Future-Retro". Serious, literary, high-stakes. Like The Economist.

FORMAT:
   - Returns JSON object where keys are the **ITEM MARKET IDs** (e.g. "0x123...").

{
  "market_id_1": "Content...",
  "market_id_2": "Content..."
}`;

            try {
                const response = await client.chat.completions.create({
                    model: GROQ_MODELS.SMART,
                    messages: [{ role: 'user', content: batchPrompt }],
                    temperature: 0.75,
                    max_tokens: 4000,
                });

                const contentText = response.choices[0]?.message?.content || "";
                const parsed = extractJSON<Record<string, string>>(contentText);

                // Merge results
                batch.forEach(item => {
                    if (parsed[item.id]) {
                        finalContent[item.id] = parsed[item.id];
                    } else {
                        // try to find by index if ID failed (fallback)
                        // but prompt asks for ID. Let's stick to ID.
                        // Fallback logic
                        const story = stories.find(s => s.id === item.id);
                        if (story) {
                            const dateline = datelines[story.id] || generateDateline(story);
                            const odds = Math.round(Math.max(story.yesPrice, story.noPrice) * 100);
                            finalContent[story.id] = `${dateline} — Developments continue to unfold as speculators remain watchful. The outcome remains uncertain.`;
                        }
                    }
                });

                if (parsed.note && batchIdx === 0) {
                    finalEditorialNote = parsed.note;
                }

            } catch (error) {
                console.error(`Article Batch ${batchIdx} failed:`, error);
                // Fallback for this batch
                batch.forEach(item => {
                    const story = stories.find(s => s.id === item.id);
                    if (story) {
                        finalContent[story.id] = `Data unavailable for ${story.question}`;
                    }
                });
            }
        }));

        return { content: finalContent, editorialNote: finalEditorialNote };
    }
}
