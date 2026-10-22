import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogEntries } from '@prime-qk/catalog'
import { createCatalogList, catalogListText } from '../src/catalog-list.ts'

test('枚数・桁数別一覧は全表現を分類し、各分類内で数を重複させない', () => {
  const list = createCatalogList()
  assert.equal(list.schemaVersion, 1)
  assert.deepEqual(list.scope, { jokers: false, minCards: 1, maxCards: 3 })
  assert.equal(list.total, 337)
  assert.deepEqual(list.groups.map(group => group.cardCount), [1, 2, 3])
  const unique = new Set<string>()
  for (const group of list.groups) {
    const expected = catalogEntries.filter(entry => entry.representations.some(ranks => ranks.length === group.cardCount))
    const values = group.digits.flatMap(digits => {
      assert.ok(digits.values.length > 0)
      assert.ok(digits.values.every(value => value.length === digits.digitCount))
      assert.equal(new Set(digits.values).size, digits.values.length)
      assert.deepEqual(digits.values, [...digits.values].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : 1))
      return digits.values
    })
    assert.equal(group.count, values.length)
    assert.deepEqual(new Set(values), new Set(expected.map(entry => entry.value)))
    values.forEach(value => unique.add(value))
  }
  assert.equal(unique.size, list.total)
  assert.ok(list.groups[0]!.digits.some(digits => digits.values.includes('13')))
  assert.ok(list.groups[1]!.digits.some(digits => digits.values.includes('13')))
  assert.ok(list.groups[1]!.digits.some(digits => digits.values.includes('113')))
  assert.ok(list.groups[2]!.digits.some(digits => digits.values.includes('113')))
})

test('JSONとUTF-8 TXTは同じ分類・件数・数値文字列を保持する', () => {
  const list = createCatalogList()
  assert.deepEqual(JSON.parse(JSON.stringify(list)), list)
  const text = catalogListText(list)
  assert.ok(text.endsWith('\n'))
  assert.ok(text.includes('ジョーカーなし・1〜3枚'))
  const expected = list.groups.flatMap(group => group.digits.flatMap(digits => digits.values))
  const actual = text.split('\n').filter(line => line && !line.startsWith('#'))
  assert.deepEqual(actual, expected)
  for (const group of list.groups) {
    assert.ok(text.includes(`# ${group.cardCount}枚出し（${group.count}個）`))
    for (const digits of group.digits) {
      assert.ok(text.includes(`# ${group.cardCount}枚${digits.digitCount}桁（${digits.values.length}個）`))
    }
  }
})
