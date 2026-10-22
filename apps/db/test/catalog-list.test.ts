import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogEntries, formatCards } from '@prime-qk/catalog'
import { createCatalogList, catalogListText } from '../src/catalog-list.ts'

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
