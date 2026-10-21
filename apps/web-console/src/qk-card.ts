export type QkCardNum =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15

export type QkCardChar =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'T'
  | 'J'
  | 'Q'
  | 'K'
  | '_'
  | 'X'

export class QkCard {
  private num: QkCardNum

  private constructor(char: QkCardChar) {
    this.num = cardStrToNum(char)
  }

  hasValue(): boolean {
    const val = this.valueOf() as number

    if (val == null) {
    } else if (isNaN(val)) {
      return false
    } else if (val > 0 && val <= 13) {
      return true
    } else if (val === Infinity || val === -Infinity) {
      return true
    }

    return false
  }

  toString(): string {
    return cardNumToStr(this.num)
  }

  valueOf(): number {
    if (this.num == null) {
    } else if (this.num === QkCard.indet) {
      return NaN
    } else if (this.num === QkCard.joker) {
      return Infinity
    } else if (this.num <= 0) {
      return NaN
    } else if (this.num <= 13) {
      return this.num
    }

    return NaN
  }

  static indet: QkCardNum = 14
  static joker: QkCardNum = 15

  static from(val: QkCardChar | QkCardNum): QkCard {
    let str = ''

    if (typeof val === 'string') {
      str = val.toString()
    } else if (typeof val === 'number') {
      str = cardNumToStr(val)
    }

    // if (!str.match(/[A2-9JQKTX]/)) {
    //   console.error('Invalid card')
    // }

    return new QkCard(str as QkCardChar)
  }
}

const cardStrToNum = (char: QkCardChar) => {
  return '-A23456789TJQK_X'.indexOf(char) as QkCardNum
}

const cardNumToStr = (num: number | undefined) => {
  if (num == null) {
  } else if (num === QkCard.indet) {
    return '_'
  } else if (num === QkCard.joker) {
    return 'X'
  } else if (num > 0 && num <= 13) {
    return '-A23456789TJQK'[num]
  } else {
    return '-'
  }

  return '_'
}

export default QkCard
