import { ref, provide, inject } from 'vue'
import type { Ref } from 'vue'
import type { PlayingCard } from '../types/PlayingCard'
import type { Player } from '../types/Player'
import {
  createPrimeDaifugoGame,
  drawCard as drawCardWithEngine,
  getCpuPlayableHint,
  passTurn as passTurnWithEngine,
  playCards as playCardsWithEngine,
  playCpuTurn,
  type PrimeDaifugoGame,
  type PlayCardsOptions,
  type PrimeDaifugoRuleOptions,
  type CpuSkillProfile,
} from '../lib/primeDaifugo'
import type { FieldValue, GameMode } from '../lib/ruleState'

export function useGameState() {
  const players = ref<Player[]>([])
  const deck = ref<PlayingCard[]>([])
  const pile = ref<PlayingCard[]>([]) // 捨て札
  const field = ref<PlayingCard[][]>([]) // 場
  const currentFieldValues = ref<FieldValue[]>([])
  const mode = ref<GameMode>('normal')
  const ruleOptions = ref<PrimeDaifugoRuleOptions>({
    grotanCut: false,
    ramanujanRevolution: false,
    singleJokerInfinity: true,
    compositePlay: false,
    penaltyEnabled: false,
    judgementAssist: true,
    maxPlayableCards: 2,
    cpuSkill: { memory: 1, judgement: 1, strategy: 1 },
  })
  const currentPlayer = ref(0)
  const round = ref(1)
  const logs = ref<string[]>([]) // ログを管理するステート
  const showWinDialogState = ref(false) // ダイアログの表示状態
  const showLoseDialogState = ref(false) // ダイアログの表示状態
  const gameEnded = ref(false)

  const showErrorDialogState = ref(false) // エラーダイアログの表示状態
  const errorMessage = ref('') // エラーメッセージを管理
  const newlyAddedCardIds = ref<Set<string>>(new Set()) // 新規追加カード（ドロー/ペナルティ）のID
  const drawnCardIds = ref<Set<string>>(new Set()) // ドロー時のアニメーション追跡用
  let engineGame: PrimeDaifugoGame | null = null
  let openCpuCards = false
  let cpuTurnTimer: ReturnType<typeof setTimeout> | null = null
  let isCpuTurnRunning = false

  function clearPendingCpuTurn() {
    if (!cpuTurnTimer) return
    clearTimeout(cpuTurnTimer)
    cpuTurnTimer = null
  }

  function showErrorDialog(message: string) {
    errorMessage.value = message
    showErrorDialogState.value = true
    // console.error(`[ERROR] ${message}`) // デバッグ用にコンソールにも出力
  }

  function appendLog(message: string) {
    logs.value.push(message)
    // console.log(`[LOG] ${message}`) // デバッグ用にコンソールにも出力
  }

  function initializeGame(
    playerList: Player[],
    options: {
      initialHandSize?: number
      evenReduceSize?: number
      jokerCount?: number
      grotanCut?: boolean
      ramanujanRevolution?: boolean
      compositePlay?: boolean
      penaltyEnabled?: boolean
      judgementAssist?: boolean
      openCard?: boolean
      maxPlayableCards?: number | 'infinity'
      cpuSkill?: CpuSkillProfile
    } = {},
  ) {
    clearPendingCpuTurn()
    isCpuTurnRunning = false

    const initialHandSize = options.initialHandSize ?? 5
    const openCard = options.openCard ?? false
    const evenReduceSize = options.evenReduceSize ?? 0 // 偶数カードの枚数
    const jokerCount = options.jokerCount ?? 0
    openCpuCards = openCard

    field.value = [] // 場を初期化
    pile.value = [] // 捨て札を初期化
    logs.value = [] // ログを初期化
    showWinDialogState.value = false
    showLoseDialogState.value = false
    gameEnded.value = false
    showErrorDialogState.value = false

    engineGame = createPrimeDaifugoGame({
      players: playerList.map(player => ({
        id: player.id,
        name: player.name,
        isCPU: player.isCPU,
      })),
      initialHandSize,
      evenReduceSize,
      jokerCount,
      ruleOptions: {
        grotanCut: options.grotanCut ?? true,
        ramanujanRevolution: options.ramanujanRevolution ?? true,
        compositePlay: options.compositePlay ?? false,
        penaltyEnabled: options.penaltyEnabled ?? false,
        judgementAssist: options.judgementAssist ?? true,
        maxPlayableCards: options.maxPlayableCards ?? 'infinity',
        cpuSkill: options.cpuSkill,
      },
    })

    syncFromEngine()
    maybeHandleCpuTurn()
  }

  function startNewGame() {
    const initialHandSize = parseInt(localStorage.getItem('initialHandSize') || '7', 10)
    const evenReduceSize = parseInt(localStorage.getItem('evenReduceSize') || '13', 10)
    const jokerCount = parseInt(localStorage.getItem('jokerCount') || '2', 10)
    const maxPlayableCardsSetting = localStorage.getItem('maxPlayableCards')
    const memorySetting = localStorage.getItem('cpuMemoryLevel')
    const judgementSetting = localStorage.getItem('cpuJudgementLevel')
    const strategySetting = localStorage.getItem('cpuStrategyLevel')

    initializeGame(
      [
        {
          id: 'you',
          name: 'あなた',
          hand: [],
          pile: [],
          field: [],
          openCard: false,
          isPassed: false,
          hasDrawn: false,
          isCPU: false,
        },
        {
          id: 'cpu',
          name: 'コンピューター',
          hand: [],
          pile: [],
          field: [],
          openCard: false,
          isPassed: false,
          hasDrawn: false,
          isCPU: true,
        },
      ],
      {
        initialHandSize,
        evenReduceSize,
        jokerCount,
        grotanCut: localStorage.getItem('grotanCut') !== 'false',
        ramanujanRevolution: localStorage.getItem('ramanujanRevolution') !== 'false',
        compositePlay: localStorage.getItem('compositePlay') === 'true',
        penaltyEnabled: localStorage.getItem('penaltyEnabled') === 'true',
        judgementAssist: localStorage.getItem('judgementAssist') !== 'false',
        openCard: localStorage.getItem('openCard') === 'true',
          maxPlayableCards: maxPlayableCardsSetting === 'infinity'
            ? 'infinity'
            : (maxPlayableCardsSetting === null ? 2 : parseInt(maxPlayableCardsSetting, 10)),
          cpuSkill: {
            memory: memorySetting === 'infinity' ? 'infinity' : (Number(memorySetting) || 1) as 1 | 2 | 3,
            judgement: judgementSetting === 'infinity' ? 'infinity' : (Number(judgementSetting) || 1) as 1 | 2 | 3,
            strategy: (Number(strategySetting) || 1) as 1 | 2 | 3,
          },
      },
    )
  }

  function executeAction(type: string, options: PlayCardsOptions = {}) {
    const player = players.value[currentPlayer.value]
    if (!engineGame || !player) {
      showErrorDialog(`ゲームが開始されていません`)
      return
    }

    if (engineGame.winnerId) {
      showErrorDialog('ゲームは終了しています。次のゲームを開始してください')
      return
    }

    if (type === 'put') {
      if (player.pile.length > 0) {
        const actionPlayerId = player.id
        const playedCards = player.pile
        const cardIndexes = playedCards
          .map(card => engineGame?.players[engineGame.currentPlayer].hand.findIndex(
            handCard => handCard.id === card.id,
          ) ?? -1)
          .filter(index => index >= 0)
        const result = playCardsWithEngine(engineGame, cardIndexes, options)
        if (!result.ok) {
          showErrorDialog(result.message)
          return
        }

        // ドロー分のカードをアニメーション追跡
        const isPenalty = result.foulReason !== undefined
        if (result.drawnCardIds) {
          result.drawnCardIds.forEach(id => drawnCardIds.value.add(id))
        }

        // ペナルティ後は pile をクリア
        if (isPenalty) {
          player.pile = []
        }

        appendLog(result.message)
        syncFromEngine()
        
        // 手番移動後でも、実際に操作したプレイヤーの選択状態を確実に消す
        if (isPenalty) {
          const actionPlayer = players.value.find(player => player.id === actionPlayerId)
          if (actionPlayer) actionPlayer.pile = []
        }
        
        if (result.winnerId) {
          result.winnerId === 'you' ? winGame() : loseGame()
          return
        }
        maybeHandleCpuTurn()
      } else {
        showErrorDialog(`出せません`)
      }
    } else if (type === 'draw') {
      const result = drawCardWithEngine(engineGame)
      if (!result.ok) {
        showErrorDialog(result.message)
        return
      }
      // ドロー時のカードをアニメーション追跡
      if (result.drawnCardIds) {
        result.drawnCardIds.forEach(id => drawnCardIds.value.add(id))
      }
      appendLog(result.message)
      syncFromEngine()
    } else if (type === 'pass') {
      const result = passTurnWithEngine(engineGame)
      appendLog(result.message)
      syncFromEngine()
      // パス時はアニメーション用カード追跡をクリア
      drawnCardIds.value.clear()
      maybeHandleCpuTurn()
    } else {
      showErrorDialog(`無効なアクションタイプ: ${type}`)
    }
  }

  function getHint(): PlayingCard[] | null {
    if (!engineGame || engineGame.winnerId) return null
    if (engineGame.currentPlayer !== 0) return null

    return getCpuPlayableHint(engineGame)
  }

  function moveToNextPlayer() {
    if (!engineGame) return
    engineGame.currentPlayer = (engineGame.currentPlayer + 1) % engineGame.players.length
    engineGame.players[engineGame.currentPlayer].hasDrawn = false
    syncFromEngine()
    maybeHandleCpuTurn()
    appendLog(`${players.value[currentPlayer.value].name}の手番です`)
  }

  function nextRound() {
    if (engineGame) {
      engineGame.round++
      engineGame.players.forEach(player => {
        player.isPassed = false
        player.hasDrawn = false
      })
    }
    syncFromEngine()
    appendLog(`第${round.value}ラウンド開始`)
  }

  function winGame() {
    clearPendingCpuTurn()
    showWinDialogState.value = true // ダイアログを表示
  }

  function loseGame() {
    clearPendingCpuTurn()
    showLoseDialogState.value = true // ダイアログを表示
  }

  function syncFromEngine() {
    if (!engineGame) return

    const previousPlayers = players.value
    players.value = engineGame.players.map(enginePlayer => {
      const previousPlayer = previousPlayers.find(player => player.id === enginePlayer.id)

      return {
        id: enginePlayer.id,
        name: enginePlayer.name,
        isCPU: enginePlayer.isCPU,
        openCard: enginePlayer.isCPU ? openCpuCards : false,
        hand: enginePlayer.hand,
        pile: previousPlayer?.pile.filter(card =>
          enginePlayer.hand.some(handCard => handCard.id === card.id),
        ) ?? [],
        field: previousPlayer?.field ?? [],
        hasDrawn: enginePlayer.hasDrawn,
        isPassed: enginePlayer.isPassed,
      }
    })
    deck.value = engineGame.deck
    field.value = engineGame.field.map(fieldCards => [...fieldCards])
    currentFieldValues.value = [...engineGame.currentFieldValues]
    mode.value = engineGame.mode
    ruleOptions.value = { ...engineGame.ruleOptions }
    currentPlayer.value = engineGame.currentPlayer
    round.value = engineGame.round
    logs.value = [...engineGame.logs]
    gameEnded.value = Boolean(engineGame.winnerId)
  }

  function maybeHandleCpuTurn() {
    if (!engineGame || engineGame.winnerId) return
    const cpuPlayer = players.value[currentPlayer.value]
    if (!cpuPlayer?.isCPU) return
    if (cpuTurnTimer || isCpuTurnRunning) return

    cpuTurnTimer = setTimeout(() => {
      cpuTurnTimer = null
      if (!engineGame || engineGame.winnerId) return
      if (isCpuTurnRunning) return

      isCpuTurnRunning = true
      try {
        const result = playCpuTurn(engineGame)
        syncFromEngine()
        if (result.winnerId) {
          loseGame()
        }
        maybeHandleCpuTurn()
      } finally {
        isCpuTurnRunning = false
      }
    }, 1618)
  }

  const gameState = {
    players,
    deck,
    pile,
    field,
    currentFieldValues,
    mode,
    ruleOptions,
    currentPlayer,
    round,
    initializeGame,
    startNewGame,
    executeAction,
    getHint,
    moveToNextPlayer,
    nextRound,
    logs,
    errorMessage,
    showErrorDialogState,
    showWinDialogState,
    showLoseDialogState,
    gameEnded,
    newlyAddedCardIds,
    drawnCardIds,
  }

  provide('gameState', gameState)

  return gameState
}

export function useGameContext() {
  const gameState = inject('gameState', null)

  if (!gameState) {
    throw new Error(
      'gameState is not provided. Ensure useGameState is called in a parent component.',
    )
  }

  return gameState as {
    players: Ref<Player[]>
    deck: Ref<PlayingCard[]>
    pile: Ref<PlayingCard[]>
    field: Ref<PlayingCard[][]>
    currentFieldValues: Ref<FieldValue[]>
    mode: Ref<GameMode>
    ruleOptions: Ref<PrimeDaifugoRuleOptions>
    currentPlayer: Ref<number>
    round: Ref<number>
    newlyAddedCardIds: Ref<Set<string>>
    drawnCardIds: Ref<Set<string>>
    initializeGame: (
      playerList: Player[],
      options?: {
        initialHandSize?: number
        evenReduceSize?: number
        jokerCount?: number
        grotanCut?: boolean
        ramanujanRevolution?: boolean
        compositePlay?: boolean
        penaltyEnabled?: boolean
        judgementAssist?: boolean
        openCard?: boolean
        maxPlayableCards?: number | 'infinity'
      },
    ) => void
    startNewGame: () => void
    executeAction: (type: string, options?: PlayCardsOptions) => void
    getHint: () => PlayingCard[] | null
    moveToNextPlayer: () => void
    nextRound: () => void
    logs: Ref<string[]>
    errorMessage: Ref<string>
    showErrorDialogState: Ref<boolean>
    showWinDialogState: Ref<boolean>
    showLoseDialogState: Ref<boolean>
    gameEnded: Ref<boolean>
  }
}
