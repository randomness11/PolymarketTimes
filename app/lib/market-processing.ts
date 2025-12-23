import { MarketCategory } from "../types";

// Time window for market resolution
export const MIN_DAYS_TO_RESOLUTION = 3;   // Too soon = already decided
export const MAX_DAYS_TO_RESOLUTION = 90;  // Wider window for more options

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

// Editorial bias: favor interesting categories over boring finance
export const CATEGORY_INTEREST: Record<MarketCategory, number> = {
    CULTURE: 1.4,    // Pop culture is interesting
    TECH: 1.35,      // Tech/AI is interesting
    CONFLICT: 1.3,   // Geopolitics/war is interesting
    SPORTS: 0.7,     // De-prioritized - too many NFL stories
    SCIENCE: 1.15,   // Science breakthroughs
    POLITICS: 1.0,   // Neutral (lots of volume anyway)
    CRYPTO: 0.9,     // Niche
    BUSINESS: 0.85,  // Less interesting
    FINANCE: 0.75,   // Boring interest rates
    OTHER: 1.0,
};

// Keywords for categorization
export const CATEGORY_KEYWORDS: Record<MarketCategory, string[]> = {
    POLITICS: ['trump', 'biden', 'congress', 'senate', 'election', 'president', 'governor', 'democrat', 'republican', 'vote', 'poll', 'nominee', 'candidate', 'primary', 'electoral', 'impeach', 'legislation', 'bill', 'supreme court', 'cabinet', 'secretary', 'attorney general', 'doge', 'rfk', 'vance', 'harris', 'desantis', 'newsom', 'maduro', 'venezuela', 'putin'],
    CONFLICT: ['ukraine', 'russia', 'war', 'nato', 'military', 'invasion', 'ceasefire', 'treaty', 'sanctions', 'iran', 'israel', 'gaza', 'hamas', 'hezbollah', 'taiwan', 'korea', 'missile', 'nuclear', 'troops', 'attack', 'strike', 'hostage', 'terrorism', 'conflict', 'peace', 'engagement'],
    FINANCE: ['fed', 'federal reserve', 'interest rate', 'inflation', 'gdp', 'recession', 'treasury', 'yield', 'bond', 'jobs report', 'unemployment', 'cpi', 'fomc', 'rate cut', 'rate hike', 'ecb', 'bank of', 'monetary', 'gold', 'silver', 's&p', 'dow jones', 'nasdaq'],
    TECH: ['ai ', 'artificial intelligence', 'openai', 'chatgpt', 'gpt-5', 'gpt5', 'claude', 'anthropic', 'google', 'apple', 'microsoft', 'meta', 'amazon', 'tesla', 'spacex', 'launch', 'iphone', 'software', 'chip', 'semiconductor', 'nvidia', 'robot', 'self-driving', 'starship', 'agi', 'deepmind', 'llm', 'polymarket'],
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

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                scores[category as MarketCategory] += 1;
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
    if (maxVolume === 0) return 0;
    // Log scale for wide range
    const logVolume = Math.log10(volume24hr + 1);
    const logMax = Math.log10(maxVolume + 1);
    return logVolume / logMax;
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
