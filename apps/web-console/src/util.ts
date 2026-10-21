// https://github.com/butchi/prime-qk/blob/develop/docs/util.js
// https://javascript.plainenglish.io/how-to-find-very-large-prime-numbers-in-javascript-5a563ba2f3bb

const power = (x: bigint, y: bigint, p: bigint) => {
  let res = 1n

  x = x % p
  while (y > 0n) {
    if (y & 1n) res = (res * x) % p

    y = y / 2n
    x = (x * x) % p
  }

  return res
}

const miillerTest = (d: bigint, n: bigint) => {
  const r = BigInt(Math.floor(Math.random() * 100_000))

  const y = (r * (n - 2n)) / 100_000n
  let a = 2n + (y % (n - 4n))

  let x = power(a, d, n)

  if (x == 1n || x == n - 1n) return true

  while (d != n - 1n) {
    x = (x * x) % n
    d *= 2n

    if (x == 1n) return false
    if (x == n - 1n) return true
  }

  return false
}

export const checkPrimeBigInt = (n: bigint, k = 45) => {
  if (n <= 1n || n == 4n) return false
  if (n <= 3n) return true

  let d = n - 1n
  while (d % 2n == 0n) d /= 2n

  for (let i = 0; i < k; i++) if (!miillerTest(d, n)) return false

  return true
}

// http://blog.livedoor.jp/dankogai/archives/51854062.html
const primeBit16Arr = ((sqrtmax: number) => {
  const ret = [2]

  loop: for (let n = 3; n <= sqrtmax; n += 2) {
    for (let i = 0; i < ret.length; i++) {
      const p = ret[i]

      if (n % p === 0) continue loop

      if (p * p > n) break
    }
    ret.push(n)
  }

  return ret
})(0xffff)

export const factorBigInt = (n: bigint): bigint[] => {
  if (n < 2n) {
    return []
  }

  const ret: bigint[] = []

  for (let i = 0, l = primeBit16Arr.length; i < l; i++) {
    const p = BigInt(primeBit16Arr[i])

    while (n % p === 0n) {
      ret.push(p)
      n /= p
    }

    if (n === 1n) return ret
  }

  if (n !== 1n) ret.push(n)

  return ret
}

export const factorN = (n: number): number[] => {
  if (n < 2) {
    return []
  }

  const ret = []

  for (let i = 0, l = primeBit16Arr.length; i < l; i++) {
    const p = primeBit16Arr[i]

    while (n % p === 0) {
      ret.push(p)
      n /= p
    }

    if (n === 1) return ret
  }

  if (n !== 1) ret.push(n)

  return ret
}

export const factor = (val: number | bigint | null): bigint[] => {
  if (val === null) {
  } else if (typeof val === 'number') {
    return factorN(val).map((num: number) => BigInt(num))
  } else if (typeof val === 'bigint') {
    return factorBigInt(val)
  }

  return []
}

export const checkPrimeN = (n: number) => {
  if (n == null) {
  } else if (n < 2) {
    return false
  }

  if (isFinite(n)) {
    return factor(n)?.length === 1
  }
}

export const checkPrime = (val: number | bigint | null) => {
  if (val === null) {
  } else if (typeof val === 'number') {
    return checkPrimeN(val)
  } else if (typeof val === 'bigint') {
    return checkPrimeBigInt(val)
  }

  return false
}

// TS移植後の動作未チェック
export const primeListDigit3 = new Array(999)
  .fill(0)
  .map((_, i) => i)
  .filter((n) => checkPrime(n))

const tjqk: number[] = new Array(4).fill('').map((_, i) => Number('1' + i))

const tjqkTuples = (arr: number[], i: number): number[] => {
  if (i === 0) {
    return arr
  } else {
    return tjqkTuples(
      arr.flatMap((val: number) => tjqk.map((v: number) => Number(val.toString() + v.toString()))),
      i - 1
    )
  }
}

// TS移植後の動作未チェック
export const primeListLen2Digit4 = tjqkTuples(tjqk, 2)
  .filter((n: number) => checkPrime(n))
export const primeListLen2Digit6 = tjqkTuples(tjqk, 3)
  .filter((n: number) => checkPrime(n))
export const primeListLen2Digit8 = tjqkTuples(tjqk, 4)
  .filter((n: number) => checkPrime(n))
