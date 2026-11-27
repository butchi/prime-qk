import { createApp } from 'vue'
import { createGtm } from '@gtm-support/vue-gtm'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

const vuetify = createVuetify()

import App from './App.vue'

const app = createApp(App)

app.use(
  createGtm({
    id: 'GTM-WV5W9H4G',
  }),
)

app.use(vuetify).mount('#app')
