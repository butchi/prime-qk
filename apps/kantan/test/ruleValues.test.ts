import assert from 'assert'
import { describe, it } from 'node:test'
import { createCard, createJoker } from '../src/lib/cards'
import { defaultRuleSettings, type FieldValue } from '../src/lib/ruleState'
import {
  canPlayOnCurrentField,
  classifyPlay,
  compareFieldValue,
  conBase10,
  evalFactorGroup,
  evalFactorGroups,
  evalFactorToken,
  evalRightAssociatedPowerTower,
  evalMain,
  fTurn,
  validateOfficialPlay,
} from '../src/lib/ruleValues'

describe('official rule values', () => {
  it('maps a normal card through fTurn', () => {
    assert.equal(fTurn(createCard('spades', 13)), 13)
  })

  it('maps jokers through turn-scoped values', () => {
    const joker = createJoker('black')

    assert.equal(fTurn(joker), 1)
    assert.equal(fTurn(joker, new Map([[joker.id, 0]])), 0)
    assert.equal(fTurn(joker, new Map([[joker.id, 13]])), 13)
    assert.equal(fTurn(joker, new Map([[joker.id, 14]])), null)
  })

  it('concatenates card values as a bigint with Con base 10 semantics', () => {
    assert.equal(conBase10([13, 8, 0, 7]), 13807n)
    assert.equal(conBase10([1, 11, 13]), 11113n)
  })

  it('rejects undefined main-value concatenations', () => {
    assert.equal(conBase10([]), null)
    assert.equal(conBase10([0, 2]), null)
  })

  it('evaluates finite F(mainCards) as FieldValue', () => {
    const value = evalMain([
      createCard('spades', 1),
      createCard('hearts', 11),
      createCard('clubs', 13),
    ])

    assert.deepEqual(value, { kind: 'finite', value: 11113n })
  })

  it('rejects empty main cards and max-card violations', () => {
    assert.equal(evalMain([]), null)
    assert.equal(
      evalMain([createCard('spades', 2), createCard('hearts', 3)], {
        settings: {
          ...defaultRuleSettings,
          maxMainCards: 1,
        },
      }),
      null,
    )
  })

  it('keeps finite values stable in revolution mode', () => {
    assert.deepEqual(
      evalMain([createCard('spades', 7)], { mode: 'revolution' }),
      { kind: 'finite', value: 7n },
    )
  })

  it('treats a single joker as infinity by default', () => {
    const joker = createJoker('red')

    assert.deepEqual(evalMain([joker]), { kind: 'positiveInfinity' })
    assert.deepEqual(evalMain([joker], { mode: 'revolution' }), {
      kind: 'negativeInfinity',
    })
  })

  it('treats two jokers as infinity when double-joker infinity is enabled', () => {
    const black = createJoker('black')
    const red = createJoker('red')

    assert.deepEqual(evalMain([black, red]), { kind: 'positiveInfinity' })
    assert.deepEqual(evalMain([black, red], { mode: 'revolution' }), {
      kind: 'negativeInfinity',
    })
  })

  it('can evaluate jokers as finite values when the setting requests it', () => {
    const joker = createJoker('red')

    assert.deepEqual(
      evalMain([createCard('spades', 2), joker], {
        jokerValueByCardId: new Map([[joker.id, 13]]),
      }),
      { kind: 'finite', value: 213n },
    )
    assert.deepEqual(
      evalMain([joker], {
        settings: {
          ...defaultRuleSettings,
          singleJokerRule: 'finite',
        },
        jokerValueByCardId: new Map([[joker.id, 7]]),
      }),
      { kind: 'finite', value: 7n },
    )
  })

  it('evaluates finite G(factorToken) values that are at least 2', () => {
    assert.equal(evalFactorToken([createCard('spades', 2)]), 2n)
    assert.equal(
      evalFactorToken([createCard('hearts', 1), createCard('clubs', 3)]),
      13n,
    )
  })

  it('rejects factor tokens that are undefined, one, or infinity', () => {
    const joker = createJoker('black')

    assert.equal(evalFactorToken([]), null)
    assert.equal(evalFactorToken([createCard('spades', 1)]), null)
    assert.equal(
      evalFactorToken([joker], {
        jokerValueByCardId: new Map([[joker.id, 0]]),
      }),
      null,
    )
  })

  it('evaluates single jokers as finite values for G(factorToken)', () => {
    const joker = createJoker('black')

    assert.equal(
      evalFactorToken([joker], {
        jokerValueByCardId: new Map([[joker.id, 7]]),
      }),
      7n,
    )
  })

  it('evaluates factor groups with right-associated exponents', () => {
    assert.equal(
      evalFactorGroup([
        [createCard('spades', 2)],
        [createCard('hearts', 3)],
      ]),
      8n,
    )
    assert.equal(
      evalRightAssociatedPowerTower([
        [createCard('spades', 2)],
        [createCard('hearts', 3)],
      ]),
      8n,
    )
    assert.equal(
      evalRightAssociatedPowerTower([
        [createCard('spades', 2)],
        [createCard('hearts', 3)],
        [createCard('clubs', 2)],
      ]),
      512n,
    )
  })

  it('evaluates products of factor groups', () => {
    assert.equal(
      evalFactorGroups([
        [[createCard('spades', 2)], [createCard('hearts', 3)]],
        [[createCard('clubs', 3)], [createCard('diamonds', 2)]],
      ]),
      72n,
    )
  })

  it('rejects invalid factor groups', () => {
    assert.equal(evalFactorGroup([]), null)
    assert.equal(evalFactorGroup([[createCard('spades', 4)]]), null)
    assert.equal(
      evalFactorGroups([
        [[createCard('spades', 2)]],
        [[createCard('hearts', 4)]],
      ]),
      null,
    )
  })

  it('stops factor group evaluation when a limit is exceeded', () => {
    assert.equal(
      evalFactorGroups(
        [[[createCard('spades', 2)], [createCard('hearts', 10)]]],
        { limit: 72n },
      ),
      null,
    )
  })

  it('classifies prime, infinity, cut, and revolution plays', () => {
    const positiveInfinity: FieldValue = { kind: 'positiveInfinity' }

    assert.deepEqual(classifyPlay({ kind: 'finite', value: 13n }, []), {
      kind: 'prime',
      value: { kind: 'finite', value: 13n },
    })
    assert.deepEqual(classifyPlay(positiveInfinity, []), {
      kind: 'prime',
      value: positiveInfinity,
    })
    assert.deepEqual(classifyPlay({ kind: 'finite', value: 57n }, []), {
      kind: 'grotanCut',
      value: 57n,
    })
    assert.deepEqual(classifyPlay({ kind: 'finite', value: 1729n }, []), {
      kind: 'ramanujanRevolution',
      value: 1729n,
    })
  })

  it('classifies composite plays when factorization matches', () => {
    assert.deepEqual(
      classifyPlay({ kind: 'finite', value: 72n }, [
        [[createCard('spades', 2)], [createCard('hearts', 3)]],
        [[createCard('clubs', 3)], [createCard('diamonds', 2)]],
      ]),
      { kind: 'composite', value: 72n },
    )
  })

  it('classifies foul plays', () => {
    assert.deepEqual(
      classifyPlay({ kind: 'positiveInfinity' }, [[[createCard('spades', 2)]]]),
      { kind: 'foul', reason: 'infinity cannot have factor field' },
    )
    assert.deepEqual(classifyPlay({ kind: 'finite', value: 1n }, []), {
      kind: 'foul',
      reason: 'finite non-prime without valid special rule or factorization',
    })
    assert.deepEqual(
      classifyPlay({ kind: 'finite', value: 13n }, [[[createCard('spades', 13)]]]),
      { kind: 'foul', reason: 'factor field requires composite main value' },
    )
    assert.deepEqual(
      classifyPlay({ kind: 'finite', value: 72n }, [[[createCard('spades', 2)]]]),
      { kind: 'foul', reason: 'factorization does not match main value' },
    )
  })

  it('compares finite and infinite field values without bigint sentinels', () => {
    const negativeInfinity: FieldValue = { kind: 'negativeInfinity' }
    const two: FieldValue = { kind: 'finite', value: 2n }
    const three: FieldValue = { kind: 'finite', value: 3n }
    const positiveInfinity: FieldValue = { kind: 'positiveInfinity' }

    assert.equal(compareFieldValue(negativeInfinity, two), -1)
    assert.equal(compareFieldValue(two, negativeInfinity), 1)
    assert.equal(compareFieldValue(two, three), -1)
    assert.equal(compareFieldValue(three, two), 1)
    assert.equal(compareFieldValue(three, three), 0)
    assert.equal(compareFieldValue(positiveInfinity, three), 1)
    assert.equal(compareFieldValue(three, positiveInfinity), -1)
    assert.equal(compareFieldValue(negativeInfinity, positiveInfinity), -1)
  })

  it('allows normal plays only when they are greater than every current field value', () => {
    assert.equal(
      canPlayOnCurrentField(
        { kind: 'finite', value: 17n },
        [
          { kind: 'finite', value: 11n },
          { kind: 'finite', value: 13n },
        ],
      ),
      true,
    )
    assert.equal(
      canPlayOnCurrentField(
        { kind: 'finite', value: 13n },
        [
          { kind: 'finite', value: 11n },
          { kind: 'finite', value: 13n },
        ],
      ),
      false,
    )
    assert.equal(
      canPlayOnCurrentField({ kind: 'positiveInfinity' }, [
        { kind: 'finite', value: 13n },
      ]),
      true,
    )
  })

  it('allows revolution plays only when they are smaller than every current field value', () => {
    assert.equal(
      canPlayOnCurrentField(
        { kind: 'finite', value: 7n },
        [
          { kind: 'finite', value: 11n },
          { kind: 'finite', value: 13n },
        ],
        'revolution',
      ),
      true,
    )
    assert.equal(
      canPlayOnCurrentField(
        { kind: 'finite', value: 11n },
        [
          { kind: 'finite', value: 11n },
          { kind: 'finite', value: 13n },
        ],
        'revolution',
      ),
      false,
    )
    assert.equal(
      canPlayOnCurrentField(
        { kind: 'negativeInfinity' },
        [{ kind: 'finite', value: 2n }],
        'revolution',
      ),
      true,
    )
  })

  it('validates official plays by evaluating, classifying, and comparing with the whole field', () => {
    assert.deepEqual(
      validateOfficialPlay([createCard('spades', 1), createCard('hearts', 7)], {
        currentFieldValues: [
          { kind: 'finite', value: 11n },
          { kind: 'finite', value: 13n },
        ],
      }),
      {
        ok: true,
        value: { kind: 'finite', value: 17n },
        playClass: { kind: 'prime', value: { kind: 'finite', value: 17n } },
      },
    )

    assert.deepEqual(
      validateOfficialPlay([createCard('spades', 13)], {
        currentFieldValues: [
          { kind: 'finite', value: 11n },
          { kind: 'finite', value: 13n },
        ],
      }),
      {
        ok: false,
        reason: 'main value must be greater than every current field value',
        value: { kind: 'finite', value: 13n },
        playClass: { kind: 'prime', value: { kind: 'finite', value: 13n } },
      },
    )
  })

  it('validates official plays against revolution ordering', () => {
    assert.deepEqual(
      validateOfficialPlay([createCard('spades', 7)], {
        mode: 'revolution',
        currentFieldValues: [
          { kind: 'finite', value: 11n },
          { kind: 'finite', value: 13n },
        ],
      }),
      {
        ok: true,
        value: { kind: 'finite', value: 7n },
        playClass: { kind: 'prime', value: { kind: 'finite', value: 7n } },
      },
    )

    assert.deepEqual(
      validateOfficialPlay([createCard('spades', 13)], {
        mode: 'revolution',
        currentFieldValues: [
          { kind: 'finite', value: 11n },
          { kind: 'finite', value: 13n },
        ],
      }),
      {
        ok: false,
        reason: 'main value must be smaller than every current field value',
        value: { kind: 'finite', value: 13n },
        playClass: { kind: 'prime', value: { kind: 'finite', value: 13n } },
      },
    )
  })

  it('rejects official plays that evaluate but classify as a foul', () => {
    assert.deepEqual(validateOfficialPlay([createCard('spades', 1)]), {
      ok: false,
      reason: 'finite non-prime without valid special rule or factorization',
      value: { kind: 'finite', value: 1n },
      playClass: {
        kind: 'foul',
        reason: 'finite non-prime without valid special rule or factorization',
      },
    })
  })
})
