export type KukuSuit = '♠' | '♥' | '♦' | '♣' | '★'
export type KukuRank =
  | 'Joker'
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'T'
  | 'J'
  | 'Q'
  | 'K'
export type KukuCard = { id: string; rank: KukuRank; suit: KukuSuit }
export type NumberBlock = { cards: KukuCard[]; value: number }
export type KukuPlay = {
  main: NumberBlock
  support: NumberBlock | null
  cards: KukuCard[]
  value: number
}
export type KukuPlayer = {
  id: string
  name: string
  hand: KukuCard[]
  passed: boolean
  isCpu?: boolean
}
export type KukuGame = {
  players: KukuPlayer[]
  deck: KukuCard[]
  market: KukuCard[]
  field: KukuPlay | null
  chainType: 0 | 1 | null
  currentPlayer: number
  lastPlayer: number | null
  passCount: number
  winner: string | null
  log: string[]
}

const suits: KukuSuit[] = ['♠', '♥', '♦', '♣']
const ranks: KukuRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K']

export const allKukuCards = (): KukuCard[] => [
  ...suits.flatMap((suit) => ranks.map((rank) => ({ id: `${suit}-${rank}`, rank, suit }))),
  { id: 'joker-1', rank: 'Joker', suit: '★' },
  { id: 'joker-2', rank: 'Joker', suit: '★' },
]
export const rankValue = (card: KukuCard): number =>
  card.rank === 'Joker'
    ? 0
    : card.rank === 'A'
      ? 1
      : card.rank === 'T'
        ? 10
        : card.rank === 'J'
          ? 11
          : card.rank === 'Q'
            ? 12
            : card.rank === 'K'
              ? 13
              : Number(card.rank)
export const cardLabel = (card: KukuCard): string =>
  card.rank === 'Joker' ? '🃏' : `${card.rank}${card.suit}`
export const blockLabel = (block: NumberBlock): string =>
  block.cards.map((card) => (card.rank === 'Joker' ? '0' : card.rank)).join('')
export const sameCards = (left: KukuCard[], right: KukuCard[]): boolean =>
  left.length === right.length && left.every((card) => right.some((item) => item.id === card.id))
export const sortKukuHand = (cards: KukuCard[]): KukuCard[] => {
  const suitOrder: KukuSuit[] = ['★', '♠', '♥', '♦', '♣']
  return [...cards].sort(
    (left, right) =>
      rankValue(left) - rankValue(right) ||
      suitOrder.indexOf(left.suit) - suitOrder.indexOf(right.suit),
  )
}
export const calculationLabel = (play: KukuPlay): string => {
  if (!play.support) return String(play.value)
  const factors =
    play.support.cards.length === 1
      ? `1×${play.support.value}`
      : play.support.cards
          .map(rankValue)
          .sort((left, right) => left - right)
          .join('×')
  return `${play.value} = ${factors} (${blockLabel(play.support)})`
}

/** Main numbers are one card, or an ordered pair of 0–9 cards. */
export function makeMainBlocks(hand: KukuCard[]): NumberBlock[] {
  const blocks: NumberBlock[] = hand.map((card) => ({ cards: [card], value: rankValue(card) }))
  const digits = hand.filter((card) => rankValue(card) <= 9)
  for (const tens of digits)
    for (const ones of digits) {
      if (tens.id !== ones.id)
        blocks.push({ cards: [tens, ones], value: rankValue(tens) * 10 + rankValue(ones) })
    }
  return blocks
}

/** A support is one ordinary multiplication pair, or J/Q/K as 1×1/1×2/1×3. */
export function makeSupportBlocks(hand: KukuCard[]): NumberBlock[] {
  const supports: NumberBlock[] = []
  for (const card of hand) {
    const value = card.rank === 'J' ? 1 : card.rank === 'Q' ? 2 : card.rank === 'K' ? 3 : null
    if (value !== null) supports.push({ cards: [card], value })
  }
  const digits = hand.filter((card) => rankValue(card) >= 1 && rankValue(card) <= 9)
  for (const left of digits)
    for (const right of digits) {
      if (left.id !== right.id)
        supports.push({ cards: [left, right], value: rankValue(left) * rankValue(right) })
    }
  return supports
}

export function validateKukuPlay(
  main: NumberBlock,
  support: NumberBlock | null,
  field: KukuPlay | null,
  chainType: 0 | 1 | null,
): KukuPlay | null {
  const cards = [...main.cards, ...(support?.cards ?? [])]
  if (new Set(cards.map((card) => card.id)).size !== cards.length) return null
  if (support && support.value !== main.value) return null
  const expectedChainType = field ? (Number(Boolean(field.support)) as 0 | 1) : chainType
  if (expectedChainType !== null && Number(Boolean(support)) !== expectedChainType) return null
  if (field && main.value >= field.value) return null
  return { main, support, cards, value: main.value }
}

export function findKukuPlays(
  hand: KukuCard[],
  field: KukuPlay | null,
  chainType: 0 | 1 | null,
): KukuPlay[] {
  const plays: KukuPlay[] = []
  const seen = new Set<string>()
  const add = (main: NumberBlock, support: NumberBlock | null) => {
    const play = validateKukuPlay(main, support, field, chainType)
    if (!play) return
    const key = `${main.cards.map((card) => card.id).join(',')}|${support?.cards.map((card) => card.id).join(',') ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      plays.push(play)
    }
  }
  const mains = makeMainBlocks(hand)
  const supports = makeSupportBlocks(hand)
  for (const main of mains) {
    add(main, null)
    supports
      .filter((support) => support.value === main.value)
      .forEach((support) => add(main, support))
  }
  return plays
}

/** Collapse suit-only variations while retaining distinct number expressions. */
export function uniqueKukuPlayExpressions(plays: KukuPlay[]): KukuPlay[] {
  const seen = new Set<string>()
  return plays.filter((play) => {
    const supportKey = !play.support
      ? ''
      : play.support.cards.length === 2
        ? play.support.cards
            .map(rankValue)
            .sort((left, right) => left - right)
            .join('×')
        : blockLabel(play.support)
    const key = `${play.main.cards.length}:${blockLabel(play.main)}|${supportKey}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function createKukuGame(playerNames = ['あなた', 'CPU 1', 'CPU 2']): KukuGame {
  const cards = allKukuCards().sort(() => Math.random() - 0.5)
  const players = playerNames.map((name, index) => ({
    id: `player-${index}`,
    name,
    hand: [] as KukuCard[],
    passed: false,
    isCpu: index > 0,
  }))
  players.forEach((player) => {
    player.hand = sortKukuHand(cards.splice(0, 11))
  })
  return {
    players,
    deck: cards,
    market: cards.splice(0, 5),
    field: null,
    chainType: null,
    currentPlayer: 0,
    lastPlayer: null,
    passCount: 0,
    winner: null,
    log: ['ゲーム開始。親はチェーンの有無を選びます。'],
  }
}

export function chooseKukuChainType(game: KukuGame): 0 | 1 {
  const hand = game.players[game.currentPlayer].hand
  const plain = findKukuPlays(hand, null, 0).length
  const chained = findKukuPlays(hand, null, 1).length
  return chained > plain ? 1 : 0
}

export function chooseKukuCpuPlay(game: KukuGame): KukuPlay | null {
  const player = game.players[game.currentPlayer]
  if (!player || (game.chainType === null && game.field === null)) return null
  const plays = findKukuPlays(player.hand, game.field, game.chainType)
  if (!plays.length) return null
  const winning = plays
    .filter((play) => sameCards(play.cards, player.hand))
    .sort((a, b) => b.cards.length - a.cards.length || a.value - b.value)[0]
  if (winning) return winning
  const isLate = player.hand.length <= 6 || game.deck.length <= 4
  const noSupport = plays.filter((play) => !play.support)
  if (!isLate)
    return noSupport.sort((a, b) => b.value - a.value || a.cards.length - b.cards.length)[0] ?? null
  return [...plays].sort(
    (a, b) =>
      Number(Boolean(b.support)) - Number(Boolean(a.support)) ||
      b.cards.length - a.cards.length ||
      a.value - b.value,
  )[0]
}

export function chooseKukuCpuMarketIndex(game: KukuGame): number | null {
  const player = game.players[game.currentPlayer]
  if (!player || !game.market.length) return null
  const score = (card: KukuCard) =>
    findKukuPlays([...player.hand, card], null, 1).filter((play) =>
      play.support?.cards.some((item) => item.id === card.id),
    ).length
  return game.market.reduce(
    (best, card, index) => (score(card) > score(game.market[best]) ? index : best),
    0,
  )
}

export function chooseKukuChainTypeForLead(
  game: KukuGame,
  type: 0 | 1,
): { ok: boolean; message: string } {
  if (game.field || game.chainType !== null || game.winner)
    return { ok: false, message: 'チェーン種別は選べません。' }
  game.chainType = type
  const label = type ? '1チェーン' : 'チェーンなし'
  game.log.unshift(`${game.players[game.currentPlayer].name}: ${label}を選択`)
  return { ok: true, message: `${label}を選びました。` }
}

export function playKukuTurn(game: KukuGame, cards: KukuCard[]): { ok: boolean; message: string } {
  if (game.winner) return { ok: false, message: 'ゲームは終了しています。' }
  const player = game.players[game.currentPlayer]
  if (player.passed || (game.field === null && game.chainType === null))
    return { ok: false, message: '先にチェーン種別を選んでください。' }
  const play = findKukuPlays(player.hand, game.field, game.chainType).find((candidate) =>
    sameCards(candidate.cards, cards),
  )
  if (!play) return { ok: false, message: '主数と補助札の組み合わせが不正です。' }
  player.hand = player.hand.filter((card) => !cards.some((item) => item.id === card.id))
  game.field = play
  game.chainType = null
  game.lastPlayer = game.currentPlayer
  player.passed = false
  game.passCount = game.players.filter((other) => other.passed).length
  game.log.unshift(
    `${player.name}: 主数 ${blockLabel(play.main)}${play.support ? ` ＋ 補助 ${blockLabel(play.support)}` : ''}`,
  )
  if (!player.hand.length) game.winner = player.id
  advanceKukuTurn(game)
  return { ok: true, message: '出札しました。' }
}

export function passKukuTurn(
  game: KukuGame,
  marketIndex: number | null,
): { ok: boolean; message: string } {
  if (game.winner) return { ok: false, message: 'ゲームは終了しています。' }
  const player = game.players[game.currentPlayer]
  if (player.passed) return { ok: false, message: 'このラウンドはパス済みです。' }
  if (
    game.market.length &&
    (marketIndex === null || marketIndex < 0 || marketIndex >= game.market.length)
  )
    return { ok: false, message: 'パスするには公開札を1枚選んでください。' }
  const drawn = marketIndex === null ? null : game.market.splice(marketIndex, 1)[0]
  if (drawn) player.hand = sortKukuHand([...player.hand, drawn])
  if (drawn && game.deck.length) game.market.splice(marketIndex!, 0, game.deck.pop()!)
  player.passed = true
  game.passCount = game.players.filter((other) => other.passed).length
  game.log.unshift(`${player.name}: パス${drawn ? `（${cardLabel(drawn)}を獲得）` : ''}`)
  const last = game.lastPlayer
  const allPassed = game.players.every((other) => other.passed)
  const responsesPassed =
    last !== null && game.players.every((other, index) => index === last || other.passed)
  if (allPassed || responsesPassed) {
    game.players.forEach((other) => {
      other.passed = false
    })
    game.passCount = 0
    game.field = null
    game.chainType = null
    game.currentPlayer = last ?? game.currentPlayer
    game.log.unshift('場が流れました。親はチェーンの有無を選びます。')
  } else advanceKukuTurn(game)
  return { ok: true, message: 'パスしました。' }
}

export function advanceKukuTurn(game: KukuGame): void {
  game.currentPlayer = (game.currentPlayer + 1) % game.players.length
  let guard = 0
  while (game.players[game.currentPlayer].passed && guard < game.players.length) {
    game.currentPlayer = (game.currentPlayer + 1) % game.players.length
    guard += 1
  }
}
