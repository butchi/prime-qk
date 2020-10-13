import { CARD, SUIT } from './const.js';
import { parseCard } from './util.js';

export default class Card extends Number {
  constructor(...args) {
    let value = CARD.UNDEFINED;

    if (args.length === 0) {
    } else if (args.length === 1) {
      const arg = args[0];

      if (arg === undefined) {
      } else if (arg instanceof Card) {
        const card = arg;

        value = card.valueOf();
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
    } else if (args.length === 2) {
      const suit = args[0];
      const index = args[1];

      if (suit === SUIT.JOKER && index > 0 && index <= 2) {
        value = 2 ** 6 - index;
      } else if (suit < 4 && index > 0 && index <= 13){
        value = suit * 16 + index;
      }
    }

    super(value);

    this.joker = value === CARD.JOKER1 ? 1 : value === CARD.JOKER2 ? 2 : null;

    this.isValid = value === CARD.BLANK || value === CARD.UNDEFINED || this.joker || ((value - 1) % 16) < 13;

    this.suit = (this.joker || value === CARD.BLANK || !this.isValid) ? null : Math.floor((value - 1) / 16);

    this.index = !this.isValid ? null : this.joker ? this.joker : (value - 1) % 16 + 1;

    this.rank = !this.isValid ? null : this.joker ? Infinity : this.index;
  }

  toString() {
    // const str = ('0' + this.valueOf().toString(13)).slice(-2);
    // const rank = parseInt(str[1], 13) + 1;

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
}

Card.randomSample = n => {
  if (n === undefined) {
    const arr = Array.from((new CardComb(CARD_JOKER_2)).toSet());

    const idx = Math.floor(Math.random() * arr.length);
  
    return arr[idx];
  } else if (typeof n === 'number') {
    return (new Array(n)).fill(0).map(_ => {
      return Card.randomSample();
    });
  } else {
  }
};
