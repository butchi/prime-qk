import { parseCards } from './card-input'
import { checkPrimality } from './primality'
import type { PrimalityResult } from './primality'

export interface PermutationMatch {
  value: string
  representations: number[][]
  result: Extract<PrimalityResult, { kind: 'prime' | 'probable-prime' }>
}

export interface PermutationSearch {
  matches: PermutationMatch[]
  checked: number
  reason: 'complete' | 'timeout' | 'limit'
}

export function searchPermutations(
  ranks: readonly number[],
  progress: (state: PermutationSearch) => void = () => {},
  maxMilliseconds = 5000,
): PermutationSearch {
  parseCards(ranks.join('-'))
  const started = performance.now()
  const counts = Array<number>(14).fill(0)
  for (const rank of ranks) counts[rank]!++
  const path: number[] = []
  const found = new Map<string, PermutationMatch>()
  let checked = 0
  let reason: PermutationSearch['reason'] = 'complete'
  const snapshot = (): PermutationSearch => ({
    matches: [...found.values()].sort((a, b) => BigInt(a.value) > BigInt(b.value) ? -1 : 1).slice(0, 100),
    checked,
    reason,
  })
  function visit(): boolean {
    if (performance.now() - started >= maxMilliseconds) {
      reason = 'timeout'
      return false
    }
    if (path.length === ranks.length) {
      const value = path.join('')
      checked++
      const existing = found.get(value)
      if (existing) existing.representations.push([...path])
      else {
        const result = checkPrimality(BigInt(value))
        if (result.kind !== 'prime' && result.kind !== 'probable-prime') return true
        found.set(value, { value, representations: [[...path]], result })
      }
      if (found.size > 100) reason = 'limit'
      progress(snapshot())
      return reason === 'complete'
    }
    for (let rank = 13; rank >= 1; rank--) {
      if (!counts[rank]) continue
      counts[rank]!--
      path.push(rank)
      const keepGoing = visit()
      path.pop()
      counts[rank]!++
      if (!keepGoing) return false
    }
    return true
  }
  visit()
  return snapshot()
}
