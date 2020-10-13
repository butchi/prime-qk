import Card from './card.js';
import { compareCard } from './util.js';

export default class CardComb extends Number {
  constructor (...args) {
    let value;

    let set = new Set();

    if (args.length < 1) {
    } else if (args.length === 1) {
      const arg = args[0];

      if (arg === undefined) {
      } else if (arg instanceof CardComb) {
        const cardComb = arg;

        set = cardComb.toSet();
      } else if (arg instanceof Set) {
        set = arg;
      } else if (arg instanceof Array) {
        const cardArr = args[0];

        set = new Set(cardArr);
      } else if (typeof arg === 'string') {
        const cardArrStr = arg;

        set = new Set(parseCardArray(cardArrStr));
      } else if (typeof arg === 'number') {
        value = arg;

        super(value);

        return;
      }
    } else if (args.length > 1) {
      const cardArr = args;

      set = new Set(cardArr);
    }

    const setArr = new Array(52).fill(0);
    const jokerSetArr = new Array(2).fill(0);

    set.forEach(item => {
      const c = new Card(item);

      if (c.joker) {
        jokerSetArr[c.joker - 1]++;
      } else {
        setArr[c.valueOf() - 1]++;
      }
    });

    setArr.reverse();
    jokerSetArr.reverse();

    const setInt = parseInt(setArr.join('') + '1', 2);
    const jokerSetInt = parseInt(jokerSetArr.join(''), 2);

    value = setInt;

    for (let i = 0; i < jokerSetInt; i++) {
      value *= 2;
    }

    super(value);
  }

  toSet() {
    const ret = new Set();

    const regExp = /10*$/;
    const str = this.valueOf().toString(2);

    const jokerSetStr = ((str.match(regExp) || [''])[0].length - 1).toString(2);

    for (let suit = 0; suit < 4; suit++) {
      for (let rank = 0; rank < 13; rank++) {
        if (str[suit * 4 + rank]) {
          const card = new Card(suit, rank + 1);

          ret.add(card);
        }
      }
    }

    for (let i = 0; i < 2; i++) {
      if (jokerSetStr[i] === '1') {
        const card = new Card(-(i + 1));

        ret.add(card);
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
