import { Qk, QkCardSequence } from "./qk.js"
import { factor, checkPrime, checkPrimeBigInt } from "./util.js"

console.log("Hello, world!")

const canSubmit = { value: false }

const actionTarget = new EventTarget()

const consoleElm = document.querySelector(".console")

const cmdBoxElm = document.querySelector("[data-box-command]")

const cmdInputElm = cmdBoxElm.querySelector("input")

const stateStageDefault = {
    idx: 0,
}

const stateGameDefault = {
    idx: 0,
    deck: [],
    playerArr: ["A", "B", "you", "C"],
    handArr: [],
    rev: false,
}

const stateSetDefault = {
    idx: 0,
    cardLen: 0,
    prevPassCnt: 0,
}

const stateTurnDefault = {
    idx: 0,
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
    const { game, set, turn } = state

    const { deck, playerArr } = game
    const { playerIdx } = turn

    const hand = game.handArr[playerIdx]

    if (inputStr == null) {
    } else if (inputStr === "") {
        handArr[playerIdx]

        return
    } else if (inputStr.toLowerCase() === "pass" || inputStr.toLowerCase() === "p") {
        log.popoutBq()

        if (turn.draw) {
            log.editCode(`${playerArr[playerIdx]}: draw(${Qk.fromValToChar(turn.draw)}), pass => ${Qk.fromArrayToString(hand)}`)
        } else {
            log.editCode(`${playerArr[playerIdx]}: pass => ${Qk.fromArrayToString(hand)}`)
        }

        set.prevPassCnt++

        cmdInputElm.value = ""

        return inputStr
    } else if (inputStr.toLowerCase() === "draw" || inputStr.toLowerCase() === "d") {
        cmdInputElm.value = ""

        if (turn.draw) {
            return
        }

        log.popoutBq()

        turn.draw = deck.shift()

        hand.push(turn.draw)

        Qk.sortArray(hand)

        log.editCode(`${playerArr[playerIdx]}: draw(${Qk.fromValToChar(turn.draw)}) => ${Qk.fromArrayToString(hand)}`)

        cmdInputElm.value = ""

        log.bq("あなたの番です   p: pass")
    } else {
        const inputQkSeq = new QkCardSequence(inputStr)

        const inputQkStr = inputQkSeq.toQkString()

        const inputCardLen = inputQkSeq.getCardLength()

        const inputQkArr = inputQkSeq.toQkArray()

        const handTmp = [...hand]

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

        const drawStr = turn.draw ? `draw(${Qk.fromValToChar(turn.draw)}) ` : ""
        let prependHtml = `${playerArr[playerIdx]}: ${drawStr}${inputQkStr}`
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
                const spliceArr = hand.splice(idx, 1)

                if (spliceArr && spliceArr.length === 1) {
                    deck.push(spliceArr[0])
                }
            })
        } else {
            for (let i = 0; i < inputCardLen; i++) {
                const val = deck.shift()

                if (val) {
                    hand.push(val)
                }
            }
        }

        log.editCode(`${prependHtml} => ${Qk.fromArrayToString(hand)} ${attackHtml}`)

        Qk.sortArray(hand)

        if (hand.length === 0) {
            log.bq("You win!")
        }

        set.prevPassCnt = 0

        log.popoutBq()

        cmdInputElm.value = ""
    
        return inputStr
    }
}

const startStage = _ => {
    state.stage = { ...stateStageDefault, idx: (state.game?.idx || 0 + 1) }

    const { stage } = state

    const { idx } = stage

    log.h2("Prime QK Stage: " + idx)

    startGame()
}

const startGame = _ => {
    state.game = { ...stateGameDefault, idx: (state.game?.idx || 0 + 1) }

    state.game.deck = (new Array(13 * 4)).fill(0).map((_, i) => Math.floor(i / 4) + 1).concat([-1, -1])

    const { game } = state

    const { idx, deck, playerArr, handArr } = game

    deck.sort(_ => Math.random() - 0.5)

    log.h3("game: " + idx)

    log.code(`deck: ${Qk.fromArrayToString(deck)}`)

    playerArr.forEach((name, i) => {
        handArr[i] = Qk.sortArray(deck.splice(0, 11))

        log.code(`${name}: ${Qk.fromArrayToString(handArr[i])}`)
    })

    startSet()
}

const startSet = async _ => {
    log.h4("new set")

    state.set = { ...stateSetDefault }

    const { game, set } = state

    const { playerArr } = game

    for (let i = 0; i < 99999; i++) {
        if (set.prevPassCnt >= playerArr.length) {
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

    const { game, turn } = state

    log.code(`${game.playerArr[idx]}: ${Qk.fromArrayToString(game.handArr[idx])}`)

    const name = game.playerArr[idx]

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

startStage()

console.log("Thanks, world!")
