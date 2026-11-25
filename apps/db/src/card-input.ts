import { parseInput } from './primality'

export function isCardPattern(input: string): boolean {
  const text = input.trim()
  return !/^[+-]?\d+$/.test(text) && /[\[\]{}()|?*+^$]/.test(text)
}

export function parseCheckerInput(input: string, format?: 'integer' | 'cards') {
  const isCards = format === 'cards' ||
    (format === undefined && (/[a-z]/i.test(input) || /^\d+-/.test(input.trim())))
  const ranks = isCards ? parseCards(input) : []
  return { ranks, value: parseInput(isCards ? ranks.join('') : input) }
}

export function readCheckerUrl(params: URLSearchParams) {
  for (const key of params.keys()) {
    if (key !== 'q') throw new Error(`不明な判定条件です：${key}`)
    if (params.getAll(key).length !== 1) throw new Error(`判定条件が重複しています：${key}`)
  }
  return {
    input: params.get('q') ?? '',
    shouldCheck: params.has('q'),
  }
}

// 整数の十進文字列をカード列（1〜9・10〜13、各ランク4枚まで）に分割する候補を列挙する。
// 1枚だけの分割は整数判定と同じ値になるため除外する。
// limit件または探索上限を超える場合はtruncatedで示す。
export function enumerateCardSplits(value: string, limit = 10): { splits: number[][]; truncated: boolean } {
  const splits: number[][] = []
  if (!/^\d+$/.test(value)) return { splits, truncated: false }
  const counts = new Map<number, number>()
  const current: number[] = []
  let steps = 0
  let truncated = false
  function walk(position: number): void {
    if (truncated) return
    if (++steps > 100000) {
      truncated = true
      return
    }
    if (position === value.length) {
      if (current.length < 2) return
      if (splits.length === limit) truncated = true
      else splits.push([...current])
      return
    }
    for (const length of [2, 1]) {
      const token = value.slice(position, position + length)
      const rank = Number(token)
      if (token.length !== length || token.startsWith('0') || rank < 1 || rank > 13) continue
      const count = (counts.get(rank) ?? 0) + 1
      if (count > 4) continue
      counts.set(rank, count)
      current.push(rank)
      walk(position + length)
      current.pop()
      counts.set(rank, count - 1)
    }
  }
  walk(0)
  splits.sort((a, b) => a.length - b.length)
  return { splits, truncated }
}

export function parseCards(input: string): number[] {
  const text = input.trim().toUpperCase()
  const labels: Record<string, number> = { A: 1, T: 10, J: 11, Q: 12, K: 13 }
  let ranks: number[]
  if (/^\d+(?:-\d+)*$/.test(text)) {
    if (!text.includes('-') && !/^(?:[1-9]|1[0-3])$/.test(text)) {
      throw new Error('数字のカード列は 12-13 のようにハイフンで区切ってください。整数の判定は数字だけを入力してください。')
    }
    const tokens = text.split('-')
    if (tokens.some(token => !/^(?:[1-9]|1[0-3])$/.test(token))) {
      throw new Error('カードのランクは先頭ゼロなしの1〜13で指定してください。')
    }
    ranks = tokens.map(Number)
  } else if (/^[A2-9TJQK]+$/.test(text)) {
    ranks = [...text].map(token => labels[token] ?? Number(token))
  } else {
    throw new Error('カード列は QK・A23 または 12-13・1-2-3 の形式で入力してください。ジョーカー・スート・空白区切りは使用できません。')
  }
  if (ranks.length > 52) throw new Error('カードは最大52枚までです。')
  const counts = new Map<number, number>()
  for (const rank of ranks) {
    const count = (counts.get(rank) ?? 0) + 1
    if (count > 4) throw new Error(`ランク${rank}は4枚まで使用できます。`)
    counts.set(rank, count)
  }
  return ranks
}
