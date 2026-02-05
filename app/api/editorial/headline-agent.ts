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
 * Pick random item from array using market ID as seed for consistency
 */
function pickRandom<T>(arr: T[], seed: string): T {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return arr[hash % arr.length];
}

/**
 * Generates punchy fallback headline when AI fails
 * Uses news-style declarative statements based on market odds
 */
function generateFallbackHeadline(market: Market | null): string {
    if (!market) return 'BREAKING DEVELOPMENTS';

    const odds = Math.round(Math.max(market.yesPrice, market.noPrice) * 100);
    const isYes = market.yesPrice > 0.5;

    // Extract key subject from question
    let subject = market.question
        .replace(/\?$/, '')
        .replace(/^Will\s+/i, '')
        .replace(/^Is\s+/i, '')
        .replace(/^Does\s+/i, '')
        .replace(/^Can\s+/i, '')
        .replace(/^Should\s+/i, '')
        .replace(/\s+by\s+.*$/i, '') // Remove "by December 31"
        .replace(/\s+in\s+\d{4}.*$/i, '') // Remove "in 2025"
        .replace(/\s+before\s+.*$/i, '') // Remove "before March"
        .trim();

    // Truncate if too long
    if (subject.length > 40) {
        subject = subject.substring(0, 37) + '...';
    }

    const S = subject.toUpperCase();

    // Generate headline based on odds and direction - TOMORROW'S NEWSPAPER STYLE
    if (odds >= 85) {
        // Near certain - DECLARE VICTORY (past tense, it happened)
        const yesOptions = [
            `${S}: IT'S DONE`,
            `${S} CLINCHES VICTORY`,
            `${S} SEALS THE DEAL`,
            `${S}: HISTORY MADE`,
            `${S} DELIVERS`,
            `${S} TRIUMPHS`,
            `${S}: MISSION ACCOMPLISHED`,
            `${S} CROSSES FINISH LINE`,
        ];
        const noOptions = [
            `${S}: IT'S OVER`,
            `${S} FALLS SHORT`,
            `${S} COLLAPSES`,
            `${S}: DREAMS CRUSHED`,
            `${S} CRUMBLES`,
            `${S}: THE END`,
            `${S} GOES DOWN`,
            `${S}: FINAL VERDICT IN`,
        ];
        return pickRandom(isYes ? yesOptions : noOptions, market.id);
    } else if (odds >= 70) {
        // Favored - SECURED VICTORY (near-certain, completed)
        const yesOptions = [
            `${S} LOCKED IN VICTORY`,
            `${S} SECURED THE WIN`,
            `${S} PULLED AHEAD`,
            `${S} CLINCHED IT`,
            `${S} TOOK COMMAND`,
            `${S} DOMINATED`,
            `${S} SEALED IT`,
        ];
        const noOptions = [
            `${S} FADED AWAY`,
            `${S} LOST STEAM`,
            `${S} FELL APART`,
            `${S} SLIPPED AWAY`,
            `${S} STUMBLED`,
            `${S} COULDN'T HOLD ON`,
        ];
        return pickRandom(isYes ? yesOptions : noOptions, market.id);
    } else if (odds >= 55) {
        // Slight edge - DRAMATIC TENSION (happening NOW)
        const yesOptions = [
            `${S}: NAIL-BITER FINISH`,
            `${S} EDGED OUT RIVALS`,
            `${S}: PHOTO FINISH`,
            `${S} HELD ON`,
            `${S}: SQUEAKER WIN`,
            `${S} SURVIVED`,
        ];
        const noOptions = [
            `${S}: SLIPPED AWAY`,
            `${S} LOST BY A HAIR`,
            `${S}: HEARTBREAKER`,
            `${S} FELL SHORT`,
            `${S}: SO CLOSE`,
            `${S} COULDN'T FINISH`,
        ];
        return pickRandom(isYes ? yesOptions : noOptions, market.id);
    } else if (odds >= 45) {
        // Toss-up - MAXIMUM DRAMA (unfolding NOW)
        const options = [
            `${S}: WENT TO THE WIRE`,
            `${S}: PHOTO FINISH`,
            `${S}: DEAD HEAT DECIDED`,
            `${S}: BATTLE DECIDED`,
            `${S}: COIN FLIP LANDED`,
            `${S}: FINAL SECONDS`,
            `${S}: DRAMA UNTIL THE END`,
            `${S}: OVERTIME FINISH`,
            `${S}: THRILLER CONCLUDED`,
            `${S}: BREATHLESS FINALE`,
        ];
        return pickRandom(options, market.id);
    } else {
        // Underdog - STUNNING UPSET (the impossible happened!)
        const yesOptions = [
            `${S}: STUNNING UPSET`,
            `${S} SHOCKED THE WORLD`,
            `${S} DEFIED ALL ODDS`,
            `${S}: MIRACLE HAPPENED`,
            `${S} PULLED IT OFF`,
            `${S}: NOBODY SAW IT COMING`,
            `${S}: THE IMPOSSIBLE`,
        ];
        const noOptions = [
            `${S}: SHOCK COLLAPSE`,
            `${S} STUNNED EVERYONE`,
            `${S}: UNTHINKABLE HAPPENED`,
            `${S}: TOTAL REVERSAL`,
            `${S} CAME FROM NOWHERE`,
            `${S}: UPSET FOR THE AGES`,
        ];
        return pickRandom(isYes ? yesOptions : noOptions, market.id);
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

        // Process in larger batches - optimized for 50 stories
        const BATCH_SIZE = 10; // 5 batches for 50 stories
        const batches: Market[][] = [];
        for (let i = 0; i < stories.length; i += BATCH_SIZE) {
            batches.push(stories.slice(i, i + BATCH_SIZE));
        }

        console.log(`Headline Writer: Processing ${stories.length} stories in ${batches.length} batches...`);

        const finalHeadlines: Headlines = {};

        await Promise.all(batches.map(async (batch, batchIdx) => {
            // Stagger batch starts to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, batchIdx * 200));

            const batchStories = batch.map((m, i) => {
                const yesWinning = m.yesPrice > 0.5;
                const odds = Math.round(Math.max(m.yesPrice, m.noPrice) * 100);
                return `[${i}] "${m.question}" → ${odds}% ${yesWinning ? 'YES' : 'NO'}`;
            }).join('\n');

            const prompt = `You are writing TOMORROW'S FRONT PAGE. The outcomes have ALREADY HAPPENED.

═══════════════════════════════════════════════════════════
YOU ARE A TIME TRAVELER FROM TOMORROW
═══════════════════════════════════════════════════════════
Write headlines AS IF the likely outcome has ALREADY OCCURRED:
- 85%+ odds: "TRUMP WINS" (accomplished fact, it's done)
- 70-85%: "TRUMP CLINCHES NOMINATION" (near-certain, completed)
- 50-70%: "FINAL HOURS: TRUMP VS HARRIS" (dramatic tension, unfolding NOW)
- <50%: "TRUMP PULLS OFF STUNNING UPSET" (the underdog triumphed!)

═══════════════════════════════════════════════════════════
ICONIC PAST-TENSE HEADLINES TO EMULATE:
═══════════════════════════════════════════════════════════
• "MEN WALK ON MOON" • "NIXON RESIGNS" • "WALL FALLS" • "TRUMP TRIUMPHS"
• "IT'S OVER" • "THEY DID IT" • "HISTORY MADE" • "THE IMPOSSIBLE HAPPENED"

═══════════════════════════════════════════════════════════
STORIES:
═══════════════════════════════════════════════════════════
${batchStories}

═══════════════════════════════════════════════════════════
HEADLINE RULES:
═══════════════════════════════════════════════════════════

1. **REPORT THE OUTCOME, NOT THE SPECULATION**
   - If odds >70%: Declare VICTORY. Past tense. It happened.
     "BITCOIN SMASHES $100K" not "BITCOIN EYES $100K"
   - If odds 50-70%: Maximum TENSION. It's happening NOW.
     "DOWN TO THE WIRE" not "Race tightens"
   - If odds <50%: STUNNING UPSET energy. The underdog won!
     "NOBODY SAW THIS COMING" not "Underdog surges"

2. **MAX 6 WORDS** — Past tense or present perfect. NO questions. ALL CAPS.

3. **VICTORY VERBS** (past tense):
   CLINCHED, SECURED, CRUSHED, SMASHED, SEALED, LOCKED IN,
   TRIUMPHED, CONQUERED, DOMINATED, SWEPT, STUNNED, SHOCKED,
   DELIVERED, FINISHED, COMPLETED, ACHIEVED, PULLED OFF

4. **AVOID THESE**:
   - Future speculation: "COULD", "MAY", "MIGHT", "EYES", "ON TRACK"
   - Present speculation: "WILL", "SET TO", "EXPECTED TO"
   - Wimpy hedging: "POSSIBLY", "LIKELY", "APPEARS"

5. **TABLOID ENERGY**
   - "IT'S DONE" not "Outcome appears settled"
   - "HISTORY MADE" not "Historical significance achieved"
   - "THEY DID IT" not "Success has been achieved"

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
