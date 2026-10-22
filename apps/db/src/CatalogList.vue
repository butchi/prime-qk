<script setup lang="ts">
import { computed, ref } from 'vue'
import { createCatalogList, customCatalogText } from './catalog-list'
import type { TextExportOptions } from './catalog-list'

const hideDominated = ref(false)
const list = computed(() => createCatalogList({ hideDominated: hideDominated.value }))
const cardCount = ref<number | ''>('')
const digitCount = ref<number | ''>('')
const notation = ref<TextExportOptions['notation']>('both')
const separator = ref<TextExportOptions['separator']>('\n')
const headings = ref(true)
const previewFormat = ref('txt')
const downloadError = ref('')
const selected = computed(() => createCatalogList({
  cardCount: cardCount.value || undefined,
  digitCount: digitCount.value || undefined,
  hideDominated: hideDominated.value,
}))
const text = computed(() => customCatalogText(selected.value, {
  notation: notation.value, separator: separator.value, headings: headings.value,
}))
const json = computed(() => JSON.stringify(selected.value, null, 2) + '\n')
const preview = computed(() => previewFormat.value === 'json' ? json.value : text.value)

function download(format: 'txt' | 'json') {
  downloadError.value = ''
  let url: string | undefined
  try {
    url = URL.createObjectURL(new Blob([format === 'json' ? json.value : text.value], {
      type: `${format === 'json' ? 'application/json' : 'text/plain'};charset=utf-8`,
    }))
    const link = document.createElement('a')
    link.href = url
    link.download = `prime-qk-${cardCount.value || 'all'}cards-${digitCount.value || 'all'}digits.${format}`
    document.body.append(link)
    try {
      link.click()
    } finally {
      link.remove()
    }
  } catch (cause) {
    downloadError.value = cause instanceof Error ? cause.message : 'ファイルを保存できませんでした。プレビューからコピーしてください。'
  } finally {
    if (url) {
      const objectUrl = url
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }
  }
}
</script>

<template>
  <main>
    <nav class="actions" aria-label="ナビゲーション">
      <a href="/">素数判定</a>
      <a href="/numbers">条件を指定して検索</a>
    </nav>
    <header>
      <p class="eyebrow">QKサーチ</p>
      <h1>枚数・桁数別の素数一覧</h1>
      <p>ジョーカーなし・1〜3枚で作れる素数{{ list.total }}個。</p>
      <details class="help">
        <summary>一覧の見方・収録条件</summary>
        <p>各分類内は重複なし・数値の昇順です。同じ数を異なる枚数で作れる場合は、それぞれの枚数に掲載します。枚数別の件数の合計は、異なる数の総数とは一致しません。</p>
        <p>独自に生成し、試し割りで素数と確認したデータです。ジョーカーあり・4枚以上は対象外です。</p>
        <p>数と、その枚数で作れるすべてのカード表記を併記します。A=1、T=10、J=11、Q=12、K=13。カード表記を選ぶと詳細の該当表現へ進めます。</p>
        <p>「下位互換を非表示」は同じカード構成の並べ替えで作れる最大の素数の表現だけを残します。1つでも表現が残れば数を表示します。比較対象は絞り込み前の全収録素数です。固定JSON・TXTと詳細ページは全表現を保持します。</p>
      </details>
    </header>
    <label class="dominance-option"><input v-model="hideDominated" type="checkbox" />下位互換を非表示</label>
    <nav class="actions" aria-label="一覧の目次">
      <a v-for="group in list.groups" :key="group.cardCount" :href="`#cards-${group.cardCount}`">{{ group.cardCount }}枚出し（{{ group.count }}個）</a>
    </nav>
    <details class="custom-export">
      <summary>データ出力（カスタム・全件）</summary>
      <p class="downloads">
        全件データ（フィルターなし）：
        <a href="/numbers/list.json">JSONを表示</a> ·
        <a href="/numbers/list.json" download>JSONを保存</a> ·
        <a href="/numbers/list.txt">TXTを表示</a> ·
        <a href="/numbers/list.txt" download>TXTを保存</a>
      </p>
      <div class="filters">
        <label>出力する枚数
          <select v-model="cardCount">
            <option value="">すべて</option>
            <option v-for="count in [1, 2, 3]" :key="count" :value="count">{{ count }}枚</option>
          </select>
        </label>
        <label>出力する桁数
          <select v-model="digitCount">
            <option value="">すべて</option>
            <option v-for="count in [1, 2, 3, 4, 5, 6]" :key="count" :value="count">{{ count }}桁</option>
          </select>
        </label>
        <label>TXTの表記
          <select v-model="notation">
            <option value="number">数のみ</option>
            <option value="cards">カード表記のみ</option>
            <option value="both">数とカード表記</option>
          </select>
        </label>
        <label>TXTの区切り
          <select v-model="separator">
            <option :value="'\n'">改行</option>
            <option value=",">カンマ</option>
            <option :value="'\t'">タブ</option>
          </select>
        </label>
      </div>
      <label class="heading-option"><input v-model="headings" type="checkbox" />TXTに枚数・桁数の見出しを付ける</label>
      <p class="help">下位互換フィルターは一覧・カスタム出力に共通です。枚数・桁数は出力だけに適用します。JSONには条件に合う数とカード表現を含めます。TXTのカード表記のみでは各表現を個別に、両方では「113 (AK / J3)」の形で出力します。分類順・数値昇順で、枚数をまたぐ重複は残します。固定ファイルは変わりません。</p>
      <p role="status">出力対象：異なる数 {{ selected.total }} 個</p>
      <p v-if="selected.total === 0">この枚数・桁数に該当する数はありません。条件を変更してください。</p>
      <label>プレビュー形式
        <select v-model="previewFormat">
          <option value="txt">TXT</option>
          <option value="json">JSON</option>
        </select>
      </label>
      <label>出力プレビュー
        <textarea :value="preview" readonly rows="8" spellcheck="false" />
      </label>
      <div class="actions">
        <button :disabled="selected.total === 0" @click="download('txt')">カスタムTXTを保存</button>
        <button :disabled="selected.total === 0" @click="download('json')">カスタムJSONを保存</button>
      </div>
      <p v-if="downloadError" role="alert" class="error">{{ downloadError }}</p>
    </details>
    <section v-for="group in list.groups" :key="group.cardCount" :aria-labelledby="`cards-${group.cardCount}`">
      <h2 :id="`cards-${group.cardCount}`">{{ group.cardCount }}枚出し（{{ group.count }}個）</h2>
      <div v-for="digits in group.digits" :key="digits.digitCount">
        <h3 :id="`cards-${group.cardCount}-digits-${digits.digitCount}`">
          <a :href="`#cards-${group.cardCount}-digits-${digits.digitCount}`">{{ group.cardCount }}枚{{ digits.digitCount }}桁（{{ digits.entries.length }}個）</a>
        </h3>
        <ul class="number-values">
          <li v-for="entry in digits.entries" :key="entry.value">
            <a :href="`/numbers/${entry.value}`">{{ entry.value }}</a>
            <span class="card-labels">
              （<template v-for="(item, index) in entry.representations" :key="item.ranks.join('-')"><span v-if="index"> / </span><a :href="`/numbers/${entry.value}#cards-${item.ranks.join('-')}`"><code>{{ item.cards }}</code></a></template>）
            </span>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>

<style scoped>
main {
  padding-top: 24px;
}

h1 {
  font-size: clamp(1.5rem, 5vw, 2.5rem);
}

header .eyebrow {
  margin-bottom: 4px;
}

header {
  margin-top: 12px;
}

section {
  margin-top: 24px;
  padding: 16px;
}

@media (max-width: 480px) {
  main {
    padding: 16px;
  }

  .downloads {
    font-size: 0.85rem;
  }

  h2,
  h3 {
    margin-bottom: 8px;
  }

  header h1,
  header > p {
    margin-bottom: 8px;
  }

  section {
    margin-top: 16px;
  }
}

header .help {
  margin: 0 0 16px;
}

.custom-export {
  margin-top: 16px;
}

.custom-export[open] > summary,
header details[open] > summary {
  margin-bottom: 16px;
}

.downloads {
  margin-top: 16px;
}

.number-values {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  font-variant-numeric: tabular-nums;
}

.number-values li {
  overflow-wrap: anywhere;
}

.card-labels {
  color: #475569;
  font-size: 0.9rem;
}

.heading-option {
  flex-direction: row;
  align-items: center;
  margin-top: 16px;
}

.heading-option input {
  width: auto;
}

.dominance-option {
  flex-direction: row;
  align-items: center;
  margin-bottom: 8px;
}

.dominance-option input {
  width: auto;
}

textarea {
  width: 100%;
  padding: 12px;
  font-family: monospace;
  resize: vertical;
  margin-bottom: 16px;
}
</style>
