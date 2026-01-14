import Header from './components/Header';
import LeftSidebar, { MobileSidebar } from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import LeadStory from './components/LeadStory';
import Footer from './components/Footer';
import BottomGrid from './components/BottomGrid';
import AlphaSignals from './components/AlphaSignals';
import MarketTicker from './components/MarketTicker';
import MainContentWrapper from './components/MainContentWrapper';
import ReadableModeToggle from './components/ReadableModeToggle';
import OnboardingFlow from './components/OnboardingFlow';
import { BreakingAlertsTicker, LastUpdatedIndicator, RefreshButton } from './components/LiveUpdates';
import { getMarkets } from './api/markets/route';
import { getEditorial } from './api/editorial/route';
import { getCrypto } from './api/crypto/route';
import { EditorialData } from './types';
import { Metadata } from 'next';
import { cache } from 'react';

export const revalidate = 0; // Check for new edition on every visit (efficiently cached by DB)

// Cached data fetching - prevents duplicate calls between generateMetadata and Home
const getCachedMarkets = cache(async () => getMarkets().catch(() => null));
const getCachedCrypto = cache(async () => getCrypto().catch(() => null));

export async function generateMetadata(): Promise<Metadata> {
  const marketsData = await getCachedMarkets();
  if (!marketsData || marketsData.markets.length === 0) {
    return {
      title: "The Polymarket Times",
      description: "Market insights and predictions.",
    };
  }

  // Note: We don't call getEditorial here to avoid AI generation just for metadata
  // The metadata will use a simpler fallback title
  const mainMarket = marketsData.markets[0];
  const headline = mainMarket?.question || "Market Insights";
  return {
    title: `${headline.slice(0, 50)}... - The Polymarket Times`,
    description: "Daily automated newspaper of prediction markets.",
  };
}

export default async function Home() {
  // Parallel data fetching with caching
  const [marketsData, cryptoData] = await Promise.all([
    getCachedMarkets(),
    getCachedCrypto()
  ]);

  if (!marketsData || marketsData.markets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f1ea] font-serif text-xl border-8 border-double border-black m-4 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-blackletter mb-4">The Printing Press is Jammed</h1>
          <p>Our mechanical scribes are refilling their inkwells. Please check back shortly.</p>
        </div>
      </div>
    );
  }

  // Attempt to fetch editorial with a timeout
  let editorialData: EditorialData | null = null;

  try {
    // Create a timeout promise that rejects after 120 seconds
    // AI generation with Chief Editor can take 60-90 seconds for a full newspaper edition
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Editorial timeout')), 120000);
    });

    if (process.env.NODE_ENV === 'development') console.log("Starting editorial generation...");
    const editRes = await Promise.race([
      getEditorial(marketsData.markets, marketsData.groups),
      timeout
    ]) as EditorialData | { error: string };

    if (!('error' in editRes)) {
      editorialData = editRes;
      if (process.env.NODE_ENV === 'development') console.log("Editorial generation complete!");
    }
  } catch (e: unknown) {
    if (process.env.NODE_ENV === 'development') {
      const message = e instanceof Error ? e.message : String(e);
      console.warn("Editorial generation timed out or failed:", message);
    }
  }

  // Fallback content if editorial fails or times out
  const fallbackHeadlines: Record<string, string> = {};
  const fallbackContent: Record<string, string> = {};
  const fallbackDatelines: Record<string, string> = {};

  // Create Victorian-styled fallback data from raw markets if editorial is missing
  const fallbackLocations = ["LONDON", "NEW YORK", "WASHINGTON", "CHICAGO", "PHILADELPHIA", "BOSTON", "SAN FRANCISCO"];
  marketsData.markets.forEach((m, idx) => {
    // Convert questions to headline style (all caps, remove question mark)
    fallbackHeadlines[m.id] = m.question.replace(/\?$/, '').toUpperCase();

    // Create Victorian-styled fallback content
    const oddsText = m.yesPrice > 0.5
      ? `Market sentiment runs strongly in favor, with ${Math.round(m.yesPrice * 100)} per cent of capital wagered upon the affirmative.`
      : `Considerable doubt prevails among traders, with only ${Math.round(m.yesPrice * 100)} per cent backing the proposition.`;

    fallbackContent[m.id] = m.description
      ? `${m.description}\n\n${oddsText} Volume of trade in the past four-and-twenty hours: ${formatVolume(m.volume24hr)}.`
      : `Our mechanical scribes are still processing the particulars of this matter. ${oddsText} The discerning reader is advised to consult the market directly for full intelligence.`;

    fallbackDatelines[m.id] = fallbackLocations[idx % fallbackLocations.length];
  });

  function formatVolume(vol: number): string {
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)} million`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)} thousand`;
    return `$${Math.round(vol)}`;
  }

  const blueprint = editorialData?.blueprint || {
    stories: marketsData.markets.slice(0, 15).map(m => ({ ...m, layout: 'BRIEF' as const }))
  };
  const headlines = editorialData?.headlines || fallbackHeadlines;
  const content = editorialData?.content || fallbackContent;
  const datelines = editorialData?.datelines || fallbackDatelines;

  // Create lookup for fresh market data by ID
  const freshMarketMap = new Map<string, typeof marketsData.markets[0]>();
  for (const m of marketsData.markets) {
    freshMarketMap.set(m.id, m);
  }

  // Merge cached blueprint stories with fresh market data
  // The blueprint determines WHICH stories to show and their layout,
  // but we use FRESH prices/volumes from the live API
  const stories: typeof blueprint.stories = [];
  for (const story of blueprint.stories) {
    const freshData = freshMarketMap.get(story.id);
    if (freshData) {
      stories.push({
        id: story.id,
        question: story.question,
        slug: story.slug,
        description: story.description,
        outcomes: story.outcomes,
        endDate: story.endDate,
        image: story.image,
        category: story.category,
        layout: story.layout,
        liquidity: story.liquidity,
        // Fresh data from API
        yesPrice: freshData.yesPrice,
        noPrice: freshData.noPrice,
        volume24hr: freshData.volume24hr,
        totalVolume: freshData.totalVolume,
        priceChange24h: freshData.priceChange24h,
        marketStatus: freshData.marketStatus,
        scores: freshData.scores,
        timeHorizon: freshData.timeHorizon || story.timeHorizon || 'MEDIUM_TERM',
      });
    } else {
      stories.push(story);
    }
  }


  // Dedupe stories by ID first (in case curator returns duplicates)
  const seenIds = new Set<string>();
  const uniqueStories = stories.filter(s => {
    if (seenIds.has(s.id)) return false;
    seenIds.add(s.id);
    return true;
  });

  // USE LAYOUT ASSIGNMENTS from Editorial Director
  // LEAD_STORY = main big story (top left)
  // FEATURE = sidebar stories (right side, 5 slots)
  // BRIEF = bottom grid stories

  const mainStory = uniqueStories.find(s => s.layout === 'LEAD_STORY') || uniqueStories[0];

  // Features go to sidebar (5 slots)
  const featureStories = uniqueStories.filter(s => s.layout === 'FEATURE' && s.id !== mainStory?.id);
  const briefStories = featureStories.length >= 5
    ? featureStories.slice(0, 5)
    : [...featureStories, ...uniqueStories.filter(s => s.layout !== 'LEAD_STORY' && !featureStories.includes(s))].slice(0, 5);

  // Tech story for right sidebar - prefer a FEATURE tech story
  const techStory = uniqueStories.find(s =>
    s.category === 'TECH' && s.id !== mainStory?.id && !briefStories.some(b => b.id === s.id)
  ) || uniqueStories.find(s => s.id !== mainStory?.id && !briefStories.some(b => b.id === s.id));

  // Bottom grid = all BRIEF stories + remaining stories
  const usedIds = new Set([mainStory?.id, techStory?.id, ...briefStories.map(s => s.id)].filter(Boolean));
  const bottomStories = uniqueStories.filter(s => !usedIds.has(s.id));

  // Special report - pick an interesting story from bottom grid
  const specialReportStory = bottomStories.find(s =>
    s.category === 'TECH' || s.category === 'CRYPTO' || s.category === 'SCIENCE'
  ) || bottomStories[0];

  // Find Fed/FOMC related market for the Fed Reserve widget
  const fedKeywords = ['fed', 'fomc', 'federal reserve', 'rate cut', 'rate hike', 'interest rate', 'powell'];
  const fedMarket = marketsData?.markets.find(m =>
    fedKeywords.some(kw => m.question.toLowerCase().includes(kw))
  );
  const fedData = fedMarket ? {
    action: fedMarket.yesPrice > 0.6 ? 'CUT' : fedMarket.yesPrice < 0.4 ? 'HOLD' : 'UNCERTAIN',
    consensus: Math.round(Math.max(fedMarket.yesPrice, 1 - fedMarket.yesPrice) * 100),
    description: fedMarket.question,
    link: `https://polymarket.com/event/${fedMarket.slug}`
  } : undefined;

  // Find highly contested markets (closest to 50/50) - DEDUPED
  const contestedSeen = new Set<string>();
  const contestedMarkets = [...uniqueStories]
    .sort((a, b) => Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5))
    .filter(m => {
      if (contestedSeen.has(m.id)) return false;
      contestedSeen.add(m.id);
      return true;
    })
    .slice(0, 2)
    .map(m => ({
      title: m.question, // Full title, no truncation
      volume: formatVol(m.volume24hr || 0),
      yesPercent: Math.round(m.yesPrice * 100),
      noPercent: Math.round((1 - m.yesPrice) * 100),
      link: `https://polymarket.com/event/${m.slug}`,
    }));

  function formatVol(vol: number): string {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
    if (vol >= 1) return `$${Math.round(vol)}`;
    return `$${vol.toFixed(2)}`;
  }

  // Prepare props
  const leadStoryProps = mainStory ? {
    headline: headlines[mainStory.id] || mainStory.question.toUpperCase(),
    author: "Polymarket AI",
    location: datelines[mainStory.id] || "Internet",
    image: mainStory.image || "https://picsum.photos/seed/news/800/600",
    content: content[mainStory.id],
    link: `https://polymarket.com/event/${mainStory.slug}`,
    marketStatus: mainStory.marketStatus,
    contrarianTake: editorialData?.contrarianTakes?.[mainStory.id],
    intelligenceBrief: editorialData?.intelligenceBriefs?.[mainStory.id]
  } : undefined;

  const marketBriefs = briefStories.map(s => ({
    title: headlines[s.id] || s.question,
    odds: `${Math.round(s.yesPrice * 100)}¢`,
    link: `https://polymarket.com/event/${s.slug}`
  }));

  const specialReportProps = specialReportStory ? {
    headline: headlines[specialReportStory.id] || specialReportStory.question,
    description: content[specialReportStory.id] || "Read more about this developing story...",
    image: specialReportStory.image || undefined,
    link: `https://polymarket.com/event/${specialReportStory.slug}`
  } : undefined;

  const techStoryProps = techStory ? {
    headline: headlines[techStory.id] || techStory.question,
    description: content[techStory.id]?.slice(0, 200) + "...", // Snippet
    image: techStory.image || undefined,
    author: datelines[techStory.id] || "George E. Pembrooke",
    link: `https://polymarket.com/event/${techStory.slug}`
  } : undefined;

  const bottomGridProps = bottomStories.map(s => ({
    title: headlines[s.id] || s.question,
    odds: `${Math.round(s.yesPrice * 100)}¢`,
    image: s.image || undefined,
    category: s.category,
    link: `https://polymarket.com/event/${s.slug}`,
    marketStatus: s.marketStatus
  }));

  // Simple markets data for ticker
  const tickerMarkets = marketsData?.markets.slice(0, 20).map(m => ({
    id: m.id,
    question: m.question,
    slug: m.slug,
    yesPrice: m.yesPrice,
    noPrice: m.noPrice,
    volume24hr: m.volume24hr,
    image: m.image,
    category: m.category
  })) || [];

  return (
    <div className="min-h-screen p-2 md:p-8 max-w-[1600px] mx-auto bg-[#f4f1ea] overflow-x-hidden">
        <BreakingAlertsTicker />
        <MarketTicker markets={tickerMarkets} />
      <Header cryptoPrices={cryptoData || undefined} timestamp={editorialData?.timestamp} />

      {/* Live status bar */}
      <div className="flex justify-between items-center py-2 px-4 border-b border-gray-300 mb-4">
        <LastUpdatedIndicator timestamp={editorialData?.timestamp} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden sm:inline">50 stories • All categories</span>
          <RefreshButton />
        </div>
      </div>

      {/* Fallback mode notification */}
      {!editorialData && (
        <div className="border-4 border-double border-black bg-[#e6e2d8] p-4 mb-4 text-center animate-fade-in">
          <h3 className="font-blackletter text-xl mb-1">Manual Edition in Progress</h3>
          <p className="font-serif text-xs italic">
            Our mechanical scribes are still preparing the full editorial. You are viewing market intelligence in its raw form.
            Please refresh in a few moments for the complete treatment.
          </p>
        </div>
      )}

      {/* Mobile-only collapsible sidebar */}
      <MobileSidebar briefs={marketBriefs} specialReport={specialReportProps} />

      <MainContentWrapper>
        <main className="grid grid-cols-1 md:grid-cols-12 gap-8 border-b-4 border-double-thick border-black pb-8">

          {/* Left Column (Approx 20%) */}
          <div className="md:col-span-2 hidden md:block">
            <LeftSidebar briefs={marketBriefs} specialReport={specialReportProps} />
          </div>

          {/* Center Column (Approx 60%) */}
          <div className="md:col-span-7 border-r border-black pr-6">
            <LeadStory {...leadStoryProps} />
          </div>

          {/* Right Column (Approx 20%) */}
          <div className="md:col-span-3">
            <RightSidebar techStory={techStoryProps} fedData={fedData} />
          </div>

        </main>
      </MainContentWrapper>

      {/* Alpha Signals - Contrarian takes prominently displayed */}
      {editorialData?.contrarianTakes && Object.keys(editorialData.contrarianTakes).length > 0 && (
        <AlphaSignals
          contrarianTakes={editorialData.contrarianTakes}
          headlines={headlines}
          stories={uniqueStories}
        />
      )}

      <BottomGrid stories={bottomGridProps} />

      <Footer contestedMarkets={contestedMarkets} />

      {/* Readable Mode Toggle */}
      <ReadableModeToggle />

      {/* Onboarding Flow for first-time visitors */}
      <OnboardingFlow />
    </div>
  );
}
