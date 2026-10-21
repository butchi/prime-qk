<template>
  <v-card :disabled="isDisable" :class="{
    card: true,
    'selected-card': isSelect,
    'factor-selected-card': isFactorSelected,
    'disabled-card': isDisable,
    'added-to-pile': isAddedToPile,
    'auto-consumed-card': isAutoConsumed,
    'animating-card': isAnimating,
  }">  
    <v-responsive :aspect-ratio="57 / 89">
      <div v-if="isAutoConsumed" class="consume-mark">×</div>
      <div class="sub-text top-left">
        {{ cardStr }}
      </div>
      <div class="main-text">
        {{ cardNum }}
      </div>
      <div class="sub-text rotated">
        {{ cardStr }}
      </div>
    </v-responsive>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { PlayingCard } from '../types/PlayingCard'

const props = defineProps<{
  card: PlayingCard | null
  isDisable?: boolean
  isSelect?: boolean
  isFactorSelected?: boolean
  isAddedToPile?: boolean
  isAutoConsumed?: boolean
  isAnimating?: boolean
}>()

const rankNum = computed(() => {
  if (!props.card) return '非表示' // 非表示カードの場合のデフォルト値
  return props.card.rank
})

const isJokerCard = computed(() => props.card?.kind === 'joker')

const width = ref<number>(57) // カードの横幅

// カードの文字列と数値を計算
const cardStr = computed(() => {
  if (rankNum.value === '非表示') return '?' // 非表示カードの場合
  if (isJokerCard.value) return 'X'

  if (rankNum.value === 1) return 'A' // Ace の場合
  if (rankNum.value === 10) return 'T' // Ten の場合
  if (rankNum.value === 11) return 'J' // Jack の場合
  if (rankNum.value === 12) return 'Q' // Queen の場合
  if (rankNum.value === 13) return 'K' // King の場合
  return String(rankNum.value || '?') // rankNum が null の場合は '?' を表示
})

const cardNum = computed(() => {
  if (rankNum.value === '非表示') return '?' // 非表示カードの場合
  if (isJokerCard.value) return '★'
  return String(rankNum.value)
})

// ウィンドウ幅に応じてカードの幅を調整
onMounted(() => {
  const resizeHandler = () => {
    const windowWidth = window.innerWidth
    // ウィンドウ幅に応じてカードの幅を計算（最小25px、最大57px）
    width.value = Math.max(25, Math.min(57, windowWidth / 10))
  }

  resizeHandler()
  window.addEventListener('resize', resizeHandler)

  // コンポーネントが破棄されたときにイベントリスナーを削除
  onUnmounted(() => {
    window.removeEventListener('resize', resizeHandler)
  })
})
</script>

<style scoped>
.card {
  width: auto;
  height: auto;
  max-width: 57px;
  /* 通常カードの最大幅 */
  min-width: 25px;
  /* mini card の最小幅 */
  aspect-ratio: 57 / 89;
  /* アスペクト比を維持 */
  color: #000000;
  background-color: #fcfcfc;
  transition: background-color 0.15s, width 0.15s, height 0.15s;
}

.card.mini-card {
  text-align: center;
  font-size: 12px;
  /* mini card のフォントサイズ */
  display: flex;
  justify-content: center;
  align-items: center;

  .mini-text {
    position: absolute;
    top: 50%;
    /* 親要素の高さの50% */
    left: 50%;
    /* 親要素の幅の50% */
    transform: translate(-50%,
        -50%);
    /* 自身の幅と高さの50%分だけ移動して中央揃え */
    text-align: center;
    line-height: 1;
    color: #333;
  }
}

.card.disabled-card {
  background-color: #f0f0f0;
  /* 無効状態の背景色 */
  pointer-events: none;
  /* クリックイベントを無効化 */
}

.card.added-to-pile {
  background-color: #fefefe;
  /* 選択状態の背景色 */

  .main-text {
    color: #000;
  }
}

.card.selected-card {
  background-color: #ccffcc;
  /* 選択状態の背景色 */
}

.card.factor-selected-card {
  background-color: #dbeafe;
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.48);
}

.card.auto-consumed-card {
  background-color: #fff3cd;
  box-shadow: inset 0 0 0 2px rgba(245, 158, 11, 0.48);
}

.card.animating-card {
  animation: fallFromTop 0.6s ease-out;
}

@keyframes fallFromTop {
  0% {
    opacity: 0;
    transform: translateY(-30px);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.consume-mark {
  position: absolute;
  top: 4%;
  right: 6%;
  z-index: 1;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #f59e0b;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  user-select: none;
}

.newly-added-mark {
  position: absolute;
  top: 4%;
  left: 6%;
  z-index: 1;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #4caf50;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  user-select: none;
}

.main-text {
  position: absolute;
  top: 50%;
  /* 親要素の高さの50% */
  left: 50%;
  /* 親要素の幅の50% */
  transform: translate(-50%,
      -50%);
  /* 自身の幅と高さの50%分だけ移動して中央揃え */
  text-align: center;
  line-height: 1;
  color: #333;
}

.sub-text {
  font-size: 11px;
  /* サブテキストのフォントサイズ */
  position: absolute;
  color: #666;
  user-select: none;
}

.sub-text.top-left {
  top: 5%;
  /* 左上に配置 */
  left: 5%;
  transform: translate(0, 0);
}

.sub-text.rotated {
  bottom: 5%;
  /* 右下に配置 */
  right: 5%;
  transform: translate(0, 0) rotate(180deg);
  /* 180度回転 */
}
</style>
