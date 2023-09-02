import { Qk, QkCardSequence } from "./qk.js"
import { factor, checkPrime, checkPrimeBigInt } from "./util.js"

console.log("Hello, world!")

const canSubmit = { value: false }

const actionTarget = new EventTarget()

const playerArr = ["A", "B", "you", "C"]

const consoleElm = document.querySelector(".console")

const cmdBoxElm = document.querySelector("[data-box-command]")

const cmdInputElm = cmdBoxElm.querySelector("input")

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

const log = {
    h: (html, depth) => {
        const preStr = "######".slice(0, depth)

        const elm = document.createElement("h" + depth)

        elm.innerHTML = preStr + " " + html

        consoleElm.appendChild(elm)
    },

    h1: html => log.h(html, 1),
    h2: html => log.h(html, 2),
    h3: html => log.h(html, 3),
    h4: html => log.h(html, 4),
    h5: html => log.h(html, 5),
    h6: html => log.h(html, 6),

    p: html => {
        const elm = document.createElement("p")

        elm.innerHTML = html

        consoleElm.appendChild(elm)
    },

    bq: html => {
        const elm = document.createElement("blockquote")

        elm.innerHTML = "> " + html

        consoleElm.appendChild(elm)
    },

    popoutBq: _ => {
        const elm = consoleElm.querySelector("blockquote:last-child")

        if (elm) {
            consoleElm.removeChild(elm)
        }
    },

    code: html => {
        const elm = document.createElement("pre")
        const codeElm = document.createElement("code")

        codeElm.innerHTML = "    " + html

        elm.appendChild(codeElm)

        consoleElm.appendChild(elm)
    },

    editCode: html => {
        const elm = consoleElm.querySelector("pre:last-of-type code")

        elm.innerHTML = "    " + html
    }
}

const execCommand = (inputStr = "") => {
    const currentHand = handArr[state.turn.playerIdx]

    if (inputStr == null) {
    } else if (inputStr === "") {
        handArr[state.turn.playerIdx]

        return
    } else if (inputStr.toLowerCase() === "pass" || inputStr.toLowerCase() === "p") {
        log.popoutBq()

        log.editCode(`${playerArr[state.turn.playerIdx]}: pass => ${Qk.fromArrayToString(currentHand)}`)

        state.set.prevPassCnt++

        cmdInputElm.value = ""

        return inputStr
    } else if (inputStr.toLowerCase() === "draw" || inputStr.toLowerCase() === "d") {
        log.popoutBq()

        cmdInputElm.value = ""

        if (state.turn.draw) {
            return
        }

        state.turn.draw = deck.shift()

        currentHand.push(state.turn.draw)

        Qk.sortArray(currentHand)

        log.editCode(`${playerArr[state.turn.playerIdx]}: draw(${Qk.fromValToChar(state.turn.draw)}) => ${Qk.fromArrayToString(currentHand)}`)

        cmdInputElm.value = ""

        log.bq("あなたの番です   p: pass")
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
    let prependHtml = `${playerArr[state.turn.playerIdx]}: ${drawStr}${inputQkStr}`
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

    log.editCode(`${prependHtml} => ${Qk.fromArrayToString(currentHand)} ${attackHtml}`)

    Qk.sortArray(currentHand)

    if (currentHand.length === 0) {
        log.bq("You win!")
    }

    state.set.prevPassCnt = 0

    cmdInputElm.value = ""

    return inputStr
}

const startGame = _ => {
    log.h2(`Prime QK at ${new Date().toISOString()}`)

    deck.sort(_ => Math.random() - .5)

    log.h3("new game")

    playerArr.forEach((name, i) => {
        handArr[i] = Qk.sortArray(deck.splice(0, 11))

        log.code(`${name}: ${Qk.fromArrayToString(handArr[i])}`)
    })

    startSet()
}

const startSet = async _ => {
    log.h4("new set")

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

        log.bq("あなたの番です   d: draw   p: pass")

        cmdStr.value = await youPromise()

        await new Promise(resolve => setTimeout(resolve, 1500))
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
