'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';

interface MarketAlert {
    id: string;
    market_id: string;
    alert_type: string;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    headline: string;
    price_change: number;
    old_price: number;
    new_price: number;
    market_data: {
        question: string;
        slug: string;
        yesPrice: number;
    };
    created_at: string;
}

interface LiveUpdatesProps {
    timestamp?: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function BreakingAlertsTicker() {
    const { data, error } = useSWR<{ alerts: MarketAlert[] }>('/api/alerts', fetcher, {
        refreshInterval: 60000, // Refresh every 60 seconds
        revalidateOnFocus: true,
    });

    const alerts = data?.alerts || [];
    const highUrgencyAlerts = alerts.filter(a => a.urgency === 'HIGH' || a.urgency === 'MEDIUM');

    if (highUrgencyAlerts.length === 0) return null;

    return (
        <div className="bg-red-900 text-white py-1 px-4 overflow-hidden border-b-2 border-red-700">
            <div className="flex items-center gap-4 animate-marquee whitespace-nowrap">
                <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                    <span className="animate-pulse">●</span> BREAKING
                </span>
                {highUrgencyAlerts.map((alert, i) => (
                    <a
                        key={alert.id || i}
                        href={`https://polymarket.com/event/${alert.market_data?.slug || ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:underline text-sm"
                    >
                        <span className="font-semibold">{alert.headline}</span>
                        <span className={`text-xs px-1 rounded ${alert.price_change > 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                            {alert.price_change > 0 ? '+' : ''}{Math.round(alert.price_change * 100)}%
                        </span>
                        {i < highUrgencyAlerts.length - 1 && <span className="mx-4 text-red-400">|</span>}
                    </a>
                ))}
            </div>
        </div>
    );
}

export function LastUpdatedIndicator({ timestamp }: LiveUpdatesProps) {
    const [minutesAgo, setMinutesAgo] = useState<number>(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (!timestamp) return;

        const updateTime = () => {
            const diff = Date.now() - new Date(timestamp).getTime();
            setMinutesAgo(Math.floor(diff / 60000));
        };

        updateTime();
        const interval = setInterval(updateTime, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [timestamp]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        // Force page reload to get fresh data
        window.location.reload();
    }, []);

    const getTimeText = () => {
        if (!timestamp) return 'Unknown';
        if (minutesAgo < 1) return 'Just now';
        if (minutesAgo === 1) return '1 min ago';
        if (minutesAgo < 60) return `${minutesAgo} mins ago`;
        const hours = Math.floor(minutesAgo / 60);
        if (hours === 1) return '1 hour ago';
        return `${hours} hours ago`;
    };

    const isStale = minutesAgo > 60; // More than 1 hour old

    return (
        <div className={`flex items-center gap-2 text-xs font-mono ${isStale ? 'text-red-600' : 'text-gray-600'}`}>
            <span className={`w-2 h-2 rounded-full ${isStale ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span>{getTimeText()}</span>
            <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="ml-2 px-2 py-0.5 border border-black hover:bg-black hover:text-white transition-colors text-[10px] uppercase tracking-wider disabled:opacity-50"
            >
                {isRefreshing ? '...' : '↻ Refresh'}
            </button>
        </div>
    );
}

export function LivePricePolling({ children, marketIds }: { children: React.ReactNode; marketIds: string[] }) {
    // This component wraps children and provides live price updates via context
    // For now, we'll just re-render on interval
    const [key, setKey] = useState(0);

    useEffect(() => {
        // Soft refresh every 2 minutes (prices update on server)
        const interval = setInterval(() => {
            setKey(k => k + 1);
        }, 120000);

        return () => clearInterval(interval);
    }, []);

    return <div key={key}>{children}</div>;
}

// Mini refresh button for embedding anywhere
export function RefreshButton({ className = '' }: { className?: string }) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        window.location.reload();
    };

    return (
        <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`px-3 py-1 border-2 border-black bg-white hover:bg-black hover:text-white transition-all text-xs uppercase tracking-wider font-bold disabled:opacity-50 ${className}`}
            title="Refresh for latest data"
        >
            {isRefreshing ? 'Loading...' : '↻ Get Latest'}
        </button>
    );
}
