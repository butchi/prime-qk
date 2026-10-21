import type { PlayingCard } from './PlayingCard'

interface Player {
  id: string
  name: string
  isCPU: boolean
  openCard: boolean // カードをオープンにするかどうか
  hand: PlayingCard[] // プレイヤーの手札
  pile: PlayingCard[] // プレイヤーごとの山札
  field: PlayingCard[] // プレイヤーごとの場
  hasDrawn: boolean // カードを引いたかどうか
  isPassed: boolean // パスしたかどうか
}

export type { Player }
