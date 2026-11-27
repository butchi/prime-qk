import { generateDeck, shuffleDeck, type PlayingCard } from '../../lib/cards'
import { comparePokerHands, findBestHand, findPrimeGroups, type PokerHand } from './poker'

export interface PokerRound {
  playerHand: PlayingCard[]
  cpuHand: PlayingCard[]
  deck: PlayingCard[]
  phase: 'selecting' | 'revealed'
  playerKeptCodes: number[]
  cpuKeptCodes: number[]
  playerDrawCount: number
  cpuDrawCount: number
  playerRole: PokerHand | null
  cpuRole: PokerHand | null
  result: number | null
}

export function createPokerRound(random = Math.random): PokerRound {
  const cards = shuffleDeck(generateDeck(), random)
  return {
    playerHand: cards.slice(0, 5),
    cpuHand: cards.slice(5, 10),
    deck: cards.slice(10),
    phase: 'selecting',
    playerKeptCodes: [],
    cpuKeptCodes: [],
    playerDrawCount: 0,
    cpuDrawCount: 0,
    playerRole: null,
    cpuRole: null,
    result: null,
  }
}

export function exchangeAndShowdown(round: PokerRound, keptCodes: readonly number[]): PokerRound {
  if (round.phase === 'revealed') return round
  const playerKeeps = new Set(keptCodes)
  if (
    playerKeeps.size !== keptCodes.length ||
    keptCodes.some((code) => !round.playerHand.some((card) => card.code === code))
  ) {
    throw new RangeError('キープするカードは手札から重複せず選んでください。')
  }

  // CPUの選択は交換前の手札だけで決め、プレイヤーの交換結果は参照しない。
  const cpuKeeps = new Set(findPrimeGroups(round.cpuHand)[0]?.cards.map((card) => card.code) ?? [])
  const playerDrawCount = 5 - playerKeeps.size
  const cpuDrawCount = 5 - cpuKeeps.size
  if (round.deck.length < playerDrawCount + cpuDrawCount) {
    throw new RangeError('交換に必要なカードが山札にありません。')
  }

  let drawn = 0
  function exchange(hand: PlayingCard[], keeps: Set<number>): PlayingCard[] {
    // キープしたカードは元の位置に残し、捨て札は山札へ戻さない。
    return hand.map((card) => (keeps.has(card.code) ? card : round.deck[drawn++]))
  }

  const playerHand = exchange(round.playerHand, playerKeeps)
  const cpuHand = exchange(round.cpuHand, cpuKeeps)
  const playerRole = findBestHand(playerHand)
  const cpuRole = findBestHand(cpuHand)
  return {
    playerHand,
    cpuHand,
    deck: round.deck.slice(drawn),
    phase: 'revealed',
    playerKeptCodes: round.playerHand
      .filter((card) => playerKeeps.has(card.code))
      .map((card) => card.code),
    cpuKeptCodes: round.cpuHand.filter((card) => cpuKeeps.has(card.code)).map((card) => card.code),
    playerDrawCount,
    cpuDrawCount,
    playerRole,
    cpuRole,
    result: comparePokerHands(playerRole, cpuRole),
  }
}
