# The Polymarket Times

A regal, old-world newspaper front page displaying trending Polymarket prediction markets with real-time data, updated hourly.

## Design Philosophy

This project recreates the aesthetic of Victorian/Edwardian era broadsheets—think The Times of London from 1895 or the New York Herald from the gilded age. The design evokes old stock certificates, vintage financial newspapers, and gilded age typography with authentic period details.

## Features

- **Real-time Market Data**: Fetches top 7 trending Polymarket prediction markets by 24-hour volume
- **AI-Generated Editorial**: Groq AI generates insightful commentary connecting market trends to broader cultural moments
- **Victorian Aesthetic**: Authentic typography, aged paper texture, ornamental dividers, and period-appropriate styling
- **Responsive Design**: Adapts beautifully from desktop to tablet to mobile
- **Hourly Updates**: Data automatically refreshes every hour using Next.js ISR

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Groq API key (get one at https://console.groq.com/)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory:

```bash
GROQ_API_KEY=gsk_your-key-here
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Data Fetching

The app uses Polymarket's official CLOB API:

- **Markets API** (`/api/markets`): Fetches the top 7 markets by 24-hour volume from `https://gamma-api.polymarket.com/markets`
- **Price History**: Retrieves 24-hour price changes from `https://clob.polymarket.com/prices-history`
- **Editorial API** (`/api/editorial`): Sends market data to Groq AI (llama-3.3-70b-versatile) for sophisticated analysis

### Layout Structure

1. **Main Headline**: The #1 trending market with full treatment
2. **Side Pieces**: Markets #2-3 in two-column layout
3. **Market Briefs**: Markets #4-7 as compact ticker-style entries
4. **Editorial Synthesis**: AI-generated commentary on what the markets reveal

### Typography

- **Masthead**: Playfair Display Black (ornate display serif)
- **Headlines**: Playfair Display Bold
- **Body Text**: EB Garamond
- **Data/Numbers**: Old Standard TT

### Color Palette

- Background: Aged cream/ivory (#F5F0E6)
- Text: Deep newspaper black (#1A1A1A)
- Accents: Muted gold (#8B7355)
- Subtle paper grain texture and foxing marks

## Technologies

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Utility-first styling
- **Groq AI**: Fast LLM inference for editorial generation (llama-3.3-70b-versatile)
- **Google Fonts**: Period-appropriate typography

## Production Deployment

The app uses Incremental Static Regeneration (ISR) with a 1-hour revalidation period, making it perfect for deployment on Vercel:

```bash
npm run build
npm run start
```

Or deploy directly to Vercel:

```bash
vercel
```

Don't forget to set the `GROQ_API_KEY` environment variable in your deployment settings.

## Design Details

- Ornamental corner brackets and filigree dividers
- Drop cap on editorial section
- Victorian-era date formatting
- Issue number calculated from days since launch
- Subtle paper texture with grain and foxing
- Period-appropriate loading state: "Awaiting Wire Transmission..."

## API Endpoints

### GET /api/markets

Returns the top 7 trending markets with:
- Market question
- YES/NO prices
- 24-hour volume
- Total volume
- 24-hour price change
- Timestamp

Revalidates every hour.

### POST /api/editorial

Accepts market data and returns AI-generated editorial synthesis.

Input:
```json
{
  "markets": [/* array of market objects */]
}
```

Output:
```json
{
  "editorial": "...",
  "timestamp": "2025-11-26T..."
}
```

## License

MIT

## Acknowledgments

- Polymarket for the prediction market data
- Groq for ultra-fast AI inference
- Victorian typographers and newspaper designers of the gilded age
# PolymarketTimes
