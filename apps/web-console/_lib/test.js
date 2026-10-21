import { SUIT, CARD_JOKER_2, UCARD_JOKER_2 } from './const.js';

import card from './card.js';
import CardBuffer from './card-buffer.js';
import cardComb from './card-comb.js';
import CardCombArray from './card-comb-array.js'

import ucard from './ucard.js';
import UcardBuffer from './ucard-buffer.js';
import ucardComb, { UcardComb } from './ucard-comb.js';
import UcardCombArray from './ucard-comb-array.js';

import PrimeQkTable from './prime-qk-table.js';


const ha = card(SUIT.HEART, 1);
const s3 = card(SUIT.SPADE, 3);
const x2 = card(SUIT.JOKER, 2);

console.log(ha.render());
console.log(s3.render());
console.log(x2.render());

const cBuf = new CardBuffer([ha, s3, x2]);

console.log(cBuf.render());

const cComb = cardComb([ha, s3, x2]);
const cCombAll = cardComb(CARD_JOKER_2);

console.log(cComb.render());
console.log(cCombAll.render());

const cCombArr = new CardCombArray([cComb, cCombAll]);

console.log(cCombArr.render());


const ba = ucard(1);
const bk = ucard(13);
const bx = ucard(-1);

console.log(ba.render());
console.log(bk.render());
console.log(bx.render());

const ucBuf = new UcardBuffer([ba, bk, bx]);

console.log(ucBuf.render());

const ucComb = ucardComb([ba, bk, bx]);
const ucCombAll = ucardComb(UCARD_JOKER_2);

console.log(ucComb.render());
console.log(ucCombAll.render());

const ucCombArr = new UcardCombArray([ucComb, ucCombAll]);

console.log(ucCombArr.render());

const pQkTable = new PrimeQkTable();
pQkTable.initialize();

console.log(pQkTable.handArr.render());
