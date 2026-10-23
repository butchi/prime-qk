<script setup lang="ts">
import { onMounted } from 'vue'

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
  }
}

onMounted(() => {
  ;(window.adsbygoogle = window.adsbygoogle || []).push({})
})
</script>

<template>
  <aside class="adsense" aria-label="広告">
    <ins
      class="adsbygoogle"
      style="display: block"
      data-ad-client="ca-pub-2862407789219932"
      data-ad-slot="4301222298"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  </aside>
</template>

<style scoped>
.adsense {
  max-width: 960px;
  min-height: 100px;
  margin: 0 auto;
  padding: 0 24px 32px;
}
</style>
