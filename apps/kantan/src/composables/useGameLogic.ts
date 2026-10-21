import type { PlayingCard } from '../types/PlayingCard'
import type { Player } from '../types/Player'
import {
  cpuSelectPlay as selectCpuPlayFromEngine,
  isValidPlay as isValidPlayByEngine,
} from '../lib/primeDaifugo'

export function isValidPlay(
  playedCards: PlayingCard[],
  currentFieldCards: PlayingCard[],
): boolean {
  return isValidPlayByEngine(playedCards, currentFieldCards)
}

export function cpuSelectPlay(
  player: Player,
  field: PlayingCard[][],
): PlayingCard[] {
  return selectCpuPlayFromEngine(player, field)
}

export function cpuPlayTurn(
  player: Player,
  field: PlayingCard[][],
): PlayingCard[] {
  const playableCards = cpuSelectPlay(player, field)

  if (playableCards.length > 0) {
    player.hand = player.hand.filter(card => !playableCards.includes(card))
    if (isValidPlay(playableCards, field[field.length - 1] || [])) {
      field.push(playableCards)
      return playableCards // 出したカードを返す
    }
  }

  return [] // 出せなかった場合は空配列を返す
}
