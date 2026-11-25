import cardComb from './card-comb.js';

export default class CardCombArray extends Float64Array {
  constructor(arg) {
    if (arg === undefined) {
      super();
    } else if (arg instanceof Array) {
      super(arg);
    } else if (typeof arg === 'number') {
      super(arg);
    } else {
      throw new TypeError('Expected an array or length');
    }
  }

  render() {
    return `[${Array.from(this).map(v => cardComb(v).render())}]`;
  }

  toString() {
    return `[${Array.from(this).map(v => cardComb(v)).toString()}]`;
  }
}
