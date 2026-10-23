import { catalogEntries } from '../../../packages/catalog/src/index'

const origin = 'https://db.primeqk.butchi.jp'

export function createSitemapXml(): string {
  const paths = ['/', '/numbers', '/numbers/list', ...catalogEntries.map(entry => `/numbers/${entry.value}`)]
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map(path => `  <url><loc>${new URL(path, origin).href}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')
}
