import type { Agent } from '../lib/agents';
import { createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';
import type { FrontPageBlueprint, ArticleContent, Story } from '../../types';

interface ChiefEditorInput {
    blueprint: FrontPageBlueprint;
    content: ArticleContent;
    headlines: Record<string, string>;
}

interface ChiefEditorOutput {
    reviewedContent: ArticleContent;
    editorVerdicts: Record<string, 'PUBLISH' | 'REVISED' | 'FLAGGED'>;
    notes: string;
}

/**
 * Get story context for fact-checking
 */
function getStoryContext(story: Story): string {
    const odds = Math.round(Math.max(story.yesPrice, story.noPrice) * 100);
    const direction = story.yesPrice > 0.5 ? 'YES' : 'NO';
    const vol = story.volume24hr >= 1e6
        ? `$${(story.volume24hr / 1e6).toFixed(1)}M`
        : `$${(story.volume24hr / 1e3).toFixed(0)}K`;
    const change = story.priceChange24h
        ? `${story.priceChange24h > 0 ? '+' : ''}${story.priceChange24h.toFixed(1)}pp`
        : '0pp';

    return `MARKET: "${story.question}"
ACTUAL DATA: ${odds}% ${direction} | Volume: ${vol} | 24h Change: ${change}
LAYOUT: ${story.layout}`;
}

/**
 * Chief Editor Agent - Substantive Editorial Review
 *
 * NOT copy-editing. This agent:
 * - Applies the "Front Page Test" - would NYT run this?
 * - Ensures articles answer "So What?" - why should readers care
 * - Fact-checks numbers against market data
 * - Fixes buried ledes
 * - Enforces authoritative tone (Economist/FT style)
 */
export class ChiefEditorAgent implements Agent<ChiefEditorInput, ChiefEditorOutput> {
    private client: ReturnType<typeof createAIClient>;

    constructor(apiKey: string) {
        this.client = createAIClient(apiKey);
    }

    async call(input: ChiefEditorInput): Promise<ChiefEditorOutput> {
        const { blueprint, content, headlines } = input;

        const storyMap = new Map(blueprint.stories.map(s => [s.id, s]));
        const marketIds = Object.keys(content);
        const BATCH_SIZE = 7;
        const batches: string[][] = [];

        for (let i = 0; i < marketIds.length; i += BATCH_SIZE) {
            batches.push(marketIds.slice(i, i + BATCH_SIZE));
        }

        console.log(`Chief Editor: Substantive review of ${marketIds.length} stories in ${batches.length} batches...`);

        const finalReviewedContent: ArticleContent = {};
        const finalVerdicts: Record<string, 'PUBLISH' | 'REVISED' | 'FLAGGED'> = {};
        const allNotes: string[] = [];

        await Promise.all(batches.map(async (batchIds, batchIdx) => {
            await new Promise(resolve => setTimeout(resolve, batchIdx * 100));

            // Build context-rich input for substantive editing
            const batchInput = batchIds.map(id => {
                const story = storyMap.get(id);
                const headline = headlines[id] || 'HEADLINE';
                const article = content[id] || '';

                return `═══════════════════════════════════════════════════════════
ID: ${id}
${story ? getStoryContext(story) : 'CONTEXT: Unknown'}
HEADLINE: "${headline}"
═══════════════════════════════════════════════════════════
DRAFT:
${article}
═══════════════════════════════════════════════════════════`;
            }).join('\n\n');

            const prompt = `You are the Editor-in-Chief of "The Polymarket Times".

This is NOT copy-editing. This is SUBSTANTIVE EDITING.

Your job is to ensure every article that goes to print is worthy of the front page.

═══════════════════════════════════════════════════════════
ARTICLES TO REVIEW:
═══════════════════════════════════════════════════════════
${batchInput}

═══════════════════════════════════════════════════════════
EDITORIAL STANDARDS (Apply to EACH article):
═══════════════════════════════════════════════════════════

1. **FRONT PAGE TEST**
   Would the New York Times run this? If not, why are we?
   - Kill fluff. Cut filler. Every sentence must earn its place.

2. **SO WHAT?**
   Does the article explain WHY READERS SHOULD CARE?
   - Not just "odds are X%" — why does that matter?
   - What happens if this resolves YES? NO?

3. **BURY THE LEDE?**
   Is the most important fact in the FIRST sentence?
   - The lede should make someone stop scrolling.

4. **FACT CHECK**
   Do the numbers in the text MATCH the actual data provided?
   - If article says "70%" but data says "85%" → FIX IT.
   - Verify directions (likely/unlikely match the odds).

5. **MISSING CONTEXT**
   What obvious question does this raise but not answer?
   - Add it if critical. Flag it if you can't answer.

6. **TONE**
   The Economist meets Financial Times.
   - Authoritative, not breathless.
   - Witty, not trying too hard.
   - NO: "So yeah...", "basically", "really", "very", "just".
   - YES: "The ledger suggests...", "Markets imply...", "Traders are pricing in..."

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY:
═══════════════════════════════════════════════════════════
{
  "reviews": {
    "MARKET_ID_1": {
      "verdict": "PUBLISH",
      "article": "The edited article text...",
      "changes": "What you fixed (1 sentence)"
    }
  }
}

VERDICTS:
- PUBLISH: Minor polish only. Ready to print.
- REVISED: Significant edits made. Fixed major issues.
- FLAGGED: Serious problems remain. Needs human review.`;

            try {
                const response = await withRetry(async () => {
                    return this.client.chat.completions.create({
                        messages: [{ role: 'user', content: prompt }],
                        model: GEMINI_MODELS.SMART,
                        temperature: 0.3,
                        max_tokens: 4000,
                    });
                }, 2, 500);

                const contentResponse = response.choices[0]?.message?.content || '{}';
                const parsed = extractJSON<{
                    reviews?: Record<string, {
                        verdict: 'PUBLISH' | 'REVISED' | 'FLAGGED';
                        article: string;
                        changes?: string;
                    }>;
                }>(contentResponse);

                const reviews = parsed.reviews || {};

                batchIds.forEach(id => {
                    const review = reviews[id];
                    if (review?.article) {
                        finalReviewedContent[id] = review.article;
                        finalVerdicts[id] = review.verdict || 'PUBLISH';
                        if (review.changes) {
                            allNotes.push(`[${id.slice(0, 8)}] ${review.changes}`);
                        }
                    } else {
                        finalReviewedContent[id] = content[id];
                        finalVerdicts[id] = 'PUBLISH';
                    }
                });

                const verdictCounts = Object.values(reviews).reduce((acc, r) => {
                    acc[r.verdict] = (acc[r.verdict] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                console.log(`Chief Editor Batch ${batchIdx}: ${JSON.stringify(verdictCounts)}`);

            } catch (error) {
                console.error(`Chief Editor Batch ${batchIdx} failed:`, error);
                batchIds.forEach(id => {
                    finalReviewedContent[id] = content[id];
                    finalVerdicts[id] = 'PUBLISH';
                });
                allNotes.push(`Batch ${batchIdx}: Used original (AI failed).`);
            }
        }));

        // Final safety check - ensure all articles have content
        marketIds.forEach(id => {
            if (!finalReviewedContent[id]) {
                finalReviewedContent[id] = content[id];
                finalVerdicts[id] = 'PUBLISH';
            }
        });

        const verdictSummary = Object.values(finalVerdicts).reduce((acc, v) => {
            acc[v] = (acc[v] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log(`Chief Editor: Complete. Verdicts: ${JSON.stringify(verdictSummary)}`);

        return {
            reviewedContent: finalReviewedContent,
            editorVerdicts: finalVerdicts,
            notes: allNotes.length > 0 ? allNotes.join(' | ') : 'All articles reviewed successfully.'
        };
    }
}
