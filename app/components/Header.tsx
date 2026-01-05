'use client';

import React, { useState, useEffect } from 'react';

interface HeaderProps {
    cryptoPrices?: {
        btc: { price: string, change: string, direction: 'up' | 'down' };
        eth: { price: string, change: string, direction: 'up' | 'down' };
        sol: { price: string, change: string, direction: 'up' | 'down' };
    };
    timestamp?: string;
}

export default function Header({ cryptoPrices, timestamp }: HeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).toUpperCase();

    return (
        <header className={`flex flex-col border-b-4 border-black mb-8 transition-all duration-300 z-50 bg-[#f4f1ea] ${isScrolled ? 'sticky top-0 shadow-xl' : 'relative'}`}>
            {/* Top Meta Bar */}
            <div className={`flex justify-between items-center py-1 border-b border-black text-xs font-bold font-serif tracking-widest px-2 transition-all duration-300 ${isScrolled ? 'py-0.5 text-[10px]' : ''}`}>
                <div>VOL. CXXVII... No. 42,109</div>
                <div>NEW YORK, {currentDate}</div>
                <div className="flex gap-4 items-center">
                    <a href="/token" className="text-[#b91c1c] font-black uppercase tracking-widest text-[10px] md:text-xs hover:underline decoration-2 underline-offset-4 flex items-center gap-1 transition-all">
                        <span>☞</span>
                        <span>Acquire $TIMES</span>
                    </a>
                    <div>PRICE ONE DOLLAR ($1.00)</div>
                </div>
            </div>

            {/* Main Masthead Area */}
            <div className={`relative flex justify-between items-center px-4 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-6 md:py-8'}`}>

                {/* Left Ear */}
                <div className={`hidden md:block w-48 border border-black p-2 text-center transition-opacity duration-300 ${isScrolled ? 'opacity-0 w-0 p-0 border-0 overflow-hidden' : 'opacity-100'}`}>
                    <h4 className="font-bold uppercase text-xs border-b border-black mb-2 pb-1">Market Forecast</h4>
                    <p className="text-[10px] leading-tight font-serif italic">
                        Bullish winds form in the East. Tech sector turbulence expected mid-day. Regulatory clouds clearing by market close.
                    </p>
                </div>

                {/* Center Title */}
                <div className="flex-grow text-center px-4">
                    <div className={`text-[9px] uppercase tracking-[0.2em] mb-2 font-sans text-gray-500 transition-all duration-300 ${isScrolled ? 'h-0 overflow-hidden mb-0 opacity-0' : 'h-auto opacity-100'}`}>
                        "All the news that's fit to bet on"
                    </div>
                    <h1 className={`font-blackletter text-black leading-tight tracking-tight mb-2 transition-all duration-300 ${isScrolled ? 'text-4xl md:text-5xl mb-0' : 'text-6xl md:text-8xl'}`}>
                        The Polymarket Times
                    </h1>
                    <div className={`flex justify-center items-center gap-4 transition-all duration-300 ${isScrolled ? 'h-0 overflow-hidden opacity-0' : 'h-auto opacity-100'}`}>
                        <div className="h-px w-12 bg-black"></div>
                        <span className="text-xs font-bold font-display uppercase tracking-widest">
                            Late City Edition • {timestamp ? `Updated ${new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}` : 'Updated Hourly'}
                        </span>
                        <div className="h-px w-12 bg-black"></div>
                    </div>
                </div>

                {/* Right Ear */}
                <div className={`hidden md:block w-48 border border-black p-2 transition-opacity duration-300 ${isScrolled ? 'opacity-0 w-0 p-0 border-0 overflow-hidden' : 'opacity-100'}`}>
                    <h4 className="font-bold uppercase text-xs border-b border-black mb-2 pb-1 text-center">Live Crypto Prices</h4>
                    <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                            <span>BTC</span>
                            <span className={cryptoPrices?.btc.direction === 'up' ? "text-green-700" : cryptoPrices?.btc.direction === 'down' ? "text-red-700" : "text-gray-500"}>
                                {cryptoPrices?.btc.price || "—"} {cryptoPrices?.btc.direction === 'up' ? '▲' : cryptoPrices?.btc.direction === 'down' ? '▼' : ''}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>ETH</span>
                            <span className={cryptoPrices?.eth.direction === 'up' ? "text-green-700" : cryptoPrices?.eth.direction === 'down' ? "text-red-700" : "text-gray-500"}>
                                {cryptoPrices?.eth.price || "—"} {cryptoPrices?.eth.direction === 'up' ? '▲' : cryptoPrices?.eth.direction === 'down' ? '▼' : ''}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>SOL</span>
                            <span className={cryptoPrices?.sol.direction === 'up' ? "text-green-700" : cryptoPrices?.sol.direction === 'down' ? "text-red-700" : "text-gray-500"}>
                                {cryptoPrices?.sol.price || "—"} {cryptoPrices?.sol.direction === 'up' ? '▲' : cryptoPrices?.sol.direction === 'down' ? '▼' : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
