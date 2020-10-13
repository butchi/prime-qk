import Ucard from './ucard.js';

export default class UcardCombArray extends Uint32Array {
  constructor(arg) {
    if (arg === undefined) {
    } else if (arg instanceof Array) {
      const arr = arg;

      super(arr);
    } else if (typeof arg === 'number') {
      super(arg);
    }
  }

  toString() {
    return Array.from(this).map(v => new Ucard(v)).toString();
  }
}
