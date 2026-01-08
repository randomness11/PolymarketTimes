import React from 'react';

interface TechStory {
    headline: string;
    description: string;
    image?: string;
    author: string;
    link?: string;
}

interface FedData {
    action: string;
    consensus: number;
    description: string;
    link: string;
}

interface RightSidebarProps {
    techStory?: TechStory;
    fedData?: FedData;
}

export function FedReserveWidget({ fedData }: { fedData?: FedData }) {
    // Default fallback if no Fed market data is available
    const action = fedData?.action || 'HOLD';
    const consensus = fedData?.consensus || 95;
    const description = fedData?.description || 'Master of the Coin, Chairman Powell, is expected to hold the line. The market prices a near certainty of rates remaining steady.';
    const link = fedData?.link || 'https://polymarket.com/markets/finance';

    return (
        <div className="bg-[#1a1a1a] text-[#d4af37] p-4 text-center mb-6 border-4 border-[#1a1a1a] outline outline-1 outline-[#d4af37] outline-offset-[-6px]">
            <h3 className="font-serif uppercase tracking-widest text-xs mb-1 text-[#d4af37]/80">The Federal Reserve</h3>
            <div className="border-t border-b border-[#d4af37]/30 py-4 my-2">
                <div className="font-blackletter text-5xl mb-2">{action}</div>
                <div className="text-[10px] uppercase tracking-widest">Consensus {consensus}%</div>
            </div>
            <p className="text-[10px] font-serif leading-tight text-[#d4af37]/70 line-clamp-3">
                {description}
            </p>
            <a href={link} target="_blank" rel="noopener noreferrer">
                <button className="mt-4 border border-[#d4af37] text-[10px] uppercase px-3 py-1 hover:bg-[#d4af37] hover:text-black transition">See Predictions</button>
            </a>
        </div>
    );
}

// Historical events database - curated Victorian-era styled entries
const historicalEvents: Record<string, { year: number; event: string }[]> = {
    "01-01": [{ year: 1801, event: "The United Kingdom of Great Britain and Ireland formed; markets consolidate." }, { year: 1959, event: "Fidel Castro assumes power in Cuba; sugar futures tremble." }],
    "01-02": [{ year: 1492, event: "Granada falls to Spain; Moorish bonds in sharp decline." }, { year: 1900, event: "First electric omnibus runs in New York; horse futures plummet." }],
    "01-03": [{ year: 1870, event: "Brooklyn Bridge construction begins; steel contracts surge." }, { year: 1959, event: "Alaska admitted to the Union; land speculators rejoice." }],
    "01-04": [{ year: 1847, event: "Samuel Colt sells first revolvers; security concerns rise." }, { year: 1958, event: "Sputnik burns up upon re-entry; space race continues." }],
    "01-05": [{ year: 1914, event: "Ford Motor announces $5 workday; labor markets transformed." }, { year: 1933, event: "Golden Gate Bridge construction begins; transit bonds issued." }],
    "01-06": [{ year: 1838, event: "Morse demonstrates telegraph; communication stocks soar." }, { year: 1912, event: "New Mexico achieves statehood; territorial bonds convert." }],
    "01-07": [{ year: 1610, event: "Galileo discovers Jupiter's moons; astronomy gains investment." }, { year: 1927, event: "Transatlantic telephone service opens; AT&T shares rise." }],
    "01-08": [{ year: 1815, event: "Battle of New Orleans; cotton futures spike on war's end." }, { year: 1935, event: "Elvis Presley born; entertainment futures unknowingly affected." }],
    "01-09": [{ year: 1793, event: "First balloon flight in America; aviation concept introduced." }, { year: 1923, event: "First autogyro flight; rotorcraft patents filed." }],
    "01-10": [{ year: 1863, event: "London Underground opens; transit revolutionized." }, { year: 1946, event: "First UN General Assembly; diplomatic bonds traded." }],
    "01-11": [{ year: 1922, event: "Insulin first administered; pharmaceutical investments surge." }, { year: 1935, event: "Amelia Earhart flies Hawaii to California; aviation records set." }],
    "01-12": [{ year: 1879, event: "Anglo-Zulu War begins; colonial export markets disrupted." }, { year: 1966, event: "Batman premieres on television; entertainment stocks climb." }],
    // Default fallback for any date
    "default": [{ year: 1851, event: "The Great Exhibition opens; innovation capital flows freely." }, { year: 1903, event: "Wright Brothers achieve flight; aviation ventures take wing." }]
};

function OnThisDay() {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const events = historicalEvents[monthDay] || historicalEvents["default"];

    return (
        <div className="border border-black p-4">
            <h4 className="text-center font-bold text-xs uppercase mb-2 separator-lines">On This Day</h4>
            <ul className="text-[9px] font-serif space-y-2 list-none">
                {events.map((item, idx) => (
                    <li key={idx} className="flex gap-2 items-start">
                        <span className="font-bold whitespace-nowrap">{item.year}:</span>
                        <span>{item.event}</span>
                    </li>
                ))}
            </ul>
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

                <OnThisDay />
            </div>
        </div>
    )
}

export default function RightSidebar({ techStory, fedData }: RightSidebarProps) {
    return (
        <aside className="border-l border-black pl-4 pr-2 h-full">
            {/* Primary action: Email subscription */}
            <div className="mb-6 pb-6 border-b-2 border-black">
                <DailyDispatch />
            </div>

            {/* Market intelligence */}
            <FedReserveWidget fedData={fedData} />

            {/* Content section */}
            <SiliconChip story={techStory} />
        </aside>
    );
}
