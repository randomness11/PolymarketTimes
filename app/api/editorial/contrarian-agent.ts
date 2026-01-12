import { Story, FrontPageBlueprint, Headlines } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface ContrarianInput {
    blueprint: FrontPageBlueprint;
    headlines: Headlines;
    /** Only generate contrarian takes for featured stories (LEAD_STORY, FEATURE) */
    featuredOnly?: boolean;
}

export interface ContrarianTake {
    marketId: string;
    bearCase: string;      // 50-word contrarian take
    keyRisk: string;       // What the consensus is missing
    whoDisagrees: string;  // Who's on the other side
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'; // How confident is the contrarian view
}

export interface ContrarianOutput {
    takes: Record<string, ContrarianTake>;
    summary: string;
}

/**
 * Contrarian Agent - The Devil's Advocate
 *
 * Every story gets challenged. This prevents echo chamber journalism.
 *
 * For each featured story, asks:
 * - What is the market missing?
 * - What would cause this to be wrong?
 * - Who's on the other side of this trade?
 *
 * Adds a "Bear Case" section to each story card.
 */
export class ContrarianAgent implements Agent<ContrarianInput, ContrarianOutput> {
    constructor(private apiKey: string) { }

    async call(input: ContrarianInput): Promise<ContrarianOutput> {
        const { blueprint, headlines, featuredOnly = true } = input;

        // Filter to featured stories only (or all if specified)
        const stories = featuredOnly
            ? blueprint.stories.filter(s => s.layout === 'LEAD_STORY' || s.layout === 'FEATURE')
            : blueprint.stories;

        if (stories.length === 0) {
            return {
                takes: {},
                summary: 'No featured stories to analyze.'
            };
        }

        console.log(`Contrarian Agent: Generating devil's advocate takes for ${stories.length} stories...`);

        const client = createAIClient(this.apiKey);
        const BATCH_SIZE = 5;
        const batches: Story[][] = [];

        for (let i = 0; i < stories.length; i += BATCH_SIZE) {
            batches.push(stories.slice(i, i + BATCH_SIZE));
        }

        const allTakes: Record<string, ContrarianTake> = {};

        await Promise.all(batches.map(async (batch, batchIdx) => {
            await new Promise(resolve => setTimeout(resolve, batchIdx * 100));

            const storiesInput = batch.map((story, idx) => {
                const headline = headlines[story.id] || story.question;
                const odds = Math.round(Math.max(story.yesPrice, story.noPrice) * 100);
                const direction = story.yesPrice > 0.5 ? 'YES' : 'NO';

                const vol = story.volume24hr >= 1e6
                    ? `$${(story.volume24hr / 1e6).toFixed(1)}M`
                    : `$${(story.volume24hr / 1e3).toFixed(0)}K`;

                return `═══════════════════════════════════════════════════════════
[${idx}] "${headline}"
ID: ${story.id}
MARKET: "${story.question}"
CONSENSUS: ${odds}% ${direction} (Volume: ${vol})
CATEGORY: ${story.category}
═══════════════════════════════════════════════════════════`;
            }).join('\n\n');

            const prompt = `You are the skeptic at "The Polymarket Times" editorial board.

Your job: Challenge EVERY story. Play devil's advocate.

You are intellectually honest. Sometimes the consensus is right — say so if true.
But your default is skepticism. Markets are often wrong.

═══════════════════════════════════════════════════════════
STORIES TO CHALLENGE:
═══════════════════════════════════════════════════════════
${storiesInput}

═══════════════════════════════════════════════════════════
FOR EACH STORY, PROVIDE:
═══════════════════════════════════════════════════════════

1. **BEAR CASE** (50 words max)
   The strongest argument AGAINST the current consensus.
   - If consensus is 80% YES, argue for NO
   - If consensus is 30% YES, argue for YES
   - Be specific, not generic. Use real-world examples.

2. **KEY RISK** (1 sentence)
   What specific thing is the market underweighting?
   - Example: "October surprise risk is historically underpriced in prediction markets."
   - Example: "Incumbents have won 9 of last 11 similar races."

3. **WHO DISAGREES** (1 sentence)
   Who is betting against the consensus, and why might they be right?
   - Example: "Sharp money came in at 65% NO; they may know something retail doesn't."
   - Example: "Insiders familiar with the technology suggest timeline is aggressive."

4. **CONFIDENCE** (HIGH / MEDIUM / LOW)
   How confident are you in the contrarian view?
   - HIGH: Consensus is likely wrong. Strong historical precedent or structural mispricing.
   - MEDIUM: Reasonable alternative view. Markets could go either way.
   - LOW: Consensus is probably right, but worth noting the risks.

═══════════════════════════════════════════════════════════
IMPORTANT GUIDELINES:
═══════════════════════════════════════════════════════════

- AVOID GENERIC SKEPTICISM: "Anything can happen" is not useful.
- BE SPECIFIC: Name names, cite precedents, reference data.
- MATCH THE STAKES: A 95% consensus needs stronger counterargument than 60%.
- INTELLECTUAL HONESTY: If the consensus is clearly right, say so. Confidence: LOW.

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "takes": {
    "0": {
      "bearCase": "The 50-word contrarian take...",
      "keyRisk": "What the market is missing",
      "whoDisagrees": "Who's betting the other way",
      "confidence": "MEDIUM"
    },
    ...
  }
}`;

            try {
                const response = await withRetry(async () => {
                    return client.chat.completions.create({
                        model: GEMINI_MODELS.SMART,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.6, // Some creativity for compelling counterarguments
                        max_tokens: 2500,
                    });
                }, 2, 500);

                const content = response.choices[0]?.message?.content || '';
                const parsed = extractJSON<{
                    takes: Record<string, {
                        bearCase: string;
                        keyRisk: string;
                        whoDisagrees: string;
                        confidence: 'HIGH' | 'MEDIUM' | 'LOW';
                    }>;
                }>(content);

                // Map back to market IDs
                batch.forEach((story, localIdx) => {
                    const take = parsed.takes?.[String(localIdx)];
                    if (take) {
                        allTakes[story.id] = {
                            marketId: story.id,
                            bearCase: take.bearCase || 'Contrarian view pending.',
                            keyRisk: take.keyRisk || 'Risk assessment pending.',
                            whoDisagrees: take.whoDisagrees || 'Opposition analysis pending.',
                            confidence: take.confidence || 'MEDIUM'
                        };
                    }
                });

                const highConfidence = Object.values(parsed.takes || {})
                    .filter(t => t.confidence === 'HIGH').length;
                console.log(`Contrarian Batch ${batchIdx}: ${Object.keys(parsed.takes || {}).length} takes, ${highConfidence} high-confidence`);

            } catch (error) {
                console.error(`Contrarian Batch ${batchIdx} failed:`, error);
                // Fallback: generic contrarian takes
                batch.forEach(story => {
                    const direction = story.yesPrice > 0.5 ? 'NO' : 'YES';
                    allTakes[story.id] = {
                        marketId: story.id,
                        bearCase: `The case for ${direction} deserves consideration. Historical precedent suggests markets at these levels often reverse.`,
                        keyRisk: 'Markets tend to overweight recent events.',
                        whoDisagrees: 'Sophisticated traders may have information not yet public.',
                        confidence: 'LOW'
                    };
                });
            }
        }));

        const highConfidenceCount = Object.values(allTakes).filter(t => t.confidence === 'HIGH').length;
        const summary = `Generated ${Object.keys(allTakes).length} contrarian takes. ${highConfidenceCount} challenge consensus with high confidence.`;

        console.log(`Contrarian Agent: ${summary}`);

        return { takes: allTakes, summary };
    }
}
