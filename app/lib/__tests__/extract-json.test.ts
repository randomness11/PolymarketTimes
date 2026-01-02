/**
 * Unit tests for extractJSON utility
 * Run with: npx tsx app/lib/__tests__/extract-json.test.ts
 */

import assert from 'assert';
import { extractJSON } from '../../api/lib/agents';

console.log('Running extractJSON tests...\n');

// Test basic JSON parsing
console.log('Testing basic JSON parsing...');
{
    const result = extractJSON<{ foo: string }>('{"foo": "bar"}');
    assert.strictEqual(result.foo, 'bar');
    console.log('  ✓ Parses plain JSON');
}

// Test JSON in markdown code block
console.log('Testing markdown code block extraction...');
{
    const input = `Here is the JSON:
\`\`\`json
{"selectedIndices": [1, 2, 3], "reasoning": "test"}
\`\`\``;

    const result = extractJSON<{ selectedIndices: number[]; reasoning: string }>(input);
    assert.deepStrictEqual(result.selectedIndices, [1, 2, 3]);
    assert.strictEqual(result.reasoning, 'test');
    console.log('  ✓ Extracts JSON from markdown code blocks');
}

// Test JSON with trailing comma (common LLM mistake)
console.log('Testing trailing comma repair...');
{
    const input = '{"a": 1, "b": 2, }';
    const result = extractJSON<{ a: number; b: number }>(input);
    assert.strictEqual(result.a, 1);
    assert.strictEqual(result.b, 2);
    console.log('  ✓ Handles trailing commas');
}

// Test JSON mixed with prose
console.log('Testing JSON extraction from mixed content...');
{
    const input = `Sure! Here's your data: {"key": "value"} Hope that helps!`;

    const result = extractJSON<{ key: string }>(input);
    assert.strictEqual(result.key, 'value');
    console.log('  ✓ Extracts JSON from mixed prose');
}

// Test truncated JSON recovery for Curator
console.log('Testing truncated Curator JSON recovery...');
{
    const truncatedInput = `{"selectedIndices": [1, 5, 12, 18], "reasoning": "Selected based on vol`;

    const result = extractJSON<{ selectedIndices: number[] }>(truncatedInput);
    assert.ok(result.selectedIndices, 'Should recover selectedIndices');
    assert.ok(result.selectedIndices.length >= 4, 'Should have at least 4 indices');
    console.log('  ✓ Recovers selectedIndices from truncated Curator response');
}

// Test key-value pair recovery for Headline/Article agents
console.log('Testing key-value recovery...');
{
    const truncatedHeadlines = `{
  "0": "TRUMP WINS ELECTION",
  "1": "BITCOIN SURGES PAST $100K",
  "2": "AI BREAKTHROUGH IMMINEN`;

    const result = extractJSON<Record<string, string>>(truncatedHeadlines);
    assert.ok('0' in result, 'Should recover key 0');
    assert.ok('1' in result, 'Should recover key 1');
    console.log('  ✓ Recovers key-value pairs from truncated response');
}

// Test error on completely invalid input
console.log('Testing error handling...');
{
    try {
        extractJSON('This is just plain text with no JSON at all');
        assert.fail('Should have thrown an error');
    } catch (e) {
        assert.ok(e instanceof Error);
        console.log('  ✓ Throws error on invalid input');
    }
}

console.log('\n✅ All extractJSON tests passed!');
