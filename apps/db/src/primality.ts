export type PrimalityResult =
  | { kind: 'neither' }
  | { kind: 'composite'; divisor?: string }
  | { kind: 'prime'; method: 'trial-division' | 'miller-rabin-64' }
  | { kind: 'probable-prime'; method: 'miller-rabin-fixed'; bases: readonly string[] }

export function parseInput(input: string): bigint {
  const text = input.trim()
  if (!/^[+-]?\d+$/.test(text)) throw new Error('半角数字の十進整数を入力してください（先頭の +・- は使用できます）。')
  if (text.replace(/^[+-]/, '').length > 200) throw new Error('入力は符号を除いて200桁以内にしてください。')
  return BigInt(text)
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n
  while (exponent > 0n) {
    if (exponent % 2n) result = result * base % modulus
    base = base * base % modulus
    exponent /= 2n
  }
  return result
}

export function checkPrimality(value: bigint): PrimalityResult {
  if (value < 2n) return { kind: 'neither' }
  const smallPrimes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]
  for (const prime of smallPrimes) {
    if (value === prime) return { kind: 'prime', method: 'trial-division' }
    if (value % prime === 0n) return { kind: 'composite', divisor: String(prime) }
  }
  const deterministic = value < 2n ** 64n
  // この7底は n < 2^64 の範囲で確定判定できる。範囲外には保証を適用しない。
  const bases = deterministic
    ? [2n, 325n, 9375n, 28178n, 450775n, 9780504n, 1795265022n]
    : smallPrimes
  let oddPart = value - 1n
  let powersOfTwo = 0
  while (oddPart % 2n === 0n) {
    oddPart /= 2n
    powersOfTwo++
  }
  for (const base of bases) {
    const reduced = base % value
    if (reduced === 0n) continue
    let x = modPow(reduced, oddPart, value)
    if (x === 1n || x === value - 1n) continue
    let passed = false
    for (let round = 1; round < powersOfTwo; round++) {
      x = x * x % value
      if (x === value - 1n) {
        passed = true
        break
      }
    }
    if (!passed) return { kind: 'composite' }
  }
  return deterministic
    ? { kind: 'prime', method: 'miller-rabin-64' }
    : { kind: 'probable-prime', method: 'miller-rabin-fixed', bases: bases.map(String) }
}
