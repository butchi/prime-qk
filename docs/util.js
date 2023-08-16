// https://javascript.plainenglish.io/how-to-find-very-large-prime-numbers-in-javascript-5a563ba2f3bb

const power = (x, y, p) => {
    let res = 1n

    x = x % p
    while (y > 0n) {
        if (y & 1n)
            res = (res * x) % p

        y = y / 2n
        x = (x * x) % p
    }

    return res
}

const miillerTest = (d, n) => {
    const r = BigInt(Math.floor(Math.random() * 100_000))

    const y = r * (n - 2n) / 100_000n
    let a = 2n + y % (n - 4n)

    let x = power(a, d, n)

    if (x == 1n || x == n - 1n)
        return true

    while (d != n - 1n) {
        x = (x * x) % n
        d *= 2n

        if (x == 1n)
            return false
        if (x == n - 1n)
            return true
    }

    return false
}

export const checkPrimeBigInt = (n, k = 45) => {
    if (n <= 1n || n == 4n) return false
    if (n <= 3n) return true

    let d = n - 1n
    while (d % 2n == 0n)
        d /= 2n

    for (let i = 0; i < k; i++)
        if (!miillerTest(d, n))
            return false

    return true
}



// http://blog.livedoor.jp/dankogai/archives/51854062.html
const primeBit16Arr = (sqrtmax => {
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

export const factor = n => {
    if (n < 2) return undefined

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

export const checkPrime = n => {
    if (n == null) {
    } else if (n < 2) {
        return false
    }

    if (isFinite(n)) {
        return factor(n).length === 1
    }
}
