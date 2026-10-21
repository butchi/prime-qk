# 素数大富豪 ルール仕様（実装向けMarkdown）

この文書は、公式ルールPDFと「抽象的素数大富豪」PDFをもとに、プログラムとして実装しやすい形に整理した仕様である。画像・カード図は省略し、カード、状態、関数、合法手、反則、ペナルティ、終了条件を中心に記述する。

## 0. 実装上の基本方針

- 公式ルールは人間同士のプレイを前提にしているため、「出せる」「規定通り」「反則」の区別が重要である。
- プログラムでは、まず「そもそも宣言できる組合せか」を判定し、その後で「規定通りか／反則か」を判定する。
- 場に出すカード列には順序がある。複数枚を出す場合、左から右へ順序が小さいものとして扱う。
- 山札、場、素因数場に流すカードにも順序がある。デフォルトでは、小さい順に山札の下へ追加する。
- ジョーカーの値は手番ごとに宣言される。使わないジョーカー値は暗黙に `1` としてよい。
- 平常状態では「より大きい値」を出し、革命状態では「より小さい値」を出す。

---

## 1. 用意するもの

- トランプ1組。
- 素数判定アプリまたは素数表。
- 必要に応じてタイマー。
- 必要に応じて素因数分解アプリ。

推奨プレイ人数は2〜4人。トランプを複数組用いる場合、原理的には2人以上で任意人数のプレイが可能である。

---

## 2. 役割

### 2.1 プレイヤー

各プレイヤーは手札を持ち、手番にカードを出す、山札からカードを引く、またはパスする。

### 2.2 素数判定員（ゲームマスター）

素数判定員は、出されたカードの関数値が規定通りかどうかを判定し、必要なら反則処理、カード流し、状態変更を行う。

人員が足りない場合、プレイヤーの1人が公平性を保ちながら兼任してよい。プレイヤーが3人以上いて、最初にあがったプレイヤーまたは失格したプレイヤーが素数判定員でなかった場合、そのプレイヤーが以後の素数判定員を引き継いでもよい。

---

## 3. カードと値

### 3.1 カード集合

標準ルールでは次の54枚を使う。

- A, 2, ..., 10, J, Q, K の13ランク × 4スート。
- ジョーカー2枚。

抽象化する場合、カード集合を有限集合 `T` とし、カード値写像を次のように考える。

```text
v: T -> {0, 1, ..., K} ∪ {Joker}
```

標準ルールでは `K = 13` であり、非ジョーカーは次の値を持つ。

| カード | 値 |
| --- | ---: |
| A | 1 |
| 2〜10 | 2〜10 |
| J | 11 |
| Q | 12 |
| K | 13 |
| Joker | 手番ごとに宣言 |

### 3.2 採用する内部カード表現

現行実装では、カードの低レベル表現をフランス式52枚デッキとジョーカー2枚に限定し、非標準デッキはプロファイルで拡張する。標準プロファイルは次の2つである。

| Profile | 内容 |
| --- | --- |
| `french-52-v1` | 4スート × 13ランクの52枚 |
| `french-54-v1` | `french-52-v1` に黒/赤ジョーカーを追加した54枚 |

物理カードは `CardCode6` として扱う。TypeScript実装上の型名は `CardCode` で、値域は `0..63` である。通常カードは旧 `_lib/` 実装と同じく `suitCode * 16 + rankCode` で表す。

```text
code = suitCode * 16 + rankCode
```

スートコードは次の通りである。

| suitCode | スート |
| ---: | --- |
| 0 | Clubs / C |
| 1 | Diamonds / D |
| 2 | Hearts / H |
| 3 | Spades / S |

ランクコードは次の通りである。

| rankCode | ランク |
| ---: | --- |
| 0 | invalid / reserved |
| 1 | A |
| 2〜10 | 2〜10 |
| 11 | J |
| 12 | Q |
| 13 | K |
| 14 | undefined / O |
| 15 | joker / X / -1 |

ただし、`CardCode6` の物理ジョーカーは通常カードの `rankCode = 15` ではなく、6bit空間の末尾に置く。

| code | 意味 |
| ---: | --- |
| 0 | blank / 空スロット |
| 1..13 | club A..K |
| 17..29 | diamond A..K |
| 33..45 | heart A..K |
| 47 | undefined / face-down / unknown |
| 49..61 | spade A..K |
| 62 | joker2 |
| 63 | joker1 |

`blank` はカードが存在しない空欄、`undefined` はカードは存在するが内容が不明な伏せ札、`joker` は内容が確定している特殊札である。

代表例は次の通りである。

| カード | code |
| --- | ---: |
| A♣ | `0x01` |
| Q♦ | `0x1c` |
| Q♥ | `0x2c` |
| A♠ | `0x31` |
| K♠ | `0x3d` |
| 黒ジョーカー / joker1 | `0x3f` |
| 赤ジョーカー / joker2 | `0x3e` |

実装では `src/lib/cards.ts` に `CardCode`, `Suit`, `Rank`, `DeckProfileId`, `packCard`, `suitOf`, `rankOf`, `isJokerCode`, `isStandardSuitCardCode` を定義する。`PlayingCard` は既存の表示・ゲーム処理との互換性のため `id`, `kind`, `rank`, `suit`, `color` を持ちつつ、物理カード識別用に `profile` と `code` も持つ。

旧 `_lib/` の `parseCard` / `toString` 相当の用途として、現行実装ではスート込みの物理カードトークンも扱う。`CA`, `SA`, `H10`, `HT`, `DQ`, `CK`, `X1`, `X2`, `O` などを `tokenToCardCode`, `cardCodeToToken`, `createCardFromCode`, `createCardFromToken` で相互変換する。素数大富豪の入力で使うランク列、例えば `A357TJ` とは別の層である。

スートを落としたカードは `UCardCode4` として扱う。TypeScript実装上の型名は `UCardCode` である。

| UCardCode | 意味 |
| ---: | --- |
| 0 | blank |
| 1..13 | A..K |
| 14 | undefined / O |
| 15 | joker / X / -1 |

`15` は `(-1) & 0b1111` と同じ値であり、ジョーカーを4bit世界の `-1` として扱える。現行実装では `cardCodeToUCardCode`, `packUCardCode`, `tokenToUCardCode`, `uCardCodeToToken` でこの層を扱う。

注意点として、ジョーカーの物理表現では `CardCode6 = 62` または `63` を使い、`UCardCode4` では `15` に正規化するが、素数大富豪での宣言値は物理カードから分離する。現行実装では、手番ごとの宣言値を `jokerValueByCardId` として `src/lib/ruleValues.ts` に渡す。

```ts
type PhysicalCard = {
  profile: DeckProfileId;
  code: CardCode;
};

type DeclaredCard = {
  card: PhysicalCard;
  value: number | string;
};
```

非標準デッキ、タロット、Spanish/German/Swiss系スートなどは、同じ `2bit suit + 4bit rank` に直接詰め込まない。必要になった時点で `DeckProfileId` とプロファイル固有の解釈を追加する。

### 3.3 ジョーカー値

各手番で、ジョーカー2枚の値を次のように選ぶ。

```text
jokerValues = (a, b)
a, b ∈ {0, 1, ..., 13}
```

ジョーカーを使わない場合、または1枚しか使わない場合、使わないジョーカー値は暗黙に `1` としてよい。

実装では、個々のジョーカーに一意なIDを振り、手番ごとの `jokerValueByCardId` を持つとよい。

```ts
type RankValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

type Card =
  | { id: string; kind: "normal"; suit: "club" | "diamond" | "heart" | "spade"; rankValue: RankValue }
  | { id: string; kind: "joker"; color?: "red" | "black" };
```

---

## 4. 場所（ゾーン）

プレイ中、各カードは原則として次のいずれかに属する。

### 4.1 手札

各プレイヤーが持つカード。他プレイヤーには公開しないのがデフォルトである。

### 4.2 場

プレイヤーがメインのカード列を出す場所。カードは表向きに重ねられる。

実装上は、場を「現在の場に残っている有効なプレイ列のリスト」として持つとよい。

```ts
type FieldEntry = {
  playerId: string;
  mainCards: Card[];      // 順序付き
  value: FieldValue;      // F(mainCards)
};
```

### 4.3 素因数場

合成数出しのために、メインのカード列に付随してカードを置く場所。

素因数場のカードは、判定が規定通りであれば山札へ流す。したがって、実装では永続ゾーンというより、手番中の一時的な入力として扱うとよい。

```ts
type FactorGroups = FactorToken[][];
type FactorToken = Card[]; // 1つの素因数または指数を表すカード列
```

例：

```text
[["2"], ["3"]]
```

は `2 × 3` という素因数表示を表す。

```text
[["2", "3"]]
```

は `2^3` という指数表記を表す。

```text
[["2", "3"], ["5"]]
```

は `2^3 × 5` を表す。

### 4.4 山札

手札、場、素因数場に属さないカードからなる裏向きの束。

実装では順序付き配列として持つ。

```ts
type Deck = Card[]; // deck[0] を山札の一番上とする
```

---

## 5. ゲーム状態

```ts
type GameMode = "normal" | "revolution";

type PlayerStatus = "active" | "finished" | "disqualified";

type PlayerState = {
  id: string;
  hand: Card[];
  status: PlayerStatus;
  finishOrder?: number;
  disqualifiedOrder?: number;
};

type FieldValue =
  | { kind: "finite"; value: bigint }
  | { kind: "positiveInfinity" }
  | { kind: "negativeInfinity" };

type GameState = {
  players: PlayerState[];
  turnPlayerId: string;
  mode: GameMode;
  deck: Card[];
  field: FieldEntry[];
  currentFieldValues: FieldValue[];
  consecutiveNoFieldChangeCount: number;
  settings: RuleSettings;
};
```

`currentFieldValues` は、場が流れてから現在までに規定通り出されたメイン値の列である。平常状態では新しい値はこの全てより大きく、革命状態ではこの全てより小さくなければならない。

---

## 6. 初期設定

### 6.1 デフォルト設定

| ID | 項目 | デフォルト |
| --- | --- | --- |
| D1 | ジョーカー枚数 | 2枚 |
| D2 | 偶数カードの削減 | なし |
| D3 | 場に出すカードの枚数制限 | なし、`∞` |
| D4 | 初期手札枚数 | 11枚 |
| D5 | 手番順序 | じゃんけんの勝者から時計回り |
| D6 | 考慮時間 | 1分 |
| D7 | 手番制限時間 | 1分 |
| D8 | 制限時間切れ時 | 失格 |
| D9 | 反則時の素因数分解情報公開 | なし |
| D10 | カードの流し方 | 小さい順に山札の下へ追加 |
| D11 | 1ゲームの時間 | 制限なし |
| D12 | 時間切れ・千日手時の順位 | 残り手札枚数が少ないほど上位。同数なら手番順 |
| D13 | 計算制限 | 暗算のみ。カンニング禁止 |
| D14 | あがり時の場のカード流し | なし |
| D15 | ジョーカー1枚出し | 最強 |
| D16 | ジョーカー2枚出し最強 | なし |
| D17 | あがり制限 | なし |
| D18 | 制限時間なし時の千日手 | 条件成立時に中断してD12適用 |
| D19 | 手札公開 | 非公開 |

### 6.2 設定オブジェクト例

```ts
type RuleSettings = {
  jokerCount: number;                  // D1
  removeEvenCards: false | "half";     // D2
  maxMainCards: number | "infinity";   // D3
  initialHandSize: number;             // D4
  turnOrderRule: "manual";             // D5
  considerationSeconds: number;        // D6
  turnSeconds: number;                 // D7
  timeoutAction: "disqualify" | "forcedPass"; // D8
  factorizationDisclosure: "none" | "onRequestAfterFoul" | "alwaysAfterFoul"; // D9
  flushRule: "orderedToBottom" | "shuffleFlushedToBottom" | "shuffleWithDeck"; // D10
  gameSeconds: number | null;          // D11
  timeLimitRankRule: "handCountThenTurnOrder"; // D12
  calculationPolicy: "mentalOnly";     // D13
  finishFieldFlushRule: "none" | "flush"; // D14
  singleJokerRule: "infinity" | "finite" | "both"; // D15
  doubleJokerInfinity: boolean;        // D16
  infinityFinishRule: "allowed" | "forbidden" | "foul"; // D17
  repetitionRule: "disabled" | "fourSameEmptyFieldTurns"; // D18
  openHands: boolean;                  // D19
};
```

---

## 7. 関数定義

### 7.1 `f_turn(card)`

各手番で、カードを非負整数に写す。

```ts
function fTurn(card: Card, jokerValues: Map<string, number>): number {
  if (card.kind === "normal") return card.rankValue;
  return jokerValues.get(card.id) ?? 1;
}
```

非ジョーカーは手番に依らず固定値を持つ。ジョーカーは手番ごとに `0..13` の値を持つ。

### 7.2 結合関数 `Con`

公式ルールでは十進法の結合を使う。

```text
Con(13, 8, 0, 7) = 13807
```

抽象ルールでは、十進法に限らず `b` 進法で一般化できる。

```ts
function conBase10(values: number[]): bigint {
  // values[0] must be positive.
  return BigInt(values.map(String).join(""));
}
```

注意：先頭値が `0` になるカード列は、場に出すメイン値としては定義されない。

### 7.3 メイン値 `F(cards)`

`F` は、場に出すメインカード列の値である。

デフォルトでは、ジョーカー1枚出しを最強として扱う。

```ts
function evalMain(
  cards: Card[],
  jokerValues: Map<string, number>,
  mode: GameMode,
  settings: RuleSettings
): FieldValue | null {
  if (cards.length === 0) return null;
  if (settings.maxMainCards !== "infinity" && cards.length > settings.maxMainCards) return null;

  const isSingleJoker = cards.length === 1 && cards[0].kind === "joker";
  if (isSingleJoker && settings.singleJokerRule === "infinity") {
    return mode === "normal" ? { kind: "positiveInfinity" } : { kind: "negativeInfinity" };
  }

  const values = cards.map(card => fTurn(card, jokerValues));
  if (values[0] <= 0) return null;
  return { kind: "finite", value: conBase10(values) };
}
```

実装方針としては、革命状態のジョーカー1枚出しを `negativeInfinity` として扱うと比較が容易である。公式ルールの表現では「革命状態時は∞を任意の整数より小さいものとする」と読むことができる。

### 7.4 素因数場用の値 `G(cards)`

`G` は、素因数場に置く1つのカード列の値である。

`G` は有限の2以上の整数でなければならない。

```ts
function evalFactorToken(cards: Card[], jokerValues: Map<string, number>, settings: RuleSettings): bigint | null {
  const value = evalMain(cards, jokerValues, "normal", {
    ...settings,
    singleJokerRule: "finite"
  });

  if (!value || value.kind !== "finite") return null;
  if (value.value < 2n) return null;
  return value.value;
}
```

素因数場では、1や∞を値に持つカード列は使えない。

---

## 8. 比較規則

### 8.1 平常状態

場が空なら、`F(cards)` が定義される任意のカード列を出せる。

場が空でないなら、次を満たす必要がある。

- 直前に有効に出されたメインカード列と同じ枚数である。
- `F(new)` が現在の場の全ての値より大きい。

### 8.2 革命状態

場が空なら、平常状態と同様に `F(cards)` が定義される任意のカード列を出せる。

場が空でないなら、次を満たす必要がある。

- 直前に有効に出されたメインカード列と同じ枚数である。
- `F(new)` が現在の場の全ての値より小さい。

### 8.3 比較関数

```ts
function compareFieldValue(a: FieldValue, b: FieldValue): -1 | 0 | 1 {
  const rank = (x: FieldValue): bigint => {
    if (x.kind === "negativeInfinity") return -10n ** 1000000n;
    if (x.kind === "positiveInfinity") return 10n ** 1000000n;
    return x.value;
  };
  const ra = rank(a);
  const rb = rank(b);
  return ra < rb ? -1 : ra > rb ? 1 : 0;
}
```

実際には巨大な番兵値ではなく、分岐で `±Infinity` を比較する実装が望ましい。

---

## 9. 手番でできること

手番プレイヤーは、制限時間内にジョーカー値を定義したうえで、次を行える。

1. 山札がある場合、山札の一番上から1枚引く。
2. 手札からカードを場、および必要なら素因数場に出す。
3. パスする。

制約：

- 1手番内で、各行為は高々1回だけ行える。
- 先に山札から引いてから、カードを出す、またはパスすることはできる。
- カードを出す、またはパスすると宣言した後に山札から引くことはできない。
- 時間切れ時のデフォルト処理は失格である。

---

## 10. 宣言できる手かどうか

カードを場に出す宣言は、まず「宣言可能性」を判定する。

### 10.1 宣言可能なメイン出し

次を全て満たす場合、メイン出しは宣言可能である。

- 出すカードが手番プレイヤーの手札に存在する。
- 同じカードを重複して使っていない。
- `F(mainCards)` が定義される。
- 場が空でない場合、直前の有効メイン出しと枚数が同じ。
- 場が空でない場合、平常状態では現在の場の全値より大きい。
- 場が空でない場合、革命状態では現在の場の全値より小さい。

### 10.2 宣言可能な素因数場

素因数場にカードを出す場合、次を満たす必要がある。

- 素因数場に使う全カードが手番プレイヤーの手札に存在する。
- メイン出しのカードと重複していない。
- 素因数場内でも同じカードを重複して使っていない。
- 素因数場の各 `FactorToken` について `G(token)` が定義される。

### 10.3 「出せない」と「反則」の違い

プログラムでは、宣言可能でない組合せはUI上で出せないようにするのが望ましい。

アナログ実戦で宣言可能でない組合せを誤って出した場合、それは原則として「反則」ではない。素数判定員が指摘し、カードを出す宣言を無効化し、もう一度「出す」または「パス」を宣言できる。

例：場が空のとき、A単体は `F(A)=1` が定義されるので宣言可能だが、1は素数でも合成数でもなく、57でも1729でも∞でもないため、規定通りではなく反則になる。

---

## 11. カードの出し方の種類

宣言可能なメイン出しについて、次のいずれかに該当すれば規定通りである。いずれにも該当しなければ反則である。

### 11.1 素数出し

```text
F(mainCards) is prime or infinity
factorGroups is empty
```

有限値の場合、`F(mainCards)` は素数でなければならない。

ジョーカー1枚出しが最強ルールの場合、ジョーカー1枚の `∞` も素数出しとして扱う。

### 11.2 グロタンカット

```text
F(mainCards) = 57
factorGroups is empty
```

効果：場のカードを流し、同じプレイヤーが連続で手番を持つ。

### 11.3 ラマヌジャン革命

```text
F(mainCards) = 1729
factorGroups is empty
```

効果：平常状態なら革命状態へ、革命状態なら平常状態へ変更する。手番は次のプレイヤーへ移る。

### 11.4 合成数出し

```text
F(mainCards) is composite
factorGroups is not empty
```

合成数出しでは、素因数場を次の構造として評価する。

```ts
type FactorGroups = FactorToken[][];
type FactorToken = Card[];
```

各グループ `group = [token0, token1, ..., tokenK]` は次の値を表す。

```text
G(token0) ^ (G(token1) ^ (... ^ G(tokenK)))
```

指数は右結合で評価する。`token0` は素数でなければならない。指数部の `token1..tokenK` は、`G` が定義される2以上の有限整数であればよく、素数である必要はない。

全体として次が成立すれば、合成数出しは規定通りである。

```text
F(mainCards) = Π groupValue(group)
```

ここで、`Π` は全グループの積である。

例：

```text
F(mainCards) = 72
factorGroups = [[2, 3], [3, 2]]
```

これは次を意味する。

```text
72 = 2^3 × 3^2
```

補足：57および1729は合成数なので、素因数場を使って合成数出しすることもできる。ただし、その場合は「グロタンカット」または「ラマヌジャン革命」ではなく、通常の合成数出しとして扱う。

---

## 12. 判定後の処理

### 12.1 規定通りだった場合

素数判定員の判定で規定通りなら、素因数場に出されたカードを山札へ流す。その後、出し方に応じて処理する。

| 出し方 | 場の処理 | 状態 | 次の手番 |
| --- | --- | --- | --- |
| 素数出し（有限素数） | メインカードは場に残る | 変化なし | 次のプレイヤー |
| 素数出し（∞） | 場を流す | 変化なし | 同じプレイヤー |
| グロタンカット | 場を流す | 変化なし | 同じプレイヤー |
| ラマヌジャン革命 | メインカードは場に残る | 平常/革命を反転 | 次のプレイヤー |
| 合成数出し | メインカードは場に残る | 変化なし | 次のプレイヤー |

### 12.2 場が流れるとき

場が流れると、次を行う。

- 場のカードを山札へ移動する。
- `field` を空にする。
- `currentFieldValues` を空にする。
- `consecutiveNoFieldChangeCount` を0に戻す。

### 12.3 素因数場が流れるとき

規定通りのカード出しで素因数場にカードがある場合、素因数場のカードは山札に流す。

素因数場カードは、場のメインカードとは別に流れる。メインカードは、カットや∞などで場が流れる場合を除き、場に残る。

---

## 13. パス

手番プレイヤーがパスした場合、通常は次のプレイヤーに手番を移す。

ただし、現在の場が変化しない状態、すなわちパスまたは反則が、現在のアクティブプレイヤー数を `n` としたとき `n - 1` 回連続した場合、場のカードを流す。その後、次のプレイヤーへ手番を移す。

実装では次のように扱うとよい。

```ts
if (action.type === "pass") {
  state.consecutiveNoFieldChangeCount += 1;
  if (state.field.length > 0 && state.consecutiveNoFieldChangeCount >= activePlayerCount(state) - 1) {
    flushField(state);
  }
  advanceTurn(state);
}
```

---

## 14. 反則とペナルティ

### 14.1 反則になる場合

宣言可能なカード出しであるにもかかわらず、次のいずれの出し方にも該当しない場合、反則である。

- 素数出し。
- グロタンカット。
- ラマヌジャン革命。
- 合成数出し。

例：

- `F(mainCards)=1`。
- `F(mainCards)` が合成数なのに素因数場が空。
- 素因数場の表示が値の素因数分解として正しくない。
- 素数出しなのに素因数場にもカードを出した。

### 14.2 山札が足りる場合のペナルティ

反則時、出したカードの総数を `n` とする。

```text
n = mainCards.length + totalFactorCards.length
```

山札が `n` 枚以上ある場合：

1. 反則したプレイヤーが出した全カードを手札に戻す。
2. 反則したプレイヤーは山札の上から `n` 枚引き、手札に加える。
3. 反則したプレイは場に追加されない。
4. 以前からの場はそのまま残る。
5. 反則は「場が変化しない手」としてカウントする。
6. 次のプレイヤーへ手番を移す。

### 14.3 山札が足りない場合のペナルティ

山札が `m` 枚しかなく、`m < n` の場合：

1. 反則したプレイヤーは山札の残り `m` 枚を全て引く。
2. 反則したプレイヤー以外の全プレイヤーは、各自 `n - m` 枚のカードを手札から選ぶ。
3. 手札が `n - m` 枚未満のプレイヤーは、手札全てを選ぶ。
4. 各プレイヤーは選んだカードの順序を自由に決める。
5. 手番順に、それらのカードを山札へ流す。
6. 反則したプレイは場に追加されない。
7. 以前からの場はそのまま残る。ただし、パス・反則連続条件を満たす場合は場が流れる。
8. 次のプレイヤーへ手番を移す。

この処理により手札がなくなったプレイヤーは、その時点であがりとなる。

---

## 15. あがり

プレイヤーがカードを場および素因数場に出した結果、手札がなくなった場合、素数判定員の判定で反則でなければあがりとなる。

また、反則時に山札が不足した場合のペナルティによって、反則者以外のプレイヤーの手札がなくなった場合も、そのプレイヤーはあがりとなる。

あがったプレイヤーは以後のプレイヤーから抜ける。あがった後に2人以上のアクティブプレイヤーが残っていればゲームを続ける。

D14のデフォルトでは、あがり時に場のカードは流さない。

D17のデフォルトでは、∞によるあがりも制限しない。設定により、∞によるあがりを禁止または反則にしてもよい。

---

## 16. ゲーム終了と順位

### 16.1 通常終了

プレイヤーが順にあがる、または失格し、残りのアクティブプレイヤーが1人になった時点でゲーム終了。

順位は次のように決める。

1. あがった順に上位。
2. 最後に残った1人は、時間切れによって失格したプレイヤーを除いた中で最下位。
3. 失格者は、最後に残ったプレイヤーの次から数える。
4. 失格者同士では、失格した逆順、つまり後に失格した者ほど上位。

### 16.2 ゲーム時間による中断

D11でゲーム時間を設定している場合、時間経過時点でゲームを中断する。

D12のデフォルト順位は次の通り。

1. 素数判定員の判定中に時間に達した場合、その判定は行う。
2. まだあがっていないプレイヤーは、最後にあがったプレイヤーの次から順位を付ける。
3. 残り手札枚数が少ないプレイヤーほど上位。
4. 残り手札枚数が同じなら手番順で上位を決める。
5. 失格者はその後に順位付けする。

### 16.3 千日手

D11でゲーム時間を設けていない場合、次の条件が成立したらゲームを中断し、D12に従って順位を決める。

- 場にカードが出ていない。
- プレイヤー人数が変わっていない。
- 各プレイヤーの手札が変わっていない。
- 同一プレイヤーの手番が4回回ってきた。

---

## 17. カードの流し方

D10のデフォルトでは、場または素因数場にあるカードの順序について、小さいものから順に山札の下へ裏向きに追加する。

実装では次の3モードを用意するとよい。

| モード | 処理 |
| --- | --- |
| `orderedToBottom` | 流すカードを順序通りに山札の下へ追加 |
| `shuffleFlushedToBottom` | 流すカードだけをシャッフルして山札の下へ追加 |
| `shuffleWithDeck` | 流すカードと山札全体を合わせてシャッフルし、新しい山札にする |

---

## 18. 手番順

### 18.1 デフォルト

じゃんけんで勝者1名を決め、そのプレイヤーから時計回りに手番を回す。

実装では、アクティブプレイヤー配列を順序付きで持ち、次のアクティブプレイヤーへ進める。

```ts
function nextActivePlayerId(state: GameState, fromPlayerId: string): string {
  const active = state.players.filter(p => p.status === "active");
  const i = active.findIndex(p => p.id === fromPlayerId);
  return active[(i + 1) % active.length].id;
}
```

### 18.2 追加ルール：カード提示による順序決定

追記ルールとして、各プレイヤーが手札から1枚を選び、素数判定員の合図で一斉に出す方法がある。

- カードの関数値が最大のプレイヤーから時計回り。
- ジョーカーの値は∞とする。
- 最大値が複数いる場合、スート順で決める。
- スート順は `spade > heart > diamond > club`。
- ジョーカー同士は `black > red`。
- 出したカードは全て合わせてよく切ってから山札の一番下へ加える。
- 手札11枚でプレイするなら、最初に12枚配ったうえでこの決定方法を使うとよい。

---

## 19. セットアップ手順

1. 設定 `RuleSettings` を決める。
2. 使用カード集合を作る。
3. D2に従ってカードを削減する。
4. 山札をシャッフルする。
5. 各プレイヤーにD4で指定された枚数だけ配る。
6. 残りを山札とする。
7. D5に従って手番順を決める。
8. ゲーム状態を平常状態で開始する。
9. D6の考慮時間を取る。
10. 最初の手番プレイヤーからゲームを開始する。

初期状態：

```ts
const initialState: GameState = {
  players,
  turnPlayerId: firstPlayerId,
  mode: "normal",
  deck,
  field: [],
  currentFieldValues: [],
  consecutiveNoFieldChangeCount: 0,
  settings
};
```

---

## 20. 手番解決アルゴリズム

### 20.1 入力アクション

```ts
type TurnAction =
  | {
      type: "play";
      drawFirst: boolean;
      jokerValues: Map<string, number>;
      mainCards: Card[];
      factorGroups: FactorGroups;
    }
  | {
      type: "pass";
      drawFirst: boolean;
      jokerValues: Map<string, number>;
    };
```

### 20.2 概略

```ts
function resolveTurn(state: GameState, action: TurnAction): GameState {
  // 1. 手番プレイヤー確認
  // 2. 必要なら山札から1枚引く
  // 3. passならパス処理
  // 4. playなら宣言可能性を検査
  // 5. 宣言不可なら、UIでは拒否。アナログ扱いなら宣言無効
  // 6. 宣言可能なら出し方を分類
  // 7. 規定通りなら通常解決
  // 8. 反則ならペナルティ
  // 9. あがり・失格・ゲーム終了を判定
  // 10. 次の手番を決める
}
```

---

## 21. 出し方分類アルゴリズム

```ts
type PlayClass =
  | { kind: "prime"; value: FieldValue }
  | { kind: "grotanCut"; value: bigint }
  | { kind: "ramanujanRevolution"; value: bigint }
  | { kind: "composite"; value: bigint }
  | { kind: "foul"; reason: string };
```

分類手順：

```ts
function classifyPlay(mainValue: FieldValue, factorGroups: FactorGroups): PlayClass {
  if (mainValue.kind !== "finite") {
    return factorGroups.length === 0
      ? { kind: "prime", value: mainValue }
      : { kind: "foul", reason: "infinity cannot have factor field" };
  }

  const n = mainValue.value;

  if (factorGroups.length === 0) {
    if (isPrime(n)) return { kind: "prime", value: mainValue };
    if (n === 57n) return { kind: "grotanCut", value: n };
    if (n === 1729n) return { kind: "ramanujanRevolution", value: n };
    return { kind: "foul", reason: "finite non-prime without valid special rule or factorization" };
  }

  if (!isComposite(n)) {
    return { kind: "foul", reason: "factor field requires composite main value" };
  }

  const product = evalFactorGroups(factorGroups);
  if (product === n) return { kind: "composite", value: n };
  return { kind: "foul", reason: "factorization does not match main value" };
}
```

`evalFactorGroups` では、各グループの先頭値が素数であることを検査し、指数塔を右結合で計算する。

```ts
function evalFactorGroups(groups: bigint[][]): bigint | null {
  let product = 1n;

  for (const group of groups) {
    if (group.length === 0) return null;
    if (!isPrime(group[0])) return null;

    let groupValue: bigint;
    if (group.length === 1) {
      groupValue = group[0];
    } else {
      const exponent = evalRightAssociatedPowerTower(group.slice(1));
      groupValue = group[0] ** exponent;
    }
    product *= groupValue;
  }

  return product;
}
```

巨大数になるため、実装では指数塔の途中で `mainValue` を超えたら打ち切るとよい。

---

## 22. 規定通りのプレイ解決

### 22.1 有限素数出し

```ts
field.push({ playerId, mainCards, value });
currentFieldValues.push(value);
flushFactorCardsIfAny();
checkFinish(playerId);
turnPlayerId = nextActivePlayerId(state, playerId);
consecutiveNoFieldChangeCount = 0;
```

### 22.2 ∞出し

```ts
field.push({ playerId, mainCards, value });
currentFieldValues.push(value);
flushFactorCardsIfAny();
checkFinish(playerId);
flushField();
turnPlayerId = playerId; // 同じプレイヤー
```

あがり制限D17で∞あがりを禁止または反則にしている場合は、`checkFinish` の前に設定を適用する。

### 22.3 グロタンカット

```ts
field.push({ playerId, mainCards, value: 57 });
currentFieldValues.push(57);
flushFactorCardsIfAny(); // 原則空
checkFinish(playerId);
flushField();
turnPlayerId = playerId;
```

### 22.4 ラマヌジャン革命

```ts
field.push({ playerId, mainCards, value: 1729 });
currentFieldValues = [{ kind: "finite", value: 1729n }];
flushFactorCardsIfAny(); // 原則空
checkFinish(playerId);
mode = mode === "normal" ? "revolution" : "normal";
turnPlayerId = nextActivePlayerId(state, playerId);
consecutiveNoFieldChangeCount = 0;
```

抽象定義では、ラマヌジャン革命後の比較基準は1729のみになるように扱われる。実装でも `currentFieldValues` を `[1729]` にリセットするのが扱いやすい。

### 22.5 合成数出し

```ts
field.push({ playerId, mainCards, value });
currentFieldValues.push(value);
flushFactorCardsIfAny();
checkFinish(playerId);
turnPlayerId = nextActivePlayerId(state, playerId);
consecutiveNoFieldChangeCount = 0;
```

---

## 23. 抽象的素数大富豪との対応

抽象的素数大富豪では、ルールを次のように一般化している。

| 抽象記号 | 実装での意味 |
| --- | --- |
| `T` | カード集合 |
| `v: T -> S` | カードの基本値写像 |
| `P = {1, ..., N}` | プレイヤー集合 |
| `s(x)` | 次プレイヤー関数 |
| `M` | 場に出せるメインカード枚数上限 |
| `b` | 結合関数の基数。公式ルールでは10 |
| `H_x^(n)` | n手目後のプレイヤーxの手札 |
| `D^(n)` | n手目後の山札 |
| `F^(n)` | n手目後の場 |
| `PF^(n)` | n手目の素因数場 |
| `V^(n)` | 現在の場に対応する値集合 |
| `t(n) = (player, ±1)` | n手目の手番プレイヤーと平常/革命状態 |
| `f_x^(n)` | n手目・プレイヤーxにおけるカード値関数 |
| `Con` | カード値列の結合関数 |
| `F_x^(n)` | メインカード列の評価関数 |
| `G_x^(n)` | 素因数場カード列の評価関数 |

標準の「通常N人ゲーム」は、54枚デッキ、非ジョーカー値1〜13が各4枚、ジョーカー2枚、`M=∞`、`b=10` として表せる。

---

## 24. 実装時の注意点

### 24.1 BigIntを使う

カードを多数結合すると非常に大きな整数になるため、JavaScript/TypeScriptでは `number` ではなく `bigint` を使う。

### 24.2 素数判定

数が大きくなるため、実用実装では Miller-Rabin などの確率的素数判定、または外部ライブラリを使うとよい。

### 24.3 指数塔の打ち切り

合成数出しの検査では、指数塔により値が急増する。比較対象の `F(mainCards)` を超えた時点で計算を打ち切る最適化が有効である。

### 24.4 UIでは宣言不可手を出せないようにする

アプリ実装では、`F` や `G` が未定義の組合せ、枚数不一致、比較条件不一致などはそもそも選択不可にするのがよい。

### 24.5 「場の全値」と「直前値」

通常プレイでは値が単調に増減するため、直前値だけを比較しても同じ結果になることが多い。ただし、抽象定義に合わせるなら、現在の場に残っている全値に対して、平常なら全てより大きい、革命なら全てより小さい、と判定する。

### 24.6 失格とあがり後の手番

あがりまたは失格でアクティブプレイヤーから除外された場合、次の手番は残りのアクティブプレイヤーの順序で決める。

### 24.7 公開・非公開情報

抽象定義では公開・非公開を扱わない。公式ルールのデフォルトでは手札は非公開である。アプリ実装では、状態として全情報を持ちつつ、各プレイヤーに見せるビューを分けるとよい。

---

## 25. 実装ステータスとTODO

この節は、2026-07-09時点のリポジトリ実装を確認して更新した作業用チェックリストである。

主な確認対象は、READMEで再利用可能ロジックの境界として説明されている `src/lib` 配下である。Vue側には旧実装の `src/composables/useGameState.ts` / `src/composables/useGameLogic.ts` も残っているが、現時点では `src/lib` と同等の簡易ルール実装であり、公式ルール全体を扱う状態モデルにはなっていない。

### 25.1 現在実装済み

- [x] カードIDを一意に管理している。
  - `src/lib/cards.ts` の通常カードIDは `suit-rank` 形式で一意。
  - ジョーカーIDは `joker-black`, `joker-red` 形式で一意。
  - 物理カード識別用に、`profile` と6-bit相当の `code` も持つ。
  - 旧 `_lib/` の文字列表現を踏まえ、`CA`, `SA`, `H10`, `X1`, `O` などの物理カードトークンと `CardCode` を相互変換できる。
  - スートを落とした `UCardCode4` として、`0 = blank`, `14 = undefined`, `15 = joker / -1` も扱える。
- [x] 標準ランク `A=1`, `2..10`, `J=11`, `Q=12`, `K=13` を扱える。
  - `src/lib/cards.ts` の `rankToToken` / `tokenToRank` でCLI入出力用トークンを実装済み。
- [x] 4スート13ランクの通常カードデッキを生成できる。
  - `src/lib/cards.ts` の `generateDeck`。
  - `generateDeck({ jokerCount: 2 })` で標準ルールの54枚デッキを生成できる。
  - `generateDeck({ profile: "french-54-v1" })` でも54枚デッキを生成できる。
- [x] D2の簡易版として偶数カード削減を扱える。
  - `generateDeck({ evenReduceSize })` と `createPrimeDaifugoGame({ evenReduceSize })` で対応済み。
  - TODO: 公式ルールの設定名・挙動に合わせて `RuleSettings.removeEvenCards` へ整理する。
- [x] 山札をシャッフルできる。
  - `src/lib/cards.ts` の `shuffleDeck`。
- [x] 初期手札枚数を指定して配れる。
  - `src/lib/primeDaifugo.ts` の `createPrimeDaifugoGame({ initialHandSize })`。デフォルトは11枚。
- [x] 手札、山札、場の基本的なカード移動ができる。
  - 配札、ドロー、通常のカード出し、場流しを実装済み。
  - TODO: 素因数場、反則時の戻し、山札不足ペナルティ、あがり後の除外まで含めたゾーン不変条件の検査を追加する。
- [x] メインカード列を十進結合した値として評価できる。
  - 簡易ゲーム用には `src/lib/cards.ts` の `v(card)`, `con(values)`, `evalF(cards)` で実装済み。
  - 公式ルール用には `src/lib/ruleValues.ts` の `fTurn(card)`, `conBase10(values)`, `evalMain(cards)` で `bigint` / `FieldValue` 対応済み。
  - TypeScriptの命名規約に合わせ、仕様上の `v`, `Con`, `F` をそれぞれ `v`, `con`, `evalF` としている。
  - `cardsToNumber(cards)` は既存呼び出し互換のため、`evalF` のエイリアスとして残している。
  - 公式ルール用の `evalMain(cards)` は、ジョーカー値と単体ジョーカー `∞` に対応済み。
- [x] 有限値の素数判定ができる。
  - `src/lib/primes.ts` の `isPrime(n: number)`。
  - TODO: 多枚数出しに耐える `bigint` 対応の素数判定へ置き換える。
- [x] 平常状態の「場より大きい」比較を実装している。
  - `src/lib/primeDaifugo.ts` の `isValidPlay` / `validatePlay` は、旧UI/CLI互換の入口を保ちながら `src/lib/ruleValues.ts` の `validateOfficialPlay` を参照している。
  - 公式ルール用には `src/lib/ruleValues.ts` の `canPlayOnCurrentField` / `validateOfficialPlay` で、現在の場の全値との比較、革命時の「より小さい」比較、`FieldValue` の `±Infinity` 比較を実装済み。
- [x] 場が空でない場合の同じ枚数縛りを実装している。
  - `isValidPlay` / `validatePlay` で確認済み。
- [x] 有限素数出しを通常手として出せる。
  - `validatePlay` は `validateOfficialPlay` の結果を旧UI/CLI向けメッセージに変換し、`playCards` が場へ追加する。
  - TODO: 「宣言可能性」と「規定通り/反則」の二段階判定に分離する。
- [x] 1手番に1回だけドローする制約がある。
  - `hasDrawn` で同一手番内の再ドローを拒否している。
  - TODO: ドロー後に「出す/パス」は可能、出す/パス後にドロー不可、という手番アクション全体の状態機械として整理する。
- [x] パス操作がある。
  - `passTurn` でパスを記録し、次プレイヤーへ進める。
  - TODO: 公式仕様の「パスまたは反則がアクティブ人数 `n - 1` 回連続したら場を流す」へ修正する。
- [x] 場流し処理がある。
  - `clearField` で場のカードを山札へ戻し、場を空にする。
  - 公式ルール用には `src/lib/ruleState.ts` の `flushField` / `flushCardsToDeck` で、D10の `flushRule` と順序制御を実装済み。
  - TODO: 旧 `clearField` を公式ルール用の状態遷移へ統合する。
- [x] 次プレイヤーへの手番移動がある。
  - `moveToNextPlayer` で配列順に進める。
  - TODO: あがり・失格したプレイヤーを除外した `nextActivePlayerId` にする。
- [x] 2人ゲームで、最初に手札がなくなったプレイヤーを勝者にできる。
  - `winnerId` を設定して終了する。
  - TODO: 多人数のあがり順、最後の1人、失格者、時間切れ/千日手を含む順位決定を実装する。
- [x] CPUが簡易的に有限素数出しを選べる。
  - `cpuSelectPlay` / `playCpuTurn`。
  - TODO: 57、1729、合成数出し、ジョーカー、革命状態、反則リスクを考慮する。
- [x] CLIからドロー、パス、カード出しができる。
  - `src/cli.ts`。
  - TODO: ジョーカー値入力、素因数場入力、設定入力を追加する。
- [x] 実装済みの簡易ルールに対するテストがある。
  - `test/cards.test.ts`, `test/primes.test.ts`, `test/primeDaifugo.test.ts`。
  - 現状は通常カード、ジョーカー生成、有限値 `F`、素因数場用の `G`、素因数場グループ、出し方分類、ジョーカー値、単体ジョーカー `∞`、有限素数判定、通常プレイ、ドロー、パス、簡易CPUを対象にしている。
  - TODO: 公式ルールエンジンを追加するたびに、対応するルール単位のテストを追加する。

### 25.2 未実装TODO

- [x] 公式ルール全体の状態型を導入する。
  - `src/lib/ruleState.ts` に `GameMode`, `PlayerStatus`, `PlayerState`, `FieldEntry`, `FieldValue`, `RuleSettings`, `GameState` を定義済み。
  - `GameState` は `currentFieldValues` と `consecutiveNoFieldChangeCount` を持つ。
  - `defaultRuleSettings` と `createGameState` で初期状態を作れる。
- [x] D1 ジョーカーをデッキへ追加する。
  - `src/lib/cards.ts` の `generateDeck({ jokerCount: 2 })` で、通常52枚に黒/赤ジョーカーを追加して54枚にできる。
  - 既存のブラウザ版/CLI版は互換性のため、明示しない限りジョーカー0枚のまま。
- [x] ジョーカー値を手番ごとに `0..13` で設定できるようにする。
  - `src/lib/ruleValues.ts` の `fTurn(card, jokerValueByCardId)` で対応済み。
  - 未指定のジョーカー値は仕様通り `1` として扱う。
- [x] ジョーカー1枚出しを `∞` として扱う。
  - `evalMain(cards, { mode })` で、平常状態では `positiveInfinity`、革命状態では `negativeInfinity` を返す。
  - `singleJokerRule: "finite"` の場合は、宣言されたジョーカー値で有限値として評価できる。
- [ ] TODO: D16 ジョーカー2枚出し最強オプションを実装する。
- [ ] TODO: D17 `∞` あがり制限を実装する。
  - `allowed` / `forbidden` / `foul` の分岐が必要。
  - `∞` 出し自体の場流し解決処理は `src/lib/ruleState.ts` の `resolveInfinityPlay` で実装済み。
- [x] `F(mainCards)` を `bigint` / `FieldValue` 対応で実装する。
  - `src/lib/ruleValues.ts` の `evalMain(cards)` で、空配列、枚数上限、先頭0、ジョーカー値、`bigint` の有限値、単体ジョーカー `∞` を扱う。
  - TODO: `singleJokerRule: "both"` の扱いを、UI入力または手番アクションの選択として表現する。
- [x] `G(factorToken)` を実装する。
  - `src/lib/ruleValues.ts` の `evalFactorToken(cards)` で、素因数場用に2以上の有限値のみ許可する。
  - 単体ジョーカーは `∞` ではなく、宣言された有限値として評価する。
- [x] `compareFieldValue` を実装する。
  - `src/lib/ruleValues.ts` で、有限値、`positiveInfinity`、`negativeInfinity` を番兵値なしで比較する。
  - 有限値、`positiveInfinity`、`negativeInfinity` を分岐で比較する。
- [x] 革命状態の基本処理を実装する。
  - 革命時の小さい値比較は `src/lib/ruleValues.ts` の `canPlayOnCurrentField` / `validateOfficialPlay` で実装済み。
  - ラマヌジャン革命による平常/革命の切り替え、`currentFieldValues = [1729]` へのリセット、次アクティブプレイヤーへの手番移動は `src/lib/ruleState.ts` の `resolveRamanujanRevolution` で実装済み。
  - 旧UI/CLI互換の `src/lib/primeDaifugo.ts` でも `mode` と `currentFieldValues` を持ち、ブラウザ操作からラマヌジャン革命後の比較条件が反映される。
- [x] 現在の場の全値に対する比較を実装する。
  - `src/lib/ruleValues.ts` の `canPlayOnCurrentField` / `validateOfficialPlay` で、`currentFieldValues` 全体に対して平常時は全値より大きい、革命時は全値より小さいことを確認する。
- [ ] TODO: 宣言可能性チェックを独立させる。
  - 手札存在、カード重複、メイン/素因数場の重複、枚数縛り、比較条件を検査する。
- [ ] TODO: 「出せない」と「反則」を分離する。
  - 現状は不正な手をUI/APIで拒否するだけで、反則として解決しない。
- [x] 出し方分類 `classifyPlay` を実装する。
  - `src/lib/ruleValues.ts` で `prime`, `grotanCut`, `ramanujanRevolution`, `composite`, `foul` を返す。
- [x] グロタンカットを分類できる。
  - `F(mainCards)=57` かつ素因数場なしで、`grotanCut` に分類する。（追加設定可能）
  - `src/lib/ruleState.ts` の `resolveGrotanCut` で、場を流して同じプレイヤーが続ける解決処理を実装済み。
  - `src/lib/primeDaifugo.ts` 経由のブラウザ/CLI操作でも、57を出すと場を流して同じプレイヤーが続く。
- [x] ラマヌジャン革命を分類できる。
  - `F(mainCards)=1729` かつ素因数場なしで、`ramanujanRevolution` に分類する。（追加設定可能）
  - `src/lib/ruleState.ts` の `resolveRamanujanRevolution` で、平常/革命を反転する解決処理を実装済み。
  - `src/lib/primeDaifugo.ts` 経由のブラウザ/CLI操作でも、1729を出すと革命状態へ切り替わる。
- [x] 合成数出しを分類できる。
  - メイン値が合成数、素因数場あり、積が一致する場合に `composite` に分類する。
  - `src/lib/ruleState.ts` の `resolveOfficialPlay` で、合成数出しの解決処理を実装済み。
- [x] 合成数出しの指数表記を実装する。
  - `src/lib/ruleValues.ts` の `evalFactorGroup`, `evalFactorGroups`, `evalRightAssociatedPowerTower` で実装済み。
  - グループ内指数塔は右結合で評価し、先頭値だけ素数性を要求する。
- [x] 巨大な合成数検査の打ち切りを実装する。
  - `evalFactorGroups(groups, { limit })` で、指数塔や積が `limit` を超えた時点で `null` を返す。
- [x] 素因数場カードのゾーンを実装する。
  - `resolveOfficialPlay` の手番入力 `factorGroups` として受け取り、規定通りなら山札へ流す。
- [x] 素因数場カードの流し方を実装する。
  - `flushFactorCards` で、メイン場とは別にD10の流し方に従って山札へ移動する。
- [ ] TODO: 反則ペナルティを実装する。
  - 山札が足りる場合は、出した総カード枚数と同数を反則者が引く。
- [ ] TODO: 山札不足時の反則ペナルティを実装する。
  - 他プレイヤーが不足分を手札から選び、手番順に山札へ流す。
- [ ] TODO: 反則を「場が変化しない手」としてカウントする。
  - パスと合わせて `consecutiveNoFieldChangeCount` で管理する。
- [x] 規定通りの出し方ごとの手番解決を実装する。
  - `∞`、グロタンカット、ラマヌジャン革命、有限素数、合成数の解決処理を実装済み。
  - `resolveOfficialPlay` で、評価・分類後に各解決処理を選択する統合入口を実装済み。
- [x] あがり後にプレイヤーをアクティブ対象から除外する。
  - `finishPlayerIfHandEmpty` で手札が空になったアクティブプレイヤーを `finished` にし、`finishOrder` を記録する。
  - `resolveOfficialPlay` 経由のあがり後は、`turnPlayerId` が残りのアクティブプレイヤーを指すよう補正する。
- [x] 失格を実装する。
  - `disqualifyPlayer` でアクティブプレイヤーを `disqualified` にし、`disqualifiedOrder` を記録する。
  - `resolveTurnTimeout` でデフォルトの時間切れ処理を失格として解決する。
  - 失格後は `turnPlayerId` が残りのアクティブプレイヤーを指すよう補正する。
- [x] 通常終了と順位決定を実装する。
  - `isNormalGameOver` で、残りアクティブプレイヤーが1人以下かを判定する。
  - `getNormalGameResult` で、あがり順、最後のアクティブプレイヤー、失格者の逆順として順位を返す。
- [x] D11ゲーム時間による中断を実装する。
  - `GameState.gameStartedAtMs` と `RuleSettings.gameSeconds` から経過秒を計算する。
  - `resolveGameTimeLimit` で、設定時間に達したら `gameTimeLimit` 中断を返す。
- [x] D12時間切れ時の順位決定を実装する。
  - `getTimeLimitGameResult` で、D11中断時の順位を返す。
  - あがり済みの後、未あがりプレイヤーを残り手札枚数の少ない順、同数なら現在手番からの手番順で並べる。
  - 失格者は通常終了と同じく失格逆順で末尾に並べる。
- [x] D18千日手を実装する。
  - `recordRepetitionCheckpoint` で、ゲーム時間設定なし、場が空、人数・手札が同じ状態を記録する。
  - 同じ状態で同一プレイヤーの手番が4回記録されたら `repetition` 中断を返す。
  - 中断時の順位はD12と同じ順位計算を使う。
- [x] D6考慮時間、D7手番制限時間、D8時間切れ時処理を実装する。
  - `GameState.turnStartedAtMs` と `considerationStartedAtMs` で手番時間と考慮時間を管理する。
  - `startTurnTimer`, `startConsiderationTimer`, `resolveTurnTimerTimeout` で期限判定と時間切れ処理を扱う。
  - D8のデフォルトは既存の `resolveTurnTimeout` と同じく失格として解決する。
- [x] D9反則時の素因数分解情報公開設定を実装する。
  - `createFactorizationDisclosure` で、反則時の素因数分解情報を設定に応じて公開・保留・非公開にする。
  - `none`, `onRequestAfterFoul`, `alwaysAfterFoul` の3設定に対応済み。
- [x] D10カードの流し方を設定化する。
  - `src/lib/ruleState.ts` の `flushCardsToDeck` で、`orderedToBottom`, `shuffleFlushedToBottom`, `shuffleWithDeck` を実装済み。
- [x] D14あがり時の場のカード流し設定を実装する。
  - `RuleSettings.finishFieldFlushRule` で、あがり時に場を流すかを設定できる。
  - デフォルトは公式通り `none`、`flush` の場合は `flushFieldAfterFinish` でD10に従って場を山札へ流す。
- [x] D19手札公開設定を、状態と表示ビューの境界で整理する。
  - `createGameViewForPlayer` / `createPlayerView` で、閲覧者ごとに手札を公開カードまたは裏向きカードとして返す。
  - `RuleSettings.openHands` が `false` の場合は本人の手札だけ見え、`true` の場合は全員の手札が見える。
- [x] D1〜D19を `RuleSettings` として外出しする。
  - D5 `turnOrderRule`, D12 `timeLimitRankRule`, D13 `calculationPolicy`, D18 `repetitionRule` を追加し、D1〜D19の設定項目を `RuleSettings` 上で表現できるようにした。
  - 既存実装済みのD12/D18は、それぞれ対応する設定値を参照して処理する。
- [x] 手番順の初期決定を実装する。
  - `createGameState({ firstPlayerId })` で、じゃんけん勝者相当のプレイヤーを先頭にしてプレイヤー順を回転できる。
  - `determineInitialPlayerOrder` で、指定プレイヤーから時計回りの初期順序を作る。
- [x] 追加ルール「カード提示による順序決定」を実装する。
  - `resolvePresentedCardTurnOrder` で、各アクティブプレイヤーの提示カードを検証し、最大値・スート順・ジョーカー色順で開始プレイヤーを決める。
  - 提示カードは手札から除去し、提示カードだけをシャッフルして山札下へ戻す。
  - 決定した開始プレイヤーから時計回りになるよう `players` と `turnPlayerId` を更新する。
- [x] ブラウザ版とCLI版が同じ新ルールエンジンを使うように統合する。
  - CLI側の `src/lib/primeDaifugo.ts` は、旧APIを保ったまま `validateOfficialPlay` を使って出し方を検証する。
  - ブラウザ側の `src/composables/useGameLogic.ts` は、重複していた判定・CPU選択ロジックをやめ、`src/lib/primeDaifugo.ts` の共有実装を参照する。
  - ブラウザ側の `src/composables/useGameState.ts` は、ドロー、パス、カード出し、CPU手番、山札、場、手番、勝敗を共有 `primeDaifugo` エンジンから同期する。
  - 共有 `primeDaifugo` エンジンでは、`∞`、グロタンカット、ラマヌジャン革命、革命中比較がブラウザ/CLI操作へ反映される。
  - ブラウザ設定から、ジョーカー枚数、グロタンカット、ラマヌジャン革命、手札公開を次ゲーム用オプションとして保存・反映できる。
  - 合成数出しは素因数場の入力UIが未接続のため、ブラウザ設定ではまだ無効表示のまま。
- [ ] TODO: 未実装の公式ルールに対するテストを追加する。
  - 現状、プロジェクト内にアプリ用テストはない。

---

## 26. 参考：標準ルールの短縮形

実際に遊ぶための最短ルールとしては、次のように説明できる。

1. 各プレイヤーに11枚配り、残りを山札にする。
2. 手番では、必要なら山札から1枚引き、その後カードを出すかパスする。
3. カード列の値はカード値を十進法で連結した整数である。
4. Aは1、Jは11、Qは12、Kは13。ジョーカーは手番ごとに0〜13として使える。
5. ジョーカー1枚出しは最強。ただし革命中は最弱として比較する。
6. 場が空でなければ、同じ枚数で、平常時はより大きく、革命時はより小さい値を出す。
7. 素数ならそのまま出せる。
8. 57を素因数なしで出すとグロタンカット。場を流して同じ人が続ける。（追加設定可能）
9. 1729を素因数なしで出すとラマヌジャン革命。平常/革命を反転する。（追加設定可能）
10. 合成数は、素因数場で正しい素因数分解または指数表記を付ければ出せる。
11. 規定通りでない出し方は反則。出した枚数と同じ枚数を山札から引く。
12. 山札が足りない反則では、他プレイヤーが不足分のカードを手札から流す。
13. 手札がなくなり、反則でなければあがり。
14. 最後の1人になるまで続ける。
