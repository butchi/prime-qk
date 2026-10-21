# カンタン素数大富豪

素数大富豪 簡易版です。ブラウザ版に加えて、同じロジックを使うCLI版を用意しています。

## 使い方

このアプリは npm ワークスペース `@prime-qk/kantan` です。
依存関係のインストールと以下のコマンドはリポジトリのルートで実行してください。

```sh
npm ci
npm run dev --workspace=@prime-qk/kantan
```

ビルド、プレビュー、テスト:

```sh
npm run build --workspace=@prime-qk/kantan
npm run preview --workspace=@prime-qk/kantan
npm run test --workspace=@prime-qk/kantan
```

CLI版は次のコマンドで起動できます。

```sh
npm run cli --workspace=@prime-qk/kantan
```

CLIではスートを表示・入力に使いません。手札は `A35789TJQK2` のような文字列で表示され、カードを出すときも `9J` のような文字列で入力します。`A=1`, `T=10`, `J=11`, `Q=12`, `K=13` です。`d` でドロー、`p` でパス、`q` で終了します。

コンピューターの手札はデフォルトでは `???????????` のように伏せて表示します。確認用にオープンする場合は次のように起動します。

```sh
npm run cli --workspace=@prime-qk/kantan -- --open-card
```

## 広告設定（AdSense）

終了ダイアログの広告枠は、デフォルトではダミー表示です。実広告を有効化する場合は、アプリディレクトリ `apps/kantan/` に `.env.local` を作成して以下を設定してください。

```env
VITE_ENABLE_REAL_ADS=true
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT_ENDGAME=1234567890
VITE_ADSENSE_FORMAT=auto
VITE_ADSENSE_FULL_WIDTH_RESPONSIVE=true
```

- `VITE_ENABLE_REAL_ADS`: `true` で実広告を有効化
- `VITE_ADSENSE_CLIENT`: AdSense の client ID（`ca-pub-` で始まる値）
- `VITE_ADSENSE_SLOT_ENDGAME`: 終了ダイアログ広告の slot ID
- `VITE_ADSENSE_FORMAT`: 通常は `auto`
- `VITE_ADSENSE_FULL_WIDTH_RESPONSIVE`: 通常は `true`

設定が不足している場合や開発モードでは、広告枠はダミー表示のままになります。

ジョーカーはカード生成と公式ルール用の値評価に対応していますが、ブラウザ版/CLI版の通常プレイにはまだ接続していません。現状の入力文字 `J` は Jack、つまり `11` として扱います。

## トランプ仕様

内部表現は、まず素数大富豪向けのフランス式52枚＋ジョーカー2枚に最適化しています。通常の52枚は `french-52-v1`、ジョーカー2枚を含む54枚は `french-54-v1` として扱います。非標準デッキ対応より先に、物理カードの `CardCode6` と、スートを落とした `UCardCode4` を固定します。

各物理カードは `CardCode` という6-bit数値で表します。通常カードは旧 `_lib/` 実装と同じ `suit * 16 + rank` で、スート順は `0 = Clubs`, `1 = Diamonds`, `2 = Hearts`, `3 = Spades` です。

```ts
code = suit * 16 + rank
```

`0` は空スロット、`47` は伏せ札や不明カード、`62` は joker2、`63` は joker1 です。例として、`A♣ = 0x01`, `Q♦ = 0x1c`, `Q♥ = 0x2c`, `A♠ = 0x31`, 黒ジョーカー `0x3f`, 赤ジョーカー `0x3e` になります。

`UCardCode4` はスートを落としたランク表現です。`0 = blank`, `1..13 = A..K`, `14 = undefined / O`, `15 = joker / X / -1` として扱います。ジョーカーの物理コードは `62`/`63` ですが、スートなし表現では `15` に正規化します。

実装上の `PlayingCard` は互換性のため `id`, `kind`, `rank`, `suit`, `color` を持ちつつ、物理カード識別用に `profile` と `code` も持ちます。素数大富豪でその手番に宣言されるジョーカー値は、物理カードコードや `UCardCode4` から分離し、`src/lib/ruleValues.ts` の `jokerValueByCardId` で別に扱います。

旧 `_lib/` 実装のカード文字列表現を踏まえ、物理カード用には `SA`, `H10`/`HT`, `DQ`, `CK`, `X1`, `X2` のようなトークンを `tokenToCardCode` / `cardCodeToToken` / `createCardFromToken` で扱えます。CLIのランク列入力とは別で、物理カードをスート込みで表すためのAPIです。

## API

再利用可能なロジックは `src/lib` にまとめています。

- `src/lib/cards.ts`: トランプAPI。カード生成、シャッフル、カード値 `v`、結合関数 `con`、メイン値 `evalF`、表示文字列化。
- `src/lib/primes.ts`: 素数判定API。
- `src/lib/primeDaifugo.ts`: 素数大富豪API。ゲーム生成、手番操作、ドロー、パス、CPU手番。

まとめて利用する場合は `src/lib/index.ts` から import できます。

```ts
import { createPrimeDaifugoGame, playCards } from './src/lib'

const game = createPrimeDaifugoGame()
const result = playCards(game, [0])
```

ブラウザ版とCLI版は、このアプリ内の同じ `src/lib` を参照します。共通パッケージへの切り出しはまだ行っていません。

## 取り込み元

[butchi/jp-butchi-primeqk-kantan](https://github.com/butchi/jp-butchi-primeqk-kantan)
の `develop` ブランチ、コミット `39b9f51a9c6bc507adeb4afc588bd41bbc6056ff`
のスナップショットを取り込んでいます。元リポジトリの Git 履歴と
`package-lock.json` は含めず、モノレポのルートロックファイルで依存関係を管理します。

## Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).
