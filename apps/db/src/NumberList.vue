<script setup lang="ts">
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue'
import { catalogEntries, formatCards, searchCatalog } from '@prime-qk/catalog'
import { readSearch, searchUrl } from './urls'

const props = defineProps<{ url: string }>()
const draft = reactive({
  exactValue: '', minValue: '', maxValue: '', cardCount: '', digitCount: '', sort: 'asc',
})
const results = ref(searchCatalog(catalogEntries))
const error = ref('')
const page = ref(1)
const pageSize = 50
const pageCount = computed(() => Math.max(1, Math.ceil(results.value.length / pageSize)))
const visibleEntries = computed(() => results.value.slice((page.value - 1) * pageSize, page.value * pageSize))

function restore(url: string) {
  try {
    const state = readSearch(new URL(url, 'https://local.invalid').searchParams)
    const matches = searchCatalog(catalogEntries, state.query)
    if (state.page > Math.max(1, Math.ceil(matches.length / pageSize))) throw new Error('指定されたページはありません。')
    Object.assign(draft, state.draft)
    results.value = matches
    page.value = state.page
    error.value = ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '検索条件を読み込めませんでした。'
  }
}

restore(props.url)
const popstate = () => restore(window.location.href)
onMounted(() => {
  popstate()
  if (!error.value) window.history.replaceState(null, '', searchUrl(draft, page.value))
  window.addEventListener('popstate', popstate)
})
onUnmounted(() => window.removeEventListener('popstate', popstate))

function search(targetPage = 1) {
  try {
    const url = searchUrl(draft, targetPage)
    const state = readSearch(new URL(url, 'https://local.invalid').searchParams)
    const matches = searchCatalog(catalogEntries, state.query)
    if (targetPage > Math.max(1, Math.ceil(matches.length / pageSize))) {
      throw new Error('指定されたページはありません。')
    }
    results.value = matches
    error.value = ''
    page.value = targetPage
    window.history.pushState(null, '', url)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '検索に失敗しました。'
  }
}

function reset() {
  Object.assign(draft, {
    exactValue: '', minValue: '', maxValue: '', cardCount: '', digitCount: '', sort: 'asc',
  })
  search()
}
</script>

<template>
  <main>
    <header>
      <p class="eyebrow">素数大富豪の数カタログ</p>
      <h1>QKサーチ</h1>
      <p>素数大富豪の数を検索・判定</p>
      <p>トランプ52枚から、ジョーカーなし・1〜3枚で作れる素数を探せます。</p>
      <p><a href="/checker">任意の数を素数判定する</a></p>
    </header>

    <section aria-labelledby="search-heading">
      <h2 id="search-heading">検索条件</h2>
      <form @submit.prevent="search()" @reset.prevent="reset">
        <div class="filters">
          <label>数の完全一致
            <input v-model="draft.exactValue" type="text" inputmode="numeric" placeholder="例：113" />
          </label>
          <label>最小値
            <input v-model="draft.minValue" type="text" inputmode="numeric" />
          </label>
          <label>最大値
            <input v-model="draft.maxValue" type="text" inputmode="numeric" />
          </label>
          <label>カード枚数
            <select v-model="draft.cardCount">
              <option value="">すべて</option>
              <option v-for="count in 3" :key="count" :value="String(count)">{{ count }}枚</option>
            </select>
          </label>
          <label>桁数
            <select v-model="draft.digitCount">
              <option value="">すべて</option>
              <option v-for="count in 6" :key="count" :value="String(count)">{{ count }}桁</option>
            </select>
          </label>
          <label>並び順
            <select v-model="draft.sort">
              <option value="asc">数の昇順</option>
              <option value="desc">数の降順</option>
            </select>
          </label>
        </div>
        <p class="help">完全一致と範囲は併用できます。枚数は、条件を満たすカード表現がある数を検索します。</p>
        <div class="actions">
          <button type="submit">検索</button>
          <button type="reset" class="secondary">条件をリセット</button>
        </div>
      </form>
      <p v-if="error" role="alert" class="error">{{ error }} 検索結果は更新されていません。</p>
    </section>

    <section aria-labelledby="catalog-heading">
      <div class="section-heading">
        <h2 id="catalog-heading">数のカタログ</h2>
        <p role="status">検索結果：{{ results.length }} 件 / 収録数：{{ catalogEntries.length }} 件</p>
      </div>
      <p class="help">A=1、T=10、J=11、Q=12、K=13。スートは区別せず、並び順を保持します。</p>
      <div v-if="results.length === 0" class="empty-state">
        <h3>条件に合う数はありません</h3>
        <p>ジョーカーなし・1〜3枚の素数のみ収録しています。条件を変更して検索してください。</p>
      </div>
      <ul v-else class="entries">
        <li v-for="entry in visibleEntries" :key="entry.value">
          <a :href="`/numbers/${entry.value}`">{{ entry.value }} の詳細</a>
          <details>
            <summary><strong>{{ entry.value }}</strong> <span class="badge">素数</span>
              <span>{{ entry.representations.length }} 通りのカード表現</span>
            </summary>
            <p class="help">現在の検索条件に合う表現を表示しています。</p>
            <ul class="representations">
              <li v-for="ranks in entry.representations" :key="ranks.join(',')">
                <code>{{ formatCards(ranks) }}</code>
                <span>{{ ranks.length }}枚{{ entry.value.length }}桁</span>
                <span>{{ ranks.join(' → ') }} → {{ entry.value }}</span>
              </li>
            </ul>
            <details class="help">
              <summary>判定情報</summary>
              <p>判定方法：試し割り（確定判定）。</p>
            </details>
          </details>
        </li>
      </ul>
      <nav v-if="results.length > 0" aria-label="検索結果のページ" class="actions">
        <button class="secondary" :disabled="page === 1" @click="search(page - 1)">前へ</button>
        <span>{{ page }} / {{ pageCount }} ページ（1ページ最大{{ pageSize }}件）</span>
        <button class="secondary" :disabled="page === pageCount" @click="search(page + 1)">次へ</button>
      </nav>
    </section>
    <footer>
      <p>収録範囲外の数が合成数とは限りません。<a href="/checker">素数判定</a>で調べられます。手札検索・ジョーカー対応は今後検討します。</p>
    </footer>
  </main>
</template>
