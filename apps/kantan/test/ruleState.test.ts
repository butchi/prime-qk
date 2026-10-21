import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createCard, createJoker } from '../src/lib/cards'
import {
  canViewPlayerHand,
  clearConsiderationTimer,
  createFactorizationDisclosure,
  createGameState,
  createGameViewForPlayer,
  createPlayerView,
  createRepetitionSnapshot,
  defaultRuleSettings,
  determineFirstPlayerByPresentedCards,
  determineInitialPlayerOrder,
  disqualifyPlayer,
  flushFieldAfterFinish,
  flushCardsToDeck,
  flushField,
  finishPlayerIfHandEmpty,
  getElapsedConsiderationSeconds,
  getElapsedGameSeconds,
  getElapsedTurnSeconds,
  getNormalGameResult,
  getTimeLimitGameResult,
  isActivePlayer,
  isConsiderationTimeExpired,
  isGameTimeExpired,
  isGameTimeLimitEnabled,
  isNormalGameOver,
  isTurnTimeExpired,
  nextActivePlayerId,
  recordRepetitionCheckpoint,
  resolveGameTimeLimit,
  resolveGrotanCut,
  resolveOfficialPlay,
  resolveInfinityPlay,
  resolveRamanujanRevolution,
  resolvePresentedCardTurnOrder,
  resolveTurnTimerTimeout,
  resolveTurnTimeout,
  startConsiderationTimer,
  startTurnTimer,
  toggleGameMode,
  type FieldValue,
  type GameState,
} from '../src/lib/ruleState'

describe('official rule state types', () => {
  it('defines the official default rule settings', () => {
    assert.deepEqual(defaultRuleSettings, {
      jokerCount: 2,
      removeEvenCards: false,
      maxMainCards: 'infinity',
      initialHandSize: 7,
      turnOrderRule: 'manual',
      considerationSeconds: 60,
      turnSeconds: 60,
      timeoutAction: 'disqualify',
      factorizationDisclosure: 'none',
      flushRule: 'orderedToBottom',
      gameSeconds: null,
      timeLimitRankRule: 'handCountThenTurnOrder',
      calculationPolicy: 'mentalOnly',
      singleJokerRule: 'infinity',
      doubleJokerInfinity: true,
      infinityFinishRule: 'allowed',
      repetitionRule: 'fourSameEmptyFieldTurns',
      finishFieldFlushRule: 'none',
      openHands: false,
    })
  })

  it('creates an initial official GameState from player inputs', () => {
    const deck = [createCard('spades', 2)]
    const state = createGameState({
      players: [
        { id: 'p1', name: 'P1', hand: [createCard('hearts', 3)] },
        { id: 'p2', name: 'P2', isCPU: true },
      ],
      deck,
      settings: {
        openHands: true,
      },
      gameStartedAtMs: 1000,
    })

    assert.equal(state.turnPlayerId, 'p1')
    assert.equal(state.gameStartedAtMs, 1000)
    assert.equal(state.turnStartedAtMs, 1000)
    assert.equal(state.considerationStartedAtMs, null)
    assert.equal(state.mode, 'normal')
    assert.equal(state.deck, deck)
    assert.deepEqual(state.field, [])
    assert.deepEqual(state.currentFieldValues, [])
    assert.equal(state.consecutiveNoFieldChangeCount, 0)
    assert.deepEqual(state.repetitionSnapshots, [])
    assert.equal(state.settings.openHands, true)
    assert.equal(state.settings.jokerCount, 2)
    assert.deepEqual(
      state.players.map(player => ({
        id: player.id,
        status: player.status,
        handCount: player.hand.length,
      })),
      [
        { id: 'p1', status: 'active', handCount: 1 },
        { id: 'p2', status: 'active', handCount: 0 },
      ],
    )
  })

  it('uses the first active player as the default turn player', () => {
    const state = createGameState({
      players: [
        { id: 'finished', status: 'finished' },
        { id: 'active' },
      ],
    })

    assert.equal(state.turnPlayerId, 'active')
  })

  it('can choose the initial turn order from a first player id', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
        { id: 'p3' },
      ],
      firstPlayerId: 'p2',
    })

    assert.deepEqual(state.players.map(player => player.id), ['p2', 'p3', 'p1'])
    assert.equal(state.turnPlayerId, 'p2')
    assert.equal(nextActivePlayerId(state, 'p2'), 'p3')
    assert.equal(nextActivePlayerId(state, 'p3'), 'p1')
  })

  it('can rotate player order directly', () => {
    const players = [
      { id: 'p1', hand: [], status: 'active' as const },
      { id: 'p2', hand: [], status: 'active' as const },
      { id: 'p3', hand: [], status: 'active' as const },
    ]

    assert.deepEqual(
      determineInitialPlayerOrder(players, 'p3').map(player => player.id),
      ['p3', 'p1', 'p2'],
    )
    assert.equal(determineInitialPlayerOrder(players), players)
  })

  it('throws when the initial first player is unknown', () => {
    assert.throws(
      () =>
        createGameState({
          players: [{ id: 'p1' }],
          firstPlayerId: 'missing',
        }),
      /Unknown player: missing/,
    )
  })

  it('chooses the first player by presented card value and rotates turn order', () => {
    const p1Card = createCard('clubs', 13)
    const p2Card = createCard('spades', 9)
    const p3Card = createCard('hearts', 10)
    const state = createGameState({
      players: [
        { id: 'p1', hand: [p1Card, createCard('diamonds', 2)] },
        { id: 'p2', hand: [p2Card, createCard('diamonds', 3)] },
        { id: 'p3', hand: [p3Card, createCard('diamonds', 5)] },
      ],
      deck: [createCard('hearts', 1)],
      turnStartedAtMs: 1_000,
    })

    const result = resolvePresentedCardTurnOrder(
      state,
      [
        { playerId: 'p1', card: p1Card },
        { playerId: 'p2', card: p2Card },
        { playerId: 'p3', card: p3Card },
      ],
      () => 0,
      5_000,
    )

    assert.deepEqual(result, {
      ok: true,
      firstPlayerId: 'p1',
      orderedPlayerIds: ['p1', 'p2', 'p3'],
      returnedCards: [p2Card, p3Card, p1Card],
    })
    assert.equal(state.turnPlayerId, 'p1')
    assert.equal(state.turnStartedAtMs, 5_000)
    assert.deepEqual(state.players.map(player => player.id), ['p1', 'p2', 'p3'])
    assert.deepEqual(state.players.map(player => player.hand.map(card => card.id)), [
      ['diamonds-2'],
      ['diamonds-3'],
      ['diamonds-5'],
    ])
    assert.deepEqual(state.deck.map(card => card.id), [
      'hearts-1',
      'spades-9',
      'hearts-10',
      'clubs-13',
    ])
  })

  it('breaks presented card ties by suit order', () => {
    const presentations = [
      { playerId: 'club', card: createCard('clubs', 7) },
      { playerId: 'diamond', card: createCard('diamonds', 7) },
      { playerId: 'heart', card: createCard('hearts', 7) },
      { playerId: 'spade', card: createCard('spades', 7) },
    ]

    assert.equal(determineFirstPlayerByPresentedCards(presentations), 'spade')
  })

  it('treats jokers as infinity and breaks joker ties by color', () => {
    const blackJoker = createJoker('black')
    const redJoker = createJoker('red')
    const state = createGameState({
      players: [
        { id: 'p1', hand: [createCard('spades', 13)] },
        { id: 'p2', hand: [redJoker] },
        { id: 'p3', hand: [blackJoker] },
      ],
    })

    const result = resolvePresentedCardTurnOrder(
      state,
      [
        { playerId: 'p1', card: state.players[0].hand[0] },
        { playerId: 'p2', card: redJoker },
        { playerId: 'p3', card: blackJoker },
      ],
      () => 0,
    )

    assert.equal(result.ok && result.firstPlayerId, 'p3')
    assert.deepEqual(state.players.map(player => player.id), ['p3', 'p1', 'p2'])
  })

  it('rejects invalid presented card turn order inputs without mutating state', () => {
    const p1Card = createCard('clubs', 2)
    const p2Card = createCard('diamonds', 3)
    const state = createGameState({
      players: [
        { id: 'p1', hand: [p1Card] },
        { id: 'p2', hand: [p2Card] },
      ],
      deck: [createCard('spades', 13)],
    })

    assert.deepEqual(
      resolvePresentedCardTurnOrder(state, [{ playerId: 'p1', card: p1Card }]),
      { ok: false, reason: 'every active player must present one card' },
    )
    assert.deepEqual(
      resolvePresentedCardTurnOrder(state, [
        { playerId: 'p1', card: p1Card },
        { playerId: 'p2', card: createCard('hearts', 5) },
      ]),
      { ok: false, reason: 'presented cards must be in the player hand' },
    )
    assert.deepEqual(state.players.map(player => player.hand.map(card => card.id)), [
      ['clubs-2'],
      ['diamonds-3'],
    ])
    assert.deepEqual(state.deck.map(card => card.id), ['spades-13'])
  })

  it('initializes game start time when it is omitted', () => {
    const beforeCreateMs = Date.now()
    const state = createGameState({
      players: [{ id: 'p1' }],
    })
    const afterCreateMs = Date.now()

    assert.equal(state.gameStartedAtMs >= beforeCreateMs, true)
    assert.equal(state.gameStartedAtMs <= afterCreateMs, true)
    assert.equal(state.turnStartedAtMs, state.gameStartedAtMs)
  })

  it('throws when no active player exists', () => {
    assert.throws(
      () =>
        createGameState({
          players: [{ id: 'p1', status: 'finished' }],
        }),
      /At least one active player is required/,
    )
  })

  it('can represent field entries and finite or infinite field values', () => {
    const finite: FieldValue = { kind: 'finite', value: 13n }
    const positiveInfinity: FieldValue = { kind: 'positiveInfinity' }
    const negativeInfinity: FieldValue = { kind: 'negativeInfinity' }
    const state: GameState = createGameState({
      players: [{ id: 'p1' }],
      field: [
        {
          playerId: 'p1',
          mainCards: [createCard('clubs', 13)],
          value: finite,
        },
      ],
      currentFieldValues: [finite, positiveInfinity, negativeInfinity],
    })

    assert.equal(state.field[0].value, finite)
    assert.deepEqual(state.currentFieldValues, [
      finite,
      positiveInfinity,
      negativeInfinity,
    ])
  })

  it('checks active player status', () => {
    assert.equal(isActivePlayer({ id: 'p1', hand: [], status: 'active' }), true)
    assert.equal(
      isActivePlayer({ id: 'p1', hand: [], status: 'disqualified' }),
      false,
    )
  })

  it('shows only the viewer own hand when hands are private', () => {
    const p1Hand = [createCard('spades', 2), createCard('hearts', 3)]
    const p2Hand = [createCard('clubs', 5)]
    const state = createGameState({
      players: [
        { id: 'p1', hand: p1Hand },
        { id: 'p2', hand: p2Hand },
      ],
      deck: [createCard('diamonds', 13)],
      field: [
        {
          playerId: 'p2',
          mainCards: [createCard('clubs', 7)],
          value: { kind: 'finite', value: 7n },
        },
      ],
    })

    assert.equal(canViewPlayerHand(state, 'p1', 'p1'), true)
    assert.equal(canViewPlayerHand(state, 'p2', 'p1'), false)

    const view = createGameViewForPlayer(state, 'p1')

    assert.equal(view.viewerPlayerId, 'p1')
    assert.equal(view.deckCount, 1)
    assert.deepEqual(view.players[0].hand, [
      { visible: true, card: p1Hand[0] },
      { visible: true, card: p1Hand[1] },
    ])
    assert.deepEqual(view.players[1].hand, [{ visible: false }])
    assert.equal(view.players[1].handCount, 1)
  })

  it('shows every hand when openHands is enabled', () => {
    const p1Hand = [createCard('spades', 2)]
    const p2Hand = [createCard('clubs', 5)]
    const state = createGameState({
      players: [
        { id: 'p1', hand: p1Hand },
        { id: 'p2', hand: p2Hand },
      ],
      settings: {
        openHands: true,
      },
    })

    const p2View = createPlayerView(state, state.players[1], 'p1')
    const spectatorView = createGameViewForPlayer(state)

    assert.deepEqual(p2View.hand, [{ visible: true, card: p2Hand[0] }])
    assert.deepEqual(spectatorView.players[0].hand, [
      { visible: true, card: p1Hand[0] },
    ])
    assert.deepEqual(spectatorView.players[1].hand, [
      { visible: true, card: p2Hand[0] },
    ])
  })

  it('hides all hands from spectators when hands are private', () => {
    const state = createGameState({
      players: [
        { id: 'p1', hand: [createCard('spades', 2)] },
        { id: 'p2', hand: [createCard('clubs', 5)] },
      ],
    })

    const view = createGameViewForPlayer(state)

    assert.deepEqual(view.players.map(player => player.hand), [
      [{ visible: false }],
      [{ visible: false }],
    ])
  })

  it('toggles normal and revolution modes', () => {
    assert.equal(toggleGameMode('normal'), 'revolution')
    assert.equal(toggleGameMode('revolution'), 'normal')
  })

  it('finds the next active player while skipping inactive players', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2', status: 'finished' },
        { id: 'p3' },
      ],
    })

    assert.equal(nextActivePlayerId(state, 'p1'), 'p3')
    assert.equal(nextActivePlayerId(state, 'p3'), 'p1')
  })

  it('flushes field cards to the bottom of the deck in ascending order by default', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      deck: [createCard('hearts', 13)],
      field: [
        {
          playerId: 'p1',
          mainCards: [createCard('spades', 7), createCard('clubs', 2)],
          value: { kind: 'finite', value: 72n },
        },
        {
          playerId: 'p1',
          mainCards: [createCard('diamonds', 2), createCard('hearts', 5)],
          value: { kind: 'finite', value: 25n },
        },
      ],
      currentFieldValues: [
        { kind: 'finite', value: 72n },
        { kind: 'finite', value: 25n },
      ],
      consecutiveNoFieldChangeCount: 1,
    })

    flushField(state)

    assert.deepEqual(state.deck.map(card => card.id), [
      'hearts-13',
      'clubs-2',
      'diamonds-2',
      'hearts-5',
      'spades-7',
    ])
    assert.deepEqual(state.field, [])
    assert.deepEqual(state.currentFieldValues, [])
    assert.equal(state.consecutiveNoFieldChangeCount, 0)
  })

  it('can shuffle only flushed cards before putting them under the deck', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      deck: [createCard('hearts', 13)],
      settings: { flushRule: 'shuffleFlushedToBottom' },
    })

    flushCardsToDeck(
      state,
      [createCard('spades', 2), createCard('clubs', 3), createCard('hearts', 5)],
      () => 0,
    )

    assert.deepEqual(state.deck.map(card => card.id), [
      'hearts-13',
      'clubs-3',
      'hearts-5',
      'spades-2',
    ])
  })

  it('can shuffle flushed cards together with the deck', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      deck: [createCard('hearts', 13)],
      settings: { flushRule: 'shuffleWithDeck' },
    })

    flushCardsToDeck(
      state,
      [createCard('spades', 2), createCard('clubs', 3), createCard('hearts', 5)],
      () => 0,
    )

    assert.deepEqual(state.deck.map(card => card.id), [
      'spades-2',
      'clubs-3',
      'hearts-5',
      'hearts-13',
    ])
  })

  it('resolves Grotan cut by flushing the field and keeping the same turn player', () => {
    const mainCards = [createCard('spades', 5), createCard('hearts', 7)]
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      deck: [createCard('clubs', 13)],
      field: [
        {
          playerId: 'p2',
          mainCards: [createCard('clubs', 3)],
          value: { kind: 'finite', value: 3n },
        },
      ],
      currentFieldValues: [{ kind: 'finite', value: 3n }],
      consecutiveNoFieldChangeCount: 1,
    })

    resolveGrotanCut(state, 'p1', mainCards)

    assert.equal(state.turnPlayerId, 'p1')
    assert.deepEqual(state.field, [])
    assert.deepEqual(state.currentFieldValues, [])
    assert.equal(state.consecutiveNoFieldChangeCount, 0)
    assert.deepEqual(state.deck.map(card => card.id), [
      'clubs-13',
      'clubs-3',
      'spades-5',
      'hearts-7',
    ])
  })

  it('resolves an infinity play by flushing the field and keeping the same turn player', () => {
    const joker = createJoker('black')
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      deck: [createCard('clubs', 13)],
      field: [
        {
          playerId: 'p2',
          mainCards: [createCard('clubs', 3)],
          value: { kind: 'finite', value: 3n },
        },
      ],
      currentFieldValues: [{ kind: 'finite', value: 3n }],
      consecutiveNoFieldChangeCount: 1,
    })

    resolveInfinityPlay(state, 'p1', [joker])

    assert.equal(state.mode, 'normal')
    assert.equal(state.turnPlayerId, 'p1')
    assert.deepEqual(state.field, [])
    assert.deepEqual(state.currentFieldValues, [])
    assert.equal(state.consecutiveNoFieldChangeCount, 0)
    assert.deepEqual(state.deck.map(card => card.id), [
      'clubs-13',
      'joker-black',
      'clubs-3',
    ])
  })

  it('keeps revolution mode when resolving a revolution infinity play', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
      ],
      mode: 'revolution',
      turnPlayerId: 'p1',
      field: [
        {
          playerId: 'p2',
          mainCards: [createCard('clubs', 3)],
          value: { kind: 'finite', value: 3n },
        },
      ],
      currentFieldValues: [{ kind: 'finite', value: 3n }],
    })

    resolveInfinityPlay(state, 'p1', [createJoker('red')])

    assert.equal(state.mode, 'revolution')
    assert.equal(state.turnPlayerId, 'p1')
    assert.deepEqual(state.field, [])
    assert.deepEqual(state.currentFieldValues, [])
  })

  it('resolves Ramanujan revolution by pushing 1729 and flipping the mode', () => {
    const mainCards = [
      createCard('spades', 1),
      createCard('hearts', 7),
      createCard('clubs', 2),
      createCard('diamonds', 9),
    ]
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2', status: 'finished' },
        { id: 'p3' },
      ],
      currentFieldValues: [
        { kind: 'finite', value: 101n },
        { kind: 'finite', value: 103n },
      ],
      consecutiveNoFieldChangeCount: 2,
    })

    resolveRamanujanRevolution(state, 'p1', mainCards)

    assert.equal(state.mode, 'revolution')
    assert.equal(state.turnPlayerId, 'p3')
    assert.equal(state.consecutiveNoFieldChangeCount, 0)
    assert.deepEqual(state.field, [
      {
        playerId: 'p1',
        mainCards,
        value: { kind: 'finite', value: 1729n },
      },
    ])
    assert.deepEqual(state.currentFieldValues, [
      { kind: 'finite', value: 1729n },
    ])
  })

  it('resolves a finite prime play through the official play entry point', () => {
    const mainCards = [createCard('spades', 1), createCard('hearts', 7)]
    const state = createGameState({
      players: [
        { id: 'p1', hand: [...mainCards, createCard('clubs', 4)] },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      currentFieldValues: [{ kind: 'finite', value: 13n }],
    })

    const result = resolveOfficialPlay(state, { mainCards })

    assert.deepEqual(result, {
      ok: true,
      value: { kind: 'finite', value: 17n },
      kind: 'prime',
    })
    assert.deepEqual(state.players[0].hand.map(card => card.id), ['clubs-4'])
    assert.deepEqual(state.field, [
      {
        playerId: 'p1',
        mainCards,
        value: { kind: 'finite', value: 17n },
      },
    ])
    assert.deepEqual(state.currentFieldValues, [
      { kind: 'finite', value: 13n },
      { kind: 'finite', value: 17n },
    ])
    assert.equal(state.turnPlayerId, 'p2')
    assert.equal(state.consecutiveNoFieldChangeCount, 0)
  })

  it('marks a player finished after an official play empties their hand', () => {
    const mainCards = [createCard('spades', 1), createCard('hearts', 7)]
    const state = createGameState({
      players: [
        { id: 'p1', hand: mainCards },
        { id: 'p2', status: 'finished', finishOrder: 1 },
        { id: 'p3' },
      ],
      turnPlayerId: 'p1',
    })

    const result = resolveOfficialPlay(state, { mainCards })

    assert.deepEqual(result, {
      ok: true,
      value: { kind: 'finite', value: 17n },
      kind: 'prime',
      finishedPlayerId: 'p1',
    })
    assert.equal(state.players[0].status, 'finished')
    assert.equal(state.players[0].finishOrder, 2)
    assert.equal(state.turnPlayerId, 'p3')
  })

  it('keeps the field after a finish by default', () => {
    const mainCards = [createCard('spades', 1), createCard('hearts', 7)]
    const previousFieldCards = [createCard('clubs', 1), createCard('diamonds', 3)]
    const state = createGameState({
      players: [
        { id: 'p1', hand: mainCards },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      field: [
        {
          playerId: 'p2',
          mainCards: previousFieldCards,
          value: { kind: 'finite', value: 13n },
        },
      ],
      currentFieldValues: [{ kind: 'finite', value: 13n }],
    })

    resolveOfficialPlay(state, { mainCards })

    assert.deepEqual(
      state.field.map(entry => entry.mainCards.map(card => card.id)),
      [
        ['clubs-1', 'diamonds-3'],
        ['spades-1', 'hearts-7'],
      ],
    )
    assert.deepEqual(state.currentFieldValues, [
      { kind: 'finite', value: 13n },
      { kind: 'finite', value: 17n },
    ])
  })

  it('flushes the field after a finish when configured', () => {
    const mainCards = [createCard('spades', 1), createCard('hearts', 7)]
    const previousFieldCards = [createCard('clubs', 1), createCard('diamonds', 3)]
    const state = createGameState({
      players: [
        { id: 'p1', hand: mainCards },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      deck: [createCard('hearts', 13)],
      field: [
        {
          playerId: 'p2',
          mainCards: previousFieldCards,
          value: { kind: 'finite', value: 13n },
        },
      ],
      currentFieldValues: [{ kind: 'finite', value: 13n }],
      settings: {
        finishFieldFlushRule: 'flush',
      },
    })

    const result = resolveOfficialPlay(state, { mainCards })

    assert.deepEqual(result, {
      ok: true,
      value: { kind: 'finite', value: 17n },
      kind: 'prime',
      finishedPlayerId: 'p1',
    })
    assert.deepEqual(state.field, [])
    assert.deepEqual(state.currentFieldValues, [])
    assert.deepEqual(state.deck.map(card => card.id), [
      'hearts-13',
      'clubs-1',
      'spades-1',
      'diamonds-3',
      'hearts-7',
    ])
    assert.equal(state.turnPlayerId, 'p2')
  })

  it('can flush the field after a direct finish helper call', () => {
    const state = createGameState({
      players: [
        { id: 'p1', hand: [] },
        { id: 'p2' },
      ],
      field: [
        {
          playerId: 'p2',
          mainCards: [createCard('clubs', 5)],
          value: { kind: 'finite', value: 5n },
        },
      ],
      currentFieldValues: [{ kind: 'finite', value: 5n }],
      settings: {
        finishFieldFlushRule: 'flush',
      },
    })

    const finishedPlayer = finishPlayerIfHandEmpty(state, 'p1')
    flushFieldAfterFinish(state, finishedPlayer)

    assert.deepEqual(state.field, [])
    assert.deepEqual(state.deck.map(card => card.id), ['clubs-5'])
  })

  it('moves the turn away from a finished infinity player', () => {
    const joker = createJoker('black')
    const state = createGameState({
      players: [
        { id: 'p1', hand: [joker] },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      deck: [createCard('clubs', 13)],
      field: [
        {
          playerId: 'p2',
          mainCards: [createCard('clubs', 3)],
          value: { kind: 'finite', value: 3n },
        },
      ],
      currentFieldValues: [{ kind: 'finite', value: 3n }],
    })

    const result = resolveOfficialPlay(state, { mainCards: [joker] })

    assert.deepEqual(result, {
      ok: true,
      value: { kind: 'positiveInfinity' },
      kind: 'prime',
      finishedPlayerId: 'p1',
    })
    assert.equal(state.players[0].status, 'finished')
    assert.equal(state.turnPlayerId, 'p2')
    assert.deepEqual(state.field, [])
  })

  it('resolves a composite play and flushes factor cards separately', () => {
    const mainCards = [createCard('spades', 7), createCard('hearts', 2)]
    const factorCards = [
      createCard('clubs', 2),
      createCard('diamonds', 3),
      createCard('clubs', 3),
      createCard('diamonds', 2),
    ]
    const state = createGameState({
      players: [
        {
          id: 'p1',
          hand: [...mainCards, ...factorCards, createCard('hearts', 13)],
        },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      deck: [createCard('spades', 13)],
    })

    const result = resolveOfficialPlay(state, {
      mainCards,
      factorGroups: [
        [[factorCards[0]], [factorCards[1]]],
        [[factorCards[2]], [factorCards[3]]],
      ],
    })

    assert.deepEqual(result, {
      ok: true,
      value: { kind: 'finite', value: 72n },
      kind: 'composite',
    })
    assert.deepEqual(state.players[0].hand.map(card => card.id), ['hearts-13'])
    assert.deepEqual(state.field, [
      {
        playerId: 'p1',
        mainCards,
        value: { kind: 'finite', value: 72n },
      },
    ])
    assert.deepEqual(state.deck.map(card => card.id), [
      'spades-13',
      'clubs-2',
      'diamonds-2',
      'clubs-3',
      'diamonds-3',
    ])
    assert.equal(state.turnPlayerId, 'p2')
  })

  it('rejects official plays that reuse cards or are not in hand', () => {
    const card = createCard('spades', 2)
    const state = createGameState({
      players: [
        { id: 'p1', hand: [card] },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
    })

    assert.deepEqual(
      resolveOfficialPlay(state, {
        mainCards: [card],
        factorGroups: [[[card]]],
      }),
      { ok: false, reason: 'cards cannot be used more than once' },
    )
    assert.deepEqual(
      resolveOfficialPlay(state, {
        mainCards: [createCard('hearts', 3)],
      }),
      { ok: false, reason: 'played cards must be in the player hand' },
    )
    assert.deepEqual(state.players[0].hand.map(handCard => handCard.id), [
      'spades-2',
    ])
    assert.deepEqual(state.field, [])
  })

  it('can mark an empty-handed active player finished directly', () => {
    const state = createGameState({
      players: [
        { id: 'p1', hand: [] },
        { id: 'p2' },
      ],
    })

    const finishedPlayer = finishPlayerIfHandEmpty(state, 'p1')

    assert.equal(finishedPlayer?.id, 'p1')
    assert.equal(state.players[0].status, 'finished')
    assert.equal(state.players[0].finishOrder, 1)
    assert.equal(finishPlayerIfHandEmpty(state, 'p1'), null)
  })

  it('disqualifies an active player and skips them for turn order', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2', status: 'finished', finishOrder: 1 },
        { id: 'p3' },
      ],
      turnPlayerId: 'p1',
    })

    const disqualifiedPlayer = disqualifyPlayer(state, 'p1')

    assert.equal(disqualifiedPlayer?.id, 'p1')
    assert.equal(state.players[0].status, 'disqualified')
    assert.equal(state.players[0].disqualifiedOrder, 1)
    assert.equal(state.turnPlayerId, 'p3')
    assert.equal(disqualifyPlayer(state, 'p1'), null)
  })

  it('records disqualification order without moving an unrelated active turn', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
        { id: 'p3', status: 'disqualified', disqualifiedOrder: 1 },
      ],
      turnPlayerId: 'p1',
    })

    const disqualifiedPlayer = disqualifyPlayer(state, 'p2')

    assert.equal(disqualifiedPlayer?.id, 'p2')
    assert.equal(state.players[1].status, 'disqualified')
    assert.equal(state.players[1].disqualifiedOrder, 2)
    assert.equal(state.turnPlayerId, 'p1')
  })

  it('resolves the default timeout action as disqualification', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
    })

    const result = resolveTurnTimeout(state)

    assert.deepEqual(result, {
      ok: true,
      action: 'disqualified',
      disqualifiedPlayerId: 'p1',
    })
    assert.equal(state.players[0].status, 'disqualified')
    assert.equal(state.turnPlayerId, 'p2')
  })

  it('keeps forced pass timeout action explicit until pass resolution exists', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
      ],
      settings: {
        timeoutAction: 'forcedPass',
      },
    })

    assert.deepEqual(resolveTurnTimeout(state), {
      ok: false,
      reason: 'forced pass timeout action is not implemented',
    })
    assert.equal(state.players[0].status, 'active')
  })

  it('does not finish a normal game while two or more players are active', () => {
    const state = createGameState({
      players: [
        { id: 'p1', status: 'finished', finishOrder: 1 },
        { id: 'p2' },
        { id: 'p3' },
      ],
      turnPlayerId: 'p2',
    })

    assert.equal(isNormalGameOver(state), false)
    assert.deepEqual(getNormalGameResult(state), {
      finished: false,
      rankings: [],
    })
  })

  it('ranks finished players, the last active player, then disqualified players in reverse disqualification order', () => {
    const state = createGameState({
      players: [
        { id: 'p1', status: 'finished', finishOrder: 2 },
        { id: 'p2', status: 'disqualified', disqualifiedOrder: 1 },
        { id: 'p3' },
        { id: 'p4', status: 'finished', finishOrder: 1 },
        { id: 'p5', status: 'disqualified', disqualifiedOrder: 2 },
      ],
      turnPlayerId: 'p3',
    })

    assert.equal(isNormalGameOver(state), true)
    assert.deepEqual(getNormalGameResult(state), {
      finished: true,
      rankings: [
        { rank: 1, playerId: 'p4', status: 'finished' },
        { rank: 2, playerId: 'p1', status: 'finished' },
        { rank: 3, playerId: 'p3', status: 'active' },
        { rank: 4, playerId: 'p5', status: 'disqualified' },
        { rank: 5, playerId: 'p2', status: 'disqualified' },
      ],
    })
  })

  it('can rank a game that ended with no active players', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2', status: 'finished', finishOrder: 1 },
      ],
      turnPlayerId: 'p1',
    })

    disqualifyPlayer(state, 'p1')

    assert.deepEqual(getNormalGameResult(state), {
      finished: true,
      rankings: [
        { rank: 1, playerId: 'p2', status: 'finished' },
        { rank: 2, playerId: 'p1', status: 'disqualified' },
      ],
    })
  })

  it('keeps game time interruption disabled when gameSeconds is not set', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      gameStartedAtMs: 1_000,
    })

    assert.equal(isGameTimeLimitEnabled(state), false)
    assert.equal(getElapsedGameSeconds(state, 11_500), 10)
    assert.equal(isGameTimeExpired(state, 11_500), false)
    assert.deepEqual(resolveGameTimeLimit(state, 11_500), {
      interrupted: false,
      elapsedSeconds: 10,
    })
  })

  it('interrupts the game when the configured game time has elapsed', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      gameStartedAtMs: 1_000,
      settings: {
        gameSeconds: 10,
      },
    })

    assert.equal(isGameTimeLimitEnabled(state), true)
    assert.equal(isGameTimeExpired(state, 10_999), false)
    assert.deepEqual(resolveGameTimeLimit(state, 10_999), {
      interrupted: false,
      elapsedSeconds: 9,
    })
    assert.equal(isGameTimeExpired(state, 11_000), true)
    assert.deepEqual(resolveGameTimeLimit(state, 11_000), {
      interrupted: true,
      reason: 'gameTimeLimit',
      elapsedSeconds: 10,
    })
  })

  it('does not rank a time-limited game before the limit expires', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      gameStartedAtMs: 1_000,
      settings: {
        gameSeconds: 10,
      },
    })

    assert.deepEqual(getTimeLimitGameResult(state, 10_999), {
      interrupted: false,
      elapsedSeconds: 9,
      rankings: [],
    })
  })

  it('ranks time-limited games by finish order, hand count, turn order, then disqualification order', () => {
    const state = createGameState({
      players: [
        { id: 'p1', status: 'finished', finishOrder: 1 },
        { id: 'p2', hand: [createCard('spades', 2), createCard('hearts', 3)] },
        {
          id: 'p3',
          hand: [
            createCard('clubs', 2),
            createCard('diamonds', 3),
            createCard('spades', 5),
          ],
        },
        {
          id: 'p4',
          hand: [
            createCard('clubs', 7),
            createCard('diamonds', 11),
            createCard('hearts', 13),
          ],
        },
        { id: 'p5', status: 'disqualified', disqualifiedOrder: 1 },
        { id: 'p6', status: 'disqualified', disqualifiedOrder: 2 },
      ],
      turnPlayerId: 'p3',
      gameStartedAtMs: 1_000,
      settings: {
        gameSeconds: 10,
      },
    })

    assert.deepEqual(getTimeLimitGameResult(state, 11_000), {
      interrupted: true,
      reason: 'gameTimeLimit',
      elapsedSeconds: 10,
      rankings: [
        { rank: 1, playerId: 'p1', status: 'finished' },
        { rank: 2, playerId: 'p2', status: 'active' },
        { rank: 3, playerId: 'p3', status: 'active' },
        { rank: 4, playerId: 'p4', status: 'active' },
        { rank: 5, playerId: 'p6', status: 'disqualified' },
        { rank: 6, playerId: 'p5', status: 'disqualified' },
      ],
    })
  })

  it('starts and clears official turn timers', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      gameStartedAtMs: 1_000,
      turnStartedAtMs: 2_000,
      considerationStartedAtMs: 3_000,
    })

    startTurnTimer(state, 'p2', 5_000)

    assert.equal(state.turnPlayerId, 'p2')
    assert.equal(state.turnStartedAtMs, 5_000)
    assert.equal(state.considerationStartedAtMs, null)
    assert.equal(getElapsedTurnSeconds(state, 16_500), 11)

    startConsiderationTimer(state, 7_000)

    assert.equal(state.considerationStartedAtMs, 7_000)
    assert.equal(getElapsedConsiderationSeconds(state, 12_500), 5)

    clearConsiderationTimer(state)

    assert.equal(state.considerationStartedAtMs, null)
    assert.equal(getElapsedConsiderationSeconds(state, 12_500), null)
  })

  it('checks consideration and turn time limits at their configured boundaries', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      turnStartedAtMs: 1_000,
      considerationStartedAtMs: 3_000,
      settings: {
        considerationSeconds: 5,
        turnSeconds: 10,
      },
    })

    assert.equal(isConsiderationTimeExpired(state, 7_999), false)
    assert.equal(isConsiderationTimeExpired(state, 8_000), true)
    assert.equal(isTurnTimeExpired(state, 10_999), false)
    assert.equal(isTurnTimeExpired(state, 11_000), true)
  })

  it('keeps active players untouched while official turn timers are within limits', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      turnStartedAtMs: 1_000,
      settings: {
        turnSeconds: 10,
      },
    })

    assert.deepEqual(resolveTurnTimerTimeout(state, 10_999), {
      timedOut: false,
      elapsedTurnSeconds: 9,
      elapsedConsiderationSeconds: null,
    })
    assert.equal(state.players[0].status, 'active')
    assert.equal(state.turnPlayerId, 'p1')
  })

  it('resolves consideration timeout through the configured timeout action', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      turnStartedAtMs: 1_000,
      considerationStartedAtMs: 3_000,
      settings: {
        considerationSeconds: 5,
        turnSeconds: 30,
      },
    })

    assert.deepEqual(resolveTurnTimerTimeout(state, 8_000), {
      timedOut: true,
      timer: 'consideration',
      elapsedSeconds: 5,
      timeoutResult: {
        ok: true,
        action: 'disqualified',
        disqualifiedPlayerId: 'p1',
      },
    })
    assert.equal(state.players[0].status, 'disqualified')
    assert.equal(state.turnPlayerId, 'p2')
    assert.equal(state.turnStartedAtMs, 8_000)
    assert.equal(state.considerationStartedAtMs, null)
  })

  it('resolves turn timeout when no consideration timer is running', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
      turnStartedAtMs: 1_000,
      settings: {
        turnSeconds: 10,
      },
    })

    assert.deepEqual(resolveTurnTimerTimeout(state, 11_000), {
      timedOut: true,
      timer: 'turn',
      elapsedSeconds: 10,
      timeoutResult: {
        ok: true,
        action: 'disqualified',
        disqualifiedPlayerId: 'p1',
      },
    })
    assert.equal(state.players[0].status, 'disqualified')
    assert.equal(state.turnPlayerId, 'p2')
    assert.equal(state.turnStartedAtMs, 11_000)
  })

  it('keeps factorization disclosure disabled by default', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
    })

    assert.deepEqual(
      createFactorizationDisclosure(state, {
        isFoul: true,
        value: { kind: 'finite', value: 72n },
      }),
      { available: false, revealed: false, reason: 'disabled' },
    )
  })

  it('makes foul factorization available on request without revealing it automatically', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      settings: {
        factorizationDisclosure: 'onRequestAfterFoul',
      },
    })

    assert.deepEqual(
      createFactorizationDisclosure(state, {
        isFoul: true,
        value: { kind: 'finite', value: 72n },
      }),
      {
        available: true,
        revealed: false,
        value: 72n,
        factors: [
          { prime: 2n, exponent: 3 },
          { prime: 3n, exponent: 2 },
        ],
      },
    )
    assert.deepEqual(
      createFactorizationDisclosure(state, {
        isFoul: true,
        requested: true,
        value: { kind: 'finite', value: 72n },
      }),
      {
        available: true,
        revealed: true,
        value: 72n,
        factors: [
          { prime: 2n, exponent: 3 },
          { prime: 3n, exponent: 2 },
        ],
      },
    )
  })

  it('reveals foul factorization automatically when configured', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      settings: {
        factorizationDisclosure: 'alwaysAfterFoul',
      },
    })

    assert.deepEqual(
      createFactorizationDisclosure(state, {
        isFoul: true,
        value: { kind: 'finite', value: 13n },
      }),
      {
        available: true,
        revealed: true,
        value: 13n,
        factors: [{ prime: 13n, exponent: 1 }],
      },
    )
  })

  it('does not disclose factorization when there is no foul or finite factorable value', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      settings: {
        factorizationDisclosure: 'alwaysAfterFoul',
      },
    })

    assert.deepEqual(
      createFactorizationDisclosure(state, {
        isFoul: false,
        value: { kind: 'finite', value: 72n },
      }),
      { available: false, revealed: false, reason: 'notFoul' },
    )
    assert.deepEqual(
      createFactorizationDisclosure(state, {
        isFoul: true,
        value: { kind: 'positiveInfinity' },
      }),
      { available: false, revealed: false, reason: 'nonFinite' },
    )
    assert.deepEqual(
      createFactorizationDisclosure(state, {
        isFoul: true,
        value: { kind: 'finite', value: 1n },
      }),
      { available: false, revealed: false, reason: 'notFactorable' },
    )
  })

  it('creates repetition snapshots from turn player, player statuses, and hands', () => {
    const state = createGameState({
      players: [
        {
          id: 'p1',
          hand: [createCard('spades', 3), createCard('hearts', 2)],
        },
        { id: 'p2' },
      ],
      turnPlayerId: 'p1',
    })

    assert.deepEqual(createRepetitionSnapshot(state), {
      turnPlayerId: 'p1',
      signature: 'p1:active:hearts-2:spades-3|p2:active',
    })
  })

  it('interrupts as repetition when the same empty-field state reaches the same player four times', () => {
    const state = createGameState({
      players: [
        { id: 'p1', hand: [createCard('spades', 2)] },
        { id: 'p2', hand: [createCard('hearts', 3)] },
      ],
      turnPlayerId: 'p1',
    })

    assert.deepEqual(recordRepetitionCheckpoint(state), {
      interrupted: false,
      rankings: [],
    })
    assert.deepEqual(recordRepetitionCheckpoint(state), {
      interrupted: false,
      rankings: [],
    })
    assert.deepEqual(recordRepetitionCheckpoint(state), {
      interrupted: false,
      rankings: [],
    })
    assert.deepEqual(recordRepetitionCheckpoint(state), {
      interrupted: true,
      reason: 'repetition',
      rankings: [
        { rank: 1, playerId: 'p1', status: 'active' },
        { rank: 2, playerId: 'p2', status: 'active' },
      ],
    })
  })

  it('resets repetition snapshots when the field is not empty', () => {
    const state = createGameState({
      players: [
        { id: 'p1' },
        { id: 'p2' },
      ],
      field: [
        {
          playerId: 'p1',
          mainCards: [createCard('spades', 2)],
          value: { kind: 'finite', value: 2n },
        },
      ],
      currentFieldValues: [{ kind: 'finite', value: 2n }],
      repetitionSnapshots: [
        {
          turnPlayerId: 'p1',
          signature: 'stale',
        },
      ],
    })

    assert.deepEqual(recordRepetitionCheckpoint(state), {
      interrupted: false,
      rankings: [],
    })
    assert.deepEqual(state.repetitionSnapshots, [])
  })

  it('does not check repetition when game time is configured', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      settings: {
        gameSeconds: 10,
      },
      repetitionSnapshots: [
        {
          turnPlayerId: 'p1',
          signature: 'stale',
        },
      ],
    })

    assert.deepEqual(recordRepetitionCheckpoint(state), {
      interrupted: false,
      rankings: [],
    })
    assert.deepEqual(state.repetitionSnapshots, [])
  })

  it('can disable repetition checks through RuleSettings', () => {
    const state = createGameState({
      players: [{ id: 'p1' }],
      settings: {
        repetitionRule: 'disabled',
      },
      repetitionSnapshots: [
        {
          turnPlayerId: 'p1',
          signature: 'stale',
        },
      ],
    })

    assert.deepEqual(recordRepetitionCheckpoint(state), {
      interrupted: false,
      rankings: [],
    })
    assert.deepEqual(state.repetitionSnapshots, [])
  })
})
