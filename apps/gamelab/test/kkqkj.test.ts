import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createCard,
  createJoker,
  generateDeck,
  type CardSuit,
  type PlayingCard,
} from '../src/lib/cards'
import {
  ROLE_PATTERNS,
  comparePokerHands,
  evaluateArrangement,
  findBestHand,
  findPrimeGroups,
  makeGroup,
  type PokerHand,
} from '../src/games/kkqkj/poker'

function handOf(ranks: number[]): PlayingCard[] {
  const suits: CardSuit[] = ['clubs', 'diamonds', 'hearts', 'spades']
  const counts = new Map<number, number>()
  return ranks.map((rank) => {
    const count = counts.get(rank) ?? 0
    assert.ok(count < 4)
    counts.set(rank, count + 1)
    return createCard(suits[count], rank)
  })
}

function arranged(ranks: number[][]): PokerHand {
  const hand = handOf(ranks.flat())
  let offset = 0
  const groups = ranks.map((group) => {
    const cards = hand.slice(offset, offset + group.length)
    offset += group.length
    return cards
  })
  const result = evaluateArrangement(hand, groups)
  assert.ok(result)
  return result
}

function permutations<T>(items: T[]): T[][] {
  if (items.length === 0) return [[]]
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((tail) => [item, ...tail]),
  )
}

// 組の集合を先に列挙する独立した探索で、並べ替え＋境界探索の結果を検証する。
function oracle(hand: PlayingCard[]): number[] | null {
  const strengths: Record<string, number> = {
    '5': 7,
    '4+1': 6,
    '3+2': 5,
    '3+1+1': 4,
    '2+2+1': 3,
    '2+1+1+1': 2,
    '1+1+1+1+1': 1,
  }
  const cache = new Map<number, boolean>()
  let best: number[] | null = null

  function prime(value: number): boolean {
    const cached = cache.get(value)
    if (cached !== undefined) return cached
    let result = value >= 2
    for (let divisor = 2; divisor * divisor <= value && result; divisor++) {
      if (value % divisor === 0) result = false
    }
    cache.set(value, result)
    return result
  }

  function visit(remaining: PlayingCard[], groups: { size: number; value: number }[]): void {
    if (remaining.length === 0) {
      const ordered = [...groups].sort((a, b) => b.size - a.size || b.value - a.value)
      const key = [
        strengths[ordered.map((group) => group.size).join('+')],
        ...ordered.map((group) => group.value),
      ]
      if (best === null) {
        best = key
      } else {
        for (let i = 0; i < key.length; i++) {
          if (key[i] === best[i]) continue
          if (key[i] > best[i]) best = key
          break
        }
      }
      return
    }
    for (let mask = 0; mask < 1 << (remaining.length - 1); mask++) {
      const group = [remaining[0]]
      const rest: PlayingCard[] = []
      for (let i = 1; i < remaining.length; i++) {
        if (mask & (1 << (i - 1))) group.push(remaining[i])
        else rest.push(remaining[i])
      }
      for (const ordered of permutations(group)) {
        const value = Number(ordered.map((card) => card.rank).join(''))
        if (prime(value)) visit(rest, [...groups, { size: group.length, value }])
      }
    }
  }

  visit(hand, [])
  return best
}

function resultKey(result: PokerHand | null): number[] | null {
  return result === null ? null : [result.strength, ...result.groups.map((group) => group.value)]
}

describe('KKQKJ 素数ポーカー', () => {
  it('7種類の役を指定された順番で比較する', () => {
    const hands = [
      arranged([[1, 2, 3, 4, 7]]),
      arranged([[1, 2, 3, 7], [11]]),
      arranged([
        [1, 1, 3],
        [1, 7],
      ]),
      arranged([[1, 1, 3], [7], [11]]),
      arranged([[1, 3], [1, 7], [11]]),
      arranged([[1, 3], [2], [7], [11]]),
      arranged([[2], [3], [5], [7], [11]]),
    ]
    assert.deepEqual(
      hands.map((hand) => hand.pattern),
      ROLE_PATTERNS.map((sizes) => sizes.join('+')),
    )
    assert.deepEqual(
      hands.map((hand) => hand.strength),
      [7, 6, 5, 4, 3, 2, 1],
    )
    for (let i = 0; i < hands.length - 1; i++) {
      assert.ok(comparePokerHands(hands[i], hands[i + 1]) > 0)
    }
  })

  it('桁数ではなくカード枚数で組を並べて比較する', () => {
    const left = arranged([
      [12, 13],
      [1, 1, 3],
    ])
    const right = arranged([
      [2, 3],
      [1, 3, 1],
    ])
    assert.deepEqual(
      left.groups.map((group) => group.value),
      [113, 1213],
    )
    assert.equal(left.pattern, '3+2')
    assert.ok(comparePokerHands(right, left) > 0)
  })

  it('同じ枚数の組は値の降順に比較し、次の組でも決着できる', () => {
    const left = arranged([[1, 3], [2], [7, 3]])
    const weaker = arranged([[1, 7], [3, 7], [2]])
    const stronger = arranged([[7, 3], [1, 7], [2]])
    assert.deepEqual(
      left.groups.map((group) => group.value),
      [73, 13, 2],
    )
    assert.ok(comparePokerHands(left, weaker) > 0)
    assert.ok(comparePokerHands(stronger, left) > 0)
  })

  it('同じ役と素数値ならランク構成やスートで差をつけない', () => {
    const left = arranged([[1, 13], [2], [5], [7]])
    const right = arranged([[11, 3], [2], [5], [7]])
    assert.equal(comparePokerHands(left, right), 0)
    assert.equal(comparePokerHands(left, left), 0)
  })

  it('手札の各物理カードをちょうど1回ずつ使う', () => {
    const hand = handOf([2, 3, 5, 7, 11])
    assert.ok(
      evaluateArrangement(
        hand,
        hand.map((card) => [card]),
      ),
    )
    assert.equal(
      evaluateArrangement(
        hand,
        hand.slice(1).map((card) => [card]),
      ),
      null,
    )
    assert.equal(
      evaluateArrangement(hand, [[hand[0], hand[0]], ...hand.slice(2).map((card) => [card])]),
      null,
    )
    assert.equal(
      evaluateArrangement(hand, [
        [createCard('hearts', 2)],
        ...hand.slice(1).map((card) => [card]),
      ]),
      null,
    )
    assert.equal(evaluateArrangement(hand, [[], ...hand.map((card) => [card])]), null)
    assert.equal(
      evaluateArrangement(hand, [
        [{ ...hand[0], rank: 13 }],
        ...hand.slice(1).map((card) => [card]),
      ]),
      null,
    )
  })

  it('同ランクの別カードは使用でき、同じカードの別IDは使用できない', () => {
    const hand = handOf([1, 1, 3, 2, 7])
    assert.ok(evaluateArrangement(hand, [hand.slice(0, 3), [hand[3]], [hand[4]]]))
    const duplicated = [hand[0], { ...hand[0], id: '別のID' }, ...hand.slice(2)]
    assert.equal(findBestHand(duplicated), null)
  })

  it('5枚以外、ジョーカー、不正なカードを受け付けない', () => {
    const hand = handOf([2, 3, 5, 7, 11])
    assert.equal(findBestHand([]), null)
    assert.equal(findBestHand(hand.slice(1)), null)
    assert.equal(findBestHand([...hand, createCard('spades', 13)]), null)
    assert.equal(findBestHand([createJoker('black'), ...hand.slice(1)]), null)
    assert.equal(findBestHand([{ ...hand[0], rank: 14 }, ...hand.slice(1)]), null)
    assert.equal(
      findBestHand([{ ...hand[0], code: 63, rank: 0, suit: undefined }, ...hand.slice(1)]),
      null,
    )
  })

  it('1・合成数・空の組を素数として扱わない', () => {
    assert.equal(makeGroup([]).isPrime, false)
    assert.equal(makeGroup(handOf([1])).isPrime, false)
    assert.equal(makeGroup(handOf([9])).isPrime, false)
    const hand = handOf([2, 3, 5, 7, 11])
    assert.equal(evaluateArrangement(hand, [hand.slice(0, 3), [hand[3]], [hand[4]]]), null)
  })

  it('どの組み分けも成立しない手札は役なしになる', () => {
    assert.equal(findBestHand(handOf([4, 6, 8, 10, 12])), null)
    assert.equal(comparePokerHands(null, null), 0)
    assert.ok(comparePokerHands(arranged([[2], [3], [5], [7], [11]]), null) > 0)
    assert.ok(comparePokerHands(null, arranged([[2], [3], [5], [7], [11]])) < 0)
  })

  it('KKQKJ の10桁の素数を正確に判定する', () => {
    const hand = handOf([13, 13, 12, 13, 11])
    const result = findBestHand(hand)
    assert.equal(result?.pattern, '5')
    assert.equal(result?.groups[0].value, 1_313_121_311)
    assert.ok(evaluateArrangement(hand, [hand]))
    assert.deepEqual(resultKey(findBestHand([...hand].reverse())), resultKey(result))
  })

  it('キープ候補として1〜5枚の素数をすべて探し、枚数と値の降順に並べる', () => {
    const hand = handOf([1, 2, 3, 4, 7])
    const groups = findPrimeGroups(hand)
    assert.deepEqual(new Set(groups.map((group) => group.cards.length)), new Set([1, 2, 3, 4, 5]))
    assert.ok(groups.some((group) => group.cards.length === 1 && group.value === 7))
    assert.ok(groups.some((group) => group.cards.length === 4 && group.value === 1237))
    assert.ok(groups.some((group) => group.cards.length === 5 && group.value === 12347))
    for (let i = 1; i < groups.length; i++) {
      const previous = groups[i - 1]
      const current = groups[i]
      assert.ok(
        previous.cards.length > current.cards.length ||
          (previous.cards.length === current.cards.length && previous.value >= current.value),
      )
    }
    for (const group of groups) {
      assert.equal(group.isPrime, true)
      assert.equal(makeGroup(group.cards).isPrime, true)
      assert.equal(new Set(group.cards.map((card) => card.code)).size, group.cards.length)
      assert.ok(group.cards.every((card) => hand.includes(card)))
    }
  })

  it('スート違いをまとめても、同じ値の異なるランク構成は残す', () => {
    const groups = findPrimeGroups(handOf([1, 13, 11, 3, 2]))
    const sameValue = groups.filter((group) => group.cards.length === 2 && group.value === 113)
    assert.equal(sameValue.length, 2)
    assert.deepEqual(
      new Set(
        sameValue.map((group) =>
          group.cards
            .map((card) => card.rank)
            .sort((a, b) => a - b)
            .join(','),
        ),
      ),
      new Set(['1,13', '3,11']),
    )
    const repeated = findPrimeGroups(handOf([1, 1, 1, 3, 7]))
    assert.equal(
      repeated.filter((group) => group.cards.length === 2 && group.value === 13).length,
      1,
    )
    assert.equal(
      repeated.filter((group) => group.cards.length === 3 && group.value === 113).length,
      1,
    )
  })

  it('候補の重複排除と物理カードの選択は手札の表示順に依存しない', () => {
    const hand = handOf([1, 1, 3, 7, 11])
    const groups = findPrimeGroups(hand)
    assert.deepEqual(findPrimeGroups([...hand].reverse()), groups)
    const keys = groups.map(
      (group) =>
        `${group.cards
          .map((card) => card.rank)
          .sort((a, b) => a - b)
          .join(',')}:${group.value}`,
    )
    assert.equal(new Set(keys).size, groups.length)

    const expected = new Set<string>()
    for (const permutation of permutations(hand)) {
      for (let count = 1; count <= 5; count++) {
        const cards = permutation.slice(0, count)
        const value = Number(cards.map((card) => card.rank).join(''))
        let prime = value >= 2
        for (let divisor = 2; divisor * divisor <= value && prime; divisor++) {
          if (value % divisor === 0) prime = false
        }
        if (prime) {
          expected.add(
            `${cards
              .map((card) => card.rank)
              .sort((a, b) => a - b)
              .join(',')}:${value}`,
          )
        }
      }
    }
    assert.deepEqual(new Set(keys), expected)
  })

  it('キープ候補がない手札と不正な手札は空の一覧を返す', () => {
    const hand = handOf([2, 3, 5, 7, 11])
    assert.deepEqual(findPrimeGroups(handOf([4, 6, 8, 10, 12])), [])
    assert.deepEqual(findPrimeGroups([]), [])
    assert.deepEqual(findPrimeGroups(hand.slice(1)), [])
    assert.deepEqual(findPrimeGroups([...hand, createCard('spades', 13)]), [])
    assert.deepEqual(findPrimeGroups([createJoker('black'), ...hand.slice(1)]), [])
    assert.deepEqual(findPrimeGroups([hand[0], { ...hand[0], id: '別ID' }, ...hand.slice(2)]), [])
  })

  it('KKQKJ では5枚すべての素数が最初のキープ候補になる', () => {
    const groups = findPrimeGroups(handOf([13, 13, 12, 13, 11]))
    assert.equal(groups[0].cards.length, 5)
    assert.equal(groups[0].value, 1_313_121_311)
  })

  it('代表的な手札と固定乱数の手札で独立した全探索の結果と一致する', () => {
    const examples = [
      [1, 1, 1, 1, 2],
      [2, 2, 2, 2, 3],
      [4, 6, 8, 10, 12],
      [1, 1, 3, 12, 13],
      [10, 11, 12, 13, 13],
      [13, 13, 12, 13, 11],
    ].map(handOf)
    const deck = generateDeck()
    let seed = 20261127
    for (let sample = 0; sample < 24; sample++) {
      const available = [...deck]
      const hand: PlayingCard[] = []
      for (let i = 0; i < 5; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        hand.push(...available.splice(seed % available.length, 1))
      }
      examples.push(hand)
    }
    for (const hand of examples) {
      const before = hand.map((card) => card.code)
      const best = findBestHand(hand)
      assert.deepEqual(resultKey(best), oracle(hand), hand.map((card) => card.rank).join(','))
      assert.deepEqual(
        hand.map((card) => card.code),
        before,
      )
      if (best)
        assert.ok(
          evaluateArrangement(
            hand,
            best.groups.map((group) => group.cards),
          ),
        )
    }
  })
})
