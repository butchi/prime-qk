import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseCards, parseCheckerInput } from '../src/card-input.ts'

test('整数とカード列を自動判別し、共有URLの明示形式も維持する', () => {
  for (const input of ['1213', '13', '23', '0013', '+13', ' -13 ', '0']) {
    assert.deepEqual(parseCheckerInput(input), { ranks: [], value: BigInt(input.trim()) })
  }
  for (const input of ['QK', ' qk ', '12-13']) {
    assert.deepEqual(parseCheckerInput(input), { ranks: [12, 13], value: 1213n })
  }
  assert.deepEqual(parseCheckerInput('A23'), { ranks: [1, 2, 3], value: 123n })
  assert.deepEqual(parseCheckerInput('1-3'), { ranks: [1, 3], value: 13n })
  assert.deepEqual(parseCheckerInput('13', 'cards'), { ranks: [13], value: 13n })
  for (const input of ['', '12K', 'Q K', '12--13', '1.5', '1e3', 'AAAAA', '9'.repeat(201)]) {
    assert.throws(() => parseCheckerInput(input), input)
  }
  assert.throws(() => parseCheckerInput('1213', 'cards'))
  assert.throws(() => parseCheckerInput('QK', 'integer'))
})

test('カード文字とランク列を同じ順序付き配列に変換する', () => {
  assert.deepEqual(parseCards(' qk '), [12, 13])
  assert.deepEqual(parseCards('12-13'), [12, 13])
  assert.deepEqual(parseCards('A23'), [1, 2, 3])
  assert.deepEqual(parseCards('1-2-3'), [1, 2, 3])
  assert.deepEqual(parseCards('TJ'), [10, 11])
  assert.deepEqual(parseCards('13'), [13])
  assert.equal(parseCards('AAAA').length, 4)
  assert.equal(parseCards(Array.from({ length: 13 }, (_, i) => Array(4).fill(i + 1).join('-')).join('-')).length, 52)
})

test('曖昧な数列・未対応の文字・デッキ上限超えを拒否する', () => {
  for (const input of ['', '1213', '23', '12K', '01-13', '0', '14', 'X', 'SA', 'Q K', 'AAAAA', '2-2-2-2-2', '12--13']) {
    assert.throws(() => parseCards(input), input)
  }
})
