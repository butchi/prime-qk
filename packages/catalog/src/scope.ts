export const catalogScope = {
  jokers: false,
  minCards: 1,
  maxCards: 6,
  completeThroughCards: 4,
  extendedRanks: [10, 11, 12, 13],
} as const

export const catalogScopeDescription = 'ジョーカーなし・1〜4枚は全ランク、5〜6枚はT・J・Q・Kのみ'
export const catalogCardCounts = [1, 2, 3, 4, 5, 6] as const
export const catalogDigitCounts = Array.from({ length: 12 }, (_, index) => index + 1)
