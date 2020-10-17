import { SUIT, CARD_JOKER_2, UCARD_JOKER_2 } from './const.js';

import card from './card.js';
import CardBuffer from './card-buffer.js';
import CardComb from './card-comb.js';
import CardCombArray from './card-comb-array.js'

import ucard from './ucard.js';
import UcardBuffer from './ucard-buffer.js';
import UcardComb from './ucard-comb.js';
import UcardCombArray from './ucard-comb-array.js';

import PrimeQkTable from './prime-qk-table.js';


const ha = card(SUIT.HEART, 1);
const s3 = card(SUIT.SPADE, 3);
const x2 = card(SUIT.JOKER, 2);

console.log(ha.toString());
console.log(s3.toString());
console.log(x2.toString());

const cBuf = new CardBuffer([ha, s3, x2]);

console.log(cBuf.toString());

const cComb = new CardComb([ha, s3, x2]);
const cCombAll = new CardComb(CARD_JOKER_2);

console.log(cComb.toString());
console.log(cCombAll.toString());

const cCombArr = new CardCombArray([cComb, cCombAll]);

console.log(cCombArr.toString());


const ba = ucard(1);
const bk = ucard(13);
const bx = ucard(-1);

console.log(ba.toString());
console.log(bk.toString());
console.log(bx.toString());

const ucBuf = new UcardBuffer([ba, bk, bx]);

console.log(ucBuf.toString());

const ucComb = new UcardComb([ba, bk, bx]);
const ucCombAll = new UcardComb(UCARD_JOKER_2);

console.log(ucComb.toString());
console.log(ucCombAll.toString());

const ucCombArr = new UcardCombArray([ucComb, ucCombAll]);

console.log(ucCombArr.toString());

const pQkTable = new PrimeQkTable();
pQkTable.initialize();

console.log(pQkTable.handArr.toString());
