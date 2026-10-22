import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogEntries, formatCards } from '@prime-qk/catalog'
import { createCatalogList, catalogListText, customCatalogText } from '../src/catalog-list.ts'

test('枚数・桁数別一覧は全表現を分類し、各分類内で数を重複させない', () => {
  const list = createCatalogList()
  assert.equal(list.schemaVersion, 2)
  assert.deepEqual(list.scope, { jokers: false, minCards: 1, maxCards: 3 })
  assert.equal(list.total, 337)
  assert.deepEqual(list.groups.map(group => group.cardCount), [1, 2, 3])
  const unique = new Set<string>()
  for (const group of list.groups) {
    const expected = catalogEntries.filter(entry => entry.representations.some(ranks => ranks.length === group.cardCount))
    const values = group.digits.flatMap(digits => {
      const values = digits.entries.map(entry => entry.value)
      assert.ok(values.length > 0)
      assert.ok(values.every(value => value.length === digits.digitCount))
      assert.equal(new Set(values).size, values.length)
      assert.deepEqual(values, [...values].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : 1))
      for (const entry of digits.entries) {
        const source = expected.find(item => item.value === entry.value)!
        assert.deepEqual(entry.representations.map(item => item.ranks),
          source.representations.filter(ranks => ranks.length === group.cardCount))
        for (const item of entry.representations) {
          assert.equal(item.ranks.join(''), entry.value)
          assert.equal(item.cards, formatCards(item.ranks))
        }
      }
      return values
    })

    assert.equal(group.count, values.length)
    assert.deepEqual(new Set(values), new Set(expected.map(entry => entry.value)))
    values.forEach(value => unique.add(value))
  }
  assert.equal(unique.size, list.total)
  const find = (cards: number, value: string) => list.groups.find(group => group.cardCount === cards)!
    .digits.flatMap(digits => digits.entries).find(entry => entry.value === value)
  assert.deepEqual(find(1, '13')?.representations.map(item => item.cards), ['K'])
  assert.deepEqual(find(2, '13')?.representations.map(item => item.cards), ['A3'])
  assert.deepEqual(find(2, '113')?.representations.map(item => item.cards), ['AK', 'J3'])
  assert.deepEqual(find(3, '113')?.representations.map(item => item.cards), ['AA3'])
  assert.deepEqual(find(2, '1213')?.representations.map(item => item.cards), ['QK'])
})

test('カスタム出力の条件は枚数・桁数・全カード表現に適用され、総数を再計算する', () => {
  for (const cardCount of [undefined, 1, 2, 3]) {
    for (const digitCount of [undefined, 1, 2, 3, 4, 5, 6]) {
      const list = createCatalogList({ cardCount, digitCount })
      const expected = catalogEntries.filter(entry =>
        (digitCount === undefined || entry.value.length === digitCount) &&
        entry.representations.some(ranks => cardCount === undefined || ranks.length === cardCount))
      assert.equal(list.total, expected.length)
      for (const group of list.groups) {
        if (cardCount !== undefined) assert.equal(group.cardCount, cardCount)
        assert.equal(group.count, group.digits.reduce((sum, digits) => sum + digits.entries.length, 0))
        for (const digits of group.digits) {
          if (digitCount !== undefined) assert.equal(digits.digitCount, digitCount)
          for (const entry of digits.entries) {
            assert.ok(entry.representations.every(item => item.ranks.length === group.cardCount))
          }
        }
      }
    }
  }
  assert.deepEqual(createCatalogList({ cardCount: 1, digitCount: 6 }).groups, [])
  assert.throws(() => createCatalogList({ cardCount: 4 }))
  assert.throws(() => createCatalogList({ digitCount: 0 }))
})

test('カスタムTXTの全表記・区切り・見出しの組み合わせを検証する', () => {
  const list = createCatalogList({ cardCount: 1, digitCount: 2 })
  for (const separator of ['\n', ',', '\t'] as const) {
    for (const [notation, items] of [
      ['number', ['11', '13']], ['cards', ['J', 'K']], ['both', ['11 (J)', '13 (K)']],
    ] as const) {
      for (const headings of [false, true]) {
        const text = customCatalogText(list, { notation, separator, headings })
        assert.equal(text, `${headings ? '# 1枚2桁（2個）\n' : ''}${items.join(separator)}`)
      }
    }
  }
  const multiple = createCatalogList({ cardCount: 2, digitCount: 3 })
  assert.ok(customCatalogText(multiple, { notation: 'both', separator: '\n', headings: false }).split('\n').includes('113 (AK / J3)'))
  const cards = customCatalogText(multiple, { notation: 'cards', separator: ',', headings: false }).split(',')
  assert.ok(cards.includes('AK'))
  assert.ok(cards.includes('J3'))
  assert.equal(customCatalogText(createCatalogList({ cardCount: 1, digitCount: 6 }),
    { notation: 'number', separator: '\n', headings: true }), '')
})

test('JSONとUTF-8 TXTは同じ分類・件数・数値文字列を保持する', () => {
  const list = createCatalogList()
  assert.deepEqual(JSON.parse(JSON.stringify(list)), list)
  const text = catalogListText(list)
  assert.ok(text.endsWith('\n'))
  assert.ok(text.includes('ジョーカーなし・1〜3枚'))
  const expected = list.groups.flatMap(group => group.digits.flatMap(digits => digits.entries.map(entry =>
    `${entry.value}\t${entry.representations.map(item => item.cards).join(' | ')}`)))
  const actual = text.split('\n').filter(line => line && !line.startsWith('#'))
  assert.deepEqual(actual, expected)
  for (const group of list.groups) {
    assert.ok(text.includes(`# ${group.cardCount}枚出し（${group.count}個）`))
    for (const digits of group.digits) {
      assert.ok(text.includes(`# ${group.cardCount}枚${digits.digitCount}桁（${digits.entries.length}個）`))
    }
  }
})
