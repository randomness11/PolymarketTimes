import { NextResponse } from 'next/server';
import { getSupabase } from '../lib/supabase';

export const revalidate = 60; // Cache for 60 seconds

export interface MarketAlert {
    id: string;
    market_id: string;
    alert_type: string;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    headline: string;
    price_change: number;
    old_price: number;
    new_price: number;
    reasoning?: string;
    market_data: {
        question: string;
        slug: string;
        yesPrice: number;
    };
    created_at: string;
}

export async function GET() {
    const supabase = getSupabase();

    if (!supabase) {
        return NextResponse.json({ alerts: [] });
    }

    try {
        // Get alerts from last 2 hours
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('market_alerts')
            .select('*')
            .gte('created_at', twoHoursAgo)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching alerts:', error);
            return NextResponse.json({ alerts: [] });
        }

        return NextResponse.json({ alerts: data || [] });
    } catch (error) {
        console.error('Error in alerts route:', error);
        return NextResponse.json({ alerts: [] });
    }
}
