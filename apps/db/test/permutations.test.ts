import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogEntries } from '@prime-qk/catalog'
import { searchPermutations } from '../src/permutations.ts'

test('カードをすべて使う順列の素数はカタログと独立照合できる', () => {
  for (const ranks of [[1, 3], [1, 1, 3], [12, 13], [10, 11, 13], [2], [1], [2, 2]]) {
    const actual = searchPermutations(ranks)
    assert.equal(actual.reason, 'complete')
    const key = [...ranks].sort((a, b) => a - b).join('-')
    const expected = catalogEntries.flatMap(entry => entry.representations
      .filter(candidate => [...candidate].sort((a, b) => a - b).join('-') === key)
      .map(candidate => `${entry.value}:${candidate.join('-')}`)).sort()
    assert.deepEqual(actual.matches.flatMap(item => item.representations
      .map(candidate => `${item.value}:${candidate.join('-')}`)).sort(), expected)
    assert.ok(actual.matches.every(item => item.result.kind === 'prime'))
  }
  assert.equal(searchPermutations([1, 3]).matches[0]!.value, '31')
  assert.equal(searchPermutations([2, 2]).checked, 1)
})

test('4枚以上と重複カード・同じ数の複数表現を扱い、確定範囲を越えた数を候補とする', () => {
  const result = searchPermutations([1, 1, 1, 2])
  assert.equal(result.reason, 'complete')
  assert.equal(result.checked, 4)
  assert.deepEqual(result.matches.map(item => item.value), ['2111'])
  const multiple = searchPermutations([1, 11, 7])
  assert.equal(multiple.matches.find(item => item.value === '1117')?.representations.length, 2)
  const candidate = searchPermutations([11, 11, 11, 11, 12, 12, 12, 12, 13, 13, 13])
  assert.throws(() => searchPermutations([1, 1, 1, 1, 1]))
  assert.ok(candidate.matches.length > 0)
  assert.ok(candidate.matches.every(item => item.result.kind === 'probable-prime'))
})

test('時間切れと100件超過を完了と混同せず、途中結果を通知する', () => {
  const timeout = searchPermutations([1, 2, 3, 4], () => {}, 0)
  assert.equal(timeout.reason, 'timeout')
  assert.equal(timeout.checked, 0)
  assert.deepEqual(timeout.matches, [])
  let notifications = 0
  const limited = searchPermutations([1, 2, 3, 4, 5, 6, 7], () => notifications++)
  assert.equal(limited.reason, 'limit')
  assert.equal(limited.matches.length, 100)
  assert.ok(notifications >= 101)
  assert.deepEqual(limited.matches.map(item => item.value),
    [...limited.matches].sort((a, b) => BigInt(a.value) > BigInt(b.value) ? -1 : 1).map(item => item.value))
})
