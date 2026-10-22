import type { CatalogQuery } from '@prime-qk/catalog'

export interface SearchDraft {
  exactValue: string
  minValue: string
  maxValue: string
  cardCount: string
  digitCount: string
  sort: string
}

export function readSearch(params: URLSearchParams) {
  const allowed = ['exact', 'min', 'max', 'cards', 'digits', 'sort', 'page']
  for (const key of params.keys()) {
    if (!allowed.includes(key)) throw new Error(`不明な検索条件です：${key}`)
    if (params.getAll(key).length !== 1) throw new Error(`検索条件が重複しています：${key}`)
  }
  const number = (key: string) => {
    const value = params.get(key)
    if (value === null) return ''
    if (!/^\d+$/.test(value)) throw new Error(`${key} は半角数字の整数で指定してください。`)
    return BigInt(value).toString()
  }
  const draft: SearchDraft = {
    exactValue: number('exact'), minValue: number('min'), maxValue: number('max'),
    cardCount: number('cards'), digitCount: number('digits'),
    sort: params.get('sort') ?? 'asc',
  }
  if (!['asc', 'desc'].includes(draft.sort)) throw new Error('並び順が不正です。')
  const page = Number(number('page') || '1')
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('ページ番号は1以上の整数で指定してください。')
  const query: CatalogQuery = {
    exactValue: draft.exactValue || undefined,
    minValue: draft.minValue || undefined, maxValue: draft.maxValue || undefined,
    cardCount: draft.cardCount ? Number(draft.cardCount) : undefined,
    digitCount: draft.digitCount ? Number(draft.digitCount) : undefined,
    sort: draft.sort === 'desc' ? 'desc' : 'asc',
  }
  return { draft, query, page }
}

export function searchUrl(draft: SearchDraft, page: number): string {
  const params = new URLSearchParams()
  for (const [key, value] of [
    ['exact', draft.exactValue], ['min', draft.minValue], ['max', draft.maxValue],
    ['cards', draft.cardCount], ['digits', draft.digitCount],
  ] as const) {
    if (value.trim()) params.set(key, value.trim())
  }
  if (draft.sort !== 'asc') params.set('sort', draft.sort)
  if (page !== 1) params.set('page', String(page))
  const state = readSearch(params)
  for (const [key, value] of [
    ['exact', state.draft.exactValue], ['min', state.draft.minValue], ['max', state.draft.maxValue],
    ['cards', state.draft.cardCount], ['digits', state.draft.digitCount],
  ] as const) {
    if (value) params.set(key, value)
  }
  return `/numbers${params.size ? `?${params}` : ''}`
}

export function canonicalPath(path: string): string {
  const stripped = path.replace(/\/+$/, '') || '/'
  if (stripped === '/checker') return '/'
  const match = /^\/numbers\/(\d+)$/.exec(stripped)
  return match ? `/numbers/${BigInt(match[1]!).toString()}` : stripped
}
