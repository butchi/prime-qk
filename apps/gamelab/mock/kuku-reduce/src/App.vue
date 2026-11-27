<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  blockLabel,
  calculationLabel,
  cardLabel,
  chooseKukuChainType,
  chooseKukuChainTypeForLead,
  chooseKukuCpuMarketIndex,
  chooseKukuCpuPlay,
  createKukuGame,
  findKukuPlays,
  passKukuTurn,
  playKukuTurn,
  uniqueKukuPlayExpressions,
  type KukuCard,
  type KukuGame,
  type KukuPlay,
} from './lib/kukokake'

const game = ref<KukuGame>(createKukuGame())
const selected = ref<KukuCard[]>([])
const selectedMarket = ref<number | null>(null)
const notice = ref('親は、チェーンなし／1チェーンを選んでください。')
const showRules = ref(false)
let cpuTimer: ReturnType<typeof setTimeout> | undefined

const human = computed(() => game.value.players[0])
const currentPlayer = computed(() => game.value.players[game.value.currentPlayer])
const canAct = computed(
  () => !game.value.winner && game.value.currentPlayer === 0 && !human.value.passed,
)
const plays = computed(() =>
  findKukuPlays(human.value.hand, game.value.field, game.value.chainType),
)
const calculationCandidates = computed(() =>
  uniqueKukuPlayExpressions(plays.value.filter((play) => play.support))
    .sort((a, b) => a.value - b.value || b.cards.length - a.cards.length)
    .slice(0, 18),
)
const calculationCards = computed(
  () =>
    new Set(
      findKukuPlays(human.value.hand, null, 1)
        .filter((play) => play.support)
        .flatMap((play) => play.cards.map((card) => card.id)),
    ),
)
const marketCalculationCards = computed(
  () =>
    new Set(
      game.value.market
        .filter((card) =>
          [0, 1].some((type) =>
            findKukuPlays([...human.value.hand, card], null, type as 0 | 1).some(
              (play) => play.support && play.cards.some((item) => item.id === card.id),
            ),
          ),
        )
        .map((card) => card.id),
    ),
)
const winner = computed(() => game.value.players.find((player) => player.id === game.value.winner))

function resetGame() {
  if (cpuTimer) clearTimeout(cpuTimer)
  game.value = createKukuGame()
  selected.value = []
  selectedMarket.value = null
  notice.value = '親は、チェーンなし／1チェーンを選んでください。'
  runCpuTurn()
}
function chooseChainType(type: 0 | 1) {
  const result = chooseKukuChainTypeForLead(game.value, type)
  notice.value = result.message
}
function toggleCard(card: KukuCard) {
  if (!canAct.value) return
  selected.value = selected.value.some((item) => item.id === card.id)
    ? selected.value.filter((item) => item.id !== card.id)
    : [...selected.value, card]
}
function chooseCalculation(play: KukuPlay) {
  if (!canAct.value) return
  selected.value = [...play.cards]
  notice.value = `主数 ${blockLabel(play.main)}、補助 ${blockLabel(play.support!)} を選択しました。`
}
function playSelected() {
  const result = playKukuTurn(game.value, selected.value)
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
    if (game.value.field === null && game.value.chainType === null) {
      chooseKukuChainTypeForLead(game.value, chooseKukuChainType(game.value))
      runCpuTurn()
      return
    }
    const play = chooseKukuCpuPlay(game.value)
    if (play) playKukuTurn(game.value, play.cards)
    else passKukuTurn(game.value, chooseKukuCpuMarketIndex(game.value))
    runCpuTurn()
  }, 600)
}
function isSelectable(card: KukuCard) {
  return (
    canAct.value &&
    (selected.value.some((item) => item.id === card.id) ||
      plays.value.some((play) => play.cards.some((item) => item.id === card.id)))
  )
}
function cardClass(card: KukuCard) {
  return {
    selected: selected.value.some((item) => item.id === card.id),
    calc: calculationCards.value.has(card.id),
    red: card.suit === '♥' || card.suit === '♦',
  }
}
onMounted(runCpuTurn)
</script>

<template>
  <main class="app-shell">
    <header><div><p class="eyebrow">54枚トランプ × 九九</p><h1>ククカケ <small>(仮)</small></h1></div><div class="header-actions"><button @click="showRules = !showRules">ルール</button><button class="primary" @click="resetGame">新しいゲーム</button></div></header>
    <section v-if="showRules" class="rules"><b>主数札は1枚または2枚連結。</b> 場は「チェーンなし」か「九九1組の1チェーン」で比較します。補助の積は主数と完全一致し、主数札の枚数と場の値には影響しません。J/Q/Kはそれぞれ1×1・1×2・1×3の補助です。</section>
    <section class="status"><span>手番 <b>{{ currentPlayer.name }}</b></span><span>山札 <b>{{ game.deck.length }}枚</b></span><span>{{ notice }}</span></section>
    <section class="table">
      <div class="opponents"><div v-for="player in game.players.slice(1)" :key="player.id" :class="{ active: currentPlayer.id === player.id }">{{ player.name }} <small>{{ player.hand.length }}枚</small><i v-if="player.passed">パス済み</i></div></div>
      <div class="field"><p>場 {{ game.field ? (game.field.support ? '1チェーン' : 'チェーンなし') : '—' }}</p><template v-if="game.field"><div class="field-main">主数 <b>{{ blockLabel(game.field.main) }}</b><small>{{ game.field.main.cards.map(cardLabel).join(' ') }}</small></div><div v-if="game.field.support" class="field-support">補助 <b>{{ blockLabel(game.field.support) }}</b><small>{{ game.field.support.cards.map(cardLabel).join(' ') }} = {{ game.field.value }}</small></div><strong>値 {{ game.field.value }}</strong></template><div v-else class="empty">親はチェーン種別を選んでください</div></div>
      <div v-if="winner" class="winner">{{ winner.name }}の勝ち！</div>
    </section>
    <section v-if="canAct && !game.field && game.chainType === null" class="lead-picker"><b>チェーン種別を選ぶ</b><button @click="chooseChainType(0)">チェーンなし</button><button @click="chooseChainType(1)">1チェーン</button></section>
    <section class="market"><div><p class="eyebrow">公開札</p><small>パス時に1枚選んで獲得</small></div><div><button v-for="(card, index) in game.market" :key="card.id" class="market-card" :class="{ selected: selectedMarket === index, calc: marketCalculationCards.has(card.id), red: card.suit === '♥' || card.suit === '♦' }" :disabled="!canAct" @click="selectedMarket = index">{{ cardLabel(card) }}<em v-if="marketCalculationCards.has(card.id)">CALC</em></button></div></section>
    <section class="hand-panel"><div class="hand-title"><div><p class="eyebrow">あなたの手札</p><h2>{{ human.hand.length }}枚</h2></div><small>{{ game.field ? (game.field.support ? '1チェーンで返します' : 'チェーンなしで返します') : game.chainType !== null ? (game.chainType ? '1チェーンで開始します' : 'チェーンなしで開始します') : 'チェーン種別を選択してください' }}</small></div>
      <div v-if="calculationCandidates.length" class="candidates"><span>計算出し候補（ワンクリック選択）</span><button v-for="play in calculationCandidates" :key="play.cards.map(card => card.id).join('-')" @click="chooseCalculation(play)">{{ calculationLabel(play) }} <small>{{ play.cards.length }}枚消費</small></button></div>
      <div class="hand"><button v-for="card in human.hand" :key="card.id" class="card" :class="cardClass(card)" :disabled="!isSelectable(card)" @click="toggleCard(card)"><b>{{ cardLabel(card) }}</b><em v-if="calculationCards.has(card.id)">CALC</em></button></div>
      <div class="actions"><button class="primary" :disabled="!canAct || (!game.field && game.chainType === null) || !selected.length" @click="playSelected">選択した出札を出す</button><button :disabled="!canAct || (game.market.length > 0 && selectedMarket === null)" @click="pass">パスして公開札を取る</button></div>
    </section>
    <aside class="log"><div v-for="(entry, index) in game.log.slice(0, 7)" :key="`${entry}-${index}`">{{ entry }}</div></aside>
  </main>
</template>

<style scoped>
:global(*){box-sizing:border-box}:global(body){margin:0;background:#f5f7fb;color:#182333;font-family:Inter,system-ui,sans-serif}.app-shell{max-width:1080px;margin:auto;padding:28px 20px 50px}header,.header-actions,.status,.market,.hand-title,.actions{display:flex;align-items:center;justify-content:space-between;gap:14px}h1,h2,p{margin:0}h1{font-size:clamp(2rem,5vw,3.3rem);letter-spacing:-.06em}h1 small{font-size:.38em;color:#8893a5;letter-spacing:0}.eyebrow{color:#5267d8;font-size:.73rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}button{border:1px solid #dbe1ed;border-radius:9px;background:white;color:#46536a;padding:9px 13px;font:inherit;font-weight:700;cursor:pointer}button:disabled{opacity:.42;cursor:not-allowed}.primary{background:#5267d8;color:white;border-color:#5267d8}.rules,.lead-picker{margin:18px 0;padding:14px 17px;border-radius:13px;background:#eef1ff;color:#3d4b75;line-height:1.7}.lead-picker{display:flex;align-items:center;gap:10px}.status{margin:18px 0;color:#68758a;font-size:.88rem}.status b{color:#26344c}.table{position:relative;min-height:350px;padding:23px;border-radius:20px;background:radial-gradient(circle at 50% 55%,#314d69,#182b42 70%);color:white}.opponents{display:flex;justify-content:center;gap:10px}.opponents>div{padding:8px 11px;border:1px solid #ffffff25;border-radius:10px;background:#ffffff0d}.opponents .active{border-color:#a9b6ff;background:#6675d52e}.opponents small{color:#bdc8d9}.opponents i{margin-left:7px;color:#ffdc88;font-size:.7rem}.field{display:grid;place-items:center;min-height:240px}.field>p{color:#b5c2d4;font-size:.75rem}.field-main,.field-support{display:grid;place-items:center;min-width:135px;margin-top:12px;padding:10px;border-radius:10px;background:#f8faff;color:#263653}.field-main b,.field-support b{font-size:1.35rem}.field small{color:#718096;font-size:.68rem}.field>strong{margin-top:12px;color:#c4ceff}.empty{margin-top:16px;padding:18px 25px;border:1px dashed #ffffff42;border-radius:10px;color:#bec9d8}.winner{position:absolute;bottom:16px;left:0;right:0;text-align:center;color:#ffe49b;font-weight:800}.market,.hand-panel{margin-top:18px;padding:17px 20px;border:1px solid #e1e6ef;border-radius:15px;background:white}.market>div:last-child{display:flex;gap:7px;flex-wrap:wrap}.market-card,.card{position:relative;min-width:55px}.market-card{height:51px}.calc{border-color:#9e83e9!important;background:#f2eeff!important;box-shadow:inset 0 0 0 1px #e5dcff}.red{color:#c84258!important}.market-card em,.card em{position:absolute;right:3px;bottom:3px;padding:1px 2px;border-radius:3px;background:#7656d8;color:#fff;font-size:.37rem;font-style:normal}.hand-title small{color:#7b8798}.candidates{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:17px 0 8px;color:#7656a8;font-size:.8rem}.candidates button{border-color:#cbbcf5;background:#f8f6ff;color:#6545af}.candidates small{display:block;color:#9b8bbd;font-size:.62rem}.hand{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}.card{width:66px;height:78px;background:#f7f9fd}.card b{font-size:1rem}.card.selected{border:2px solid #5267d8;background:#e8ebff!important;transform:translateY(-6px)}.log{margin-top:17px;color:#7d899a;font-size:.78rem;line-height:1.8}.log div:before{content:'•';margin-right:7px;color:#a9b5c5}@media(max-width:650px){.app-shell{padding:20px 12px}.header-actions{flex-direction:column;gap:6px}.status{flex-wrap:wrap}.table{padding:14px 8px}.market{align-items:flex-start;flex-direction:column}.actions{align-items:stretch;flex-direction:column}}
</style>
