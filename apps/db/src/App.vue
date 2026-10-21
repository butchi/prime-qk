<script setup lang="ts">
import { catalogEntries } from '@prime-qk/catalog'

const classificationLabels = {
  prime: '素数',
  composite: '合成数',
  neither: '素数でも合成数でもない数',
}
</script>

<template>
  <main>
    <header>
      <p class="eyebrow">素数大富豪の数カタログ</p>
      <h1>Prime QK DB</h1>
      <p>素数大富豪で使う数を、一覧・検索できるサイトを準備しています。</p>
    </header>

    <section aria-labelledby="catalog-heading">
      <div class="section-heading">
        <h2 id="catalog-heading">数のカタログ</h2>
        <p>収録数：{{ catalogEntries.length }} 件</p>
      </div>
      <div v-if="catalogEntries.length === 0" class="empty-state">
        <h3>データはまだ登録されていません</h3>
        <p>収録する数の範囲と、合成数を含めるかどうかは検討中です。</p>
        <p>検索機能・データ生成は今後追加予定です。</p>
      </div>
      <ul v-else class="entries">
        <li v-for="entry in catalogEntries" :key="entry.value">
          <strong>{{ entry.value }}</strong>
          <span>{{ classificationLabels[entry.classification] }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>
