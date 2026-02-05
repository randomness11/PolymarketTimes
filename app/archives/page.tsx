import { Metadata } from 'next';
import { getSupabase } from '../api/lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArchiveCalendar } from '../components/ArchiveCalendar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Archives - The Polymarket Times',
  description: 'Browse past editions of The Polymarket Times. Historical coverage of prediction market news.',
  openGraph: {
    title: 'Archives - The Polymarket Times',
    description: 'Browse past editions of The Polymarket Times.',
    images: ['/api/og?edition=latest'],
  },
};

// Fetch all available edition dates
async function getEditionDates(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Fetch only daily baseline editions (YYYY-MM-DD format, 10 chars)
  const { data, error } = await supabase
    .from('editions')
    .select('date_str')
    .order('date_str', { ascending: false });

  if (error || !data) {
    console.error('Error fetching edition dates:', error);
    return [];
  }

  // Filter to only include daily editions (YYYY-MM-DD format)
  return data
    .map(row => row.date_str)
    .filter(dateStr => /^\d{4}-\d{2}-\d{2}$/.test(dateStr));
}

export default async function ArchivesPage() {
  const editionDates = await getEditionDates();

  return (
    <div className="min-h-screen bg-[#f4f1ea] font-serif">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Ornamental Header */}
        <div className="flex items-center justify-center mb-6 gap-4">
          <div className="text-2xl">✦</div>
          <div className="h-px flex-1 bg-black max-w-xs"></div>
          <div className="text-3xl">❧</div>
          <div className="h-px flex-1 bg-black max-w-xs"></div>
          <div className="text-2xl">✦</div>
        </div>

        <h1 className="font-blackletter text-5xl md:text-6xl text-center mb-4">
          The Archives
        </h1>

        <p className="text-center text-gray-600 mb-8 max-w-xl mx-auto">
          Browse through past editions of The Polymarket Times. Each edition captures
          the state of prediction markets at that moment in time.
        </p>

        {/* Today's Edition Link */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="inline-block border-2 border-black px-6 py-3 font-bold uppercase tracking-wider text-sm hover:bg-black hover:text-[#f4f1ea] transition-colors"
          >
            ← Today's Edition
          </Link>
        </div>

        {/* Calendar */}
        {editionDates.length > 0 ? (
          <ArchiveCalendar editionDates={editionDates} />
        ) : (
          <div className="text-center py-16 border border-black bg-white">
            <div className="font-blackletter text-3xl mb-4">No Archives Found</div>
            <p className="text-gray-600">
              Our presses have not yet produced any editions for the archives.
            </p>
          </div>
        )}

        {/* Stats */}
        {editionDates.length > 0 && (
          <div className="mt-12 text-center border-t border-black pt-8">
            <div className="font-blackletter text-2xl mb-2">
              {editionDates.length} Edition{editionDates.length !== 1 ? 's' : ''} in Archives
            </div>
            <p className="text-sm text-gray-600">
              First edition: {editionDates[editionDates.length - 1]} •
              Latest: {editionDates[0]}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
