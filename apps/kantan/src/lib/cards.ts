export const FRENCH_52_PROFILE_ID = 'french-52-v1'
export const FRENCH_54_PROFILE_ID = 'french-54-v1'

export type DeckProfileId =
  | typeof FRENCH_52_PROFILE_ID
  | typeof FRENCH_54_PROFILE_ID
  | 'tarot-78-v1'
  | 'spanish-40-v1'
  | `custom:${string}`

export const enum Suit {
  Clubs = 0,
  Diamonds = 1,
  Hearts = 2,
  Spades = 3,
}

export const enum Rank {
  Blank = 0,
  Ace = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
  Undefined = 14,
  Joker = 15,
}

export type CardCode = number
export type UCardCode = number
export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type CardKind = 'normal' | 'joker'
export type JokerColor = 'black' | 'red'

export const CARD_CODE_BLANK = 0
export const CARD_CODE_UNDEFINED = 47
export const CARD_CODE_JOKER_2 = 62
export const CARD_CODE_JOKER_1 = 63

export const UCARD_CODE_BLANK = 0
export const UCARD_CODE_UNDEFINED = 14
export const UCARD_CODE_JOKER = 15

export interface PhysicalCard {
  profile: DeckProfileId
  code: CardCode
}

export interface DeclaredCard {
  card: PhysicalCard
  value: number | string
}

export interface PlayingCard {
  id: string
  name: string
  kind: CardKind
  profile: DeckProfileId
  code: CardCode
  rank: number
  suit?: CardSuit
  color?: JokerColor
}

export interface GenerateDeckOptions {
  profile?: DeckProfileId
  evenReduceSize?: number
  jokerCount?: number
}

const suits: CardSuit[] = ['clubs', 'diamonds', 'hearts', 'spades']
const jokerColors: JokerColor[] = ['black', 'red']
const defaultProfile: DeckProfileId = FRENCH_52_PROFILE_ID

const suitCodes: Record<CardSuit, Suit> = {
  clubs: Suit.Clubs,
  diamonds: Suit.Diamonds,
  hearts: Suit.Hearts,
  spades: Suit.Spades,
}

const suitsByCode: Record<Suit, CardSuit> = {
  [Suit.Clubs]: 'clubs',
  [Suit.Diamonds]: 'diamonds',
  [Suit.Hearts]: 'hearts',
  [Suit.Spades]: 'spades',
}

const suitCodeTokens: Record<Suit, string> = {
  [Suit.Clubs]: 'C',
  [Suit.Diamonds]: 'D',
  [Suit.Hearts]: 'H',
  [Suit.Spades]: 'S',
}

const tokenSuitCodes: Record<string, Suit> = {
  C: Suit.Clubs,
  D: Suit.Diamonds,
  H: Suit.Hearts,
  S: Suit.Spades,
}

const jokerCodes: Record<JokerColor, CardCode> = {
  black: CARD_CODE_JOKER_1,
  red: CARD_CODE_JOKER_2,
}

const jokerColorsByCode: Partial<Record<CardCode, JokerColor>> = {
  [CARD_CODE_JOKER_1]: 'black',
  [CARD_CODE_JOKER_2]: 'red',
}

export function packCard(suit: Suit, rank: Rank): CardCode {
  if (rank === Rank.Blank) return CARD_CODE_BLANK
  if (rank === Rank.Undefined) return CARD_CODE_UNDEFINED
  if (rank === Rank.Joker) return CARD_CODE_JOKER_1

  return suit * 16 + rank
}

export function suitOf(card: CardCode): Suit | null {
  if (!Number.isInteger(card) || card < 1 || card > 61) return null
  if (card === CARD_CODE_UNDEFINED || (card - 1) % 16 >= 13) return null

  return Math.floor((card - 1) / 16) as Suit
}

export function rankOf(card: CardCode): Rank | null {
  if (card === CARD_CODE_BLANK) return Rank.Blank
  if (card === CARD_CODE_UNDEFINED) return Rank.Undefined
  if (isJokerCode(card)) return Rank.Joker

  const suit = suitOf(card)
  if (suit === null) return null

  return ((card - suit * 16) as Rank)
}

export function isJokerCode(card: CardCode): boolean {
  return card === CARD_CODE_JOKER_1 || card === CARD_CODE_JOKER_2
}

export function isStandardSuitCardCode(card: CardCode): boolean {
  const rank = rankOf(card)

  return rank !== null && rank >= Rank.Ace && rank <= Rank.King && suitOf(card) !== null
}

export function isBlankCardCode(card: CardCode): boolean {
  return card === CARD_CODE_BLANK
}

export function isUndefinedCardCode(card: CardCode): boolean {
  return card === CARD_CODE_UNDEFINED
}

export function isValidCardCode(card: CardCode): boolean {
  if (!Number.isInteger(card) || card < 0 || card > 0x3f) return false
  if (isBlankCardCode(card) || isUndefinedCardCode(card)) return true
  if (isStandardSuitCardCode(card)) return true

  return isJokerCode(card)
}

export function cardCodeToUCardCode(card: CardCode): UCardCode | null {
  const rank = rankOf(card)
  if (rank === null) return null

  return rank
}

export function packUCardCode(value: number): UCardCode | null {
  if (value === -1) return UCARD_CODE_JOKER
  if (!Number.isInteger(value) || value < 0 || value > 15) return null

  return value
}

export function isJokerUCardCode(card: UCardCode): boolean {
  return card === UCARD_CODE_JOKER
}

export function uCardCodeToToken(card: UCardCode): string | null {
  if (card === UCARD_CODE_BLANK) return ''
  if (card === UCARD_CODE_UNDEFINED) return 'O'
  if (card === UCARD_CODE_JOKER) return 'X'
  if (card >= Rank.Ace && card <= Rank.King) return rankToToken(card)

  return null
}

export function tokenToUCardCode(token: string): UCardCode | null {
  const normalizedToken = token.trim().toUpperCase()
  if (normalizedToken === '') return UCARD_CODE_BLANK
  if (normalizedToken === 'O') return UCARD_CODE_UNDEFINED
  if (normalizedToken === 'X') return UCARD_CODE_JOKER

  const rank = tokenToRank(normalizedToken)
  return rank === null ? null : rank
}

export function createCard(
  suit: CardSuit,
  rank: number,
  profile: DeckProfileId = defaultProfile,
): PlayingCard {
  const code = packCard(suitCodes[suit], rank as Rank)

  return {
    id: `${suit}-${rank}`,
    name: `${rank} of ${suit}`,
    kind: 'normal',
    profile,
    code,
    rank,
    suit,
  }
}

export function createJoker(
  color: JokerColor,
  index = 0,
  profile: DeckProfileId = FRENCH_54_PROFILE_ID,
): PlayingCard {
  const suffix = index > 0 ? `-${index + 1}` : ''
  const code = jokerCodes[color]

  return {
    id: `joker-${color}${suffix}`,
    name: `${color} joker`,
    kind: 'joker',
    profile,
    code,
    rank: 0,
    color,
  }
}

export function createCardFromCode(
  code: CardCode,
  profile: DeckProfileId = isJokerCode(code) ? FRENCH_54_PROFILE_ID : defaultProfile,
): PlayingCard | null {
  if (!isValidCardCode(code)) return null

  if (isJokerCode(code)) {
    const color = jokerColorsByCode[code]
    if (!color) return null

    return createJoker(color, 0, profile)
  }

  if (isBlankCardCode(code) || isUndefinedCardCode(code)) return null

  const suit = suitOf(code)
  const rank = rankOf(code)
  if (suit === null || rank === null) return null

  return createCard(suitsByCode[suit], rank, profile)
}

export function cardCodeToToken(code: CardCode): string | null {
  if (!isValidCardCode(code)) return null

  if (code === CARD_CODE_BLANK) return ''
  if (code === CARD_CODE_UNDEFINED) return 'O'

  if (isJokerCode(code)) return code === CARD_CODE_JOKER_1 ? 'X1' : 'X2'

  const suit = suitOf(code)
  const rank = rankOf(code)
  if (suit === null || rank === null) return null

  return `${suitCodeTokens[suit]}${rankToToken(rank)}`
}

export function cardToCodeToken(card: PlayingCard): string {
  return cardCodeToToken(card.code) ?? card.id
}

export function tokenToCardCode(token: string): CardCode | null {
  const normalizedToken = token.trim().toUpperCase()

  if (normalizedToken === '') return CARD_CODE_BLANK
  if (normalizedToken === 'O') return CARD_CODE_UNDEFINED
  if (normalizedToken === 'X' || normalizedToken === 'X1' || normalizedToken === 'BJ') {
    return CARD_CODE_JOKER_1
  }
  if (normalizedToken === 'X2' || normalizedToken === 'RJ') {
    return CARD_CODE_JOKER_2
  }

  const match = normalizedToken.match(/^([SHDC])((?:10)|[A2-9TJQK])$/)
  if (!match) return null

  const suit = tokenSuitCodes[match[1]]
  const rank = tokenToRank(match[2])
  if (rank === null) return null

  return packCard(suit, rank as Rank)
}

export function createCardFromToken(
  token: string,
  profile?: DeckProfileId,
): PlayingCard | null {
  const code = tokenToCardCode(token)
  if (code === null) return null

  return createCardFromCode(code, profile)
}

export function generateDeck(options: GenerateDeckOptions = {}): PlayingCard[] {
  const deck: PlayingCard[] = []
  const profile = options.profile
    ?? ((options.jokerCount ?? 0) > 0 ? FRENCH_54_PROFILE_ID : defaultProfile)
  let evenReduceSize = options.evenReduceSize ?? 0
  const jokerCount = options.jokerCount ?? (profile === FRENCH_54_PROFILE_ID ? 2 : 0)

  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      if (evenReduceSize > 0 && rank % 2 === 0) {
        evenReduceSize--
        continue
      }

      deck.push(createCard(suit, rank, profile))
    }
  }

  for (let i = 0; i < jokerCount; i++) {
    deck.push(createJoker(jokerColors[i % jokerColors.length], Math.floor(i / jokerColors.length), profile))
  }

  return deck
}

export function shuffleDeck<T>(deck: T[], random = Math.random): T[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }

  return deck
}

export function v(card: PlayingCard): number {
  return card.rank
}

export function con(values: number[]): number {
  return Number.parseInt(values.join(''), 10)
}

export function evalF(cards: PlayingCard[]): number {
  return con(cards.map(v))
}

export const cardsToNumber = evalF

export function cardToRankToken(card: PlayingCard): string {
  if (isJokerCard(card)) return 'JK'

  return rankToToken(card.rank)
}

export function cardsToRankString(cards: PlayingCard[]): string {
  return cards.map(cardToRankToken).join('')
}

export function rankToToken(rank: number): string {
  if (rank === 1) return 'A'
  if (rank === 10) return 'T'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'

  return String(rank)
}

export function tokenToRank(token: string): number | null {
  const normalizedToken = token.toUpperCase()

  if (normalizedToken === 'A') return 1
  if (normalizedToken === '10') return 10
  if (normalizedToken === 'T') return 10
  if (normalizedToken === 'J') return 11
  if (normalizedToken === 'Q') return 12
  if (normalizedToken === 'K') return 13
  if (/^[1-9]$/.test(normalizedToken)) {
    return Number.parseInt(normalizedToken, 10)
  }

  return null
}

export function rankStringToCards(
  rankString: string,
  hand: PlayingCard[],
): PlayingCard[] | null {
  const availableCards = [...hand]
  const selectedCards: PlayingCard[] = []

  for (const token of rankString.replace(/\s+/g, '')) {
    const rank = tokenToRank(token)
    if (rank === null) return null

    const cardIndex = availableCards.findIndex(card => card.rank === rank)
    if (cardIndex === -1) return null

    const [card] = availableCards.splice(cardIndex, 1)
    selectedCards.push(card)
  }

  return selectedCards
}

export function formatCard(card: PlayingCard): string {
  if (isJokerCard(card)) return `${card.color ?? 'unknown'} joker`

  if (!card.suit) return String(card.rank)

  return `${card.rank}${suitMarks[card.suit]}`
}

export function formatCards(cards: PlayingCard[]): string {
  return cards.map(formatCard).join(' ')
}

const suitMarks: Record<CardSuit, string> = {
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  spades: 'S',
}

export function isJokerCard(card: PlayingCard): boolean {
  return card.kind === 'joker'
}

export function isNormalCard(card: PlayingCard): boolean {
  return card.kind === 'normal'
}
