/**
 * Array utility functions for common operations across the codebase.
 */

/**
 * Deduplicates an array of objects by a key getter function.
 * Returns items in their original order, keeping the first occurrence.
 *
 * @example
 * const unique = deduplicateBy(markets, m => m.id);
 */
export function deduplicateBy<T>(
    items: T[],
    getKey: (item: T) => string
): T[] {
    const seen = new Set<string>();
    return items.filter(item => {
        const key = getKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Deduplicates an array of objects by their `id` property.
 * Convenience wrapper around deduplicateBy.
 *
 * @example
 * const unique = deduplicateById(markets);
 */
export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
    return deduplicateBy(items, item => item.id);
}

/**
 * Groups an array of items by a key getter function.
 *
 * @example
 * const byCategory = groupBy(markets, m => m.category);
 */
export function groupBy<T>(
    items: T[],
    getKey: (item: T) => string
): Record<string, T[]> {
    return items.reduce((groups, item) => {
        const key = getKey(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {} as Record<string, T[]>);
}

/**
 * Takes the first N items from an array, respecting optional category caps.
 *
 * @example
 * const limited = takeWithCaps(markets, 10, { SPORTS: 2 }, m => m.category);
 */
export function takeWithCaps<T>(
    items: T[],
    limit: number,
    caps: Record<string, number>,
    getCat: (item: T) => string
): T[] {
    const counts: Record<string, number> = {};
    const result: T[] = [];

    for (const item of items) {
        if (result.length >= limit) break;

        const cat = getCat(item);
        const cap = caps[cat];

        if (cap !== undefined) {
            const current = counts[cat] || 0;
            if (current >= cap) continue; // Skip excess in capped category
            counts[cat] = current + 1;
        }

        result.push(item);
    }

    return result;
}
