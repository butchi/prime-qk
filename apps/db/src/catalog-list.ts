import { catalogEntries, searchCatalog, formatCards } from '../../../packages/catalog/src/index'

export function createCatalogList() {
  const groups = [1, 2, 3].map(cardCount => {
    const entries = searchCatalog(catalogEntries, { cardCount })
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
    }).filter(group => group.entries.length > 0)
    return { cardCount, count: entries.length, digits }
  })
  return {
    schemaVersion: 2,
    scope: { jokers: false, minCards: 1, maxCards: 3 },
    total: catalogEntries.length,
    groups,
  }
}

export function catalogListText(list: ReturnType<typeof createCatalogList>): string {
  return [
    '# QKサーチ：ジョーカーなし・1〜3枚で作れる素数',
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
