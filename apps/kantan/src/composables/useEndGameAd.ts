import { computed, type Ref } from 'vue'

export function useEndGameAd(showWinDialogState: Ref<boolean>, showLoseDialogState: Ref<boolean>) {
  const shouldShowEndGameAd = computed(
    () => showWinDialogState.value || showLoseDialogState.value,
  )

  const isDevelopment = computed(() => import.meta.env.DEV)
  const enableRealAds = computed(() => import.meta.env.VITE_ENABLE_REAL_ADS === 'true')
  const adsenseClient = computed(() => import.meta.env.VITE_ADSENSE_CLIENT ?? '')
  const adsenseSlot = computed(() => import.meta.env.VITE_ADSENSE_SLOT_ENDGAME ?? '')
  const adsenseFormat = computed(() => import.meta.env.VITE_ADSENSE_FORMAT ?? 'auto')
  const fullWidthResponsive = computed(() =>
    import.meta.env.VITE_ADSENSE_FULL_WIDTH_RESPONSIVE === 'false' ? 'false' : 'true',
  )

  return {
    shouldShowEndGameAd,
    isDevelopment,
    enableRealAds,
    adsenseClient,
    adsenseSlot,
    adsenseFormat,
    fullWidthResponsive,
  }
}
