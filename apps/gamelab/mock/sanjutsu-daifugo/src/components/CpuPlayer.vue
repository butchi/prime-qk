<template>
  <PlayerHand :player="player" :isHidden="!player.openCard" :isDisable="true" />
</template>

<script setup lang="ts">
import type { Player } from '../types/Player'
import PlayerHand from './PlayerHand.vue'

defineProps<{
  player: Player
}>()
</script>
