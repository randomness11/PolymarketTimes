import React from 'react';

// Shared type (can move to a centralized type file later)
interface MarketBrief {
    title: string;
    odds: string;
    link?: string;
}

export interface SidebarStory {
    headline: string;
    description: string;
    image?: string;
    link?: string;
}

interface LeftSidebarProps {
    briefs?: MarketBrief[];
    specialReport?: SidebarStory;
}

export function MarketBriefs({ briefs }: { briefs: MarketBrief[] }) {
    return (
        <div className="mb-8 border-b-2 border-black pb-4">
            <h3 className="font-sans font-bold text-center border-t-2 border-b-2 border-black py-1 mb-4 text-sm tracking-widest bg-gray-100">
                MARKET BRIEFS
            </h3>
            <div className="space-y-4">
                {briefs.map((brief, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-dotted border-gray-400 pb-1 hover:bg-gray-50 transition-colors">
                        <a href={brief.link || "#"} target="_blank" rel="noopener noreferrer" className="font-bold text-sm leading-tight w-2/3 hover:underline">
                            {brief.title}
                        </a>
                        <span className="font-mono text-lg font-bold">{brief.odds}</span>
                    </div>
                ))}
            </div>
            <div className="text-center mt-4">
                <a href="https://polymarket.com/markets" target="_blank" rel="noopener noreferrer">
                    <button className="border border-black px-2 py-0.5 text-[10px] uppercase hover:bg-black hover:text-white transition">View All Briefs</button>
                </a>
            </div>
        </div>
    );
}

export function WisdomWidget() {
    return (
        <div className="border-t-2 border-black pt-4 mb-8">
            <div className="text-center mb-2">
                <span className="text-[10px] uppercase tracking-widest border-b border-black">Wisdom of the Ages</span>
            </div>
            <div className="border border-black p-4 bg-gray-50 text-center font-serif italic text-sm">
                "The market is a voting machine in the short run, but a weighing machine in the long run."
                <div className="text-[10px] not-italic font-bold mt-2 uppercase">— Benjamin Graham</div>
            </div>
        </div>
    );
}

export function WeatherWidget() {
    return (
        <div className="text-center border-t border-black pt-2">
            <h4 className="font-bold text-[10px] uppercase">Weather Forecast</h4>
            <p className="text-[10px] italic">Overcast with high probability of volatility.</p>
        </div>
    );
}

export default function LeftSidebar({ briefs = [], specialReport }: LeftSidebarProps) {
    return (
        <aside className="border-r border-black pr-4 pl-2 h-full">
            <MarketBriefs briefs={briefs} />

            {specialReport && (
                <div className="mb-8">
                    <a href={specialReport.link || "#"} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                        <div className="bg-black w-full h-32 mb-2 grayscale overflow-hidden">
                            {specialReport.image ? (
                                <img src={specialReport.image} alt={specialReport.headline} className="w-full h-full object-cover filter grayscale contrast-125" />
                            ) : (
                                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                    <span className="font-blackletter text-4xl text-gray-500">PT</span>
                                </div>
                            )}
                        </div>
                        <h3 className="font-display font-bold text-xl leading-none mb-1 hover:underline">{specialReport.headline}</h3>
                    </a>
                    <div className="text-[10px] uppercase font-bold mb-2 tracking-wider">— A Special Report —</div>
                    <div className="font-serif text-sm text-justify leading-tight">
                        <span className="text-4xl float-left mr-1 font-blackletter line-[0.8]">{specialReport.description.charAt(0)}</span>
                        {specialReport.description.slice(1)}
                    </div>
                </div>
            )}

            <WisdomWidget />
            <WeatherWidget />
        </aside>
    );
}
