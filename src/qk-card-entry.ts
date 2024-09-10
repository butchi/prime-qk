import { QkCardChar, QkCard } from './qk-card'

export const cArrToGroup = (cardArr: QkCard[]): object => {
  const strArr = cardArr.map((card: QkCard) => card.toString())

  return Object.fromEntries(
    '0A23456789TJQK_X'
      .split('')
      .map((numChar: string) => [
        numChar,
        strArr.filter((str) => str === numChar).length,
      ])
      .slice(1)
  )
}

export class QkCardEntry {
  private arr: QkCard[]
  private jokerArr: string[]

  private constructor(qkArr: QkCard[], opts: { jokerArr: string[] } = { jokerArr: [] }) {
    const { jokerArr } = opts

    this.arr = qkArr

    this.jokerArr = jokerArr
  }

  add(qkCard: QkCard) {
    this.arr.push(qkCard)
  }

  toArray(): QkCard[] {
    return this.arr
  }

  toString(): string {
    return this.arr.map((card: QkCard) => card.toString()).join('')
  }

  valueOf(): bigint | null {
    let jokerIdx = 0

    const str: string = this.arr
      .map((card: QkCard) => {
        const val: number = card.valueOf() ?? NaN

        if (isNaN(val)) {
          return null
        } else if (val === Infinity) {
          if (this.toArray().length === 1) {
            return null
          }

          const joker = this.jokerArr[jokerIdx++]

          if (joker === undefined) {
          } else if (joker === 'A') {
            return '1'
          } else if (joker === 'J') {
            return '11'
          } else if (joker === 'Q') {
            return '12'
          } else if (joker === 'K') {
            return '13'
          } else if (joker === 'T') {
            return '10'
          } else {
            return joker
          }

          console.warn('Set joker as 1 automatically')
          return '1'
        }

        return val.toString()
      })
      .join('')

    const bInt: bigint = BigInt(str)

    return bInt
  }

  checkInclude({ handGroup }: any): boolean {
    const entryGroup = cArrToGroup(this.toArray()) as any

    return Object.keys(entryGroup).every((numChar: string) => {
      return entryGroup[numChar] <= handGroup[numChar]
    })
  }

  static from(str: string): QkCardEntry | null {
    try {
      const [numStr, expr1, expr2] = str.split('|')

      const joker1 = /X=([0A2-9TJQK])/.exec(expr1)?.[1]

      const joker2 = /X=([0A2-9TJQK])/.exec(expr2)?.[1]

      const jokerArr = [joker1, joker2].filter(entry => entry !== undefined)

      const qkCardArr: QkCard[] = numStr
        .split('')
        .map((char: string) => QkCard.from(char as QkCardChar))

      return new QkCardEntry(qkCardArr, {
        jokerArr,
      })
    } catch (_err) {
      return null
    }
  }
}

export default QkCardEntry
