import type { Player } from './Player'
import type { PlayingCard } from './PlayingCard'

interface GameState {
  players: Player[]
  deck: PlayingCard[]
  pile: PlayingCard[]
  currentPlayer: number
  round: number
  initializeGame: (
    playerList: Player[],
    options?: {
      initialHandSize?: number
      evenReduceSize?: number
      openCard?: boolean
    },
  ) => void
}

export type { GameState }
