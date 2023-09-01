import { Qk, QkCardSequence } from "./qk.js"
import { factor, checkPrime, checkPrimeBigInt } from "./util.js"

console.log("Hello, world!")

const log = {
    info: html => {
        const elmClone = outputTmpl.content.firstElementChild.cloneNode(true)

        elmClone.querySelector("[data-slot]").innerHTML = html

        boxHistoryElm.appendChild(elmClone)
    },

    code: html => {
        const elmClone = outputTmpl.content.firstElementChild.cloneNode(true)

        elmClone.querySelector("[data-slot]").innerHTML = `<pre><code>    ${html}</code></pre>`

        boxHistoryElm.appendChild(elmClone)
    },

    codeTail: html => {
        const elm = boxHistoryElm.querySelector("[data-log]:last-of-type")
        const codeElm = elm.querySelector("code")

        if (codeElm) {
            codeElm.innerHTML = html
        }
    },
}

const canSubmit = { value: false }

const actionTarget = new EventTarget()

const playerArr = ["A", "B", "you", "C"]

const boxHistoryElm = document.querySelector(".box-history")

const cmdBoxElm = document.querySelector("[data-box-command]")

const cmdInputElm = cmdBoxElm.querySelector("input")

const outputTmpl = document.querySelector("#output")

const deck = (new Array(13 * 4)).fill(0).map((_, i) => Math.floor(i / 4) + 1).concat([-1, -1])

const handArr = []

const stateGameObj = {
    rev: false,
}

const stateSetDefault = {
    cardLen: 0,
    prevPassCnt: 0,
}

const stateTurnDefault = {
    playerIdx: null,
    draw: null,
    pass: false,
}

const state = {
    game: {},
    set: {},
    turn: {},
}

const execCommand = (inputStr = "") => {
    const currentHand = handArr[state.turn.playerIdx]

    if (inputStr == null) {
    } else if (inputStr === "") {
        handArr[state.turn.playerIdx]

        return
    } else if (inputStr.toLowerCase() === "pass" || inputStr.toLowerCase() === "p") {
        log.codeTail(`    ${playerArr[state.turn.playerIdx]}: pass => ${Qk.fromArrayToString(currentHand)}`)

        state.set.prevPassCnt++

        cmdInputElm.value = ""

        return inputStr
    } else if (inputStr.toLowerCase() === "draw" || inputStr.toLowerCase() === "d") {
        cmdInputElm.value = ""

        if (state.turn.draw) {
            return
        }

        state.turn.draw = deck.shift()

        currentHand.push(state.turn.draw)

        Qk.sortArray(currentHand)

        log.codeTail(`    ${playerArr[state.turn.playerIdx]}: draw(${Qk.fromValToChar(state.turn.draw)}) => ${Qk.fromArrayToString(currentHand)}`)

        cmdInputElm.value = ""
    }

    const inputQkSeq = new QkCardSequence(inputStr)

    const inputQkStr = inputQkSeq.toQkString()

    const inputCardLen = inputQkSeq.getCardLength()

    const inputQkArr = inputQkSeq.toQkArray()

    const handTmp = [...currentHand]

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

    const drawStr = state.turn.draw ? `draw(${Qk.fromValToChar(state.turn.draw)}) ` : ""
    let prependHtml = `    ${playerArr[state.turn.playerIdx]}: ${drawStr}${inputQkStr}`
    let attackHtml = ""

    let isValid

    if (inputNum == null) {
    } else if (inputNum === Infinity) {
        attackHtml += ` <i class="bi-check"></i> <span class="badge bg-secondary">Joker</span>`

        isValid = true
    } else if (inputNum === 57) {
        attackHtml += ` <i class="bi-check"></i> <span class="badge bg-secondary">GC</span>`

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
            const spliceArr = currentHand.splice(idx, 1)

            if (spliceArr && spliceArr.length === 1) {
                deck.push(spliceArr[0])
            }
        })
    } else {
        for (let i = 0; i < inputCardLen; i++) {
            const val = deck.shift()

            if (val) {
                currentHand.push(val)
            }
        }
    }

    log.codeTail(`${prependHtml} => ${Qk.fromArrayToString(currentHand)} ${attackHtml}`)

    Qk.sortArray(currentHand)

    if (currentHand.length === 0) {
        log.info("> You win!")
    } else {
        // log.info(`<i class="bi-cash-stack"></i> ${Qk.fromArrayToString(currentHand)}`)
    }

    state.set.prevPassCnt = 0

    cmdInputElm.value = ""

    return inputStr
}

const startGame = _ => {
    log.info(`<h2>## Prime QK at ${new Date().toISOString()}</h2>`)

    deck.sort(_ => Math.random() - .5)

    log.info("<h3>### new game</h3>")

    playerArr.forEach((name, i) => {
        handArr[i] = Qk.sortArray(deck.splice(0, 11))

        log.code(`${name}: ${Qk.fromArrayToString(handArr[i])}`)
    })

    startSet()
}

const startSet = async _ => {
    log.info("<h4>#### new set</h4>")

    state.set = { ...stateSetDefault }

    for (let i = 0; i < 99999; i++) {
        if (state.set.prevPassCnt >= playerArr.length) {
            startSet()

            break
        }

        for (const [idx, _name] of Object.entries(playerArr)) {
            await startTurn(idx)
        }
    }
}

const startTurn = async idx => {
    const cmdStr = { value: "" }

    state.turn = { ...stateTurnDefault, playerIdx: idx }

    log.code(`${playerArr[idx]}: ${Qk.fromArrayToString(handArr[idx])}`)

    const name = playerArr[idx]

    if (name === "you") {
        canSubmit.value = true

        cmdStr.value = await youPromise()
    } else {
        canSubmit.value = false

        await new Promise(resolve => setTimeout(resolve, 1500))

        cmdStr.value = execCommand("p")
    }

    if (!(startSet.cardLen > 0)) {
    }
}

const youPromise = _ => new Promise((resolve, _reject) => {
    actionTarget.addEventListener("action", evt => {
        console.log(evt.target)

        resolve()
    })
})

const submitHandler = async evt => {
    evt.preventDefault()

    if (!canSubmit.value) {
        return
    }

    const inputStr = cmdInputElm.value

    const actionStr = execCommand(inputStr)

    if (actionStr) {
        actionTarget.dispatchEvent(new Event("action"))
    }
}

cmdBoxElm.addEventListener("submit", submitHandler)

startGame()

console.log("Thanks, world!")
