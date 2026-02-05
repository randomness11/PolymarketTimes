# Brainstorm: Edition Archives + Social Cards

**Date:** 2026-02-05
**Status:** Ready for planning

---

## What We're Building

### Feature 1: Edition Archives

A browsable archive of past editions at `/archives`, allowing readers to explore the history of prediction market news coverage.

**Key Elements:**
- **Calendar Grid UI** - Monthly view showing which days have editions (dots/thumbnails)
- **Edition Preview** - Hover/click reveals lead headline and key stats
- **Full Edition View** - Click through to archived edition page (`/archives/2026-02-04`)
- **Victorian Styling** - Matches existing newspaper aesthetic (aged paper, ornate borders)

**Data Source:**
- Already have `editions` table in Supabase with `date_str` keys
- Each edition contains full `editorial_content` JSON blob
- No new data collection needed

### Feature 2: Social Share Cards (OG Images)

Auto-generated newspaper-style images for social sharing via `/api/og` endpoint.

**Key Elements:**
- **Front Page Mockup Style** - Mini newspaper with:
  - Polymarket Times masthead
  - Lead headline in large Playfair Display
  - Key market stat (odds + direction)
  - Aged paper texture background
  - "Tomorrow's News Today" tagline
- **On-demand Generation** - Uses `@vercel/og` (Satori)
- **Dynamic Routes** - `/api/og?market=bitcoin-100k` or `/api/og?edition=2026-02-05`

**Integration:**
- Add OG meta tags to page.tsx and dynamic routes
- Twitter Card + OpenGraph support
- Share buttons on articles (optional enhancement)

---

## Why This Approach

### Edition Archives - Calendar Grid
- **On-brand**: Real newspapers have archives with date-based navigation
- **Discoverable**: Users can see at-a-glance which days had editions
- **Low complexity**: Just query Supabase for edition dates, render calendar
- **Future-proof**: Can add search/filtering later without redesign

### Social Cards - On-demand OG
- **Zero storage**: No need to store/manage images
- **Always fresh**: Card reflects current data if market mentioned
- **Vercel native**: `@vercel/og` is built for this, fast edge rendering
- **SEO bonus**: Proper OG tags improve link previews everywhere

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Archive navigation | Calendar grid | Fits newspaper metaphor, scannable |
| Archive URL structure | `/archives/YYYY-MM-DD` | Clean, bookmarkable, SEO-friendly |
| OG image generation | On-demand via Vercel OG | No storage overhead, always fresh |
| Card visual style | Front page mockup | Strong brand identity, shareable |
| Card dimensions | 1200x630 (OpenGraph standard) | Universal compatibility |

---

## Open Questions

1. **Archive depth**: How far back to show? (Only show dates with actual editions)
2. **Edition comparison**: Add "compare two editions" feature later?
3. **Share buttons**: Add explicit Twitter/copy-link buttons to articles?
4. **OG for individual markets**: Generate cards for specific market pages (if we add them)?

---

## Implementation Notes

### Archives - Technical Approach
```
/app/archives/page.tsx          # Calendar view (Server Component)
/app/archives/[date]/page.tsx   # Individual archived edition
/app/api/archives/route.ts      # Get list of available edition dates
```

Query pattern:
```sql
SELECT DISTINCT date_str FROM editions ORDER BY date_str DESC
```

### Social Cards - Technical Approach
```
/app/api/og/route.tsx           # Vercel OG image generation
```

Uses `ImageResponse` from `@vercel/og` with:
- Custom fonts (Playfair Display, EB Garamond)
- SVG-based layout (Satori requirement)
- Dynamic text sizing for headlines

### Meta Tags Integration
```tsx
// In layout.tsx or page.tsx
export const metadata = {
  openGraph: {
    images: [{ url: '/api/og?edition=latest' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/api/og?edition=latest'],
  },
}
```

---

## Success Criteria

### Archives
- [ ] User can browse to `/archives` and see calendar of past editions
- [ ] Clicking a date shows that day's full edition
- [ ] Empty dates are greyed out / not clickable
- [ ] Mobile-friendly calendar view

### Social Cards
- [ ] Sharing polymarkettimes.com on Twitter shows newspaper-style card
- [ ] Card includes masthead, lead headline, and visual polish
- [ ] Cards render correctly on Twitter, LinkedIn, Discord, iMessage
- [ ] Sub-200ms generation time

---

## Next Steps

Run `/workflows:plan` to generate implementation plan with:
1. File structure and components needed
2. API endpoint specifications
3. Database queries
4. Styling approach
5. Testing checklist
