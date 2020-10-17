import { UCARD } from './const.js';
import { parseUcard } from './util.js';

// Unsuit-card
class Ucard extends Number {
  constructor(arg) {
    const value = arg;

    super(value);

    this.joker = value === UCARD.JOKER;

    this.rank = this.joker ? Infinity : value;
  }

  render() {
    const rank = this.valueOf();

    if (rank === 0) {
      return '';
    }

    const rankStr = {
      "1": 'A',
      "11": 'J',
      "12": 'Q',
      "13": 'K',
      "14": 'O',
      "15": 'X',
    }[rank] || rank.toString();

    return rankStr;
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

const ucArr = (new Array(16)).fill(0).map((_, i) => new Ucard(i));

const ucard = arg => {
  let value = UCARD.UNDEFINED;

  if (arg === undefined) {
  } else if (arg === null) {
    value = UCARD.BLANK;
  } else if (arg instanceof Ucard) {
    const uc = arg;

    value = uc.valueOf();
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

  return ucArr[value];
}

export default ucard;
