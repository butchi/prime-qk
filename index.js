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

const suit = {};

suitArr.concat('joker').forEach((v, i) => {
  suit[v] = i;
});


const parseCard = str => {
  let ret;

  const suitStr = (str.match(/[A-Z]+|joker/i) || [''])[0].toUpperCase() || '';
  const rankStr = (str.match(/[A1-9TJQK]$|1[0-3]$/i) || [''])[0].toUpperCase() || '';

  const suitInt = {
    "C": 0,
    "D": 1,
    "H": 2,
    "S": 3,
    "J": 4,
    "X": 4,
  }[suitStr[0]];

  const rankInt = {
    "A": 1,
    "J": 11,
    "Q": 12,
    "K": 13,
  }[rankStr] || Number(rankStr);

  if ((suitInt !== undefined) && (rankInt !== undefined)) {
    ret = suitInt * 13 + rankInt;

    return ret;
  }
};

const parseCardArray = str => {
  const cardStrArr = str.split(/([CDHSX]1?[A1-9TJQK])/i).filter(str => str.length > 0);

  return cardStrArr.map(cardStr => parseCard(cardStr));
};

const compareCard = (a, b) => {
  if (a.rankOf() < b.rankOf()) {
    return -1;
  }
  if (a.rankOf() > b.rankOf()) {
    return 1;
  }
  if (a.suitOf() < b.suitOf()) {
    return -1;
  }
  if (a.suitOf() > b.suitOf()) {
    return 1;
  }
  if (a.valueOf() === b.valueOf()) {
    return 0;
  }
};

class Card extends Number {
  constructor(...args) {
    let value = 0;

    if (args.length === 0) {
    } else if (args.length === 1) {
      const arg = args[0];

      if (arg instanceof Card) {
        const card = arg;

        value = card.valueOf();
      } else if (typeof arg === 'string') {
        const cardStr = arg;

        value = parseCard(cardStr);
      } else if (typeof arg === 'number') {
        value = arg;
      } else {
      }
    } else if (args.length === 2) {
      value = args[0] * 13 + args[1];
    }

    super(value);
  }

  suitOf() {
    return Math.floor((this.valueOf() - 1) / 13);
  }

  isJoker() {
    return this.suitOf() === suit.joker;
  }

  rankOf() {
    if (this.isJoker()) {
      return Infinity;
    }

    return (this.valueOf() - 1) % 13 + 1;
  }

  toString() {
    // const str = ('0' + this.valueOf().toString(13)).slice(-2);
    // const rank = parseInt(str[1], 13) + 1;

    const suitInt = this.suitOf();
    const rankInt = this.rankOf();

    const suitStr = {
      "0": '♣',
      "1": '♢',
      "2": '♡',
      "3": '♠',
      "4": '🃏',
    }[suitInt];

    let rankStr = {
      "1": 'A',
      "11": 'J',
      "12": 'Q',
      "13": 'K',
    }[rankInt] || rankInt;

    if (this.isJoker()) {
      return '🃏' + ((this.valueOf() - 1) % 13 + 1);
    }

    return suitStr + rankStr;
  }
}


class CardBuffer extends ArrayBuffer {
  constructor(arg) {
    super(3);

    this.view = new DataView(this);

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

    this.length = arr.length;

    for (let i = 0; i < arr.length; i += 4) {
      const c0 = (arr[i] || 0).valueOf();
      const c1 = (arr[i + 1] || 0).valueOf();
      const c2 = (arr[i + 2] || 0).valueOf();
      const c3 = (arr[i + 3] || 0).valueOf();

      const c = (c3 << 18) + (c2 << 12) + (c1 << 6) + c0;

      const val0 = c & 0xff;
      const val1 = (c >> 8) & 0xff;
      const val2 = (c >> 16) & 0xff;

      this.view.setUint8(i * 3, val0, true);
      this.view.setUint8(i * 3 + 1, val1, true);
      this.view.setUint8(i * 3 + 2, val2, true);
    };
  }

  shuffle() {
    return this.sort(_ => Math.random() - .5);
  }

  toArray() {
    const ret = [];

    const byteLen = this.byteLength;

    for (let i = 0; i < byteLen; i += 3) {
      const c0 = this.view.getUint8(i);
      const c1 = this.view.getUint8(i + 1);
      const c2 = this.view.getUint8(i + 2);

      const c = (c2 << 16) + (c1 << 8) + c0;

      ret[i * 4] = c % 64;
      ret[i * 4 + 1] = (c >> 6) % 64;
      ret[i * 4 + 2] = (c >> 12) % 64;
      ret[i * 4 + 3] = (c >> 18) % 64;
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

    set.forEach(c => {
      const v = c.valueOf();
      if (Math.floor(v / 13) === 4) {
        jokerSetArr[v % 13]++;
      } else {
        setArr[v]++;
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

    const jokerSetStr = '0' + (str.match(regExp)[0].length - 1).toString(2).slice(-2);

    const setArr = (jokerSetStr + normalSetStr).split('').reverse().map(v => Boolean(Number(v)));

    setArr.forEach((v, i) => {
      if (v) {
        const card = new Card(i);

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

  const rankStr = (str.match(/[0-9ATJQKX]+/i) || [''])[0].toUpperCase() || '';

  const rankInt = parseInt({
    "A": '1',
    "T": '10',
    "J": '11',
    "Q": '12',
    "K": '13',
    "X": '0',
  }[rankStr] || rankStr);

  if (rankInt >= 0 && rankInt <= 13) {
    ret = rankInt;
  }

  return ret;
};

const compareUcard = (a, b) => {
  if (a.rankOf() < b.rankOf()) {
    return -1;
  }
  if (a.rankOf() > b.rankOf()) {
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

    if (arg instanceof Ucard) {
      const ucard = arg;

      value = ucard.valueOf();
    } else if (typeof arg === 'string') {
      const ucardStr = arg;

      value = parseUcard(ucardStr);
    } else if (typeof arg === 'number'){
      const ucardInt = arg;

      if (ucardInt === Infinity) {
        value = -1;
      }

      if (ucardInt > 0 && ucardInt <= 13) {
        value = arg;
      }
    } else {
    }

    super(value);
  }

  rankOf() {
    if (this.valueOf() === -1) {
      return Infinity;
    } else {
      return this.valueOf();
    }
  }

  toString() {
    const rank = this.valueOf();

    const rankStr = {
      "1": 'A',
      "11": 'J',
      "12": 'Q',
      "13": 'K',
      "0": '🃏',
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
    super(4);

    this.view = new DataView(this);

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

    this.length = arr.length;

    for (let i = 0; i < arr.length; i += 4) {
      let c = 0;

      for (let j = 7; j >= 0; j--) {
        c <<= 6;
        c += (arr[i + j] || 0).valueOf();
      }

      for (let j = 0; j < 4; j++) {
        const val = (c >> (j * 8)) & 0xff;
        this.view.setUint8(i * 3 + j, val, true);
      }
    };
  }

  shuffle() {
    return this.sort(_ => Math.random() - .5);
  }

  toArray() {
    const ret = [];

    const byteLen = this.byteLength;

    for (let i = 0; i < byteLen; i += 8) {
      let c = 0;

      for (let j = 3; j >= 0; j--) {

        c <<= 8;
        c += this.view.getUint8(i + j);
      }

      for (let j = 0; j < 4; j++) {
        ret[i * 4 + j] = (c >> (j * 6)) % 64;
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

    set.forEach(c => {
      const v = c.valueOf() + 1;

      tallyArr[v]++;
    });

    tallyArr.reverse();

    value = parseInt(tallyArr.join(''), 5);

    super(value);
  }

  toSet() {
    const ret = new Set();

    const str = ((new Array(14)).fill('0').join('') + this.valueOf().toString(5)).slice(-14);

    const setArr = str.split('').reverse().map(v => Number(v));

    setArr.forEach((len, rank) => {
      for (let i = 0; i < len; i++) {
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
