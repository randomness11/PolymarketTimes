import { NextResponse } from 'next/server';
import { getSupabase } from '../lib/supabase';

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    // Clean up old entries periodically (simple cleanup on each check)
    if (rateLimitMap.size > 10000) {
        for (const [key, val] of rateLimitMap.entries()) {
            if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) {
                rateLimitMap.delete(key);
            }
        }
    }

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        // New window
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return { allowed: true };
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart);
        return { allowed: false, retryAfterMs };
    }

    entry.count++;
    return { allowed: true };
}

function getClientIP(request: Request): string {
    // Try various headers that might contain the real IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }
    // Fallback (won't work in production behind proxy, but safe default)
    return 'unknown';
}

export async function POST(request: Request) {
    try {
        // Rate limit check
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(clientIP);
        if (!rateLimit.allowed) {
            const retryAfterSec = Math.ceil((rateLimit.retryAfterMs || 0) / 1000);
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(retryAfterSec) }
                }
            );
        }

        console.log('Subscribe API called');
        const { email } = await request.json();
        console.log('Email received:', email);

        // Validate email with additional checks
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        // Length check (RFC 5321)
        if (email.length > 254) {
            return NextResponse.json({ error: 'Email address too long' }, { status: 400 });
        }

        // Basic format validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

    } catch (error: unknown) {
        console.error('Subscription unexpected error:', error);

        // Only log detailed errors server-side, never expose to client
        if (process.env.NODE_ENV === 'development') {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return NextResponse.json({
                error: `Server error: ${errorMessage}`
            }, { status: 500 });
        }

        // Production: generic error message only
        return NextResponse.json({
            error: 'An unexpected error occurred. Please try again later.'
        }, { status: 500 });
    }
}
