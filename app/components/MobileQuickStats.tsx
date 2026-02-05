import React from 'react';

interface CryptoPrices {
    btc: { price: string; change: string; direction: 'up' | 'down' };
    eth: { price: string; change: string; direction: 'up' | 'down' };
    sol: { price: string; change: string; direction: 'up' | 'down' };
}

interface FedData {
    action: string;
    consensus: number;
    description: string;
    link: string;
}

interface MobileQuickStatsProps {
    cryptoPrices?: CryptoPrices;
    fedData?: FedData;
}

export default function MobileQuickStats({ cryptoPrices, fedData }: MobileQuickStatsProps) {
    return (
        <div className="md:hidden mb-4">
            {/* Crypto prices row - horizontally scrollable */}
            <div className="overflow-x-auto -mx-2 px-2">
                <div className="flex gap-3 min-w-max py-2">
                    {/* BTC */}
                    <div className="flex items-center gap-2 bg-black text-white px-3 py-1.5 text-xs font-mono">
                        <span className="font-bold">BTC</span>
                        <span className={cryptoPrices?.btc.direction === 'up' ? "text-green-400" : cryptoPrices?.btc.direction === 'down' ? "text-red-400" : "text-gray-400"}>
                            {cryptoPrices?.btc.price || "—"}
                            {cryptoPrices?.btc.direction === 'up' ? ' ▲' : cryptoPrices?.btc.direction === 'down' ? ' ▼' : ''}
                        </span>
                    </div>

                    {/* ETH */}
                    <div className="flex items-center gap-2 bg-black text-white px-3 py-1.5 text-xs font-mono">
                        <span className="font-bold">ETH</span>
                        <span className={cryptoPrices?.eth.direction === 'up' ? "text-green-400" : cryptoPrices?.eth.direction === 'down' ? "text-red-400" : "text-gray-400"}>
                            {cryptoPrices?.eth.price || "—"}
                            {cryptoPrices?.eth.direction === 'up' ? ' ▲' : cryptoPrices?.eth.direction === 'down' ? ' ▼' : ''}
                        </span>
                    </div>

                    {/* SOL */}
                    <div className="flex items-center gap-2 bg-black text-white px-3 py-1.5 text-xs font-mono">
                        <span className="font-bold">SOL</span>
                        <span className={cryptoPrices?.sol.direction === 'up' ? "text-green-400" : cryptoPrices?.sol.direction === 'down' ? "text-red-400" : "text-gray-400"}>
                            {cryptoPrices?.sol.price || "—"}
                            {cryptoPrices?.sol.direction === 'up' ? ' ▲' : cryptoPrices?.sol.direction === 'down' ? ' ▼' : ''}
                        </span>
                    </div>

                    {/* Fed Reserve compact widget */}
                    {fedData && (
                        <a
                            href={fedData.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-[#1a1a1a] text-[#d4af37] px-3 py-1.5 text-xs font-mono"
                        >
                            <span className="font-bold">FED</span>
                            <span className="font-blackletter text-lg leading-none">{fedData.action}</span>
                            <span className="text-[10px] text-[#d4af37]/70">{fedData.consensus}%</span>
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
