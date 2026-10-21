import { isJokerCard, shuffleDeck, type CardSuit, type PlayingCard } from './cards'
import { factorizeBigInt, type PrimeFactor } from './primes'
import {
  validateOfficialPlay,
  type FactorGroups,
} from './ruleValues'

export type GameMode = 'normal' | 'revolution'

export type PlayerStatus = 'active' | 'finished' | 'disqualified'

export interface PlayerState {
  id: string
  name?: string
  isCPU?: boolean
  hand: PlayingCard[]
  status: PlayerStatus
  finishOrder?: number
  disqualifiedOrder?: number
}

export type FieldValue =
  | { kind: 'finite'; value: bigint }
  | { kind: 'positiveInfinity' }
  | { kind: 'negativeInfinity' }

export interface FieldEntry {
  playerId: string
  mainCards: PlayingCard[]
  value: FieldValue
}

export type RemoveEvenCards = false | 'half'
export type MaxMainCards = number | 'infinity'
export type TurnOrderRule = 'manual' | 'presentedCards'
export type TimeoutAction = 'disqualify' | 'forcedPass'
export type FactorizationDisclosure =
  | 'none'
  | 'onRequestAfterFoul'
  | 'alwaysAfterFoul'
export type FlushRule =
  | 'orderedToBottom'
  | 'shuffleFlushedToBottom'
  | 'shuffleWithDeck'
export type TimeLimitRankRule = 'handCountThenTurnOrder'
export type CalculationPolicy = 'mentalOnly'
export type SingleJokerRule = 'infinity' | 'finite' | 'both'
export type InfinityFinishRule = 'allowed' | 'forbidden' | 'foul'
export type RepetitionRule = 'disabled' | 'fourSameEmptyFieldTurns'
export type FinishFieldFlushRule = 'none' | 'flush'

export interface RuleSettings {
  jokerCount: number
  removeEvenCards: RemoveEvenCards
  maxMainCards: MaxMainCards
  initialHandSize: number
  turnOrderRule: TurnOrderRule
  considerationSeconds: number
  turnSeconds: number
  timeoutAction: TimeoutAction
  factorizationDisclosure: FactorizationDisclosure
  flushRule: FlushRule
  gameSeconds: number | null
  timeLimitRankRule: TimeLimitRankRule
  calculationPolicy: CalculationPolicy
  singleJokerRule: SingleJokerRule
  doubleJokerInfinity: boolean
  infinityFinishRule: InfinityFinishRule
  repetitionRule: RepetitionRule
  finishFieldFlushRule: FinishFieldFlushRule
  openHands: boolean
}

export interface GameState {
  players: PlayerState[]
  turnPlayerId: string
  gameStartedAtMs: number
  turnStartedAtMs: number
  considerationStartedAtMs: number | null
  mode: GameMode
  deck: PlayingCard[]
  field: FieldEntry[]
  currentFieldValues: FieldValue[]
  consecutiveNoFieldChangeCount: number
  repetitionSnapshots: RepetitionSnapshot[]
  settings: RuleSettings
}

export interface RepetitionSnapshot {
  turnPlayerId: string
  signature: string
}

export interface PlayerRank {
  rank: number
  playerId: string
  status: PlayerStatus
}

export type HandCardView =
  | { visible: true; card: PlayingCard }
  | { visible: false }

export interface PlayerView {
  id: string
  name?: string
  isCPU?: boolean
  status: PlayerStatus
  finishOrder?: number
  disqualifiedOrder?: number
  handCount: number
  hand: HandCardView[]
}

export interface GameView {
  viewerPlayerId?: string
  turnPlayerId: string
  mode: GameMode
  deckCount: number
  field: FieldEntry[]
  currentFieldValues: FieldValue[]
  players: PlayerView[]
}

export type NormalGameResult =
  | { finished: true; rankings: PlayerRank[] }
  | { finished: false; rankings: [] }

export type GameTimeLimitResult =
  | { interrupted: true; reason: 'gameTimeLimit'; elapsedSeconds: number }
  | { interrupted: false; elapsedSeconds: number }

export type TimeLimitGameResult =
  | {
      interrupted: true
      reason: 'gameTimeLimit'
      elapsedSeconds: number
      rankings: PlayerRank[]
    }
  | { interrupted: false; elapsedSeconds: number; rankings: [] }

export type RepetitionGameResult =
  | { interrupted: true; reason: 'repetition'; rankings: PlayerRank[] }
  | { interrupted: false; rankings: [] }

export interface OfficialPlayInput {
  playerId?: string
  mainCards: PlayingCard[]
  factorGroups?: FactorGroups
  jokerValueByCardId?: ReadonlyMap<string, number>
  random?: () => number
  nowMs?: number
}

export type OfficialPlayResult =
  | {
      ok: true
      value: FieldValue
      kind: 'prime' | 'grotanCut' | 'ramanujanRevolution' | 'composite'
      finishedPlayerId?: string
    }
  | { ok: false; reason: string }

export type TurnTimeoutResult =
  | { ok: true; action: 'disqualified'; disqualifiedPlayerId: string }
  | { ok: false; reason: string }

export type TurnTimerKind = 'consideration' | 'turn'

export type TurnTimerTimeoutResult =
  | {
      timedOut: false
      elapsedTurnSeconds: number
      elapsedConsiderationSeconds: number | null
    }
  | {
      timedOut: true
      timer: TurnTimerKind
      elapsedSeconds: number
      timeoutResult: TurnTimeoutResult
    }

export interface FactorizationDisclosureInput {
  isFoul: boolean
  value?: FieldValue
  requested?: boolean
}

export type FactorizationDisclosureResult =
  | {
      available: false
      revealed: false
      reason: 'notFoul' | 'disabled' | 'nonFinite' | 'notFactorable'
    }
  | {
      available: true
      revealed: false
      value: bigint
      factors: PrimeFactor[]
    }
  | {
      available: true
      revealed: true
      value: bigint
      factors: PrimeFactor[]
    }

export interface PresentedTurnOrderCard {
  playerId: string
  card: PlayingCard
}

export type PresentedTurnOrderResult =
  | {
      ok: true
      firstPlayerId: string
      orderedPlayerIds: string[]
      returnedCards: PlayingCard[]
    }
  | { ok: false; reason: string }

export const defaultRuleSettings: RuleSettings = {
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
}

export interface CreateGameStateOptions {
  players: Array<{
    id: string
    name?: string
    isCPU?: boolean
    hand?: PlayingCard[]
    status?: PlayerStatus
    finishOrder?: number
    disqualifiedOrder?: number
  }>
  firstPlayerId?: string
  turnPlayerId?: string
  gameStartedAtMs?: number
  turnStartedAtMs?: number
  considerationStartedAtMs?: number | null
  deck?: PlayingCard[]
  mode?: GameMode
  field?: FieldEntry[]
  currentFieldValues?: FieldValue[]
  consecutiveNoFieldChangeCount?: number
  repetitionSnapshots?: RepetitionSnapshot[]
  settings?: Partial<RuleSettings>
}

export function createGameState(options: CreateGameStateOptions): GameState {
  const players = determineInitialPlayerOrder(
    options.players.map(createPlayerState),
    options.firstPlayerId,
  )
  const turnPlayerId = options.turnPlayerId ?? options.firstPlayerId ??
    players.find(isActivePlayer)?.id
  const gameStartedAtMs = options.gameStartedAtMs ?? Date.now()

  if (!turnPlayerId) {
    throw new Error('At least one active player is required')
  }

  if (!players.some(player => player.id === turnPlayerId)) {
    throw new Error(`Unknown player: ${turnPlayerId}`)
  }

  return {
    players,
    turnPlayerId,
    gameStartedAtMs,
    turnStartedAtMs: options.turnStartedAtMs ?? gameStartedAtMs,
    considerationStartedAtMs: options.considerationStartedAtMs ?? null,
    mode: options.mode ?? 'normal',
    deck: options.deck ?? [],
    field: options.field ?? [],
    currentFieldValues: options.currentFieldValues ?? [],
    consecutiveNoFieldChangeCount: options.consecutiveNoFieldChangeCount ?? 0,
    repetitionSnapshots: options.repetitionSnapshots ?? [],
    settings: {
      ...defaultRuleSettings,
      ...options.settings,
    },
  }
}

export function createPlayerState(
  player: CreateGameStateOptions['players'][number],
): PlayerState {
  return {
    id: player.id,
    name: player.name,
    isCPU: player.isCPU,
    hand: player.hand ?? [],
    status: player.status ?? 'active',
    finishOrder: player.finishOrder,
    disqualifiedOrder: player.disqualifiedOrder,
  }
}

export function determineInitialPlayerOrder(
  players: PlayerState[],
  firstPlayerId?: string,
): PlayerState[] {
  if (!firstPlayerId) return players

  const firstPlayerIndex = players.findIndex(player => player.id === firstPlayerId)
  if (firstPlayerIndex === -1) {
    throw new Error(`Unknown player: ${firstPlayerId}`)
  }

  return [
    ...players.slice(firstPlayerIndex),
    ...players.slice(0, firstPlayerIndex),
  ]
}

export function determineFirstPlayerByPresentedCards(
  presentations: readonly PresentedTurnOrderCard[],
): string {
  if (presentations.length === 0) {
    throw new Error('At least one presented card is required')
  }

  return [...presentations].sort(comparePresentedTurnOrderCards)[0].playerId
}

export function resolvePresentedCardTurnOrder(
  state: GameState,
  presentations: readonly PresentedTurnOrderCard[],
  random = Math.random,
  nowMs = Date.now(),
): PresentedTurnOrderResult {
  const validationError = validatePresentedTurnOrder(state, presentations)
  if (validationError) return { ok: false, reason: validationError }

  const firstPlayerId = determineFirstPlayerByPresentedCards(presentations)
  const presentationCardIds = presentations.map(presentation => presentation.card.id)
  const presentationCardIdSet = new Set(presentationCardIds)

  for (const player of state.players) {
    if (!isActivePlayer(player)) continue

    player.hand = player.hand.filter(card => !presentationCardIdSet.has(card.id))
  }

  const returnedCards = presentations.map(presentation => presentation.card)
  shuffleDeck(returnedCards, random)
  state.deck.push(...returnedCards)
  state.players = determineInitialPlayerOrder(state.players, firstPlayerId)
  startTurnTimer(state, firstPlayerId, nowMs)

  return {
    ok: true,
    firstPlayerId,
    orderedPlayerIds: state.players.map(player => player.id),
    returnedCards,
  }
}

export function isActivePlayer(player: PlayerState): boolean {
  return player.status === 'active'
}

export function getActivePlayers(state: GameState): PlayerState[] {
  return state.players.filter(isActivePlayer)
}

export function isNormalGameOver(state: GameState): boolean {
  return getActivePlayers(state).length <= 1
}

export function getNormalGameResult(state: GameState): NormalGameResult {
  if (!isNormalGameOver(state)) return { finished: false, rankings: [] }

  return {
    finished: true,
    rankings: buildNormalRankings(state),
  }
}

export function canViewPlayerHand(
  state: GameState,
  targetPlayerId: string,
  viewerPlayerId?: string,
): boolean {
  return state.settings.openHands || targetPlayerId === viewerPlayerId
}

export function createPlayerView(
  state: GameState,
  player: PlayerState,
  viewerPlayerId?: string,
): PlayerView {
  const handVisible = canViewPlayerHand(state, player.id, viewerPlayerId)

  return {
    id: player.id,
    name: player.name,
    isCPU: player.isCPU,
    status: player.status,
    finishOrder: player.finishOrder,
    disqualifiedOrder: player.disqualifiedOrder,
    handCount: player.hand.length,
    hand: player.hand.map(card => handVisible
      ? { visible: true, card }
      : { visible: false }),
  }
}

export function createGameViewForPlayer(
  state: GameState,
  viewerPlayerId?: string,
): GameView {
  return {
    viewerPlayerId,
    turnPlayerId: state.turnPlayerId,
    mode: state.mode,
    deckCount: state.deck.length,
    field: state.field,
    currentFieldValues: state.currentFieldValues,
    players: state.players.map(player =>
      createPlayerView(state, player, viewerPlayerId),
    ),
  }
}

export function getElapsedGameSeconds(
  state: GameState,
  nowMs = Date.now(),
): number {
  return Math.max(0, Math.floor((nowMs - state.gameStartedAtMs) / 1000))
}

export function isGameTimeLimitEnabled(state: GameState): boolean {
  return state.settings.gameSeconds !== null
}

export function isGameTimeExpired(state: GameState, nowMs = Date.now()): boolean {
  const gameSeconds = state.settings.gameSeconds
  if (gameSeconds === null) return false

  return getElapsedGameSeconds(state, nowMs) >= gameSeconds
}

export function resolveGameTimeLimit(
  state: GameState,
  nowMs = Date.now(),
): GameTimeLimitResult {
  const elapsedSeconds = getElapsedGameSeconds(state, nowMs)
  if (!isGameTimeExpired(state, nowMs)) {
    return { interrupted: false, elapsedSeconds }
  }

  return { interrupted: true, reason: 'gameTimeLimit', elapsedSeconds }
}

export function getTimeLimitGameResult(
  state: GameState,
  nowMs = Date.now(),
): TimeLimitGameResult {
  const elapsedSeconds = getElapsedGameSeconds(state, nowMs)
  if (!isGameTimeExpired(state, nowMs)) {
    return { interrupted: false, elapsedSeconds, rankings: [] }
  }

  return {
    interrupted: true,
    reason: 'gameTimeLimit',
    elapsedSeconds,
    rankings: buildTimeLimitRankings(state, state.settings.timeLimitRankRule),
  }
}

export function startTurnTimer(
  state: GameState,
  playerId = state.turnPlayerId,
  nowMs = Date.now(),
): void {
  state.turnPlayerId = playerId
  state.turnStartedAtMs = nowMs
  state.considerationStartedAtMs = null
}

export function startConsiderationTimer(
  state: GameState,
  nowMs = Date.now(),
): void {
  state.considerationStartedAtMs = nowMs
}

export function clearConsiderationTimer(state: GameState): void {
  state.considerationStartedAtMs = null
}

export function getElapsedTurnSeconds(
  state: GameState,
  nowMs = Date.now(),
): number {
  return Math.max(0, Math.floor((nowMs - state.turnStartedAtMs) / 1000))
}

export function getElapsedConsiderationSeconds(
  state: GameState,
  nowMs = Date.now(),
): number | null {
  if (state.considerationStartedAtMs === null) return null

  return Math.max(0, Math.floor((nowMs - state.considerationStartedAtMs) / 1000))
}

export function isTurnTimeExpired(state: GameState, nowMs = Date.now()): boolean {
  return getElapsedTurnSeconds(state, nowMs) >= state.settings.turnSeconds
}

export function isConsiderationTimeExpired(
  state: GameState,
  nowMs = Date.now(),
): boolean {
  const elapsedSeconds = getElapsedConsiderationSeconds(state, nowMs)
  if (elapsedSeconds === null) return false

  return elapsedSeconds >= state.settings.considerationSeconds
}

export function resolveTurnTimerTimeout(
  state: GameState,
  nowMs = Date.now(),
): TurnTimerTimeoutResult {
  const elapsedConsiderationSeconds = getElapsedConsiderationSeconds(state, nowMs)
  if (isConsiderationTimeExpired(state, nowMs) && elapsedConsiderationSeconds !== null) {
    return {
      timedOut: true,
      timer: 'consideration',
      elapsedSeconds: elapsedConsiderationSeconds,
      timeoutResult: resolveTurnTimeout(state, state.turnPlayerId, nowMs),
    }
  }

  const elapsedTurnSeconds = getElapsedTurnSeconds(state, nowMs)
  if (isTurnTimeExpired(state, nowMs)) {
    return {
      timedOut: true,
      timer: 'turn',
      elapsedSeconds: elapsedTurnSeconds,
      timeoutResult: resolveTurnTimeout(state, state.turnPlayerId, nowMs),
    }
  }

  return {
    timedOut: false,
    elapsedTurnSeconds,
    elapsedConsiderationSeconds,
  }
}

export function createFactorizationDisclosure(
  state: GameState,
  input: FactorizationDisclosureInput,
): FactorizationDisclosureResult {
  if (!input.isFoul) {
    return { available: false, revealed: false, reason: 'notFoul' }
  }

  if (state.settings.factorizationDisclosure === 'none') {
    return { available: false, revealed: false, reason: 'disabled' }
  }

  if (input.value?.kind !== 'finite') {
    return { available: false, revealed: false, reason: 'nonFinite' }
  }

  const factors = factorizeBigInt(input.value.value)
  if (factors === null) {
    return { available: false, revealed: false, reason: 'notFactorable' }
  }

  return {
    available: true,
    revealed: state.settings.factorizationDisclosure === 'alwaysAfterFoul' ||
      Boolean(input.requested),
    value: input.value.value,
    factors,
  }
}

export function createRepetitionSnapshot(state: GameState): RepetitionSnapshot {
  return {
    turnPlayerId: state.turnPlayerId,
    signature: createRepetitionSignature(state),
  }
}

export function recordRepetitionCheckpoint(state: GameState): RepetitionGameResult {
  if (
    state.settings.repetitionRule === 'disabled' ||
    state.settings.gameSeconds !== null ||
    !isRepetitionCheckEligible(state)
  ) {
    state.repetitionSnapshots = []
    return { interrupted: false, rankings: [] }
  }

  const snapshot = createRepetitionSnapshot(state)
  state.repetitionSnapshots.push(snapshot)

  const occurrenceCount = state.repetitionSnapshots.filter(
    previousSnapshot =>
      previousSnapshot.turnPlayerId === snapshot.turnPlayerId &&
      previousSnapshot.signature === snapshot.signature,
  ).length

  if (occurrenceCount < 4) return { interrupted: false, rankings: [] }

  return {
    interrupted: true,
    reason: 'repetition',
    rankings: buildTimeLimitRankings(state, state.settings.timeLimitRankRule),
  }
}

export function toggleGameMode(mode: GameMode): GameMode {
  return mode === 'normal' ? 'revolution' : 'normal'
}

export function nextActivePlayerId(state: GameState, playerId: string): string {
  const startIndex = state.players.findIndex(player => player.id === playerId)
  if (startIndex === -1) {
    throw new Error(`Unknown player: ${playerId}`)
  }

  for (let offset = 1; offset <= state.players.length; offset++) {
    const player = state.players[(startIndex + offset) % state.players.length]
    if (isActivePlayer(player)) return player.id
  }

  throw new Error('At least one active player is required')
}

export function flushCardsToDeck(
  state: GameState,
  cards: readonly PlayingCard[],
  random = Math.random,
): void {
  if (cards.length === 0) return

  if (state.settings.flushRule === 'shuffleWithDeck') {
    state.deck.push(...cards)
    shuffleDeck(state.deck, random)
    return
  }

  const flushedCards = [...cards]
  if (state.settings.flushRule === 'shuffleFlushedToBottom') {
    shuffleDeck(flushedCards, random)
  } else {
    flushedCards.sort(compareCardsForFlush)
  }

  state.deck.push(...flushedCards)
}

export function flushField(state: GameState, random = Math.random): void {
  if (state.field.length === 0) return

  flushCardsToDeck(
    state,
    state.field.flatMap(entry => entry.mainCards),
    random,
  )
  state.field = []
  state.currentFieldValues = []
  state.consecutiveNoFieldChangeCount = 0
}

export function resolveOfficialPlay(
  state: GameState,
  input: OfficialPlayInput,
): OfficialPlayResult {
  const playerId = input.playerId ?? state.turnPlayerId
  const player = state.players.find(candidate => candidate.id === playerId)
  if (!player) return { ok: false, reason: `Unknown player: ${playerId}` }
  if (!isActivePlayer(player)) return { ok: false, reason: 'player is not active' }
  if (playerId !== state.turnPlayerId) {
    return { ok: false, reason: 'it is not this player turn' }
  }

  const factorGroups = input.factorGroups ?? []
  const factorCards = flattenFactorGroups(factorGroups)
  const selectedCards = [...input.mainCards, ...factorCards]
  const selectedCardIds = selectedCards.map(card => card.id)
  if (new Set(selectedCardIds).size !== selectedCardIds.length) {
    return { ok: false, reason: 'cards cannot be used more than once' }
  }

  const handCardIds = new Set(player.hand.map(card => card.id))
  if (selectedCardIds.some(cardId => !handCardIds.has(cardId))) {
    return { ok: false, reason: 'played cards must be in the player hand' }
  }

  const lastFieldEntry = state.field[state.field.length - 1]
  if (
    lastFieldEntry &&
    input.mainCards.length !== lastFieldEntry.mainCards.length
  ) {
    return { ok: false, reason: 'main card count must match the current field' }
  }

  const validation = validateOfficialPlay(input.mainCards, {
    mode: state.mode,
    settings: state.settings,
    currentFieldValues: state.currentFieldValues,
    factorGroups,
    jokerValueByCardId: input.jokerValueByCardId,
  })
  if (!validation.ok) return { ok: false, reason: validation.reason }

  removeCardsFromHand(player, selectedCardIds)
  flushFactorCards(state, factorCards, input.random)

  const playClass = validation.playClass
  if (playClass.kind === 'prime') {
    if (validation.value.kind === 'finite') {
      resolveFiniteFieldPlay(
        state,
        playerId,
        input.mainCards,
        validation.value,
        input.nowMs,
      )
      const finishedPlayer = finishPlayerIfHandEmpty(state, playerId)
      flushFieldAfterFinish(state, finishedPlayer, input.random)
      repairTurnAfterFinish(state, playerId, input.nowMs)
      return createOfficialPlaySuccess('prime', validation.value, finishedPlayer)
    }

    resolveInfinityPlay(state, playerId, input.mainCards, input.random, input.nowMs)
    const finishedPlayer = finishPlayerIfHandEmpty(state, playerId)
    flushFieldAfterFinish(state, finishedPlayer, input.random)
    repairTurnAfterFinish(state, playerId, input.nowMs)
    return createOfficialPlaySuccess('prime', validation.value, finishedPlayer)
  }

  if (playClass.kind === 'composite') {
    resolveFiniteFieldPlay(
      state,
      playerId,
      input.mainCards,
      validation.value,
      input.nowMs,
    )
    const finishedPlayer = finishPlayerIfHandEmpty(state, playerId)
    flushFieldAfterFinish(state, finishedPlayer, input.random)
    repairTurnAfterFinish(state, playerId, input.nowMs)
    return createOfficialPlaySuccess('composite', validation.value, finishedPlayer)
  }

  if (playClass.kind === 'grotanCut') {
    resolveGrotanCut(state, playerId, input.mainCards, input.random, input.nowMs)
    const finishedPlayer = finishPlayerIfHandEmpty(state, playerId)
    flushFieldAfterFinish(state, finishedPlayer, input.random)
    repairTurnAfterFinish(state, playerId, input.nowMs)
    return createOfficialPlaySuccess('grotanCut', validation.value, finishedPlayer)
  }

  resolveRamanujanRevolution(state, playerId, input.mainCards, input.nowMs)
  const finishedPlayer = finishPlayerIfHandEmpty(state, playerId)
  flushFieldAfterFinish(state, finishedPlayer, input.random)
  repairTurnAfterFinish(state, playerId, input.nowMs)
  return createOfficialPlaySuccess(
    'ramanujanRevolution',
    validation.value,
    finishedPlayer,
  )
}

export function resolveFiniteFieldPlay(
  state: GameState,
  playerId: string,
  mainCards: PlayingCard[],
  value: FieldValue,
  nowMs = Date.now(),
): void {
  state.field.push({ playerId, mainCards, value })
  state.currentFieldValues.push(value)
  startTurnTimer(state, nextActivePlayerId(state, playerId), nowMs)
  state.consecutiveNoFieldChangeCount = 0
}

export function flushFactorCards(
  state: GameState,
  factorCards: readonly PlayingCard[],
  random = Math.random,
): void {
  flushCardsToDeck(state, factorCards, random)
}

export function finishPlayerIfHandEmpty(
  state: GameState,
  playerId: string,
): PlayerState | null {
  const player = state.players.find(candidate => candidate.id === playerId)
  if (!player || !isActivePlayer(player) || player.hand.length > 0) return null

  player.status = 'finished'
  player.finishOrder = nextFinishOrder(state)
  return player
}

export function flushFieldAfterFinish(
  state: GameState,
  finishedPlayer: PlayerState | null,
  random = Math.random,
): void {
  if (!finishedPlayer || state.settings.finishFieldFlushRule === 'none') return

  flushField(state, random)
}

export function disqualifyPlayer(
  state: GameState,
  playerId: string,
  nowMs = Date.now(),
): PlayerState | null {
  const player = state.players.find(candidate => candidate.id === playerId)
  if (!player || !isActivePlayer(player)) return null

  player.status = 'disqualified'
  player.disqualifiedOrder = nextDisqualifiedOrder(state)
  repairTurnAfterInactive(state, playerId, nowMs)
  return player
}

export function resolveTurnTimeout(
  state: GameState,
  playerId = state.turnPlayerId,
  nowMs = Date.now(),
): TurnTimeoutResult {
  if (state.settings.timeoutAction === 'forcedPass') {
    return { ok: false, reason: 'forced pass timeout action is not implemented' }
  }

  const player = disqualifyPlayer(state, playerId, nowMs)
  if (!player) return { ok: false, reason: 'player cannot be disqualified' }

  return {
    ok: true,
    action: 'disqualified',
    disqualifiedPlayerId: player.id,
  }
}

export function resolveGrotanCut(
  state: GameState,
  playerId: string,
  mainCards: PlayingCard[],
  random = Math.random,
  nowMs = Date.now(),
): void {
  const value: FieldValue = { kind: 'finite', value: 57n }

  state.field.push({ playerId, mainCards, value })
  state.currentFieldValues.push(value)
  flushField(state, random)
  startTurnTimer(state, playerId, nowMs)
}

export function resolveInfinityPlay(
  state: GameState,
  playerId: string,
  mainCards: PlayingCard[],
  random = Math.random,
  nowMs = Date.now(),
): void {
  const value: FieldValue = state.mode === 'normal'
    ? { kind: 'positiveInfinity' }
    : { kind: 'negativeInfinity' }

  state.field.push({ playerId, mainCards, value })
  state.currentFieldValues.push(value)
  flushField(state, random)
  startTurnTimer(state, playerId, nowMs)
}

export function resolveRamanujanRevolution(
  state: GameState,
  playerId: string,
  mainCards: PlayingCard[],
  nowMs = Date.now(),
): void {
  const value: FieldValue = { kind: 'finite', value: 1729n }

  state.field.push({ playerId, mainCards, value })
  state.currentFieldValues = [value]
  state.mode = toggleGameMode(state.mode)
  startTurnTimer(state, nextActivePlayerId(state, playerId), nowMs)
  state.consecutiveNoFieldChangeCount = 0
}

function compareCardsForFlush(a: PlayingCard, b: PlayingCard): number {
  if (a.rank !== b.rank) return a.rank - b.rank

  return a.id.localeCompare(b.id)
}

function comparePresentedTurnOrderCards(
  a: PresentedTurnOrderCard,
  b: PresentedTurnOrderCard,
): number {
  const valueCompare = comparePresentedTurnOrderValue(a.card, b.card)
  if (valueCompare !== 0) return valueCompare

  const tieDiff = presentedTurnOrderTieBreaker(b.card) -
    presentedTurnOrderTieBreaker(a.card)
  if (tieDiff !== 0) return tieDiff

  return 0
}

function comparePresentedTurnOrderValue(a: PlayingCard, b: PlayingCard): number {
  const aIsJoker = isJokerCard(a)
  const bIsJoker = isJokerCard(b)
  if (aIsJoker && bIsJoker) return 0
  if (aIsJoker) return -1
  if (bIsJoker) return 1

  return b.rank - a.rank
}

function presentedTurnOrderTieBreaker(card: PlayingCard): number {
  if (isJokerCard(card)) return card.color === 'black' ? 1 : 0
  if (!card.suit) return -1

  return suitTurnOrderValues[card.suit]
}

const suitTurnOrderValues: Record<CardSuit, number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
}

function validatePresentedTurnOrder(
  state: GameState,
  presentations: readonly PresentedTurnOrderCard[],
): string | null {
  const activePlayers = getActivePlayers(state)
  const activePlayerIds = new Set(activePlayers.map(player => player.id))
  const presentedPlayerIds = presentations.map(presentation => presentation.playerId)
  const duplicatePlayerId = firstDuplicate(presentedPlayerIds)
  if (duplicatePlayerId) return `player presented more than one card: ${duplicatePlayerId}`

  for (const playerId of presentedPlayerIds) {
    if (!state.players.some(player => player.id === playerId)) {
      return `Unknown player: ${playerId}`
    }
    if (!activePlayerIds.has(playerId)) return 'player is not active'
  }

  if (presentations.length !== activePlayers.length) {
    return 'every active player must present one card'
  }

  const missingPlayer = activePlayers.find(player => !presentedPlayerIds.includes(player.id))
  if (missingPlayer) return `missing presented card: ${missingPlayer.id}`

  const presentedCardIds = presentations.map(presentation => presentation.card.id)
  const duplicateCardId = firstDuplicate(presentedCardIds)
  if (duplicateCardId) return `card presented more than once: ${duplicateCardId}`

  for (const presentation of presentations) {
    const player = state.players.find(candidate => candidate.id === presentation.playerId)
    const hasCard = player?.hand.some(card => card.id === presentation.card.id)
    if (!hasCard) return 'presented cards must be in the player hand'
  }

  return null
}

function flattenFactorGroups(factorGroups: FactorGroups): PlayingCard[] {
  return factorGroups.flatMap(group => group.flatMap(token => token))
}

function firstDuplicate(values: readonly string[]): string | null {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) return value
    seen.add(value)
  }

  return null
}

function removeCardsFromHand(player: PlayerState, cardIds: readonly string[]): void {
  const cardIdsToRemove = new Set(cardIds)
  player.hand = player.hand.filter(card => !cardIdsToRemove.has(card.id))
}

function createOfficialPlaySuccess(
  kind: Exclude<OfficialPlayResult, { ok: false }>['kind'],
  value: FieldValue,
  finishedPlayer: PlayerState | null,
): Exclude<OfficialPlayResult, { ok: false }> {
  if (!finishedPlayer) return { ok: true, value, kind }

  return { ok: true, value, kind, finishedPlayerId: finishedPlayer.id }
}

function nextFinishOrder(state: GameState): number {
  return Math.max(0, ...state.players.map(player => player.finishOrder ?? 0)) + 1
}

function nextDisqualifiedOrder(state: GameState): number {
  return Math.max(
    0,
    ...state.players.map(player => player.disqualifiedOrder ?? 0),
  ) + 1
}

function repairTurnAfterFinish(
  state: GameState,
  playerId: string,
  nowMs = Date.now(),
): void {
  const turnPlayer = state.players.find(player => player.id === state.turnPlayerId)
  if (!turnPlayer || isActivePlayer(turnPlayer)) return
  if (!state.players.some(isActivePlayer)) return

  startTurnTimer(state, nextActivePlayerId(state, playerId), nowMs)
}

function repairTurnAfterInactive(
  state: GameState,
  playerId: string,
  nowMs = Date.now(),
): void {
  if (state.turnPlayerId !== playerId) return
  if (!state.players.some(isActivePlayer)) return

  startTurnTimer(state, nextActivePlayerId(state, playerId), nowMs)
}

function buildNormalRankings(state: GameState): PlayerRank[] {
  return [
    ...rankedFinishedPlayers(state),
    ...rankedLastActivePlayers(state),
    ...rankedDisqualifiedPlayers(state),
  ].map((player, index) => ({
    rank: index + 1,
    playerId: player.id,
    status: player.status,
  }))
}

function rankedFinishedPlayers(state: GameState): PlayerState[] {
  return state.players
    .filter(player => player.status === 'finished')
    .sort(
      (a, b) =>
        (a.finishOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.finishOrder ?? Number.MAX_SAFE_INTEGER),
    )
}

function rankedLastActivePlayers(state: GameState): PlayerState[] {
  return state.players.filter(isActivePlayer)
}

function rankedDisqualifiedPlayers(state: GameState): PlayerState[] {
  return state.players
    .filter(player => player.status === 'disqualified')
    .sort((a, b) => (b.disqualifiedOrder ?? 0) - (a.disqualifiedOrder ?? 0))
}

function buildTimeLimitRankings(
  state: GameState,
  rankRule: TimeLimitRankRule,
): PlayerRank[] {
  if (rankRule !== 'handCountThenTurnOrder') {
    return []
  }

  return [
    ...rankedFinishedPlayers(state),
    ...rankedActivePlayersByTimeLimit(state),
    ...rankedDisqualifiedPlayers(state),
  ].map((player, index) => ({
    rank: index + 1,
    playerId: player.id,
    status: player.status,
  }))
}

function rankedActivePlayersByTimeLimit(state: GameState): PlayerState[] {
  return getActivePlayers(state).sort((a, b) => {
    if (a.hand.length !== b.hand.length) return a.hand.length - b.hand.length

    return turnOrderDistance(state, a.id) - turnOrderDistance(state, b.id)
  })
}

function turnOrderDistance(state: GameState, playerId: string): number {
  const startIndex = state.players.findIndex(player => player.id === state.turnPlayerId)
  const playerIndex = state.players.findIndex(player => player.id === playerId)
  if (startIndex === -1 || playerIndex === -1) return Number.MAX_SAFE_INTEGER

  return (playerIndex - startIndex + state.players.length) % state.players.length
}

function isRepetitionCheckEligible(state: GameState): boolean {
  return state.field.length === 0 && state.currentFieldValues.length === 0
}

function createRepetitionSignature(state: GameState): string {
  return state.players
    .map(player => [
      player.id,
      player.status,
      ...player.hand.map(card => card.id).sort(),
    ].join(':'))
    .join('|')
}
