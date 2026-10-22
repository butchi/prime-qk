<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { catalogEntries, formatCards } from '@prime-qk/catalog'
import NumberList from './NumberList.vue'
import Checker from './Checker.vue'
import { canonicalPath } from './urls'

const props = defineProps<{ url: string }>()
const url = new URL(props.url, 'https://local.invalid')
const path = canonicalPath(url.pathname)
const entry = catalogEntries.find(item => `/numbers/${item.value}` === path)
const fragmentError = ref('')
let cleanup = () => {}
onUnmounted(() => cleanup())

onMounted(() => {
  if (window.location.pathname !== path) {
    window.location.replace(path + window.location.search + window.location.hash)
    return
  }
  const highlight = () => {
    document.querySelectorAll('[data-selected]').forEach(element => element.removeAttribute('data-selected'))
    fragmentError.value = ''
    if (!window.location.hash || !entry) return
    const target = document.getElementById(window.location.hash.slice(1))
    if (!target || !target.id.startsWith('cards-')) {
      fragmentError.value = '指定されたカード表現は、この数の収録済み表現にありません。'
      return
    }
    target.setAttribute('data-selected', 'true')
    target.scrollIntoView({ block: 'center' })
  }
  highlight()
  window.addEventListener('hashchange', highlight)
  cleanup = () => window.removeEventListener('hashchange', highlight)
})
</script>

<template>
  <Checker v-if="path === '/'" />
  <NumberList v-else-if="path === '/numbers'" :url="url.href" />
  <main v-else-if="entry">
    <a href="/numbers">一覧・検索に戻る</a>
    <p><a :href="`/?value=${entry.value}`">この数を判定する</a></p>
    <header>
      <p class="eyebrow">素数大富豪の数カタログ</p>
      <h1>{{ entry.value }}</h1>
      <p><span class="badge">素数</span> {{ entry.value.length }}桁</p>
    </header>
    <section aria-labelledby="representations-heading">
      <h2 id="representations-heading">カード表現</h2>
      <p>A=1、T=10、J=11、Q=12、K=13。ジョーカーなし・1〜3枚の表現を表示しています。</p>
      <p v-if="fragmentError" role="alert" class="error">{{ fragmentError }}</p>
      <ul class="representations">
        <li v-for="ranks in entry.representations" :id="`cards-${ranks.join('-')}`" :key="ranks.join('-')">
          <a :href="`#cards-${ranks.join('-')}`"><code>{{ formatCards(ranks) }}</code></a>
          <span>{{ ranks.length }}枚{{ entry.value.length }}桁</span>
          <span>{{ ranks.join(' → ') }} → {{ entry.value }}</span>
        </li>
      </ul>
      <details class="help">
        <summary>判定情報</summary>
        <p>判定方法：試し割り（確定判定）。</p>
      </details>
    </section>
  </main>
  <main v-else>
    <h1>404 — ページが見つかりません</h1>
    <p>未収録の数、または存在しないページです。未収録であることは、合成数であることを意味しません。</p>
    <p>現在はジョーカーなし・1〜3枚で作れる337件の素数を収録しています。</p>
    <a href="/numbers">数の一覧・検索へ</a>
    <p><a href="/">トップで素数判定する</a></p>
  </main>
</template>
