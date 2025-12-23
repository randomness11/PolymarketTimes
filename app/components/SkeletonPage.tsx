'use client';

import Header from './Header';
import Footer from './Footer';

export default function SkeletonPage() {
    return (
        <div className="min-h-screen p-2 md:p-8 max-w-[1600px] mx-auto bg-[#f4f1ea] overflow-x-hidden">
            {/* Header with default/empty state */}
            <Header />

            <main className="grid grid-cols-1 md:grid-cols-12 gap-8 border-b-4 border-double-thick border-black pb-8">

                {/* Left Column (Approx 20%) */}
                <div className="md:col-span-2 hidden md:block">
                    {/* Briefs Skeleton */}
                    <div className="border-b-2 border-black mb-4 pb-2">
                        <div className="skeleton-bar w-24 h-4"></div>
                    </div>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="mb-4 border-b border-gray-300 pb-2">
                            <div className="skeleton-bar w-full h-3 mb-2"></div>
                            <div className="flex justify-between">
                                <div className="skeleton-bar w-12 h-3"></div>
                                <div className="skeleton-bar w-8 h-3"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Center Column (Approx 60%) */}
                <div className="md:col-span-7 border-r border-black pr-6">
                    {/* Lead Story Skeleton */}
                    <div className="text-center mb-6">
                        <div className="skeleton-bar w-3/4 h-8 md:h-12 mx-auto mb-4"></div>
                        <div className="skeleton-bar w-1/2 h-6 mx-auto mb-4"></div>
                        <div className="skeleton-image w-full h-[400px] mb-4"></div>
                        <div className="flex justify-between items-center border-y border-black py-2 mb-4">
                            <div className="skeleton-bar w-32 h-3"></div>
                            <div className="skeleton-bar w-24 h-3"></div>
                        </div>
                        <div className="space-y-4 text-justify">
                            <div className="skeleton-bar w-full h-4"></div>
                            <div className="skeleton-bar w-full h-4"></div>
                            <div className="skeleton-bar w-[95%] h-4"></div>
                            <div className="skeleton-bar w-full h-4"></div>
                            <div className="skeleton-bar w-[90%] h-4"></div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Approx 20%) */}
                <div className="md:col-span-3">
                    {/* Tech Story / Widgets Skeleton */}
                    <div className="border-b-2 border-black mb-4 pb-2">
                        <div className="skeleton-bar w-24 h-4"></div>
                    </div>
                    <div className="mb-6">
                        <div className="skeleton-image w-full h-48 mb-3 border border-black p-1"></div>
                        <div className="skeleton-bar w-full h-6 mb-2"></div>
                        <div className="skeleton-bar w-full h-3 mb-1"></div>
                        <div className="skeleton-bar w-2/3 h-3 mb-1"></div>
                    </div>
                    <div className="border-t border-black pt-4">
                        <div className="skeleton-bar w-full h-32"></div>
                    </div>
                </div>

            </main>

            {/* Bottom Grid Skeleton */}
            <div className="border-b-4 border-double-thick border-black py-8">
                <div className="flex items-center justify-between border-b border-black mb-6 pb-2">
                    <div className="skeleton-bar w-48 h-6"></div>
                    <div className="skeleton-bar w-24 h-3"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col border-r border-gray-300 last:border-r-0 pr-4 last:pr-0">
                            <div className="skeleton-image w-full h-32 mb-3 border border-black p-0.5"></div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="skeleton-bar w-16 h-3"></div>
                                <div className="skeleton-bar w-8 h-3"></div>
                            </div>
                            <div className="skeleton-bar w-full h-12"></div>
                        </div>
                    ))}
                </div>
            </div>

            <Footer />
        </div>
    );
}
