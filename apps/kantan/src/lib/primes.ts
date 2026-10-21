export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false

  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false
  }

  return true
}

export function isPrimeBigInt(n: bigint): boolean {
  if (n < 2n) return false
  for (const prime of smallPrimes) {
    if (n === prime) return true
    if (n % prime === 0n) return false
  }

  let d = n - 1n
  let s = 0
  while (d % 2n === 0n) {
    d /= 2n
    s++
  }

  for (const base of millerRabinBases) {
    if (base >= n) continue
    if (!passesMillerRabin(n, base, d, s)) return false
  }

  return true
}

export function isCompositeBigInt(n: bigint): boolean {
  return n > 1n && !isPrimeBigInt(n)
}

export interface PrimeFactor {
  prime: bigint
  exponent: number
}

const smallPrimes = [
  2n,
  3n,
  5n,
  7n,
  11n,
  13n,
  17n,
  19n,
  23n,
  29n,
  31n,
  37n,
]

const millerRabinBases = [
  2n,
  3n,
  5n,
  7n,
  11n,
  13n,
  17n,
  19n,
  23n,
  29n,
  31n,
  37n,
]

function passesMillerRabin(
  n: bigint,
  base: bigint,
  oddPart: bigint,
  powersOfTwo: number,
): boolean {
  let x = modPow(base, oddPart, n)
  if (x === 1n || x === n - 1n) return true

  for (let r = 1; r < powersOfTwo; r++) {
    x = (x * x) % n
    if (x === n - 1n) return true
  }

  return false
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n
  let b = base % modulus
  let e = exponent

  while (e > 0n) {
    if (e % 2n === 1n) {
      result = (result * b) % modulus
    }
    b = (b * b) % modulus
    e /= 2n
  }

  return result
}

export function factorizeBigInt(n: bigint): PrimeFactor[] | null {
  if (n < 2n) return null

  const factors: PrimeFactor[] = []
  let remaining = n
  let exponent = 0

  while (remaining % 2n === 0n) {
    remaining /= 2n
    exponent++
  }
  if (exponent > 0) factors.push({ prime: 2n, exponent })

  for (let divisor = 3n; divisor * divisor <= remaining; divisor += 2n) {
    exponent = 0
    while (remaining % divisor === 0n) {
      remaining /= divisor
      exponent++
    }
    if (exponent > 0) factors.push({ prime: divisor, exponent })
  }

  if (remaining > 1n) factors.push({ prime: remaining, exponent: 1 })

  return factors
}
