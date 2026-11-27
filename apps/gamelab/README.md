# GAME LAB

トランプと数の性質から生まれた、遊べるカードゲームの実験室です。
Vue 3・TypeScript・Vite 6 を使う npm ワークスペース `@prime-qk/gamelab` として管理します。

## 起動と検証

すべてリポジトリのルートから実行してください。

```sh
npm ci
npm run dev --workspace=@prime-qk/gamelab -- --port 5176 --strictPort
npm run test --workspace=@prime-qk/gamelab
npm run build --workspace=@prime-qk/gamelab
npm run preview --workspace=@prime-qk/gamelab -- --port 4177 --strictPort
```

ビルドは全ゲームの型チェックを行い、`apps/gamelab/dist` に静的ファイルを出力します。
テストは `test/` と `mock/*/test/` のテストをまとめて実行します。
CPU 探索の時間制限を含むため、テストファイルは並列実行せず順番に実行します。
依存関係はこのアプリの `package.json`、ロックファイルはモノレポ直下で管理します。
モックごとの `npm install` は不要です。

## ゲーム

| パス                   | ゲーム                |
| ---------------------- | --------------------- |
| `/`                    | GAME LAB のゲーム一覧 |
| `/kkqkj`               | KKQKJ（仮）           |
| `/kuku-daifugo`        | 九九大富豪            |
| `/kuku-daifugo-reduce` | 九九大富豪 Reduce     |
| `/kuku-reduce`         | 九九 Reduce           |
| `/kuku-reduce-99`      | 九九かけ 99           |
| `/naturalkk`           | Natural KK            |
| `/sanjutsu-daifugo`    | 算術大富豪            |

KKQKJ は `src/games/kkqkj/`、既存6ゲームは `mock/<ゲーム名>/src/` の実装を遅延読み込みします。
ゲーム画面の「GAME LAB」リンクから一覧へ戻れます。
既存6ゲームのルールとゲーム内の操作は取り込み元の実装を保持しています。
元の素数大富豪のロジックと CLI も `src/` に保持しており、
`npm run cli --workspace=@prime-qk/gamelab` で起動できます。
この CLI は上記7種類のゲーム用ではありません。

## KKQKJ（仮）— 素数ポーカー

ジョーカーなしの52枚から、あなたと CPU に重複しない5枚ずつを配ります。
残したいカードをタップしてキープし、残りを1回だけ交換して勝負します。
最初はすべて交換対象です。5枚すべてをキープして、交換せず勝負することもできます。
交換するカードは配布後の共通の山札から引き、捨てたカードは引き直しません。

勝負では、5枚をそれぞれ1回ずつ使う並べ方と分け方を自動で調べ、最も強い役を採用します。
各組のランクを十進表記で連結した数が、すべて素数なら役が成立します。
A は1、T は10、J は11、Q は12、K は13として扱います。
たとえば `QK` は `1213` です。1は素数ではありません。
役の枚数には、数の桁数ではなくカードの枚数を使います。

役の強さは次の順です。

```text
5 > 4+1 > 3+2 > 3+1+1 > 2+2+1 > 2+1+1+1 > 1+1+1+1+1
```

同じ役なら、枚数の多い組から素数の値を比べます。
同じ枚数の組は素数の値の大きい順に並べて比較し、最初に異なる値が大きい側が勝ちです。
スートは強さに影響せず、比較する値がすべて同じなら引き分けです。
すべての組が素数になる分け方がなければ役なしとなり、成立した役より弱く扱います。
両者とも役なしなら引き分けです。

CPU も1回だけ交換します。交換前の手札で作れる素数の組を調べ、カード枚数が最多、
同じ枚数なら値が最大の1組をキープし、残りを交換します。
素数の組がなければ5枚すべてを交換し、5枚の素数を作れる場合は交換しません。
交換後はあなたと同じく、手札全体で成立する最も強い役で勝負します。

「素数の候補」は初期状態では閉じており、必要なときに手札で作れる組を確認できます。
候補からキープすると、その組のカードを現在のキープに追加します。
「すべて交換」でキープを解除できます。
勝負すると CPU の手札と双方の役・勝敗を表示し、次の勝負では新たに配り直します。
ベットはありません。

カード生成・ランク表記・素数判定は `src/lib/` の既存処理を再利用します。
役判定と素数の組の探索は `src/games/kkqkj/poker.ts`、
配布・交換・CPU のキープ選択は `src/games/kkqkj/round.ts` で管理します。
テストは `test/kkqkj*.test.ts` に置きます。
実装と検証の進捗は [KKQKJ 引き継ぎ文書](./docs/kkqkj-handoff.md) を参照してください。

## 環境変数

広告は既定ではダミー表示です。有効化する場合は `.env.example` を参考に
`apps/gamelab/.env.local` を作成します。`VITE_` 付きの値はブラウザへ公開されます。
Google Tag Manager の設定は取り込み元と同じです。

## Cloudflare Pages

Console・Kantan・DB とは別の Pages プロジェクトとして設定します。

| 設定                     | 値                                            |
| ------------------------ | --------------------------------------------- |
| プロジェクト名           | `gamelab`                                     |
| Framework preset         | None                                          |
| Production branch        | `production`                                  |
| Root directory           | 空欄（リポジトリ直下）                        |
| Build command            | `npm run build --workspace=@prime-qk/gamelab` |
| Build output directory   | `apps/gamelab/dist`                           |
| 環境変数                 | `NODE_VERSION=24.17.0`                        |
| カスタムドメイン（予定） | `gamelab.primeqk.butchi.jp`                   |

ルートロックファイルから開発用依存関係も含めてインストールしてください。
ブラウザ内で動作する静的 SPA なので、Functions・Workers は不要です。
Cloudflare Pages の標準 SPA フォールバックで各ゲームの直接アクセスに対応します。
トップレベルの `404.html` は追加しないでください。
ビルド監視パスを絞る場合は `apps/gamelab/*`・`package.json`・`package-lock.json` を含めます。

公開前に変更をコミットし、`production` ブランチへの統合・プッシュを行います。
Pages のプロジェクト作成・設定変更・デプロイは別途実施します。
メタ情報と OGP 画像は上記の公開予定URLを使用します。
別のドメインを使う場合は `index.html` と `public/ogp.svg` を更新し、PNG を再生成してください。

## 既存テストの課題

Natural KK の `mock/naturalkk/test/primeDaifugo.test.ts`（31件）と
`mock/naturalkk/test/ruleValues.test.ts`（3件）は、派生ルールと以前の素数大富豪用テストが
一致せず失敗します。取り込み元でも同じ34件が失敗することを確認しています。
今回はゲームのルールとテストの期待値を保持しています。

## 取り込み元とライセンス

既存6ゲームは [butchi/2026-07-horo](https://github.com/butchi/2026-07-horo) の `main` ブランチ、
コミット `107089c330409d7d6f493d9affe788de67556c01` のスナップショットです。
元リポジトリの Git 履歴は含めません。
権利者の確認に基づき、このアプリのコードを [MIT ライセンス](./LICENSE) で取り込みました。
依存ライブラリにはそれぞれのライセンスが適用されます。
取り込み範囲と進捗は [引き継ぎ文書](./docs/import-handoff.md) に記載しています。
KKQKJ はこのモノレポ内で新規実装し、同じ MIT ライセンスで管理します。
