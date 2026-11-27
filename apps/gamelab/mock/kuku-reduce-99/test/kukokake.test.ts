import test from 'node:test'
import assert from 'node:assert/strict'
import {
  chooseKukuCpuPlay,
  digitProduct,
  isCalculationChain,
  passKukuTurn,
  validateKukuPlay,
  type KukuGame,
} from '../src/lib/kukokake'

test('ククカケの乗算チェーンを判定する', () => {
  assert.equal(digitProduct('24'), 8)
  assert.equal(isCalculationChain(['08', '24', '64', '88']), true)
  assert.equal(isCalculationChain(['08', '24', '65']), false)
})

test('0を含むカードは補助札にできない', () => {
  assert.equal(digitProduct('90'), null)
  assert.equal(validateKukuPlay(['00', '10'], null), null)
  assert.ok(validateKukuPlay(['12', '34'], null))
})

test('場の値は一番左の答え札だけで比較する', () => {
  const field = validateKukuPlay(['36', '49'], null)
  assert.ok(field)
  assert.ok(validateKukuPlay(['12', '26'], field))
  assert.equal(validateKukuPlay(['36', '49'], field), null)
})

test('場と同じ枚数のチェーンだけで応答する', () => {
  const singleField = validateKukuPlay(['20'], null)
  assert.ok(singleField)
  assert.equal(validateKukuPlay(['12', '26'], singleField), null)

  const chainField = validateKukuPlay(['36', '49'], null)
  assert.ok(chainField)
  assert.equal(validateKukuPlay(['12'], chainField), null)
  assert.ok(validateKukuPlay(['12', '26'], chainField))
})

test('パス時に公開札を選んで獲得し、公開札を補充する', () => {
  const game: KukuGame = {
    players: [
      { id: 'you', name: 'あなた', hand: ['20'], passed: false },
      { id: 'cpu', name: 'CPU', hand: ['30'], passed: false, isCpu: true },
    ],
    deck: ['99'],
    market: ['08', '24'],
    field: null,
    currentPlayer: 0,
    lastPlayer: null,
    passCount: 0,
    winner: null,
    log: [],
  }
  assert.equal(passKukuTurn(game, 1).ok, true)
  assert.deepEqual(game.players[0].hand, ['24', '20'])
  assert.deepEqual(game.market, ['08', '99'])
})

test('CPUは序中盤ではチェーンを温存して安全な単札を出す', () => {
  const game: KukuGame = {
    players: [
      { id: 'you', name: 'あなた', hand: [], passed: false },
      {
        id: 'cpu',
        name: 'CPU',
        hand: ['08', '24', '60', '61', '62', '63', '65', '67', '69'],
        passed: false,
        isCpu: true,
      },
    ],
    deck: Array.from({ length: 20 }, () => '99'),
    market: [],
    field: null,
    currentPlayer: 1,
    lastPlayer: null,
    passCount: 0,
    winner: null,
    log: [],
  }
  assert.deepEqual(chooseKukuCpuPlay(game)?.cards, ['69'])
})

test('CPUはチェーンで終盤に入れるなら複数枚出しを使う', () => {
  const game: KukuGame = {
    players: [
      {
        id: 'cpu',
        name: 'CPU',
        hand: ['08', '24', '60', '61', '62', '63', '64'],
        passed: false,
        isCpu: true,
      },
    ],
    deck: Array.from({ length: 20 }, () => '99'),
    market: [],
    field: null,
    currentPlayer: 0,
    lastPlayer: null,
    passCount: 0,
    winner: null,
    log: [],
  }
  assert.deepEqual(chooseKukuCpuPlay(game)?.cards, ['08', '24', '64'])
})
