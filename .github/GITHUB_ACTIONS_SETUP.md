# GitHub Actions Cron Workaround Setup

This setup bypasses Vercel's 100 executions/day limit by using GitHub Actions (2,000 free minutes/month).

## 🚀 Current Schedule (After Setup)

- **Generate Edition**: Daily at 6 AM ET (1x/day)
- **Refresh Editorial**: Every 4 hours (6x/day)
- **Monitor Markets**: Every 10 minutes (144x/day)

**Total**: 151 executions/day 🎉 (vs Vercel's 100 limit)

## 📝 Setup Steps

### 1. Add GitHub Repository Secrets

Go to your repo → Settings → Secrets and variables → Actions → New repository secret

Add these two secrets:

- **`VERCEL_URL`**: Your Vercel deployment URL (e.g., `https://polytimes.vercel.app`)
- **`CRON_SECRET`**: The same secret you have in your Vercel environment variables

**✅ Note**: Your API endpoints already have authentication implemented, so no code changes needed!

### 2. (Optional) Remove Vercel Cron Jobs

You can now remove the `crons` array from `vercel.json` since GitHub Actions handles scheduling:

```json
{
  // Remove or comment out:
  // "crons": [...]
}
```

This saves your Vercel executions entirely!

### 3. Deploy Changes

```bash
git add .github/
git commit -m "Add GitHub Actions cron workaround"
git push
```

GitHub Actions will automatically start running on the schedules!

## 🔍 Monitoring

View workflow runs at: `https://github.com/YOUR_USERNAME/polytimes/actions`

You can also manually trigger workflows via "Run workflow" button.

## 💡 Why This Works

- GitHub Actions calls your Vercel API endpoints via HTTP
- Vercel sees these as regular web requests, not cron executions
- You get unlimited schedules (up to 2,000 minutes/month on free tier)
- Each workflow run takes ~5 seconds = ~750 free executions/month

## ⚠️ Rate Limits

If you hit GitHub rate limits, reduce frequency:
- Monitor Markets: `*/15 * * * *` (every 15 min = 96x/day)
- Refresh Editorial: `0 */6 * * *` (every 6 hours = 4x/day)
