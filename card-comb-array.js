import Card from './card.js';

export default class CardCombArray extends Float64Array {
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
    return Array.from(this).map(v => new Card(v)).toString();
  }
}
