<script setup lang="ts">
import { useGameState } from './composables/useGameState'
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'

const GameBoard = defineAsyncComponent(() => import('./components/GameBoard.vue'))
const PrimeList = defineAsyncComponent(() => import('./components/PrimeList.vue'))

const gameState = useGameState()

const introModalSeenKey = 'introModalSeen'

const drawer = ref(false)

const isSettingsChanged = ref(false) // 設定が変更されたかどうかを追跡

const showSettingsState = ref(false)
const showHelpState = ref(false)
const showAboutState = ref(false)
const showPrimeListState = ref(false)
const showAdvancedSettings = ref(false)

type SettingsSnapshot = {
  initialHandSize: number
  evenReduceSize: number
  jokerCount: number
  maxPlayableCards: number | 'infinity'
  openCard: boolean
  judgementAssist: boolean
  grotanCut: boolean
  ramanujanRevolution: boolean
  compositePlay: boolean
  penaltyEnabled: boolean
  cpuMemoryLevel: number | 'infinity'
  cpuJudgementLevel: number | 'infinity'
  cpuStrategyLevel: number
}

type MaxPlayableCardsOption = {
  title: string
  value: number | 'infinity'
}

type RulePreset = 'easy' | 'normal'
type CpuPreset = 'beginner' | 'intermediate' | 'advanced' | 'maximum'

const maxPlayableCardOptions: MaxPlayableCardsOption[] = [
  { title: '2枚まで', value: 2 },
  { title: '3枚まで', value: 3 },
  { title: '4枚まで', value: 4 },
  { title: '制限なし', value: 'infinity' },
]

const initialHandSize = ref<number>(
  parseInt(localStorage.getItem('initialHandSize') || '7', 10),
)
const evenReduceSize = ref<number>(
  parseInt(localStorage.getItem('evenReduceSize') || '13', 10),
)
const jokerCount = ref<number>(
  parseInt(localStorage.getItem('jokerCount') || '2', 10),
)
const maxPlayableCards = ref<number | 'infinity'>(
  localStorage.getItem('maxPlayableCards') === null
    ? 2
    : localStorage.getItem('maxPlayableCards') === 'infinity'
      ? 'infinity'
      : parseInt(localStorage.getItem('maxPlayableCards') || '4', 10),
)
const openCard = ref<boolean>(localStorage.getItem('openCard') === 'true')
const judgementAssist = ref<boolean>(localStorage.getItem('judgementAssist') !== 'false')
const grotanCut = ref<boolean>(localStorage.getItem('grotanCut') === 'true')
const ramanujanRevolution = ref<boolean>(
  localStorage.getItem('ramanujanRevolution') === 'true',
)
const compositePlay = ref<boolean>(localStorage.getItem('compositePlay') === 'true')
const penaltyEnabled = ref<boolean>(localStorage.getItem('penaltyEnabled') === 'true')
const cpuMemoryLevel = ref<number | 'infinity'>(
  localStorage.getItem('cpuMemoryLevel') === 'infinity'
    ? 'infinity'
    : parseInt(localStorage.getItem('cpuMemoryLevel') || '1', 10) || 1,
)
const cpuJudgementLevel = ref<number | 'infinity'>(
  localStorage.getItem('cpuJudgementLevel') === 'infinity' ? 'infinity' : parseInt(localStorage.getItem('cpuJudgementLevel') || '1', 10),
)
const cpuStrategyLevel = ref<number>(parseInt(localStorage.getItem('cpuStrategyLevel') || '1', 10))

const selectedRulePreset = computed<RulePreset | null>(() => {
  // 手札オープンはプリセットでは常にオフにする。
  if (openCard.value) return null
  // カンタン: 判定アシストあり、ペナルティ無効、その他オプション無効、最大出し枚数2
  if (!penaltyEnabled.value && judgementAssist.value && !grotanCut.value
    && !ramanujanRevolution.value && !compositePlay.value && evenReduceSize.value === 13
    && maxPlayableCards.value === 2) return 'easy'
  // ノーマル: 判定アシストなし、ペナルティ有効、その他主要オプション有効、初期手札11
  if (penaltyEnabled.value && !judgementAssist.value && grotanCut.value
    && ramanujanRevolution.value && compositePlay.value && initialHandSize.value === 11
    && evenReduceSize.value === 0 && maxPlayableCards.value === 'infinity') return 'normal'
  return null
})

const selectedCpuPreset = computed<CpuPreset | null>(() => {
  if (cpuMemoryLevel.value === 1 && cpuJudgementLevel.value === 1 && cpuStrategyLevel.value === 1) return 'beginner'
  if (cpuMemoryLevel.value === 2 && cpuJudgementLevel.value === 2 && cpuStrategyLevel.value === 2) return 'intermediate'
  if (cpuMemoryLevel.value === 3 && cpuJudgementLevel.value === 3 && cpuStrategyLevel.value === 3) return 'advanced'
  if (cpuMemoryLevel.value === 'infinity' && cpuJudgementLevel.value === 'infinity' && cpuStrategyLevel.value === 3) return 'maximum'
  return null
})

function applyRulePreset(preset: RulePreset | null) {
  if (!preset) return
  openCard.value = false
  if (preset === 'easy') {
    // カンタン: 判定アシストあり、多枚出し上限2
    penaltyEnabled.value = false
    judgementAssist.value = true
    grotanCut.value = false
    ramanujanRevolution.value = false
    compositePlay.value = false
    maxPlayableCards.value = 2
    // カンタンプリセットでは初期手札を7枚に戻す
    initialHandSize.value = 7
    // カンタンでは偶数カードを13枚減らす
    evenReduceSize.value = 13
    return
  }

  // ノーマル
  penaltyEnabled.value = true
  judgementAssist.value = false
  grotanCut.value = true
  ramanujanRevolution.value = true
  compositePlay.value = true
  // 初期手札を11に設定
  initialHandSize.value = 11
  // ノーマルでは偶数カードを減らさない
  evenReduceSize.value = 0
  // 多枚出し制限なし
  maxPlayableCards.value = 'infinity'
}

function applyCpuPreset(preset: CpuPreset | null) {
  if (!preset) return
  if (preset === 'maximum') {
    cpuMemoryLevel.value = 'infinity'
    cpuJudgementLevel.value = 'infinity'
    cpuStrategyLevel.value = 3
    return
  }

  const level = preset === 'beginner' ? 1 : preset === 'intermediate' ? 2 : 3
  cpuMemoryLevel.value = level
  cpuJudgementLevel.value = level
  cpuStrategyLevel.value = level
}

const showDiscardChangesDialog = ref(false) // 確認モーダルの表示状態

function getSavedSettings(): SettingsSnapshot {
  const savedHandSize = localStorage.getItem('initialHandSize')
  const savedEvenReduceSize = localStorage.getItem('evenReduceSize')
  const savedJokerCount = localStorage.getItem('jokerCount')
  const savedMaxPlayableCards = localStorage.getItem('maxPlayableCards')
  const savedOpenCard = localStorage.getItem('openCard')
  const savedJudgementAssist = localStorage.getItem('judgementAssist')
  const savedGrotanCut = localStorage.getItem('grotanCut')
  const savedRamanujanRevolution = localStorage.getItem('ramanujanRevolution')
  const savedCompositePlay = localStorage.getItem('compositePlay')
  const savedPenaltyEnabled = localStorage.getItem('penaltyEnabled')
  const savedCpuMemoryLevel = localStorage.getItem('cpuMemoryLevel')
  const savedCpuJudgementLevel = localStorage.getItem('cpuJudgementLevel')
  const savedCpuStrategyLevel = localStorage.getItem('cpuStrategyLevel')

  return {
    initialHandSize: savedHandSize ? parseInt(savedHandSize, 10) : 7,
    evenReduceSize: savedEvenReduceSize ? parseInt(savedEvenReduceSize, 10) : 13,
    jokerCount: savedJokerCount ? parseInt(savedJokerCount, 10) : 2,
    maxPlayableCards: savedMaxPlayableCards === null
      ? 2
      : savedMaxPlayableCards === 'infinity'
        ? 'infinity'
        : parseInt(savedMaxPlayableCards, 10),
    openCard: savedOpenCard === 'true',
    judgementAssist: savedJudgementAssist !== 'false',
    grotanCut: savedGrotanCut === 'true',
    ramanujanRevolution: savedRamanujanRevolution === 'true',
    compositePlay: savedCompositePlay === 'true',
    penaltyEnabled: savedPenaltyEnabled === 'true',
    cpuMemoryLevel: savedCpuMemoryLevel === 'infinity'
      ? 'infinity'
      : parseInt(savedCpuMemoryLevel || '1', 10) || 1,
    cpuJudgementLevel: savedCpuJudgementLevel === 'infinity' ? 'infinity' : parseInt(savedCpuJudgementLevel || '1', 10),
    cpuStrategyLevel: parseInt(savedCpuStrategyLevel || '1', 10),
  }
}

function getCurrentSettings(): SettingsSnapshot {
  return {
    initialHandSize: initialHandSize.value,
    evenReduceSize: evenReduceSize.value,
    jokerCount: jokerCount.value,
    maxPlayableCards: maxPlayableCards.value,
    openCard: openCard.value,
    judgementAssist: judgementAssist.value,
    grotanCut: grotanCut.value,
    ramanujanRevolution: ramanujanRevolution.value,
    compositePlay: compositePlay.value,
    penaltyEnabled: penaltyEnabled.value,
    cpuMemoryLevel: cpuMemoryLevel.value,
    cpuJudgementLevel: cpuJudgementLevel.value,
    cpuStrategyLevel: cpuStrategyLevel.value,
  }
}

function markSettingsChanged() {
  const saved = getSavedSettings()
  const current = getCurrentSettings()
  isSettingsChanged.value =
    saved.initialHandSize !== current.initialHandSize
    || saved.evenReduceSize !== current.evenReduceSize
    || saved.jokerCount !== current.jokerCount
    || saved.maxPlayableCards !== current.maxPlayableCards
    || saved.openCard !== current.openCard
    || saved.judgementAssist !== current.judgementAssist
    || saved.grotanCut !== current.grotanCut
    || saved.ramanujanRevolution !== current.ramanujanRevolution
    || saved.compositePlay !== current.compositePlay
    || saved.penaltyEnabled !== current.penaltyEnabled
    || saved.cpuMemoryLevel !== current.cpuMemoryLevel
    || saved.cpuJudgementLevel !== current.cpuJudgementLevel
    || saved.cpuStrategyLevel !== current.cpuStrategyLevel
}

watch(
  [
    initialHandSize,
    evenReduceSize,
    jokerCount,
    maxPlayableCards,
    openCard,
    judgementAssist,
    grotanCut,
    ramanujanRevolution,
    compositePlay,
    penaltyEnabled,
    cpuMemoryLevel,
    cpuJudgementLevel,
    cpuStrategyLevel,
  ],
  () => {
    markSettingsChanged()
  },
)

function toggleSettings() {
  if (!showSettingsState.value) {
    showAdvancedSettings.value = false
    showSettingsState.value = true
    return
  }

  markSettingsChanged()
  if (isSettingsChanged.value) {
    showDiscardChangesDialog.value = true // 確認モーダルを表示
  } else {
    showSettingsState.value = false
  }
}

function discardChanges() {
  // 設定を破棄して初期値に戻す
  const savedHandSize = localStorage.getItem('initialHandSize')
  initialHandSize.value = savedHandSize ? parseInt(savedHandSize, 10) : 7

  const savedevenReduceSize = localStorage.getItem('evenReduceSize')
  evenReduceSize.value = savedevenReduceSize ? parseInt(savedevenReduceSize, 10) : 13

  const savedJokerCount = localStorage.getItem('jokerCount')
  jokerCount.value = savedJokerCount ? parseInt(savedJokerCount, 10) : 2

  const savedMaxPlayableCards = localStorage.getItem('maxPlayableCards')
  maxPlayableCards.value = savedMaxPlayableCards === null
    ? 'infinity'
    : savedMaxPlayableCards === 'infinity'
      ? 'infinity'
      : parseInt(savedMaxPlayableCards, 10)

  const savedOpenCard = localStorage.getItem('openCard')
  openCard.value = savedOpenCard === 'true'

  const savedJudgementAssist = localStorage.getItem('judgementAssist')
  judgementAssist.value = savedJudgementAssist !== 'false'

  const savedGrotanCut = localStorage.getItem('grotanCut')
  grotanCut.value = savedGrotanCut === 'true'

  const savedRamanujanRevolution = localStorage.getItem('ramanujanRevolution')
  ramanujanRevolution.value = savedRamanujanRevolution === 'true'

  const savedCompositePlay = localStorage.getItem('compositePlay')
  compositePlay.value = savedCompositePlay === 'true'

  const savedPenaltyEnabled = localStorage.getItem('penaltyEnabled')
  penaltyEnabled.value = savedPenaltyEnabled === 'true'

  const savedCpuMemoryLevel = localStorage.getItem('cpuMemoryLevel')
  cpuMemoryLevel.value = savedCpuMemoryLevel === 'infinity'
    ? 'infinity'
    : parseInt(savedCpuMemoryLevel || '3', 10) || 3
  const savedCpuJudgementLevel = localStorage.getItem('cpuJudgementLevel')
  cpuJudgementLevel.value = savedCpuJudgementLevel === 'infinity' ? 'infinity' : parseInt(savedCpuJudgementLevel || '3', 10)
  cpuStrategyLevel.value = parseInt(localStorage.getItem('cpuStrategyLevel') || '2', 10)

  isSettingsChanged.value = false // 変更フラグをリセット
  showDiscardChangesDialog.value = false // 確認モーダルを閉じる
  showSettingsState.value = false // 設定モーダルを閉じる
}

function cancelDiscard() {
  showDiscardChangesDialog.value = false // 確認モーダルを閉じる
}

function toggleHelp() {
  // Emit event to toggle help
  showHelpState.value = !showHelpState.value
}

function toggleAbout() {
  // Emit event to toggle about
  showAboutState.value = !showAboutState.value
}

function togglePrimeList() {
  // Emit event to toggle prime list
  showPrimeListState.value = !showPrimeListState.value
}

function startNewGame() {
  gameState.startNewGame()
  drawer.value = false
}

// 設定を保存する関数
function saveSettings() {
  localStorage.setItem('initialHandSize', String(initialHandSize.value))
  localStorage.setItem('evenReduceSize', String(evenReduceSize.value))
  localStorage.setItem('jokerCount', String(jokerCount.value))
  localStorage.setItem('maxPlayableCards', String(maxPlayableCards.value))
  localStorage.setItem('openCard', String(openCard.value))
  localStorage.setItem('judgementAssist', String(judgementAssist.value))
  localStorage.setItem('grotanCut', String(grotanCut.value))
  localStorage.setItem('ramanujanRevolution', String(ramanujanRevolution.value))
  localStorage.setItem('compositePlay', String(compositePlay.value))
  localStorage.setItem('penaltyEnabled', String(penaltyEnabled.value))
  localStorage.setItem('cpuMemoryLevel', String(cpuMemoryLevel.value))
  localStorage.setItem('cpuJudgementLevel', String(cpuJudgementLevel.value))
  localStorage.setItem('cpuStrategyLevel', String(cpuStrategyLevel.value))

  // 設定変更フラグをリセット
  isSettingsChanged.value = false

  // 設定ダイアログを閉じる
  toggleSettings()
}

function clearSettings() {
  // 設定を初期化する関数
  localStorage.removeItem('initialHandSize')
  localStorage.removeItem('evenReduceSize')
  localStorage.removeItem('jokerCount')
  localStorage.removeItem('maxPlayableCards')
  localStorage.removeItem('openCard')
  localStorage.removeItem('judgementAssist')
  localStorage.removeItem('grotanCut')
  localStorage.removeItem('ramanujanRevolution')
  localStorage.removeItem('compositePlay')
  localStorage.removeItem('penaltyEnabled')
  localStorage.removeItem('cpuLevel')
  localStorage.removeItem('cpuMemoryLevel')
  localStorage.removeItem('cpuJudgementLevel')
  localStorage.removeItem('cpuStrategyLevel')

  initialHandSize.value = 7
  evenReduceSize.value = 13
  jokerCount.value = 2
  // 初期化時は「カンタン」プリセット相当にする（多枚出し上限2）
  maxPlayableCards.value = 2
  openCard.value = false
  judgementAssist.value = true
  grotanCut.value = false
  ramanujanRevolution.value = false
  compositePlay.value = false
  penaltyEnabled.value = false
  // 初期化時はCPUを「初級（beginner）」に設定
  cpuMemoryLevel.value = 1
  cpuJudgementLevel.value = 1
  cpuStrategyLevel.value = 1

  markSettingsChanged()
}

// アプリケーション起動時に設定を読み込む
onMounted(() => {
  if (localStorage.getItem(introModalSeenKey) !== 'true') {
    showHelpState.value = true
    localStorage.setItem(introModalSeenKey, 'true')
  }

  const savedHandSize = localStorage.getItem('initialHandSize')
  if (savedHandSize) {
    initialHandSize.value = parseInt(savedHandSize, 10)
  }

  const savedevenReduceSize = localStorage.getItem('evenReduceSize')
  if (savedevenReduceSize) {
    evenReduceSize.value = parseInt(savedevenReduceSize, 10)
  }

  const savedJokerCount = localStorage.getItem('jokerCount')
  if (savedJokerCount) {
    jokerCount.value = parseInt(savedJokerCount, 10)
  }
  const savedMaxPlayableCards = localStorage.getItem('maxPlayableCards')
  if (savedMaxPlayableCards) {
    maxPlayableCards.value = savedMaxPlayableCards === 'infinity'
      ? 'infinity'
      : parseInt(savedMaxPlayableCards, 10)
  }
  const savedOpenCard = localStorage.getItem('openCard')
  if (savedOpenCard) {
    openCard.value = savedOpenCard === 'true'
  }
  const savedJudgementAssist = localStorage.getItem('judgementAssist')
  if (savedJudgementAssist) {
    judgementAssist.value = savedJudgementAssist === 'true'
  }
  const savedGrotanCut = localStorage.getItem('grotanCut')
  if (savedGrotanCut) {
    grotanCut.value = savedGrotanCut === 'true'
  }
  const savedRamanujanRevolution = localStorage.getItem('ramanujanRevolution')
  if (savedRamanujanRevolution) {
    ramanujanRevolution.value = savedRamanujanRevolution === 'true'
  }
  const savedCompositePlay = localStorage.getItem('compositePlay')
  if (savedCompositePlay) {
    compositePlay.value = savedCompositePlay === 'true'
  }
  const savedPenaltyEnabled = localStorage.getItem('penaltyEnabled')
  if (savedPenaltyEnabled) {
    penaltyEnabled.value = savedPenaltyEnabled === 'true'
  }
  const savedCpuMemoryLevel = localStorage.getItem('cpuMemoryLevel')
  if (savedCpuMemoryLevel) {
    cpuMemoryLevel.value = savedCpuMemoryLevel === 'infinity'
      ? 'infinity'
      : parseInt(savedCpuMemoryLevel, 10) || 1
  }
  const savedCpuJudgementLevel = localStorage.getItem('cpuJudgementLevel')
  if (savedCpuJudgementLevel) cpuJudgementLevel.value = savedCpuJudgementLevel === 'infinity' ? 'infinity' : parseInt(savedCpuJudgementLevel, 10)
  const savedCpuStrategyLevel = localStorage.getItem('cpuStrategyLevel')
  if (savedCpuStrategyLevel) cpuStrategyLevel.value = parseInt(savedCpuStrategyLevel, 10)

  markSettingsChanged()
})
</script>

<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-toolbar-title>カンタン素数大富豪</v-toolbar-title>
      <v-btn icon @click="toggleSettings">
        <v-icon>mdi-cog</v-icon>
      </v-btn>
      <v-btn icon @click="toggleHelp">
        <v-icon>mdi-help-circle</v-icon>
      </v-btn>
    </v-app-bar>
    <v-navigation-drawer app v-model="drawer" temporary>
      <v-list>
        <v-list-item @click="startNewGame">
          <template #prepend>
            <v-icon icon="mdi-play-circle" />
          </template>
          <v-list-item-title>新規ゲームを開始</v-list-item-title>
        </v-list-item>
        <v-divider />
        <v-list-item @click="toggleSettings">
          <v-list-item-title>設定</v-list-item-title>
        </v-list-item>
        <v-list-item @click="toggleHelp">
          <v-list-item-title>はじめに</v-list-item-title>
        </v-list-item>
        <v-list-item @click="toggleAbout">
          <v-list-item-title>このゲームについて</v-list-item-title>
        </v-list-item>
        <v-list-item @click="togglePrimeList">
          <v-list-item-title>素数カード一覧</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <v-container fluid class="pa-0">
        <v-row justify="center" align="center">
          <v-col cols="12" xl="8">
            <GameBoard />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <v-footer app color="grey-darken-3" dark height="32px">
      <v-col class="text-center pa-0">
        <span style="font-size: 13px">© 2026 岩淵夕希物智</span>
      </v-col>
    </v-footer>
    <v-dialog v-model="showSettingsState" max-width="600px" :persistent="isSettingsChanged">
      <v-card>
        <v-card-title class="headline">設定</v-card-title>
        <v-card-text>
          <v-row>
            <!-- プリセット -->
            <v-col cols="12">
              <div class="text-subtitle-2 mb-2">ルールプリセット</div>
              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  class="flex-grow-1"
                  prepend-icon="mdi-star-outline"
                  color="primary"
                  :variant="selectedRulePreset === 'easy' ? 'flat' : 'outlined'"
                  @click="applyRulePreset('easy')"
                >
                  カンタン
                </v-btn>
                <v-btn
                  class="flex-grow-1"
                  prepend-icon="mdi-star"
                  color="primary"
                  :variant="selectedRulePreset === 'normal' ? 'flat' : 'outlined'"
                  @click="applyRulePreset('normal')"
                >
                  ノーマル
                </v-btn>
              </div>
            </v-col>
            <v-col cols="12">
              <div class="text-subtitle-2 mb-2">CPUレベル</div>
              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  class="flex-grow-1"
                  :variant="selectedCpuPreset === 'beginner' ? 'flat' : 'outlined'"
                  color="primary"
                  @click="applyCpuPreset('beginner')"
                >
                  初級
                </v-btn>
                <v-btn
                  class="flex-grow-1"
                  :variant="selectedCpuPreset === 'intermediate' ? 'flat' : 'outlined'"
                  color="primary"
                  @click="applyCpuPreset('intermediate')"
                >
                  中級
                </v-btn>
                <v-btn
                  class="flex-grow-1"
                  :variant="selectedCpuPreset === 'advanced' ? 'flat' : 'outlined'"
                  color="primary"
                  @click="applyCpuPreset('advanced')"
                >
                  上級
                </v-btn>
                <v-btn
                  class="flex-grow-1"
                  prepend-icon="mdi-fire"
                  color="error"
                  :variant="selectedCpuPreset === 'maximum' ? 'flat' : 'outlined'"
                  @click="applyCpuPreset('maximum')"
                >
                  最大火力
                </v-btn>
              </div>
            </v-col>
            <v-col cols="12" class="pt-0">
              <v-btn
                variant="text"
                color="primary"
                :append-icon="showAdvancedSettings ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                @click="showAdvancedSettings = !showAdvancedSettings"
              >
                {{ showAdvancedSettings ? '詳細設定を隠す' : '詳細設定を表示' }}
              </v-btn>
            </v-col>
            <v-expand-transition>
              <v-col v-show="showAdvancedSettings" cols="12">
                <v-row>
            <!-- 初期手札枚数 -->
            <v-col cols="12">
              <v-number-input v-model="initialHandSize" label="初期手札枚数" :min="1" :max="29"
                :rules="[(v: number) => (v >= 1 && v <= 29) || '1枚から29枚まで']" color="primary" hide-details outlined dense
                @change="markSettingsChanged" />
            </v-col>
            <!-- 減らす偶数カードの枚数 -->
            <v-col cols="12">
              <v-number-input v-model="evenReduceSize" label="減らす偶数カードの枚数" :min="0" :max="26"
                :rules="[(v: number) => (v >= 0 && v <= 26) || '0枚から26枚まで']" color="primary" hide-details outlined dense
                @change="markSettingsChanged" />
            </v-col>
            <!-- CPUプロファイル -->
            <v-col cols="12">
              <v-select
                v-model="cpuMemoryLevel"
                :items="[1, 2, 3, 'infinity']"
                label="CPU記憶レベル"
                color="primary"
                hide-details
                dense
                @change="markSettingsChanged"
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="cpuJudgementLevel"
                :items="[1, 2, 3, 'infinity']"
                label="CPU判定レベル"
                color="primary"
                hide-details
                dense
                @change="markSettingsChanged"
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="cpuStrategyLevel"
                :items="[1, 2, 3]"
                label="CPU戦略レベル"
                color="primary"
                hide-details
                dense
                @change="markSettingsChanged"
              />
            </v-col>
            <!-- ジョーカー -->
            <v-col cols="12">
              <v-select v-model="jokerCount" :items="[0, 1, 2]" label="ジョーカーの枚数" color="primary" hide-details dense
                @change="markSettingsChanged" />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="maxPlayableCards"
                :items="maxPlayableCardOptions"
                item-title="title"
                item-value="value"
                label="多枚出し上限"
                color="primary"
                hide-details
                dense
                @change="markSettingsChanged"
              />
            </v-col>
            <!-- 手札オープン -->
            <v-col cols="12">
              <v-switch v-model="openCard" label="手札オープン" color="primary" hide-details dense
                @change="markSettingsChanged" />
            </v-col>
            <!-- ペナルティ発生 -->
            <v-col cols="12">
              <v-switch v-model="penaltyEnabled" label="ペナルティ発生" color="primary" hide-details dense
                @change="markSettingsChanged" />
            </v-col>
            <!-- 判定アシスト -->
            <v-col cols="12">
              <v-switch v-model="judgementAssist" label="判定アシスト" color="primary" hide-details dense
                @change="markSettingsChanged" />
            </v-col>
            <!-- グロタンカット有効 -->
            <v-col cols="12">
              <v-switch v-model="grotanCut" label="グロタンカット" color="primary" hide-details dense
                @change="markSettingsChanged" />
            </v-col>
            <!-- ラマヌジャン革命有効 -->
            <v-col cols="12">
              <v-switch v-model="ramanujanRevolution" label="ラマヌジャン革命" color="primary" hide-details dense
                @change="markSettingsChanged" />
            </v-col>
            <!-- 合成数出し有効 -->
            <v-col cols="12">
              <v-switch v-model="compositePlay" label="合成数出し" color="primary" hide-details dense
                @change="markSettingsChanged" />
            </v-col>
            <!-- 初期化 -->
            <v-col cols="12">
              <v-btn color="error" @click="clearSettings" class="ma-1">
                初期化
              </v-btn>
            </v-col>
            <!-- 次のゲームから有効になります -->
            <v-col cols="12">
              <v-alert type="info" colored-border class="text-body-1">
                次のゲームから有効になります
              </v-alert>
            </v-col>
                </v-row>
              </v-col>
            </v-expand-transition>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-btn text @click="saveSettings">保存</v-btn>
          <v-btn text @click="toggleSettings">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- 素数カード一覧 -->
    <v-dialog v-model="showPrimeListState" max-width="600px">
      <v-card>
        <v-card-title class="headline">素数カード一覧</v-card-title>
        <v-card-text class="text-body-1">
          <PrimeList />
        </v-card-text>
        <v-card-actions>
          <v-btn text @click="togglePrimeList">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showDiscardChangesDialog" max-width="400px">
      <v-card>
        <v-card-title class="headline">変更を破棄しますか？</v-card-title>
        <v-card-text>
          設定が変更されています。この変更を破棄してもよろしいですか？
        </v-card-text>
        <v-card-actions>
          <v-btn text color="error" @click="discardChanges">破棄</v-btn>
          <v-btn text @click="cancelDiscard">キャンセル</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showHelpState" max-width="600px">
      <v-card>
        <v-card-title class="headline">はじめに</v-card-title>
        <v-card-text class="text-body-1">
          「カンタン素数大富豪」(<a href="https://x.com/hashtag/カン素" target="_blank">#カン素</a>)
          は、トランプゲーム「素数大富豪」を簡素化したものです。
          <br />
          ルールは以下の通りです。

          <ul :style="{ paddingLeft: '21px' }">
            <li>素数カードを場に出す (5, 11 など)</li>
            <li>2枚以上を組み合わせてもよい([1,7] => 17, [3,1] => 31 など）</li>
            <li>親と同じ枚数で素数を出していく</li>
            <li>
              場に出すカードは、前の人が出したカードより大きい数字でなければならない
            </li>
            <li>山札から1枚引いてから出してもいい</li>
            <li>最初に手札がなくなった人の勝ち</li>
            <li>
              <span style="opacity: 0.65;">57を出すと場を流せる</span>
              <span class="text-caption" style="opacity: 0.65;">（追加設定可能）</span>
            </li>
            <li>
              <span style="opacity: 0.65;">1729を出すと革命し、大小の強さが逆になる</span>
              <span class="text-caption" style="opacity: 0.65;">（追加設定可能）</span>
            </li>
          </ul>

          <v-btn class="mt-4 mr-1" color="primary" @click="toggleAbout">
            このゲームについて
          </v-btn>
          <v-btn class="mt-4 mr-1" color="primary" @click="togglePrimeList">
            素数カード一覧
          </v-btn>
        </v-card-text>
        <v-card-actions>
          <v-btn text @click="toggleHelp">わかった</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showAboutState" max-width="600px">
      <v-card>
        <v-card-title class="headline">このゲームについて</v-card-title>
        <v-card-text>
          <h3 class="text-h5">概要</h3>
          <p class="mt-3 text-body-1">
            「カンタン素数大富豪」(<a href="https://x.com/hashtag/カン素" target="_blank">#カン素</a>)
            は、トランプゲーム「素数大富豪」を簡単に始められるようにしたものです。
            <br />
            ルールは簡素化していますが、「素数大富豪って楽しい」と思ってもらえるように作りました。
          </p>

          <h3 class="mt-5 text-h5">公式ルールとの比較</h3>
          <v-table dense>
            <thead>
              <tr>
                <th>項目</th>
                <th>公式ルール</th>
                <th>カンタン素数大富豪</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>カードの種類</td>
                <td>52枚<br />+ジョーカー2枚</td>
                <td>偶数カード半減<br />+ジョーカー2枚</td>
              </tr>
              <tr>
                <td>多枚数出し</td>
                <td>任意の枚数</td>
                <td>2枚出しまで (推奨)</td>
              </tr>
              <tr>
                <td>ペナルティ</td>
                <td>あり</td>
                <td>なし (出せない)</td>
              </tr>
              <tr>
                <td>グロタンカット</td>
                <td>あり</td>
                <td>あり (設定で変更可)</td>
              </tr>
              <tr>
                <td>ラマヌジャン革命</td>
                <td>あり</td>
                <td>あり (設定で変更可)</td>
              </tr>
              <tr>
                <td>合成数出し</td>
                <td>あり</td>
                <td>あり (設定で変更可)</td>
              </tr>
            </tbody>
          </v-table>

          <h3 class="mt-5 text-h5">つくった人</h3>
          <p class="mt-3 text-body-1">
            岩淵夕希物智 (<a href="https://x.com/butchi_y" target="_blank">@butchi_y</a>)
          </p>

          <h4 class="mt-5 text-h6">関連動画</h4>
          <p class="mt-3 text-body-1">
            <a href="https://www.youtube.com/watch?v=NORLMxjAjAc" target="_blank">【サイエンスカフェ】素数大富豪の世界をのぞいてみよう【はなぶさん】</a>
          </p>

          <h4 class="mt-5 text-h6">書いた記事</h4>
          <p class="mt-3 text-body-1">
            <a href="https://blog.yu.butchi.jp/post/prime-qk-orochi-prime/" target="_blank">「オロチ数」を探した結果</a>
          </p>
          <p class="mt-3 text-body-1">
            <a href="https://blog.yu.butchi.jp/post/prime-qk-majin-attack/" target="_blank">ペアが重要！素数大富豪の新戦略「魔神出し」</a>
          </p>
          <p class="mt-3 text-body-1">
            <a href="https://blog.yu.butchi.jp/post/prime-qk-kyubikori-number/" target="_blank">「オロチ数」の発展その1:
              「キュービコリ数」</a>
          </p>
          <p class="mt-3 text-body-1">
            <a href="https://blog.yu.butchi.jp/post/prime-qk-amber-number/" target="_blank">「オロチ数」の発展その2: 「コハク数」</a>
          </p>
          <p class="mt-3 text-body-1">
            <a href="https://blog.yu.butchi.jp/post/prime-qk-kantan-release/" target="_blank">「カンタン素数大富豪」リリースしました！！</a>
          </p>

          <h3 class="mt-5 text-h5">バージョン情報</h3>
          <p class="mt-3 text-caption">Kantan Prime QK v1.1</p>
        </v-card-text>
        <v-card-actions>
          <v-btn text @click="toggleAbout">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>
