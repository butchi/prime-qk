import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkPrimality, parseInput } from '../src/primality.ts'

test('十進整数入力の検証と正規化', () => {
  assert.equal(parseInput(' +001213 '), 1213n)
  assert.equal(parseInput('-123'), -123n)
  for (const input of ['', '1.5', '1e3', 'QK', '１２', '1 2', '1'.repeat(201)]) {
    assert.throws(() => parseInput(input))
  }
  assert.equal(parseInput('1'.repeat(200)).toString().length, 200)
})

test('小さい範囲を試し割りと独立照合する', () => {
  for (let value = -2; value <= 10000; value++) {
    let prime = value >= 2
    for (let divisor = 2; divisor * divisor <= value; divisor++) {
      if (value % divisor === 0) { prime = false; break }
    }
    assert.equal(checkPrimality(BigInt(value)).kind, value < 2 ? 'neither' : prime ? 'prime' : 'composite', String(value))
  }
})

test('擬素数と64ビット境界を検証する', () => {
  for (const value of [341n, 561n, 3215031751n, 341550071728321n, 3825123056546413051n, 2n ** 64n - 1n, 2n ** 64n]) {
    assert.equal(checkPrimality(value).kind, 'composite', String(value))
  }
  assert.equal(checkPrimality(18446744073709551557n).kind, 'prime')
  assert.equal(checkPrimality(2n ** 127n - 1n).kind, 'probable-prime')
  assert.equal(checkPrimality((2n ** 127n - 1n) ** 2n).kind, 'composite')
})
