import { formatCards } from '@prime-qk/catalog'
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

export function readCardQuantifier(pattern: string, index: number): { min: number; max: number; length: number } | undefined {
  const token = pattern[index]
  if (token === '?') return { min: 0, max: 1, length: 1 }
  if (token === '*') return { min: 0, max: 4, length: 1 }
  if (token === '+') return { min: 1, max: 4, length: 1 }
  if (token !== '{') return undefined

  const match = /^\{(\d+)(?:,(\d+))?\}/.exec(pattern.slice(index))
  if (!match) throw new Error('繰り返し回数は {n} または {n,m} で指定してください。{n,} は使用できません。')
  const min = Number(match[1])
  const max = match[2] === undefined ? min : Number(match[2])
  if (min > max || max > 52) throw new Error('繰り返し回数は0〜52で、最小回数を最大回数以下にしてください。')
  return { min, max, length: match[0].length }
}

export function compileCardPattern(pattern: string): RegExp | undefined {
  if (!pattern) return undefined

  let source = ''
  let lastWasQuantifier = false
  for (let index = 0; index < pattern.length; index++) {
    const token = pattern[index]!
    if (token === '[') {
      const end = pattern.indexOf(']', index + 1)
      if (end === -1) throw new Error('文字クラスの ] がありません。')
      const contents = pattern.slice(index + 1, end)
      if (!contents) throw new Error('文字クラスにはカード記号を指定してください。')
      let normalized = ''
      for (let offset = 0; offset < contents.length; offset++) {
        const character = contents[offset]!
        if (character === '-') {
          if (offset === 0 || offset === contents.length - 1 ||
              (offset >= 2 && contents[offset - 2] === '-') ||
              !/^[2-9]$/.test(contents[offset - 1]!) ||
              !/^[2-9]$/.test(contents[offset + 1]!) ||
              Number(contents[offset - 1]) >= Number(contents[offset + 1])) {
            throw new Error('文字クラスの範囲は [2-9] の形式だけ使用できます。')
          }
          normalized += `-${contents[offset + 1]}`
          offset++
          continue
        }
        if (!isCardSymbol(character)) {
          throw new Error('文字クラスには A・2〜9・T・J・Q・K を指定してください。')
        }
        normalized += normalizeCardSymbol(character)
      }
      source += `[${normalized}]`
      index = end
      lastWasQuantifier = false
      continue
    }

    if (token === ']' || token === '\\') {
      throw new Error('文字クラスの括弧またはエスケープ指定が不正です。')
    }
    if (isCardSymbol(token)) {
      source += normalizeCardSymbol(token)
      lastWasQuantifier = false
      continue
    }
    const quantifier = readCardQuantifier(pattern, index)
    if (quantifier) {
      if (lastWasQuantifier) throw new Error('量指定子を連続して指定できません。')
      source += `{${quantifier.min},${quantifier.max}}`
      index += quantifier.length - 1
      lastWasQuantifier = true
      continue
    }
    if (token === '^' && index !== 0) throw new Error('^ はパターンの先頭に指定してください。')
    if (token === '$' && index !== pattern.length - 1) throw new Error('$ はパターンの末尾に指定してください。')
    if (!'()|^$'.includes(token)) {
      throw new Error('使える記号は (), |, ^, $, ?, *, +, {n}, {n,m} と文字クラスです。')
    }
    source += token
    lastWasQuantifier = false
  }

  try {
    return new RegExp(source)
  } catch {
    throw new Error('正規表現の構文が不正です。括弧や量指定子を確認してください。')
  }
}

function isCardSymbol(token: string): boolean {
  return /^[1A2-9TJQK]$/.test(token)
}

function normalizeCardSymbol(token: string): string {
  return token === '1' ? 'A' : token
}

export function searchPermutations(
  ranks: readonly number[],
  progress: (state: PermutationSearch) => void = () => {},
  maxMilliseconds = 5000,
  pattern = '',
): PermutationSearch {
  parseCards(ranks.join('-'))
  const matcher = compileCardPattern(pattern)
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
      checked++
      if (matcher && !matcher.test(formatCards(path))) {
        progress(snapshot())
        return true
      }
      const value = path.join('')
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
