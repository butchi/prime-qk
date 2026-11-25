import { searchPermutations } from './permutations'

self.onmessage = (event: MessageEvent<{ ranks: number[]; pattern: string }>) => {
  try {
    const state = searchPermutations(
      event.data.ranks,
      state => self.postMessage({ state, done: false }),
      5000,
      event.data.pattern,
    )
    self.postMessage({ state, done: true })
  } catch (cause) {
    self.postMessage({ error: cause instanceof Error ? cause.message : '並べ替え探索でエラーが発生しました。' })
  }
}
