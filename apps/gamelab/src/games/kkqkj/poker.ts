import {
  FRENCH_52_PROFILE_ID,
  cardsToNumber,
  createCardFromCode,
  type PlayingCard,
} from '../../lib/cards'
import { isPrime } from '../../lib/primes'

export const ROLE_PATTERNS = [
  [5],
  [4, 1],
  [3, 2],
  [3, 1, 1],
  [2, 2, 1],
  [2, 1, 1, 1],
  [1, 1, 1, 1, 1],
] as const

export interface PokerGroup {
  cards: PlayingCard[]
  value: number
  isPrime: boolean
}

export interface PokerHand {
  groups: PokerGroup[]
  pattern: string
  strength: number
}

function isStandardCard(card: PlayingCard): boolean {
  if (card.profile !== FRENCH_52_PROFILE_ID || card.kind !== 'normal') return false
  const canonical = createCardFromCode(card.code, FRENCH_52_PROFILE_ID)
  return (
    canonical !== null &&
    canonical.kind === 'normal' &&
    canonical.rank === card.rank &&
    canonical.suit === card.suit
  )
}

function hasUniqueCards(cards: readonly PlayingCard[]): boolean {
  return new Set(cards.map((card) => card.code)).size === cards.length
}

function isValidHand(hand: readonly PlayingCard[]): boolean {
  return hand.length === 5 && hand.every(isStandardCard) && hasUniqueCards(hand)
}

export function makeGroup(cards: readonly PlayingCard[]): PokerGroup {
  const copy = [...cards]
  const value = copy.length > 0 ? cardsToNumber(copy) : 0
  return {
    cards: copy,
    value,
    isPrime:
      copy.length > 0 &&
      copy.length <= 5 &&
      copy.every(isStandardCard) &&
      hasUniqueCards(copy) &&
      isPrime(value),
  }
}

function compareGroups(left: PokerGroup, right: PokerGroup): number {
  return right.cards.length - left.cards.length || right.value - left.value
}

function makeHand(groups: PokerGroup[]): PokerHand {
  const ordered = [...groups].sort(compareGroups)
  const pattern = ordered.map((group) => group.cards.length).join('+')
  const index = ROLE_PATTERNS.findIndex((sizes) => sizes.join('+') === pattern)
  return { groups: ordered, pattern, strength: ROLE_PATTERNS.length - index }
}

export function evaluateArrangement(
  hand: readonly PlayingCard[],
  groups: readonly (readonly PlayingCard[])[],
): PokerHand | null {
  if (!isValidHand(hand)) return null
  const arrangedCards = groups.flat()
  if (arrangedCards.length !== 5 || !hasUniqueCards(arrangedCards)) return null
  const handByCode = new Map(hand.map((card) => [card.code, card]))
  if (
    arrangedCards.some(
      (card) =>
        !isStandardCard(card) ||
        !handByCode.has(card.code) ||
        handByCode.get(card.code)?.id !== card.id,
    )
  ) {
    return null
  }
  const evaluated = groups.map(makeGroup)
  if (evaluated.some((group) => !group.isPrime)) return null
  return makeHand(evaluated)
}

export function comparePokerHands(left: PokerHand | null, right: PokerHand | null): number {
  if (left === null) return right === null ? 0 : -1
  if (right === null) return 1
  if (left.strength !== right.strength) return left.strength - right.strength
  const leftGroups = [...left.groups].sort(compareGroups)
  const rightGroups = [...right.groups].sort(compareGroups)
  for (let i = 0; i < leftGroups.length; i++) {
    const difference = leftGroups[i].value - rightGroups[i].value
    if (difference !== 0) return difference
  }
  return 0
}

export function findPrimeGroups(hand: readonly PlayingCard[]): PokerGroup[] {
  if (!isValidHand(hand)) return []
  const cards = [...hand].sort((left, right) => left.code - right.code)
  const groups = new Map<string, PokerGroup>()
  const primeCache = new Map<number, boolean>()

  function visit(prefix: PlayingCard[], remaining: PlayingCard[]): void {
    if (prefix.length > 0) {
      const value = cardsToNumber(prefix)
      let prime = primeCache.get(value)
      if (prime === undefined) {
        prime = isPrime(value)
        primeCache.set(value, prime)
      }
      if (prime) {
        // 同じランクの組と同じ値なら、スート違いの候補をまとめる。
        const ranks = prefix.map((card) => card.rank).sort((left, right) => left - right)
        const key = `${ranks.join(',')}:${value}`
        if (!groups.has(key)) {
          groups.set(key, { cards: prefix, value, isPrime: true })
        }
      }
    }
    for (let i = 0; i < remaining.length; i++) {
      visit([...prefix, remaining[i]], [...remaining.slice(0, i), ...remaining.slice(i + 1)])
    }
  }

  visit([], cards)
  return [...groups.values()].sort(compareGroups)
}

export function findBestHand(hand: readonly PlayingCard[]): PokerHand | null {
  if (!isValidHand(hand)) return null
  let best: PokerHand | null = null
  const primeCache = new Map<number, boolean>()
  const cards = [...hand].sort((left, right) => left.code - right.code)

  function evaluatePermutation(permutation: PlayingCard[]): void {
    // 4か所の境界の有無を全探索し、各カードを必ず1回ずつ使う。
    for (let cuts = 0; cuts < 16; cuts++) {
      const groups: PokerGroup[] = []
      let start = 0
      for (let end = 1; end <= 5; end++) {
        if (end < 5 && (cuts & (1 << (end - 1))) === 0) continue
        const groupCards = permutation.slice(start, end)
        const value = cardsToNumber(groupCards)
        let prime = primeCache.get(value)
        if (prime === undefined) {
          // 5枚の最大値は1,313,131,313で、試し割りで確定判定できる。
          prime = isPrime(value)
          primeCache.set(value, prime)
        }
        if (!prime) break
        groups.push({ cards: groupCards, value, isPrime: true })
        start = end
      }
      if (start !== 5) continue
      const candidate = makeHand(groups)
      if (comparePokerHands(candidate, best) > 0) best = candidate
    }
  }

  function permute(prefix: PlayingCard[], remaining: PlayingCard[]): void {
    if (remaining.length === 0) {
      evaluatePermutation(prefix)
      return
    }
    for (let i = 0; i < remaining.length; i++) {
      permute([...prefix, remaining[i]], [...remaining.slice(0, i), ...remaining.slice(i + 1)])
    }
  }

  permute([], cards)
  return best
}
