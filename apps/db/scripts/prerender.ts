import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { catalogEntries } from '../../../packages/catalog/src/index.ts'

const directory = new URL('../dist/', import.meta.url)
const template = readFileSync(new URL('index.html', directory), 'utf8')
const bundle = new URL('../dist-ssr/entry-server.js', import.meta.url).href
const { render } = await import(bundle)
const redirects = [
  '/ /numbers 302',
  '/numbers/ /numbers 301',
  '/numbers/:value/ /numbers/:value 301',
  '/numbers/0:value /numbers/:value 301',
]

async function write(path: string, title: string, description: string, file: string) {
  const body: string = await render(path)
  let html = template
    .replace('<div id="app"></div>', `<div id="app">${body}</div>`)
    .replace('<title>Prime QK DB</title>', `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`)
  if (file === '404.html') html = html.replace('</head>', '<meta name="robots" content="noindex" /></head>')
  writeFileSync(new URL(file, directory), html)
}

mkdirSync(new URL('numbers/', directory), { recursive: true })
await write('/numbers', '素数の一覧・検索 | Prime QK DB', 'カード枚数・桁数・数の範囲で素数を検索できます。', 'numbers.html')
for (const entry of catalogEntries) {
  await write(`/numbers/${entry.value}`, `${entry.value} のカード表現 | Prime QK DB`,
    `${entry.value} は素数です。ジョーカーなし・1〜3枚のカード表現${entry.representations.length}通りを紹介します。`,
    `numbers/${entry.value}.html`)
}
await write('/404', 'ページが見つかりません | Prime QK DB', '未収録の数または存在しないページです。', '404.html')
writeFileSync(new URL('_redirects', directory), redirects.join('\n') + '\n')
writeFileSync(new URL('index.html', directory), '<!doctype html><html lang="ja"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/numbers"><title>Prime QK DB</title><a href="/numbers">一覧・検索へ</a></html>')
rmSync(new URL('../dist-ssr/', import.meta.url), { recursive: true })
console.log(`${catalogEntries.length}件の詳細HTML・一覧・404を生成しました。`)
