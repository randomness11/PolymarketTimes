# feat: Edition Archives and Social Cards

**Date:** 2026-02-05
**Type:** Enhancement
**Status:** Ready for implementation

---

## Overview

Add two new features to enhance discoverability and shareability:

1. **Edition Archives** - Browsable history of past editions via calendar grid at `/archives`
2. **Social Share Cards** - Auto-generated newspaper-style OG images for social media sharing

Both features extend the Victorian newspaper aesthetic and leverage existing data (Supabase editions table).

---

## Problem Statement

**Current limitations:**
- No way to view past editions - readers miss historical coverage
- No OG images - links shared on Twitter/Discord show generic text
- Missing brand reinforcement on social platforms

**User needs:**
- "What did the site say about X last week?"
- "I want to share this headline on Twitter with a cool preview"

---

## Proposed Solution

### Feature 1: Edition Archives

**URL Structure:**
- `/archives` - Calendar grid showing available editions
- `/archives/2026-02-04` - Individual archived edition

**Key Design Decisions:**
- Show only **daily baseline editions** (YYYY-MM-DD format) to avoid confusion with hourly variants
- Use calendar grid for month-at-a-glance navigation
- Victorian styling with aged paper background
- Archived editions show frozen historical data (not live prices)

### Feature 2: Social Cards (OG Images)

**URL Structure:**
- `/api/og?edition=latest` - Current edition card
- `/api/og?edition=2026-02-04` - Specific edition card
- `/api/og?market=<market-id>` - Specific market card (future)

**Key Design Decisions:**
- On-demand generation via `@vercel/og` (Satori)
- 1200x630 pixels (OpenGraph standard)
- Front page mockup: masthead + lead headline + odds stat
- Cache for 1 hour via Vercel Edge Cache

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     /archives                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Calendar Grid Component                          │   │
│  │  - Fetch edition dates from Supabase              │   │
│  │  - Month navigation (prev/next)                   │   │
│  │  - Date cells link to /archives/[date]            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│               /archives/[date]/page.tsx                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Reuse homepage layout with archived data         │   │
│  │  - ArchiveBanner at top                           │   │
│  │  - Same LeadStory, BottomGrid, etc.               │   │
│  │  - Data from editions.data JSON blob              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    /api/og/route.tsx                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Vercel OG ImageResponse                          │   │
│  │  - Load Playfair Display font                     │   │
│  │  - Render newspaper mockup JSX                    │   │
│  │  - Return PNG with cache headers                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Database Query

```sql
-- Get all daily edition dates for calendar
SELECT DISTINCT date_str
FROM editions
WHERE date_str ~ '^\d{4}-\d{2}-\d{2}$'  -- Match YYYY-MM-DD only (not hourly)
ORDER BY date_str DESC;

-- Get specific edition
SELECT data FROM editions WHERE date_str = '2026-02-04' LIMIT 1;
```

### File Structure

```
app/
├── archives/
│   ├── page.tsx              # Calendar grid (Server Component)
│   ├── [date]/
│   │   └── page.tsx          # Individual archived edition
│   ├── loading.tsx           # Calendar skeleton
│   └── error.tsx             # Archive error boundary
├── api/
│   └── og/
│       └── route.tsx         # OG image generation
├── components/
│   ├── ArchiveCalendar.tsx   # Calendar grid component
│   └── ArchiveBanner.tsx     # "Viewing archived edition" banner
public/
└── fonts/
    └── PlayfairDisplay-Bold.ttf  # Font for OG generation
```

---

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)

**Tasks:**
- [x] Install `@vercel/og` package
- [x] Download Playfair Display font file to `/public/fonts/` (using Google Font URL instead)
- [x] Create `/app/api/og/route.tsx` with basic ImageResponse
- [x] Add OG metadata to `/app/layout.tsx`
- [ ] Test OG image renders on Twitter Card Validator

**Files:**
- `package.json` - Add @vercel/og dependency
- `/app/api/og/route.tsx` - New file
- `/app/layout.tsx` - Add openGraph metadata
- `/public/fonts/PlayfairDisplay-Bold.ttf` - New font file

**Success criteria:**
- [ ] Sharing polymarkettimes.com shows newspaper-style card
- [ ] Card renders in < 200ms

### Phase 2: Archives Infrastructure

**Tasks:**
- [x] Create `/app/archives/page.tsx` with basic structure
- [x] Create `ArchiveCalendar` component with month grid
- [x] Implement Supabase query for edition dates
- [x] Add month navigation (prev/next buttons)
- [x] Style calendar with Victorian aesthetic

**Files:**
- `/app/archives/page.tsx` - New file
- `/app/components/ArchiveCalendar.tsx` - New file
- `/app/archives/loading.tsx` - New file

**Success criteria:**
- [ ] User can navigate to `/archives`
- [ ] Calendar shows dots/indicators for available editions
- [ ] Month navigation works
- [ ] Mobile-friendly (list view on small screens)

### Phase 3: Archive Edition Pages

**Tasks:**
- [x] Create `/app/archives/[date]/page.tsx` dynamic route
- [x] Create `ArchiveBanner` component
- [x] Implement date validation (YYYY-MM-DD format)
- [x] Query edition data from Supabase
- [x] Render using existing homepage components
- [x] Add 404 handling for invalid dates
- [x] Add edition-specific OG metadata

**Files:**
- `/app/archives/[date]/page.tsx` - New file
- `/app/components/ArchiveBanner.tsx` - New file
- `/app/archives/[date]/error.tsx` - New file

**Success criteria:**
- [ ] `/archives/2026-02-04` shows that day's edition
- [ ] Banner clearly indicates "Archived Edition"
- [ ] Invalid dates show Victorian-styled 404
- [ ] OG card shows edition-specific headline

### Phase 4: Navigation Integration

**Tasks:**
- [x] Add "Archives" link to Header component
- [x] Add "Archives" link to Footer component
- [x] Add "Back to Archives" link on edition pages
- [x] Add "Today's Edition" quick link from archives

**Files:**
- `/app/components/Header.tsx` - Modify
- `/app/components/Footer.tsx` - Modify

**Success criteria:**
- [ ] Users can discover archives from any page
- [ ] Navigation between archives and current edition is clear

---

## Acceptance Criteria

### Functional Requirements

**Archives:**
- [ ] User can browse to `/archives` and see calendar of past editions
- [ ] Clicking a date navigates to `/archives/YYYY-MM-DD`
- [ ] Archived edition displays historical data (not live)
- [ ] Empty dates are visually distinct (greyed out)
- [ ] Invalid/future dates show 404 error page
- [ ] Month navigation allows browsing historical months

**Social Cards:**
- [ ] Homepage generates OG card with masthead + lead headline
- [ ] Card displays correctly on Twitter, LinkedIn, Discord
- [ ] Archived editions have edition-specific cards
- [ ] Cards include "The Polymarket Times" branding
- [ ] Generation completes in < 200ms

### Non-Functional Requirements

- [ ] Archives page loads in < 1s
- [ ] Calendar renders correctly on mobile (320px+)
- [ ] OG images are < 100KB
- [ ] All new pages follow existing Victorian aesthetic
- [ ] Accessible: calendar navigable via keyboard

### Quality Gates

- [ ] TypeScript strict mode passes
- [ ] No console errors in production
- [ ] Mobile tested on iOS Safari and Android Chrome
- [ ] OG cards validated on Twitter Card Validator

---

## Technical Specifications

### OG Image Route (`/app/api/og/route.tsx`)

```tsx
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const playfairBold = fetch(
  new URL('/public/fonts/PlayfairDisplay-Bold.ttf', import.meta.url)
).then((res) => res.arrayBuffer());

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const edition = searchParams.get('edition') || 'latest';

  // Fetch edition data
  const headline = await getHeadlineForEdition(edition);
  const fontData = await playfairBold;

  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f4f1ea',
        padding: '40px',
      }}>
        {/* Masthead */}
        <div style={{ fontSize: 32, fontFamily: 'serif', textAlign: 'center' }}>
          The Polymarket Times
        </div>
        {/* Headline */}
        <div style={{
          fontSize: 48,
          fontFamily: 'Playfair Display',
          fontWeight: 700,
          marginTop: 40,
          lineHeight: 1.2,
        }}>
          {headline}
        </div>
        {/* Tagline */}
        <div style={{
          fontSize: 16,
          marginTop: 'auto',
          opacity: 0.7,
        }}>
          Tomorrow's News Today
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Playfair Display', data: fontData, weight: 700 }],
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    }
  );
}
```

### Archive Calendar Component Pattern

```tsx
// /app/components/ArchiveCalendar.tsx
interface CalendarProps {
  editionDates: string[];  // ['2026-02-05', '2026-02-04', ...]
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function ArchiveCalendar({ editionDates, currentMonth, onMonthChange }: CalendarProps) {
  const daysInMonth = getDaysInMonth(currentMonth);
  const editionSet = new Set(editionDates);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Month header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
          <span className="text-2xl">←</span>
        </button>
        <h2 className="font-blackletter text-3xl">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
          <span className="text-2xl">→</span>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day} className="text-center font-bold text-sm">{day}</div>
        ))}

        {/* Day cells */}
        {daysInMonth.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const hasEdition = editionSet.has(dateStr);

          return hasEdition ? (
            <Link
              key={dateStr}
              href={`/archives/${dateStr}`}
              className="aspect-square border border-black bg-white p-2
                         hover:bg-amber-50 card-lift-on-hover text-center"
            >
              <span className="font-mono">{format(day, 'd')}</span>
              <span className="block text-[8px] mt-1">EDITION</span>
            </Link>
          ) : (
            <div
              key={dateStr}
              className="aspect-square border border-gray-300 bg-gray-100
                         p-2 opacity-50 text-center"
            >
              <span className="font-mono">{format(day, 'd')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Archive Edition Page Pattern

```tsx
// /app/archives/[date]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabase } from '@/app/api/lib/supabase';
import { ArchiveBanner } from '@/app/components/ArchiveBanner';
import { LeadStory } from '@/app/components/LeadStory';
// ... other imports

interface PageProps {
  params: Promise<{ date: string }>;
}

// Validate date format
function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  if (!isValidDate(date)) return { title: 'Edition Not Found' };

  return {
    title: `Edition ${date} - The Polymarket Times`,
    description: `Historical edition from ${date}`,
    openGraph: {
      images: [`/api/og?edition=${date}`],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/og?edition=${date}`],
    },
  };
}

export default async function ArchivePage({ params }: PageProps) {
  const { date } = await params;

  // Validate date format
  if (!isValidDate(date)) {
    notFound();
  }

  // Fetch edition
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Database unavailable');
  }

  const { data: edition, error } = await supabase
    .from('editions')
    .select('data')
    .eq('date_str', date)
    .single();

  if (error || !edition?.data) {
    notFound();
  }

  const editorialData = edition.data;

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <ArchiveBanner date={date} />
      <Header />

      <main className="...">
        <LeadStory
          market={editorialData.blueprint.stories[0]}
          headline={editorialData.headlines[editorialData.blueprint.stories[0].id]}
          // ... pass historical data
        />
        {/* Rest of homepage layout */}
      </main>

      <Footer />
    </div>
  );
}
```

---

## Dependencies & Prerequisites

**New packages:**
- `@vercel/og` - OG image generation

**Font files needed:**
- Playfair Display Bold (TTF format for Satori)

**Existing dependencies used:**
- Supabase client (already configured)
- Next.js App Router (already in use)

---

## Risk Analysis & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Font loading fails in OG endpoint | Broken cards | Medium | Fallback to system serif font |
| Supabase query timeout | Archive page fails | Low | Add error boundary, show graceful error |
| OG generation timeout (>10s) | Broken social previews | Low | Cache aggressively, optimize rendering |
| Mobile calendar unusable | Poor UX | Medium | Test early, implement list view fallback |
| Edition data structure changes | Archives break | Low | Validate data shape, graceful degradation |

---

## Future Considerations

**Not in scope but designed for:**
- Market-specific OG cards (`/api/og?market=<id>`)
- Archive search by keyword
- Edition comparison view
- RSS/Atom feed of editions
- Share buttons on articles

---

## References

### Internal References
- Brainstorm: `/docs/brainstorms/2026-02-05-archives-and-social-cards-brainstorm.md`
- Supabase client: `/app/api/lib/supabase.ts:32-68`
- Homepage layout: `/app/page.tsx:328-345`
- Victorian styling: `/app/globals.css:4-52`
- Edition types: `/app/types/index.ts:105-116`

### External References
- [Vercel OG Documentation](https://vercel.com/docs/functions/og-image-generation)
- [Satori (OG rendering engine)](https://github.com/vercel/satori)
- [OpenGraph Protocol](https://ogp.me/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
