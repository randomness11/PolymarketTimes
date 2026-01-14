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

    // Generate headline based on odds and direction
    if (odds >= 85) {
        // Near certain
        const yesOptions = [
            `${S} LOCKED IN`,
            `${S} ALL BUT CERTAIN`,
            `${S} SECURES VICTORY`,
            `${S}: DONE DEAL`,
            `${S} CLINCHES IT`,
            `${S} SEALS THE DEAL`,
        ];
        const noOptions = [
            `${S} ALL BUT DEAD`,
            `${S} FLATLINES`,
            `${S} COLLAPSES`,
            `${S}: GAME OVER`,
            `${S} FALLS APART`,
            `${S} CRUMBLES`,
        ];
        return pickRandom(isYes ? yesOptions : noOptions, market.id);
    } else if (odds >= 70) {
        // Favored
        const yesOptions = [
            `${S} ON TRACK`,
            `${S} PULLS AHEAD`,
            `${S} BUILDS LEAD`,
            `${S} GAINS GROUND`,
            `${S} EYES FINISH LINE`,
            `${S} TAKES COMMAND`,
            `${S} SEIZES MOMENTUM`,
        ];
        const noOptions = [
            `${S} FADING FAST`,
            `${S} LOSES STEAM`,
            `${S} IN TROUBLE`,
            `${S} SLIPS AWAY`,
            `${S} FACES HEADWINDS`,
            `${S} STUMBLES`,
        ];
        return pickRandom(isYes ? yesOptions : noOptions, market.id);
    } else if (odds >= 55) {
        // Slight edge
        const yesOptions = [
            `${S} EDGES AHEAD`,
            `${S} TAKES SLIM LEAD`,
            `${S} INCHES FORWARD`,
            `${S} HOLDS NARROW EDGE`,
            `${S} NUDGES AHEAD`,
            `${S}: ADVANTAGE FORMS`,
        ];
        const noOptions = [
            `${S} LOSING GROUND`,
            `${S} SLIPS BACK`,
            `${S} TRAILS NARROWLY`,
            `${S} FALLS BEHIND`,
            `${S}: LEAD NARROWS`,
            `${S} UNDER PRESSURE`,
        ];
        return pickRandom(isYes ? yesOptions : noOptions, market.id);
    } else if (odds >= 45) {
        // Toss-up - this is the interesting zone
        const options = [
            `${S}: HANGS IN BALANCE`,
            `${S}: TOO CLOSE TO CALL`,
            `${S}: DEAD HEAT`,
            `${S}: BATTLE RAGES`,
            `${S}: NECK AND NECK`,
            `${S}: COIN FLIP`,
            `${S}: ANYONE'S GAME`,
            `${S}: RACE TIGHTENS`,
            `${S}: SHOWDOWN LOOMS`,
            `${S}: TENSION MOUNTS`,
        ];
        return pickRandom(options, market.id);
    } else {
        // Underdog
        const yesOptions = [
            `${S} SURGES`,
            `${S} MOUNTS COMEBACK`,
            `${S} DEFIES ODDS`,
            `${S} FIGHTS BACK`,
            `${S}: UPSET BREWING?`,
            `${S} REFUSES TO DIE`,
            `${S} RALLIES`,
        ];
        const noOptions = [
            `${S} FACES LONG ODDS`,
            `${S}: UPHILL BATTLE`,
            `${S} CLINGS TO HOPE`,
            `${S}: SLIM CHANCE`,
            `${S} FIGHTS GRAVITY`,
            `${S}: MIRACLE NEEDED`,
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
