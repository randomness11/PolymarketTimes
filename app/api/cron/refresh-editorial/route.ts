import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getMarkets } from '../../markets/route';
import { getEditorial } from '../../editorial/route';

export const dynamic = 'force-dynamic'; // Prevent caching of the cron handler itself

export async function GET(request: Request) {
    // 1. Verify Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Check for Vercel Cron signature if testing in prod, or just simple bearer
        // For simplicity, we stick to the bearer token Vercel provides.
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('[CRON] Starting hourly editorial refresh...');

        // 2. Fetch fresh market data
        const marketsResult = await getMarkets();

        if (marketsResult.markets.length === 0) {
            console.error('[CRON] No markets found. Aborting refresh.');
            return NextResponse.json({ success: false, error: 'No markets found' }, { status: 500 });
        }

        // 3. Force generate new editorial
        // We pass true for forceRefresh to ensure the agents run even if something cached exists
        // (Though usually cron runs at top of hour so cache would be stale anyway).
        const editorialResult = await getEditorial(
            marketsResult.markets,
            marketsResult.groups,
            true // Force refresh
        );

        if ('error' in editorialResult) {
            console.error('[CRON] Editorial generation failed:', editorialResult.error);
            return NextResponse.json({ success: false, error: editorialResult.error }, { status: 500 });
        }

        // Revalidate the homepage to serve fresh content immediately
        try {
            revalidatePath('/');
            console.log('[CRON] Revalidated homepage cache');
        } catch (e) {
            console.warn('[CRON] Revalidation warning:', e);
        }

        console.log('[CRON] Successfully refreshed editorial.');
        return NextResponse.json({ success: true, timestamp: new Date().toISOString(), revalidated: true });

    } catch (error) {
        console.error('[CRON] Critical error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
