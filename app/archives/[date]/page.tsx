import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabase } from '../../api/lib/supabase';
import Header from '../../components/Header';
import LeftSidebar, { MobileSidebar } from '../../components/LeftSidebar';
import RightSidebar from '../../components/RightSidebar';
import LeadStory from '../../components/LeadStory';
import Footer from '../../components/Footer';
import BottomGrid from '../../components/BottomGrid';
import AlphaSignals from '../../components/AlphaSignals';
import MainContentWrapper from '../../components/MainContentWrapper';
import ReadableModeToggle from '../../components/ReadableModeToggle';
import { ArchiveBanner } from '../../components/ArchiveBanner';
import type { EditorialData, Story } from '../../types';

interface PageProps {
  params: Promise<{ date: string }>;
}

// Validate date format (YYYY-MM-DD)
function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = Date.parse(date);
  return !isNaN(parsed);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;

  if (!isValidDate(date)) {
    return { title: 'Edition Not Found - The Polymarket Times' };
  }

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    title: `${formattedDate} - The Polymarket Times Archive`,
    description: `Historical edition of The Polymarket Times from ${formattedDate}`,
    openGraph: {
      title: `${formattedDate} - The Polymarket Times Archive`,
      description: `Historical edition from ${formattedDate}`,
      images: [`/api/og?edition=${date}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${formattedDate} - The Polymarket Times Archive`,
      images: [`/api/og?edition=${date}`],
    },
  };
}

// Helper function for volume formatting
function formatVol(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
  if (vol >= 1) return `$${Math.round(vol)}`;
  return `$${vol.toFixed(2)}`;
}

export default async function ArchiveEditionPage({ params }: PageProps) {
  const { date } = await params;

  // Validate date format
  if (!isValidDate(date)) {
    notFound();
  }

  // Fetch edition from Supabase
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Database unavailable');
  }

  const { data: edition, error } = await supabase
    .from('editions')
    .select('data, date_str, created_at')
    .eq('date_str', date)
    .single();

  if (error || !edition?.data) {
    notFound();
  }

  const editorialData = edition.data as EditorialData;
  const blueprint = editorialData.blueprint;
  const headlines = editorialData.headlines || {};
  const content = editorialData.content || {};
  const datelines = editorialData.datelines || {};

  // Get stories from blueprint
  const stories = blueprint?.stories || [];

  // Dedupe stories by ID
  const seenIds = new Set<string>();
  const uniqueStories = stories.filter((s: Story) => {
    if (seenIds.has(s.id)) return false;
    seenIds.add(s.id);
    return true;
  });

  // Layout assignments from Editorial Director
  const mainStory = uniqueStories.find((s: Story) => s.layout === 'LEAD_STORY') || uniqueStories[0];

  const featureStories = uniqueStories.filter((s: Story) => s.layout === 'FEATURE' && s.id !== mainStory?.id);
  const briefStories = featureStories.length >= 5
    ? featureStories.slice(0, 5)
    : [...featureStories, ...uniqueStories.filter((s: Story) => s.layout !== 'LEAD_STORY' && !featureStories.includes(s))].slice(0, 5);

  const techStory = uniqueStories.find((s: Story) =>
    s.category === 'TECH' && s.id !== mainStory?.id && !briefStories.some((b: Story) => b.id === s.id)
  ) || uniqueStories.find((s: Story) => s.id !== mainStory?.id && !briefStories.some((b: Story) => b.id === s.id));

  const usedIds = new Set([mainStory?.id, techStory?.id, ...briefStories.map((s: Story) => s.id)].filter(Boolean));
  const bottomStories = uniqueStories.filter((s: Story) => !usedIds.has(s.id));

  const specialReportStory = bottomStories.find((s: Story) =>
    s.category === 'TECH' || s.category === 'CRYPTO' || s.category === 'SCIENCE'
  ) || bottomStories[0];

  // Prepare props (same as homepage)
  const leadStoryProps = mainStory ? {
    headline: headlines[mainStory.id] || mainStory.question.toUpperCase(),
    author: "Polymarket AI",
    location: datelines[mainStory.id] || "Internet",
    image: mainStory.image || "https://picsum.photos/seed/news/800/600",
    content: content[mainStory.id],
    link: `https://polymarket.com/event/${mainStory.slug}`,
    marketStatus: mainStory.marketStatus,
    contrarianTake: editorialData.contrarianTakes?.[mainStory.id],
    intelligenceBrief: editorialData.intelligenceBriefs?.[mainStory.id]
  } : undefined;

  const marketBriefs = briefStories.map((s: Story) => ({
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
    description: content[techStory.id]?.slice(0, 200) + "...",
    image: techStory.image || undefined,
    author: datelines[techStory.id] || "George E. Pembrooke",
    link: `https://polymarket.com/event/${techStory.slug}`
  } : undefined;

  const bottomGridProps = bottomStories.map((s: Story) => ({
    title: headlines[s.id] || s.question,
    odds: `${Math.round(s.yesPrice * 100)}¢`,
    image: s.image || undefined,
    category: s.category,
    link: `https://polymarket.com/event/${s.slug}`,
    marketStatus: s.marketStatus
  }));

  // Contested markets for footer
  const contestedSeen = new Set<string>();
  const contestedMarkets = [...uniqueStories]
    .sort((a, b) => Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5))
    .filter((m: Story) => {
      if (contestedSeen.has(m.id)) return false;
      contestedSeen.add(m.id);
      return true;
    })
    .slice(0, 2)
    .map((m: Story) => ({
      title: m.question,
      volume: formatVol(m.volume24hr || 0),
      yesPercent: Math.round(m.yesPrice * 100),
      noPercent: Math.round((1 - m.yesPrice) * 100),
      link: `https://polymarket.com/event/${m.slug}`,
    }));

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <ArchiveBanner date={date} />

      <div className="p-2 md:p-8 max-w-[1600px] mx-auto overflow-x-hidden">
        <Header timestamp={editorialData.timestamp} />

        {/* Archive notice */}
        <div className="border-2 border-amber-600 bg-amber-50 p-4 mb-4 text-center">
          <h3 className="font-blackletter text-xl mb-1 text-amber-900">Historical Edition</h3>
          <p className="font-serif text-xs italic text-amber-800">
            You are viewing an archived edition. Market prices and odds reflect the state at the time of publication,
            not current values.
          </p>
        </div>

        {/* Mobile-only collapsible sidebar */}
        <MobileSidebar briefs={marketBriefs} specialReport={specialReportProps} />

        <MainContentWrapper>
          <main className="grid grid-cols-1 md:grid-cols-12 gap-8 border-b-4 border-double-thick border-black pb-8">
            {/* Left Column */}
            <div className="md:col-span-2 hidden md:block">
              <LeftSidebar briefs={marketBriefs} specialReport={specialReportProps} />
            </div>

            {/* Center Column */}
            <div className="md:col-span-7 md:border-r md:border-black pr-0 md:pr-6">
              <LeadStory {...leadStoryProps} />
            </div>

            {/* Right Column */}
            <div className="hidden md:block md:col-span-3">
              <RightSidebar techStory={techStoryProps} />
            </div>
          </main>
        </MainContentWrapper>

        {/* Alpha Signals */}
        {editorialData.contrarianTakes && Object.keys(editorialData.contrarianTakes).length > 0 && (
          <AlphaSignals
            contrarianTakes={editorialData.contrarianTakes}
            headlines={headlines}
            stories={uniqueStories}
          />
        )}

        <BottomGrid stories={bottomGridProps} />

        <Footer contestedMarkets={contestedMarkets} />

        <ReadableModeToggle />
      </div>
    </div>
  );
}
