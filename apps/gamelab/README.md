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
テストは `test/` と `mock/*/test/` の既存テストをまとめて実行します。
CPU 探索の時間制限を含むため、テストファイルは並列実行せず順番に実行します。
依存関係はこのアプリの `package.json`、ロックファイルはモノレポ直下で管理します。
モックごとの `npm install` は不要です。

## ゲーム

| パス                   | ゲーム                |
| ---------------------- | --------------------- |
| `/`                    | GAME LAB のゲーム一覧 |
| `/kuku-daifugo`        | 九九大富豪            |
| `/kuku-daifugo-reduce` | 九九大富豪 Reduce     |
| `/kuku-reduce`         | 九九 Reduce           |
| `/kuku-reduce-99`      | 九九かけ 99           |
| `/naturalkk`           | Natural KK            |
| `/sanjutsu-daifugo`    | 算術大富豪            |

各ゲームは `mock/<ゲーム名>/src/` の実装を遅延読み込みします。
ゲーム画面の「GAME LAB」リンクから一覧へ戻れます。
ルールとゲーム内の操作は取り込み元の実装を保持しています。
元の素数大富豪のロジックと CLI も `src/` に保持しており、
`npm run cli --workspace=@prime-qk/gamelab` で起動できます。
この CLI は上記6種類のゲーム用ではありません。

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

[butchi/2026-07-horo](https://github.com/butchi/2026-07-horo) の `main` ブランチ、
コミット `107089c330409d7d6f493d9affe788de67556c01` のスナップショットです。
元リポジトリの Git 履歴は含めません。
権利者の確認に基づき、このアプリのコードを [MIT ライセンス](./LICENSE) で取り込みました。
依存ライブラリにはそれぞれのライセンスが適用されます。
取り込み範囲と進捗は [引き継ぎ文書](./docs/import-handoff.md) に記載しています。
