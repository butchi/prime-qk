import { SUIT, CARD_JOKER_2, UCARD_JOKER_2 } from './const.js';

import Card from './card.js';
import CardBuffer from './card-buffer.js';
import CardComb from './card-comb.js';
import CardCombArray from './card-comb-array.js'

import Ucard from './ucard.js';
import UcardBuffer from './ucard-buffer.js';
import UcardComb from './ucard-comb.js';
import UcardCombArray from './ucard-comb-array.js';

const ha = new Card(SUIT.HEART, 1);
const s3 = new Card(SUIT.SPADE, 3);
const x2 = new Card(SUIT.JOKER, 2);

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


const ba = new Ucard(1);
const bk = new Ucard(13);
const bx = new Ucard(-1);

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

let deckCardArr = Array.from(new UcardComb(UCARD_JOKER_2).toSet())

deckCardArr.sort(_ => Math.random() - .5)

deckCardArr.slice(0, 11)
deckCardArr.slice(11, 22)
deckCardArr = deckCardArr.slice(22)

const parseCardString = str => str.replace(/T/g, "10").replace(/J/g, "11").replace(/Q/g, "12").replace(/K/g, "13")

console.log(parseCardString("123456789TJQK"))

const primeDaifugoLitePrimeArr = ["2", "3", "7", "9", "11", "13", "17", "19", "1K", "23", "29", "2J", "31", "37", "3J", "3K", "41", "43", "47", "53", "59", "61", "67", "6K", "71", "73", "79", "83", "89", "8J", "97", "9J", "T1", "T3", "T7", "T9", "TK", "J3", "Q7", "QK", "K1", "K7", "K9"]
