// TODO: 合成数出し
// TODO: ラマヌジャン革命
// TODO: 素数候補提示

import { Qk, QkCardSequence } from "./qk.js"
import { factor, checkPrime, checkPrimeBigInt, primeListDigit3, primeListLen2Digit4, primeListLen2Digit6, primeListLen2Digit8 } from "./util.js"

console.log("Hello, world!")

const GUI = lil.GUI
const gui = new GUI()

const paramLi = {
    playerLen: 4,
    humLen: 1,
    isOpenCard: false,
	pause: false,
    initCardLen: 11,
    waitSec: 1,
    initialize: _ => {
        init()
    },
}

gui.add(paramLi, "playerLen", 1, 4, 1)
gui.add(paramLi, "humLen", 0, 4, 1)
gui.add(paramLi, "isOpenCard").onChange(val => {
    log.render()
})
gui.add(paramLi, "initCardLen", 1, 23, 1).onChange(val => {
    stateGameDefault.initCardLen = val
})
gui.add(paramLi, "waitSec", 0, 5)
gui.add(paramLi, "pause")
gui.add(paramLi, "initialize")

const md = globalThis.markdownit({ html: true });

const canSubmit = { value: false }

const actionTarget = new EventTarget()

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
    playerArr: [],
    handArr: [],
    rev: false,
}

const stateSetDefault = {
    idx: 0,
    curCardStr: "",
    curNum: 0,
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

const log = {
    render: _ => {
        const scoreMd = scoreMdSeq.map(str => {
            if (!paramLi.isOpenCard && str.startsWith("    ")) {
                const [player, seq] = str.slice(4).split(": ")
                const [pre, post] = seq.split(" => ")

                let cmdStr
                let bodyStr

                if (post == null) {
                    bodyStr = pre
                } else {
                    cmdStr = pre
                    bodyStr = post
                }

                const bodyRepl = player.startsWith("hum") ? bodyStr : bodyStr.replaceAll(/[0-9AJQKTX]/g, "*")

                if (cmdStr) {
                    str = `    ${player}: ${cmdStr} => ${bodyRepl}`
                } else {
                    str = `    ${player}: ${bodyRepl}`
                }
            }

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

    const commandNoop = _ => {
        return ""
    }

    const commandPass = _ => {
        log.code(`${playerArr[playerIdx]}: pass => ${Qk.fromArrayToString(hand)}`)

        if (set.curCardStr.length > 0) {
            set.passFlag = true
        }

        cmdInputElm.value = ""

        return "pass"
    }

    const commandDraw = _ => {
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
    }

    const commandAttack = inputStr => {
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

        if (set.curCardStr > 0 && inputStr.replace(/\|.*/, "").length !== set.curCardStr.length) {
            log.bq(`Cannot discard. len(${inputStr}) ≦ len(${set.curCardStr})`)

            return
        }

        if (inputNum <= set.curNum) {
            log.bq(`Cannot discard. ${inputNum} ≦ ${set.curNum}`)

            return
        }

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

            set.curCardStr = inputQkSeq.toQkString()
            set.curNum = inputNum
            set.masterIdx = playerIdx
            set.passFlag = false
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

            console.info("score: ", scoreMdSeq.join("\n"))
        }

        cmdInputElm.value = ""
    
        return inputStr
    }

    const commanAuto = _ => {
        // 現状はチートだがユーザーも使える

        const countEven = (str) => str.toUpperCase().replaceAll(/\|.*/g, "").replaceAll(/[A379JKX]/g, "").length
        const sortAbsFunc = (a, b) => (new QkCardSequence(b).toQkNumber()) - (new QkCardSequence(a).toQkNumber())
        const sortEvenCardFunc = (a, b) => countEven(b) - countEven(a)

        const { curCardStr } = state.set

        const qkOddFilt = hand.filter(cVal => [1, 3, 7, 9, 11, 13, -1].includes(cVal))
        const primeFilt = hand.filter(cVal => ([2, 3, 5, 7, 11, 13, -1].includes(cVal)))
        const oddPrimeFilt = hand.filter(cVal => [3, 5, 7, 11, 13, -1].includes(cVal))
        const largerFilter = cVal => (cVal > set.curNum || cVal === -1)

        const getAttackCard = len => {
            if (len >= hand.length) {
                return new Set()
            }

            if (len == null) {
            } else if (len === 1) {
                return new Set(primeFilt.filter(largerFilter).map(cVal => Qk.fromValToChar(cVal)))
            } else if (len === 2) {
                const primeListLen2 = primeListDigit3.concat(primeListLen2Digit4)
    
                return new Set(qkOddFilt.flatMap(tailVal => {
                    const handTmp = [ ...hand ]
    
                    const index = handTmp.findIndex(handVal => handVal === tailVal)
    
                    if (index >= 0) {
                        handTmp.splice(index, 1)
                    }

                    const cArr = handTmp.flatMap(handVal => {
                        if (handVal === -1 && tailVal === -1) {
                            return `XX|QK`
                        } else if (tailVal === -1) {
                            return new Array(13 + 1).fill(0).map((_, xVal) => {
                                const arrTmp = [handVal, - xVal]
                                const num = new QkCardSequence(arrTmp).toQkNumber()
        
                                if (num === 57 || (primeListLen2.includes(num)) && num > set.curNum) {
                                    return `${Qk.fromArrayToString(arrTmp)}|${Qk.fromValToChar(xVal)}`
                                }
                            })
                        } else if (handVal === -1) {
                            return new Array(13 + 1).fill(0).map((_, xVal) => {
                                if (xVal === 0) return 

                                const arrTmp = [- xVal, tailVal]
                                const num = new QkCardSequence(arrTmp).toQkNumber()
        
                                if (num === 57 || (primeListLen2.includes(num)) && num > set.curNum) {
                                    return `${Qk.fromArrayToString(arrTmp)}|${Qk.fromValToChar(xVal)}`
                                }
                            })
                        } else {
                            const arrTmp = [handVal, tailVal]
                            const num = new QkCardSequence(arrTmp).toQkNumber()

                            if (num === 57 || (primeListLen2.includes(num)) && num > set.curNum) {
                                return Qk.fromArrayToString(arrTmp)
                            }
                        }
                    }).filter(str => str?.length > 0)

                    return cArr
                }))
            } else if (len === 3) {
                // TODO: ジョーカーを使い分ける

                const combination = (nums, k) => {
                    let ans = []
                    if (nums.length < k) {
                        return []
                    }
                    if (k === 1) {
                        for (let i = 0; i < nums.length; i++) {
                            ans[i] = [nums[i]]
                        }
                    } else {
                        for (let i = 0; i < nums.length - k + 1; i++) {
                            let row = combination(nums.slice(i + 1), k - 1)
                            for (let j = 0; j < row.length; j++) {
                                ans.push([nums[i]].concat(row[j]))
                            }
                        }
                    }
                    return ans
                }

                const primeLi = [].concat(primeListDigit3)
                    .concat(primeListLen2Digit4)
                    .concat(primeListLen2Digit6)
                    .concat(primeListLen2Digit8)

                const ret = new Set(qkOddFilt.flatMap(tailVal => {
                    const handTmp = [ ...hand.filter(cVal => cVal !== -1) ]
    
                    const tailIndex = handTmp.findIndex(handVal => handVal === tailVal)

                    if (tailIndex > 0) {
                        handTmp.splice(tailIndex, 1)
                    }

                    const combArr = combination(handTmp, 3)

                    return combArr.map(cValArr => {
                        const num = new QkCardSequence(cValArr).toQkNumber()

                        if ((primeLi.includes(num)) && num > set.curNum) {
                            return Qk.fromArrayToString(cValArr)
                        }
                    }).filter(str => str?.length > 0)
                }))

                return ret
            }

            return new Set()
        }

        if (curCardStr.length === 0) {
            if (qkOddFilt.length === 0 || (hand.length === 1 && primeFilt.filter(largerFilter).length === 0)) {
                commandDraw()
            }

            if (hand.length >= 3) {
                const card3Arr = Array.from(getAttackCard(3))

                if (card3Arr.length > 0) {
                    card3Arr.sort(sortAbsFunc).sort(sortEvenCardFunc)

                    return commandAttack(card3Arr[0])
                }    
            }

            if (hand.length >= 2) {
                const card2Arr = Array.from(getAttackCard(2))

                if (card2Arr.length > 0) {
                    card2Arr.sort(sortAbsFunc).sort(sortEvenCardFunc)

                    return commandAttack(card2Arr[0])
                }
            }

            const card1Arr = Array.from(getAttackCard(1))

            if (card1Arr.length > 0) {
                card1Arr.sort(sortAbsFunc).sort(sortEvenCardFunc)

                return commandAttack(card1Arr[0])
            }

            return commandPass()
        } else if (curCardStr.replace(/\|.*/, "").length === 1) {
            if (oddPrimeFilt.length === 0) {
                commandDraw()
            }

            if (primeFilt.filter(largerFilter).length > 0) {
                const card = Qk.fromValToChar(primeFilt.filter(largerFilter)[0])

                return commandAttack(card)
            } else {
                return commandPass()
            }
        } else if (curCardStr.replace(/\|.*/, "").length === 2) {
            if (oddPrimeFilt.length === 0) {
                commandDraw()
            }

            const card2Arr = Array.from(getAttackCard(2))

            const arrPass = card2Arr.filter(str => new QkCardSequence(str).toQkNumber() > set.curNum)

            if (arrPass.length > 0) {
                arrPass.sort(sortAbsFunc).sort(sortEvenCardFunc)

                return commandAttack(arrPass[0])
            }
        } else if (curCardStr.replace(/\|.*/, "").length === 3) {
            if (oddPrimeFilt.length === 0) {
                commandDraw()
            }

            const card3Arr = Array.from(getAttackCard(3))

            const arrPass = card3Arr.filter(str => new QkCardSequence(str).toQkNumber() > set.curNum)

            if (arrPass.length > 0) {
                arrPass.sort(sortAbsFunc).sort(sortEvenCardFunc)

                return commandAttack(arrPass[0])
            }
        }

        return commandPass()
    }

    if (inputStr == null) {
    } else if (inputStr === "") {
        return commandNoop()
    } else if (inputStr.toLowerCase() === "pass" || inputStr.toLowerCase() === "p") {
        return commandPass()
    } else if (inputStr.toLowerCase() === "draw" || inputStr.toLowerCase() === "d") {
        return commandDraw()
    } else if (inputStr.toLowerCase() === "auto" || inputStr.toLowerCase() === "a") {
        return commanAuto()
    } else {
        return commandAttack(inputStr)
    }
}

const init = _ => {
    scoreMdSeq.length = 0

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

    await startGame({ idx: ++state.game.idx  })
}

const startGame = async ({ idx = 0, initCardLen = 11 }) => {
    const playerArr = new Array(paramLi.playerLen).fill(0).map((_, i) => {
        if (i < paramLi.humLen) {
            return "hum" + (i + 1)
        } else {
            return "com" + (i - paramLi.humLen + 1)
        }
    })

    playerArr.sort(_ => Math.random() - 0.5)

    state.game = { ...stateGameDefault, playerArr, idx }

    const { tourney, stage, game } = state

    // game.deck = "264TX254924K858J9JT37Q899A2AKXQ7K53JT6A5Q3874TA66QJK37".split("").map(char => Qk.fromCharToVal(char))
    // game.deck = [3, 11, 4, 10, 2, 1, 10, 9, 6, 2, 1, 9, 8, 2, 12, -1, 13, 6, 3, 11, 4, 1, 3, 8, 5, 12, 8, 8, 12, 7, 5, 7, 10, 6, 1, 12, -1, 3, 13, 13, 7, 4, 4, 9, 13, 11, 11, 2, 6, 10, 7, 5, 9, 5]
    game.deck = (new Array(13 * 4)).fill(0).map((_, i) => Math.floor(i / 4) + 1).concat([-1, -1])

    state.set.idx = 0

    const { deck, handArr } = game

    deck.sort(_ => Math.random() - 0.5)
    console.log("deck: ", deck)

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

        if (set.cutFlag) {
            return
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

    log.bq(`It's turn of ${name}`)

    if (set.curCardStr == "") {
        log.bq(`${name} is master.`)
    } else {
        log.bq(`Field is: ${set.curCardStr} (length: ${set.curCardStr.replace(/\|.*/, "")   .length})`)
    }

    log.code(`${playerArr[playerIdx]}: ${Qk.fromArrayToString(game.handArr[playerIdx])}`)

    if (name.startsWith("hum")) {
        canSubmit.value = true

        cmdInputElm.blur()
        cmdInputElm.focus()

        log.bq("It's your turn. d: draw p: pass")

        cmdStr.value = await youPromise()

        await new Promise(resolve => setTimeout(resolve, paramLi.waitSec * 618))
    } else {
        canSubmit.value = false

        // await new Promise(resolve => setTimeout(resolve, 150))
        await new Promise(resolve => setTimeout(resolve, paramLi.waitSec * 618))

        cmdStr.value = execCommand("auto")

        await new Promise(resolve => setTimeout(resolve, paramLi.waitSec * 382))
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
        startGame({ idx: ++state.game.idx })

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
