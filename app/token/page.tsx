'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function TokenPage() {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText('PENDING...');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#f4f1ea] font-serif text-[#1a1a1a] p-4 md:p-8">
            {/* Enhanced paper texture background */}
            <div className="absolute inset-0 opacity-8 pointer-events-none"
                style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\" opacity=\"0.08\"/%3E%3C/svg%3E')" }}>
            </div>

            <main className="max-w-4xl mx-auto relative">
                {/* Back Link */}
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:underline border-b-2 border-transparent hover:border-black transition-all pb-1">
                        <span className="text-xl">←</span>
                        <span>Return to Front Page</span>
                    </Link>
                </div>

                {/* Ornamental Header */}
                <div className="flex items-center justify-center mb-8 gap-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-black to-black"></div>
                    <div className="text-4xl">✦</div>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-black to-black"></div>
                </div>

                {/* Main Card */}
                <div className="border-4 border-double border-black p-2 bg-[#f4f1ea] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-fade-in">
                    <div className="border-2 border-black p-8 md:p-12 relative overflow-hidden bg-[#fffef8]">

                        {/* Corner Ornaments */}
                        <div className="absolute top-4 left-4 text-2xl opacity-30">✦</div>
                        <div className="absolute top-4 right-4 text-2xl opacity-30">✦</div>
                        <div className="absolute bottom-4 left-4 text-2xl opacity-30">✦</div>
                        <div className="absolute bottom-4 right-4 text-2xl opacity-30">✦</div>

                        {/* Content */}
                        <div className="relative z-10 text-center">

                            {/* Decorative Top */}
                            <div className="flex items-center justify-center gap-4 mb-8">
                                <div className="h-px w-24 bg-black"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-xs font-bold uppercase tracking-[0.3em] border-t border-b border-black py-1 px-4">Official Mint</span>
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">Est. 2026</span>
                                </div>
                                <div className="h-px w-24 bg-black"></div>
                            </div>

                            {/* Logo */}
                            <div className="flex justify-center mb-8">
                                <div className="relative">
                                    <div className="relative w-48 h-48 md:w-64 md:h-64 animate-fade-in group hover:scale-105 transition-transform duration-500">
                                        <Image
                                            src="/images/times_logo.png"
                                            alt="$TIMES Token Seal"
                                            fill
                                            className="object-contain mix-blend-multiply drop-shadow-2xl"
                                            priority
                                        />
                                        {/* Ornamental frame */}
                                        <div className="absolute -inset-4 border-4 border-double border-black/10 pointer-events-none"></div>
                                        {/* Subtle shine effect on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full blur-2xl pointer-events-none"></div>
                                    </div>
                                </div>
                            </div>


                            {/* Headline */}
                            <h1 className="text-6xl md:text-8xl font-blackletter mb-6 leading-[0.9] tracking-tight drop-shadow-sm">
                                The Currency<br />of Truth
                            </h1>

                            {/* Ornamental divider */}
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <div className="text-xl">※</div>
                                <div className="h-px w-16 bg-black"></div>
                                <div className="text-2xl">✾</div>
                                <div className="h-px w-16 bg-black"></div>
                                <div className="text-xl">※</div>
                            </div>

                            <p className="text-xl md:text-2xl italic font-serif text-gray-800 mb-3 max-w-2xl mx-auto leading-relaxed">
                                "In a world of noise, signal is the only asset that matters."
                            </p>
                            <p className="text-lg md:text-xl font-bold uppercase tracking-widest text-gray-700 mb-8">
                                Read the Future. Own the Times.
                            </p>

                            {/* CTA */}
                            <div className="mb-12 space-y-4">
                                <a
                                    href="https://pump.fun/board"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative inline-flex items-center justify-center px-10 py-4 bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] text-[#f4f1ea] font-black uppercase tracking-[0.3em] text-base overflow-hidden border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-150"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-3 w-full">
                                        <span className="text-2xl animate-pulse">📰</span>
                                        <span className="flex items-center gap-2">
                                            <span>Buy $TIMES on</span>
                                            <div className="relative h-8 w-24">
                                                <Image
                                                    src="/images/pumpfun_logo.png"
                                                    alt="pump.fun"
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                        </span>
                                        <span className="text-2xl animate-pulse">📰</span>
                                    </span>
                                    {/* Animated border glow */}
                                    <div className="absolute inset-0 border-2 border-yellow-500/50 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                                    {/* Shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                </a>
                                <div className="flex items-center justify-center gap-4 text-xs text-gray-600 uppercase tracking-widest font-mono">
                                    <span className="border border-black px-3 py-1 bg-gray-100">Ticker: $TIMES</span>
                                    <span>•</span>
                                    <span className="border border-black px-3 py-1 bg-gray-100">Supply: 1B</span>
                                </div>
                            </div>

                            {/* Token Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center border-t-2 border-black pt-8 mb-8">
                                <div className="md:border-r-2 md:border-black/30 pb-4 md:pb-0">
                                    <span className="block text-gray-500 uppercase text-[10px] font-bold tracking-widest mb-2 border-b border-black/20 pb-2">Establishment</span>
                                    <strong className="text-lg font-blackletter">EST. 2026</strong>
                                </div>
                                <div className="md:border-r-2 md:border-black/30 pb-4 md:pb-0">
                                    <span className="block text-gray-500 uppercase text-[10px] font-bold tracking-widest mb-2 border-b border-black/20 pb-2">Platform</span>
                                    <strong className="text-lg font-blackletter">SOLANA</strong>
                                </div>
                                <div className="pb-4 md:pb-0">
                                    <span className="block text-gray-500 uppercase text-[10px] font-bold tracking-widest mb-2 border-b border-black/20 pb-2">Contract Address</span>
                                    <button
                                        onClick={handleCopy}
                                        className="text-sm font-mono hover:bg-black hover:text-white transition-colors px-2 py-1 border border-black/20 relative group"
                                    >
                                        <strong className={copied ? "text-green-600" : ""}>
                                            {copied ? "COPIED!" : "PENDING..."}
                                        </strong>
                                        {!copied && (
                                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                CLICK TO COPY
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Quote */}
                            <div className="border-t-2 border-double border-black pt-6">
                                <div className="bg-black text-[#f4f1ea] py-6 px-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(139,115,85,0.5)]">
                                    <p className="text-sm md:text-base italic font-serif leading-relaxed">
                                        The Polymarket Times brings you AI-powered prediction market journalism.
                                        Every hour, our editorial agents transform market movements into front-page news.
                                    </p>
                                    <div className="mt-4 text-xs uppercase tracking-widest opacity-60">
                                        — The Editorial Board
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Bottom Ornamental Divider */}
                <div className="flex items-center justify-center my-12 gap-4">
                    <div className="text-2xl">※</div>
                    <div className="h-px flex-1 bg-black max-w-xs"></div>
                    <div className="text-3xl">✾</div>
                    <div className="h-px flex-1 bg-black max-w-xs"></div>
                    <div className="text-2xl">※</div>
                </div>

            </main>
        </div>
    );
}
