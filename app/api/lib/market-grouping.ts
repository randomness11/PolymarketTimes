import { Market } from '../../types';

/**
 * Market group - represents multiple related markets as one story
 */
export interface MarketGroup {
  topic: string;           // The base topic/race
  primaryMarket: Market;  // Highest volume market in group
  relatedMarkets: Market[]; // Other markets in same group
  allOutcomes: Array<{     // All outcomes with probabilities
    label: string;
    probability: number;
    volume: number;
  }>;
  combinedVolume: number;  // Total volume across all related markets
  isMultiOutcome: boolean; // True if this is a "who will win X?" type
}

/**
 * Extract the base topic from a market question
 * Examples:
 * - "Will Trump win the 2024 election?" -> "2024 election"
 * - "Will Harris win the 2024 election?" -> "2024 election"
 * - "Will Bitcoin reach $100K?" -> "bitcoin $100k"
 */
function extractBaseTopic(question: string): string {
  const q = question.toLowerCase();

  // Remove common prefixes
  let topic = q
    .replace(/^will\s+/i, '')
    .replace(/^who will\s+/i, '')
    .replace(/^which\s+/i, '')
    .replace(/^what\s+/i, '')
    .replace(/\?$/, '')
    .trim();

  // Remove candidate/person names to get base topic
  // This helps group "Will Trump win?" and "Will Harris win?" together
  const namePatterns = [
    /trump/gi, /harris/gi, /biden/gi, /desantis/gi, /newsom/gi,
    /rfk/gi, /kennedy/gi, /vance/gi, /walz/gi,
    // Add more as needed
  ];

  // For election-type questions, extract the race not the candidate
  if (topic.includes('president') || topic.includes('election') || topic.includes('win')) {
    // Try to extract the position/race
    const raceMatch = topic.match(/(president|election|governor|senator|mayor|primary|nomination)/i);
    const yearMatch = topic.match(/20\d{2}/);
    const stateMatch = topic.match(/\b(california|texas|florida|new york|pennsylvania|michigan|arizona|georgia|wisconsin|nevada|north carolina)\b/i);

    if (raceMatch) {
      const parts = [raceMatch[1]];
      if (yearMatch) parts.push(yearMatch[0]);
      if (stateMatch) parts.push(stateMatch[1]);
      return parts.join(' ').toLowerCase();
    }
  }

  // For sports, group by event not team
  if (topic.includes('super bowl') || topic.includes('championship') ||
    topic.includes('world series') || topic.includes('finals')) {
    const eventMatch = topic.match(/(super bowl|championship|world series|finals|playoff)/i);
    const yearMatch = topic.match(/20\d{2}/);
    const leagueMatch = topic.match(/(nfl|nba|mlb|nhl)/i);

    if (eventMatch) {
      const parts = [eventMatch[1]];
      if (yearMatch) parts.push(yearMatch[0]);
      if (leagueMatch) parts.push(leagueMatch[1]);
      return parts.join(' ').toLowerCase();
    }
  }

  // For crypto/price targets, group by asset and milestone
  const cryptoMatch = topic.match(/(bitcoin|btc|ethereum|eth|solana)/i);
  const priceMatch = topic.match(/\$[\d,]+k?/i);
  if (cryptoMatch && priceMatch) {
    return `${cryptoMatch[1]} ${priceMatch[0]}`.toLowerCase();
  }

  // Default: use first 5 significant words
  const words = topic
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'will', 'win', 'be'].includes(w))
    .slice(0, 5);

  return words.join(' ');
}

/**
 * Calculate similarity between two topics
 */
function topicSimilarity(topic1: string, topic2: string): number {
  const words1 = new Set(topic1.split(/\s+/));
  const words2 = new Set(topic2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Group related markets together
 */
export function groupMarkets(markets: Market[]): MarketGroup[] {
  const groups: MarketGroup[] = [];
  const assigned = new Set<string>();

  // Extract topics for all markets
  const marketTopics = markets.map(m => ({
    market: m,
    topic: extractBaseTopic(m.question),
  }));

  // Group markets with similar topics
  for (const { market, topic } of marketTopics) {
    if (assigned.has(market.id)) continue;

    // Find all markets with similar topic
    const related = marketTopics.filter(mt =>
      !assigned.has(mt.market.id) &&
      (mt.market.id === market.id || topicSimilarity(topic, mt.topic) > 0.5)
    );

    // Mark all as assigned
    related.forEach(r => assigned.add(r.market.id));

    // Sort by volume to find primary
    const sortedByVolume = related
      .map(r => r.market)
      .sort((a, b) => b.volume24hr - a.volume24hr);

    const primary = sortedByVolume[0];
    const others = sortedByVolume.slice(1);

    // Build all outcomes list
    const allOutcomes: MarketGroup['allOutcomes'] = [];

    for (const m of sortedByVolume) {
      // For each market, extract the candidate/option from the question
      let label = m.question
        .replace(/^will\s+/i, '')
        .replace(/\?$/, '')
        .split(/\s+(win|be|become|reach|hit)\s+/i)[0]
        .trim();

      // If it's a simple yes/no, use the question as label
      if (label.length > 50) {
        label = m.outcomes[0] || 'Yes';
      }

      allOutcomes.push({
        label,
        probability: m.yesPrice,
        volume: m.volume24hr,
      });
    }

    // Sort outcomes by probability
    allOutcomes.sort((a, b) => b.probability - a.probability);

    groups.push({
      topic,
      primaryMarket: primary,
      relatedMarkets: others,
      allOutcomes,
      combinedVolume: sortedByVolume.reduce((sum, m) => sum + m.volume24hr, 0),
      isMultiOutcome: sortedByVolume.length > 1,
    });
  }

  // Sort groups by combined volume
  groups.sort((a, b) => b.combinedVolume - a.combinedVolume);

  return groups;
}

/**
 * Format multi-outcome market for display
 * Returns string like "Trump 65%, Harris 32%, RFK 3%"
 */
export function formatMultiOutcome(group: MarketGroup): string {
  return group.allOutcomes
    .slice(0, 5) // Top 5 outcomes
    .map(o => `${o.label} ${Math.round(o.probability * 100)}%`)
    .join(', ');
}

