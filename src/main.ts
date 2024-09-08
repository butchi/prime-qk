// TODO: ペナルティ
// TODO: 合成数出し
// TODO: ラマヌジャン革命
// TODO: 素数候補提示

import { checkPrime, factor } from './util'
import { QkCardNum, QkCard } from './qk-card'
import { cArrToGroup, QkCardEntry } from './qk-card-entry'

import GUI from 'lil-gui'

import markdownit from 'markdown-it'
const md = markdownit({
  html: true,
})

import 'bootstrap-icons/font/bootstrap-icons.css'
import 'github-markdown-css'
import './scss/style.scss'
import * as bootstrap from 'bootstrap'

const humName = 'プレイヤー'
const comName = 'COM1'

console.log('Hello, world!')

const appElm = document.querySelector('#app') as HTMLDivElement

const handElm = appElm.querySelector('.hand') as HTMLDivElement

const renderHand = () => {
  const humIdx = state.game.playerArr.indexOf(humName)

  if (humIdx === -1) {
    console.error('Player not found')

    return
  }

  const cArr: QkCard[] = state.game.handArr[humIdx]
  handElm.innerHTML = cArr
    .map((card: QkCard) => `<span>${card.toString()}</span>`)
    .join('')
}

const paramLi = {
  playerLen: 2,
  humLen: 1,
  isOpenCard: false,
  isShowH1: true,
  isShowH2: false,
  isShowH3: true,
  isShowH4: false,
  isShowH5: false,
  isShowH6: false,
  isShowP: true,
  isShowBq: true,
  isShowCode: true,
  pause: false,
  initCardLen: 11,
  waitSec: 0.618,
  initialize: () => {
    init()
  },
  showLogTxt: () => {
    const scoreModalElm = document.querySelector(
      '.score-modal'
    ) as HTMLDivElement

    const scoreModalContentElm = scoreModalElm?.querySelector(
      '.modal-body'
    ) as HTMLDivElement

    scoreModalContentElm.innerHTML =
      '<pre><code>' + scoreMdSeq.join('\n') + '</code></pre>'

    const scoreModal = new bootstrap.Modal(scoreModalElm)

    scoreModal.show()
  },
}

const gui = new GUI()

// gui.add(paramLi, 'playerLen', 1, 4, 1)
// gui.add(paramLi, 'humLen', 0, 4, 1)

const mdFolder = gui.addFolder('Markdown')
for (let level = 0; level < 6; level++) {
  mdFolder.add(paramLi, `isShowH${level + 1}`).onChange((val: boolean) => {
    const propStr = (!val).toString()
    scoreElm.setAttribute(`data-hidden-h${level + 1}`, propStr)
  })
}
mdFolder.add(paramLi, 'isShowP').onChange((val: boolean) => {
  const propStr = (!val).toString()
  scoreElm.setAttribute('data-hidden-p', propStr)
})
mdFolder.add(paramLi, 'isShowBq').onChange((val: boolean) => {
  const propStr = (!val).toString()
  scoreElm.setAttribute('data-hidden-bq', propStr)
})
mdFolder.add(paramLi, 'isShowCode').onChange((val: boolean) => {
  const propStr = (!val).toString()
  scoreElm.setAttribute('data-hidden-code', propStr)
})
mdFolder.close()

gui.add(paramLi, 'isOpenCard').onChange(() => {
  log.render()
})
gui.add(paramLi, 'initCardLen', 0, 29, 1).onChange((val: number) => {
  stateGameDefault.initCardLen = val
})
gui.add(paramLi, 'waitSec', 0, 5)
gui.add(paramLi, 'pause')
gui.add(paramLi, 'initialize')
gui.add(paramLi, 'showLogTxt')

gui.close()

let canSubmit: boolean = false

const actionTarget = new EventTarget()

const scoreElm = appElm.querySelector('.prime-qk-score') as HTMLDivElement

const cmdBoxElm = appElm.querySelector('.box-command') as HTMLDivElement

const cmdInputElm = cmdBoxElm.querySelector('input') as HTMLInputElement

const scoreMdSeq: string[] = []

type StateTouney = {
  idx: number
  title: string
  message: string
}

const stateTourneyDefault: StateTouney = {
  idx: 0,
  title: '素数大富豪コンソール',
  message: '素数大富豪コンソールへようこそ！',
}

type StateStage = {
  idx: number
}

const stateStageDefault: StateStage = {
  idx: 0,
}

type StateGame = {
  idx: number
  deck: QkCard[]
  initCardLen: number
  winnerIdx: number | undefined
  playerArr: string[]
  handArr: QkCard[][]
  rev: false
}

const stateGameDefault: StateGame = {
  idx: 0,
  deck: [],
  initCardLen: paramLi.initCardLen,
  winnerIdx: undefined,
  playerArr: [],
  handArr: [],
  rev: false,
}

type StateSet = {
  idx: number
  curEntry: QkCardEntry | undefined
  playerIdx: number | undefined
  masterIdx: number | undefined
  cutFlag: boolean
  passFlag: boolean
}

const stateSetDefault: StateSet = {
  idx: 0,
  curEntry: undefined,
  playerIdx: 0,
  masterIdx: 0,
  cutFlag: false,
  passFlag: false,
}

type StateTurn = {
  idx: number
  draw: QkCard | undefined
  pass: boolean
}

const stateTurnDefault: StateTurn = {
  idx: 0,
  draw: undefined,
  pass: false,
}

type State = {
  tourney: StateTouney
  stage: StateStage
  game: StateGame
  set: StateSet
  turn: StateTurn
}

const state: State = {
  tourney: stateTourneyDefault,
  stage: stateStageDefault,
  game: stateGameDefault,
  set: stateSetDefault,
  turn: stateTurnDefault,
}

const log = {
  render: () => {
    const scoreMd = scoreMdSeq
      .map((str: string) => {
        if (!paramLi.isOpenCard && str.startsWith('    ')) {
          const [player, seq] = str.slice(4).split(': ')
          const [pre, post] = seq.split(' => ')

          let scoreCmdStr
          let bodyStr

          if (post == null) {
            bodyStr = pre
          } else {
            scoreCmdStr = pre
            bodyStr = post
          }

          const bodyRepl =
            player === humName
              ? bodyStr
              : bodyStr.replaceAll(/[A2-9JQKTX]/g, '*')

          if (scoreCmdStr) {
            // TODO: ドローした時にドロー札も伏せる
            str = `    ${player}: ${scoreCmdStr} => ${bodyRepl}`
          } else {
            str = `    ${player}: ${bodyRepl}`
          }
        }

        return str
          .replaceAll('[x]', '<i class="bi-check-circle-fill"></i>')
          .replaceAll('[ ]', '<i class="bi-x-circle-fill"></i>')
      })
      .join('\n')

    scoreElm.innerHTML = md.render(scoreMd)

    // スクロールを最下部に移動
    scoreElm.scrollTop = scoreElm.scrollHeight
  },

  h: (str: string, depth: number) => {
    const preStr = '######'.slice(0, depth)

    const body = preStr + ' ' + str

    scoreMdSeq.push('')
    scoreMdSeq.push(body)

    log.render()

    console.log(str)

    return body
  },

  h1: (str: string) => log.h(str, 1),
  h2: (str: string) => log.h(str, 2),
  h3: (str: string) => log.h(str, 3),
  h4: (str: string) => log.h(str, 4),
  h5: (str: string) => log.h(str, 5),
  h6: (str: string) => log.h(str, 6),

  p: (str: string) => {
    const body = str

    scoreMdSeq.push('')
    scoreMdSeq.push(body)

    log.render()

    return body
  },

  bq: (str: string) => {
    const body = '> ' + str

    scoreMdSeq.push('')
    scoreMdSeq.push(body)

    log.render()

    return body
  },

  code: (str: string) => {
    const body = '    ' + str

    scoreMdSeq.push('')
    scoreMdSeq.push(body)

    log.render()

    return body
  },
}

const execCommand = (inputStr = ''): string => {
  const { game, set, turn } = state

  const { deck, playerArr } = game
  const { playerIdx } = set

  if (playerIdx === undefined) {
    console.error('No player')

    return ''
  }

  const hand = game.handArr[playerIdx]
  const handGroup = cArrToGroup(hand)

  const commandNoop = () => {
    return ''
  }

  const commandPass = () => {
    log.code(
      `${playerArr[playerIdx]}: pass => ${hand
        .map((c: QkCard) => c.toString())
        .join('')}`
    )

    if (hand.length > 0) {
      set.passFlag = true
    }

    cmdInputElm.value = ''

    return 'pass'
  }

  const commandDraw = () => {
    cmdInputElm.value = ''

    if (turn.draw !== null) {
      return ''
    }

    const draw = deck.shift()

    if (draw === undefined) {
      console.error('Empty deck')
    } else {
      turn.draw = draw

      hand.push(draw)
    }

    log.code(
      `${playerArr[playerIdx]}: draw(${turn.draw}) => ${hand
        .map((c: QkCard) => c.toString())
        .join('')}`
    )

    cmdInputElm.value = ''

    log.bq('p: pass')

    return ''
  }

  const commandAttack = (inputStr: string) => {
    console.log(inputStr)

    // TODO: コマンド入力
    const cardEntry = QkCardEntry.from(inputStr)

    if (cardEntry === null) {
      console.error('Invalid card entry')

      return ''
    }

    const inputNum = cardEntry.valueOf()

    if (inputNum === null) {
      return ''
    }

    const factorArr = factor(inputNum)
    const isPrime = checkPrime(inputNum)

    const drawStr = turn.draw ? `draw(${turn.draw}) ` : ''

    let prependHtml = `${playerArr[playerIdx]}: ${drawStr}${hand
      .map((c: QkCard) => c.toString())
      .join('')}`
    let attackHtml = ''
    let isValid

    if (
      cardEntry.toArray().length > 0 &&
      inputStr.replace(/\|.*/, '').length !== cardEntry.toArray().length &&
      cardEntry.checkInclude({ handGroup })
    ) {
      log.bq(`枚数が不足しています len(${inputStr}) ≦ len(${hand})`)
      return ''
    }
    if (inputNum <= cardEntry.toArray().length) {
      log.bq(`数が不足しています ${inputNum} ≦ ${cardEntry.toArray().length}`)
      return ''
    }
    if (inputNum === null) {
    } else if (cardEntry.toString() === 'X') {
      attackHtml += `[x] **Joker**`
      set.cutFlag = true
      isValid = true
    } else if (inputNum === 57n) {
      attackHtml += `[x] **GC**`
      set.cutFlag = true
      isValid = true
    } else if (inputNum === 1n) {
      attackHtml += `[ ] ${inputNum} は素数ではありません`
      isValid = false
    } else if (isPrime) {
      attackHtml += `[x] ${inputNum} は素数です！`
      isValid = true
    } else if (factorArr.length > 0) {
      attackHtml += `[ ] ${inputNum} = ${factorArr.join(' × ')}`
      const checkArr = [2n, 3n, 5n, 11n, 1001n]
      checkArr.forEach((num: bigint) => {
        if (inputNum % num === 0n) {
          attackHtml += ` [*${num}n*]`
        }
      })
      isValid = false
    }

    if (isValid) {
      const didDiscard = cardEntry.toArray().every((c: QkCard) => {
        const idx = hand.findIndex(
          (handCard: QkCard) => c.toString() === handCard.toString()
        )
        const discard = hand.splice(idx, 1)[0]

        if (discard.hasValue()) {
          deck.push(discard)

          return true
        } else {
          return false
        }
      })

      if (didDiscard) {
        if (cmdInputElm) {
          cmdInputElm.value = ''
        }
      }

      set.curEntry = cardEntry
      set.masterIdx = playerIdx
      set.passFlag = false
    } else {
      for (let i = 0; i < cardEntry.toArray().length; i++) {
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
      log.code(
        `${prependHtml} => ${hand.map((c: QkCard) => c.toString()).join('')}`
      )
    }

    log.p(attackHtml)

    if (game.winnerIdx === playerIdx) {
      canSubmit = false
      log.bq(`${playerArr[playerIdx]} win!`)
      log.bq(`Press Enter to continue.`)
      console.info('score: ', scoreMdSeq.join('\n'))
    }
    cmdInputElm.value = ''

    return inputStr
  }

  const commanAuto = () => {
    // 現状はチートだがユーザーも使える
    // TODO: オート入力再実装

    return commandPass()
  }

  if (inputStr == null) {
  } else if (inputStr === '') {
    return commandNoop()
  } else if (inputStr.toUpperCase() === 'PASS' || inputStr === 'p') {
    return commandPass()
  } else if (inputStr.toUpperCase() === 'DRAW' || inputStr === 'd') {
    return commandDraw()
  } else if (inputStr.toUpperCase() === 'AUTO' || inputStr === 'a') {
    return commanAuto()
  } else {
    return commandAttack(inputStr)
  }

  return ''
}

const init = () => {
  scoreMdSeq.length = 0

  scoreElm.setAttribute('data-hidden-h1', (!paramLi.isShowH1).toString())
  scoreElm.setAttribute('data-hidden-h2', (!paramLi.isShowH2).toString())
  scoreElm.setAttribute('data-hidden-h3', (!paramLi.isShowH3).toString())
  scoreElm.setAttribute('data-hidden-h4', (!paramLi.isShowH4).toString())
  scoreElm.setAttribute('data-hidden-h5', (!paramLi.isShowH5).toString())
  scoreElm.setAttribute('data-hidden-h6', (!paramLi.isShowH6).toString())
  scoreElm.setAttribute('data-hidden-p', (!paramLi.isShowP).toString())
  scoreElm.setAttribute('data-hidden-bq', (!paramLi.isShowBq).toString())
  scoreElm.setAttribute('data-hidden-code', (!paramLi.isShowCode).toString())

  startTourney({
    idx: 1,
  })
}

const startTourney = ({ idx = 0 }) => {
  state.tourney = { ...stateTourneyDefault, idx }

  const {
    tourney: { title, message },
  } = state

  log.h1(title)

  log.p(message)

  startStage({ idx: 1 })
}

const startStage = async ({ idx = 0 }) => {
  state.stage = { ...stateStageDefault, idx }

  const { stage } = state

  state.game.idx = 0

  log.h2(`第${stage.idx}ステージ`)

  await startGame({ idx: ++state.game.idx })
}

const startGame = async ({ idx = 0 }) => {
  const playerArr = new Array(paramLi.playerLen).fill(0).map((_, i) => {
    if (i < paramLi.humLen) {
      return humName
    } else {
      return comName
    }
  })

  playerArr.sort((_a, _b) => Math.random() - 0.5)

  state.game = { ...stateGameDefault, playerArr, idx }

  const { game } = state

  state.set.idx = 0

  const { deck, handArr, initCardLen } = game

  const fullChargeDeck = (arr: QkCard[], jokerLen: number = 2) => {
    arr.length = 0

    for (let suit = 0; suit < 4; suit++) {
      for (let i = 1; i <= 13; i++) {
        arr.push(QkCard.from(i as QkCardNum))
      }
    }

    for (let jokerIdx = 0; jokerIdx < jokerLen; jokerIdx++) {
      arr.push(QkCard.from(QkCard.joker))
    }

    deck.sort((_a, _b) => Math.random() - 0.5)
  }

  fullChargeDeck(deck)

  log.h3(`第${game.idx}ゲーム`)

  log.code(`山札: ${deck.map((c: QkCard) => c.toString()).join('')}`)

  playerArr.forEach((name, i) => {
    const hand: QkCard[] = []

    hand.push(
      ...deck.splice(0, initCardLen).sort((a, b) => a.valueOf() - b.valueOf())
    )

    handArr.push(hand)

    log.code(`${name}: ${handArr[i].map((c: QkCard) => c.toString()).join('')}`)
  })

  for (let _i of new Array(9999)) {
    if (game.winnerIdx === undefined) {
      await startSet({
        idx: ++state.set.idx,
        playerIdx: state.set.masterIdx ?? state.set.playerIdx,
      })
    }
  }
}

const startSet = async ({ idx = 0, playerIdx = 0 }) => {
  state.set = { ...stateSetDefault, idx, playerIdx }

  const { game, set } = state

  if (set.playerIdx === undefined) {
    return
  }

  state.turn.idx = 0

  log.h4(`第${set.idx}セット`)

  renderHand()

  const { playerArr } = game

  for (let _i of new Array(9999)) {
    if (game.winnerIdx !== undefined) {
      return
    }

    if (state.turn.idx > 0) {
      set.playerIdx = (set.playerIdx + 1) % playerArr.length
    }

    if (set.cutFlag) {
      return
    }

    if (set.passFlag && set.playerIdx === set.masterIdx) {
      return
    }

    await startTurn({ idx: ++state.turn.idx })
  }
}

const startTurn = async ({ idx = 0 }) => {
  state.turn = { ...stateTurnDefault, idx }

  const { game, set, turn } = state

  const { playerArr } = game

  const { playerIdx, curEntry } = set

  if (playerIdx === undefined) {
    console.error('No player')

    return
  }

  const name = playerArr[playerIdx]

  // let cmdStr: string = ''

  log.h5(`第${turn.idx}ターン`)

  log.bq(`${name}の番です`)

  if (curEntry === undefined) {
    log.bq(`${name}が入力中`)
  } else {
    log.bq(
      `数: ${curEntry} (枚数: ${
        curEntry.toString().replace(/\|.*/, '').length
      })`
    )
  }

  log.code(
    `${playerArr[playerIdx]}: ${game.handArr[playerIdx]
      .map((c: QkCard) => c.toString())
      .join('')}`
  )

  if (name === humName) {
    canSubmit = true

    cmdInputElm.blur()
    cmdInputElm.focus()

    // log.bq('コマンド一覧 d: draw p: pass')

    await youPromise()

    await new Promise((resolve: Function) =>
      setTimeout(resolve, paramLi.waitSec * 1000)
    )
  } else {
    canSubmit = false

    // await new Promise(resolve => setTimeout(resolve, 150))
    await new Promise((resolve: Function) =>
      setTimeout(resolve, paramLi.waitSec * 1000)
    )

    await new Promise((resolve: Function) => {
      const wait = () =>
        !paramLi.pause ? resolve() : requestAnimationFrame(wait)

      wait()
    })

    execCommand('auto')
    // cmdStr = execCommand('auto')

    await new Promise((resolve: Function) =>
      setTimeout(resolve, paramLi.waitSec * 382)
    )
  }
}

const youPromise = () =>
  new Promise((resolve: Function, _reject) => {
    actionTarget.addEventListener('action', (_evt: Event) => {
      resolve()
    })
  })

const submitHandler = async (evt: Event) => {
  evt.preventDefault()

  if (state.game.winnerIdx !== undefined) {
    startGame({ idx: ++state.game.idx })

    return
  }

  if (!canSubmit) {
    return
  }

  const cmdInputStr = cmdInputElm.value

  const actionStr = execCommand(cmdInputStr)

  if (actionStr) {
    actionTarget.dispatchEvent(new Event('action'))
  }
}

const inputHandler = (evt: Event) => {
  const humIdx = state.game.playerArr.indexOf(humName)

  if (humIdx === -1) {
    console.error('Player not found')

    return
  }

  const handCardArr = state.game.handArr[humIdx]
  const targetElm = evt.target as HTMLInputElement

  const tempInputStr: string = targetElm?.value ?? ''

  const cardEntry: QkCardEntry | null = QkCardEntry.from(tempInputStr)

  const handGroup = cArrToGroup(handCardArr) as object

  handElm.removeAttribute('data-state')
  handElm
    .querySelectorAll('span')
    .forEach((elm: HTMLSpanElement) => elm.removeAttribute('data-selected'))

  if (cardEntry && cardEntry.checkInclude({ handGroup })) {
    let handStr = handCardArr.map((c: QkCard) => c.toString()).join('')

    cardEntry.toArray().forEach((c: QkCard) => {
      handStr = handStr.replace(c.toString(), '!')
    })

    const posArr: number[] = handStr
      .split('')
      .map((char, i) => (char === '!' ? i : null))
      .filter((char: number | null) => char !== null)

    posArr.forEach((posIdx: number) => {
      const cardElm = handElm.querySelector(
        `span:nth-of-type(${posIdx + 1})`
      ) as HTMLSpanElement

      cardElm.setAttribute('data-selected', 'selected')
    })
  } else {
    handElm.setAttribute('data-state', 'disabled')
  }
}

const manualElm = appElm.querySelector(
  'input[name="manual"]'
) as HTMLInputElement

manualElm.focus()
manualElm.addEventListener('input', inputHandler)

const formElm = cmdBoxElm.querySelector('form') as HTMLFormElement
formElm.addEventListener('submit', submitHandler)

init()

console.log('Thanks, world!')
