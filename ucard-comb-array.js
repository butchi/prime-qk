import ucardComb from './ucard-comb.js';

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

  render() {
    return `[${Array.from(this).map(v => ucardComb(v).render())}]`;
  }

  toString() {
    return `[${Array.from(this).map(v => ucardComb(v)).toString()}]`;
  }
}
