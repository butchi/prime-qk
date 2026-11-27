<script setup lang="ts">
import { computed, ref } from 'vue'

type Card = { id: number; value: number; label: string; suit?: string }
type Player = { name: string; hand: Card[]; passed: boolean }
type Operator = '+' | '−' | '×' | '÷'
type Equation = { a: number; b: number; answer: number; operator: Operator; cards: Card[] }

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
const fieldMode = ref<'single' | 'double' | null>(null)
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
const candidateEquations = computed(() => {
  if (selectedCards.value.length !== 2) return []
  return findEquationsForFactors(selectedCards.value[0], selectedCards.value[1], me.value.hand)
})
const hasPlayableChoice = computed(() => {
  if (fieldAnswer.value === null) return true
  return findMoves(me.value.hand, fieldAnswer.value).length > 0
})
const canPlay = computed(() => makeEquation(selectedCards.value) !== null)
const equationPreview = computed(() => {
  const equation = makeEquation(selectedCards.value)
  return equation
    ? `${equation.a} ${equation.operator} ${equation.b} = ${equation.answer}`
    : '因数2枚＋答え札を選択'
})

function calculate(a: number, b: number, operator: Operator): number | null {
  if (operator === '+') return a + b
  if (operator === '−') return Math.max(0, a - b)
  if (operator === '×') return a * b
  if (b === 0 || a % b !== 0) return null
  return a / b
}

function findEquationsForFactors(first: Card, second: Card, hand: Card[]): Equation[] {
  const equations: Equation[] = []
  const remaining = hand.filter((card) => card.id !== first.id && card.id !== second.id)
  for (const operator of ['+', '−', '×', '÷'] as Operator[]) {
    const answer = calculate(first.value, second.value, operator)
    if (
      answer === null ||
      answer > 81 ||
      (fieldMode.value === 'single' && answer > 9) ||
      (fieldMode.value === 'double' && answer < 10)
    )
      continue
    if (fieldAnswer.value !== null && answer <= fieldAnswer.value) continue
    const answerCards: Card[] = []
    let available = remaining.slice()
    let possible = true
    for (const digit of String(answer)) {
      const index = available.findIndex((card) => card.value === Number(digit))
      if (index < 0) {
        possible = false
        break
      }
      answerCards.push(available[index])
      available = available.filter((_, i) => i !== index)
    }
    if (possible)
      equations.push({
        a: first.value,
        b: second.value,
        answer,
        operator,
        cards: [first, second, ...answerCards],
      })
  }
  return equations
}

function makeEquation(cards: Card[]): Equation | null {
  if (cards.length !== 3 && cards.length !== 4) return null
  const a = cards[0].value
  const b = cards[1].value
  const answerCards = cards.slice(2)
  const answerText = answerCards.map((card) => String(card.value)).join('')
  const operator = (['+', '−', '×', '÷'] as Operator[]).find(
    (candidate) =>
      calculate(a, b, candidate) !== null && String(calculate(a, b, candidate)) === answerText,
  )
  if (!operator) return null
  const answer = calculate(a, b, operator)!
  if ((fieldMode.value === 'single' && answer > 9) || (fieldMode.value === 'double' && answer < 10))
    return null
  if (fieldAnswer.value !== null && answer <= fieldAnswer.value) return null
  if (answerText.startsWith('0') || (answer >= 10 ? cards.length !== 4 : cards.length !== 3))
    return null
  return { a, b, answer, operator, cards }
}

function findMoves(hand: Card[], minimum: number | null) {
  const moves: Equation[] = []
  for (let i = 0; i < hand.length; i++)
    for (let j = 0; j < hand.length; j++) {
      if (i === j) continue
      moves.push(
        ...findEquationsForFactors(hand[i], hand[j], hand).filter(
          (move) => minimum === null || move.answer > minimum,
        ),
      )
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
  fieldMode.value = null
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

function chooseCandidate(equation: Equation) {
  selectedIds.value = equation.cards.map((card) => card.id)
  message.value = `${equation.a} ${equation.operator} ${equation.b} = ${equation.answer}`
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
  fieldMode.value = equation.answer < 10 ? 'single' : 'double'
  fieldExpression.value = `${equation.a} ${equation.operator} ${equation.b} = ${equation.answer}`
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
    fieldMode.value = move.answer < 10 ? 'single' : 'double'
    fieldExpression.value = `${move.a} ${move.operator} ${move.b} = ${move.answer}`
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
    fieldMode.value = null
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
          <div class="field-heading"><span>場 <i v-if="fieldMode" class="mode-badge">{{ fieldMode === 'single' ? '1桁場' : '2桁場' }}</i></span><small v-if="fieldAnswer !== null">答えは {{ fieldAnswer }} より大きく</small></div>
          <div class="equation-card" :class="{ empty: fieldAnswer === null }"><span v-if="fieldAnswer !== null" class="equation">{{ fieldExpression }}</span><span v-else class="empty-field">{{ fieldExpression }}</span></div>
          <div v-if="fieldAnswer !== null" class="field-rule">次は <b>{{ fieldAnswer }}より大きい</b> 答えの式（{{ fieldMode === 'single' ? '1桁' : '2桁' }}）</div>
        </div>

        <div class="action-message">{{ message }}</div>
        <section class="hand-section">
          <div class="section-title"><span>あなたの手札</span><b>{{ me.hand.length }} <small>CARDS</small></b></div>
          <div class="hand">
            <button v-for="card in me.hand" :key="card.id" class="playing-card" :class="{ selected: selectedIds.includes(card.id), red: card.suit === '♥' || card.suit === '♦', joker: card.suit === '★' }" @click="toggleCard(card)">
              <span class="card-corner">{{ card.label }}<i>{{ card.suit }}</i></span><strong>{{ card.label }}</strong><span class="card-corner bottom">{{ card.label }}<i>{{ card.suit }}</i></span>
            </button>
          </div>
          <div v-if="candidateEquations.length" class="candidate-row"><span>候補</span><button v-for="equation in candidateEquations" :key="`${equation.operator}-${equation.answer}`" @click="chooseCandidate(equation)">{{ equation.a }} {{ equation.operator }} {{ equation.b }} = {{ equation.answer }}</button></div>
          <div class="selection-bar"><span>選択中 <b>{{ selectedCards.length }}枚</b></span><strong>{{ equationPreview }}</strong><button class="clear-btn" @click="selectedIds = []">クリア</button></div>
        </section>
        <div class="controls"><button class="primary-btn" :disabled="!canPlay || currentPlayer !== 0" @click="playSelected">この式を出す <span>→</span></button><button class="secondary-btn" :disabled="currentPlayer !== 0" @click="pass">パス</button><button class="draw-btn" :disabled="currentPlayer !== 0 || deck.length === 0" @click="draw">出せないので1枚ドロー <span>＋</span></button></div>
        <div v-if="winner" class="winner-banner">🎉 {{ winner }}の勝ち！ <button @click="startGame">もう一度遊ぶ</button></div>
      </section>

      <aside class="side-panel"><div class="deck-count"><span class="deck-icon">▣</span><div><small>山札</small><strong>{{ deck.length }}<em>枚</em></strong></div></div><div class="rule-card"><h2>RULES <span>遊び方</span></h2><p><b>1</b> 因数札2枚と答え札を選ぶ</p><p><b>2</b> ＋ − × ÷ の四則演算が使える</p><p><b>3</b> 1桁は3枚、2桁は4枚で消費</p><p><b>4</b> 初手で1桁場／2桁場が決まる</p><p><b>5</b> 出せなければ1枚ドロー</p><p><b>6</b> 全員パスで場が流れる</p></div><div class="log-card"><h2>PLAY LOG <span>プレイログ</span></h2><div class="logs"><p v-for="(log, i) in logs.slice(0, 8)" :key="i">{{ log }}</p></div></div></aside>
    </main>
  </div>
</template>
