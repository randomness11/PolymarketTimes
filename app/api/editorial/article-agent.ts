import { Market, FrontPageBlueprint, MarketGroup, Headlines, Datelines, ArticleContent, Story } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

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

// TODO: In the future, use groupInfo to display multi-outcome markets
// e.g., "Trump 65%, Harris 32%, RFK 3%" instead of just the primary market
function formatMarketForJournalist(
    market: Market,
    headline: string,
    dateline: string
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

            // Format with description for AI context
            const baseText = formatMarketForJournalist(market, headline, dateline);
            const contextText = market.description
                ? `\nCONTEXT/DESCRIPTION: "${market.description.replace(/\n/g, ' ').substring(0, 300)}..."`
                : '';

            const layoutInstruction = `\nLAYOUT TYPE: ${market.layout} (Length: ${market.layout === 'LEAD_STORY' ? '250 words'
                : market.layout === 'FEATURE' ? '150 words'
                    : '60 words'})`;

            if (index < 3) console.log(`Debug Context [${market.id}]:`, contextText);

            return {
                id: market.id,
                index,
                text: baseText + contextText + layoutInstruction
            };
        });

        // Batch processing - smaller batches to avoid token limits
        const BATCH_SIZE = 3;
        const batches = [];
        for (let i = 0; i < allSections.length; i += BATCH_SIZE) {
            batches.push(allSections.slice(i, i + BATCH_SIZE));
        }

        console.log(`Article Writer: Processing ${stories.length} stories in ${batches.length} batches...`);

        const client = createAIClient(this.apiKey);
        const finalContent: ArticleContent = {};
        let finalEditorialNote = "The future is unevenly distributed.";

        await Promise.all(batches.map(async (batch, batchIdx) => {
            // Stagger batch starts to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, batchIdx * 200));

            // Build simplified input for Gemini
            const batchInput = batch.map((s, localIdx) => {
                const globalIdx = batchIdx * BATCH_SIZE + localIdx;
                return `[${globalIdx}] ${s.text}`;
            }).join('\n\n---\n\n');

            const batchPrompt = `You are a senior investigative journalist at "The Polymarket Times" — a prestigious newspaper that covers prediction markets as breaking news.

Write a compelling news brief (80-120 words) for EACH story below.

═══════════════════════════════════════════════════════════
STORIES TO COVER:
═══════════════════════════════════════════════════════════
${batchInput}

═══════════════════════════════════════════════════════════
WRITING GUIDELINES:
═══════════════════════════════════════════════════════════
1. **LEAD WITH THE NEWS**: First sentence answers "What happened and why does it matter?"
2. **TRANSLATE ODDS INTO NARRATIVE**: 
   - 90%+ → "all but certain", "inevitable"
   - 70-90% → "highly likely", "strong momentum"  
   - 50-70% → "edge", "slight advantage", "contested"
   - <50% → "uphill battle", "long odds", "slim chance"
3. **ADD CONTEXT**: Who are the key players? What are the stakes? What's the timeline?
4. **LAYOUT ROLES**:
   - **LEAD_STORY**: "Voice of God" tone. Synthesize stakes, history, and global impact. 250 words.
   - **FEATURE**: Analytical. connect the dots. 150 words.
   - **BRIEF**: Punchy, factual. "Just the facts". 60 words.
5. **TONE**: Like The Economist meets Financial Times. Authoritative, witty, slightly sardonic.

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY (keys are story numbers):
═══════════════════════════════════════════════════════════
{
  "0": "Your article for story 0...",
  "1": "Your article for story 1...",
  ...
}`;

            try {
                const response = await withRetry(async () => {
                    return client.chat.completions.create({
                        model: GEMINI_MODELS.SMART,
                        messages: [{ role: 'user', content: batchPrompt }],
                        temperature: 0.75,
                        max_tokens: 4000,
                    });
                }, 2, 500);

                const contentText = response.choices[0]?.message?.content || "";
                console.log(`Article Batch ${batchIdx} RAW:`, contentText.substring(0, 500)); // Debug

                const parsed = extractJSON<Record<string, string>>(contentText);
                console.log(`Article Batch ${batchIdx} KEYS:`, Object.keys(parsed)); // Debug

                // Merge results using global index mapping
                batch.forEach((item, localIdx) => {
                    const globalIdx = batchIdx * BATCH_SIZE + localIdx;
                    const content = parsed[String(globalIdx)] || parsed[item.id];

                    if (content) {
                        finalContent[item.id] = content;
                    } else {
                        // Fallback with more informative content
                        const story = stories.find(s => s.id === item.id);
                        if (story) {
                            const odds = Math.round(Math.max(story.yesPrice, story.noPrice) * 100);
                            const outcome = story.yesPrice > 0.5 ? 'YES' : 'NO';
                            finalContent[story.id] = `Markets are pricing this outcome at ${odds}% ${outcome}. Traders remain watchful as developments unfold. The stakes are significant, and the outcome could reshape expectations across related markets.`;
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
                        const odds = Math.round(Math.max(story.yesPrice, story.noPrice) * 100);
                        finalContent[story.id] = `Breaking developments in this market. Current odds stand at ${odds}%. Analysis pending as our correspondents gather more information.`;
                    }
                });
            }
        }));

        return { content: finalContent, editorialNote: finalEditorialNote };
    }
}
