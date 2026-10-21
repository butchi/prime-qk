import type { CatalogEntry } from './types'

function isPrime(value: number): boolean {
  if (value < 2) return false
  for (let divisor = 2; divisor * divisor <= value; divisor++) {
    if (value % divisor === 0) return false
  }
  return true
}

export function generateCatalog(): CatalogEntry[] {
  const representations = new Map<number, number[][]>()

  function visit(ranks: number[]) {
    if (ranks.length > 0) {
      const value = Number(ranks.join(''))
      if (isPrime(value)) {
        const existing = representations.get(value) ?? []
        existing.push([...ranks])
        representations.set(value, existing)
      }
    }
    if (ranks.length === 3) return

    for (let rank = 1; rank <= 13; rank++) {
      visit([...ranks, rank])
    }
  }

  // 最大3枚なので、各ランク4枚というデッキの上限を超えることはない。
  visit([])

  return [...representations.entries()]
    .sort(([a], [b]) => a - b)
    .map(([value, ranks]) => ({
      value: String(value),
      classification: 'prime',
      verification: { method: 'trial-division', certainty: 'deterministic' },
      representations: ranks,
    }))
}
