import { searchCatalog } from './search'
import type { CatalogEntry, CatalogQuery } from './types'

export const primeConstellations = [
  { id: 'twin', label: '双子素数', offsets: [[0, 2]] },
  { id: 'triplet', label: '三つ子素数', offsets: [[0, 2, 6], [0, 4, 6]] },
  { id: 'quadruplet', label: '四つ子素数', offsets: [[0, 2, 6, 8]] },
] as const

export type PrimeConstellationKind = typeof primeConstellations[number]['id']

export interface PrimeConstellationQuery extends CatalogQuery {
  readonly samePrefix?: boolean
}

export function isPrimeConstellationKind(value: string): value is PrimeConstellationKind {
  return primeConstellations.some(pattern => pattern.id === value)
}

export function searchPrimeConstellations(
  entries: readonly CatalogEntry[],
  kind: PrimeConstellationKind,
  query: PrimeConstellationQuery = {},
): CatalogEntry[][] {
  const pattern = primeConstellations.find(item => item.id === kind)
  if (!pattern) throw new Error('素数の組の種類が不正です。')
  const matches = searchCatalog(entries, { ...query, exactValue: undefined })
    .filter(entry => entry.classification === 'prime')
  // 完全一致の入力検証も通常検索と共通にし、組のいずれかの数との一致を調べる。
  const exactMatches = query.exactValue === undefined
    ? undefined
    : new Set(searchCatalog(entries, query).map(entry => entry.value))
  const byValue = new Map(matches.map(entry => [BigInt(entry.value), entry]))
  const groups: CatalogEntry[][] = []
  for (const entry of matches) {
    const start = BigInt(entry.value)
    for (const offsets of pattern.offsets) {
      const group: CatalogEntry[] = []
      for (const offset of offsets) {
        const member = byValue.get(start + BigInt(offset))
        if (!member) break
        group.push(member)
      }
      if (group.length !== offsets.length) continue
      if (query.samePrefix && !group.every(member => member.value.slice(0, -1) === entry.value.slice(0, -1))) continue
      if (exactMatches && !group.some(member => exactMatches.has(member.value))) continue
      groups.push(group)
    }
  }
  return groups
}
