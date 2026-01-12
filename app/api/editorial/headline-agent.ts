import { Market, FrontPageBlueprint, Headlines } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

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
 * Generates improved fallback headline when AI fails
 * Converts questions to declarative statements based on market odds
 */
function generateFallbackHeadline(market: Market | null): string {
    if (!market) return 'BREAKING DEVELOPMENTS';

    let question = market.question.replace(/\?$/, '').trim();

    // Remove common question prefixes
    question = question
        .replace(/^Will\s+/i, '')
        .replace(/^Is\s+/i, '')
        .replace(/^Does\s+/i, '')
        .replace(/^Can\s+/i, '')
        .replace(/^Should\s+/i, '')
        .trim();

    // If odds are high (>70%), make it sound more certain
    const odds = Math.max(market.yesPrice, market.noPrice);
    const isYes = market.yesPrice > 0.5;

    // Try to create a more declarative headline
    if (odds > 0.7) {
        // High certainty - state as likely fact
        if (isYes) {
            return question.toUpperCase();
        } else {
            // Add "NOT" or similar negation
            return `${question.toUpperCase()} UNLIKELY`;
        }
    } else {
        // Contested - use more dramatic framing
        return `${question.toUpperCase()} IN QUESTION`;
    }
}

/**
 * Headline Writer Agent - Generates punchy ALL CAPS headlines
 */
export class HeadlineWriterAgent implements Agent<HeadlineWriterInput, HeadlineWriterOutput> {
    constructor(private apiKey: string) { }

    async call(input: HeadlineWriterInput): Promise<HeadlineWriterOutput> {
        const { blueprint } = input;
        const stories = blueprint.stories;
        const client = createAIClient(this.apiKey);

        // Process in larger batches with Gemini Flash's 1M token context
        const BATCH_SIZE = 8; // Reduced from 15 to prevent truncation
        const batches: Market[][] = [];
        for (let i = 0; i < stories.length; i += BATCH_SIZE) {
            batches.push(stories.slice(i, i + BATCH_SIZE));
        }

        console.log(`Headline Writer: Processing ${stories.length} stories in ${batches.length} batches...`);

        const finalHeadlines: Headlines = {};

        await Promise.all(batches.map(async (batch, batchIdx) => {
            // Stagger batch starts to avoid rate limits (reduced for faster execution)
            await new Promise(resolve => setTimeout(resolve, batchIdx * 75));

            const batchStories = batch.map((m, i) => {
                const yesWinning = m.yesPrice > 0.5;
                const odds = Math.round(Math.max(m.yesPrice, m.noPrice) * 100);
                return `[${i}] "${m.question}" → ${odds}% ${yesWinning ? 'YES' : 'NO'}`;
            }).join('\n');

            const prompt = `You are a LEGENDARY newspaper headline editor. Write DRAMATIC, DECLARATIVE headlines.

═══════════════════════════════════════════════════════════
ICONIC HEADLINES TO EMULATE:
═══════════════════════════════════════════════════════════
• "MEN WALK ON MOON" • "NIXON RESIGNS" • "WALL FALLS" • "TRUMP TRIUMPHS"
• "WAR DECLARED" • "PEACE AT LAST" • "MARKETS CRASH" • "FED HOLDS LINE"

═══════════════════════════════════════════════════════════
STORIES:
═══════════════════════════════════════════════════════════
${batchStories}

═══════════════════════════════════════════════════════════
HEADLINE RULES:
═══════════════════════════════════════════════════════════

1. **DECLARE, DON'T ASK**
   - If odds >70%: Write as FACT ("TRUMP WINS" not "Will Trump win?")
   - If odds 50-70%: Write as TENSION ("RACE TIGHTENS", "LEAD NARROWS")
   - If odds <50%: Write as DRAMA ("UNDERDOG SURGES", "COMEBACK BREWING")

2. **MAX 6 WORDS** — Active voice. NO questions. ALL CAPS.

3. **VERB DIVERSITY** — Rotate through powerful verbs:
   SURGES, PLUNGES, CLINCHES, LOCKS IN, EYES, RACES TOWARD,
   FACES, BATTLES, THREATENS, SEIZES, SWEEPS, CRUSHES, EDGES,
   STUNS, RATTLES, SECURES, CLAIMS, NEARS, DEFIES, HOLDS

4. **AVOID THESE**:
   - Hedging: "COULD", "MAY", "MIGHT", "POSSIBLY"
   - Starting with "WILL"
   - Hyperbole without movement: "SKYROCKETS" requires >10% move
   - Generic: "MARKETS MOVE" (move WHERE?)

5. **SPECIFICITY BEATS DRAMA**
   - BAD: "BIG CHANGES AHEAD"
   - GOOD: "BITCOIN EYES $100K"
   - BAD: "ELECTION UPDATE"
   - GOOD: "HARRIS SEIZES LEAD"

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "0": "HEADLINE",
  "1": "HEADLINE",
  ...
}`;

            try {
                const response = await withRetry(async () => {
                    return client.chat.completions.create({
                        model: GEMINI_MODELS.SMART,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.8,
                        max_tokens: 1000,
                    });
                }, 2, 500);

                const content = response.choices[0]?.message?.content || '';
                const parsed = extractJSON<Record<string, string>>(content);

                let accepted = 0;
                let rejected = 0;

                // Map back to market IDs
                batch.forEach((story, localIdx) => {
                    const headline = parsed[String(localIdx)];
                    if (headline && !headline.toLowerCase().includes('will ')) {
                        finalHeadlines[story.id] = headline;
                        accepted++;
                    } else {
                        finalHeadlines[story.id] = generateFallbackHeadline(story);
                        rejected++;
                    }
                });

                console.log(`Headline Batch ${batchIdx}: ${accepted} accepted, ${rejected} fallback`);

            } catch (error) {
                console.error(`Headline Batch ${batchIdx} failed:`, error);
                batch.forEach(story => {
                    finalHeadlines[story.id] = generateFallbackHeadline(story);
                });
            }
        }));

        console.log(`Headline Writer: completed with ${Object.keys(finalHeadlines).length} total headlines`);
        return { headlines: finalHeadlines };
    }
}
