export type KukuCard = string

export type KukuPlay = {
  cards: KukuCard[]
  value: number
  isCalculation: boolean
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
  currentPlayer: number
  lastPlayer: number | null
  passCount: number
  winner: string | null
  log: string[]
}

export const allKukuCards = (): KukuCard[] =>
  Array.from({ length: 100 }, (_, value) => value.toString().padStart(2, '0'))

export const cardValue = (card: KukuCard): number => Number(card)

export const digitProduct = (card: KukuCard): number | null => {
  const tens = Number(card[0])
  const ones = Number(card[1])
  return tens >= 1 && ones >= 1 ? tens * ones : null
}

export const formatCard = (value: number): KukuCard => value.toString().padStart(2, '0')

export function isCalculationChain(cards: KukuCard[]): boolean {
  if (cards.length < 2) return false
  for (let index = 1; index < cards.length; index += 1) {
    if (digitProduct(cards[index]) !== cardValue(cards[index - 1])) return false
  }
  return true
}

export function validateKukuPlay(cards: KukuCard[], field: KukuPlay | null): KukuPlay | null {
  if (cards.length === 0 || new Set(cards).size !== cards.length) return null
  const value = cardValue(cards[0])
  // A response must have the same chain length, and a smaller root card.
  if (field && (cards.length !== field.cards.length || value >= field.value)) return null
  const isCalculation = cards.length >= 2 && isCalculationChain(cards)
  if (cards.length > 1 && !isCalculation) return null
  return { cards: [...cards], value, isCalculation }
}

export function findKukuPlays(hand: KukuCard[], field: KukuPlay | null): KukuPlay[] {
  const plays: KukuPlay[] = []
  for (const card of hand) {
    const play = validateKukuPlay([card], field)
    if (play) plays.push(play)
  }
  // Each answer card can be followed by one or more available factor cards.
  const visit = (chain: KukuCard[]) => {
    for (const card of hand) {
      if (chain.includes(card) || digitProduct(card) !== cardValue(chain[chain.length - 1]))
        continue
      const next = [...chain, card]
      const play = validateKukuPlay(next, field)
      if (play) {
        plays.push(play)
        visit(next)
      }
    }
  }
  for (const card of hand) visit([card])
  return plays
}

/**
 * CPU policy: chains are valuable resources during the opening and middle game.
 * Prefer a single card that does not break any held chain; only cash in chains
 * to win, enter the endgame, or once the game is already in its late phase.
 */
export function chooseKukuCpuPlay(game: KukuGame): KukuPlay | null {
  const player = game.players[game.currentPlayer]
  if (!player) return null
  const plays = findKukuPlays(player.hand, game.field)
  if (plays.length === 0) return null

  const sortByStrength = (left: KukuPlay, right: KukuPlay) =>
    right.cards.length - left.cards.length || left.value - right.value
  const winningPlay = plays
    .filter((play) => play.cards.length === player.hand.length)
    .sort(sortByStrength)[0]
  if (winningPlay) return winningPlay

  const isLateGame = player.hand.length <= 6 || game.deck.length <= 12
  const chainCards = new Set(
    findKukuPlays(player.hand, null)
      .filter((play) => play.cards.length >= 2)
      .flatMap((play) => play.cards),
  )
  const singles = plays.filter((play) => play.cards.length === 1)
  const safeSingles = singles.filter((play) => !chainCards.has(play.cards[0]))

  // A chain that leaves five or fewer cards is worth converting into an endgame.
  const endgameChain = plays
    .filter((play) => play.cards.length >= 2 && player.hand.length - play.cards.length <= 5)
    .sort(sortByStrength)[0]
  if (endgameChain) return endgameChain

  if (!isLateGame) {
    // A high legal singleton is deliberately conservative: it keeps low roots
    // and every chain component available for later.
    return safeSingles.sort((left, right) => right.value - left.value)[0] ?? null
  }

  return [...plays].sort(sortByStrength)[0]
}

export function chooseKukuCpuMarketIndex(game: KukuGame): number | null {
  const player = game.players[game.currentPlayer]
  if (!player || game.market.length === 0) return null

  const scoreCard = (card: KukuCard) => {
    const plays = findKukuPlays([...player.hand, card], null)
    const longest = Math.max(0, ...plays.map((play) => play.cards.length))
    const chainCount = plays.filter(
      (play) => play.cards.length >= 2 && play.cards.includes(card),
    ).length
    // Prefer cards that create longer/more chain options; break ties with a low root.
    return longest * 100 + chainCount * 10 - cardValue(card) / 100
  }

  return game.market.reduce(
    (bestIndex, card, index) =>
      scoreCard(card) > scoreCard(game.market[bestIndex]) ? index : bestIndex,
    0,
  )
}

export function createKukuGame(playerNames = ['あなた', 'CPU 1', 'CPU 2']): KukuGame {
  const cards = allKukuCards()
  const players = playerNames.map((name, index) => ({
    id: `player-${index}`,
    name,
    hand: [] as KukuCard[],
    passed: false,
    isCpu: index > 0,
  }))
  // Deal 15 cards each, then reveal five cards as the public market.
  cards.sort(() => Math.random() - 0.5)
  players.forEach((player) => {
    player.hand = cards.splice(0, 15).sort((a, b) => Number(b) - Number(a))
  })
  return {
    players,
    deck: cards,
    market: cards.splice(0, 5),
    field: null,
    currentPlayer: 0,
    lastPlayer: null,
    passCount: 0,
    winner: null,
    log: ['ゲーム開始。15枚配りました。'],
  }
}

export function playKukuTurn(game: KukuGame, cards: KukuCard[]): { ok: boolean; message: string } {
  if (game.winner) return { ok: false, message: 'ゲームは終了しています。' }
  const player = game.players[game.currentPlayer]
  if (player.passed) return { ok: false, message: 'このラウンドはパス済みです。' }
  if (cards.some((card) => !player.hand.includes(card)))
    return { ok: false, message: '手札にないカードです。' }
  const play = validateKukuPlay(cards, game.field)
  if (!play) return { ok: false, message: 'その組み合わせは出せません。' }
  player.hand = player.hand.filter((card) => !cards.includes(card))
  game.field = play
  game.lastPlayer = game.currentPlayer
  player.passed = false
  game.passCount = game.players.filter((other) => other.passed).length
  game.log.unshift(`${player.name}: ${cards.join(' + ')}`)
  if (player.hand.length === 0) game.winner = player.id
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
    game.market.length > 0 &&
    (marketIndex === null || marketIndex < 0 || marketIndex >= game.market.length)
  ) {
    return { ok: false, message: 'パスするには公開札を1枚選んでください。' }
  }
  const drawnCard = marketIndex === null ? null : game.market.splice(marketIndex, 1)[0]
  if (drawnCard) player.hand.push(drawnCard)
  if (drawnCard && game.deck.length) game.market.splice(marketIndex!, 0, game.deck.pop()!)
  player.hand.sort((a, b) => Number(b) - Number(a))
  player.passed = true
  game.passCount = game.players.filter((other) => other.passed).length
  game.log.unshift(`${player.name}: パス${drawnCard ? `（公開札 ${drawnCard} を獲得）` : ''}`)
  const lastPlayer = game.lastPlayer
  const allRespondersPassed =
    lastPlayer !== null &&
    game.players.every((other, index) => index === lastPlayer || other.passed)
  if (allRespondersPassed) {
    game.players.forEach((other) => {
      other.passed = false
    })
    game.passCount = 0
    game.field = null
    game.currentPlayer = lastPlayer
    game.log.unshift('場が流れました。最後に出した人が親です。')
  } else {
    advanceKukuTurn(game)
  }
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
