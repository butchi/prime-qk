import { searchCardPattern } from './pattern-search'

self.onmessage = (event: MessageEvent<string>) => {
  try {
    const state = searchCardPattern(event.data, state => self.postMessage({ state, done: false }))
    self.postMessage({ state, done: true })
  } catch (cause) {
    self.postMessage({ error: cause instanceof Error ? cause.message : '正規表現の探索でエラーが発生しました。' })
  }
}
