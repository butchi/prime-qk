import { SUIT } from './const.js';
import card from './card.js';
import { compareCard } from './util.js';

export class CardComb extends Number {
  constructor(arg) {
    const value = arg;

    super(value);
  }

  toSet() {
    const ret = new Set();

    const regExp = /10*$/;
    const str = this.valueOf().toString(2);

    const normalSetStr = ((new Array(54)).fill('0').join('') + str.replace(regExp, '')).slice(-52);

    const jokerSetStr = ('0' + ((str.match(regExp) || [''])[0].length - 1).toString(2)).slice(-2).split('').reverse().join('');

    const normalSetArr = normalSetStr.split('').reverse().map(v => Boolean(Number(v)));

    normalSetArr.forEach((v, i) => {
      if (v) {
        const suit = Math.floor(i / 13);
        const rank = (i % 13) + 1;

        const c = card(suit, rank);

        ret.add(c);
      }
    });

    for (let i = 0; i < 2; i++) {
      if (jokerSetStr[i] === '1') {
        const c = card(SUIT.JOKER, i + 1);

        ret.add(c);
      }
    }

    return ret;
  }

  randomSample(n) {
    if (n === undefined) {
      const arr = Array.from(this.toSet());

      const idx = Math.floor(Math.random() * arr.length);

      return arr[idx]
    } else if (typeof n === 'number') {
    }
  }

  toString(arg) {
    if (arg === 2) {
      return this.valueOf().toString(2);
    }

    return `{${Array.from(this.toSet()).sort(compareCard).toString()}}`;
  }
}

const cardCombArr = [];

const cardComb = (...argArr) => {
  let value;
  let set = new Set();

  if (argArr.length < 1) {
  } else if (argArr.length === 1) {
    const arg = argArr[0];

    if (arg === undefined) {
    } else if (arg instanceof CardComb) {
      const cardComb = arg;

      set = cardComb.toSet();
    } else if (arg instanceof Set) {
      set = arg;
    } else if (arg instanceof Array) {
      const cardArr = arg;

      set = new Set(cardArr);
    } else if (typeof arg === 'string') {
      const cardArrStr = arg;

      set = new Set(parseCardArray(cardArrStr));
    } else if (typeof arg === 'number') {
      value = arg;
    }
  } else if (args.length > 1) {
    const cardArr = args;

    set = new Set(cardArr);
  }

  const setArr = new Array(52).fill(0);
  const jokerSetArr = new Array(2).fill(0);

  set.forEach(item => {
    const c = card(item);

    if (c.joker) {
      jokerSetArr[c.joker - 1]++;
    } else {
      setArr[c.suit * 13 + c.rank - 1]++;
    }
  });

  setArr.reverse();
  jokerSetArr.reverse();

  const setInt = parseInt(setArr.join('') + '1', 2);
  const jokerSetInt = parseInt(jokerSetArr.join(''), 2);

  if (value === undefined) {
    value = setInt;
  }

  for (let i = 0; i < jokerSetInt; i++) {
    value *= 2;
  }

  return cardCombArr[value] || (cardCombArr[value] = new CardComb(value));
}

export default cardComb;
