import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { getSupabase } from '../lib/supabase';
import type { EditorialData } from '../../types';

export const runtime = 'edge';

// Fetch Playfair Display font from Google Fonts
const playfairBold = fetch(
  'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.ttf'
).then((res) => res.arrayBuffer());

// Helper to get headline for an edition
async function getHeadlineForEdition(edition: string): Promise<{ headline: string; odds: string; date: string }> {
  const supabase = getSupabase();

  // Default fallback
  const fallback = {
    headline: 'BREAKING DEVELOPMENTS',
    odds: '',
    date: new Date().toISOString().slice(0, 10),
  };

  if (!supabase) return fallback;

  let dateKey = edition;

  // Handle "latest" by getting most recent edition
  if (edition === 'latest') {
    const today = new Date();
    // Try today first
    dateKey = today.toISOString().slice(0, 10);

    const { data: todayEdition } = await supabase
      .from('editions')
      .select('data, date_str')
      .eq('date_str', dateKey)
      .single();

    if (!todayEdition?.data) {
      // Try yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      dateKey = yesterday.toISOString().slice(0, 10);
    }
  }

  // Fetch the edition
  const { data: editionData } = await supabase
    .from('editions')
    .select('data, date_str')
    .eq('date_str', dateKey)
    .single();

  if (!editionData?.data) return fallback;

  const editorial = editionData.data as EditorialData;
  const leadStory = editorial.blueprint?.stories?.[0];

  if (!leadStory) return fallback;

  const headline = editorial.headlines?.[leadStory.id] || leadStory.question || 'BREAKING NEWS';
  const odds = Math.round(Math.max(leadStory.yesPrice, leadStory.noPrice) * 100);
  const direction = leadStory.yesPrice > 0.5 ? 'YES' : 'NO';

  return {
    headline: headline.toUpperCase(),
    odds: `${odds}% ${direction}`,
    date: editionData.date_str,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const edition = searchParams.get('edition') || 'latest';

  try {
    const { headline, odds, date } = await getHeadlineForEdition(edition);
    const fontData = await playfairBold;

    // Truncate headline if too long
    const displayHeadline = headline.length > 80
      ? headline.slice(0, 77) + '...'
      : headline;

    // Format date nicely
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).toUpperCase();

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f4f1ea',
            padding: '50px',
            fontFamily: 'Playfair Display',
            position: 'relative',
          }}
        >
          {/* Border frame */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              bottom: '20px',
              border: '4px double #1a1a1a',
              display: 'flex',
            }}
          />

          {/* Top date line */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              fontSize: 14,
              letterSpacing: '0.15em',
              color: '#666',
              marginBottom: 10,
            }}
          >
            {formattedDate}
          </div>

          {/* Decorative line */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 15,
            }}
          >
            <div style={{ width: 60, height: 2, backgroundColor: '#1a1a1a' }} />
            <div style={{ margin: '0 15px', fontSize: 20 }}>✦</div>
            <div style={{ width: 60, height: 2, backgroundColor: '#1a1a1a' }} />
          </div>

          {/* Masthead */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              fontSize: 52,
              fontWeight: 700,
              color: '#1a1a1a',
              letterSpacing: '-0.02em',
              marginBottom: 15,
            }}
          >
            The Polymarket Times
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              fontSize: 12,
              letterSpacing: '0.3em',
              color: '#666',
              marginBottom: 30,
              textTransform: 'uppercase',
            }}
          >
            Tomorrow&apos;s News Today
          </div>

          {/* Decorative separator */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 30,
            }}
          >
            <div style={{ width: '80%', height: 3, backgroundColor: '#1a1a1a' }} />
          </div>

          {/* Main headline */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              textAlign: 'center',
              fontSize: displayHeadline.length > 50 ? 42 : 52,
              fontWeight: 700,
              color: '#1a1a1a',
              lineHeight: 1.1,
              marginBottom: 25,
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            {displayHeadline}
          </div>

          {/* Odds badge */}
          {odds && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  backgroundColor: '#1a1a1a',
                  color: '#f4f1ea',
                  padding: '8px 24px',
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                }}
              >
                {odds}
              </div>
            </div>
          )}

          {/* Bottom decorative line */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 'auto',
            }}
          >
            <div style={{ width: '60%', height: 2, backgroundColor: '#1a1a1a' }} />
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              fontSize: 11,
              letterSpacing: '0.2em',
              color: '#888',
              marginTop: 15,
            }}
          >
            POLYMARKETTIMES.COM
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Playfair Display',
            data: fontData,
            weight: 700,
            style: 'normal',
          },
        ],
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  } catch (error) {
    console.error('OG image generation error:', error);

    // Return a fallback static card
    const fontData = await playfairBold;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f4f1ea',
            fontFamily: 'Playfair Display',
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 700, color: '#1a1a1a' }}>
            The Polymarket Times
          </div>
          <div style={{ fontSize: 18, color: '#666', marginTop: 20, letterSpacing: '0.2em' }}>
            TOMORROW&apos;S NEWS TODAY
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [{ name: 'Playfair Display', data: fontData, weight: 700, style: 'normal' }],
      }
    );
  }
}
