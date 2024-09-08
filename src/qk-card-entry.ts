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

  private constructor(qkArr: QkCard[]) {
    this.arr = qkArr
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
    const str: string = this.arr
      .map((card: QkCard) => {
        const val: number = card.valueOf() ?? NaN

        if (isNaN(val)) {
          return null
        } else if (val === Infinity) {
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
      const qkCardArr: QkCard[] = str
        .split('')
        .map((char: string) => QkCard.from(char as QkCardChar))

      return new QkCardEntry(qkCardArr)
    } catch (_err) {
      return null
    }
  }
}

export default QkCardEntry
