/**
 * Editorial configuration - centralized magic numbers and quotas.
 * Adjust these values to tune AI agent behavior and content selection.
 */

import type { MarketCategory } from '../types';

/**
 * Curator Agent: How many stories to pull from each category
 * TECH TWITTER FOCUS: Prioritize tech, crypto, and business
 */
export const CATEGORY_QUOTAS: Record<MarketCategory, number> = {
    TECH: 10,       // AI, products, breakthroughs - THIS IS THE CORE
    CRYPTO: 8,      // Polymarket native audience
    BUSINESS: 5,    // Startups, IPOs, funding
    SCIENCE: 4,     // Space, biotech
    POLITICS: 3,    // Only tech-relevant policy
    CONFLICT: 2,    // Only if affecting markets
    FINANCE: 2,     // Fed, rates when significant
    CULTURE: 1,     // MAX 1 - not our audience
    SPORTS: 1,      // MAX 1 - not our audience
    OTHER: 3,
};

/**
 * Curator Agent: Maximum stories allowed per category after deduplication
 */
export const CATEGORY_HARD_CAPS: Partial<Record<MarketCategory, number>> = {
    SPORTS: 2, // Never more than 2 sports stories
};

/**
 * Article Agent: Batch processing configuration
 */
export const ARTICLE_BATCH_CONFIG = {
    batchSize: 3,
    staggerDelayMs: 200,
    maxTokens: 4000,
    temperature: 0.75,
} as const;

/**
 * Headline Agent: Batch processing configuration
 */
export const HEADLINE_BATCH_CONFIG = {
    batchSize: 5,
    staggerDelayMs: 150,
    maxTokens: 500,
    temperature: 0.8,
} as const;

/**
 * Chief Editor Agent: Batch processing configuration
 */
export const EDITOR_BATCH_CONFIG = {
    batchSize: 4,
    staggerDelayMs: 200,
    maxTokens: 2000,
    temperature: 0.25,
} as const;

/**
 * Curator Agent: Target story counts
 */
export const CURATOR_CONFIG = {
    /** Target number of stories to select */
    targetStories: 25,
    /** Maximum stories to fallback to if AI under-selects */
    maxFallback: 35,
    /** Absolute maximum stories cap */
    absoluteCap: 40,
    /** Number of high-velocity movers to consider */
    moverCount: 10,
    /** General top-scoring candidates to seed */
    topCandidatesCount: 20,
} as const;

/**
 * Editorial route: Timeout configuration
 */
export const EDITORIAL_CONFIG = {
    /** Timeout for full AI generation (ms) - Chief Editor can take 60-90s */
    generationTimeoutMs: 120000,
} as const;

/**
 * Retry configuration for AI calls
 */
export const RETRY_CONFIG = {
    maxRetries: 2,
    initialDelayMs: 500,
} as const;
