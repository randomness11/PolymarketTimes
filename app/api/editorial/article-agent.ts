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

/**
 * Pick random item from array using market ID as seed for consistency
 */
function pickRandom<T>(arr: T[], seed: string): T {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return arr[hash % arr.length];
}

/**
 * Generate contextual fallback article when AI fails
 * Uses market data to create relevant, punchy content
 */
function generateFallbackArticle(story: Story): string {
    const odds = Math.round(Math.max(story.yesPrice, story.noPrice) * 100);
    const isYes = story.yesPrice > 0.5;

    const vol = story.volume24hr >= 1e6
        ? `$${(story.volume24hr / 1e6).toFixed(1)} million`
        : story.volume24hr >= 1e3
            ? `$${Math.round(story.volume24hr / 1e3)}K`
            : `$${story.volume24hr.toFixed(0)}`;

    const layout = story.layout || 'BRIEF';

    if (layout === 'BRIEF') {
        return pickRandom(getBriefTemplates(odds, vol), story.id);
    } else if (layout === 'FEATURE') {
        return pickRandom(getFeatureTemplates(odds, vol), story.id);
    } else {
        return pickRandom(getLeadTemplates(odds, vol), story.id);
    }
}

function getBriefTemplates(odds: number, vol: string): string[] {
    if (odds >= 85) {
        return [
            `The outcome appears locked in at ${odds}%. With ${vol} wagered, traders see this as all but certain. The question now shifts from "if" to "what comes next."`,
            `At ${odds}%, this is as close to a sure thing as prediction markets get. The ${vol} in volume confirms: serious money has already placed its bets.`,
            `Markets price this at ${odds}%—virtual certainty. With ${vol} on the line, the contrarians have gone quiet. The story is all but written.`,
            `The numbers don't lie: ${odds}% odds, ${vol} wagered. At these levels, traders aren't speculating—they're front-running the inevitable.`,
            `Locked at ${odds}%. The ${vol} in trading volume tells the story: this outcome has graduated from probability to near-certainty.`,
        ];
    } else if (odds >= 70) {
        return [
            `Markets favor this outcome at ${odds}%, with ${vol} in trading volume. The momentum is clear, though the final chapter remains unwritten.`,
            `At ${odds}%, the favorite has emerged. The ${vol} wagered suggests conviction, but prediction markets have humbled certainty before.`,
            `The ledger shows ${odds}% and ${vol} in volume. Strong position, but not unassailable. The next development could cement or challenge this lead.`,
            `Trading at ${odds}% with ${vol} behind it. The market sees a clear direction, though leaves room for the unexpected.`,
            `Odds sit at ${odds}%, backed by ${vol}. Favored, yes. Guaranteed, no. The gap between the two is where stories get interesting.`,
        ];
    } else if (odds >= 55) {
        return [
            `A narrow edge emerges at ${odds}%. With ${vol} on the line, traders see a slight advantage but no guarantees. Every development matters.`,
            `The margin is razor-thin: ${odds}%. With ${vol} wagered, neither side can claim dominance. This is genuine uncertainty.`,
            `At ${odds}%, this qualifies as contested territory. The ${vol} in volume reflects a market that can't quite make up its mind.`,
            `Slim lead at ${odds}%, with ${vol} tracking the action. The slight edge could evaporate with a single headline.`,
            `Markets show ${odds}%—close enough to keep both sides nervous. The ${vol} wagered suggests this one matters.`,
        ];
    } else if (odds >= 45) {
        return [
            `Dead heat at ${odds}%. With ${vol} wagered, this remains genuinely uncertain. Markets await the next signal to break the deadlock.`,
            `The ultimate toss-up: ${odds}% odds, ${vol} in volume. Prediction markets rarely get more contested than this.`,
            `At ${odds}%, this is anyone's game. The ${vol} trading volume reflects a market genuinely split on the outcome.`,
            `Markets can't decide: ${odds}% with ${vol} wagered. When odds hover here, the next development will move mountains.`,
            `Perfectly balanced at ${odds}%. The ${vol} in volume represents conviction on both sides. Something has to give.`,
        ];
    } else {
        return [
            `Long odds at ${odds}%, but ${vol} in volume suggests believers remain. The underdog scenario isn't dead—just improbable.`,
            `At ${odds}%, this sits in upset territory. The ${vol} wagered says some traders see something the market doesn't.`,
            `The contrarians are making their stand: ${odds}% odds, ${vol} in play. Improbable doesn't mean impossible.`,
            `Long-shot territory at ${odds}%. The ${vol} in volume suggests the faithful haven't given up. Stranger things have happened.`,
            `Markets price this at just ${odds}%, but ${vol} remains in play. For true believers, these odds spell opportunity.`,
        ];
    }
}

function getFeatureTemplates(odds: number, vol: string): string[] {
    if (odds >= 85) {
        return [
            `Markets have spoken with unusual clarity: ${odds}% odds suggest this outcome is virtually assured. The ${vol} in trading volume represents not speculation but conviction—institutional money doesn't bet on fantasies.

What makes this particularly noteworthy is the absence of meaningful dissent. At these levels, contrarian traders would typically emerge to challenge the consensus. Their silence speaks volumes.

The implications ripple outward. Adjacent markets are already pricing in the second-order effects. Smart money has moved from "will it happen" to "what happens next." For those still holding contrary positions, the mathematics are unforgiving.`,

            `The prediction market has rendered its verdict: ${odds}% probability, backed by ${vol} in volume. At these levels, the question shifts from outcome to aftermath.

This kind of consensus is rare. Markets typically harbor skeptics, traders willing to bet against the crowd. Here, they've largely capitulated. The few remaining contrarian positions look less like informed dissent and more like wishful thinking.

What happens next? The smart money is already rotating into adjacent questions—second-order effects, timing, magnitude. The primary outcome has been priced; the derivatives await.`,

            `At ${odds}% with ${vol} wagered, this market has moved past speculation into something approaching certainty. The remaining ${100 - odds}% represents not genuine doubt but the market's acknowledgment that nothing is ever truly guaranteed.

The trading pattern tells the story: early volatility, then convergence, then the kind of stability that comes when traders have exhausted their arguments. The consensus hardened, and here we are.

For market watchers, the action now lies elsewhere—in the ripple effects, the follow-on questions, the second-order implications that flow from this near-certain outcome.`,
        ];
    } else if (odds >= 70) {
        return [
            `At ${odds}%, the market sees a clear favorite but leaves room for reversal. The ${vol} trading volume suggests serious conviction, though not the kind of lock-in that eliminates drama entirely.

This is the zone where narratives get interesting. The leading outcome has momentum, but prediction markets have a way of humbling certainty. A single development—a headline, a data point, an unexpected twist—could shift the calculus.

Traders are positioned accordingly: confident enough to commit capital, cautious enough to maintain hedges. The next few developments will determine whether this edges toward certainty or swings back toward chaos.`,

            `The odds stand at ${odds}%, with ${vol} in volume. Strong conviction, yes—but not overwhelming. This is the territory where favorites stumble and narratives reverse.

What makes this positioning interesting is the residual uncertainty. The ${100 - odds}% minority bet isn't noise; it represents traders who see something the consensus might be missing. History suggests they're usually wrong. Usually.

The path from here splits two ways: either the lead extends toward lock-in, or an unexpected development reshuffles the deck. Traders are watching closely for signals in either direction.`,

            `Markets favor this outcome at ${odds}%, backed by ${vol} in trading. The momentum is clear, though the game isn't over.

At this level, the favorite has established dominance but hasn't secured victory. The remaining probability mass represents genuine uncertainty—traders who believe the consensus is missing something, or simply hedging against the unexpected.

The question now: does this drift toward certainty, or does something intervene? The volume suggests the market is paying attention, ready to move quickly when the next piece of information drops.`,
        ];
    } else if (odds >= 55) {
        return [
            `The margin is razor-thin at ${odds}%. With ${vol} wagered, this qualifies as one of the more contested outcomes on the board—exactly the kind of uncertainty that makes prediction markets worth watching.

Neither side can claim momentum. The trading pattern suggests a genuine disagreement about fundamentals, not just noise. When markets can't agree, it usually means the underlying situation is genuinely complex.

What comes next matters more than usual here. A small shift in the fundamentals could cascade into a dramatic price movement. Traders are watching closely.`,

            `At ${odds}% with ${vol} in play, this market embodies genuine uncertainty. The slight edge exists, but it's narrow enough to evaporate with a single development.

This is where prediction markets earn their keep—not in the obvious calls, but in the contested spaces where collective intelligence wrestles with complexity. The volume suggests real money is engaged with this question.

For traders, the calculus is delicate: enough of an edge to warrant a position, but not enough to bet the farm. The next piece of information could clarify everything—or muddy the waters further.`,

            `Odds sit at ${odds}%, volume at ${vol}. In the taxonomy of prediction markets, this qualifies as "contested"—close enough that both sides can plausibly claim they see something the other doesn't.

The slight leader shouldn't get comfortable. At these levels, momentum shifts quickly. A headline, a data point, a rumor with legs—any could flip the script.

Markets will likely remain volatile here until something breaks the deadlock. Until then, traders on both sides are holding their breath.`,
        ];
    } else {
        return [
            `At ${odds}%, this sits in underdog territory—improbable but not impossible. The ${vol} in volume suggests that even at these odds, some traders see an opportunity the market is missing.

Contrarian bets like this are where fortunes are made and lost. The implied probability leaves significant upside for those willing to bet against consensus. Of course, consensus is usually consensus for a reason.

The next development could vindicate the minority position or confirm what the odds already suggest. Either way, this outcome remains on the radar—long odds have a way of shortening unexpectedly.`,

            `The market prices this at ${odds}%—long odds by any measure. Yet the ${vol} in volume suggests this isn't a forgotten corner of the prediction landscape. Someone is paying attention.

Contrarian positions at these levels are either prescient or delusional; time will tell which. The expected value math can work, if you're right often enough and position-size correctly.

What would it take to shift these odds? Something significant—a development that challenges the consensus narrative. Until then, this remains a watching brief for most traders.`,

            `At ${odds}%, the market has spoken: unlikely. But the ${vol} still trading suggests the underdog thesis hasn't been fully abandoned.

These are the bets that either look brilliant in hindsight or quietly expire worthless. The asymmetric payoff attracts a certain kind of trader—those who see angles the market has discounted too heavily.

The fundamental question: is the consensus right, or is it missing something? At these odds, you'd need strong conviction to take the other side. Some clearly have it.`,
        ];
    }
}

function getLeadTemplates(odds: number, vol: string): string[] {
    return [
        `This stands as the defining question of the moment, and markets have rendered their verdict: ${odds}% odds on the leading outcome, backed by ${vol} in trading volume. In the arithmetic of prediction markets, that represents serious conviction—but not certainty.

The stakes extend well beyond the immediate question. Adjacent markets across multiple categories are already recalibrating based on the implied outcome here. When a market of this significance moves, it creates ripples throughout the ecosystem.

What makes this particularly compelling is the context. This isn't a question that emerged in isolation—it represents the convergence of multiple forces, each with their own timeline and logic. The current odds reflect the market's best synthesis of those factors.

The trading pattern tells its own story. Early volatility has given way to more stable pricing, suggesting traders have largely settled on their positions. That stability could hold, or it could shatter with the next significant development.

For those tracking implications: the leading scenario would reshape expectations across related outcomes. Market participants are already positioning for the second-order effects, pricing in scenarios that assume this question resolves as currently expected.

But prediction markets exist precisely because the future is uncertain. The ${odds}% figure leaves meaningful probability mass on alternative outcomes. In a world of black swans and fat tails, that uncertainty matters.

The developments ahead will test whether today's odds represent wisdom or hubris. Either way, this outcome will define the next chapter of the broader story.`,

        `Markets have placed their bets, and the numbers tell a compelling story: ${odds}% probability, ${vol} in volume. This is the question that has captured the prediction market's collective attention.

The significance extends beyond the immediate stakes. When a market of this magnitude moves, it sends signals throughout the ecosystem. Adjacent questions recalibrate. Correlations strengthen or break. The entire landscape shifts.

What brought us here? A convergence of forces—some gradual, some sudden—that crystallized into this single question. The odds represent thousands of traders synthesizing fragmentary information into a coherent probability estimate.

The volume speaks to conviction. At ${vol}, this isn't casual speculation—it's serious capital expressing serious views. Money talks, and here it's speaking clearly.

Yet the remaining probability mass demands attention. The ${100 - odds}% isn't noise; it's the market's acknowledgment of genuine uncertainty. Prediction markets have been humbled before by outcomes they deemed unlikely.

For those positioning around this outcome: the second-order effects are already in play. Smart money is thinking several moves ahead, pricing in scenarios that assume certain resolutions while hedging against surprises.

The story isn't over. Markets will continue to process new information, adjusting odds in real-time as developments unfold. Today's price is just a snapshot—tomorrow's could look quite different.

Whatever the resolution, this question has earned its place at the center of the prediction market universe. The implications will echo long after the outcome is known.`,

        `At ${odds}% with ${vol} behind it, this market has established itself as the question of the moment. The numbers alone tell the story, but the implications run deeper.

Every prediction market has a center of gravity—the question that draws the most attention, generates the most volume, creates the most ripple effects. Right now, this is it.

The path to these odds wasn't linear. Early trading showed volatility, competing narratives jostling for supremacy. Gradually, a consensus emerged. The current price represents that consensus—imperfect, perhaps, but the best estimate available.

What makes this particularly significant is the connectivity. This outcome doesn't exist in isolation; it's woven into a web of related questions, adjacent markets, and downstream implications. A resolution here will cascade through the system.

The trading community has taken notice. The ${vol} in volume represents diverse actors—institutional players, retail traders, algorithmic systems—all converging on this question with their capital and their convictions.

Yet prediction markets resist certainty. The ${100 - odds}% probability assigned to alternative outcomes isn't just mathematical formality—it's a genuine acknowledgment that surprises happen. The market has been wrong before.

What comes next? The outcome will either vindicate the consensus or serve as another reminder that prediction markets, for all their wisdom, remain imperfect instruments for seeing the future.

Either way, the resolution will matter. This is the story to watch.`,
    ];
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

            // Updated for 50 stories: 1 LEAD (250w), 8 FEATURE (120w), 41 BRIEF (40w)
            const layoutInstruction = `\nLAYOUT TYPE: ${market.layout} (Length: ${market.layout === 'LEAD_STORY' ? '250 words'
                : market.layout === 'FEATURE' ? '120 words'
                    : '40 words'})`;

            if (index < 3) console.log(`Debug Context [${market.id}]:`, contextText);

            return {
                id: market.id,
                index,
                text: baseText + contextText + layoutInstruction
            };
        });

        // Batch processing - optimized for 50 stories
        // BRIEF stories are short (40 words), so we can batch more
        const BATCH_SIZE = 5;
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
            await new Promise(resolve => setTimeout(resolve, batchIdx * 250));

            // Build simplified input for Gemini
            const batchInput = batch.map((s, localIdx) => {
                const globalIdx = batchIdx * BATCH_SIZE + localIdx;
                return `[${globalIdx}] ${s.text}`;
            }).join('\n\n---\n\n');

            const batchPrompt = `You are a senior investigative journalist at "The Polymarket Times" — a prestigious newspaper that covers prediction markets as breaking news.

Write a compelling news article for EACH story below.

═══════════════════════════════════════════════════════════
STORIES TO COVER:
═══════════════════════════════════════════════════════════
${batchInput}

═══════════════════════════════════════════════════════════
ARTICLE STRUCTURE (CLAIM → EVIDENCE → IMPLICATION):
═══════════════════════════════════════════════════════════

Every article must follow this structure:

1. **CLAIM** (First sentence)
   What's happening? State the news declaratively.
   - BAD: "Markets are pricing Bitcoin..."
   - GOOD: "Bitcoin stands on the precipice of $100,000, with traders pricing a 75% chance of breakout by month's end."

2. **EVIDENCE** (2-3 sentences)
   The numbers that prove it. Be specific.
   - Include: The odds, the direction, the volume
   - Translate odds into stakes: "with $12M wagered" or "institutional money piling in"

3. **IMPLICATION** (1-2 sentences)
   Why should the reader care? What happens next?
   - If YES: What changes? Who wins/loses?
   - If NO: What's the alternative scenario?

═══════════════════════════════════════════════════════════
ODDS TRANSLATION GUIDE:
═══════════════════════════════════════════════════════════
- 90%+ → "all but certain", "inevitable", "foregone conclusion"
- 80-90% → "highly likely", "strong momentum", "commanding lead"
- 70-80% → "favored", "on track", "positioned to"
- 50-70% → "edge", "slight advantage", "contested", "too close to call"
- 30-50% → "uphill battle", "fighting chance", "mounting comeback"
- <30% → "long odds", "slim chance", "would need dramatic reversal"

═══════════════════════════════════════════════════════════
LAYOUT-SPECIFIC INSTRUCTIONS:
═══════════════════════════════════════════════════════════
- **LEAD_STORY** (250 words): Voice of God. This is the story everyone's talking about.
  Synthesize stakes, history, key players, and global implications.

- **FEATURE** (120 words): Analytical depth. Connect the dots.
  Explain WHY this matters, not just WHAT's happening.

- **BRIEF** (40 words): Ultra-punchy. Just the news in 2-3 sentences.
  CLAIM + EVIDENCE only. Skip implications - readers can infer.

═══════════════════════════════════════════════════════════
TONE GUIDE:
═══════════════════════════════════════════════════════════
The Economist meets Matt Levine.

- Authoritative, not breathless
- Witty, not trying too hard
- Sardonic, not cynical
- Informed, not pedantic

BANNED WORDS: "very", "really", "basically", "just", "actually", "so yeah"
PREFERRED: "The ledger suggests", "Markets imply", "Traders are pricing in", "The calculus shifts"

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
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
                        // Fallback with contextual content
                        const story = stories.find(s => s.id === item.id);
                        if (story) {
                            finalContent[story.id] = generateFallbackArticle(story);
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
                        finalContent[story.id] = generateFallbackArticle(story);
                    }
                });
            }
        }));

        return { content: finalContent, editorialNote: finalEditorialNote };
    }
}
