export default function ArchivesLoading() {
  return (
    <div className="min-h-screen bg-[#f4f1ea] font-serif">
      {/* Skeleton Header */}
      <div className="border-b-4 border-black mb-8 py-6">
        <div className="text-center">
          <div className="h-12 bg-gray-200 animate-pulse max-w-md mx-auto rounded" />
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Ornamental Header Skeleton */}
        <div className="flex items-center justify-center mb-6 gap-4">
          <div className="h-4 w-4 bg-gray-200 animate-pulse rounded-full" />
          <div className="h-px flex-1 bg-gray-200 max-w-xs" />
          <div className="h-6 w-6 bg-gray-200 animate-pulse rounded-full" />
          <div className="h-px flex-1 bg-gray-200 max-w-xs" />
          <div className="h-4 w-4 bg-gray-200 animate-pulse rounded-full" />
        </div>

        {/* Title Skeleton */}
        <div className="h-16 bg-gray-200 animate-pulse max-w-sm mx-auto mb-8 rounded" />

        {/* Description Skeleton */}
        <div className="h-6 bg-gray-200 animate-pulse max-w-xl mx-auto mb-12 rounded" />

        {/* Calendar Skeleton */}
        <div className="max-w-2xl mx-auto">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="h-10 w-10 bg-gray-200 animate-pulse rounded" />
            <div className="h-10 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-10 w-10 bg-gray-200 animate-pulse rounded" />
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {Array(7).fill(null).map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 animate-pulse rounded" />
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array(35).fill(null).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
