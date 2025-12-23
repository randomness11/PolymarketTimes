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
 * Creates an OpenAI client configured for Groq
 */
export function createGroqClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

/**
 * Default agent configuration
 */
/**
 * Groq Model Constants
 */
export const GROQ_MODELS = {
  // Llama 3.3 70B: High intelligence, good reasoning, suitable for complex tasks
  SMART: 'llama-3.3-70b-versatile',
  // Llama 3.1 8B: Fast, efficient, good for simple tasks
  FAST: 'llama-3.1-8b-instant',
  // Mixtral 8x7B: Good balance of creativity and intelligence
  CREATIVE: 'mixtral-8x7b-32768',
} as const;

/**
 * Default agent configuration
 */
export const DEFAULT_AGENT_CONFIG = {
  model: GROQ_MODELS.SMART,
  temperature: 0.75,
  maxTokens: 2000,
} as const;

/**
 * Extracts JSON from AI response (handles markdown code blocks)
 */
export function extractJSON<T>(content: string): T {
  try {
    // Try to find JSON in markdown code block first
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const jsonStr = codeBlockMatch[1].trim();
      return parseCleanedJSON<T>(jsonStr);
    }

    // Otherwise look for raw JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content.substring(0, 500));
      throw new Error('No JSON found in response');
    }

    return parseCleanedJSON<T>(jsonMatch[0]);
  } catch (error) {
    console.error('JSON parse error:', error);
    console.error('Content that failed to parse:', content.substring(0, 1000));
    throw error;
  }
}

/**
 * Parse JSON with aggressive cleaning for LLM output
 */
function parseCleanedJSON<T>(jsonStr: string): T {
  try {
    // First try: parse as-is
    return JSON.parse(jsonStr);
  } catch (e) {
    // Second try: clean up common issues
    let cleaned = jsonStr
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/\r/g, ''); // Remove carriage returns

    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      // Third try: Fix unescaped newlines in strings
      cleaned = cleaned.replace(/"([^"]*?)"/g, (match, p1) => {
        return '"' + p1.replace(/\n/g, '\\n').replace(/\t/g, '\\t') + '"';
      });

      try {
        return JSON.parse(cleaned);
      } catch (e3) {
        // Fourth try: Handle truncated JSON (missing closing quote/brace)
        // Count open braces and brackets
        const openBraces = (cleaned.match(/{/g) || []).length;
        const closeBraces = (cleaned.match(/}/g) || []).length;

        // If there's unclosed content, try to close it
        if (openBraces > closeBraces) {
          // Check if there's an unclosed string (odd number of quotes in last line)
          const lastLine = cleaned.split('\n').pop() || '';
          const quoteCount = (lastLine.match(/"/g) || []).length;

          if (quoteCount % 2 !== 0) {
            cleaned += '"'; // Close the string
          }

          // Add missing closing braces
          for (let i = 0; i < openBraces - closeBraces; i++) {
            cleaned += '}';
          }
        }

        return JSON.parse(cleaned);
      }
    }
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
