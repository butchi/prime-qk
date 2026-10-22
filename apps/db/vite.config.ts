import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { canonicalPath } from './src/urls'
import { catalogEntries } from '../../packages/catalog/src/index'
import type { Connect } from 'vite'

const paths = new Set(['/numbers', '/checker', ...catalogEntries.map(entry => `/numbers/${entry.value}`)])
function routes(preview: boolean): Connect.NextHandleFunction {
  return (request, response, next) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (/\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.startsWith('/@') ||
        url.pathname.startsWith('/src/') || url.pathname.startsWith('/node_modules/')) return next()
    const path = canonicalPath(url.pathname)
    if (path !== url.pathname) {
      response.writeHead(url.pathname === '/' ? 302 : 301, { Location: path + url.search })
      return response.end()
    }
    if (!paths.has(path) && preview) {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      return response.end(readFileSync(new URL('./dist/404.html', import.meta.url)))
    }
    next()
  }
}

export default defineConfig({
  plugins: [vue(), {
    name: 'catalog-routes',
    configureServer(server) { server.middlewares.use(routes(false)) },
    configurePreviewServer(server) { server.middlewares.use(routes(true)) },
  }],
  ssr: { noExternal: ['@prime-qk/catalog'] },
})
