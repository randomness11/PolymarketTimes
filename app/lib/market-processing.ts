import { MarketCategory } from "../types";

// Time window for market resolution
export const MIN_DAYS_TO_RESOLUTION = 3;   // Too soon = already decided
export const MAX_DAYS_TO_RESOLUTION = 365; // Expanded for future-focused content

// Time horizon classification for markets
export type TimeHorizon = 'IMMINENT' | 'NEAR_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

export function classifyTimeHorizon(endDate: string | null): TimeHorizon {
    if (!endDate) return 'LONG_TERM'; // No end date = open-ended future

    const end = new Date(endDate);
    const now = new Date();
    const daysUntilResolution = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilResolution < 7) return 'IMMINENT';
    if (daysUntilResolution < 30) return 'NEAR_TERM';
    if (daysUntilResolution < 180) return 'MEDIUM_TERM';
    return 'LONG_TERM';
}

// Future market boost: Tech Twitter cares about what's COMING, not just what's happening
// Boost MEDIUM_TERM and LONG_TERM for tech/crypto categories
export const TIME_HORIZON_BOOST: Record<TimeHorizon, number> = {
    IMMINENT: 1.0,      // No boost - near-term news
    NEAR_TERM: 1.0,     // No boost - still news-cycle driven
    MEDIUM_TERM: 1.15,  // 15% boost - sweet spot for predictions
    LONG_TERM: 1.25,    // 25% boost - forward-looking alpha
};

// Categories that get the future boost (tech Twitter cares about future of these)
export const FUTURE_BOOST_CATEGORIES: MarketCategory[] = ['TECH', 'CRYPTO', 'SCIENCE', 'BUSINESS'];

// Tech Twitter entities - markets mentioning these get automatic score boost
export const TECH_TWITTER_ENTITIES = [
    // AI Labs
    'openai', 'anthropic', 'deepmind', 'xai', 'mistral', 'cohere', 'inflection',
    // Tech personalities
    'sam altman', 'elon musk', 'dario amodei', 'demis hassabis', 'satya nadella', 'jensen huang', 'mark zuckerberg', 'sundar pichai',
    // VCs & Founders ecosystem
    'a16z', 'andreessen', 'sequoia', 'yc', 'y combinator', 'benchmark', 'accel', 'founders fund', 'thiel',
    // Crypto ecosystem
    'vitalik', 'sbf', 'cz', 'binance', 'coinbase', 'solana', 'ethereum', 'uniswap',
    // Major tech
    'nvidia', 'tsmc', 'apple', 'google', 'microsoft', 'meta', 'amazon', 'tesla', 'spacex',
    // AI products/terms
    'gpt-5', 'gpt5', 'agi', 'claude', 'gemini', 'llama', 'chatgpt',
];

export const TECH_ENTITY_BOOST = 1.2; // 20% boost for tech Twitter relevant entities

export function calculateTechEntityBoost(question: string, description: string): number {
    const text = `${question} ${description}`.toLowerCase();
    const hasEntity = TECH_TWITTER_ENTITIES.some(entity => text.includes(entity));
    return hasEntity ? TECH_ENTITY_BOOST : 1.0;
}

// Maximum allowed boost to prevent score inflation
const MAX_AUDIENCE_BOOST = 1.4;

// Combined future + tech boost calculator
export function calculateAudienceBoost(
    question: string,
    description: string,
    category: MarketCategory,
    endDate: string | null
): number {
    let boost = 1.0;

    // Apply time horizon boost for future-focused categories
    if (FUTURE_BOOST_CATEGORIES.includes(category)) {
        const horizon = classifyTimeHorizon(endDate);
        boost *= TIME_HORIZON_BOOST[horizon];
    }

    // Apply tech entity boost
    boost *= calculateTechEntityBoost(question, description);

    // Cap total boost to prevent extreme outliers
    return Math.min(boost, MAX_AUDIENCE_BOOST);
}

// Short-term sports keywords (individual games to exclude)
export const SHORT_TERM_SPORTS_PATTERNS = [
    /\bvs\.?\b/i,           // "Team A vs Team B"
    /\btonight\b/i,
    /\btoday\b/i,
    /\bmonday\b/i, /\btuesday\b/i, /\bwednesday\b/i, /\bthursday\b/i,
    /\bfriday\b/i, /\bsaturday\b/i, /\bsunday\b/i,
    /\bgame\s*\d+\b/i,      // "Game 7"
    /\bround\s*\d+\b/i,     // "Round 1"
    /\bweek\s*\d+\b/i,      // "Week 15"
];

// Editorial bias: TECH TWITTER & POLYMARKET NATIVE AUDIENCE
// Prioritize tech, crypto, and forward-looking markets
export const CATEGORY_INTEREST: Record<MarketCategory, number> = {
    TECH: 1.8,       // AI, breakthroughs - THIS IS THE CORE AUDIENCE
    CRYPTO: 1.6,     // DeFi, tokens, market structure - Polymarket natives care
    BUSINESS: 1.4,   // Startups, IPOs, M&A, funding rounds
    SCIENCE: 1.3,    // Research, space, breakthroughs
    POLITICS: 1.2,   // Elections, policy - still matters but not the focus
    CONFLICT: 1.0,   // Wars, geopolitics - important but not primary
    FINANCE: 1.0,    // Fed, rates - market-moving
    CULTURE: 0.6,    // Entertainment - NOT NEWS
    SPORTS: 0.4,     // Individual games are NOT news
    OTHER: 0.7,
};

// Keywords for categorization
export const CATEGORY_KEYWORDS: Record<MarketCategory, string[]> = {
    // NOTE: Removed 'primary' and 'bill' - they match too many false positives
    // 'primary' matches "primary resolution source" in every Polymarket description
    // 'bill' matches "buffalo bills" and other false positives
    POLITICS: ['trump', 'biden', 'congress', 'senate', 'election', 'president', 'governor', 'democrat', 'republican', 'vote', 'poll', 'nominee', 'candidate', 'primary election', 'electoral', 'impeach', 'legislation', 'supreme court', 'cabinet', 'secretary', 'attorney general', 'doge', 'rfk', 'vance', 'harris', 'desantis', 'newsom', 'maduro', 'venezuela', 'putin', 'white house', 'executive order', 'tariff', 'deportation', 'immigration'],
    CONFLICT: ['ukraine', 'russia', 'war', 'nato', 'military', 'invasion', 'ceasefire', 'treaty', 'sanctions', 'iran', 'israel', 'gaza', 'hamas', 'hezbollah', 'taiwan', 'korea', 'missile', 'nuclear', 'troops', 'attack', 'strike', 'hostage', 'terrorism', 'conflict', 'peace', 'engagement'],
    FINANCE: ['fed', 'federal reserve', 'interest rate', 'inflation', 'gdp', 'recession', 'treasury', 'yield', 'bond', 'jobs report', 'unemployment', 'cpi', 'fomc', 'rate cut', 'rate hike', 'ecb', 'bank of', 'monetary', 'gold', 'silver', 's&p', 'dow jones', 'nasdaq'],
    // NOTE: Removed 'polymarket' - it matches "This is a polymarket on..." in every description, causing false positives
    TECH: ['ai ', 'artificial intelligence', 'openai', 'chatgpt', 'gpt-5', 'gpt5', 'claude', 'anthropic', 'google', 'apple', 'microsoft', 'meta', 'amazon', 'tesla', 'spacex', 'iphone', 'software', 'microchip', 'semiconductor', 'nvidia', 'robot', 'self-driving', 'starship', 'agi', 'deepmind', 'llm', 'grok', 'gemini'],
    CRYPTO: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'token', 'defi', 'nft', 'blockchain', 'solana', 'binance', 'coinbase', 'altcoin', 'memecoin', 'satoshi', 'lighter', 'market cap', 'fdv'],
    CULTURE: ['oscar', 'grammy', 'emmy', 'golden globe', 'movie', 'film', 'album', 'celebrity', 'kardashian', 'taylor swift', 'beyonce', 'drake', 'kanye', 'netflix', 'disney', 'streaming', 'award', 'box office', 'concert', 'tour', 'viral', 'tiktok', 'youtube', 'influencer', 'super bowl halftime', 'met gala', 'fashion', 'spotify', 'mrbeast', 'views'],
    SPORTS: ['nfl', 'nba', 'mlb', 'nhl', 'soccer', 'football', 'basketball', 'baseball', 'hockey', 'super bowl', 'world series', 'playoffs', 'finals', 'mvp', 'draft', 'coach', 'ufc', 'boxing', 'olympics', 'world cup', 'f1', 'formula 1', 'tennis', 'golf', 'premier league', 'la liga', 'bundesliga', 'serie a', 'champions league', 'arsenal', 'manchester', 'liverpool', 'chelsea', 'tottenham', 'city', 'united', 'lakers', 'celtics', 'warriors', 'kings', 'rangers', 'yankees', 'dodgers', 'cubs', 'red sox', 'everton'],
    SCIENCE: ['fda', 'drug', 'vaccine', 'clinical', 'trial', 'disease', 'pandemic', 'virus', 'treatment', 'nasa', 'space', 'climate', 'temperature', 'carbon', 'emissions', 'research', 'discovery', 'breakthrough', 'mars', 'moon', 'asteroid'],
    BUSINESS: ['ceo', 'ipo', 'merger', 'acquisition', 'earnings', 'revenue', 'profit', 'layoff', 'hire', 'startup', 'valuation', 'funding', 'bankruptcy', 'company'],
    OTHER: [],
};

export function categorizeMarket(question: string, description: string): MarketCategory {
    const text = `${question} ${description}`.toLowerCase();

    const scores: Record<MarketCategory, number> = {
        POLITICS: 0, CONFLICT: 0, FINANCE: 0, TECH: 0, CRYPTO: 0,
        CULTURE: 0, SPORTS: 0, SCIENCE: 0, BUSINESS: 0, OTHER: 0,
    };

    const matches: Record<MarketCategory, string[]> = {
        POLITICS: [], CONFLICT: [], FINANCE: [], TECH: [], CRYPTO: [],
        CULTURE: [], SPORTS: [], SCIENCE: [], BUSINESS: [], OTHER: [],
    };

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                scores[category as MarketCategory] += 1;
                matches[category as MarketCategory].push(keyword);
            }
        }
    }

    let maxCategory: MarketCategory = 'OTHER';
    let maxScore = 0;

    for (const [category, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            maxCategory = category as MarketCategory;
        }
    }

    // Debug: log which keywords matched for sports-related questions
    if (text.includes('football') || text.includes('bundesliga') || text.includes('bayern')) {
        console.log(`KEYWORD MATCH for "${question.substring(0,40)}...": SPORTS=[${matches.SPORTS}] (${scores.SPORTS}) vs POLITICS=[${matches.POLITICS}] (${scores.POLITICS}) => ${maxCategory}`);
    }

    return maxCategory;
}

export function calculateCertainty(yesPrice: number): number {
    // How close to being decided
    // 0 at 50% (maximum uncertainty), 1 at 0% or 100% (certain)
    return Math.abs(2 * yesPrice - 1);
}

export function calculateSpeed(priceChange24h: number | null): number {
    if (priceChange24h === null) return 0;

    // Absolute percentage point change, normalized to 0-1
    const absChange = Math.abs(priceChange24h);

    if (absChange >= 25) return 1.0;   // Massive swing = chaos
    if (absChange >= 15) return 0.85;  // Major movement
    if (absChange >= 10) return 0.7;   // Significant
    if (absChange >= 5) return 0.5;    // Notable
    if (absChange >= 2) return 0.3;    // Moderate
    return 0.1; // Stable
}

export function normalizeVolume(volume24hr: number, maxVolume: number): number {
    // Handle edge cases
    if (maxVolume <= 0) return 0;
    if (volume24hr <= 0) return 0;

    // Minimum meaningful volume threshold
    const MIN_VOLUME = 10;
    if (maxVolume < MIN_VOLUME) return 0;

    // Log scale for wide range
    const logVolume = Math.log10(Math.max(volume24hr, 1));
    const logMax = Math.log10(maxVolume);

    // Cap at 1.0 to prevent edge case overflow
    return Math.min(logVolume / logMax, 1.0);
}

export function determineMarketStatus(
    yesPrice: number,
    priceChange24h: number | null
): 'confirmed' | 'dead_on_arrival' | 'chaos' | 'contested' {
    const certainty = Math.max(yesPrice, 1 - yesPrice);
    const speed = Math.abs(priceChange24h || 0);

    // CHAOS: Wild swings (>15pp change) regardless of current position
    if (speed >= 15) return 'chaos';

    // CONFIRMED: >85% on YES
    if (yesPrice >= 0.85) return 'confirmed';

    // DEAD ON ARRIVAL: <15% on YES (i.e., >85% NO)
    if (yesPrice <= 0.15) return 'dead_on_arrival';

    // CONTESTED: Everything else
    return 'contested';
}

export function isOutsideTimeWindow(endDate: string | null): boolean {
    if (!endDate) return false; // No end date = allow (could be important ongoing)

    const end = new Date(endDate);
    const now = new Date();
    const daysUntilResolution = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Exclude if too soon OR too far out
    return daysUntilResolution < MIN_DAYS_TO_RESOLUTION || daysUntilResolution > MAX_DAYS_TO_RESOLUTION;
}

export function isShortTermSportsBet(question: string, category: MarketCategory): boolean {
    if (category !== 'SPORTS') return false;

    return SHORT_TERM_SPORTS_PATTERNS.some(pattern => pattern.test(question));
}
