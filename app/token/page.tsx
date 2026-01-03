import Image from 'next/image';
import Link from 'next/link';

export default function TokenPage() {
    return (
        <div className="min-h-screen bg-[#f4f1ea] font-serif text-[#1a1a1a] p-4 md:p-8 flex items-center justify-center">

            <main className="max-w-3xl w-full relative">
                {/* Back Link */}
                <div className="absolute -top-12 left-0">
                    <Link href="/" className="text-[10px] font-bold uppercase tracking-widest hover:underline opacity-60 hover:opacity-100 transition-opacity">
                        &larr; Back to Front Page
                    </Link>
                </div>

                {/* Main Card */}
                <div className="border-double-thick border-black p-1 bg-[#f4f1ea] shadow-2xl">
                    <div className="border border-black p-8 md:p-12 relative overflow-hidden">

                        {/* Background Texture */}
                        <div className="absolute inset-0 opacity-5 pointer-events-none"
                            style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\" opacity=\"1\"/%3E%3C/svg%3E')" }}>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 text-center">

                            {/* Decorative Top */}
                            <div className="flex items-center justify-center gap-4 mb-6 opacity-80">
                                <div className="h-px w-16 bg-black"></div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Official Mint</span>
                                <div className="h-px w-16 bg-black"></div>
                            </div>

                            {/* Logo */}
                            <div className="flex justify-center mb-6">
                                <div className="relative w-48 h-48 md:w-64 md:h-64 animate-fade-in group hover:scale-105 transition-transform duration-500">
                                    <Image
                                        src="/images/times_token_seal_v9.png"
                                        alt="$TIMES Token Seal"
                                        fill
                                        className="object-contain mix-blend-multiply"
                                        priority
                                    />
                                    {/* Subtle shine effect on hover */}
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-xl pointer-events-none"></div>
                                </div>
                            </div>


                            {/* Headline */}
                            <h1 className="text-5xl md:text-7xl font-blackletter mb-4 leading-none tracking-tight">
                                The Currency<br />of Truth
                            </h1>

                            <p className="text-lg md:text-xl italic font-serif text-gray-800 mb-8 max-w-lg mx-auto">
                                "In a world of noise, signal is the only asset that matters. Read the Future. Own the Times."
                            </p>

                            {/* CTA */}
                            <div className="mb-12">
                                <a
                                    href="https://pump.fun/board"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative inline-flex items-center justify-center px-8 py-3 bg-[#1a1a1a] text-[#f4f1ea] font-bold uppercase tracking-widest text-sm overflow-hidden transition-all hover:bg-black"
                                >
                                    <span className="relative z-10 group-hover:-translate-y-1 transition-transform">Buy $TIMES on pump.fun</span>
                                    <div className="absolute inset-0 border border-[#d4af37] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </a>
                                <div className="mt-2 text-[10px] text-gray-500 uppercase tracking-widest">
                                    Ticker: $TIMES • Supply: 1B
                                </div>
                            </div>

                            {/* Footer Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center border-t border-black pt-6 text-xs font-mono">
                                <div className="md:border-r border-black/30">
                                    <span className="block text-gray-500 uppercase text-[9px] mb-1">Establishment</span>
                                    <strong>EST. 2026</strong>
                                </div>
                                <div className="md:border-r border-black/30">
                                    <span className="block text-gray-500 uppercase text-[9px] mb-1">Platform</span>
                                    <strong>SOLANA</strong>
                                </div>
                                <div>
                                    <span className="block text-gray-500 uppercase text-[9px] mb-1">Contract</span>
                                    <strong>PENDING...</strong>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
