# Prompt for Claude/v0 to Generate "The Oracle" Mockup

**Role:** Expert Frontend Designer & Developer
**Task:** Create a React component for "The Oracle", a predictive market dashboard.
**Design Aesthetic:** **"Vintage Financial Newspaper" / "Victorian Futurism"**.
**Brand Identity:** *Polymarket Times* is a 19th-century-style broadsheet covering 21st-century crypto markets.
- **Background:** Cream/Off-white paper (`#f4f1ea`) with a subtle grain.
- **Typography:**
  - Headlines: `Playfair Display` (Elegant Serif)
  - Masthead/Accents: `UnifrakturMaguntia` (Blackletter)
  - Body/Data: `EB Garamond` (Classic Serif) or `Courier Prime` (Typewriter Mono for numbers).
- **Colors:** Ink Black (`#1a1a1a`) mainly. Use **Muted Red** (Brick) and **Muted Green** (Forest) for data, but keep it mostly monochrome.
- **UI Elements:** Double borders, distinct dividing lines (`border-t-2 border-black`), "Ink stamp" effects.

## Requirements

Please build a single-file React component using Tailwind CSS and Lucide React icons.

### 1. The "Weather Forecast" (Volatility Timeline)
- **Concept:** A "Farmer's Almanac" style forecast strip.
- **Visuals:** A horizontal day-planner strip.
  - "Now", "+4h", "+12h" labeled in typewriter font.
  - **Icons:** Use weather icons (Sun, Clouds, Storm) to represent volatility instead of abstract glowing bars.
  - **Storm Warning:** If volatility is high, use a "Woodcut" style storm icon or bold warning text like **"HEAVY GALES EXPECTED"**.

### 2. The "Battlefield Map" (Liquidation Zones)
- **Concept:** A military-style map of Price Support/Resistance levels.
- **Visuals:**
  - A vertical "Depth Ruler", drawn like a vintage thermometer or barometer.
  - **Support Lines:** Heavy black lines.
  - **Danger Zones:** Hatched texture (diagonal lines) instead of solid fills.
  - **Labels:** Serif fonts, e.g., *"The $93k Resistance Wall"*.

### 3. "The Wire" (AI Signals)
- **Concept:** A telegraph-style ticker.
- **Content:** "STOP. ATLAS MODEL PREDICTS BULL RUN. STOP."
- **Visuals:** Monospace font, perhaps inside a bordered box looking like a telegram.

## Sample Data to Use
```javascript
const oracleData = {
  // Weather Forecast
  timeline: [
    { time: "Now", condition: "Calm", icon: "sun", label: "Fair Skies" },
    { time: "+4h", condition: "Storm", icon: "cloud-lightning", label: "Gale Warning" },
    { time: "+12h", condition: "Cloudy", icon: "cloud", label: "Overcast" },
  ],
  // Battlefield
  levels: [
    { price: 93445, type: "Resistance", strength: "High", label: "The Iron Ceiling" },
    { price: 90724, type: "Current", strength: "Neutral", label: "Market Price" },
    { price: 85280, type: "Support", strength: "Extreme", label: "The Floor" },
  ]
};
```

## CSS Classes to Prefer
- `border-2 border-black`
- `font-serif` (for standard text)
- `font-mono` (for numbers/tickers)
- `bg-[#f4f1ea]` (Paper)
- `text-[#1a1a1a]` (Ink)
