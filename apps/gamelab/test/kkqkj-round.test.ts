import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateDeck, type PlayingCard } from '../src/lib/cards'
import { comparePokerHands, findBestHand, findPrimeGroups } from '../src/games/kkqkj/poker'
import { createPokerRound, exchangeAndShowdown, type PokerRound } from '../src/games/kkqkj/round'

function roundWithHands(playerRanks: number[], cpuRanks: number[]): PokerRound {
  const deck = generateDeck()
  function take(ranks: number[]): PlayingCard[] {
    return ranks.map((rank) => {
      const index = deck.findIndex((card) => card.rank === rank)
      assert.notEqual(index, -1)
      return deck.splice(index, 1)[0]
    })
  }
  return {
    ...createPokerRound(() => 0.5),
    playerHand: take(playerRanks),
    cpuHand: take(cpuRanks),
    deck,
  }
}

function codes(cards: PlayingCard[]): number[] {
  return cards.map((card) => card.code)
}

describe('KKQKJ の1回交換と自動勝負', () => {
  it('52枚を重複なく配り、残り42枚を山札にする', () => {
    const round = createPokerRound(() => 0.5)
    const all = [...round.playerHand, ...round.cpuHand, ...round.deck]
    assert.equal(round.playerHand.length, 5)
    assert.equal(round.cpuHand.length, 5)
    assert.equal(round.deck.length, 42)
    assert.equal(new Set(codes(all)).size, 52)
    assert.ok(all.every((card) => card.kind === 'normal'))
    assert.equal(round.phase, 'selecting')
    assert.equal(round.result, null)
    assert.deepEqual(
      round,
      createPokerRound(() => 0.5),
    )
  })

  it('選んだカードだけを元の位置に残し、元の状態を変更しない', () => {
    const round = roundWithHands([2, 3, 5, 7, 11], [4, 6, 8, 10, 12])
    const before = structuredClone(round)
    const kept = [round.playerHand[3].code, round.playerHand[1].code]
    const result = exchangeAndShowdown(round, kept)
    assert.equal(result.phase, 'revealed')
    assert.deepEqual(codes(result.playerHand), [
      round.deck[0].code,
      round.playerHand[1].code,
      round.deck[1].code,
      round.playerHand[3].code,
      round.deck[2].code,
    ])
    assert.deepEqual(result.playerKeptCodes, [round.playerHand[1].code, round.playerHand[3].code])
    assert.equal(result.playerDrawCount, 3)
    assert.deepEqual(round, before)
    assert.deepEqual(kept, [round.playerHand[3].code, round.playerHand[1].code])
  })

  it('全部キープでき、プレイヤーのために山札を消費しない', () => {
    const round = roundWithHands([2, 3, 5, 7, 11], [4, 6, 8, 10, 12])
    const result = exchangeAndShowdown(round, codes(round.playerHand))
    assert.deepEqual(result.playerHand, round.playerHand)
    assert.equal(result.playerDrawCount, 0)
    assert.deepEqual(result.cpuHand, round.deck.slice(0, 5))
    assert.deepEqual(result.deck, round.deck.slice(5))
  })

  it('キープなしなら5枚を交換し、捨て札や相手の手札を引き直さない', () => {
    const round = roundWithHands([2, 3, 5, 7, 11], [4, 6, 8, 10, 12])
    const originalCodes = new Set(codes([...round.playerHand, ...round.cpuHand]))
    const result = exchangeAndShowdown(round, [])
    assert.equal(result.playerDrawCount, 5)
    assert.equal(result.cpuDrawCount, 5)
    assert.deepEqual(result.playerHand, round.deck.slice(0, 5))
    assert.deepEqual(result.cpuHand, round.deck.slice(5, 10))
    assert.deepEqual(result.deck, round.deck.slice(10))
    assert.ok(
      [...result.playerHand, ...result.cpuHand].every((card) => !originalCodes.has(card.code)),
    )
    const remaining = [...result.playerHand, ...result.cpuHand, ...result.deck]
    assert.equal(new Set(codes(remaining)).size, remaining.length)
  })

  it('CPUは交換前の最強の素数の組をキープする', () => {
    const round = roundWithHands([2, 3, 5, 7, 11], [3, 4, 3, 3, 11])
    const group = findPrimeGroups(round.cpuHand)[0]
    assert.equal(group.cards.length, 4)
    assert.equal(group.value, 33311)
    const result = exchangeAndShowdown(round, codes(round.playerHand))
    assert.equal(result.cpuDrawCount, 1)
    assert.deepEqual(new Set(result.cpuKeptCodes), new Set(codes(group.cards)))
    round.cpuHand.forEach((card, index) => {
      if (result.cpuKeptCodes.includes(card.code)) assert.equal(result.cpuHand[index], card)
      else assert.equal(result.cpuHand[index], round.deck[0])
    })
  })

  it('CPUの選択はプレイヤーがキープしたカードや交換結果で変わらない', () => {
    const round = roundWithHands([2, 3, 5, 7, 11], [3, 4, 3, 3, 11])
    const keepAll = exchangeAndShowdown(round, codes(round.playerHand))
    const keepNone = exchangeAndShowdown(round, [])
    assert.deepEqual(keepAll.cpuKeptCodes, keepNone.cpuKeptCodes)
    assert.equal(keepAll.cpuDrawCount, keepNone.cpuDrawCount)
    assert.notDeepEqual(keepAll.cpuHand, keepNone.cpuHand)
  })

  it('CPUが5枚の素数を作れるなら全カードをキープする', () => {
    const round = roundWithHands([2, 3, 5, 7, 11], [13, 13, 12, 13, 11])
    const result = exchangeAndShowdown(round, [])
    assert.equal(result.cpuDrawCount, 0)
    assert.deepEqual(result.cpuHand, round.cpuHand)
    assert.equal(result.cpuRole?.pattern, '5')
    assert.equal(result.cpuRole?.groups[0].value, 1_313_121_311)
  })

  it('交換後は両方の最強役を自動で作り、比較して勝敗を決める', () => {
    const round = roundWithHands([2, 3, 5, 7, 11], [3, 4, 3, 3, 11])
    const result = exchangeAndShowdown(round, [round.playerHand[0].code])
    assert.deepEqual(result.playerRole, findBestHand(result.playerHand))
    assert.deepEqual(result.cpuRole, findBestHand(result.cpuHand))
    assert.equal(result.result, comparePokerHands(result.playerRole, result.cpuRole))
  })

  it('同じランクでもキープした物理カードだけを残す', () => {
    const round = roundWithHands([3, 3, 5, 7, 11], [4, 6, 8, 10, 12])
    const result = exchangeAndShowdown(round, [round.playerHand[1].code])
    assert.equal(result.playerHand[1], round.playerHand[1])
    assert.equal(result.playerHand[0], round.deck[0])
    assert.equal(result.playerDrawCount, 4)
    assert.deepEqual(result.playerKeptCodes, [round.playerHand[1].code])
  })

  it('交換後も両者に役がなければ引き分けになる', () => {
    const round = roundWithHands([4, 6, 8, 10, 12], [4, 6, 8, 10, 12])
    round.deck.sort((left, right) => (left.rank % 2) - (right.rank % 2))
    const result = exchangeAndShowdown(round, codes(round.playerHand))
    assert.equal(result.playerRole, null)
    assert.equal(result.cpuRole, null)
    assert.equal(result.result, 0)
  })

  it('公開済みの勝負では再交換しない', () => {
    const round = createPokerRound(() => 0.5)
    const result = exchangeAndShowdown(round, [])
    assert.equal(exchangeAndShowdown(result, []), result)
    assert.equal(exchangeAndShowdown(result, [999]), result)
  })

  it('キープの重複や手札以外のカードを受け付けない', () => {
    const round = createPokerRound(() => 0.5)
    assert.throws(
      () => exchangeAndShowdown(round, [round.playerHand[0].code, round.playerHand[0].code]),
      RangeError,
    )
    assert.throws(() => exchangeAndShowdown(round, [round.cpuHand[0].code]), RangeError)
    assert.throws(() => exchangeAndShowdown(round, [NaN]), RangeError)
    assert.throws(() => exchangeAndShowdown(round, [-1]), RangeError)
    assert.equal(round.phase, 'selecting')
  })

  it('山札が不足した場合は交換前の状態を保ってエラーにする', () => {
    const round = { ...createPokerRound(() => 0.5), deck: [] }
    assert.throws(() => exchangeAndShowdown(round, []), RangeError)
    assert.equal(round.phase, 'selecting')
    assert.deepEqual(round.deck, [])
  })
})
