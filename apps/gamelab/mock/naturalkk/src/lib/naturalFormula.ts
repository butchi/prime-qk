import type { PlayingCard } from './cards'
import { isJokerCard } from './cards'

export type FormulaOperator = '+' | '−' | '×' | '÷'

export interface CardFormula {
  targetCardId: string
  target: number
  left: PlayingCard
  operator: FormulaOperator
  right: PlayingCard
}

export interface FormulaDetails {
  formulas: CardFormula[]
  auxiliaryCards: PlayingCard[]
}

function formulaFor(
  target: PlayingCard,
  left: PlayingCard,
  right: PlayingCard,
): CardFormula | null {
  if (isJokerCard(target) || isJokerCard(left) || isJokerCard(right)) return null
  if (left.rank + right.rank === target.rank)
    return { targetCardId: target.id, target: target.rank, left, operator: '+', right }
  if (left.rank - right.rank === target.rank)
    return { targetCardId: target.id, target: target.rank, left, operator: '−', right }
  if (left.rank * right.rank === target.rank)
    return { targetCardId: target.id, target: target.rank, left, operator: '×', right }
  if (right.rank !== 0 && left.rank % right.rank === 0 && left.rank / right.rank === target.rank) {
    return { targetCardId: target.id, target: target.rank, left, operator: '÷', right }
  }
  return null
}

/** 選択済み補助札を、主札ごとの2枚式として割り当てる。 */
export function findFormulaDetails(
  mainCards: readonly PlayingCard[],
  hand: readonly PlayingCard[],
  selectedCardIds: readonly string[],
): FormulaDetails | null {
  if (selectedCardIds.length === 0) return { formulas: [], auxiliaryCards: [] }
  if (selectedCardIds.length % 2 !== 0 || selectedCardIds.length > mainCards.length * 2) return null

  const mainIds = new Set(mainCards.map((card) => card.id))
  const selected = hand.filter((card) => selectedCardIds.includes(card.id) && !mainIds.has(card.id))
  if (selected.length !== selectedCardIds.length) return null

  const search = (
    mainIndex: number,
    remaining: PlayingCard[],
    formulas: CardFormula[],
  ): FormulaDetails | null => {
    if (mainIndex === mainCards.length) {
      return remaining.length === 0
        ? { formulas, auxiliaryCards: formulas.flatMap((f) => [f.left, f.right]) }
        : null
    }

    // この主札には式を付けない。
    const without = search(mainIndex + 1, remaining, formulas)
    if (without) return without

    const target = mainCards[mainIndex]
    for (let leftIndex = 0; leftIndex < remaining.length; leftIndex++) {
      for (let rightIndex = 0; rightIndex < remaining.length; rightIndex++) {
        if (leftIndex === rightIndex) continue
        const formula = formulaFor(target, remaining[leftIndex], remaining[rightIndex])
        if (!formula) continue
        const next = remaining.filter((_, index) => index !== leftIndex && index !== rightIndex)
        const found = search(mainIndex + 1, next, [...formulas, formula])
        if (found) return found
      }
    }
    return null
  }

  return search(0, selected, [])
}

/** 主札ごとに付けられる補助式の候補。2枚出しでは2式同時の候補も作る。 */
export function findFormulaSuggestions(
  mainCards: readonly PlayingCard[],
  hand: readonly PlayingCard[],
): FormulaDetails[] {
  const mainIds = new Set(mainCards.map((card) => card.id))
  const available = hand.filter((card) => !mainIds.has(card.id) && !isJokerCard(card))
  const singles: FormulaDetails[] = []

  for (const main of mainCards) {
    for (let leftIndex = 0; leftIndex < available.length; leftIndex++) {
      for (let rightIndex = 0; rightIndex < available.length; rightIndex++) {
        if (leftIndex === rightIndex) continue
        const formula = formulaFor(main, available[leftIndex], available[rightIndex])
        if (formula)
          singles.push({ formulas: [formula], auxiliaryCards: [formula.left, formula.right] })
      }
    }
  }

  const combined: FormulaDetails[] = []
  for (let first = 0; first < singles.length; first++) {
    for (let second = first + 1; second < singles.length; second++) {
      const a = singles[first]
      const b = singles[second]
      if (a.formulas[0].targetCardId === b.formulas[0].targetCardId) continue
      const ids = [...a.auxiliaryCards, ...b.auxiliaryCards].map((card) => card.id)
      if (new Set(ids).size !== ids.length) continue
      combined.push({
        formulas: [...a.formulas, ...b.formulas],
        auxiliaryCards: [...a.auxiliaryCards, ...b.auxiliaryCards],
      })
    }
  }

  const seen = new Set<string>()
  return [...singles, ...combined].filter((details) => {
    const key = details.formulas
      .map(
        (formula) =>
          `${formula.targetCardId}:${formula.left.id}${formula.operator}${formula.right.id}`,
      )
      .join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function formatFormulas(formulas: readonly CardFormula[]): string {
  return formulas
    .map(
      (formula) => `${formula.target}=${formula.left.rank}${formula.operator}${formula.right.rank}`,
    )
    .join('、')
}
