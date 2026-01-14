import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getEditorial } from '../../editorial/route';
import { getMarkets } from '../../markets/route';
import { getSupabase } from '../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily Cron Job to pre-generate the baseline edition
 * Runs at 6 AM US Eastern Time via Vercel Cron
 * 
 * This ensures users always have a cached edition available
 */
export async function GET(request: Request) {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, require the secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.error('Unauthorized cron request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('=== DAILY CRON: Generating baseline edition ===');

    try {
        // 1. Fetch fresh market data
        const marketsData = await getMarkets();
        if (!marketsData) {
            throw new Error('Failed to fetch markets');
        }

        // 2. Generate fresh editorial content (force refresh to bypass cache)
        const editorial = await getEditorial(marketsData.markets, marketsData.groups, true);

        if ('error' in editorial) {
            throw new Error(editorial.error);
        }

        // 3. Save as daily baseline (YYYY-MM-DD key)
        const supabase = getSupabase();
        if (supabase) {
            const dailyKey = new Date().toISOString().slice(0, 10);

            const { error } = await supabase
                .from('editions')
                .upsert({
                    date_str: dailyKey,
                    data: editorial as any,
                    created_at: new Date().toISOString()
                }, { onConflict: 'date_str' });

            if (error) {
                console.error('Failed to save daily baseline:', error);
                return NextResponse.json({ error: 'Failed to save baseline' }, { status: 500 });
            }

            // Revalidate homepage
            try {
                revalidatePath('/');
                console.log('[DAILY CRON] Revalidated homepage cache');
            } catch (e) {
                console.warn('[DAILY CRON] Revalidation warning:', e);
            }

            console.log(`=== DAILY CRON: Saved baseline edition for ${dailyKey} ===`);
            return NextResponse.json({
                success: true,
                dateKey: dailyKey,
                storiesCount: editorial.blueprint.stories.length,
                revalidated: true
            });
        }

        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    } catch (error) {
        console.error('Daily cron failed:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
