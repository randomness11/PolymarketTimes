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
            <div className="text-center mb-6">
                <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-4 underline-offset-4 decoration-black/30">
                    <h1 className="text-6xl md:text-8xl font-display font-bold leading-[0.9] mb-4 tracking-tight">
                        {headline}
                    </h1>
                </a>

                <div className="flex justify-center items-center gap-2 text-[10px] md:text-xs font-bold tracking-widest uppercase mt-4">
                    <span className="border-t border-b border-black py-0.5 px-2">By {author}</span>
                    <span>•</span>
                    <span className="border-t border-b border-black py-0.5 px-2">{location}</span>
                </div>
            </div>

            {/* Main Image */}
            <figure className="mb-6 border-4 border-double-thick border-black p-1">
                <a href={link} target="_blank" rel="noopener noreferrer">
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/5 grayscale contrast-125 flex items-center justify-center">
                        <img
                            src={image || defaultImage}
                            alt="Lead Story"
                            className="w-full h-full object-contain sepia-[.3]"
                        />
                    </div>
                </a>
                <figcaption className="text-center text-[10px] uppercase font-sans mt-2 tracking-wider text-gray-600">
                    Fig 1. Market volatility captured in real-time.
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
