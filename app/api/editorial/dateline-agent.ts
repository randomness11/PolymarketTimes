import { Market, Datelines } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface DatelineAgentInput {
    markets: Market[];
}

export interface DatelineAgentOutput {
    datelines: Datelines;
}

/**
 * Dateline Agent - Determines appropriate geographic/temporal context for each story
 *
 * AGENTIC REPLACEMENT for hardcoded regex-based location matching.
 * The AI analyzes market context, key players, and geographic relevance to assign datelines.
 */
export class DatelineAgent implements Agent<DatelineAgentInput, DatelineAgentOutput> {
    constructor(private apiKey: string) { }

    async call(input: DatelineAgentInput): Promise<DatelineAgentOutput> {
        const { markets } = input;

        // Process in batches to avoid token limits
        const BATCH_SIZE = 10;
        const batches: Market[][] = [];
        for (let i = 0; i < markets.length; i += BATCH_SIZE) {
            batches.push(markets.slice(i, i + BATCH_SIZE));
        }

        console.log(`Dateline Agent: Processing ${markets.length} markets in ${batches.length} batches...`);

        const client = createAIClient(this.apiKey);
        const finalDatelines: Datelines = {};

        await Promise.all(batches.map(async (batch, batchIdx) => {
            // Stagger to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, batchIdx * 150));

            // Format markets for AI analysis
            const marketsInput = batch.map((m, idx) => {
                const endDate = m.endDate ? new Date(m.endDate) : null;
                const endDateStr = endDate
                    ? endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : 'Open-ended';

                return `[${idx}] ID: "${m.id}"
QUESTION: "${m.question}"
DESCRIPTION: "${(m.description || 'N/A').substring(0, 200)}"
CATEGORY: ${m.category}
END_DATE: ${endDateStr}`;
            }).join('\n\n');

            const prompt = `You are the Wire Editor at "The Polymarket Times", responsible for assigning datelines to breaking news stories.

A dateline indicates where the story originates geographically. Your task is to analyze each market and assign the most appropriate dateline location.

═══════════════════════════════════════════════════════════
MARKETS TO ASSIGN DATELINES:
═══════════════════════════════════════════════════════════
${marketsInput}

═══════════════════════════════════════════════════════════
DATELINE ASSIGNMENT GUIDELINES:
═══════════════════════════════════════════════════════════
1. **GEOGRAPHIC RELEVANCE**: Where is this story happening? Where are the key players?
   Examples:
   - Trump/Biden/Congress/White House → WASHINGTON
   - Ukraine/Russia conflicts → KYIV
   - Israel/Gaza → JERUSALEM
   - China/Taiwan → TAIPEI
   - UK/Britain → LONDON
   - EU/European → BRUSSELS
   - Tech companies (Google/Apple/Meta) → SAN FRANCISCO
   - Space (SpaceX/NASA) → CAPE CANAVERAL
   - Crypto/Bitcoin → CRYPTO WIRE
   - Hollywood/Movies → LOS ANGELES
   - UN/International → NEW YORK

2. **DEFAULT FALLBACK**: If no clear geographic center, use NEW YORK

3. **DATE COMPONENT**: Use the market's END_DATE if provided. Format: "Location (Mon YYYY)"
   - If END_DATE is "Open-ended", use next month from today

4. **TONE**: Professional wire service style

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY (keys are market indices 0, 1, 2...):
═══════════════════════════════════════════════════════════
{
  "0": "WASHINGTON (Jan 2025)",
  "1": "SAN FRANCISCO (Dec 2024)",
  ...
}`;

            try {
                const response = await withRetry(async () => {
                    return client.chat.completions.create({
                        model: GEMINI_MODELS.FAST,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.3, // Low temperature for consistent, professional assignments
                        max_tokens: 1000,
                    });
                }, 2, 500);

                const contentText = response.choices[0]?.message?.content || "";
                const parsed = extractJSON<Record<string, string>>(contentText);

                // Map results back to market IDs
                batch.forEach((market, localIdx) => {
                    const dateline = parsed[String(localIdx)];
                    if (dateline) {
                        finalDatelines[market.id] = dateline;
                    } else {
                        // Fallback to simple dateline
                        const endDate = market.endDate ? new Date(market.endDate) : new Date();
                        endDate.setMonth(endDate.getMonth() + 1);
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const dateStr = `${months[endDate.getMonth()]} ${endDate.getFullYear()}`;
                        finalDatelines[market.id] = `NEW YORK (${dateStr})`;
                    }
                });

            } catch (error) {
                console.error(`Dateline Batch ${batchIdx} failed:`, error);
                // Fallback for entire batch
                batch.forEach(market => {
                    const endDate = market.endDate ? new Date(market.endDate) : new Date();
                    endDate.setMonth(endDate.getMonth() + 1);
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const dateStr = `${months[endDate.getMonth()]} ${endDate.getFullYear()}`;
                    finalDatelines[market.id] = `NEW YORK (${dateStr})`;
                });
            }
        }));

        console.log(`Dateline Agent: Generated ${Object.keys(finalDatelines).length} datelines`);
        return { datelines: finalDatelines };
    }
}
