import { NextResponse } from 'next/server';
import { CryptoData } from '../../types';

export const revalidate = 60; // Cache for 60 seconds

export async function getCrypto(): Promise<CryptoData> {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true',
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 60 }
            }
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();

        // Helper to format currency
        const fmt = (val: number) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: val > 1000 ? 0 : 2,
                maximumFractionDigits: val > 1000 ? 0 : 2,
            }).format(val);
        };

        // Helper to format percentage
        const fmtPct = (val: number) => {
            const sign = val >= 0 ? '+' : '';
            return `${sign}${val.toFixed(1)}%`;
        };

        return {
            btc: {
                price: fmt(data.bitcoin.usd),
                change: fmtPct(data.bitcoin.usd_24h_change),
                direction: data.bitcoin.usd_24h_change >= 0 ? 'up' : 'down'
            },
            eth: {
                price: fmt(data.ethereum.usd),
                change: fmtPct(data.ethereum.usd_24h_change),
                direction: data.ethereum.usd_24h_change >= 0 ? 'up' : 'down'
            },
            sol: {
                price: fmt(data.solana.usd),
                change: fmtPct(data.solana.usd_24h_change),
                direction: data.solana.usd_24h_change >= 0 ? 'up' : 'down'
            }
        };

    } catch (error) {
        console.error('Crypto API Error:', error);
        // Fallback data if API fails
        return {
            btc: { price: "$98,420", change: "+0.0%", direction: 'up' },
            eth: { price: "$3,450", change: "+0.0%", direction: 'up' },
            sol: { price: "$235.10", change: "+0.0%", direction: 'up' }
        };
    }
}

export async function GET() {
    try {
        const prices = await getCrypto();
        return NextResponse.json(prices);
    } catch (error) {
        console.error('Crypto API Route Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
