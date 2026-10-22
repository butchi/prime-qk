import { writeFileSync } from 'node:fs'
import { generateCatalog } from '../packages/catalog/src/generate.ts'
import { catalogScopeDescription } from '../packages/catalog/src/scope.ts'

const entries = generateCatalog()
const output = `// 自動生成: npm run generate --workspace=@prime-qk/catalog\nimport type { CatalogEntry } from '../src/types'\n\nexport const catalogEntries: readonly CatalogEntry[] = ${JSON.stringify(entries, null, 2)}\n`
writeFileSync(new URL('../packages/catalog/data/entries.ts', import.meta.url), output)
console.log(`${entries.length}件の素数を生成しました（${catalogScopeDescription}・試し割りで確定）。`)
