import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'

export function render(url: string) {
  return renderToString(createSSRApp(App, { url }))
}
