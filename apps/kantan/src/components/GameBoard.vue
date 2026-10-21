<template>
  <v-container fluid class="game-board pa-0">
    <v-row>
      <v-col cols="12" md="8" class="d-flex flex-column align-center">
        <v-container>
          <CpuPlayer v-if="gameState.players.value.length > 1" :player="gameState.players.value[1]" />
          <v-row class="mt-2 align-center justify-center">
            <v-col v-if="gameState.mode.value === 'revolution'" cols="auto">
              <v-chip color="deep-purple" variant="tonal">
                革命中
              </v-chip>
            </v-col>
            <v-col cols="auto">
              <v-btn
                :class="['deck-button', { 'deck-button--must-draw': mustDraw }]"
                :disabled="isGameLocked || deck.length === 0 || gameState.currentPlayer.value === 1 || gameState.players.value[0].hasDrawn"
                variant="tonal"
                color="primary"
                size="large"
                @click="drawCard"
              >
                <v-icon class="deck-button__icon" icon="mdi-cards" size="22" />
                <span class="deck-button__label">山札 {{ deck.length }}枚</span>
                <span class="deck-button__hint">カードを引く</span>
              </v-btn>
            </v-col>
            <v-col v-if="latestFieldValue" cols="auto">
              <v-chip variant="tonal">場 {{ latestFieldValue }}</v-chip>
            </v-col>
          </v-row>
          <v-row class="mt-4">
            <v-col class="d-flex justify-center">
              <v-container class="pa-0" fluid>
                <template v-if="gameState.field.value.length > 0">
                  <v-row
                    v-for="(fieldCards, fieldIndex) in gameState.field.value"
                    :key="fieldIndex"
                    class="align-center"
                  >
                    <v-col cols="12" class="py-2">
                      <FieldGroup :cards="fieldCards" />
                    </v-col>
                  </v-row>
                </template>
                <FieldGroup v-else :cards="[]" />
              </v-container>
            </v-col>
          </v-row>
          <PlayerHand
            v-if="gameState.players.value.length > 0"
            :player="gameState.players.value[0]"
            :isDisable="isGameLocked || gameState.currentPlayer.value === 1"
            :mode="gameState.mode.value"
            :currentFieldValues="gameState.currentFieldValues.value"
            :compositePlay="gameState.ruleOptions.value.compositePlay"
            @toggle-select-card="handleToggleSelectCard"
            @clear-pile="handleClearPile"
            @execute-action="handleExecuteAction"
          />
          <v-row class="mt-4 justify-end">
            <v-col cols="auto">
              <v-btn
                v-if="isHintAvailable"
                :disabled="isGameLocked"
                @click="handleShowHint"
                color="info"
                variant="tonal"
                prepend-icon="mdi-lightbulb-on-outline"
                class="ma-1"
              >
                ヒント
              </v-btn>
              <v-btn
                v-if="gameState.round.value > 0 && gameState.players.value.length > 1"
                :disabled="isGameLocked || gameState.currentPlayer.value === 1"
                @click="handlePass"
                color="warning"
                variant="tonal"
                prepend-icon="mdi-hand-back-right"
                :class="['ma-1', 'pass-btn', { 'pass-btn--must-pass': mustPass }]"
              >
                パス
              </v-btn>
            </v-col>
          </v-row>
          <v-row v-if="hintMessage" class="mt-1">
            <v-col>
              <v-alert
                v-model="showHint"
                type="info"
                variant="tonal"
                density="compact"
                closable
              >
                {{ hintMessage }}
              </v-alert>
            </v-col>
          </v-row>
          <v-row class="mt-4">
            <v-col class="d-flex justify-center">
              <GameControls />
            </v-col>
          </v-row>
          <v-dialog v-model="gameState.showErrorDialogState.value" max-width="600px">
            <v-card>
              <v-card-title class="headline">エラー</v-card-title>
              <v-card-text class="text-error">{{ gameState.errorMessage.value }}</v-card-text>
              <v-card-actions>
                <v-btn text @click="closeErrorDialog">閉じる</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-dialog
            v-model="gameState.showWinDialogState.value"
            max-width="600px"
            :persistent="!canCloseEndDialog"
          >
            <v-card>
              <v-card-title class="headline">ゲーム終了</v-card-title>
              <v-card-text class="text-red">あなたの勝ちです！</v-card-text>
              <v-card-text v-if="shouldShowEndGameAd" class="pt-0">
                <AdContainer
                  :is-development="isDevelopment"
                  :is-visible="gameState.showWinDialogState.value"
                  :enable-real-ads="enableRealAds"
                  :adsense-client="adsenseClient"
                  :adsense-slot="adsenseSlot"
                  :adsense-format="adsenseFormat"
                  :full-width-responsive="fullWidthResponsive"
                />
              </v-card-text>
              <v-card-text v-if="!canCloseEndDialog" class="text-caption text-medium-emphasis pt-0">
                広告を表示中です。あと{{ endDialogCountdown }}秒で閉じられます。
              </v-card-text>
              <v-card-actions>
                <v-btn text :disabled="!canCloseEndDialog" @click="closeDialog">
                  {{ canCloseEndDialog ? '閉じる' : `閉じる (${endDialogCountdown})` }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-dialog
            v-model="gameState.showLoseDialogState.value"
            max-width="600px"
            :persistent="!canCloseEndDialog"
          >
            <v-card>
              <v-card-title class="headline">ゲーム終了</v-card-title>
              <v-card-text class="text-blue">あなたの負けです。</v-card-text>
              <v-card-text v-if="shouldShowEndGameAd" class="pt-0">
                <AdContainer
                  :is-development="isDevelopment"
                  :is-visible="gameState.showLoseDialogState.value"
                  :enable-real-ads="enableRealAds"
                  :adsense-client="adsenseClient"
                  :adsense-slot="adsenseSlot"
                  :adsense-format="adsenseFormat"
                  :full-width-responsive="fullWidthResponsive"
                />
              </v-card-text>
              <v-card-text v-if="!canCloseEndDialog" class="text-caption text-medium-emphasis pt-0">
                広告を表示中です。あと{{ endDialogCountdown }}秒で閉じられます。
              </v-card-text>
              <v-card-actions>
                <v-btn text :disabled="!canCloseEndDialog" @click="closeDialog">
                  {{ canCloseEndDialog ? '閉じる' : `閉じる (${endDialogCountdown})` }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-container>
      </v-col>
      <v-col cols="12" md="4" class="d-flex flex-column">
        <v-list class="logs" dense>
          <v-list-item v-for="(log, index) in gameState.logs.value.slice(0).reverse()" :key="index">
            <v-list-item-title>{{ log }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useEndGameAd } from '../composables/useEndGameAd'
import { useGameContext } from '../composables/useGameState'
import { isJokerCard } from '../lib/cards'
import { findAutomaticCompositePlayCandidates } from '../lib/primeDaifugo'
import type { FieldValue } from '../lib/ruleState'
import type { PlayingCard } from '../types/PlayingCard'
import { validateOfficialPlay } from '../lib/ruleValues'
import AdContainer from './AdContainer.vue'
import CpuPlayer from './CpuPlayer.vue'
import FieldGroup from './FieldGroup.vue'
import GameControls from './GameControls.vue'
import PlayerHand from './PlayerHand.vue'

const gameState = useGameContext()
const {
  shouldShowEndGameAd,
  isDevelopment,
  enableRealAds,
  adsenseClient,
  adsenseSlot,
  adsenseFormat,
  fullWidthResponsive,
} = useEndGameAd(
  gameState.showWinDialogState,
  gameState.showLoseDialogState,
)
const endDialogCountdown = ref(0)
const canCloseEndDialog = ref(true)
const hintMessage = ref('')
const showHint = ref(false)

let endDialogTimer: ReturnType<typeof setInterval> | null = null

function randomAdLockSeconds(): number {
  const min = 5
  const max = 15

  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clearEndDialogTimer() {
  if (endDialogTimer) {
    clearInterval(endDialogTimer)
    endDialogTimer = null
  }
}

function startEndDialogCountdown() {
  clearEndDialogTimer()
  endDialogCountdown.value = randomAdLockSeconds()
  canCloseEndDialog.value = false

  endDialogTimer = setInterval(() => {
    if (endDialogCountdown.value <= 1) {
      endDialogCountdown.value = 0
      canCloseEndDialog.value = true
      clearEndDialogTimer()
      return
    }
    endDialogCountdown.value -= 1
  }, 1000)
}

watch(
  shouldShowEndGameAd,
  isOpen => {
    if (isOpen) {
      startEndDialogCountdown()
      return
    }

    canCloseEndDialog.value = true
    endDialogCountdown.value = 0
    clearEndDialogTimer()
  },
)

watch(showHint, isOpen => {
  if (!isOpen) hintMessage.value = ''
})

onBeforeUnmount(() => {
  clearEndDialogTimer()
})

const deck = computed(() => gameState.deck.value)
const isGameLocked = computed(
  () => gameState.gameEnded.value
    || gameState.showWinDialogState.value
    || gameState.showLoseDialogState.value,
)
const hintCards = computed(() => {
  if (isGameLocked.value || gameState.currentPlayer.value === 1) return null
  // 初期配布時は currentPlayer が変わらないため、手札の更新も依存関係に含める。
  if (!gameState.players.value[0]) return null
  return gameState.getHint()
})
const hasHint = computed(() => hintCards.value !== null)
const isHintAvailable = computed(() =>
  gameState.ruleOptions.value.judgementAssist && hasHint.value,
)

// 手札に1枚も出せるカードがない（パスするしかない）状態
const mustPass = computed(() => {
  if (isGameLocked.value) return false
  if (gameState.currentPlayer.value === 1) return false
  const player = gameState.players.value[0]
  if (!player) return false
  return !hasAnyPlayableHand(player.hand)
})

// パスするしかない かつ まだドローしていない かつ 山札あり
const mustDraw = computed(() => {
  if (isGameLocked.value) return false
  if (!mustPass.value) return false
  const player = gameState.players.value[0]
  if (!player || player.hasDrawn) return false
  return deck.value.length > 0
})

const latestFieldValue = computed(() =>
  formatFieldValue(
    gameState.currentFieldValues.value[gameState.currentFieldValues.value.length - 1],
  ),
)

function drawCard() {
  if (isGameLocked.value) return
  dismissHint()
  gameState.executeAction('draw')
}

function handleExecuteAction(actionType: string, factorCardIds?: string[]) {
  if (isGameLocked.value) return
  dismissHint()
  gameState.executeAction(actionType, { factorCardIds })
}

function handlePass() {
  if (isGameLocked.value) return
  dismissHint()
  handleClearPile()
  gameState.executeAction('pass')
}

function handleShowHint() {
  if (
    isGameLocked.value
    || gameState.currentPlayer.value === 1
    || !gameState.ruleOptions.value.judgementAssist
  ) return

  const cards = gameState.getHint()
  if (!cards) return

  const player = gameState.players.value[0]
  player.pile = cards
    .map(card => player.hand.find(handCard => handCard.id === card.id))
    .filter((card): card is PlayingCard => Boolean(card))
  hintMessage.value = '出せるおすすめのカードを選択状態にしました。'

  showHint.value = true
}

function handleToggleSelectCard(card: PlayingCard) {
  if (isGameLocked.value) return
  dismissHint()
  const currentPlayer = gameState.players.value[0]
  const cardIndexInPile = currentPlayer.pile.findIndex(c => c.id === card.id)
  if (cardIndexInPile !== -1) {
    currentPlayer.pile.splice(cardIndexInPile, 1)
  } else {
    currentPlayer.pile.push(card)
  }
}

function handleClearPile() {
  dismissHint()
  const currentPlayer = gameState.players.value[0]
  currentPlayer.pile = []
}

function dismissHint() {
  showHint.value = false
  hintMessage.value = ''
}

function closeErrorDialog() {
  gameState.showErrorDialogState.value = false
}

function closeDialog() {
  if (!canCloseEndDialog.value) return

  gameState.showWinDialogState.value = false
  gameState.showLoseDialogState.value = false
}

function formatFieldValue(value: FieldValue | undefined): string {
  if (!value) return ''
  if (value.kind === 'positiveInfinity') return '∞'
  if (value.kind === 'negativeInfinity') return '-∞'

  return value.value.toString()
}

function hasAnyPlayableHand(hand: PlayingCard[]): boolean {
  if (hand.length === 0) return false

  const lastField = gameState.field.value[gameState.field.value.length - 1] ?? []
  const allowedSizes = lastField.length > 0
    ? [lastField.length]
    : Array.from({
      length: gameState.ruleOptions.value.maxPlayableCards === 'infinity'
        ? hand.length
        : Math.min(hand.length, gameState.ruleOptions.value.maxPlayableCards),
    }, (_, index) => index + 1)

  for (const size of allowedSizes) {
    if (size <= 0 || hand.length < size) continue
    const combinations = getCombinations(hand, size)

    for (const combination of combinations) {
      const candidates = size <= 1
        ? [combination]
        : getPermutations(combination)

      for (const cards of candidates) {
        if (isPlayablePrime(cards) || isPlayableComposite(cards, hand)) {
          return true
        }
      }
    }
  }

  return false
}

function isPlayablePrime(cards: PlayingCard[]): boolean {
  const jokerCards = cards.filter(isJokerCard)

  if (jokerCards.length === 0) {
    return isAllowedByRuleOptions(validateOfficialPlay(cards, {
      mode: gameState.mode.value,
      currentFieldValues: gameState.currentFieldValues.value,
    }))
  }

  const jokerValueByCardId = new Map<string, number>()

  function search(index: number): boolean {
    if (index >= jokerCards.length) {
      return isAllowedByRuleOptions(validateOfficialPlay(cards, {
        mode: gameState.mode.value,
        currentFieldValues: gameState.currentFieldValues.value,
        jokerValueByCardId,
      }))
    }

    const jokerCard = jokerCards[index]
    for (let value = 0; value <= 13; value++) {
      jokerValueByCardId.set(jokerCard.id, value)
      if (search(index + 1)) return true
    }

    jokerValueByCardId.delete(jokerCard.id)
    return false
  }

  return search(0)
}

function isPlayableComposite(
  playedCards: PlayingCard[],
  hand: PlayingCard[],
): boolean {
  if (!gameState.ruleOptions.value.compositePlay) return false

  const candidates = findAutomaticCompositePlayCandidates(playedCards, hand, {
    mode: gameState.mode.value,
    currentFieldValues: gameState.currentFieldValues.value,
    compositePlay: gameState.ruleOptions.value.compositePlay,
  })

  return candidates.length > 0
}

function isAllowedByRuleOptions(
  validation: ReturnType<typeof validateOfficialPlay>,
): boolean {
  if (!validation.ok) return false

  if (
    validation.playClass.kind === 'grotanCut'
    && !gameState.ruleOptions.value.grotanCut
  ) {
    return false
  }

  if (
    validation.playClass.kind === 'ramanujanRevolution'
    && !gameState.ruleOptions.value.ramanujanRevolution
  ) {
    return false
  }

  if (
    validation.value.kind !== 'finite'
    && !gameState.ruleOptions.value.singleJokerInfinity
  ) {
    return false
  }

  if (
    validation.playClass.kind === 'composite'
    && !gameState.ruleOptions.value.compositePlay
  ) {
    return false
  }

  return true
}

function getCombinations<T>(array: T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (array.length === 0) return []

  const [first, ...rest] = array
  const withoutFirst = getCombinations(rest, size)
  const withFirst = getCombinations(rest, size - 1).map(combo => [first, ...combo])

  return [...withoutFirst, ...withFirst]
}

function getPermutations<T>(array: T[]): T[][] {
  if (array.length <= 1) return [array]

  const permutations: T[][] = []

  for (let index = 0; index < array.length; index++) {
    const head = array[index]
    const tail = [...array.slice(0, index), ...array.slice(index + 1)]
    const tailPermutations = getPermutations(tail)
    for (const tailPermutation of tailPermutations) {
      permutations.push([head, ...tailPermutation])
    }
  }

  return permutations
}
</script>

<style scoped>
.deck-button {
  min-width: 180px;
  min-height: 76px;
  padding: 14px 22px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  letter-spacing: 0.03em;
  border: 1px solid rgba(25, 118, 210, 0.18);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(232, 242, 255, 0.92)),
    linear-gradient(135deg, rgba(25, 118, 210, 0.08), rgba(25, 118, 210, 0.02));
  box-shadow:
    0 10px 24px rgba(25, 118, 210, 0.14),
    0 2px 6px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    filter 0.18s ease;
  text-transform: none;
}

.deck-button:not(.v-btn--disabled):hover {
  transform: translateY(-2px);
  border-color: rgba(25, 118, 210, 0.35);
  box-shadow:
    0 14px 28px rgba(25, 118, 210, 0.18),
    0 4px 10px rgba(15, 23, 42, 0.1);
  filter: saturate(1.04);
}

.deck-button:not(.v-btn--disabled):active {
  transform: translateY(0);
  box-shadow:
    0 8px 18px rgba(25, 118, 210, 0.14),
    0 2px 6px rgba(15, 23, 42, 0.08);
}

.deck-button.v-btn--disabled {
  background: linear-gradient(180deg, rgba(243, 246, 249, 0.96), rgba(233, 238, 244, 0.94));
  border-color: rgba(100, 116, 139, 0.16);
  box-shadow: none;
  opacity: 0.78;
}

.deck-button__icon {
  color: rgba(25, 118, 210, 0.88);
}

.deck-button__label {
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1.1;
}

.deck-button__hint {
  font-size: 0.78rem;
  line-height: 1.1;
  opacity: 0.9;
}

.deck-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.field-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-x: auto;
}

.pass-btn {
  font-weight: 700;
  letter-spacing: 0.05em;
  border-radius: 12px;
  border: 1px solid rgba(237, 108, 2, 0.25);
  box-shadow:
    0 8px 20px rgba(237, 108, 2, 0.2),
    0 2px 6px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    filter 0.18s ease;
}

.pass-btn:not(.v-btn--disabled):hover {
  transform: translateY(-2px);
  border-color: rgba(237, 108, 2, 0.45);
  box-shadow:
    0 12px 28px rgba(237, 108, 2, 0.28),
    0 4px 10px rgba(15, 23, 42, 0.1);
  filter: saturate(1.06);
}

.pass-btn:not(.v-btn--disabled):active {
  transform: translateY(0);
  box-shadow:
    0 4px 12px rgba(237, 108, 2, 0.18),
    0 2px 4px rgba(15, 23, 42, 0.08);
}

.pass-btn.v-btn--disabled {
  border-color: rgba(100, 116, 139, 0.16);
  box-shadow: none;
  opacity: 0.6;
}

.pass-btn--must-pass {
  animation: pass-pulse 1.2s ease-in-out infinite;
}

.deck-button--must-draw {
  animation: deck-pulse 1.2s ease-in-out infinite;
}

@keyframes deck-pulse {
  0%, 100% {
    box-shadow:
      0 10px 24px rgba(25, 118, 210, 0.14),
      0 2px 6px rgba(15, 23, 42, 0.08);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(25, 118, 210, 0.18),
      0 12px 32px rgba(25, 118, 210, 0.42),
      0 2px 8px rgba(15, 23, 42, 0.12);
    transform: scale(1.04);
  }
}

@keyframes pass-pulse {
  0%, 100% {
    box-shadow:
      0 8px 20px rgba(237, 108, 2, 0.2),
      0 2px 6px rgba(15, 23, 42, 0.08);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(237, 108, 2, 0.18),
      0 10px 28px rgba(237, 108, 2, 0.45),
      0 2px 8px rgba(15, 23, 42, 0.12);
    transform: scale(1.06);
  }
}
</style>
