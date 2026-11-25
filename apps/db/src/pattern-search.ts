import { parseCards } from './card-input'
import { compileCardPattern, readCardQuantifier } from './permutations'
import type { PermutationMatch, PermutationSearch } from './permutations'
import { checkPrimality } from './primality'

type PatternNode =
  | { kind: 'card'; ranks: string[] }
  | { kind: 'sequence'; nodes: PatternNode[] }
  | { kind: 'choice'; nodes: PatternNode[] }
  | { kind: 'repeat'; node: PatternNode; min: number; max: number }

function parsePattern(pattern: string): PatternNode {
  if (pattern.length > 200) throw new Error('正規表現は200文字以内にしてください。')
  if (!compileCardPattern(pattern)) throw new Error('正規表現を入力してください。')
  const text = pattern.replace(/^\^/, '').replace(/\$$/, '')
  let index = 0

  function choice(): PatternNode {
    const nodes = [sequence()]
    while (text[index] === '|') {
      index++
      nodes.push(sequence())
    }
    return { kind: 'choice', nodes }
  }

  function sequence(): PatternNode {
    const nodes: PatternNode[] = []
    while (index < text.length && text[index] !== ')' && text[index] !== '|') {
      let node: PatternNode
      const token = text[index++]!
      if (token === '(') {
        node = choice()
        index++
      } else if (token === '[') {
        const ranks: string[] = []
        while (text[index] !== ']') {
          const first = text[index++]!
          if (text[index] === '-') {
            index++
            const last = text[index++]!
            for (let rank = Number(first); rank <= Number(last); rank++) ranks.push(String(rank))
          } else {
            ranks.push(first === '1' ? 'A' : first)
          }
        }
        index++
        node = { kind: 'card', ranks: [...new Set(ranks)] }
      } else {
        node = { kind: 'card', ranks: [token === '1' ? 'A' : token] }
      }
      const quantifier = readCardQuantifier(text, index)
      if (quantifier) {
        index += quantifier.length
        node = {
          kind: 'repeat',
          node,
          min: quantifier.min,
          max: quantifier.max,
        }
      }
      nodes.push(node)
    }
    return { kind: 'sequence', nodes }
  }

  return choice()
}

export function searchCardPattern(
  pattern: string,
  progress: (state: PermutationSearch) => void = () => {},
  maxMilliseconds = 5000,
): PermutationSearch {
  const root = parsePattern(pattern)
  const started = performance.now()
  const found = new Map<string, PermutationMatch>()
  const seen = new Set<string>()
  let checked = 0
  let reason: PermutationSearch['reason'] = 'complete'
  const snapshot = (): PermutationSearch => ({
    matches: [...found.values()].sort((a, b) => BigInt(a.value) > BigInt(b.value) ? -1 : 1).slice(0, 100),
    checked,
    reason,
  })

  function* expand(node: PatternNode, prefix: string): Generator<string> {
    if (reason !== 'complete') return
    if (performance.now() - started >= maxMilliseconds) {
      reason = 'timeout'
      return
    }
    if (node.kind === 'card') {
      if (prefix.length >= 52) return
      for (const rank of node.ranks) {
        if ([...prefix].filter(card => card === rank).length < 4) yield prefix + rank
      }
    } else if (node.kind === 'choice') {
      for (const child of node.nodes) yield* expand(child, prefix)
    } else if (node.kind === 'sequence') {
      yield* expandSequence(node.nodes, 0, prefix)
    } else {
      yield* expandRepeat(node.node, node.min, node.max, 0, prefix)
    }
  }

  function* expandSequence(nodes: PatternNode[], index: number, prefix: string): Generator<string> {
    if (index === nodes.length) {
      yield prefix
      return
    }
    for (const next of expand(nodes[index]!, prefix)) yield* expandSequence(nodes, index + 1, next)
  }

  function* expandRepeat(node: PatternNode, min: number, max: number, count: number, prefix: string): Generator<string> {
    if (count >= min) yield prefix
    if (count < max) {
      for (const next of expand(node, prefix)) yield* expandRepeat(node, min, max, count + 1, next)
    }
  }

  for (const cards of expand(root, '')) {
    if (!cards || seen.has(cards)) continue
    seen.add(cards)
    const ranks = [...cards].map(card => parseCards(card)[0]!)
    const value = ranks.join('')
    checked++
    const existing = found.get(value)
    if (existing) {
      existing.representations.push(ranks)
    } else {
      const result = checkPrimality(BigInt(value))
      if (result.kind !== 'prime' && result.kind !== 'probable-prime') continue
      found.set(value, { value, representations: [ranks], result })
    }
    if (found.size > 100) reason = 'limit'
    progress(snapshot())
    if (reason !== 'complete') break
  }
  return snapshot()
}
