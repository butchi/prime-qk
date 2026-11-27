<script setup lang="ts">
import { computed, ref } from 'vue'
import Card from '../../components/Card.vue'
import { cardToRankToken, cardsToRankString, type PlayingCard } from '../../lib/cards'
import { ROLE_PATTERNS, findBestHand, findPrimeGroups, type PokerGroup } from './poker'
import { createPokerRound, exchangeAndShowdown } from './round'

const suitMarks = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' }
const suitNames = { clubs: 'クラブ', diamonds: 'ダイヤ', hearts: 'ハート', spades: 'スペード' }
const game = ref(createPokerRound())
const keptCodes = ref<number[]>([])
const round = ref(1)
const score = ref({ wins: 0, draws: 0, losses: 0 })
const announcement = ref('残したいカードをキープしてください。残りを1回だけ交換します。')
const revealed = computed(() => game.value.phase === 'revealed')
const drawCount = computed(() => 5 - keptCodes.value.length)
const playerRole = computed(() =>
  revealed.value ? game.value.playerRole : findBestHand(game.value.playerHand),
)
const cpuRole = computed(() => game.value.cpuRole)
const cpuDisplay = computed(
  () => cpuRole.value?.groups.flatMap((group) => group.cards) ?? game.value.cpuHand,
)
const suggestions = computed(() => {
  if (revealed.value) return []
  const seen = new Set<string>()
  // 同じカードを使う並べ方は最強の1組だけにまとめ、候補を短く保つ。
  return findPrimeGroups(game.value.playerHand)
    .filter((group) => {
      const key = group.cards
        .map((card) => card.code)
        .sort((a, b) => a - b)
        .join(',')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 5)
})
const resultTitle = computed(() =>
  (game.value.result ?? 0) > 0
    ? 'あなたの勝ち！'
    : (game.value.result ?? 0) < 0
      ? 'CPUの勝ち'
      : '引き分け',
)
const formatValue = (value: number) => value.toLocaleString('en-US')

function cardName(card: PlayingCard) {
  return `${card.suit ? suitNames[card.suit] : ''}${cardToRankToken(card)}`
}

function isKept(card: PlayingCard) {
  return (revealed.value ? game.value.playerKeptCodes : keptCodes.value).includes(card.code)
}

function toggleKeep(card: PlayingCard) {
  if (revealed.value) return
  keptCodes.value = isKept(card)
    ? keptCodes.value.filter((code) => code !== card.code)
    : [...keptCodes.value, card.code]
  announcement.value = `${cardName(card)}を${isKept(card) ? 'キープしました' : '交換するカードに戻しました'}。キープ${keptCodes.value.length}枚、交換${drawCount.value}枚です。`
}

function keepAll(keep: boolean) {
  if (revealed.value) return
  keptCodes.value = keep ? game.value.playerHand.map((card) => card.code) : []
  announcement.value = keep
    ? '5枚すべてをキープしました。交換せずに勝負できます。'
    : 'キープを解除しました。5枚すべてを交換します。'
}

function suggestionKept(group: PokerGroup) {
  return group.cards.every((card) => keptCodes.value.includes(card.code))
}

function keepSuggestion(group: PokerGroup) {
  if (revealed.value) return
  keptCodes.value = [...new Set([...keptCodes.value, ...group.cards.map((card) => card.code)])]
  announcement.value = `${cardsToRankString(group.cards)}をキープに追加しました。キープ${keptCodes.value.length}枚、交換${drawCount.value}枚です。`
}

function showdown() {
  if (revealed.value) return
  game.value = exchangeAndShowdown(game.value, keptCodes.value)
  if ((game.value.result ?? 0) > 0) score.value.wins++
  else if ((game.value.result ?? 0) < 0) score.value.losses++
  else score.value.draws++
  announcement.value = `${game.value.playerDrawCount}枚交換しました。${resultTitle.value}。あなたは${playerRole.value?.pattern ?? '役なし'}、CPUは${cpuRole.value?.pattern ?? '役なし'}です。`
}

function deal() {
  game.value = createPokerRound()
  keptCodes.value = []
  round.value++
  announcement.value = '新しく5枚ずつ配りました。残したいカードをキープしてください。'
}
</script>

<template>
  <main class="poker-app">
    <header class="poker-header">
      <div>
        <p class="poker-eyebrow">PRIME POKER <span>素数ポーカー</span></p>
        <h1>KKQKJ<small>（仮）</small><span class="poker-title-mark" aria-hidden="true">♠</span></h1>
        <p class="poker-tagline">残す5枚を考える、素数ポーカー。</p>
      </div>
      <div class="poker-score" aria-label="対戦成績">
        <div><span>あなた</span><strong>{{ score.wins }}</strong><span>勝</span></div>
        <div><span>引き分け</span><strong>{{ score.draws }}</strong><span>回</span></div>
        <div><span>CPU</span><strong>{{ score.losses }}</strong><span>勝</span></div>
      </div>
    </header>

    <div class="poker-layout">
      <div class="poker-table">
        <section class="poker-player" aria-labelledby="player-heading">
          <div class="poker-section-heading">
            <h2 id="player-heading">あなたの手札</h2>
            <span class="poker-round">ROUND {{ round }}</span>
          </div>
          <p class="poker-instruction">{{ revealed ? `${game.playerDrawCount}枚交換しました。役は自動で最強の組み方になります。` : '残したいカードをタップしてキープ。残りを1回だけ交換します。' }}</p>

          <div class="poker-editor" aria-label="キープするカードの選択">
            <button
              v-for="(card, index) in game.playerHand"
              :key="card.id"
              type="button"
              class="poker-card-button"
              :class="{ selected: isKept(card), 'poker-red': card.suit === 'hearts' || card.suit === 'diamonds' }"
              :aria-label="`${index + 1}枚目 ${cardName(card)} ${revealed ? (isKept(card) ? 'キープしたカード' : '交換したカード') : (isKept(card) ? 'キープを解除' : 'キープする')}`"
              :aria-pressed="isKept(card)"
              :disabled="revealed"
              @click="toggleKeep(card)"
            >
              <span class="poker-card-face">
                <Card :card="card" :is-select="isKept(card)" />
                <span class="poker-suit" aria-hidden="true">{{ card.suit ? suitMarks[card.suit] : '' }}</span>
              </span>
              <span class="poker-card-label" :class="{ kept: isKept(card), fresh: revealed && !isKept(card) }" aria-hidden="true">{{ isKept(card) ? '✓ キープ' : revealed ? 'NEW' : '交換' }}</span>
            </button>
          </div>

          <div v-if="!revealed" class="poker-keep-controls">
            <p>キープ <strong>{{ keptCodes.length }}</strong>枚 <span>／</span> 交換 <strong>{{ drawCount }}</strong>枚</p>
            <div>
              <button type="button" :disabled="keptCodes.length === 5" @click="keepAll(true)">すべてキープ</button>
              <button type="button" :disabled="keptCodes.length === 0" @click="keepAll(false)">すべて交換</button>
            </div>
          </div>

          <div class="poker-auto-role" :class="{ valid: playerRole }" aria-label="自動判定した最強の役">
            <div class="poker-section-heading">
              <span>{{ revealed ? '自動で作った最強の役' : '今の5枚で作れる最強の役' }}</span>
              <strong>{{ playerRole?.pattern ?? '役なし' }}</strong>
            </div>
            <div v-if="playerRole" class="poker-values">
              <span v-for="(group, index) in playerRole.groups" :key="index">{{ cardsToRankString(group.cards) }} = {{ formatValue(group.value) }}</span>
            </div>
            <p v-else>{{ revealed ? '全組が素数になる分け方はありませんでした。' : '交換するカードを選んで、素数の役を狙いましょう。' }}</p>
          </div>

          <div v-if="revealed" class="poker-verdict" :class="{ 'poker-win': (game.result ?? 0) > 0 }" role="status" aria-label="勝負の結果">
            <h2>{{ resultTitle }}</h2>
            <p>あなた：{{ playerRole?.pattern ?? '役なし' }} <span aria-hidden="true">/</span> CPU：{{ cpuRole?.pattern ?? '役なし' }}</p>
            <p v-if="game.result === 0">{{ playerRole ? '役も比較する素数の値も同じです。' : 'どちらも役なしです。' }}</p>
            <p v-else-if="!playerRole || !cpuRole">素数だけで5枚を組めた役が勝ちます。</p>
            <p v-else-if="playerRole.pattern !== cpuRole.pattern">役の強さで決まりました。</p>
            <p v-else>同じ役なので、組の枚数・素数の値の順に比べました。</p>
          </div>

          <div class="poker-action-area">
            <button v-if="!revealed" type="button" class="poker-primary" @click="showdown">{{ drawCount ? `${drawCount}枚交換して勝負` : 'この5枚で勝負' }}<span aria-hidden="true">♠</span></button>
            <button v-else type="button" class="poker-primary" @click="deal">次の勝負<span aria-hidden="true">♠</span></button>
            <p v-if="!revealed" class="poker-action-note">並べ替え・組み分けは自動。CPUも1回交換します。</p>
          </div>

          <details v-if="!revealed" :key="round" class="poker-suggestions">
            <summary>素数の候補からキープ<span>必要なときだけ</span></summary>
            <template v-if="suggestions.length">
              <p>今の手札で作れる素数です。選ぶと、その組のカードがキープに加わります。</p>
              <ul>
                <li v-for="group in suggestions" :key="`${cardsToRankString(group.cards)}-${group.value}`">
                  <div><strong>{{ cardsToRankString(group.cards) }}</strong><span>{{ group.cards.length }}枚 · {{ formatValue(group.value) }}</span></div>
                  <button type="button" :disabled="suggestionKept(group)" @click="keepSuggestion(group)">{{ suggestionKept(group) ? 'キープ済み' : 'キープに追加' }}</button>
                </li>
              </ul>
              <p class="poker-suggestion-note">枚数が多く、値が大きい組から最大5件を表示します。</p>
            </template>
            <p v-else>今の手札で作れる素数の候補はありません。</p>
          </details>
        </section>

        <section class="poker-opponent" aria-labelledby="cpu-heading">
          <div class="poker-section-heading">
            <h2 id="cpu-heading">CPU <span>{{ revealed ? `${game.cpuDrawCount}枚交換` : '素数の組をキープして1回交換' }}</span></h2>
            <strong v-if="revealed" class="poker-hand-status" :class="{ valid: cpuRole }">{{ cpuRole ? `役 ${cpuRole.pattern}` : '役なし' }}</strong>
          </div>
          <div class="poker-cpu-cards" :aria-label="revealed ? 'CPUの手札' : 'CPUの手札5枚・非公開'">
            <div v-for="(card, index) in cpuDisplay" :key="card.id" class="poker-cpu-card" :class="{ 'poker-card-back': !revealed, 'poker-red': card.suit === 'hearts' || card.suit === 'diamonds' }">
              <Card :card="revealed ? card : null" />
              <span v-if="!revealed" class="poker-back-mark" aria-hidden="true">♠</span>
              <span v-else class="poker-suit" aria-hidden="true">{{ card.suit ? suitMarks[card.suit] : '' }}</span>
              <span class="poker-sr-only">{{ revealed ? cardName(card) : `非公開のカード${index + 1}` }}</span>
            </div>
          </div>
          <div v-if="revealed" class="poker-cpu-result">
            <div v-if="cpuRole" class="poker-values">
              <span v-for="(group, index) in cpuRole.groups" :key="index">{{ cardsToRankString(group.cards) }} = {{ formatValue(group.value) }}</span>
            </div>
            <p v-else>全組が素数になる分け方はありません。</p>
          </div>
        </section>
      </div>

      <aside class="poker-guide" aria-label="遊び方と役の強さ">
        <section>
          <p class="poker-eyebrow">HOW TO PLAY</p>
          <h2>キープを選んで、素数で勝負。</h2>
          <p>残したいカードをキープし、残りを<strong>1回だけ交換</strong>します。5枚ぜんぶを使った<strong>最強の役は自動</strong>で作ります。</p>
          <p>すべてキープすれば、交換せずに勝負できます。</p>
          <div class="poker-example"><span>Q K</span><strong>12<span>つなげる</span>13</strong><span>= 1,213 <b>素数</b></span></div>
          <p class="poker-rank-note">A = 1 ／ T = 10 ／ J = 11<br>Q = 12 ／ K = 13</p>
        </section>
        <section class="poker-role-guide">
          <p class="poker-eyebrow">HAND RANKINGS</p>
          <div class="poker-section-heading"><h2>役の強さ</h2><span>強い順</span></div>
          <ol>
            <li v-for="pattern in ROLE_PATTERNS" :key="pattern.join('+')" :class="{ current: playerRole?.pattern === pattern.join('+') }">
              <strong>{{ pattern.join(' + ') }}</strong>
              <span class="poker-pattern-blocks" aria-hidden="true"><span v-for="(size, index) in pattern" :key="index"><i v-for="n in size" :key="n"></i></span></span>
            </li>
          </ol>
          <p>同じ役なら、枚数の多い組から素数の値を比較。同じ枚数の組は値の大きい順に比べます。</p>
        </section>
        <details class="poker-more-rules">
          <summary>詳しいルール</summary>
          <p>ジョーカーを除く52枚から、あなたとCPUに5枚ずつ配ります。交換札は残りの山札から引き、捨て札は戻しません。ベットはありません。</p>
          <p>5枚を1回ずつ使い、すべての組が素数になる分け方だけを役として認めます。スートは勝敗に影響しません。</p>
          <p>CPUは、枚数が最も多い素数の組をキープします。同じ枚数なら最も大きい素数の組を選び、残りを交換します。候補がなければ5枚交換します。</p>
          <p>交換後は、両者とも自分の5枚の最強役で勝負します。役が作れなければ役なし。役なし同士、または役も比較する値も同じなら引き分けです。</p>
        </details>
      </aside>
    </div>
    <p class="poker-footer">残すカードを選んだら、あとは素数におまかせ。</p>
    <p class="poker-sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </main>
</template>
