import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { catalogEntries, formatCards, searchCatalog } from '../src/index.ts'
import { generateCatalog } from '../src/generate.ts'

describe('1〜3枚の素数カタログ', () => {
  it('保存済みデータが生成結果と一致する', () => {
    assert.deepEqual(catalogEntries, generateCatalog())
  })

  it('全13ランクの1〜3枚の順列を独立した篩で検証する', () => {
    const limit = 131313
    const composite = new Uint8Array(limit + 1)
    composite[0] = composite[1] = 1
    for (let divisor = 2; divisor * divisor <= limit; divisor++) {
      if (composite[divisor]) continue
      for (let value = divisor * divisor; value <= limit; value += divisor) composite[value] = 1
    }
    const expected = new Set<string>()
    for (let a = 1; a <= 13; a++) {
      for (let b = 0; b <= 13; b++) {
        for (let c = 0; c <= 13; c++) {
          if (b === 0 && c !== 0) continue
          const ranks = [a, b, c].filter(rank => rank !== 0)
          const value = ranks.join('')
          if (!composite[Number(value)]) expected.add(`${value}:${ranks.join(',')}`)
        }
      }
    }
    const actual = new Set<string>()
    for (const entry of catalogEntries) {
      assert.equal(entry.classification, 'prime')
      assert.equal(entry.verification.certainty, 'deterministic')
      for (const ranks of entry.representations) {
        assert.equal(ranks.join(''), entry.value)
        actual.add(`${entry.value}:${ranks.join(',')}`)
      }
    }
    assert.deepEqual(actual, expected)
    assert.equal(new Set(catalogEntries.map(entry => entry.value)).size, catalogEntries.length)
  })

  it('113の異なるカード表現を同じ数にまとめる', () => {
    const result = searchCatalog(catalogEntries, { exactValue: '00113' })
    assert.equal(result.length, 1)
    assert.deepEqual(result[0]?.representations, [[1, 1, 3], [1, 13], [11, 3]])
    assert.equal(formatCards([1, 10, 11, 12, 13]), 'ATJQK')
    assert.equal(formatCards([13, 13, 11]), 'KKJ')
  })

  it('枚数と桁数を同時に満たす表現のみ返す', () => {
    const results = searchCatalog(catalogEntries, { cardCount: 2, digitCount: 4 })
    assert.ok(results.length > 0)
    for (const entry of results) {
      assert.equal(entry.value.length, 4)
      assert.ok(entry.representations.every(ranks => ranks.length === 2))
    }
    assert.deepEqual(searchCatalog(catalogEntries, { cardCount: 2, digitCount: 5 }), [])
    assert.deepEqual(searchCatalog(catalogEntries, { exactValue: '113', cardCount: 2 })[0]?.representations, [[1, 13], [11, 3]])
  })

  it('範囲の両端を含め、数値として昇順・降順に並べる', () => {
    const query = { minValue: '7', maxValue: '13' }
    assert.deepEqual(searchCatalog(catalogEntries, query).map(entry => entry.value), ['7', '11', '13'])
    assert.deepEqual(searchCatalog(catalogEntries, { ...query, sort: 'desc' }).map(entry => entry.value), ['13', '11', '7'])
    assert.deepEqual(searchCatalog(catalogEntries, { exactValue: '1' }), [])
    assert.deepEqual(searchCatalog(catalogEntries, { exactValue: '1212' }), [])
    assert.deepEqual(searchCatalog(catalogEntries, { exactValue: '1213', cardCount: 2 })[0]?.representations, [[12, 13]])
    assert.deepEqual(searchCatalog(catalogEntries, { minValue: '999999999999999999999' }), [])
  })

  it('不正な条件を明示的に拒否する', () => {
    for (const value of ['-1', '1.5', '1e3', '', '１２']) {
      assert.throws(() => searchCatalog(catalogEntries, { exactValue: value }))
    }
    assert.throws(() => searchCatalog(catalogEntries, { minValue: '13', maxValue: '7' }))
    assert.throws(() => searchCatalog(catalogEntries, { cardCount: 4 }))
    assert.throws(() => searchCatalog(catalogEntries, { digitCount: 0 }))
  })
})
