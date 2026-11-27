<script setup lang="ts">
import { computed, ref } from 'vue'

type Card = { id: number; value: number; label: string; suit?: string }
type Player = { name: string; hand: Card[]; passed: boolean }

const SUITS = ['♠', '♥', '♦', '♣']
let nextId = 1

function createDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (let value = 1; value <= 9; value++) {
      cards.push({ id: nextId++, value, label: String(value), suit })
    }
  }
  cards.push({ id: nextId++, value: 0, label: '0', suit: '★' })
  cards.push({ id: nextId++, value: 0, label: '0', suit: '★' })
  return cards.sort(() => Math.random() - 0.5)
}

const deck = ref<Card[]>([])
const players = ref<Player[]>([
  { name: 'あなた', hand: [], passed: false },
  { name: 'CPU', hand: [], passed: false },
])
const currentPlayer = ref(0)
const selectedIds = ref<number[]>([])
const fieldAnswer = ref<number | null>(null)
const fieldExpression = ref('まだ場にカードはありません')
const logs = ref<string[]>([])
const message = ref('カードを選んで、九九を作ってください')
const winner = ref<string | null>(null)
const turnNumber = ref(1)

const me = computed(() => players.value[0])
const current = computed(() => players.value[currentPlayer.value])
const selectedCards = computed(
  () =>
    selectedIds.value
      .map((id) => me.value.hand.find((card) => card.id === id))
      .filter(Boolean) as Card[],
)
const hasPlayableChoice = computed(() => {
  if (fieldAnswer.value === null) return true
  return findMoves(me.value.hand, fieldAnswer.value).length > 0
})
const canPlay = computed(() => makeEquation(selectedCards.value) !== null)
const equationPreview = computed(() => {
  const equation = makeEquation(selectedCards.value)
  return equation ? `${equation.a} × ${equation.b} = ${equation.answer}` : '因数2枚＋答え札を選択'
})

function makeEquation(cards: Card[]) {
  if (cards.length !== 3 && cards.length !== 4) return null
  const factorCards = cards.slice(0, 2)
  const answerCards = cards.slice(2)
  const a = factorCards[0].value
  const b = factorCards[1].value
  const answer = a * b
  const answerText = answerCards.map((card) => String(card.value)).join('')
  if (answerText !== String(answer) || (answer >= 10 ? cards.length !== 4 : cards.length !== 3))
    return null
  if (fieldAnswer.value !== null && answer <= fieldAnswer.value) return null
  return { a, b, answer }
}

function findMoves(hand: Card[], minimum: number | null) {
  const moves: { cards: Card[]; a: number; b: number; answer: number }[] = []
  for (let i = 0; i < hand.length; i++)
    for (let j = 0; j < hand.length; j++) {
      if (i === j) continue
      const answer = hand[i].value * hand[j].value
      if (minimum !== null && answer <= minimum) continue
      const digits = String(answer).split('').map(Number)
      const answerCards: Card[] = []
      let available = hand.filter((_, index) => index !== i && index !== j)
      let possible = true
      for (const digit of digits) {
        const index = available.findIndex((card) => card.value === digit)
        if (index < 0) {
          possible = false
          break
        }
        answerCards.push(available[index])
        available = available.filter((_, n) => n !== index)
      }
      if (possible)
        moves.push({
          cards: [hand[i], hand[j], ...answerCards],
          a: hand[i].value,
          b: hand[j].value,
          answer,
        })
    }
  return moves
}

function startGame() {
  const cards = createDeck()
  players.value.forEach((player) => {
    player.hand = cards.splice(0, 7)
    player.passed = false
  })
  deck.value = cards
  currentPlayer.value = 0
  selectedIds.value = []
  fieldAnswer.value = null
  fieldExpression.value = 'まだ場にカードはありません'
  logs.value = ['ゲームを開始しました', 'あなたの手番です']
  message.value = 'カードを選んで、九九を作ってください'
  winner.value = null
  turnNumber.value = 1
}

function toggleCard(card: Card) {
  if (currentPlayer.value !== 0 || winner.value) return
  selectedIds.value = selectedIds.value.includes(card.id)
    ? selectedIds.value.filter((id) => id !== card.id)
    : [...selectedIds.value, card.id]
  message.value = equationPreview.value
}

function playSelected() {
  const equation = makeEquation(selectedCards.value)
  if (!equation) {
    message.value = 'その組み合わせでは出せません'
    return
  }
  const hand = me.value.hand
  me.value.hand = hand.filter((card) => !selectedIds.value.includes(card.id))
  fieldAnswer.value = equation.answer
  fieldExpression.value = `${equation.a} × ${equation.b} = ${equation.answer}`
  selectedIds.value = []
  me.value.passed = false
  logs.value.unshift(`あなた：${fieldExpression.value}（${equation.answer >= 10 ? 4 : 3}枚）`)
  if (me.value.hand.length === 0) {
    winner.value = me.value.name
    return
  }
  nextTurn()
}

function pass() {
  if (currentPlayer.value !== 0 || winner.value) return
  me.value.passed = true
  selectedIds.value = []
  logs.value.unshift('あなた：パス')
  message.value = 'パスしました'
  resolvePassOrNext()
}

function draw() {
  if (currentPlayer.value !== 0 || winner.value || deck.value.length === 0) return
  const card = deck.value.pop()!
  me.value.hand.push(card)
  me.value.passed = false
  selectedIds.value = []
  logs.value.unshift(`あなた：${card.label}を1枚ドロー`)
  message.value = `${card.label}を引きました。CPUの手番です`
  nextTurn()
}

function nextTurn() {
  currentPlayer.value = 1 - currentPlayer.value
  turnNumber.value++
  if (currentPlayer.value === 1) window.setTimeout(cpuTurn, 500)
}

function cpuTurn() {
  if (winner.value) return
  const cpu = players.value[1]
  const move = findMoves(cpu.hand, fieldAnswer.value).sort((a, b) => a.answer - b.answer)[0]
  if (move) {
    cpu.hand = cpu.hand.filter((card) => !move.cards.some((used) => used.id === card.id))
    fieldAnswer.value = move.answer
    fieldExpression.value = `${move.a} × ${move.b} = ${move.answer}`
    cpu.passed = false
    logs.value.unshift(`CPU：${fieldExpression.value}`)
    message.value = `CPUが ${fieldExpression.value} を出しました`
    if (cpu.hand.length === 0) {
      winner.value = cpu.name
      return
    }
    currentPlayer.value = 0
    turnNumber.value++
    return
  }
  if (deck.value.length > 0) {
    cpu.hand.push(deck.value.pop()!)
    cpu.passed = false
    logs.value.unshift('CPU：出せずに1枚ドロー')
  } else {
    cpu.passed = true
    logs.value.unshift('CPU：パス')
  }
  currentPlayer.value = 0
  turnNumber.value++
  resolvePassOrNext()
}

function resolvePassOrNext() {
  if (players.value.every((player) => player.passed)) {
    fieldAnswer.value = null
    fieldExpression.value = '場が流れました。次の九九から始めます'
    players.value.forEach((player) => {
      player.passed = false
    })
    logs.value.unshift('全員パス：場を流しました')
  }
  if (currentPlayer.value === 0 && !hasPlayableChoice.value && deck.value.length > 0) {
    message.value = '出せる九九がないため、1枚ドローしてください'
  } else if (currentPlayer.value === 0) {
    message.value = 'あなたの手番です'
  }
}

startGame()
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div><span class="eyebrow">KUKU DAIFUGO</span><h1>九九大富豪</h1></div>
      <button class="new-game" @click="startGame">新しいゲーム <span>↗</span></button>
    </header>

    <main class="game-layout">
      <section class="game-main">
        <div class="status-row">
          <div class="turn-pill"><span class="live-dot"></span> {{ current.name }}の手番</div>
          <div class="turn-count">TURN {{ String(turnNumber).padStart(2, '0') }}</div>
        </div>

        <div class="opponent-panel">
          <div class="player-label"><span class="avatar cpu">◎</span><div><strong>CPU</strong><small>{{ players[1].hand.length }}枚の手札</small></div></div>
          <div class="back-cards"><i v-for="n in Math.min(players[1].hand.length, 8)" :key="n"></i></div>
        </div>

        <div class="field-panel">
          <div class="field-heading"><span>場</span><small v-if="fieldAnswer !== null">答えは {{ fieldAnswer }} より大きく</small></div>
          <div class="equation-card" :class="{ empty: fieldAnswer === null }"><span v-if="fieldAnswer !== null" class="equation">{{ fieldExpression }}</span><span v-else class="empty-field">{{ fieldExpression }}</span></div>
          <div v-if="fieldAnswer !== null" class="field-rule">次は <b>{{ fieldAnswer }}より大きい</b> 答えの九九</div>
        </div>

        <div class="action-message">{{ message }}</div>
        <section class="hand-section">
          <div class="section-title"><span>あなたの手札</span><b>{{ me.hand.length }} <small>CARDS</small></b></div>
          <div class="hand">
            <button v-for="card in me.hand" :key="card.id" class="playing-card" :class="{ selected: selectedIds.includes(card.id), red: card.suit === '♥' || card.suit === '♦', joker: card.suit === '★' }" @click="toggleCard(card)">
              <span class="card-corner">{{ card.label }}<i>{{ card.suit }}</i></span><strong>{{ card.label }}</strong><span class="card-corner bottom">{{ card.label }}<i>{{ card.suit }}</i></span>
            </button>
          </div>
          <div class="selection-bar"><span>選択中 <b>{{ selectedCards.length }}枚</b></span><strong>{{ equationPreview }}</strong><button class="clear-btn" @click="selectedIds = []">クリア</button></div>
        </section>
        <div class="controls"><button class="primary-btn" :disabled="!canPlay || currentPlayer !== 0" @click="playSelected">この九九を出す <span>→</span></button><button class="secondary-btn" :disabled="currentPlayer !== 0" @click="pass">パス</button><button class="draw-btn" :disabled="currentPlayer !== 0 || deck.length === 0" @click="draw">出せないので1枚ドロー <span>＋</span></button></div>
        <div v-if="winner" class="winner-banner">🎉 {{ winner }}の勝ち！ <button @click="startGame">もう一度遊ぶ</button></div>
      </section>

      <aside class="side-panel"><div class="deck-count"><span class="deck-icon">▣</span><div><small>山札</small><strong>{{ deck.length }}<em>枚</em></strong></div></div><div class="rule-card"><h2>RULES <span>遊び方</span></h2><p><b>1</b> 因数札2枚と答え札を選ぶ</p><p><b>2</b> 1桁の答えは3枚、2桁は4枚</p><p><b>3</b> 場の答えより大きい九九を出す</p><p><b>4</b> 出せなければ1枚ドロー</p><p><b>5</b> 全員パスで場が流れる</p></div><div class="log-card"><h2>PLAY LOG <span>プレイログ</span></h2><div class="logs"><p v-for="(log, i) in logs.slice(0, 8)" :key="i">{{ log }}</p></div></div></aside>
    </main>
  </div>
</template>
