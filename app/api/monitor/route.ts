import { NextResponse } from 'next/server';
import { getMarkets } from '../markets/route';
import { MarketMonitoringAgent } from '../editorial/market-monitoring-agent';
import { getSupabase } from '../lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Market Monitoring Endpoint - Real-time price swing detection
 *
 * Can be called via:
 * 1. Vercel Cron (every 5-10 minutes)
 * 2. Webhook from Polymarket (if available)
 * 3. Manual trigger for testing
 *
 * Stores alerts in Supabase for display on frontend
 */
export async function GET(request: Request) {
    // Verify authorization (cron secret or manual override)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        // Allow local development without auth
        if (process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        console.log('[MONITOR] Starting market monitoring check...');

        // 1. Fetch current market data
        const marketsData = await getMarkets();
        if (!marketsData || marketsData.markets.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No markets available'
            }, { status: 500 });
        }

        // 2. Retrieve prior snapshot from Supabase (if exists)
        const supabase = getSupabase();
        let priorSnapshot: Map<string, number> | undefined;

        if (supabase) {
            const { data } = await supabase
                .from('market_snapshots')
                .select('data')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data?.data) {
                // Convert stored object back to Map
                priorSnapshot = new Map(Object.entries(data.data));
            }
        }

        // 3. Run monitoring agent
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const monitorAgent = new MarketMonitoringAgent(process.env.GEMINI_API_KEY);
        const result = await monitorAgent.call({
            markets: marketsData.markets,
            priorSnapshot
        });

        // 4. Store new snapshot
        if (supabase) {
            // Convert Map to plain object for storage
            const snapshotObject = Object.fromEntries(result.snapshot);

            await supabase
                .from('market_snapshots')
                .insert({
                    data: snapshotObject,
                    created_at: new Date().toISOString()
                });

            // Clean up old snapshots (keep last 100)
            await supabase
                .from('market_snapshots')
                .delete()
                .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Delete >7 days old
        }

        // 5. Store alerts if any
        if (result.alerts.length > 0 && supabase) {
            const alertRecords = result.alerts.map(alert => ({
                market_id: alert.marketId,
                alert_type: alert.alertType,
                urgency: alert.urgency,
                headline: alert.headline,
                price_change: alert.priceChange,
                old_price: alert.oldPrice,
                new_price: alert.newPrice,
                reasoning: alert.reasoning,
                market_data: alert.market,
                created_at: new Date().toISOString()
            }));

            await supabase
                .from('market_alerts')
                .insert(alertRecords);

            console.log(`[MONITOR] ${result.alerts.length} alerts saved to database.`);
        }

        // 6. Return summary
        return NextResponse.json({
            success: true,
            alertsGenerated: result.alerts.length,
            alerts: result.alerts.map(a => ({
                headline: a.headline,
                urgency: a.urgency,
                marketQuestion: a.market.question,
                priceChange: `${Math.round(a.priceChange * 100)}pp`
            })),
            reasoning: result.reasoning,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[MONITOR] Critical error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
