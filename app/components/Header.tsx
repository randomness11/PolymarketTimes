'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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
                <div className="flex items-center gap-3">
                    <span>VOL. CXXVII... No. 42,109</span>
                    <Link href="/archives" className="hidden sm:inline hover:underline">
                        ARCHIVES
                    </Link>
                </div>
                <div>NEW YORK, {currentDate}</div>
                <div>PRICE ONE DOLLAR ($1.00)</div>
            </div>

            {/* Main Masthead Area */}
            <div className={`relative flex justify-between items-center px-4 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-6 md:py-8'}`}>

                {/* Left Ear - Advertising Placeholder */}
                <a
                    href="https://x.com/ankitkr0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hidden md:block w-52 transition-all duration-300 group relative ${isScrolled ? 'opacity-0 w-0 p-0 overflow-hidden' : 'opacity-100'}`}
                >
                    {/* Outer Coupon Container */}
                    <div className="border-[3px] border-black border-dashed group-hover:border-[#f4f1ea] p-1 bg-[#f4f1ea] group-hover:bg-black transition-all duration-300 relative overflow-hidden">

                        {/* Inner Container */}
                        <div className="relative z-10 border-2 border-black group-hover:border-[#f4f1ea] p-2 transition-all duration-300">

                            {/* Decorative Ornament */}
                            <div className="text-center text-black group-hover:text-[#f4f1ea] text-lg mb-1 transition-all duration-300">
                                ✦
                            </div>

                            {/* Headline */}
                            <div className="text-center mb-2">
                                <div className="text-[13px] font-black uppercase tracking-wider text-black group-hover:text-[#f4f1ea] leading-tight transition-all duration-300">
                                    Your Brand Here
                                </div>
                            </div>

                            {/* Description */}
                            <div className="text-center mb-2">
                                <div className="text-[9px] font-serif italic text-black group-hover:text-[#f4f1ea] leading-snug transition-all duration-300">
                                    Reach thousands of prediction market enthusiasts daily
                                </div>
                            </div>

                            {/* Price */}
                            <div className="bg-black group-hover:bg-[#f4f1ea] mx-1 my-2 py-1 px-1 transition-all duration-300">
                                <div className="text-[10px] font-bold text-center text-[#f4f1ea] group-hover:text-black tracking-wide transition-all duration-300">
                                    From $2,000 / month
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="bg-black group-hover:bg-[#f4f1ea] text-[#f4f1ea] group-hover:text-black text-[10px] font-black uppercase tracking-widest py-1.5 px-2 text-center border-2 border-transparent shadow-[2px_2px_0px_rgba(0,0,0,0.2)] group-hover:shadow-[2px_2px_0px_rgba(255,255,255,0.2)] transition-all duration-300">
                                DM @ankitkr0 on 𝕏 ☞
                            </div>
                        </div>
                    </div>
                </a>

                {/* Center Title */}
                <div className="flex-grow text-center px-4">
                    <div className={`text-[9px] uppercase tracking-[0.2em] mb-2 font-sans text-gray-500 transition-all duration-300 ${isScrolled ? 'h-0 overflow-hidden mb-0 opacity-0' : 'h-auto opacity-100'}`}>
                        "All the news that's fit to bet on"
                    </div>
                    <h1 className={`font-blackletter text-black leading-tight tracking-tight mb-2 transition-all duration-300 ${isScrolled ? 'text-4xl md:text-5xl mb-0' : 'text-4xl sm:text-6xl md:text-8xl'}`}>
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
