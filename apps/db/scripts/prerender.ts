import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { catalogEntries } from '../../../packages/catalog/src/index.ts'

const directory = new URL('../dist/', import.meta.url)
const template = readFileSync(new URL('index.html', directory), 'utf8')
const bundle = new URL('../dist-ssr/entry-server.js', import.meta.url).href
const { render } = await import(bundle)
const origin = 'https://db.primeqk.butchi.jp'
const redirects = [
  '/ /numbers 302',
  '/numbers/ /numbers 301',
  '/numbers/:value/ /numbers/:value 301',
  '/numbers/0:value /numbers/:value 301',
  '/checker/ /checker 301',
]

async function write(path: string, title: string, description: string, file: string) {
  const body: string = await render(path)
  let html = template
    .replace('<div id="app"></div>', `<div id="app">${body}</div>`)
    .replace('<title>QKサーチ — 素数大富豪の数を検索・判定</title>', `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`)
  if (file === '404.html') {
    html = html.replace('</head>', '<meta name="robots" content="noindex" /></head>')
  } else {
    const url = new URL(path, origin).href
    html = html.replace('</head>', [
      `<link rel="canonical" href="${url}" />`,
      '<meta property="og:type" content="website" />',
      '<meta property="og:site_name" content="QKサーチ" />',
      '<meta property="og:locale" content="ja_JP" />',
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      '</head>',
    ].join('\n'))
  }
  writeFileSync(new URL(file, directory), html)
}

mkdirSync(new URL('numbers/', directory), { recursive: true })
await write('/numbers', 'QKサーチ — 素数大富豪の数を検索・判定', 'カード枚数・桁数・数の範囲で素数を検索。最大200桁の整数の素数判定にも対応しています。', 'numbers.html')
await write('/checker', '素数判定 | QKサーチ', '最大200桁の十進整数やQK・12-13などのカード列を素数判定。大きい数の検査通過は素数候補として表示します。', 'checker.html')
for (const entry of catalogEntries) {
  await write(`/numbers/${entry.value}`, `${entry.value} のカード表現 | QKサーチ`,
    `${entry.value} は素数です。ジョーカーなし・1〜3枚のカード表現${entry.representations.length}通りを紹介します。`,
    `numbers/${entry.value}.html`)
}
await write('/404', 'ページが見つかりません | QKサーチ', '未収録の数または存在しないページです。', '404.html')
writeFileSync(new URL('_redirects', directory), redirects.join('\n') + '\n')
writeFileSync(new URL('index.html', directory), '<!doctype html><html lang="ja"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/numbers"><title>QKサーチ</title><a href="/numbers">一覧・検索へ</a></html>')
rmSync(new URL('../dist-ssr/', import.meta.url), { recursive: true })
console.log(`${catalogEntries.length}件の詳細HTML・一覧・404を生成しました。`)
