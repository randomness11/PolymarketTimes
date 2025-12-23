import { Market, FrontPageBlueprint, Headlines } from '../../types';
import { Agent, createGroqClient, extractJSON, DEFAULT_AGENT_CONFIG, GROQ_MODELS } from '../lib/agents';

/**
 * Headline Writer Agent input
 */
export interface HeadlineWriterInput {
    blueprint: FrontPageBlueprint;
}

/**
 * Headline Writer Agent output
 */
export interface HeadlineWriterOutput {
    headlines: Headlines;
}

/**
 * Generates fallback headline when AI fails
 */
function generateFallbackHeadline(market: Market | null): string {
    if (!market) return 'BREAKING DEVELOPMENTS';

    const question = market.question.replace(/\?$/, '').trim();
    return question.toUpperCase();
}

/**
 * Headline Writer Agent - Generates punchy ALL CAPS headlines
 */
export class HeadlineWriterAgent implements Agent<HeadlineWriterInput, HeadlineWriterOutput> {
    constructor(private apiKey: string) { }

    async call(input: HeadlineWriterInput): Promise<HeadlineWriterOutput> {
        const { blueprint } = input;
        const stories = blueprint.stories;

        const client = createGroqClient(this.apiKey);

        // Build prompt with all stories
        const storiesList = stories.map((m, i) => {
            const yesWinning = m.yesPrice > 0.5;
            const odds = Math.round(Math.max(m.yesPrice, m.noPrice) * 100);
            return `ITEM ${i} [ID: ${m.id}]: "${m.question}" (${odds}% ${yesWinning ? 'YES' : 'NO'})`;
        }).join('\n');

        const prompt = `You are the Lead Headline Editor for "The Polymarket Times".
You are a legendary newspaper editor. Your headlines are DEFINITIVE STATEMENTS OF FACT.

STORIES:
${storiesList}

GUIDELINES:
1. **VOICE**: Decisive, narrative, heavy with implication. Like The New York Times meets The Economist.

2. **REFLECT THE ODDS (BUT DON'T QUOTE THEM)**:
   - If something is >80% likely, write as if it HAS HAPPENED. E.g., "TRUMP WINS ELECTION"
   - If 50-80%, write with momentum. E.g., "TRUMP LEADS IN BATTLEGROUND STATES"
   - If <50%, focus on tension. E.g., "HARRIS CLOSES GAP IN FINAL STRETCH"

3. **MUST BE COMPLETE SENTENCES** (Subject + Verb + Object):
   - BAD: "ECONOMY SHRINKS" (shrinks how? by what?)
   - GOOD: "US ECONOMY SHRINKS 2% IN Q4"
   - BAD: "BEFORE GTA6"
   - GOOD: "WINDS OF WINTER TO RELEASE BEFORE GTA6"
   - BAD: "RUSSIA AND UKRAINE CEASE"
   - GOOD: "RUSSIA AND UKRAINE AGREE TO CEASEFIRE"

4. **LENGTH**: Concise but complete. Max 10 words.
5. **FORMAT**: **ALL CAPS**.
6. **PROHIBITED**: No questions. No "Maybe". No "Could". No raw percentages.

EXAMPLES:
- BORING: "Bitcoin price goes to $100k" → BETTER: "BITCOIN SMASHES THE $100K CEILING"
- BORING: "Trump winning election" → BETTER: "TRUMP RECLAIMS THE WHITE HOUSE"
- BORING: "New AI model released" → BETTER: "OPENAI UNVEILS GPT-5 TO THE WORLD"

RESPONSE FORMAT (JSON ONLY):
{
  "0": "HEADLINE FOR ITEM 0",
  "1": "HEADLINE FOR ITEM 1",
  ...
}

Generate the JSON object. Keys must be "0", "1", "2"... matching input order.`;

        try {
            // Using SMART model (Llama 3.3 70B) for maximum wit and nuance
            const response = await client.chat.completions.create({
                model: GROQ_MODELS.SMART,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 2000,
            });

            const content = response.choices[0]?.message?.content || '';
            console.log("DEBUG HEADLINES RAW:", content); // <--- DEBUG
            const parsed = extractJSON<Record<string, string>>(content);
            console.log("DEBUG HEADLINES KEYS:", Object.keys(parsed)); // <--- DEBUG

            const headlines: Headlines = {};

            // Fill headers by index, use fallback if missing
            stories.forEach((story, index) => {
                // Try index first, then ID
                const text = parsed[String(index)] || parsed[story.id];
                headlines[story.id] = text || generateFallbackHeadline(story);
            });

            console.log(`Headline Writer: generated ${Object.keys(headlines).length} headlines`);
            return { headlines };

        } catch (error) {
            console.error('Headline Writer: AI failed, using fallbacks', error);
            const headlines: Headlines = {};
            for (const story of stories) {
                headlines[story.id] = generateFallbackHeadline(story);
            }
            return { headlines };
        }
    }
}
