<script lang="ts" setup>
import type { PlayingCard } from '../types/PlayingCard'
import Card from './Card.vue'
import { generateDeck } from '../composables/usePrimeUtils'

const deck: PlayingCard[] = generateDeck()

const getCard = (rank: number): PlayingCard => {
  const card = deck.find((c) => c.rank === rank)
  if (!card) {
    throw new Error(`Card with rank ${rank} not found`)
  }
  return card
}

const getCards = (numArr: number[]): PlayingCard[] => {
  return numArr.map(getCard)
}

const cardTable = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
  .map((n) => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((m) => {
      return [m, n]
    })
  })
  .flat()

const naturalLen2 = cardTable
</script>

<template>
  <v-container fluid class="pa-0 ma-0">
    <h2 class="text-h5">1枚出し：A &lt; 2 &lt; 3 &lt; … &lt; K</h2>
    <v-row align="center" justify="center" class="mt-3 d-flex">
      <v-col v-for="(card, index) in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(getCard)" cols="auto" class="d-flex justify-center">
        <Card :key="index" :card="card" :isDisable="true" :isSelect="false" :isAddedToPile="true"
          :style="{ width: '32px' }" />
      </v-col>
    </v-row>
    <h2 class="text-h5 mt-5">2枚出し：AA &lt; A2 &lt; … &lt; KT &lt; KQ &lt; KK</h2>
    <v-row align="center" justify="start" class="mt-3">
      <v-col v-for="(cards, index) in naturalLen2.map(getCards)" cols="6" md="3"
        class="justify-center align-center d-flex">
        <div class="d-flex">
          <Card v-for="(card, cardIndex) in cards" :key="`${index}-${cardIndex}`" :card="card" :isDisable="true"
            :isSelect="false" :isAddedToPile="true" class="mx-1" :style="{ width: '32px' }" />
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>
