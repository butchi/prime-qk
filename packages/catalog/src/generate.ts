import type { CatalogEntry } from './types'
import { catalogScope } from './scope'

function isPrime(value: number, divisors: readonly number[]): boolean {
  if (value < 2) return false
  for (const divisor of divisors) {
    if (divisor * divisor > value) break
    if (value % divisor === 0) return false
  }
  return true
}

export function generateCatalog(): CatalogEntry[] {
  const limit = Math.floor(Math.sqrt(Number('13'.repeat(catalogScope.maxCards))))
  const composite = new Uint8Array(limit + 1)
  const divisors: number[] = []
  for (let value = 2; value <= limit; value++) {
    if (composite[value]) continue
    divisors.push(value)
    for (let multiple = value * value; multiple <= limit; multiple += value) composite[multiple] = 1
  }
  const representations = new Map<number, number[][]>()

  function visit(ranks: number[], target: number, available: readonly number[]) {
    if (ranks.length === target) {
      const value = Number(ranks.join(''))
      if (isPrime(value, divisors)) {
        const existing = representations.get(value) ?? []
        existing.push([...ranks])
        representations.set(value, existing)
      }
      return
    }
    for (const rank of available) {
      if (ranks.filter(item => item === rank).length === 4) continue
      visit([...ranks, rank], target, available)
    }
  }

  const allRanks = Array.from({ length: 13 }, (_, index) => index + 1)
  for (let count = 1; count <= catalogScope.maxCards; count++) {
    visit([], count, count <= catalogScope.completeThroughCards ? allRanks : catalogScope.extendedRanks)
  }

  return [...representations.entries()]
    .sort(([a], [b]) => a - b)
    .map(([value, ranks]) => ({
      value: String(value),
      classification: 'prime',
      verification: { method: 'trial-division', certainty: 'deterministic' },
      representations: ranks.sort((a, b) => {
        for (let index = 0; index < Math.min(a.length, b.length); index++) {
          const difference = a[index]! - b[index]!
          if (difference) return difference
        }
        return a.length - b.length
      }),
    }))
}
