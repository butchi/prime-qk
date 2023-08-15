export const parseCard = str => {
  let ret;

  const suitStr = (str.match(/[A-Z]+|joker/i) || [''])[0].toUpperCase() || '';
  const rankStr = (str.match(/[A1-9TJQK]$|1[0-3]$/i) || [''])[0].toUpperCase() || '';

  const suit = {
    C: 0,
    D: 1,
    H: 2,
    S: 3,
    J: 4,
    X: 4,
  }[suitStr[0]];

  const index = {
    A: 1,
    J: 11,
    Q: 12,
    K: 13,
  }[rankStr] || Number(rankStr);

  if (suit === SUIT.JOKER && index > 0 && index <= 2) {
    ret = 2 ** 6 - index;
  } else if (suit < 4 && index > 0 && index <= 13){
    ret = suit * 16 + index;
  }

  return ret;
};

export const parseCardArray = str => {
  const cardStrArr = str.split(/([CDHSX]1?[A1-9TJQK])/i).filter(str => str.length > 0);

  return cardStrArr.map(cardStr => parseCard(cardStr));
};

export const compareCard = (a, b) => {
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


export const parseUcard = str => {
  let ret = NaN;

  const char = (str.match(/[0-9ATJQKX]+/i) || [''])[0].toUpperCase() || '';

  const int = parseInt({
    A: '1',
    T: '10',
    J: '11',
    Q: '12',
    K: '13',
    X: '-1',
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

export const compareUcard = (a, b) => {
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

export const parseUcardArray = str => {
  const jokerLen = (str.toUpperCase().match(/X/g) || []).length;

  const ruleArr = str.toUpperCase().match(/\|X=[A0-9TJQK]/g);

  let cardStr = str.split('|')[0];

  for (let i = 0; i < ruleArr.length; i++) {
    const newVal = ruleArr[i].split('=')[1];

    cardStr = cardStr.replace(/X/ ,newVal);
  }

  const ucardStrArr = cardStr.split('');

  return ucardStrArr.map(ucardStr => parseUcard(ucardStr));
};


// http://blog.livedoor.jp/dankogai/archives/51854062.html
// TODO: 最大素数大富豪数まで対応
const primeBit16Arr = (sqrtmax => {
  const ret = [2];

  loop: for (let n = 3; n <= sqrtmax; n += 2) {
    for (let i = 0; i < ret.length; i++) {
      const p = ret[i];

      if (n % p === 0) continue loop;

      if (p * p > n) break;
    }
    ret.push(n);
  }

  return ret;
})(0xffff);

export const factor = n => {
  if (n < 2) return undefined;

  const ret = [];

  for (let i = 0, l = primeBit16Arr.length; i < l; i++) {
    const p = primeBit16Arr[i];

    while (n % p === 0) {
        ret.push(p);
        n /= p;
    }

    if (n === 1) return ret;
  }

  if (n !== 1) ret.push(n);

  return ret;
};

export const isPrime = n => n < 2 ? undefined : factor(n).length === 1;
