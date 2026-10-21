<template>
  <v-container class="field-group pt-0" fluid>
    <v-row v-if="cards?.length > 0" class="d-flex justify-center">
      <v-col v-for="(card, index) in cards" :key="index" cols="2" sm="1" class="ma-0 pa-1 py-1">
        <Card :card="card" :isDisable="true" />
      </v-col>
    </v-row>
    <v-row v-else class="d-flex justify-center" :style="{ visibility: 'hidden' }">
      <v-col cols="2" sm="1" class="ma-0 pa-1 py-1">
        <Card :card="null" :isDisable="true" />
      </v-col>
      <v-col cols="2" sm="1" class="ma-0 pa-1 py-1">
        <Card :card="null" :isDisable="true" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import type { PlayingCard } from '../types/PlayingCard'
import Card from './Card.vue'

defineProps<{
  cards: PlayingCard[]
}>()
</script>
