import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createCard, createJoker } from '../src/lib/cards'
import {
  cardGameValue,
  clearMockField,
  createMockGame,
  evaluateCombo,
  evaluateMainCards,
  playMockTurn,
} from '../src/lib/cardGameMock'

const c = (rank: number, suit: 'clubs' | 'diamonds' | 'hearts' | 'spades' = 'clubs') =>
  createCard(suit, rank)

describe('card game mock', () => {
  it('uses all 52 cards and two jokers, with joker value zero', () => {
    const game = createMockGame({ players: [{ id: 'p1' }] })
    assert.equal(game.deck.length, 54)
    assert.equal(new Set(game.deck.map((card) => card.id)).size, 54)
    assert.equal(cardGameValue(createJoker('black')), 0)
  })

  it('accepts one card or concatenates two 0-9 cards only', () => {
    assert.equal(evaluateMainCards([c(7)]), 7)
    assert.equal(evaluateMainCards([createJoker('black'), c(8)]), 8)
    assert.equal(evaluateMainCards([c(1), c(9)]), 19)
    assert.equal(evaluateMainCards([c(10), c(2)]), null)
    assert.equal(evaluateMainCards([c(1), c(2), c(3)]), null)
  })

  it('supports one multiplication pair and J/Q/K helper combos', () => {
    assert.equal(evaluateCombo({ cards: [c(1), c(1, 'hearts')] }), 1)
    assert.equal(evaluateCombo({ cards: [c(3), c(4)] }), 12)
    assert.equal(evaluateCombo({ cards: [c(11)] }), 1)
    assert.equal(evaluateCombo({ cards: [c(12)] }), 2)
    assert.equal(evaluateCombo({ cards: [c(13)] }), 3)
    assert.equal(evaluateCombo({ cards: [c(10)] }), null)
    assert.equal(evaluateCombo({ cards: [createJoker('black'), c(1)] }), null)
    assert.equal(evaluateCombo({ cards: [c(10), c(1)] }), null)
  })

  it('keeps J/Q/K helper mappings for the one-times special combos', () => {
    assert.equal(evaluateCombo({ cards: [c(11)] }), 1)
    assert.equal(evaluateCombo({ cards: [c(12)] }), 2)
    assert.equal(evaluateCombo({ cards: [c(13)] }), 3)
  })

  it('can use 3 and 4 as the combo for a Q main card', () => {
    const game = createMockGame({ players: [{ id: 'p1' }] })
    const queen = c(12, 'hearts')
    const three = c(3, 'spades')
    const four = c(4, 'diamonds')
    game.players[0].hand = [queen, three, four]

    const result = playMockTurn(game, [queen], { cards: [three, four] })

    assert.equal(result.ok, true)
    assert.equal(game.field?.value, 12)
    assert.deepEqual(game.players[0].hand, [])
  })

  it('requires an exact combo result and strictly increasing field value', () => {
    const game = createMockGame({ players: [{ id: 'p1' }, { id: 'p2' }] })
    game.players[0].hand = [c(3), c(4), c(1), c(2), c(5), c(6)]
    game.players[1].hand = [c(7, 'hearts'), c(8, 'hearts')]
    assert.equal(playMockTurn(game, [c(1), c(2)], { cards: [c(3), c(4)] }).ok, true)
    assert.equal(playMockTurn(game, [c(5), c(6)], { cards: [c(3), c(4)] }).ok, false)
    assert.equal(playMockTurn(game, [c(7, 'hearts'), c(8, 'hearts')]).ok, false)
  })

  it('applies combo binding and lets the parent choose the next field size', () => {
    const game = createMockGame({ players: [{ id: 'p1' }, { id: 'p2' }] })
    game.players[0].hand = [c(2), c(3), c(6), c(7)]
    game.players[1].hand = [c(4, 'hearts'), c(5, 'hearts'), c(8, 'hearts')]
    assert.equal(playMockTurn(game, [c(6)], { cards: [c(2), c(3)] }).ok, true)
    assert.equal(playMockTurn(game, [c(4, 'hearts'), c(5, 'hearts')]).ok, false)
    clearMockField(game, 1)
    assert.equal(playMockTurn(game, [c(8, 'hearts')]).ok, true)
  })

  it('allows switching between one- and two-digit main values on an active field', () => {
    const game = createMockGame({ players: [{ id: 'p1' }, { id: 'p2' }] })
    game.players[0].hand = [c(7)]
    game.players[1].hand = [c(1, 'hearts'), c(2, 'hearts')]

    assert.equal(playMockTurn(game, [c(7)]).ok, true)
    assert.equal(playMockTurn(game, [c(1, 'hearts'), c(2, 'hearts')]).ok, true)
  })
})
