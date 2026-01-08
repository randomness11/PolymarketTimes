import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Sponsor The Polymarket Times - Advertising Rates",
    description: "Support The Polymarket Times through sponsorship. Three tiers available for discerning advertisers.",
};

interface SponsorTier {
    name: string;
    price: string;
    features: string[];
    badge: string;
}

const sponsorTiers: SponsorTier[] = [
    {
        name: "Classifieds Sponsor",
        price: "$250/month",
        badge: "SMALL FORMAT",
        features: [
            "Logo placement in site footer",
            "Listing in 'Notices & Lost Fortunes' section",
            "Link to your website or project",
            "Monthly rotating feature",
            "Perfect for startups & small projects"
        ]
    },
    {
        name: "Quarter Page Advertiser",
        price: "$750/month",
        badge: "MEDIUM FORMAT",
        features: [
            "Featured ad spot on homepage sidebar",
            "Logo in footer with 'Featured Sponsor' badge",
            "Highlighted mention in weekly edition",
            "Social media shoutout on X",
            "Bi-weekly ad refresh options",
            "Ideal for growing businesses"
        ]
    },
    {
        name: "Front Page Patron",
        price: "$2,000/month",
        badge: "PREMIUM PLACEMENT",
        features: [
            "Prime banner placement on homepage",
            "Exclusive 'Premium Patron' recognition",
            "Featured in all email editions",
            "Custom editorial collaboration opportunities",
            "Prominent footer placement",
            "Monthly dedicated feature article",
            "Priority support & consultation",
            "For serious brands & major projects"
        ]
    }
];

export default function SponsorPage() {
    return (
        <div className="min-h-screen bg-[#f4f1ea] font-serif">
            <Header />

            <main className="max-w-6xl mx-auto px-4 py-12">
                {/* Ornamental Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center mb-6 gap-4">
                        <div className="text-2xl">※</div>
                        <div className="h-px flex-1 bg-black max-w-xs"></div>
                        <div className="text-3xl">✾</div>
                        <div className="h-px flex-1 bg-black max-w-xs"></div>
                        <div className="text-2xl">※</div>
                    </div>
                    <h1 className="font-blackletter text-6xl mb-4">Advertising Rates</h1>
                    <p className="text-sm uppercase tracking-[0.3em] text-gray-600 mb-2">Est. 2025</p>
                    <p className="text-base max-w-2xl mx-auto leading-relaxed border-t border-b border-gray-400 py-4 mt-6">
                        The Polymarket Times reaches thousands of discerning speculators, blockchain enthusiasts,
                        and prediction market aficionados daily. Support our publication while promoting your venture
                        to this highly engaged audience.
                    </p>
                </div>

                {/* Sponsorship Tiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {sponsorTiers.map((tier, idx) => (
                        <div
                            key={idx}
                            className={`border-2 border-black bg-white p-6 flex flex-col ${idx === 2 ? 'md:shadow-xl transform md:-rotate-1' : idx === 1 ? 'md:transform md:scale-105' : ''}`}
                        >
                            {/* Badge */}
                            <div className="text-center border-b-2 border-black pb-4 mb-4">
                                <div className="text-[9px] uppercase tracking-[0.3em] text-gray-600 mb-2">
                                    {tier.badge}
                                </div>
                                <h2 className="font-blackletter text-3xl mb-2">{tier.name}</h2>
                                <div className="text-sm font-bold">{tier.price}</div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-6 flex-grow">
                                {tier.features.map((feature, fIdx) => (
                                    <li key={fIdx} className="flex items-start text-sm leading-tight">
                                        <span className="mr-2 mt-0.5">▸</span>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <div className="mt-auto pt-4 border-t border-gray-300">
                                <a
                                    href="https://x.com/ankitkr0"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center bg-black text-white py-3 px-4 font-bold uppercase text-xs tracking-widest hover:bg-gray-800 transition-colors border-2 border-black"
                                >
                                    Inquire via X
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Additional Information Box */}
                <div className="border-2 border-black bg-gray-100 p-8 text-center">
                    <h3 className="font-bold text-xl uppercase mb-4 border-b border-black pb-2 inline-block">
                        How to Become a Sponsor
                    </h3>
                    <p className="text-sm leading-relaxed max-w-3xl mx-auto mb-6">
                        To discuss sponsorship opportunities, rates, and custom packages, please send a direct message
                        on X (formerly Twitter) to <a href="https://x.com/ankitkr0" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-gray-600">@ankitkr0</a>.
                        We'll work with you to create a sponsorship plan that aligns with your goals and budget.
                    </p>
                    <div className="text-xs uppercase tracking-widest text-gray-600 mt-4">
                        Custom packages available upon request
                    </div>
                </div>

                {/* Decorative Footer Element */}
                <div className="flex items-center justify-center mt-12 gap-4 opacity-50">
                    <div className="text-xl">❦</div>
                    <div className="h-px w-24 bg-black"></div>
                    <div className="text-xl">❦</div>
                    <div className="h-px w-24 bg-black"></div>
                    <div className="text-xl">❦</div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
