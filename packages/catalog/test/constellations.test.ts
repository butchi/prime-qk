import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogEntries, primeConstellations, searchCatalog, searchPrimeConstellations } from '../src/index.ts'
import type { CatalogEntry } from '../src/index.ts'

const values = (groups: CatalogEntry[][]) => groups.map(group => group.map(entry => entry.value))

test('双子・三つ子の両パターン・四つ子を全員収録済みの組として返す', () => {
  const small = { maxValue: '20' }
  assert.deepEqual(values(searchPrimeConstellations(catalogEntries, 'twin', small)),
    [['3', '5'], ['5', '7'], ['11', '13'], ['17', '19']])
  assert.deepEqual(values(searchPrimeConstellations(catalogEntries, 'triplet', small)),
    [['5', '7', '11'], ['7', '11', '13'], ['11', '13', '17'], ['13', '17', '19']])
  assert.deepEqual(values(searchPrimeConstellations(catalogEntries, 'quadruplet', small)),
    [['5', '7', '11', '13'], ['11', '13', '17', '19']])
  const withoutSeven = catalogEntries.filter(entry => entry.value !== '7')
  assert.deepEqual(values(searchPrimeConstellations(withoutSeven, 'twin', { maxValue: '10' })), [['3', '5']])
  const composite: CatalogEntry = {
    value: '9', classification: 'composite',
    verification: { method: 'trial-division', certainty: 'deterministic' }, representations: [[9]],
  }
  assert.deepEqual(values(searchPrimeConstellations([...catalogEntries, composite], 'twin', { maxValue: '10' })),
    [['3', '5'], ['5', '7']])
})

test('範囲・枚数・桁数・下位互換は全員、完全一致はいずれかの数に適用する', () => {
  assert.deepEqual(values(searchPrimeConstellations(catalogEntries, 'twin', { exactValue: '0005' })),
    [['3', '5'], ['5', '7']])
  assert.deepEqual(values(searchPrimeConstellations(catalogEntries, 'twin', { minValue: '5', maxValue: '12' })),
    [['5', '7']])
  assert.deepEqual(values(searchPrimeConstellations(catalogEntries, 'twin', { maxValue: '20', cardCount: 1 })),
    [['3', '5'], ['5', '7'], ['11', '13']])
  assert.deepEqual(values(searchPrimeConstellations(catalogEntries, 'triplet', { maxValue: '20', digitCount: 1 })), [])
  assert.deepEqual(values(searchPrimeConstellations(catalogEntries, 'twin', { exactValue: '13', cardCount: 2 })),
    [['11', '13']])
  assert.deepEqual(searchPrimeConstellations(catalogEntries, 'twin', { exactValue: '13', cardCount: 2, hideDominated: true }), [])
  assert.deepEqual(values(searchPrimeConstellations(catalogEntries, 'twin', { exactValue: '13', hideDominated: true })),
    [['11', '13']])
  for (const query of [
    { cardCount: 2 }, { digitCount: 4 }, { cardCount: 4, digitCount: 8 },
    { cardCount: 6, digitCount: 12 }, { hideDominated: true }, { cardCount: 2, hideDominated: true },
  ]) {
    const allowed = searchCatalog(catalogEntries, query)
    const byValue = new Map(allowed.map(entry => [entry.value, entry]))
    for (const kind of primeConstellations) {
      for (const group of searchPrimeConstellations(catalogEntries, kind.id, query)) {
        for (const entry of group) assert.deepEqual(entry, byValue.get(entry.value))
      }
    }
  }
})

test('全カタログの組と12桁の組を独立した数値差の走査で照合し、順序を維持する', () => {
  const primes = catalogEntries.filter(entry => entry.classification === 'prime')
  const sorted = [...primes].sort((a, b) => Number(a.value) - Number(b.value))
  const byValue = new Set(primes.map(entry => Number(entry.value)))
  for (const [kind, gaps] of [
    ['twin', [[2]]], ['triplet', [[2, 4], [4, 2]]], ['quadruplet', [[2, 4, 2]]],
  ] as const) {
    const expected: string[][] = []
    for (const entry of sorted) {
      for (const sequence of gaps) {
        let number = Number(entry.value)
        const group = [entry.value]
        for (const gap of sequence) {
          number += gap
          if (!byValue.has(number)) break
          group.push(String(number))
        }
        if (group.length === sequence.length + 1) expected.push(group)
      }
    }
    const ascending = values(searchPrimeConstellations([...primes].reverse(), kind))
    assert.deepEqual(ascending, expected)
    const descending = values(searchPrimeConstellations(primes, kind, { sort: 'desc' }))
    assert.deepEqual(descending.map(group => group[0]), expected.map(group => group[0]).reverse())
    assert.deepEqual(new Set(descending.map(group => group.join(','))), new Set(expected.map(group => group.join(','))))
    assert.deepEqual(values(searchPrimeConstellations(primes, kind, { cardCount: 6, digitCount: 12 })),
      expected.filter(group => group.every(value => value.length === 12 &&
        primes.find(entry => entry.value === value)!.representations.some(ranks => ranks.length === 6))))
  }
})

test('不正な組の種類や検索条件を成功扱いしない', () => {
  for (const query of [{ exactValue: '-1' }, { minValue: '10', maxValue: '2' }, { cardCount: 7 }, { digitCount: 13 }]) {
    assert.throws(() => searchPrimeConstellations(catalogEntries, 'twin', query))
  }
  // JavaScriptからの呼び出しでも未知の種類は拒否する。
  // @ts-expect-error 不正な実行時入力の検証
  assert.throws(() => searchPrimeConstellations(catalogEntries, 'unknown'))
})

test('最下位桁以外の固定は十進表記で判定し、桁上がりや桁数境界をまたぐ組を除外する', () => {
  const query = { minValue: '101', maxValue: '113', samePrefix: true }
  assert.deepEqual(values(searchPrimeConstellations(catalogEntries, 'triplet', query)),
    [['101', '103', '107'], ['103', '107', '109']])
  assert.ok(values(searchPrimeConstellations(catalogEntries, 'triplet', { minValue: '101', maxValue: '113' }))
    .some(group => group.join(',') === '107,109,113'))
  assert.deepEqual(searchPrimeConstellations(catalogEntries, 'twin', { exactValue: '19', samePrefix: true }),
    searchPrimeConstellations(catalogEntries, 'twin', { exactValue: '19' }))
  assert.deepEqual(searchPrimeConstellations(catalogEntries, 'twin', { exactValue: '11', samePrefix: true })
    .map(group => group.map(entry => entry.value)), [['11', '13']])
  for (const kind of primeConstellations) {
    for (const filter of [{}, { sort: 'desc' as const }, { cardCount: 6, digitCount: 12 }, { hideDominated: true }]) {
      const unfiltered = searchPrimeConstellations(catalogEntries, kind.id, filter)
      const expected = unfiltered.filter(group => group.every(entry =>
        BigInt(entry.value) / 10n === BigInt(group[0]!.value) / 10n))
      assert.deepEqual(searchPrimeConstellations(catalogEntries, kind.id, { ...filter, samePrefix: true }), expected)
    }
  }
  const large: CatalogEntry[] = ['90071992547409931', '90071992547409933', '90071992547409939', '90071992547409941']
    .map(value => ({
      value, classification: 'prime',
      verification: { method: 'trial-division', certainty: 'deterministic' }, representations: [[1]],
    }))
  assert.deepEqual(values(searchPrimeConstellations(large, 'twin', { samePrefix: true })),
    [['90071992547409931', '90071992547409933']])
})
