import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createCard, createJoker } from '../src/lib/cards'
import {
  createPrimeDaifugoGame,
  cpuSelectPlay,
  cpuCanRuleOutComposite,
  drawCard,
  findAutomaticCompositePlayCandidates,
  getCpuPlayableHint,
  getCpuTurnRecommendation,
  getCurrentPlayer,
  isValidPlay,
  passTurn,
  playCards,
  playCpuTurn,
  validatePlay,
  type PrimeDaifugoGame,
} from '../src/lib/primeDaifugo'

describe('primeDaifugo game setup', () => {
  it('deals 7 cards to each default player', () => {
    const game = createPrimeDaifugoGame({ random: () => 0.5 })

    assert.equal(game.players.length, 2)
    assert.equal(game.players[0].hand.length, 7)
    assert.equal(game.players[1].hand.length, 7)
    assert.equal(game.deck.length, 38)
    assert.equal(game.currentPlayer, 0)
    assert.equal(game.ruleOptions.grotanCut, false)
    assert.equal(game.ruleOptions.ramanujanRevolution, false)
    assert.equal(game.ruleOptions.singleJokerInfinity, true)
    assert.equal(game.ruleOptions.compositePlay, true)
    assert.equal(game.ruleOptions.penaltyEnabled, false)
    assert.equal(game.ruleOptions.judgementAssist, true)
    assert.deepEqual(game.logs, ['ゲーム開始', '第1ラウンド開始'])
  })

  it('supports custom players and hand size', () => {
    const game = createPrimeDaifugoGame({
      players: [
        { id: 'p1', name: 'P1', isCPU: false },
        { id: 'p2', name: 'P2', isCPU: false },
        { id: 'p3', name: 'P3', isCPU: false },
      ],
      initialHandSize: 3,
      random: () => 0.5,
    })

    assert.deepEqual(
      game.players.map(player => player.hand.length),
      [3, 3, 3],
    )
    assert.equal(game.deck.length, 43)
  })

  it('allows overriding judgement assist via rule options', () => {
    const game = createPrimeDaifugoGame({
      ruleOptions: {
        judgementAssist: false,
      },
      random: () => 0.5,
    })

    assert.equal(game.ruleOptions.judgementAssist, false)
  })
})

describe('primeDaifugo validation', () => {
  it('allows a prime play on an empty field', () => {
    assert.equal(isValidPlay([createCard('spades', 2)], []), true)
    assert.deepEqual(validatePlay([createCard('spades', 2)], []), {
      ok: true,
      message: '2は素数です',
    })
  })

  it('requires the same card count when the field is not empty', () => {
    const result = validatePlay(
      [createCard('spades', 3)],
      [createCard('hearts', 2), createCard('clubs', 3)],
    )

    assert.equal(result.ok, false)
    assert.equal(result.message, '同じ枚数で出してください')
  })

  it('requires a larger number than the current field', () => {
    const result = validatePlay([createCard('spades', 2)], [createCard('hearts', 3)])

    assert.equal(result.ok, false)
    assert.equal(result.message, '場の数 3 より大きい数を出してください')
  })

  it('rejects non-prime plays', () => {
    const result = validatePlay([createCard('spades', 4)], [])

    assert.equal(result.ok, false)
    assert.equal(result.message, '素数以外は出せません')
  })

  it('uses the official rule validator for special legal plays', () => {
    const result = validatePlay(
      [createCard('spades', 5), createCard('hearts', 7)],
      [],
    )

    assert.deepEqual(result, {
      ok: true,
      message: '57でグロタンカットです',
    })
  })
})

describe('primeDaifugo actions', () => {
  it('plays valid prime cards, removes them from the hand, and advances the turn', () => {
    const game = createScenarioGame()
    game.players[0].hand = [createCard('spades', 2), createCard('hearts', 4)]

    const result = playCards(game, [0])

    assert.equal(result.ok, true)
    assert.equal(result.message, '2は素数です')
    assert.deepEqual(game.field.map(cards => cards.map(card => card.id)), [['spades-2']])
    assert.deepEqual(game.players[0].hand.map(card => card.id), ['hearts-4'])
    assert.equal(game.currentPlayer, 1)
    assert.equal(getCurrentPlayer(game).id, 'cpu')
    assert.deepEqual(game.logs.slice(-2), [
      'あなたが2を出しました',
      '2は素数です！',
    ])
  })

  it('does not mutate the hand or field when a play is invalid', () => {
    const game = createScenarioGame({ penaltyEnabled: false })
    game.players[0].hand = [createCard('spades', 4)]

    const result = playCards(game, [0])

    assert.equal(result.ok, false)
    assert.equal(result.message, '素数以外は出せません')
    assert.equal(game.players[0].hand.length, 1)
    assert.equal(game.field.length, 0)
    assert.equal(game.currentPlayer, 0)
  })

  it('rejects opening plays that exceed the configured multi-card limit', () => {
    const game = createScenarioGame({ maxPlayableCards: 2, penaltyEnabled: false })
    game.players[0].hand = [
      createCard('spades', 2),
      createCard('hearts', 2),
      createCard('clubs', 3),
    ]

    const result = playCards(game, [0, 1, 2])

    assert.equal(result.ok, false)
    assert.equal(result.message, '空の場では2枚までしか出せません')
    assert.equal(game.field.length, 0)
    assert.deepEqual(game.players[0].hand.map(card => card.id), [
      'spades-2',
      'hearts-2',
      'clubs-3',
    ])
  })

  it('allows opening plays within the configured multi-card limit', () => {
    const game = createScenarioGame({ maxPlayableCards: 3, penaltyEnabled: false })
    game.players[0].hand = [
      createCard('spades', 2),
      createCard('hearts', 2),
      createCard('clubs', 3),
      createCard('diamonds', 4),
    ]

    const result = playCards(game, [0, 1, 2])

    assert.equal(result.ok, true)
    assert.equal(result.message, '223は素数です')
    assert.deepEqual(game.field.map(cards => cards.map(card => card.id)), [[
      'spades-2',
      'hearts-2',
      'clubs-3',
    ]])
  })

  it('keeps the same-card-count rule ahead of the opening multi-card limit', () => {
    const game = createScenarioGame({ maxPlayableCards: 2, penaltyEnabled: false })
    game.players[0].hand = [
      createCard('spades', 2),
      createCard('hearts', 2),
      createCard('clubs', 3),
    ]
    game.field = [[createCard('diamonds', 2), createCard('diamonds', 3)]]
    game.currentFieldValues = [{ kind: 'finite', value: 23n }]

    const result = playCards(game, [0, 1, 2])

    assert.equal(result.ok, false)
    assert.equal(result.message, '同じ枚数で出してください')
  })

  it('auto-selects factor cards for a valid composite play', () => {
    const game = createScenarioGame()
    game.players[0].hand = [
      createCard('spades', 6),
      createCard('hearts', 2),
      createCard('clubs', 3),
      createCard('diamonds', 11),
    ]

    const result = playCards(game, [0])

    assert.equal(result.ok, true)
    assert.equal(result.message, '6=2×3は合成数です')
    assert.deepEqual(game.field.map(cards => cards.map(card => card.id)), [['spades-6']])
    assert.deepEqual(game.players[0].hand.map(card => card.id), ['diamonds-11'])
    assert.deepEqual(game.currentFieldValues, [{ kind: 'finite', value: 6n }])
    assert.equal(game.currentPlayer, 1)
    assert.equal(game.deck.length, 2)
    assert.deepEqual(new Set(game.deck.map(card => card.id)), new Set(['hearts-2', 'clubs-3']))
    assert.deepEqual(game.logs.slice(-2), [
      'あなたが6を出しました',
      '6=2×3は合成数です！',
    ])
  })

  it('includes the factor expression in composite play messages', () => {
    const game = createScenarioGame()
    game.players[0].hand = [
      createCard('spades', 10),
      createCard('hearts', 2),
      createCard('clubs', 5),
      createCard('diamonds', 11),
    ]

    const result = playCards(game, [0])

    assert.equal(result.ok, true)
    assert.equal(result.message, '10=2×5は合成数です')
    assert.deepEqual(game.logs.slice(-2), [
      'あなたが10を出しました',
      '10=2×5は合成数です！',
    ])
  })

  it('assembles manually selected factor cards even when auto selection is skipped', () => {
    const game = createScenarioGame()
    game.players[0].hand = [
      createCard('spades', 10),
      createCard('hearts', 2),
      createCard('clubs', 5),
      createCard('diamonds', 3),
      createCard('spades', 4),
      createCard('hearts', 6),
      createCard('clubs', 7),
      createCard('diamonds', 8),
      createCard('spades', 9),
      createCard('hearts', 11),
    ]

    const result = playCards(game, [0], {
      factorCardIds: ['hearts-2', 'clubs-5'],
    })

    assert.equal(result.ok, true)
    assert.equal(result.message, '10=2×5は合成数です')
    assert.deepEqual(
      new Set(game.deck.map(card => card.id)),
      new Set(['hearts-2', 'clubs-5']),
    )
  })

  it('skips automatic assembly for five or more main cards', () => {
    const game = createScenarioGame({ penaltyEnabled: false })
    game.players[0].hand = [
      createCard('spades', 1),
      createCard('hearts', 1),
      createCard('clubs', 1),
      createCard('diamonds', 1),
      createCard('spades', 2),
      createCard('clubs', 11),
    ]

    const autoCandidates = findAutomaticCompositePlayCandidates(
      game.players[0].hand.slice(0, 5),
      game.players[0].hand,
      { compositePlay: true },
    )
    assert.deepEqual(autoCandidates, [])

    const skippedResult = playCards(game, [0, 1, 2, 3, 4])
    assert.equal(skippedResult.ok, false)
    assert.match(skippedResult.message, /自動合成の候補が多いため自動判定を省略/)
  })

  it('can use a joker as a factor field value for a composite play', () => {
    const game = createScenarioGame()
    const joker = createJoker('black')
    game.players[0].hand = [
      createCard('spades', 10),
      joker,
      createCard('clubs', 5),
      createCard('diamonds', 11),
    ]

    const result = playCards(game, [0])

    assert.equal(result.ok, true)
    assert.equal(result.message, '10=2×5は合成数です')
    assert.deepEqual(
      new Set(game.deck.map(card => card.id)),
      new Set([joker.id, 'clubs-5']),
    )
    assert.deepEqual(game.players[0].hand.map(card => card.id), ['diamonds-11'])
  })

  it('deduplicates composite play candidates with the same factor expression', () => {
    const game = createScenarioGame()
    game.players[0].hand = [
      createCard('spades', 10),
      createCard('hearts', 2),
      createCard('clubs', 5),
      createCard('diamonds', 2),
      createCard('spades', 5),
      createCard('diamonds', 11),
    ]
    const candidates = findAutomaticCompositePlayCandidates(
      [game.players[0].hand[0]],
      game.players[0].hand,
      {
        mode: game.mode,
        currentFieldValues: game.currentFieldValues,
        compositePlay: game.ruleOptions.compositePlay,
      },
    )

    assert.equal(candidates.length, 1)
    assert.deepEqual(candidates[0].factorCards.map(card => card.id), ['hearts-2', 'clubs-5'])

    const result = playCards(game, [0])

    assert.equal(result.ok, true)
    assert.equal(result.message, '10=2×5は合成数です')
    assert.deepEqual(
      new Set(game.deck.map(card => card.id)),
      new Set(['hearts-2', 'clubs-5']),
    )
    assert.deepEqual(game.players[0].hand.map(card => card.id), [
      'diamonds-2',
      'spades-5',
      'diamonds-11',
    ])
  })

  it('auto-selects repeated prime factor cards when exponent notation would consume another factor', () => {
    const game = createScenarioGame()
    game.players[0].hand = [
      createCard('spades', 1),
      createCard('hearts', 8),
      createCard('clubs', 2),
      createCard('diamonds', 3),
      createCard('spades', 3),
      createCard('diamonds', 11),
    ]

    const result = playCards(game, [0, 1])

    assert.equal(result.ok, true)
    assert.equal(result.message, '18=2×3×3は合成数です')
    assert.deepEqual(game.field.map(cards => cards.map(card => card.id)), [
      ['spades-1', 'hearts-8'],
    ])
    assert.deepEqual(game.players[0].hand.map(card => card.id), ['diamonds-11'])
    assert.deepEqual(game.currentFieldValues, [{ kind: 'finite', value: 18n }])
    assert.equal(game.deck.length, 3)
    assert.deepEqual(
      new Set(game.deck.map(card => card.id)),
      new Set(['clubs-2', 'diamonds-3', 'spades-3']),
    )
  })

  it('can disable composite play through rule options', () => {
    const game = createScenarioGame({ penaltyEnabled: false })
    game.ruleOptions.compositePlay = false
    game.players[0].hand = [
      createCard('spades', 6),
      createCard('hearts', 2),
      createCard('clubs', 3),
    ]

    const result = playCards(game, [0])

    assert.equal(result.ok, false)
    assert.equal(result.message, '素数以外は出せません')
    assert.deepEqual(game.players[0].hand.map(card => card.id), [
      'spades-6',
      'hearts-2',
      'clubs-3',
    ])
    assert.equal(game.field.length, 0)
    assert.equal(game.deck.length, 0)
  })

  it('marks a winner when the current player plays their last card', () => {
    const game = createScenarioGame()
    game.players[0].hand = [createCard('spades', 2)]

    const result = playCards(game, [0])

    assert.equal(result.ok, true)
    assert.equal(result.winnerId, 'you')
    assert.equal(game.winnerId, 'you')
    assert.equal(game.currentPlayer, 0)
  })

  it('resolves Grotan cut by flushing the field and keeping the same player', () => {
    const game = createScenarioGame()
    game.ruleOptions.grotanCut = true
    game.players[0].hand = [
      createCard('spades', 5),
      createCard('hearts', 7),
      createCard('clubs', 3),
    ]
    game.field = [[createCard('clubs', 2), createCard('diamonds', 3)]]
    game.currentFieldValues = [{ kind: 'finite', value: 23n }]
    game.deck = []

    const result = playCards(game, [0, 1])

    assert.deepEqual(result, {
      ok: true,
      message: '57でグロタンカットです',
      playedCards: [createCard('spades', 5), createCard('hearts', 7)],
    })
    assert.equal(game.field.length, 0)
    assert.deepEqual(game.currentFieldValues, [])
    assert.equal(game.currentPlayer, 0)
    assert.equal(game.deck.length, 4)
    assert.deepEqual(game.logs.slice(-2), [
      'あなたが57を出しました',
      'グロタンカット！',
    ])
  })

  it('can disable Grotan cut through rule options', () => {
    const game = createScenarioGame()
    game.ruleOptions.grotanCut = false
    game.players[0].hand = [
      createCard('spades', 5),
      createCard('hearts', 7),
      createCard('clubs', 3),
    ]

    const result = playCards(game, [0, 1])

    assert.deepEqual(result, {
      ok: false,
      message: 'グロタンカットは現在の設定では使えません',
    })
    assert.equal(game.field.length, 0)
    assert.equal(game.currentPlayer, 0)
  })

  it('resolves Ramanujan revolution by toggling mode and advancing the turn', () => {
    const game = createScenarioGame()
    game.ruleOptions.ramanujanRevolution = true
    game.players[0].hand = [
      createCard('spades', 1),
      createCard('hearts', 7),
      createCard('clubs', 2),
      createCard('diamonds', 9),
      createCard('clubs', 3),
    ]

    const result = playCards(game, [0, 1, 2, 3])

    assert.equal(result.ok, true)
    assert.equal(result.message, '1729でラマヌジャン革命です')
    assert.equal(game.mode, 'revolution')
    assert.deepEqual(game.currentFieldValues, [{ kind: 'finite', value: 1729n }])
    assert.equal(game.currentPlayer, 1)
    assert.deepEqual(game.field.map(cards => cards.map(card => card.id)), [
      ['spades-1', 'hearts-7', 'clubs-2', 'diamonds-9'],
    ])
    assert.deepEqual(game.logs.slice(-2), [
      'あなたが1729を出しました',
      'ラマヌジャン革命！',
    ])
  })

  it('lets the game continue after a prime is played during revolution', () => {
    const game = createScenarioGame()
    game.ruleOptions.ramanujanRevolution = true
    game.players[0].hand = [
      createCard('spades', 1),
      createCard('hearts', 7),
      createCard('clubs', 2),
      createCard('diamonds', 9),
      createCard('clubs', 1),
      createCard('hearts', 6),
      createCard('diamonds', 6),
      createCard('spades', 7),
      createCard('spades', 8),
    ]
    game.players[1].hand = [createCard('clubs', 5)]

    const revolution = playCards(game, [0, 1, 2, 3])
    assert.equal(revolution.ok, true)
    assert.equal(game.mode, 'revolution')
    assert.equal(game.currentPlayer, 1)

    const cpuPass = playCpuTurn(game)
    assert.equal(cpuPass.ok, true)
    assert.equal(game.currentPlayer, 0)
    assert.equal(game.mode, 'revolution')

    const primeAfterRevolution = playCards(game, [0, 1, 2, 3])
    assert.equal(primeAfterRevolution.ok, true)
    assert.equal(primeAfterRevolution.message, '1667は素数です')
    assert.equal(game.currentPlayer, 1)

    const cpuPassAgain = playCpuTurn(game)
    assert.equal(cpuPassAgain.ok, true)
    assert.equal(game.currentPlayer, 0)
  })

  it('can disable Ramanujan revolution through rule options', () => {
    const game = createScenarioGame()
    game.ruleOptions.ramanujanRevolution = false
    game.players[0].hand = [
      createCard('spades', 1),
      createCard('hearts', 7),
      createCard('clubs', 2),
      createCard('diamonds', 9),
      createCard('clubs', 3),
    ]

    const result = playCards(game, [0, 1, 2, 3])

    assert.deepEqual(result, {
      ok: false,
      message: 'ラマヌジャン革命は現在の設定では使えません',
    })
    assert.equal(game.mode, 'normal')
    assert.equal(game.field.length, 0)
    assert.equal(game.currentPlayer, 0)
  })

  it('resolves a single joker as infinity by flushing the field and keeping the same player', () => {
    const game = createScenarioGame()
    const joker = createJoker('black')
    game.players[0].hand = [joker, createCard('hearts', 3)]
    game.field = [[createCard('clubs', 2)]]
    game.currentFieldValues = [{ kind: 'finite', value: 2n }]
    game.deck = []

    const result = playCards(game, [0])

    assert.equal(result.ok, true)
    assert.equal(result.message, 'ジョーカーで場を流しました')
    assert.equal(game.field.length, 0)
    assert.deepEqual(game.currentFieldValues, [])
    assert.equal(game.currentPlayer, 0)
    assert.equal(game.deck.length, 2)
  })

  it('auto-assigns joker values to maximize prime evaluation on multi-card plays', () => {
    const game = createScenarioGame()
    const joker = createJoker('black')
    game.players[0].hand = [joker, createCard('hearts', 11), createCard('clubs', 4)]

    const result = playCards(game, [0, 1])

    assert.equal(result.ok, true)
    assert.equal(result.message, '911は素数です')
    assert.deepEqual(game.currentFieldValues, [{ kind: 'finite', value: 911n }])
    assert.deepEqual(game.logs.slice(-2), [
      'あなたが911を出しました',
      '911は素数です！',
    ])
  })

  it('auto-assigns joker values during revolution using legal values under the field', () => {
    const game = createScenarioGame()
    const joker = createJoker('black')
    game.mode = 'revolution'
    game.field = [[createCard('spades', 1), createCard('hearts', 2)]]
    game.currentFieldValues = [{ kind: 'finite', value: 1000n }]
    game.players[0].hand = [joker, createCard('hearts', 11), createCard('clubs', 4)]

    const result = playCards(game, [0, 1])

    assert.equal(result.ok, true)
    assert.equal(result.message, '911は素数です')
    assert.deepEqual(game.currentFieldValues, [{ kind: 'finite', value: 1000n }, { kind: 'finite', value: 911n }])
  })

  it('treats double jokers as infinity and flushes the field', () => {
    const game = createScenarioGame()
    game.players[0].hand = [createJoker('black'), createJoker('red'), createCard('clubs', 2)]
    game.field = [[createCard('diamonds', 12), createCard('spades', 13)]]
    game.currentFieldValues = [{ kind: 'finite', value: 1213n }]
    game.deck = []

    const result = playCards(game, [0, 1])

    assert.equal(result.ok, true)
    assert.equal(result.message, 'ジョーカーで場を流しました')
    assert.deepEqual(game.currentFieldValues, [])
    assert.equal(game.field.length, 0)
  })

  it('draws at most once per turn', () => {
    const game = createScenarioGame()
    game.deck = [createCard('spades', 7), createCard('hearts', 5)]

    const firstDraw = drawCard(game)
    const secondDraw = drawCard(game)

    assert.equal(firstDraw.ok, true)
    assert.equal(firstDraw.drawnCard?.id, 'hearts-5')
    assert.equal(secondDraw.ok, false)
    assert.equal(secondDraw.message, 'この手番ではすでにドローしています')
    assert.equal(game.players[0].hand.some(card => card.id === 'hearts-5'), true)
    assert.equal(game.deck.length, 1)
  })

  it('sorts jokers to the far right in hand after drawing', () => {
    const game = createScenarioGame()
    const joker = createJoker('black')
    game.players[0].hand = [createCard('spades', 8), createCard('hearts', 3)]
    game.deck = [joker]

    const result = drawCard(game)

    assert.equal(result.ok, true)
    assert.deepEqual(game.players[0].hand.map(card => card.id), [
      'hearts-3',
      'spades-8',
      joker.id,
    ])
  })

  it('passes, clears a non-empty field, starts the next round, and advances the turn', () => {
    const game = createScenarioGame()
    game.field = [[createCard('spades', 2)]]
    game.deck = []

    const result = passTurn(game)

    assert.equal(result.ok, true)
    assert.equal(game.field.length, 0)
    assert.equal(game.deck.length, 1)
    assert.equal(game.round, 2)
    assert.equal(game.currentPlayer, 1)
  })

  it('keeps an empty field when not every player has passed', () => {
    const game = createScenarioGame()

    const result = passTurn(game)

    assert.equal(result.ok, true)
    assert.equal(game.field.length, 0)
    assert.equal(game.round, 1)
    assert.equal(game.currentPlayer, 1)
    assert.equal(game.players[0].isPassed, true)
  })

  it('blocks draw/pass/play actions after winner is decided', () => {
    const game = createScenarioGame()
    game.winnerId = 'you'
    game.players[0].hand = [createCard('spades', 2)]
    game.deck = [createCard('hearts', 5)]

    const drawResult = drawCard(game)
    const passResult = passTurn(game)
    const playResult = playCards(game, [0])

    assert.equal(drawResult.ok, false)
    assert.equal(passResult.ok, false)
    assert.equal(playResult.ok, false)
    assert.equal(drawResult.message, 'ゲームは終了しています。次のゲームを開始してください')
    assert.equal(passResult.message, 'ゲームは終了しています。次のゲームを開始してください')
    assert.equal(playResult.message, 'ゲームは終了しています。次のゲームを開始してください')
    assert.equal(game.players[0].hand.length, 1)
    assert.equal(game.deck.length, 1)
    assert.equal(game.currentPlayer, 0)
  })
})

describe('primeDaifugo CPU', () => {
  it('recommends the same play for a human hand without changing the game', () => {
    const game = createScenarioGame({ penaltyEnabled: false })
    game.players[0].hand = [
      createCard('spades', 4),
      createCard('hearts', 5),
      createCard('clubs', 7),
    ]
    game.field = [[createCard('diamonds', 3)]]
    game.currentFieldValues = [{ kind: 'finite', value: 3n }]

    const recommendation = getCpuTurnRecommendation(game)

    assert.deepEqual(recommendation, {
      action: 'play',
      cards: [game.players[0].hand[1]],
    })
    assert.deepEqual(game.players[0].hand.map(card => card.id), [
      'spades-4',
      'hearts-5',
      'clubs-7',
    ])
    assert.deepEqual(getCpuPlayableHint(game)?.map(card => card.id), ['hearts-5'])
    assert.equal(game.currentPlayer, 0)
  })

  it('recommends drawing, then passing when the CPU has no playable card', () => {
    const game = createScenarioGame({ penaltyEnabled: false })
    game.players[0].hand = [createCard('spades', 4)]
    game.deck = [createCard('hearts', 2)]

    assert.deepEqual(getCpuTurnRecommendation(game), { action: 'draw' })
    assert.equal(getCpuPlayableHint(game), null)

    game.players[0].hasDrawn = true
    assert.deepEqual(getCpuTurnRecommendation(game), { action: 'pass' })
    assert.equal(getCpuPlayableHint(game), null)
  })

  it('finds a one-card prime on the first turn at easy beginner skill', () => {
    const game = createScenarioGame({ penaltyEnabled: false, maxPlayableCards: 2 })
    game.ruleOptions.cpuSkill = { memory: 1, judgement: 1, strategy: 1 }
    game.players[0].hand = [createCard('spades', 2), createCard('hearts', 4)]

    assert.deepEqual(getCpuPlayableHint(game)?.map(card => card.id), ['spades-2'])
  })

  it('finds a two-card prime on the first turn at easy beginner skill', () => {
    const game = createScenarioGame({ penaltyEnabled: false, maxPlayableCards: 2 })
    game.ruleOptions.cpuSkill = { memory: 1, judgement: 1, strategy: 1 }
    game.players[0].hand = [
      createCard('spades', 1),
      createCard('hearts', 1),
      createCard('clubs', 4),
    ]

    assert.deepEqual(
      getCpuPlayableHint(game)?.map(card => card.id),
      ['spades-1', 'hearts-1'],
    )
  })

  it('falls back to a legal prime that a lower-skill CPU does not remember', () => {
    const game = createScenarioGame({ penaltyEnabled: false, maxPlayableCards: 4 })
    game.ruleOptions.cpuSkill = { memory: 1, judgement: 1, strategy: 1 }
    game.players[0].hand = [
      createCard('spades', 1),
      createCard('hearts', 1),
      createCard('clubs', 1),
      createCard('diamonds', 7),
    ]
    game.field = [[
      createCard('spades', 1),
      createCard('hearts', 1),
      createCard('clubs', 1),
      createCard('diamonds', 1),
    ]]
    game.currentFieldValues = [{ kind: 'finite', value: 1111n }]

    assert.deepEqual(getCpuTurnRecommendation(game), { action: 'pass' })
    assert.deepEqual(
      getCpuPlayableHint(game)?.map(card => card.rank).sort(),
      [1, 1, 1, 7],
    )
  })

  it('finds a legal composite play when neither CPU search finds a prime', () => {
    const game = createScenarioGame({ penaltyEnabled: false })
    game.players[0].hand = [
      createCard('spades', 6),
      createCard('hearts', 2),
      createCard('clubs', 3),
    ]
    game.field = [[createCard('diamonds', 5)]]
    game.currentFieldValues = [{ kind: 'finite', value: 5n }]

    assert.deepEqual(getCpuPlayableHint(game)?.map(card => card.id), ['spades-6'])
  })

  it('selects the lowest available simple prime above the field', () => {
    const player = {
      id: 'cpu',
      name: 'CPU',
      isCPU: true,
      selectedCards: [],
      hasDrawn: false,
      isPassed: false,
      hand: [createCard('spades', 4), createCard('hearts', 5), createCard('clubs', 7)],
    }

    const selected = cpuSelectPlay(player, [[createCard('diamonds', 3)]])

    assert.deepEqual(selected.map(card => card.id), ['hearts-5'])
  })

  it('selects a smaller prime during revolution', () => {
    const player = {
      id: 'cpu',
      name: 'CPU',
      isCPU: true,
      selectedCards: [],
      hasDrawn: false,
      isPassed: false,
      hand: [createCard('spades', 4), createCard('hearts', 5), createCard('clubs', 7)],
    }

    const selected = cpuSelectPlay(player, [[createCard('diamonds', 7)]], {
      mode: 'revolution',
      currentFieldValues: [{ kind: 'finite', value: 7n }],
    })

    assert.deepEqual(selected.map(card => card.id), ['hearts-5'])
  })

  it('can open with a three-card play when the configured limit allows it', () => {
    const player = {
      id: 'cpu',
      name: 'CPU',
      isCPU: true,
      selectedCards: [],
      hasDrawn: false,
      isPassed: false,
      hand: [createCard('spades', 4), createCard('hearts', 9), createCard('clubs', 9)],
    }

    const selected = cpuSelectPlay(player, [], {
      maxPlayableCards: 3,
    })

    assert.deepEqual(selected.map(card => card.id), ['spades-4', 'hearts-9', 'clubs-9'])
  })

  it('uses the dominant ordering of the same cards at higher strategy levels', () => {
    const player = {
      hand: [
        createCard('spades', 12),
        createCard('hearts', 13),
        createCard('clubs', 13),
      ],
    }
    const cpuSkill = { memory: 3 as const, judgement: 3 as const, strategy: 2 as const }

    const normal = cpuSelectPlay(player, [], { maxPlayableCards: 3, cpuSkill })
    const revolution = cpuSelectPlay(player, [], {
      mode: 'revolution',
      maxPlayableCards: 3,
      cpuSkill,
    })

    assert.deepEqual(normal.map(card => card.rank), [13, 12, 13])
    assert.deepEqual(revolution.map(card => card.rank), [12, 13, 13])
  })

  it('returns no play when no four-card response beats the current field', () => {
    const player = {
      id: 'cpu',
      name: 'CPU',
      isCPU: true,
      selectedCards: [],
      hasDrawn: false,
      isPassed: false,
      hand: [
        createCard('spades', 2),
        createCard('spades', 4),
        createCard('spades', 6),
        createCard('spades', 8),
      ],
    }

    const selected = cpuSelectPlay(player, [[
      createCard('diamonds', 1),
      createCard('diamonds', 7),
      createCard('diamonds', 2),
      createCard('diamonds', 9),
    ]], {
      mode: 'revolution',
      currentFieldValues: [{ kind: 'finite', value: 1729n }],
    })

    assert.deepEqual(selected, [])
  })

  it('uses remembered three-card primes to consume an even card at memory level 2', () => {
    const player = {
      hand: [createCard('spades', 4), createCard('hearts', 4), createCard('clubs', 9)],
    }

    const selected = cpuSelectPlay(player, [], {
      maxPlayableCards: 3,
      cpuSkill: { memory: 2, judgement: 1, strategy: 1 },
    })

    assert.deepEqual(selected.map(card => card.rank), [4, 4, 9])
  })

  it('applies the configured composite-number checks', () => {
    assert.equal(cpuCanRuleOutComposite(7n, 2), false)
    assert.equal(cpuCanRuleOutComposite(49n, 1), false)
    assert.equal(cpuCanRuleOutComposite(49n, 2), true)
    assert.equal(cpuCanRuleOutComposite(667n, 2), false)
    assert.equal(cpuCanRuleOutComposite(667n, 3), true) // 23 × 29
    assert.equal(cpuCanRuleOutComposite(667n, 'infinity'), true)
  })

  it('takes a calculated prime gamble for an immediate win when penalties are enabled', () => {
    const game = createPrimeDaifugoGame({
      players: [
        { id: 'cpu', name: 'CPU', isCPU: true },
        { id: 'you', name: 'You', isCPU: false },
      ],
      initialHandSize: 0,
      ruleOptions: {
        penaltyEnabled: true,
        maxPlayableCards: 3,
        cpuSkill: { memory: 1, judgement: 1, strategy: 3 },
      },
    })
    game.players[0].hand = [
      createCard('spades', 1),
      createCard('hearts', 2),
      createCard('clubs', 1),
    ]

    const result = playCpuTurn(game)

    assert.equal(result.ok, true)
    assert.equal(result.message, '121は素数ではありません！')
    assert.equal(result.foulReason, 'finite non-prime without valid special rule or factorization')
    assert.equal(game.players[0].hand.length, 6)
    assert.deepEqual(game.logs.slice(-2), [
      'CPUが121を出しました',
      '121は素数ではありません！',
    ])
  })

  it('avoids expensive six-card gamble search even under imminent threat', () => {
    const player = {
      hand: [
        createCard('spades', 1),
        createCard('hearts', 2),
        createCard('clubs', 1),
        createCard('diamonds', 1),
        createCard('spades', 2),
        createCard('hearts', 1),
        createCard('clubs', 4),
      ],
    }
    const fieldCards = Array.from({ length: 6 }, (_, index) =>
      createCard('diamonds', 1 + (index % 1)),
    )

    const selected = cpuSelectPlay(player, [fieldCards], {
      currentFieldValues: [{ kind: 'finite', value: 111111n }],
      penaltyEnabled: true,
      urgentThreat: true,
      cpuSkill: { memory: 3, judgement: 1, strategy: 3 },
    })

    assert.equal(selected.length, 0)
  })

  it('hedges against an opponent scoop sequence after a four-card play', () => {
    const game = createPrimeDaifugoGame({
      players: [
        { id: 'cpu', name: 'CPU', isCPU: true },
        { id: 'you', name: 'You', isCPU: false },
      ],
      initialHandSize: 0,
      ruleOptions: {
        penaltyEnabled: true,
        cpuSkill: { memory: 3, judgement: 1, strategy: 3 },
      },
    })
    game.players[0].hand = [
      createCard('spades', 1),
      createCard('hearts', 2),
      createCard('clubs', 1),
      createCard('diamonds', 1),
      createCard('spades', 5),
    ]
    game.players[1].hand = Array.from({ length: 7 }, (_, index) =>
      createCard('hearts', index + 2),
    )
    game.field = [[
      createCard('hearts', 1), createCard('diamonds', 1),
      createCard('clubs', 1), createCard('spades', 1),
    ]]
    game.currentFieldValues = [{ kind: 'finite', value: 1111n }]

    const result = playCpuTurn(game)

    assert.equal(result.ok, true)
    assert.doesNotMatch(result.message, /パスしました/)
  })
})

function createScenarioGame(
  options: {
    penaltyEnabled?: boolean
    maxPlayableCards?: number | 'infinity'
  } = {},
): PrimeDaifugoGame {
  const game = createPrimeDaifugoGame({
    initialHandSize: 0,
    random: () => 0.5,
    ruleOptions: {
      penaltyEnabled: options.penaltyEnabled ?? true,
      maxPlayableCards: options.maxPlayableCards ?? 'infinity',
    },
  })

  game.deck = []
  game.field = []
  game.currentFieldValues = []
  game.currentPlayer = 0
  game.mode = 'normal'
  game.round = 1
  game.logs = []
  game.winnerId = undefined
  game.players[0].hand = []
  game.players[0].selectedCards = []
  game.players[0].hasDrawn = false
  game.players[0].isPassed = false
  game.players[1].hand = []
  game.players[1].selectedCards = []
  game.players[1].hasDrawn = false
  game.players[1].isPassed = false

  return game
}
