<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { formatCards } from '@prime-qk/catalog'
import type { PermutationSearch } from './permutations'

const props = defineProps<{ pattern: string }>()
const state = ref<PermutationSearch>({ matches: [], checked: 0, reason: 'complete' })
const running = ref(false)
const error = ref('')
const incomplete = ref('')
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
  state.value = { matches: [], checked: 0, reason: 'complete' }
  error.value = ''
  incomplete.value = ''
  running.value = true
  try {
    timer = setTimeout(() => {
      stop()
      incomplete.value = '探索未完了：5秒の時間制限で打ち切りました。'
    }, 5000)
    worker = new Worker(new URL('./pattern-search.worker.ts', import.meta.url), { type: 'module' })
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
      error.value = '正規表現の探索を実行できませんでした。再度お試しください。'
    }
    worker.onmessageerror = () => {
      stop()
      error.value = '正規表現の探索結果を読み取れませんでした。再度お試しください。'
    }
    worker.postMessage(props.pattern)
  } catch (cause) {
    stop()
    error.value = cause instanceof Error ? cause.message : '正規表現の探索を開始できませんでした。'
  }
}

function cancel() {
  stop()
  incomplete.value = '探索未完了：探索を中止しました。'
}

function cardUrl(ranks: number[]): string {
  const input = ranks.length === 1 && ranks[0]! >= 10 ? formatCards(ranks) : ranks.join('-')
  return `/?${new URLSearchParams({ q: input })}`
}

onMounted(start)
onUnmounted(stop)
</script>

<template>
  <section aria-labelledby="pattern-results-heading" aria-live="polite">
    <h2 id="pattern-results-heading">正規表現の検索結果</h2>
    <p>条件：{{ pattern }}（最大5秒・表示100件、数値の大きい順）</p>
    <p v-if="running" role="status">カード列を探索中…</p>
    <p v-if="incomplete" role="alert" class="error">{{ incomplete }}全結果は確定していません。</p>
    <p v-if="error" role="alert" class="error">{{ error }}探索未完了です。</p>
    <p v-if="state.matches.some(item => item.result.kind === 'probable-prime')">素数候補は未証明です。</p>
    <p v-if="!running && !incomplete && !error && !state.matches.length">一致する素数・素数候補はありません。</p>
    <p v-else-if="!running && !state.matches.length && (incomplete || error)">素数・素数候補はまだ見つかっていません。</p>
    <ul>
      <li v-for="item in state.matches" :key="item.value">
        <a :href="cardUrl(item.representations[0]!)">{{ item.value }}</a>
        （{{ item.representations.map(formatCards).join(' / ') }}）
        <span v-if="item.result.kind === 'probable-prime'">素数候補（未証明）</span>
      </li>
    </ul>
    <button v-if="running" type="button" class="secondary" @click="cancel">探索を中止</button>
    <button v-else-if="incomplete || error" type="button" class="secondary" @click="start">再探索</button>
  </section>
</template>
