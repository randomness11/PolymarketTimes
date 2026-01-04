import { Market, MarketCategory } from '../../types';
import { Agent, createAIClient, extractJSON, withRetry, GEMINI_MODELS } from '../lib/agents';

export interface CategoryAgentInput {
    markets: Array<{
        id: string;
        question: string;
        description: string;
    }>;
}

export interface CategoryAgentOutput {
    categories: Map<string, MarketCategory>;
    reasoning: string;
}

/**
 * Category Classification Agent - AI-powered market categorization
 *
 * FULLY AGENTIC REPLACEMENT for keyword-based category matching.
 * Uses AI to understand context and assign appropriate categories.
 */
export class CategoryClassificationAgent implements Agent<CategoryAgentInput, CategoryAgentOutput> {
    constructor(private apiKey: string) { }

    async call(input: CategoryAgentInput): Promise<CategoryAgentOutput> {
        const { markets } = input;

        // Process in batches
        const BATCH_SIZE = 20;
        const batches: typeof markets[] = [];
        for (let i = 0; i < markets.length; i += BATCH_SIZE) {
            batches.push(markets.slice(i, i + BATCH_SIZE));
        }

        console.log(`Category Agent: Classifying ${markets.length} markets in ${batches.length} batches...`);

        const client = createAIClient(this.apiKey);
        const finalCategories = new Map<string, MarketCategory>();
        let overallReasoning = '';

        await Promise.all(batches.map(async (batch, batchIdx) => {
            // Stagger to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, batchIdx * 150));

            // Format markets for AI
            const marketsInput = batch.map((m, idx) => {
                return `[${idx}] "${m.question}"
DESCRIPTION: ${(m.description || 'N/A').substring(0, 150)}`;
            }).join('\n\n');

            const prompt = `You are a news categorization specialist at "The Polymarket Times".

Your task is to classify prediction markets into NEWS CATEGORIES.

═══════════════════════════════════════════════════════════
MARKETS TO CATEGORIZE:
═══════════════════════════════════════════════════════════
${marketsInput}

═══════════════════════════════════════════════════════════
AVAILABLE CATEGORIES:
═══════════════════════════════════════════════════════════

1. **POLITICS** - Elections, government, legislation, politicians
   Examples: Presidential races, Congress votes, Supreme Court decisions, cabinet appointments

2. **CONFLICT** - Wars, military actions, geopolitical tensions
   Examples: Ukraine-Russia, Israel-Gaza, Taiwan-China, NATO, nuclear weapons, ceasefires

3. **FINANCE** - Monetary policy, economic indicators, markets
   Examples: Federal Reserve rates, inflation, GDP, recession, stock indices, bonds

4. **TECH** - Technology companies, AI, software, hardware
   Examples: OpenAI, Google, Apple, Meta, AI breakthroughs, product launches, chips

5. **CRYPTO** - Cryptocurrencies, blockchain, DeFi
   Examples: Bitcoin, Ethereum, altcoins, crypto regulations, token launches

6. **CULTURE** - Entertainment, celebrities, awards, media
   Examples: Oscars, movies, music, streaming, Taylor Swift, viral trends, fashion

7. **SPORTS** - Athletic competitions, teams, players
   Examples: NFL, NBA, Super Bowl, World Cup, Olympics, championships

8. **SCIENCE** - Research, health, space, environment
   Examples: FDA approvals, vaccines, NASA missions, climate, discoveries

9. **BUSINESS** - Corporations, CEOs, mergers, earnings
   Examples: IPOs, acquisitions, layoffs, startups, valuations, bankruptcies

10. **OTHER** - Anything that doesn't fit above categories

═══════════════════════════════════════════════════════════
CLASSIFICATION GUIDELINES:
═══════════════════════════════════════════════════════════
- Choose the MOST SPECIFIC category that applies
- If a market spans multiple categories, pick the PRIMARY one
- POLITICS takes precedence over BUSINESS for political figures (e.g., Trump business deals → POLITICS)
- CONFLICT takes precedence over POLITICS for war-related questions
- TECH takes precedence over BUSINESS for tech companies
- When in doubt, use context clues from the description

═══════════════════════════════════════════════════════════
RESPOND WITH JSON ONLY (keys are market indices):
═══════════════════════════════════════════════════════════
{
  "categories": {
    "0": "POLITICS",
    "1": "TECH",
    "2": "SPORTS",
    ...
  },
  "reasoning": "Brief explanation of classification approach for this batch."
}`;

            try {
                const response = await withRetry(async () => {
                    return client.chat.completions.create({
                        model: GEMINI_MODELS.FAST, // Fast model is sufficient for categorization
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.2, // Low temperature for consistent categorization
                        max_tokens: 1500,
                    });
                }, 2, 500);

                const contentText = response.choices[0]?.message?.content || "";
                const parsed = extractJSON<{
                    categories: Record<string, string>;
                    reasoning: string;
                }>(contentText);

                // Map results back to market IDs
                batch.forEach((market, localIdx) => {
                    const category = parsed.categories[String(localIdx)];
                    if (category && isValidCategory(category)) {
                        finalCategories.set(market.id, category as MarketCategory);
                    } else {
                        // Fallback to keyword-based if AI fails
                        finalCategories.set(market.id, fallbackCategorize(market.question, market.description));
                    }
                });

                if (batchIdx === 0) {
                    overallReasoning = parsed.reasoning;
                }

            } catch (error) {
                console.error(`Category Batch ${batchIdx} failed:`, error);
                // Fallback for entire batch
                batch.forEach(market => {
                    finalCategories.set(market.id, fallbackCategorize(market.question, market.description));
                });
            }
        }));

        console.log(`Category Agent: Classified ${finalCategories.size} markets`);

        return {
            categories: finalCategories,
            reasoning: overallReasoning || 'Classification complete.'
        };
    }
}

function isValidCategory(category: string): boolean {
    const valid: MarketCategory[] = [
        'POLITICS', 'CONFLICT', 'FINANCE', 'TECH', 'CRYPTO',
        'CULTURE', 'SPORTS', 'SCIENCE', 'BUSINESS', 'OTHER'
    ];
    return valid.includes(category as MarketCategory);
}

/**
 * Fallback keyword-based categorization (simplified)
 * Used only when AI fails
 */
function fallbackCategorize(question: string, description: string): MarketCategory {
    const text = `${question} ${description}`.toLowerCase();

    const patterns: Array<[MarketCategory, RegExp[]]> = [
        ['POLITICS', [/trump|biden|congress|election|president|governor|senate/i]],
        ['CONFLICT', [/ukraine|russia|war|nato|israel|gaza|military|iran/i]],
        ['FINANCE', [/fed|federal reserve|interest rate|inflation|gdp|recession/i]],
        ['TECH', [/\bai\b|openai|google|apple|microsoft|meta|tesla|spacex/i]],
        ['CRYPTO', [/bitcoin|ethereum|crypto|blockchain|solana|btc|eth/i]],
        ['CULTURE', [/oscar|movie|taylor swift|beyonce|netflix|streaming|celebrity/i]],
        ['SPORTS', [/nfl|nba|mlb|nhl|super bowl|world cup|olympics/i]],
        ['SCIENCE', [/fda|vaccine|nasa|space|climate|research/i]],
        ['BUSINESS', [/ceo|ipo|merger|acquisition|startup|company/i]],
    ];

    for (const [category, regexes] of patterns) {
        if (regexes.some(r => r.test(text))) {
            return category;
        }
    }

    return 'OTHER';
}
