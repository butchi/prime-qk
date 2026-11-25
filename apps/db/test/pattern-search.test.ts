import assert from 'node:assert/strict'
import { test } from 'node:test'
import { searchCardPattern } from '../src/pattern-search.ts'

test('正規表現に一致するカード列だけを判定し、並べ替えない', () => {
  const result = searchCardPattern('^[2468]J$')
  assert.equal(result.reason, 'complete')
  assert.equal(result.checked, 4)
  assert.deepEqual(result.matches.map(item => [item.value, item.representations]), [
    ['811', [[8, 11]]],
    ['211', [[2, 11]]],
  ])
})

test('エースの別名、選択、グループ、文字クラスを展開し、同じ表現を重複させない', () => {
  const result = searchCardPattern('^([1A]J7|JA7|[1A]J7)$')
  assert.equal(result.checked, 2)
  assert.deepEqual(result.matches.map(item => item.value), ['1117'])
  assert.deepEqual(result.matches[0]!.representations, [[1, 11, 7], [11, 1, 7]])
  assert.deepEqual(searchCardPattern('^[2-3]$').matches.map(item => item.value), ['3', '2'])
})

test('量指定の展開とカードの枚数制限を守る', () => {
  assert.equal(searchCardPattern('^A+$').checked, 4)
  assert.equal(searchCardPattern('^(AA)+$').checked, 2)
  assert.equal(searchCardPattern('^A?2$').checked, 2)
  assert.equal(searchCardPattern('^AAAAA$').checked, 0)
  assert.deepEqual(searchCardPattern('^A*$').matches.map(item => item.value), ['11'])
  assert.equal(searchCardPattern('^(TJ)*$').checked, 4)
  assert.deepEqual(searchCardPattern('[2468]J').matches, searchCardPattern('^[2468]J$').matches)
  assert.equal(searchCardPattern('^KKKJQQJJQQJ$').matches[0]?.result.kind, 'probable-prime')
})

test('明示的な繰り返し回数でカード列やグループを展開する', () => {
  assert.deepEqual(searchCardPattern('^A{2}3$').matches.map(item => item.value), ['113'])
  assert.deepEqual(searchCardPattern('^A{0,2}3$').matches.map(item => item.value), ['113', '13', '3'])
  assert.equal(searchCardPattern('^(TJ){2,4}$').checked, 3)
  assert.equal(searchCardPattern('^A{0}3$').checked, 1)
  assert.equal(searchCardPattern('^A{5}$').checked, 0)
  assert.deepEqual(searchCardPattern('^(A{0}){52}3$').matches.map(item => item.value), ['3'])
  assert.equal(searchCardPattern('^(A?){52}3$', () => {}, 0).reason, 'timeout')
})

test('不正な式を拒否し、時間切れや件数超過を完了と区別する', () => {
  for (const input of ['[A-K]', '[2-3-4]', '(?=A)', '[', 'A'.repeat(201),
    'A{1,}', 'A{53}', 'A{2,53}', 'A{3,2}', 'A{}', 'A{1}+', 'A{1', 'A{1.5}']) {
    assert.throws(() => searchCardPattern(input))
  }
  assert.equal(searchCardPattern('^[2-9]+$', () => {}, 0).reason, 'timeout')
  const limited = searchCardPattern('^[2-9][2-9][2-9][2-9][2-9]$')
  assert.equal(limited.reason, 'limit')
  assert.equal(limited.matches.length, 100)
})
