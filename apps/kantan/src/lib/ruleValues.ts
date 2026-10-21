import { isJokerCard, v, type PlayingCard } from './cards'
import {
  defaultRuleSettings,
  type FieldValue,
  type GameMode,
  type RuleSettings,
} from './ruleState'
import { isCompositeBigInt, isPrimeBigInt } from './primes'

export interface EvalMainOptions {
  mode?: GameMode
  settings?: RuleSettings
  jokerValueByCardId?: ReadonlyMap<string, number>
}

export type EvalFactorTokenOptions = Pick<
  EvalMainOptions,
  'settings' | 'jokerValueByCardId'
>

export type FactorGroup = readonly PlayingCard[][]
export type FactorGroups = readonly FactorGroup[]

export interface EvalFactorGroupsOptions extends EvalFactorTokenOptions {
  limit?: bigint
}

export type PlayClass =
  | { kind: 'prime'; value: FieldValue }
  | { kind: 'grotanCut'; value: bigint }
  | { kind: 'ramanujanRevolution'; value: bigint }
  | { kind: 'composite'; value: bigint }
  | { kind: 'foul'; reason: string }

export interface ValidateOfficialPlayOptions extends EvalMainOptions {
  currentFieldValues?: readonly FieldValue[]
  factorGroups?: FactorGroups
}

export type OfficialPlayValidation =
  | { ok: true; value: FieldValue; playClass: Exclude<PlayClass, { kind: 'foul' }> }
  | { ok: false; reason: string; value?: FieldValue; playClass?: PlayClass }

export function fTurn(
  card: PlayingCard,
  jokerValueByCardId: ReadonlyMap<string, number> = new Map(),
): number | null {
  if (isJokerCard(card)) {
    const jokerValue = jokerValueByCardId.get(card.id) ?? 1
    if (!Number.isInteger(jokerValue) || jokerValue < 0 || jokerValue > 13) {
      return null
    }

    return jokerValue
  }

  return v(card)
}

export function conBase10(values: readonly number[]): bigint | null {
  if (values.length === 0) return null
  if (values[0] <= 0) return null

  return BigInt(values.map(String).join(''))
}

export function evalMain(
  cards: readonly PlayingCard[],
  options: EvalMainOptions = {},
): FieldValue | null {
  const settings = options.settings ?? defaultRuleSettings
  const mode = options.mode ?? 'normal'

  if (cards.length === 0) return null
  if (settings.maxMainCards !== 'infinity' && cards.length > settings.maxMainCards) {
    return null
  }

  if (
    cards.length === 1 &&
    isJokerCard(cards[0]) &&
    settings.singleJokerRule === 'infinity'
  ) {
    return mode === 'normal'
      ? { kind: 'positiveInfinity' }
      : { kind: 'negativeInfinity' }
  }

  if (
    cards.length === 2 &&
    settings.doubleJokerInfinity &&
    cards.every(isJokerCard)
  ) {
    return mode === 'normal'
      ? { kind: 'positiveInfinity' }
      : { kind: 'negativeInfinity' }
  }

  const values: number[] = []
  for (const card of cards) {
    const value = fTurn(card, options.jokerValueByCardId)
    if (value === null) return null
    values.push(value)
  }

  const value = conBase10(values)
  if (value === null) return null

  return { kind: 'finite', value }
}

export function evalFactorToken(
  cards: readonly PlayingCard[],
  options: EvalFactorTokenOptions = {},
): bigint | null {
  const value = evalMain(cards, {
    ...options,
    mode: 'normal',
    settings: {
      ...(options.settings ?? defaultRuleSettings),
      singleJokerRule: 'finite',
    },
  })

  if (value?.kind !== 'finite') return null
  if (value.value < 2n) return null

  return value.value
}

export function evalFactorGroups(
  groups: FactorGroups,
  options: EvalFactorGroupsOptions = {},
): bigint | null {
  let product = 1n

  for (const group of groups) {
    const groupValue = evalFactorGroup(group, options)
    if (groupValue === null) return null

    product *= groupValue
    if (options.limit !== undefined && product > options.limit) return null
  }

  return product
}

export function evalFactorGroup(
  group: FactorGroup,
  options: EvalFactorGroupsOptions = {},
): bigint | null {
  if (group.length === 0) return null

  const base = evalFactorToken(group[0], options)
  if (base === null || !isPrimeBigInt(base)) return null
  if (group.length === 1) return base

  const exponent = evalRightAssociatedPowerTower(group.slice(1), options)
  if (exponent === null) return null

  return powerWithLimit(base, exponent, options.limit)
}

export function evalRightAssociatedPowerTower(
  tokens: FactorGroup,
  options: EvalFactorGroupsOptions = {},
): bigint | null {
  if (tokens.length === 0) return null

  let value = evalFactorToken(tokens[tokens.length - 1], options)
  if (value === null) return null

  for (let i = tokens.length - 2; i >= 0; i--) {
    const base = evalFactorToken(tokens[i], options)
    if (base === null) return null

    value = powerWithLimit(base, value, options.limit)
    if (value === null) return null
  }

  return value
}

export function classifyPlay(
  mainValue: FieldValue,
  factorGroups: FactorGroups,
  options: EvalFactorGroupsOptions = {},
): PlayClass {
  if (mainValue.kind !== 'finite') {
    return factorGroups.length === 0
      ? { kind: 'prime', value: mainValue }
      : { kind: 'foul', reason: 'infinity cannot have factor field' }
  }

  const n = mainValue.value

  if (factorGroups.length === 0) {
    if (isPrimeBigInt(n)) return { kind: 'prime', value: mainValue }
    if (n === 57n) return { kind: 'grotanCut', value: n }
    if (n === 1729n) return { kind: 'ramanujanRevolution', value: n }

    return {
      kind: 'foul',
      reason: 'finite non-prime without valid special rule or factorization',
    }
  }

  if (!isCompositeBigInt(n)) {
    return { kind: 'foul', reason: 'factor field requires composite main value' }
  }

  const product = evalFactorGroups(factorGroups, {
    ...options,
    limit: options.limit ?? n,
  })

  if (product === n) return { kind: 'composite', value: n }

  return { kind: 'foul', reason: 'factorization does not match main value' }
}

export function validateOfficialPlay(
  mainCards: readonly PlayingCard[],
  options: ValidateOfficialPlayOptions = {},
): OfficialPlayValidation {
  const mode = options.mode ?? 'normal'
  const factorGroups = options.factorGroups ?? []
  const value = evalMain(mainCards, options)

  if (value === null) {
    return { ok: false, reason: 'main value is undefined' }
  }

  const playClass = classifyPlay(value, factorGroups, options)
  if (playClass.kind === 'foul') {
    return { ok: false, reason: playClass.reason, value, playClass }
  }

  if (!canPlayOnCurrentField(value, options.currentFieldValues ?? [], mode)) {
    return {
      ok: false,
      reason: mode === 'normal'
        ? 'main value must be greater than every current field value'
        : 'main value must be smaller than every current field value',
      value,
      playClass,
    }
  }

  return { ok: true, value, playClass }
}

export function compareFieldValue(a: FieldValue, b: FieldValue): -1 | 0 | 1 {
  if (a.kind === 'finite' && b.kind === 'finite') {
    return compareBigInt(a.value, b.value)
  }

  if (a.kind === b.kind) return 0

  if (a.kind === 'negativeInfinity' || b.kind === 'positiveInfinity') return -1
  if (a.kind === 'positiveInfinity' || b.kind === 'negativeInfinity') return 1

  return 0
}

export function canPlayOnCurrentField(
  value: FieldValue,
  currentFieldValues: readonly FieldValue[],
  mode: GameMode = 'normal',
): boolean {
  if (mode === 'normal') {
    return currentFieldValues.every(
      currentValue => compareFieldValue(value, currentValue) === 1,
    )
  }

  return currentFieldValues.every(
    currentValue => compareFieldValue(value, currentValue) === -1,
  )
}

function compareBigInt(a: bigint, b: bigint): -1 | 0 | 1 {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function powerWithLimit(base: bigint, exponent: bigint, limit?: bigint): bigint | null {
  let result = 1n

  for (let i = 0n; i < exponent; i++) {
    result *= base
    if (limit !== undefined && result > limit) return null
  }

  return result
}
