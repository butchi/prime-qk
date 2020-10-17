import { UCARD } from './const.js';
import ucard from './ucard.js';
import { compareUcard } from './util.js';

export class UcardComb extends Number {
  constructor (arg) {
    const value = arg;

    super(value);
  }

  toSet() {
    const ret = new Set();

    const str = ((new Array(14)).fill('0').join('') + this.valueOf().toString(5)).slice(-14);

    const setArr = str.split('').reverse().map(v => Number(v));

    setArr.forEach((len, i) => {
      for (let j = 0; j < len; j++) {
        const rank = i === 13 ? UCARD.JOKER : i + 1;

        const uc = ucard(rank);

        ret.add(uc);
      }
    });

    return ret;
  }

  randomSample(n) {
    if (n === undefined) {
      const arr = Array.from(this.toSet());

      const idx = Math.floor(Math.random() * arr.length);

      return arr[idx];
    } else if (typeof n === 'number') {
    }
  }

  render(arg) {
    return `{${Array.from(this.toSet()).sort(compareUcard).map(c => c.render())}}`;
  }

  toString(arg) {
    if (arg === 5) {
      return this.valueOf().toString(5);
    }

    return `{${Array.from(this.toSet()).sort(compareUcard).toString()}}`;
  }
}

const ucardCombArr = [];

const ucardComb0 = new UcardComb(0);

const ucardComb = (...argArr) => {
  let value;

  let set = new Set();

  if (argArr.length < 1) {
    value = 0;
  } else if (argArr.length === 1) {
    const arg = argArr[0];

    if (arg === undefined) {
      value = 0;
    } else if (arg instanceof UcardComb) {
      const ucComb = arg;

      value = ucComb.valueOf();
    } else if (arg instanceof Set) {
      set = arg;
    } else if (arg instanceof Array) {
      const ucardArr = arg;

      set = new Set(ucardArr);
    } else if (typeof arg === 'string') {
    } else if (typeof arg === 'number') {
      const cardInt = arg;

      value = cardInt;
    }
  } else if (argArr.length > 1) {
    const ucArr = argArr;

    set = new Set(ucArr);
  }

  const tallyArr = new Array(14).fill(0);

  set.forEach(item => {
    tallyArr[item.joker ? 13 : item.rank - 1]++;
  });

  tallyArr.reverse();

  if (value === undefined) {
    value = parseInt(tallyArr.join(''), 5);
  }

  return ucardCombArr[value] || (ucardCombArr[value] = new UcardComb(value));
};

export default ucardComb;
