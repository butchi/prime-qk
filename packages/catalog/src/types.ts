export type NumberClassification = 'prime' | 'composite' | 'neither'

export interface CatalogEntry {
  readonly value: string
  readonly classification: NumberClassification
}
