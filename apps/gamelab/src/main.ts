import { createApp, type Component } from 'vue'
import { createGtm } from '@gtm-support/vue-gtm'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import './shell.css'

type GameRoute = {
  title: string
  loadApp: () => Promise<{ default: Component }>
  loadStyle: () => Promise<unknown>
  useKukuTheme?: boolean
}

const games: Record<string, GameRoute> = {
  '/kkqkj': {
    title: 'KKQKJ（仮）',
    loadApp: () => import('./games/kkqkj/App.vue'),
    loadStyle: () => import('./games/kkqkj/style.css'),
    useKukuTheme: false,
  },
  '/kuku-daifugo': {
    title: '九九大富豪',
    loadApp: () => import('../mock/kuku-daifugo/src/App.vue'),
    loadStyle: () => import('../mock/kuku-daifugo/src/style.css'),
  },
  '/kuku-daifugo-reduce': {
    title: '九九大富豪 Reduce',
    loadApp: () => import('../mock/kuku-daifugo-reduce/src/App.vue'),
    loadStyle: () => import('../mock/kuku-daifugo-reduce/src/style.css'),
  },
  '/kuku-reduce': {
    title: '九九 Reduce',
    loadApp: () => import('../mock/kuku-reduce/src/App.vue'),
    loadStyle: () => import('../mock/kuku-reduce/src/style.css'),
  },
  '/kuku-reduce-99': {
    title: '九九かけ 99',
    loadApp: () => import('../mock/kuku-reduce-99/src/App.vue'),
    loadStyle: () => import('../mock/kuku-reduce-99/src/style.css'),
  },
  '/naturalkk': {
    title: 'Natural KK',
    loadApp: () => import('../mock/naturalkk/src/App.vue'),
    loadStyle: () => import('../mock/naturalkk/src/style.css'),
  },
  '/sanjutsu-daifugo': {
    title: '算術大富豪',
    loadApp: () => import('../mock/sanjutsu-daifugo/src/App.vue'),
    loadStyle: () => import('../mock/sanjutsu-daifugo/src/style.css'),
  },
}

async function bootstrap() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const game = games[path]
  let App: Component

  if (game) {
    await game.loadStyle()
    if (game.useKukuTheme !== false) await import('./kuku-theme.css')
    App = (await game.loadApp()).default
    document.title = `${game.title} | GAME LAB`
    const homeLink = document.createElement('a')
    homeLink.href = '/'
    homeLink.className = 'site-home-link'
    homeLink.setAttribute('aria-label', 'ゲーム一覧へ戻る')
    homeLink.textContent = '⌂  GAME LAB'
    document.body.append(homeLink)
  } else {
    await import('./style.css')
    App = (await import('./Hub.vue')).default
    document.title = 'GAME LAB — カードゲームの実験室'
  }

  const app = createApp(App)
  app.use(createGtm({ id: 'GTM-WV5W9H4G' }))
  app.use(createVuetify()).mount('#app')
}

bootstrap()
