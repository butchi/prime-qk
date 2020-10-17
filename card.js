import { CARD, SUIT, CARD_JOKER_2 } from './const.js';
import { parseCard } from './util.js';
import CardComb from './card-comb.js';

export class Card extends Number {
  constructor(arg) {
    const value = arg;

    super(value);

    this.joker = value === CARD.JOKER1 ? 1 : value === CARD.JOKER2 ? 2 : null;

    this.isValid = value === CARD.BLANK || value === CARD.UNDEFINED || this.joker || ((value - 1) % 16) < 13;

    this.suit = (this.joker || value === CARD.BLANK || !this.isValid) ? null : Math.floor((value - 1) / 16);

    this.index = !this.isValid ? null : this.joker ? this.joker : (value - 1) % 16 + 1;

    this.rank = !this.isValid ? null : this.joker ? Infinity : this.index;
  }

  static randomSample(n) {
    if (n === undefined) {
      const arr = Array.from((cardComb(CARD_JOKER_2)).toSet());
  
      const idx = Math.floor(Math.random() * arr.length);
    
      return arr[idx];
    } else if (typeof n === 'number') {
      return (new Array(n)).fill(0).map(_ => {
        return Card.randomSample();
      });
    } else {
    }
  }

  render() {
    if (this.valueOf() === CARD.BLANK) {
      return '';
    }

    if (this.valueOf() === CARD.UNDEFINED) {
      return '🂠';
    }

    if (!this.isValid) {
      return '-';
    }

    const suitStr = {
      "0": '♣',
      "1": '♢',
      "2": '♡',
      "3": '♠',
      "4": '🃏',
    }[this.suit];

    let rankStr = {
      "1": 'A',
      "11": 'J',
      "12": 'Q',
      "13": 'K',
    }[this.rank] || this.rank;

    if (this.joker) {
      return '🃏' + this.joker;
    }

    return suitStr + rankStr;
  }

  toString() {
    if (this.valueOf() === CARD.BLANK) {
      return '';
    }

    if (this.valueOf() === CARD.UNDEFINED) {
      return 'O';
    }

    if (!this.isValid) {
      return '-';
    }

    const suitStr = {
      "0": 'C',
      "1": 'D',
      "2": 'H',
      "3": 'S',
    }[this.suit];

    let rankStr = {
      "1": 'A',
      "11": 'J',
      "12": 'Q',
      "13": 'K',
    }[this.rank] || this.rank;

    if (this.joker) {
      return 'X' + this.joker;
    }

    return suitStr + rankStr;
  }
}

const cArr = (new Array(64)).fill(0).map((_, i) => new Card(i));

const card = (...argArr) => {
  let value = CARD.UNDEFINED;

  if (argArr.length === 0) {
  } else if (argArr.length === 1) {
    const arg = argArr[0];

    if (arg === undefined) {
    } else if (arg instanceof Card) {
      const c = arg;

      value = c.valueOf();
    } else if (typeof arg === 'string') {
      const cardStr = arg;

      value = parseCard(cardStr);
    } else if (typeof arg === 'number') {
      const cardInt = arg;

      if (cardInt >= 0 && cardInt <= 63 && Number.isInteger(cardInt)) {
        value = cardInt;
      } else if (cardInt === -1) {
        value = CARD.JOKER1;
      } else if (cardInt === -2) {
        value = CARD.JOKER2;
      }
    } else {
    }
  } else if (argArr.length === 2) {
    const suit = argArr[0];
    const index = argArr[1];

    if (suit === SUIT.JOKER && index > 0 && index <= 2) {
      value = 2 ** 6 - index;
    } else if (suit < 4 && index > 0 && index <= 13){
      value = suit * 16 + index;
    }
  }

  return cArr[value];
};

export default card;
