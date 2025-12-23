
import fs from 'fs';
import path from 'path';

function readEnv(filePath: string) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const env: Record<string, string> = {};
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/"/g, '');
            if (key) env[key] = value;
        }
    });
    return env;
}

const local = readEnv('.env.local');
const remote = readEnv('.env.vercel');

const keysToCheck = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];

keysToCheck.forEach(key => {
    const localVal = local[key];
    const remoteVal = remote[key];

    if (!localVal) console.log(`[${key}] Missing locally`);
    if (!remoteVal) console.log(`[${key}] Missing on Vercel`);

    if (localVal && remoteVal) {
        if (localVal !== remoteVal) {
            console.log(`[${key}] MISMATCH!`);
            console.log(`  Local:  ${localVal.substring(0, 15)}...`);
            console.log(`  Vercel: ${remoteVal.substring(0, 15)}...`);
        } else {
            console.log(`[${key}] MATCH`);
        }
    }
});
