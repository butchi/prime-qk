import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isCompositeBigInt, isPrime, isPrimeBigInt } from '../src/lib/primes'

describe('isPrime', () => {
  it('rejects non-prime values', () => {
    for (const value of [-1, 0, 1, 4, 9, 21, 57, 1729, 2.5]) {
      assert.equal(isPrime(value), false, `${value} should not be prime`)
    }
  })

  it('accepts prime values', () => {
    for (const value of [2, 3, 5, 11, 13, 101, 11113]) {
      assert.equal(isPrime(value), true, `${value} should be prime`)
    }
  })

  it('checks bigint prime values', () => {
    assert.equal(isPrimeBigInt(2n), true)
    assert.equal(isPrimeBigInt(11113n), true)
    assert.equal(isPrimeBigInt(2305843009213693951n), true)
    assert.equal(isPrimeBigInt(1n), false)
    assert.equal(isPrimeBigInt(57n), false)
    assert.equal(isPrimeBigInt(1729n), false)
  })

  it('checks bigint composite values', () => {
    const largeComposite = 9999999967n * 9999999973n

    assert.equal(isCompositeBigInt(4n), true)
    assert.equal(isCompositeBigInt(57n), true)
    assert.equal(isCompositeBigInt(1729n), true)
    assert.equal(isCompositeBigInt(largeComposite), true)
    assert.equal(isCompositeBigInt(1n), false)
    assert.equal(isCompositeBigInt(13n), false)
  })
})
