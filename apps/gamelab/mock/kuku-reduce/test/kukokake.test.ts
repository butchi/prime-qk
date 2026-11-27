import test from 'node:test'
import assert from 'node:assert/strict'
import {
  allKukuCards,
  calculationLabel,
  chooseKukuChainTypeForLead,
  createKukuGame,
  findKukuPlays,
  makeMainBlocks,
  makeSupportBlocks,
  passKukuTurn,
  sortKukuHand,
  uniqueKukuPlayExpressions,
  validateKukuPlay,
  type KukuCard,
  type KukuGame,
} from '../src/lib/kukokake'

const card = (rank: KukuCard['rank'], suit: KukuCard['suit'] = '♠'): KukuCard => ({
  id: `${suit}-${rank}`,
  rank,
  suit,
})

test('トランプ54枚を使用する', () => {
  const deck = allKukuCards()
  assert.equal(deck.length, 54)
  assert.equal(new Set(deck.map((item) => item.id)).size, 54)
})

test('手札は数の昇順に並ぶ', () => {
  assert.deepEqual(
    sortKukuHand([card('K'), card('Joker'), card('A'), card('Q', '♥')]).map((item) => item.rank),
    ['Joker', 'A', 'Q', 'K'],
  )
})

test('主数は1枚または0〜9の2枚連結で表す', () => {
  const blocks = makeMainBlocks([card('Q'), card('3'), card('4', '♥')])
  assert.ok(blocks.some((block) => block.cards.length === 1 && block.value === 12))
  assert.ok(blocks.some((block) => block.cards.length === 2 && block.value === 34))
  assert.equal(
    blocks.some(
      (block) => block.cards.length === 2 && block.cards.some((item) => item.rank === 'Q'),
    ),
    false,
  )
})

test('補助札は九九1組だけで主数と完全一致する', () => {
  const queen = card('Q')
  const three = card('3')
  const four = card('4', '♥')
  const main = makeMainBlocks([queen])[0]
  const support = makeSupportBlocks([three, four]).find((block) => block.value === 12)!
  assert.ok(validateKukuPlay(main, support, null, 1))
  assert.equal(validateKukuPlay(main, makeSupportBlocks([card('2'), card('5')])[0], null, 1), null)
})

test('J・Q・Kは1・2・3の補助札になる', () => {
  const supports = makeSupportBlocks([card('J'), card('Q'), card('K')])
  assert.deepEqual(supports.map((block) => block.value).sort(), [1, 2, 3])
})

test('計算候補を九九の式として表示する', () => {
  const play = findKukuPlays([card('Joker'), card('2'), card('Q')], null, 1).find(
    (candidate) => candidate.main.value === 2 && candidate.support?.cards[0].rank === 'Q',
  )!
  assert.equal(calculationLabel(play), '2 = 1×2 (Q)')
})

test('スート違いで同じ数式になる計算候補をまとめる', () => {
  const plays = findKukuPlays(
    [card('Q'), card('3'), card('3', '♥'), card('4'), card('4', '♥')],
    null,
    1,
  ).filter((play) => play.support && play.main.value === 12)
  assert.ok(plays.length > 1)
  assert.equal(uniqueKukuPlayExpressions(plays).length, 1)
})

test('場はチェーンの有無で比較し、主数の枚数は自由', () => {
  const field = findKukuPlays([card('Q'), card('3'), card('4', '♥')], null, 1).find(
    (play) => play.value === 12,
  )!
  const fieldWithoutChain = findKukuPlays([card('Q')], null, 0).find((play) => play.value === 12)!
  const responses = findKukuPlays(
    [card('J'), card('Joker'), card('9', '♥')],
    fieldWithoutChain,
    null,
  )
  assert.ok(responses.some((play) => play.main.cards.length === 1 && play.value === 11))
  assert.ok(responses.some((play) => play.main.cards.length === 2 && play.value === 9))
  assert.equal(findKukuPlays([card('J'), card('Joker'), card('9', '♥')], field, null).length, 0)
})

test('親は場が空のときにチェーンの有無を選ぶ', () => {
  const game = createKukuGame(['あなた'])
  assert.equal(chooseKukuChainTypeForLead(game, 1).ok, true)
  assert.equal(game.chainType, 1)
})

test('初期手札は11枚で、公開札を選んでパスできる', () => {
  const initial = createKukuGame()
  assert.deepEqual(
    initial.players.map((player) => player.hand.length),
    [11, 11, 11],
  )
  assert.equal(initial.market.length, 5)
  assert.equal(initial.deck.length, 16)

  const game: KukuGame = {
    players: [{ id: 'you', name: 'あなた', hand: [card('A')], passed: false }],
    deck: [card('K', '♥')],
    market: [card('Q', '♦')],
    field: null,
    chainType: null,
    currentPlayer: 0,
    lastPlayer: null,
    passCount: 0,
    winner: null,
    log: [],
  }
  assert.equal(passKukuTurn(game, 0).ok, true)
  assert.equal(
    game.players[0].hand.some((item) => item.rank === 'Q'),
    true,
  )
})
