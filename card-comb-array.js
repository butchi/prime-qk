import cardComb from './card-comb.js';

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

  render() {
    return `[${Array.from(this).map(v => cardComb(v).render())}]`;
  }

  toString() {
    return `[${Array.from(this).map(v => cardComb(v)).toString()}]`;
  }
}
