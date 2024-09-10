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

console.log('Hello, world!')

const appElm = document.querySelector('#app') as HTMLDivElement

const handElm = appElm.querySelector('.hand') as HTMLDivElement

const deck: QkCard[] = []
const handCardArr: QkCard[] = []

const renderHand = () => {
  const cArr: QkCard[] = handCardArr

  if (cArr.length === 0) {
    handElm.innerHTML = '<span style="color: red;">Clear!</span>'
  } else {
    handElm.innerHTML = cArr
      .map((card: QkCard) => `<span>${card.toString()}</span>`)
      .join('')
  }
}

const paramLi = {
  playerLen: 2,
  humLen: 1,
  isOpenCard: false,
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

gui.close()

let canSubmit: boolean = false

const actionTarget = new EventTarget()

const scoreElm = appElm.querySelector('.prime-qk-score') as HTMLDivElement

const cmdBoxElm = appElm.querySelector('.box-command') as HTMLDivElement

const cmdInputElm = cmdBoxElm.querySelector('input') as HTMLInputElement

const scoreMdSeq: string[] = []

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

          if (scoreCmdStr) {
            str = `    ${player}: ${scoreCmdStr} => ${bodyStr}`
          } else {
            str = `    ${player}: ${bodyStr}`
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
  const commandNoop = () => {
    handCardArr.sort((a, b) => a.valueOf() - b.valueOf())

    renderHand()

    return ''
  }

  const commandPass = () => {
    cmdInputElm.value = ''

    return 'pass'
  }

  const commandDraw = () => {
    cmdInputElm.value = ''

    const draw = deck.shift()

    if (draw === undefined) {
      console.error('Empty deck')
    } else {
      handCardArr.push(draw)
    }

    cmdInputElm.value = ''

    return ''
  }

  const commandAttack = (inputStr: string) => {
    // TODO: 合成数出し
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

    let attackHtml = ''
    let isValid

    if (inputNum === null) {
    } else if (cardEntry.toString() === 'X') {
      attackHtml += `[x] **Joker**`
      isValid = true
    } else if (inputNum === 57n) {
      attackHtml += `[x] **GC**`
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
        const idx = handCardArr.findIndex(
          (handCard: QkCard) => c.toString() === handCard.toString()
        )
        const discard = handCardArr.splice(idx, 1)[0]

        if (discard.hasValue()) {
          deck.push(discard)

          return true
        } else {
          return false
        }
      })

      if (didDiscard) {
        renderHand()

        if (cmdInputElm) {
          cmdInputElm.value = ''
        }
      }
    } else {
      for (let i = 0; i < cardEntry.toArray().length; i++) {
        const val = deck.shift()
        if (val) {
          handCardArr.push(val)

          handElm.removeAttribute('data-state')

          renderHand()
        }
      }
    }

    log.p(attackHtml)

    cmdInputElm.value = ''

    return inputStr
  }

  const commandAuto = () => {
    // 現状はチートだがユーザーも使える
    // TODO: オート入力再実装

    return commandPass()
  }

  if (inputStr === '') {
  } else if (inputStr.toUpperCase() === 'PASS' || inputStr === '%') {
    return commandPass()
  } else if (inputStr.toUpperCase() === 'DRAW' || inputStr === 'd') {
    return commandDraw()
  } else if (inputStr.toUpperCase() === 'AUTO' || inputStr === '!') {
    return commandAuto()
  } else if (inputStr.endsWith('?')) {
    const tmpCardEntry = QkCardEntry.from(inputStr.slice(0, -1))

    const tmpInputNum = tmpCardEntry?.valueOf()

    if (tmpInputNum === undefined) {
      return ''
    }

    const tmpFactorArr = factor(tmpInputNum)
    const tmpIsPrime = checkPrime(tmpInputNum)

    if (tmpInputNum === undefined) {
    } else if (tmpIsPrime) {
      alert('素数です！')
    } else if (tmpFactorArr.length > 0) {
      alert(tmpFactorArr.join(' × '))
    }
  } else {
    return commandAttack(inputStr)
  }

  return commandNoop()
}

const init = async () => {
  scoreMdSeq.length = 0

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

  handCardArr.push(
    ...deck.splice(0, 11).sort((a, b) => a.valueOf() - b.valueOf())
  )

  renderHand()

  canSubmit = true

  cmdInputElm.blur()
  cmdInputElm.focus()

  const youPromise = () =>
    new Promise((resolve: Function, _reject) => {
      actionTarget.addEventListener('action', (_evt: Event) => {
        resolve()
      })
    })

  await youPromise()

  await new Promise((resolve: Function) =>
    setTimeout(resolve, paramLi.waitSec * 1000)
  )
}

const submitHandler = async (evt: Event) => {
  evt.preventDefault()

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
