import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readSearch, searchUrl, canonicalPath } from '../src/urls.ts'

test('URLの正規化と検索条件の往復', () => {
  assert.equal(canonicalPath('/'), '/')
  assert.equal(canonicalPath('/checker'), '/')
  assert.equal(canonicalPath('/checker/'), '/')
  assert.equal(canonicalPath('/numbers/'), '/numbers')
  assert.equal(canonicalPath('/numbers/list/'), '/numbers/list')
  assert.equal(canonicalPath('/numbers/00113/'), '/numbers/113')
  const state = readSearch(new URLSearchParams('exact=00113&cards=2&sort=desc&page=2'))
  assert.equal(state.query.exactValue, '113')
  assert.equal(state.page, 2)
  assert.equal(searchUrl(state.draft, state.page), '/numbers?exact=113&cards=2&sort=desc&page=2')
  assert.equal(searchUrl(readSearch(new URLSearchParams()).draft, 1), '/numbers')
  const filtered = readSearch(new URLSearchParams('undominated=1'))
  assert.equal(filtered.query.hideDominated, true)
  assert.equal(searchUrl(filtered.draft, 1), '/numbers?undominated=1')
  assert.equal(readSearch(new URLSearchParams()).query.hideDominated, false)
  const six = readSearch(new URLSearchParams('cards=6&digits=12'))
  assert.equal(six.query.cardCount, 6)
  assert.equal(six.query.digitCount, 12)
  assert.equal(searchUrl(six.draft, 1), '/numbers?cards=6&digits=12')
  for (const kind of ['twin', 'triplet', 'quadruplet']) {
    const tuples = readSearch(new URLSearchParams(`exact=0005&cards=1&constellation=${kind}&sort=desc&page=2&undominated=1`))
    assert.equal(tuples.draft.constellation, kind)
    assert.equal(tuples.query.exactValue, '5')
    assert.equal(searchUrl(tuples.draft, 2), `/numbers?exact=5&cards=1&sort=desc&undominated=1&constellation=${kind}&page=2`)
  }
  const prefix = readSearch(new URLSearchParams('constellation=triplet&same-prefix=1'))
  assert.equal(prefix.draft.samePrefix, true)
  assert.equal(prefix.query.samePrefix, true)
  assert.equal(searchUrl(prefix.draft, 1), '/numbers?constellation=triplet&same-prefix=1')
  assert.equal(readSearch(new URLSearchParams('constellation=triplet')).query.samePrefix, false)
  assert.equal(searchUrl({ ...prefix.draft, constellation: '' }, 1), '/numbers')
})

test('不正・重複・未知の検索条件は拒否する', () => {
  for (const query of ['page=0', 'page=1.5', 'page=9007199254740993', 'sort=no',
    'cards=', 'exact=-1', 'exact=1&exact=2', 'unknown=1',
    'undominated=0', 'undominated=true', 'undominated=', 'undominated=1&undominated=1',
    'constellation=', 'constellation=unknown', 'constellation=twin&constellation=triplet',
    'same-prefix=1', 'constellation=twin&same-prefix=0', 'constellation=twin&same-prefix=true',
    'constellation=twin&same-prefix=', 'constellation=twin&same-prefix=1&same-prefix=1']) {
    assert.throws(() => readSearch(new URLSearchParams(query)), query)
  }
})
