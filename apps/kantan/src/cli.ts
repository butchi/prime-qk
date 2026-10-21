import { createInterface } from 'node:readline/promises'
import { argv, stdin as input, stdout as output } from 'node:process'
import { cardsToRankString, evalF, rankStringToCards } from './lib/cards'
import {
  createPrimeDaifugoGame,
  drawCard,
  getCurrentPlayer,
  passTurn,
  playCards,
  playCpuTurn,
  type PrimeDaifugoGame,
} from './lib/primeDaifugo'

const rl = createInterface({ input, output })

async function main() {
  const game = createPrimeDaifugoGame()
  const openCpuHand = argv.includes('--open-card')

  console.log('カンタン素数大富豪 CLI')
  console.log('コマンド: カード文字列を出す / d=ドロー / p=パス / q=終了')
  console.log('カード: A=1, T=10, J=11, Q=12, K=13。スートは表示・入力しません。')
  console.log('CPU手札を表示する場合は --open-card を指定してください。')


  while (!game.winnerId) {
    renderGame(game, { openCpuHand })
    const player = getCurrentPlayer(game)

    if (player.isCPU) {
      const result = playCpuTurn(game)
      console.log(result.message)
      continue
    }

    const answer = (await rl.question('> ')).trim().toLowerCase()

    if (answer === 'q') break
    if (answer === 'd') {
      console.log(drawCard(game).message)
      continue
    }
    if (answer === 'p') {
      console.log(passTurn(game).message)
      continue
    }

    const selectedCards = rankStringToCards(answer, player.hand)
    if (!selectedCards) {
      console.log('手札にあるカード文字列を入力してください')
      continue
    }

    const indexes = selectedCards.map(card =>
      player.hand.findIndex(handCard => handCard.id === card.id),
    )
    const result = playCards(game, indexes)
    console.log(result.message)
  }

  rl.close()
}

function renderGame(game: PrimeDaifugoGame, options: { openCpuHand: boolean }) {
  const player = getCurrentPlayer(game)
  const lastField = game.field[game.field.length - 1] ?? []
  const handText =
    player.isCPU && !options.openCpuHand
      ? '?'.repeat(player.hand.length)
      : cardsToRankString(player.hand)

  console.log('')
  console.log(`第${game.round}ラウンド / 山札 ${game.deck.length}枚`)
  console.log(
    `場: ${lastField.length > 0 ? `${evalF(lastField)} (${cardsToRankString(lastField)})` : 'なし'}`,
  )
  console.log(`${player.name}の手番`)
  console.log(handText)
}

main().catch(error => {
  rl.close()
  console.error(error)
  process.exitCode = 1
})
