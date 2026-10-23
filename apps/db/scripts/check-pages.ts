import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { catalogEntries } from '../../../packages/catalog/src/index.ts'
import { createCatalogList, catalogListText } from '../src/catalog-list.ts'
import { createSitemapXml } from '../src/sitemap.ts'

const directory = new URL('../dist/', import.meta.url)
const files: { path: string; size: number }[] = []

function inspect(path: string) {
  for (const entry of readdirSync(new URL(path, directory), { withFileTypes: true })) {
    const relative = path + entry.name
    assert.ok(!entry.isSymbolicLink(), `公開出力にシンボリックリンクがあります：${relative}`)
    if (entry.isDirectory()) {
      inspect(relative + '/')
    } else {
      const size = statSync(new URL(relative, directory)).size
      assert.ok(size <= 25 * 1024 * 1024, `Pagesの25 MiB上限を超えています：${relative}`)
      assert.ok(!/(?:^|\/)\.[^/]+|\.(?:map|ts|vue)$/.test(relative),
        `ソース・隠しファイルは公開対象にできません：${relative}`)
      files.push({ path: relative, size })
    }
  }
}

inspect('')
assert.ok(files.length <= 20_000, `Pages Freeの20,000ファイル上限を超えています：${files.length}`)
const paths = new Set(files.map(file => file.path))
const read = (path: string) => readFileSync(new URL(path, directory), 'utf8')

const pages: [string, string][] = [
  ['index.html', '/'],
  ['numbers.html', '/numbers'],
  ['numbers/list.html', '/numbers/list'],
  ...catalogEntries.map((entry): [string, string] => [`numbers/${entry.value}.html`, `/numbers/${entry.value}`]),
]
for (const [file, path] of pages) {
  const html = read(file)
  const url = `https://db.primeqk.butchi.jp${path}`
  assert.ok(html.includes('adsbygoogle.js?client=ca-pub-2862407789219932'), `AdSenseローダーがありません：${file}`)
  assert.ok(html.includes('data-ad-client="ca-pub-2862407789219932"'), `AdSense clientが不正です：${file}`)
  assert.ok(html.includes('data-ad-slot="4301222298"'), `AdSense slotが不正です：${file}`)
  assert.ok(html.includes(`<link rel="canonical" href="${url}" />`), `canonicalが不正です：${file}`)
  assert.ok(html.includes(`<meta property="og:url" content="${url}" />`), `OG URLが不正です：${file}`)
  assert.ok(!html.includes('http://localhost') && !html.includes('http://127.0.0.1'), `ローカルURLが残っています：${file}`)
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
    assert.ok(paths.has(match[1]!.slice(1)), `参照アセットがありません：${file} → ${match[1]}`)
  }
}
assert.equal(files.filter(file => /^numbers\/\d+\.html$/.test(file.path)).length, catalogEntries.length)
for (const entry of catalogEntries) {
  const html = read(`numbers/${entry.value}.html`)
  for (const ranks of entry.representations) {
    assert.ok(html.includes(`id="cards-${ranks.join('-')}"`), `カード表現がありません：${entry.value}`)
  }
}
const notFound = read('404.html')
assert.ok(notFound.includes('<meta name="robots" content="noindex" />'), '404にnoindexが必要です。')
assert.ok(!notFound.includes('rel="canonical"'), '404にcanonicalは設定しません。')
assert.ok(paths.has('404.html'), 'PagesのSPAフォールバックを防ぐためトップ階層の404.htmlが必要です。')
const redirects = read('_redirects').trim().split('\n')
assert.deepEqual(redirects, [
  '/checker / 301',
  '/checker/ / 301',
  '/numbers/ /numbers 301',
  '/numbers/:value/ /numbers/:value 301',
  '/numbers/0:value /numbers/:value 301',
])
const list = createCatalogList()
assert.deepEqual(JSON.parse(read('numbers/list.json')), list, '固定JSONがカタログと一致しません。')
assert.equal(read('numbers/list.txt'), catalogListText(list), '固定TXTがカタログと一致しません。')
assert.equal(read('sitemap.xml'), createSitemapXml(), 'サイトマップが公開ページの正規URLと一致しません。')
assert.ok(files.some(file => /^assets\/primality\.worker-.+\.js$/.test(file.path)), '素数判定Workerがありません。')
assert.ok(files.some(file => /^assets\/permutations\.worker-.+\.js$/.test(file.path)), '並べ替えWorkerがありません。')

const largest = files.reduce((left, right) => left.size >= right.size ? left : right)
console.log(`Pages公開出力を検証しました：${fileURLToPath(directory)}`)
console.log(`${files.length}ファイル（上限20,000）、最大${(largest.size / 1024 / 1024).toFixed(2)} MiB（上限25 MiB）：${largest.path}`)
console.log(`${catalogEntries.length}件の詳細・canonical・カード表現・アセット・Worker・404・リダイレクト・JSON/TXT・サイトマップ：正常`)
