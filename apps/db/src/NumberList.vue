<script setup lang="ts">
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue'
import { catalogEntries, formatCards, searchCatalog, catalogScopeDescription, catalogCardCounts, catalogDigitCounts, primeConstellations, searchPrimeConstellations } from '@prime-qk/catalog'
import type { CatalogEntry, PrimeConstellationKind } from '@prime-qk/catalog'
import { readSearch, searchUrl } from './urls'
import type { SearchDraft } from './urls'

const props = defineProps<{ url: string }>()
const draft = reactive<SearchDraft>({
  exactValue: '', minValue: '', maxValue: '', cardCount: '', digitCount: '', sort: 'asc', hideDominated: false,
  constellation: '', samePrefix: false,
})
const results = ref(searchCatalog(catalogEntries))
const groups = ref<CatalogEntry[][]>([])
const appliedKind = ref<'' | PrimeConstellationKind>('')
const appliedSamePrefix = ref(false)
const appliedLabel = computed(() => primeConstellations.find(item => item.id === appliedKind.value)?.label)
const resultCount = computed(() => appliedKind.value ? groups.value.length : results.value.length)
const error = ref('')
const page = ref(1)
const pageSize = 50
const pageCount = computed(() => Math.max(1, Math.ceil(resultCount.value / pageSize)))
const visibleEntries = computed(() => results.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const visibleGroups = computed(() => groups.value.slice((page.value - 1) * pageSize, page.value * pageSize))

function resolve(url: string) {
  const state = readSearch(new URL(url, 'https://local.invalid').searchParams)
  const kind = state.draft.constellation
  const matches = kind ? [] : searchCatalog(catalogEntries, state.query)
  const tuples = kind ? searchPrimeConstellations(catalogEntries, kind, state.query) : []
  const count = kind ? tuples.length : matches.length
  if (state.page > Math.max(1, Math.ceil(count / pageSize))) throw new Error('指定されたページはありません。')
  results.value = matches
  groups.value = tuples
  appliedKind.value = kind
  appliedSamePrefix.value = state.draft.samePrefix
  page.value = state.page
  error.value = ''
  return state
}

function restore(url: string) {
  try {
    const state = resolve(url)
    Object.assign(draft, state.draft)
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
    resolve(url)
    window.history.pushState(null, '', url)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '検索に失敗しました。'
  }
}

function reset() {
  Object.assign(draft, {
    exactValue: '', minValue: '', maxValue: '', cardCount: '', digitCount: '', sort: 'asc', hideDominated: false,
    constellation: '', samePrefix: false,
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
      <p>{{ catalogScopeDescription }}の素数を探せます。</p>
      <p class="help">5〜6枚は限定収録です。他のランクを含む表現は未収録で、検索結果なしは素数の不存在を意味しません。</p>
      <p><a href="/">トップで任意の数を素数判定する</a></p>
      <p><a href="/numbers/list">枚数・桁数別の全一覧・JSON・TXT</a></p>
    </header>

    <section aria-labelledby="search-heading">
      <h2 id="search-heading">検索条件</h2>
      <form @submit.prevent="search()" @reset.prevent="reset">
        <div class="filters">
          <label>素数の種類
            <select v-model="draft.constellation">
              <option value="">すべて（数ごと）</option>
              <option v-for="kind in primeConstellations" :key="kind.id" :value="kind.id">{{ kind.label }}</option>
            </select>
          </label>
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
              <option v-for="count in catalogCardCounts" :key="count" :value="String(count)">{{ count }}枚</option>
            </select>
          </label>
          <label>桁数
            <select v-model="draft.digitCount">
              <option value="">すべて</option>
              <option v-for="count in catalogDigitCounts" :key="count" :value="String(count)">{{ count }}桁</option>
            </select>
          </label>
          <label>並び順
            <select v-model="draft.sort">
              <option value="asc">数の昇順</option>
              <option value="desc">数の降順</option>
            </select>
          </label>
        </div>
        <template v-if="draft.constellation">
          <label class="dominance-option"><input v-model="draft.samePrefix" type="checkbox" />最下位桁以外が同じ</label>
          <p class="help">十進表記の一の位だけが異なる組に絞ります。例：101・103・107 は対象、107・109・113 は対象外です。カード列の末尾1枚だけが異なることを保証する条件ではありません。</p>
        </template>
        <label class="dominance-option"><input v-model="draft.hideDominated" type="checkbox" />下位互換を非表示</label>
        <p class="help">同じカード構成の並べ替えで作れる最大の素数の表現だけを残します。比較は他の検索条件で絞る前の全収録素数が対象です。</p>
        <p class="help">完全一致と範囲は併用できます。枚数は、条件を満たすカード表現がある数を検索します。</p>
        <p v-if="draft.constellation" class="help">組の全員が収録済みで、範囲・枚数・桁数・下位互換の条件を全員が満たす組を表示します。完全一致は指定した数を含む組を探します。昇降順は組の最小値順です。各数のカード表現は個別のもので、組全体を1組のデッキから同時に作れるとは限りません。</p>
        <div class="actions">
          <button type="submit">検索</button>
          <button type="reset" class="secondary">条件をリセット</button>
        </div>
      </form>
      <p v-if="error" role="alert" class="error">{{ error }} 検索結果は更新されていません。</p>
    </section>

    <section aria-labelledby="catalog-heading">
      <div class="section-heading">
        <h2 id="catalog-heading">{{ appliedLabel || '数のカタログ' }}</h2>
        <p role="status">検索結果：{{ resultCount }} {{ appliedKind ? '組' : '件' }} / 収録数：{{ catalogEntries.length }} 件</p>
      </div>
      <p class="help">A=1、T=10、J=11、Q=12、K=13。スートは区別せず、並び順を保持します。</p>
      <p v-if="appliedKind" class="help">双子：p・p+2。三つ子：p・p+2・p+6 または p・p+4・p+6。四つ子：p・p+2・p+6・p+8。ここではこの差のパターンに限ります。全員が収録済みの組だけを表示し、一部が未収録の組は表示しません。</p>
      <p v-if="appliedKind && appliedSamePrefix" class="help">適用中：最下位桁以外が同じ組のみ。</p>
      <div v-if="resultCount === 0" class="empty-state">
        <h3>{{ appliedKind ? '条件に合う組はありません' : '条件に合う数はありません' }}</h3>
        <p>{{ catalogScopeDescription }}の収録範囲です。5〜6枚は限定収録のため、結果なしは素数の不存在を意味しません。条件を変更して検索してください。</p>
      </div>
      <ul v-else-if="appliedKind" class="entries constellation-entries">
        <li v-for="group in visibleGroups" :key="group.map(entry => entry.value).join('-')">
          <h3>{{ group.map(entry => entry.value).join('・') }}</h3>
          <ul class="constellation-members">
            <li v-for="entry in group" :key="entry.value">
              <a :href="`/numbers/${entry.value}`">{{ entry.value }}</a>
              <span>（<template v-for="(ranks, index) in entry.representations" :key="ranks.join('-')"><span v-if="index"> / </span><a :href="`/numbers/${entry.value}#cards-${ranks.join('-')}`"><code>{{ formatCards(ranks) }}</code></a></template>）</span>
            </li>
          </ul>
        </li>
      </ul>
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
      <nav v-if="resultCount > 0" aria-label="検索結果のページ" class="actions">
        <button class="secondary" :disabled="page === 1" @click="search(page - 1)">前へ</button>
        <span>{{ page }} / {{ pageCount }} ページ（1ページ最大{{ pageSize }}{{ appliedKind ? '組' : '件' }}）</span>
        <button class="secondary" :disabled="page === pageCount" @click="search(page + 1)">次へ</button>
      </nav>
    </section>
    <footer>
      <p>収録範囲外の数が合成数とは限りません。<a href="/">素数判定</a>で調べられます。手札検索・ジョーカー対応は今後検討します。</p>
    </footer>
  </main>
</template>

<style scoped>
.constellation-entries > li {
  display: block;
}
.constellation-entries h3 {
  margin-bottom: 8px;
}
.constellation-members {
  padding-left: 24px;
}
.dominance-option {
  flex-direction: row;
  align-items: center;
  margin-top: 16px;
}
.dominance-option input {
  width: auto;
}
</style>
