import { Market, MarketCategory } from '../../types';

/**
 * TOPIC CLUSTERING
 *
 * Groups related markets into topics so the front page shows
 * "Bitcoin Price Outlook" instead of 5 separate BTC price markets.
 *
 * A proper newspaper doesn't run 5 headlines about the same topic.
 */

export interface Topic {
  id: string;
  name: string;
  category: MarketCategory;
  primaryMarket: Market;
  relatedMarkets: Market[];
  // Aggregated metrics
  totalVolume24hr: number;
  totalLiquidity: number;
  marketCount: number;
  // Best signal from the cluster
  mostContestedOdds: number;
  biggestPriceMove: number | null;
  // Newsworthiness score (from best market + cluster bonus)
  score: number;
}

/**
 * Extract topic signature from a market question
 * This identifies what the market is fundamentally ABOUT
 */
function extractTopicSignature(question: string, description: string): string {
  const q = question.toLowerCase();
  const text = `${question} ${description}`.toLowerCase();

  // PRICE TARGETS: Group all price predictions for same asset
  const priceTargetMatch = q.match(/(bitcoin|btc|ethereum|eth|solana|sol|xrp|doge|bnb|ada)\b.*?(reach|hit|dip|fall|drop|above|below|\$[\d,]+)/i);
  if (priceTargetMatch) {
    const asset = priceTargetMatch[1].replace('btc', 'bitcoin').replace('eth', 'ethereum').replace('sol', 'solana');
    return `price:${asset}`;
  }

  // ELECTIONS: Group by race, not candidate
  if (q.includes('president') || q.includes('election') || q.includes('win the 202')) {
    const yearMatch = q.match(/202\d/);
    const year = yearMatch ? yearMatch[0] : '2025';

    if (q.includes('president')) return `election:us-president-${year}`;

    // State elections
    const states = ['california', 'texas', 'florida', 'new york', 'georgia', 'arizona', 'nevada', 'michigan', 'pennsylvania', 'wisconsin'];
    for (const state of states) {
      if (q.includes(state)) return `election:${state}-${year}`;
    }

    // Country elections
    const countries = ['uk', 'germany', 'france', 'canada', 'brazil', 'mexico', 'india'];
    for (const country of countries) {
      if (q.includes(country)) return `election:${country}-${year}`;
    }
  }

  // COMPANIES: Group by company
  const companies = [
    'openai', 'anthropic', 'google', 'apple', 'microsoft', 'meta', 'amazon', 'tesla', 'nvidia',
    'spacex', 'twitter', 'tiktok', 'bytedance', 'netflix', 'disney', 'coinbase', 'binance',
    'stripe', 'databricks', 'openai', 'mistral', 'deepmind', 'xai'
  ];
  for (const company of companies) {
    if (q.includes(company)) {
      // Sub-topic by action
      if (q.includes('ceo') || q.includes('fired') || q.includes('resign') || q.includes('step down')) {
        return `company:${company}:leadership`;
      }
      if (q.includes('ipo') || q.includes('valuation') || q.includes('funding') || q.includes('acquisition')) {
        return `company:${company}:business`;
      }
      if (q.includes('release') || q.includes('launch') || q.includes('ship') || q.includes('announce')) {
        return `company:${company}:product`;
      }
      return `company:${company}:general`;
    }
  }

  // PEOPLE: Group by person
  const people = [
    'trump', 'biden', 'harris', 'elon musk', 'musk', 'sam altman', 'zuckerberg',
    'bezos', 'cook', 'pichai', 'nadella', 'putin', 'zelensky', 'xi jinping',
    'modi', 'netanyahu', 'macron', 'trudeau'
  ];
  for (const person of people) {
    if (q.includes(person)) return `person:${person.replace(' ', '-')}`;
  }

  // CONFLICTS: Group by conflict
  if (text.includes('ukraine') || text.includes('russia')) return 'conflict:ukraine-russia';
  if (text.includes('israel') || text.includes('gaza') || text.includes('hamas')) return 'conflict:israel-gaza';
  if (text.includes('taiwan') || (text.includes('china') && text.includes('military'))) return 'conflict:taiwan';
  if (text.includes('korea') && (text.includes('north') || text.includes('nuclear'))) return 'conflict:north-korea';

  // AI/TECH MILESTONES: Group by milestone type
  if (q.includes('agi') || q.includes('artificial general intelligence')) return 'tech:agi';
  if (q.includes('gpt-5') || q.includes('gpt5')) return 'tech:gpt5';
  if (q.includes('self-driving') || q.includes('autonomous vehicle') || q.includes('fsd')) return 'tech:self-driving';

  // FED/RATES: Group monetary policy
  if (text.includes('fed') || text.includes('federal reserve') || text.includes('interest rate')) {
    if (q.includes('cut')) return 'finance:fed-cuts';
    if (q.includes('hike') || q.includes('raise')) return 'finance:fed-hikes';
    return 'finance:fed';
  }

  // SPORTS CHAMPIONSHIPS: Group by championship
  if (q.includes('super bowl')) return 'sports:super-bowl';
  if (q.includes('world series')) return 'sports:world-series';
  if (q.includes('nba') && (q.includes('champion') || q.includes('finals'))) return 'sports:nba-finals';
  if (q.includes('world cup')) return 'sports:world-cup';
  if (q.includes('champions league')) return 'sports:champions-league';

  // DEFAULT: Use first 4 significant words
  const words = q
    .replace(/[?'"]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['will', 'would', 'could', 'does', 'have', 'been', 'this', 'that', 'with', 'from', 'before', 'after'].includes(w))
    .slice(0, 4);

  return `other:${words.join('-')}`;
}

/**
 * Cluster markets into topics
 */
export function clusterIntoTopics(markets: Market[]): Topic[] {
  const topicMap = new Map<string, Market[]>();

  // Group markets by topic signature
  for (const market of markets) {
    const signature = extractTopicSignature(market.question, market.description);

    if (!topicMap.has(signature)) {
      topicMap.set(signature, []);
    }
    topicMap.get(signature)!.push(market);
  }

  // Convert to Topic objects
  const topics: Topic[] = [];

  for (const [signature, clusterMarkets] of topicMap) {
    // Sort by score to find primary market
    clusterMarkets.sort((a, b) => b.scores.total - a.scores.total);

    const primary = clusterMarkets[0];
    const related = clusterMarkets.slice(1);

    // Aggregate metrics
    const totalVolume24hr = clusterMarkets.reduce((sum, m) => sum + m.volume24hr, 0);
    const totalLiquidity = clusterMarkets.reduce((sum, m) => sum + m.liquidity, 0);

    // Find most contested odds in cluster (closest to 50%)
    const mostContested = clusterMarkets.reduce((best, m) => {
      const distA = Math.abs(best.yesPrice - 0.5);
      const distB = Math.abs(m.yesPrice - 0.5);
      return distB < distA ? m : best;
    }, clusterMarkets[0]);

    // Find biggest price move
    const biggestMove = clusterMarkets.reduce((max, m) => {
      const move = Math.abs(m.priceChange24h || 0);
      return move > Math.abs(max || 0) ? m.priceChange24h : max;
    }, null as number | null);

    // Generate readable topic name
    const topicName = generateTopicName(signature, primary);

    // Calculate topic score (primary score + cluster bonus)
    const clusterBonus = Math.min(0.2, clusterMarkets.length * 0.03); // Up to 20% bonus for large clusters
    const score = primary.scores.total * (1 + clusterBonus);

    topics.push({
      id: signature,
      name: topicName,
      category: primary.category,
      primaryMarket: primary,
      relatedMarkets: related,
      totalVolume24hr,
      totalLiquidity,
      marketCount: clusterMarkets.length,
      mostContestedOdds: mostContested.yesPrice,
      biggestPriceMove: biggestMove,
      score,
    });
  }

  // Sort topics by score
  topics.sort((a, b) => b.score - a.score);

  return topics;
}

/**
 * Generate a readable topic name
 */
function generateTopicName(signature: string, primaryMarket: Market): string {
  const [type, ...rest] = signature.split(':');
  const subtopic = rest.join(':');

  switch (type) {
    case 'price':
      return `${subtopic.charAt(0).toUpperCase() + subtopic.slice(1)} Price Outlook`;
    case 'election':
      return `${subtopic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Election`;
    case 'company':
      const [company, aspect] = subtopic.split(':');
      return `${company.charAt(0).toUpperCase() + company.slice(1)} ${aspect ? `(${aspect})` : ''}`.trim();
    case 'person':
      return subtopic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    case 'conflict':
      return subtopic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Conflict';
    case 'tech':
      return subtopic.toUpperCase();
    case 'finance':
      return subtopic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    case 'sports':
      return subtopic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    default:
      // Use primary market question as fallback
      return primaryMarket.question.length > 60
        ? primaryMarket.question.substring(0, 57) + '...'
        : primaryMarket.question;
  }
}

/**
 * Select diverse topics with beat balancing
 * Ensures no single category dominates the front page
 */
export function selectBalancedTopics(topics: Topic[], totalSlots: number): Topic[] {
  // Maximum stories per category (ensures diversity)
  const MAX_PER_CATEGORY: Record<MarketCategory, number> = {
    POLITICS: 8,
    TECH: 8,
    CRYPTO: 8,
    BUSINESS: 6,
    FINANCE: 6,
    CONFLICT: 5,
    SCIENCE: 5,
    CULTURE: 4,
    SPORTS: 4,
    OTHER: 4,
  };

  const selected: Topic[] = [];
  const categoryCount: Record<MarketCategory, number> = {
    POLITICS: 0, TECH: 0, CRYPTO: 0, BUSINESS: 0, FINANCE: 0,
    CONFLICT: 0, SCIENCE: 0, CULTURE: 0, SPORTS: 0, OTHER: 0,
  };

  // First pass: select top topics respecting category limits
  for (const topic of topics) {
    if (selected.length >= totalSlots) break;

    const cat = topic.category;
    if (categoryCount[cat] < MAX_PER_CATEGORY[cat]) {
      selected.push(topic);
      categoryCount[cat]++;
    }
  }

  // Second pass: fill remaining slots if we have room
  if (selected.length < totalSlots) {
    const remaining = topics.filter(t => !selected.includes(t));
    for (const topic of remaining) {
      if (selected.length >= totalSlots) break;
      selected.push(topic);
    }
  }

  return selected;
}
