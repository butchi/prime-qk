import card from './card.js';
import { CardComb } from './card-comb.js';

export default class CardBuffer extends ArrayBuffer {
  constructor(arg) {
    let arr = [];

    if (arg === undefined) {
    } else if (arg instanceof CardComb) {
      const cardComb = arg;

      arr = Array.from(cardComb.toSet());
    } else if (arg instanceof Array) {
      arr = arg;
    } else if (typeof arg === 'string') {
      const cardStr = arg;

      arr = parseCardArray(cardStr);
    }

    const len = arr.length;

    const byteLen = Math.ceil(len * 6 / 8);

    super(byteLen);

    this.length = len;

    this.view = new DataView(this);

    for (let i = 0; i * 4 < arr.length; i++) {
      let c = 0;

      for (let j = 3; j >= 0; j--) {
        c <<= 6;
        c += (arr[i * 4 + j] || 0).valueOf();
      }

      for (let j = 0; j < 3; j++) {
        const val = (c >> (j * 8)) & 0xff;
  
        if (i * 3 + j < byteLen) {
          this.view.setUint8(i * 3 + j, val, true);
        }
      }
    }
  }

  shuffle() {
    return this.sort(_ => Math.random() - .5);
  }

  toArray() {
    const ret = [];

    const byteLen = this.byteLength;

    for (let i = 0; i * 3 < byteLen; i++) {
      let c = 0;

      for (let j = 2; j >= 0; j--) {
        c <<= 8;

        if (i * 3 + j < byteLen) {
          c += this.view.getUint8(i * 3 + j);
        }
      }

      for (let j = 0; j < 4; j++) {
        ret[i * 4 + j] = (c >> (j * 6)) % 64;
      }
    }

    ret.length = this.length;

    return ret;
  }

  toString() {
    return `[${this.toArray().map(v => card(v)).toString()}]`;
  }
}
