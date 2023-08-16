import { Qk, QkCardSequence } from "./qk.js"
import { factor, checkPrime, checkPrimeBigInt } from "./util.js"

console.log("Hello, world!")

const boxHistoryElm = document.querySelector(".box-history")

const cmdBoxElm = document.querySelector("[data-box-command]")

const cmdInputElm = cmdBoxElm.querySelector("input")

const outputTmpl = document.querySelector("#output")

const deckValArr = (new Array(13 * 4)).fill(0).map((_, i) => Math.floor(i / 4) + 1).concat([-1, -1])

deckValArr.sort(_ => Math.random() - .5)

const outputElmClone = outputTmpl.content.firstElementChild.cloneNode(true)

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
        } else if (inputNum === 1) {
            attackHtml += ` <i class="bi-x-circle-fill"></i> <small>${inputNum} is not prime number</small>`

            isValid = false
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