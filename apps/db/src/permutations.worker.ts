import { searchPermutations } from './permutations'

self.onmessage = (event: MessageEvent<number[]>) => {
  try {
    const state = searchPermutations(event.data, state => self.postMessage({ state, done: false }))
    self.postMessage({ state, done: true })
  } catch (cause) {
    self.postMessage({ error: cause instanceof Error ? cause.message : '並べ替え探索でエラーが発生しました。' })
  }
}
