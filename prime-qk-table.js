import { UCARD_JOKER_2 } from './const.js';
import UcardBuffer from './ucard-buffer.js';
import UcardComb from './ucard-comb.js';
import UcardCombArray from './ucard-comb-array.js';

export default class PrimeQkTable {
  constructor(arg) {
    this.stock = new UcardComb(UCARD_JOKER_2);
    this.handArr = new UcardCombArray(1);
  }

  initialize() {
    this.handArr[0] = new UcardComb([this.stock.randomSample()]);
  }
}
