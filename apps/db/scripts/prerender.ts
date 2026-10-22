import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { catalogEntries, catalogScopeDescription } from '../../../packages/catalog/src/index.ts'
import { createCatalogList, catalogListText } from '../src/catalog-list.ts'

const directory = new URL('../dist/', import.meta.url)
const template = readFileSync(new URL('index.html', directory), 'utf8')
const bundle = new URL('../dist-ssr/entry-server.js', import.meta.url).href
const { render } = await import(bundle)
const origin = 'https://db.primeqk.butchi.jp'
const redirects = [
  '/checker / 301',
  '/checker/ / 301',
  '/numbers/ /numbers 301',
  '/numbers/:value/ /numbers/:value 301',
  '/numbers/0:value /numbers/:value 301',
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
await write('/numbers/list', '枚数・桁数別の素数一覧 | QKサーチ', `${catalogScopeDescription}。収録済み素数を枚数・桁数別に掲載。JSON・TXTでも取得できます。`, 'numbers/list.html')
const list = createCatalogList()
writeFileSync(new URL('numbers/list.json', directory), JSON.stringify(list, null, 2) + '\n')
writeFileSync(new URL('numbers/list.txt', directory), catalogListText(list))
await write('/', 'QKサーチ — 素数大富豪の数を検索・判定', '最大200桁の十進整数やQK・12-13などのカード列を素数判定。大きい数の検査通過は素数候補として表示します。', 'index.html')
for (const entry of catalogEntries) {
  await write(`/numbers/${entry.value}`, `${entry.value} のカード表現 | QKサーチ`,
    `${entry.value} は素数です。${catalogScopeDescription}。収録済みカード表現${entry.representations.length}通りを紹介します。`,
    `numbers/${entry.value}.html`)
}
await write('/404', 'ページが見つかりません | QKサーチ', '未収録の数または存在しないページです。', '404.html')
writeFileSync(new URL('_redirects', directory), redirects.join('\n') + '\n')
rmSync(new URL('../dist-ssr/', import.meta.url), { recursive: true })
console.log(`${catalogEntries.length}件の詳細HTML・トップ・検索・枚数別一覧・JSON・TXT・404を生成しました。`)
