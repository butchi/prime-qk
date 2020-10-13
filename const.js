export const CARD_JOKER_2 = parseInt('\
1111111111111\
1111111111111\
1111111111111\
1111111111111\
1000', 2);

export const CARD_JOKER_1 = parseInt('\
1111111111111\
1111111111111\
1111111111111\
1111111111111\
10', 2);

export const CARD_JOKER_0 = parseInt('\
1111111111111\
1111111111111\
1111111111111\
1111111111111\
1', 2);

export const CARD_DIGIT_1 = parseInt('\
0000111111111\
0000111111111\
0000111111111\
0000111111111\
1', 2);

export const CARD_DIGIT_2 = parseInt('\
1111000000000\
1111000000000\
1111000000000\
1111000000000\
1', 2);

export const CARD_ODD = parseInt('\
1010101010101\
1010101010101\
1010101010101\
1010101010101\
1', 2);

export const CARD_EVEN = parseInt('\
0101010101010\
0101010101010\
0101010101010\
0101010101010\
1', 2);


export const UCARD_JOKER_2 = parseInt('24444444444444', 5);

export const UCARD_JOKER_1 = parseInt('14444444444444', 5);

export const UCARD_JOKER_0 = parseInt('04444444444444', 5);

export const UCARD_DIGIT_2 = parseInt('00000000004444', 5);

export const UCARD_DIGIT_1 = parseInt('04444444440000', 5);

export const UCARD_ODD = parseInt('04040404040404', 5);

export const UCARD_EVEN = parseInt('00404040404040', 5);



export const suitArr = ['club', 'diamond', 'heart', 'spade'];

export const SUIT = {};

suitArr.concat('joker').forEach((v, i) => {
  SUIT[v.toUpperCase()] = i;
});

// 0: Zero
// 1: Ace
// 2: deUce
// 3: treY
// 4: cateR
// 5: cInque
// 6: sicE
// 7: seVen
// 8: eiGht
// 9: Nine
// 10: Ten
// 11: Jack
// 12: Queen
// 13: King
export const rankArr = ['z', 'a', 'u', 'y', 'r', 'i', 'e', 'v', 'g', 'n', 't', 'j', 'q', 'k', 'o', 'x'];

export const RANK = {};

rankArr.forEach((v, i) => {
  RANK[v.toUpperCase()] = i;
});

export const CARD = {
  BLANK: 0,
  UNDEFINED: 47,
  JOKER2: 62,
  JOKER1: 63,
};

export const UCARD = {
  BLANK: 0,
  UNDEFINED: 14,
  JOKER: 15,
};
