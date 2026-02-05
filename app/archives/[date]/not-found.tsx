import Link from 'next/link';

export default function ArchiveNotFound() {
  return (
    <div className="min-h-screen bg-[#f4f1ea] flex items-center justify-center p-8">
      <div className="max-w-lg text-center border-4 border-double border-black bg-white p-8">
        {/* Ornamental header */}
        <div className="flex items-center justify-center mb-6 gap-4">
          <div className="text-xl">✦</div>
          <div className="h-px flex-1 bg-black max-w-16"></div>
          <div className="text-2xl">☠</div>
          <div className="h-px flex-1 bg-black max-w-16"></div>
          <div className="text-xl">✦</div>
        </div>

        <h1 className="font-blackletter text-4xl mb-4">Edition Not Found</h1>

        <p className="font-serif text-gray-700 mb-6 leading-relaxed">
          Our scribes have searched the archives most thoroughly,
          yet no edition bearing this date could be located.
          Perhaps the presses were idle that day, or the records
          have been consumed by the moths of time.
        </p>

        <div className="space-y-3">
          <Link
            href="/archives"
            className="block border-2 border-black px-6 py-3 font-bold uppercase tracking-wider text-sm hover:bg-black hover:text-[#f4f1ea] transition-colors"
          >
            Browse Archives
          </Link>
          <Link
            href="/"
            className="block bg-black text-[#f4f1ea] px-6 py-3 font-bold uppercase tracking-wider text-sm hover:bg-gray-800 transition-colors"
          >
            Today's Edition
          </Link>
        </div>

        {/* Ornamental footer */}
        <div className="flex items-center justify-center mt-8 gap-4">
          <div className="h-px flex-1 bg-gray-300 max-w-24"></div>
          <div className="text-gray-400 text-xs uppercase tracking-widest">Finis</div>
          <div className="h-px flex-1 bg-gray-300 max-w-24"></div>
        </div>
      </div>
    </div>
  );
}
