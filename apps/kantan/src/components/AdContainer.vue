<template>
  <div class="ad-container" role="region" aria-label="広告エリア">
    <div class="ad-container__badge">AD</div>
    <div class="ad-container__content">
      <template v-if="showPlaceholder">
        <p class="ad-container__title">スポンサーリンク</p>
        <p class="ad-container__text">{{ placeholderMessage }}</p>
      </template>
      <template v-else>
        <p class="ad-container__title">スポンサーリンク</p>
        <ins
          ref="adElement"
          class="adsbygoogle ad-container__ins"
          :style="adInlineStyle"
          :data-ad-client="adsenseClient"
          :data-ad-slot="adsenseSlot"
          :data-ad-format="resolvedAdFormat"
          :data-full-width-responsive="resolvedFullWidthResponsive"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>
  }
}

let adsenseScriptPromise: Promise<void> | null = null

function getExistingAdsenseScript(): HTMLScriptElement | null {
  return document.querySelector<HTMLScriptElement>('script[data-adsense-loader="true"]')
}

function attachScriptLoadHandlers(
  script: HTMLScriptElement,
  resolve: () => void,
  reject: (error: Error) => void,
): void {
  if (script.dataset.adsenseStatus === 'loaded') {
    resolve()
    return
  }

  if (script.dataset.adsenseStatus === 'error') {
    reject(new Error('ad script load failed (cached error)'))
    return
  }

  script.addEventListener(
    'load',
    () => {
      script.dataset.adsenseStatus = 'loaded'
      resolve()
    },
    { once: true },
  )
  script.addEventListener(
    'error',
    () => {
      script.dataset.adsenseStatus = 'error'
      reject(new Error('ad script load failed'))
    },
    { once: true },
  )
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      resolve()
      return
    }

    window.requestAnimationFrame(() => resolve())
  })
}

async function waitForAdSlotReady(element: HTMLElement, maxFrames = 30): Promise<void> {
  for (let frame = 0; frame < maxFrames; frame += 1) {
    const rect = element.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return
    await waitForAnimationFrame()
  }

  throw new Error('ad slot not ready')
}

async function ensureAdsenseScript(scriptUrl: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (window.adsbygoogle) return
  if (adsenseScriptPromise) {
    await adsenseScriptPromise
    return
  }

  adsenseScriptPromise = (async () => {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await new Promise<void>((resolve, reject) => {
          const existing = getExistingAdsenseScript()
          if (existing) {
            if (existing.dataset.adsenseStatus === 'error') {
              existing.remove()
            } else {
              attachScriptLoadHandlers(existing, resolve, reject)
              return
            }
          }

          const script = document.createElement('script')
          script.async = true
          script.src = scriptUrl
          script.dataset.adsenseLoader = 'true'
          script.dataset.adsenseStatus = 'loading'
          attachScriptLoadHandlers(script, resolve, reject)
          document.head.appendChild(script)
        })
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        adsenseScriptPromise = null
        getExistingAdsenseScript()?.remove()
        if (attempt < 2) {
          await waitForAnimationFrame()
        }
      }
    }

    throw new Error(lastError?.message ?? 'ad script load failed')
  })()

  await adsenseScriptPromise
}

const props = withDefaults(
  defineProps<{
    isDevelopment?: boolean
    isVisible?: boolean
    enableRealAds?: boolean
    adsenseClient?: string
    adsenseSlot?: string
    adsenseFormat?: string
    fullWidthResponsive?: 'true' | 'false'
  }>(),
  {
    isDevelopment: true,
    isVisible: true,
    enableRealAds: false,
    adsenseClient: '',
    adsenseSlot: '',
    adsenseFormat: 'auto',
    fullWidthResponsive: 'true',
  },
)

const adElement = ref<HTMLElement | null>(null)
const adRendered = ref(false)
const adFailed = ref(false)
const viewportWidth = ref(typeof window === 'undefined' ? 1024 : window.innerWidth)

const hasRequiredAdsenseConfig = computed(() => Boolean(props.adsenseClient && props.adsenseSlot))
const scriptUrl = computed(
  () =>
    `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(props.adsenseClient)}`,
)
const useCompactLayout = computed(() => viewportWidth.value <= 420)
const resolvedAdFormat = computed(() => (useCompactLayout.value ? 'rectangle' : props.adsenseFormat))
const resolvedFullWidthResponsive = computed(() =>
  useCompactLayout.value ? 'false' : props.fullWidthResponsive,
)
const adInlineStyle = computed(() => {
  if (!useCompactLayout.value) return 'display: block'
  return 'display: block; width: 100%; min-height: 100px; height: 100px; margin: 8px auto 0'
})
const showPlaceholder = computed(
  () => props.isDevelopment || !props.enableRealAds || !hasRequiredAdsenseConfig.value || adFailed.value,
)
const placeholderMessage = computed(() => {
  if (props.isDevelopment) return 'ここに広告が表示されます（開発用ダミー表示）'
  if (!props.enableRealAds) return '実広告は無効化されています。環境変数で有効化してください。'
  if (!hasRequiredAdsenseConfig.value) return '実広告設定が不足しています（client / slot）。'
  if (adFailed.value) return 'この端末では広告を表示できない場合があります。'
  return '広告を準備中です。'
})

async function renderAd() {
  if (!props.isVisible || showPlaceholder.value || adRendered.value || !adElement.value) return
  try {
    await ensureAdsenseScript(scriptUrl.value)
    await nextTick()
    await waitForAdSlotReady(adElement.value)
    ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    adRendered.value = true
    adFailed.value = false
  } catch {
    adFailed.value = true
  }
}

function updateViewportWidth(): void {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth
}

onMounted(async () => {
  updateViewportWidth()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth, { passive: true })
  }
  await renderAd()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth)
  }
})

watch(
  () => props.isVisible,
  async (isVisible) => {
    if (!isVisible) return
    await nextTick()
    await renderAd()
  },
)
</script>

<style scoped>
.ad-container {
  position: relative;
  width: 100%;
  min-height: 96px;
  border-radius: 12px;
  border: 1px dashed rgba(100, 116, 139, 0.7);
  background: linear-gradient(135deg, rgba(241, 245, 249, 0.95), rgba(226, 232, 240, 0.88));
  padding: 12px 14px;
  display: flex;
  align-items: center;
}

.ad-container__badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #475569;
  border: 1px solid rgba(71, 85, 105, 0.35);
  border-radius: 999px;
  padding: 1px 7px;
  background: rgba(255, 255, 255, 0.85);
}

.ad-container__content {
  width: 100%;
}

.ad-container__title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: #1e293b;
}

.ad-container__text {
  margin: 4px 0 0;
  font-size: 0.84rem;
  color: #334155;
}

.ad-container__ins {
  margin-top: 8px;
  width: 100%;
  min-height: 90px;
}
</style>
