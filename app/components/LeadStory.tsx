'use client';

import React from 'react';

interface LeadStoryProps {
    headline?: string;
    author?: string;
    location?: string;
    image?: string;
    content?: string; // Expecting a string where paragraphs are separated by '\n\n'
    link?: string;
}

export default function LeadStory({
    headline = "ELECTION SHOCKWAVE",
    author = "Archibald P. Sterling",
    location = "Washington Bureau",
    image,
    content,
    link = "#"
}: LeadStoryProps) {
    const defaultImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Canadian_Pacific_Railway_locomotive_2860.jpg/1200px-Canadian_Pacific_Railway_locomotive_2860.jpg";

    // Split content into paragraphs. If no content prop, use default hardcoded paragraphs.
    const paragraphs = content
        ? content.split('\n\n').filter(p => p.length > 0)
        : [
            "Extraordinary scenes unfolded late last evening as the prediction markets swung violently in favor of the challenger. Traders, working by the dim light of oil lamps and LED screens, pushed the probability of a regime change to a staggering 58 cents on the dollar.",
            "\"It is unprecedented,\" remarked one senior analyst from the Chicago desk. \"The volume of contracts exchanged in the witching hour suggests a fundamental realignment of public sentiment, or perhaps, the unseen hand of institutional whales entering the fray.\"",
            "Authorities urge caution. Speculations range from celestial phenomena influencing voter patterns to otherwordly visitors, though more grounded minds point to inflation data released at dawn. The Iron Horse of the economy is slowing, and passengers are looking to change conductors.",
            "As the sun sets on another trading day, the only certainty is uncertainty itself. The odds board flickers—a modern oracle casting long shadows over the future of the republic."
        ];

    return (
        <article className="px-4">

            {/* Headlines */}
            <div className="text-center mb-6 group cursor-pointer">
                <a href={link} target="_blank" rel="noopener noreferrer" className="block">
                    <h1 className="text-6xl md:text-8xl font-display font-bold leading-[0.9] mb-4 tracking-tight transition-all duration-300 group-hover:scale-[1.01] group-hover:text-black/90">
                        {headline}
                    </h1>
                    <div className="h-0.5 w-0 bg-black mx-auto transition-all duration-500 group-hover:w-1/3"></div>
                </a>

                <div className="flex justify-center items-center gap-2 text-[10px] md:text-xs font-bold tracking-widest uppercase mt-4 text-gray-800">
                    <span className="border-t border-b border-black py-0.5 px-2">By {author}</span>
                    <span>•</span>
                    <span className="border-t border-b border-black py-0.5 px-2">{location}</span>
                </div>

                {/* Social Share Buttons */}
                <div className="flex justify-center items-center gap-4 mt-4">
                    <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`📰 ${headline}\n\nRead the full dispatch from The Polymarket Times:`)}&url=${encodeURIComponent(link)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 border border-black px-3 py-1 text-[10px] uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
                    >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Share
                    </a>
                    <button
                        onClick={() => navigator.clipboard.writeText(link)}
                        className="inline-flex items-center gap-1 border border-black px-3 py-1 text-[10px] uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
                    >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        Copy Link
                    </button>
                </div>
            </div>

            {/* Main Image */}
            <figure className="mb-6 border-4 border-double-thick border-black p-1 bg-white relative overflow-hidden group">
                <a href={link} target="_blank" rel="noopener noreferrer" className="block relative aspect-[16/9] w-full overflow-hidden">
                    {/* Overlay for old paper feel on top of image */}
                    <div className="absolute inset-0 bg-[#f4f1ea] opacity-10 mix-blend-multiply pointer-events-none z-10"></div>

                    <div className="w-full h-full bg-black/5 grayscale contrast-125 flex items-center justify-center overflow-hidden">
                        <img
                            src={image || defaultImage}
                            alt={headline}
                            className="w-full h-full object-cover sepia-[.2] transition-transform duration-700 ease-in-out group-hover:scale-105 group-hover:sepia-0"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                // Prevent infinite loop if default image also fails
                                if (target.src !== defaultImage) {
                                    target.src = defaultImage;
                                }
                            }}
                        />
                    </div>
                </a>
                <figcaption className="text-center text-[10px] uppercase font-sans mt-2 tracking-wider text-gray-600">
                    Fig 1. {paragraphs[0]?.slice(0, 30)}...
                </figcaption>
            </figure>

            {/* Article Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-justify font-serif text-lg leading-relaxed">
                <div>
                    {paragraphs[0] && (
                        <p className="mb-4">
                            <span className="float-left text-7xl font-blackletter line-[0.8] mr-2 mt-[-10px]">
                                {paragraphs[0].charAt(0)}
                            </span>
                            {paragraphs[0].slice(1)}
                        </p>
                    )}
                    {paragraphs[1] && <p>{paragraphs[1]}</p>}
                </div>
                <div>
                    <div className="border-t border-b border-black py-4 my-2 text-center bg-gray-100">
                        <div className="font-serif italic text-xl font-bold">
                            "The ledger does not lie. The masses have spoken with their capital."
                        </div>
                    </div>
                    {paragraphs.slice(2).map((p, i) => <p key={i} className="mb-4">{p}</p>)}
                </div>
            </div>
        </article>
    );
}
