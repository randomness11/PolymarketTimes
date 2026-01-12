'use client';

import React from 'react';
import type { ContrarianTake, Story } from '../types';

interface AlphaSignalsProps {
    contrarianTakes: Record<string, ContrarianTake>;
    headlines: Record<string, string>;
    stories: Story[];
}

const confidenceColors: Record<string, { bg: string; text: string; label: string }> = {
    HIGH: { bg: 'bg-red-900', text: 'text-red-100', label: 'High Conviction' },
    MEDIUM: { bg: 'bg-amber-800', text: 'text-amber-100', label: 'Notable Signal' },
    LOW: { bg: 'bg-gray-700', text: 'text-gray-100', label: 'Worth Watching' },
};

export default function AlphaSignals({ contrarianTakes, headlines, stories }: AlphaSignalsProps) {
    // Build a map of story info for quick lookup
    const storyMap = new Map(stories.map(s => [s.id, s]));

    // Get all takes sorted by confidence (HIGH first)
    const sortedTakes = Object.values(contrarianTakes)
        .sort((a, b) => {
            const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return order[a.confidence] - order[b.confidence];
        });

    if (sortedTakes.length === 0) return null;

    // Count by confidence
    const highCount = sortedTakes.filter(t => t.confidence === 'HIGH').length;
    const mediumCount = sortedTakes.filter(t => t.confidence === 'MEDIUM').length;

    return (
        <section className="border-b-4 border-double-thick border-black py-8 px-4 bg-[#e8e4d9]">
            {/* Section Header */}
            <div className="flex items-center justify-center mb-6 gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-900 to-red-900"></div>
                <div className="text-3xl">&#x26A0;</div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-red-900 to-red-900"></div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 border-red-900 mb-6 pb-2 gap-2">
                <div>
                    <h3 className="font-blackletter text-2xl md:text-3xl text-red-900">Alpha Signals</h3>
                    <p className="text-xs font-serif italic text-gray-600 mt-1">
                        Contrarian takes &amp; market skepticism from our editorial desk
                    </p>
                </div>
                <div className="flex gap-3 text-[10px] font-mono">
                    {highCount > 0 && (
                        <span className="bg-red-900 text-white px-2 py-1">{highCount} HIGH</span>
                    )}
                    {mediumCount > 0 && (
                        <span className="bg-amber-800 text-white px-2 py-1">{mediumCount} MEDIUM</span>
                    )}
                </div>
            </div>

            {/* Subtitle */}
            <div className="text-center mb-8">
                <p className="font-serif text-sm italic text-gray-700 max-w-2xl mx-auto">
                    &ldquo;The market can stay irrational longer than you can stay solvent.&rdquo;
                    <span className="text-xs not-italic ml-2">&mdash; J.M. Keynes</span>
                </p>
            </div>

            {/* Grid of Alpha Signals */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedTakes.map((take) => {
                    const story = storyMap.get(take.marketId);
                    if (!story) return null;

                    const headline = headlines[take.marketId] || story.question;
                    const conf = confidenceColors[take.confidence];
                    const odds = Math.round(Math.max(story.yesPrice, story.noPrice) * 100);
                    const direction = story.yesPrice > 0.5 ? 'YES' : 'NO';
                    const link = `https://polymarket.com/event/${story.slug}`;

                    return (
                        <article
                            key={take.marketId}
                            className="bg-white border-2 border-black p-4 relative card-lift-on-hover group"
                        >
                            {/* Confidence Badge */}
                            <div className={`absolute -top-3 left-4 ${conf.bg} ${conf.text} px-3 py-1 text-[10px] font-bold uppercase tracking-wider`}>
                                {conf.label}
                            </div>

                            {/* Category & Odds */}
                            <div className="flex justify-between items-center mt-3 mb-3">
                                <span className="text-[9px] font-bold uppercase tracking-wider border border-black px-1">
                                    {story.category}
                                </span>
                                <span className="font-mono text-sm font-bold">
                                    {odds}% {direction}
                                </span>
                            </div>

                            {/* Headline */}
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline decoration-2 underline-offset-2"
                            >
                                <h4 className="font-serif font-bold text-lg leading-tight mb-3 line-clamp-2">
                                    {headline}
                                </h4>
                            </a>

                            {/* Bear Case */}
                            <div className="border-l-4 border-red-900 pl-3 mb-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-red-900 mb-1">
                                    Bear Case
                                </p>
                                <p className="font-serif text-sm text-gray-800 leading-relaxed">
                                    {take.bearCase}
                                </p>
                            </div>

                            {/* Key Risk */}
                            <div className="mb-3">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                                    Key Risk
                                </p>
                                <p className="font-serif text-xs text-gray-700 italic">
                                    {take.keyRisk}
                                </p>
                            </div>

                            {/* Who Disagrees */}
                            <div className="border-t border-gray-300 pt-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                                    Who Disagrees
                                </p>
                                <p className="font-serif text-xs text-gray-600">
                                    {take.whoDisagrees}
                                </p>
                            </div>

                            {/* Link to market */}
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 block text-center text-[10px] font-bold uppercase tracking-wider text-red-900 hover:bg-red-900 hover:text-white py-2 border border-red-900 transition-colors"
                            >
                                View Market &rarr;
                            </a>
                        </article>
                    );
                })}
            </div>

            {/* Footer note */}
            <div className="mt-8 text-center">
                <p className="text-[10px] font-serif text-gray-500 italic">
                    These signals represent contrarian analysis and are not investment advice.
                    Always do your own research.
                </p>
            </div>
        </section>
    );
}
