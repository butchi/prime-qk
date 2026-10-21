<template>
  <v-container class="player-hand">
    <v-row v-if="player.pile.length > 0" class="align-center">
      <span v-for="(d, i) in selectedValueDisplay.split('')" :key="i" class="ma-0 pa-1 py-1 text-center">
        {{ d }}
      </span>
      <template v-if="previewCandidates.length > 1 && judgementAssistEnabled">
        <v-btn
          icon="mdi-chevron-left"
          size="x-small"
          variant="flat"
          color="grey-darken-4"
          class="candidate-button ml-1"
          @click="selectPreviousCompositeCandidate"
        />
        <v-btn
          icon="mdi-chevron-right"
          size="x-small"
          variant="flat"
          color="grey-darken-4"
          class="candidate-button ml-1"
          @click="selectNextCompositeCandidate"
        />
      </template>
      <v-btn
        v-if="canSelectManualFactors"
        size="small"
        variant="tonal"
        color="secondary"
        class="ml-2"
        @click="toggleManualFactorSelection"
      >
        {{ manualFactorSelectionActive ? '手動選択を取り消す' : '素因数を手動選択' }}
      </v-btn>
      <span v-if="manualFactorSelectionActive" class="manual-factor-hint ml-2">
        素因数場に置くカードを選び、「場に出す」で自動組み立て
      </span>
      <v-spacer></v-spacer>
      <!--場に出す-->
      <v-btn v-if="player.pile.length > 0" color="primary" class="ma-1" @click="handlePutAction">
        場に出す
      </v-btn>
      <!--クリア-->
      <v-btn v-if="player.pile.length > 0" class="ma-1" @click="$emit('clear-pile')">
        クリア
      </v-btn>
    </v-row>
    <v-row v-else-if="!player.isCPU" :style="{ visibility: 'hidden' }">
      <span class="ma-0 pa-1 py-1 text-center">_</span>
      <span class="ma-0 pa-1 py-1 text-center">_</span>
      <v-spacer></v-spacer>
      <v-btn class="ma-1">場に出す</v-btn>
      <v-btn class="ma-1">クリア</v-btn>
    </v-row>
    <v-row class="d-flex align-end">
      <v-col v-for="playingCard in player.hand" :key="playingCard.id" cols="2" sm="1" class="ma-0 pa-1 py-1">
        <Card :card="player.openCard || !player.isCPU ? playingCard : null" :isDisable="isDisable" :isSelect="player.pile.some(pileCard => pileCard.id === playingCard.id)
          " :isFactorSelected="manualFactorCardIds.has(playingCard.id)" :isAutoConsumed="autoConsumedCardIds.has(playingCard.id)" :isAnimating="drawnCardIds.has(playingCard.id)" @click="toggleCardSelection(playingCard)"></Card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import Card from './Card.vue'
import type { PlayingCard } from '../types/PlayingCard.ts'
import type { Player } from '../types/Player.ts'
import type { FieldValue, GameMode } from '../lib/ruleState'
import { isJokerCard, isJokerCode } from '../lib/cards'
import { computed, ref, watch } from 'vue'
import { validateOfficialPlay } from '../lib/ruleValues'
import { isPrimeBigInt } from '../lib/primes'
import {
  findAutomaticCompositePlayDetails,
  findAutomaticCompositePlayCandidates,
  formatFactorExpression,
} from '../lib/primeDaifugo'
import { useGameContext } from '../composables/useGameState'

const props = defineProps<{
  player: Player
  isDisable?: boolean
  isHidden?: boolean
  mode?: GameMode
  currentFieldValues?: FieldValue[]
  compositePlay?: boolean
}>()

const emit = defineEmits(['toggle-select-card', 'clear-pile', 'execute-action'])
const selectedCompositeCandidateIndex = ref(0)
const manualFactorSelectionActive = ref(false)
const manualFactorCardIds = ref(new Set<string>())
const gameContext = useGameContext()
const judgementAssistEnabled = computed(() => gameContext.ruleOptions.value.judgementAssist)

type CompositeCandidate = ReturnType<typeof findAutomaticCompositePlayCandidates>[number]
type PlayPreviewCandidate =
  | { kind: 'grotan' }
  | { kind: 'composite'; details: CompositeCandidate }

function isJokerLike(card: PlayingCard): boolean {
  return isJokerCard(card) || isJokerCode(card.code)
}

const selectedValueDisplay = computed(() => {
  const selectedCards = props.player.pile
  if (selectedCards.length === 0) return ''

  const selectedPreview = selectedPlayPreviewCandidate.value
  if (selectedPreview?.kind === 'grotan') {
    return '57=グロタンカット'
  }

  if (!judgementAssistEnabled.value) {
    if (selectedCards.some(isJokerLike)) return formatSelectedCardsWithJokerX(selectedCards)

    // 判定アシストがオフのときは、式の部分を表示しない（数値のみ）。
    // 候補が複数ある場合は手動因数選択を促すため、単に数値を表示する。
    const compositeDetails = selectedPreview?.kind === 'composite'
      ? selectedPreview.details
      : null
    if (compositeDetails?.validation.value.kind === 'finite') {
      return compositeDetails.validation.value.value.toString()
    }

    return formatSelectedCardsAsDecimal(selectedCards)
  }

  if (selectedCards.some(isJokerLike)) {
    const best = findBestPrimePreviewValue(
      selectedCards,
      props.mode ?? 'normal',
    )
    return best === null ? formatSelectedCardsWithJokerX(selectedCards) : `✓${best}`
  }

  const compositeDetails = selectedPreview?.kind === 'composite'
    ? selectedPreview.details
    : null
  if (compositeDetails?.validation.value.kind === 'finite') {
    const factorExpression = formatFactorExpression(
      compositeDetails.factorGroups,
      compositeDetails.jokerValueByCardId,
    )
    if (factorExpression) {
      return `${compositeDetails.validation.value.value}=${factorExpression}`
    }
  }

  const value = BigInt(formatSelectedCardsAsDecimal(selectedCards))
  return isPrimeBigInt(value) ? `✓${value.toString()}` : value.toString()
})

const automaticCompositeCandidates = computed(() => {
  if (props.isDisable) return []
  if (props.player.isCPU) return []
  if (props.player.pile.length === 0) return []

  return findAutomaticCompositePlayCandidates(
    props.player.pile,
    props.player.hand,
    {
      mode: props.mode ?? 'normal',
      currentFieldValues: props.currentFieldValues ?? [],
      // プレビューでは合成数出し設定に関わらず候補を表示し、
      // 実際の実行時は factorCardIds の有無でルールを尊重する。
      compositePlay: true,
    },
  )
})

const hasGrotanPreviewCandidate = computed(() => {
  if (props.player.pile.length === 0) return false
  if (!gameContext.ruleOptions.value.grotanCut) return false

  const validation = validateOfficialPlay(props.player.pile, {
    mode: props.mode ?? 'normal',
    currentFieldValues: props.currentFieldValues ?? [],
  })

  return validation.ok && validation.playClass.kind === 'grotanCut'
})

const previewCandidates = computed<PlayPreviewCandidate[]>(() => {
  const candidates: PlayPreviewCandidate[] = []
  if (hasGrotanPreviewCandidate.value) {
    candidates.push({ kind: 'grotan' })
  }

  candidates.push(
    ...automaticCompositeCandidates.value.map(details => ({
      kind: 'composite' as const,
      details,
    })),
  )

  return candidates
})

const selectedPlayPreviewCandidate = computed(() => {
  if (manualFactorSelectionActive.value && selectedManualCompositeDetails.value) {
    return {
      kind: 'composite' as const,
      details: selectedManualCompositeDetails.value,
    }
  }

  const candidates = previewCandidates.value
  return candidates[selectedCompositeCandidateIndex.value] ?? candidates[0] ?? null
})

const selectedFactorCardIds = computed(() =>
  selectedPlayPreviewCandidate.value?.kind === 'composite'
    ? selectedPlayPreviewCandidate.value.details.factorCards.map(card => card.id)
    : undefined,
)

const selectedManualCompositeDetails = computed(() => {
  if (!manualFactorSelectionActive.value || manualFactorCardIds.value.size === 0) return null

  return findAutomaticCompositePlayDetails(
    props.player.pile,
    props.player.hand,
    {
      mode: props.mode ?? 'normal',
      currentFieldValues: props.currentFieldValues ?? [],
      compositePlay: props.compositePlay,
      factorCardIds: [...manualFactorCardIds.value],
    },
  )
})

const factorCardIdsForPlay = computed(() =>
  manualFactorSelectionActive.value
    ? [...manualFactorCardIds.value]
    : (props.compositePlay ? selectedFactorCardIds.value : undefined),
)

const canSelectManualFactors = computed(() =>
  !props.isDisable
  && !props.player.isCPU
  && props.compositePlay
  && props.player.pile.length > 0,
)

const autoConsumedCardIds = computed(() => {
  if (!judgementAssistEnabled.value) return new Set<string>()

  return new Set(
    selectedPlayPreviewCandidate.value?.kind === 'composite'
      ? selectedPlayPreviewCandidate.value.details.factorCards.map(card => card.id)
      : [],
  )
})

const drawnCardIds = computed(() => {
  return gameContext.drawnCardIds.value
})

watch(
  () => drawnCardIds.value.size,
  size => {
    if (size > 0) {
      // アニメーション終了後（0.6s + 余裕）に自動クリア
      setTimeout(() => {
        gameContext.drawnCardIds.value.clear()
      }, 700)
    }
  },
)

watch(
  () => previewCandidates.value.length,
  candidateCount => {
    if (candidateCount <= 0) {
      selectedCompositeCandidateIndex.value = 0
      return
    }

    if (selectedCompositeCandidateIndex.value >= candidateCount) {
      selectedCompositeCandidateIndex.value = candidateCount - 1
    }
  },
)

watch(
  () => props.player.pile.length,
  pileLength => {
    if (pileLength === 0) {
      manualFactorSelectionActive.value = false
      manualFactorCardIds.value = new Set()
    }
  },
)

function selectPreviousCompositeCandidate() {
  const candidateCount = previewCandidates.value?.length ?? 0
  if (candidateCount <= 1) return

  selectedCompositeCandidateIndex.value =
    (selectedCompositeCandidateIndex.value + candidateCount - 1) % candidateCount
}

function selectNextCompositeCandidate() {
  const candidateCount = previewCandidates.value?.length ?? 0
  if (candidateCount <= 1) return

  selectedCompositeCandidateIndex.value =
    (selectedCompositeCandidateIndex.value + 1) % candidateCount
}

function toggleCardSelection(card: PlayingCard) {
  if (manualFactorSelectionActive.value && !props.player.pile.some(pileCard => pileCard.id === card.id)) {
    const next = new Set(manualFactorCardIds.value)
    if (next.has(card.id)) {
      next.delete(card.id)
    } else {
      next.add(card.id)
    }
    manualFactorCardIds.value = next
    return
  }

  emit('toggle-select-card', card) // 親コンポーネントにカードを渡す
}

function toggleManualFactorSelection() {
  manualFactorSelectionActive.value = !manualFactorSelectionActive.value
  if (!manualFactorSelectionActive.value) {
    manualFactorCardIds.value = new Set()
  }
}

function handlePutAction() {
  emit('execute-action', 'put', factorCardIdsForPlay.value)
}

function findBestPrimePreviewValue(
  cards: PlayingCard[],
  mode: GameMode,
): string | null {
  const jokers = cards.filter(isJokerLike)
  if (jokers.length === 0) return formatSelectedCardsAsDecimal(cards)

  const bestState: { value: bigint | null } = { value: null }
  const assignment = new Map<string, number>()

  function search(index: number) {
    if (index >= jokers.length) {
      const validation = validateOfficialPlay(cards, {
        mode,
        currentFieldValues: [],
        jokerValueByCardId: assignment,
      })

      if (!validation.ok) return
      if (validation.value.kind !== 'finite') return
      if (validation.playClass.kind !== 'prime') return

      if (bestState.value === null || validation.value.value > bestState.value) {
        bestState.value = validation.value.value
      }
      return
    }

    const joker = jokers[index]
    for (let value = 0; value <= 13; value++) {
      assignment.set(joker.id, value)
      search(index + 1)
    }
  }

  search(0)
  return bestState.value === null ? null : bestState.value.toString()
}

function formatSelectedCardsWithJokerX(cards: PlayingCard[]): string {
  return cards
    .map(card => (isJokerLike(card) ? 'X' : String(card.rank)))
    .join('')
}

function formatSelectedCardsAsDecimal(cards: PlayingCard[]): string {
  return cards.map(card => String(card.rank)).join('')
}
</script>

<style scoped>
.candidate-button {
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
  align-self: center;
}

.manual-factor-hint {
  font-size: 0.78rem;
  color: rgb(var(--v-theme-secondary));
}
</style>
