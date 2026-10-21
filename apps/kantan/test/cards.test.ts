import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CARD_CODE_BLANK,
  CARD_CODE_JOKER_1,
  CARD_CODE_JOKER_2,
  CARD_CODE_UNDEFINED,
  FRENCH_52_PROFILE_ID,
  FRENCH_54_PROFILE_ID,
  Rank,
  Suit,
  UCARD_CODE_JOKER,
  cardCodeToUCardCode,
  cardCodeToToken,
  cardToCodeToken,
  con,
  cardsToRankString,
  createCard,
  createCardFromCode,
  createCardFromToken,
  createJoker,
  evalF,
  generateDeck,
  isJokerCode,
  isJokerCard,
  isJokerUCardCode,
  isStandardSuitCardCode,
  isValidCardCode,
  packCard,
  packUCardCode,
  rankStringToCards,
  rankOf,
  shuffleDeck,
  suitOf,
  tokenToCardCode,
  tokenToUCardCode,
  uCardCodeToToken,
  v,
} from '../src/lib/cards'

describe('cards', () => {
  it('generates one standard 52-card deck without jokers', () => {
    const deck = generateDeck()

    assert.equal(deck.length, 52)
    assert.equal(new Set(deck.map(card => card.id)).size, 52)
    assert.equal(deck.every(card => card.profile === FRENCH_52_PROFILE_ID), true)
    assert.deepEqual(
      deck.filter(card => card.suit === 'hearts').map(card => card.rank),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    )
  })

  it('can remove even cards during deck generation', () => {
    const deck = generateDeck({ evenReduceSize: 3 })

    assert.equal(deck.length, 49)
    assert.equal(deck.filter(card => card.rank % 2 === 0).length, 21)
  })

  it('can generate a 54-card deck with two uniquely identified jokers', () => {
    const deck = generateDeck({ jokerCount: 2 })
    const profileDeck = generateDeck({ profile: FRENCH_54_PROFILE_ID })
    const jokers = deck.filter(isJokerCard)

    assert.equal(deck.length, 54)
    assert.equal(profileDeck.length, 54)
    assert.deepEqual(
      jokers.map(card => ({
        id: card.id,
        color: card.color,
        profile: card.profile,
        code: card.code,
        rank: card.rank,
        token: cardsToRankString([card]),
      })),
      [
        {
          id: 'joker-black',
          color: 'black',
          profile: FRENCH_54_PROFILE_ID,
          code: CARD_CODE_JOKER_1,
          rank: 0,
          token: 'JK',
        },
        {
          id: 'joker-red',
          color: 'red',
          profile: FRENCH_54_PROFILE_ID,
          code: CARD_CODE_JOKER_2,
          rank: 0,
          token: 'JK',
        },
      ],
    )
    assert.equal(new Set(deck.map(card => card.id)).size, 54)
  })

  it('packs french profile cards into prime-daifugo CardCode6 values', () => {
    const aceOfClubs = createCard('clubs', 1)
    const aceOfSpades = createCard('spades', 1)
    const queenOfHearts = createCard('hearts', 12)
    const queenOfDiamonds = createCard('diamonds', 12)
    const kingOfClubs = createCard('clubs', 13)
    const blackJoker = createJoker('black')
    const redJoker = createJoker('red')

    assert.equal(aceOfClubs.code, 0x01)
    assert.equal(queenOfDiamonds.code, 0x1c)
    assert.equal(queenOfHearts.code, 0x2c)
    assert.equal(aceOfSpades.code, 0x31)
    assert.equal(kingOfClubs.code, 0x0d)
    assert.equal(blackJoker.code, CARD_CODE_JOKER_1)
    assert.equal(redJoker.code, CARD_CODE_JOKER_2)
    assert.equal(packCard(Suit.Clubs, Rank.Blank), CARD_CODE_BLANK)
    assert.equal(packCard(Suit.Clubs, Rank.Undefined), CARD_CODE_UNDEFINED)
    assert.equal(packCard(Suit.Clubs, Rank.Joker), CARD_CODE_JOKER_1)
    assert.equal(packCard(Suit.Hearts, Rank.Ace), 0x21)
    assert.equal(suitOf(queenOfDiamonds.code), Suit.Diamonds)
    assert.equal(rankOf(queenOfDiamonds.code), Rank.Queen)
    assert.equal(isStandardSuitCardCode(kingOfClubs.code), true)
    assert.equal(isJokerCode(redJoker.code), true)
    assert.equal(isValidCardCode(0x0f), false)
    assert.equal(isValidCardCode(CARD_CODE_BLANK), true)
    assert.equal(isValidCardCode(CARD_CODE_UNDEFINED), true)
  })

  it('converts physical card tokens and codes', () => {
    assert.equal(tokenToCardCode('CA'), 0x01)
    assert.equal(tokenToCardCode('DT'), 0x1a)
    assert.equal(tokenToCardCode('H10'), 0x2a)
    assert.equal(tokenToCardCode('SA'), 0x31)
    assert.equal(tokenToCardCode('CK'), 0x0d)
    assert.equal(tokenToCardCode('X1'), CARD_CODE_JOKER_1)
    assert.equal(tokenToCardCode('RJ'), CARD_CODE_JOKER_2)
    assert.equal(tokenToCardCode('O'), CARD_CODE_UNDEFINED)
    assert.equal(tokenToCardCode('J'), null)

    assert.equal(cardCodeToToken(0x01), 'CA')
    assert.equal(cardCodeToToken(0x1a), 'DT')
    assert.equal(cardCodeToToken(0x2c), 'HQ')
    assert.equal(cardCodeToToken(0x3d), 'SK')
    assert.equal(cardCodeToToken(CARD_CODE_JOKER_1), 'X1')
    assert.equal(cardCodeToToken(CARD_CODE_JOKER_2), 'X2')
    assert.equal(cardCodeToToken(CARD_CODE_UNDEFINED), 'O')
    assert.equal(cardCodeToToken(0x0f), null)
  })

  it('creates cards from physical codes and tokens', () => {
    assert.deepEqual(createCardFromCode(0x1c), createCard('diamonds', 12))
    assert.deepEqual(createCardFromToken('CK'), createCard('clubs', 13))
    assert.deepEqual(createCardFromToken('X2'), createJoker('red'))
    assert.equal(createCardFromCode(CARD_CODE_UNDEFINED), null)
    assert.equal(createCardFromToken('J'), null)
    assert.equal(cardToCodeToken(createCard('hearts', 10)), 'HT')
  })

  it('maps CardCode6 values to UCardCode4 rank values', () => {
    assert.equal(cardCodeToUCardCode(createCard('spades', 13).code), Rank.King)
    assert.equal(cardCodeToUCardCode(CARD_CODE_UNDEFINED), Rank.Undefined)
    assert.equal(cardCodeToUCardCode(CARD_CODE_JOKER_1), Rank.Joker)
    assert.equal(packUCardCode(-1), UCARD_CODE_JOKER)
    assert.equal(isJokerUCardCode(UCARD_CODE_JOKER), true)
    assert.equal(tokenToUCardCode('X'), 15)
    assert.equal(tokenToUCardCode('O'), 14)
    assert.equal(tokenToUCardCode('T'), 10)
    assert.equal(uCardCodeToToken(15), 'X')
    assert.equal(uCardCodeToToken(14), 'O')
    assert.equal(uCardCodeToToken(10), 'T')
  })

  it('converts ordered cards into the concatenated rank number', () => {
    const cards = [
      createCard('spades', 1),
      createCard('hearts', 11),
      createCard('clubs', 13),
    ]

    assert.equal(v(cards[1]), 11)
    assert.equal(con([1, 11, 13]), 11113)
    assert.equal(evalF(cards), 11113)
    assert.equal(cardsToRankString(cards), 'AJK')
  })

  it('creates individual jokers for official rule evaluation', () => {
    assert.deepEqual(createJoker('black'), {
      id: 'joker-black',
      name: 'black joker',
      kind: 'joker',
      profile: FRENCH_54_PROFILE_ID,
      code: CARD_CODE_JOKER_1,
      rank: 0,
      color: 'black',
    })
  })

  it('selects cards from rank strings without reusing the same physical card', () => {
    const hand = [
      createCard('spades', 3),
      createCard('hearts', 3),
      createCard('clubs', 7),
    ]

    const selected = rankStringToCards('33', hand)
    const unavailable = rankStringToCards('333', hand)

    assert.equal(selected?.length, 2)
    assert.deepEqual(selected?.map(card => card.id), ['spades-3', 'hearts-3'])
    assert.equal(unavailable, null)
  })

  it('shuffles deterministically when a random source is provided', () => {
    const deck = [1, 2, 3, 4]

    assert.deepEqual(shuffleDeck(deck, () => 0), [2, 3, 4, 1])
  })
})
