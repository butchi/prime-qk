<script setup lang="ts">
import { createCatalogList } from './catalog-list'

const list = createCatalogList()
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
      <p>ジョーカーなし・1〜3枚で作れる素数{{ list.total }}個を、枚数と桁数ごとに掲載しています。</p>
      <p>各分類内は重複なし・数値の昇順です。同じ数を異なる枚数で作れる場合は、それぞれの枚数に掲載します。枚数別の件数の合計は、異なる数の総数とは一致しません。</p>
      <p class="help">独自に生成し、試し割りで素数と確認したデータです。ジョーカーあり・4枚以上は対象外です。</p>
    </header>
    <nav class="actions" aria-label="一覧の目次">
      <a v-for="group in list.groups" :key="group.cardCount" :href="`#cards-${group.cardCount}`">{{ group.cardCount }}枚出し（{{ group.count }}個）</a>
    </nav>
    <p class="downloads">
      データ：
      <a href="/numbers/list.json">JSONを表示</a> ·
      <a href="/numbers/list.json" download>JSONを保存</a> ·
      <a href="/numbers/list.txt">TXTを表示</a> ·
      <a href="/numbers/list.txt" download>TXTを保存</a>
    </p>
    <section v-for="group in list.groups" :key="group.cardCount" :aria-labelledby="`cards-${group.cardCount}`">
      <h2 :id="`cards-${group.cardCount}`">{{ group.cardCount }}枚出し（{{ group.count }}個）</h2>
      <div v-for="digits in group.digits" :key="digits.digitCount">
        <h3 :id="`cards-${group.cardCount}-digits-${digits.digitCount}`">
          <a :href="`#cards-${group.cardCount}-digits-${digits.digitCount}`">{{ group.cardCount }}枚{{ digits.digitCount }}桁（{{ digits.values.length }}個）</a>
        </h3>
        <ul class="number-values">
          <li v-for="value in digits.values" :key="value"><a :href="`/numbers/${value}`">{{ value }}</a></li>
        </ul>
      </div>
    </section>
  </main>
</template>

<style scoped>
.downloads {
  margin-top: 24px;
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
</style>
