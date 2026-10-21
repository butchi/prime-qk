import { UCARD } from './const.js';
import ucard, { Ucard } from './ucard.js';
import { compareUcard } from './util.js';

export class UcardComb extends Number {
  constructor (arg) {
    const value = arg;

    super(value);
  }

  toArray() {
    const ret = [];

    const str = ((new Array(14)).fill('0').join('') + this.valueOf().toString(5)).slice(-14);

    const setArr = str.split('').reverse().map(v => Number(v));

    setArr.forEach((len, i) => {
      for (let j = 0; j < len; j++) {
        const rank = i === 13 ? UCARD.JOKER : i + 1;

        const uc = ucard(rank);

        ret.push(uc);
      }
    });

    ret.sort(compareUcard);

    return ret;
  }

  has(c) {
    return this.toArray().includes(c);
  }

  static complement(ucCombOrg, ...argArr) {
    if (ucCombOrg instanceof UcardComb) {
      let ret = ucCombOrg;

      argArr.forEach(arg => {
        let ucArr;

        if (arg === undefined) {
        } else if (arg instanceof Ucard) {
          ucArr = [arg];
        } else if (arg instanceof UcardComb) {
          ucArr = arg.toArray();
        }

        ucArr.forEach(uc => {
          if (ret.has(uc)) {
            ret = ucardComb(ret - ucardComb([uc]));
          }
        })
    });

      return ret;
    }
  }

  randomSample(n) {
    if (n === undefined) {
      const arr = this.toArray();

      const idx = Math.floor(Math.random() * arr.length);

      return arr[idx];
    } else if (typeof n === 'number') {
    }
  }

  render(arg) {
    return `{${this.toArray().map(c => c.render())}}`;
  }

  toString(arg) {
    if (arg === 5) {
      return this.valueOf().toString(5);
    }

    return `{${this.toArray().toString()}}`;
  }
}

const ucardCombArr = [];

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
