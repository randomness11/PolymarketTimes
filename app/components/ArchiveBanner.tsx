import Link from 'next/link';

interface ArchiveBannerProps {
  date: string;
}

export function ArchiveBanner({ date }: ArchiveBannerProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-amber-100 border-b-4 border-amber-600 px-4 py-3">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📜</span>
          <div>
            <div className="font-bold text-amber-900 text-sm uppercase tracking-wider">
              Archived Edition
            </div>
            <div className="text-amber-800 text-xs">
              {formattedDate}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/archives"
            className="text-xs border border-amber-700 text-amber-800 px-3 py-1.5 hover:bg-amber-200 transition-colors"
          >
            ← Back to Archives
          </Link>
          <Link
            href="/"
            className="text-xs bg-amber-700 text-white px-3 py-1.5 hover:bg-amber-800 transition-colors font-bold"
          >
            Today's Edition →
          </Link>
        </div>
      </div>
    </div>
  );
}
