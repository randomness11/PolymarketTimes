import React from 'react';

interface HeaderProps {
    cryptoPrices?: {
        btc: { price: string, change: string, direction: 'up' | 'down' };
        eth: { price: string, change: string, direction: 'up' | 'down' };
        sol: { price: string, change: string, direction: 'up' | 'down' };
    };
    timestamp?: string;
}

export default function Header({ cryptoPrices, timestamp }: HeaderProps) {
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).toUpperCase();

    return (
        <header className="flex flex-col border-b-4 border-black mb-8">
            {/* Top Meta Bar */}
            <div className="flex justify-between items-center py-1 border-b border-black text-xs font-bold font-serif tracking-widest px-2">
                <div>VOL. CXXVII... No. 42,109</div>
                <div>NEW YORK, {currentDate}</div>
                <div>PRICE ONE DOLLAR ($1.00)</div>
            </div>

            {/* Main Masthead Area */}
            <div className="relative py-6 md:py-8 flex justify-between items-center px-4">

                {/* Left Ear - Market Forecast */}
                <div className="hidden md:block w-48 border border-black p-2 text-center">
                    <h4 className="font-bold uppercase text-xs border-b border-black mb-2 pb-1">Market Forecast</h4>
                    <p className="text-[10px] leading-tight font-serif italic">
                        Bullish winds form in the East. Tech sector turbulence expected mid-day. Regulatory clouds clearing by market close.
                    </p>
                </div>

                {/* Center Title */}
                <div className="flex-grow text-center px-4">
                    <div className="text-[9px] uppercase tracking-[0.2em] mb-2 font-sans text-gray-500">
                        "All the news that's fit to bet on"
                    </div>
                    <h1 className="text-6xl md:text-8xl font-blackletter text-black leading-tight tracking-tight mb-2">
                        The Polymarket Times
                    </h1>
                    <div className="flex justify-center items-center gap-4">
                        <div className="h-px w-12 bg-black"></div>
                        <span className="text-xs font-bold font-display uppercase tracking-widest">
                            Late City Edition • {timestamp ? `Updated ${new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}` : 'Updated Hourly'}
                        </span>
                        <div className="h-px w-12 bg-black"></div>
                    </div>
                </div>

                {/* Right Ear - Crypto Prices */}
                <div className="hidden md:block w-48 border border-black p-2">
                    <h4 className="font-bold uppercase text-xs border-b border-black mb-2 pb-1 text-center">Live Crypto Prices</h4>
                    <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                            <span>BTC</span>
                            <span className={cryptoPrices?.btc.direction === 'up' ? "text-green-700" : "text-red-700"}>
                                {cryptoPrices?.btc.price || "$97,420"} {cryptoPrices?.btc.direction === 'up' ? '▲' : '▼'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>ETH</span>
                            <span className={cryptoPrices?.eth.direction === 'up' ? "text-green-700" : "text-red-700"}>
                                {cryptoPrices?.eth.price || "$3,560"} {cryptoPrices?.eth.direction === 'up' ? '▲' : '▼'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>SOL</span>
                            <span className={cryptoPrices?.sol.direction === 'up' ? "text-green-700" : "text-red-700"}>
                                {cryptoPrices?.sol.price || "$240.50"} {cryptoPrices?.sol.direction === 'up' ? '▲' : '▼'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
