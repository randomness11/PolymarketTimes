import { NextResponse } from 'next/server';
import { getSupabase } from '../lib/supabase';

export async function POST(request: Request) {
    try {
        console.log('Subscribe API called');
        const { email } = await request.json();
        console.log('Email received:', email);

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        const supabase = getSupabase();
        if (!supabase) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
        }

        // Use RPC to bypass RLS/Key issues
        const { data, error } = await supabase.rpc('subscribe_email', {
            email_arg: email
        });

        if (error) {
            console.error('Subscription RPC error:', error);
            // Fallback to direct insert if RPC fails/doesn't exist yet (backward compatibility)
            const { error: insertError } = await supabase
                .from('subscribers')
                .insert({ email })
                .select()
                .single();

            if (insertError) {
                if (insertError.code === '23505') {
                    return NextResponse.json({ message: 'Already subscribed' }, { status: 200 });
                }
                return NextResponse.json({ error: `Failed to subscribe: ${insertError.message}` }, { status: 500 });
            }
        }

        return NextResponse.json({ message: 'Subscribed successfully' }, { status: 200 });

    } catch (error) {
        console.error('Subscription unexpected error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // DEBUG: Return env status in error response (Masked)
        const envDebug = {
            urlConfigured: !!process.env.SUPABASE_URL,
            urlPrefix: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 15) + '...' : 'MISSING',
            keyConfigured: !!process.env.SUPABASE_SERVICE_KEY,
        };

        return NextResponse.json({
            error: `Server error: ${errorMessage}`,
            debug: envDebug
        }, { status: 500 });
    }
}
