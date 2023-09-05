import { Qk, QkCardSequence } from "./qk.js"
import { factor, checkPrime, checkPrimeBigInt } from "./util.js"

console.log("Hello, world!")

const md = globalThis.markdownit({ html: true });

const canSubmit = { value: false }

const actionTarget = new EventTarget()

const scoreElm = document.querySelector(".prime-qk-score code")

const consoleElm = document.querySelector(".prime-qk-console")

const cmdBoxElm = document.querySelector(".box-command")

const cmdInputElm = cmdBoxElm.querySelector("input")

const scoreMdSeq = []

const stateTourneyDefault = {
    idx: 0,
}

const stateStageDefault = {
    idx: 0,
}

const stateGameDefault = {
    idx: 0,
    deck: [],
    winnerIdx: null,
    playerArr: ["A", "B", "you", "C"],
    handArr: [],
    rev: false,
}

const stateSetDefault = {
    idx: 0,
    cardLen: 0,
    playerIdx: null,
    masterIdx: null,
    cutFlag: false,
    passFlag: false,
}

const stateTurnDefault = {
    idx: 0,
    draw: null,
    pass: false,
}

const state = {
    tourney: {},
    stage: {},
    game: {},
    set: {},
    turn: {},
}

const initCardLen = 3

const log = {
    render: _ => {
        scoreElm.innerText = scoreMdSeq.join("\n")

        const scoreMd = scoreMdSeq.map(str => {
            return str
                .replaceAll("[x]", '<i class="bi-check-circle-fill"></i>')
                .replaceAll("[ ]", '<i class="bi-x-circle-fill"></i>')
        }).join("\n")

        consoleElm.innerHTML = md.render(scoreMd)

        // スクロールを最下部に移動
        document.querySelector(".container").scrollTop = consoleElm.scrollHeight;
    },

    h: (str, depth) => {
        const preStr = "######".slice(0, depth)

        const body = preStr + " " + str
        
        scoreMdSeq.push("")
        scoreMdSeq.push(body)

        log.render()

        console.log(str)

        return body
    },

    h1: str => log.h(str, 1),
    h2: str => log.h(str, 2),
    h3: str => log.h(str, 3),
    h4: str => log.h(str, 4),
    h5: str => log.h(str, 5),
    h6: str => log.h(str, 6),

    p: str => {
        const body = str

        scoreMdSeq.push("")
        scoreMdSeq.push(body)

        log.render()

        return body
    },

    bq: str => {
        const body = "> " + str

        scoreMdSeq.push("")
        scoreMdSeq.push(body)

        log.render()

        return body
    },

    code: str => {
        const body = "    " + str

        scoreMdSeq.push("")
        scoreMdSeq.push(body)

        log.render()

        return body
    },
}

const execCommand = (inputStr = "") => {
    const { game, set, turn } = state

    const { deck, playerArr } = game
    const { playerIdx } = set

    const hand = game.handArr[playerIdx]

    if (inputStr == null) {
    } else if (inputStr === "") {
        handArr[playerIdx]

        return
    } else if (inputStr.toLowerCase() === "pass" || inputStr.toLowerCase() === "p") {
        log.code(`${playerArr[playerIdx]}: pass => ${Qk.fromArrayToString(hand)}`)

        if (set.cardLen > 0) {
            set.passFlag = true
        }

        cmdInputElm.value = ""

        return inputStr
    } else if (inputStr.toLowerCase() === "draw" || inputStr.toLowerCase() === "d") {
        cmdInputElm.value = ""

        if (turn.draw) {
            return
        }

        turn.draw = deck.shift()

        hand.push(turn.draw)

        Qk.sortArray(hand)

        log.code(`${playerArr[playerIdx]}: draw(${Qk.fromValToChar(turn.draw)}) => ${Qk.fromArrayToString(hand)}`)

        cmdInputElm.value = ""

        log.bq("p: pass")
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
            attackHtml += `[x] **Joker**`

            set.cutFlag = true

            isValid = true
        } else if (inputNum === 57) {
            attackHtml += `[x] **GC**`

            set.cutFlag = true

            isValid = true
        } else if (inputNum === 1) {
            attackHtml += `[ ] ${inputNum} is not prime number`

            isValid = false
        } else if (isFinite(inputNum)) {
            if (isPrime) {
                attackHtml += `[x] ${inputNum} is prime number`

                isValid = true
            } else {
                attackHtml += `[ ] ${inputNum} = ${factorArr.join(" × ")}`

                const checkArr = [2, 3, 5, 11, 1001]

                checkArr.forEach(num => {
                    if (inputNum % num === 0) {
                        attackHtml += ` [*${num}n*]`
                    }
                })

                isValid = false
            }
        } else if (!isPrime) {
            attackHtml += `[ ] ${inputBigInt} is not prime number`

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

        if (hand.length === 0) {
            game.winnerIdx = playerIdx
        }

        if (game.winnerIdx == null) {
            log.code(`${prependHtml} => ${Qk.fromArrayToString(hand)}`)
        }

        log.bq(attackHtml)

        Qk.sortArray(hand)

        if (game.winnerIdx === playerIdx) {
            canSubmit.value = false

            log.bq(`${playerArr[playerIdx]} win!`)
            log.bq(`Press Enter to continue.`)
        }

        set.cardLen = inputCardLen
        set.masterIdx = playerIdx
        set.passFlag = false

        cmdInputElm.value = ""
    
        return inputStr
    }
}

const init = _ => {
    Object.assign(state, {
        tourney: { ...stateTourneyDefault },
        stage: { ...stateStageDefault},
        game: { ...stateGameDefault },
        set: { ...stateSetDefault },
        turn: { ...stateTurnDefault },
    })

    startTourney({ idx: 1 })
}

const startTourney = ({ idx = 0 }) => {
    state.tourney = { ...stateTourneyDefault, idx }

    const { tourney } = state

    log.h1("Prime QK Console: " + tourney.idx)

    log.p("Welcome to Prime QK Console")

    startStage({ idx: 1 })
}

const startStage = async ({ idx = 0 }) => {
    state.stage = { ...stateStageDefault, idx }

    const { tourney, stage } = state

    state.game.idx = 0

    log.h2("Stage: " + [tourney.idx, stage.idx].join("-"))

    await startGame({ idx: ++state.game.idx, initCardLen })
}

const startGame = async ({ idx = 0, initCardLen = 11 }) => {
    state.game = { ...stateGameDefault, idx }

    const { tourney, stage, game } = state

    game.deck = (new Array(13 * 4)).fill(0).map((_, i) => Math.floor(i / 4) + 1).concat([-1, -1])

    state.set.idx = 0

    const { deck, playerArr, handArr } = game

    deck.sort(_ => Math.random() - 0.5)

    log.h3("Game: " + [tourney.idx, stage.idx, game.idx].join("-"))

    log.code(`deck: ${Qk.fromArrayToString(deck)}`)

    playerArr.forEach((name, i) => {
        handArr[i] = Qk.sortArray(deck.splice(0, initCardLen))

        log.code(`${name}: ${Qk.fromArrayToString(handArr[i])}`)
    })

    for (let _i of (new Array(9999))) {
        if (game.winnerIdx == null) {
            await startSet({ idx: ++state.set.idx, playerIdx: state.set.masterIdx ?? state.set.playerIdx ?? 0 })
        }
    }
}

const startSet = async ({ idx = 0, playerIdx = null }) => {
    state.set = { ...stateSetDefault, idx, playerIdx }

    const { tourney, stage, game, set } = state

    state.turn.idx = 0

    log.h4("Set: " + [tourney.idx, stage.idx, game.idx, set.idx].join("-"))

    const { playerArr, handArr } = game

    for (let _i of (new Array(9999))) {
        if (game.winnerIdx != null) {
            return
        }

        if (state.turn.idx > 0) {
            set.playerIdx = (set.playerIdx + 1) % playerArr.length
        }

        if (set.passFlag && (set.playerIdx === set.masterIdx)) {
            return
        }

        await startTurn({ idx: ++state.turn.idx })
    }
}

const startTurn = async ({ idx = 0 }) => {
    state.turn = { ...stateTurnDefault, idx }

    const { tourney, stage, game, set, turn } = state

    const { playerArr } = game

    const { playerIdx } = set

    const name = playerArr[playerIdx]

    const cmdStr = { value: "" }

    log.h5("Turn: " + [tourney.idx, stage.idx, game.idx, set.idx, turn.idx].join("-"))

    log.bq(`Turn of ${name}`)

    log.code(`${playerArr[playerIdx]}: ${Qk.fromArrayToString(game.handArr[playerIdx])}`)

    if (name === "you") {
        canSubmit.value = true

        cmdInputElm.blur()
        cmdInputElm.focus()

        log.bq("It's your turn. d: draw p: pass")

        cmdStr.value = await youPromise()

        await new Promise(resolve => setTimeout(resolve, 650))
    } else {
        canSubmit.value = false

        await new Promise(resolve => setTimeout(resolve, 650))

        cmdStr.value = execCommand("p")
    }
}

const youPromise = _ => new Promise((resolve, _reject) => {
    actionTarget.addEventListener("action", evt => {
        resolve()
    })
})

const submitHandler = async evt => {
    evt.preventDefault()

    if (state.game.winnerIdx != null) {
        startGame({ idx: ++state.game.idx, initCardLen })

        return
    }

    if (!canSubmit.value) {
        return
    }

    const inputStr = cmdInputElm.value

    const actionStr = execCommand(inputStr)

    if (actionStr) {
        actionTarget.dispatchEvent(new Event("action"))
    }
}

cmdBoxElm.querySelector("form").addEventListener("submit", submitHandler)

init()

console.log("Thanks, world!")
