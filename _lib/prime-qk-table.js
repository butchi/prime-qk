import { UCARD_JOKER_2 } from './const.js';
import UcardBuffer from './ucard-buffer.js';
import ucardComb from './ucard-comb.js';
import UcardCombArray from './ucard-comb-array.js';

export default class PrimeQkTable {
  constructor(arg) {
    this.stock = ucardComb(UCARD_JOKER_2);
    this.handArr = new UcardCombArray(1);
  }

  initialize() {
    this.handArr[0] = ucardComb([this.stock.randomSample()]);
  }
}
