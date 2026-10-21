/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_ENABLE_REAL_ADS?: string
	readonly VITE_ADSENSE_CLIENT?: string
	readonly VITE_ADSENSE_SLOT_ENDGAME?: string
	readonly VITE_ADSENSE_FORMAT?: string
	readonly VITE_ADSENSE_FULL_WIDTH_RESPONSIVE?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
