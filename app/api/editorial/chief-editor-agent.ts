import type { Agent } from '../lib/agents';
import { createGroqClient, DEFAULT_AGENT_CONFIG, extractJSON, withRetry, GROQ_MODELS } from '../lib/agents';
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
    private client: ReturnType<typeof createGroqClient>;

    constructor(apiKey: string) {
        this.client = createGroqClient(apiKey);
    }

    async call(input: ChiefEditorInput): Promise<ChiefEditorOutput> {
        const { blueprint, content } = input;

        // Prepare items for batching
        const marketIds = Object.keys(content);
        const BATCH_SIZE = 3;
        const batches = [];

        for (let i = 0; i < marketIds.length; i += BATCH_SIZE) {
            batches.push(marketIds.slice(i, i + BATCH_SIZE));
        }

        console.log(`Chief Editor: Reviewing ${marketIds.length} stories in ${batches.length} batches...`);

        const finalReviewedContent: ArticleContent = {};
        const allNotes: string[] = [];

        await Promise.all(batches.map(async (batchIds, batchIdx) => {
            // Construct mini-blueprint and mini-content for this batch
            const batchBlueprintStories = blueprint.stories.filter(s => batchIds.includes(s.id));
            const batchContent: ArticleContent = {};
            batchIds.forEach(id => {
                batchContent[id] = content[id];
            });

            const prompt = `
You are the Editor-in-Chief of "The Polymarket Times", a prestigious newspaper from the future.
Your job is to review the articles written by your staff writers.

The newspaper's style is:
- **Professional Future-Retro**: Like The Economist wrote for The Financial Times in 2100.
- **Data-Backed**: Odds are facts.
- **Serious**: No crypto slang, no memes.

YOUR TASK:
1. **FACT-CHECK**:
   - Does the article misquote the odds? FIX IT.
   - Does it invent a name or event not in the data? REMOVE IT.
   - STICK TO THE FACTS.

2. **TONE POLISH**:
   - TOO CASUAL: "So yeah, the market thinks..." → FIX: "The ledger suggests..."
   - TOO ROBOTIC: "Probability is 60%." → FIX: "A narrow majority of speculators..."

3. **EXAMPLES OF GOOD VS BAD**:
   - BAD: "This could potentially maybe happen."
   - GOOD: "The outcome hangs in the balance."
   - BAD: "Volume is $500K."
   - GOOD: "Half a million dollars flows through the prediction market."

4. **DO NOT DELETE STORIES**: Even if boring, you MUST return it. Just polish it.
   - INPUT keys length MUST EQUAL OUTPUT keys length.

OUTPUT JSON FORMAT (CRITICAL - MUST BE VALID JSON):
{
  "reviewedContent": {
    "market_id_1": "Fixed content...",
    "market_id_2": "Fixed content...",
    ... (Must match ALL input keys)
  },
  "status": "approved" | "revised",
  "notes": "Brief summary."
}

IMPORTANT: 
- You MUST return content for EVERY key provided in the INPUT.
- Do not change the keys (Market IDs).
- If the content is good, return it EXACTLY as provided with status "approved".
- If you make edits, return the FIXED content.
- **NEVER** return fewer items than you received.

BLUEPRINT (The Facts):
${JSON.stringify({ stories: batchBlueprintStories }, null, 2)}

DRAFT CONTENT (To Review):
${JSON.stringify(batchContent, null, 2)}
    `;

            try {
                const response = await this.client.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: GROQ_MODELS.SMART,
                    temperature: 0.3,
                    max_tokens: 4000,
                });

                const contentResponse = response.choices[0]?.message?.content || '{}';
                const parsed = extractJSON<Partial<ChiefEditorOutput>>(contentResponse);

                const reviewedBatch = parsed.reviewedContent || batchContent;

                // Merge back
                Object.assign(finalReviewedContent, reviewedBatch);
                if (parsed.notes) allNotes.push(parsed.notes);

            } catch (error) {
                console.error(`Chief Editor Batch ${batchIdx} failed:`, error);
                // Fallback: use original content
                batchIds.forEach(id => {
                    finalReviewedContent[id] = content[id];
                });
                allNotes.push(`Batch ${batchIdx} failed review.`);
            }
        }));

        // Safety check: ensure we have everything
        marketIds.forEach(id => {
            if (!finalReviewedContent[id]) {
                finalReviewedContent[id] = content[id];
            }
        });

        return {
            reviewedContent: finalReviewedContent,
            status: 'approved', // Aggregate status is hard, default to approved
            notes: allNotes.join(' | ')
        };
    }
}
