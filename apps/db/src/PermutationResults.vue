<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { formatCards } from '@prime-qk/catalog'
import type { PermutationSearch } from './permutations'

const props = defineProps<{ ranks: readonly number[]; value: string }>()
const state = ref<PermutationSearch>({ matches: [], checked: 0, reason: 'complete' })
const pattern = ref('')
const appliedPattern = ref('')
const running = ref(false)
const error = ref('')
const incomplete = ref('')
const bestPrime = computed(() => state.value.matches.find(item => item.result.kind === 'prime'))
const hasCandidates = computed(() => state.value.matches.some(item => item.result.kind === 'probable-prime'))
const maximumProven = computed(() => !running.value && !error.value && !incomplete.value &&
  state.value.reason === 'complete' && !hasCandidates.value)
let worker: Worker | undefined
let timer: ReturnType<typeof setTimeout> | undefined

function stop() {
  worker?.terminate()
  worker = undefined
  clearTimeout(timer)
  running.value = false
}

function start() {
  stop()
  error.value = ''
  incomplete.value = ''
  state.value = { matches: [], checked: 0, reason: 'complete' }
  running.value = true
  const searchPattern = pattern.value.trim()
  appliedPattern.value = searchPattern
  try {
    timer = setTimeout(() => {
      stop()
      incomplete.value = '探索未完了：5秒の時間制限で打ち切りました。'
    }, 5000)
    worker = new Worker(new URL('./permutations.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<{ state: PermutationSearch; done: boolean } | { error: string }>) => {
      if ('error' in event.data) {
        stop()
        error.value = event.data.error
        return
      }
      state.value = event.data.state
      if (!event.data.done) return
      stop()
      if (state.value.reason === 'timeout') incomplete.value = '探索未完了：5秒の時間制限で打ち切りました。'
      if (state.value.reason === 'limit') incomplete.value = '探索未完了：100件を超えたため打ち切りました（表示は100件まで）。'
    }
    worker.onerror = event => {
      event.preventDefault()
      stop()
      error.value = '並べ替え探索を実行できませんでした。再度お試しください。'
    }
    worker.onmessageerror = () => {
      stop()
      error.value = '並べ替え探索の結果を読み取れませんでした。再度お試しください。'
    }
    worker.postMessage({ ranks: [...props.ranks], pattern: searchPattern })
  } catch (cause) {
    stop()
    error.value = cause instanceof Error ? cause.message : '並べ替え探索を開始できませんでした。'
  }
}

function cancel() {
  stop()
  incomplete.value = '探索未完了：探索を中止しました。'
}
onMounted(start)
onUnmounted(stop)
</script>

<template>
  <div class="permutation-results" aria-live="polite">
    <h3>{{ appliedPattern ? '正規表現に一致する素数' : '同じカードで作れる素数' }}</h3>
    <p class="help">全{{ ranks.length }}枚を使い、重複カードの枚数を保って並べ替えます。最大5秒・表示100件まで。数値の大きい順です。</p>
    <form class="pattern-form" @submit.prevent="start">
      <label for="permutation-pattern">カード表記の正規表現</label>
      <input id="permutation-pattern" v-model="pattern" type="text" placeholder="例：^A[TJQK]+$" />
      <button type="submit">{{ running ? '条件を変更して再探索' : '条件で再探索' }}</button>
    </form>
    <p class="help">Aと1は同じカードです。文字クラス（[TJQK]など）・()・|・?・*・+・{n}・{n,m}・^・$を使えます。*は0〜4回、+は1〜4回、{n}・{n,m}は0〜52回の範囲で指定できます。{n,}は使用できません。文字クラスの範囲指定は[2-9]のみ対応し、^と$がなければ部分一致です。</p>
    <p v-if="pattern.trim() !== appliedPattern" class="help">条件を変更しました。再検索すると結果に反映されます。</p>
    <p v-if="running" role="status">並べ替えを探索中…</p>
    <p v-if="incomplete" role="alert" class="error">{{ incomplete }}全結果や最大値は確定していません。</p>
    <p v-if="error" role="alert" class="error">{{ error }}探索未完了です。</p>
    <p v-if="hasCandidates">素数候補は未証明です。探索が完了しても、最大の素数とは断定できません。</p>
    <p v-if="hasCandidates && state.matches[0]">
      条件に一致して見つかった中で最大の検査通過値：<strong>{{ state.matches[0].value }}</strong>
      （{{ state.matches[0].result.kind === 'probable-prime' ? '素数候補' : '素数' }}）
    </p>
    <p v-if="bestPrime">
      {{ appliedPattern
        ? (maximumProven ? '条件に一致する最大の素数' : '条件に一致して見つかった中で最大の確定素数')
        : (maximumProven ? '最大の素数' : '見つかった中で最大の確定素数') }}：
      <strong>{{ bestPrime.value }}</strong>
      <span v-if="BigInt(bestPrime.value) > BigInt(value)">（入力より大きい上位互換）</span>
      <span v-else-if="maximumProven && bestPrime.value === value">
        {{ appliedPattern ? '（条件に一致する並びの中で入力が最大）' : '（入力はこのカード構成で最大）' }}
      </span>
    </p>
    <p v-if="!running && maximumProven && state.matches.length === 0">
      {{ appliedPattern ? 'すべての並びを調べましたが、条件に一致する素数・素数候補はありません。' : 'すべての並びを調べましたが、素数になる並びはありません。' }}
    </p>
    <p v-else-if="!running && state.matches.length === 0">素数・素数候補はまだ見つかっていません。</p>
    <ul>
      <li v-for="item in state.matches" :key="item.value">
        <a :href="`/?q=${item.representations[0]!.join('-')}`">{{ item.value }}</a>
        （{{ item.representations.map(formatCards).join(' / ') }}）
        <span v-if="item.result.kind === 'probable-prime'">素数候補（未証明）</span>
      </li>
    </ul>
    <button v-if="running" type="button" class="secondary" @click="cancel">探索を中止</button>
    <button v-else-if="incomplete || error" type="button" class="secondary" @click="start">再探索</button>
  </div>
</template>

<style scoped>
.permutation-results {
  margin-top: 32px;
}

.pattern-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 16px 0 8px;
}

.pattern-form label {
  flex-basis: 100%;
}

.pattern-form input {
  flex: 1;
  min-width: 180px;
}

li,
strong {
  overflow-wrap: anywhere;
}
</style>
