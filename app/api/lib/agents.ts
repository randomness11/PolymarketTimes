import OpenAI from 'openai';

/**
 * Base agent interface
 */
export interface Agent<TInput, TOutput> {
  call(input: TInput): Promise<TOutput>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
  baseURL?: string;
}

/**
 * Creates an OpenAI client configured for Google Gemini
 */
export function createAIClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });
}

/**
 * Gemini Model Constants
 */
export const GEMINI_MODELS = {
  // Gemini 3 Flash: Fast, intelligent, supports search grounding
  SMART: 'gemini-3-flash-preview',
  FAST: 'gemini-3-flash-preview',
} as const;

/**
 * Default agent configuration
 */
export const DEFAULT_AGENT_CONFIG = {
  model: GEMINI_MODELS.SMART,
  temperature: 0.75,
  maxTokens: 2000,
} as const;

/**
 * Extracts JSON from AI response (handles markdown code blocks and truncated responses)
 */
export function extractJSON<T>(content: string): T {
  try {
    // Try to find JSON in markdown code block first (handles truncated code blocks too)
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
    if (codeBlockMatch) {
      const jsonStr = codeBlockMatch[1].trim();
      return parseCleanedJSON<T>(jsonStr);
    }

    // Otherwise look for raw JSON object - find first { and try to parse from there
    const firstBrace = content.indexOf('{');
    if (firstBrace === -1) {
      console.error('No JSON found in response:', content.substring(0, 500));
      throw new Error('No JSON found in response');
    }

    // Extract from first brace to end
    let jsonStr = content.substring(firstBrace);

    return parseCleanedJSON<T>(jsonStr);
  } catch (error) {
    console.error('JSON parse error:', error);
    console.error('Content that failed to parse:', content.substring(0, 1000));
    throw error;
  }
}

/**
 * Parse JSON with aggressive cleaning and repair for LLM output
 */
function parseCleanedJSON<T>(jsonStr: string): T {
  // Step 1: Try parsing as-is
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Continue to repair
  }

  // Step 2: Clean common issues
  let cleaned = jsonStr
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .replace(/\r/g, '') // Remove carriage returns
    .replace(/\n/g, '\\n'); // Escape newlines in the whole string first

  try {
    return JSON.parse(cleaned);
  } catch (e2) {
    // Continue to repair
  }

  // Step 3: Aggressive truncation repair
  // Count braces to detect truncation
  const openBraces = (cleaned.match(/{/g) || []).length;
  const closeBraces = (cleaned.match(/}/g) || []).length;

  if (openBraces > closeBraces) {
    // JSON is truncated - try to repair it

    // First, try to find the last complete key-value pair
    // Pattern: ends with "..." or "...", 
    const lastCompleteMatch = cleaned.match(/([\s\S]*"[^"]*"\s*:\s*"[^"]*")\s*,?\s*"[^"]*"?\s*:?\s*"?[^"}]*$/);

    if (lastCompleteMatch) {
      cleaned = lastCompleteMatch[1];
    } else {
      // Just trim to last complete-ish point
      // Find last closing quote that looks complete
      const lastQuote = cleaned.lastIndexOf('"');
      if (lastQuote > 0) {
        // Check if this looks like end of a value
        const beforeQuote = cleaned.substring(0, lastQuote);
        const lastColon = beforeQuote.lastIndexOf(':');
        if (lastColon > 0) {
          // Keep up to and including this quote
          cleaned = cleaned.substring(0, lastQuote + 1);
        }
      }
    }

    // Add missing closing braces
    const newOpenBraces = (cleaned.match(/{/g) || []).length;
    const newCloseBraces = (cleaned.match(/}/g) || []).length;
    for (let i = 0; i < newOpenBraces - newCloseBraces; i++) {
      cleaned += '}';
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e3) {
    // Step 4: Nuclear option - extract what we can

    // For Curator agent: try to extract selectedIndices array (NEW OBJECT FORMAT)
    // Matches { "index": 1, "layout": "..." }
    const indicesRegex = /{\s*"index"\s*:\s*(\d+)/g;
    let indexMatch;
    const items = [];
    while ((indexMatch = indicesRegex.exec(jsonStr)) !== null) {
      items.push(parseInt(indexMatch[1]));
    }

    if (items.length > 0) {
      // We lost layout info in this nuclear recovery, but at least we have the stories
      console.log(`Recovered ${items.length} indices from truncated Curator JSON`);
      // We have to mock the object structure expected by new curator agent
      const recoveredIndices = items.map(i => ({ index: i, layout: 'BRIEF' }));
      return { selectedIndices: recoveredIndices, reasoning: 'Recovered from truncated response' } as T;
    }

    // For Headline/Article agents: extract key-value pairs 
    // FIXED REGEX: Handles escaped quotes in values: "key": "val \"ue\""
    const pairs: Record<string, string> = {};
    const pairRegex = /"(\d+|[^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let match;
    while ((match = pairRegex.exec(jsonStr)) !== null) {
      pairs[match[1]] = match[2].replace(/\\"/g, '"'); // Unescape quotes
    }

    if (Object.keys(pairs).length > 0) {
      console.log(`Recovered ${Object.keys(pairs).length} items from truncated JSON`);
      return pairs as T;
    }

    throw new Error('Could not parse JSON even after repair attempts');
  }
}

/**
 * Retries an async function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Validates that required fields exist in an object
 */
export function validateRequired<T extends Record<string, unknown>>(
  obj: T,
  requiredFields: (keyof T)[]
): void {
  const missing = requiredFields.filter(field => !obj[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}
