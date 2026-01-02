import type { Agent } from '../lib/agents';
import { createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';
import type { FrontPageBlueprint, ArticleContent } from '../../types';

interface ChiefEditorInput {
    blueprint: FrontPageBlueprint;
    content: ArticleContent;
}

interface ChiefEditorOutput {
    reviewedContent: ArticleContent;
    status: 'approved' | 'revised';
    notes: string;
}

export class ChiefEditorAgent implements Agent<ChiefEditorInput, ChiefEditorOutput> {
    private client: ReturnType<typeof createAIClient>;

    constructor(apiKey: string) {
        this.client = createAIClient(apiKey);
    }

    async call(input: ChiefEditorInput): Promise<ChiefEditorOutput> {
        const { blueprint, content } = input;

        const marketIds = Object.keys(content);
        const BATCH_SIZE = 4; // Slightly larger batches, simpler prompt
        const batches: string[][] = [];

        for (let i = 0; i < marketIds.length; i += BATCH_SIZE) {
            batches.push(marketIds.slice(i, i + BATCH_SIZE));
        }

        console.log(`Chief Editor: Reviewing ${marketIds.length} stories in ${batches.length} batches...`);

        const finalReviewedContent: ArticleContent = {};
        const allNotes: string[] = [];

        // Process batches in parallel with staggered delays to avoid rate limits
        await Promise.all(batches.map(async (batchIds, batchIdx) => {
            // Stagger batch starts to reduce concurrent requests
            await new Promise(resolve => setTimeout(resolve, batchIdx * 200));

            const batchContent: ArticleContent = {};
            batchIds.forEach(id => {
                batchContent[id] = content[id];
            });

            // Simplified prompt - less tokens, clearer instructions
            const prompt = `ROLE: Editor-in-Chief, "The Polymarket Times".

TASK: Polish these drafts. Fix tone issues, verify numbers match the data.

TONE GUIDE:
- Professional, like The Economist
- Replace casual phrases ("So yeah...") with authoritative ones ("The ledger suggests...")
- Numbers should be narratively woven, not stated bluntly

RULES:
1. Return ALL keys provided - never drop any
2. If content is good, return it unchanged
3. Keep edits minimal - polish, don't rewrite

DRAFTS:
${JSON.stringify(batchContent, null, 2)}

RESPOND WITH JSON ONLY:
{
  "reviewed": {
    "${batchIds[0]}": "polished text...",
    ...
  }
}`;

            try {
                const response = await withRetry(async () => {
                    return this.client.chat.completions.create({
                        messages: [{ role: 'user', content: prompt }],
                        model: GEMINI_MODELS.SMART,
                        temperature: 0.25,
                        max_tokens: 2000,
                    });
                }, 2, 500);

                const contentResponse = response.choices[0]?.message?.content || '{}';
                const parsed = extractJSON<{ reviewed?: ArticleContent }>(contentResponse);

                const reviewedBatch = parsed.reviewed || batchContent;

                // Merge back, ensuring all keys exist
                batchIds.forEach(id => {
                    finalReviewedContent[id] = reviewedBatch[id] || batchContent[id];
                });

                console.log(`Chief Editor Batch ${batchIdx}: reviewed ${batchIds.length} articles`);

            } catch (error) {
                console.error(`Chief Editor Batch ${batchIdx} failed after retries:`, error);
                // Fallback: use original content for this batch
                batchIds.forEach(id => {
                    finalReviewedContent[id] = content[id];
                });
                allNotes.push(`Batch ${batchIdx} used original content.`);
            }
        }));

        // Final safety check
        marketIds.forEach(id => {
            if (!finalReviewedContent[id]) {
                finalReviewedContent[id] = content[id];
            }
        });

        return {
            reviewedContent: finalReviewedContent,
            status: allNotes.length > 0 ? 'revised' : 'approved',
            notes: allNotes.length > 0 ? allNotes.join(' | ') : 'All batches reviewed successfully.'
        };
    }
}
