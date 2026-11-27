<template>
  <v-container class="player-hand">
    <v-row v-if="player.pile.length > 0" class="align-center">
      <span class="play-preview ma-0 pa-1 py-1 text-center">{{ selectedValueDisplay }}</span>
      <template v-if="formulaCandidates.length > 1">
        <v-btn icon="mdi-chevron-left" size="x-small" variant="flat" color="grey-darken-4" class="candidate-button ml-1" @click="selectPreviousFormula" />
        <v-btn icon="mdi-chevron-right" size="x-small" variant="flat" color="grey-darken-4" class="candidate-button ml-1" @click="selectNextFormula" />
      </template>
      <v-spacer />
      <v-btn color="primary" class="ma-1" @click="handlePutAction">場に出す</v-btn>
      <v-btn class="ma-1" @click="$emit('clear-pile')">クリア</v-btn>
    </v-row>
    <v-row v-else-if="!player.isCPU" :style="{ visibility: 'hidden' }">
      <span>_</span><v-spacer /><v-btn>場に出す</v-btn>
    </v-row>
    <v-row class="d-flex align-end">
      <v-col v-for="playingCard in player.hand" :key="playingCard.id" cols="2" sm="1" class="ma-0 pa-1 py-1">
        <Card
          :card="player.openCard || !player.isCPU ? playingCard : null"
          :isDisable="isDisable"
          :isSelect="player.pile.some(card => card.id === playingCard.id)"
          :isFactorSelected="selectedFormulaCardIds.has(playingCard.id)"
          :isAnimating="drawnCardIds.has(playingCard.id)"
          @click="$emit('toggle-select-card', playingCard)"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Card from './Card.vue'
import type { Player } from '../types/Player'
import { isJokerCard } from '../lib/cards'
import { findFormulaSuggestions, type FormulaDetails } from '../lib/naturalFormula'
import { useGameContext } from '../composables/useGameState'

const props = defineProps<{ player: Player; isDisable?: boolean }>()
const emit = defineEmits(['toggle-select-card', 'clear-pile', 'execute-action'])
const selectedFormulaIndex = ref(0)
const gameContext = useGameContext()
const drawnCardIds = computed(() => gameContext.drawnCardIds.value)

const formulaCandidates = computed<FormulaDetails[]>(() => [
  { formulas: [], auxiliaryCards: [] },
  ...findFormulaSuggestions(props.player.pile, props.player.hand),
])
const selectedFormula = computed(
  () => formulaCandidates.value[selectedFormulaIndex.value] ?? formulaCandidates.value[0],
)
const selectedFormulaCardIds = computed(
  () => new Set(selectedFormula.value?.auxiliaryCards.map((card) => card.id) ?? []),
)

const selectedValueDisplay = computed(() => {
  const main = props.player.pile
  if (main.some(isJokerCard)) return 'ジョーカー'
  const value = main.map((card) => card.rank).join('')
  const formulas = selectedFormula.value?.formulas ?? []
  return formulas.length > 0
    ? `${value} ＝ ${formulas.map((formula) => `${formula.left.rank}${formula.operator}${formula.right.rank}`).join(' ／ ')}`
    : value
})

watch(
  [() => props.player.pile.map((card) => card.id).join(','), () => formulaCandidates.value.length],
  () => {
    if (selectedFormulaIndex.value >= formulaCandidates.value.length) selectedFormulaIndex.value = 0
  },
)

function selectPreviousFormula() {
  const count = formulaCandidates.value.length
  selectedFormulaIndex.value = (selectedFormulaIndex.value + count - 1) % count
}

function selectNextFormula() {
  const count = formulaCandidates.value.length
  selectedFormulaIndex.value = (selectedFormulaIndex.value + 1) % count
}

function handlePutAction() {
  emit('execute-action', 'put', [...selectedFormulaCardIds.value])
}
</script>

<style scoped>
.play-preview { font-weight: 700; color: rgb(var(--v-theme-primary)); }
.candidate-button { width: 24px; height: 24px; min-width: 24px; border-radius: 50%; }
</style>
