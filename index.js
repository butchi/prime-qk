const CARD_JOKER_2 = parseInt(`
1111111111111
1111111111111
1111111111111
1111111111111
1000`.replace(/\n/g, ''), 2);

const CARD_JOKER_1 = parseInt(`
1111111111111
1111111111111
1111111111111
1111111111111
10`.replace(/\n/g, ''), 2);

const CARD_JOKER_0 = parseInt(`
1111111111111
1111111111111
1111111111111
1111111111111
1`.replace(/\n/g, ''), 2);

const CARD_DIGIT_1 = parseInt(`
0000111111111
0000111111111
0000111111111
0000111111111
1`.replace(/\n/g, ''), 2);

const CARD_DIGIT_2 = parseInt(`
1111000000000
1111000000000
1111000000000
1111000000000
1`.replace(/\n/g, ''), 2);

const CARD_ODD = parseInt(`
1010101010101
1010101010101
1010101010101
1010101010101
1`.replace(/\n/g, ''), 2);

const CARD_EVEN = parseInt(`
0101010101010
0101010101010
0101010101010
0101010101010
1`.replace(/\n/g, ''), 2);


const UCARD_JOKER_2 = parseInt(`24444444444444`, 5);

const UCARD_JOKER_1 = parseInt(`14444444444444`, 5);

const UCARD_JOKER_0 = parseInt(`4444444444444`, 5);

const UCARD_DIGIT_2 = parseInt(`0000000004444`, 5);

const UCARD_DIGIT_1 = parseInt(`4444444440000`, 5);

const UCARD_ODD = parseInt(`4040404040404`, 5);

const UCARD_EVEN = parseInt(`0404040404040`, 5);



const suitArr = ['club', 'diamond', 'heart', 'spade'];

const SUIT = {};

suitArr.concat('joker').forEach((v, i) => {
  SUIT[v] = i;
});


const parseCard = str => {
  let ret;

  const suitStr = (str.match(/[A-Z]+|joker/i) || [''])[0].toUpperCase() || '';
  const rankStr = (str.match(/[A1-9TJQK]$|1[0-3]$/i) || [''])[0].toUpperCase() || '';

  const suit = {
    "C": 0,
    "D": 1,
    "H": 2,
    "S": 3,
    "J": 4,
    "X": 4,
  }[suitStr[0]];

  const index = {
    "A": 1,
    "J": 11,
    "Q": 12,
    "K": 13,
  }[rankStr] || Number(rankStr);

  if (suit === SUIT.joker && index > 0 && index <= 2) {
    ret = 2 ** 6 - index;
  } else if (suit < 4 && index > 0 && index <= 13){
    ret = suit * 13 + index;
  }

  return ret;
};

const parseCardArray = str => {
  const cardStrArr = str.split(/([CDHSX]1?[A1-9TJQK])/i).filter(str => str.length > 0);

  return cardStrArr.map(cardStr => parseCard(cardStr));
};

const compareCard = (a, b) => {
  if (a.rank < b.rank) {
    return -1;
  }
  if (a.rank > b.rank) {
    return 1;
  }
  if (a.suit < b.suit) {
    return -1;
  }
  if (a.suit > b.suit) {
    return 1;
  }
  if (a.valueOf() === b.valueOf()) {
    return 0;
  }
};

class Card extends Number {
  constructor(...args) {
    let value = NaN;

    if (args.length === 0) {
      value = 0;
    } else if (args.length === 1) {
      const arg = args[0];

      if (arg === undefined) {
        value = 0;
      } else if (arg instanceof Card) {
        const card = arg;

        value = card.valueOf();
      } else if (typeof arg === 'string') {
        const cardStr = arg;

        value = parseCard(cardStr);
      } else if (typeof arg === 'number') {
        const cardInt = arg;

        if (cardInt === 0) {
        } else if (cardInt === ((-1) & 0b111111) || cardInt === -1) {
          value = (-1) & 0b111111; // => 63
        } else if (cardInt === ((-2) & 0b111111) || cardInt === -2) {
          value = (-2) & 0b111111; // => 62
        } else if (cardInt > 0 && cardInt <= 52) {
          value = cardInt;
        }
      } else {
      }
    } else if (args.length === 2) {
      const suit = args[0];
      const index = args[1];

      if (suit === SUIT.joker && index > 0 && index <= 2) {
        value = 2 ** 6 - index;
      } else if (suit < 4 && index > 0 && index <= 13){
        value = suit * 13 + index;
      }
    }

    super(value);

    this.suit = Math.floor((value - 1) / 13);

    this.joker = this.suit === SUIT.joker ? (2 ** 6 - value) : null;

    this.index = this.joker ? this.joker : (value - 1) % 13 + 1;

    this.rank = this.joker ? Infinity : this.index;
  }

  toString() {
    // const str = ('0' + this.valueOf().toString(13)).slice(-2);
    // const rank = parseInt(str[1], 13) + 1;

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


class CardBuffer extends ArrayBuffer {
  constructor(arg) {
    let arr = [];

    if (arg === undefined) {
    } else if (arg instanceof CardComb) {
      const cardComb = arg;

      arr = Array.from(cardComb.toSet());
    } else if (arg instanceof Array) {
      arr = arg;
    } else if (typeof arg === 'string') {
      const cardStr = arg;

      arr = parseCardArray(cardStr);
    }

    const len = arr.length;

    const byteLen = Math.ceil(len * 6 / 8);

    super(byteLen);

    this.length = len;

    this.view = new DataView(this);

    for (let i = 0; i * 4 < arr.length; i++) {
      let c = 0;

      for (let j = 3; j >= 0; j--) {
        c <<= 6;
        c += (arr[i * 4 + j] || 0).valueOf();
      }

      for (let j = 0; j < 3; j++) {
        const val = (c >> (j * 8)) & 0xff;
  
        if (i * 3 + j < byteLen) {
          this.view.setUint8(i * 3 + j, val, true);
        }
      }
    }
  }

  shuffle() {
    return this.sort(_ => Math.random() - .5);
  }

  toArray() {
    const ret = [];

    const byteLen = this.byteLength;

    for (let i = 0; i * 3 < byteLen; i++) {
      let c = 0;

      for (let j = 2; j >= 0; j--) {
        c <<= 8;

        if (i * 3 + j < byteLen) {
          c += this.view.getUint8(i * 3 + j);
        }
      }

      for (let j = 0; j < 4; j++) {
        ret[i * 4 + j] = (c >> (j * 6)) % 64;
      }
    }

    ret.length = this.length;

    return ret;
  }

  toString() {
    return this.toArray().map(v => new Card(v)).toString();
  }
}


class CardComb extends Number {
  constructor (...args) {
    let value;

    let set = new Set();

    if (args.length < 1) {
    } else if (args.length === 1) {
      const arg = args[0];

      if (arg === undefined) {
      } else if (arg instanceof CardComb) {
        const cardComb = arg;

        set = cardComb.toSet();
      } else if (arg instanceof Set) {
        set = arg;
      } else if (arg instanceof Array) {
        const cardArr = args[0];

        set = new Set(cardArr);
      } else if (typeof arg === 'string') {
        const cardArrStr = arg;

        set = new Set(parseCardArray(cardArrStr));
      } else if (typeof arg === 'number') {
        value = arg;

        super(value);

        return;
      }
    } else if (args.length > 1) {
      const cardArr = args;

      set = new Set(cardArr);
    }

    const setArr = new Array(52).fill(0);
    const jokerSetArr = new Array(2).fill(0);

    set.forEach(item => {
      const c = new Card(item);

      if (c.joker) {
        jokerSetArr[c.joker - 1]++;
      } else {
        setArr[c.valueOf() - 1]++;
      }
    });

    setArr.reverse();
    jokerSetArr.reverse();

    const setInt = parseInt(setArr.join('') + '1', 2);
    const jokerSetInt = parseInt(jokerSetArr.join(''), 2);

    value = setInt;

    for (let i = 0; i < jokerSetInt; i++) {
      value *= 2;
    }

    super(value);
  }

  toSet() {
    const ret = new Set();

    const regExp = /10*$/;
    const str = this.valueOf().toString(2);

    const normalSetStr = ((new Array(54)).fill('0').join('') + str.replace(regExp, '')).slice(-52);

    const jokerSetStr = '0' + ((str.match(regExp) || [''])[0].length - 1).toString(2).slice(-2);

    const setArr = (jokerSetStr + normalSetStr).split('').reverse().map(v => Boolean(Number(v)));

    setArr.forEach((v, i) => {
      if (v) {
        const card = new Card(i + 1);

        ret.add(card);
      }
    });

    return ret;
  }

  randomSample(n) {
    if (n === undefined) {
      const arr = Array.from(this.toSet());

      const idx = Math.floor(Math.random() * arr.length);

      return arr[idx]
    } else if (typeof n === 'number') {
    }
  }

  toString(arg) {
    if (arg === 2) {
      return this.valueOf().toString(2);
    }

    return Array.from(this.toSet()).sort(compareCard).toString();
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


const parseUcard = str => {
  let ret = NaN;

  const char = (str.match(/[0-9ATJQKX]+/i) || [''])[0].toUpperCase() || '';

  const int = parseInt({
    "A": '1',
    "T": '10',
    "J": '11',
    "Q": '12',
    "K": '13',
    "X": '-1',
  }[char] || char);

  if (int === 0) {
    ret = 0;
  } else if (int === -1) {
    ret = (-1) & 0b1111;
  } else if (int > 0 && int <= 13) {
    ret = int;
  }

  return ret;
};

const compareUcard = (a, b) => {
  if (a.rank < b.rank) {
    return -1;
  }
  if (a.rank > b.rank) {
    return 1;
  }
  if (a.valueOf() === b.valueOf()) {
    return 0;
  }
};

// Unsuit-card
class Ucard extends Number {
  constructor(arg) {
    let value = NaN;

    if (arg === undefined) {
      value = 0;
    } else if (arg instanceof Ucard) {
      const ucard = arg;

      value = ucard.valueOf();
    } else if (typeof arg === 'string') {
      const ucardStr = arg;

      value = parseUcard(ucardStr);
    } else if (typeof arg === 'number') {
      const ucardInt = arg;

      if (ucardInt === 0) {
        value = 0;
      } else if (ucardInt === ((-1) & 0b1111) || ucardInt === -1) {
        value = (-1) & 0b1111; // => 15
      } else if (ucardInt > 0 && ucardInt <= 13) {
        value = arg;
      }
    } else {
    }

    super(value);

    this.rank = (value === ((-1) & 0b1111)) ? Infinity : value;
  }

  toString() {
    const rank = this.valueOf();

    const rankStr = {
      "0": '',
      "1": 'A',
      "11": 'J',
      "12": 'Q',
      "13": 'K',
      "15": '🃏',
    }[rank] || rank.toString();

    return rankStr;
  }
}


const parseUcardArray = str => {
  const ucardStrArr = str.split('');

  return ucardStrArr.map(ucardStr => parseUcard(ucardStr));
};

class UcardBuffer extends ArrayBuffer {
  constructor(arg) {
    let arr = [];

    if (arg === undefined) {
    } else if (arg instanceof UcardComb) {
      const ucardComb = arg;

      arr = Array.from(ucardComb.toSet());
    } else if (arg instanceof Array) {
      arr = arg;
    } else if (typeof arg === 'string') {
      const ucardStr = arg;

      arr = parseUcardArray(ucardStr);
    }

    const len = arr.length;

    const byteLen = Math.ceil(len * 4 / 8);

    super(byteLen);

    this.length = len;

    this.view = new DataView(this);

    for (let i = 0; i * 8 < arr.length; i++) {
      let c = 0;

      for (let j = 7; j >= 0; j--) {
        c <<= 4;
        c += (arr[i * 8 + j] || 0).valueOf();
      }

      for (let j = 0; j < 4; j++) {
        const val = (c >> (j * 8)) & 0xff;

        if (i * 4 + j < byteLen) {
          this.view.setUint8(i * 4 + j, val, true);
        }
      }
    };
  }

  shuffle() {
    return this.sort(_ => Math.random() - .5);
  }

  toArray() {
    const ret = [];

    const byteLen = this.byteLength;

    for (let i = 0; i * 2 < byteLen; i++) {
      let c = 0;

      for (let j = 1; j >= 0; j--) {
        c <<= 8;

        if (i * 2 + j < byteLen) {
          c += this.view.getUint8(i * 2 + j);
        }
      }

      for (let j = 0; j < 4; j++) {
        ret[i * 4 + j] = (c >> (j * 4)) % 16;
      }
    }

    ret.length = this.length;

    return ret;
  }

  toString() {
    return this.toArray().map(v => new Ucard(v)).toString();
  }
}


class UcardComb extends Number {
  constructor (...args) {
    let value;

    let set = new Set();

    if (args.length < 1) {
      super(0);
    } else if (args.length === 1) {
      const arg = args[0];

      if (arg === undefined) {
        super(0);
      } else if (arg instanceof UcardComb) {
        ucardComb = arg;

        value = ucardComb.valueOf();
      } else if (arg instanceof Set) {
        set = arg;
      } else if (arg instanceof Array) {
        const ucardArr = arg;

        set = new Set(ucardArr);
      } else if (typeof arg === 'string') {
      } else if (typeof arg === 'number') {
        const cardInt = arg;

        super(cardInt);

        return;
      }
    } else if (args.length > 1) {
      const ucardArr = args;

      set = new Set(ucardArr);
    }

    const tallyArr = new Array(14).fill(0);

    set.forEach(item => {
      const v = item.valueOf();

      tallyArr[v === ((-1) & 0b1111) ? 0 : v]++;
    });

    tallyArr.reverse();

    value = parseInt(tallyArr.join(''), 5);

    super(value);
  }

  toSet() {
    const ret = new Set();

    const str = ((new Array(14)).fill('0').join('') + this.valueOf().toString(5)).slice(-14);

    const setArr = str.split('').map(v => Number(v));

    setArr.forEach((len, i) => {
      for (let j = 0; j < len; j++) {
        const rank = i === 0 ? ((-1) & 0b1111) : i;

        const ucard = new Ucard(rank);

        ret.add(ucard);
      }
    });

    return ret;
  }

  toString(arg) {
    if (arg === 5) {
      return this.valueOf().toString(5);
    }

    return Array.from(this.toSet()).sort(compareUcard).toString();
  }
}
