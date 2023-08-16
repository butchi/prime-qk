import { factor, checkPrime, checkPrimeBigInt } from "./util.js"

console.log("Hello, world!")

const boxHistoryElm = document.querySelector(".box-history")

const cmdBoxElm = document.querySelector("[data-box-command]")

const cmdInputElm = cmdBoxElm.querySelector("input")

const outputTmpl = document.querySelector("#output")

const deckValArr = (new Array(13 * 4)).fill(0).map((_, i) => Math.floor(i / 4) + 1).concat([-1, -1])

deckValArr.sort(_ => Math.random() - .5)

const outputElmClone = outputTmpl.content.firstElementChild.cloneNode(true)

class QkCardSequence {
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

            this.val = str
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

const Qk = {
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

const log = {
    info: html => {
        const elmClone = outputTmpl.content.firstElementChild.cloneNode(true)

        elmClone.querySelector("[data-slot]").innerHTML = html

        boxHistoryElm.appendChild(elmClone)
    }
}

const handValArr = Qk.sortArray(deckValArr.splice(0, 11))

outputElmClone.querySelector("[data-slot]").innerHTML = `<i class="bi-cash-stack"></i> ${Qk.fromArrayToString(handValArr)}`

boxHistoryElm.appendChild(outputElmClone)

cmdBoxElm.addEventListener("submit", evt => {
    evt.preventDefault()

    const inputStr = cmdInputElm.value

    if (inputStr == null) {
        return
    } else if (inputStr === "") {
        return
    } else if (inputStr.toLowerCase() === "d") {
        cmdInputElm.value = ""

        handValArr.push(deckValArr.shift())

        Qk.sortArray(handValArr)
    } else {
        const inputQkSeq = new QkCardSequence(inputStr)

        const inputQkStr = inputQkSeq.toQkString()

        const inputCardLen = inputQkSeq.getCardLength()

        const inputQkArr = inputQkSeq.toQkArray()

        const handTmp = [...handValArr]

        const spliceIndexArr = inputQkArr.map(cardVal => {
            const index = handTmp.findIndex(handVal => Qk.valueOf(handVal) === Qk.valueOf(cardVal))

            if (index >= 0) {
                handTmp.splice(index, 1)

                return index
            } else {
                return NaN
            }
        })

        if (spliceIndexArr.includes(NaN)) {
            return
        }

        const inputNum = inputQkSeq.toQkNumber()
        const inputBigInt = inputQkSeq.toQkBigInt()

        const factorArr = factor(inputNum)

        const isPrime = checkPrime(inputNum) || checkPrimeBigInt(inputBigInt)

        let attackHtml = `<i class="bi-arrow-bar-up"></i> ${inputQkStr}`

        let isValid

        if (inputNum == null) {
        } else if (inputNum === Infinity) {
            attackHtml += ' <i class="bi-check"></i> <span class="badge bg-secondary">Joker</span>'

            isValid = true
        } else if (inputNum === 57) {
            attackHtml += ' <i class="bi-check"></i> <span class="badge bg-secondary">GC</span>'

            isValid = true
        } else if (isFinite(inputNum)) {
            if (isPrime) {
                attackHtml += ` <i class="bi-check-circle-fill"></i> <small>${inputNum} is prime number</small>`

                isValid = true
            } else {
                attackHtml += ` <i class="bi-x-circle-fill"></i> <small>${inputNum} = ${factorArr.join(" × ")}</small>`

                const checkArr = [2, 3, 5, 11, 1001]

                checkArr.forEach(num => {
                    if (inputNum % num === 0) {
                        attackHtml += ` <span class="badge bg-secondary">${num}n</span>`
                    }
                })

                isValid = false
            }
        } else if (!isPrime) {
            attackHtml += ` <i class="bi-x-circle-fill"></i> <small>${inputBigInt} is not prime number</small>`

            isValid = false
        } else {
            return
        }

        if (isValid) {
            spliceIndexArr.forEach(idx => {
                const spliceArr = handValArr.splice(idx, 1)

                if (spliceArr && spliceArr.length === 1) {
                    deckValArr.push(spliceArr[0])
                }
            })
        } else {
            for (let i = 0; i < inputCardLen; i++) {
                const val = deckValArr.shift()

                if (val) {
                    handValArr.push(val)
                }
            }
        }

        log.info(attackHtml)
    }

    Qk.sortArray(handValArr)

    if (handValArr.length === 0) {
        log.info("Clear!")
    } else {
        log.info(`<i class="bi-cash-stack"></i> ${Qk.fromArrayToString(handValArr)}`)
    }

    cmdInputElm.value = ""
})

console.log("Thanks, world!")