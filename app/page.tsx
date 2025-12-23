import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import LeadStory from './components/LeadStory';
import Footer from './components/Footer';
import BottomGrid from './components/BottomGrid';
import MarketTicker from './components/MarketTicker';
import { getMarkets } from './api/markets/route';
import { getEditorial } from './api/editorial/route';
import { getCrypto } from './api/crypto/route';
import { EditorialData } from './types';
import { Metadata } from 'next';

export const revalidate = 0; // Check for new edition on every visit (efficiently cached by DB)

export async function generateMetadata(): Promise<Metadata> {
  const editorialRes = await getMarkets().then(m =>
    m.markets.length > 0 ? getEditorial(m.markets, m.groups) : null
  );

  if (editorialRes && !('error' in editorialRes)) {
    const mainStoryId = editorialRes.blueprint.stories[0]?.id;
    const headline = editorialRes.headlines[mainStoryId] || "Market Insights";
    return {
      title: `${headline} - The Polymarket Times`,
      description: "Daily automated newspaper of prediction markets.",
    };
  }

  return {
    title: "The Polymarket Times",
    description: "Market insights and predictions.",
  };
}

export default async function Home() {
  // Parallel data fetching
  const [marketsData, cryptoData] = await Promise.all([
    getMarkets(),
    getCrypto()
  ]);

  // If markets fetched successfully, generate editorial
  let editorialData: EditorialData | null = null;
  if (marketsData && marketsData.markets.length > 0) {
    const editRes = await getEditorial(marketsData.markets, marketsData.groups);
    if (!('error' in editRes)) {
      editorialData = editRes;
    }
  }

  // Fallback if editorial fails?
  // Ideally getEditorial returns a rigid structure or we handle nulls below.
  // If null, we might show a maintenance page or empty state.
  if (!editorialData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f1ea] font-serif text-xl border-8 border-double border-black m-4 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-blackletter mb-4">The Printing Press is Jammed</h1>
          <p>Our mechanical scribes are refilling their inkwells. Please check back shortly.</p>
        </div>
      </div>
    );
  }

  const { blueprint, content, headlines, datelines } = editorialData;
  const stories = blueprint.stories;

  // Dedupe stories by ID first (in case curator returns duplicates)
  const seenIds = new Set<string>();
  const uniqueStories = stories.filter(s => {
    if (seenIds.has(s.id)) return false;
    seenIds.add(s.id);
    return true;
  });

  // Simple slicing for layout
  const mainStory = uniqueStories[0];
  const briefStories = uniqueStories.slice(1, 6);
  const techStory = uniqueStories.find(s => s.category === 'TECH' && s.id !== mainStory?.id) || uniqueStories[6];
  const bottomStories = uniqueStories.slice(7); // All remaining stories
  const specialReportStory = uniqueStories[10] || uniqueStories[5];

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
    link: `https://polymarket.com/event/${mainStory.slug}`
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
    link: `https://polymarket.com/event/${s.slug}`
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
      <MarketTicker markets={tickerMarkets} />
      <Header cryptoPrices={cryptoData} timestamp={editorialData?.timestamp} />

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
          <RightSidebar techStory={techStoryProps} />
        </div>

      </main>

      <BottomGrid stories={bottomGridProps} />

      <Footer contestedMarkets={contestedMarkets} />
    </div>
  );
}
