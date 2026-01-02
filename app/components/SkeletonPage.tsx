'use client';

import Header from './Header';
import Footer from './Footer';

export default function SkeletonPage() {
    return (
        <div className="min-h-screen p-2 md:p-8 max-w-[1600px] mx-auto bg-[#f4f1ea] overflow-x-hidden">
            {/* Header stamps on instantly or with a quick fade */}
            <div className="animate-fade-in duration-700">
                <Header />
            </div>

            <main className="grid grid-cols-1 md:grid-cols-12 gap-8 border-b-4 border-double-thick border-black pb-8">

                {/* Left Column (Approx 20%) - Briefs */}
                <div className="md:col-span-2 hidden md:block animate-print-reveal" style={{ animationDelay: '200ms' }}>
                    <div className="border-b-2 border-black mb-4 pb-2">
                        <div className="ink-block w-24 h-4"></div>
                    </div>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="mb-4 border-b border-gray-300 pb-2">
                            <div className="ink-block w-full h-3 mb-2" style={{ animationDelay: `${i * 100}ms` }}></div>
                            <div className="flex justify-between">
                                <div className="ink-block w-12 h-3" style={{ animationDelay: `${i * 100 + 50}ms` }}></div>
                                <div className="ink-block w-8 h-3" style={{ animationDelay: `${i * 100 + 50}ms` }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Center Column (Approx 60%) - Lead Story */}
                <div className="md:col-span-7 border-r border-black pr-6 animate-print-reveal" style={{ animationDelay: '400ms' }}>
                    <div className="text-center mb-6">
                        {/* Headline */}
                        <div className="ink-block w-3/4 h-8 md:h-12 mx-auto mb-4" style={{ animationDelay: '500ms' }}></div>
                        <div className="ink-block w-1/2 h-6 mx-auto mb-4" style={{ animationDelay: '600ms' }}></div>

                        {/* Image Placeholder */}
                        <div className="w-full h-[400px] mb-4 bg-neutral-200 grayscale opacity-0 animate-fade-in duration-1000 delay-700 flex items-center justify-center border border-black">
                            <span className="font-blackletter text-4xl opacity-20 transform -rotate-12">Developing...</span>
                        </div>

                        <div className="flex justify-between items-center border-y border-black py-2 mb-4">
                            <div className="ink-block w-32 h-3" style={{ animationDelay: '800ms' }}></div>
                            <div className="ink-block w-24 h-3" style={{ animationDelay: '800ms' }}></div>
                        </div>

                        {/* Article Text */}
                        <div className="space-y-4 text-justify">
                            <div className="ink-block w-full h-4" style={{ animationDelay: '900ms' }}></div>
                            <div className="ink-block w-full h-4" style={{ animationDelay: '950ms' }}></div>
                            <div className="ink-block w-[95%] h-4" style={{ animationDelay: '1000ms' }}></div>
                            <div className="ink-block w-full h-4" style={{ animationDelay: '1050ms' }}></div>
                            <div className="ink-block w-[90%] h-4" style={{ animationDelay: '1100ms' }}></div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Approx 20%) - Tech/Widgets */}
                <div className="md:col-span-3 animate-print-reveal" style={{ animationDelay: '600ms' }}>
                    <div className="border-b-2 border-black mb-4 pb-2">
                        <div className="ink-block w-24 h-4" style={{ animationDelay: '700ms' }}></div>
                    </div>
                    <div className="mb-6">
                        <div className="w-full h-48 mb-3 border border-black p-1 bg-neutral-100 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-2 border-gray-300 animate-spin border-t-black"></div>
                        </div>
                        <div className="ink-block w-full h-6 mb-2" style={{ animationDelay: '800ms' }}></div>
                        <div className="ink-block w-full h-3 mb-1" style={{ animationDelay: '900ms' }}></div>
                        <div className="ink-block w-2/3 h-3 mb-1" style={{ animationDelay: '1000ms' }}></div>
                    </div>
                    <div className="border-t border-black pt-4">
                        {/* Fed Widget Placeholder */}
                        <div className="w-full h-32 border border-black p-4 flex flex-col justify-center items-center opacity-0 animate-fade-in duration-1000 delay-1000">
                            <div className="text-sm font-bold mb-2">PROBABILITY ENGINE</div>
                            <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                                <div className="h-full bg-black w-1/2 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            {/* Bottom Status Bar - Diegetic UI */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#f4f1ea] border-t-2 border-black p-2 flex justify-between items-center text-xs font-mono uppercase z-50">
                <div>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    PRESS STATUS: RUNNING
                </div>
                <div className="hidden md:block">
                    TYPESETTING EDITION...
                </div>
                <div>
                    INK LEVEL: 98%
                </div>
            </div>

            {/* Bottom Grid Skeleton (Simplified) */}
            <div className="border-b-4 border-double-thick border-black py-8 opacity-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-48 border border-gray-200 bg-gray-50/50"></div>
                    ))}
                </div>
            </div>

            <Footer />
        </div>
    );
}
