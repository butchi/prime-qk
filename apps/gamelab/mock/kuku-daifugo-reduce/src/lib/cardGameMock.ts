import { generateDeck, isJokerCard, shuffleDeck, type PlayingCard } from './cards'

/**
 * ルール確認用の軽量なトランプゲーム実装。
 * 既存の素数大富豪とは判定モデルが異なるため、独立したモジュールにしている。
 */

export type MainCardCount = 1 | 2

export interface MockCombo {
  /**
   * 通常は 1〜9 のカードを2枚で指定する九九1組。
   * 例えば Q を主数として出す場合、3 と 4 を指定すれば 3×4=12 で成立する。
   * J/Q/K は 1×1 / 1×2 / 1×3 の1枚補助としても指定できる。
   */
  cards: PlayingCard[]
}

export interface EvaluatedPlay {
  value: number
  mainCardCount: MainCardCount
  comboValue: number | null
}

export interface MockField {
  mainCards: PlayingCard[]
  comboCards: PlayingCard[]
  value: number
  /** この場を出した手がコンボだったか。場が流れるまで縛りになる。 */
  comboBound: boolean
}

export interface MockPlayer {
  id: string
  hand: PlayingCard[]
}

export interface MockGame {
  players: MockPlayer[]
  deck: PlayingCard[]
  field: MockField | null
  currentPlayerIndex: number
  /** 場が流れた後、親が選んだ主札枚数。 */
  nextMainCardCount: MainCardCount | null
}

export interface CreateMockGameOptions {
  players: Array<{ id: string }>
  random?: () => number
  initialHandSize?: number
}

export type PlayResult = { ok: true; play: EvaluatedPlay } | { ok: false; reason: string }

const JOKER_COMBO_VALUES = new Map<number, number>([
  [11, 1], // J = 1×1
  [12, 2], // Q = 1×2
  [13, 3], // K = 1×3
])

export function cardGameValue(card: PlayingCard): number {
  return isJokerCard(card) ? 0 : card.rank
}

export function evaluateMainCards(mainCards: readonly PlayingCard[]): number | null {
  if (mainCards.length !== 1 && mainCards.length !== 2) return null

  const values = mainCards.map(cardGameValue)
  if (mainCards.length === 2 && values.some((value) => value < 0 || value > 9)) {
    return null
  }

  return Number(values.join(''))
}

/** コンボは通常の九九1組（数札2枚）か、J/Q/Kの特殊1枚コンボに限定する。 */
export function evaluateCombo(combo: MockCombo | undefined): number | null {
  if (!combo) return null

  if (combo.cards.length === 1) {
    const card = combo.cards[0]
    if (!card || isJokerCard(card)) return null
    return JOKER_COMBO_VALUES.get(card.rank) ?? null
  }

  if (combo.cards.length !== 2) return null
  const values = combo.cards.map(cardGameValue)
  if (values.some((value) => value < 1 || value > 9)) return null
  return values[0] * values[1]
}

export function evaluatePlay(
  mainCards: readonly PlayingCard[],
  combo?: MockCombo,
): EvaluatedPlay | null {
  const value = evaluateMainCards(mainCards)
  if (value === null) return null

  const comboValue = evaluateCombo(combo)
  if (combo && comboValue === null) return null
  if (comboValue !== null && comboValue !== value) return null

  return {
    value,
    mainCardCount: mainCards.length as MainCardCount,
    comboValue,
  }
}

export function createMockGame(options: CreateMockGameOptions): MockGame {
  if (options.players.length === 0) throw new Error('At least one player is required')

  const deck = shuffleDeck(generateDeck({ jokerCount: 2 }), options.random)
  const players = options.players.map((player) => ({ id: player.id, hand: [] as PlayingCard[] }))
  const initialHandSize = options.initialHandSize ?? 0

  for (let i = 0; i < initialHandSize; i++) {
    for (const player of players) {
      const card = deck.pop()
      if (card) player.hand.push(card)
    }
  }

  return {
    players,
    deck,
    field: null,
    currentPlayerIndex: 0,
    nextMainCardCount: null,
  }
}

export function playMockTurn(
  game: MockGame,
  mainCards: readonly PlayingCard[],
  combo?: MockCombo,
): PlayResult {
  const player = game.players[game.currentPlayerIndex]
  if (!player) return { ok: false, reason: 'プレイヤーが存在しません' }

  const evaluated = evaluatePlay(mainCards, combo)
  if (!evaluated) return { ok: false, reason: '主札またはコンボがルールに適合しません' }

  if (game.nextMainCardCount !== null && evaluated.mainCardCount !== game.nextMainCardCount) {
    return { ok: false, reason: `主札は${game.nextMainCardCount}枚で出してください` }
  }

  if (game.field) {
    if (game.field.comboBound && !combo) {
      return { ok: false, reason: 'コンボ縛り中はコンボが必要です' }
    }
    if (evaluated.value <= game.field.value) {
      return { ok: false, reason: '場の数より大きい数を出してください' }
    }
  }

  const selectedIds = new Set([...mainCards, ...(combo?.cards ?? [])].map((card) => card.id))
  if (selectedIds.size !== mainCards.length + (combo?.cards.length ?? 0)) {
    return { ok: false, reason: '同じカードを重複して使えません' }
  }
  if ([...selectedIds].some((id) => !player.hand.some((card) => card.id === id))) {
    return { ok: false, reason: '手札にないカードは出せません' }
  }

  player.hand = player.hand.filter((card) => !selectedIds.has(card.id))
  game.field = {
    mainCards: [...mainCards],
    comboCards: [...(combo?.cards ?? [])],
    value: evaluated.value,
    comboBound: combo !== undefined,
  }
  game.nextMainCardCount = null
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length
  return { ok: true, play: evaluated }
}

/** 場を流し、同じ親が次の場を1枚場/2枚場から選ぶ。 */
export function clearMockField(game: MockGame, nextMainCardCount: MainCardCount): void {
  game.field = null
  game.nextMainCardCount = nextMainCardCount
}
