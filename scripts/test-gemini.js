const { GoogleGenerativeAI } = require("@google/generative-ai");

// Mock extractJSON from agents.ts
function extractJSON(content) {
    try {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            const jsonStr = codeBlockMatch[1].trim();
            return JSON.parse(jsonStr);
        }
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('JSON parse error:', error.message);
        throw error;
    }
}

async function main() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash", // Match production model family
            tools: [{ googleSearch: {} }],
        });

        // EXACT PROMPT STRUCTURE FROM AGENT
        const prompt = `You are a senior investigative journalist at "The Polymarket Times".
Write a news brief (60-100 words) for EACH item below.

DATA:
--- ITEM 0 ---
ID: "test-id"
HEADLINE: "TikTok Sale Rumors"
MARKET: "Will TikTok be sold in 2025?"
DATELINE: NEW YORK (Dec 2024)
ODDS: Yes 85% (LIKELY)
VOLUME: $234.6M

---

GUIDELINES:
1. **Context is King**: Use the search tool to find the LATEST news.
2. **ROLE**: Write like a seasoned reporter.
3. **TONE**: "Professional Future-Retro".
4. **STYLE**: Literary and dense.
5. **EDITORIAL NOTE**: Add a "note" key.

FORMAT:
   - Return a JSON object.
   - **IMPORTANT**: Return ONLY valid JSON. Do not return markdown blocks like \`\`\`json.

{
  "0": "Content for item 0...",
  "note": "A cynical observation."
}`;

        console.log("Sending prompt...");
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log("Raw Response:\n", text);

        const parsed = extractJSON(text);
        console.log("Parsed JSON:", parsed);

    } catch (e) {
        console.error("CRITICAL FAILURE:", e);
    }
}

main();
