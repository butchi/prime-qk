export type NumberClassification = 'prime' | 'composite' | 'neither'

export interface CatalogEntry {
  readonly value: string
  readonly classification: NumberClassification
  readonly verification: {
    readonly method: 'trial-division'
    readonly certainty: 'deterministic'
  }
  readonly representations: readonly (readonly number[])[]
}

export interface CatalogQuery {
  readonly exactValue?: string
  readonly minValue?: string
  readonly maxValue?: string
  readonly cardCount?: number
  readonly digitCount?: number
  readonly sort?: 'asc' | 'desc'
  readonly hideDominated?: boolean
}
