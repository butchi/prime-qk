import {
  formatCards,
  generateDeck,
  isJokerCard,
  shuffleDeck,
  type PlayingCard,
} from './cards'
import {
  evalMain,
  canPlayOnCurrentField,
  evalFactorToken,
  validateOfficialPlay,
  type FactorGroup,
  type FactorGroups,
  type OfficialPlayValidation,
} from './ruleValues'
import { factorizeBigInt, isPrimeBigInt } from './primes'
import {
  toggleGameMode,
  type FieldValue,
  type GameMode,
} from './ruleState'

export interface PrimeDaifugoPlayer {
  id: string
  name: string
  isCPU: boolean
  hand: PlayingCard[]
  selectedCards: PlayingCard[]
  hasDrawn: boolean
  isPassed: boolean
}

export interface PrimeDaifugoGame {
  players: PrimeDaifugoPlayer[]
  deck: PlayingCard[]
  field: PlayingCard[][]
  currentFieldValues: FieldValue[]
  currentPlayer: number
  mode: GameMode
  ruleOptions: PrimeDaifugoRuleOptions
  round: number
  logs: string[]
  winnerId?: string
}

export interface PrimeDaifugoRuleOptions {
  grotanCut: boolean
  ramanujanRevolution: boolean
  singleJokerInfinity: boolean
  compositePlay: boolean
  penaltyEnabled: boolean
  judgementAssist: boolean
  maxPlayableCards: number | 'infinity'
  cpuSkill: CpuSkillProfile
}

export type CpuMemoryLevel = 1 | 2 | 3 | 'infinity'
export type CpuJudgementLevel = 1 | 2 | 3 | 'infinity'
export type CpuStrategyLevel = 1 | 2 | 3

/** CPUが「覚えている素数」と、合成数を見抜く規則、手の選び方を分離する。 */
export interface CpuSkillProfile {
  memory: CpuMemoryLevel
  judgement: CpuJudgementLevel
  strategy: CpuStrategyLevel
}

export const defaultCpuSkillProfile: CpuSkillProfile = {
  memory: 1,
  judgement: 1,
  strategy: 1,
}

export interface CreateGameOptions {
  players?: Array<Pick<PrimeDaifugoPlayer, 'id' | 'name' | 'isCPU'>>
  initialHandSize?: number
  evenReduceSize?: number
  jokerCount?: number
  ruleOptions?: Partial<PrimeDaifugoRuleOptions>
  random?: () => number
}

export interface ActionResult {
  ok: boolean
  message: string
  playedCards?: PlayingCard[]
  drawnCard?: PlayingCard
  drawnCardIds?: string[] // ペナルティドロー時に引いたカードのID
  returnedCardIds?: string[] // ペナルティで手に戻ったカードのID
  foulReason?: string // フォール理由
  winnerId?: string
}

export interface PlayCardsOptions {
  factorCardIds?: readonly string[]
}

/** 現在の手番をCPUとして考えたときの推奨アクション。 */
export type CpuTurnRecommendation =
  | { action: 'play'; cards: PlayingCard[] }
  | { action: 'draw' }
  | { action: 'pass' }

export interface AutomaticCompositePlayDetails {
  validation: Extract<OfficialPlayValidation, { ok: true }>
  factorCards: PlayingCard[]
  factorGroups: FactorGroups
  jokerValueByCardId: ReadonlyMap<string, number>
}

type FactorSelection = {
  factorGroups: PlayingCard[][][]
  factorCards: PlayingCard[]
  jokerValueByCardId: Map<string, number>
}

type FactorCandidate = FactorSelection & {
  remainingCards: PlayingCard[]
}

type AutomaticCompositeSearchState = {
  steps: number
  startedAtMs: number
  exhausted: boolean
  maxSteps: number
  maxMs: number
}

type AutomaticCompositeSearchResult = {
  details: AutomaticCompositePlayDetails | null
  exhausted: boolean
}

const defaultPlayers: Array<Pick<PrimeDaifugoPlayer, 'id' | 'name' | 'isCPU'>> = [
  { id: 'you', name: 'あなた', isCPU: false },
  { id: 'cpu', name: 'コンピューター', isCPU: true },
]

const defaultPrimeDaifugoRuleOptions: PrimeDaifugoRuleOptions = {
  grotanCut: false,
  ramanujanRevolution: false,
  singleJokerInfinity: true,
  compositePlay: true,
  penaltyEnabled: false,
  judgementAssist: true,
  maxPlayableCards: 'infinity',
  cpuSkill: defaultCpuSkillProfile,
}

const AUTO_COMPOSITE_MAX_AVAILABLE_CARDS = 6
const AUTO_COMPOSITE_MAX_SEARCH_STEPS = 3000
const AUTO_COMPOSITE_MAX_SEARCH_MS = 6
const MANUAL_COMPOSITE_MAX_SEARCH_STEPS = 50000
const MANUAL_COMPOSITE_MAX_SEARCH_MS = 100
const AUTO_COMPOSITE_MAX_MAIN_CARD_COUNT = 4
const CPU_RISK_FULL_SEARCH_MAX_SIZE = 4
const CPU_RELIABLE_SEARCH_MAX_MS = 8
const CPU_RELIABLE_SEARCH_MAX_COMBINATIONS = 800
const CPU_RELIABLE_SEARCH_MAX_PERMUTATIONS = 2400
const CPU_RISK_SEARCH_MAX_MS = 4
const CPU_RISK_SEARCH_MAX_COMBINATIONS = 300
const CPU_RISK_SEARCH_MAX_PERMUTATIONS = 900
/** CPUの一手全体で許容する思考時間。候補探索ごとの予算とは別の安全弁。 */
export const CPU_THINKING_TIMEOUT_MS = 5_000

type CpuSearchBudget = {
  startedAtMs: number
  maxMs: number
  maxCombinations: number
  maxPermutations: number
  combinations: number
  permutations: number
  exhausted: boolean
}

function consumeAutomaticCompositeSearchStep(
  searchState?: AutomaticCompositeSearchState,
): boolean {
  if (!searchState) return true

  if (Date.now() - searchState.startedAtMs > searchState.maxMs) {
    searchState.exhausted = true
    return false
  }

  searchState.steps++
  if (searchState.steps > searchState.maxSteps) {
    searchState.exhausted = true
    return false
  }

  return true
}

function resolveOpenFieldAllowedSizes(
  handSize: number,
  maxPlayableCards: PrimeDaifugoRuleOptions['maxPlayableCards'],
): number[] {
  if (handSize <= 0) return []

  const maxSize = maxPlayableCards === 'infinity'
    ? handSize
    : Math.min(handSize, maxPlayableCards)

  return Array.from({ length: maxSize }, (_, index) => index + 1)
}

function isCpuThinkingTimedOut(deadlineAtMs: number): boolean {
  return Date.now() >= deadlineAtMs
}

export function createPrimeDaifugoGame(
  options: CreateGameOptions = {},
): PrimeDaifugoGame {
  const players: PrimeDaifugoPlayer[] = (options.players ?? defaultPlayers).map(player => ({
    ...player,
    hand: [],
    selectedCards: [],
    hasDrawn: false,
    isPassed: false,
  }))
  const deck = shuffleDeck(
    generateDeck({
      evenReduceSize: options.evenReduceSize ?? 0,
      jokerCount: options.jokerCount ?? 0,
    }),
    options.random,
  )
  const initialHandSize = options.initialHandSize ?? 7

  for (let i = 0; i < initialHandSize; i++) {
    for (const player of players) {
      const card = deck.pop()
      if (card) player.hand.push(card)
    }
  }

  for (const player of players) {
    sortHand(player.hand)
  }

  return {
    players,
    deck,
    field: [],
    currentFieldValues: [],
    currentPlayer: 0,
    mode: 'normal',
    ruleOptions: {
      ...defaultPrimeDaifugoRuleOptions,
      ...options.ruleOptions,
      cpuSkill: options.ruleOptions?.cpuSkill ?? defaultCpuSkillProfile,
    },
    round: 1,
    logs: ['ゲーム開始', '第1ラウンド開始'],
  }
}

export function getCurrentPlayer(game: PrimeDaifugoGame): PrimeDaifugoPlayer {
  return game.players[game.currentPlayer]
}

export function isValidPlay(
  playedCards: PlayingCard[],
  currentFieldCards: PlayingCard[],
): boolean {
  return validatePlay(playedCards, currentFieldCards).ok
}

export function validatePlay(
  playedCards: PlayingCard[],
  currentFieldCards: PlayingCard[],
): ActionResult {
  if (playedCards.length === 0) {
    return { ok: false, message: 'カードを選んでください' }
  }

  if (currentFieldCards.length > 0 && playedCards.length !== currentFieldCards.length) {
    return { ok: false, message: '同じ枚数で出してください' }
  }

  const currentFieldValue = currentFieldCards.length > 0
    ? evalMain(currentFieldCards)
    : null
  const validation = validateOfficialPlay(playedCards, {
    currentFieldValues: currentFieldValue ? [currentFieldValue] : [],
  })

  if (
    !validation.ok &&
    validation.reason === 'main value must be greater than every current field value'
  ) {
    return {
      ok: false,
      message: `場の数 ${formatFieldValue(currentFieldValue)} より大きい数を出してください`,
    }
  }

  if (!validation.ok) {
    return { ok: false, message: '素数以外は出せません' }
  }

  return { ok: true, message: createPlaySuccessMessage(validation) }
}

export function playCards(
  game: PrimeDaifugoGame,
  cardIndexes: number[],
  options: PlayCardsOptions = {},
): ActionResult {
  if (game.winnerId) {
    return { ok: false, message: 'ゲームは終了しています。次のゲームを開始してください' }
  }

  const player = getCurrentPlayer(game)
  const playedPlayerIndex = game.currentPlayer
  const playedCards = uniqueIndexes(cardIndexes)
    .map(index => player.hand[index])
    .filter((card): card is PlayingCard => Boolean(card))
  const lastField = game.field[game.field.length - 1] ?? []
  const validation = validateGamePlay(game, playedCards, lastField, options)

  // *** フォール検出 ***
  if (validation.ok === false && validation.validation?.playClass?.kind === 'foul') {
    // ペナルティが無効な場合は、通常の検証エラーとして返す
    if (!game.ruleOptions.penaltyEnabled) {
      return validation
    }

    // フォール：出したカードの総数
    const cardCount = playedCards.length
    const foulReason = validation.validation.playClass.reason
    const playedValue = formatFieldValue(evalMain(playedCards, { mode: game.mode }))

    // フォール時は playedCards はまだ手札に存在しているため、何もしない
    // （棄却せず、手札に保持したまま）
    
    player.selectedCards = []
    player.hasDrawn = false
    game.players.forEach(gamePlayer => {
      gamePlayer.isPassed = false
    })
    
    // フィールドをクリア（新しいラウンド開始）
    clearField(game)

    // ペナルティ処理
    let drawnCardIds: string[] = []
    let returnedCardIds: string[] = []

    const playerCopy = player // Reference to current player for penalty handling
    if (game.deck.length >= cardCount) {
      // 山札充足: n枚ドロー
      const penaltyResult = resolveFoulPenaltyWithSufficientDeck(
        game,
        playerCopy,
        cardCount,
        foulReason,
      )
      drawnCardIds = penaltyResult.drawnCardIds
      returnedCardIds = penaltyResult.returnedCardIds
    } else {
      // 山札不足時の処理
      const penaltyResult = resolveFoulPenaltyWithInsufficientDeck(
        game,
        playerCopy,
        cardCount,
        foulReason,
      )
      drawnCardIds = penaltyResult.drawnCardIds
      returnedCardIds = penaltyResult.returnedCardIds ?? []
    }

    // ペナルティドロー後は手番経過済みのステートにする
    player.hasDrawn = true

    // 次のプレイヤーへ
    moveToNextPlayer(game)

    game.logs.push(`${player.name}が${playedValue}を出しました`)
    game.logs.push(`${playedValue}は素数ではありません！`)

    return {
      ok: true,
      message: `${playedValue}は素数ではありません！`,
      playedCards: [],
      drawnCardIds,
      returnedCardIds,
      foulReason,
    }
  }

  // 通常の検証エラー
  if (!validation.ok) return validation

  const consumedCards = [...playedCards, ...validation.factorCards]
  const playedCardIds = new Set(consumedCards.map(card => card.id))
  player.hand = player.hand.filter(card => !playedCardIds.has(card.id))
  player.selectedCards = []
  player.hasDrawn = false
  game.players.forEach(gamePlayer => {
    gamePlayer.isPassed = false
  })

  resolveValidGamePlay(game, playedCards, validation.validation, validation.factorCards)
  game.logs.push(createPlayActionLogMessage(player.name, validation.validation))
  game.logs.push(createPlayLogMessage(
    validation.validation,
    validation.factorGroups,
    validation.jokerValueByCardId,
  ))

  if (player.hand.length === 0) {
    game.winnerId = player.id
    game.currentPlayer = playedPlayerIndex
    game.logs.push(`${player.name}の勝ちです`)
    return {
      ok: true,
      message: `${player.name}の勝ちです`,
      playedCards,
      winnerId: player.id,
    }
  }

  return { ok: true, message: validation.message, playedCards }
}

export function drawCard(game: PrimeDaifugoGame): ActionResult {
  if (game.winnerId) {
    return { ok: false, message: 'ゲームは終了しています。次のゲームを開始してください' }
  }

  const player = getCurrentPlayer(game)

  if (player.hasDrawn) {
    return { ok: false, message: 'この手番ではすでにドローしています' }
  }

  const card = game.deck.pop()
  if (!card) {
    return { ok: false, message: 'ドローできるカードがありません' }
  }

  player.hand.push(card)
  sortHand(player.hand)
  player.hasDrawn = true
  game.logs.push(`${player.name}がカードを引きました`)

  return { ok: true, message: `${formatCards([card])}を引きました`, drawnCard: card, drawnCardIds: [card.id] }
}

/**
 * 複数枚のカードを山札からドロー（ペナルティ用）
 */
export function drawCardsFromDeck(game: PrimeDaifugoGame, count: number, targetPlayer?: PrimeDaifugoPlayer): PlayingCard[] {
  const player = targetPlayer ?? getCurrentPlayer(game)
  const drawnCards: PlayingCard[] = []

  for (let i = 0; i < count; i++) {
    const card = game.deck.pop()
    if (!card) break
    drawnCards.push(card)
    player.hand.push(card)
  }

  if (drawnCards.length > 0) {
    sortHand(player.hand)
  }

  return drawnCards
}

/**
 * カードを手札に戻す（ペナルティ用）
 */
export function returnCardsToHand(player: PrimeDaifugoPlayer, cards: PlayingCard[]): void {
  player.hand.push(...cards)
  sortHand(player.hand)
}

/**
 * ペナルティ処理（山札充足時）
 * - 出したカードを全て手札に戻す
 * - 山札からn枚ドロー
 * - フォールはカウント（場の変化なし）
 */
export function resolveFoulPenaltyWithSufficientDeck(
  game: PrimeDaifugoGame,
  foulPlayer: PrimeDaifugoPlayer,
  cardCount: number,
  _foulReason: string,
): { returnedCardIds: string[]; drawnCardIds: string[] } {
  // カードを手札に戻す
  const returnedCardIds: string[] = []
  // ここでカードを戻すためには、playedCardsが必要になるので別の方法を検討
  // 現状では、フォール検出時にplayCardsをsaveしておく必要がある

  // 山札からn枚ドロー（対象プレイヤーを明示的に指定）
  const drawnCards = drawCardsFromDeck(game, cardCount, foulPlayer)
  const drawnCardIds = drawnCards.map(card => card.id)

  return { returnedCardIds, drawnCardIds }
}

/**
 * ペナルティ処理（山札不足時）
 * - 山札の残り全枚をドロー
 * - 他プレイヤーから(n-m)枚を回収（シンプル版は最後尾を自動選択）
 */
export function resolveFoulPenaltyWithInsufficientDeck(
  game: PrimeDaifugoGame,
  foulPlayer: PrimeDaifugoPlayer,
  cardCount: number,
  _foulReason: string,
): { returnedCardIds: string[]; drawnCardIds: string[]; collectedCardIds: string[] } {
  const deckRemaining = game.deck.length
  const needFromOthers = cardCount - deckRemaining

  // 山札の残りを全てドロー（対象プレイヤーを明示的に指定）
  const drawnCards = drawCardsFromDeck(game, deckRemaining, foulPlayer)
  const drawnCardIds = drawnCards.map(card => card.id)

  // 他プレイヤーから回収（シンプル版: 各プレイヤーから最後尾のカードを自動選択）
  const collectedCardIds: string[] = []
  let stillNeed = needFromOthers

  for (let i = 0; i < game.players.length && stillNeed > 0; i++) {
    const otherPlayer = game.players[(game.currentPlayer + 1 + i) % game.players.length]
    if (otherPlayer.id === foulPlayer.id) continue

    // シンプル版: 最後尾から必要な枚数分取得
    const toTake = Math.min(stillNeed, otherPlayer.hand.length)
    for (let j = 0; j < toTake; j++) {
      const card = otherPlayer.hand.pop()
      if (card) {
        game.deck.push(card)
        collectedCardIds.push(card.id)
        stillNeed--
      }
    }
  }

  return { returnedCardIds: [], drawnCardIds, collectedCardIds }
}

export function passTurn(game: PrimeDaifugoGame): ActionResult {
  if (game.winnerId) {
    return { ok: false, message: 'ゲームは終了しています。次のゲームを開始してください' }
  }

  const player = getCurrentPlayer(game)
  player.isPassed = true
  player.hasDrawn = false
  player.selectedCards = []
  game.logs.push(`${player.name}はパスしました`)

  if (game.field.length > 0 || game.players.every(gamePlayer => gamePlayer.isPassed)) {
    clearField(game)
    nextRound(game)
  }

  moveToNextPlayer(game)
  return { ok: true, message: `${player.name}はパスしました` }
}

export function cpuSelectPlay(
  player: { hand: PlayingCard[] },
  field: PlayingCard[][],
  options: {
    mode?: GameMode
    currentFieldValues?: FieldValue[]
    maxPlayableCards?: PrimeDaifugoRuleOptions['maxPlayableCards']
    cpuSkill?: CpuSkillProfile
    penaltyEnabled?: boolean
    /** パスすると次の相手が空場から上がりやすい局面。 */
    urgentThreat?: boolean
  } = {},
): PlayingCard[] {
  const deadlineAtMs = Date.now() + CPU_THINKING_TIMEOUT_MS
  const lastField = field[field.length - 1] || []
  const skill = options.cpuSkill ?? {
    memory: 'infinity' as const,
    judgement: 'infinity' as const,
    strategy: 3 as const,
  }
  const fieldRequiredSizes = lastField.length > 0
    ? [lastField.length]
    : resolveOpenFieldAllowedSizes(
      player.hand.length,
      options.maxPlayableCards ?? 'infinity',
    )
  let allowedSizes = fieldRequiredSizes
  // 通常のCPUは、プロファイルで定義された最大4枚までを考える。
  // 無制限の完全CPUだけは従来どおり全枚数を検討できる。
  if (skill.memory !== 'infinity') allowedSizes = allowedSizes.filter(size => size <= 4)

  const candidates: PlayingCard[][] = []
  for (const size of allowedSizes) {
    if (isCpuThinkingTimedOut(deadlineAtMs)) break
    candidates.push(...findCpuCandidates(player.hand, size, {
      ...options,
      cpuSkill: skill,
      deadlineAtMs,
    }))
  }
  const reliablePlay = selectCpuCandidate(candidates, player.hand, skill, options.mode ?? 'normal')
  if (!options.penaltyEnabled || isCpuThinkingTimedOut(deadlineAtMs)) return reliablePlay

  // 緊急時は記憶の対象外である5枚以上の返しも、賭けとして検討する。
  const riskSizes = options.urgentThreat ? fieldRequiredSizes : allowedSizes
  // 大枚数の全探索は手番遷移時のフリーズ要因になるため、
  // リスク宣言の探索は4枚までに制限する。
  const riskSearchSizes = riskSizes.filter(size => size <= CPU_RISK_FULL_SEARCH_MAX_SIZE)
  const riskyCandidates: PlayingCard[][] = []
  for (const size of riskSearchSizes) {
    if (isCpuThinkingTimedOut(deadlineAtMs)) break
    riskyCandidates.push(...findCpuRiskCandidates(player.hand, size, {
      ...options,
      cpuSkill: skill,
      deadlineAtMs,
    }))
  }
  const riskyPlay = selectWorthwhileRisk(
    riskyCandidates,
    reliablePlay,
    player.hand.length,
    skill.strategy,
    options.mode ?? 'normal',
    options.urgentThreat ?? false,
  )
  return riskyPlay ?? reliablePlay
}

/**
 * CPUの実際の手番処理とヒント表示で共用する、次の一手の判断。
 * 呼び出し元のプレイヤー種別には依存しないため、人間の手番に対して
 * 「同じ能力値のCPUなら何をするか」をそのまま取得できる。
 */
export function getCpuTurnRecommendation(game: PrimeDaifugoGame): CpuTurnRecommendation {
  const player = getCurrentPlayer(game)
  const playableCards = cpuSelectPlay(player, game.field, {
    mode: game.mode,
    currentFieldValues: game.currentFieldValues,
    maxPlayableCards: game.ruleOptions.maxPlayableCards,
    cpuSkill: game.ruleOptions.cpuSkill,
    penaltyEnabled: game.ruleOptions.penaltyEnabled,
    urgentThreat: isCpuAtRiskOfOpponentScoop(game),
  })

  if (playableCards.length > 0) return { action: 'play', cards: playableCards }
  if (!player.hasDrawn && game.deck.length > 0) return { action: 'draw' }
  return { action: 'pass' }
}

/**
 * ヒント用に、CPUの提案のうちルール上ただちに出せるカードだけを返す。
 * ペナルティを伴う賭け、ドロー、パスはプレイヤーへの提案に含めない。
 */
export function getCpuPlayableHint(game: PrimeDaifugoGame): PlayingCard[] | null {
  const recommendation = getCpuTurnRecommendation(game)
  const lastField = game.field[game.field.length - 1] ?? []
  if (
    recommendation.action === 'play'
    && validateGamePlay(game, recommendation.cards, lastField).ok
  ) {
    return recommendation.cards
  }

  // 能力値が低いCPUは、記憶していない桁数の素数を見送ることがある。
  // ヒントでは「出せる手があるのに何も示さない」ことを避けるため、
  // 正規に出せる素数だけは最高能力値の探索で補う。
  const player = getCurrentPlayer(game)
  const fallbackCards = cpuSelectPlay(player, game.field, {
    mode: game.mode,
    currentFieldValues: game.currentFieldValues,
    maxPlayableCards: game.ruleOptions.maxPlayableCards,
    cpuSkill: { memory: 'infinity', judgement: 'infinity', strategy: 3 },
    penaltyEnabled: false,
  })

  if (
    fallbackCards.length > 0
    && validateGamePlay(game, fallbackCards, lastField).ok
  ) {
    return fallbackCards
  }

  return findAnyLegalHintPlay(game)
}

/**
 * CPUの知識では見つからない合成数出しなども含め、正式なゲーム判定で合法手を探す。
 * ヒント表示を止めないよう探索量には上限を設けるが、通常CPUより大きな範囲を調べる。
 */
function findAnyLegalHintPlay(game: PrimeDaifugoGame): PlayingCard[] | null {
  const player = getCurrentPlayer(game)
  const lastField = game.field[game.field.length - 1] ?? []
  const sizes = lastField.length > 0
    ? [lastField.length]
    : resolveOpenFieldAllowedSizes(player.hand.length, game.ruleOptions.maxPlayableCards)
  const searchBudget = createCpuSearchBudget({
    maxMs: 50,
    maxCombinations: 20_000,
    maxPermutations: 50_000,
  })
  let found: PlayingCard[] | null = null

  for (const size of sizes) {
    if (searchBudget.exhausted || found) break

    forEachCombination(player.hand, size, searchBudget, combination => {
      forEachUniquePermutation(combination, searchBudget, cards => {
        if (validateGamePlay(game, cards, lastField).ok) {
          found = cards
          return false
        }
        return !searchBudget.exhausted
      })
      return !found && !searchBudget.exhausted
    })
  }

  return found
}

export function playCpuTurn(game: PrimeDaifugoGame): ActionResult {
  if (game.winnerId) {
    return { ok: false, message: 'ゲームは終了しています。次のゲームを開始してください' }
  }

  const player = getCurrentPlayer(game)
  const recommendation = getCpuTurnRecommendation(game)

  if (recommendation.action === 'play') {
    const cardIndexes = recommendation.cards.map(card =>
      player.hand.findIndex(handCard => handCard.id === card.id),
    )
    return playCards(game, cardIndexes)
  }

  if (recommendation.action === 'draw') {
    drawCard(game)
  }

  return passTurn(game)
}

function moveToNextPlayer(game: PrimeDaifugoGame) {
  game.currentPlayer = (game.currentPlayer + 1) % game.players.length
  getCurrentPlayer(game).hasDrawn = false
  sortHand(getCurrentPlayer(game).hand)
}

function clearField(game: PrimeDaifugoGame) {
  if (game.field.length === 0) return

  game.deck.push(...game.field.flat())
  game.field = []
  game.currentFieldValues = []
  shuffleDeck(game.deck)
}

function nextRound(game: PrimeDaifugoGame) {
  game.round++
  game.players.forEach(player => {
    player.isPassed = false
    player.hasDrawn = false
  })
  game.logs.push(`第${game.round}ラウンド開始`)
}

function sortHand(hand: PlayingCard[]) {
  hand.sort((a, b) => {
    const aIsJoker = isJokerCard(a)
    const bIsJoker = isJokerCard(b)
    if (aIsJoker && !bIsJoker) return 1
    if (!aIsJoker && bIsJoker) return -1
    if (a.rank !== b.rank) return a.rank - b.rank

    return a.id.localeCompare(b.id)
  })
}

function uniqueIndexes(indexes: number[]): number[] {
  return [...new Set(indexes)].filter(index => Number.isInteger(index) && index >= 0)
}

function createCpuSearchBudget(options: {
  maxMs: number
  maxCombinations: number
  maxPermutations: number
  deadlineAtMs?: number
}): CpuSearchBudget {
  const startedAtMs = Date.now()
  return {
    startedAtMs,
    // 個別探索の短い予算を維持しつつ、CPU手番全体の締切を越えない。
    maxMs: Math.max(0, Math.min(options.maxMs, (options.deadlineAtMs ?? Infinity) - startedAtMs)),
    maxCombinations: options.maxCombinations,
    maxPermutations: options.maxPermutations,
    combinations: 0,
    permutations: 0,
    exhausted: false,
  }
}

function consumeCpuBudgetCombination(budget?: CpuSearchBudget): boolean {
  if (!budget || budget.exhausted) return !budget?.exhausted
  if (Date.now() - budget.startedAtMs >= budget.maxMs) {
    budget.exhausted = true
    return false
  }
  budget.combinations++
  if (budget.combinations > budget.maxCombinations) {
    budget.exhausted = true
    return false
  }
  return true
}

function consumeCpuBudgetPermutation(budget?: CpuSearchBudget): boolean {
  if (!budget || budget.exhausted) return !budget?.exhausted
  if (Date.now() - budget.startedAtMs >= budget.maxMs) {
    budget.exhausted = true
    return false
  }
  budget.permutations++
  if (budget.permutations > budget.maxPermutations) {
    budget.exhausted = true
    return false
  }
  return true
}

function forEachCombination<T>(
  array: readonly T[],
  size: number,
  budget: CpuSearchBudget | undefined,
  visit: (combination: T[]) => boolean,
): void {
  if (size <= 0 || size > array.length) return
  const current: T[] = []

  const traverse = (startIndex: number): boolean => {
    if (budget?.exhausted) return false

    if (current.length === size) {
      if (!consumeCpuBudgetCombination(budget)) return false
      return visit([...current])
    }

    const remainingNeed = size - current.length
    for (let index = startIndex; index <= array.length - remainingNeed; index++) {
      if (budget?.exhausted) return false
      current.push(array[index])
      const shouldContinue = traverse(index + 1)
      current.pop()
      if (!shouldContinue) return false
    }

    return true
  }

  traverse(0)
}

function forEachUniquePermutation(
  cards: readonly PlayingCard[],
  budget: CpuSearchBudget | undefined,
  visit: (ordered: PlayingCard[]) => boolean,
): void {
  const seen = new Set<string>()
  const current: PlayingCard[] = []

  const traverse = (remaining: PlayingCard[]): boolean => {
    if (budget?.exhausted) return false

    if (remaining.length === 0) {
      if (!consumeCpuBudgetPermutation(budget)) return false
      const key = current.map(card => card.rank).join(',')
      if (seen.has(key)) return true
      seen.add(key)
      return visit([...current])
    }

    for (let index = 0; index < remaining.length; index++) {
      if (budget?.exhausted) return false
      const next = remaining[index]
      current.push(next)
      const shouldContinue = traverse([
        ...remaining.slice(0, index),
        ...remaining.slice(index + 1),
      ])
      current.pop()
      if (!shouldContinue) return false
    }

    return true
  }

  traverse([...cards])
}

function findCpuCandidates(
  hand: PlayingCard[],
  size: number,
  options: {
    mode?: GameMode
    currentFieldValues?: FieldValue[]
    cpuSkill: CpuSkillProfile
    deadlineAtMs?: number
  },
): PlayingCard[][] {
  const candidates: PlayingCard[][] = []
  const searchBudget = createCpuSearchBudget({
    maxMs: CPU_RELIABLE_SEARCH_MAX_MS,
    maxCombinations: CPU_RELIABLE_SEARCH_MAX_COMBINATIONS,
    maxPermutations: CPU_RELIABLE_SEARCH_MAX_PERMUTATIONS,
    deadlineAtMs: options.deadlineAtMs,
  })

  forEachCombination(hand, size, searchBudget, combo => {
    forEachUniquePermutation(combo, searchBudget, orderedCombo => {
      const jokerValueByCardId = findBestPrimeJokerValueAssignment(orderedCombo, {
        mode: options.mode,
        currentFieldValues: options.currentFieldValues,
      })
      const value = evalMain(orderedCombo, { mode: options.mode, jokerValueByCardId })
      if (!value || value.kind !== 'finite') {
        if (orderedCombo.length === 1 && value && isCpuPrimeRemembered(orderedCombo, value, options.cpuSkill)) {
          candidates.push(orderedCombo)
        }
        return !searchBudget.exhausted
      }

      // 判定は「合成数だと分かるもの」をまず除外する。記憶外の数は
      // 推測で出さず、保守的に見送るためCPUは反則を連発しない。
      if (cpuCanRuleOutComposite(value.value, options.cpuSkill.judgement)) return !searchBudget.exhausted
      if (!isCpuPrimeRemembered(orderedCombo, value, options.cpuSkill)) return !searchBudget.exhausted

      const validation = validateOfficialPlay(orderedCombo, {
        mode: options.mode,
        currentFieldValues: options.currentFieldValues,
        jokerValueByCardId,
      })
      if (validation.ok && validation.playClass.kind === 'prime') candidates.push(orderedCombo)
      return !searchBudget.exhausted
    })
    return !searchBudget.exhausted
  })

  return candidates
}

/**
 * 記憶外だが、CPU自身の判定規則では否定できない候補。
 * ペナルティありのときだけ、勝利に直結する場面で宣言対象にする。
 */
function findCpuRiskCandidates(
  hand: PlayingCard[],
  size: number,
  options: {
    mode?: GameMode
    currentFieldValues?: FieldValue[]
    cpuSkill: CpuSkillProfile
    deadlineAtMs?: number
  },
): PlayingCard[][] {
  const candidates: PlayingCard[][] = []
  const searchBudget = createCpuSearchBudget({
    maxMs: CPU_RISK_SEARCH_MAX_MS,
    maxCombinations: CPU_RISK_SEARCH_MAX_COMBINATIONS,
    maxPermutations: CPU_RISK_SEARCH_MAX_PERMUTATIONS,
    deadlineAtMs: options.deadlineAtMs,
  })

  forEachCombination(hand, size, searchBudget, combo => {
    forEachUniquePermutation(combo, searchBudget, orderedCombo => {
      const jokerValueByCardId = findBestPrimeJokerValueAssignment(orderedCombo, {
        mode: options.mode,
        currentFieldValues: options.currentFieldValues,
      })
      const value = evalMain(orderedCombo, { mode: options.mode, jokerValueByCardId })
      if (!value || value.kind !== 'finite') return !searchBudget.exhausted
      if (!canPlayOnCurrentField(value, options.currentFieldValues ?? [], options.mode ?? 'normal')) return !searchBudget.exhausted
      if (cpuCanRuleOutComposite(value.value, options.cpuSkill.judgement)) return !searchBudget.exhausted
      if (!isCpuPrimeRemembered(orderedCombo, value, options.cpuSkill)) candidates.push(orderedCombo)
      return !searchBudget.exhausted
    })
    return !searchBudget.exhausted
  })

  return candidates
}

function selectWorthwhileRisk(
  candidates: PlayingCard[][],
  reliablePlay: PlayingCard[],
  handSize: number,
  strategy: CpuStrategyLevel,
  mode: GameMode,
  urgentThreat: boolean,
): PlayingCard[] | null {
  if (candidates.length === 0) return null
  const select = (choices: PlayingCard[][]) => {
    const choice = selectCpuCandidate(choices, [], { memory: 1, judgement: 1, strategy: 1 }, mode)
    return choice.length > 0 ? choice : null
  }
  const winningRisk = candidates.filter(cards => cards.length === handSize)
  // パスで次のプレイヤーに空場を渡すと上がられそうなら、確実な返しが
  // ない限り戦略レベルを問わず賭ける。枚数合わせが最優先になる局面。
  if (urgentThreat && reliablePlay.length === 0) return select(candidates)
  // レベル3は「当たれば即あがり」だけを賭けに使う。
  if (strategy === 3) return select(winningRisk)
  // レベル2は確実な手がなければ、残り3枚以下を大きく減らせる賭けも行う。
  if (strategy === 2) {
    if (winningRisk.length > 0) return select(winningRisk)
    if (reliablePlay.length === 0 && handSize <= 3) {
      const reducingRisk = candidates.filter(cards => cards.length >= 2)
      return select(reducingRisk)
    }
    return null
  }
  // レベル1は確実な手がないとき、判定を通過した候補に賭ける。
  return reliablePlay.length === 0
    ? select(candidates)
    : null
}

function isCpuAtRiskOfOpponentScoop(game: PrimeDaifugoGame): boolean {
  if (game.field.length === 0 || game.players.length < 2) return false
  const nextPlayer = game.players[(game.currentPlayer + 1) % game.players.length]
  const fieldSize = game.field[game.field.length - 1].length
  const remaining = nextPlayer.hand.length
  if (remaining === 0) return false

  // パスで場が流れるため、相手は同じ枚数を続けて出し、最後だけ少ない枚数で
  // 汲み切れる。例: 11枚から4枚を出した後は残り7枚で、4→3の二手で上がれる。
  // 手札は非公開なので、実際にその並びを作れるかは不明だが、CPUが返せない
  // 多枚出しに対しては十分に大きい敗北リスクとして扱う。
  const canFinishInTwoMorePlays = fieldSize >= 2 && remaining <= fieldSize * 2
  const immediateFinishRisk = remaining <= 2
  return immediateFinishRisk || canFinishInTwoMorePlays
}

/** 各レベルが持つ合成数判定。true は「素数ではない」と確信できること。 */
export function cpuCanRuleOutComposite(value: bigint, level: CpuJudgementLevel): boolean {
  if (value < 2n) return true
  if (level === 'infinity') return !isPrimeBigInt(value)
  if (value > 5n && (value % 2n === 0n || value % 5n === 0n)) return true
  if (value > 3n && value % 3n === 0n) return true
  if (level === 1) return false
  if (value > 13n && (value % 7n === 0n || value % 11n === 0n || value % 13n === 0n)) return true
  if (level === 2) return false
  return value > 29n && (
    value % 23n === 0n || value % 29n === 0n || value % 17n === 0n || value % 19n === 0n
  )
}

function isCpuPrimeRemembered(
  cards: readonly PlayingCard[],
  value: FieldValue,
  skill: CpuSkillProfile,
): boolean {
  if (value.kind !== 'finite') return cards.length === 1
  if (skill.memory === 'infinity') return isPrimeBigInt(value.value)
  if (!isPrimeBigInt(value.value)) return false
  if (cards.length <= 2) return true
  const hasEvenCard = cards.some(card => !isJokerCard(card) && card.rank % 2 === 0)
  const allTwoDigitCards = cards.every(card => !isJokerCard(card) && card.rank >= 10)
  if (skill.memory === 2) {
    return (cards.length === 3 && (hasEvenCard || allTwoDigitCards))
      || (cards.length === 4 && allTwoDigitCards)
  }
  return cards.length === 3 || (cards.length === 4 && hasEvenCard)
}

function selectCpuCandidate(
  candidates: PlayingCard[][],
  hand: PlayingCard[],
  skill: CpuSkillProfile,
  mode: GameMode,
): PlayingCard[] {
  if (candidates.length === 0) return []
  const valueOf = (cards: PlayingCard[]) => evalMain(cards)?.kind === 'finite'
    ? (evalMain(cards) as Extract<FieldValue, { kind: 'finite' }>).value
    : mode === 'normal' ? 10n ** 30n : -(10n ** 30n)
  // 同じカードを使う並べ替えなら、通常時はより大きい数、革命時はより小さい数が
  // 常に上位互換になる。戦略レベル2以上では劣る並びを候補から除外する。
  const preferredCandidates = skill.strategy >= 2
    ? removeDominatedOrderings(candidates, mode, valueOf)
    : candidates
  const sorted = [...preferredCandidates].sort((left, right) => {
    if (skill.strategy >= 2 && left.length !== right.length) return right.length - left.length
    const leftValue = valueOf(left)
    const rightValue = valueOf(right)
    return mode === 'normal' ? Number(leftValue - rightValue) : Number(rightValue - leftValue)
  })
  if (skill.strategy < 3) return sorted[0]

  // 一手後に1枚でも既知の素数が残る手を優先し、手詰まりを減らす。
  return sorted.sort((left, right) => {
    const future = (cards: PlayingCard[]) => {
      const ids = new Set(cards.map(card => card.id))
      return hand.some(card => !ids.has(card.id) && isCpuPrimeRemembered([card], evalMain([card])!, skill))
    }
    return Number(future(right)) - Number(future(left))
  })[0]
}

function removeDominatedOrderings(
  candidates: PlayingCard[][],
  mode: GameMode,
  valueOf: (cards: PlayingCard[]) => bigint,
): PlayingCard[][] {
  const bestByCardSet = new Map<string, PlayingCard[]>()

  for (const candidate of candidates) {
    const key = candidate.map(card => card.id).sort().join(',')
    const currentBest = bestByCardSet.get(key)
    if (!currentBest) {
      bestByCardSet.set(key, candidate)
      continue
    }

    const candidateValue = valueOf(candidate)
    const currentBestValue = valueOf(currentBest)
    const isBetter = mode === 'normal'
      ? candidateValue > currentBestValue
      : candidateValue < currentBestValue
    if (isBetter) bestByCardSet.set(key, candidate)
  }

  return [...bestByCardSet.values()]
}

type GamePlayValidationResult =
  | {
      ok: true
      message: string
      validation: Extract<OfficialPlayValidation, { ok: true }>
      factorCards: PlayingCard[]
      factorGroups: FactorGroups
      jokerValueByCardId: ReadonlyMap<string, number>
    }
  | { ok: false; message: string; validation?: OfficialPlayValidation }

function validateGamePlay(
  game: PrimeDaifugoGame,
  playedCards: PlayingCard[],
  lastField: PlayingCard[],
  options: PlayCardsOptions = {},
): GamePlayValidationResult {
  if (playedCards.length === 0) {
    return { ok: false, message: 'カードを選んでください' }
  }

  if (lastField.length > 0 && playedCards.length !== lastField.length) {
    return { ok: false, message: '同じ枚数で出してください' }
  }

  if (
    lastField.length === 0 &&
    game.ruleOptions.maxPlayableCards !== 'infinity' &&
    playedCards.length > game.ruleOptions.maxPlayableCards
  ) {
    return {
      ok: false,
      message: `空の場では${game.ruleOptions.maxPlayableCards}枚までしか出せません`,
    }
  }

  if (playedCards.length === 2 && playedCards.every(isJokerCard)) {
    const value = game.mode === 'normal'
      ? { kind: 'positiveInfinity' as const }
      : { kind: 'negativeInfinity' as const }
    const validation: Extract<OfficialPlayValidation, { ok: true }> = {
      ok: true,
      value,
      playClass: { kind: 'prime', value },
    }
    const ruleOptionRejection = rejectDisabledRule(validation, game.ruleOptions)
    if (ruleOptionRejection) return { ok: false, message: ruleOptionRejection }

    return {
      ok: true,
      message: createPlaySuccessMessage(validation),
      validation,
      factorCards: [],
      factorGroups: [],
      jokerValueByCardId: new Map(),
    }
  }

  const jokerValueByCardId = findBestPrimeJokerValueAssignment(playedCards, {
    mode: game.mode,
    currentFieldValues: game.currentFieldValues,
  })

  let validation = validateOfficialPlay(playedCards, {
    mode: game.mode,
    currentFieldValues: game.currentFieldValues,
    jokerValueByCardId,
  })
  let factorCards: PlayingCard[] = []
  let factorGroups: FactorGroups = []
  let factorJokerValueByCardId: ReadonlyMap<string, number> = new Map()
  let autoCompositeWarning: string | null = null

  const ruleOptionRejection = validation.ok
    ? rejectDisabledRule(validation, game.ruleOptions)
    : null
  if (!validation.ok || ruleOptionRejection) {
    const currentPlayer = getCurrentPlayer(game)
    const availableCardCount = Math.max(0, currentPlayer.hand.length - playedCards.length)
    const hasManualFactorSelection = options.factorCardIds !== undefined

    if (
      !hasManualFactorSelection
      && (
        availableCardCount > AUTO_COMPOSITE_MAX_AVAILABLE_CARDS
        || playedCards.length > AUTO_COMPOSITE_MAX_MAIN_CARD_COUNT
      )
    ) {
      autoCompositeWarning = '自動合成の候補が多いため自動判定を省略しました。必要なら因数カードを指定してください'
    } else {
      const automaticComposite = findAutomaticCompositePlayDetailsWithMeta(
        playedCards,
        currentPlayer.hand,
        {
          mode: game.mode,
          currentFieldValues: game.currentFieldValues,
          compositePlay: game.ruleOptions.compositePlay,
          factorCardIds: options.factorCardIds,
        },
      )
      if (automaticComposite.details) {
        validation = automaticComposite.details.validation
        factorCards = automaticComposite.details.factorCards
        factorGroups = automaticComposite.details.factorGroups
        factorJokerValueByCardId = automaticComposite.details.jokerValueByCardId
      } else if (automaticComposite.exhausted) {
        autoCompositeWarning = '自動合成の探索が長くなるため途中で省略しました。必要なら因数カードを指定してください'
      }
    }
  }

  if (
    !validation.ok &&
    validation.reason === 'main value must be greater than every current field value'
  ) {
    return {
      ok: false,
      message: `場の数 ${formatFieldValue(lastCurrentFieldValue(game))} より大きい数を出してください`,
      validation,
    }
  }

  if (
    !validation.ok &&
    validation.reason === 'main value must be smaller than every current field value'
  ) {
    return {
      ok: false,
      message: `場の数 ${formatFieldValue(lastCurrentFieldValue(game))} より小さい数を出してください`,
      validation,
    }
  }

  if (!validation.ok) {
    return {
      ok: false,
      message: autoCompositeWarning ?? '素数以外は出せません',
      validation,
    }
  }
  const finalRuleOptionRejection = rejectDisabledRule(validation, game.ruleOptions)
  if (finalRuleOptionRejection) return { ok: false, message: finalRuleOptionRejection }

  return {
    ok: true,
    message: createPlaySuccessMessage(validation, factorGroups, factorJokerValueByCardId),
    validation,
    factorCards,
    factorGroups,
    jokerValueByCardId: factorJokerValueByCardId,
  }
}

export function findAutomaticCompositePlayDetails(
  playedCards: PlayingCard[],
  hand: PlayingCard[],
  options: {
    mode?: GameMode
    currentFieldValues?: readonly FieldValue[]
    compositePlay?: boolean
    factorCardIds?: readonly string[]
  } = {},
): AutomaticCompositePlayDetails | null {
  return findAutomaticCompositePlayDetailsWithMeta(playedCards, hand, options).details
}

function findAutomaticCompositePlayDetailsWithMeta(
  playedCards: PlayingCard[],
  hand: PlayingCard[],
  options: {
    mode?: GameMode
    currentFieldValues?: readonly FieldValue[]
    compositePlay?: boolean
    factorCardIds?: readonly string[]
  } = {},
): AutomaticCompositeSearchResult {
  const searchState: AutomaticCompositeSearchState = {
    steps: 0,
    startedAtMs: Date.now(),
    exhausted: false,
    maxSteps: options.factorCardIds
      ? MANUAL_COMPOSITE_MAX_SEARCH_STEPS
      : AUTO_COMPOSITE_MAX_SEARCH_STEPS,
    maxMs: options.factorCardIds
      ? MANUAL_COMPOSITE_MAX_SEARCH_MS
      : AUTO_COMPOSITE_MAX_SEARCH_MS,
  }

  if (options.factorCardIds) {
    const selectedCardIds = new Set(options.factorCardIds)
    const playedCardIds = new Set(playedCards.map(card => card.id))
    const selectedFactorCards = hand.filter(card =>
      selectedCardIds.has(card.id) && !playedCardIds.has(card.id),
    )

    if (selectedFactorCards.length !== selectedCardIds.size) {
      return { details: null, exhausted: false }
    }

    const candidates = findAutomaticCompositePlayCandidates(playedCards, selectedFactorCards, {
      mode: options.mode,
      currentFieldValues: options.currentFieldValues,
      compositePlay: options.compositePlay,
      searchState,
    })

    return {
      details: candidates.find(candidate =>
        sameCardIds(candidate.factorCards, options.factorCardIds ?? []),
      ) ?? null,
      exhausted: searchState.exhausted,
    }
  }

  const mainValue = evalMain(playedCards, { mode: options.mode })
  if (options.compositePlay === false || mainValue?.kind !== 'finite') {
    return { details: null, exhausted: false }
  }

  const factors = factorizeBigInt(mainValue.value)
  if (!factors || factors.length === 0) {
    return { details: null, exhausted: searchState.exhausted }
  }

  const playedCardIds = new Set(playedCards.map(card => card.id))
  const availableCards = hand.filter(card => !playedCardIds.has(card.id))

  const found = findFirstAutomaticCompositePlayCandidate(
    playedCards,
    factors,
    availableCards,
    {
      mode: options.mode,
      currentFieldValues: options.currentFieldValues,
    },
    searchState,
  )

  return { details: found, exhausted: searchState.exhausted }
}

export function findAutomaticCompositePlayCandidates(
  playedCards: PlayingCard[],
  hand: PlayingCard[],
  options: {
    mode?: GameMode
    currentFieldValues?: readonly FieldValue[]
    compositePlay?: boolean
    searchState?: AutomaticCompositeSearchState
  } = {},
): AutomaticCompositePlayDetails[] {
  if (options.compositePlay === false) return []

  // 5枚以上のメインカードは数値が大きくなりやすいため、
  // 自動候補の探索・因数分解は行わない。手動選択では searchState が渡る。
  if (
    !options.searchState
    && playedCards.length > AUTO_COMPOSITE_MAX_MAIN_CARD_COUNT
  ) {
    return []
  }

  const mainValue = evalMain(playedCards, { mode: options.mode })
  if (mainValue?.kind !== 'finite') return []

  const factors = factorizeBigInt(mainValue.value)
  if (!factors || factors.length === 0) return []

  const playedCardIds = new Set(playedCards.map(card => card.id))
  const availableCards = hand.filter(card => !playedCardIds.has(card.id))
  const factorSelections = selectFactorGroupCandidates(factors, availableCards, options.searchState)
  const candidates: AutomaticCompositePlayDetails[] = []

  for (const factorSelection of factorSelections) {
    if (!consumeAutomaticCompositeSearchStep(options.searchState)) break

    const validation = validateOfficialPlay(playedCards, {
      mode: options.mode,
      currentFieldValues: options.currentFieldValues,
      factorGroups: factorSelection.factorGroups,
      jokerValueByCardId: factorSelection.jokerValueByCardId,
    })

    if (!validation.ok || validation.playClass.kind !== 'composite') continue

    candidates.push({
      validation,
      factorCards: factorSelection.factorCards,
      factorGroups: factorSelection.factorGroups,
      jokerValueByCardId: factorSelection.jokerValueByCardId,
    })
  }

  return dedupeAutomaticCompositeCandidates(candidates)
}

function findFirstAutomaticCompositePlayCandidate(
  playedCards: PlayingCard[],
  factors: NonNullable<ReturnType<typeof factorizeBigInt>>,
  availableCards: PlayingCard[],
  options: {
    mode?: GameMode
    currentFieldValues?: readonly FieldValue[]
  },
  searchState: AutomaticCompositeSearchState,
): AutomaticCompositePlayDetails | null {
  function dfs(
    factorIndex: number,
    currentAvailableCards: PlayingCard[],
    factorGroups: PlayingCard[][][],
    factorCards: PlayingCard[],
    jokerValueByCardId: Map<string, number>,
  ): AutomaticCompositePlayDetails | null {
    if (!consumeAutomaticCompositeSearchStep(searchState)) return null

    const factor = factors[factorIndex]
    if (!factor) {
      const validation = validateOfficialPlay(playedCards, {
        mode: options.mode,
        currentFieldValues: options.currentFieldValues,
        factorGroups,
        jokerValueByCardId,
      })

      if (!validation.ok || validation.playClass.kind !== 'composite') return null

      return {
        validation,
        factorCards,
        factorGroups,
        jokerValueByCardId,
      }
    }

    const candidates = factor.exponent > 1
      ? [
          ...selectPowerFactorGroups(
            factor.prime,
            factor.exponent,
            currentAvailableCards,
            searchState,
          ),
          ...selectRepeatedFactorGroups(
            factor.prime,
            factor.exponent,
            currentAvailableCards,
            searchState,
          ),
        ]
      : selectSingleFactorGroups(factor.prime, currentAvailableCards, searchState)

    for (const candidate of candidates) {
      if (searchState.exhausted) return null

      const found = dfs(
        factorIndex + 1,
        candidate.remainingCards,
        [...factorGroups, ...candidate.factorGroups],
        [...factorCards, ...candidate.factorCards],
        mergeJokerAssignments(jokerValueByCardId, candidate.jokerValueByCardId),
      )
      if (found) return found
    }

    return null
  }

  return dfs(0, [...availableCards], [], [], new Map())
}

function dedupeAutomaticCompositeCandidates(
  candidates: AutomaticCompositePlayDetails[],
): AutomaticCompositePlayDetails[] {
  const seen = new Set<string>()
  return candidates.filter(candidate => {
    const key = formatFactorExpression(candidate.factorGroups, candidate.jokerValueByCardId)
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

function sameCardIds(cards: readonly PlayingCard[], cardIds: readonly string[]): boolean {
  if (cards.length !== cardIds.length) return false

  const cardIdSet = new Set(cards.map(card => card.id))
  return cardIdSet.size === cardIds.length && cardIds.every(cardId => cardIdSet.has(cardId))
}

function mergeJokerAssignments(
  base: ReadonlyMap<string, number>,
  addition: ReadonlyMap<string, number>,
): Map<string, number> {
  return new Map([...base, ...addition])
}

function selectFactorGroupCandidates(
  factors: NonNullable<ReturnType<typeof factorizeBigInt>>,
  availableCards: PlayingCard[],
  searchState?: AutomaticCompositeSearchState,
): FactorSelection[] {
  return selectFactorGroupsFromIndex(
    factors,
    0,
    [...availableCards],
    [],
    [],
    new Map(),
    searchState,
  )
}

function selectFactorGroupsFromIndex(
  factors: NonNullable<ReturnType<typeof factorizeBigInt>>,
  factorIndex: number,
  availableCards: PlayingCard[],
  factorGroups: PlayingCard[][][],
  factorCards: PlayingCard[],
  jokerValueByCardId: Map<string, number>,
  searchState?: AutomaticCompositeSearchState,
): FactorSelection[] {
  if (!consumeAutomaticCompositeSearchStep(searchState)) return []

  const factor = factors[factorIndex]
  if (!factor) {
    return [{
      factorGroups,
      factorCards,
      jokerValueByCardId,
    }]
  }

  const candidates = factor.exponent > 1
    ? [
        ...selectPowerFactorGroups(factor.prime, factor.exponent, availableCards, searchState),
        ...selectRepeatedFactorGroups(factor.prime, factor.exponent, availableCards, searchState),
      ]
    : selectSingleFactorGroups(factor.prime, availableCards, searchState)

  const selections: FactorSelection[] = []

  for (const candidate of candidates) {
    if (searchState?.exhausted) break

    selections.push(...selectFactorGroupsFromIndex(
      factors,
      factorIndex + 1,
      candidate.remainingCards,
      [...factorGroups, ...candidate.factorGroups],
      [...factorCards, ...candidate.factorCards],
      mergeJokerAssignments(jokerValueByCardId, candidate.jokerValueByCardId),
      searchState,
    ))
  }

  return selections
}

function selectSingleFactorGroups(
  prime: bigint,
  availableCards: PlayingCard[],
  searchState?: AutomaticCompositeSearchState,
): FactorCandidate[] {
  return takeTokenCardCandidates(prime, availableCards, searchState).map(primeToken => ({
    factorGroups: [[primeToken.token]],
    factorCards: primeToken.token,
    remainingCards: primeToken.remainingCards,
    jokerValueByCardId: primeToken.jokerValueByCardId,
  }))
}

function selectPowerFactorGroups(
  prime: bigint,
  exponent: number,
  availableCards: PlayingCard[],
  searchState?: AutomaticCompositeSearchState,
): FactorCandidate[] {
  const candidates: FactorCandidate[] = []

  for (const primeToken of takeTokenCardCandidates(prime, availableCards, searchState)) {
    if (searchState?.exhausted) break

    for (const exponentToken of takeTokenCardCandidates(
      BigInt(exponent),
      primeToken.remainingCards,
      searchState,
    )) {
      if (searchState?.exhausted) break

      candidates.push({
        factorGroups: [[primeToken.token, exponentToken.token]],
        factorCards: [...primeToken.token, ...exponentToken.token],
        remainingCards: exponentToken.remainingCards,
        jokerValueByCardId: mergeJokerAssignments(
          primeToken.jokerValueByCardId,
          exponentToken.jokerValueByCardId,
        ),
      })
    }
  }

  return candidates
}

function selectRepeatedFactorGroups(
  prime: bigint,
  exponent: number,
  availableCards: PlayingCard[],
  searchState?: AutomaticCompositeSearchState,
): FactorCandidate[] {
  return selectRepeatedFactorGroupsFromCount(
    prime,
    exponent,
    availableCards,
    [],
    [],
    new Map(),
    searchState,
  )
}

function selectRepeatedFactorGroupsFromCount(
  prime: bigint,
  remainingCount: number,
  availableCards: PlayingCard[],
  factorGroups: PlayingCard[][][],
  factorCards: PlayingCard[],
  jokerValueByCardId: Map<string, number>,
  searchState?: AutomaticCompositeSearchState,
): FactorCandidate[] {
  if (!consumeAutomaticCompositeSearchStep(searchState)) return []

  if (remainingCount <= 0) {
    return [{ factorGroups, factorCards, jokerValueByCardId, remainingCards: availableCards }]
  }

  const selections: FactorCandidate[] = []

  for (const primeToken of takeTokenCardCandidates(prime, availableCards, searchState)) {
    if (searchState?.exhausted) break

    selections.push(...selectRepeatedFactorGroupsFromCount(
      prime,
      remainingCount - 1,
      primeToken.remainingCards,
      [...factorGroups, [primeToken.token]],
      [...factorCards, ...primeToken.token],
      mergeJokerAssignments(jokerValueByCardId, primeToken.jokerValueByCardId),
      searchState,
    ))
  }

  return selections
}

function takeTokenCardCandidates(
  target: bigint,
  availableCards: PlayingCard[],
  searchState?: AutomaticCompositeSearchState,
): Array<{ token: PlayingCard[]; remainingCards: PlayingCard[]; jokerValueByCardId: Map<string, number> }> {
  return findTokenCardCandidates(target, availableCards, searchState).map(tokenCandidate => {
    const tokenIds = new Set(tokenCandidate.token.map(card => card.id))
    const remainingCards = [...availableCards]
    for (let index = availableCards.length - 1; index >= 0; index--) {
      if (tokenIds.has(remainingCards[index].id)) {
        remainingCards.splice(index, 1)
      }
    }

    return {
      token: tokenCandidate.token,
      remainingCards,
      jokerValueByCardId: tokenCandidate.jokerValueByCardId,
    }
  })
}

function findTokenCardCandidates(
  target: bigint,
  availableCards: readonly PlayingCard[],
  searchState?: AutomaticCompositeSearchState,
): Array<{ token: PlayingCard[]; jokerValueByCardId: Map<string, number> }> {
  if (!consumeAutomaticCompositeSearchStep(searchState)) return []

  const maxLength = Math.min(availableCards.length, target.toString().length)
  const candidates: Array<{ token: PlayingCard[]; jokerValueByCardId: Map<string, number> }> = []

  for (let length = 1; length <= maxLength; length++) {
    if (searchState?.exhausted) break

    collectTokenCardsByLength(
      target,
      availableCards,
      length,
      0,
      [],
      candidates,
      searchState,
    )
  }

  return candidates
}

function collectTokenCardsByLength(
  target: bigint,
  availableCards: readonly PlayingCard[],
  length: number,
  startIndex: number,
  current: PlayingCard[],
  candidates: Array<{ token: PlayingCard[]; jokerValueByCardId: Map<string, number> }>,
  searchState?: AutomaticCompositeSearchState,
): void {
  if (!consumeAutomaticCompositeSearchStep(searchState)) return

  if (current.length === length) {
    const jokerValueByCardId = findFactorTokenJokerAssignment(current, target, searchState)
    if (jokerValueByCardId) {
      candidates.push({ token: [...current], jokerValueByCardId })
    }
    return
  }

  for (let index = startIndex; index < availableCards.length; index++) {
    if (searchState?.exhausted) return

    current.push(availableCards[index])
    collectTokenCardsByLength(
      target,
      availableCards,
      length,
      index + 1,
      current,
      candidates,
      searchState,
    )
    current.pop()
  }
}

function findFactorTokenJokerAssignment(
  token: PlayingCard[],
  target: bigint,
  searchState?: AutomaticCompositeSearchState,
): Map<string, number> | null {
  if (!consumeAutomaticCompositeSearchStep(searchState)) return null

  const jokerCards = token.filter(isJokerCard)
  if (jokerCards.length === 0) {
    return evalFactorToken(token) === target ? new Map() : null
  }

  const assignment = new Map<string, number>()

  function search(index: number): Map<string, number> | null {
    if (!consumeAutomaticCompositeSearchStep(searchState)) return null

    if (index >= jokerCards.length) {
      return evalFactorToken(token, { jokerValueByCardId: assignment }) === target
        ? new Map(assignment)
        : null
    }

    const jokerCard = jokerCards[index]
    for (let value = 0; value <= 13; value++) {
      assignment.set(jokerCard.id, value)
      const found = search(index + 1)
      if (found) return found
    }

    assignment.delete(jokerCard.id)
    return null
  }

  return search(0)
}

function rejectDisabledRule(
  validation: Extract<OfficialPlayValidation, { ok: true }>,
  ruleOptions: PrimeDaifugoRuleOptions,
): string | null {
  if (
    validation.playClass.kind === 'grotanCut' &&
    !ruleOptions.grotanCut
  ) {
    return 'グロタンカットは現在の設定では使えません'
  }

  if (
    validation.playClass.kind === 'ramanujanRevolution' &&
    !ruleOptions.ramanujanRevolution
  ) {
    return 'ラマヌジャン革命は現在の設定では使えません'
  }

  if (
    validation.value.kind !== 'finite' &&
    !ruleOptions.singleJokerInfinity
  ) {
    return 'ジョーカー1枚出しは現在の設定では使えません'
  }

  if (
    validation.playClass.kind === 'composite' &&
    !ruleOptions.compositePlay
  ) {
    return '合成数出しは現在の設定では使えません'
  }

  return null
}

function findBestPrimeJokerValueAssignment(
  playedCards: PlayingCard[],
  options: {
    mode?: GameMode
    currentFieldValues?: readonly FieldValue[]
  } = {},
): ReadonlyMap<string, number> | undefined {
  if (playedCards.length <= 1) return undefined

  const jokerCards = playedCards.filter(isJokerCard)
  if (jokerCards.length === 0) return undefined

  // 2ジョーカー同時出しは例外として自動最適化しない。
  if (playedCards.length === 2 && jokerCards.length === 2) return undefined

  let bestValue: bigint | null = null
  let bestAssignment: Map<string, number> | undefined
  const current = new Map<string, number>()

  function explore(index: number) {
    if (index >= jokerCards.length) {
      const validation = validateOfficialPlay(playedCards, {
        mode: options.mode,
        currentFieldValues: options.currentFieldValues,
        jokerValueByCardId: current,
      })

      if (!validation.ok) return
      if (validation.playClass.kind !== 'prime') return
      if (validation.value.kind !== 'finite') return

      if (bestValue === null) {
        bestValue = validation.value.value
        bestAssignment = new Map(current)
        return
      }

      if (validation.value.value > bestValue) {
        bestValue = validation.value.value
        bestAssignment = new Map(current)
        return
      }

      if (
        validation.value.value === bestValue &&
        bestAssignment !== undefined &&
        compareJokerAssignments(jokerCards, current, bestAssignment) > 0
      ) {
        bestValue = validation.value.value
        bestAssignment = new Map(current)
      }
      return
    }

    const jokerCard = jokerCards[index]
    for (let value = 0; value <= 13; value++) {
      current.set(jokerCard.id, value)
      explore(index + 1)
    }
  }

  explore(0)

  return bestAssignment
}

function compareJokerAssignments(
  jokerCards: PlayingCard[],
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): number {
  for (const card of jokerCards) {
    const aValue = a.get(card.id) ?? -1
    const bValue = b.get(card.id) ?? -1
    if (aValue === bValue) continue
    return aValue > bValue ? 1 : -1
  }

  return 0
}

function resolveValidGamePlay(
  game: PrimeDaifugoGame,
  playedCards: PlayingCard[],
  validation: Extract<OfficialPlayValidation, { ok: true }>,
  factorCards: PlayingCard[] = [],
): void {
  flushFactorCards(game, factorCards)

  const playClass = validation.playClass
  if (playClass.kind === 'grotanCut') {
    game.field.push(playedCards)
    game.currentFieldValues.push(validation.value)
    clearField(game)
    return
  }

  if (validation.value.kind !== 'finite') {
    game.field.push(playedCards)
    game.currentFieldValues.push(validation.value)
    clearField(game)
    return
  }

  game.field.push(playedCards)

  if (playClass.kind === 'ramanujanRevolution') {
    game.currentFieldValues = [validation.value]
    game.mode = toggleGameMode(game.mode)
    moveToNextPlayer(game)
    return
  }

  game.currentFieldValues.push(validation.value)
  moveToNextPlayer(game)
}

function flushFactorCards(game: PrimeDaifugoGame, factorCards: PlayingCard[]): void {
  if (factorCards.length === 0) return

  game.deck.push(...factorCards)
  shuffleDeck(game.deck)
}

function lastCurrentFieldValue(game: PrimeDaifugoGame): FieldValue | null {
  return game.currentFieldValues[game.currentFieldValues.length - 1] ?? null
}

function createPlaySuccessMessage(
  validation: Extract<OfficialPlayValidation, { ok: true }>,
  factorGroups: FactorGroups = [],
  jokerValueByCardId: ReadonlyMap<string, number> = new Map(),
): string {
  if (validation.value.kind !== 'finite') return 'ジョーカーで場を流しました'

  if (validation.playClass.kind === 'prime') {
    return `${validation.value.value}は素数です`
  }
  if (validation.playClass.kind === 'grotanCut') return '57でグロタンカットです'
  if (validation.playClass.kind === 'ramanujanRevolution') {
    return '1729でラマヌジャン革命です'
  }

  const factorExpression = formatFactorExpression(factorGroups, jokerValueByCardId)
  return factorExpression
    ? `${validation.value.value}=${factorExpression}は合成数です`
    : `${validation.value.value}は合成数です`
}

function createPlayLogMessage(
  validation: Extract<OfficialPlayValidation, { ok: true }>,
  factorGroups: FactorGroups = [],
  jokerValueByCardId: ReadonlyMap<string, number> = new Map(),
): string {
  if (validation.value.kind !== 'finite') return 'ジョーカーで場を流しました！'

  if (validation.playClass.kind === 'prime') {
    return `${validation.value.value}は素数です！`
  }
  if (validation.playClass.kind === 'grotanCut') return 'グロタンカット！'
  if (validation.playClass.kind === 'ramanujanRevolution') return 'ラマヌジャン革命！'

  const factorExpression = formatFactorExpression(factorGroups, jokerValueByCardId)
  return factorExpression
    ? `${validation.value.value}=${factorExpression}は合成数です！`
    : `${validation.value.value}は合成数です！`
}

export function formatFactorExpression(
  factorGroups: FactorGroups,
  jokerValueByCardId: ReadonlyMap<string, number> = new Map(),
): string {
  return factorGroups
    .map(group => formatFactorGroup(group, jokerValueByCardId))
    .filter((group): group is string => Boolean(group))
    .join('×')
}

function formatFactorGroup(
  group: FactorGroup,
  jokerValueByCardId: ReadonlyMap<string, number>,
): string | null {
  const tokenValues = group.map(token => evalFactorToken(token, { jokerValueByCardId }))
  if (tokenValues.some(value => value === null)) return null

  const [base, ...exponents] = tokenValues as bigint[]
  if (base === undefined) return null
  if (exponents.length === 0) return base.toString()

  const exponentExpression = exponents.map(value => value.toString()).join('^')
  return `${base}^${exponentExpression}`
}

function formatFieldValue(value: FieldValue | null): string {
  if (!value) return 'NaN'
  if (value.kind === 'positiveInfinity') return '∞'
  if (value.kind === 'negativeInfinity') return '-∞'

  return value.value.toString()
}

function createPlayActionLogMessage(
  playerName: string,
  validation: Extract<OfficialPlayValidation, { ok: true }>,
): string {
  if (validation.value.kind !== 'finite') return `${playerName}がジョーカーを出しました`

  return `${playerName}が${formatFieldValue(validation.value)}を出しました`
}
