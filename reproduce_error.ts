
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key && value) {
                process.env[key] = value.replace(/"/g, ''); // Remove quotes if present
            }
        }
    });
} else {
    console.error('.env.local not found');
}

console.log('Supabase URL present:', !!process.env.SUPABASE_URL);
console.log('Supabase Key present:', !!process.env.SUPABASE_SERVICE_KEY);

const getSupabase = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
}

async function run() {
    const email = 'test_debug_FIXED_EMAIL@example.com';
    console.log(`Testing subscription for: ${email}`);

    const supabase = getSupabase();
    if (!supabase) {
        console.error('Failed to init supabase');
        return;
    }

    // 1. Try RPC
    console.log('Attempting RPC...');
    const { data, error } = await supabase.rpc('subscribe_email', {
        email_arg: email
    });

    if (error) {
        console.error('RPC Error details:', JSON.stringify(error, null, 2));

        // 2. Try Insert (Simulate fallback)
        console.log('Attempting fallback insert...');
        const { error: insertError } = await supabase
            .from('subscribers')
            .insert({ email })
            .select()
            .single();

        if (insertError) {
            console.error('Insert Error details:', JSON.stringify(insertError, null, 2));
        } else {
            console.log('Insert Success');
        }
    } else {
        console.log('RPC Success:', data);
        if (data && data.success === false) {
            console.error('RPC returned logic error:', data.error);
        }
    }
}

run();
