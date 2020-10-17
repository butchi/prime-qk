import ucard from './ucard.js';
import UcardComb from './ucard-comb.js';
import { parseUcardArray, isPrime } from './util.js';

export default class UcardBuffer extends ArrayBuffer {
  constructor(arg) {
    let arr = [];

    if (arg === undefined) {
    } else if (arg instanceof UcardComb) {
      const ucardComb = arg;

      arr = Array.from(ucardComb.toSet());
    } else if (arg instanceof Array) {
      arr = arg;
    } else if (typeof arg === 'string') {
      const ucardStr = arg;

      arr = parseUcardArray(ucardStr);
    }

    const len = arr.length;

    const byteLen = Math.ceil(len * 4 / 8);

    super(byteLen);

    this.length = len;

    this.view = new DataView(this);

    for (let i = 0; i * 8 < arr.length; i++) {
      let c = 0;

      for (let j = 7; j >= 0; j--) {
        c <<= 4;
        c += (arr[i * 8 + j] || 0).valueOf();
      }

      for (let j = 0; j < 4; j++) {
        const val = (c >> (j * 8)) & 0xff;

        if (i * 4 + j < byteLen) {
          this.view.setUint8(i * 4 + j, val, true);
        }
      }
    };
  }

  shuffle() {
    return new UcardBuffer(this.toArray().sort(_ => Math.random() - .5));
  }

  toArray() {
    const ret = [];

    const byteLen = this.byteLength;

    for (let i = 0; i * 2 < byteLen; i++) {
      let c = 0;

      for (let j = 1; j >= 0; j--) {
        c <<= 8;

        if (i * 2 + j < byteLen) {
          c += this.view.getUint8(i * 2 + j);
        }
      }

      for (let j = 0; j < 4; j++) {
        ret[i * 4 + j] = (c >> (j * 4)) % 16;
      }
    }

    ret.length = this.length;

    return ret;
  }

  toQkNumber() {
    const rankArr = this.toArray().map(v => ucard(v).rank);

    if (rankArr.includes(Infinity)) {
      return Infinity;
    }

    return parseInt(rankArr.join(''));
  }

  isPrime() {
    return isPrime(this.toQkNumber());
  }

  toString() {
    return `[${this.toArray().map(v => ucard(v)).toString()}]`;
  }
}
