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
  const ucardStrArr = str.split('');

  return ucardStrArr.map(ucardStr => parseUcard(ucardStr));
};
