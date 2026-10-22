<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { catalogEntries, formatCards } from '@prime-qk/catalog'
import { parseInput } from './primality'
import { parseCards } from './card-input'
import type { PrimalityResult } from './primality'

const input = ref('')
const mode = ref('integer')
const cards = ref<number[]>([])
const value = ref('')
const result = ref<PrimalityResult | null>(null)
const error = ref('')
const running = ref(false)
let worker: Worker | undefined
let timeout: ReturnType<typeof setTimeout> | undefined

function stop() {
  worker?.terminate()
  worker = undefined
  clearTimeout(timeout)
  running.value = false
}

function check(updateUrl = true) {
  stop()
  error.value = ''
  result.value = null
  cards.value = []
  try {
    const ranks = mode.value === 'cards' ? parseCards(input.value) : []
    const parsed = parseInput(ranks.length ? ranks.join('') : input.value)
    cards.value = ranks
    value.value = String(parsed)
    if (updateUrl) {
      const params = new URLSearchParams(ranks.length ? { sequence: ranks.join('-') } : { value: value.value })
      window.history.pushState(null, '', `/?${params}`)
    }
    running.value = true
    timeout = setTimeout(() => {
      stop()
      error.value = '判定未完了：計算時間が5秒を超えたため打ち切りました。'
    }, 5000)
    worker = new Worker(new URL('./primality.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<{ value: string; result: PrimalityResult } | { error: string }>) => {
      stop()
      if ('error' in event.data) error.value = event.data.error
      else {
        value.value = event.data.value
        result.value = event.data.result
      }
    }
    worker.onerror = event => {
      event.preventDefault()
      stop()
      error.value = '判定処理を実行できませんでした。再度お試しください。'
    }
    worker.onmessageerror = () => {
      stop()
      error.value = '判定結果を読み取れませんでした。再度お試しください。'
    }
    worker.postMessage(value.value)
  } catch (cause) {
    stop()
    error.value = cause instanceof Error ? cause.message : '判定を開始できませんでした。'
  }
}

function restore() {
  stop()
  error.value = ''
  result.value = null
  const params = new URLSearchParams(window.location.search)
  if ([...params.keys()].some(key => !['value', 'sequence'].includes(key)) ||
      params.getAll('value').length > 1 || params.getAll('sequence').length > 1 ||
      (params.has('value') && params.has('sequence'))) {
    error.value = 'URLの判定条件が不正です。value または sequence を1つだけ指定してください。'
    return
  }
  mode.value = params.has('sequence') ? 'cards' : 'integer'
  input.value = params.get('sequence') ?? params.get('value') ?? ''
  if (params.has('value') || params.has('sequence')) check(false)
}

function cancel() {
  stop()
  error.value = '判定未完了：計算を中止しました。'
}

onMounted(() => {
  restore()
  window.addEventListener('popstate', restore)
})
onUnmounted(() => {
  stop()
  window.removeEventListener('popstate', restore)
})
</script>

<template>
  <main>
    <a href="/numbers">数の一覧・検索へ</a>
    <header>
      <p class="eyebrow">QKサーチ — 素数大富豪の数を検索・判定</p>
      <h1>素数判定</h1>
      <p>十進整数またはカード列から、素数か合成数かを調べます。手札や場に対する合法手は判定しません。</p>
    </header>
    <section aria-labelledby="input-heading">
      <h2 id="input-heading">数を入力</h2>
      <form @submit.prevent="check()">
        <label>入力形式
          <select v-model="mode" @change="stop(); result = null; error = ''">
            <option value="integer">整数</option>
            <option value="cards">カード列</option>
          </select>
        </label>
        <label>判定する数・カード列
          <input v-model="input" type="text" :placeholder="mode === 'cards' ? '例：QK または 12-13' : '例：1213'" aria-describedby="input-help" />
        </label>
        <p v-if="mode === 'integer'" id="input-help" class="help">半角数字で最大200桁（先頭ゼロを含む、符号・前後の空白は除く）。小数・指数表記は使用できません。</p>
        <p v-else id="input-help" class="help">QK・A23 または 12-13・1-2-3。A=1、T=10、J=11、Q=12、K=13（小文字も可）。数字のみの複数枚はハイフンで区切ります。ジョーカーなし・各ランク4枚まで、最大52枚。スート・空白区切りは対象外です。</p>
        <div class="actions">
          <button type="submit">判定する</button>
          <button v-if="running" type="button" class="secondary" @click="cancel">中止</button>
        </div>
      </form>
      <p v-if="running" role="status">計算中です（最大5秒）…</p>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
    </section>
    <section v-if="result" aria-labelledby="result-heading" aria-live="polite">
      <h2 id="result-heading">判定結果</h2>
      <p class="checked-number">{{ value }}</p>
      <p v-if="cards.length">{{ formatCards(cards) }}（{{ cards.length }}枚{{ value.length }}桁）</p>
      <h3 v-if="result.kind === 'prime'">素数です</h3>
      <h3 v-else-if="result.kind === 'composite'">合成数です</h3>
      <h3 v-else-if="result.kind === 'neither'">素数でも合成数でもありません</h3>
      <h3 v-else>素数候補です</h3>
      <p v-if="result.kind === 'probable-prime'">Miller–Rabin検査を通りましたが、素数であることは証明していません。</p>
      <p v-if="result.kind === 'composite' && result.divisor">約数：{{ result.divisor }}</p>
      <p v-if="result.kind === 'neither'">素数・合成数は、ここでは2以上の正の整数を対象にしています。</p>
      <details v-if="result.kind !== 'neither'" class="help">
        <summary>判定情報</summary>
        <p v-if="result.kind === 'probable-prime'">固定底：{{ result.bases.join(', ') }}。ランダムな底を用いた検査ではないため、誤判定確率の数値は付けていません。</p>
        <p v-else-if="result.kind === 'prime' && result.method === 'trial-division'">試し割りによる判定です。</p>
        <p v-else-if="result.kind === 'prime'">2^64未満で保証された7底のMiller–Rabinによる判定です。</p>
        <p v-else>小さい約数、またはMiller–Rabin検査の不合格により合成数と判定しました。素因数分解は行っていません。</p>
      </details>
      <p v-if="catalogEntries.some(entry => entry.value === value)"><a :href="`/numbers/${value}`">この数のカード表現を見る</a></p>
      <p v-else class="help">現在のカタログには未収録です。ジョーカーなし・1〜3枚で作れる素数のみ収録しています。</p>
      <p v-if="!value.startsWith('-')"><a :href="`/numbers?exact=${value}`">この数をカタログで検索する</a></p>
    </section>
    <section aria-labelledby="search-heading">
      <h2 id="search-heading">素数を検索する</h2>
      <p>ジョーカーなし・1〜3枚で作れる337件の素数を、数の範囲・カード枚数・桁数で探せます。</p>
      <a href="/numbers">数の一覧・検索へ</a>
    </section>
  </main>
</template>
