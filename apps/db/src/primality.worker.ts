import { checkPrimality, parseInput } from './primality'

self.onmessage = (event: MessageEvent<string>) => {
  try {
    const value = parseInput(event.data)
    self.postMessage({ value: String(value), result: checkPrimality(value) })
  } catch (cause) {
    self.postMessage({ error: cause instanceof Error ? cause.message : '判定処理でエラーが発生しました。' })
  }
}
