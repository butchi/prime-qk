<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createKukuGame,
  chooseKukuCpuMarketIndex,
  chooseKukuCpuPlay,
  findKukuPlays,
  formatCard,
  passKukuTurn,
  playKukuTurn,
  type KukuCard,
  type KukuGame,
} from './lib/kukokake'

const game = ref<KukuGame>(createKukuGame())
const selected = ref<KukuCard[]>([])
const selectedMarket = ref<number | null>(null)
const notice = ref('カードを選んで出札してください。')
const showRules = ref(false)
let cpuTimer: ReturnType<typeof setTimeout> | undefined

const human = computed(() => game.value.players[0])
const currentPlayer = computed(() => game.value.players[game.value.currentPlayer])
const canAct = computed(
  () => !game.value.winner && game.value.currentPlayer === 0 && !human.value.passed,
)
const suggestedPlays = computed(() => findKukuPlays(human.value.hand, game.value.field))
const chainableCards = computed(
  () =>
    new Set(
      // CHAIN is a hand-property indicator: keep it visible even when this turn's
      // field length or the current selection makes the card unavailable.
      findKukuPlays(human.value.hand, null)
        .filter((play) => play.cards.length >= 2)
        .flatMap((play) => play.cards),
    ),
)
const chainableMarketCards = computed(
  () =>
    new Set(
      game.value.market.filter((marketCard) =>
        findKukuPlays([...human.value.hand, marketCard], null).some(
          (play) => play.cards.length >= 2 && play.cards.includes(marketCard),
        ),
      ),
    ),
)
const winningPlayer = computed(() =>
  game.value.players.find((player) => player.id === game.value.winner),
)
const orderedSelection = computed(() =>
  selected.value.length > 1 ? [...selected.value].reverse() : selected.value,
)
const selectableCards = computed(() => {
  const selectable = new Set<KukuCard>(selected.value)
  const actualSelection = orderedSelection.value

  if (actualSelection.length === 0) {
    // Chain input starts at the rightmost factor card. A single play is its own endpoint.
    suggestedPlays.value.forEach((play) => selectable.add(play.cards[play.cards.length - 1]))
    return selectable
  }

  suggestedPlays.value.forEach((play) => {
    const offset = play.cards.length - actualSelection.length
    if (offset <= 0) return
    const selectedSuffix = play.cards.slice(offset)
    if (selectedSuffix.every((card, index) => card === actualSelection[index])) {
      selectable.add(play.cards[offset - 1])
    }
  })
  return selectable
})
const nextOptions = computed(() =>
  human.value.hand.filter(
    (card) => !selected.value.includes(card) && selectableCards.value.has(card),
  ),
)
const chainOptions = computed(() => {
  const actualSelection = orderedSelection.value
  const options = new Map<string, KukuCard[]>()

  suggestedPlays.value.forEach((play) => {
    const offset = play.cards.length - actualSelection.length
    if (play.cards.length < 2 || offset <= 0) return
    if (!play.cards.slice(offset).every((card, index) => card === actualSelection[index])) return
    // Convert the remaining cards back into the factor → answer input order.
    const remaining = play.cards.slice(0, offset).reverse()
    options.set(remaining.join('→'), remaining)
  })
  return [...options.values()]
})

function resetGame() {
  if (cpuTimer) clearTimeout(cpuTimer)
  game.value = createKukuGame()
  selected.value = []
  selectedMarket.value = null
  notice.value = 'カードを選んで出札してください。'
  runCpuTurn()
}

function toggleCard(card: KukuCard) {
  if (!canAct.value || !selectableCards.value.has(card)) return
  selected.value = selected.value.includes(card)
    ? selected.value.filter((item) => item !== card)
    : [...selected.value, card]
}

function selectChain(cards: KukuCard[]) {
  if (!canAct.value) return
  selected.value = [...selected.value, ...cards]
}

function playSelected() {
  if (!selected.value.length) {
    notice.value = '出すカードを選択してください。'
    return
  }
  const result = playKukuTurn(game.value, orderedSelection.value)
  notice.value = result.message
  if (result.ok) selected.value = []
  runCpuTurn()
}

function pass() {
  const result = passKukuTurn(game.value, selectedMarket.value)
  notice.value = result.message
  if (result.ok) {
    selected.value = []
    selectedMarket.value = null
  }
  runCpuTurn()
}

function runCpuTurn() {
  if (game.value.winner || game.value.currentPlayer === 0) return
  if (cpuTimer) clearTimeout(cpuTimer)
  cpuTimer = setTimeout(() => {
    const play = chooseKukuCpuPlay(game.value)
    if (play) playKukuTurn(game.value, play.cards)
    else passKukuTurn(game.value, chooseKukuCpuMarketIndex(game.value))
    runCpuTurn()
  }, 650)
}

function cardClass(card: KukuCard) {
  return {
    selected: selected.value.includes(card),
    answer: game.value.field?.cards[0] === card,
    chainable: chainableCards.value.has(card),
  }
}

function isCardSelectable(card: KukuCard) {
  return canAct.value && selectableCards.value.has(card)
}

onMounted(runCpuTurn)
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">九九 × カードゲーム</p>
        <h1>ククカケ <small>(仮)</small></h1>
      </div>
      <div class="header-actions">
        <button class="ghost-button" @click="showRules = !showRules">ルール</button>
        <button class="primary-button" @click="resetGame">新しいゲーム</button>
      </div>
    </header>

    <section v-if="showRules" class="rules-panel">
      <strong>大きい数から小さい数へ。</strong> 1枚出しは数字そのもの、2枚以上は「答え札 + 因数札」の直線チェーンです。
      例：<code>08 + 24 + 64 + 88</code>。補助札は1〜9の段だけ使えます。場と同じ枚数で、より小さい根札を出します。最初に手札をなくした人の勝ちです。
    </section>

    <section class="status-row">
      <div class="turn-card"><span>手番</span><strong>{{ currentPlayer.name }}</strong></div>
      <div class="deck-card"><span>山札</span><strong>{{ game.deck.length }}枚</strong></div>
      <div class="notice">{{ notice }}</div>
    </section>

    <section class="table-area">
      <div class="opponents">
        <article v-for="player in game.players.slice(1)" :key="player.id" class="opponent" :class="{ active: currentPlayer.id === player.id }">
          <div class="avatar">{{ player.name.replace('CPU ', '') }}</div>
          <div><strong>{{ player.name }}</strong><span>{{ player.hand.length }}枚</span></div>
          <i v-if="player.passed">パス済み</i>
        </article>
      </div>

      <div class="field">
        <p class="field-label">場の値</p>
        <div v-if="game.field" class="field-play">
          <span v-for="card in game.field.cards" :key="card" class="field-card" :class="{ answer: card === game.field.cards[0] }">{{ card }}</span>
          <b>{{ formatCard(game.field.value) }}</b>
        </div>
        <div v-else class="empty-field">最初の札を出してください</div>
      </div>

      <div v-if="winningPlayer" class="winner-banner">{{ winningPlayer.name }}の勝ち！</div>
    </section>

    <section class="market-section">
      <div>
        <p class="eyebrow">公開札</p>
        <p class="market-description">パス時に1枚選んで獲得します</p>
      </div>
      <div class="market-cards">
        <button
          v-for="(card, index) in game.market"
          :key="card"
          class="market-card"
          :class="{ selected: selectedMarket === index, chainable: chainableMarketCards.has(card) }"
          :disabled="!canAct"
          @click="selectedMarket = index"
        >
          {{ card }}
          <em v-if="chainableMarketCards.has(card)">CHAIN</em>
        </button>
        <span v-if="!game.market.length" class="market-empty">公開札はありません</span>
      </div>
    </section>

    <section class="hand-section">
      <div class="hand-heading">
        <div><p class="eyebrow">あなたの手札</p><h2>{{ human.hand.length }}枚</h2></div>
        <div class="hint">{{ suggestedPlays.length ? `出せる候補 ${suggestedPlays.length}通り` : '出せる札がありません' }}</div>
      </div>
      <div v-if="selected.length" class="selection-guide">
        <span>選択中（補助札 → 答え札）</span>
        <strong>{{ selected.join(' → ') }}</strong>
        <small v-if="selected.length > 1">出札時は {{ orderedSelection.join(' + ') }} として判定</small>
      </div>
      <div v-if="nextOptions.length" class="next-options">
        <span>次に選べる札</span>
        <button v-for="card in nextOptions" :key="card" @click="toggleCard(card)">{{ card }}</button>
      </div>
      <div v-if="chainOptions.length" class="chain-options">
        <span>{{ selected.length ? 'チェーンで選ぶ' : 'チェーン候補（ワンクリック選択）' }}</span>
        <button v-for="cards in chainOptions" :key="cards.join('-')" @click="selectChain(cards)">
          {{ cards.join(' → ') }}
        </button>
      </div>
      <div class="hand">
        <button
          v-for="card in human.hand"
          :key="card"
          class="card"
          :class="cardClass(card)"
          :disabled="!isCardSelectable(card)"
          @click="toggleCard(card)"
        >
          <span>{{ card }}</span>
          <small v-if="card[0] !== '0' && card[1] !== '0'">{{ Number(card[0]) }}×{{ Number(card[1]) }}</small>
          <em v-if="chainableCards.has(card)">CHAIN</em>
        </button>
      </div>
      <div class="action-row">
        <button class="primary-button play-button" :disabled="!canAct" @click="playSelected">選択したカードを出す</button>
        <button class="secondary-button" :disabled="!canAct || (game.market.length > 0 && selectedMarket === null)" @click="pass">パスして公開札を取る</button>
      </div>
    </section>

    <aside class="log-panel">
      <div v-for="(entry, index) in game.log.slice(0, 7)" :key="`${entry}-${index}`">{{ entry }}</div>
    </aside>
  </main>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; background: #f5f7fb; color: #182333; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.app-shell { max-width: 1120px; margin: 0 auto; padding: 30px 24px 56px; }
.topbar, .status-row, .hand-heading, .action-row, .header-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.topbar { margin-bottom: 24px; }
h1, h2, p { margin: 0; } h1 { font-size: clamp(2rem, 5vw, 3.4rem); letter-spacing: -.06em; } h1 small { color: #8490a3; font-size: .38em; letter-spacing: 0; }
.eyebrow { color: #5267d8; font-size: .76rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
button { border: 0; cursor: pointer; font: inherit; transition: .18s ease; } button:disabled { cursor: not-allowed; opacity: .42; }
.primary-button, .secondary-button, .ghost-button { border-radius: 11px; padding: 11px 17px; font-weight: 750; }
.primary-button { background: #5267d8; color: white; box-shadow: 0 8px 18px #5267d832; } .primary-button:hover { background: #4054bf; transform: translateY(-1px); }
.secondary-button, .ghost-button { background: white; color: #45536a; border: 1px solid #dbe1ed; } .ghost-button { padding: 10px 14px; }
.rules-panel { background: #eef1ff; border: 1px solid #d7ddff; border-radius: 14px; padding: 15px 18px; margin-bottom: 18px; color: #3d4b75; line-height: 1.7; }
code { background: #dfe4ff; border-radius: 5px; padding: 2px 5px; }
.status-row { margin-bottom: 20px; } .turn-card, .deck-card { background: white; border: 1px solid #e3e8f1; border-radius: 14px; padding: 12px 18px; min-width: 110px; } .turn-card span, .deck-card span { display: block; color: #8994a6; font-size: .75rem; } .turn-card strong, .deck-card strong { display: block; margin-top: 3px; } .notice { color: #697589; font-size: .9rem; margin-left: auto; }
.table-area { min-height: 390px; position: relative; overflow: hidden; border-radius: 22px; padding: 24px; background: radial-gradient(circle at 50% 56%, #314d69, #182b42 70%); color: white; box-shadow: inset 0 0 0 1px #ffffff13, 0 20px 45px #22344a22; }
.opponents { display: flex; justify-content: center; gap: 12px; } .opponent { display: flex; align-items: center; gap: 9px; min-width: 145px; border: 1px solid #ffffff20; background: #ffffff0b; border-radius: 12px; padding: 9px 12px; } .opponent.active { border-color: #a9b6ff; background: #6675d52e; } .opponent strong, .opponent span { display: block; } .opponent span { color: #b9c6d7; font-size: .76rem; margin-top: 2px; } .opponent i { color: #ffdc88; font-size: .7rem; margin-left: auto; } .avatar { display: grid; place-items: center; width: 29px; height: 29px; border-radius: 50%; background: #7184db; font-weight: 800; font-size: .8rem; }
.field { display: grid; place-items: center; min-height: 250px; } .field-label { color: #afbdd0; font-size: .75rem; letter-spacing: .1em; text-transform: uppercase; } .field-play { display: flex; align-items: center; gap: 9px; margin-top: 16px; } .field-play b { margin-left: 10px; color: #b7c3ff; font-size: 1.4rem; } .field-card { display: grid; place-items: center; width: 67px; height: 91px; border-radius: 10px; background: #f8faff; color: #263653; font-size: 1.28rem; font-weight: 800; box-shadow: 0 8px 15px #08152755; } .field-card.answer { color: #5267d8; transform: translateY(-7px); } .empty-field { margin-top: 15px; color: #b6c2d3; border: 1px dashed #ffffff35; padding: 19px 27px; border-radius: 11px; }
.winner-banner { position: absolute; inset: auto 24px 16px; text-align: center; color: #ffe59d; font-size: 1.1rem; font-weight: 800; }
.market-section { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 18px; padding: 14px 18px; border: 1px solid #e0e6f0; border-radius: 15px; background: #fff; } .market-description { margin-top: 3px; color: #7e8a9c; font-size: .78rem; } .market-cards { display: flex; flex-wrap: wrap; gap: 7px; } .market-card { position: relative; width: 47px; height: 55px; border: 1px solid #dce3ee; border-radius: 8px; background: #f7f9fd; color: #2b3b59; font-weight: 850; } .market-card em { position: absolute; right: 3px; bottom: 3px; border-radius: 3px; background: #7656d8; color: white; padding: 1px 2px; font-size: .36rem; font-style: normal; font-weight: 900; } .market-card.chainable { border-color: #9e83e9; background: linear-gradient(145deg, #f8f6ff, #f1edff); box-shadow: inset 0 0 0 1px #e6ddff; } .market-card:hover:not(:disabled) { border-color: #8495ee; transform: translateY(-2px); } .market-card.selected { border: 2px solid #5267d8; background: #e8ebff; color: #4054bf; } .market-empty { color: #8994a6; font-size: .82rem; }
.hand-section { margin-top: 26px; background: white; border: 1px solid #e4e8f0; border-radius: 18px; padding: 22px; } .hand-heading { align-items: end; } .hand-heading h2 { margin-top: 3px; } .hint { color: #78869a; font-size: .85rem; }
.hand { display: flex; flex-wrap: wrap; gap: 9px; margin: 20px 0; } .card { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 67px; height: 86px; border-radius: 10px; background: #f7f9fd; border: 1px solid #dce3ee; color: #22304b; } .card span { font-size: 1.1rem; font-weight: 800; } .card small { margin-top: 6px; color: #8d98a8; font-size: .65rem; } .card em { position: absolute; top: 5px; right: 5px; border-radius: 4px; background: #7656d8; color: white; padding: 2px 3px; font-size: .42rem; font-style: normal; font-weight: 900; letter-spacing: .03em; } .card.chainable { border-color: #9e83e9; background: linear-gradient(145deg, #f8f6ff, #f1edff); box-shadow: inset 0 0 0 1px #e6ddff; } .card:hover:not(:disabled) { border-color: #8495ee; transform: translateY(-4px); } .card:disabled { background: #f2f4f7; border-color: #e8ecf2; color: #b3bdca; opacity: .58; } .card:disabled small { color: #c2c9d3; } .card:disabled em { background: #abb3bf; } .card.selected { background: #e8ebff; border: 2px solid #5267d8; color: #4054bf; transform: translateY(-8px); box-shadow: 0 7px 14px #5267d825; } .play-button { min-width: 220px; }
.selection-guide { display: flex; align-items: baseline; flex-wrap: wrap; gap: 9px; margin-top: 16px; padding: 11px 13px; border-radius: 10px; background: #f0f2ff; color: #66738a; font-size: .82rem; } .selection-guide strong { color: #4054bf; font-size: 1rem; } .selection-guide small { color: #8994a6; }
.next-options { display: flex; align-items: center; gap: 8px; margin-top: 12px; color: #69758b; font-size: .8rem; } .next-options button { padding: 5px 10px; border: 1px solid #aebaff; border-radius: 7px; background: #fff; color: #4054bf; font-weight: 800; } .next-options button:hover { background: #e8ebff; }
.chain-options { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 9px; color: #7656a8; font-size: .8rem; } .chain-options button { padding: 5px 10px; border: 1px solid #cbbcf5; border-radius: 7px; background: #f8f6ff; color: #6545af; font-weight: 800; } .chain-options button:hover { background: #eee9ff; }
.log-panel { margin-top: 18px; color: #7d899a; font-size: .78rem; line-height: 1.8; } .log-panel div::before { content: '•'; color: #a9b5c5; margin-right: 8px; }
@media (max-width: 650px) { .app-shell { padding: 22px 14px 40px; } .topbar { align-items: flex-start; } .header-actions { flex-direction: column; gap: 7px; } .status-row { flex-wrap: wrap; } .notice { width: 100%; margin: 0; } .table-area { padding: 15px 10px; } .opponents { gap: 5px; } .opponent { min-width: 0; padding: 7px; } .opponent strong { font-size: .78rem; } .opponent i { display: none; } .field-card { width: 54px; height: 74px; } .market-section { align-items: flex-start; flex-direction: column; gap: 10px; } .action-row { align-items: stretch; flex-direction: column; } .play-button { width: 100%; } }
</style>
