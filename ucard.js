import { UCARD } from './const.js';
import { parseUcard } from './util.js';

// Unsuit-card
export default class Ucard extends Number {
  constructor(arg) {
    let value = UCARD.UNDEFINED;

    if (arg === undefined) {
    } else if (arg === null) {
      value = UCARD.BLANK;
    } else if (arg instanceof Ucard) {
      const ucard = arg;

      value = ucard.valueOf();
    } else if (typeof arg === 'string') {
      const ucardStr = arg;

      value = parseUcard(ucardStr);
    } else if (typeof arg === 'number' && Number.isInteger(arg)) {
      const ucardInt = arg;

      if (ucardInt >= 0 && ucardInt <= 15) {
        value = arg;
      } else if (ucardInt === -1) {
        value = UCARD.JOKER;
      }
    } else {
    }

    super(value);

    this.joker = value === UCARD.JOKER;

    this.rank = this.joker ? Infinity : value;
  }

  toString() {
    const rank = this.valueOf();

    if (rank === 0) {
      return '';
    }

    const rankStr = {
      "1": 'A',
      "11": 'J',
      "12": 'Q',
      "13": 'K',
      "14": '🂠',
      "15": '🃏',
    }[rank] || rank.toString();

    return rankStr;
  }
}
