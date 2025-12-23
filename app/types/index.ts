export type MarketCategory =
    | 'POLITICS'
    | 'CONFLICT'
    | 'FINANCE'
    | 'TECH'
    | 'CRYPTO'
    | 'CULTURE'
    | 'SPORTS'
    | 'SCIENCE'
    | 'BUSINESS'
    | 'OTHER';

export interface Market {
    id: string;
    question: string;
    slug: string;
    description: string;
    yesPrice: number;
    noPrice: number;
    volume24hr: number;
    totalVolume: number;
    liquidity: number;
    priceChange24h: number | null;
    outcomes: string[];
    endDate: string | null;
    image: string | null;
    category: MarketCategory;
    marketStatus: 'confirmed' | 'dead_on_arrival' | 'chaos' | 'contested';
    scores: {
        money: number;
        certainty: number;
        speed: number;
        interest: number;
        total: number;
    };
}

// Simplified version often used in UI components if they don't need all fields
export interface SimpleMarket {
    id: string;
    question: string;
    slug: string;
    yesPrice: number;
    noPrice: number;
    volume24hr: number;
    image: string | null;
    category: string;
}

export interface MarketGroup {
    topic: string;
    primaryMarketId: string;
    relatedMarketIds: string[];
    allOutcomes: Array<{ label: string; probability: number; volume: number }>;
    combinedVolume: number;
    isMultiOutcome: boolean;
}

export interface FrontPageBlueprint {
    stories: Market[];
}

export interface Headlines {
    [marketId: string]: string;
}

export interface Datelines {
    [marketId: string]: string;
}

export interface ArticleContent {
    [marketId: string]: string;
}

export interface EditorialData {
    blueprint: FrontPageBlueprint;
    content: ArticleContent;
    headlines: Headlines;
    datelines: Datelines;
    curatorReasoning?: string | null;
    editorNotes?: string | null;
    timestamp: string;
}

export interface CryptoData {
    btc: { price: string, change: string, direction: 'up' | 'down' };
    eth: { price: string, change: string, direction: 'up' | 'down' };
    sol: { price: string, change: string, direction: 'up' | 'down' };
}
