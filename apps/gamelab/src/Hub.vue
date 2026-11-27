<script setup lang="ts">
const games = [
  {
    path: '/kkqkj',
    title: 'KKQKJ（仮）',
    description: '5枚を素数に組み分ける、CPU対戦の素数ポーカー。',
    kind: 'prime poker',
  },
  {
    path: '/kuku-daifugo',
    title: '九九大富豪',
    description: '因数2枚と答え札で九九をつくる。',
    kind: 'card game',
  },
  {
    path: '/kuku-daifugo-reduce',
    title: '九九大富豪 Reduce',
    description: '主札と九九コンボを使う派生ルール。',
    kind: 'card game',
  },
  {
    path: '/kuku-reduce',
    title: '九九 Reduce',
    description: '九九を見つけて手札を減らす。',
    kind: 'card game',
  },
  {
    path: '/kuku-reduce-99',
    title: '九九かけ 99',
    description: '九九ベースのオリジナル数式ゲーム。',
    kind: 'original game',
    recommended: true,
  },
  {
    path: '/naturalkk',
    title: 'Natural KK',
    description: '素数と合成数を使ったカードゲーム。',
    kind: 'card game',
  },
  {
    path: '/sanjutsu-daifugo',
    title: '算術大富豪',
    description: '四則演算で答え札をつくる大富豪。',
    kind: 'card game',
  },
]
</script>

<template>
  <main class="mock-index">
    <header>
      <h1>GAME LAB</h1>
      <p>トランプと数の性質から生まれた、遊べるカードゲームの実験室</p>
    </header>

    <nav aria-label="ゲーム一覧">
      <a v-for="game in games" :key="game.path" :href="game.path" class="mock-row" :class="{ recommended: game.recommended }">
        <div>
          <h2>{{ game.title }} <small v-if="game.recommended">おすすめ</small></h2>
          <p>{{ game.description }}</p>
        </div>
        <span>{{ game.kind }}</span>
      </a>
    </nav>
  </main>
</template>
