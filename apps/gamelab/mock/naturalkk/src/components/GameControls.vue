<template>
  <v-btn v-if="gameState.gameEnded.value" @click="startGame" color="primary">次のゲームを開始</v-btn>
</template>

<script setup lang="ts">
import { useGameContext } from '../composables/useGameState'
import { onMounted } from 'vue'

const gameState = useGameContext()
function startGame() {
  gameState.startNewGame()
}

onMounted(() => {
  startGame()
})
</script>
