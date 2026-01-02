/**
 * Simple unit tests for core utilities
 * Run with: npx tsx app/lib/__tests__/array-utils.test.ts
 */

import assert from 'assert';
import {
    deduplicateBy,
    deduplicateById,
    groupBy,
    takeWithCaps,
} from '../array-utils';

console.log('Running array-utils tests...\n');

// Test deduplicateBy
console.log('Testing deduplicateBy...');
{
    const items = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '1', name: 'Alice Duplicate' },
        { id: '3', name: 'Charlie' },
    ];

    const unique = deduplicateBy(items, (i) => i.id);

    assert.strictEqual(unique.length, 3, 'Should have 3 unique items');
    assert.strictEqual(unique[0].name, 'Alice', 'First Alice should be kept');
    assert.strictEqual(unique[1].name, 'Bob');
    assert.strictEqual(unique[2].name, 'Charlie');
    console.log('  ✓ deduplicateBy removes duplicates, keeps first occurrence');
}

// Test deduplicateById
console.log('Testing deduplicateById...');
{
    const items = [
        { id: 'a', value: 1 },
        { id: 'b', value: 2 },
        { id: 'a', value: 3 },
    ];

    const unique = deduplicateById(items);

    assert.strictEqual(unique.length, 2);
    assert.strictEqual(unique[0].id, 'a');
    assert.strictEqual(unique[0].value, 1, 'First occurrence value should be 1');
    console.log('  ✓ deduplicateById works as shorthand');
}

// Test groupBy
console.log('Testing groupBy...');
{
    const items = [
        { category: 'TECH', name: 'Apple' },
        { category: 'POLITICS', name: 'Election' },
        { category: 'TECH', name: 'Google' },
        { category: 'SPORTS', name: 'NFL' },
    ];

    const groups = groupBy(items, (i) => i.category);

    assert.strictEqual(Object.keys(groups).length, 3, 'Should have 3 categories');
    assert.strictEqual(groups['TECH'].length, 2, 'TECH should have 2 items');
    assert.strictEqual(groups['POLITICS'].length, 1);
    assert.strictEqual(groups['SPORTS'].length, 1);
    console.log('  ✓ groupBy correctly groups items');
}

// Test takeWithCaps
console.log('Testing takeWithCaps...');
{
    const items = [
        { id: '1', cat: 'SPORTS' },
        { id: '2', cat: 'SPORTS' },
        { id: '3', cat: 'SPORTS' },
        { id: '4', cat: 'TECH' },
        { id: '5', cat: 'TECH' },
        { id: '6', cat: 'POLITICS' },
    ];

    const result = takeWithCaps(items, 10, { SPORTS: 2 }, (i) => i.cat);

    assert.strictEqual(result.length, 5, 'Should have 5 items (3rd SPORTS skipped)');
    const sportsCount = result.filter((i) => i.cat === 'SPORTS').length;
    assert.strictEqual(sportsCount, 2, 'Should only have 2 SPORTS items');
    console.log('  ✓ takeWithCaps respects category caps');
}

// Test empty array handling
console.log('Testing edge cases...');
{
    assert.deepStrictEqual(deduplicateById([]), [], 'Empty array returns empty');
    assert.deepStrictEqual(groupBy([], (x) => x), {}, 'Empty groupBy returns {}');
    assert.deepStrictEqual(
        takeWithCaps([], 10, {}, (x) => x),
        [],
        'Empty takeWithCaps returns []'
    );
    console.log('  ✓ Edge cases handled correctly');
}

console.log('\n✅ All array-utils tests passed!');
