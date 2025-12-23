import React from 'react';

interface GridStory {
    title: string;
    odds: string;
    image?: string;
    category: string;
    link?: string;
}

interface BottomGridProps {
    stories: GridStory[];
}

export default function BottomGrid({ stories }: BottomGridProps) {
    if (!stories || stories.length === 0) return null;

    return (
        <section className="border-b-4 border-double-thick border-black py-8 px-4">
            <div className="flex items-center justify-between border-b border-black mb-6 pb-2">
                <h3 className="font-blackletter text-2xl">Elsewhere in the Markets</h3>
                <span className="text-[10px] uppercase font-bold tracking-widest">Global Dispatch</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {stories.map((story, i) => (
                    <article key={i} className="flex flex-col h-full border-r border-gray-300 last:border-r-0 pr-4 last:pr-0">
                        {story.image && (
                            <a href={story.link || "#"} target="_blank" rel="noopener noreferrer" className="block group">
                                <div className="aspect-[3/2] w-full mb-3 overflow-hidden border border-black p-0.5">
                                    <img
                                        src={story.image}
                                        alt={story.title}
                                        className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-300"
                                    />
                                </div>
                            </a>
                        )}
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider border border-black px-1">{story.category}</span>
                            <span className="font-mono text-xs font-bold">{story.odds}</span>
                        </div>
                        <a href={story.link || "#"} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-2 underline-offset-2">
                            <h4 className="font-serif font-bold text-lg leading-tight mb-2">
                                {story.title}
                            </h4>
                        </a>
                    </article>
                ))}
            </div>
        </section>
    );
}
