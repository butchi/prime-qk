export class QkCardSequence {
    constructor(arg) {
        if (arg == null) {
        } else if (typeof arg === "number") {
            const num = arg

            if (num === Infinity) {
                this.val = "X"
            } else if (isFinite(num)) {
                this.val = num.toString()
            } else {
                this.val = ""
            }
        } else if (typeof arg === "bigint") {
            const bigInt = arg

            this.val = bigInt.toString()
        } else if (typeof arg === "string") {
            const str = arg

            this.val = str.toUpperCase()
        } else if (typeof arg === "object") {
            if (arg instanceof Array) {
                const arr = arg

                this.val = Qk.fromArrayToString(arr, true)
            }
        }
    }

    toQkNumber(xArr) {
        const str = this.val

        if (str.toUpperCase() === "X") {
            return Infinity
        }

        if (str.toUpperCase() === "X") {
            return Infinity
        }

        let [cStr, xStr] = str.toUpperCase().split("|")

        if (xStr) {
            xStr.split("").forEach(xVal => {
                cStr = cStr.replace("X", xVal)
            })
        }

        const ret = parseInt(cStr.toUpperCase().replaceAll("A", "1").replaceAll("T", "10").replaceAll("J", "11").replaceAll("Q", "12").replaceAll("K", "13").replaceAll("X", "1"))

        if (ret > Number.MAX_SAFE_INTEGER) {
            return NaN
        }

        return ret
    }

    toQkString(xArr) {
        return this.val
    }

    toQkArray() {
        return Qk.fromStringToArray(this.val)
    }

    toQkBigInt() {
        const str = this.val

        if (str.toUpperCase() === "X") {
            return Infinity
        }

        let [cStr, xStr] = str.toUpperCase().split("|")

        if (xStr) {
            xStr.split("").forEach(xVal => {
                cStr = cStr.replace("X", xVal)
            })
        }

        const ret = BigInt(cStr.toUpperCase().replaceAll("A", "1").replaceAll("T", "10").replaceAll("J", "11").replaceAll("Q", "12").replaceAll("K", "13").replaceAll("X", "1"))

        return ret
    }

    getCardLength() {
        return Qk.fromStringToArray(this.val).length
    }

    toString() {
        return this.val
    }

    valueOf() {
        return this.toQkNumber()
    }
}

export const Qk = {
    valueOf: num => {
        if (num < 0) {
            return Infinity
        }

        return num
    },
    fromCharToVal: char => {
        const ret = {
            J: 11,
            Q: 12,
            K: 13,
            T: 10,
            A: 1,
            X: -1,
        }[char.toUpperCase()] || parseInt(char)

        return ret
    },
    fromValToChar: val => {
        if (val < 0) {
            return "X"
        } else {
            return {
                "11": "J",
                "12": "Q",
                "13": "K",
                "10": "T",
                "1": "A",
            }[val] || val.toString()
        }
    },
    sortArray: arr => arr.sort((a, b) => Qk.valueOf(a) - Qk.valueOf(b)),
    fromStringToArray: (str) => {
        let [cStr, xStr] = str.toUpperCase().split("|")

        const arr = cStr.split("")

        const ret = arr.map(char => Qk.fromCharToVal(char))

        xStr && xStr.split("").forEach(xVal => {
            const idx = arr.findIndex(item => item === "X")

            ret[idx] = - Qk.fromCharToVal(xVal)
        })

        return ret
    },
    fromArrayToString: (arr, joker = false) => {
        if (joker) {
            const xArr = []

            const cardStr = arr.map(num => {
                if (num < 0) {
                    xArr.push(Qk.fromValToChar(Math.abs(num)))
                }

                return Qk.fromValToChar(num)
            }).join("")

            const ret = xArr.length > 0 ? `${cardStr}|${xArr.join("")}` : cardStr

            return ret
        } else {
            const cardStr = arr.map(num => {
                return Qk.fromValToChar(num)
            }).join("")

            const ret = cardStr

            return ret
        }
    }
}
