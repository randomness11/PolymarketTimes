import React from 'react';

interface ContestedMarket {
    title: string;
    volume: string;
    yesPercent: number;
    noPercent: number;
    yesLabel?: string;
    noLabel?: string;
    link?: string;
}

interface FooterProps {
    contestedMarkets?: ContestedMarket[];
}

function formatVolume(vol: number): string {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
    return `$${vol}`;
}

export default function Footer({ contestedMarkets }: FooterProps) {
    // Default fallback if no data provided
    const markets = contestedMarkets?.slice(0, 2) || [
        { title: 'Loading...', volume: '—', yesPercent: 50, noPercent: 50 },
        { title: 'Loading...', volume: '—', yesPercent: 50, noPercent: 50 },
    ];

    return (
        <footer className="mt-8 border-t-2 border-black pt-4">
            {/* Ornamental Footer Header */}
            <div className="flex items-center justify-center mb-6 gap-4">
                <div className="text-2xl">※</div>
                <div className="h-px flex-1 bg-black"></div>
                <div className="text-3xl">✾</div>
                <div className="h-px flex-1 bg-black"></div>
                <div className="text-2xl">※</div>
            </div>
            {/* Highly Contested Markets Ticker */}
            <div className="border border-black p-4 mb-8 bg-gray-100">
                <div className="flex justify-between items-center border-b border-black mb-2 pb-1">
                    <h3 className="font-blackletter text-xl">Highly Contested Markets</h3>
                    <span className="text-[10px] uppercase tracking-widest">Data From The Floor</span>
                </div>
                <div className="flex flex-col md:flex-row gap-8 justify-between">
                    {markets.map((market, idx) => (
                        <div key={idx} className="flex-1">
                            <div className="flex justify-between text-xs font-bold mb-1">
                                <a
                                    href={market.link || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline flex-1 mr-2"
                                >
                                    {market.title}
                                </a>
                                <span className="font-mono text-gray-500 whitespace-nowrap">Vol: {market.volume}</span>
                            </div>
                            <div className="h-4 bg-gray-300 w-full flex border border-black text-[9px] leading-4 text-white font-bold text-center">
                                <div
                                    className="bg-green-700"
                                    style={{ width: `${market.yesPercent}%` }}
                                >
                                    {market.yesLabel || `YES ${market.yesPercent}%`}
                                </div>
                                <div
                                    className="bg-red-700"
                                    style={{ width: `${market.noPercent}%` }}
                                >
                                    {market.noLabel || `NO ${market.noPercent}%`}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Notices & Lost Fortunes (Moved here or separate?) - Let's put Notices here for now as bottom columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-black pt-8 text-[10px] font-serif leading-tight">
                <div className="text-center">
                    <h4 className="font-bold uppercase mb-2">About Us</h4>
                    <p>The Polymarket Times is the world's premier prediction chronicle, printed daily on the Ethereum blockchain for the discerning speculator.</p>
                </div>
                <div className="text-center border-l border-r border-gray-300 px-4">
                    <h4 className="font-bold uppercase mb-2">Dispatch</h4>
                    <p>Send all correspondence via smart contract to 0xTheTimes. No unsolicited alerts accepted.</p>
                </div>
                <div className="text-center">
                    <h4 className="font-bold uppercase mb-2">Notices & Lost Fortunes</h4>
                    <ul className="text-left list-disc list-inside space-y-1">

                        <li>FOR SALE: One slightly used NFT. Mint condition. Inquire within.</li>
                        <li>WANTED: Oracle for reliable data feed. Must be resistant to Sybil attacks.</li>
                    </ul>
                </div>
            </div>

            <div className="text-center mt-8 mb-4">
                <h1 className="font-blackletter text-4xl text-gray-400 opacity-50">The Polymarket Times</h1>
                <div className="text-[9px] uppercase tracking-[0.3em] text-gray-400 mt-1">Est 2025 • New York • London • The Metaverse</div>
                <div className="mt-3 text-xs text-gray-500">
                    An experiment by <a href="https://x.com/ankitkr0" target="_blank" rel="noopener noreferrer" className="underline hover:text-black">@ankitkr0</a> • <span className="font-mono">$TIMES</span> coming soon
                </div>
            </div>
        </footer>
    );
}
