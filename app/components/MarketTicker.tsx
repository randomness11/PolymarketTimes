import React from 'react';
import { SimpleMarket } from '../types';

interface MarketTickerProps {
    markets: SimpleMarket[];
}

export default function MarketTicker({ markets }: MarketTickerProps) {
    if (!markets || markets.length === 0) return null;

    // Duplicate content for seamless scrolling
    const tickerContent = [...markets, ...markets]; // x2 should be enough for basic width, maybe x4 for wide screens

    return (
        <div className="w-full bg-black dark:bg-[#2a2520] text-white dark:text-[#e8e4d9] overflow-hidden border-b-2 border-black dark:border-[#4a4540] py-1 font-mono text-xs uppercase tracking-widest z-50">
            <div className="animate-marquee whitespace-nowrap flex gap-8">
                {tickerContent.map((market, index) => (
                    <a
                        key={`${market.id}-${index}`}
                        href={`https://polymarket.com/event/${market.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 hover:text-green-400 transition-colors"
                    >
                        <span className="font-bold">{market.slug.replace(/-/g, ' ')}</span>
                        <span className={market.yesPrice > 0.5 ? "text-green-400" : "text-red-400"}>
                            {Math.round(market.yesPrice * 100)}¢
                        </span>
                        {/* Optional Volume or Change indicator could go here */}
                    </a>
                ))}
            </div>
        </div>
    );
}
