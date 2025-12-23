import React from 'react';

interface TechStory {
    headline: string;
    description: string;
    image?: string;
    author: string;
    link?: string;
}

interface RightSidebarProps {
    techStory?: TechStory;
}

export function FedReserveWidget() {
    return (
        <div className="bg-[#1a1a1a] text-[#d4af37] p-4 text-center mb-6 border-4 border-[#1a1a1a] outline outline-1 outline-[#d4af37] outline-offset-[-6px]">
            <h3 className="font-serif uppercase tracking-widest text-xs mb-1 text-[#d4af37]/80">The Federal Reserve</h3>
            <div className="border-t border-b border-[#d4af37]/30 py-4 my-2">
                <div className="font-blackletter text-5xl mb-2">HOLD</div>
                <div className="text-[10px] uppercase tracking-widest">Consensus 95%</div>
            </div>
            <p className="text-[10px] font-serif leading-tight text-[#d4af37]/70">
                Master of the Coin, Chairman Powell, is expected to hold the line. The market prices a near certainty of rates remaining steady.
            </p>
            <a href="https://polymarket.com/markets/politics" target="_blank" rel="noopener noreferrer">
                <button className="mt-4 border border-[#d4af37] text-[10px] uppercase px-3 py-1 hover:bg-[#d4af37] hover:text-black transition">See Predictions</button>
            </a>
        </div>
    );
}

import SubscribeWidget from './SubscribeWidget';

export function DailyDispatch() {
    return <SubscribeWidget />;
}

export function SiliconChip({ story }: { story?: TechStory }) {
    const defaultStory = {
        headline: "The Silicon Chip",
        description: "Among the many marvels of modern invention, few have had as profound an impact on predictions as the AI Model. This ingenious device consumes vast quantities of data to output prophecy with frightening accuracy.",
        image: "https://picsum.photos/seed/chip/300/150",
        author: "George E. Pembrooke",
        link: "#"
    };

    const data = story || defaultStory;

    return (
        <div className="border-t-4 border-black pt-1">
            <div className="border-t border-black pt-2">
                <a href={data.link || "#"} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    <h3 className="font-sans font-bold text-center text-sm uppercase mb-1">{data.headline}</h3>
                </a>
                <div className="text-[9px] text-center uppercase text-gray-500 tracking-widest mb-4">Artifical Minds / Artificial lives</div>

                <div className="border border-black p-1 mb-2">
                    <a href={data.link || "#"} target="_blank" rel="noopener noreferrer">
                        <img src={data.image || defaultStory.image} alt="Chip" className="w-full h-auto grayscale contrast-125 block hover:grayscale-0 transition-all" />
                    </a>
                </div>

                <div className="font-bold text-xs uppercase mb-1">By {data.author}</div>
                <p className="font-serif text-xs text-justify leading-tight mb-4">
                    {data.description}
                </p>

                <div className="border border-black p-4">
                    <h4 className="text-center font-bold text-xs uppercase mb-2 separator-lines">On This Day</h4>
                    <ul className="text-[9px] font-serif space-y-2 list-none">
                        <li className="flex gap-2 items-center">
                            <span className="font-bold">1904:</span>
                            <span>Gunpowder Plot discovered; King James's uneasiness affects tea futures.</span>
                        </li>
                        <li className="flex gap-2 items-center">
                            <span className="font-bold">1957:</span>
                            <span>Susan B. Anthony casts ballot in Rochester; defying electoral laws.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default function RightSidebar({ techStory }: RightSidebarProps) {
    return (
        <aside className="border-l border-black pl-4 pr-2 h-full">
            <FedReserveWidget />
            <DailyDispatch />
            <SiliconChip story={techStory} />
        </aside>
    );
}
