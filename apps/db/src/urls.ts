import { isPrimeConstellationKind } from '../../../packages/catalog/src/index'
import type { PrimeConstellationQuery, PrimeConstellationKind } from '@prime-qk/catalog'

export interface SearchDraft {
  exactValue: string
  minValue: string
  maxValue: string
  cardCount: string
  digitCount: string
  sort: string
  hideDominated: boolean
  constellation: '' | PrimeConstellationKind
  samePrefix: boolean
}

export function readSearch(params: URLSearchParams) {
  const allowed = ['exact', 'min', 'max', 'cards', 'digits', 'sort', 'page', 'undominated', 'constellation', 'same-prefix']
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
  if (params.has('undominated') && params.get('undominated') !== '1') throw new Error('undominated は1で指定してください。')
  const constellation = params.get('constellation')
  if (constellation !== null && !isPrimeConstellationKind(constellation)) throw new Error('素数の組の種類が不正です。')
  if (params.has('same-prefix')) {
    if (params.get('same-prefix') !== '1') throw new Error('same-prefix は1で指定してください。')
    if (constellation === null) throw new Error('最下位桁以外を固定するには素数の組の種類を指定してください。')
  }
  const draft: SearchDraft = {
    exactValue: number('exact'), minValue: number('min'), maxValue: number('max'),
    cardCount: number('cards'), digitCount: number('digits'),
    sort: params.get('sort') ?? 'asc',
    hideDominated: params.has('undominated'),
    constellation: constellation ?? '',
    samePrefix: params.has('same-prefix'),
  }
  if (!['asc', 'desc'].includes(draft.sort)) throw new Error('並び順が不正です。')
  const page = Number(number('page') || '1')
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('ページ番号は1以上の整数で指定してください。')
  const query: PrimeConstellationQuery = {
    exactValue: draft.exactValue || undefined,
    minValue: draft.minValue || undefined, maxValue: draft.maxValue || undefined,
    cardCount: draft.cardCount ? Number(draft.cardCount) : undefined,
    digitCount: draft.digitCount ? Number(draft.digitCount) : undefined,
    sort: draft.sort === 'desc' ? 'desc' : 'asc',
    hideDominated: draft.hideDominated,
    samePrefix: draft.samePrefix,
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
  if (draft.hideDominated) params.set('undominated', '1')
  if (draft.constellation) params.set('constellation', draft.constellation)
  if (draft.constellation && draft.samePrefix) params.set('same-prefix', '1')
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
