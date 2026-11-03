export const WASTE_TYPES = [
  'plastic',
  'paper',
  'glass',
  'metal',
  'organic',
  'e-waste',
  'textile',
  'construction',
  'mixed',
] as const

export type WasteType = (typeof WASTE_TYPES)[number]

export const NOT_WASTE = 'not-waste'
