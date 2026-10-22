import type { CatalogEntry, CatalogQuery } from './types'

function parseInteger(value: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error('数は半角数字の0以上の整数で入力してください。')
  }
  return BigInt(value)
}

export function searchCatalog(
  entries: readonly CatalogEntry[],
  query: CatalogQuery = {},
): CatalogEntry[] {
  const exact = query.exactValue === undefined ? undefined : parseInteger(query.exactValue)
  const min = query.minValue === undefined ? undefined : parseInteger(query.minValue)
  const max = query.maxValue === undefined ? undefined : parseInteger(query.maxValue)
  if (min !== undefined && max !== undefined && min > max) {
    throw new Error('最小値は最大値以下にしてください。')
  }
  if (query.cardCount !== undefined &&
      (!Number.isInteger(query.cardCount) || query.cardCount < 1 || query.cardCount > 3)) {
    throw new Error('カード枚数は1〜3枚で指定してください。')
  }
  if (query.digitCount !== undefined &&
      (!Number.isInteger(query.digitCount) || query.digitCount < 1 || query.digitCount > 6)) {
    throw new Error('桁数は1〜6桁で指定してください。')
  }
  if (query.sort !== undefined && query.sort !== 'asc' && query.sort !== 'desc') {
    throw new Error('並び順は昇順または降順で指定してください。')
  }

  const results: CatalogEntry[] = []
  for (const entry of entries) {
    const value = BigInt(entry.value)
    if (exact !== undefined && value !== exact) continue
    if (min !== undefined && value < min) continue
    if (max !== undefined && value > max) continue
    if (query.digitCount !== undefined && entry.value.length !== query.digitCount) continue
    const representations = entry.representations.filter(
      ranks => query.cardCount === undefined || ranks.length === query.cardCount,
    )
    if (representations.length > 0) results.push({ ...entry, representations })
  }

  return results.sort((a, b) => {
    const left = BigInt(a.value)
    const right = BigInt(b.value)
    const comparison = left < right ? -1 : left > right ? 1 : 0
    return query.sort === 'desc' ? -comparison : comparison
  })
}

export function formatCards(ranks: readonly number[]): string {
  const labels: Record<number, string> = { 1: 'A', 10: 'T', 11: 'J', 12: 'Q', 13: 'K' }
  return ranks.map(rank => labels[rank] ?? String(rank)).join('')
}
