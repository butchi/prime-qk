<script setup lang="ts">
import { computed, ref } from 'vue'

type Card = { id: number; value: number; label: string; suit?: string }
type Player = { name: string; hand: Card[]; passed: boolean }

const SUITS = ['♠', '♥', '♦', '♣']
const faceComboValues = new Map<number, number>([
  [11, 1], // J + A = 1×1
  [12, 2], // Q + 2 = 1×2
  [13, 3], // K + 3 = 1×3
])
let nextId = 1

function rankLabel(value: number) {
  if (value === 1) return 'A'
  if (value === 10) return 'T'
  if (value === 11) return 'J'
  if (value === 12) return 'Q'
  if (value === 13) return 'K'
  return String(value)
}

function createDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (let value = 1; value <= 13; value++) {
      cards.push({ id: nextId++, value, label: rankLabel(value), suit })
    }
  }
  cards.push({ id: nextId++, value: 0, label: '0', suit: '★' })
  cards.push({ id: nextId++, value: 0, label: '0', suit: '★' })
  return cards.sort(() => Math.random() - 0.5)
}

function sortHand(hand: Card[]) {
  const suitOrder = ['♠', '♥', '♦', '♣', '★']
  return [...hand].sort(
    (left, right) =>
      left.value - right.value ||
      suitOrder.indexOf(left.suit ?? '') - suitOrder.indexOf(right.suit ?? ''),
  )
}

const deck = ref<Card[]>([])
const players = ref<Player[]>([
  { name: 'あなた', hand: [], passed: false },
  { name: 'CPU', hand: [], passed: false },
])
const currentPlayer = ref(0)
const selectedIds = ref<number[]>([])
const fieldAnswer = ref<number | null>(null)
const fieldMainCardCount = ref<1 | 2 | null>(null)
const comboBound = ref(false)
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
  return findMoves(me.value.hand).length > 0
})
const canPlay = computed(() => {
  return makeEquation(selectedCards.value) !== null
})
const equationPreview = computed(() => {
  const equation = makeEquation(selectedCards.value)
  if (!equation)
    return selectedCards.value.length <= 2
      ? '主札を1〜2枚選択'
      : '九九の因数2枚と主札が一致する組を選択'
  return equation.a === null
    ? `主数 ${equation.answer}`
    : `${equation.a} × ${equation.b} = ${equation.answer}`
})

function evaluateMainCards(cards: Card[]) {
  // 主数だけで出す。2枚連結は 0〜9 のカードに限る。
  if (
    cards.length === 1 ||
    (cards.length === 2 && cards.every((card) => card.value >= 0 && card.value <= 9))
  ) {
    return {
      value: Number(cards.map((card) => String(card.value)).join('')),
      count: cards.length as 1 | 2,
    }
  }
  return null
}

function createEquation(main: ReturnType<typeof evaluateMainCards>, factorCards: Card[] = []) {
  if (!main) return null
  if (fieldAnswer.value !== null && main.value <= fieldAnswer.value) return null

  if (factorCards.length === 0) {
    if (comboBound.value) return null
    return { a: null, b: null, answer: main.value, mainCardCount: main.count, isCombo: false }
  }
  if (factorCards.length !== 2) return null

  // 九九1組を補助札として使う。因数は九九表どおり1〜9に限る。
  const a = factorCards[0].value
  const b = factorCards[1].value
  if (a < 1 || a > 9 || b < 1 || b > 9) return null
  if (a * b !== main.value) return null
  return { a, b, answer: main.value, mainCardCount: main.count, isCombo: true }
}

function makeEquation(cards: Card[]) {
  const normalPlay = createEquation(evaluateMainCards(cards))
  if (normalPlay) return normalPlay

  // J/Q/K は 1×1 / 1×2 / 1×3 の補助札として、対応する数札との2枚コンボを作れる。
  if (cards.length === 2) {
    const helper = cards.find((card) => faceComboValues.has(card.value))
    const mainCard = cards.find((card) => card !== helper)
    const expectedValue = helper ? faceComboValues.get(helper.value) : undefined
    if (helper && mainCard && mainCard.value === expectedValue) {
      return createEquation({ value: mainCard.value, count: 1 }, [
        { ...helper, value: 1 },
        mainCard,
      ])
    }
  }

  if (cards.length !== 3 && cards.length !== 4) return null

  // 選択順に依存せず、因数2枚と主札1〜2枚に分けてコンボを判定する。
  for (let firstIndex = 0; firstIndex < cards.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < cards.length; secondIndex++) {
      const factorCards = [cards[firstIndex], cards[secondIndex]]
      const mainCards = cards.filter((_, index) => index !== firstIndex && index !== secondIndex)
      const comboPlay = createEquation(evaluateMainCards(mainCards), factorCards)
      if (comboPlay) return comboPlay
    }
  }

  return null
}

type CpuMove = {
  cards: Card[]
  a: number | null
  b: number | null
  answer: number
  mainCardCount: 1 | 2
}

function findMoves(hand: Card[]): CpuMove[] {
  const moves: CpuMove[] = []
  const seen = new Set<string>()
  const addMove = (cards: Card[]) => {
    // makeEquation は主札1枚、2枚連結、通常コンボ、J/Q/K特殊コンボを一括で判定する。
    const equation = makeEquation(cards)
    if (!equation) return
    const key = `${[...cards]
      .map((card) => card.id)
      .sort((a, b) => a - b)
      .join(',')}:${equation.answer}`
    if (seen.has(key)) return
    seen.add(key)
    moves.push({
      cards,
      a: equation.a,
      b: equation.b,
      answer: equation.answer,
      mainCardCount: equation.mainCardCount as 1 | 2,
    })
  }

  for (let i = 0; i < hand.length; i++) {
    addMove([hand[i]])
    for (let j = i + 1; j < hand.length; j++) {
      // 2枚主数はカード順で 34 / 43 の両方を試す。
      addMove([hand[i], hand[j]])
      addMove([hand[j], hand[i]])
      for (let k = j + 1; k < hand.length; k++) {
        addMove([hand[i], hand[j], hand[k]])
        for (let l = k + 1; l < hand.length; l++) {
          addMove([hand[i], hand[j], hand[k], hand[l]])
        }
      }
    }
  }

  return moves
}

function startGame() {
  const cards = createDeck()
  players.value.forEach((player) => {
    player.hand = sortHand(cards.splice(0, 11))
    player.passed = false
  })
  deck.value = cards
  currentPlayer.value = 0
  selectedIds.value = []
  fieldAnswer.value = null
  fieldMainCardCount.value = null
  comboBound.value = false
  fieldExpression.value = 'まだ場にカードはありません'
  logs.value = ['ゲームを開始しました', 'あなたの手番です']
  message.value = '主札を選ぶか、因数2枚＋主札で九九を作ってください'
  winner.value = null
  turnNumber.value = 1
}

function toggleCard(card: Card) {
  if (currentPlayer.value !== 0 || winner.value) return
  selectedIds.value = selectedIds.value.includes(card.id)
    ? selectedIds.value.filter((id) => id !== card.id)
    : selectedIds.value.length < 4
      ? [...selectedIds.value, card.id]
      : selectedIds.value
  message.value = equationPreview.value
}

function clearSelection() {
  selectedIds.value = []
}

function playSelected() {
  const equation = makeEquation(selectedCards.value)
  if (!equation) {
    message.value = 'その組み合わせでは出せません'
    return
  }
  const hand = me.value.hand
  const usedIds = new Set(selectedIds.value)
  me.value.hand = hand.filter((card) => !usedIds.has(card.id))
  fieldAnswer.value = equation.answer
  fieldMainCardCount.value = equation.mainCardCount as 1 | 2
  comboBound.value = equation.isCombo
  fieldExpression.value =
    equation.a === null
      ? `主数 ${equation.answer}`
      : `${equation.a} × ${equation.b} = ${equation.answer}`
  clearSelection()
  me.value.passed = false
  logs.value.unshift(`あなた：${fieldExpression.value}`)
  if (me.value.hand.length === 0) {
    winner.value = me.value.name
    return
  }
  nextTurn()
}

function pass() {
  if (currentPlayer.value !== 0 || winner.value) return
  me.value.passed = true
  clearSelection()
  logs.value.unshift('あなた：パス')
  message.value = 'パスしました'
  resolvePassOrNext()
  nextTurn()
}

function draw() {
  if (currentPlayer.value !== 0 || winner.value || deck.value.length === 0) return
  const card = deck.value.pop()!
  me.value.hand = sortHand([...me.value.hand, card])
  // この画面ではドロー後に続けて出札しないため、ドローはパス扱いにする。
  me.value.passed = true
  clearSelection()
  logs.value.unshift(`あなた：${card.label}を1枚ドロー`)
  message.value = `${card.label}を引きました。CPUの手番です`
  resolvePassOrNext()
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
  const move = findMoves(cpu.hand).sort((a, b) => a.answer - b.answer)[0]
  if (move) {
    cpu.hand = cpu.hand.filter((card) => !move.cards.some((used) => used.id === card.id))
    fieldAnswer.value = move.answer
    fieldMainCardCount.value = move.mainCardCount
    comboBound.value = move.a !== null
    fieldExpression.value =
      move.a === null ? `主数 ${move.answer}` : `${move.a} × ${move.b} = ${move.answer}`
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
    cpu.hand = sortHand([...cpu.hand, deck.value.pop()!])
    cpu.passed = true
    logs.value.unshift('CPU：出せずに1枚ドローしてパス')
  } else {
    cpu.passed = true
    logs.value.unshift('CPU：パス')
  }
  currentPlayer.value = 0
  turnNumber.value++
  resolvePassOrNext()
}

function resolvePassOrNext() {
  // 最後に場を更新した人以外がパスしたら、その場は流れる。
  // 2人戦なら、相手が応答できずパスした時点で場を流す。
  if (
    fieldAnswer.value !== null &&
    players.value.filter((player) => player.passed).length >= players.value.length - 1
  ) {
    fieldAnswer.value = null
    fieldMainCardCount.value = null
    comboBound.value = false
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
          <div class="field-heading"><span>場</span><small v-if="fieldAnswer !== null">答えは {{ fieldAnswer }} より大きく（1桁・2桁どちらも可）</small><small v-if="comboBound">コンボ縛り中</small></div>
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
          <div class="selection-bar">
            <span>選択中 <b>{{ selectedCards.length }}枚</b></span>
            <strong>{{ equationPreview }}</strong>
            <button class="clear-btn" @click="clearSelection">クリア</button>
          </div>
        </section>
        <div class="controls"><button class="primary-btn" :disabled="!canPlay || currentPlayer !== 0" @click="playSelected">主数を出す <span>→</span></button><button class="secondary-btn" :disabled="currentPlayer !== 0" @click="pass">パス</button><button class="draw-btn" :disabled="currentPlayer !== 0 || deck.length === 0" @click="draw">出せないので1枚ドロー <span>＋</span></button></div>
        <div v-if="winner" class="winner-banner">🎉 {{ winner }}の勝ち！ <button @click="startGame">もう一度遊ぶ</button></div>
      </section>

      <aside class="side-panel"><div class="deck-count"><span class="deck-icon">▣</span><div><small>山札</small><strong>{{ deck.length }}<em>枚</em></strong></div></div><div class="rule-card"><h2>RULES <span>遊び方</span></h2><p><b>1</b> 1〜2枚なら通常出しとして判定</p><p><b>2</b> 3〜4枚なら九九の因数2枚＋主札として判定</p><p><b>3</b> J+A、Q+2、K+3は1の段の特殊コンボ</p><p><b>4</b> コンボを出すと、場が流れるまでコンボ縛り</p><p><b>5</b> 相手が応答不能なら場が流れる</p></div><div class="log-card"><h2>PLAY LOG <span>PLAY LOG</span></h2><div class="logs"><p v-for="(log, i) in logs.slice(0, 8)" :key="i">{{ log }}</p></div></div></aside>
    </main>
  </div>
</template>
