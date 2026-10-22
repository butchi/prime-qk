import { catalogEntries, searchCatalog, formatCards, catalogScope, catalogScopeDescription, catalogCardCounts, catalogDigitCounts } from '../../../packages/catalog/src/index'

export function createCatalogList(filter: { cardCount?: number; digitCount?: number; hideDominated?: boolean } = {}) {
  if (filter.cardCount !== undefined && !catalogCardCounts.some(count => count === filter.cardCount)) {
    throw new Error('カード枚数は1〜6枚で指定してください。')
  }
  if (filter.digitCount !== undefined && !catalogDigitCounts.includes(filter.digitCount)) {
    throw new Error('桁数は1〜12桁で指定してください。')
  }
  const groups = catalogCardCounts.filter(count => filter.cardCount === undefined || count === filter.cardCount).map(cardCount => {
    const entries = searchCatalog(catalogEntries, { cardCount, hideDominated: filter.hideDominated })
    const digits = Array.from({ length: cardCount + 1 }, (_, index) => {
      const digitCount = cardCount + index
      return {
        digitCount,
        entries: entries.filter(entry => entry.value.length === digitCount).map(entry => ({
          value: entry.value,
          representations: entry.representations.map(ranks => ({
            ranks,
            cards: formatCards(ranks),
          })),
        })),
      }
    }).filter(group => group.entries.length > 0 &&
      (filter.digitCount === undefined || group.digitCount === filter.digitCount))
    return { cardCount, count: digits.reduce((sum, group) => sum + group.entries.length, 0), digits }
  }).filter(group => group.count > 0)
  return {
    schemaVersion: 2,
    scope: catalogScope,
    total: new Set(groups.flatMap(group => group.digits.flatMap(digits => digits.entries.map(entry => entry.value)))).size,
    groups,
  }

}

export interface TextExportOptions {
  notation: 'number' | 'cards' | 'both'
  separator: '\n' | ',' | '\t'
  headings: boolean
}

export function customCatalogText(list: ReturnType<typeof createCatalogList>, options: TextExportOptions): string {
  return list.groups.flatMap(group => group.digits.map(digits => {
    const items = digits.entries.flatMap(entry => {
      const cards = entry.representations.map(item => item.cards)
      if (options.notation === 'number') return [entry.value]
      if (options.notation === 'cards') return cards
      return [`${entry.value} (${cards.join(' / ')})`]
    })
    const body = items.join(options.separator)
    return options.headings ? `# ${group.cardCount}枚${digits.digitCount}桁（${digits.entries.length}個）\n${body}` : body
  })).join(options.headings ? '\n\n' : options.separator)
}

export function catalogListText(list: ReturnType<typeof createCatalogList>): string {
  return [
    `# QKサーチ：${catalogScopeDescription}`,
    '# 5〜6枚は全ランクを網羅していません。未収録は素数の不存在を意味しません。',
    `# 異なる数は全${list.total}個。枚数をまたぐ重複あり。各分類内は重複なし・数値昇順。`,
    '# 各行：十進整数<TAB>カード表記（複数ある場合は | 区切り）。A=1、T=10、J=11、Q=12、K=13。',
    ...list.groups.flatMap(group => [
      '',
      `# ${group.cardCount}枚出し（${group.count}個）`,
      ...group.digits.flatMap(digits => [
        '',
        `# ${group.cardCount}枚${digits.digitCount}桁（${digits.entries.length}個）`,
        ...digits.entries.map(entry => `${entry.value}\t${entry.representations.map(item => item.cards).join(' | ')}`),
      ]),
    ]),
    '',
  ].join('\n')
}
